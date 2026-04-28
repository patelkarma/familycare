package com.familycare.controller;

import com.familycare.dto.request.ReportCreateRequest;
import com.familycare.dto.request.ReportUpdateRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.ReportResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.service.ReportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ReportResponse>> createReport(
            @RequestPart("file") MultipartFile file,
            @RequestPart("data") String dataJson,
            Authentication auth) {

        ReportCreateRequest request;
        try {
            request = objectMapper.readValue(dataJson, ReportCreateRequest.class);
        } catch (Exception e) {
            throw new CustomExceptions.BadRequestException("Invalid report metadata: " + e.getMessage());
        }

        // Manually run bean validation since we parsed JSON ourselves
        Set<jakarta.validation.ConstraintViolation<ReportCreateRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            String msg = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining(", "));
            throw new CustomExceptions.BadRequestException(msg);
        }

        ReportResponse response = reportService.createReport(request, file, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Report uploaded successfully"));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<ReportResponse>>> getRecentReports(
            @RequestParam(defaultValue = "5") int limit,
            Authentication auth) {
        List<ReportResponse> reports = reportService.getRecentReportsForUser(auth.getName(), limit);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<List<ReportResponse>>> listReports(
            @PathVariable UUID memberId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(required = false) String q,
            Authentication auth) {
        List<ReportResponse> reports = reportService.listReports(memberId, type, from, to, pinned, q, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReportResponse>> getReport(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getReport(id, auth.getName())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReportResponse>> updateReport(
            @PathVariable UUID id,
            @RequestBody ReportUpdateRequest request,
            Authentication auth) {
        Set<jakarta.validation.ConstraintViolation<ReportUpdateRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            String msg = violations.stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining(", "));
            throw new CustomExceptions.BadRequestException(msg);
        }
        return ResponseEntity.ok(ApiResponse.success(
                reportService.updateReport(id, request, auth.getName()),
                "Report updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReport(
            @PathVariable UUID id, Authentication auth) {
        reportService.deleteReport(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Report deleted"));
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<ApiResponse<ReportResponse>> togglePin(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.togglePin(id, auth.getName()), "Pin toggled"));
    }

    @PostMapping("/{id}/attach-appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<ReportResponse>> attachAppointment(
            @PathVariable UUID id,
            @PathVariable UUID appointmentId,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.attachAppointment(id, appointmentId, auth.getName()),
                "Appointment linked"));
    }

    @GetMapping("/{id}/share")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateShareUrl(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.generateShareUrl(id, auth.getName())));
    }
}
