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
public class EmergencyContactResponse {
    private UUID id;
    private UUID familyMemberId;
    private String familyMemberName;
    private String name;
    private String relationship;
    private String phone;
    private boolean isPrimary;
    private int displayOrder;
    private LocalDateTime createdAt;
}
