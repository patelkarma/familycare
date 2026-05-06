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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

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

        // Mark every pending/missed log in the same dose slot — when two medicines
        // both fire at 9 AM (same MORNING slot), one "ok" reply means the user
        // took both. Without this, only the closest-time match got marked and the
        // sibling dose silently stayed PENDING.
        List<MedicineLog> batch = collectSlotMates(member, target);

        List<String> marked = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();
        for (MedicineLog logEntry : batch) {
            Medicine medicine = logEntry.getMedicine();
            try {
                medicineService.markTakenInternal(
                        medicine, logEntry.getDoseTiming(), "Confirmed via WhatsApp",
                        ctx.getHeadUser(), "WHATSAPP");
                marked.add(medicine.getName());
            } catch (CustomExceptions.ConflictException e) {
                conflicts.add(medicine.getName());
            } catch (Exception e) {
                log.error("markTakenInternal failed for medicine={}", medicine.getId(), e);
            }
        }

        if (marked.isEmpty()) {
            return conflicts.isEmpty()
                    ? "Couldn't mark the dose right now. Please try again or use the app."
                    : "Heads up: " + String.join(", ", conflicts) + " already marked earlier.";
        }

        String slot = target.getDoseTiming() == null
                ? "current" : target.getDoseTiming().toLowerCase();
        String body = String.format("Marked %s (%s dose) as taken at %s. Stay healthy!",
                joinNames(marked), slot, TIME_FMT.format(LocalDateTime.now()));
        if (!conflicts.isEmpty()) {
            body += " (" + String.join(", ", conflicts) + " was already marked.)";
        }
        return body;
    }

    /**
     * Picks the PENDING (or MISSED) MedicineLog the user most likely means. Strategy:
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
        List<MedicineLog> pendingFirst = medicineLogRepository
                .findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                        member.getId(), "PENDING", startOfDay, endOfDay);
        List<MedicineLog> pending = pendingFirst.isEmpty()
                ? medicineLogRepository.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                        member.getId(), "MISSED", startOfDay, endOfDay)
                : pendingFirst;

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

    /**
     * Returns every PENDING/MISSED log today that shares the target's dose slot
     * (MORNING / AFTERNOON / NIGHT). When the target's doseTiming is null we
     * conservatively return only the target itself — without a slot key we can't
     * safely batch and risk over-marking.
     */
    private List<MedicineLog> collectSlotMates(FamilyMember member, MedicineLog target) {
        String slot = target.getDoseTiming();
        if (slot == null) {
            return List.of(target);
        }
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<MedicineLog> all = new ArrayList<>();
        all.addAll(medicineLogRepository.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                member.getId(), "PENDING", startOfDay, endOfDay));
        all.addAll(medicineLogRepository.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                member.getId(), "MISSED", startOfDay, endOfDay));

        List<MedicineLog> mates = all.stream()
                .filter(l -> slot.equals(l.getDoseTiming()))
                .sorted(Comparator.comparing(MedicineLog::getScheduledTime,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        // Defensive: if for any reason the target isn't in the slot query (e.g. it
        // was already mutated mid-transaction), fall back to single-mark.
        return mates.stream().anyMatch(l -> Objects.equals(l.getId(), target.getId()))
                ? mates
                : List.of(target);
    }

    private String joinNames(List<String> names) {
        if (names.size() == 1) return names.get(0);
        if (names.size() == 2) return names.get(0) + " and " + names.get(1);
        int last = names.size() - 1;
        return String.join(", ", names.subList(0, last)) + " and " + names.get(last);
    }
}
