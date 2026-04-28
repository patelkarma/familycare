package com.familycare.repository;

import com.familycare.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByFamilyMemberIdOrderByAppointmentDateDesc(UUID memberId);

    List<Appointment> findByFamilyMemberIdAndAppointmentDateAfterOrderByAppointmentDateAsc(UUID memberId, LocalDateTime after);

    Optional<Appointment> findByIdAndFamilyMemberUserId(UUID id, UUID userId);

    // 7-day reminders: appointment date falls within window, not yet sent
    @Query("SELECT a FROM Appointment a WHERE a.reminderWeekSent = false AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findDueWeekReminders(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Appointment a WHERE a.reminder3DaySent = false AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findDue3DayReminders(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Appointment a WHERE a.reminder2DaySent = false AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findDue2DayReminders(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Appointment a WHERE a.reminder1DaySent = false AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findDue1DayReminders(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Appointment a WHERE a.reminderDayOfSent = false AND a.appointmentDate BETWEEN :start AND :end")
    List<Appointment> findDueDayOfReminders(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
