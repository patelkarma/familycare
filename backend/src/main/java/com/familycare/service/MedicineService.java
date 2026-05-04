package com.familycare.service;

import com.familycare.dto.request.MedicineRequest;
import com.familycare.dto.response.MedicineLogResponse;
import com.familycare.dto.response.MedicineResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.*;
import com.familycare.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final MedicineLogRepository medicineLogRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final ReminderService reminderService;
    private final WhatsAppService whatsAppService;
    private final ReminderLogRepository reminderLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<MedicineResponse> getMedicinesByMember(UUID memberId, String userEmail) {
        User user = getUser(userEmail);

        if ("MEMBER".equals(user.getRole())) {
            // Patient can only view their own medicines
            FamilyMember linkedMember = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));
            if (!linkedMember.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only view your own medicines");
            }
        } else {
            // Caregiver: verify member belongs to user
            familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
        }

        return medicineRepository.findByFamilyMemberIdAndIsActiveTrue(memberId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MedicineResponse addMedicine(MedicineRequest request, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = familyMemberRepository.findByIdAndUserId(request.getFamilyMemberId(), user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));

        Medicine medicine = Medicine.builder()
                .familyMember(member)
                .name(request.getName())
                .genericName(request.getGenericName())
                .dosage(request.getDosage())
                .form(request.getForm())
                .frequency(request.getFrequency())
                .timing(serializeTiming(request.getTiming()))
                .withFood(request.getWithFood() != null ? request.getWithFood() : false)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .stockCount(request.getStockCount() != null ? request.getStockCount() : 0)
                .notes(request.getNotes())
                .isActive(true)
                .build();

        medicineRepository.save(medicine);

        // Schedule reminders in Redis
        scheduleReminders(medicine, request.getTiming());

        log.info("Medicine added: {} for member {}", medicine.getName(), member.getName());
        return toResponse(medicine);
    }

    @Transactional
    public MedicineResponse updateMedicine(UUID id, MedicineRequest request, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = medicineRepository.findByIdAndFamilyMemberUserId(id, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));

        // Remove old reminders
        reminderService.removeAllReminders(medicine.getId(), medicine.getFamilyMember().getId());

        medicine.setName(request.getName());
        medicine.setGenericName(request.getGenericName());
        medicine.setDosage(request.getDosage());
        medicine.setForm(request.getForm());
        medicine.setFrequency(request.getFrequency());
        medicine.setTiming(serializeTiming(request.getTiming()));
        medicine.setWithFood(request.getWithFood() != null ? request.getWithFood() : false);
        medicine.setStartDate(request.getStartDate());
        medicine.setEndDate(request.getEndDate());
        if (request.getStockCount() != null) {
            medicine.setStockCount(request.getStockCount());
        }
        medicine.setNotes(request.getNotes());

        medicineRepository.save(medicine);

        // Reschedule reminders
        scheduleReminders(medicine, request.getTiming());

        return toResponse(medicine);
    }

    @Transactional
    public void deleteMedicine(UUID id, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = medicineRepository.findByIdAndFamilyMemberUserId(id, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));

        // Soft delete
        medicine.setIsActive(false);
        medicineRepository.save(medicine);

        // Remove reminders from Redis
        reminderService.removeAllReminders(medicine.getId(), medicine.getFamilyMember().getId());

        log.info("Medicine deactivated: {}", medicine.getName());
    }

    @Transactional
    public MedicineLogResponse markTaken(UUID medicineId, String doseTiming, String notes, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = resolveMedicine(medicineId, user);

        // Block the family head from racing a pending elder reply only when the
        // elder has their OWN account and could plausibly respond — i.e. the
        // member has a linkedUser distinct from the head. For Self members
        // (linkedUser == head) and unlinked members (no separate patient
        // account), the head is the only person who can mark, so we don't gate.
        if (existsPendingForLinkedElder(medicineId, doseTiming, medicine, user)) {
            throw new CustomExceptions.ConflictException(
                    "Reminder already sent for this dose at " +
                            doseTiming.toLowerCase() + " time. Waiting for " +
                            medicine.getFamilyMember().getName() + " to confirm.");
        }

        return markTakenInternal(medicine, doseTiming, notes, user, "APP");
    }

    private boolean existsPendingForLinkedElder(
            UUID medicineId, String doseTiming, Medicine medicine, User actor) {
        if (!"FAMILY_HEAD".equals(actor.getRole())) return false;
        Optional<MedicineLog> existing = findExistingLog(medicineId, doseTiming);
        if (existing.isEmpty() || !"PENDING".equals(existing.get().getStatus())) return false;
        User linked = medicine.getFamilyMember().getLinkedUser();
        return linked != null && !actor.getId().equals(linked.getId());
    }

    /**
     * Mark a dose taken without user-level auth checks. Caller guarantees authorization
     * (e.g. WhatsApp inbound webhook resolving sender phone → FamilyMember).
     */
    @Transactional
    public MedicineLogResponse markTakenInternal(
            Medicine medicine, String doseTiming, String notes, User markedBy, String channel) {
        Optional<MedicineLog> existingLog = findExistingLog(medicine.getId(), doseTiming);

        MedicineLog logEntry;
        if (existingLog.isPresent()) {
            MedicineLog existing = existingLog.get();
            switch (existing.getStatus()) {
                // MISSED is non-terminal: the user actually took the medicine, they just
                // forgot to confirm before the 30-min watchdog flipped the status.
                // Treating it like PENDING here makes "I took it, just replying late"
                // (via WhatsApp or the app) actually update the dose instead of being
                // rejected with "already marked as missed".
                case "PENDING", "MISSED" -> {
                    existing.setStatus("TAKEN");
                    existing.setTakenAt(LocalDateTime.now());
                    existing.setMarkedBy(markedBy);
                    existing.setNotes(notes);
                    existing.setChannel(channel);
                    logEntry = medicineLogRepository.save(existing);
                }
                case "TAKEN" -> throw new CustomExceptions.ConflictException(
                        "This dose has already been marked as taken");
                default -> throw new CustomExceptions.ConflictException(
                        "This dose was already marked as " + existing.getStatus().toLowerCase() + " for today");
            }
        } else {
            logEntry = MedicineLog.builder()
                    .medicine(medicine)
                    .familyMember(medicine.getFamilyMember())
                    .scheduledTime(LocalDateTime.now())
                    .takenAt(LocalDateTime.now())
                    .status("TAKEN")
                    .doseTiming(doseTiming)
                    .notes(notes)
                    .channel(channel)
                    .markedBy(markedBy)
                    .build();
            medicineLogRepository.save(logEntry);
        }

        // Decrement stock
        if (medicine.getStockCount() != null && medicine.getStockCount() > 0) {
            medicine.setStockCount(medicine.getStockCount() - 1);
            medicineRepository.save(medicine);

            // Check low stock — notify the family head via WhatsApp
            if (medicine.getStockCount() <= medicine.getLowStockAlert()) {
                User familyHead = medicine.getFamilyMember().getUser();
                String phone = familyHead.whatsappPhoneOrFallback();
                if (phone != null && !phone.isBlank()) {
                    String msg = "FamilyCare Alert: " + medicine.getName() + " for " +
                            medicine.getFamilyMember().getName() + " has only " +
                            medicine.getStockCount() + " doses left. Find pharmacy: " +
                            "https://maps.google.com/?q=pharmacy+near+me";
                    whatsAppService.sendWhatsApp(phone, msg);
                }
            }
        }

        return toLogResponse(logEntry);
    }

    @Transactional
    public MedicineLogResponse markSkipped(UUID medicineId, String doseTiming, String notes, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = resolveMedicine(medicineId, user);

        // Same race-protection logic as markTaken — only block for linked elders.
        if (existsPendingForLinkedElder(medicineId, doseTiming, medicine, user)) {
            throw new CustomExceptions.ConflictException(
                    "Reminder already sent for this dose at " +
                            doseTiming.toLowerCase() + " time. Waiting for " +
                            medicine.getFamilyMember().getName() + " to confirm.");
        }

        return markSkippedInternal(medicine, doseTiming, notes, user, "APP");
    }

    @Transactional
    public MedicineLogResponse markSkippedInternal(
            Medicine medicine, String doseTiming, String notes, User markedBy, String channel) {
        Optional<MedicineLog> existingLog = findExistingLog(medicine.getId(), doseTiming);

        MedicineLog logEntry;
        if (existingLog.isPresent()) {
            MedicineLog existing = existingLog.get();
            switch (existing.getStatus()) {
                // Same MISSED-as-non-terminal rationale as markTakenInternal.
                case "PENDING", "MISSED" -> {
                    existing.setStatus("SKIPPED");
                    existing.setMarkedBy(markedBy);
                    existing.setNotes(notes);
                    existing.setChannel(channel);
                    logEntry = medicineLogRepository.save(existing);
                }
                case "TAKEN" -> throw new CustomExceptions.ConflictException(
                        "This dose has already been marked as taken");
                case "SKIPPED" -> throw new CustomExceptions.ConflictException(
                        "This dose has already been skipped");
                default -> throw new CustomExceptions.ConflictException(
                        "This dose was already marked as " + existing.getStatus().toLowerCase() + " for today");
            }
        } else {
            logEntry = MedicineLog.builder()
                    .medicine(medicine)
                    .familyMember(medicine.getFamilyMember())
                    .scheduledTime(LocalDateTime.now())
                    .status("SKIPPED")
                    .doseTiming(doseTiming)
                    .notes(notes)
                    .channel(channel)
                    .markedBy(markedBy)
                    .build();
            medicineLogRepository.save(logEntry);
        }

        return toLogResponse(logEntry);
    }

    @Transactional(readOnly = true)
    public List<MedicineLogResponse> getLogs(UUID medicineId, String userEmail) {
        User user = getUser(userEmail);
        resolveMedicine(medicineId, user);

        return medicineLogRepository.findByMedicineIdOrderByCreatedAtDesc(medicineId).stream()
                .map(this::toLogResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MedicineResponse updateStock(UUID id, int newCount, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = medicineRepository.findByIdAndFamilyMemberUserId(id, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));

        medicine.setStockCount(newCount);
        medicineRepository.save(medicine);
        return toResponse(medicine);
    }

    @Transactional
    public String resendReminder(UUID medicineId, String doseTiming, String userEmail) {
        User user = getUser(userEmail);
        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can resend reminders");
        }

        Medicine medicine = medicineRepository.findByIdAndFamilyMemberUserId(medicineId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));

        FamilyMember member = medicine.getFamilyMember();
        String phone = member.whatsappPhoneOrFallback();
        if (phone == null || phone.isBlank()) {
            throw new CustomExceptions.BadRequestException("No phone number set for " + member.getName());
        }

        String message = String.format(
                "FamilyCare Reminder: Hi %s, please take %s (%s) - %s dose. Stay healthy!",
                member.getName(), medicine.getName(), medicine.getDosage(), doseTiming.toLowerCase()
        );

        boolean sent = whatsAppService.sendWhatsApp(phone, message);

        ReminderLog reminderLog = ReminderLog.builder()
                .medicine(medicine)
                .familyMember(member)
                .channel("WHATSAPP")
                .status(sent ? "SENT" : "FAILED")
                .sentAt(LocalDateTime.now())
                .message(message)
                .build();
        reminderLogRepository.save(reminderLog);

        if (!sent) {
            throw new CustomExceptions.BadRequestException("Failed to send WhatsApp reminder. Please try again.");
        }

        return "Reminder resent to " + member.getName() + " via WhatsApp";
    }

    // --- Private helpers ---

    private Medicine resolveMedicine(UUID medicineId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linkedMember = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));
            return medicineRepository.findByIdAndFamilyMemberId(medicineId, linkedMember.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));
        }
        return medicineRepository.findByIdAndFamilyMemberUserId(medicineId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Medicine not found"));
    }

    private Optional<MedicineLog> findExistingLog(UUID medicineId, String doseTiming) {
        LocalDateTime dayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);
        return medicineLogRepository.findByMedicineIdAndDoseTimingAndScheduledTimeBetween(
                medicineId, doseTiming, dayStart, dayEnd);
    }

    private void scheduleReminders(Medicine medicine, Map<String, String> timing) {
        if (timing == null) return;
        timing.forEach((key, time) -> {
            if (time != null && !time.isBlank()) {
                reminderService.scheduleReminder(medicine, key, time);
            }
        });
    }

    private String serializeTiming(Map<String, String> timing) {
        if (timing == null) return null;
        try {
            return objectMapper.writeValueAsString(timing);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private Map<String, String> deserializeTiming(String timing) {
        if (timing == null || timing.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(timing, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }

    private MedicineResponse toResponse(Medicine medicine) {
        return MedicineResponse.builder()
                .id(medicine.getId())
                .familyMemberId(medicine.getFamilyMember().getId())
                .familyMemberName(medicine.getFamilyMember().getName())
                .name(medicine.getName())
                .genericName(medicine.getGenericName())
                .dosage(medicine.getDosage())
                .form(medicine.getForm())
                .frequency(medicine.getFrequency())
                .timing(deserializeTiming(medicine.getTiming()))
                .withFood(medicine.getWithFood())
                .startDate(medicine.getStartDate())
                .endDate(medicine.getEndDate())
                .stockCount(medicine.getStockCount())
                .lowStockAlert(medicine.getLowStockAlert())
                .notes(medicine.getNotes())
                .prescriptionUrl(medicine.getPrescriptionUrl())
                .isActive(medicine.getIsActive())
                .createdAt(medicine.getCreatedAt())
                .build();
    }

    private MedicineLogResponse toLogResponse(MedicineLog log) {
        return MedicineLogResponse.builder()
                .id(log.getId())
                .medicineId(log.getMedicine().getId())
                .medicineName(log.getMedicine().getName())
                .status(log.getStatus())
                .doseTiming(log.getDoseTiming())
                .scheduledTime(log.getScheduledTime())
                .takenAt(log.getTakenAt())
                .notes(log.getNotes())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
