# FamilyCare

A multi-user health management web app for Indian families. One tech-savvy member sets up medicines, vitals, and reminders; elderly relatives receive WhatsApp reminders without installing anything.

**Live:** [familycare.vercel.app](https://familycare.vercel.app) · **API:** [familycare-api.onrender.com](https://familycare-api.onrender.com)

> Render's free tier sleeps after 15 minutes of inactivity. The first request after a cold start takes ~30 seconds.

## Demo

<!--
  Record a 30-45s screen capture and drop the .gif or .mp4 in this section.
  See docs/DEMO_RECORDING.md for the exact 6-shot script.
-->

> 📹 _Demo recording coming — see [docs/DEMO_RECORDING.md](docs/DEMO_RECORDING.md) for the script._

---

## Features

1. **Medicine reminders via WhatsApp** — scheduled per family member, no app install needed
2. **Prescription OCR** — Tesseract + heuristic parser auto-fills medicine forms from photos
3. **Family dashboard** — every member's adherence and vitals in one view
4. **Vitals trend alerts** — 3 consecutive high BP / sugar readings escalate to family head
5. **Stock tracker + pharmacy finder** — low-stock SMS + Google Maps pharmacy links
6. **Medical report locker** — Cloudinary-backed PDF/image storage with timeline
7. **One-tap SOS** — WhatsApp blast to all emergency contacts with GPS, blood group, and active medicine list

---

## Tech stack

**Backend** — Java 17 · Spring Boot 3.5 · Spring Security + JWT · Spring Data JPA · PostgreSQL (Supabase) · Redis (Upstash) · Twilio WhatsApp · Cloudinary · Tesseract4J · Gemini API

**Frontend** — React 19 · Vite · TanStack Query · React Hook Form + Zod · Tailwind CSS · Recharts · Axios · React Router v7 · Tesseract.js · Framer Motion · Leaflet

**Infra** — Render (backend) · Vercel (frontend) · GitHub Actions CI · Docker

---

## Getting started

### Prerequisites

- JDK 17+
- Node 20+
- A free Supabase Postgres instance
- A free Upstash Redis instance
- (Optional for full feature set) Twilio sandbox, Cloudinary, Gemini API key

### 1. Clone

```bash
git clone https://github.com/<your-username>/familycare.git
cd familycare
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in your values
./mvnw spring-boot:run
```

Backend boots on `http://localhost:8080`. Swagger UI at `http://localhost:8080/swagger-ui.html`.

Required env vars (see `backend/.env.example`):

```
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=...
SPRING_DATA_REDIS_URL=rediss://default:<token>@<host>:6379
JWT_SECRET=<256-bit secret>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
GEMINI_API_KEY=...
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:8080/api
npm install
npm run dev
```

Frontend boots on `http://localhost:5173`.

---

## Project layout

```
familycare/
├── backend/          Spring Boot application (Maven)
│   ├── src/main/java/com/familycare/
│   │   ├── controller/   REST endpoints (15)
│   │   ├── service/      Business logic
│   │   ├── repository/   Spring Data JPA
│   │   ├── model/        JPA entities
│   │   ├── dto/          Request/response DTOs
│   │   ├── security/     JWT filter + utils
│   │   ├── scheduler/    @Scheduled reminder loop
│   │   └── config/       Security, CORS, Redis, Cloudinary
│   └── src/test/java/    JUnit + MockMvc tests
└── frontend/         React + Vite SPA
    └── src/
        ├── pages/        Route components
        ├── components/   Feature components
        ├── api/          Axios + React Query hooks
        ├── context/      Auth context
        └── hooks/
```

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system diagram + reminder flow
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — short ADRs explaining *why* (JWT in localStorage, regex OCR, Render free tier, etc.)
- [`SPEC.md`](SPEC.md) — original product spec
- [`CLAUDE.md`](CLAUDE.md) — conventions for the AI assistant

---

## Testing

**Backend:**
```bash
cd backend
./mvnw test
```

**Frontend:**
```bash
cd frontend
npm test
```

---

## Deployment

The repo deploys automatically:

- Push to `main` → GitHub Actions runs lint + build + tests
- Render redeploys the backend Docker image
- Vercel redeploys the frontend

Production env vars are set in each platform's dashboard (never in the repo).

---

## API

All endpoints are under `/api/*` and require a `Authorization: Bearer <jwt>` header except `/api/auth/**` and `/api/health`.

See Swagger UI at `/swagger-ui.html` for the full contract, or [`CLAUDE.md`](CLAUDE.md#7-all-api-endpoints) for the endpoint summary.

---

## License

Educational/portfolio project. Not licensed for redistribution.
