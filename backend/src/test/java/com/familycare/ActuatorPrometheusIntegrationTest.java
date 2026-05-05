package com.familycare;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Locks in the actuator + Prometheus wiring so a recruiter cloning the repo
 * sees the metrics surface is real, not aspirational.
 *
 * Asserts that:
 *   - /actuator/health is publicly reachable and returns UP
 *   - /actuator/prometheus is publicly scrapable
 *   - All FamilyCare-specific counters appear in the scrape body even at zero
 *     (Micrometer registers them at construction time, before any increment)
 *   - Resilience4j circuit breakers for "twilio" and "gemini" expose state
 *     metrics so the dashboard can see CLOSED → OPEN transitions
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ActuatorPrometheusIntegrationTest {

    @BeforeAll
    static void requireDocker() {
        assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "Skipping integration tests: Docker is not available on this machine.");
    }

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));

    @Container
    static final GenericContainer<?> redis =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
                    .withExposedPorts(6379);

    @DynamicPropertySource
    static void wireContainers(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.url",
                () -> "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379));
        registry.add("jwt.secret",
                () -> "integration-test-secret-key-must-be-at-least-256-bits-long");
        registry.add("cloudinary.cloud-name", () -> "test-cloud");
        registry.add("cloudinary.api-key", () -> "test-key");
        registry.add("cloudinary.api-secret", () -> "test-secret");
        registry.add("twilio.account-sid", () -> "ACtest");
        registry.add("twilio.auth-token", () -> "test-token");
        registry.add("gemini.api-key", () -> "test-gemini-key");
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate http;

    @Test
    void healthEndpointIsPublic() {
        ResponseEntity<String> resp = http.getForEntity(url("/actuator/health"), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void prometheusEndpointIsPublicAndExposesCustomCounters() {
        ResponseEntity<String> resp = http.getForEntity(url("/actuator/prometheus"), String.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String body = resp.getBody();
        assertThat(body).isNotNull();

        // FamilyCare-specific counters — registered at construction time so they
        // appear in the scrape body even with zero increments. If a refactor
        // accidentally drops one, this test fails before merge.
        assertThat(body).contains("familycare_reminders_sent_total");
        assertThat(body).contains("familycare_reminders_failed_total");
        assertThat(body).contains("familycare_reminders_escalated_total");
        assertThat(body).contains("familycare_sos_triggered_total");
        assertThat(body).contains("familycare_sos_blocked_cooldown_total");
        assertThat(body).contains("familycare_whatsapp_sent_total");
        assertThat(body).contains("familycare_whatsapp_failed_total");
        assertThat(body).contains("familycare_whatsapp_circuit_fallback_total");
        assertThat(body).contains("familycare_ocr_parsed_total");
        assertThat(body).contains("familycare_ocr_medicines_detected_total");

        // Bucket4j rate-limit rejection counters — pre-registered at construction
        // so they appear before the first 429.
        assertThat(body).contains("familycare_ratelimit_rejected_total");
        assertThat(body).contains("rule=\"auth.login\"");
        assertThat(body).contains("rule=\"auth.register\"");
        assertThat(body).contains("rule=\"sos.trigger\"");

        // Resilience4j wiring — confirms breakers were registered, not just configured.
        assertThat(body).contains("resilience4j_circuitbreaker_state");
        assertThat(body).contains("name=\"twilio\"");
        assertThat(body).contains("name=\"gemini\"");

        // The application tag is wired at the management layer.
        assertThat(body).contains("application=\"familycare\"");
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
