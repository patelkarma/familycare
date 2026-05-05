package com.familycare.service;

import com.familycare.config.IndianMedicineDictionary;
import com.familycare.dto.response.DetectedMedicineResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PrescriptionParser {

    private final IndianMedicineDictionary dictionary;
    private final Counter ocrParsed;
    private final Counter ocrDetected;

    public PrescriptionParser(IndianMedicineDictionary dictionary, MeterRegistry registry) {
        this.dictionary = dictionary;
        this.ocrParsed = Counter.builder("familycare.ocr.parsed")
                .description("Prescription OCR parse calls")
                .register(registry);
        this.ocrDetected = Counter.builder("familycare.ocr.medicines_detected")
                .description("Total medicines detected across all OCR parse calls")
                .register(registry);
    }

    private static final Pattern DOSAGE_PATTERN = Pattern.compile(
            "(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|ml|g|iu|%)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern FREQ_TRIPLET = Pattern.compile(
            "\\b([01])\\s*[-–/]\\s*([01])\\s*[-–/]\\s*([01])\\b");

    private static final Pattern DURATION_PATTERN = Pattern.compile(
            "(?:x|for|\\*|×)\\s*(\\d+)\\s*(day|days|d|week|weeks|wk|month|months|mo)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Map<String, String> ABBREV_TO_FREQ = new HashMap<>();
    private static final Map<String, Map<String, String>> ABBREV_TO_TIMING = new HashMap<>();

    static {
        ABBREV_TO_FREQ.put("OD", "Once daily");
        ABBREV_TO_FREQ.put("HS", "Once daily");
        ABBREV_TO_FREQ.put("BD", "Twice daily");
        ABBREV_TO_FREQ.put("BID", "Twice daily");
        ABBREV_TO_FREQ.put("TDS", "Three times daily");
        ABBREV_TO_FREQ.put("TID", "Three times daily");
        ABBREV_TO_FREQ.put("QID", "Four times daily");
        ABBREV_TO_FREQ.put("QDS", "Four times daily");
        ABBREV_TO_FREQ.put("SOS", "As needed");
        ABBREV_TO_FREQ.put("PRN", "As needed");
        ABBREV_TO_FREQ.put("STAT", "As needed");
        ABBREV_TO_FREQ.put("WEEKLY", "Weekly");

        ABBREV_TO_TIMING.put("OD",  Map.of("morning", "09:00"));
        ABBREV_TO_TIMING.put("HS",  Map.of("night", "21:00"));
        ABBREV_TO_TIMING.put("BD",  Map.of("morning", "09:00", "night", "21:00"));
        ABBREV_TO_TIMING.put("BID", Map.of("morning", "09:00", "night", "21:00"));
        ABBREV_TO_TIMING.put("TDS", Map.of("morning", "09:00", "afternoon", "13:00", "night", "21:00"));
        ABBREV_TO_TIMING.put("TID", Map.of("morning", "09:00", "afternoon", "13:00", "night", "21:00"));
        ABBREV_TO_TIMING.put("QID", Map.of("morning", "08:00", "afternoon", "13:00", "night", "18:00"));
    }

    public List<DetectedMedicineResponse> parse(String rawText) {
        ocrParsed.increment();
        if (rawText == null || rawText.isBlank()) return List.of();

        // Dedup by genericName, not brand. A real Indian prescription is laid
        // out so that brand and generic appear on adjacent lines (e.g. "Tab.
        // Crocin 500 mg" followed by "Paracetamol | After food"). Without this,
        // both lines match independently — Crocin/Paracetamol and
        // Paracetamol/Paracetamol — and the same active ingredient ends up as
        // two separate rows. Keying by genericName collapses them into one,
        // keeping the higher-confidence match.
        //
        // Trade-off: if a doctor genuinely prescribes two brands of the same
        // active ingredient (Crocin + Dolo, both Paracetamol), they'd merge.
        // That's a rare and arguably-correct outcome — you wouldn't want a
        // patient taking both. The much more common case is the brand/generic
        // duplicate from caption lines, which this fix eliminates.
        Map<String, DetectedMedicineResponse> byGeneric = new LinkedHashMap<>();
        String[] lines = rawText.split("\\r?\\n");

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.length() < 3) continue;

            DetectedMedicineResponse match = matchLine(line);
            if (match == null) continue;

            String key = (match.getGenericName() != null
                    ? match.getGenericName()
                    : match.getName()).toLowerCase();
            DetectedMedicineResponse existing = byGeneric.get(key);
            if (existing == null || existing.getConfidence() < match.getConfidence()) {
                byGeneric.put(key, match);
            }
        }

        List<DetectedMedicineResponse> result = new ArrayList<>(byGeneric.values());
        ocrDetected.increment(result.size());
        return result;
    }

    /**
     * A line counts as a real prescription line only if it carries at least one of:
     * a form word (Tab/Cap/Syp/...), a dosage unit (mg/ml/mcg/...), a frequency
     * abbreviation (BD/OD/TDS/...), or a triplet (1-0-1). Lines like
     * "Paracetamol | After food | Twice daily" — caption text printed under the
     * brand row — fail this check, so they no longer create a duplicate medicine
     * row for the same active ingredient.
     */
    private boolean hasPrescriptionSignal(String line) {
        if (DOSAGE_PATTERN.matcher(line).find()) return true;
        if (FREQ_TRIPLET.matcher(line).find()) return true;

        String lower = line.toLowerCase();
        if (lower.contains("tab") || lower.contains("cap") || lower.contains("syp") ||
            lower.contains("syrup") || lower.contains("inj") || lower.contains("drop") ||
            lower.contains("cream") || lower.contains("ointment") || lower.contains("inhaler") ||
            lower.contains("puff")) {
            return true;
        }

        String upper = line.toUpperCase();
        for (String abbrev : ABBREV_TO_FREQ.keySet()) {
            if (upper.matches(".*\\b" + abbrev + "\\b.*")) return true;
        }
        return false;
    }

    private DetectedMedicineResponse matchLine(String line) {
        if (!hasPrescriptionSignal(line)) return null;

        String[] tokens = line.split("[\\s,;()\\[\\]]+");
        IndianMedicineDictionary.Entry best = null;
        String matchedToken = null;
        double confidence = 0.0;

        for (String token : tokens) {
            String cleaned = token.replaceAll("[^A-Za-z0-9-]", "");
            if (cleaned.length() < 3) continue;

            IndianMedicineDictionary.Entry e = dictionary.findBestMatch(cleaned);
            if (e != null) {
                double tokenConf = tokenConfidence(cleaned, e.brandName);
                if (tokenConf > confidence) {
                    best = e;
                    matchedToken = cleaned;
                    confidence = tokenConf;
                }
            }
        }

        if (best == null) return null;

        String dosage = extractDosage(line);
        String form = inferForm(line);
        FrequencyResult freq = extractFrequency(line);
        Integer duration = extractDurationDays(line);
        Boolean withFood = inferWithFood(line);

        return DetectedMedicineResponse.builder()
                .name(best.brandName)
                .genericName(best.genericName)
                .category(best.category)
                .dosage(dosage)
                .form(form)
                .frequency(freq.label)
                .timing(freq.timing)
                .withFood(withFood)
                .durationDays(duration)
                .confidence(Math.round(confidence * 100.0) / 100.0)
                .rawLine(line)
                .build();
    }

    private double tokenConfidence(String ocrToken, String brandName) {
        String a = ocrToken.toLowerCase();
        String b = brandName.toLowerCase();
        if (a.equals(b)) return 1.0;
        if (a.contains(b) || b.contains(a)) return 0.88;
        int dist = levenshtein(a, b);
        int maxLen = Math.max(a.length(), b.length());
        if (maxLen == 0) return 0.0;
        double sim = 1.0 - ((double) dist / maxLen);
        return Math.max(0.4, sim);
    }

    private String extractDosage(String line) {
        Matcher m = DOSAGE_PATTERN.matcher(line);
        if (m.find()) return m.group(1) + m.group(2).toLowerCase();
        return null;
    }

    private String inferForm(String line) {
        String lower = line.toLowerCase();
        if (lower.contains("tab") || lower.contains("tablet")) return "Tablet";
        if (lower.contains("cap") || lower.contains("capsule")) return "Capsule";
        if (lower.contains("syp") || lower.contains("syrup")) return "Syrup";
        if (lower.contains("inj") || lower.contains("injection")) return "Injection";
        if (lower.contains("drop")) return "Drops";
        if (lower.contains("inhaler") || lower.contains("puff")) return "Inhaler";
        if (lower.contains("cream") || lower.contains("ointment")) return "Cream";
        return null;
    }

    private static class FrequencyResult {
        final String label;
        final Map<String, String> timing;
        FrequencyResult(String label, Map<String, String> timing) {
            this.label = label;
            this.timing = timing;
        }
    }

    private FrequencyResult extractFrequency(String line) {
        Matcher triplet = FREQ_TRIPLET.matcher(line);
        if (triplet.find()) {
            String m = triplet.group(1);
            String a = triplet.group(2);
            String n = triplet.group(3);
            Map<String, String> timing = new LinkedHashMap<>();
            int count = 0;
            if ("1".equals(m)) { timing.put("morning", "09:00"); count++; }
            if ("1".equals(a)) { timing.put("afternoon", "13:00"); count++; }
            if ("1".equals(n)) { timing.put("night", "21:00"); count++; }
            String label = switch (count) {
                case 1 -> "Once daily";
                case 2 -> "Twice daily";
                case 3 -> "Three times daily";
                default -> "As needed";
            };
            return new FrequencyResult(label, timing);
        }

        String upper = line.toUpperCase();
        for (Map.Entry<String, String> e : ABBREV_TO_FREQ.entrySet()) {
            if (upper.matches(".*\\b" + e.getKey() + "\\b.*")) {
                return new FrequencyResult(e.getValue(),
                        ABBREV_TO_TIMING.getOrDefault(e.getKey(), Map.of()));
            }
        }
        return new FrequencyResult(null, Map.of());
    }

    private Integer extractDurationDays(String line) {
        Matcher m = DURATION_PATTERN.matcher(line);
        if (!m.find()) return null;
        int n = Integer.parseInt(m.group(1));
        String unit = m.group(2).toLowerCase();
        if (unit.startsWith("week") || unit.equals("wk")) return n * 7;
        if (unit.startsWith("month") || unit.equals("mo")) return n * 30;
        return n;
    }

    private Boolean inferWithFood(String line) {
        String lower = line.toLowerCase();
        if (lower.contains("after food") || lower.contains("after meal") ||
            lower.contains("with food") || lower.contains("pc") || lower.contains("p.c.")) {
            return true;
        }
        if (lower.contains("before food") || lower.contains("empty stomach") ||
            lower.contains("ac") || lower.contains("a.c.")) {
            return false;
        }
        return null;
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }
}
