package com.familycare.controller;

import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.PharmacyResponse;
import com.familycare.service.PharmacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyService pharmacyService;

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<PharmacyResponse>>> findNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false, defaultValue = "2000") int radius) {
        List<PharmacyResponse> pharmacies = pharmacyService.findNearby(lat, lng, radius);
        String msg = pharmacies.isEmpty()
                ? "No pharmacies found nearby. Try increasing the radius."
                : "Found " + pharmacies.size() + " pharmac" + (pharmacies.size() == 1 ? "y" : "ies");
        return ResponseEntity.ok(ApiResponse.success(pharmacies, msg));
    }
}
