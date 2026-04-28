package com.familycare.service;

import com.familycare.model.FamilyMember;
import com.familycare.model.MedicalReport;
import com.familycare.model.Medicine;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;

/**
 * Composes the SOS message bodies sent to emergency contacts.
 * - WhatsApp: rich multiline body with all health context + Google Maps link + pinned report links
 * - SMS: trimmed single-segment-friendly body (~3 lines, no URLs except Maps)
 */
@Component
public class SosMessageBuilder {

    private static final int MAX_PINNED_REPORTS = 3;

    public String buildWhatsApp(FamilyMember member,
                                List<Medicine> activeMedicines,
                                List<MedicalReport> pinnedReports,
                                Double lat, Double lng) {
        StringBuilder sb = new StringBuilder();
        sb.append("🚨 *FAMILYCARE EMERGENCY ALERT* 🚨\n\n");
        sb.append("*").append(safe(member.getName())).append("* needs immediate help.\n\n");

        sb.append("*PATIENT INFO*\n");
        Integer age = ageOf(member.getDateOfBirth());
        if (age != null) sb.append("• Age: ").append(age).append("\n");
        if (notBlank(member.getGender())) sb.append("• Gender: ").append(member.getGender()).append("\n");
        if (notBlank(member.getBloodGroup())) sb.append("• Blood group: ").append(member.getBloodGroup()).append("\n");
        if (notBlank(member.getAllergies())) sb.append("• Allergies: ").append(member.getAllergies()).append("\n");
        if (notBlank(member.getChronicDiseases())) sb.append("• Chronic conditions: ").append(member.getChronicDiseases()).append("\n");
        sb.append("\n");

        if (activeMedicines != null && !activeMedicines.isEmpty()) {
            sb.append("*CURRENT MEDICATIONS*\n");
            for (Medicine m : activeMedicines) {
                sb.append("• ").append(m.getName());
                if (notBlank(m.getDosage())) sb.append(" — ").append(m.getDosage());
                sb.append("\n");
            }
            sb.append("\n");
        }

        sb.append("*LOCATION*\n");
        if (lat != null && lng != null) {
            sb.append(googleMapsUrl(lat, lng)).append("\n\n");
        } else {
            sb.append("⚠️ Location unavailable — please call them to confirm.\n\n");
        }

        if (pinnedReports != null && !pinnedReports.isEmpty()) {
            sb.append("*EMERGENCY MEDICAL REPORTS*\n");
            int count = 0;
            for (MedicalReport r : pinnedReports) {
                if (count >= MAX_PINNED_REPORTS) break;
                sb.append("• ").append(safe(r.getTitle()));
                if (notBlank(r.getFileUrl())) sb.append("\n  ").append(r.getFileUrl());
                sb.append("\n");
                count++;
            }
            sb.append("\n");
        }

        sb.append("📞 If life-threatening, call *108* (ambulance) immediately.\n");
        sb.append("— Sent automatically by FamilyCare");
        return sb.toString();
    }

    public String buildSms(FamilyMember member,
                           List<Medicine> activeMedicines,
                           Double lat, Double lng) {
        StringBuilder sb = new StringBuilder();
        sb.append("FamilyCare SOS: ").append(safe(member.getName())).append(" needs help.");
        if (notBlank(member.getBloodGroup())) sb.append(" Blood ").append(member.getBloodGroup()).append(".");
        if (notBlank(member.getAllergies())) sb.append(" Allergies: ").append(member.getAllergies()).append(".");
        if (activeMedicines != null && !activeMedicines.isEmpty()) {
            sb.append(" On ").append(activeMedicines.size()).append(" meds.");
        }
        if (lat != null && lng != null) {
            sb.append(" Loc: ").append(googleMapsUrl(lat, lng));
        } else {
            sb.append(" Location unknown.");
        }
        sb.append(" Call 108 if critical.");
        return sb.toString();
    }

    private String googleMapsUrl(double lat, double lng) {
        return "https://maps.google.com/?q=" + lat + "," + lng;
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private Integer ageOf(LocalDate dob) {
        if (dob == null) return null;
        return Period.between(dob, LocalDate.now()).getYears();
    }
}
