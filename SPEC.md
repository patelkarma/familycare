# SPEC.md — FamilyCare: Family Health & Medicine Management SaaS

> **Version:** 1.0.0  
> **Author:** Final Year Project  
> **Stack:** Java 17 + Spring Boot 3 (Backend) · React 18 + Vite (Frontend)  
> **Last Updated:** March 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Tech Stack](#5-tech-stack)
6. [Hosting & Infrastructure](#6-hosting--infrastructure)
7. [UI Design Language](#7-ui-design-language)
8. [System Architecture](#8-system-architecture)
9. [Database Schema](#9-database-schema)
10. [Feature Specifications](#10-feature-specifications)
11. [API Endpoints](#11-api-endpoints)
12. [Security Specification](#12-security-specification)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Frontend Pages & Components](#14-frontend-pages--components)
15. [Folder Structure](#15-folder-structure)
16. [Environment Variables](#16-environment-variables)
17. [Build & Deployment](#17-build--deployment)
18. [30-Day Development Timeline](#18-30-day-development-timeline)
19. [Out of Scope](#19-out-of-scope)
20. [Future Scope](#20-future-scope)

---

## 1. Project Overview

**FamilyCare** is a multi-user, cloud-based SaaS application that helps Indian families manage the health and medicines of all family members from a single dashboard. It solves the critical real-world problem of medicine non-adherence among elderly patients by combining smart reminders (delivered via WhatsApp and SMS — no app installation needed by the elderly), prescription OCR scanning, family vitals tracking, and an emergency SOS system.

Unlike existing apps (Medisafe, MyTherapy, Eka Care) which are either Western-focused, offline-only, or limited to record storage, FamilyCare is the only India-first SaaS that combines all seven of these features in one product.

**Tagline:** *"One dashboard. Your whole family's health."*

---

## 2. Problem Statement

- Over **50% of elderly patients** in India miss daily medicines due to forgetfulness (WHO, 2024).
- Existing apps require elderly users to install and operate a smartphone app — a major barrier.
- No Indian app combines prescription scanning + WhatsApp reminders + family dashboard + SOS in one product.
- Families with working children cannot remotely monitor the health of elderly parents.
- Medical records (prescriptions, blood reports, X-rays) are scattered across paper files.
- When a health emergency occurs, family members have no instant access to the patient's medicine list, blood group, or allergies.

**FamilyCare solves all six of these problems.**

---

## 3. Goals & Success Metrics

### Primary Goals
- Allow one user (family head) to manage medicines and health of all family members.
- Send medicine reminders via WhatsApp/SMS so elderly users need zero tech skills.
- Scan prescription photos to auto-fill medicine data (no manual typing).
- Track health vitals and alert family when readings trend dangerously.
- Provide one-tap SOS that sends health summary to all emergency contacts.

### Success Metrics (for demo)
| Metric | Target |
|---|---|
| Reminder delivered to real phone | Yes — live demo |
| Prescription scanned and auto-filled | Yes — live demo |
| SOS WhatsApp received in < 5 seconds | Yes — live demo |
| Family dashboard loads all members | Yes — with seed data |
| App works on mobile browser | Yes — fully responsive |
| Zero crashes during 10-minute demo | Yes |

---

## 4. Target Users

### Primary User — Family Head (Tech-savvy)
- Age: 25–45
- Sets up the app, adds family members, configures medicines and reminders
- Monitors family health dashboard remotely
- Receives alerts when a family member misses a dose or has abnormal vitals

### Secondary User — Elderly Family Member (Non-tech)
- Age: 55+
- Never opens the app themselves
- Receives medicine reminders via WhatsApp or SMS on their basic phone
- Uses the SOS button on a simplified mobile view if needed

### Tertiary User — Patient with Chronic Illness
- Age: Any
- Tracks their own BP, blood sugar, weight over time
- Scans prescriptions to add medicines quickly
- Stores and shares medical reports with doctors

---

## 5. Tech Stack

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Language | Java 17 | LTS version, college requirement |
| Framework | Spring Boot 3.2 | Production-grade, REST APIs, schedulers |
| Security | Spring Security + JWT | Stateless auth, role-based access |
| ORM | Spring Data JPA + Hibernate | Database abstraction |
| Scheduler | Spring @Scheduled + Redis | Reliable reminder job queue |
| OCR | Tesseract4J (tess4j) | Prescription text extraction |
| HTTP Client | RestTemplate / WebClient | Third-party API calls (SMS, WhatsApp) |
| Build Tool | Maven | Dependency management |
| Java Version | 17 (LTS) | Required for Spring Boot 3 |

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | React 18 | College requirement, component reuse |
| Build Tool | Vite | Fast dev server, HMR |
| State/Data | React Query (TanStack) | Server state, caching, loading states |
| Forms | React Hook Form + Zod | Validation, less boilerplate |
| Charts | Recharts | Vitals line graphs, adherence charts |
| Styling | Tailwind CSS | Utility-first, fast UI building |
| HTTP | Axios | API calls with interceptors |
| Routing | React Router v6 | Protected routes, nested layouts |
| Icons | Lucide React | Clean icon set |
| Notifications | React Hot Toast | In-app toast notifications |

### Database & Storage
| Service | Use |
|---|---|
| PostgreSQL (Supabase) | Primary relational database |
| Redis (Upstash) | Reminder job queue, session cache |
| Cloudinary | Prescription images, medical report PDFs |

---

## 6. Hosting & Infrastructure

| Component | Platform | Free Tier Details |
|---|---|---|
| Java Spring Boot API | Render | Free — sleeps after 15 min idle, wakes in ~30s |
| React Frontend | Vercel | Free forever for hobby projects |
| PostgreSQL Database | Supabase | 500MB free, no expiry |
| Redis Queue | Upstash | 10,000 commands/day free |
| File Storage | Cloudinary | 25GB free storage |
| SMS Reminders | Fast2SMS | Free trial credits (₹50 free) |
| WhatsApp Reminders | Twilio Sandbox | Free sandbox for testing |

### Important Notes
- Render free tier **sleeps after 15 minutes** of inactivity. On demo day, ping the backend URL 2 minutes before presenting.
- All services connect via environment variables — no hardcoded credentials anywhere.
- GitHub Actions can be configured for CI/CD auto-deploy on push (optional).

### Architecture Flow
```
User (React on Vercel)
    ↓ HTTPS API calls
Java Spring Boot (Render)
    ↓                    ↓                  ↓
Supabase (PostgreSQL)   Upstash (Redis)   Cloudinary (Files)
                            ↓
                    Spring Scheduler
                    ↓              ↓
               Fast2SMS          Twilio
             (SMS alerts)   (WhatsApp alerts)
```

---

## 7. UI Design Language

### Visual Inspiration
The UI follows a **warm, card-based personal dashboard** aesthetic — friendly, approachable, and information-dense without feeling clinical. Inspired by modern personal productivity dashboards with:
- Warm cream/white backgrounds with yellow-orange accent palette
- Rounded cards with soft shadows for every data widget
- Friendly greeting header ("Good Morning, Karma 👋")
- Weather-widget style stat cards with icons
- Color-coded health status indicators (green = good, amber = warning, red = critical)
- Grid-based layout with varying card sizes (like a magazine layout)
- Subtle illustrations or icons — not sterile medical UI

### Color Palette
```css
/* Primary brand colors */
--color-primary: #F5A623;        /* Warm amber/orange — main accent */
--color-primary-dark: #E8920F;   /* Darker amber for hover states */
--color-primary-light: #FEF3DC;  /* Light amber for backgrounds */

/* Background */
--color-bg-page: #FAFAF8;        /* Warm off-white page background */
--color-bg-card: #FFFFFF;        /* Pure white cards */
--color-bg-secondary: #F5F4F0;   /* Slightly warm surface */

/* Status colors */
--color-success: #22C55E;        /* Medicine taken, normal vitals */
--color-warning: #F59E0B;        /* Low stock, borderline vitals */
--color-danger: #EF4444;         /* Missed dose, critical vitals, SOS */
--color-info: #3B82F6;           /* Informational, upcoming events */

/* Text */
--color-text-primary: #1C1917;   /* Near-black, warm tint */
--color-text-secondary: #78716C; /* Muted brown-gray */
--color-text-muted: #A8A29E;     /* Hints and placeholders */
```

### Typography
```css
/* Font stack */
font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;  /* Primary — friendly, modern */
font-family: 'DM Mono', monospace;                         /* Numbers and code */

/* Scale */
--text-xs:   12px;   /* Tags, badges, timestamps */
--text-sm:   13px;   /* Secondary info, descriptions */
--text-base: 15px;   /* Body text */
--text-lg:   17px;   /* Card titles */
--text-xl:   20px;   /* Section headings */
--text-2xl:  24px;   /* Page headings */
--text-3xl:  30px;   /* Dashboard greeting */
--text-4xl:  36px;   /* Large metric numbers */
```

### Component Design Rules
- **Cards:** `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`, white background, 20px padding
- **Buttons:** Primary = amber fill, Secondary = outline, Danger = red fill. All with 10px border-radius.
- **Badges:** Pill-shaped, color-coded by status. Small text (12px), 4px 10px padding.
- **Inputs:** 12px border-radius, light border, amber focus ring.
- **Charts:** Recharts with amber primary line, soft grid lines, tooltip with card styling.
- **Mobile:** All layouts stack vertically on screens < 768px. Bottom navigation on mobile.

### Dashboard Layout (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │         Main Content Area           │
│  ─ Logo           │  ┌──────────────────────────────┐   │
│  ─ Dashboard      │  │  Good Morning, Karma 👋       │   │
│  ─ Family         │  │  Tuesday, 25 March 2026       │   │
│  ─ Medicines      │  └──────────────────────────────┘   │
│  ─ Vitals         │  ┌───────┐ ┌───────┐ ┌───────────┐  │
│  ─ Reports        │  │Members│ │Today's│ │  Stock    │  │
│  ─ Appointments   │  │  (4)  │ │Doses  │ │  Alerts   │  │
│  ─ SOS Setup      │  └───────┘ └───────┘ └───────────┘  │
│                   │  ┌──────────────┐ ┌───────────────┐ │
│  [SOS Button]     │  │ Vitals Chart │ │ Family Members│ │
│                   │  │   (30 days)  │ │   Cards Grid  │ │
└─────────────────────────────────────────────────────────┘
```

---

## 8. System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│              React 18 + Vite (Vercel)                   │
│   Auth Pages │ Dashboard │ Family │ Medicines │ Reports  │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS REST API (JSON)
┌─────────────────────▼───────────────────────────────────┐
│                   API LAYER                              │
│           Spring Boot 3 (Render)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Auth/JWT  │ │Family API│ │Medicine  │ │ Vitals API│  │
│  │Controller│ │Controller│ │ API Ctrl │ │ Controller│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ OCR API  │ │Reports   │ │ SOS API  │ │Scheduler  │  │
│  │Controller│ │Controller│ │Controller│ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└──────────┬──────────────────────────────────────────────┘
           │
    ┌──────┴─────────────────────────────────┐
    │          DATA LAYER                    │
    │  ┌──────────┐  ┌────────┐  ┌────────┐ │
    │  │Supabase  │  │Upstash │  │Cloudina│ │
    │  │PostgreSQL│  │ Redis  │  │  ry    │ │
    │  └──────────┘  └────────┘  └────────┘ │
    └────────────────────────────────────────┘
           │
    ┌──────┴────────────────────────┐
    │     EXTERNAL SERVICES         │
    │  ┌──────────┐  ┌───────────┐  │
    │  │Fast2SMS  │  │  Twilio   │  │
    │  │  (SMS)   │  │(WhatsApp) │  │
    │  └──────────┘  └───────────┘  │
    └───────────────────────────────┘
```

### Request Flow (Medicine Reminder)
```
1. User adds medicine with 9:00 AM reminder
2. Spring Boot saves medicine to PostgreSQL
3. Spring Boot stores reminder job in Upstash Redis
   Key: reminder:{userId}:{memberId}:{medicineId}
   Value: { time: "09:00", phone: "+91XXXXXXXXXX", medicine: "Metformin 500mg" }
4. Spring @Scheduled cron runs every minute
5. At 9:00 AM — scheduler reads Redis, finds due reminders
6. Calls Fast2SMS API → SMS delivered to phone
7. Calls Twilio API → WhatsApp message delivered
8. Logs reminder_sent event in PostgreSQL
9. If no "mark taken" received in 30 mins → sends escalation alert to family head
```

---

## 9. Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(15),
  role          VARCHAR(20) DEFAULT 'FAMILY_HEAD',  -- FAMILY_HEAD | MEMBER
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

#### `family_members`
```sql
CREATE TABLE family_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  relationship     VARCHAR(50),     -- Father, Mother, Spouse, Child, Self
  date_of_birth    DATE,
  blood_group      VARCHAR(5),      -- A+, B-, O+, AB+, etc.
  gender           VARCHAR(10),
  phone            VARCHAR(15),     -- Phone for WhatsApp/SMS reminders
  allergies        TEXT,            -- Comma separated
  chronic_diseases TEXT,            -- Diabetes, Hypertension, etc.
  avatar_url       VARCHAR(500),
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `medicines`
```sql
CREATE TABLE medicines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  generic_name     VARCHAR(200),
  dosage           VARCHAR(100),    -- "500mg", "10ml"
  form             VARCHAR(50),     -- Tablet, Syrup, Injection, Capsule
  frequency        VARCHAR(50),     -- Once, Twice, Thrice daily
  timing           JSONB,           -- {"morning": true, "afternoon": false, "night": true}
  with_food        BOOLEAN DEFAULT false,
  start_date       DATE NOT NULL,
  end_date         DATE,            -- NULL = ongoing
  stock_count      INTEGER DEFAULT 0,
  low_stock_alert  INTEGER DEFAULT 5,  -- Alert when stock falls below this
  notes            TEXT,
  prescription_url VARCHAR(500),   -- Cloudinary URL of prescription image
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `medicine_logs`
```sql
CREATE TABLE medicine_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id      UUID REFERENCES medicines(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id),
  scheduled_time   TIMESTAMP NOT NULL,
  taken_at         TIMESTAMP,       -- NULL = not yet taken
  status           VARCHAR(20),     -- TAKEN | MISSED | SKIPPED | PENDING
  dose_timing      VARCHAR(20),     -- MORNING | AFTERNOON | NIGHT
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `vitals`
```sql
CREATE TABLE vitals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL,   -- BP | SUGAR | WEIGHT | PULSE | TEMP | SPO2
  value_primary    DECIMAL(6,2),           -- BP systolic / sugar value / weight
  value_secondary  DECIMAL(6,2),           -- BP diastolic (only for BP)
  unit             VARCHAR(20),            -- mmHg | mg/dL | kg | bpm | °C | %
  notes            TEXT,
  recorded_at      TIMESTAMP DEFAULT NOW()
);
```

#### `appointments`
```sql
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  doctor_name      VARCHAR(150),
  speciality       VARCHAR(100),
  hospital         VARCHAR(200),
  appointment_date TIMESTAMP NOT NULL,
  notes            TEXT,
  reminder_sent    BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `medical_reports`
```sql
CREATE TABLE medical_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,  -- "Blood Test - Jan 2026"
  report_type      VARCHAR(100),           -- Blood Test | X-Ray | MRI | Prescription | Other
  file_url         VARCHAR(500) NOT NULL,  -- Cloudinary URL
  file_type        VARCHAR(10),            -- PDF | JPG | PNG
  doctor_name      VARCHAR(150),
  hospital         VARCHAR(200),
  report_date      DATE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `emergency_contacts`
```sql
CREATE TABLE emergency_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  relationship     VARCHAR(50),
  phone            VARCHAR(15) NOT NULL,
  is_primary       BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

#### `reminder_logs`
```sql
CREATE TABLE reminder_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id      UUID REFERENCES medicines(id),
  family_member_id UUID REFERENCES family_members(id),
  channel          VARCHAR(20),   -- SMS | WHATSAPP | BOTH
  status           VARCHAR(20),   -- SENT | FAILED | ESCALATED
  sent_at          TIMESTAMP DEFAULT NOW(),
  message          TEXT
);
```

### Entity Relationships
```
users
  └── family_members (one user → many members)
        ├── medicines (one member → many medicines)
        │     └── medicine_logs (one medicine → many daily logs)
        ├── vitals (one member → many vitals entries)
        ├── appointments (one member → many appointments)
        ├── medical_reports (one member → many reports)
        └── emergency_contacts (one member → many contacts)
```

---

## 10. Feature Specifications

### Feature 1 — JWT Authentication & Role-based Access

**Description:** Secure registration and login system. Two roles: `FAMILY_HEAD` (full access) and `MEMBER` (view-only for their own data).

**Acceptance Criteria:**
- User can register with name, email, password, phone
- Passwords stored as BCrypt hash (strength 12)
- Login returns a signed JWT token (expiry: 24 hours)
- Protected routes return 401 if no valid token
- Refresh token mechanism to extend session

**JWT Payload:**
```json
{
  "sub": "user-uuid",
  "email": "karma@example.com",
  "role": "FAMILY_HEAD",
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

### Feature 2 — Family Member Management

**Description:** Family head can add, edit, and remove family members. Each member has a profile with health baseline data.

**Acceptance Criteria:**
- Add member with: name, relationship, DOB, blood group, gender, phone, allergies, chronic diseases
- Upload member avatar (stored on Cloudinary)
- Edit any field after creation
- Soft delete (deactivate, not permanent delete)
- Family head can see all members; members can only see their own profile

---

### Feature 3 — Medicine Management & Reminders (Core Feature)

**Description:** Add medicines per family member. Set reminder schedule. Reminders fire via WhatsApp and SMS at exact scheduled times.

**Acceptance Criteria:**
- Add medicine: name, dosage, form, frequency, timing (morning/afternoon/night), with-food flag, start/end date, stock count
- Edit and deactivate medicines
- Daily dose log auto-generated every midnight for active medicines
- Mark dose as TAKEN / SKIPPED from dashboard
- Stock count decrements on each "TAKEN" mark
- Reminder job stored in Upstash Redis on medicine creation
- Spring Scheduler checks Redis every minute
- SMS sent via Fast2SMS at scheduled time with: "Reminder: {member name} needs to take {medicine} {dosage} now."
- WhatsApp sent via Twilio Sandbox with same message
- If dose not marked taken within 30 minutes → escalation alert sent to family head's phone

**Reminder Message Format (WhatsApp):**
```
💊 Medicine Reminder — FamilyCare

👤 Patient: Ramesh Patel (Father)
💊 Medicine: Metformin 500mg
🕘 Time: 9:00 AM
🍽️ Take with food

Tap below when taken ✅
```

---

### Feature 4 — Prescription OCR Scanner (Unique Feature)

**Description:** User takes a photo of a doctor's prescription. App reads the text using OCR and auto-fills the medicine form — no manual typing required.

**Acceptance Criteria:**
- Accept image upload (JPG, PNG) from mobile camera or file system
- Upload image to Cloudinary, get URL
- Send URL to Spring Boot OCR endpoint
- Tesseract4J reads text from image
- Regex parser extracts: medicine names, dosage (mg/ml), frequency keywords (once/twice/thrice, morning/night)
- Return structured JSON array of detected medicines
- React shows pre-filled form for each medicine — user can review and edit
- User confirms → medicines saved to database automatically

**OCR Response Format:**
```json
{
  "detected_medicines": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "timing": { "morning": true, "night": true },
      "confidence": 0.87
    }
  ],
  "raw_text": "...",
  "prescription_url": "https://cloudinary.com/..."
}
```

**Note:** OCR accuracy depends on prescription image quality. Always show confidence score and allow user to edit before saving.

---

### Feature 5 — Vitals Tracking & Smart Trend Alerts (Unique Feature)

**Description:** Log health vitals per family member over time. Visualize trends in charts. Auto-detect dangerous patterns and alert family.

**Vitals Supported:**
| Vital | Unit | Normal Range | Alert Threshold |
|---|---|---|---|
| Blood Pressure (Systolic) | mmHg | < 120 | > 140 for 3 consecutive readings |
| Blood Pressure (Diastolic) | mmHg | < 80 | > 90 for 3 consecutive readings |
| Blood Sugar (Fasting) | mg/dL | 70–100 | > 126 for 2 consecutive readings |
| Weight | kg | BMI-based | > 5kg change in 7 days |
| Pulse | bpm | 60–100 | < 50 or > 110 |
| SpO2 | % | > 95% | < 92% single reading |

**Smart Alert Logic (Java):**
```java
// Trigger alert if last 3 BP readings all exceed threshold
List<Vitals> lastThree = vitalsRepo.findTop3ByMemberOrderByDate(memberId);
if (lastThree.stream().allMatch(v -> v.getSystolic() > 140)) {
    alertService.sendSmsAlert(familyHeadPhone,
        "⚠️ Health Alert: " + memberName + "'s BP has been high for 3 days. Please consult a doctor.");
}
```

**Acceptance Criteria:**
- Log any vital type for any family member
- View 7-day, 30-day, 90-day chart per vital (Recharts line graph)
- Trend alert SMS fires automatically when threshold exceeded
- Latest reading shown on family member card on dashboard
- Export vitals history as PDF (future scope)

---

### Feature 6 — Medicine Stock Tracker & Nearby Pharmacy Finder (Unique Feature)

**Description:** Track remaining pill count. Alert when running low. Show nearby pharmacies on Google Maps in one tap.

**Acceptance Criteria:**
- Stock count shown on each medicine card (green > 10, amber 5–10, red < 5)
- Stock decrements automatically when dose marked TAKEN
- SMS alert sent to family head when stock falls below `low_stock_alert` threshold
- Alert message: "⚠️ Stock Alert: Metformin for Ramesh is running low (3 tablets left). Refill soon."
- "Find Pharmacy" button opens: `https://www.google.com/maps/search/pharmacy+near+me` using browser geolocation
- Manual stock refill option (add purchased quantity to current stock)

---

### Feature 7 — Doctor Visit History & Medical Report Locker

**Description:** Store all doctor visits, prescriptions, and diagnostic reports in one place. Access and share from anywhere.

**Acceptance Criteria:**
- Add doctor visit: date, doctor name, speciality, hospital, diagnosis, notes
- Upload reports: blood test, X-ray, MRI, prescriptions (PDF or image)
- Files stored on Cloudinary, URL saved in database
- Timeline view of health history per member (newest first)
- View PDF reports in-browser (new tab)
- Share report: generate shareable Cloudinary URL (copy to clipboard)
- Search reports by type, date range, doctor name

---

### Feature 8 — One-Tap SOS Emergency Alert (Unique Feature)

**Description:** SOS button sends an instant health summary to all emergency contacts via WhatsApp and SMS, including GPS location.

**Acceptance Criteria:**
- SOS button visible on dashboard and member profile
- On press: browser asks for location permission
- Spring Boot receives: member ID + GPS coordinates
- Fetches member's: blood group, allergies, active medicines list, emergency contacts
- Sends WhatsApp + SMS to ALL emergency contacts within 5 seconds

**SOS Message Format:**
```
🆘 EMERGENCY ALERT — FamilyCare

👤 Patient: Ramesh Patel
🩸 Blood Group: B+
⚠️ Allergies: Penicillin
💊 Current Medicines: Metformin 500mg, Amlodipine 5mg

📍 Last Location:
https://maps.google.com/?q=21.1702,72.8311

⏰ Sent at: 25 Mar 2026, 3:45 PM

— Sent by FamilyCare App
```

---

## 11. API Endpoints

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login, returns JWT
POST   /api/auth/refresh           Refresh JWT token
POST   /api/auth/logout            Invalidate token
GET    /api/auth/me                Get current user profile
```

### Family Members
```
GET    /api/family/members                Get all family members
POST   /api/family/members                Add new family member
GET    /api/family/members/{id}           Get member by ID
PUT    /api/family/members/{id}           Update member
DELETE /api/family/members/{id}           Deactivate member
POST   /api/family/members/{id}/avatar    Upload member avatar
```

### Medicines
```
GET    /api/medicines/member/{memberId}        Get all medicines for member
POST   /api/medicines                          Add new medicine
PUT    /api/medicines/{id}                     Update medicine
DELETE /api/medicines/{id}                     Deactivate medicine
POST   /api/medicines/{id}/mark-taken          Mark today's dose as taken
POST   /api/medicines/{id}/mark-skipped        Mark today's dose as skipped
GET    /api/medicines/{id}/logs                Get dose history
PUT    /api/medicines/{id}/stock               Update stock count (refill)
POST   /api/medicines/scan-prescription        OCR scan prescription image
```

### Vitals
```
GET    /api/vitals/member/{memberId}           Get vitals history (with ?type=BP&days=30)
POST   /api/vitals                             Log new vital reading
GET    /api/vitals/member/{memberId}/latest    Get latest reading per vital type
DELETE /api/vitals/{id}                        Delete a reading
```

### Appointments
```
GET    /api/appointments/member/{memberId}     Get upcoming appointments
POST   /api/appointments                       Add new appointment
PUT    /api/appointments/{id}                  Update appointment
DELETE /api/appointments/{id}                  Delete appointment
```

### Medical Reports
```
GET    /api/reports/member/{memberId}          Get all reports
POST   /api/reports                            Upload report (multipart)
GET    /api/reports/{id}                       Get report details
DELETE /api/reports/{id}                       Delete report
```

### SOS
```
POST   /api/sos/trigger                        Trigger SOS alert (body: memberId, lat, lng)
GET    /api/sos/contacts/member/{memberId}     Get emergency contacts
POST   /api/sos/contacts                       Add emergency contact
PUT    /api/sos/contacts/{id}                  Update contact
DELETE /api/sos/contacts/{id}                  Remove contact
```

### Dashboard
```
GET    /api/dashboard/summary                  Get full dashboard data for all members
GET    /api/dashboard/today-doses              Get today's dose schedule across all members
GET    /api/dashboard/alerts                   Get active alerts (low stock, missed doses, vitals)
```

---

## 12. Security Specification

### Authentication
- JWT tokens signed with HS256 algorithm using a 256-bit secret key
- Token expiry: 24 hours (access) + 7 days (refresh)
- Passwords hashed with BCrypt strength 12
- All `/api/**` routes protected except `/api/auth/**`
- Role-based method security via `@PreAuthorize`

### Data Security
- All API communication over HTTPS only
- Sensitive fields (phone, health data) never logged
- Database credentials only in environment variables
- CORS configured to allow only Vercel frontend domain in production
- Input validation on all request bodies using `@Valid` + Bean Validation annotations
- SQL injection prevention via JPA/Hibernate parameterized queries

### File Security
- Cloudinary uploads use signed URLs
- File type validation: only JPG, PNG, PDF accepted
- Max file size: 10MB per upload
- No executable file types allowed

### CORS Configuration (Spring Boot)
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",              // Local dev
            "https://familycare-gamma.vercel.app" // Production
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        return source;
    }
}
```

---

## 13. Third-Party Integrations

### Fast2SMS (SMS Reminders)
- **API:** `https://www.fast2sms.com/dev/bulkV2`
- **Method:** POST with Authorization header
- **Used for:** Medicine reminders, low stock alerts, vitals alerts
- **Free credits:** ₹50 on signup (~200 SMS)
- **Config key:** `FAST2SMS_API_KEY`

### Twilio (WhatsApp Messages)
- **Sandbox number:** `whatsapp:+14155238886`
- **Used for:** WhatsApp medicine reminders, SOS alerts
- **Setup:** User must join Twilio sandbox by sending "join [code]" to sandbox number
- **Config keys:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

### Cloudinary (File Storage)
- **Used for:** Prescription images, medical report PDFs, member avatars
- **Upload:** Unsigned upload via React using Cloudinary Upload Widget
- **Config keys:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Folders:** `/familycare/prescriptions/`, `/familycare/reports/`, `/familycare/avatars/`

### Tesseract4J (OCR)
- **Library:** `net.sourceforge.tess4j:tess4j:5.8.0`
- **Language data:** English (eng.traineddata)
- **Used for:** Reading prescription images
- **Note:** Include tessdata folder in project resources

### Google Maps (Pharmacy Finder)
- **Method:** Frontend deeplink only — no API key required
- **URL Pattern:** `https://www.google.com/maps/search/pharmacy+near+{lat},{lng}`
- **Geolocation:** Browser's `navigator.geolocation.getCurrentPosition()`

---

## 14. Frontend Pages & Components

### Pages
| Route | Page | Description |
|---|---|---|
| `/` | Landing Page | App intro, features, login/register CTA |
| `/login` | Login | Email + password, JWT stored |
| `/register` | Register | Name, email, phone, password |
| `/dashboard` | Dashboard | Main family health overview |
| `/family` | Family Members | List all members, add new |
| `/family/:id` | Member Profile | Individual member health detail |
| `/medicines/:memberId` | Medicines | Medicine list for a member |
| `/vitals/:memberId` | Vitals | Charts and log entry |
| `/reports/:memberId` | Reports | File upload and timeline |
| `/appointments` | Appointments | Calendar view of upcoming visits |
| `/sos` | SOS Setup | Emergency contacts management |
| `/settings` | Settings | Profile, notification preferences |

### Key Components
```
src/components/
├── layout/
│   ├── Sidebar.jsx           -- Left nav with routes and SOS button
│   ├── TopBar.jsx            -- Greeting, date, quick actions
│   └── MobileNav.jsx         -- Bottom tab bar for mobile
├── dashboard/
│   ├── FamilySummaryCard.jsx -- Member count, today's dose summary
│   ├── TodayDoseGrid.jsx     -- Morning/afternoon/night grid
│   ├── AlertBanner.jsx       -- Low stock, missed dose warnings
│   └── MemberCard.jsx        -- Individual member health snapshot
├── medicines/
│   ├── MedicineCard.jsx      -- Single medicine with stock indicator
│   ├── AddMedicineForm.jsx   -- Form to add medicine manually
│   ├── PrescriptionScanner.jsx -- Camera/upload + OCR result display
│   └── DoseTimeline.jsx      -- Adherence history calendar
├── vitals/
│   ├── VitalsChart.jsx       -- Recharts line graph
│   ├── VitalsLogForm.jsx     -- Quick log entry form
│   └── VitalCard.jsx         -- Latest reading card with trend arrow
├── reports/
│   ├── ReportUploader.jsx    -- Drag/drop or camera upload
│   └── ReportTimeline.jsx    -- Chronological report list
├── sos/
│   └── SOSButton.jsx         -- Big red button with confirmation modal
└── shared/
    ├── Badge.jsx             -- Status pills (TAKEN, MISSED, LOW STOCK)
    ├── Avatar.jsx            -- Member avatar with initials fallback
    ├── LoadingSpinner.jsx    -- Consistent loading state
    ├── EmptyState.jsx        -- Friendly empty state illustration
    └── ConfirmModal.jsx      -- Reusable confirmation dialog
```

---

## 15. Folder Structure

### Backend (Spring Boot)
```
backend/
├── src/main/java/com/familycare/
│   ├── FamilyCareApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── CorsConfig.java
│   │   ├── RedisConfig.java
│   │   └── CloudinaryConfig.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── FamilyController.java
│   │   ├── MedicineController.java
│   │   ├── VitalsController.java
│   │   ├── AppointmentController.java
│   │   ├── ReportController.java
│   │   ├── SosController.java
│   │   └── DashboardController.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── FamilyService.java
│   │   ├── MedicineService.java
│   │   ├── ReminderService.java       -- Redis scheduling logic
│   │   ├── AlertService.java          -- Vitals trend detection
│   │   ├── OcrService.java            -- Tesseract integration
│   │   ├── SmsService.java            -- Fast2SMS calls
│   │   ├── WhatsAppService.java       -- Twilio calls
│   │   ├── CloudinaryService.java
│   │   └── SosService.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── FamilyMemberRepository.java
│   │   ├── MedicineRepository.java
│   │   ├── MedicineLogRepository.java
│   │   ├── VitalsRepository.java
│   │   ├── AppointmentRepository.java
│   │   ├── ReportRepository.java
│   │   └── EmergencyContactRepository.java
│   ├── model/
│   │   ├── User.java
│   │   ├── FamilyMember.java
│   │   ├── Medicine.java
│   │   ├── MedicineLog.java
│   │   ├── Vitals.java
│   │   ├── Appointment.java
│   │   ├── MedicalReport.java
│   │   └── EmergencyContact.java
│   ├── dto/
│   │   ├── request/              -- LoginRequest, RegisterRequest, etc.
│   │   └── response/             -- AuthResponse, DashboardResponse, etc.
│   ├── scheduler/
│   │   └── ReminderScheduler.java  -- @Scheduled cron job
│   ├── security/
│   │   ├── JwtUtil.java
│   │   ├── JwtFilter.java
│   │   └── UserDetailsServiceImpl.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       └── CustomExceptions.java
├── src/main/resources/
│   ├── application.properties
│   ├── application-prod.properties
│   └── tessdata/
│       └── eng.traineddata         -- Tesseract language file
└── pom.xml
```

### Frontend (React + Vite)
```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api/
│   │   ├── axiosInstance.js       -- Axios with JWT interceptor
│   │   ├── auth.api.js
│   │   ├── family.api.js
│   │   ├── medicines.api.js
│   │   ├── vitals.api.js
│   │   └── sos.api.js
│   ├── pages/                     -- One file per route
│   ├── components/                -- See Section 14
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useFamilyMembers.js
│   │   └── useReminders.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── utils/
│   │   ├── formatters.js          -- Date, phone, vitals formatting
│   │   └── validators.js
│   └── styles/
│       └── index.css              -- Tailwind base + custom CSS variables
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 16. Environment Variables

### Backend (`application-prod.properties`)
```properties
# Database
spring.datasource.url=jdbc:postgresql://${SUPABASE_HOST}:5432/postgres
spring.datasource.username=${SUPABASE_USER}
spring.datasource.password=${SUPABASE_PASSWORD}

# Redis (Upstash)
spring.data.redis.url=${UPSTASH_REDIS_URL}

# JWT
jwt.secret=${JWT_SECRET_KEY}
jwt.expiration=86400000

# Cloudinary
cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME}
cloudinary.api-key=${CLOUDINARY_API_KEY}
cloudinary.api-secret=${CLOUDINARY_API_SECRET}

# Fast2SMS
fast2sms.api-key=${FAST2SMS_API_KEY}

# Twilio
twilio.account-sid=${TWILIO_ACCOUNT_SID}
twilio.auth-token=${TWILIO_AUTH_TOKEN}
twilio.whatsapp-from=whatsapp:+14155238886

# App
app.frontend-url=${FRONTEND_URL}
server.port=8080
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=https://familycare.onrender.com/api
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=familycare_unsigned
```

---

## 17. Build & Deployment

### Backend — Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo, select `/backend` folder
4. Build command: `./mvnw clean package -DskipTests`
5. Start command: `java -jar target/familycare-0.0.1-SNAPSHOT.jar`
6. Add all environment variables in Render dashboard
7. Auto-deploy enabled on every push to `main`

**Important:** Add a `render.yaml` for infrastructure-as-code:
```yaml
services:
  - type: web
    name: familycare-api
    env: java
    buildCommand: ./mvnw clean package -DskipTests
    startCommand: java -jar target/familycare-0.0.1-SNAPSHOT.jar
    envVars:
      - key: SPRING_PROFILES_ACTIVE
        value: prod
```

### Frontend — Deploy to Vercel

1. Push code to GitHub
2. Import project on Vercel, select `/frontend` folder
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables in Vercel dashboard
7. Auto-deploy on every push to `main`

### Database — Supabase Setup

1. Create project on Supabase
2. Run all `CREATE TABLE` statements in SQL Editor
3. Copy connection string to Render environment variables
4. Enable Row Level Security (RLS) for production

---

## 18. 30-Day Development Timeline

| Week | Days | Focus | Deliverable |
|---|---|---|---|
| Week 1 | 1–7 | Foundation | Auth, DB schema, Family CRUD, Medicine CRUD APIs, React login + dashboard skeleton |
| Week 2 | 8–14 | Reminders & Vitals | Redis scheduler, SMS/WhatsApp integration, Vitals APIs, Recharts graphs |
| Week 3 | 15–21 | Unique Features | OCR scanner, Stock tracker + pharmacy finder, SOS system, Medical reports |
| Week 4 | 22–30 | Polish & Demo | Full UI polish, mobile responsive, end-to-end testing, demo data, presentation prep |

---

## 19. Out of Scope

The following features are intentionally excluded from v1.0 to ensure the project is completed within the timeline:

- Payment gateway / subscription billing
- Real-time chat between family members
- Video call with doctor
- Integration with ABHA health ID (Eka Care style)
- Push notifications (web/mobile app notifications)
- Android / iOS native app
- AI-powered medicine interaction checker
- Multi-language support (Hindi, Gujarati) — frontend English only for v1
- Pharmacy ordering / medicine delivery
- Insurance claim management

---

## 20. Future Scope

These are features that can be added post-submission to turn this into a real product:

- **Android App** — React Native version with push notifications
- **ABHA Integration** — Link to India's national health ID
- **Medicine Interaction Checker** — Flag dangerous drug combinations using an open drug database
- **AI Health Insights** — GPT-powered weekly health summary from vitals data
- **Multilingual UI** — Hindi and Gujarati support for elderly users
- **Pharmacy Integration** — Order medicine refills from 1mg/Netmeds with one tap
- **Doctor Sharing Portal** — Shareable health report link for doctor appointments
- **Wearable Sync** — Pull vitals from Fitbit / Apple Watch / Google Fit
- **SaaS Monetization** — Free plan (1 family, 3 members) + Pro plan (unlimited members, PDF exports)
- **WhatsApp Bot** — Elderly user replies "taken" to WhatsApp reminder to auto-mark dose

---

*End of SPEC.md — FamilyCare v1.0*

> This document is the single source of truth for the FamilyCare project.  
> All development decisions should reference this spec.  
> Last reviewed: March 2026
