package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MedicineLogRequest {
    @NotBlank(message = "Dose timing is required")
    private String doseTiming;

    private String notes;
}
