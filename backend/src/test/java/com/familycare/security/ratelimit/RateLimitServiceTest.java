package com.familycare.security.ratelimit;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Locks in three things about the rate limiter:
 *   1. A fresh bucket allows exactly the rule's capacity before rejecting.
 *   2. Rejection throws TooManyRequestsException with a positive retry-after.
 *   3. Different identifiers get independent buckets — one IP getting blocked
 *      doesn't punish a different IP using the same rule.
 */
class RateLimitServiceTest {

    private RateLimitService service;
    private MeterRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        service = new RateLimitService(registry);
    }

    @Test
    void allowsRequestsUpToCapacityThenRejects() {
        // AUTH_LOGIN capacity is 5/minute
        for (int i = 0; i < 5; i++) {
            service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "1.2.3.4");
        }

        assertThatThrownBy(() ->
                service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "1.2.3.4"))
                .isInstanceOf(TooManyRequestsException.class)
                .satisfies(e -> {
                    TooManyRequestsException ex = (TooManyRequestsException) e;
                    assertThat(ex.getRule()).isEqualTo("auth.login");
                    assertThat(ex.getRetryAfterSeconds()).isPositive();
                });

        // Counter incremented exactly once per rejection.
        assertThat(registry.counter("familycare.ratelimit.rejected",
                "rule", "auth.login").count()).isEqualTo(1.0);
    }

    @Test
    void differentIdentifiersHaveIndependentBuckets() {
        for (int i = 0; i < 5; i++) {
            service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "1.2.3.4");
        }
        // Different IP — fresh bucket, must not throw.
        service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "5.6.7.8");
    }

    @Test
    void differentRulesHaveIndependentBuckets() {
        // Burn through AUTH_REGISTER (3/hour)
        for (int i = 0; i < 3; i++) {
            service.consumeOrThrow(RateLimitRule.AUTH_REGISTER, "1.2.3.4");
        }
        assertThatThrownBy(() ->
                service.consumeOrThrow(RateLimitRule.AUTH_REGISTER, "1.2.3.4"))
                .isInstanceOf(TooManyRequestsException.class);

        // Same IP, different rule — must succeed.
        service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "1.2.3.4");
    }

    @Test
    void blankIdentifierFailsOpen() {
        // No identifier means we can't bucket — fail open rather than blocking
        // everyone behind a misconfigured proxy that ate X-Forwarded-For.
        for (int i = 0; i < 100; i++) {
            service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, null);
            service.consumeOrThrow(RateLimitRule.AUTH_LOGIN, "");
        }
    }
}
