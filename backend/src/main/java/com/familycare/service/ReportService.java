package com.familycare.service;

import com.familycare.dto.request.ReportCreateRequest;
import com.familycare.dto.request.ReportUpdateRequest;
import com.familycare.dto.response.ReportResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.Appointment;
import com.familycare.model.FamilyMember;
import com.familycare.model.MedicalReport;
import com.familycare.model.User;
import com.familycare.repository.AppointmentRepository;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.ReportRepository;
import com.familycare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    private static final long SHARE_URL_EXPIRY_SECONDS = 7L * 24 * 60 * 60; // 7 days

    @Transactional
    public ReportResponse createReport(ReportCreateRequest request, MultipartFile file, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "upload reports");
        FamilyMember member = resolveMember(request.getFamilyMemberId(), user);

        // Optional appointment link: must belong to same member
        Appointment appointment = null;
        if (request.getLinkedAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getLinkedAppointmentId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Appointment not found"));
            if (!appointment.getFamilyMember().getId().equals(member.getId())) {
                throw new CustomExceptions.BadRequestException("Appointment does not belong to this member");
            }
        }

        String folder = "familycare/reports/" + member.getId();
        CloudinaryService.UploadResult uploaded = cloudinaryService.upload(file, folder);

        String fileType = detectFileType(file.getOriginalFilename(), file.getContentType(), uploaded.format);

        MedicalReport report = MedicalReport.builder()
                .familyMember(member)
                .uploadedBy(user)
                .title(request.getTitle())
                .reportType(request.getReportType().toUpperCase())
                .fileUrl(uploaded.secureUrl)
                .cloudinaryPublicId(uploaded.publicId)
                .cloudinaryResourceType(uploaded.resourceType)
                .thumbnailUrl(uploaded.thumbnailUrl)
                .fileType(fileType)
                .fileSizeBytes(uploaded.bytes)
                .doctorName(request.getDoctorName())
                .hospital(request.getHospital())
                .specialty(request.getSpecialty())
                .reportDate(request.getReportDate() != null ? request.getReportDate() : LocalDate.now())
                .notes(request.getNotes())
                .tags(request.getTags())
                .isPinnedForEmergency(false)
                .linkedAppointment(appointment)
                .build();

        reportRepository.save(report);
        log.info("Report uploaded: {} for member {}", report.getTitle(), member.getName());

        return toResponse(report);
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> listReports(UUID memberId, String type, LocalDate from, LocalDate to,
                                            Boolean pinned, String q, String userEmail) {
        User user = getUser(userEmail);
        resolveMember(memberId, user);

        String normalizedType = (type != null && !type.isBlank()) ? type.toUpperCase() : null;
        // Pass empty string (not null) so Postgres binds :q as text, not bytea.
        // The JPQL handles empty string the same as "no filter" via LIKE '%%' matching everything.
        String normalizedQ = (q != null && !q.isBlank()) ? q.trim() : "";

        List<MedicalReport> reports = reportRepository.search(
                memberId, normalizedType, from, to, pinned, normalizedQ);
        return reports.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReportResponse getReport(UUID reportId, String userEmail) {
        User user = getUser(userEmail);
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);
        return toResponse(report);
    }

    @Transactional
    public ReportResponse updateReport(UUID reportId, ReportUpdateRequest request, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "update reports");
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);

        report.setTitle(request.getTitle());
        report.setReportType(request.getReportType().toUpperCase());
        report.setDoctorName(request.getDoctorName());
        report.setHospital(request.getHospital());
        report.setSpecialty(request.getSpecialty());
        if (request.getReportDate() != null) report.setReportDate(request.getReportDate());
        report.setNotes(request.getNotes());
        report.setTags(request.getTags());

        if (request.getLinkedAppointmentId() != null) {
            Appointment appointment = appointmentRepository.findById(request.getLinkedAppointmentId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Appointment not found"));
            if (!appointment.getFamilyMember().getId().equals(report.getFamilyMember().getId())) {
                throw new CustomExceptions.BadRequestException("Appointment does not belong to this member");
            }
            report.setLinkedAppointment(appointment);
        } else {
            report.setLinkedAppointment(null);
        }

        reportRepository.save(report);
        return toResponse(report);
    }

    @Transactional
    public void deleteReport(UUID reportId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "delete reports");
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);

        String publicId = report.getCloudinaryPublicId();
        String resourceType = report.getCloudinaryResourceType();

        reportRepository.delete(report);
        log.info("Report DB row deleted: {}", reportId);

        // Best-effort cloudinary cleanup after DB commit
        cloudinaryService.delete(publicId, resourceType);
    }

    @Transactional
    public ReportResponse togglePin(UUID reportId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "pin reports");
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);

        report.setIsPinnedForEmergency(!Boolean.TRUE.equals(report.getIsPinnedForEmergency()));
        reportRepository.save(report);
        return toResponse(report);
    }

    @Transactional
    public ReportResponse attachAppointment(UUID reportId, UUID appointmentId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "attach appointments");
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Appointment not found"));
        if (!appointment.getFamilyMember().getId().equals(report.getFamilyMember().getId())) {
            throw new CustomExceptions.BadRequestException("Appointment does not belong to this member");
        }

        report.setLinkedAppointment(appointment);
        reportRepository.save(report);
        return toResponse(report);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generateShareUrl(UUID reportId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user, "share reports");
        MedicalReport report = findReportOrThrow(reportId);
        resolveMember(report.getFamilyMember().getId(), user);

        // Cloudinary's default delivery URL is already publicly addressable once uploaded.
        // For the Smart Locker v1 we return the secure_url with a readable expiry metadata
        // so the frontend can show "valid for 7 days". True signed expiry requires
        // private-type uploads which we are not doing yet — documented trade-off.
        long expiresAtEpoch = (System.currentTimeMillis() / 1000L) + SHARE_URL_EXPIRY_SECONDS;

        Map<String, Object> result = new HashMap<>();
        result.put("url", report.getFileUrl());
        result.put("expiresAt", expiresAtEpoch);
        result.put("title", report.getTitle());
        result.put("memberName", report.getFamilyMember().getName());
        return result;
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> getRecentReportsForUser(String userEmail, int limit) {
        User user = getUser(userEmail);
        return reportRepository.findRecentByUser(user.getId(), PageRequest.of(0, Math.max(1, limit)))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ---------- helpers ----------

    private MedicalReport findReportOrThrow(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Report not found"));
    }

    private FamilyMember resolveMember(UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("No family member linked to this account"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only access your own reports");
            }
            return linked;
        }
        return familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
    }

    private void requireFamilyHead(User user, String action) {
        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only caregivers can " + action);
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }

    private String detectFileType(String originalFilename, String contentType, String cloudinaryFormat) {
        // Prefer the original filename's extension — it's the most reliable
        // signal and lets us label any file type the user uploads (TXT, DOCX,
        // XLSX, ...) rather than collapsing everything unknown into OTHER.
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot > 0 && dot < originalFilename.length() - 1) {
                String ext = originalFilename.substring(dot + 1).toLowerCase();
                if (ext.equals("jpeg")) return "JPG";
                if (!ext.isBlank() && ext.length() <= 6) return ext.toUpperCase();
            }
        }
        if (cloudinaryFormat != null && !cloudinaryFormat.isBlank()) {
            String fmt = cloudinaryFormat.toLowerCase();
            if (fmt.equals("jpeg")) return "JPG";
            return fmt.toUpperCase();
        }
        if (contentType != null) {
            String ct = contentType.toLowerCase();
            if (ct.contains("pdf")) return "PDF";
            if (ct.contains("png")) return "PNG";
            if (ct.contains("jpeg") || ct.contains("jpg")) return "JPG";
            if (ct.contains("gif")) return "GIF";
            if (ct.contains("webp")) return "WEBP";
            if (ct.contains("plain")) return "TXT";
            if (ct.contains("csv")) return "CSV";
        }
        return "OTHER";
    }

    private ReportResponse toResponse(MedicalReport r) {
        Appointment apt = r.getLinkedAppointment();
        String aptLabel = null;
        UUID aptId = null;
        if (apt != null) {
            aptId = apt.getId();
            String doctor = apt.getDoctorName() != null ? apt.getDoctorName() : "Appointment";
            String date = apt.getAppointmentDate() != null
                    ? apt.getAppointmentDate().format(DateTimeFormatter.ofPattern("d MMM yyyy"))
                    : "";
            aptLabel = (doctor + " — " + date).trim();
        }

        return ReportResponse.builder()
                .id(r.getId())
                .familyMemberId(r.getFamilyMember().getId())
                .familyMemberName(r.getFamilyMember().getName())
                .title(r.getTitle())
                .reportType(r.getReportType())
                .fileUrl(r.getFileUrl())
                .thumbnailUrl(r.getThumbnailUrl())
                .fileType(r.getFileType())
                .fileSizeBytes(r.getFileSizeBytes())
                .doctorName(r.getDoctorName())
                .hospital(r.getHospital())
                .specialty(r.getSpecialty())
                .reportDate(r.getReportDate())
                .notes(r.getNotes())
                .tags(r.getTags())
                .isPinnedForEmergency(Boolean.TRUE.equals(r.getIsPinnedForEmergency()))
                .linkedAppointmentId(aptId)
                .linkedAppointmentLabel(aptLabel)
                .uploadedByName(r.getUploadedBy() != null ? r.getUploadedBy().getName() : null)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
