package com.familycare.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class SmsService {

    @Value("${fast2sms.api-key}")
    private String apiKey;

    private static final String FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean sendSms(String phone, String message) {
        if (phone == null || phone.isBlank()) {
            log.warn("Cannot send SMS: phone number is empty");
            return false;
        }

        // Strip country code if present (+91)
        String cleanPhone = phone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() > 10) {
            cleanPhone = cleanPhone.substring(cleanPhone.length() - 10);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("route", "q");
            body.put("message", message);
            body.put("language", "english");
            body.put("flash", 0);
            body.put("numbers", cleanPhone);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    FAST2SMS_URL, HttpMethod.POST, request, String.class);

            boolean success = response.getStatusCode().is2xxSuccessful();
            if (success) {
                log.info("SMS sent successfully to {}", cleanPhone.substring(0, 4) + "******");
            } else {
                log.error("SMS failed with status: {}", response.getStatusCode());
            }
            return success;
        } catch (Exception e) {
            log.error("Failed to send SMS: {}", e.getMessage());
            return false;
        }
    }
}
