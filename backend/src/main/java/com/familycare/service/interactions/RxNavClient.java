package com.familycare.service.interactions;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Optional;

/**
 * Thin wrapper over the NIH RxNav public REST API. No authentication, no quotas.
 * Used to normalise drug names → RxCUI → canonical generic/brand names so that
 * downstream lookups (OpenFDA labels) hit consistently.
 *
 * Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 */
@Component
@Slf4j
public class RxNavClient {

    private static final String BASE = "https://rxnav.nlm.nih.gov/REST";

    private final RestTemplate restTemplate;

    public RxNavClient(@Qualifier("geminiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** Returns the first RxCUI for a drug name, or empty if not recognised. */
    public Optional<String> findRxCui(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE + "/rxcui.json")
                    .queryParam("name", name.trim())
                    .queryParam("search", "2") // allow approximate match
                    .toUriString();
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            JsonNode ids = root == null ? null : root.path("idGroup").path("rxnormId");
            if (ids != null && ids.isArray() && !ids.isEmpty()) {
                return Optional.of(ids.get(0).asText());
            }
        } catch (RestClientException e) {
            log.warn("RxNav rxcui lookup failed for '{}': {}", name, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Resolves an RxCUI to its canonical ingredient name (e.g. "Aspirin"). Useful
     * to convert brand names to a generic spelling that OpenFDA indexes well.
     */
    public Optional<String> findIngredientName(String rxcui) {
        if (rxcui == null || rxcui.isBlank()) return Optional.empty();
        try {
            String url = BASE + "/rxcui/" + rxcui + "/property.json?propName=RxNorm%20Name";
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            JsonNode props = root == null ? null : root.path("propConceptGroup").path("propConcept");
            if (props != null && props.isArray() && !props.isEmpty()) {
                return Optional.of(props.get(0).path("propValue").asText());
            }
        } catch (RestClientException e) {
            log.warn("RxNav ingredient lookup failed for cui={}: {}", rxcui, e.getMessage());
        }
        return Optional.empty();
    }
}
