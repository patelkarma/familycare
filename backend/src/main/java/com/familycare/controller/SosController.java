package com.familycare.controller;

import com.familycare.dto.request.EmergencyContactRequest;
import com.familycare.dto.request.SosTriggerRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.EmergencyContactResponse;
import com.familycare.dto.response.SosEventResponse;
import com.familycare.dto.response.SosTriggerResponse;
import com.familycare.service.SosService;
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
@RequestMapping("/api/sos")
@RequiredArgsConstructor
public class SosController {

    private final SosService sosService;

    // ───────── Trigger ─────────

    @PostMapping("/trigger")
    public ResponseEntity<ApiResponse<SosTriggerResponse>> trigger(
            @Valid @RequestBody SosTriggerRequest request, Authentication auth) {
        SosTriggerResponse response = sosService.trigger(request, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "SOS alert sent"));
    }

    // ───────── Emergency Contacts CRUD ─────────

    @GetMapping("/contacts/member/{memberId}")
    public ResponseEntity<ApiResponse<List<EmergencyContactResponse>>> listContacts(
            @PathVariable UUID memberId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(sosService.listContacts(memberId, auth.getName())));
    }

    @PostMapping("/contacts")
    public ResponseEntity<ApiResponse<EmergencyContactResponse>> createContact(
            @Valid @RequestBody EmergencyContactRequest request, Authentication auth) {
        EmergencyContactResponse contact = sosService.createContact(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contact, "Emergency contact added"));
    }

    @PutMapping("/contacts/{id}")
    public ResponseEntity<ApiResponse<EmergencyContactResponse>> updateContact(
            @PathVariable UUID id,
            @Valid @RequestBody EmergencyContactRequest request,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                sosService.updateContact(id, request, auth.getName()),
                "Emergency contact updated"));
    }

    @DeleteMapping("/contacts/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @PathVariable UUID id, Authentication auth) {
        sosService.deleteContact(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Emergency contact deleted"));
    }

    @PostMapping("/contacts/{id}/primary")
    public ResponseEntity<ApiResponse<EmergencyContactResponse>> setPrimary(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                sosService.setPrimary(id, auth.getName()),
                "Primary contact updated"));
    }

    // ───────── Event history ─────────

    @GetMapping("/events/member/{memberId}")
    public ResponseEntity<ApiResponse<List<SosEventResponse>>> listEvents(
            @PathVariable UUID memberId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(sosService.listEvents(memberId, auth.getName())));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<ApiResponse<SosEventResponse>> getEvent(
            @PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(sosService.getEvent(id, auth.getName())));
    }

    // ───────── Test SMS ─────────

    @PostMapping("/test-sms")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> sendTestSms(Authentication auth) {
        boolean ok = sosService.sendTestSms(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("delivered", ok),
                ok ? "Test WhatsApp sent — check your phone" : "Test WhatsApp failed — verify your number is joined to the Twilio sandbox"));
    }
}
