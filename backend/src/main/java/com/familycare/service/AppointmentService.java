package com.familycare.service;

import com.familycare.dto.request.AppointmentRequest;
import com.familycare.dto.response.AppointmentResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.Appointment;
import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.repository.AppointmentRepository;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final AppointmentRepository appointmentRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final WhatsAppService whatsAppService;

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByMember(UUID memberId, String userEmail) {
        FamilyMember member = resolveMember(memberId, userEmail);
        return appointmentRepository.findByFamilyMemberIdOrderByAppointmentDateDesc(member.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getUpcomingByMember(UUID memberId, String userEmail) {
        FamilyMember member = resolveMember(memberId, userEmail);
        return appointmentRepository.findByFamilyMemberIdAndAppointmentDateAfterOrderByAppointmentDateAsc(
                        member.getId(), LocalDateTime.now())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AppointmentResponse addAppointment(AppointmentRequest request, String userEmail) {
        FamilyMember member = resolveMember(request.getFamilyMemberId(), userEmail);

        Appointment appointment = Appointment.builder()
                .familyMember(member)
                .doctorName(request.getDoctorName())
                .speciality(request.getSpeciality())
                .hospital(request.getHospital())
                .appointmentDate(LocalDateTime.parse(request.getAppointmentDate()))
                .notes(request.getNotes())
                .build();

        appointmentRepository.save(appointment);
        log.info("Appointment added: Dr. {} for {}", request.getDoctorName(), member.getName());

        sendCreationConfirmation(appointment);
        return toResponse(appointment);
    }

    /**
     * Fire a one-shot WhatsApp confirmation when an appointment is created. Covers the case
     * where the user adds an appointment too late for the staged reminders (week / 3d / 2d / 1d)
     * to fire — at minimum they get a "we got it, here's the summary" message immediately.
     * Failures are logged but never break the API call.
     */
    private void sendCreationConfirmation(Appointment appt) {
        try {
            FamilyMember member = appt.getFamilyMember();
            User familyHead = member.getUser();
            if (member == null || familyHead == null) return;
            if (appt.getAppointmentDate() == null) return;
            if (appt.getAppointmentDate().isBefore(LocalDateTime.now())) return; // past appt — skip

            String when = humanizeWhen(appt.getAppointmentDate());
            String dateStr = appt.getAppointmentDate().format(DATE_FMT);
            String doctorInfo = appt.getDoctorName();
            if (appt.getSpeciality() != null && !appt.getSpeciality().isBlank()) {
                doctorInfo += " (" + appt.getSpeciality() + ")";
            }
            String locationInfo = appt.getHospital() != null && !appt.getHospital().isBlank()
                    ? " at " + appt.getHospital() : "";

            String patientMsg = String.format(
                    "FamilyCare: Hi %s, your appointment is booked %s.\n\n" +
                    "Doctor: %s%s\nDate: %s\n\nWe'll send another reminder closer to the time.",
                    member.getName(), when, doctorInfo, locationInfo, dateStr);

            String headMsg = String.format(
                    "FamilyCare: %s's appointment is booked %s.\n\n" +
                    "Doctor: %s%s\nDate: %s\n\nWe'll send another reminder closer to the time.",
                    member.getName(), when, doctorInfo, locationInfo, dateStr);

            String patientPhone = member.whatsappPhoneOrFallback();
            if (patientPhone != null && !patientPhone.isBlank()) {
                whatsAppService.sendWhatsApp(patientPhone, patientMsg);
            }
            String headPhone = familyHead.whatsappPhoneOrFallback();
            if (headPhone != null && !headPhone.isBlank() && !headPhone.equals(patientPhone)) {
                whatsAppService.sendWhatsApp(headPhone, headMsg);
            }
        } catch (Exception e) {
            log.warn("Could not send appointment-created WhatsApp confirmation: {}", e.getMessage());
        }
    }

    private String humanizeWhen(LocalDateTime when) {
        Duration left = Duration.between(LocalDateTime.now(), when);
        long minutes = Math.max(0, left.toMinutes());
        if (minutes < 60) return "in " + minutes + " minute" + (minutes == 1 ? "" : "s");
        long hours = minutes / 60;
        if (hours < 24) return "in " + hours + " hour" + (hours == 1 ? "" : "s");
        long days = hours / 24;
        if (days == 1) return "tomorrow";
        if (days < 7) return "in " + days + " days";
        long weeks = days / 7;
        return weeks == 1 ? "in 1 week" : "in " + weeks + " weeks";
    }

    @Transactional
    public AppointmentResponse updateAppointment(UUID id, AppointmentRequest request, String userEmail) {
        User user = getUser(userEmail);
        Appointment appointment = appointmentRepository.findByIdAndFamilyMemberUserId(id, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Appointment not found"));

        appointment.setDoctorName(request.getDoctorName());
        appointment.setSpeciality(request.getSpeciality());
        appointment.setHospital(request.getHospital());
        appointment.setAppointmentDate(LocalDateTime.parse(request.getAppointmentDate()));
        appointment.setNotes(request.getNotes());

        appointmentRepository.save(appointment);
        return toResponse(appointment);
    }

    @Transactional
    public void deleteAppointment(UUID id, String userEmail) {
        User user = getUser(userEmail);
        Appointment appointment = appointmentRepository.findByIdAndFamilyMemberUserId(id, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Appointment not found"));
        appointmentRepository.delete(appointment);
        log.info("Appointment deleted: {}", id);
    }

    private FamilyMember resolveMember(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only access your own appointments");
            }
            return linked;
        }
        return familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }

    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .familyMemberId(a.getFamilyMember().getId())
                .familyMemberName(a.getFamilyMember().getName())
                .doctorName(a.getDoctorName())
                .speciality(a.getSpeciality())
                .hospital(a.getHospital())
                .appointmentDate(a.getAppointmentDate())
                .notes(a.getNotes())
                .reminderSent(a.getReminderSent())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
