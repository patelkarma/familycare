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
public class VitalsResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private String type;
    private Double valuePrimary;
    private Double valueSecondary;
    private String unit;
    private String notes;
    private LocalDateTime recordedAt;
}
