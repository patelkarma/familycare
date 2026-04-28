package com.familycare.service.whatsapp.handlers;

import com.familycare.model.FamilyMember;
import com.familycare.model.Medicine;
import com.familycare.repository.MedicineRepository;
import com.familycare.service.whatsapp.IntentHandler;
import com.familycare.service.whatsapp.dto.Intent;
import com.familycare.service.whatsapp.dto.IntentType;
import com.familycare.service.whatsapp.dto.SenderContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StockIntentHandler implements IntentHandler {

    private final MedicineRepository medicineRepository;

    @Override
    public boolean supports(IntentType type) {
        return type == IntentType.STOCK;
    }

    @Override
    @Transactional(readOnly = true)
    public String handle(Intent intent, SenderContext ctx) {
        if (ctx.isAmbiguous() || ctx.getMember() == null) {
            return "You manage multiple members. Reply 'STOCK <name>' isn't supported yet — open the app to view stock.";
        }
        FamilyMember member = ctx.getMember();
        List<Medicine> medicines = medicineRepository.findByFamilyMemberIdAndIsActiveTrue(member.getId());

        if (medicines.isEmpty()) {
            return "No active medicines for " + member.getName() + ".";
        }

        StringBuilder sb = new StringBuilder("Stock for ").append(member.getName()).append(":\n");
        for (Medicine m : medicines) {
            int stock = m.getStockCount() == null ? 0 : m.getStockCount();
            int threshold = m.getLowStockAlert() == null ? 5 : m.getLowStockAlert();
            String tag = stock <= threshold ? " — LOW" : "";
            sb.append("- ").append(m.getName()).append(": ").append(stock).append(tag).append("\n");
        }
        return sb.toString().trim();
    }
}
