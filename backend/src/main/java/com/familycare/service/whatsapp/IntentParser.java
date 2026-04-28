package com.familycare.service.whatsapp;

import com.familycare.service.whatsapp.dto.Intent;

public interface IntentParser {
    Intent parse(String rawBody);
}
