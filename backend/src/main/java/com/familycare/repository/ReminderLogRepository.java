package com.familycare.repository;

import com.familycare.model.ReminderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReminderLogRepository extends JpaRepository<ReminderLog, UUID> {
    List<ReminderLog> findByMedicineIdOrderBySentAtDesc(UUID medicineId);

    @Query("SELECT MAX(rl.sentAt) FROM ReminderLog rl " +
           "WHERE rl.familyMember.user.id = :userId AND rl.status = 'SENT'")
    Optional<LocalDateTime> findLatestSentForUser(@Param("userId") UUID userId);
}
