package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ParsePrescriptionRequest {

    @NotBlank(message = "Raw OCR text is required")
    private String rawText;

    private String prescriptionUrl;
}
