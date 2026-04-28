package com.familycare.service.ai;

import com.familycare.exception.CustomExceptions;
import com.familycare.service.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class GeminiClient {

    private static final String ENDPOINT_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    @Value("${gemini.api-key:default}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    private final RestTemplate restTemplate;

    public GeminiClient(@Qualifier("geminiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isConfigured() {
        return apiKey != null && !"default".equals(apiKey) && !apiKey.isBlank();
    }

    /**
     * Sends a chat completion request to Gemini and returns the model's text reply.
     * History uses "user" / "assistant" roles in our DTO; we translate "assistant"
     * to Gemini's "model" role.
     */
    public String chat(String systemPrompt, List<ChatMessage> history, String userMessage) {
        return invoke(systemPrompt, history, userMessage, null, null);
    }

    /**
     * Vision call: same model, but the user turn includes an inline image.
     */
    public String chatWithImage(String systemPrompt, String userMessage,
                                String imageBase64, String mimeType) {
        return invoke(systemPrompt, null, userMessage, imageBase64, mimeType);
    }

    private String invoke(String systemPrompt, List<ChatMessage> history, String userMessage,
                          String imageBase64, String mimeType) {
        if (!isConfigured()) {
            throw new CustomExceptions.BadRequestException(
                    "AI assistant is not configured. Set GEMINI_API_KEY to enable.");
        }

        Map<String, Object> body = new HashMap<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            body.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (ChatMessage m : history) {
                if (m.getContent() == null || m.getContent().isBlank()) continue;
                String role = "assistant".equalsIgnoreCase(m.getRole()) ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", m.getContent()))
                ));
            }
        }

        List<Map<String, Object>> userParts = new ArrayList<>();
        if (imageBase64 != null && !imageBase64.isBlank()) {
            userParts.add(Map.of("inline_data", Map.of(
                    "mime_type", mimeType == null ? "image/jpeg" : mimeType,
                    "data", imageBase64
            )));
        }
        userParts.add(Map.of("text", userMessage));
        contents.add(Map.of("role", "user", "parts", userParts));
        body.put("contents", contents);

        body.put("generationConfig", Map.of(
                "temperature", imageBase64 == null ? 0.6 : 0.2,
                "maxOutputTokens", 1024
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String url = String.format(ENDPOINT_TEMPLATE, model, apiKey);
        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), JsonNode.class);

            JsonNode root = response.getBody();
            if (root == null) {
                throw new CustomExceptions.BadRequestException("Empty response from AI");
            }
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                String blockReason = root.path("promptFeedback").path("blockReason").asText("");
                if (!blockReason.isBlank()) {
                    return "I can't answer that — the request was blocked (" + blockReason + ").";
                }
                throw new CustomExceptions.BadRequestException("AI returned no answer");
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new CustomExceptions.BadRequestException("AI response has no content");
            }
            return parts.get(0).path("text").asText("").trim();
        } catch (HttpClientErrorException e) {
            log.error("Gemini call failed: {}", e.getMessage());
            HttpStatusCode status = e.getStatusCode();
            if (status.value() == 429) {
                throw new CustomExceptions.BadRequestException(
                        "Gemini quota exceeded for the current model. Try a different model "
                                + "(e.g. set GEMINI_MODEL=gemini-2.5-flash-lite) or wait a minute and retry.");
            }
            if (status.value() == 401 || status.value() == 403) {
                throw new CustomExceptions.BadRequestException(
                        "Gemini rejected the API key. Verify GEMINI_API_KEY is valid and the key's "
                                + "project has the Generative Language API enabled.");
            }
            if (status.value() == 404) {
                throw new CustomExceptions.BadRequestException(
                        "Model '" + model + "' not found. Try GEMINI_MODEL=gemini-2.5-flash.");
            }
            throw new CustomExceptions.BadRequestException(
                    "AI is unavailable right now (" + status.value() + "). Please try again.");
        } catch (RestClientException e) {
            log.error("Gemini call failed: {}", e.getMessage());
            throw new CustomExceptions.BadRequestException(
                    "AI is unavailable right now. Please try again in a moment.");
        }
    }
}
