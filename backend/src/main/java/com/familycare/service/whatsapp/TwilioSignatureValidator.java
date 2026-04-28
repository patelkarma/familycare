package com.familycare.service.whatsapp;

import com.twilio.security.RequestValidator;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Slf4j
public class TwilioSignatureValidator {

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.webhook-verify:true}")
    private boolean verifyEnabled;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    private RequestValidator validator;

    @PostConstruct
    public void init() {
        if (!"default".equals(authToken)) {
            this.validator = new RequestValidator(authToken);
        }
        if (!verifyEnabled) {
            log.warn("Twilio webhook signature verification is DISABLED — set TWILIO_WEBHOOK_VERIFY=true in production");
        }
    }

    /**
     * Validates X-Twilio-Signature header against the reconstructed URL + form params,
     * signed with the Twilio auth token. Returns true if verification is disabled
     * (development) or signature matches.
     */
    public boolean isValid(HttpServletRequest request, Map<String, String> formParams) {
        if (!verifyEnabled) return true;
        if (validator == null) {
            log.warn("Twilio validator not initialized (no auth token) — rejecting webhook");
            return false;
        }

        String signature = request.getHeader("X-Twilio-Signature");
        if (signature == null || signature.isBlank()) {
            log.warn("Missing X-Twilio-Signature header");
            return false;
        }

        String url = buildRequestUrl(request);
        boolean ok = validator.validate(url, formParams, signature);
        if (!ok) {
            log.warn("Twilio signature validation failed for url={}", url);
        }
        return ok;
    }

    private String buildRequestUrl(HttpServletRequest request) {
        // Twilio signs against the URL it called. Behind ngrok/Render, the
        // outward-facing host differs from request.getRequestURL(), so we
        // reconstruct from the configured public base URL.
        String path = request.getRequestURI();
        String query = request.getQueryString();
        String base = (publicBaseUrl == null || publicBaseUrl.isBlank())
                ? request.getRequestURL().toString().replace(path, "")
                : publicBaseUrl.replaceAll("/+$", "");
        return base + path + (query == null ? "" : "?" + query);
    }
}
