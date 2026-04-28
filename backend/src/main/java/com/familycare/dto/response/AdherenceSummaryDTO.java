package com.familycare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdherenceSummaryDTO {
    private UUID memberId;
    private String memberName;
    private String memberAvatarUrl;
    private int totalExpected;
    private int taken;
    private int missed;
    private int skipped;
    private double adherencePercent;
}
