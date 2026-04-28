package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String whatsappPhone;
    private String role;
    private String avatarUrl;
    private UUID familyMemberId;
    // Health profile fields — pulled from the linked "Self" FamilyMember
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String gender;
    private String allergies;
    private String chronicDiseases;
    private LocalDateTime createdAt;
}
