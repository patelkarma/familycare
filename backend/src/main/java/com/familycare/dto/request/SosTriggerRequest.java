package com.familycare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SosTriggerRequest {

    @NotNull(message = "memberId is required")
    private UUID memberId;

    private Double latitude;
    private Double longitude;
    private Double accuracyMeters;
}
