# PRD — Adaptive Communication Engine

Status: **Future Vision** — direction captured; not approved for implementation.
Stage: **Future / Commercial**.
Owner: founder + AI product team.
Related: `../Smart_Notification_Timing_PRD.md`, `../Communication_Style_Profile_PRD.md`,
`../Journey_Reminder_Management_PRD.md`, Support Circle, Calendar, and Location.

---

## 1. Purpose

The long-term communication layer may choose not only when to communicate, but which approved mechanism
best supports real-life Journey progress while minimizing interruption.

## 2. Future mechanisms

- low-frequency aggregate notification;
- contextual in-app motivation;
- user-approved invitation to seek Support Circle help;
- Calendar free/busy eligibility;
- coarse, explicitly consented location eligibility;
- future approved channels.

## 3. Guardrails

- No communication exists solely to increase opens or time in app.
- Every intervention requires an actionable Journey context or explicitly consented social event.
- Silence is valid; the engine may choose no intervention.
- Never increase pressure/frequency after non-response.
- Support Circle outreach requires specific Journey-owner consent, accepted recipients, preview/clear rule,
  revocation, rate limits, and a separate security/privacy PRD.
- Calendar/location require separate opt-in and transient minimum data; refusal preserves time-only behavior.
- Never use sensitive free text or inferred vulnerability to choose persuasive language/channel.
- User controls, reset, explanation, export, deletion, and auditability are mandatory.

## 4. Promotion gate

Before active development, split each new channel into its own PRD and define eligibility, consent,
frequency, data flow, outcome, failure, abuse, and user-control contracts. Complete product-guardian,
security/privacy, store-compliance, and cost review. Do not implement a generic channel selector from this
vision document alone.

