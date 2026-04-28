package com.familycare.controller;

import com.familycare.dto.request.LoginRequest;
import com.familycare.dto.request.RegisterRequest;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.AuthResponse;
import com.familycare.dto.response.UserResponse;
import com.familycare.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${twilio.whatsapp-sandbox-number}")
    private String sandboxNumber;

    @Value("${twilio.whatsapp-sandbox-code}")
    private String sandboxCode;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication authentication) {
        UserResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> updateMyAvatar(
            @RequestPart("file") MultipartFile file, Authentication authentication) {
        UserResponse response = authService.updateAvatar(file, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Profile photo updated"));
    }

    @GetMapping("/whatsapp-join-info")
    public ResponseEntity<ApiResponse<Map<String, String>>> getWhatsAppJoinInfo() {
        String joinText = "join " + sandboxCode;
        String digits = sandboxNumber.replaceAll("[^0-9]", "");
        String deepLink = "https://wa.me/" + digits + "?text=" +
                URLEncoder.encode(joinText, StandardCharsets.UTF_8);
        Map<String, String> info = Map.of(
                "number", sandboxNumber,
                "code", sandboxCode,
                "joinText", joinText,
                "deepLink", deepLink
        );
        return ResponseEntity.ok(ApiResponse.success(info));
    }
}
