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
public class DoseSlotDTO {
    private UUID medicineId;
    private String medicineName;
    private String dosage;
    private String form;
    private String timingKey;
    private String scheduledTime;
    private String status;
    private LocalDateTime takenAt;
    private UUID logId;
    private String markedByName;
    private Boolean withFood;
}
