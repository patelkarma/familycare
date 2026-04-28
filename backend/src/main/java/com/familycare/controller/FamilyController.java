package com.familycare.controller;

import com.familycare.dto.request.FamilyMemberRequest;
import com.familycare.dto.request.LinkAccountRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.FamilyMemberResponse;
import com.familycare.service.FamilyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/family")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<FamilyMemberResponse>>> getAllMembers(Authentication auth) {
        List<FamilyMemberResponse> members = familyService.getAllMembers(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PostMapping("/members")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> addMember(
            @Valid @RequestBody FamilyMemberRequest request, Authentication auth) {
        FamilyMemberResponse member = familyService.addMember(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(member, "Family member added successfully"));
    }

    @GetMapping("/members/{id}")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> getMember(
            @PathVariable UUID id, Authentication auth) {
        FamilyMemberResponse member = familyService.getMemberById(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(member));
    }

    @PutMapping("/members/{id}")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> updateMember(
            @PathVariable UUID id, @Valid @RequestBody FamilyMemberRequest request, Authentication auth) {
        FamilyMemberResponse member = familyService.updateMember(id, request, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(member, "Family member updated successfully"));
    }

    @DeleteMapping("/members/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMember(
            @PathVariable UUID id, Authentication auth) {
        familyService.deleteMember(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Family member deleted successfully"));
    }

    @PostMapping(value = "/members/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> updateAvatar(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            Authentication auth) {
        FamilyMemberResponse member = familyService.updateAvatar(id, file, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(member, "Avatar updated"));
    }

    @PostMapping("/members/{id}/link-account")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> linkAccount(
            @PathVariable UUID id, @Valid @RequestBody LinkAccountRequest request, Authentication auth) {
        FamilyMemberResponse member = familyService.linkAccount(id, request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(member, "Patient account created and linked"));
    }

    @DeleteMapping("/members/{id}/link-account")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> unlinkAccount(
            @PathVariable UUID id, Authentication auth) {
        FamilyMemberResponse member = familyService.unlinkAccount(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(member, "Patient account unlinked"));
    }
}
