package com.familycare.service.whatsapp.dto;

import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SenderContext {
    private FamilyMember member;
    private User headUser;
    private boolean ambiguous;
    private List<FamilyMember> candidates;
}
