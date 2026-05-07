package com.familycare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
public class MedicineRequest {

    @NotNull(message = "Family member ID is required")
    private UUID familyMemberId;

    @NotBlank(message = "Medicine name is required")
    private String name;

    private String genericName;

    @NotBlank(message = "Dosage is required")
    private String dosage;

    private String form;

    @NotBlank(message = "Frequency is required")
    private String frequency;

    private String weeklyDay;

    private Map<String, String> timing;

    private Boolean withFood;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer stockCount;
    private String notes;
}
