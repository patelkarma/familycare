package com.familycare.service.whatsapp;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private static final String KEY_PREFIX = "whatsapp:msg:";

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Atomically claim a Twilio MessageSid. Returns true on first claim, false if
     * the SID was already processed. Backed by Redis SET NX EX semantics.
     */
    public boolean tryClaim(String messageSid, Duration ttl) {
        if (messageSid == null || messageSid.isBlank()) return true;
        try {
            Boolean claimed = redisTemplate.opsForValue()
                    .setIfAbsent(KEY_PREFIX + messageSid, "1", ttl);
            return Boolean.TRUE.equals(claimed);
        } catch (Exception e) {
            // If Redis is unreachable, fail open — better to risk a duplicate reply
            // than to drop legitimate webhook traffic.
            log.warn("Idempotency check failed for sid={}, allowing through: {}", messageSid, e.getMessage());
            return true;
        }
    }
}
