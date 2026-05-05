# Decision Log

Short notes on choices that aren't obvious from the code, written when the decision was fresh. Newest first.

---

## ADR-009: Self-member identity mirroring (one user, two identities)

**Status:** Accepted · **Date:** 2026-04-22

**Context.** A family head is *also* a patient. They take their own medicines, have their own vitals, and need their own SOS button. But they are *also* the account owner. Two parallel identities (`User` + `FamilyMember`) for the same human is a footgun: change your name on the profile page and your dashboard greeting still says the old name.

**Decision.** Auto-create a `FamilyMember` row at registration time tagged as the "Self" member, linked to the `User` via `linkedUserId`. Mirror identity fields (name, phone, WhatsApp, avatar) bidirectionally on every update path.

**Why mirror, not join.** A SQL view that derives the FamilyMember row from User would be cleaner conceptually. But the FamilyMember table has fields that don't apply to the User model (relationship, blood group, allergies, chronic diseases) and the Vitals/Medicines/EmergencyContact tables all FK to FamilyMember — making User the source of truth would force a JOIN on every clinical query. Mirroring keeps the hot path single-table.

**Where the mirroring lives.**
- `AuthService.register` — creates the linked Self FamilyMember
- `AuthService.updateProfile` + `removeAvatar` — pushes user-side changes to the linked FamilyMember
- `FamilyService.updateMember` — when the edited member is the Self member, pushes back to User
- `FamilyService.removeAvatar` — same direction

**The bug this caused (and why the test exists).** First version mirrored phone + WhatsApp on `updateMember` but not name. Editing the Self member's name from the Family page changed the family card but left the dashboard greeting on the old name — caught by a recruiter-style demo screenshot. Fixed by adding name to the mirror set; a frontend `setUser` refetch on Self-member edit closes the loop. `AuthFlowIntegrationTest` asserts the linked FamilyMember exists after register.

**When this changes.** When a single User can manage multiple families (caregiver-of-caregivers pattern). At that point the Self relationship becomes 1-to-many and mirroring breaks down — switch to a derived view.

---

## ADR-008: Client-side OCR with Tesseract.js, not server-side

**Status:** Accepted · **Date:** 2026-03-12

**Context.** Prescription OCR has two natural homes: server-side (Tess4J in Java, the spec's original choice) or client-side (Tesseract.js in the browser).

**Decision.** Client-side. The browser does OCR; the server only sees the parsed medicine list.

**Why.**
- **Render free tier has 512 MB RAM.** Tess4J + a single trained language file (`eng.traineddata` ~22 MB plus ~70 MB peak RSS during recognition) is a meaningful fraction of the budget. A burst of OCR uploads OOM-kills the dyno; the medicine reminder cron dies with it.
- **Cloudinary upload latency is the slowest part.** A 4 MB photo over 4G takes 3-4s to reach Cloudinary, then another 1-2s round-trip to download from the server, then ~1-2s of OCR. Doing OCR client-side overlaps with the upload — the user sees parsed medicines in the same wall-clock window.
- **The server doesn't need the bytes.** Once the structured medicine list is parsed, the prescription image is metadata — stored on Cloudinary, referenced by URL, never re-processed. There's no reason to push 4 MB through the API just to throw it away.
- **OCR fails visibly in either place.** A Tesseract.js misread looks the same as a Tess4J misread; the dictionary + regex parser ([ADR-004](#adr-004-regex-based-prescription-parser-not-an-llm)) lives behind it either way. Moving the OCR to the browser doesn't change the fail mode.

**Tradeoff accepted.** Browsers without WebAssembly support fail (none in the support matrix). Tesseract.js bundle is ~2.5 MB gzip — lazy-loaded on the prescription scanner page so the dashboard isn't paying for it.

**When this changes.** When users start uploading messy handwritten prescriptions and Tesseract.js's accuracy becomes the bottleneck. Move to a vision LLM (Gemini Vision) called server-side; the parser seam ([`PrescriptionParser.parse`](../backend/src/main/java/com/familycare/service/PrescriptionParser.java)) doesn't change.

---

## ADR-007: Bucket4j rate limiting on auth + SOS

**Status:** Accepted · **Date:** 2026-05-05

**Context.** `/api/auth/login` is a brute-force target. `/api/auth/register` is a bot-signup target. `/api/sos/trigger` fires WhatsApp to up to 10 emergency contacts per call — an abuser with a stolen JWT could blast every contact in a family until Twilio rate-limits us. None of these were protected.

**Decision.** Token-bucket rate limiting via Bucket4j, enforced by a `HandlerInterceptor` that runs before the controller. Per-rule limits:
- `auth.login` — 5/min/IP (catches brute force; legitimate "did I capslock?" stays under)
- `auth.register` — 3/hour/IP (real users register once, ever)
- `sos.trigger` — 5/min/user (defense in depth on top of the existing 60s server-side cooldown)

**Why in-memory, not Redis-backed.** FamilyCare runs on a single Render dyno. Adding `bucket4j-redis` means a network round-trip per request for zero correctness gain — multi-dyno is a future-day problem. The `RateLimitRule` enum is the seam; swapping `Bucket.builder()` for `LettuceBasedProxyManager` is a one-class change when we scale.

**Why an interceptor, not a filter.** Spring's `HandlerInterceptor` runs *after* `JwtFilter`, which means `/sos/trigger` can rate-limit by authenticated user (the more useful key — a compromised account is one user, not one IP). Auth endpoints are pre-auth so they fall back to the IP key.

**Spec compliance.** 429 responses ship a `Retry-After` header with the bucket's seconds-to-refill, computed from `tryConsumeAndReturnRemaining`'s `nanosToWaitForRefill`. The frontend's axios error interceptor reads it and surfaces a "try again in N seconds" toast instead of a generic error.

**Observable.** Each rejection increments `familycare_ratelimit_rejected_total{rule}` so a Grafana series per rule shows brute-force attempts vs bot-signup vs SOS abuse independently. Locked in by `ActuatorPrometheusIntegrationTest` and `RateLimitServiceTest`.

**Memory growth.** `ConcurrentHashMap` entries don't expire — at most ~64 bytes/IP/rule. A million unique IPs costs &lt; 200 MB. If a real abuser shows up, swap to Caffeine with `expireAfterAccess=2h`.

---

## ADR-006: Resilience4j circuit breaker around Twilio + Gemini

**Status:** Accepted · **Date:** 2026-05-05

**Context.** Two outbound dependencies fail in different ways:
- **Twilio sandbox** throttles unpredictably and occasionally returns 5xx during outages. Without protection, every reminder cycle keeps hammering the dead provider, eats request-thread time, and surfaces a confusing error.
- **Gemini free tier** quota-exhausts mid-conversation. The first 10 chat turns work, the 11th 429s, the 12th 429s — each one a multi-second retry from `RestTemplate`'s default behavior.

**Decision.** Wrap both with `@CircuitBreaker` + `@Retry` from `resilience4j-spring-boot3`. One breaker per provider (named `twilio` and `gemini`), shared across every callsite, exposed as a Prometheus gauge so the dashboard sees CLOSED → OPEN transitions.

**Config (in `application.properties`):**
- Failure threshold: 50% of last 10 calls (minimum 5 calls counted)
- Wait in OPEN state: 30s for Twilio, 60s for Gemini (LLM cold-start is the typical transient)
- Retry: 1 retry with 1s/2s backoff
- **`BadRequestException` is excluded from retries.** That's auth/quota/404 — a user/config error, not a blip. Retrying just doubles the angry log entry.

**Why annotations live on public methods, not private ones.** Spring AOP only intercepts external proxy calls. The first iteration put `@CircuitBreaker` on `GeminiClient.invoke()` (private), and a self-invocation from `chat()` to `invoke()` bypassed the proxy entirely — the breaker would have never seen a single call. Caught it in code review against the Resilience4j docs; moved annotations to `chat()` and `chatWithImage()` with matching fallback methods.

**Fallback semantics.**
- WhatsApp: returns `false`. Callers (reminder scheduler, SOS fan-out) already log a failed dose as `FAILED`, so a tripped breaker is indistinguishable from a real Twilio error from their perspective. Counter `familycare_whatsapp_circuit_fallback_total` separates the two for observability.
- Gemini: returns `"AI assistant is temporarily unavailable. Please try again in a minute."` — the chat UI renders that as a normal assistant message instead of a stack trace.

**When this changes.** When we add a second LLM provider (Ollama for local dev, Anthropic as a paid fallback), the breaker config moves to per-provider and the fallback chain becomes "primary → secondary → degrade", not "primary → degrade". Today the single-provider fallback is enough.

---

## ADR-005: WhatsApp-only reminders (no SMS fallback yet)

**Status:** Accepted · **Date:** 2026-04-28

**Context.** The original spec called for dual-channel reminders — WhatsApp via Twilio + SMS via Fast2SMS — so that elderly relatives without smartphones still get a fallback.

**Decision.** Ship WhatsApp-only. Defer Fast2SMS until a real user actually needs it.

**Why.** Twilio sandbox already proves the channel works end-to-end. Adding Fast2SMS triples the surface area (second template, second rate limit, second deliverability story) for a feature no current user has asked for. Speculative reliability work is worse than missing reliability work — at least missing work is visible.

**Consequence.** README, CLAUDE.md, and the dashboard all say "WhatsApp" instead of "WhatsApp + SMS." The day a real user lands on a feature phone, this becomes a 1-day task, not a debate.

---

## ADR-004: Regex-based prescription parser, not an LLM

**Status:** Accepted · **Date:** 2026-03-15

**Context.** Prescription OCR has two stages: turn an image into text, then turn text into structured medicines. Stage 1 is Tesseract. Stage 2 could be regex + a curated Indian medicine dictionary, or a Gemini call.

**Decision.** Regex + dictionary.

**Why.**
- **Cost.** A Gemini call per scan is free today but unpredictable at any scale. Regex is free forever.
- **Latency.** Regex is sub-millisecond. A network round-trip to Gemini is ~1-2s and adds a failure mode.
- **Determinism.** A regex parser misbehaves the same way every time. An LLM parser is non-deterministic and harder to test.
- **Honesty about coverage.** Indian prescriptions follow a narrow pattern (`Tab. Crocin 500mg BD x 5 days`). Regex handles 70% of clean inputs reliably; an LLM might handle 90% but with confident-sounding hallucinations on the 10% it doesn't. Regex *fails visibly*.

**When this changes.** When users start uploading messy handwritten prescriptions and the dictionary's misses become user complaints. The seam is `PrescriptionParser.parse()` — swap one class.

---

## ADR-003: Render free tier despite cold starts

**Status:** Accepted · **Date:** 2026-02-20

**Context.** Render's free tier sleeps after 15 minutes of inactivity. The first request after sleep takes 30+ seconds. Demo days are not 30-second-tolerant.

**Decision.** Stay on free tier. Mitigate, don't pay.

**Mitigations (in place).**
- `/api/health` is unauthenticated and trivially cheap, so it can be pinged externally without exposing anything.
- An **UptimeRobot monitor pings `/api/health` every 5 minutes**, well under Render's 15-minute sleep threshold. Free tier, no code in repo, ~2-min one-time setup.
- The README explicitly warns about the cold-start window so a recruiter clicking the live link at the rare moment UptimeRobot misses doesn't read the latency as a broken site.

**Why not pay.** This is a portfolio project. The day a real user complains about latency, $7/mo on Render's starter tier removes the issue entirely. Until then, the constraint is a demo problem, not a product problem.

**Future work.** A "Waking up the server…" UI state in the frontend that surfaces during the >3s cold-start window — currently the request just hangs silently if UptimeRobot has missed a ping. Small frontend task; not a blocker.

---

## ADR-002: JWT in localStorage, not httpOnly cookies

**Status:** Accepted, with known tradeoff · **Date:** 2026-02-05

**Context.** JWT can live in `localStorage` (read by JavaScript) or in an `httpOnly` cookie (not readable by JS, sent automatically). Cookies are the standard recommendation for resisting XSS-driven token theft.

**Decision.** localStorage, accessed via the Axios request interceptor.

**Why.**
- **CORS simplicity.** The frontend (Vercel) and backend (Render) live on different origins. `httpOnly` cookies across origins require `SameSite=None; Secure` plus careful CSRF handling, which expands the surface area beyond what a single-developer project can audit confidently.
- **Stateless API.** The backend is fully stateless (`SessionCreationPolicy.STATELESS`). Cookie-based auth tends to drift toward server sessions over time.
- **Mobile path is the same.** If a React Native client is ever added, header-based JWT works identically; cookies don't.

**Risk we accept.** A successful XSS attack can read the token. Mitigations: strict input validation server-side, no `dangerouslyInnerHTML`, no untrusted third-party scripts. Token TTL is 24h, so a stolen token has bounded blast radius.

**When this changes.** If we ever serve sensitive financial or PHI data beyond medicine names, switch to `httpOnly` cookies and accept the CORS complexity.

---

## ADR-001: One Spring Boot monolith

**Status:** Accepted · **Date:** 2026-01-10

**Context.** "Should we split auth, reminders, and OCR into separate services?"

**Decision.** No. One Spring Boot app, package-by-feature inside.

**Why.** A solo developer with a 30-day timeline does not have a service-boundary problem. They have a *delivery* problem. Microservices solve organizational scaling, not technical scaling at this stage.

**When this changes.** When a second engineer joins and we trip over each other in the same files, *or* when one feature (likely OCR) needs independent scaling. Until either of those, the monolith is the simpler tool.
