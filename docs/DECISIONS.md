# Decision Log

Short notes on choices that aren't obvious from the code, written when the decision was fresh. Newest first.

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

**Mitigations.**
- `/api/health` is unauthenticated and trivially cheap, so it can be pinged externally without exposing anything.
- A free uptime service (UptimeRobot / cron-job.org) hits `/api/health` every 10 minutes during expected demo windows.
- The frontend shows a "Waking up the server..." state if the first request takes >3s, so the cold start is visible instead of looking broken.

**Why not pay.** This is a portfolio project. The day a real user complains about latency, $7/mo on Render's starter tier removes the issue entirely. Until then, the constraint is a demo problem, not a product problem.

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
