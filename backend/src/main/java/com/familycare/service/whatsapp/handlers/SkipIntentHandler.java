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
import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SkipIntentHandler implements IntentHandler {

    private static final long MATCH_WINDOW_MINUTES = 90;

    private final MedicineLogRepository medicineLogRepository;
    private final MedicineService medicineService;

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.SKIP;
    }

    @Override
    @Transactional
    public String handle(Intent intent, SenderContext ctx) {
        if (ctx.isAmbiguous()) {
            return "You manage " + ctx.getCandidates().size()
                    + " members. Reply with the member name (e.g. 'SKIP MOM').";
        }

        FamilyMember member = ctx.getMember();
        if (member == null) {
            return "No family member linked to your number. Ask your family to add you.";
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<MedicineLog> pending = medicineLogRepository
                .findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                        member.getId(), "PENDING", startOfDay, endOfDay);
        if (pending.isEmpty()) {
            return "No pending dose to skip for " + member.getName() + ".";
        }

        MedicineLog target = pending.stream()
                .filter(l -> l.getScheduledTime() != null)
                .filter(l -> Math.abs(Duration.between(l.getScheduledTime(), now).toMinutes())
                        <= MATCH_WINDOW_MINUTES)
                .min(Comparator.comparingLong(l ->
                        Math.abs(Duration.between(l.getScheduledTime(), now).toMinutes())))
                .orElseGet(() -> pending.stream()
                        .filter(l -> l.getScheduledTime() != null)
                        .min(Comparator.comparing(MedicineLog::getScheduledTime))
                        .orElse(null));

        if (target == null) {
            return "No pending dose to skip for " + member.getName() + ".";
        }

        Medicine medicine = target.getMedicine();
        try {
            medicineService.markSkippedInternal(
                    medicine, target.getDoseTiming(), "Skipped via WhatsApp",
                    ctx.getHeadUser(), "WHATSAPP");
        } catch (CustomExceptions.ConflictException e) {
            return "Heads up: " + e.getMessage();
        } catch (Exception e) {
            log.error("markSkippedInternal failed for medicine={}", medicine.getId(), e);
            return "Couldn't skip the dose right now. Please try again.";
        }

        return String.format("Skipped %s (%s dose). Family will be notified.",
                medicine.getName(),
                target.getDoseTiming() == null ? "current" : target.getDoseTiming().toLowerCase());
    }
}
