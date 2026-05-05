package com.familycare.security.ratelimit;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory token-bucket rate limiter. One bucket per (rule, identifier) tuple
 * — identifier is the client IP for auth endpoints (pre-auth) and the user
 * email for /sos/trigger (post-auth).
 *
 * <p><b>Why in-memory.</b> FamilyCare runs on a single Render dyno. Adding
 * Redis-backed Bucket4j would add a network round-trip per request for zero
 * correctness gain. When we scale to multiple dynos this swaps to
 * {@code Bucket4j-redis} — the {@link RateLimitRule} contract doesn't
 * change.
 *
 * <p><b>Memory growth.</b> {@link ConcurrentHashMap} entries never expire.
 * On a portfolio-scale deployment this leaks at most ~64 bytes/IP/rule, so
 * a million unique IPs still costs &lt; 200 MB. If a real abuser shows up,
 * swap to Caffeine with {@code expireAfterAccess=2h}.
 */
@Service
@Slf4j
public class RateLimitService {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final MeterRegistry meterRegistry;

    public RateLimitService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // Pre-register the counter at construction so the metric appears in the
        // /actuator/prometheus body even before the first rejection — locks in
        // the wiring against the integration test.
        for (RateLimitRule rule : RateLimitRule.values()) {
            Counter.builder("familycare.ratelimit.rejected")
                    .tag("rule", rule.label())
                    .description("Requests rejected by the per-rule token bucket")
                    .register(meterRegistry);
        }
    }

    /**
     * Tries to consume one token from the (rule, identifier) bucket. Throws
     * {@link TooManyRequestsException} with the spec-compliant retry-after if
     * empty. Returns silently on success.
     */
    public void consumeOrThrow(RateLimitRule rule, String identifier) {
        if (identifier == null || identifier.isBlank()) {
            // No identifier means we can't bucket — fail open rather than
            // blocking everyone behind a misconfigured proxy.
            return;
        }
        String key = rule.label() + ":" + identifier;
        Bucket bucket = buckets.computeIfAbsent(key,
                k -> Bucket.builder().addLimit(rule.bandwidth()).build());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            meterRegistry.counter("familycare.ratelimit.rejected",
                    "rule", rule.label()).increment();
            log.warn("Rate limit rejected: rule={} identifier={} retryAfter={}s",
                    rule.label(), maskIdentifier(identifier), retryAfter);
            throw new TooManyRequestsException(rule.label(), retryAfter);
        }
    }

    private String maskIdentifier(String s) {
        if (s == null) return "***";
        // For emails: keep before @, mask domain. For IPs / phones: keep first 4.
        int at = s.indexOf('@');
        if (at > 0) return s.substring(0, Math.min(at, 3)) + "***@***";
        return s.length() <= 4 ? "***" : s.substring(0, 4) + "****";
    }
}
