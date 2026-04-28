package com.familycare.repository;

import com.familycare.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {

    List<EmergencyContact> findByFamilyMemberIdOrderByIsPrimaryDescDisplayOrderAscCreatedAtAsc(UUID familyMemberId);

    long countByFamilyMemberId(UUID familyMemberId);

    @Modifying
    @Query("UPDATE EmergencyContact c SET c.isPrimary = false WHERE c.familyMember.id = :memberId AND c.id <> :exceptId")
    void demoteOtherPrimaries(@Param("memberId") UUID memberId, @Param("exceptId") UUID exceptId);
}
