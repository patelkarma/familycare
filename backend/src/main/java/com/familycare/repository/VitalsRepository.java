package com.familycare.repository;

import com.familycare.model.Vitals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface VitalsRepository extends JpaRepository<Vitals, UUID> {

    List<Vitals> findByFamilyMemberIdAndTypeAndRecordedAtAfterOrderByRecordedAtDesc(
            UUID memberId, String type, LocalDateTime after);

    List<Vitals> findByFamilyMemberIdAndRecordedAtAfterOrderByRecordedAtDesc(
            UUID memberId, LocalDateTime after);

    List<Vitals> findTop3ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(UUID memberId, String type);

    List<Vitals> findTop2ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(UUID memberId, String type);

    List<Vitals> findTop1ByFamilyMemberIdAndTypeOrderByRecordedAtDesc(UUID memberId, String type);

    List<Vitals> findByFamilyMemberIdOrderByRecordedAtDesc(UUID memberId);
}
