package com.familycare.security.ratelimit;

/**
 * Carries the Retry-After seconds back to the {@code GlobalExceptionHandler}
 * so the 429 response includes the spec-compliant header. Wrapping the value
 * here (instead of computing it in the handler) keeps the handler dumb.
 */
public class TooManyRequestsException extends RuntimeException {
    private final long retryAfterSeconds;
    private final String rule;

    public TooManyRequestsException(String rule, long retryAfterSeconds) {
        super("Rate limit exceeded for " + rule + ". Retry in " + retryAfterSeconds + "s.");
        this.rule = rule;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
    public String getRule() { return rule; }
}
