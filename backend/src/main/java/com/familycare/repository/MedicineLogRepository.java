package com.familycare.repository;

import com.familycare.model.MedicineLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicineLogRepository extends JpaRepository<MedicineLog, UUID> {
    List<MedicineLog> findByMedicineIdOrderByCreatedAtDesc(UUID medicineId);
    List<MedicineLog> findByFamilyMemberIdAndCreatedAtBetween(UUID familyMemberId, LocalDateTime start, LocalDateTime end);
    List<MedicineLog> findByFamilyMemberIdAndScheduledTimeBetween(UUID familyMemberId, LocalDateTime start, LocalDateTime end);
    List<MedicineLog> findByFamilyMemberIdAndStatusAndScheduledTimeBetween(UUID familyMemberId, String status, LocalDateTime start, LocalDateTime end);
    Optional<MedicineLog> findByMedicineIdAndDoseTimingAndScheduledTimeBetween(UUID medicineId, String doseTiming, LocalDateTime start, LocalDateTime end);
    List<MedicineLog> findByStatusAndCreatedAtBefore(String status, LocalDateTime before);
}
