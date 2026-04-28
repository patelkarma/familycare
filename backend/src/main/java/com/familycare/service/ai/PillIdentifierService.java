package com.familycare.service.ai;

import com.familycare.dto.request.PillIdentifyRequest;
import com.familycare.dto.response.PillIdentifyResponse;
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

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PillIdentifierService {

    private static final String DISCLAIMER =
            "This is an AI estimate based on visual cues only. Always confirm with the "
                    + "pharmacy label or your doctor before taking any pill.";

    private static final String SYSTEM_PROMPT = """
            You are a pharmacist assistant. The user shows you a photo of a pill or medicine
            packaging. Identify what you can SEE: shape, colour, imprint/markings, packaging
            text. Then, given the patient's current medicines below, judge whether the pill
            in the photo matches one of them.

            Reply in this format (3 short paragraphs, plain text, no markdown):

            1) What I see: <one sentence describing the pill/package>.
            2) Best match: <name of patient's medicine that matches, OR "Unable to match" if none>.
            3) Confidence: <one of "high" / "medium" / "low"> — <one short reason>.

            Be conservative. If the image is blurry or there's no clear identifying mark,
            say "Unable to match" with low confidence.
            """;

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final MedicineRepository medicineRepository;
    private final GeminiClient geminiClient;

    @Transactional(readOnly = true)
    public PillIdentifyResponse identify(PillIdentifyRequest request, String userEmail) {
        long t0 = System.currentTimeMillis();
        User user = getUser(userEmail);
        FamilyMember member = resolveMember(request.getFamilyMemberId(), user);

        int imgLen = request.getImageBase64() == null ? 0 : request.getImageBase64().length();
        log.info("Pill identify: member={} imageBase64Len={} mime={}",
                member.getName(), imgLen, request.getMimeType());

        List<Medicine> meds = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());
        StringBuilder inventory = new StringBuilder("Patient's current medicines:\n");
        if (meds.isEmpty()) {
            inventory.append("- (none)\n");
        } else {
            for (Medicine m : meds) {
                inventory.append("- ").append(m.getName());
                if (m.getGenericName() != null && !m.getGenericName().isBlank()) {
                    inventory.append(" (").append(m.getGenericName()).append(")");
                }
                if (m.getDosage() != null) inventory.append(" — ").append(m.getDosage());
                inventory.append("\n");
            }
        }

        String userPrompt = inventory + "\nIdentify the pill in the photo using the format above.";
        String mime = request.getMimeType() == null ? "image/jpeg" : request.getMimeType();

        log.info("Pill identify: calling Gemini Vision (elapsed={}ms)", System.currentTimeMillis() - t0);
        String aiText = geminiClient.chatWithImage(SYSTEM_PROMPT, userPrompt,
                request.getImageBase64(), mime);
        log.info("Pill identify: Gemini returned {} chars (total elapsed={}ms)",
                aiText == null ? 0 : aiText.length(), System.currentTimeMillis() - t0);

        // Parse the response heuristically.
        String matchedName = null;
        UUID matchedId = null;
        String confidence = extractConfidence(aiText);
        if (!"Unable to match".equalsIgnoreCase(extractMatch(aiText))) {
            String guess = extractMatch(aiText);
            if (guess != null && !guess.isBlank()) {
                Medicine matched = matchInInventory(guess, meds);
                if (matched != null) {
                    matchedName = matched.getName();
                    matchedId = matched.getId();
                }
            }
        }

        return PillIdentifyResponse.builder()
                .description(aiText)
                .matchedMedicineName(matchedName)
                .matchedMedicineId(matchedId)
                .confidence(confidence)
                .disclaimer(DISCLAIMER)
                .build();
    }

    private String extractMatch(String text) {
        if (text == null) return null;
        for (String line : text.split("\\R")) {
            String l = line.trim();
            if (l.toLowerCase(Locale.ROOT).startsWith("2)") || l.toLowerCase(Locale.ROOT).startsWith("best match")) {
                int colon = l.indexOf(':');
                if (colon > 0 && colon < l.length() - 1) {
                    return l.substring(colon + 1).trim().replaceAll("\\.$", "");
                }
            }
        }
        return null;
    }

    private String extractConfidence(String text) {
        if (text == null) return "low";
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("confidence: high") || lower.contains("\"high\"") || lower.contains(" high ")) return "high";
        if (lower.contains("confidence: medium") || lower.contains("\"medium\"") || lower.contains(" medium ")) return "medium";
        return "low";
    }

    private Medicine matchInInventory(String guess, List<Medicine> meds) {
        if (guess == null || meds == null) return null;
        String g = guess.toLowerCase(Locale.ROOT);
        for (Medicine m : meds) {
            if (m.getName() != null && g.contains(m.getName().toLowerCase(Locale.ROOT).split("\\s+")[0])) {
                return m;
            }
            if (m.getGenericName() != null
                    && g.contains(m.getGenericName().toLowerCase(Locale.ROOT).split("\\s+")[0])) {
                return m;
            }
        }
        return null;
    }

    private FamilyMember resolveMember(UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only identify pills for yourself");
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
