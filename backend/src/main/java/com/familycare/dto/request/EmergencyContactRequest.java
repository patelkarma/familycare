package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class EmergencyContactRequest {

    @NotNull(message = "familyMemberId is required")
    private UUID familyMemberId;

    @NotBlank(message = "name is required")
    @Size(max = 120)
    private String name;

    @NotBlank(message = "relationship is required")
    @Size(max = 80)
    private String relationship;

    @NotBlank(message = "phone is required")
    @Pattern(regexp = "^(\\+?91)?[6-9]\\d{9}$",
             message = "phone must be a valid 10-digit Indian mobile number")
    private String phone;

    private boolean isPrimary;
}
