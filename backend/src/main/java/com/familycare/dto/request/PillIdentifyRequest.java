package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class PillIdentifyRequest {
    @NotNull
    private UUID familyMemberId;

    /** Base64-encoded image bytes (no data: prefix). */
    @NotBlank
    private String imageBase64;

    /** e.g. image/jpeg, image/png. */
    private String mimeType;
}
