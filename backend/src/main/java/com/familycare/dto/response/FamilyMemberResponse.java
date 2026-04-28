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
public class FamilyMemberResponse {
    private UUID id;
    private String name;
    private String relationship;
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String gender;
    private String phone;
    private String whatsappPhone;
    private String allergies;
    private String chronicDiseases;
    private String avatarUrl;
    private String linkedUserEmail;
    private LocalDateTime createdAt;
}
