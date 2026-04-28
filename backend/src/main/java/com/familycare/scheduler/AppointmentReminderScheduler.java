package com.familycare.scheduler;

import com.familycare.model.Appointment;
import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.repository.AppointmentRepository;
import com.familycare.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.BiConsumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final WhatsAppService whatsAppService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    /**
     * Hourly check between 7 AM and 10 PM IST. Walks 5 reminder stages and sends each one once
     * per appointment via WhatsApp:
     *   - 7 days before  → "in 1 week"
     *   - 3 days before  → "in 3 days"
     *   - 2 days before  → "in 2 days"
     *   - 1 day before   → "tomorrow"
     *   - Day-of         → "in X hours Y minutes" (live time-left)
     *
     * The boolean flags on Appointment dedupe — once a stage fires, that flag flips and the
     * scheduler won't re-send. Past appointments are skipped.
     */
    @Scheduled(cron = "0 0 7-22 * * *")
    @Transactional
    public void sendAppointmentReminders() {
        log.info("Checking for upcoming appointment reminders...");

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        int sent = 0;

        sent += processStage(daysFrom(today, 7), "in 1 week",
                appointmentRepository.findDueWeekReminders(startOf(today, 7), endOf(today, 7)),
                Appointment::setReminderWeekSent, now, false);

        sent += processStage(daysFrom(today, 3), "in 3 days",
                appointmentRepository.findDue3DayReminders(startOf(today, 3), endOf(today, 3)),
                Appointment::setReminder3DaySent, now, false);

        sent += processStage(daysFrom(today, 2), "in 2 days",
                appointmentRepository.findDue2DayReminders(startOf(today, 2), endOf(today, 2)),
                Appointment::setReminder2DaySent, now, false);

        sent += processStage(daysFrom(today, 1), "tomorrow",
                appointmentRepository.findDue1DayReminders(startOf(today, 1), endOf(today, 1)),
                Appointment::setReminder1DaySent, now, false);

        // Day-of: time-label is computed per-appointment (live time-left)
        sent += processStage(today, null,
                appointmentRepository.findDueDayOfReminders(startOf(today, 0), endOf(today, 0)),
                Appointment::setReminderDayOfSent, now, true);

        if (sent > 0) {
            log.info("Sent {} appointment reminders this run", sent);
        }
    }

    /**
     * Iterate one reminder window, send each appointment whose stage flag is still false,
     * then flip the flag. Appointments already in the past are skipped.
     */
    private int processStage(LocalDate targetDay, String timeLabel, List<Appointment> due,
                              BiConsumer<Appointment, Boolean> setFlag,
                              LocalDateTime now, boolean dayOf) {
        int count = 0;
        for (Appointment appt : due) {
            try {
                if (appt.getAppointmentDate().isBefore(now)) continue; // already passed

                String label = dayOf ? buildDayOfLabel(appt.getAppointmentDate(), now) : timeLabel;
                sendReminder(appt, label);
                setFlag.accept(appt, true);
                appointmentRepository.save(appt);
                count++;
                log.info("{} reminder sent for appointment: Dr. {} on {}",
                        targetDay, appt.getDoctorName(), appt.getAppointmentDate().format(DATE_FMT));
            } catch (Exception e) {
                log.error("Failed to send reminder for appointment {}: {}", appt.getId(), e.getMessage());
            }
        }
        return count;
    }

    /** Format the day-of time-left label, e.g. "today, in 3 hours 25 minutes" or "today, in 40 minutes". */
    private String buildDayOfLabel(LocalDateTime appointmentTime, LocalDateTime now) {
        Duration left = Duration.between(now, appointmentTime);
        long minutes = Math.max(0, left.toMinutes());
        if (minutes < 1) return "today, in less than a minute";
        if (minutes < 60) return "today, in " + minutes + " minute" + (minutes == 1 ? "" : "s");

        long hours = minutes / 60;
        long mins = minutes % 60;
        StringBuilder sb = new StringBuilder("today, in ");
        sb.append(hours).append(" hour").append(hours == 1 ? "" : "s");
        if (mins > 0) {
            sb.append(" ").append(mins).append(" minute").append(mins == 1 ? "" : "s");
        }
        return sb.toString();
    }

    private LocalDateTime startOf(LocalDate today, int daysAhead) {
        return today.plusDays(daysAhead).atStartOfDay();
    }

    private LocalDateTime endOf(LocalDate today, int daysAhead) {
        return today.plusDays(daysAhead).atTime(LocalTime.MAX);
    }

    private LocalDate daysFrom(LocalDate today, int daysAhead) {
        return today.plusDays(daysAhead);
    }

    private void sendReminder(Appointment appt, String timeLabel) {
        FamilyMember member = appt.getFamilyMember();
        User familyHead = member.getUser();

        String dateStr = appt.getAppointmentDate().format(DATE_FMT);
        String doctorInfo = appt.getDoctorName();
        if (appt.getSpeciality() != null && !appt.getSpeciality().isBlank()) {
            doctorInfo += " (" + appt.getSpeciality() + ")";
        }
        String locationInfo = appt.getHospital() != null && !appt.getHospital().isBlank()
                ? " at " + appt.getHospital() : "";

        // Message for the patient
        String patientMsg = String.format(
                "FamilyCare Reminder: Hi %s, you have a doctor's appointment %s.\n\n" +
                "Doctor: %s%s\nDate: %s\n\nPlease prepare any reports or questions for the visit.",
                member.getName(), timeLabel, doctorInfo, locationInfo, dateStr
        );

        // Message for the family head
        String headMsg = String.format(
                "FamilyCare Reminder: %s has a doctor's appointment %s.\n\n" +
                "Doctor: %s%s\nDate: %s\n\nPlease ensure they are prepared for the visit.",
                member.getName(), timeLabel, doctorInfo, locationInfo, dateStr
        );

        // Send to patient
        String patientPhone = member.whatsappPhoneOrFallback();
        if (patientPhone != null && !patientPhone.isBlank()) {
            whatsAppService.sendWhatsApp(patientPhone, patientMsg);
        }

        // Send to family head (avoid duplicate if same phone)
        String headPhone = familyHead.whatsappPhoneOrFallback();
        if (headPhone != null && !headPhone.isBlank() && !headPhone.equals(patientPhone)) {
            whatsAppService.sendWhatsApp(headPhone, headMsg);
        }
    }
}
