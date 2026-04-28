package com.familycare.service.ai;

import com.familycare.dto.request.ChatRequest;
import com.familycare.dto.response.ChatResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.model.User;
import com.familycare.model.Vitals;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.MedicineRepository;
import com.familycare.repository.UserRepository;
import com.familycare.repository.VitalsRepository;
import com.familycare.service.ai.dto.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthAssistantService {

    private static final String SAFETY_DISCLAIMER =
            "\n\n_This is general guidance — always confirm with your doctor for medical decisions._";

    private static final String BASE_SYSTEM_PROMPT = """
            You are FamilyCare's helpful health assistant for Indian families. Your audience
            is family caregivers and elderly patients. Speak in clear, simple English (avoid
            jargon). Keep answers under 160 words unless asked for more.

            Hard rules:
            - You are NOT a doctor. Never give a diagnosis or prescribe doses.
            - For symptoms that may be emergencies (chest pain, sudden weakness, severe
              breathlessness, fainting, heavy bleeding, suicidal thoughts), tell the user
              to call emergency services immediately.
            - When asked about drug interactions, mention the general category of risk
              (e.g. "may increase bleeding risk") but always say to confirm with a pharmacist
              or doctor before changing anything.
            - If the user's question is unrelated to health, family, or this app, politely
              redirect them back.
            - Use the member context provided (medicines, vitals, allergies) to personalise
              your answer when relevant. Do NOT invent facts not in the context.
            """;

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final MedicineRepository medicineRepository;
    private final VitalsRepository vitalsRepository;
    private final GeminiClient geminiClient;

    @Transactional(readOnly = true)
    public ChatResponse ask(ChatRequest request, String userEmail) {
        User user = getUser(userEmail);

        FamilyMember member = null;
        if (request.getFamilyMemberId() != null) {
            member = resolveMember(request.getFamilyMemberId(), user);
        }

        String systemPrompt = BASE_SYSTEM_PROMPT;
        boolean grounded = false;
        if (member != null) {
            String context = buildMemberContext(member);
            systemPrompt = BASE_SYSTEM_PROMPT + "\n\nMember context:\n" + context;
            grounded = true;
        }

        List<ChatMessage> history = request.getHistory() == null ? List.of() : request.getHistory();
        String answer = geminiClient.chat(systemPrompt, history, request.getMessage());

        if (answer == null || answer.isBlank()) {
            throw new CustomExceptions.BadRequestException("AI returned empty response");
        }
        return ChatResponse.builder()
                .answer(answer + SAFETY_DISCLAIMER)
                .grounded(grounded)
                .build();
    }

    /**
     * Builds a compact human-readable digest of the member's medical state for the
     * AI to reason over. Intentionally short so we don't blow the context budget.
     */
    private String buildMemberContext(FamilyMember member) {
        StringBuilder sb = new StringBuilder();
        sb.append("- Name: ").append(member.getName())
                .append(" (").append(member.getRelationship()).append(")\n");

        if (member.getDateOfBirth() != null) {
            int age = Period.between(member.getDateOfBirth(), LocalDate.now()).getYears();
            sb.append("- Age: ").append(age).append("\n");
        }
        if (member.getGender() != null) sb.append("- Gender: ").append(member.getGender()).append("\n");
        if (notBlank(member.getBloodGroup())) sb.append("- Blood group: ").append(member.getBloodGroup()).append("\n");
        if (notBlank(member.getAllergies())) sb.append("- Allergies: ").append(member.getAllergies()).append("\n");
        if (notBlank(member.getChronicDiseases()))
            sb.append("- Chronic conditions: ").append(member.getChronicDiseases()).append("\n");

        List<Medicine> meds = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());
        if (!meds.isEmpty()) {
            sb.append("- Active medicines:\n");
            for (Medicine m : meds) {
                sb.append("    * ").append(m.getName());
                if (notBlank(m.getDosage())) sb.append(" ").append(m.getDosage());
                if (notBlank(m.getFrequency())) sb.append(", ").append(m.getFrequency());
                sb.append("\n");
            }
        }

        LocalDateTime since = LocalDateTime.now().minusDays(14);
        for (String type : List.of("BP", "SUGAR", "PULSE", "SPO2")) {
            List<Vitals> readings = vitalsRepository
                    .findByFamilyMemberIdAndTypeAndRecordedAtAfterOrderByRecordedAtDesc(
                            member.getId(), type, since);
            if (readings.isEmpty()) continue;
            Vitals latest = readings.get(0);
            sb.append("- Latest ").append(type).append(": ");
            sb.append(formatVital(latest));
            sb.append(" (").append(latest.getRecordedAt().toLocalDate()).append(")\n");
        }

        return sb.toString();
    }

    private String formatVital(Vitals v) {
        String unit = v.getUnit() == null ? "" : v.getUnit();
        if (v.getValueSecondary() != null) {
            return String.format(Locale.US, "%.0f/%.0f %s",
                    v.getValuePrimary(), v.getValueSecondary(), unit);
        }
        return String.format(Locale.US, "%.0f %s", v.getValuePrimary(), unit);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private FamilyMember resolveMember(java.util.UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException(
                            "No family member linked to this account"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only ask about yourself");
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
