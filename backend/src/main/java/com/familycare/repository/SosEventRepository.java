package com.familycare.repository;

import com.familycare.model.SosEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SosEventRepository extends JpaRepository<SosEvent, UUID> {

    Optional<SosEvent> findFirstByFamilyMemberIdOrderByTriggeredAtDesc(UUID familyMemberId);

    List<SosEvent> findByFamilyMemberIdOrderByTriggeredAtDesc(UUID familyMemberId);
}
