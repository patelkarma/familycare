package com.familycare.security.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Wires per-route rate limits in front of the controller. Auth endpoints are
 * keyed by client IP (the user is by definition not authenticated yet);
 * /sos/trigger is keyed by the authenticated user email.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/auth/login")) {
            rateLimitService.consumeOrThrow(RateLimitRule.AUTH_LOGIN, clientIp(request));
        } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/auth/register")) {
            rateLimitService.consumeOrThrow(RateLimitRule.AUTH_REGISTER, clientIp(request));
        } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/sos/trigger")) {
            // Post-auth: rate limit by user email so a compromised account
            // can't fan out alerts at scale even from many IPs.
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String identifier = (auth != null && auth.getName() != null)
                    ? auth.getName()
                    : clientIp(request);
            rateLimitService.consumeOrThrow(RateLimitRule.SOS_TRIGGER, identifier);
        }
        return true;
    }

    /**
     * Behind Render's load balancer the real client IP arrives in
     * {@code X-Forwarded-For}; {@code request.getRemoteAddr()} returns the
     * proxy IP. Take the first hop (left-most) since Render's edge prepends
     * the original client.
     */
    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }
}
