package com.familycare.controller;

import com.familycare.dto.request.VitalsRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.VitalsResponse;
import com.familycare.service.VitalsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vitals")
@RequiredArgsConstructor
public class VitalsController {

    private final VitalsService vitalsService;

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<List<VitalsResponse>>> getVitals(
            @PathVariable UUID memberId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "30") int days,
            Authentication auth) {
        List<VitalsResponse> vitals = vitalsService.getVitals(memberId, type, days, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(vitals));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VitalsResponse>> addVital(
            @Valid @RequestBody VitalsRequest request, Authentication auth) {
        VitalsResponse vital = vitalsService.addVital(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(vital, "Vital recorded successfully"));
    }

    @GetMapping("/member/{memberId}/latest")
    public ResponseEntity<ApiResponse<List<VitalsResponse>>> getLatestVitals(
            @PathVariable UUID memberId, Authentication auth) {
        List<VitalsResponse> latest = vitalsService.getLatestVitals(memberId, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(latest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVital(
            @PathVariable UUID id, Authentication auth) {
        vitalsService.deleteVital(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Vital record deleted"));
    }
}
