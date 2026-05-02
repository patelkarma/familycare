package com.familycare;

import com.familycare.dto.request.LoginRequest;
import com.familycare.dto.request.RegisterRequest;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Real end-to-end integration test for the auth flow.
 *
 * Spins up Postgres and Redis in Docker, boots the full Spring Boot app on a
 * random port, and exercises register → login → /me through HTTP. Verifies
 * the database side effects directly via the JPA repositories.
 *
 * Skip locally with: ./mvnw test -Dtest='!*IntegrationTest'
 * Requires Docker. Runs in CI on a Linux runner with Docker available.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AuthFlowIntegrationTest {

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

        // Required environment vars — using throwaway test values.
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
    @Autowired UserRepository userRepository;
    @Autowired FamilyMemberRepository familyMemberRepository;

    @Test
    void registerThenLoginThenFetchCurrentUser() {
        // --- 1. Register a new family-head account -----------------------
        RegisterRequest registration = new RegisterRequest();
        registration.setName("Karma Patel");
        registration.setEmail("karma@example.com");
        registration.setPassword("hunter22");
        registration.setPhone("9876543210");

        ResponseEntity<Map> registerResp = http.postForEntity(
                url("/api/auth/register"), registration, Map.class);

        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResp.getBody()).containsEntry("success", true);

        Map<?, ?> registerData = (Map<?, ?>) registerResp.getBody().get("data");
        String issuedToken = (String) registerData.get("token");
        assertThat(issuedToken).isNotBlank();

        // The DB should now have a User row AND a "Self" FamilyMember linked to it.
        assertThat(userRepository.existsByEmail("karma@example.com")).isTrue();
        var saved = userRepository.findByEmail("karma@example.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo("FAMILY_HEAD");
        assertThat(familyMemberRepository.findByLinkedUserId(saved.getId()))
                .as("registration must auto-create a Self FamilyMember")
                .isPresent();

        // --- 2. Login with the same credentials --------------------------
        LoginRequest login = new LoginRequest();
        login.setEmail("karma@example.com");
        login.setPassword("hunter22");

        ResponseEntity<Map> loginResp = http.postForEntity(
                url("/api/auth/login"), login, Map.class);

        assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> loginData = (Map<?, ?>) loginResp.getBody().get("data");
        String loginToken = (String) loginData.get("token");
        assertThat(loginToken).isNotBlank();

        // --- 3. /me with the token returns the user ---------------------
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(loginToken);

        ResponseEntity<Map> meResp = http.exchange(
                url("/api/auth/me"), HttpMethod.GET,
                new HttpEntity<>(authHeaders), Map.class);

        assertThat(meResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> meData = (Map<String, Object>) meResp.getBody().get("data");
        assertThat(meData).containsEntry("email", "karma@example.com");
        assertThat(meData).containsEntry("name", "Karma Patel");

        // --- 4. /me WITHOUT a token must be rejected ---------------------
        ResponseEntity<String> unauthResp = http.getForEntity(
                url("/api/auth/me"), String.class);
        assertThat(unauthResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void duplicateEmailRegistrationIsRejected() {
        RegisterRequest first = new RegisterRequest();
        first.setName("Alice");
        first.setEmail("alice@example.com");
        first.setPassword("password123");
        ResponseEntity<Map> firstResp = http.postForEntity(
                url("/api/auth/register"), first, Map.class);
        assertThat(firstResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Same email, second time — must 409.
        RegisterRequest duplicate = new RegisterRequest();
        duplicate.setName("Alice Again");
        duplicate.setEmail("alice@example.com");
        duplicate.setPassword("differentpw");
        ResponseEntity<Map> dupResp = http.postForEntity(
                url("/api/auth/register"), duplicate, Map.class);

        assertThat(dupResp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(dupResp.getBody()).containsEntry("success", false);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
