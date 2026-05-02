package com.familycare.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String VALID_SECRET = "test-secret-key-must-be-at-least-256-bits-long-please";
    private static final long ONE_HOUR = 3_600_000L;

    @Test
    void generatesAndExtractsEmail() {
        JwtUtil util = new JwtUtil(VALID_SECRET, ONE_HOUR);

        String token = util.generateToken("alice@example.com");

        assertNotNull(token);
        assertEquals("alice@example.com", util.extractEmail(token));
        assertTrue(util.isTokenValid(token));
    }

    @Test
    void rejectsTamperedToken() {
        JwtUtil util = new JwtUtil(VALID_SECRET, ONE_HOUR);
        String token = util.generateToken("alice@example.com");

        // Flip the last char of the signature -> verification must fail
        String tampered = token.substring(0, token.length() - 1) +
                (token.endsWith("a") ? "b" : "a");

        assertFalse(util.isTokenValid(tampered));
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        JwtUtil signer = new JwtUtil(VALID_SECRET, ONE_HOUR);
        JwtUtil verifier = new JwtUtil(
                "different-secret-key-also-256-bits-long-but-not-the-same",
                ONE_HOUR);

        String token = signer.generateToken("alice@example.com");

        assertFalse(verifier.isTokenValid(token));
    }

    @Test
    void failsFastIfSecretMissingOrTooShort() {
        assertThrows(IllegalStateException.class,
                () -> new JwtUtil(null, ONE_HOUR),
                "null secret must be rejected");

        assertThrows(IllegalStateException.class,
                () -> new JwtUtil("   ", ONE_HOUR),
                "blank secret must be rejected");

        assertThrows(IllegalStateException.class,
                () -> new JwtUtil("too-short", ONE_HOUR),
                "secret shorter than 256 bits must be rejected");
    }
}
