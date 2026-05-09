package com.familycare.service;

import com.familycare.dto.response.*;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.Appointment;
import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.model.User;
import com.familycare.repository.AppointmentRepository;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.MedicineRepository;
import com.familycare.repository.ReminderLogRepository;
import com.familycare.repository.UserRepository;
import com.familycare.repository.VitalsRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private static final String CACHE_PREFIX = "dashboard:";
    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private static final int RECENT_REPORTS_LIMIT = 6;
    private static final int UPCOMING_APPOINTMENTS_DAYS = 14;
    // Reminder cron fires every minute, so any active user should see at least
    // one SENT row per day. 26h gives a 2h grace window for timezone edges and
    // the morning slot. Below this we treat WhatsApp as dormant.
    private static final long DORMANT_HOURS = 26L;

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;
    private final VitalsRepository vitalsRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final ScheduleService scheduleService;
    private final ReportService reportService;
    private final FamilyService familyService;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));

        String cacheKey = CACHE_PREFIX + user.getId();
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, DashboardSummaryResponse.class);
            }
        } catch (Exception e) {
            log.warn("Dashboard cache read failed for {}: {}", userEmail, e.getMessage());
        }

        DashboardSummaryResponse summary = buildSummary(user, userEmail);

        try {
            redisTemplate.opsForValue().set(
                    cacheKey, objectMapper.writeValueAsString(summary), CACHE_TTL);
        } catch (Exception e) {
            log.warn("Dashboard cache write failed for {}: {}", userEmail, e.getMessage());
        }

        return summary;
    }

    public void invalidateCache(UUID userId) {
        try {
            redisTemplate.delete(CACHE_PREFIX + userId);
        } catch (Exception e) {
            log.warn("Dashboard cache invalidate failed: {}", e.getMessage());
        }
    }

    private DashboardSummaryResponse buildSummary(User user, String userEmail) {
        LocalDate today = LocalDate.now();
        boolean isCaregiver = "FAMILY_HEAD".equals(user.getRole());

        List<FamilyMemberResponse> members = isCaregiver
                ? familyService.getAllMembers(userEmail)
                : List.of();

        List<DailyScheduleResponse> familySchedules = isCaregiver
                ? scheduleService.getFamilyOverview(today, userEmail)
                : List.of();

        DashboardSummaryResponse.DoseStats stats = computeDoseStats(familySchedules);
        Set<UUID> activeMedicineIds = collectActiveMedicineIds(familySchedules);

        int vitalsThisWeek = isCaregiver
                ? (int) vitalsRepository.countByFamilyMember_User_IdAndRecordedAtAfter(
                        user.getId(), LocalDateTime.now().minusDays(7))
                : 0;

        List<DashboardSummaryResponse.LowStockMedicine> lowStock = isCaregiver
                ? collectLowStock(user.getId())
                : List.of();

        List<AppointmentResponse> upcoming = isCaregiver
                ? collectUpcomingAppointments(user.getId())
                : List.of();

        List<ReportResponse> recentReports = isCaregiver
                ? reportService.getRecentReportsForUser(userEmail, RECENT_REPORTS_LIMIT)
                : List.of();

        List<DashboardSummaryResponse.DashboardAlert> alerts = buildAlerts(
                stats, lowStock, upcoming, familySchedules,
                user.getId(), activeMedicineIds);

        return DashboardSummaryResponse.builder()
                .date(today)
                .memberCount(members.size())
                .activeMedicineCount(activeMedicineIds.size())
                .vitalsLoggedThisWeek(vitalsThisWeek)
                .members(members)
                .familySchedules(familySchedules)
                .todayDoseStats(stats)
                .lowStockMedicines(lowStock)
                .upcomingAppointments(upcoming)
                .recentReports(recentReports)
                .alerts(alerts)
                .build();
    }

    private DashboardSummaryResponse.DoseStats computeDoseStats(List<DailyScheduleResponse> schedules) {
        int taken = 0, missed = 0, pending = 0, skipped = 0, total = 0;
        for (DailyScheduleResponse schedule : schedules) {
            if (schedule.getSlots() == null) continue;
            for (DoseSlotDTO slot : schedule.getSlots()) {
                total++;
                switch (slot.getStatus()) {
                    case "TAKEN" -> taken++;
                    case "MISSED" -> missed++;
                    case "PENDING" -> pending++;
                    case "SKIPPED" -> skipped++;
                }
            }
        }
        return DashboardSummaryResponse.DoseStats.builder()
                .total(total)
                .taken(taken)
                .missed(missed)
                .pending(pending)
                .skipped(skipped)
                .build();
    }

    private Set<UUID> collectActiveMedicineIds(List<DailyScheduleResponse> schedules) {
        Set<UUID> ids = new HashSet<>();
        for (DailyScheduleResponse schedule : schedules) {
            if (schedule.getSlots() == null) continue;
            for (DoseSlotDTO slot : schedule.getSlots()) {
                if (slot.getMedicineId() != null) ids.add(slot.getMedicineId());
            }
        }
        return ids;
    }

    private List<DashboardSummaryResponse.LowStockMedicine> collectLowStock(UUID userId) {
        List<Medicine> medicines = medicineRepository.findByFamilyMemberUserIdAndIsActiveTrue(userId);
        List<DashboardSummaryResponse.LowStockMedicine> result = new ArrayList<>();
        for (Medicine m : medicines) {
            Integer stock = m.getStockCount();
            Integer threshold = m.getLowStockAlert() != null ? m.getLowStockAlert() : 5;
            if (stock == null) continue;
            if (stock <= threshold) {
                FamilyMember fm = m.getFamilyMember();
                result.add(DashboardSummaryResponse.LowStockMedicine.builder()
                        .medicineId(m.getId())
                        .medicineName(m.getName())
                        .memberId(fm != null ? fm.getId() : null)
                        .memberName(fm != null ? fm.getName() : null)
                        .stockCount(stock)
                        .lowStockAlert(threshold)
                        .build());
            }
        }
        result.sort(Comparator.comparingInt(r -> r.getStockCount() != null ? r.getStockCount() : Integer.MAX_VALUE));
        return result;
    }

    private List<AppointmentResponse> collectUpcomingAppointments(UUID userId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.plusDays(UPCOMING_APPOINTMENTS_DAYS);
        List<FamilyMember> members = familyMemberRepository.findByUserId(userId);

        List<AppointmentResponse> responses = new ArrayList<>();
        for (FamilyMember member : members) {
            List<Appointment> appts = appointmentRepository
                    .findByFamilyMemberIdAndAppointmentDateAfterOrderByAppointmentDateAsc(
                            member.getId(), now);
            for (Appointment a : appts) {
                if (a.getAppointmentDate() == null) continue;
                if (a.getAppointmentDate().isAfter(cutoff)) continue;
                responses.add(AppointmentResponse.builder()
                        .id(a.getId())
                        .familyMemberId(member.getId())
                        .familyMemberName(member.getName())
                        .doctorName(a.getDoctorName())
                        .speciality(a.getSpeciality())
                        .hospital(a.getHospital())
                        .appointmentDate(a.getAppointmentDate())
                        .notes(a.getNotes())
                        .reminderSent(Boolean.TRUE.equals(a.getReminderWeekSent()))
                        .createdAt(a.getCreatedAt())
                        .build());
            }
        }
        responses.sort(Comparator.comparing(AppointmentResponse::getAppointmentDate));
        return responses;
    }

    private List<DashboardSummaryResponse.DashboardAlert> buildAlerts(
            DashboardSummaryResponse.DoseStats stats,
            List<DashboardSummaryResponse.LowStockMedicine> lowStock,
            List<AppointmentResponse> upcoming,
            List<DailyScheduleResponse> schedules,
            UUID userId,
            Set<UUID> activeMedicineIds) {
        List<DashboardSummaryResponse.DashboardAlert> alerts = new ArrayList<>();

        // WhatsApp dormancy check — leads the alert list because if reminders
        // aren't reaching the user, the rest of the alerts mean nothing.
        if (!activeMedicineIds.isEmpty()) {
            Optional<LocalDateTime> latest = reminderLogRepository.findLatestSentForUser(userId);
            LocalDateTime now = LocalDateTime.now();
            boolean dormant = latest.isEmpty()
                    || latest.get().isBefore(now.minusHours(DORMANT_HOURS));
            if (dormant) {
                long hoursAgo = latest.map(t -> Duration.between(t, now).toHours()).orElse(-1L);
                Map<String, Object> params = new HashMap<>();
                params.put("hoursAgo", hoursAgo);
                alerts.add(DashboardSummaryResponse.DashboardAlert.builder()
                        .type("WHATSAPP_DORMANT")
                        .severity("WARNING")
                        .messageKey("whatsappDormant")
                        .params(params)
                        .message(latest.isPresent()
                                ? "WhatsApp reminders haven't been delivered in " + hoursAgo + "h. Re-join the sandbox."
                                : "WhatsApp reminders haven't been delivered yet. Re-join the sandbox.")
                        .build());
            }
        }

        if (stats.getMissed() > 0) {
            int count = stats.getMissed();
            Map<String, Object> params = new HashMap<>();
            params.put("count", count);
            alerts.add(DashboardSummaryResponse.DashboardAlert.builder()
                    .type("MISSED_DOSE")
                    .severity(count >= 3 ? "CRITICAL" : "WARNING")
                    .message(count + " dose" + (count > 1 ? "s" : "") + " missed today")
                    .messageKey("missedDose")
                    .params(params)
                    .build());
        }

        for (DashboardSummaryResponse.LowStockMedicine m : lowStock) {
            Integer stock = m.getStockCount();
            String severity = stock != null && stock == 0 ? "CRITICAL" : "WARNING";
            int count = stock == null ? 0 : stock;
            Map<String, Object> params = new HashMap<>();
            params.put("count", count);
            params.put("medicineName", m.getMedicineName());
            params.put("memberName", m.getMemberName());
            alerts.add(DashboardSummaryResponse.DashboardAlert.builder()
                    .type("LOW_STOCK")
                    .severity(severity)
                    .message(m.getMedicineName() + " for " + m.getMemberName() + " — "
                            + count + " dose" + (count == 1 ? "" : "s") + " left")
                    .messageKey("lowStock")
                    .params(params)
                    .relatedMemberId(m.getMemberId())
                    .build());
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM, h:mm a");
        LocalDateTime soon = LocalDateTime.now().plusDays(2);
        for (AppointmentResponse a : upcoming) {
            if (a.getAppointmentDate() == null) continue;
            if (a.getAppointmentDate().isAfter(soon)) break;
            String rawName = a.getDoctorName() != null ? a.getDoctorName().trim() : "";
            String doctorLabel;
            if (rawName.isEmpty()) {
                doctorLabel = "visit";
            } else if (rawName.toLowerCase().startsWith("dr.") || rawName.toLowerCase().startsWith("dr ")) {
                doctorLabel = rawName; // user already typed Dr. — don't double up
            } else {
                doctorLabel = "Dr. " + rawName;
            }
            // Pass ISO timestamp so the frontend can render the date in the user's
            // locale; keep a pre-formatted English `when` for the message fallback.
            Map<String, Object> params = new HashMap<>();
            params.put("doctorLabel", doctorLabel);
            params.put("memberName", a.getFamilyMemberName());
            params.put("when", a.getAppointmentDate().format(fmt));
            params.put("appointmentAt", a.getAppointmentDate().toString());
            alerts.add(DashboardSummaryResponse.DashboardAlert.builder()
                    .type("UPCOMING_APPOINTMENT")
                    .severity("INFO")
                    .message(doctorLabel + " for " + a.getFamilyMemberName() + " on "
                            + a.getAppointmentDate().format(fmt))
                    .messageKey("appointmentSoon")
                    .params(params)
                    .relatedMemberId(a.getFamilyMemberId())
                    .build());
        }

        return alerts;
    }
}
