package com.familycare.scheduler;

import com.familycare.model.MedicineLog;
import com.familycare.model.ReminderLog;
import com.familycare.repository.MedicineLogRepository;
import com.familycare.repository.MedicineRepository;
import com.familycare.repository.ReminderLogRepository;
import com.familycare.service.ReminderService;
import com.familycare.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final ReminderService reminderService;
    private final WhatsAppService whatsAppService;
    private final ReminderLogRepository reminderLogRepository;
    private final MedicineRepository medicineRepository;
    private final MedicineLogRepository medicineLogRepository;

    @Scheduled(cron = "0 * * * * *")
    public void checkAndSendReminders() {
        List<Map<String, String>> dueReminders = reminderService.getDueReminders();

        if (dueReminders.isEmpty()) return;

        log.info("Found {} due reminders", dueReminders.size());

        for (Map<String, String> reminder : dueReminders) {
            try {
                String phone = reminder.get("phone");
                String memberName = reminder.get("memberName");
                String medicineName = reminder.get("medicineName");
                String dosage = reminder.get("dosage");
                String timing = reminder.get("timing");

                if (phone == null || phone.isBlank()) {
                    log.warn("Skipping reminder for {} - no phone number", memberName);
                    continue;
                }

                String message = String.format(
                        "FamilyCare Reminder: Hi %s, time to take %s (%s) - %s dose. Stay healthy!",
                        memberName, medicineName, dosage, timing
                );

                boolean sent = whatsAppService.sendWhatsApp(phone, message);

                // Log the reminder
                UUID medicineId = UUID.fromString(reminder.get("medicineId"));
                UUID memberId = UUID.fromString(reminder.get("memberId"));

                medicineRepository.findById(medicineId).ifPresent(medicine -> {
                    ReminderLog reminderLog = ReminderLog.builder()
                            .medicine(medicine)
                            .familyMember(medicine.getFamilyMember())
                            .channel("WHATSAPP")
                            .status(sent ? "SENT" : "FAILED")
                            .sentAt(LocalDateTime.now())
                            .message(message)
                            .build();
                    reminderLogRepository.save(reminderLog);
                });

                // Create a PENDING medicine log for tracking
                medicineRepository.findById(medicineId).ifPresent(medicine -> {
                    MedicineLog medicineLog = MedicineLog.builder()
                            .medicine(medicine)
                            .familyMember(medicine.getFamilyMember())
                            .scheduledTime(LocalDateTime.now())
                            .status("PENDING")
                            .doseTiming(timing.toUpperCase())
                            .build();
                    medicineLogRepository.save(medicineLog);
                });

            } catch (Exception e) {
                log.error("Error processing reminder: {}", e.getMessage());
            }
        }
    }

    @Scheduled(fixedRate = 1800000)
    public void checkEscalations() {
        LocalDateTime thirtyMinAgo = LocalDateTime.now().minusMinutes(30);
        List<MedicineLog> pendingLogs = medicineLogRepository.findByStatusAndCreatedAtBefore("PENDING", thirtyMinAgo);

        for (MedicineLog pendingLog : pendingLogs) {
            try {
                pendingLog.setStatus("MISSED");
                medicineLogRepository.save(pendingLog);

                // Send escalation to family head
                String familyHeadPhone = pendingLog.getFamilyMember().getUser().whatsappPhoneOrFallback();
                if (familyHeadPhone != null && !familyHeadPhone.isBlank()) {
                    String message = String.format(
                            "FamilyCare Alert: %s missed their %s dose of %s. Please check on them.",
                            pendingLog.getFamilyMember().getName(),
                            pendingLog.getDoseTiming(),
                            pendingLog.getMedicine().getName()
                    );
                    whatsAppService.sendWhatsApp(familyHeadPhone, message);

                    ReminderLog escalationLog = ReminderLog.builder()
                            .medicine(pendingLog.getMedicine())
                            .familyMember(pendingLog.getFamilyMember())
                            .channel("WHATSAPP")
                            .status("ESCALATED")
                            .sentAt(LocalDateTime.now())
                            .message(message)
                            .build();
                    reminderLogRepository.save(escalationLog);
                }

                log.info("Escalation sent for missed dose: {} - {}",
                        pendingLog.getMedicine().getName(), pendingLog.getDoseTiming());
            } catch (Exception e) {
                log.error("Error processing escalation: {}", e.getMessage());
            }
        }
    }
}
