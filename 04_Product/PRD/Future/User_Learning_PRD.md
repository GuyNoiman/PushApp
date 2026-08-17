# PRD — User Learning

Status: **Future Vision** — direction captured; not approved for implementation.
Stage: **Future**.
Owner: founder + AI product team.
Source: mobile-authored “Daily Step Reporting & Weekly Review” draft, 2026-08-10.
Related: `../Weekly_Review_PRD.md`, `../Daily_Step_Reporting_PRD.md`, AI Coach, profiling/privacy
principles, account export/deletion, and future analytics.

---

## 1. Purpose

Over multiple Journeys, PushApp may learn durable but revisable patterns that improve future planning.
The system must distinguish detailed Journey Memory from a minimal cross-Journey user model and must
represent conclusions as hypotheses, not permanent facts.

## 2. Direction

### Journey Memory

May retain Journey-scoped Step history, structured report outcomes, postponement patterns, scheduling
behavior, and weekly observations for the Journey's lifetime, subject to privacy/retention rules.

### User-level learning

Only recurring, meaningful, cross-Journey patterns may be promoted. Example hypotheses include stronger
morning consistency, repeated difficulty with large Steps, or improved follow-through with chosen social
support.

Each insight conceptually includes:

- hypothesis;
- confidence/evidence strength;
- supporting and contradicting evidence;
- scope/domain applicability;
- created/updated/last-confirmed time;
- provenance and deletion linkage.

Confidence may strengthen, weaken, change, or disappear. A single event generally does not create a
durable user-level conclusion.

## 3. Weekly learning cycle

During the week, approved minimal structured signals are collected. At week close, a future learning
system may evaluate whether hypotheses should be created, strengthened, weakened, modified, or removed.
Weekly Review may consume Journey-level output without implementing this long-term model.

## 4. Privacy guardrails

- Do not copy every raw event into long-term memory.
- Existing `Other` free text is on-device-only and excluded.
- Raw reasons, reflections, coach conversations, location/calendar results, and sensitive social content
  are not promoted without a new explicit security/privacy decision.
- Prefer derived structured aggregates with traceable provenance and deletion behavior.
- The user must eventually be able to inspect, correct, dismiss, and delete learned hypotheses.
- Export and account deletion must include/remove user-model data and derived references.

## 5. Promotion gate

Before moving this PRD out of `Future/`, define:

- approved signal taxonomy and domain sensitivity;
- hypothesis schema, confidence semantics, thresholds, decay, and contradictions;
- local/cloud processing boundary and AI provider;
- user visibility, correction, consent, and explanation UX;
- retention, export, deletion, and audit policy;
- safety rules for sensitive domains and false inferences;
- an explicit prohibited-inference taxonomy covering health, disability, religion, sexuality, intimate
  relationships, employment status, and other sensitive traits unless a separately reviewed feature has
  a necessary purpose and explicit consent;
- purpose-specific consent, strict user/tenant authorization, human-readable provenance, and a rule
  against solely automated consequential decisions;
- cost/latency controls and evaluation methodology;
- security/privacy and product-guardian approval.

No current feature should invent a permanent user model or transmit free text merely because this Future
direction exists.
