# PRD — Operational Monitoring Admin Console

Status: **Approved product specification — ready for architecture and implementation planning.**  
Stage: **MVP release-safety foundation. Required before Gradual Release.**  
Owner: Founder / Product Operations.  
Decision date: 2026-08-25.  
Related: `../Privacy_Contract_With_The_User.md`, `Notification_Center_PRD.md`,
`Inbox_Direct_Messaging_PRD.md`, `Coach_Conversation_PRD.md`,
`Tools_Documentation/Mirror_Feedback_PRD.md`, `Invite_Friend_Acquisition_PRD.md`, and the future
separate **Gradual Release and Rollback** PRD.

---

## 1. Purpose

Give authorized PushApp operators one internal web console that answers four questions:

1. Is PushApp healthy and functioning correctly now?
2. Is PushApp achieving the product outcomes we chose to measure?
3. What problems or concerns have users reported to us?
4. Which app and over-the-air versions exist, who is running each one, and what changed?

The console must make serious problems immediately visible without turning PushApp into a surveillance
product. It is an operational safety system, not a reason to collect every available event.

## 2. Problem

PushApp currently has no crash SDK, operational monitoring, product-analytics pipeline, unified report
intake, or gradual release. Every update reaches its target audience without a reliable way to know whether
it introduced crashes, blocked a core flow, exhausted storage, or degraded the Coach.

The absence is especially risky because PushApp contains unusually sensitive material: Coach conversations,
Dream and Journey free text, private Tool responses, confidential Mirror contributions, and end-to-end
encrypted messages. A generic monitoring SDK can attach strings, breadcrumbs, route parameters, request
bodies, screenshots, or state unless explicitly prevented.

The required answer is not several disconnected vendor dashboards. The founder needs one coherent operational
surface, with the minimum number of external services and a free-first cost posture.

## 3. Product principles

1. **One console, few sources.** The initial experience is one PushApp-owned web console.
2. **One new external vendor at most.** The initial recommendation is Sentry for crash/error monitoring;
   Supabase and Expo/EAS are already part of the system.
3. **Health before detail.** The opening screen reveals whether intervention is needed in seconds.
4. **Unknown is not healthy.** Missing or stale monitoring data is gray, never green.
5. **Outcome before engagement.** Product KPIs measure progress and usefulness, not time in app.
6. **Allowlist, not redaction hope.** Only explicitly permitted fields may leave the device.
7. **No silent cost.** No automatic paid upgrade or pay-as-you-go budget.
8. **No personal activity viewer.** The console is not a timeline of what one person did.
9. **Every administrative action is accountable.** Sensitive access and changes are audited.
10. **Provider replaceability.** Vendor-specific APIs sit behind narrow adapters.

## 4. Scope

### 4.1 In scope

- Internal web console with four primary tabs:
  - System Health;
  - KPIs;
  - User Reports;
  - Versions.
- Multiple authorized administrators with role-based access.
- Crash, fatal error, startup, availability, capacity, and core-service health signals.
- A small versioned product-event taxonomy for approved KPIs.
- In-app report intake, optional screenshot attachment, and email-based follow-up.
- App-build and over-the-air update registry.
- Active-issue detection, severity, ownership, notes, resolution, and history.
- Privacy controls, data retention, quota monitoring, and audit evidence.
- Data required by the later Gradual Release feature: health by release, build, update, platform, channel,
  and feature flag.

### 4.2 Out of scope

- Performing a gradual release, increasing its percentage, or rolling it back.
- A/B testing or automated product experimentation.
- Session replay, automatic screenshots, heatmaps, keystroke capture, or full navigation replay.
- Reading private user content for analytics or debugging.
- An administrator-facing per-user activity history.
- Optimizing time in app, session count, daily active users, retention, or notification opens as terminal goals.
- Sending support replies from a new in-console mail system. The initial console opens a prepared email in the
  operator's existing mail client.
- Automatically suspending a reported user. Moderation automation remains a separate future decision.
- Replacing provider-native engineering investigation screens. The PushApp console links to the external
  issue only for operators who are separately authorized.

## 5. Navigation and information architecture

The console is a responsive internal website, not a screen inside the consumer mobile app.

Primary navigation contains exactly four product tabs:

1. **System Health** — default landing page.
2. **KPIs**.
3. **User Reports**.
4. **Versions**.

Administration, access management, data-contract status, quota settings, and the audit log live behind a
settings control rather than becoming a fifth primary tab.

Global filters where relevant:

- time range;
- platform;
- app version;
- build number;
- runtime/update identifier;
- release channel;
- feature-flag state;
- internal/test users versus ordinary users.

Country may be shown only as an approved aggregate with a minimum cohort threshold. No precise location is
collected for this feature.

## 6. Tab 1 — System Health

### 6.1 Opening hierarchy

The top of the default screen contains:

1. overall state: **Healthy / Attention needed / Incident**;
2. the primary technical number;
3. service-health cards;
4. active issues, ordered by severity;
5. resolved-issue history below or behind a secondary view.

### 6.2 Primary technical number

The headline is:

> **Percentage of active installations without a blocking failure in the last 24 hours**

Always show the numerator and denominator beside it, for example:

> 98.7% healthy — 1 of 76 active installations affected

An installation is used rather than an account. Its telemetry identifier is a random installation identifier
that is not derived from an email, username, account ID, advertising ID, or device hardware identifier.

A blocking failure initially includes:

- native crash;
- unhandled JavaScript exception that prevents continuation;
- failed or unrecoverable app startup;
- persistent blank-screen watchdog failure;
- repeated authentication failure that prevents entry;
- detected local-data unreadability or corruption;
- repeated encryption/decryption infrastructure failure that blocks messaging;
- a core backend outage that prevents the primary experience.

The exact list is versioned. Adding a new blocking class requires a contract change, not an arbitrary dashboard
query.

### 6.3 Service cards

Initial registry:

- Mobile application;
- Supabase database/API;
- Authentication;
- Storage;
- Coach/AI gateway;
- End-to-end encrypted messaging transport;
- Notification delivery infrastructure when remote push ships;
- Expo/EAS updates;
- backups and recovery checks;
- Apple and Google sign-in dependencies;
- scheduled/background jobs;
- capacity and cost.

The registry is configuration-driven. A service can be added without redesigning the page.

Each card shows:

- service name;
- state;
- most important service-specific metric;
- last successful check;
- trend against the comparable previous period;
- number and highest severity of active issues;
- a drill-down link.

### 6.4 Status model

| State | Meaning |
|---|---|
| Green — Healthy | Checks are fresh, no active high/critical issue, and capacity is inside safe limits. |
| Yellow — Degraded | The service works but an error, latency, quota, or capacity trend needs attention. |
| Red — Incident | The service is unavailable, unsafe, corrupting data, blocking a core flow, or actively affecting users. |
| Gray — Unknown | Data is missing, stale, the check is disabled, or the provider cannot be reached. |

Initial configurable defaults:

- capacity below 70%: green;
- 70–85% or forecast to exhaust within 30 days: yellow;
- above 85% or forecast to exhaust within 14 days: red;
- no result after twice the normal check interval: gray.

These are operational configuration values, not hard-coded product rules.

### 6.5 Health details

Examples by service:

**Database/API**

- availability and latency;
- failed-request rate by approved endpoint class, never full URL parameters;
- connection saturation;
- database/storage consumption;
- growth rate and exhaustion forecast.

**Storage**

- used and available capacity;
- failed upload/open rate;
- orphan-cleanup failures;
- current estimated cost and no-cost limit usage.

**Coach/AI gateway**

- availability;
- response latency;
- timeout, rejection, truncation, and provider-error rates;
- daily request/token cost totals without prompts or responses;
- quota/budget usage.

**Application**

- affected installations;
- native and unhandled crashes;
- startup failures and launch time;
- severe hangs/blank screens;
- distribution by version, platform, OS, and device class.

### 6.6 Active issues

Severity:

1. **Critical** — outage, likely data loss/corruption, security/privacy incident, or a core flow unavailable
   to a material population.
2. **High** — major feature blocked, meaningful population affected, or fast deterioration.
3. **Medium** — degraded experience with a workaround or limited impact.
4. **Low** — contained/non-blocking defect that should be tracked.

Each issue contains:

- concise title and affected service;
- severity and current state;
- first seen, last seen, and duration;
- affected-installation count;
- versions/platforms/channels affected;
- safe technical classification;
- owner;
- internal notes;
- recommended or recorded action;
- link to related user reports and versions;
- resolution time and resolution summary;
- vendor issue link when one exists and the operator has permission.

Resolved issues remain searchable history. Recurrence links to the prior issue rather than overwriting it.

## 7. Tab 2 — KPIs

### 7.1 Purpose

Show whether PushApp helps people translate intention into action and persist in meaningful transformation.
The dashboard may surface engagement as diagnostic context, but never present engagement volume as the goal.

### 7.2 KPI definition contract

Every KPI must show:

- exact human-readable definition;
- numerator and denominator;
- exclusions;
- time window;
- definition version and effective date;
- current value and comparison period;
- target when approved;
- freshness and data-completeness warning;
- whether it is Primary, Supporting, Diagnostic, or Guardrail.

Definition changes create a new version. Historical values are not silently recomputed under a new meaning.

### 7.3 Initial headline KPIs — provisional version 0

The founder accepted these as a starting set and will refine them later. They are deliberately marked
**provisional** in the console until separately confirmed.

1. **Successful activation** — share of new accounts that complete onboarding and create a first Journey.
2. **Journeys that truly start** — share of created Journeys receiving at least one genuine Step report.
3. **Journeys moving forward** — share of eligible Active Journeys with at least one scheduled Step reported
   Done or Partial in the selected period.
4. **Journey completion** — completed Journeys divided by Journeys that reached an eligible end outcome in
   the selected cohort; Future/Frozen Journeys are excluded until eligible.
5. **Journey cancellation** — shown next to completion so unsuitable Journeys are not hidden.
6. **Intervention efficiency** — interruptions per helped Journey; lower is better for equal helpfulness.
7. **Support effectiveness** — aggregate support events followed by a defined return-to-action window,
   without identity, message content, Journey title, or Step title.
8. **Retention** — diagnostic context only, never a primary optimization target.

The four largest cards initially are Successful activation, Journeys moving forward, Journey completion,
and Intervention efficiency/support usefulness. Their final formulas and targets may be refined before the
product-event pipeline is enabled.

### 7.4 Feature-area metrics

Lower sections may group approved metrics for:

- onboarding;
- Journey creation;
- Step reporting;
- Weekly Review;
- Coach;
- Support Circles and Friends;
- notifications;
- Tools;
- Dreams;
- freeze, return, and cancellation.

Example Tool funnel: available → opened → started → completed → result revisited. Never collect Tool answers,
selected values, user-authored labels, or private result content.

### 7.5 Forbidden objectives

Time in app, session count or length, notification send volume, open/click rate, DAU/MAU, Streak length,
number of Journeys created, and subscription conversion are not terminal success metrics. If shown, they are
clearly labeled diagnostic or business context and may not drive automatic optimization.

## 8. Tab 3 — User Reports

### 8.1 Entry points in the consumer app

A report can begin from:

- Settings / Help and feedback;
- an in-context error state;
- another user's profile under the three-dot menu.

Profile reporting covers harassment, repeated unwanted contact, spam, impersonation, suspected fake account,
and Other with optional text. After reporting, the existing product decision to offer blocking applies.

### 8.2 General report categories

- Something is not working;
- Account problem;
- Payment problem when billing exists;
- Incorrect or inappropriate content;
- Problem with another user;
- Improvement suggestion;
- General feedback;
- Other.

### 8.3 Submission fields

- category and optional closed subcategory;
- user-authored description;
- optional screenshot;
- contact email;
- app version, build, runtime/update ID, platform, OS version, locale, and safe error correlation ID;
- source entry point;
- created timestamp;
- reporter/subject identifiers only when required by a user-safety report.

The contact email is prefilled from the account when available. It can be edited or supplied when missing.
Editing it changes only that report's reply address and never changes the account identity. The UI states
clearly that replies will be sent there.

### 8.4 Screenshot contract

Before submission:

- show a full preview;
- allow replace/remove;
- warn the user to exclude unnecessary private information;
- strip metadata, including location metadata;
- compress and validate type/size under an implementation-configured limit;
- require explicit confirmation that this exact image will be sent.

Screenshots are user-report evidence, never crash-monitoring attachments or product analytics. Access is
audited and role-restricted.

### 8.5 Encrypted-message evidence

No direct-message plaintext, ciphertext, or key is attached automatically. If a user explicitly chooses to
report a particular decrypted message, the app must preview the exact selected content and explain that the
chosen evidence will leave the end-to-end encrypted conversation for review by the safety team. Only the
selected evidence is sent. Designing that exceptional evidence flow is required before message evidence is
enabled; ordinary profile reporting can ship without it.

### 8.6 Report list and workflow

Statuses:

- New;
- In progress;
- Waiting for user;
- Resolved;
- Cannot reproduce;
- Duplicate;
- Closed.

The list shows category, severity, created time, status, app version/platform, attachment indicator, waiting-
for-response state, and assigned operator.

Operators may:

- assign/reassign;
- change status/severity;
- add internal notes;
- link to a system issue or version;
- mark duplicate;
- open the attachment if authorized;
- open a prepared email in the existing mail client with report reference and recipient.

No new outbound mail provider is introduced by this feature.

### 8.7 User-safety reports

Safety reports store reporter and reported-account references in a separately protected area. Access is
limited to Owner and Safety roles. They may be linked to prior reports for repeat-pattern review, but the
initial system does not automatically suspend an account based on report count.

## 9. Tab 4 — Versions

### 9.1 Version types

The registry distinguishes:

- native store build;
- runtime version;
- Expo/EAS over-the-air update;
- release channel/branch;
- feature-flag configuration.

### 9.2 Statuses

- Draft;
- In development;
- In QA;
- Ready;
- Scheduled;
- Gradual release;
- Fully released;
- Paused;
- Superseded;
- Unsupported.

### 9.3 Version list

Each item shows:

- semantic app version and build number;
- platform;
- runtime/update identifier;
- status;
- planned release date;
- actual release date;
- user/installation count and share where available;
- health state;
- known issues and linked user reports;
- support state.

### 9.4 Version detail

- release notes and internal change list;
- features added, changed, hidden, or removed;
- fixes;
- schema/data migrations;
- new permissions and privacy disclosures;
- feature flags/defaults;
- known limitations;
- adoption and failed-update information from Expo/EAS;
- health comparison with the predecessor;
- issues and reports first appearing in the version;
- gradual-release history when that later feature exists.

Draft and future versions appear alongside released versions, clearly distinguished by status and planned
versus actual date.

### 9.5 Boundary with Gradual Release

This PRD provides visibility and the data contract only. Percentage changes, release expansion, stop rules,
kill switches, and rollback execution belong to a separate PRD. No active rollout control is implemented from
this specification.

## 10. Access and roles

The console supports multiple users from the first release.

Initial roles:

- **Owner** — all access, role administration, and policy/configuration changes;
- **Operations** — system health, issues, versions, and operational notes;
- **Developer** — technical diagnostics without report email, attachment, or private safety evidence;
- **Product** — aggregate KPI access and KPI-definition metadata;
- **Support** — ordinary user reports and reply email;
- **Safety** — user-safety reports and explicitly submitted evidence;
- **Read-only** — only the explicitly assigned sections, without mutation/export.

One person may hold several roles. Access follows least privilege. No shared accounts.

Required controls:

- strong authentication;
- multi-factor authentication before production access;
- server-side authorization on every query/action;
- short-lived sessions and revocation;
- no sensitive content in browser URLs;
- audit of login, role change, attachment/evidence open, export, assignment, status change, note, and policy
  change;
- no anonymous/shareable issue links exposing PushApp data.

## 11. Privacy and telemetry contract

### 11.1 Mandatory operational diagnostics

Operational crash/error monitoring is part of the base service agreement and cannot be disabled by the user.
It must be clearly disclosed before use and in the privacy policy/store declarations. Mandatory does not mean
unbounded: only the allowlisted diagnostics below may be collected.

### 11.2 Separate product-analytics consent

Product KPI telemetry is a separate purpose with a separate consent state. Declining or withdrawing it does
not disable crash/error monitoring or the user's product access. Withdrawal stops future KPI telemetry;
retention/deletion follows the approved policy.

### 11.3 Allowed diagnostic fields

- allowlisted error class/code and handled/fatal state;
- sanitized stack trace and module/function names;
- app version, build, runtime/update ID, channel, and environment;
- platform, OS version, device class/model, and app foreground/background state;
- allowlisted screen identifier without route parameters;
- timestamp and broad network state;
- random installation telemetry ID;
- allowlisted feature-flag states;
- safe duration/count/bucket values;
- vendor event/correlation identifier.

### 11.4 Explicitly prohibited everywhere in crash/health telemetry

- Coach prompts, responses, transcript, context, or summaries;
- Dream, Journey, Milestone, and Step titles or free text;
- reporting/postponement reasons or free text;
- Tool answers, labels, reflections, or results;
- Mirror raw contributions or synthesis;
- direct-message plaintext, ciphertext, keys, nonces, or attachments;
- notification bodies;
- names, username, email, birth date, country/profile fields, or social graph;
- photos, audio, uploaded media, or report screenshots;
- auth/session/refresh tokens, invitation tokens, or deep-link query data;
- clipboard contents;
- complete URLs, headers, request/response bodies, AI payloads, or database rows;
- AsyncStorage, SecureStore, Redux/application-state dumps, or filesystem contents;
- automatic breadcrumbs derived from text, taps, form values, route parameters, or console output;
- session replay, automatic screenshot, view hierarchy, or keystroke capture;
- IP retention or advertising/cross-app identifiers under PushApp's telemetry contract.

### 11.5 Proof, not promise

Required privacy QA uses planted canary strings for every prohibited category. Tests intentionally trigger
handled and fatal paths and inspect the final serialized outbound payload. A release fails if any canary,
unknown property, attachment, raw URL, or disallowed breadcrumb survives.

Both client-side allowlisting and provider-side inbound scrubbing are enabled. Client-side tests are the
primary guarantee; provider scrubbing is defense in depth.

## 12. Data retention and deletion

| Data | Initial retention |
|---|---|
| Detailed crash/error events with installation ID | 30 days |
| De-identified aggregate technical trends | 90 days |
| Ordinary user report content and screenshot | Until resolution + 90 days |
| User-safety report/evidence | 12 months, unless a legal/safety hold is explicitly documented |
| KPI raw structured events | Minimum period required for the approved KPI; initial ceiling 90 days |
| KPI aggregates without person/installation identifier | Retained according to the versioned KPI policy |
| Version/release metadata | Indefinite operational history |
| Administrator audit log | 12 months minimum; final security retention may be longer if required |

Account deletion removes or de-identifies applicable product-analytics events and ordinary report links unless
a separately lawful safety/support retention basis applies. A report contact email is not promoted into an
account profile or marketing list.

## 13. Minimal-vendor architecture

### 13.1 Selected initial sources

1. **Sentry — the only new external vendor**: native and JavaScript crashes/errors, release correlation,
   selected performance/availability signals, and critical alerts.
2. **Supabase — existing**: KPI events/aggregates, reports/attachments, version registry, roles, issues,
   operational metadata, and audit log.
3. **Expo/EAS — existing**: builds, runtime/update metadata, update adoption and failed update launches.
4. **PushApp Admin Console — owned UI**: one normalized read/write experience over the three sources.

No PostHog, Firebase, Grafana, Metabase, Mixpanel, Amplitude, separate support desk, or separate release tool
is introduced in the first version.

### 13.2 Vendor adapters

Vendor access sits behind narrow server-side gateways. Vendor tokens never enter the mobile app or browser.
The console consumes normalized health/release records, not provider-specific response shapes.

Sentry is the selected initial crash provider because Expo provides first-class React Native/EAS integration,
including source maps and update metadata. If a later second tool offers a clear capability that cannot be
obtained safely and economically from Sentry/Supabase/Expo, adding it requires a documented cost/privacy
decision and founder approval. Preference alone is insufficient.

### 13.3 Native build requirement

Full Sentry React Native integration contains native bindings and requires a new iOS/Android build. A
JavaScript-only interim catcher may not be described as full monitoring because it misses native crashes and
early startup failures. Every native build and EAS Update must upload the correct symbols/source maps before
release health is trusted.

### 13.4 Failure independence

Where Sentry availability checks are available inside the approved free tier, use them to probe safe health
endpoints so a Supabase outage remains visible outside Supabase. Because this capability/pricing can change,
the availability-check interface is replaceable. If it ceases to be free, monitoring degrades to gray and a
replacement requires founder approval; no automatic paid fallback occurs.

## 14. Cost and quotas

- Target incremental operating cost for the initial version: **zero**.
- No payment method or pay-as-you-go budget where avoidable.
- If a payment method is technically required, pay-as-you-go remains disabled or hard-capped at zero.
- Quota warnings at 50%, 75%, and 90%.
- Repeated identical events are grouped/sampled after the first useful instances.
- Spike protection prevents one defect from consuming the month.
- New distinct critical failures retain priority over repeated known low-severity events.
- Quota exhaustion becomes a visible gray/yellow console issue; discarded-event counts are shown.
- A provider-plan change, paid SDK, log drain, new hosted dashboard, or new external vendor requires a cost
  review and explicit founder approval before activation.

Initial Sentry documentation states a free allowance of 5,000 error events per month; it must be reverified at
implementation time because quotas change. Supabase log/metric charging is evolving and must also be checked
before enabling additional ingestion or drains.

## 15. Store and privacy-document changes

Before release:

- update `Privacy_Contract_With_The_User.md` from “No analytics or crash SDK” to the exact approved contract;
- update the public privacy policy with provider, purpose, fields, retention, mandatory diagnostics, separate
  KPI consent, deletion, and international processing details;
- update Apple's App Privacy answers for Crash Data, Performance Data, Other Diagnostic Data, Product
  Interaction when KPI consent is enabled, and the random identifier according to the final linkage design;
- update Google Play Data Safety for Crash logs, Diagnostics, App interactions when enabled, report/customer-
  support content, screenshots, and the SDK's handling;
- verify the chosen provider's current SDK privacy manifest/data-safety guidance and processor terms;
- confirm no tracking/advertising use and no App Tracking Transparency trigger;
- provide in-app disclosure before mandatory diagnostics begin.

## 16. Alerts and daily operating view

Email alerts are sent only for:

- new Critical issue;
- new data-loss, security, or privacy signal;
- core-service outage;
- rapid affected-installation increase;
- monitoring silence/staleness affecting the ability to know health;
- quota at 90% or hard-cap exhaustion.

Other issues appear in the console. Alert delivery itself is monitored, deduplicated, and rate-limited. The
initial email destination is an operator configuration, not a user-facing communication system.

## 17. Edge cases and failure behavior

- **No active users:** show “No denominator” rather than 100% healthy.
- **Tiny sample:** show counts prominently and suppress misleading percentage trends.
- **Monitoring vendor unavailable:** provider card gray; do not infer app failure or health.
- **Supabase unavailable:** external crash/uptime source still exposes the incident; console may show its own
  degraded state and must not cache green indefinitely.
- **Console unavailable:** alerts still route through the external monitor; consumer app remains unaffected.
- **Duplicate crash storm:** group/sample; preserve first, latest, affected count, and new-version evidence.
- **One installation crashes repeatedly:** affected count remains one while event count remains visible.
- **Same person on two devices:** counted as two installations by design.
- **User reinstalls:** receives a new installation telemetry ID.
- **Offline crash:** queue only the allowlisted payload and send later; retention begins at event time.
- **Deleted account:** installation telemetry is not re-linked; applicable KPI/report data follows deletion
  policy.
- **Bad clock/time-zone:** server ingestion time is used operationally; device time is stored only if safe and
  clearly marked.
- **Version metadata missing:** issue remains visible under Unknown Version and blocks gradual-release
  confidence.
- **Source maps/symbols missing:** create a visible release-readiness issue; do not mark that version fully
  monitorable.
- **Feature flag changed without build:** version detail records configuration revision separately.
- **Report submitted twice:** offer duplicate linking; never silently discard the user's second submission.
- **Screenshot upload fails:** report text can still submit; allow attachment retry without duplicating report.
- **Malicious attachment:** validate type/size, strip metadata, scan when an approved capability exists, and
  never render executable content.
- **Edited reply email is invalid:** validate before submission; preserve report draft.
- **Reported user deletes account:** retain only what the approved safety policy permits.
- **Administrator loses role mid-session:** next protected request fails and session permissions refresh.
- **Conflicting status edits:** use optimistic concurrency and surface conflict; never silently overwrite.
- **KPI definition changes:** create a new definition version; do not splice incompatible time series.
- **Consent withdrawn offline:** stop new product events immediately on-device and sync withdrawal when online.
- **Sentry free capability becomes paid:** disable the affected optional capability, show degraded monitoring,
  and request founder approval; never incur a charge automatically.

## 18. Required logs and event taxonomy

### 18.1 “Log” does not mean one thing

Implementation must keep four pipelines separate:

1. **Operational diagnostics** — mandatory, for crashes, failures, performance, availability, and capacity.
2. **Product KPI events** — consent-gated, for the approved aggregate product measures.
3. **User-report records** — user-initiated support/safety submissions, not analytics events.
4. **Administrator audit entries** — mandatory accountability for internal access and mutations.

They may share a typed logging library and transport abstractions, but they do not share identifiers,
retention, destinations, or permissions. An event may not be copied from one pipeline into another merely
because doing so is convenient.

There is no general-purpose production `console.log` ingestion. Developer console output is local development
material and is never forwarded automatically.

### 18.2 Common structured envelope

Every approved machine event uses a schema-defined envelope:

- `eventName` — closed enum;
- `schemaVersion` — positive integer;
- `eventId` — random UUID for idempotency;
- `occurredAt` — device/server timestamp;
- `receivedAt` — server ingestion timestamp, added server-side;
- `environment` — development/test/production;
- `platform` — iOS/Android/Web/Server;
- `appVersion`, `buildNumber`, `runtimeVersion`, `updateId`, `releaseChannel` when applicable;
- `localeCode` — approved language/locale code only, never free text;
- `networkClass` — offline/wifi/cellular/unknown when needed;
- `contractVersion` — telemetry allowlist version;
- an event-specific payload containing only fields declared below.

Unknown properties are rejected before transport. String values are permitted only where a closed enum,
version, safe code, or random telemetry identifier is specified. No arbitrary message, exception message,
URL, filename, query, label, or serialized object is accepted.

### 18.3 Identifiers by pipeline

**Operational diagnostics** may use `telemetryInstallationId`, a random installation identifier.

**Product KPI events** use a separately generated `analyticsParticipantId` only after KPI consent. It is not
the account ID and is not stored in an identity lookup table. Withdrawal retires it. Where longitudinal
measurement of one Journey or Tool run is required, generate a separate random `journeyAnalyticsId` or
`toolRunAnalyticsId`; never transmit the real domain object ID, title, or content.

**User reports** use the authenticated account reference only inside the protected first-party support store
because the user initiated a request and expects a reply. That reference never enters Sentry or KPI events.

**Administrator audit entries** identify the administrator because accountability is their purpose. They
reference protected record IDs but never copy report text, attachment contents, or user evidence into the
audit payload.

### 18.4 Mandatory operational diagnostic events

These events are allowed without product-analytics consent because they operate the service. They are still
subject to §11's strict allowlist.

| Event | Emitted when | Event-specific allowed fields |
|---|---|---|
| `app_launch_started` | Native/JS launch reaches the earliest safe instrumentation point | `launchId`, `launchSource` enum |
| `app_ready` | The first usable authenticated or sign-in screen is rendered | `launchId`, `durationBucketMs`, `destinationClass` enum |
| `app_startup_failed` | Startup cannot reach a usable screen | `launchId`, `failureCode`, `phase` enum, `recoverable` |
| `blank_screen_watchdog_triggered` | A defined watchdog proves no valid surface appeared in time | `launchId`, `screenId` allowlist, `durationBucketMs` |
| `app_hang_detected` | A supported native watchdog detects a severe main-thread hang | `durationBucketMs`, `appState` enum |
| `handled_error_recorded` | An allowlisted non-fatal operational exception is intentionally captured | `errorCode`, `moduleCode`, `operationCode`, `recoverable` |
| `fatal_error_recorded` | Crash SDK records a fatal native/JS failure | provider-native sanitized stack plus `errorCode`, never arbitrary exception text |
| `auth_operation_result` | Sign-in, token refresh, sign-out, or account restore succeeds/fails | `operation` enum, `result` enum, `provider` enum, `failureCode`, `durationBucketMs` |
| `repository_operation_failed` | Read/write/migration fails after approved recovery attempts | `repositoryCode`, `operation` enum, `failureCode`, `dataState` enum; no key/value/content |
| `local_data_integrity_failed` | Integrity/decryption/version check detects unreadable or corrupt state | `checkCode`, `failureCode`, `recoveryState` enum |
| `message_crypto_operation_failed` | Key generation/seal/open infrastructure fails | `operation` enum, `failureCode`, `keyState` enum; no IDs, ciphertext, nonce, message metadata, or peer identity |
| `api_operation_result` | A monitored endpoint class fails or crosses latency threshold | `serviceCode`, `endpointClass` enum, `methodClass` enum, `statusClass`, `failureCode`, `durationBucketMs`, `retryCountBucket` |
| `coach_request_result` | Coach/model gateway request completes or fails | `result` enum, `failureCode`, `durationBucketMs`, `modelCode`, `requestSizeBucket`, `responseSizeBucket`, `tokenCountBucket`; no prompt/response/topic |
| `storage_operation_result` | Upload/download/delete fails or crosses threshold | `operation` enum, `mediaClass` enum, `result`, `failureCode`, `sizeBucket`, `durationBucketMs`; no filename/path/owner/content |
| `update_check_result` | Expo update check/download/apply finishes | `result`, `failureCode`, `candidateUpdateId`, `durationBucketMs` |
| `update_launch_failed` | A downloaded update fails to launch or falls back | `failedUpdateId`, `fallbackUpdateId`, `failureCode` |
| `notification_schedule_result` | Local/remote scheduling infrastructure fails | `notificationClass` enum, `result`, `failureCode`; no notification body, Journey/Step ID, or recipient |
| `background_job_result` | Approved background/server job completes or fails | `jobCode`, `result`, `failureCode`, `durationBucketMs`, `itemsBucket`; no row IDs/content |
| `service_health_check_result` | External/internal health probe runs | `serviceCode`, `regionCode` if approved, `result`, `statusClass`, `durationBucketMs`, `checkVersion` |
| `capacity_snapshot_recorded` | Scheduled capacity collection runs | `resourceCode`, `usedPercentBucket`, `remainingBucket`, `forecastDaysBucket`, `quotaPlanCode` |
| `backup_verification_result` | A backup or restore drill/check completes | `checkCode`, `result`, `failureCode`, `ageBucketHours`; no backup content/path |
| `telemetry_delivery_result` | Diagnostic batch is accepted/dropped/retried | `result`, `failureCode`, `eventsBucket`, `bytesBucket`, `retryCountBucket` |
| `telemetry_quota_snapshot` | Provider quota is polled | `providerCode`, `productCode`, `usedPercentBucket`, `discardedEventsBucket`, `hardCapState` |

Successful high-volume events are aggregated or sampled where individual records add no diagnostic value.
Failures and new fatal signatures retain priority. The event contract explicitly identifies which events are
device-originated, server-originated, or provider-imported so the same fact is not double counted.

### 18.5 Consent-gated product KPI events

These events are emitted only when product KPI consent is active. All properties are scalar, enum, boolean,
bucket, or random analytics pseudonym. They never carry real object IDs or content.

#### Activation and onboarding

| Event | Allowed fields |
|---|---|
| `account_first_run_started` | `analyticsParticipantId`, `entryClass` enum |
| `onboarding_section_reached` | `analyticsParticipantId`, `sectionCode` enum, `sectionOrder`, `elapsedBucket` |
| `onboarding_question_skipped` | `analyticsParticipantId`, `questionCode` enum; never the answer |
| `onboarding_completed` | `analyticsParticipantId`, `durationBucket`, `answeredCountBucket`, `skippedCountBucket` |
| `first_journey_created` | `analyticsParticipantId`, `journeyAnalyticsId`, `daysFromOnboardingBucket`, `sourceClass` enum |

#### Journey and Step outcomes

| Event | Allowed fields |
|---|---|
| `journey_created` | `analyticsParticipantId`, `journeyAnalyticsId`, `sourceClass`, `plannedDurationBucket`, `stepCountBucket`, `scheduleDensityBucket`; no domain/title/Dream |
| `journey_activated` | `journeyAnalyticsId`, `activationClass` enum, `daysFromCreationBucket` |
| `journey_first_report_recorded` | `journeyAnalyticsId`, `daysFromActivationBucket`, `reportOutcome` enum (`done`/`partial`/`not_done`) |
| `step_report_recorded` | `journeyAnalyticsId`, `reportOutcome` enum, `timingClass` enum, `stepRequirementClass` enum; no Step ID/title/reason/note |
| `journey_status_changed` | `journeyAnalyticsId`, `fromStatus`, `toStatus`, `changeClass` enum; no free-text reason |
| `journey_completed` | `journeyAnalyticsId`, `plannedDurationBucket`, `actualDurationBucket`, `completionRatioBucket`, `requiredStepsMet` |
| `journey_canceled` | `journeyAnalyticsId`, `lifecycleStageBucket`, `progressBucket`, `reasonId` only when it is an approved closed enum; never free text |
| `journey_deleted` | `journeyAnalyticsId`, `statusBefore`, `hadReports`; no title or content |

One Step occurrence may emit at most one final `step_report_recorded` event for the relevant calculation. UI
taps are not the source of truth; committed domain transitions are.

#### Weekly Review and plan changes

| Event | Allowed fields |
|---|---|
| `weekly_review_available` | `eligibleJourneyCountBucket`, `proposalCountBucket` |
| `weekly_review_opened` | `hoursFromAvailabilityBucket` |
| `weekly_review_proposal_outcome` | `outcome` enum (`approved`/`edited`/`declined`/`expired`), `changeCategoryCountBucket`; no proposal text |
| `weekly_review_applied` | `changedJourneyCountBucket`, `changedScheduleCountBucket` |

#### Interventions and support

| Event | Allowed fields |
|---|---|
| `interruption_delivered` | `interruptionAnalyticsId`, `channelClass`, `interventionClass`, `journeyAnalyticsId` when applicable; no copy or recipient |
| `action_after_interruption` | `interruptionAnalyticsId`, `actionClass`, `latencyBucket`; no Step/Journey text |
| `intervention_helpfulness_submitted` | `interruptionAnalyticsId`, `rating` enum (`yes`/`partly`/`no`); no explanation text |
| `support_request_state_changed` | `supportRequestAnalyticsId`, `state` enum, `roleClass`; no identities or Journey ID/title |
| `support_action_recorded` | `supportRequestAnalyticsId` when applicable, `actionClass` enum, `directionClass`; no message content, sender, recipient, or social graph |

#### Coach

| Event | Allowed fields |
|---|---|
| `coach_conversation_started` | `conversationPurpose` enum, `entryClass` enum, `journeyLinked` boolean |
| `coach_conversation_outcome` | `conversationPurpose`, `outcomeClass` enum, `proposalProduced`, `proposalApproved`; no transcript/topic/summary |
| `coach_conversation_failed` | product pipeline receives only coarse `failureClass`; technical details belong in operational diagnostics |

#### Tools

| Event | Allowed fields |
|---|---|
| `tool_opened` | `toolCode` enum, `entryClass` enum |
| `tool_started` | `toolCode`, `toolRunAnalyticsId`, `modeCode` only when mode is public product configuration |
| `tool_step_reached` | `toolCode`, `toolRunAnalyticsId`, `stepNumber`, `totalStepsBucket`; no answer or chosen option |
| `tool_completed` | `toolCode`, `toolRunAnalyticsId`, `durationBucket`, `skippedCountBucket` |
| `tool_result_revisited` | `toolCode`, `daysSinceCompletionBucket`; no result content |
| `tool_abandoned` | `toolCode`, `toolRunAnalyticsId`, `stepNumberBucket`; do not emit from Tools whose PRD forbids exit-step telemetry |

Each Tool PRD remains authoritative. If a Tool's privacy contract is stricter than this general catalog, the
Tool's restriction wins and the corresponding optional event/property is suppressed.

#### Notification harm/efficiency guardrails

| Event | Allowed fields |
|---|---|
| `reminder_disabled_by_user` | `scopeClass`, `notificationClass`; no Journey ID/title |
| `notification_permission_changed` | `fromState`, `toState`, `sourceClass` |
| `interruption_budget_ceiling_hit` | `interventionClass`, `budgetBucket`; an alarm, not a success metric |

Notification opening may be collected only when an approved KPI explicitly needs it and must never stand in
for helpfulness. Notification copy is never collected.

### 18.6 User-report records and workflow events

The report itself is a first-party protected record, not a telemetry log. Its permitted fields are defined in
§8. The workflow may emit internal structured transitions:

- `report_created`;
- `report_attachment_added` / `report_attachment_deleted`;
- `report_assigned`;
- `report_status_changed`;
- `report_linked_to_issue` / `report_linked_to_version`;
- `report_marked_duplicate`;
- `report_reply_opened_in_mail_client`;
- `report_retention_expired`.

These carry report ID, actor/admin ID where applicable, previous/new enum state, and timestamp. They never
duplicate the report body, email, screenshot, evidence, or internal note into analytics/diagnostics.

### 18.7 Version and release operational records

- `release_record_created`;
- `release_status_changed`;
- `release_published`;
- `release_adoption_snapshot`;
- `release_health_snapshot`;
- `release_symbols_verified` / `release_symbols_missing`;
- `feature_flag_configuration_changed`;
- `update_install_failed`;
- future `rollout_percentage_changed`, `rollout_paused`, and `rollback_executed` are reserved for the separate
  Gradual Release PRD and must not be wired from this specification.

Allowed release fields are version/build/runtime/update/channel/platform/status, aggregate adoption/failure
counts, change actor for administrative records, and safe timestamps. Release notes live in the protected
version registry and are not copied into external telemetry.

### 18.8 Administrator audit events

Audit actions include:

- authentication success/failure and logout;
- role granted/revoked;
- protected report/evidence/attachment opened;
- aggregate export requested/completed;
- report assignment/status/severity changed;
- issue assignment/status/severity changed;
- internal note created/edited/deleted;
- version metadata/status changed;
- KPI definition/target changed;
- telemetry contract, retention, quota, alert, or provider configuration changed;
- another administrator invited, disabled, or removed.

Each entry stores actor admin ID, action enum, protected target type/ID, occurred/received time, result enum,
and approved change summary as structured before/after enums or hashes. It never stores passwords, tokens,
report contents, evidence, attachments, or copied free text. Audit entries are append-only to ordinary
administrators.

### 18.9 Logging implementation rules for Claude/implementers

1. Create one typed event catalog; do not scatter string event names through UI components.
2. Emit from committed engine/repository outcomes, not button taps, wherever a domain transition exists.
3. Route SDK/vendor access through gateways. Core engines remain framework/vendor-free.
4. Validate every payload against its exact runtime schema before enqueue and before server ingestion.
5. Reject unknown keys and unbounded strings; do not “sanitize and hope.”
6. Keep diagnostics and product analytics in different outboxes, consent gates, destinations, and deletion
   paths.
7. Make event delivery idempotent with `eventId`; retries cannot double-count KPIs.
8. Persist offline events only in encrypted local storage and enforce TTL/queue-size limits.
9. Never record an event merely because a screen rendered if the KPI is about an outcome.
10. Sampling applies only where declared; expose sampled/dropped counts so the dashboard does not imply full
    coverage.
11. Development/test events use separate environments and are excluded from production KPIs by construction.
12. Every new event or property requires PRD purpose, privacy review, schema version, retention, owner, and a
    dashboard consumer. Events with no named decision use are rejected.

### 18.10 Minimum dashboard calculations enabled by this catalog

- crash-free/healthy active installations and affected counts;
- startup success and latency;
- failure rates by safe service/operation/release dimensions;
- capacity/quota state and forecast;
- activation and Journey-first-action funnels;
- Journeys moving forward, completing, or canceling;
- interruption/helpfulness efficiency and harm guardrails;
- support and Tool aggregate funnels where their own PRDs permit;
- report volume, severity, age, ownership, and resolution time;
- version adoption, failed updates, health regression, and issue/report concentration.

If a desired dashboard card cannot be computed from this catalog, the team must propose a specific new event
and review it. It may not query private product tables or user-authored content as a shortcut.

## 19. High-level data entities

Names are illustrative; the architect owns final schemas.

- `admin_user`, `admin_role_assignment`;
- `audit_entry`;
- `service_definition`, `service_health_snapshot`;
- `operational_issue`, `issue_occurrence`, `issue_link`, `issue_note`;
- `telemetry_consent_state`, `telemetry_contract_version`;
- `kpi_definition`, `kpi_aggregate`, `product_event_outbox`;
- `user_report`, `user_report_attachment`, `report_assignment`, `report_status_history`;
- `safety_report_subject`, protected separately;
- `release`, `native_build`, `runtime_update`, `release_feature`;
- `provider_quota_snapshot`.

Never place private user content in the general issue, KPI, version, or audit entities.

## 20. Acceptance criteria

1. Authorized operators reach one internal web console with four primary tabs.
2. System Health is the default tab and shows overall state, primary technical number, service cards, and
   severity-ordered active issues.
3. Green, yellow, red, and gray are computed from fresh normalized signals; missing data cannot show green.
4. The primary metric shows both percentage and affected/active installation counts.
5. Health can be filtered by release/build/update/platform/channel without user content.
6. KPIs expose definition, numerator, denominator, exclusions, freshness, and definition version.
7. KPI telemetry is separate from mandatory diagnostics and respects its separate consent state.
8. Reports can originate from Settings, an error state, and another user's profile.
9. Contact email prefills when available, is editable per report, and never changes the account email.
10. Screenshot preview/removal/confirmation and metadata stripping work before upload.
11. No encrypted-message content is attached automatically.
12. Authorized operators can assign, classify, link, reply by existing email client, and resolve reports.
13. Safety evidence is inaccessible to Developer/Product/ordinary Support roles.
14. Versions include planned and released states, planned/actual dates, adoption, changes, health, issues, and
    reports.
15. Multiple administrators and combinable roles are supported; all server requests enforce authorization.
16. Sensitive access and every administrative mutation create immutable audit entries.
17. Sentry is the only new external vendor in the initial architecture; product KPI/report/version data stay
    on the existing Supabase/Expo infrastructure.
18. Automatic screenshots, session replay, console breadcrumbs, PII defaults, and automatic request-body
    capture are disabled.
19. Canary tests prove every prohibited content class is absent from serialized diagnostic payloads.
20. The app and console remain usable when any monitoring source is unavailable; state becomes gray/degraded.
21. Quota warnings, spike protection, zero automatic overage, and discarded-event visibility work.
22. Native symbols/source maps and release metadata are verified before a version is labeled monitorable.
23. Required privacy-contract, store-label, and Data Safety changes are complete before release.
24. No Gradual Release control is exposed by this PRD.
25. The four logging pipelines have separate schemas, identifiers, consent/authorization, retention, and
    storage paths.
26. Every production event name and property exists in the versioned typed catalog; unknown fields fail
    closed.
27. KPI events originate from committed outcomes, are idempotent, and cannot be duplicated by retries or
    repeated renders.
28. The required catalog in §18 supports every initial dashboard calculation without reading private content.

## 21. Test plan

### 21.1 Privacy payload tests

- Plant unique canaries in every prohibited source: Coach, Dream, Journey, Step, Tool, Mirror, message,
  notification, profile, attachment, token, URL, state store, and request body.
- Trigger handled error, unhandled JavaScript error, native test crash, startup failure, network error, and
  background error.
- Intercept and inspect the final serialized outbound payload before transport.
- Assert exact-key allowlist and absence of every canary/unknown key/attachment.
- Verify provider-side scrubbing using a deliberately blocked test field in non-production.

### 21.2 Operational tests

- forced crash symbolicates to the correct source and release;
- over-the-air update maps to the correct update ID;
- outage/degradation/stale source yields correct card state and issue severity;
- one repeated crash affects one installation but increments occurrence count;
- quota thresholds and spike protection fire;
- alert deduplication and recovery notification work;
- source-map absence is visible;
- console failure does not affect consumer app.

### 21.3 Access tests

- role matrix tests for every route/query/action;
- attachment/evidence access denied by default;
- role revocation takes effect promptly;
- audit entries cover sensitive opens, exports, and mutations;
- no provider token is available to the browser or mobile bundle.

### 21.4 Report tests

- every entry point, draft, offline submission, retry, duplicate, email validation, attachment failure,
  metadata stripping, block offer, assignment, reply-link, and retention expiry;
- explicit evidence preview for a selected encrypted message before any future enablement;
- account deletion and reported-account deletion.

### 21.5 KPI/version tests

- consent declined/withdrawn;
- no raw content in product events;
- formula, denominator, exclusion, freshness, and version display;
- small/no sample behavior;
- planned versus actual release dates;
- native and over-the-air versions remain distinct;
- incompatible KPI definitions do not merge historical series.

### 21.6 Event-catalog tests

- compile-time coverage for every declared event and runtime rejection of undeclared event names/properties;
- event-specific exact-schema fixtures for accepted and rejected payloads;
- UI double-tap, rerender, offline retry, crash recovery, and multi-source import do not double count;
- consent-off path produces no KPI outbox write or network request;
- mandatory diagnostics remain operational when KPI consent is off;
- stricter per-Tool privacy rules suppress the general optional event/property;
- development/test events cannot enter production aggregates;
- sampled/dropped/expired queue counts reconcile with dashboard coverage metadata.

## 22. Implementation phases

### Phase 0 — contracts and privacy gate

- event/field allowlist;
- Sentry plan/region/processor/retention verification;
- privacy/store declarations;
- telemetry identifier and consent storage;
- role matrix and audit model;
- cost hard cap.

### Phase 1 — technical monitoring foundation

- Sentry native integration and source maps;
- health endpoint(s) and service adapters;
- issue normalization;
- System Health tab and critical email alerts;
- canary/privacy test suite.

Requires a new native build.

### Phase 2 — reports and version registry

- in-app report intake and screenshots;
- report workflow and email reply link;
- roles for Support/Safety;
- native build and EAS update registry;
- report/issue/version linking.

### Phase 3 — KPI foundation

- separate consent;
- versioned KPI definitions;
- minimal structured outbox and aggregates;
- headline and feature-area KPI views.

Do not enable provisional KPI collection until formulas and consent copy pass final review.

### Phase 4 — release-readiness integration

- release comparison and health gates exposed to the later Gradual Release PRD;
- rollback drill evidence displayed when that feature is specified and implemented.

## 23. Dependencies and follow-up tasks

Dependencies:

- production admin authentication and multi-factor authentication;
- server-side role authorization;
- privacy policy and store declarations;
- a new native build for full crash capture;
- safe public/internal health endpoints;
- Expo/EAS release metadata access;
- retention/deletion jobs and attachment storage rules.

Separate follow-up PRDs:

- **Gradual Release and Rollback** — initial percentage, expansion authority, stop thresholds, rollback
  mechanism, drills, and store-versus-over-the-air differences.
- **Moderation Operations** if report-count escalation, automatic restriction, appeal, evidence review, or
  staff moderation workflows expand beyond this console's intake/triage scope.
- **Encrypted Message Evidence Reporting** before selected message content can leave an end-to-end encrypted
  thread.

## 24. Provider comparison and rationale

### Sentry — selected initial crash provider

Strengths: first-class Expo/EAS integration, JavaScript and native crash capture, release/update correlation,
source maps, alerting, API access, and a free initial allowance. Risks: external processor, event quota,
dangerous optional context/replay features, and evolving availability-monitor pricing. Mitigation: strict
allowlist, replay/screenshots/breadcrumbs off, hard zero overage, replaceable gateway.

### Firebase Crashlytics — retained fallback, not selected

Strengths: robust native crash grouping and currently no-cost. Weaknesses for PushApp: another Google/Firebase
surface, less direct unified-console path for our Expo/EAS workflow, and advanced breadcrumbs often paired
with Google Analytics, which we do not want. It remains a fallback if Sentry becomes economically or legally
unsuitable.

### PostHog / product-analytics vendors — rejected for initial scope

They add a separate behavioral-data processor and make broad auto-capture/replay easy. PushApp's first KPI
set is small and can use explicit events on the existing Supabase infrastructure.

### Grafana / Metabase / separate BI — rejected for initial scope

They add hosting, accounts, maintenance, cost, or a second dashboard while failing to cover report triage and
version workflow cleanly. A PushApp-owned console over normalized sources better matches the approved product.

## 25. Closed decisions

- Unified internal web console, not a mobile-app screen.
- Four tabs: System Health, KPIs, User Reports, Versions.
- Multiple administrators and role-based access from the first release.
- Mandatory technical diagnostics as part of the base agreement; no user off switch.
- Separate product-KPI consent.
- Random installation identifier, not an account-derived identifier.
- Optional screenshots with preview, confirmation, and metadata stripping.
- Reply to reports by email; editable per-report contact email does not alter the account.
- Reports can originate from another user's profile.
- Planned and released versions both appear, with planned and actual release dates.
- Sentry is the only new initial external vendor; Supabase and Expo/EAS are reused.
- Target incremental cost is zero; no automatic overage or paid upgrade.
- A second external tool is allowed only after clear, documented value unavailable from the existing set and
  explicit founder approval.
- Gradual Release remains a separate PRD.

There are no remaining product questions blocking architecture planning. Provider terms, current quotas,
store declarations, legal wording, and precise technical schemas are implementation gates to verify, not
unresolved product behavior.

## 26. Primary implementation references

- [Expo — Using Sentry](https://docs.expo.dev/guides/using-sentry/)
- [Expo — Monitoring update adoption and failed installs](https://docs.expo.dev/eas-update/download-updates/)
- [Expo — Gradual update rollouts](https://docs.expo.dev/eas-update/rollouts/)
- [Supabase — Metrics API](https://supabase.com/docs/guides/monitoring-and-debugging/metrics)
- [Supabase — Logs](https://supabase.com/docs/guides/monitoring-and-debugging/logs)
- [Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play — Data Safety declarations](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Firebase — Crashlytics pricing/fallback reference](https://firebase.google.com/pricing)

These links support the provider comparison and release/privacy gates; the PRD remains authoritative for
PushApp's stricter collection rules. Reverify provider behavior, quotas, and pricing immediately before
implementation.
