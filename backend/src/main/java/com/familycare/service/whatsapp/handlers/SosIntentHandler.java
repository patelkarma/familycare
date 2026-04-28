package com.familycare.service.whatsapp.handlers;

import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.service.SosService;
import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class SosIntentHandler implements IntentHandler {

    private final SosService sosService;

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.SOS;
    }

    @Override
    @Transactional
    public String handle(Intent intent, SenderContext ctx) {
        if (ctx.isAmbiguous() || ctx.getMember() == null) {
            return "Couldn't identify which member needs help. Open the app and press SOS.";
        }
        FamilyMember member = ctx.getMember();

        try {
            int notified = sosService.triggerInternal(member, ctx.getHeadUser());
            return "SOS sent to " + notified + " emergency contact"
                    + (notified == 1 ? "" : "s") + ". Help is on the way.";
        } catch (CustomExceptions.BadRequestException e) {
            return "Couldn't trigger SOS: " + e.getMessage();
        } catch (Exception e) {
            log.error("SOS trigger failed for member={}", member.getId(), e);
            return "Couldn't trigger SOS right now. Please call your emergency contact directly.";
        }
    }
}
