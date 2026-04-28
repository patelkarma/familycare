package com.familycare.service;

import com.familycare.dto.response.PharmacyResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyService {

    private static final String OVERPASS_URL = "https://overpass-api.de/api/interpreter";
    private static final String CACHE_PREFIX = "pharmacy:";
    private static final Duration CACHE_TTL = Duration.ofHours(24);
    private static final int DEFAULT_RADIUS = 2000;
    private static final int MAX_RADIUS = 10000;
    private static final int MAX_RESULTS = 50;

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public List<PharmacyResponse> findNearby(double lat, double lng, int radius) {
        int safeRadius = Math.max(200, Math.min(radius, MAX_RADIUS));
        String cacheKey = buildCacheKey(lat, lng, safeRadius);

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                List<PharmacyResponse> cachedList = parseCachedList(cached);
                log.info("Pharmacy cache hit: {} ({} results)", cacheKey, cachedList.size());
                // If cached empty, force a fresh fetch — caching nothing isn't useful and
                // could be a stale result from a transient Overpass failure.
                if (!cachedList.isEmpty()) return cachedList;
                log.info("Cached result was empty; querying Overpass again");
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {}: {}", cacheKey, e.getMessage());
        }

        List<PharmacyResponse> results = queryOverpass(lat, lng, safeRadius);
        log.info("Overpass returned {} pharmacies for ({}, {}) r={}m",
                results.size(), lat, lng, safeRadius);

        try {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(results),
                    CACHE_TTL);
        } catch (Exception e) {
            log.warn("Redis write failed for {}: {}", cacheKey, e.getMessage());
        }

        return results;
    }

    private List<PharmacyResponse> queryOverpass(double lat, double lng, int radius) {
        // Locale.ROOT ensures decimal point (not comma) for non-English JVM locales.
        String query = String.format(Locale.ROOT,
                "[out:json][timeout:25];"
              + "node[\"amenity\"=\"pharmacy\"](around:%d,%.6f,%.6f);"
              + "out body %d;",
                radius, lat, lng, MAX_RESULTS);
        log.info("Overpass query: {}", query);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("User-Agent", "FamilyCare/1.0 (student project)");

            HttpEntity<String> request = new HttpEntity<>("data=" + query, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    OVERPASS_URL, HttpMethod.POST, request, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("Overpass API returned {}", response.getStatusCode());
                return List.of();
            }

            return parseOverpassResponse(response.getBody(), lat, lng);
        } catch (Exception e) {
            log.error("Overpass query failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<PharmacyResponse> parseOverpassResponse(String json, double originLat, double originLng) {
        List<PharmacyResponse> pharmacies = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode elements = root.get("elements");
            if (elements == null || !elements.isArray()) return pharmacies;

            for (JsonNode node : elements) {
                Double nodeLat = node.has("lat") ? node.get("lat").asDouble() : null;
                Double nodeLng = node.has("lon") ? node.get("lon").asDouble() : null;
                if (nodeLat == null || nodeLng == null) continue;

                JsonNode tags = node.get("tags");
                String name = tagText(tags, "name");
                if (name == null || name.isBlank()) {
                    name = tagText(tags, "operator");
                }
                if (name == null || name.isBlank()) {
                    name = "Pharmacy";
                }

                pharmacies.add(PharmacyResponse.builder()
                        .id(node.has("id") ? node.get("id").asLong() : null)
                        .name(name)
                        .lat(nodeLat)
                        .lng(nodeLng)
                        .address(buildAddress(tags))
                        .phone(firstNonBlank(
                                tagText(tags, "phone"),
                                tagText(tags, "contact:phone")))
                        .openingHours(tagText(tags, "opening_hours"))
                        .distanceMeters(haversineMeters(originLat, originLng, nodeLat, nodeLng))
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to parse Overpass response: {}", e.getMessage());
        }

        pharmacies.sort(Comparator.comparingInt(p ->
                p.getDistanceMeters() != null ? p.getDistanceMeters() : Integer.MAX_VALUE));
        return pharmacies;
    }

    private List<PharmacyResponse> parseCachedList(String cached) {
        try {
            return List.of(objectMapper.readValue(cached, PharmacyResponse[].class));
        } catch (Exception e) {
            log.warn("Failed to parse cached pharmacy list: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildCacheKey(double lat, double lng, int radius) {
        // Round to 3 decimals (~100m buckets) to improve cache hit rate
        return String.format("%s%.3f:%.3f:%d", CACHE_PREFIX, lat, lng, radius);
    }

    private String tagText(JsonNode tags, String key) {
        if (tags == null || !tags.has(key)) return null;
        String v = tags.get(key).asText();
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private String firstNonBlank(String... vs) {
        for (String v : vs) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private String buildAddress(JsonNode tags) {
        if (tags == null) return null;
        String street = firstNonBlank(
                tagText(tags, "addr:full"),
                joinIfAny(tagText(tags, "addr:housenumber"), tagText(tags, "addr:street")));
        String locality = firstNonBlank(
                tagText(tags, "addr:suburb"),
                tagText(tags, "addr:city"),
                tagText(tags, "addr:town"),
                tagText(tags, "addr:village"));
        return joinIfAny(street, locality);
    }

    private String joinIfAny(String a, String b) {
        if (a == null && b == null) return null;
        if (a == null) return b;
        if (b == null) return a;
        return a + ", " + b;
    }

    private int haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (int) Math.round(r * c);
    }

    public static int defaultRadius() {
        return DEFAULT_RADIUS;
    }
}
