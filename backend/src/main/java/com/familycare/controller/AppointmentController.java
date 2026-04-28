package com.familycare.controller;

import com.familycare.dto.request.AppointmentRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.AppointmentResponse;
import com.familycare.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getByMember(
            @PathVariable UUID memberId, Authentication auth) {
        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByMember(memberId, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(appointments));
    }

    @GetMapping("/member/{memberId}/upcoming")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getUpcoming(
            @PathVariable UUID memberId, Authentication auth) {
        List<AppointmentResponse> appointments = appointmentService.getUpcomingByMember(memberId, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(appointments));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AppointmentResponse>> add(
            @Valid @RequestBody AppointmentRequest request, Authentication auth) {
        AppointmentResponse appointment = appointmentService.addAppointment(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(appointment, "Appointment added"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AppointmentResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody AppointmentRequest request, Authentication auth) {
        AppointmentResponse appointment = appointmentService.updateAppointment(id, request, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, Authentication auth) {
        appointmentService.deleteAppointment(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Appointment deleted"));
    }
}
