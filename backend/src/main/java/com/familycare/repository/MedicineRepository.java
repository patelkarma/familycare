package com.familycare.repository;

import com.familycare.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, UUID> {
    List<Medicine> findByFamilyMemberIdAndIsActiveTrue(UUID familyMemberId);
    List<Medicine> findByFamilyMemberUserIdAndIsActiveTrue(UUID userId);
    Optional<Medicine> findByIdAndFamilyMemberUserId(UUID id, UUID userId);
    Optional<Medicine> findByIdAndFamilyMemberId(UUID id, UUID familyMemberId);
    List<Medicine> findByIsActiveTrue();
}
