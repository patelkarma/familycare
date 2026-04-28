package com.familycare.service;

import com.familycare.model.Medicine;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

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

    public void scheduleReminder(Medicine medicine, String timing, String time) {
        try {
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

            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json);
            log.info("Scheduled reminder: {} at {}", key, time);
        } catch (Exception e) {
            log.error("Failed to schedule reminder for medicine {}: {}", medicine.getId(), e.getMessage());
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
        String currentTime = LocalTime.now().format(TIME_FORMAT);

        try {
            Set<String> keys = redisTemplate.keys(REMINDER_PREFIX + "*");
            if (keys == null) return dueReminders;

            for (String key : keys) {
                String json = redisTemplate.opsForValue().get(key);
                if (json == null) continue;

                @SuppressWarnings("unchecked")
                Map<String, String> reminder = objectMapper.readValue(json, Map.class);
                String scheduledTime = reminder.get("scheduledTime");

                if (currentTime.equals(scheduledTime)) {
                    reminder.put("redisKey", key);
                    dueReminders.add(reminder);
                }
            }
        } catch (Exception e) {
            log.error("Failed to get due reminders: {}", e.getMessage());
        }

        return dueReminders;
    }

    private String buildKey(UUID memberId, UUID medicineId, String timing) {
        return REMINDER_PREFIX + memberId + ":" + medicineId + ":" + timing;
    }
}
