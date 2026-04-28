package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class VitalsRequest {

    @NotNull(message = "Family member ID is required")
    private UUID familyMemberId;

    @NotBlank(message = "Vital type is required")
    private String type;

    @NotNull(message = "Primary value is required")
    private Double valuePrimary;

    private Double valueSecondary;

    private String notes;
}
