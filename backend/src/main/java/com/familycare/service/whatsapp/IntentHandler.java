package com.familycare.service.whatsapp;

import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;

public interface IntentHandler {
    boolean supports(IntentType type);
    String handle(Intent intent, SenderContext ctx);
}
