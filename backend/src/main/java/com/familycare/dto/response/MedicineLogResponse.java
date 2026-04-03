package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineLogResponse {
    private UUID id;
    private UUID medicineId;
    private String medicineName;
    private String status;
    private String doseTiming;
    private LocalDateTime scheduledTime;
    private LocalDateTime takenAt;
    private String notes;
    private LocalDateTime createdAt;
}
