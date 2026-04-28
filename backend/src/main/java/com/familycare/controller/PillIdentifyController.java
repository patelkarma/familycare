package com.familycare.controller;

import com.familycare.dto.request.PillIdentifyRequest;
import com.familycare.dto.response.PillIdentifyResponse;
import com.familycare.service.ai.PillIdentifierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pill")
@RequiredArgsConstructor
public class PillIdentifyController {

    private final PillIdentifierService pillIdentifierService;

    @PostMapping("/identify")
    public ResponseEntity<PillIdentifyResponse> identify(@Valid @RequestBody PillIdentifyRequest request,
                                                          Authentication auth) {
        return ResponseEntity.ok(pillIdentifierService.identify(request, auth.getName()));
    }
}
