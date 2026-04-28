package com.familycare.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SosEventResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private UUID triggeredByUserId;
    private String triggeredByName;
    private Double latitude;
    private Double longitude;
    private Double accuracyMeters;
    private String mapsUrl;
    private String messageBody;
    private int contactsNotified;
    private String deliverySummary; // JSON-as-string
    private LocalDateTime triggeredAt;
}
