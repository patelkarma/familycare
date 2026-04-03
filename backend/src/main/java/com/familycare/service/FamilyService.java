package com.familycare.service;

import com.familycare.dto.request.FamilyMemberRequest;
import com.familycare.dto.request.LinkAccountRequest;
import com.familycare.dto.response.FamilyMemberResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FamilyService {

    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<FamilyMemberResponse> getAllMembers(String userEmail) {
        User user = getUser(userEmail);
        return familyMemberRepository.findByUserId(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public FamilyMemberResponse getMemberById(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
        return toResponse(member);
    }

    public FamilyMemberResponse addMember(FamilyMemberRequest request, String userEmail) {
        User user = getUser(userEmail);

        FamilyMember member = FamilyMember.builder()
                .user(user)
                .name(request.getName())
                .relationship(request.getRelationship())
                .dateOfBirth(request.getDateOfBirth())
                .bloodGroup(request.getBloodGroup())
                .gender(request.getGender())
                .phone(request.getPhone())
                .allergies(request.getAllergies())
                .chronicDiseases(request.getChronicDiseases())
                .build();

        familyMemberRepository.save(member);
        return toResponse(member);
    }

    public FamilyMemberResponse updateMember(UUID memberId, FamilyMemberRequest request, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        member.setName(request.getName());
        member.setRelationship(request.getRelationship());
        member.setDateOfBirth(request.getDateOfBirth());
        member.setBloodGroup(request.getBloodGroup());
        member.setGender(request.getGender());
        member.setPhone(request.getPhone());
        member.setAllergies(request.getAllergies());
        member.setChronicDiseases(request.getChronicDiseases());

        familyMemberRepository.save(member);
        return toResponse(member);
    }

    public void deleteMember(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
        familyMemberRepository.delete(member);
    }

    @Transactional
    public FamilyMemberResponse linkAccount(UUID memberId, LinkAccountRequest request, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can create patient accounts");
        }

        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        if (member.getLinkedUser() != null) {
            throw new CustomExceptions.ConflictException("This family member already has a linked account");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomExceptions.DuplicateResourceException("Email already registered");
        }

        String accountName = request.getName() != null ? request.getName() : member.getName();

        User patientUser = User.builder()
                .name(accountName)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(member.getPhone())
                .role("MEMBER")
                .build();

        userRepository.save(patientUser);

        member.setLinkedUser(patientUser);
        familyMemberRepository.save(member);

        return toResponse(member);
    }

    @Transactional
    public FamilyMemberResponse unlinkAccount(UUID memberId, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can unlink patient accounts");
        }

        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        if (member.getLinkedUser() == null) {
            throw new CustomExceptions.ResourceNotFoundException("No linked account found for this family member");
        }

        member.setLinkedUser(null);
        familyMemberRepository.save(member);

        return toResponse(member);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }

    private FamilyMemberResponse toResponse(FamilyMember member) {
        return FamilyMemberResponse.builder()
                .id(member.getId())
                .name(member.getName())
                .relationship(member.getRelationship())
                .dateOfBirth(member.getDateOfBirth())
                .bloodGroup(member.getBloodGroup())
                .gender(member.getGender())
                .phone(member.getPhone())
                .allergies(member.getAllergies())
                .chronicDiseases(member.getChronicDiseases())
                .avatarUrl(member.getAvatarUrl())
                .linkedUserEmail(member.getLinkedUser() != null ? member.getLinkedUser().getEmail() : null)
                .createdAt(member.getCreatedAt())
                .build();
    }
}
