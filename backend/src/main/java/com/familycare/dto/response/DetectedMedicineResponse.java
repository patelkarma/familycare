package com.familycare.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class DetectedMedicineResponse {
    private String name;
    private String genericName;
    private String category;
    private String dosage;
    private String form;
    private String frequency;
    private Map<String, String> timing;
    private Boolean withFood;
    private Integer durationDays;
    private Double confidence;
    private String rawLine;
}
