package com.familycare.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardSummaryResponse {

    private LocalDate date;
    private int memberCount;
    private int activeMedicineCount;
    private int vitalsLoggedThisWeek;
    private DoseStats todayDoseStats;
    private List<FamilyMemberResponse> members;
    private List<DailyScheduleResponse> familySchedules;
    private List<AppointmentResponse> upcomingAppointments;
    private List<ReportResponse> recentReports;
    private List<LowStockMedicine> lowStockMedicines;
    private List<DashboardAlert> alerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DoseStats {
        private int total;
        private int taken;
        private int missed;
        private int pending;
        private int skipped;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockMedicine {
        private UUID medicineId;
        private String medicineName;
        private UUID memberId;
        private String memberName;
        private Integer stockCount;
        private Integer lowStockAlert;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardAlert {
        private String type;     // LOW_STOCK | MISSED_DOSE | UPCOMING_APPOINTMENT | VITAL_TREND
        private String severity; // INFO | WARNING | CRITICAL
        // Pre-formatted English message — kept as a fallback for clients that don't
        // know the messageKey vocabulary (or for older clients during a rollout).
        private String message;
        // i18n key under "dashboard.alerts.*" — frontend renders it with params via
        // i18next interpolation so the alert reads in the user's selected language.
        private String messageKey;
        // Interpolation params for the messageKey (count, memberName, medicineName,
        // doctorLabel, when, etc.). Frontend feeds these directly to t(key, params).
        private Map<String, Object> params;
        private UUID relatedMemberId;
    }
}
