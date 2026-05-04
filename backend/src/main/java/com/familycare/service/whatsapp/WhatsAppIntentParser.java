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

    // Affirmative replies an elderly Indian user might actually send. Ordered
    // longest-first within ambiguous prefixes so e.g. "KHA LIYA" matches whole
    // before "KHA" gobbles it and treats "LIYA" as a (wrong) member hint.
    // toUpperCase is locale-default and a no-op on Devanagari + emoji code
    // points, so those alternatives match as-is. Emoji variation selectors
    // (U+FE0E / U+FE0F) are stripped during normalization below.
    private static final Pattern TAKEN_PATTERN = Pattern.compile(
            "^(" +
                "TAKEN|TOOK|TAKE|" +
                "GOT IT|GOTIT|" +
                "OKAY|OK|DONE|FINISHED|FINE|" +
                "YES|YEAH|YEP|YA|Y|" +
                "T|1|K|" +
                // Hinglish (Latin)
                "HAAN|HAN|HA|JI|" +
                "KHA LIYA|KHA LIA|KHALIYA|KHALIA|KHAYA|" +
                "LIYA|LIA|" +
                // Devanagari
                "हाँ|हां|जी|लिया|खाया|खा लिया|" +
                // Emoji (variation selectors stripped before matching)
                "✅|✓|✔|👍|👌|💊" +
            ")(\\s+(.+))?$");

    private static final Pattern SKIP_PATTERN = Pattern.compile(
            "^(" +
                "SKIPPING|SKIPPED|SKIP|" +
                "MISSED|MISS|" +
                "NOT YET|NOTYET|LATER|" +
                "NOPE|NAH|NO|N|" +
                "S|2|" +
                // Hinglish (Latin)
                "NAHIN|NAHI|NA|MAT|" +
                // Devanagari
                "नहीं|नही|ना|" +
                // Emoji
                "❌|✖|✗|👎" +
            ")(\\s+(.+))?$");

    private static final Pattern BP_PATTERN = Pattern.compile("^BP\\s+(\\d{2,3})[/\\s]+(\\d{2,3})$");
    private static final Pattern SUGAR_PATTERN = Pattern.compile("^SUGAR\\s+(\\d{2,3})$");

    @Override
    public Intent parse(String rawBody) {
        if (rawBody == null) return Intent.of(IntentType.UNKNOWN, null);
        String normalized = rawBody.trim()
                .replaceAll("[,:.!]", " ")
                // Strip emoji variation selectors so ✔️ (U+2714 U+FE0F) collapses to ✔.
                .replaceAll("[\\uFE0E\\uFE0F]", "")
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
