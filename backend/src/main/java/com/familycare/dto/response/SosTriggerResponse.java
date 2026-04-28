package com.familycare.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SosTriggerResponse {
    private UUID eventId;
    private int contactsNotified;
    private LocalDateTime triggeredAt;
    private List<DeliveryStatus> deliveryByContact;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryStatus {
        private UUID contactId;
        private String name;
        private String phone;
        private String relationship;
        private boolean isPrimary;
        private String sms;       // SENT | FAILED | SKIPPED
        private String whatsapp;  // SENT | FAILED | SKIPPED
    }
}
