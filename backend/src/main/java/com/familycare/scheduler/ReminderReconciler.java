package com.familycare.scheduler;

import com.familycare.model.Medicine;
import com.familycare.repository.MedicineRepository;
import com.familycare.service.ReminderService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Re-writes every active medicine's Redis reminder keys on startup so they include the new
 * frequency / weeklyAnchorDay fields. Keys created before the frequency-aware fix are missing
 * those fields and would still fire daily for Weekly meds; running this on every boot keeps
 * Redis in sync with the database without requiring a separate backfill migration.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderReconciler {

    private final MedicineRepository medicineRepository;
    private final ReminderService reminderService;
    private final ObjectMapper objectMapper;

    // @Transactional keeps the JPA session open for the whole reconcile. Without it,
    // medicine.getFamilyMember() throws "no session" because Medicine.familyMember is
    // lazy-loaded — the session closes the moment findByIsActiveTrue() returns.
    @EventListener(ApplicationReadyEvent.class)
    @Transactional(readOnly = true)
    public void reconcile() {
        List<Medicine> active = medicineRepository.findByIsActiveTrue();
        int succeeded = 0;
        int failed = 0;
        int cleared = 0;
        int skippedAsNeeded = 0;

        for (Medicine medicine : active) {
            try {
                // Always wipe first: handles the case where a medicine was edited from
                // "Once daily" → "As needed" (the new scheduleReminder skips writing, but
                // an old key from the previous frequency would otherwise linger forever).
                reminderService.removeAllReminders(medicine.getId(), medicine.getFamilyMember().getId());
                cleared++;

                Map<String, String> timing = parseTiming(medicine.getTiming());
                for (Map.Entry<String, String> slot : timing.entrySet()) {
                    String time = slot.getValue();
                    if (time == null || time.isBlank()) continue;
                    boolean wrote = reminderService.scheduleReminder(medicine, slot.getKey(), time);
                    if (wrote) succeeded++;
                    else if (isAsNeeded(medicine)) skippedAsNeeded++;
                    else failed++;
                }
            } catch (Exception e) {
                log.error("Failed to reconcile reminders for medicine {}: {}",
                        medicine.getId(), e.getMessage());
                failed++;
            }
        }

        log.info("Reminder reconcile complete: {} medicines cleared, {} slots written, {} failed, {} skipped (as-needed)",
                cleared, succeeded, failed, skippedAsNeeded);
    }

    private boolean isAsNeeded(Medicine medicine) {
        return medicine.getFrequency() != null
                && medicine.getFrequency().toLowerCase().contains("as needed");
    }

    private Map<String, String> parseTiming(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
