package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private String name;
    private String genericName;
    private String dosage;
    private String form;
    private String frequency;
    private Map<String, String> timing;
    private Boolean withFood;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer stockCount;
    private Integer lowStockAlert;
    private String notes;
    private String prescriptionUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
