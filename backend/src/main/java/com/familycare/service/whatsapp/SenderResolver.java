package com.familycare.service.whatsapp;

import com.familycare.model.FamilyMember;
import com.familycare.model.User;
import com.familycare.repository.FamilyMemberRepository;
import com.familycare.repository.UserRepository;
import com.familycare.service.whatsapp.dto.SenderContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SenderResolver {

    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    /**
     * Resolves a Twilio "From" value (e.g. "whatsapp:+919876543210") to a SenderContext.
     *
     * Lookup order:
     *   1. FamilyMember.phone — the elder is most likely the replier.
     *   2. User.phone — family head replying on behalf of an elder. If they own
     *      one member, auto-resolve. If multiple, mark ambiguous so the bot can
     *      ask "TAKEN MOM" / "TAKEN DAD".
     *
     * Returns null if no row matches any phone variant.
     */
    @Transactional(readOnly = true)
    public SenderContext resolve(String twilioFrom) {
        if (twilioFrom == null || twilioFrom.isBlank()) return null;

        Set<String> variants = phoneVariants(twilioFrom);

        for (String variant : variants) {
            Optional<FamilyMember> member = familyMemberRepository.findFirstByPhone(variant);
            if (member.isPresent()) {
                FamilyMember m = member.get();
                return SenderContext.builder()
                        .member(m)
                        .headUser(m.getUser())
                        .ambiguous(false)
                        .build();
            }
        }

        for (String variant : variants) {
            Optional<User> head = userRepository.findByPhone(variant);
            if (head.isPresent()) {
                User user = head.get();
                List<FamilyMember> members = familyMemberRepository.findByUserId(user.getId());
                if (members.size() == 1) {
                    return SenderContext.builder()
                            .member(members.get(0))
                            .headUser(user)
                            .ambiguous(false)
                            .build();
                }
                if (members.size() > 1) {
                    return SenderContext.builder()
                            .member(null)
                            .headUser(user)
                            .ambiguous(true)
                            .candidates(members)
                            .build();
                }
                // head exists but has no members — treat as unresolved.
                log.warn("Family head {} has no members, ignoring inbound", user.getEmail());
                return null;
            }
        }

        log.info("Unresolved WhatsApp sender: {}", twilioFrom);
        return null;
    }

    /**
     * Builds candidate phone strings from a Twilio "From" value. Phones in the DB
     * are stored inconsistently (with/without +91, with/without country code),
     * so we try several variants.
     */
    private Set<String> phoneVariants(String twilioFrom) {
        String digits = twilioFrom.replaceAll("[^0-9]", "");
        Set<String> variants = new LinkedHashSet<>();

        // Most-specific to least-specific so primary lookups hit first.
        if (digits.length() >= 12 && digits.startsWith("91")) {
            variants.add("+" + digits);                       // +919876543210
            variants.add(digits);                             // 919876543210
            variants.add(digits.substring(2));                // 9876543210
        } else if (digits.length() == 10) {
            variants.add(digits);                             // 9876543210
            variants.add("91" + digits);                      // 919876543210
            variants.add("+91" + digits);                     // +919876543210
        } else if (!digits.isEmpty()) {
            variants.add(digits);
            variants.add("+" + digits);
        }
        return variants;
    }
}
