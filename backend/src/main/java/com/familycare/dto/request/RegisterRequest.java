package com.familycare.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;

    // Optional separate WhatsApp number (e.g. user's secondary SIM that has WhatsApp installed)
    private String whatsappPhone;

    // Role selection: "FAMILY_HEAD" (default) or "MEMBER"
    private String role;

    // Health profile fields
    private String dateOfBirth;
    private String bloodGroup;
    private String gender;
    private String allergies;
    private String chronicDiseases;

    // Required for MEMBER registration — the family head's email to link to
    private String familyHeadEmail;
}
