package com.familycare.service;

import com.familycare.model.Medicine;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REMINDER_PREFIX = "reminder:";
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public boolean scheduleReminder(Medicine medicine, String timing, String time) {
        try {
            String frequency = medicine.getFrequency();
            // "As needed" medicines must never auto-fire. Skip scheduling entirely so a stale
            // Redis key can't keep paging the patient daily even after the form was changed.
            if (isAsNeeded(frequency)) {
                log.info("Skipping reminder schedule for as-needed medicine {} ({})",
                        medicine.getId(), medicine.getName());
                return false;
            }

            String key = buildKey(medicine.getFamilyMember().getId(), medicine.getId(), timing);

            Map<String, String> value = new HashMap<>();
            value.put("medicineId", medicine.getId().toString());
            value.put("memberId", medicine.getFamilyMember().getId().toString());
            value.put("medicineName", medicine.getName());
            value.put("dosage", medicine.getDosage());
            value.put("phone", medicine.getFamilyMember().whatsappPhoneOrFallback());
            value.put("memberName", medicine.getFamilyMember().getName());
            value.put("scheduledTime", time);
            value.put("timing", timing);
            value.put("frequency", frequency == null ? "" : frequency);
            // ISO end date so shouldFireToday can stop reminders the day after a course ends
            // (e.g. 7-day antibiotic). Null endDate = open-ended med, fires forever.
            if (medicine.getEndDate() != null) {
                value.put("endDate", medicine.getEndDate().toString());
            }
            // Weekly reminders fire on the user-picked day (medicine.weeklyDay), or fall
            // back to the startDate's day-of-week if the user hasn't picked one yet (legacy
            // rows from before the picker existed). Stored as the DayOfWeek name ("MONDAY")
            // so getDueReminders can compare without re-fetching the Medicine row each minute.
            if (isWeekly(frequency)) {
                String anchor = medicine.getWeeklyDay();
                if ((anchor == null || anchor.isBlank()) && medicine.getStartDate() != null) {
                    anchor = medicine.getStartDate().getDayOfWeek().name();
                }
                if (anchor != null && !anchor.isBlank()) {
                    value.put("weeklyAnchorDay", anchor);
                }
            }

            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json);
            log.info("Scheduled reminder: {} at {} (frequency={})", key, time, frequency);
            return true;
        } catch (Exception e) {
            log.error("Failed to schedule reminder for medicine {}: {}", medicine.getId(), e.getMessage());
            return false;
        }
    }

    public void removeReminder(UUID medicineId, String timing, UUID memberId) {
        String key = buildKey(memberId, medicineId, timing);
        redisTemplate.delete(key);
        log.info("Removed reminder: {}", key);
    }

    public void removeAllReminders(UUID medicineId, UUID memberId) {
        for (String timing : List.of("morning", "afternoon", "night")) {
            removeReminder(medicineId, timing, memberId);
        }
    }

    public List<Map<String, String>> getDueReminders() {
        List<Map<String, String>> dueReminders = new ArrayList<>();
        LocalDate todayDate = LocalDate.now();
        String currentTime = LocalTime.now().format(TIME_FORMAT);
        DayOfWeek today = todayDate.getDayOfWeek();

        try {
            Set<String> keys = redisTemplate.keys(REMINDER_PREFIX + "*");
            if (keys == null) return dueReminders;

            for (String key : keys) {
                String json = redisTemplate.opsForValue().get(key);
                if (json == null) continue;

                @SuppressWarnings("unchecked")
                Map<String, String> reminder = objectMapper.readValue(json, Map.class);
                String scheduledTime = reminder.get("scheduledTime");

                if (!currentTime.equals(scheduledTime)) continue;
                if (!shouldFireToday(reminder, today, todayDate)) continue;

                reminder.put("redisKey", key);
                dueReminders.add(reminder);
            }
        } catch (Exception e) {
            log.error("Failed to get due reminders: {}", e.getMessage());
        }

        return dueReminders;
    }

    private boolean shouldFireToday(Map<String, String> reminder, DayOfWeek today, LocalDate todayDate) {
        String frequency = reminder.get("frequency");
        if (isAsNeeded(frequency)) return false;

        // Honor endDate: a 7-day course should stop reminding after day 7. Past endDate wins
        // over weekly day-match — we never want to fire a reminder for a finished course.
        String endDateStr = reminder.get("endDate");
        if (endDateStr != null && !endDateStr.isBlank()) {
            try {
                LocalDate endDate = LocalDate.parse(endDateStr);
                if (todayDate.isAfter(endDate)) return false;
            } catch (Exception e) {
                // Malformed endDate → ignore the gate, don't crash the loop.
            }
        }

        if (isWeekly(frequency)) {
            String anchor = reminder.get("weeklyAnchorDay");
            // Missing anchor (legacy reminder written before this fix) → fall through to fire,
            // matching old behavior. New reminders always populate it when startDate is set.
            if (anchor == null || anchor.isBlank()) return true;
            try {
                return DayOfWeek.valueOf(anchor) == today;
            } catch (IllegalArgumentException e) {
                return true;
            }
        }
        return true;
    }

    private boolean isAsNeeded(String frequency) {
        return frequency != null && frequency.toLowerCase().contains("as needed");
    }

    private boolean isWeekly(String frequency) {
        return frequency != null && frequency.toLowerCase().contains("weekly");
    }

    private String buildKey(UUID memberId, UUID medicineId, String timing) {
        return REMINDER_PREFIX + memberId + ":" + medicineId + ":" + timing;
    }
}
