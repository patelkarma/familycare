package com.familycare.repository;

import com.familycare.model.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {
    List<FamilyMember> findByUserId(UUID userId);
    Optional<FamilyMember> findByIdAndUserId(UUID id, UUID userId);
    Optional<FamilyMember> findByLinkedUserId(UUID linkedUserId);
}
