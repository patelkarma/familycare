package com.familycare.service;

import com.familycare.model.FamilyMember;
import com.familycare.model.Vitals;
import com.familycare.repository.VitalsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final VitalsRepository vitalsRepository;
    private final WhatsAppService whatsAppService;

    public void checkAndAlert(Vitals vital, FamilyMember member) {
        String type = vital.getType();
        String memberName = member.getName();
        String familyHeadPhone = member.getUser().whatsappPhoneOrFallback();

        if (familyHeadPhone == null || familyHeadPhone.isBlank()) {
            log.warn("No phone for family head of {} — skipping vitals alert", memberName);
            return;
        }

        String alertMessage = null;

        switch (type) {
            case "BP" -> alertMessage = checkBP(member, memberName);
            case "SUGAR" -> alertMessage = checkSugar(member, memberName);
            case "PULSE" -> alertMessage = checkPulse(vital, memberName);
            case "SPO2" -> alertMessage = checkSpO2(vital, memberName);
        }

        if (alertMessage != null) {
            log.warn("Vitals alert triggered for {}: {}", memberName, alertMessage);
            whatsAppService.sendWhatsApp(familyHeadPhone, alertMessage);
        }
    }

    private String checkBP(FamilyMember member, String memberName) {
        List<Vitals> last3 = vitalsRepository.findTop3ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(
                member.getId(), "BP");

        if (last3.size() < 3) return null;

        boolean allHighSystolic = last3.stream()
                .allMatch(v -> v.getValuePrimary() > 140);
        if (allHighSystolic) {
            return String.format(
                    "FamilyCare ALERT: %s has had 3 consecutive HIGH BP (systolic > 140 mmHg) readings. " +
                    "Latest: %.0f/%.0f mmHg. Please consult a doctor immediately.",
                    memberName, last3.get(0).getValuePrimary(), last3.get(0).getValueSecondary());
        }

        boolean allHighDiastolic = last3.stream()
                .allMatch(v -> v.getValueSecondary() != null && v.getValueSecondary() > 90);
        if (allHighDiastolic) {
            return String.format(
                    "FamilyCare ALERT: %s has had 3 consecutive HIGH BP (diastolic > 90 mmHg) readings. " +
                    "Latest: %.0f/%.0f mmHg. Please consult a doctor immediately.",
                    memberName, last3.get(0).getValuePrimary(), last3.get(0).getValueSecondary());
        }

        return null;
    }

    private String checkSugar(FamilyMember member, String memberName) {
        List<Vitals> last2 = vitalsRepository.findTop2ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(
                member.getId(), "SUGAR");

        if (last2.size() < 2) return null;

        boolean allHigh = last2.stream()
                .allMatch(v -> v.getValuePrimary() > 126);
        if (allHigh) {
            return String.format(
                    "FamilyCare ALERT: %s has had 2 consecutive HIGH blood sugar readings (> 126 mg/dL). " +
                    "Latest: %.0f mg/dL. Please consult a doctor.",
                    memberName, last2.get(0).getValuePrimary());
        }

        return null;
    }

    private String checkPulse(Vitals vital, String memberName) {
        double pulse = vital.getValuePrimary();
        if (pulse < 50) {
            return String.format(
                    "FamilyCare ALERT: %s has a dangerously LOW pulse of %.0f bpm. Seek immediate medical attention.",
                    memberName, pulse);
        }
        if (pulse > 110) {
            return String.format(
                    "FamilyCare ALERT: %s has a dangerously HIGH pulse of %.0f bpm. Seek immediate medical attention.",
                    memberName, pulse);
        }
        return null;
    }

    private String checkSpO2(Vitals vital, String memberName) {
        double spo2 = vital.getValuePrimary();
        if (spo2 < 92) {
            return String.format(
                    "FamilyCare ALERT: %s has LOW oxygen saturation of %.0f%%. This is dangerous. Seek immediate medical help.",
                    memberName, spo2);
        }
        return null;
    }
}
