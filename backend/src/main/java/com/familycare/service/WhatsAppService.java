package com.familycare.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class WhatsAppService {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.whatsapp-from}")
    private String fromNumber;

    @PostConstruct
    public void init() {
        if (!"default".equals(accountSid) && !"default".equals(authToken)) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio WhatsApp service initialized");
        } else {
            log.warn("Twilio credentials not configured — WhatsApp messages will not be sent");
        }
    }

    public boolean sendWhatsApp(String phone, String message) {
        if (phone == null || phone.isBlank()) {
            log.warn("Cannot send WhatsApp: phone number is empty");
            return false;
        }

        if ("default".equals(accountSid) || "default".equals(authToken)) {
            log.warn("Twilio not configured — skipping WhatsApp message");
            return false;
        }

        // Clean phone and format for WhatsApp: whatsapp:+91XXXXXXXXXX
        String cleanPhone = phone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() == 10) {
            cleanPhone = "91" + cleanPhone;
        }
        String toWhatsApp = "whatsapp:+" + cleanPhone;

        try {
            Message msg = Message.creator(
                    new PhoneNumber(toWhatsApp),
                    new PhoneNumber(fromNumber),
                    message
            ).create();

            log.info("WhatsApp sent to {}****: SID={}", cleanPhone.substring(0, 4), msg.getSid());
            return true;
        } catch (Exception e) {
            log.error("Failed to send WhatsApp to {}****: {}", cleanPhone.substring(0, 4), e.getMessage());
            return false;
        }
    }
}
