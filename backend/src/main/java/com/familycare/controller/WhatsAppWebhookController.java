package com.familycare.controller;

import com.familycare.service.whatsapp.TwilioSignatureValidator;
import com.familycare.service.whatsapp.WhatsAppBotService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private static final String EMPTY_TWIML =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>";

    private final WhatsAppBotService botService;
    private final TwilioSignatureValidator signatureValidator;

    /**
     * Twilio inbound webhook. Returns empty TwiML (HTTP 200) immediately so Twilio
     * doesn't retry. The actual bot work runs async; the user-facing reply is sent
     * as a separate outbound message.
     *
     * Twilio posts application/x-www-form-urlencoded with fields:
     *   From, To, Body, MessageSid, AccountSid, NumMedia, etc.
     */
    @PostMapping(
            value = "/inbound",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.APPLICATION_XML_VALUE
    )
    public ResponseEntity<String> inbound(@RequestParam Map<String, String> form,
                                          HttpServletRequest request) {
        try {
            if (!signatureValidator.isValid(request, form)) {
                log.warn("Rejected webhook: bad Twilio signature");
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_XML)
                        .body(EMPTY_TWIML);
            }

            String from = form.get("From");
            String body = form.get("Body");
            String messageSid = form.get("MessageSid");

            if (from == null || from.isBlank()) {
                log.warn("Webhook missing From field");
                return okEmpty();
            }

            botService.handleInbound(from, body == null ? "" : body, messageSid);
        } catch (Exception e) {
            log.error("Webhook handler error: {}", e.getMessage(), e);
        }
        return okEmpty();
    }

    private ResponseEntity<String> okEmpty() {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(EMPTY_TWIML);
    }
}
