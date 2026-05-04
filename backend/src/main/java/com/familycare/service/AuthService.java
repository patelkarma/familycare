package com.familycare.service;

import com.familycare.dto.request.LoginRequest;
import com.familycare.dto.request.RegisterRequest;
import com.familycare.dto.response.AuthResponse;
import com.familycare.dto.response.UserResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import com.familycare.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomExceptions.DuplicateResourceException("Email already registered");
        }

        String role = request.getRole() != null && "MEMBER".equalsIgnoreCase(request.getRole())
                ? "MEMBER" : "FAMILY_HEAD";

        if ("MEMBER".equals(role)) {
            return registerPatient(request);
        } else {
            return registerFamilyHead(request);
        }
    }

    private AuthResponse registerFamilyHead(RegisterRequest request) {
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .whatsappPhone(request.getWhatsappPhone())
                .role("FAMILY_HEAD")
                .build();
        userRepository.save(user);

        // Auto-create a "Self" FamilyMember so the head can track their own health
        FamilyMember selfMember = FamilyMember.builder()
                .user(user)
                .linkedUser(user)
                .name(request.getName())
                .relationship("Self")
                .dateOfBirth(parseDate(request.getDateOfBirth()))
                .bloodGroup(request.getBloodGroup())
                .gender(request.getGender())
                .phone(request.getPhone())
                .whatsappPhone(request.getWhatsappPhone())
                .build();
        familyMemberRepository.save(selfMember);

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .familyMemberId(selfMember.getId())
                .build();
    }

    private AuthResponse registerPatient(RegisterRequest request) {
        // Validate family head email
        String familyHeadEmail = request.getFamilyHeadEmail();
        if (familyHeadEmail == null || familyHeadEmail.isBlank()) {
            throw new CustomExceptions.BadRequestException("Family head's email is required for patient registration");
        }

        User familyHead = userRepository.findByEmail(familyHeadEmail)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException(
                        "No family head account found with email: " + familyHeadEmail));

        if (!"FAMILY_HEAD".equals(familyHead.getRole())) {
            throw new CustomExceptions.BadRequestException("The email provided is not a family head account");
        }

        // Create patient user
        User patient = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .whatsappPhone(request.getWhatsappPhone())
                .role("MEMBER")
                .build();
        userRepository.save(patient);

        // Create FamilyMember under the family head, linked to the patient's account
        FamilyMember member = FamilyMember.builder()
                .user(familyHead)
                .linkedUser(patient)
                .name(request.getName())
                .relationship("Self")
                .dateOfBirth(parseDate(request.getDateOfBirth()))
                .bloodGroup(request.getBloodGroup())
                .gender(request.getGender())
                .phone(request.getPhone())
                .whatsappPhone(request.getWhatsappPhone())
                .allergies(request.getAllergies())
                .chronicDiseases(request.getChronicDiseases())
                .build();
        familyMemberRepository.save(member);

        String token = jwtUtil.generateToken(patient.getEmail());

        return AuthResponse.builder()
                .token(token)
                .name(patient.getName())
                .email(patient.getEmail())
                .role(patient.getRole())
                .avatarUrl(patient.getAvatarUrl())
                .familyMemberId(member.getId())
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomExceptions.UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new CustomExceptions.UnauthorizedException("Invalid email or password");
        }

        // Auto-create "Self" FamilyMember for legacy FAMILY_HEAD accounts that don't have one
        if ("FAMILY_HEAD".equals(user.getRole())) {
            ensureSelfMember(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        UUID familyMemberId = resolveFamilyMemberId(user);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .familyMemberId(familyMemberId)
                .build();
    }

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));

        // Pull health fields from the linked "Self" FamilyMember (works for both roles)
        Optional<FamilyMember> self = familyMemberRepository.findByLinkedUserId(user.getId());

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .whatsappPhone(user.getWhatsappPhone())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .familyMemberId(self.map(FamilyMember::getId).orElse(null))
                .dateOfBirth(self.map(FamilyMember::getDateOfBirth).orElse(null))
                .bloodGroup(self.map(FamilyMember::getBloodGroup).orElse(null))
                .gender(self.map(FamilyMember::getGender).orElse(null))
                .allergies(self.map(FamilyMember::getAllergies).orElse(null))
                .chronicDiseases(self.map(FamilyMember::getChronicDiseases).orElse(null))
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public UserResponse updateAvatar(MultipartFile file, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));

        String folder = "familycare/users/" + user.getId();
        CloudinaryService.UploadResult uploaded = cloudinaryService.upload(file, folder);

        user.setAvatarUrl(uploaded.secureUrl);
        userRepository.save(user);

        // Mirror to every FamilyMember record that represents this same person, so the
        // photo shows on the Family list, Dashboard, and Doses page too.
        Optional<FamilyMember> linked = familyMemberRepository.findByLinkedUserId(user.getId());
        if (linked.isPresent()) {
            FamilyMember m = linked.get();
            m.setAvatarUrl(uploaded.secureUrl);
            familyMemberRepository.save(m);
        } else {
            // Fallback for legacy accounts where the "Self" member was created without
            // its linkedUser populated. Backfill the link and mirror the avatar.
            familyMemberRepository.findByUserId(user.getId()).stream()
                    .filter(m -> "Self".equalsIgnoreCase(m.getRelationship()))
                    .findFirst()
                    .ifPresent(m -> {
                        m.setAvatarUrl(uploaded.secureUrl);
                        if (m.getLinkedUser() == null) {
                            m.setLinkedUser(user);
                        }
                        familyMemberRepository.save(m);
                    });
        }

        return getCurrentUser(userEmail);
    }

    @Transactional
    public UserResponse removeAvatar(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));

        user.setAvatarUrl(null);
        userRepository.save(user);

        // Mirror the clear to the linked Self FamilyMember so it disappears from
        // the Family list / Dashboard / Doses page in lockstep with the profile.
        familyMemberRepository.findByLinkedUserId(user.getId()).ifPresent(m -> {
            m.setAvatarUrl(null);
            familyMemberRepository.save(m);
        });

        return getCurrentUser(userEmail);
    }

    private UUID resolveFamilyMemberId(User user) {
        // For both roles, find the FamilyMember linked to this user account
        return familyMemberRepository.findByLinkedUserId(user.getId())
                .map(FamilyMember::getId)
                .orElse(null);
    }

    private void ensureSelfMember(User user) {
        // Check if a "Self" FamilyMember already exists (linked to this user)
        Optional<FamilyMember> existing = familyMemberRepository.findByUserIdAndLinkedUserId(user.getId(), user.getId());
        if (existing.isPresent()) return;

        // Also check by linkedUserId alone (covers all cases)
        Optional<FamilyMember> linkedExisting = familyMemberRepository.findByLinkedUserId(user.getId());
        if (linkedExisting.isPresent()) return;

        // Create "Self" FamilyMember for this family head
        FamilyMember selfMember = FamilyMember.builder()
                .user(user)
                .linkedUser(user)
                .name(user.getName())
                .relationship("Self")
                .phone(user.getPhone())
                .build();
        familyMemberRepository.save(selfMember);
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}
