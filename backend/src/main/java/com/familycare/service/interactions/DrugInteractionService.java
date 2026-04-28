package com.familycare.service.interactions;

import com.familycare.dto.response.DrugInteractionResponse;
import com.familycare.dto.response.DrugInteractionResponse.InteractionMatch;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.model.User;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.MedicineRepository;
import com.familycare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DrugInteractionService {

    private static final String DISCLAIMER =
            "These warnings are extracted from public drug labels (RxNav + OpenFDA) and "
                    + "may be incomplete. Always confirm with your pharmacist or doctor.";
    private static final int MAX_WARNINGS = 4;
    private static final int SNIPPET_CHARS = 220;

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final MedicineRepository medicineRepository;
    private final RxNavClient rxNavClient;
    private final OpenFdaClient openFdaClient;

    @Transactional(readOnly = true)
    public DrugInteractionResponse check(UUID memberId, String drugName, String userEmail) {
        if (drugName == null || drugName.isBlank()) {
            throw new CustomExceptions.BadRequestException("Drug name is required");
        }
        User user = getUser(userEmail);
        FamilyMember member = resolveMember(memberId, user);

        // Step 1: normalise via RxNav (best effort).
        String rxcui = rxNavClient.findRxCui(drugName).orElse(null);
        String normalized = rxcui == null ? null
                : rxNavClient.findIngredientName(rxcui).orElse(null);

        // Step 2: fetch the OpenFDA label for the (normalised or raw) drug name.
        String lookupName = (normalized != null && !normalized.isBlank()) ? normalized : drugName;
        Optional<OpenFdaClient.DrugLabelExcerpt> labelOpt = openFdaClient.findLabel(lookupName);
        if (labelOpt.isEmpty() && normalized != null) {
            labelOpt = openFdaClient.findLabel(drugName); // fallback to raw name
        }

        DrugInteractionResponse.DrugInteractionResponseBuilder resp = DrugInteractionResponse.builder()
                .drugName(drugName)
                .normalizedName(normalized)
                .rxcui(rxcui)
                .disclaimer(DISCLAIMER)
                .interactionsWithExisting(List.of())
                .generalWarnings(List.of())
                .dataAvailable(false);

        if (labelOpt.isEmpty()) {
            return resp.build();
        }
        OpenFdaClient.DrugLabelExcerpt label = labelOpt.get();

        // Step 3: scan the new drug's interaction text for the family's other active meds.
        List<Medicine> existing = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());
        List<InteractionMatch> matches = matchExisting(label.getDrugInteractions(), existing);

        // Step 4: extract a few general warning bullets.
        List<String> warnings = topBullets(label.getWarnings(), MAX_WARNINGS);

        return resp
                .dataAvailable(true)
                .interactionsWithExisting(matches)
                .generalWarnings(warnings)
                .build();
    }

    private List<InteractionMatch> matchExisting(String interactionText, List<Medicine> existing) {
        if (interactionText == null || interactionText.isBlank() || existing == null) {
            return List.of();
        }
        String lower = interactionText.toLowerCase(Locale.ROOT);
        List<InteractionMatch> out = new ArrayList<>();
        for (Medicine m : existing) {
            String name = m.getName();
            if (name == null || name.isBlank()) continue;
            String key = name.toLowerCase(Locale.ROOT).split("\\s+")[0];
            if (key.length() < 4) continue; // avoid false positives on short strings
            int idx = lower.indexOf(key);
            if (idx < 0 && m.getGenericName() != null && !m.getGenericName().isBlank()) {
                key = m.getGenericName().toLowerCase(Locale.ROOT).split("\\s+")[0];
                if (key.length() < 4) continue;
                idx = lower.indexOf(key);
            }
            if (idx >= 0) {
                String snippet = snippetAround(interactionText, idx, SNIPPET_CHARS);
                out.add(InteractionMatch.builder()
                        .withDrug(name)
                        .snippet(snippet)
                        .build());
            }
        }
        return out;
    }

    private String snippetAround(String text, int idx, int total) {
        int half = total / 2;
        int start = Math.max(0, idx - half);
        int end = Math.min(text.length(), idx + half);
        String snippet = text.substring(start, end).replaceAll("\\s+", " ").trim();
        if (start > 0) snippet = "…" + snippet;
        if (end < text.length()) snippet = snippet + "…";
        return snippet;
    }

    private List<String> topBullets(String text, int max) {
        if (text == null || text.isBlank()) return List.of();
        String[] sentences = text.split("(?<=[.!?])\\s+(?=[A-Z])");
        List<String> out = new ArrayList<>();
        for (String s : sentences) {
            String trimmed = s.replaceAll("\\s+", " ").trim();
            if (trimmed.length() < 30 || trimmed.length() > 280) continue;
            out.add(trimmed);
            if (out.size() >= max) break;
        }
        return out;
    }

    private FamilyMember resolveMember(UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only check interactions for yourself");
            }
            return linked;
        }
        return familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }
}
