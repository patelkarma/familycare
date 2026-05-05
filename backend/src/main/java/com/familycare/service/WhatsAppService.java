package com.familycare.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
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

    private final Counter sentCounter;
    private final Counter failedCounter;
    private final Counter circuitOpenCounter;

    public WhatsAppService(MeterRegistry registry) {
        this.sentCounter = Counter.builder("familycare.whatsapp.sent")
                .description("WhatsApp messages successfully delivered to Twilio")
                .register(registry);
        this.failedCounter = Counter.builder("familycare.whatsapp.failed")
                .description("WhatsApp messages that failed at the Twilio call")
                .register(registry);
        this.circuitOpenCounter = Counter.builder("familycare.whatsapp.circuit_fallback")
                .description("WhatsApp sends rejected by the open circuit (Twilio breaker)")
                .register(registry);
    }

    @PostConstruct
    public void init() {
        if (!"default".equals(accountSid) && !"default".equals(authToken)) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio WhatsApp service initialized");
        } else {
            log.warn("Twilio credentials not configured — WhatsApp messages will not be sent");
        }
    }

    /**
     * Sends a WhatsApp message via Twilio. Wrapped with @CircuitBreaker + @Retry
     * so a transient sandbox blip retries once, sustained failure trips the
     * breaker (fall-through to {@link #sendWhatsAppFallback}), and the rest of
     * the app keeps booking dose logs even when the SMS gateway is dead.
     *
     * The breaker trips after 50% of the last 10 calls fail, stays open for
     * 30s, then probes once before closing — see resilience4j config in
     * application.properties.
     */
    @Retry(name = "twilio", fallbackMethod = "sendWhatsAppFallback")
    @CircuitBreaker(name = "twilio", fallbackMethod = "sendWhatsAppFallback")
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

        Message msg = Message.creator(
                new PhoneNumber(toWhatsApp),
                new PhoneNumber(fromNumber),
                message
        ).create();

        log.info("WhatsApp sent to {}****: SID={}", cleanPhone.substring(0, 4), msg.getSid());
        sentCounter.increment();
        return true;
    }

    /**
     * Resilience4j fallback: signature must match the protected method plus a
     * trailing Throwable. Counts failures by cause (open circuit vs. real
     * Twilio error) so the Prometheus dashboard distinguishes "we never even
     * tried" from "we tried and Twilio said no".
     */
    @SuppressWarnings("unused")
    public boolean sendWhatsAppFallback(String phone, String message, Throwable t) {
        if (t instanceof io.github.resilience4j.circuitbreaker.CallNotPermittedException) {
            circuitOpenCounter.increment();
            log.warn("WhatsApp send rejected: Twilio circuit OPEN — phone={}****", maskPhone(phone));
        } else {
            failedCounter.increment();
            log.error("WhatsApp send failed for {}****: {}", maskPhone(phone), t.getMessage());
        }
        return false;
    }

    private String maskPhone(String phone) {
        if (phone == null) return "***";
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.length() >= 4 ? digits.substring(0, 4) : "***";
    }
}
