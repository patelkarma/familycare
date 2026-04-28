package com.familycare.service.interactions;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Optional;

/**
 * Wraps the OpenFDA drug labels API (https://open.fda.gov/apis/drug/label/).
 * No auth, generous limits (1000 req / day per IP). Returns extracts of the
 * drug's interaction and warning sections.
 */
@Component
@Slf4j
public class OpenFdaClient {

    private static final String BASE = "https://api.fda.gov/drug/label.json";

    private final RestTemplate restTemplate;

    public OpenFdaClient(@Qualifier("geminiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<DrugLabelExcerpt> findLabel(String drugName) {
        if (drugName == null || drugName.isBlank()) return Optional.empty();
        String safe = drugName.replaceAll("[^A-Za-z0-9 ]", "").trim();
        if (safe.isEmpty()) return Optional.empty();

        String search = String.format(
                "(openfda.brand_name:\"%s\"+openfda.generic_name:\"%s\"+openfda.substance_name:\"%s\")",
                safe, safe, safe);

        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE)
                    .queryParam("search", search)
                    .queryParam("limit", 1)
                    .build(true) // already encoded
                    .toUriString();

            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            JsonNode results = root == null ? null : root.path("results");
            if (results == null || !results.isArray() || results.isEmpty()) {
                return Optional.empty();
            }
            JsonNode label = results.get(0);
            return Optional.of(DrugLabelExcerpt.builder()
                    .drugInteractions(extract(label, "drug_interactions"))
                    .warnings(extract(label, "warnings_and_cautions", "warnings"))
                    .contraindications(extract(label, "contraindications"))
                    .build());
        } catch (RestClientException e) {
            // 404 means OpenFDA has no label for this name — common for OTC + Indian generics.
            log.debug("OpenFDA label lookup failed for '{}': {}", drugName, e.getMessage());
            return Optional.empty();
        }
    }

    /** Returns the first non-empty value across the given JSON array fields. */
    private String extract(JsonNode label, String... fields) {
        for (String f : fields) {
            JsonNode arr = label.path(f);
            if (arr.isArray() && !arr.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode item : arr) {
                    if (sb.length() > 0) sb.append("\n");
                    sb.append(item.asText());
                }
                String text = sb.toString().trim();
                if (!text.isEmpty()) return text;
            }
        }
        return null;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DrugLabelExcerpt {
        private String drugInteractions;
        private String warnings;
        private String contraindications;
    }
}
