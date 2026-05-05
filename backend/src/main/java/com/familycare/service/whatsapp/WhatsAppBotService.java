package com.familycare.service.whatsapp;

import com.familycare.service.WhatsAppService;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.SenderContext;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
@Slf4j
public class WhatsAppBotService {

    private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);

    private final IntentParser intentParser;
    private final SenderResolver senderResolver;
    private final IdempotencyService idempotencyService;
    private final List<IntentHandler> handlers;
    private final WhatsAppService whatsAppService;
    private final HelpFallback helpFallback;
    private final MeterRegistry meterRegistry;

    public WhatsAppBotService(IntentParser intentParser,
                              SenderResolver senderResolver,
                              IdempotencyService idempotencyService,
                              List<IntentHandler> handlers,
                              WhatsAppService whatsAppService,
                              HelpFallback helpFallback,
                              MeterRegistry meterRegistry) {
        this.intentParser = intentParser;
        this.senderResolver = senderResolver;
        this.idempotencyService = idempotencyService;
        this.handlers = handlers;
        this.whatsAppService = whatsAppService;
        this.helpFallback = helpFallback;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Processes an inbound WhatsApp message. Runs on the dedicated bot executor
     * so the webhook can ack Twilio in <200ms regardless of DB / SMS latency.
     */
    @Async("whatsappBotExecutor")
    public void handleInbound(String from, String body, String messageSid) {
        if (!idempotencyService.tryClaim(messageSid, IDEMPOTENCY_TTL)) {
            log.info("Skipping duplicate inbound: sid={}", messageSid);
            return;
        }

        try {
            SenderContext ctx = senderResolver.resolve(from);
            if (ctx == null) {
                whatsAppService.sendWhatsApp(from,
                        "Hi! Your number isn't registered with FamilyCare. Ask your family to add you.");
                return;
            }

            Intent intent = intentParser.parse(body);
            log.info("Inbound intent={} from={} ambiguous={}", intent.getType(), maskPhone(from), ctx.isAmbiguous());
            meterRegistry.counter("familycare.whatsapp.inbound",
                    "intent", intent.getType().name().toLowerCase()).increment();

            String reply = handlers.stream()
                    .filter(h -> h.supports(intent.getType()))
                    .findFirst()
                    .map(h -> h.handle(intent, ctx))
                    .orElseGet(() -> helpFallback.text());

            if (reply != null && !reply.isBlank()) {
                whatsAppService.sendWhatsApp(from, reply);
            }
        } catch (Exception e) {
            log.error("WhatsApp bot error for sid={}: {}", messageSid, e.getMessage(), e);
            whatsAppService.sendWhatsApp(from,
                    "Sorry, something went wrong. Reply HELP for commands.");
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 5) return "***";
        return phone.substring(0, Math.min(phone.length(), 8)) + "****";
    }
}
