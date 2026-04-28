package com.familycare.controller;

import com.familycare.dto.request.MedicineLogRequest;
import com.familycare.dto.request.MedicineRequest;
import com.familycare.dto.request.ParsePrescriptionRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.DetectedMedicineResponse;
import com.familycare.dto.response.MedicineLogResponse;
import com.familycare.dto.response.MedicineResponse;
import com.familycare.service.MedicineService;
import com.familycare.service.PrescriptionParser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;
    private final PrescriptionParser prescriptionParser;

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getMedicinesByMember(
            @PathVariable UUID memberId, Authentication auth) {
        List<MedicineResponse> medicines = medicineService.getMedicinesByMember(memberId, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(medicines));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MedicineResponse>> addMedicine(
            @Valid @RequestBody MedicineRequest request, Authentication auth) {
        MedicineResponse medicine = medicineService.addMedicine(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(medicine, "Medicine added successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicine(
            @PathVariable UUID id, @Valid @RequestBody MedicineRequest request, Authentication auth) {
        MedicineResponse medicine = medicineService.updateMedicine(id, request, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(medicine, "Medicine updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(
            @PathVariable UUID id, Authentication auth) {
        medicineService.deleteMedicine(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Medicine removed successfully"));
    }

    @PostMapping("/{id}/mark-taken")
    public ResponseEntity<ApiResponse<MedicineLogResponse>> markTaken(
            @PathVariable UUID id, @Valid @RequestBody MedicineLogRequest request, Authentication auth) {
        MedicineLogResponse log = medicineService.markTaken(id, request.getDoseTiming(), request.getNotes(), auth.getName());
        return ResponseEntity.ok(ApiResponse.success(log, "Dose marked as taken"));
    }

    @PostMapping("/{id}/mark-skipped")
    public ResponseEntity<ApiResponse<MedicineLogResponse>> markSkipped(
            @PathVariable UUID id, @Valid @RequestBody MedicineLogRequest request, Authentication auth) {
        MedicineLogResponse log = medicineService.markSkipped(id, request.getDoseTiming(), request.getNotes(), auth.getName());
        return ResponseEntity.ok(ApiResponse.success(log, "Dose marked as skipped"));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<ApiResponse<List<MedicineLogResponse>>> getLogs(
            @PathVariable UUID id, Authentication auth) {
        List<MedicineLogResponse> logs = medicineService.getLogs(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @PostMapping("/{id}/resend-reminder")
    public ResponseEntity<ApiResponse<String>> resendReminder(
            @PathVariable UUID id, @RequestParam String doseTiming, Authentication auth) {
        String result = medicineService.resendReminder(id, doseTiming, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(result, "Reminder resent"));
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateStock(
            @PathVariable UUID id, @RequestBody Map<String, Integer> body, Authentication auth) {
        MedicineResponse medicine = medicineService.updateStock(id, body.get("stockCount"), auth.getName());
        return ResponseEntity.ok(ApiResponse.success(medicine, "Stock updated successfully"));
    }

    @PostMapping("/parse-prescription")
    public ResponseEntity<ApiResponse<List<DetectedMedicineResponse>>> parsePrescription(
            @Valid @RequestBody ParsePrescriptionRequest request) {
        List<DetectedMedicineResponse> detected = prescriptionParser.parse(request.getRawText());
        String msg = detected.isEmpty()
                ? "No medicines detected. Please add them manually."
                : "Detected " + detected.size() + " medicine" + (detected.size() > 1 ? "s" : "");
        return ResponseEntity.ok(ApiResponse.success(detected, msg));
    }
}
