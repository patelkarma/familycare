# Architecture

A high-level view of how the pieces fit together. For why each piece was chosen, see [DECISIONS.md](./DECISIONS.md).

## System diagram

```mermaid
flowchart LR
    user["👤 Family head<br/>(browser)"]
    elder["👵 Elderly relative<br/>(WhatsApp on basic phone)"]

    subgraph vercel["Vercel (frontend)"]
        spa["React 19 SPA<br/>Vite · TanStack Query · Tailwind"]
    end

    subgraph render["Render (backend)"]
        api["Spring Boot 3.5<br/>Java 17 · JWT · @Scheduled"]
    end

    subgraph data["Managed services"]
        pg[("PostgreSQL<br/>Supabase")]
        redis[("Redis<br/>Upstash")]
    end

    subgraph external["External APIs"]
        twilio["Twilio WhatsApp<br/>Sandbox"]
        cloud["Cloudinary<br/>Reports + avatars"]
        gemini["Gemini<br/>Health assistant"]
    end

    user -->|HTTPS + JWT| spa
    spa -->|/api/* + Bearer token| api
    api --> pg
    api --> redis
    api -->|Send message| twilio
    api -->|Upload file| cloud
    api -->|Chat completion| gemini
    twilio -->|WhatsApp| elder
    elder -->|Inbound webhook| api
```

## Request lifecycle: medicine reminder

```mermaid
sequenceDiagram
    participant FH as Family head
    participant SPA as React SPA
    participant API as Spring Boot
    participant DB as PostgreSQL
    participant R as Redis
    participant SCH as @Scheduled (every minute)
    participant TW as Twilio
    participant E as Elderly relative

    FH->>SPA: Add medicine + timing
    SPA->>API: POST /api/medicines
    API->>DB: INSERT medicine
    API->>R: Stage reminder jobs<br/>reminder:{ids}:{timing}
    Note over SCH: Every minute
    SCH->>R: Pop due jobs
    SCH->>DB: Lookup phone + medicine
    SCH->>TW: Send WhatsApp
    TW->>E: 💊 "Time for Crocin 500mg"
    E->>TW: "Done" (reply)
    TW->>API: POST /api/webhooks/whatsapp
    API->>DB: Mark MedicineLog as TAKEN
    API->>DB: Decrement stock_count
    alt stock_count <= low_stock_alert
        API->>TW: Send low-stock alert to family head
    end
```

## Layered structure (backend)

```
┌──────────────────────────────────────┐
│  Controller   ← REST + DTO mapping   │  @RestController, @Valid
├──────────────────────────────────────┤
│  Service      ← business logic       │  @Service, @Transactional
├──────────────────────────────────────┤
│  Repository   ← data access          │  Spring Data JPA
├──────────────────────────────────────┤
│  Model        ← JPA entities         │  @Entity
└──────────────────────────────────────┘
```

Cross-cutting:
- `JwtFilter` runs before every authenticated request
- `GlobalExceptionHandler` translates domain exceptions to HTTP status codes
- `@Scheduled` jobs run on a separate thread pool, isolated from the request path

## Why this shape

- **Stateless API + JWT** so Render can scale horizontally and free-tier sleeps don't drop sessions.
- **Redis as a delay queue** instead of a job framework (Quartz/Temporal) — the cron is one minute; complexity isn't justified.
- **Frontend-only PDF/image uploads** go straight to Cloudinary with a signed preset; the API never sees the bytes. Saves Render bandwidth.
- **One Spring Boot app, no microservices.** A 30-day project doesn't have a microservice problem.

## What's deliberately *not* here

- No service mesh, no Kafka, no GraphQL — see [DECISIONS.md](./DECISIONS.md) for why.
- No SMS fallback yet — WhatsApp via Twilio sandbox covers the demo. Fast2SMS is on the roadmap.
- No real-time push from server to SPA. WebSocket would be overkill for the dose update cadence.
