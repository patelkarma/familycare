package com.familycare.repository;

import com.familycare.model.MedicalReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<MedicalReport, UUID> {

    List<MedicalReport> findByFamilyMemberIdOrderByReportDateDescCreatedAtDesc(UUID memberId);

    List<MedicalReport> findByFamilyMemberIdAndIsPinnedForEmergencyTrueOrderByReportDateDesc(UUID memberId);

    long countByFamilyMemberId(UUID memberId);

    @Query("""
            SELECT r FROM MedicalReport r
            WHERE r.familyMember.id = :memberId
              AND (:type IS NULL OR r.reportType = :type)
              AND (:from IS NULL OR r.reportDate >= :from)
              AND (:to IS NULL OR r.reportDate <= :to)
              AND (:pinned IS NULL OR r.isPinnedForEmergency = :pinned)
              AND (
                LOWER(r.title)                       LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(r.doctorName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(r.hospital, ''))   LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(r.tags, ''))       LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY r.reportDate DESC, r.createdAt DESC
            """)
    List<MedicalReport> search(
            @Param("memberId") UUID memberId,
            @Param("type") String type,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("pinned") Boolean pinned,
            @Param("q") String q);

    @Query("""
            SELECT r FROM MedicalReport r
            WHERE r.familyMember.user.id = :userId
            ORDER BY r.createdAt DESC
            """)
    List<MedicalReport> findRecentByUser(@Param("userId") UUID userId, Pageable pageable);
}
