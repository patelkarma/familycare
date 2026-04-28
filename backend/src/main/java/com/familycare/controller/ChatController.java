package com.familycare.controller;

import com.familycare.dto.request.ChatRequest;
import com.familycare.dto.response.ChatResponse;
import com.familycare.service.ai.HealthAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final HealthAssistantService healthAssistantService;

    @PostMapping("/ask")
    public ResponseEntity<ChatResponse> ask(@Valid @RequestBody ChatRequest request,
                                            Authentication auth) {
        return ResponseEntity.ok(healthAssistantService.ask(request, auth.getName()));
    }
}
