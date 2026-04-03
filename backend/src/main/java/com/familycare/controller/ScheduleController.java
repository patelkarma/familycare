package com.familycare.controller;

import com.familycare.dto.response.AdherenceSummaryDTO;
import com.familycare.dto.response.ApiResponse;
import com.familycare.dto.response.DailyScheduleResponse;
import com.familycare.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping("/my-daily")
    public ResponseEntity<ApiResponse<DailyScheduleResponse>> getMyDailySchedule(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        DailyScheduleResponse schedule = scheduleService.getMyDailySchedule(targetDate, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(schedule));
    }

    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<DailyScheduleResponse>> getMemberDailySchedule(
            @RequestParam UUID memberId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        DailyScheduleResponse schedule = scheduleService.getMemberDailySchedule(memberId, targetDate, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(schedule));
    }

    @GetMapping("/family-overview")
    public ResponseEntity<ApiResponse<List<DailyScheduleResponse>>> getFamilyOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<DailyScheduleResponse> overview = scheduleService.getFamilyOverview(targetDate, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(overview));
    }

    @GetMapping("/adherence-summary")
    public ResponseEntity<ApiResponse<List<AdherenceSummaryDTO>>> getAdherenceSummary(
            @RequestParam int month,
            @RequestParam int year,
            Authentication auth) {
        List<AdherenceSummaryDTO> summary = scheduleService.getAdherenceSummary(month, year, auth.getName());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
