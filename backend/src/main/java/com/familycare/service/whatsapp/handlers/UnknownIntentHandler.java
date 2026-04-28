package com.familycare.service.whatsapp.handlers;

import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import org.springframework.stereotype.Component;

@Component
public class UnknownIntentHandler implements IntentHandler {

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.UNKNOWN;
    }

    @Override
    public String handle(Intent intent, SenderContext ctx) {
        return "Sorry, I didn't understand that. " + HelpIntentHandler.HELP_TEXT;
    }
}
