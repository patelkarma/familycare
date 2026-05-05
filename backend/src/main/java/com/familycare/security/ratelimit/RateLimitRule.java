package com.familycare.security.ratelimit;

import io.github.bucket4j.Bandwidth;

import java.time.Duration;

/**
 * Per-route rate limit rules. The label feeds the {@code rule} tag on the
 * Prometheus counter, so every rule shows up as its own series in Grafana.
 *
 * <p>Number tuning (defended in ADR-007):
 * <ul>
 *   <li><b>auth.login</b> — 5/min/IP. A real user fails login 0-2x; 5 catches
 *       brute-force without inconveniencing the legitimate "did I capslock"
 *       case.</li>
 *   <li><b>auth.register</b> — 3/hour/IP. Real users register once, ever.
 *       Three attempts/hour kills bot signup spam from a single IP.</li>
 *   <li><b>sos.trigger</b> — 5/min/user. Plus the existing 60s server-side
 *       cooldown — defense in depth. The cooldown stops a panicked user
 *       hammering the button; the rate limit stops a compromised account
 *       fanning out alerts at scale.</li>
 * </ul>
 */
public enum RateLimitRule {
    AUTH_LOGIN("auth.login",
            Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofMinutes(1)).build()),
    AUTH_REGISTER("auth.register",
            Bandwidth.builder().capacity(3).refillIntervally(3, Duration.ofHours(1)).build()),
    SOS_TRIGGER("sos.trigger",
            Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofMinutes(1)).build());

    private final String label;
    private final Bandwidth bandwidth;

    RateLimitRule(String label, Bandwidth bandwidth) {
        this.label = label;
        this.bandwidth = bandwidth;
    }

    public String label() { return label; }
    public Bandwidth bandwidth() { return bandwidth; }
}
