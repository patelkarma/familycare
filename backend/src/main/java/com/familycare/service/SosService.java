package com.familycare.service;

import com.familycare.dto.request.EmergencyContactRequest;
import com.familycare.dto.request.SosTriggerRequest;
import com.familycare.dto.response.EmergencyContactResponse;
import com.familycare.dto.response.SosEventResponse;
import com.familycare.dto.response.SosTriggerResponse;
import com.familycare.exception.CustomExceptions;
import com.familycare.model.*;
import com.familycare.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
@Slf4j
public class SosService {

    private final EmergencyContactRepository contactRepository;
    private final SosEventRepository eventRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final ReportRepository reportRepository;
    private final WhatsAppService whatsAppService;
    private final SosMessageBuilder messageBuilder;
    private final ObjectMapper objectMapper;
    private final ExecutorService sosFanOutExecutor;
    private final Counter sosTriggered;
    private final Counter sosBlockedByCooldown;

    private static final long COOLDOWN_SECONDS = 60;
    private static final long FAN_OUT_TIMEOUT_SECONDS = 12;

    public SosService(EmergencyContactRepository contactRepository,
                      SosEventRepository eventRepository,
                      FamilyMemberRepository familyMemberRepository,
                      UserRepository userRepository,
                      MedicineRepository medicineRepository,
                      ReportRepository reportRepository,
                      WhatsAppService whatsAppService,
                      SosMessageBuilder messageBuilder,
                      ObjectMapper objectMapper,
                      ExecutorService sosFanOutExecutor,
                      MeterRegistry registry) {
        this.contactRepository = contactRepository;
        this.eventRepository = eventRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.userRepository = userRepository;
        this.medicineRepository = medicineRepository;
        this.reportRepository = reportRepository;
        this.whatsAppService = whatsAppService;
        this.messageBuilder = messageBuilder;
        this.objectMapper = objectMapper;
        this.sosFanOutExecutor = sosFanOutExecutor;
        this.sosTriggered = Counter.builder("familycare.sos.triggered")
                .description("SOS events that fanned out alerts to emergency contacts")
                .register(registry);
        this.sosBlockedByCooldown = Counter.builder("familycare.sos.blocked_cooldown")
                .description("SOS attempts rejected because the 60s cooldown was active")
                .register(registry);
    }

    // ─────────────────────────────────────────────────────────────────
    // Emergency Contacts CRUD
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmergencyContactResponse> listContacts(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = resolveMember(memberId, user);
        return contactRepository
                .findByFamilyMemberIdOrderByIsPrimaryDescDisplayOrderAscCreatedAtAsc(member.getId())
                .stream()
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional
    public EmergencyContactResponse createContact(EmergencyContactRequest req, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);
        FamilyMember member = resolveMember(req.getFamilyMemberId(), user);

        long existing = contactRepository.countByFamilyMemberId(member.getId());
        if (existing >= 10) {
            throw new CustomExceptions.BadRequestException("Maximum 10 emergency contacts per member");
        }

        EmergencyContact contact = EmergencyContact.builder()
                .familyMember(member)
                .name(req.getName().trim())
                .relationship(req.getRelationship().trim())
                .phone(req.getPhone().trim())
                .isPrimary(req.isPrimary())
                .displayOrder((int) existing)
                .build();

        EmergencyContact saved = contactRepository.save(contact);

        // If this contact was set primary, demote others
        if (saved.isPrimary()) {
            contactRepository.demoteOtherPrimaries(member.getId(), saved.getId());
        }

        return toContactResponse(saved);
    }

    @Transactional
    public EmergencyContactResponse updateContact(UUID id, EmergencyContactRequest req, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);

        EmergencyContact contact = contactRepository.findById(id)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Emergency contact not found"));
        resolveMember(contact.getFamilyMember().getId(), user); // ownership check

        contact.setName(req.getName().trim());
        contact.setRelationship(req.getRelationship().trim());
        contact.setPhone(req.getPhone().trim());

        boolean wasPrimary = contact.isPrimary();
        contact.setPrimary(req.isPrimary());
        EmergencyContact saved = contactRepository.save(contact);

        if (saved.isPrimary() && !wasPrimary) {
            contactRepository.demoteOtherPrimaries(saved.getFamilyMember().getId(), saved.getId());
        }
        return toContactResponse(saved);
    }

    @Transactional
    public void deleteContact(UUID id, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);
        EmergencyContact contact = contactRepository.findById(id)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Emergency contact not found"));
        resolveMember(contact.getFamilyMember().getId(), user);
        contactRepository.delete(contact);
    }

    @Transactional
    public EmergencyContactResponse setPrimary(UUID id, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);
        EmergencyContact contact = contactRepository.findById(id)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Emergency contact not found"));
        resolveMember(contact.getFamilyMember().getId(), user);

        contact.setPrimary(true);
        EmergencyContact saved = contactRepository.save(contact);
        contactRepository.demoteOtherPrimaries(saved.getFamilyMember().getId(), saved.getId());
        return toContactResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────────
    // Trigger pipeline
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public SosTriggerResponse trigger(SosTriggerRequest req, String userEmail) {
        User user = getUser(userEmail);
        FamilyMember member = resolveMember(req.getMemberId(), user);
        return doTrigger(member, user, req.getLatitude(), req.getLongitude(), req.getAccuracyMeters());
    }

    /**
     * Triggers SOS without user-level auth checks. Caller guarantees authorization
     * (e.g. WhatsApp inbound webhook resolving sender phone → FamilyMember).
     * Returns the number of contacts notified.
     */
    @Transactional
    public int triggerInternal(FamilyMember member, User triggeredBy) {
        SosTriggerResponse resp = doTrigger(member, triggeredBy, null, null, null);
        return resp.getContactsNotified();
    }

    private SosTriggerResponse doTrigger(FamilyMember member, User user,
                                          Double latitude, Double longitude, Double accuracy) {
        // 1. Cooldown check
        eventRepository.findFirstByFamilyMemberIdOrderByTriggeredAtDesc(member.getId())
                .ifPresent(last -> {
                    long secondsAgo = ChronoUnit.SECONDS.between(last.getTriggeredAt(), LocalDateTime.now());
                    if (secondsAgo < COOLDOWN_SECONDS) {
                        sosBlockedByCooldown.increment();
                        throw new CustomExceptions.BadRequestException(
                                "SOS recently triggered " + secondsAgo + "s ago. Please wait "
                                        + (COOLDOWN_SECONDS - secondsAgo) + "s before trying again.");
                    }
                });

        // 2. Load contacts
        List<EmergencyContact> contacts = contactRepository
                .findByFamilyMemberIdOrderByIsPrimaryDescDisplayOrderAscCreatedAtAsc(member.getId());
        if (contacts.isEmpty()) {
            throw new CustomExceptions.BadRequestException(
                    "No emergency contacts configured for this member. Add at least one in SOS Setup.");
        }

        // 3. Load context: active medicines + pinned reports
        List<Medicine> activeMedicines = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());
        List<MedicalReport> pinnedReports = reportRepository
                .findByFamilyMemberIdAndIsPinnedForEmergencyTrueOrderByReportDateDesc(member.getId());

        // 4. Compose messages
        String whatsAppBody = messageBuilder.buildWhatsApp(member, activeMedicines, pinnedReports,
                latitude, longitude);
        String smsBody = messageBuilder.buildSms(member, activeMedicines, latitude, longitude);

        // 5. Fan out in parallel
        List<SosTriggerResponse.DeliveryStatus> deliveries = fanOut(contacts, smsBody, whatsAppBody);

        // 6. Persist event
        String deliveryJson = serializeDeliveries(deliveries);
        SosEvent event = SosEvent.builder()
                .familyMember(member)
                .triggeredBy(user)
                .latitude(latitude)
                .longitude(longitude)
                .accuracyMeters(accuracy)
                .messageBody(whatsAppBody)
                .contactsNotified(contacts.size())
                .deliverySummary(deliveryJson)
                .build();
        SosEvent saved = eventRepository.save(event);

        log.warn("SOS triggered for member={} by user={} contacts={} eventId={}",
                member.getName(), user.getEmail(), contacts.size(), saved.getId());
        sosTriggered.increment();

        return SosTriggerResponse.builder()
                .eventId(saved.getId())
                .contactsNotified(contacts.size())
                .triggeredAt(saved.getTriggeredAt())
                .deliveryByContact(deliveries)
                .build();
    }

    /**
     * Fires WhatsApp to every contact in parallel via the bounded executor.
     * SMS was deliberately removed — SOS goes through WhatsApp only because it
     * carries the rich body (medicine list + map link) that SMS gets cut off.
     * Total wall-clock capped at FAN_OUT_TIMEOUT_SECONDS.
     */
    private List<SosTriggerResponse.DeliveryStatus> fanOut(List<EmergencyContact> contacts,
                                                            String smsBody, String whatsAppBody) {
        List<SosTriggerResponse.DeliveryStatus> results = new ArrayList<>();
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (EmergencyContact c : contacts) {
            SosTriggerResponse.DeliveryStatus status = SosTriggerResponse.DeliveryStatus.builder()
                    .contactId(c.getId())
                    .name(c.getName())
                    .phone(c.getPhone())
                    .relationship(c.getRelationship())
                    .isPrimary(c.isPrimary())
                    .sms(null)
                    .whatsapp("PENDING")
                    .build();
            results.add(status);

            futures.add(CompletableFuture.runAsync(() -> {
                try {
                    boolean ok = whatsAppService.sendWhatsApp(c.getPhone(), whatsAppBody);
                    status.setWhatsapp(ok ? "SENT" : "FAILED");
                } catch (Exception e) {
                    log.error("SOS WhatsApp to {} failed", c.getName(), e);
                    status.setWhatsapp("FAILED");
                }
            }, sosFanOutExecutor));
        }

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(FAN_OUT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException te) {
            log.warn("SOS fan-out timed out after {}s — some channels may not have completed", FAN_OUT_TIMEOUT_SECONDS);
            results.forEach(r -> {
                if ("PENDING".equals(r.getWhatsapp())) r.setWhatsapp("FAILED");
            });
        } catch (Exception e) {
            log.error("SOS fan-out failed", e);
        }

        return results;
    }

    private String serializeDeliveries(List<SosTriggerResponse.DeliveryStatus> deliveries) {
        try {
            return objectMapper.writeValueAsString(deliveries);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize SOS delivery summary", e);
            return "[]";
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // History (caregiver only)
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SosEventResponse> listEvents(UUID memberId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);
        FamilyMember member = resolveMember(memberId, user);
        return eventRepository.findByFamilyMemberIdOrderByTriggeredAtDesc(member.getId())
                .stream()
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SosEventResponse getEvent(UUID eventId, String userEmail) {
        User user = getUser(userEmail);
        requireFamilyHead(user);
        SosEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("SOS event not found"));
        resolveMember(event.getFamilyMember().getId(), user);
        return toEventResponse(event);
    }

    // ─────────────────────────────────────────────────────────────────
    // Test SMS (caregiver self-test)
    // ─────────────────────────────────────────────────────────────────

    public boolean sendTestSms(String userEmail) {
        // Renamed semantics: now sends a WhatsApp test message (SOS goes through
        // WhatsApp only). Kept method name for endpoint stability.
        User user = getUser(userEmail);
        requireFamilyHead(user);
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            throw new CustomExceptions.BadRequestException(
                    "Add a phone number to your profile before testing SOS.");
        }
        return whatsAppService.sendWhatsApp(user.getPhone(),
                "FamilyCare test message. Your SOS setup is working. You will receive WhatsApp alerts on this number when an emergency is triggered.");
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    private FamilyMember resolveMember(UUID memberId, User user) {
        if ("MEMBER".equals(user.getRole())) {
            FamilyMember linked = familyMemberRepository.findByLinkedUserId(user.getId())
                    .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException(
                            "No family member linked to this account"));
            if (!linked.getId().equals(memberId)) {
                throw new CustomExceptions.ForbiddenException("You can only trigger SOS for yourself");
            }
            return linked;
        }
        return familyMemberRepository.findByIdAndUserId(memberId, user.getId())
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("Family member not found"));
    }

    private void requireFamilyHead(User user) {
        if (!"FAMILY_HEAD".equals(user.getRole())) {
            throw new CustomExceptions.ForbiddenException("Only the family head can manage emergency contacts");
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomExceptions.ResourceNotFoundException("User not found"));
    }

    private EmergencyContactResponse toContactResponse(EmergencyContact c) {
        return EmergencyContactResponse.builder()
                .id(c.getId())
                .familyMemberId(c.getFamilyMember().getId())
                .familyMemberName(c.getFamilyMember().getName())
                .name(c.getName())
                .relationship(c.getRelationship())
                .phone(c.getPhone())
                .isPrimary(c.isPrimary())
                .displayOrder(c.getDisplayOrder())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private SosEventResponse toEventResponse(SosEvent e) {
        String mapsUrl = (e.getLatitude() != null && e.getLongitude() != null)
                ? "https://maps.google.com/?q=" + e.getLatitude() + "," + e.getLongitude()
                : null;
        return SosEventResponse.builder()
                .id(e.getId())
                .familyMemberId(e.getFamilyMember().getId())
                .familyMemberName(e.getFamilyMember().getName())
                .triggeredByUserId(e.getTriggeredBy().getId())
                .triggeredByName(e.getTriggeredBy().getName())
                .latitude(e.getLatitude())
                .longitude(e.getLongitude())
                .accuracyMeters(e.getAccuracyMeters())
                .mapsUrl(mapsUrl)
                .messageBody(e.getMessageBody())
                .contactsNotified(e.getContactsNotified())
                .deliverySummary(e.getDeliverySummary())
                .triggeredAt(e.getTriggeredAt())
                .build();
    }
}
