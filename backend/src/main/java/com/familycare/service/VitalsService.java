package com.familycare.service;

import com.familycare.dto.request.VitalsRequest;
import com.familycare.dto.response.VitalsResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.model.Vitals;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import com.familycare.repository.VitalsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VitalsService {

    private final VitalsRepository vitalsRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final AlertService alertService;

    private static final Map<String, String> UNIT_MAP = Map.of(
            "BP", "mmHg",
            "SUGAR", "mg/dL",
            "PULSE", "bpm",
            "SPO2", "%",
            "TEMP", "\u00B0F",
            "WEIGHT", "kg"
    );

    @Transactional
    public VitalsResponse addVital(VitalsRequest request, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = resolveMember(request.getFamilyMemberId(), user);

        String unit = UNIT_MAP.getOrDefault(request.getType().toUpperCase(), "");

        Vitals vital = Vitals.builder()
                .familyMember(member)
                .type(request.getType().toUpperCase())
                .valuePrimary(request.getValuePrimary())
                .valueSecondary(request.getValueSecondary())
                .unit(unit)
                .notes(request.getNotes())
                .build();

        vitalsRepository.save(vital);
        log.info("Vital logged: {} {} for {}", request.getType(), request.getValuePrimary(), member.getName());

        // Check for dangerous patterns and send alert if needed
        alertService.checkAndAlert(vital, member);

        return toResponse(vital);
    }

    /**
     * Log a vital without user-level auth checks. Caller guarantees authorization
     * (e.g. WhatsApp inbound webhook resolving sender phone → FamilyMember).
     */
    @Transactional
    public Vitals addVitalInternal(FamilyMember member, String type, Double primary, Double secondary, String notes) {
        String upperType = type.toUpperCase();
        String unit = UNIT_MAP.getOrDefault(upperType, "");

        Vitals vital = Vitals.builder()
                .familyMember(member)
                .type(upperType)
                .valuePrimary(primary)
                .valueSecondary(secondary)
                .unit(unit)
                .notes(notes)
                .build();

        vitalsRepository.save(vital);
        log.info("Vital logged (internal): {} {} for {}", upperType, primary, member.getName());

        alertService.checkAndAlert(vital, member);
        return vital;
    }

    @Transactional(readOnly = true)
    public List<VitalsResponse> getVitals(UUID memberId, String type, int days, String userEmail) {
        User user = getUser(userEmail);
        resolveMember(memberId, user);

        LocalDateTime after = LocalDateTime.now().minusDays(days);

        List<Vitals> vitals;
        if (type != null && !type.isBlank()) {
            vitals = vitalsRepository.findByFamilyMemberIdAndTypeAndRecordedAtAfterOrderByRecordedAtDesc(
                    memberId, type.toUpperCase(), after);
        } else {
            vitals = vitalsRepository.findByFamilyMemberIdAndRecordedAtAfterOrderByRecordedAtDesc(
                    memberId, after);
        }

        return vitals.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VitalsResponse> getLatestVitals(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        resolveMember(memberId, user);

        // Get latest reading for each type
        List<VitalsResponse> latest = new ArrayList<>();
        for (String type : List.of("BP", "SUGAR", "PULSE", "SPO2", "TEMP", "WEIGHT")) {
            List<Vitals> readings = vitalsRepository.findTop1ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(
                    memberId, type);
            if (!readings.isEmpty()) {
                latest.add(toResponse(readings.get(0)));
            }
        }
        return latest;
    }

    @Transactional
    public void deleteVital(UUID vitalId, String userEmail) {
        User user = getUser(userEmail);
        Vitals vital = vitalsRepository.findById(vitalId)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Vital record not found"));

        resolveMember(vital.getFamilyMember().getId(), user);
        vitalsRepository.delete(vital);
    }

    private FamilyMember resolveMember(UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only access your own vitals");
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

    private VitalsResponse toResponse(Vitals vital) {
        return VitalsResponse.builder()
                .id(vital.getId())
                .familyMemberId(vital.getFamilyMember().getId())
                .familyMemberName(vital.getFamilyMember().getName())
                .type(vital.getType())
                .valuePrimary(vital.getValuePrimary())
                .valueSecondary(vital.getValueSecondary())
                .unit(vital.getUnit())
                .notes(vital.getNotes())
                .recordedAt(vital.getRecordedAt())
                .build();
    }
}
