package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class FamilyMemberRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Relationship is required")
    private String relationship;

    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String gender;
    private String phone;
    private String whatsappPhone;
    private String allergies;
    private String chronicDiseases;
}
