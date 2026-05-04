package com.familycare.service.whatsapp.handlers;

import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import org.springframework.stereotype.Component;

@Component
public class HelpIntentHandler implements IntentHandler {

    public static final String HELP_TEXT = """
            FamilyCare — reply with any of these:

            ✅ Took it: TAKEN, OK, DONE, ✓, 👍, हाँ, लिया, kha liya
            ❌ Skip it: SKIP, NO, ❌, 👎, नहीं, nahi
            🩺 Log BP: BP 140 90
            🍬 Log sugar: SUGAR 110
            💊 Stock: STOCK
            🚨 Emergency: SOS
            ❓ Menu: HELP

            Capital letters not needed.""";

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.HELP;
    }

    @Override
    public String handle(Intent intent, SenderContext ctx) {
        return HELP_TEXT;
    }
}
