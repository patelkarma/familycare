# CLAUDE.md — FamilyCare Project Context

> This file is for Claude Code AI assistant.
> Read this entire file before writing any code, suggesting any changes, or answering any questions about this project.
> Every decision you make must align with what is written here.

---

## 1. What This Project Is

**FamilyCare** is a multi-user SaaS web application that helps Indian families manage medicines and health of all family members from one dashboard.

**One-line summary for every decision you make:**
> "A family health management SaaS where a tech-savvy family member sets up medicines and reminders for elderly parents who receive alerts on WhatsApp/SMS without needing to install anything."

---

## 2. The 7 Core Features (Never Forget These)

These are the features that make this project unique. Every feature must work in the final product.

| # | Feature | What makes it unique |
|---|---|---|
| 1 | Medicine reminder via WhatsApp + SMS | Elderly parent needs zero tech skills — reminder arrives on basic phone |
| 2 | Prescription OCR scanner | Photo of prescription → medicines auto-filled, no typing |
| 3 | Family health dashboard | One view for ALL family members — not just one person |
| 4 | Vitals trend alert | Detects dangerous patterns (3 high BP readings) → auto SMS to family |
| 5 | Medicine stock tracker + pharmacy finder | Low stock → SMS alert + Google Maps pharmacy link |
| 6 | Medical report locker | All prescriptions, reports, X-rays stored and shareable |
| 7 | One-tap SOS | Button → WhatsApp to all emergency contacts with GPS + medicine list |

---

## 3. Tech Stack — Never Suggest Alternatives

This stack is fixed. Do not suggest replacing any part of it.

### Backend
- **Language:** Java 17
- **Framework:** Spring Boot 3.2
- **Security:** Spring Security + JWT (HS256, 24hr expiry)
- **Database ORM:** Spring Data JPA + Hibernate
- **Scheduler:** Spring `@Scheduled` + Upstash Redis
- **OCR:** Tesseract4J (tess4j 5.8.0)
- **Build:** Maven

### Frontend
- **Framework:** React 18
- **Build tool:** Vite
- **Data fetching:** React Query (TanStack Query v5)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Styling:** Tailwind CSS
- **HTTP:** Axios with JWT interceptor
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Toasts:** React Hot Toast

### Databases & Services
- **Primary DB:** PostgreSQL on Supabase
- **Job queue / cache:** Redis on Upstash
- **File storage:** Cloudinary
- **SMS:** Fast2SMS (India)
- **WhatsApp:** Twilio Sandbox API

---

## 4. Hosting — Fixed, Do Not Change

| What | Platform | Notes |
|---|---|---|
| Java Spring Boot | Render (free tier) | Sleeps after 15 min idle — known issue, acceptable |
| React frontend | Vercel | Auto-deploys from GitHub |
| PostgreSQL | Supabase | 500MB free, never expires |
| Redis | Upstash | 10k commands/day free |
| Files (images/PDFs) | Cloudinary | 25GB free |
| SMS | Fast2SMS | India-specific, cheap |
| WhatsApp | Twilio | Sandbox for dev/demo |

**Do not suggest AWS, GCP, Heroku, Firebase, or any paid hosting.**

---

## 5. Project Folder Structure

```
familycare/                        ← root repo
├── CLAUDE.md                      ← this file
├── SPEC.md                        ← full specification
├── backend/                       ← Spring Boot project
│   ├── pom.xml
│   └── src/main/java/com/familycare/
│       ├── FamilyCareApplication.java
│       ├── config/
│       │   ├── SecurityConfig.java
│       │   ├── CorsConfig.java
│       │   ├── RedisConfig.java
│       │   └── CloudinaryConfig.java
│       ├── controller/
│       │   ├── AuthController.java
│       │   ├── FamilyController.java
│       │   ├── MedicineController.java
│       │   ├── VitalsController.java
│       │   ├── AppointmentController.java
│       │   ├── ReportController.java
│       │   ├── SosController.java
│       │   └── DashboardController.java
│       ├── service/
│       │   ├── AuthService.java
│       │   ├── FamilyService.java
│       │   ├── MedicineService.java
│       │   ├── ReminderService.java
│       │   ├── AlertService.java
│       │   ├── OcrService.java
│       │   ├── SmsService.java
│       │   ├── WhatsAppService.java
│       │   ├── CloudinaryService.java
│       │   └── SosService.java
│       ├── repository/
│       │   ├── UserRepository.java
│       │   ├── FamilyMemberRepository.java
│       │   ├── MedicineRepository.java
│       │   ├── MedicineLogRepository.java
│       │   ├── VitalsRepository.java
│       │   ├── AppointmentRepository.java
│       │   ├── ReportRepository.java
│       │   └── EmergencyContactRepository.java
│       ├── model/
│       │   ├── User.java
│       │   ├── FamilyMember.java
│       │   ├── Medicine.java
│       │   ├── MedicineLog.java
│       │   ├── Vitals.java
│       │   ├── Appointment.java
│       │   ├── MedicalReport.java
│       │   └── EmergencyContact.java
│       ├── dto/
│       │   ├── request/
│       │   └── response/
│       ├── scheduler/
│       │   └── ReminderScheduler.java
│       ├── security/
│       │   ├── JwtUtil.java
│       │   ├── JwtFilter.java
│       │   └── UserDetailsServiceImpl.java
│       └── exception/
│           ├── GlobalExceptionHandler.java
│           └── CustomExceptions.java
│
└── frontend/                      ← React + Vite project
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   ├── axiosInstance.js   ← has JWT interceptor
        │   ├── auth.api.js
        │   ├── family.api.js
        │   ├── medicines.api.js
        │   ├── vitals.api.js
        │   ├── reports.api.js
        │   └── sos.api.js
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Family.jsx
        │   ├── MemberProfile.jsx
        │   ├── Medicines.jsx
        │   ├── Vitals.jsx
        │   ├── Reports.jsx
        │   ├── Appointments.jsx
        │   ├── SosSetup.jsx
        │   └── Settings.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx
        │   │   ├── TopBar.jsx
        │   │   └── MobileNav.jsx
        │   ├── dashboard/
        │   │   ├── FamilySummaryCard.jsx
        │   │   ├── TodayDoseGrid.jsx
        │   │   ├── AlertBanner.jsx
        │   │   └── MemberCard.jsx
        │   ├── medicines/
        │   │   ├── MedicineCard.jsx
        │   │   ├── AddMedicineForm.jsx
        │   │   ├── PrescriptionScanner.jsx
        │   │   └── DoseTimeline.jsx
        │   ├── vitals/
        │   │   ├── VitalsChart.jsx
        │   │   ├── VitalsLogForm.jsx
        │   │   └── VitalCard.jsx
        │   ├── reports/
        │   │   ├── ReportUploader.jsx
        │   │   └── ReportTimeline.jsx
        │   ├── sos/
        │   │   └── SOSButton.jsx
        │   └── shared/
        │       ├── Badge.jsx
        │       ├── Avatar.jsx
        │       ├── LoadingSpinner.jsx
        │       ├── EmptyState.jsx
        │       └── ConfirmModal.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   ├── useFamilyMembers.js
        │   └── useReminders.js
        ├── context/
        │   └── AuthContext.jsx
        └── utils/
            ├── formatters.js
            └── validators.js
```

---

## 6. Database Schema (All Tables)

All IDs are UUID. All timestamps default to `NOW()`. PostgreSQL on Supabase.

```sql
-- Users (login accounts)
users: id, name, email, password_hash, phone, role(FAMILY_HEAD|MEMBER), created_at, updated_at

-- Family members managed by a user
family_members: id, user_id(FK→users), name, relationship, date_of_birth, blood_group,
                gender, phone, allergies, chronic_diseases, avatar_url, created_at

-- Medicines assigned to a family member
medicines: id, family_member_id(FK→family_members), name, generic_name, dosage, form,
           frequency, timing(JSONB: {morning, afternoon, night}), with_food,
           start_date, end_date, stock_count, low_stock_alert(default 5),
           notes, prescription_url, is_active, created_at

-- Daily dose tracking log
medicine_logs: id, medicine_id(FK→medicines), family_member_id(FK→family_members),
               scheduled_time, taken_at, status(TAKEN|MISSED|SKIPPED|PENDING),
               dose_timing(MORNING|AFTERNOON|NIGHT), notes, created_at

-- Health vitals entries
vitals: id, family_member_id(FK→family_members), type(BP|SUGAR|WEIGHT|PULSE|TEMP|SPO2),
        value_primary, value_secondary(BP diastolic only), unit, notes, recorded_at

-- Doctor appointments
appointments: id, family_member_id(FK→family_members), doctor_name, speciality,
              hospital, appointment_date, notes, reminder_sent, created_at

-- Medical reports and files
medical_reports: id, family_member_id(FK→family_members), title, report_type,
                 file_url(Cloudinary), file_type(PDF|JPG|PNG), doctor_name,
                 hospital, report_date, notes, created_at

-- Emergency contacts for SOS
emergency_contacts: id, family_member_id(FK→family_members), name, relationship,
                    phone, is_primary, created_at

-- Log of all reminders sent
reminder_logs: id, medicine_id, family_member_id, channel(SMS|WHATSAPP|BOTH),
               status(SENT|FAILED|ESCALATED), sent_at, message
```

**Relationships:**
```
users → family_members (one-to-many)
family_members → medicines (one-to-many)
medicines → medicine_logs (one-to-many)
family_members → vitals (one-to-many)
family_members → appointments (one-to-many)
family_members → medical_reports (one-to-many)
family_members → emergency_contacts (one-to-many)
```

---

## 7. All API Endpoints

Base URL (dev): `http://localhost:8080/api`
Base URL (prod): `https://familycare-api.onrender.com/api`

All endpoints require `Authorization: Bearer <jwt>` header except `/auth/**`.

```
-- Auth (public)
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /auth/me

-- Family Members
GET    /family/members
POST   /family/members
GET    /family/members/{id}
PUT    /family/members/{id}
DELETE /family/members/{id}
POST   /family/members/{id}/avatar

-- Medicines
GET    /medicines/member/{memberId}
POST   /medicines
PUT    /medicines/{id}
DELETE /medicines/{id}
POST   /medicines/{id}/mark-taken
POST   /medicines/{id}/mark-skipped
GET    /medicines/{id}/logs
PUT    /medicines/{id}/stock
POST   /medicines/scan-prescription

-- Vitals
GET    /vitals/member/{memberId}         ?type=BP&days=30
POST   /vitals
GET    /vitals/member/{memberId}/latest
DELETE /vitals/{id}

-- Appointments
GET    /appointments/member/{memberId}
POST   /appointments
PUT    /appointments/{id}
DELETE /appointments/{id}

-- Medical Reports
GET    /reports/member/{memberId}
POST   /reports
GET    /reports/{id}
DELETE /reports/{id}

-- SOS
POST   /sos/trigger                      body: { memberId, lat, lng }
GET    /sos/contacts/member/{memberId}
POST   /sos/contacts
PUT    /sos/contacts/{id}
DELETE /sos/contacts/{id}

-- Dashboard
GET    /dashboard/summary
GET    /dashboard/today-doses
GET    /dashboard/alerts
```

---

## 8. Security Rules

- JWT secret is in env var `JWT_SECRET_KEY` — never hardcode it
- JWT expiry: 24 hours (access), 7 days (refresh)
- Passwords: BCrypt strength 12
- All `/api/**` routes protected except `/api/auth/**`
- CORS allowed origins: `http://localhost:5173` (dev) and Vercel URL (prod)
- File uploads: only JPG, PNG, PDF allowed — validate on backend
- Max file size: 10MB
- Never log phone numbers or health data

---

## 9. Environment Variables

### Backend (`application-prod.properties` / Render dashboard)
```
SUPABASE_HOST
SUPABASE_USER
SUPABASE_PASSWORD
UPSTASH_REDIS_URL
JWT_SECRET_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
FAST2SMS_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
FRONTEND_URL
```

### Frontend (`.env` / Vercel dashboard)
```
VITE_API_BASE_URL
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

---

## 10. Key Business Logic

### Reminder Scheduling (How it works)
1. User adds medicine with timing (morning = 9 AM, afternoon = 1 PM, night = 9 PM)
2. Spring Boot saves to PostgreSQL
3. `ReminderService` stores job in Upstash Redis:
   - Key: `reminder:{userId}:{memberId}:{medicineId}:{timing}`
   - Value: JSON with phone, medicine name, dosage, scheduled time
4. `ReminderScheduler.java` has `@Scheduled(cron = "0 * * * * *")` — runs every minute
5. Checks Redis for reminders due in current minute
6. Calls `SmsService` (Fast2SMS) and `WhatsAppService` (Twilio)
7. If no "mark taken" in 30 mins → `AlertService` sends escalation to family head

### Vitals Alert Logic
```java
// Check last 3 readings of same type for same member
// If all exceed threshold → fire SMS alert
List<Vitals> last3 = vitalsRepo.findTop3ByMemberIdAndTypeOrderByRecordedAtDesc(memberId, type);
if (last3.size() == 3 && last3.stream().allMatch(v -> v.getValuePrimary() > threshold)) {
    alertService.sendAlert(familyHeadPhone, memberName, type);
}
```

### Vitals Thresholds
```
BP Systolic  > 140 mmHg   (3 consecutive)
BP Diastolic > 90 mmHg    (3 consecutive)
Blood Sugar  > 126 mg/dL  (2 consecutive, fasting)
Pulse        < 50 or > 110 bpm (single reading)
SpO2         < 92%        (single reading)
```

### OCR Flow
```
1. React: user uploads image → Cloudinary → gets URL back
2. React: sends URL to POST /medicines/scan-prescription
3. Java OcrService: downloads image from Cloudinary URL
4. Tesseract4J: extracts raw text from image
5. Regex parser: finds medicine names, dosages, frequency keywords
6. Returns JSON array of detected medicines with confidence scores
7. React: shows pre-filled form, user reviews and confirms
8. On confirm: POST /medicines for each detected medicine
```

### SOS Flow
```
1. React: user presses SOS button → confirms → browser asks for GPS
2. React: sends POST /sos/trigger with { memberId, lat, lng }
3. Java: fetches member's blood group, allergies, active medicines
4. Java: fetches all emergency_contacts for that member
5. Java: builds message with all health info + Google Maps link
6. Java: sends WhatsApp + SMS to every emergency contact in parallel
7. Java: logs SOS event in reminder_logs table
8. React: shows "Alert sent to N contacts" confirmation
```

### Stock Decrement Logic
```
When medicine log status set to TAKEN:
  medicines.stock_count -= 1
  If stock_count <= medicines.low_stock_alert:
    SmsService.send(userPhone, "Low stock alert for {medicine}")
```

---

## 11. UI Design Rules

### Color Palette (Tailwind custom colors)
```js
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: '#F5A623',   // warm amber — main accent
    dark:    '#E8920F',   // hover
    light:   '#FEF3DC',   // backgrounds
  },
  surface: {
    page:   '#FAFAF8',    // page background
    card:   '#FFFFFF',    // card background
    muted:  '#F5F4F0',    // secondary surface
  }
}
```

### Component Patterns
- Cards: `rounded-2xl shadow-sm bg-white p-5`
- Primary button: `bg-primary text-white rounded-xl px-4 py-2`
- Danger button: `bg-red-500 text-white rounded-xl px-4 py-2`
- Input: `border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary`
- Badge TAKEN: `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full`
- Badge MISSED: `bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full`
- Badge LOW STOCK: `bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full`

### Font
```css
font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
```
Add to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Dashboard Layout
- Desktop: sidebar (240px fixed) + main content area
- Mobile: top bar + bottom tab navigation (5 tabs)
- Main dashboard uses a **CSS grid** with mixed card sizes — not a simple list
- First thing visible on dashboard: greeting ("Good morning, {name} 👋") + today's date
- Family member cards show: name, avatar, today's dose status, latest vital reading

---

## 12. Common Patterns to Follow

### Standard API Response (Java)
Always return this structure:
```java
// Success
{ "success": true, "data": { ... }, "message": "Done" }

// Error
{ "success": false, "data": null, "message": "Error description", "errors": [...] }
```

### React API Call Pattern
```jsx
// Always use React Query for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['medicines', memberId],
  queryFn: () => medicinesApi.getByMember(memberId)
});

// Always use useMutation for writes
const mutation = useMutation({
  mutationFn: medicinesApi.markTaken,
  onSuccess: () => {
    queryClient.invalidateQueries(['medicines', memberId]);
    toast.success('Dose marked as taken!');
  }
});
```

### Axios Instance (always use this, never raw fetch)
```js
// src/api/axiosInstance.js
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### JPA Repository Pattern
```java
// Always use custom queries for complex lookups
@Query("SELECT v FROM Vitals v WHERE v.familyMember.id = :memberId AND v.type = :type ORDER BY v.recordedAt DESC")
List<Vitals> findTop3ByMemberIdAndType(@Param("memberId") UUID memberId, @Param("type") String type, Pageable pageable);
```

---

## 13. What NOT to Do

- Do NOT use `useEffect` + `fetch` for API calls — use React Query always
- Do NOT hardcode any API URLs — use `import.meta.env.VITE_API_BASE_URL`
- Do NOT hardcode credentials anywhere — use environment variables
- Do NOT use `var` in JavaScript — use `const` and `let` only
- Do NOT use inline styles in React — use Tailwind classes
- Do NOT create new database tables without updating this CLAUDE.md
- Do NOT add new npm packages without a clear reason
- Do NOT use `@RestController` without `@RequestMapping("/api/...")` prefix
- Do NOT return raw entities from controllers — always use DTOs
- Do NOT skip input validation — every POST/PUT endpoint needs `@Valid`
- Do NOT suggest replacing PostgreSQL with MongoDB or any NoSQL
- Do NOT suggest replacing React with Next.js or any other framework

---

## 14. Current Development Status

Update this section as features are completed.

```
[ ] Week 1 — Foundation
    [ ] Day 1: Project setup + all platforms configured
    [ ] Day 2: Database schema + JPA entities
    [ ] Day 3: JWT Authentication
    [ ] Day 4: Family member CRUD APIs
    [ ] Day 5: Medicine CRUD APIs
    [ ] Day 6: React auth screens + dashboard skeleton
    [ ] Day 7: Buffer + Week 1 review

[ ] Week 2 — Reminders & Vitals
    [ ] Day 8: Redis reminder scheduler
    [ ] Day 9: Fast2SMS integration
    [ ] Day 10: WhatsApp (Twilio) integration
    [ ] Day 11: Vitals tracking APIs
    [ ] Day 12: Smart vitals alert engine
    [ ] Day 13: React medicine schedule UI + vitals charts
    [ ] Day 14: Buffer + Week 2 review

[ ] Week 3 — Unique Features
    [ ] Day 15: Prescription OCR — backend
    [ ] Day 16: Prescription scanner — React UI
    [ ] Day 17: Stock tracker + low stock alert
    [ ] Day 18: Nearby pharmacy finder
    [ ] Day 19: SOS emergency alert
    [ ] Day 20: Doctor visit history + report locker
    [ ] Day 21: Buffer + full integration test

[ ] Week 4 — Polish & Demo
    [ ] Day 22-23: Full UI polish
    [ ] Day 24-25: Family dashboard final version
    [ ] Day 26: End-to-end testing + bug fixes
    [ ] Day 27: Seed demo data + real user test
    [ ] Day 28: Project report + README
    [ ] Day 29: Demo preparation + practice
    [ ] Day 30: Final deploy + submission
```

---

## 15. Demo Day Checklist

These must ALL work on demo day on the live URL (not localhost):

```
[ ] Login and register a new account
[ ] Add 3-4 family members with photos
[ ] Add medicines for elderly parent
[ ] Reminder fires on a real phone (SMS or WhatsApp)
[ ] Scan a prescription photo → medicines auto-fill
[ ] Log a vital (BP reading) → trend chart updates
[ ] Stock count decrements when dose marked taken
[ ] Low stock alert SMS received on phone
[ ] SOS button → WhatsApp received by emergency contact with GPS link
[ ] Upload a medical report PDF → shows in timeline
[ ] Dashboard shows all family members at once
[ ] App works on mobile browser (responsive)
[ ] Render backend is awake (ping 2 mins before demo)
```

---

*This file was generated for Claude Code AI assistance.*
