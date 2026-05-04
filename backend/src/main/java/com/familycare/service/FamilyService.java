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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FamilyService {

    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public List<FamilyMemberResponse> getAllMembers(String userEmail) {
        User user = getUser(userEmail);
        return familyMemberRepository.findByUserId(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
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
                .whatsappPhone(request.getWhatsappPhone())
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
        member.setWhatsappPhone(request.getWhatsappPhone());
        member.setAllergies(request.getAllergies());
        member.setChronicDiseases(request.getChronicDiseases());

        familyMemberRepository.save(member);

        // Keep the linked User row in sync. Name is mirrored so the greeting,
        // sidebar, and JWT-derived display strings update when the family head
        // edits their own Self member (or renames a linked patient). Phone and
        // whatsapp are mirrored so escalation/alert paths keep reaching the
        // right number.
        if (member.getLinkedUser() != null) {
            User linked = member.getLinkedUser();
            linked.setName(request.getName());
            linked.setPhone(request.getPhone());
            linked.setWhatsappPhone(request.getWhatsappPhone());
            userRepository.save(linked);
        }
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
    public FamilyMemberResponse updateAvatar(UUID memberId, MultipartFile file, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can update avatars");
        }

        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        String folder = "familycare/avatars/" + member.getId();
        CloudinaryService.UploadResult uploaded = cloudinaryService.upload(file, folder);

        member.setAvatarUrl(uploaded.secureUrl);
        familyMemberRepository.save(member);

        // Mirror to the linked user account so Profile/Sidebar/TopBar stay in sync
        if (member.getLinkedUser() != null) {
            User linked = member.getLinkedUser();
            linked.setAvatarUrl(uploaded.secureUrl);
            userRepository.save(linked);
        }
        return toResponse(member);
    }

    @Transactional
    public FamilyMemberResponse removeAvatar(UUID memberId, String userEmail) {
        User user = getUser(userEmail);

        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can remove avatars");
        }

        FamilyMember member = familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        // Only mirror the clear to the linked user when the avatar showing was
        // actually the member's own (the upload path mirrors both URLs to the
        // same value). If the member had no own avatar, the displayed photo is
        // coming from the linked user's profile via resolveAvatar() — clearing
        // it then would unexpectedly wipe that user's profile photo too.
        String oldUrl = member.getAvatarUrl();
        member.setAvatarUrl(null);
        familyMemberRepository.save(member);

        if (oldUrl != null && member.getLinkedUser() != null
                && oldUrl.equals(member.getLinkedUser().getAvatarUrl())) {
            User linked = member.getLinkedUser();
            linked.setAvatarUrl(null);
            userRepository.save(linked);
        }

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
                .whatsappPhone(member.getWhatsappPhone())
                .allergies(member.getAllergies())
                .chronicDiseases(member.getChronicDiseases())
                .avatarUrl(resolveAvatar(member))
                .linkedUserEmail(member.getLinkedUser() != null ? member.getLinkedUser().getEmail() : null)
                .createdAt(member.getCreatedAt())
                .build();
    }

    /**
     * Returns the avatar URL to display for a member, falling back to the linked user's
     * profile photo (or the owning user's photo for "Self" members) if the member has none.
     * Lets a profile-pic upload appear in the Family list / Dashboard without requiring
     * the FamilyMember row to be separately updated.
     */
    public static String resolveAvatar(FamilyMember m) {
        if (m == null) return null;
        if (m.getAvatarUrl() != null && !m.getAvatarUrl().isBlank()) return m.getAvatarUrl();
        if (m.getLinkedUser() != null && m.getLinkedUser().getAvatarUrl() != null) {
            return m.getLinkedUser().getAvatarUrl();
        }
        if ("Self".equalsIgnoreCase(m.getRelationship())
                && m.getUser() != null && m.getUser().getAvatarUrl() != null) {
            return m.getUser().getAvatarUrl();
        }
        return null;
    }
}
