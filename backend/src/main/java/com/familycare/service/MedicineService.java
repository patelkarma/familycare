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
    private final SmsService smsService;
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

        // Prevent duplicate logs for same dose timing on same day
        checkDuplicateLog(medicineId, doseTiming);

        MedicineLog logEntry = MedicineLog.builder()
                .medicine(medicine)
                .familyMember(medicine.getFamilyMember())
                .scheduledTime(LocalDateTime.now())
                .takenAt(LocalDateTime.now())
                .status("TAKEN")
                .doseTiming(doseTiming)
                .notes(notes)
                .markedBy(user)
                .build();

        medicineLogRepository.save(logEntry);

        // Decrement stock
        if (medicine.getStockCount() != null && medicine.getStockCount() > 0) {
            medicine.setStockCount(medicine.getStockCount() - 1);
            medicineRepository.save(medicine);

            // Check low stock — notify the family head
            if (medicine.getStockCount() <= medicine.getLowStockAlert()) {
                User familyHead = medicine.getFamilyMember().getUser();
                String phone = familyHead.getPhone();
                if (phone != null && !phone.isBlank()) {
                    String msg = "FamilyCare Alert: " + medicine.getName() + " for " +
                            medicine.getFamilyMember().getName() + " has only " +
                            medicine.getStockCount() + " doses left. Please refill soon.";
                    smsService.sendSms(phone, msg);
                }
            }
        }

        return toLogResponse(logEntry);
    }

    @Transactional
    public MedicineLogResponse markSkipped(UUID medicineId, String doseTiming, String notes, String userEmail) {
        User user = getUser(userEmail);
        Medicine medicine = resolveMedicine(medicineId, user);

        // Prevent duplicate logs for same dose timing on same day
        checkDuplicateLog(medicineId, doseTiming);

        MedicineLog logEntry = MedicineLog.builder()
                .medicine(medicine)
                .familyMember(medicine.getFamilyMember())
                .scheduledTime(LocalDateTime.now())
                .status("SKIPPED")
                .doseTiming(doseTiming)
                .notes(notes)
                .markedBy(user)
                .build();

        medicineLogRepository.save(logEntry);
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

    private void checkDuplicateLog(UUID medicineId, String doseTiming) {
        LocalDateTime dayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);
        medicineLogRepository.findByMedicineIdAndDoseTimingAndScheduledTimeBetween(
                medicineId, doseTiming, dayStart, dayEnd
        ).ifPresent(existing -> {
            throw new CustomExceptions.ConflictException("This dose has already been recorded for today");
        });
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
