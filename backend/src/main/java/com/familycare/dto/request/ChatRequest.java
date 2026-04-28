package com.familycare.dto.request;

import com.familycare.service.ai.dto.ChatMessage;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ChatRequest {
    /** Optional — when present, the assistant grounds its answer in this member's data. */
    private UUID familyMemberId;

    @NotBlank(message = "Message is required")
    private String message;

    /** Prior turns; the frontend retains and replays them. Last item is most recent. */
    private List<ChatMessage> history;
}
