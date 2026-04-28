package com.familycare.service.whatsapp.handlers;

import com.familycare.model.FamilyMember;
import com.familycare.service.VitalsService;
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
public class VitalsIntentHandler implements IntentHandler {

    private final VitalsService vitalsService;

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.BP || type == IntentType.SUGAR;
    }

    @Override
    @Transactional
    public String handle(Intent intent, SenderContext ctx) {
        if (ctx.isAmbiguous() || ctx.getMember() == null) {
            return "Couldn't link this reading to a member. Open the app to log vitals.";
        }
        FamilyMember member = ctx.getMember();

        try {
            if (intent.getType() == IntentType.BP) {
                Double sys = parseDouble(intent.get("systolic"));
                Double dia = parseDouble(intent.get("diastolic"));
                if (sys == null || dia == null) {
                    return "Couldn't read those numbers. Try: BP 140 90";
                }
                vitalsService.addVitalInternal(member, "BP", sys, dia, "Logged via WhatsApp");
                return String.format("BP %.0f/%.0f logged for %s. Family will be alerted if pattern continues.",
                        sys, dia, member.getName());
            }

            if (intent.getType() == IntentType.SUGAR) {
                Double v = parseDouble(intent.get("value"));
                if (v == null) {
                    return "Couldn't read that number. Try: SUGAR 110";
                }
                vitalsService.addVitalInternal(member, "SUGAR", v, null, "Logged via WhatsApp");
                return String.format("Sugar %.0f mg/dL logged for %s.", v, member.getName());
            }
        } catch (Exception e) {
            log.error("Vitals logging failed for member={}", member.getId(), e);
            return "Couldn't save that reading. Please try again.";
        }
        return "Vitals logging not supported for this command.";
    }

    private Double parseDouble(String s) {
        if (s == null) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
