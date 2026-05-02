package com.familycare.service;

import com.familycare.dto.request.LoginRequest;
import com.familycare.dto.request.RegisterRequest;
import com.familycare.dto.response.AuthResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.User;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import com.familycare.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private FamilyMemberRepository familyMemberRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private CloudinaryService cloudinaryService;

    @InjectMocks private AuthService authService;

    @Test
    void registerThrowsWhenEmailAlreadyTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("alice@example.com");
        request.setPassword("hunter22");
        request.setName("Alice");

        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        CustomExceptions.DuplicateResourceException ex = assertThrows(
                CustomExceptions.DuplicateResourceException.class,
                () -> authService.register(request));
        assertTrue(ex.getMessage().toLowerCase().contains("already"));

        // We must short-circuit *before* any user is persisted.
        verify(userRepository, never()).save(any());
        verify(familyMemberRepository, never()).save(any());
    }

    @Test
    void loginThrowsUnauthorizedOnWrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("wrong");

        User stored = User.builder()
                .email("alice@example.com")
                .passwordHash("$2a$12$hashed")
                .role("FAMILY_HEAD")
                .build();

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(stored));
        when(passwordEncoder.matches("wrong", "$2a$12$hashed")).thenReturn(false);

        assertThrows(CustomExceptions.UnauthorizedException.class,
                () -> authService.login(request));

        // No JWT must be issued on a failed login.
        verify(jwtUtil, never()).generateToken(anyString());
    }

    @Test
    void loginIssuesTokenForCorrectCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("right");

        User stored = User.builder()
                .email("alice@example.com")
                .name("Alice")
                .passwordHash("$2a$12$hashed")
                .role("FAMILY_HEAD")
                .build();

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(stored));
        when(passwordEncoder.matches("right", "$2a$12$hashed")).thenReturn(true);
        when(familyMemberRepository.findByUserIdAndLinkedUserId(any(), any()))
                .thenReturn(Optional.empty());
        when(familyMemberRepository.findByLinkedUserId(any()))
                .thenReturn(Optional.empty());
        when(jwtUtil.generateToken("alice@example.com")).thenReturn("signed.jwt.token");

        AuthResponse response = authService.login(request);

        assertEquals("signed.jwt.token", response.getToken());
        assertEquals("Alice", response.getName());
        assertEquals("FAMILY_HEAD", response.getRole());
        verify(jwtUtil, times(1)).generateToken("alice@example.com");
    }
}
