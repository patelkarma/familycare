package com.familycare.service.whatsapp;

import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WhatsAppIntentParser implements IntentParser {

    private static final Pattern SOS_PATTERN = Pattern.compile("^(SOS|EMERGENCY|HELP ME)$");
    private static final Pattern HELP_PATTERN = Pattern.compile("^(HELP|MENU|\\?|COMMANDS)$");
    private static final Pattern STOCK_PATTERN = Pattern.compile("^(STOCK|MEDICINES|MEDS)$");
    private static final Pattern TAKEN_PATTERN = Pattern.compile("^(TAKEN|TOOK|T|1|YES)(\\s+(.+))?$");
    private static final Pattern SKIP_PATTERN = Pattern.compile("^(SKIP|SKIPPED|S|2|NO)(\\s+(.+))?$");
    private static final Pattern BP_PATTERN = Pattern.compile("^BP\\s+(\\d{2,3})[/\\s]+(\\d{2,3})$");
    private static final Pattern SUGAR_PATTERN = Pattern.compile("^SUGAR\\s+(\\d{2,3})$");

    @Override
    public Intent parse(String rawBody) {
        if (rawBody == null) return Intent.of(IntentType.UNKNOWN, null);
        String normalized = rawBody.trim()
                .replaceAll("[,:]", " ")
                .replaceAll("\\s+", " ")
                .toUpperCase();

        if (normalized.isEmpty()) return Intent.of(IntentType.UNKNOWN, rawBody);

        // Order matters: SOS before HELP so "HELP ME" hits SOS.
        if (SOS_PATTERN.matcher(normalized).matches()) {
            return Intent.of(IntentType.SOS, rawBody);
        }
        if (HELP_PATTERN.matcher(normalized).matches()) {
            return Intent.of(IntentType.HELP, rawBody);
        }
        if (STOCK_PATTERN.matcher(normalized).matches()) {
            return Intent.of(IntentType.STOCK, rawBody);
        }

        Matcher takenMatcher = TAKEN_PATTERN.matcher(normalized);
        if (takenMatcher.matches()) {
            Intent intent = Intent.of(IntentType.TAKEN, rawBody);
            String memberHint = takenMatcher.group(3);
            if (memberHint != null && !memberHint.isBlank()) {
                intent.put("memberHint", memberHint.trim());
            }
            return intent;
        }

        Matcher skipMatcher = SKIP_PATTERN.matcher(normalized);
        if (skipMatcher.matches()) {
            Intent intent = Intent.of(IntentType.SKIP, rawBody);
            String memberHint = skipMatcher.group(3);
            if (memberHint != null && !memberHint.isBlank()) {
                intent.put("memberHint", memberHint.trim());
            }
            return intent;
        }

        Matcher bpMatcher = BP_PATTERN.matcher(normalized);
        if (bpMatcher.matches()) {
            return Intent.of(IntentType.BP, rawBody)
                    .put("systolic", bpMatcher.group(1))
                    .put("diastolic", bpMatcher.group(2));
        }

        Matcher sugarMatcher = SUGAR_PATTERN.matcher(normalized);
        if (sugarMatcher.matches()) {
            return Intent.of(IntentType.SUGAR, rawBody)
                    .put("value", sugarMatcher.group(1));
        }

        return Intent.of(IntentType.UNKNOWN, rawBody);
    }
}
