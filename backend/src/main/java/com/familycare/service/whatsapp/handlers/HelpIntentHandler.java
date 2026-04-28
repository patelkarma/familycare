package com.familycare.service.whatsapp.handlers;

import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import org.springframework.stereotype.Component;

@Component
public class HelpIntentHandler implements IntentHandler {

    public static final String HELP_TEXT = """
            FamilyCare commands:
            - TAKEN or 1 — mark dose as taken
            - SKIP or 2 — mark dose as skipped
            - BP 140 90 — log blood pressure
            - SUGAR 110 — log blood sugar
            - STOCK — see medicine stock
            - SOS — alert emergency contacts
            - HELP — show this menu""";

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.HELP;
    }

    @Override
    public String handle(Intent intent, SenderContext ctx) {
        return HELP_TEXT;
    }
}
