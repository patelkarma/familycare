package com.familycare.service.whatsapp.handlers;

import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.model.MedicineLog;
import com.familycare.repository.MedicineLogRepository;
import com.familycare.service.MedicineService;
import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TakenIntentHandler implements IntentHandler {

    private static final long MATCH_WINDOW_MINUTES = 90;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

    private final MedicineLogRepository medicineLogRepository;
    private final MedicineService medicineService;

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.TAKEN;
    }

    @Override
    @Transactional
    public String handle(Intent intent, SenderContext ctx) {
        if (ctx.isAmbiguous()) {
            return "You manage " + ctx.getCandidates().size()
                    + " members. Reply with the member name (e.g. 'TAKEN MOM').";
        }

        FamilyMember member = ctx.getMember();
        if (member == null) {
            return "No family member linked to your number. Ask your family to add you.";
        }

        MedicineLog target = pickPendingLog(member);
        if (target == null) {
            return "No pending dose found for " + member.getName()
                    + " right now. Reply STOCK to see medicines.";
        }

        Medicine medicine = target.getMedicine();
        try {
            medicineService.markTakenInternal(
                    medicine, target.getDoseTiming(), "Confirmed via WhatsApp",
                    ctx.getHeadUser(), "WHATSAPP");
        } catch (CustomExceptions.ConflictException e) {
            return "Heads up: " + e.getMessage();
        } catch (Exception e) {
            log.error("markTakenInternal failed for medicine={}", medicine.getId(), e);
            return "Couldn't mark the dose right now. Please try again or use the app.";
        }

        return String.format("Marked %s (%s dose) as taken at %s. Stay healthy!",
                medicine.getName(),
                target.getDoseTiming() == null ? "current" : target.getDoseTiming().toLowerCase(),
                TIME_FMT.format(LocalDateTime.now()));
    }

    /**
     * Picks the PENDING MedicineLog the user most likely means. Strategy:
     *   1. Today's PENDING logs only.
     *   2. Among those, prefer the one whose scheduledTime is closest to now()
     *      AND within ±MATCH_WINDOW_MINUTES.
     *   3. Fall back to the earliest PENDING log of the day.
     */
    private MedicineLog pickPendingLog(FamilyMember member) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        // PENDING preferred, MISSED accepted as a fallback. Elderly users often reply
        // hours after the reminder — by then the 30-min watchdog has already flipped
        // the dose to MISSED. Without this fallback, "ok" / "lia" / "✅" would hit
        // "no pending dose" even though they obviously meant the morning reminder
        // they're now responding to.
        List<MedicineLog> pending = medicineLogRepository
                .findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                        member.getId(), "PENDING", startOfDay, endOfDay);
        if (pending.isEmpty()) {
            pending = medicineLogRepository
                    .findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                            member.getId(), "MISSED", startOfDay, endOfDay);
        }

        if (pending.isEmpty()) return null;

        return pending.stream()
                .filter(l -> l.getScheduledTime() != null)
                .filter(l -> Math.abs(Duration.between(l.getScheduledTime(), now).toMinutes())
                        <= MATCH_WINDOW_MINUTES)
                .min(Comparator.comparingLong(l ->
                        Math.abs(Duration.between(l.getScheduledTime(), now).toMinutes())))
                .orElseGet(() -> pending.stream()
                        .filter(l -> l.getScheduledTime() != null)
                        .min(Comparator.comparing(MedicineLog::getScheduledTime))
                        .orElse(null));
    }
}
