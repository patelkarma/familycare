package com.familycare.config;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class IndianMedicineDictionary {

    public static class Entry {
        public final String brandName;
        public final String genericName;
        public final String category;

        public Entry(String brandName, String genericName, String category) {
            this.brandName = brandName;
            this.genericName = genericName;
            this.category = category;
        }
    }

    private final List<Entry> entries = new ArrayList<>();
    private final Map<String, Entry> byLowerName = new HashMap<>();

    public IndianMedicineDictionary() {
        seed();
    }

    private void seed() {
        // Format: brand, generic/salt, category
        add("Paracetamol", "Paracetamol", "Analgesic/Antipyretic");
        add("Crocin", "Paracetamol", "Analgesic/Antipyretic");
        add("Dolo", "Paracetamol", "Analgesic/Antipyretic");
        add("Dolo 650", "Paracetamol 650mg", "Analgesic/Antipyretic");
        add("Calpol", "Paracetamol", "Analgesic/Antipyretic");
        add("Metacin", "Paracetamol", "Analgesic/Antipyretic");
        add("P-500", "Paracetamol", "Analgesic/Antipyretic");

        add("Ibuprofen", "Ibuprofen", "NSAID");
        add("Brufen", "Ibuprofen", "NSAID");
        add("Combiflam", "Ibuprofen + Paracetamol", "NSAID");
        add("Diclofenac", "Diclofenac", "NSAID");
        add("Voveran", "Diclofenac", "NSAID");
        add("Aceclofenac", "Aceclofenac", "NSAID");
        add("Zerodol", "Aceclofenac", "NSAID");
        add("Nimesulide", "Nimesulide", "NSAID");
        add("Nise", "Nimesulide", "NSAID");

        add("Azithromycin", "Azithromycin", "Antibiotic");
        add("Azee", "Azithromycin", "Antibiotic");
        add("Zithromax", "Azithromycin", "Antibiotic");
        add("Amoxicillin", "Amoxicillin", "Antibiotic");
        add("Mox", "Amoxicillin", "Antibiotic");
        add("Amoxyclav", "Amoxicillin + Clavulanic Acid", "Antibiotic");
        add("Augmentin", "Amoxicillin + Clavulanic Acid", "Antibiotic");
        add("Clavam", "Amoxicillin + Clavulanic Acid", "Antibiotic");
        add("Cefixime", "Cefixime", "Antibiotic");
        add("Taxim-O", "Cefixime", "Antibiotic");
        add("Ciprofloxacin", "Ciprofloxacin", "Antibiotic");
        add("Ciplox", "Ciprofloxacin", "Antibiotic");
        add("Ofloxacin", "Ofloxacin", "Antibiotic");
        add("Levofloxacin", "Levofloxacin", "Antibiotic");
        add("Doxycycline", "Doxycycline", "Antibiotic");

        add("Metformin", "Metformin", "Antidiabetic");
        add("Glycomet", "Metformin", "Antidiabetic");
        add("Glucophage", "Metformin", "Antidiabetic");
        add("Glimepiride", "Glimepiride", "Antidiabetic");
        add("Amaryl", "Glimepiride", "Antidiabetic");
        add("Sitagliptin", "Sitagliptin", "Antidiabetic");
        add("Januvia", "Sitagliptin", "Antidiabetic");
        add("Galvus", "Vildagliptin", "Antidiabetic");
        add("Insulin", "Insulin", "Antidiabetic");
        add("Lantus", "Insulin Glargine", "Antidiabetic");
        add("Humalog", "Insulin Lispro", "Antidiabetic");

        add("Amlodipine", "Amlodipine", "Antihypertensive");
        add("Amlong", "Amlodipine", "Antihypertensive");
        add("Amlopres", "Amlodipine", "Antihypertensive");
        add("Stamlo", "Amlodipine", "Antihypertensive");
        add("Telmisartan", "Telmisartan", "Antihypertensive");
        add("Telma", "Telmisartan", "Antihypertensive");
        add("Telma-H", "Telmisartan + Hydrochlorothiazide", "Antihypertensive");
        add("Losartan", "Losartan", "Antihypertensive");
        add("Losar", "Losartan", "Antihypertensive");
        add("Atenolol", "Atenolol", "Antihypertensive");
        add("Tenormin", "Atenolol", "Antihypertensive");
        add("Metoprolol", "Metoprolol", "Antihypertensive");
        add("Metolar", "Metoprolol", "Antihypertensive");
        add("Ramipril", "Ramipril", "Antihypertensive");
        add("Cardace", "Ramipril", "Antihypertensive");
        add("Enalapril", "Enalapril", "Antihypertensive");

        add("Atorvastatin", "Atorvastatin", "Statin");
        add("Atorva", "Atorvastatin", "Statin");
        add("Lipitor", "Atorvastatin", "Statin");
        add("Rosuvastatin", "Rosuvastatin", "Statin");
        add("Rosuvas", "Rosuvastatin", "Statin");
        add("Crestor", "Rosuvastatin", "Statin");
        add("Simvastatin", "Simvastatin", "Statin");

        add("Pantoprazole", "Pantoprazole", "PPI");
        add("Pan", "Pantoprazole", "PPI");
        add("Pantop", "Pantoprazole", "PPI");
        add("Pan-40", "Pantoprazole 40mg", "PPI");
        add("Omeprazole", "Omeprazole", "PPI");
        add("Omez", "Omeprazole", "PPI");
        add("Rabeprazole", "Rabeprazole", "PPI");
        add("Razo", "Rabeprazole", "PPI");
        add("Esomeprazole", "Esomeprazole", "PPI");
        add("Nexpro", "Esomeprazole", "PPI");
        add("Ranitidine", "Ranitidine", "H2 blocker");
        add("Rantac", "Ranitidine", "H2 blocker");
        add("Famotidine", "Famotidine", "H2 blocker");

        add("Cetirizine", "Cetirizine", "Antihistamine");
        add("Cetzine", "Cetirizine", "Antihistamine");
        add("Alerid", "Cetirizine", "Antihistamine");
        add("Levocetirizine", "Levocetirizine", "Antihistamine");
        add("Levocet", "Levocetirizine", "Antihistamine");
        add("Teczine", "Levocetirizine", "Antihistamine");
        add("Montelukast", "Montelukast", "Leukotriene antagonist");
        add("Montair", "Montelukast", "Leukotriene antagonist");
        add("Montek", "Montelukast", "Leukotriene antagonist");

        add("Thyroxine", "Thyroxine", "Thyroid");
        add("Levothyroxine", "Levothyroxine", "Thyroid");
        add("Eltroxin", "Levothyroxine", "Thyroid");
        add("Thyronorm", "Levothyroxine", "Thyroid");

        add("Aspirin", "Acetylsalicylic acid", "Antiplatelet");
        add("Ecosprin", "Aspirin", "Antiplatelet");
        add("Disprin", "Aspirin", "Analgesic");
        add("Clopidogrel", "Clopidogrel", "Antiplatelet");
        add("Clopilet", "Clopidogrel", "Antiplatelet");
        add("Plavix", "Clopidogrel", "Antiplatelet");
        add("Warfarin", "Warfarin", "Anticoagulant");
        add("Apixaban", "Apixaban", "Anticoagulant");
        add("Eliquis", "Apixaban", "Anticoagulant");
        add("Rivaroxaban", "Rivaroxaban", "Anticoagulant");

        add("Vitamin D3", "Cholecalciferol", "Vitamin");
        add("Calcirol", "Vitamin D3", "Vitamin");
        add("Uprise-D3", "Vitamin D3", "Vitamin");
        add("Vitamin B12", "Cyanocobalamin", "Vitamin");
        add("Methylcobalamin", "Methylcobalamin", "Vitamin");
        add("Nurokind", "Methylcobalamin", "Vitamin");
        add("Neurobion", "B Complex", "Vitamin");
        add("Becosule", "B Complex", "Vitamin");
        add("Iron", "Ferrous sulfate", "Mineral");
        add("Fefol", "Ferrous sulfate + Folic acid", "Mineral");
        add("Livogen", "Ferrous fumarate + Folic acid", "Mineral");
        add("Shelcal", "Calcium + Vitamin D3", "Mineral");
        add("Calcimax", "Calcium + Vitamin D3", "Mineral");

        add("Alprazolam", "Alprazolam", "Anxiolytic");
        add("Alprax", "Alprazolam", "Anxiolytic");
        add("Lorazepam", "Lorazepam", "Anxiolytic");
        add("Diazepam", "Diazepam", "Anxiolytic");
        add("Sertraline", "Sertraline", "Antidepressant");
        add("Escitalopram", "Escitalopram", "Antidepressant");
        add("Fluoxetine", "Fluoxetine", "Antidepressant");

        add("Salbutamol", "Salbutamol", "Bronchodilator");
        add("Asthalin", "Salbutamol", "Bronchodilator");
        add("Levolin", "Levosalbutamol", "Bronchodilator");
        add("Budesonide", "Budesonide", "Corticosteroid");
        add("Budecort", "Budesonide", "Corticosteroid");
        add("Prednisolone", "Prednisolone", "Corticosteroid");
        add("Wysolone", "Prednisolone", "Corticosteroid");

        add("Losec", "Omeprazole", "PPI");
        add("Allegra", "Fexofenadine", "Antihistamine");
        add("Sinarest", "Paracetamol + Chlorpheniramine + Phenylephrine", "Cold/Flu");
        add("D-Cold", "Paracetamol + Chlorpheniramine + Phenylephrine", "Cold/Flu");
        add("Coldarin", "Paracetamol + Chlorpheniramine + Caffeine", "Cold/Flu");
        add("Ascoril", "Cough syrup", "Cough");
        add("Benadryl", "Diphenhydramine", "Cough/Antihistamine");
        add("Grilinctus", "Cough syrup", "Cough");
        add("ORS", "Oral Rehydration Salt", "Rehydration");
        add("Electral", "ORS", "Rehydration");
    }

    private void add(String brand, String generic, String category) {
        Entry e = new Entry(brand, generic, category);
        entries.add(e);
        byLowerName.put(brand.toLowerCase(), e);
    }

    public List<Entry> all() {
        return Collections.unmodifiableList(entries);
    }

    /**
     * Finds the best match for a (possibly OCR-garbled) medicine name.
     * Returns null if no reasonable match (Levenshtein distance > 2 for short names, > 3 for long).
     */
    public Entry findBestMatch(String ocrName) {
        if (ocrName == null || ocrName.isBlank()) return null;
        String needle = ocrName.toLowerCase().trim();

        Entry exact = byLowerName.get(needle);
        if (exact != null) return exact;

        Entry contains = null;
        for (Entry e : entries) {
            String bn = e.brandName.toLowerCase();
            String gn = e.genericName.toLowerCase();
            if (needle.contains(bn) || bn.contains(needle) ||
                needle.contains(gn) || gn.contains(needle)) {
                contains = e;
                break;
            }
        }
        if (contains != null) return contains;

        Entry best = null;
        int bestDist = Integer.MAX_VALUE;
        for (Entry e : entries) {
            int d = levenshtein(needle, e.brandName.toLowerCase());
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        int threshold = needle.length() <= 5 ? 1 : (needle.length() <= 10 ? 2 : 3);
        return bestDist <= threshold ? best : null;
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }
}
