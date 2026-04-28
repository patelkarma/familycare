package com.familycare.service.whatsapp;

import com.familycare.service.whatsapp.handlers.HelpIntentHandler;
import org.springframework.stereotype.Component;

@Component
public class HelpFallback {
    public String text() {
        return HelpIntentHandler.HELP_TEXT;
    }
}
