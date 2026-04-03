package com.familycare.service;

import com.familycare.dto.response.AdherenceSummaryDTO;
import com.familycare.dto.response.DailyScheduleResponse;
import com.familycare.dto.response.DoseSlotDTO;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.*;
import com.familycare.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final MedicineRepository medicineRepository;
    private final MedicineLogRepository medicineLogRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public DailyScheduleResponse getMyDailySchedule(LocalDate date, String userEmail) {
        User user = getUser(userEmail);

        if (!"MEMBER".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only patient accounts can access this endpoint");
        }

        FamilyMember member = familyMemberRepository.findByLinkedUserId(user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));

        return buildSchedule(member, date);
    }

    @Transactional(readOnly = true)
    public DailyScheduleResponse getMemberDailySchedule(UUID memberId, LocalDate date, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can access this endpoint");
        }

        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        return buildSchedule(member, date);
    }

    @Transactional(readOnly = true)
    public List<DailyScheduleResponse> getFamilyOverview(LocalDate date, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can access this endpoint");
        }

        List<FamilyMember> members = familyMemberRepository.findByUserId(user.getId());
        return members.stream()
                .map(member -> buildSchedule(member, date))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdherenceSummaryDTO> getAdherenceSummary(int month, int year, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can access this endpoint");
        }

        List<FamilyMember> members = familyMemberRepository.findByUserId(user.getId());
        YearMonth ym = YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        // Don't count future days
        LocalDate today = LocalDate.now();
        LocalDate effectiveEnd = monthEnd.isAfter(today) ? today : monthEnd;

        return members.stream()
                .map(member -> buildAdherence(member, monthStart, effectiveEnd))
                .filter(dto -> dto.getTotalExpected() > 0)
                .collect(Collectors.toList());
    }

    private AdherenceSummaryDTO buildAdherence(FamilyMember member, LocalDate from, LocalDate to) {
        List<Medicine> medicines = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());

        // Count expected doses across date range
        int totalExpected = 0;
        for (Medicine medicine : medicines) {
            Map<String, String> timing = deserializeTiming(medicine.getTiming());
            if (timing == null || timing.isEmpty()) continue;
            int timingsPerDay = timing.size();

            LocalDate medStart = medicine.getStartDate() != null ? medicine.getStartDate() : from;
            LocalDate medEnd = medicine.getEndDate() != null ? medicine.getEndDate() : to;

            LocalDate effectiveStart = medStart.isBefore(from) ? from : medStart;
            LocalDate effectiveEnd = medEnd.isAfter(to) ? to : medEnd;

            if (effectiveStart.isAfter(effectiveEnd)) continue;

            long days = effectiveStart.until(effectiveEnd).getDays() + 1;
            totalExpected += (int) days * timingsPerDay;
        }

        // Count actual logs in range
        LocalDateTime rangeStart = from.atStartOfDay();
        LocalDateTime rangeEnd = to.atTime(LocalTime.MAX);
        List<MedicineLog> logs = medicineLogRepository.findByFamilyMemberIdAndScheduledTimeBetween(
                member.getId(), rangeStart, rangeEnd);

        int taken = 0;
        int missed = 0;
        int skipped = 0;
        for (MedicineLog log : logs) {
            switch (log.getStatus()) {
                case "TAKEN" -> taken++;
                case "MISSED" -> missed++;
                case "SKIPPED" -> skipped++;
            }
        }

        // Doses with no log in past = missed (not recorded in logs)
        int loggedTotal = taken + missed + skipped;
        int unloggedMissed = totalExpected - loggedTotal;
        if (unloggedMissed > 0) {
            missed += unloggedMissed;
        }

        double adherencePercent = totalExpected > 0
                ? Math.round((taken * 100.0) / totalExpected * 10.0) / 10.0
                : 0.0;

        return AdherenceSummaryDTO.builder()
                .memberId(member.getId())
                .memberName(member.getName())
                .totalExpected(totalExpected)
                .taken(taken)
                .missed(missed)
                .skipped(skipped)
                .adherencePercent(adherencePercent)
                .build();
    }

    private DailyScheduleResponse buildSchedule(FamilyMember member, LocalDate date) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

        List<Medicine> medicines = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());
        List<MedicineLog> dayLogs = medicineLogRepository.findByFamilyMemberIdAndScheduledTimeBetween(
                member.getId(), dayStart, dayEnd);

        // Index logs by medicineId + doseTiming for fast lookup
        Map<String, MedicineLog> logIndex = new HashMap<>();
        for (MedicineLog ml : dayLogs) {
            String key = ml.getMedicine().getId() + ":" + ml.getDoseTiming();
            logIndex.put(key, ml);
        }

        LocalDateTime now = LocalDateTime.now();
        List<DoseSlotDTO> slots = new ArrayList<>();

        for (Medicine medicine : medicines) {
            // Check date range
            if (medicine.getStartDate() != null && date.isBefore(medicine.getStartDate())) continue;
            if (medicine.getEndDate() != null && date.isAfter(medicine.getEndDate())) continue;

            Map<String, String> timing = deserializeTiming(medicine.getTiming());
            if (timing == null || timing.isEmpty()) continue;

            for (Map.Entry<String, String> entry : timing.entrySet()) {
                String timingKey = entry.getKey();
                String timeStr = entry.getValue();
                if (timeStr == null || timeStr.isBlank()) continue;

                LocalTime scheduledLocalTime = LocalTime.parse(timeStr);
                LocalDateTime scheduledDateTime = date.atTime(scheduledLocalTime);

                String lookupKey = medicine.getId() + ":" + timingKey;
                MedicineLog existingLog = logIndex.get(lookupKey);

                String status;
                LocalDateTime takenAt = null;
                UUID logId = null;
                String markedByName = null;

                if (existingLog != null) {
                    status = existingLog.getStatus();
                    takenAt = existingLog.getTakenAt();
                    logId = existingLog.getId();
                    if (existingLog.getMarkedBy() != null) {
                        markedByName = existingLog.getMarkedBy().getName();
                    }
                } else if (scheduledDateTime.isBefore(now) && date.equals(LocalDate.now())) {
                    status = "MISSED";
                } else {
                    status = "PENDING";
                }

                slots.add(DoseSlotDTO.builder()
                        .medicineId(medicine.getId())
                        .medicineName(medicine.getName())
                        .dosage(medicine.getDosage())
                        .form(medicine.getForm())
                        .timingKey(timingKey)
                        .scheduledTime(timeStr)
                        .status(status)
                        .takenAt(takenAt)
                        .logId(logId)
                        .markedByName(markedByName)
                        .withFood(medicine.getWithFood())
                        .build());
            }
        }

        // Sort slots by scheduled time
        slots.sort(Comparator.comparing(DoseSlotDTO::getScheduledTime));

        return DailyScheduleResponse.builder()
                .date(date)
                .memberId(member.getId())
                .memberName(member.getName())
                .slots(slots)
                .build();
    }

    private Map<String, String> deserializeTiming(String timing) {
        if (timing == null || timing.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(timing, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }
}
