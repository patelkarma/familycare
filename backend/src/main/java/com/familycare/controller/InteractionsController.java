package com.familycare.controller;

import com.familycare.dto.response.DrugInteractionResponse;
import com.familycare.service.interactions.DrugInteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/interactions")
@RequiredArgsConstructor
public class InteractionsController {

    private final DrugInteractionService service;

    @GetMapping("/check")
    public ResponseEntity<DrugInteractionResponse> check(
            @RequestParam("memberId") UUID memberId,
            @RequestParam("drugName") String drugName,
            Authentication auth) {
        return ResponseEntity.ok(service.check(memberId, drugName, auth.getName()));
    }
}
