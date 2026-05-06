package com.familycare.service.whatsapp.handlers;

import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.model.MedicineLog;
import com.familycare.model.User;
import com.familycare.repository.MedicineLogRepository;
import com.familycare.service.MedicineService;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Locks in the multi-mark behavior: when two medicines fire at the same dose
 * slot (e.g. both MORNING at 9 AM), one "ok" reply marks the whole slot — not
 * just the closest-time match. Caught in production: user got two reminders
 * at 9 AM, replied "ok" once, only one medicine flipped to TAKEN.
 */
class TakenIntentHandlerTest {

    private MedicineLogRepository logRepo;
    private MedicineService medicineService;
    private TakenIntentHandler handler;

    private FamilyMember member;
    private User headUser;

    @BeforeEach
    void setUp() {
        logRepo = mock(MedicineLogRepository.class);
        medicineService = mock(MedicineService.class);
        handler = new TakenIntentHandler(logRepo, medicineService);

        member = new FamilyMember();
        member.setId(UUID.randomUUID());
        member.setName("Mom");

        headUser = new User();
        headUser.setId(UUID.randomUUID());
        headUser.setEmail("[email protected]");
        headUser.setRole("FAMILY_HEAD");
    }

    @Test
    void marksAllMedicinesInSameSlotWhenTwoFiredTogether() {
        Medicine metformin = medicine("Metformin");
        Medicine aspirin = medicine("Aspirin");
        LocalDateTime nineAm = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0).withNano(0);

        MedicineLog metforminLog = log(metformin, "MORNING", "PENDING", nineAm);
        MedicineLog aspirinLog = log(aspirin, "MORNING", "PENDING", nineAm);

        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("PENDING"), any(), any()))
                .thenReturn(List.of(metforminLog, aspirinLog));
        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("MISSED"), any(), any()))
                .thenReturn(List.of());

        String reply = handler.handle(intent(IntentType.TAKEN), ctx());

        verify(medicineService).markTakenInternal(eq(metformin), eq("MORNING"), any(), eq(headUser), eq("WHATSAPP"));
        verify(medicineService).markTakenInternal(eq(aspirin), eq("MORNING"), any(), eq(headUser), eq("WHATSAPP"));
        assertThat(reply).contains("Metformin", "Aspirin", "morning");
    }

    @Test
    void doesNotMarkAfternoonDoseWhenUserConfirmsMorning() {
        Medicine metformin = medicine("Metformin");
        Medicine vitaminD = medicine("VitaminD");
        LocalDateTime nineAm = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime onePm = LocalDateTime.now().withHour(13).withMinute(0).withSecond(0).withNano(0);

        MedicineLog morningLog = log(metformin, "MORNING", "PENDING", nineAm);
        MedicineLog afternoonLog = log(vitaminD, "AFTERNOON", "PENDING", onePm);

        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("PENDING"), any(), any()))
                .thenReturn(List.of(morningLog, afternoonLog));
        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("MISSED"), any(), any()))
                .thenReturn(List.of());

        // We don't assert which slot wins (depends on wall-clock at test runtime);
        // we assert only the slot's logs get marked, never both slots.
        handler.handle(intent(IntentType.TAKEN), ctx());

        verify(medicineService, times(1)).markTakenInternal(any(), any(), any(), any(), any());
    }

    @Test
    void singleMedicineStillMarksWhenOnlyOnePending() {
        Medicine metformin = medicine("Metformin");
        LocalDateTime nineAm = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0).withNano(0);
        MedicineLog onlyLog = log(metformin, "MORNING", "PENDING", nineAm);

        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("PENDING"), any(), any()))
                .thenReturn(List.of(onlyLog));
        when(logRepo.findByFamilyMemberIdAndStatusAndScheduledTimeBetween(
                eq(member.getId()), eq("MISSED"), any(), any()))
                .thenReturn(List.of());

        String reply = handler.handle(intent(IntentType.TAKEN), ctx());

        verify(medicineService, times(1)).markTakenInternal(eq(metformin), eq("MORNING"), any(), eq(headUser), eq("WHATSAPP"));
        assertThat(reply).contains("Metformin", "morning");
    }

    private Medicine medicine(String name) {
        Medicine m = new Medicine();
        m.setId(UUID.randomUUID());
        m.setName(name);
        m.setFamilyMember(member);
        return m;
    }

    private MedicineLog log(Medicine m, String slot, String status, LocalDateTime scheduled) {
        return MedicineLog.builder()
                .id(UUID.randomUUID())
                .medicine(m)
                .familyMember(member)
                .doseTiming(slot)
                .status(status)
                .scheduledTime(scheduled)
                .build();
    }

    private Intent intent(IntentType type) {
        return Intent.builder().type(type).build();
    }

    private SenderContext ctx() {
        return SenderContext.builder()
                .member(member)
                .headUser(headUser)
                .ambiguous(false)
                .build();
    }
}
