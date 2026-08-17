# PRD — Coach Context Summaries

Status: **Approved** — founder-confirmed 2026-08-11.
Stage: **MVP**, with mandatory security/privacy and store-compliance release gates.
Owner: founder + AI product team.
Related: `Dream_Management_PRD.md`, `Future_Journey_Management_PRD.md`,
`Onboarding_Questionnaire_PRD.md`, `Weekly_Review_PRD.md`, account export/deletion, and Decision D23.

---

## 1. Purpose and problem

The Coach should remember enough approved context to continue helping without repeating questions. Raw
transcripts or open-ended disclosure archives create unnecessary risk. This feature stores a short,
bounded, derived summary attached to a Dream or Journey.

It is not a general user profile, diagnosis, transcript, analytics record, or shared object. Persistent
memory is optional. If declined, the Coach uses context only for the current conversation and deletes it
when that conversation ends; Dreams, Journeys, Steps, and normal Coach access remain available.

## 2. Product-philosophy fit

- Reduces repetitive questions while keeping the Coach attentive to real context.
- Preserves agency: product changes still require approval.
- Stores the minimum needed for transformation, not engagement or surveillance.
- Protects aspirations from PushApp staff, friends, Allies, analytics, and unrelated AI calls.

## 3. Competitor references

- [ChatGPT Memory](https://help.openai.com/en/articles/8590148/memory-faq) focuses on high-level
  preferences rather than verbatim blocks and offers temporary conversations.
- [Gemini personalization](https://support.google.com/gemini/answer/16598469?co=GENIE.Platform%3DDesktop&hl=en)
  can be disabled and corrected in conversation.
- [Microsoft Copilot Memory](https://support.microsoft.com/en-us/microsoft-365-copilot/manage-copilot-memory-in-microsoft-365-copilot)
  separates inferred memories from chat history.

PushApp scopes memory to approved Dreams/Journeys and synchronizes it end-to-end encrypted. It does not
add a dedicated memory-management screen in MVP; disclosure, export, conversational correction, consent
withdrawal, and cascading deletion provide control.

## 4. Consent and disclosure

At registration, show a clear, separate disclosure that:

- the Coach derives and stores limited insights to remember context, tailor proposals, and avoid repeated
  questions;
- raw transcripts are not the persistent-memory source;
- summaries sync end-to-end encrypted and are not readable by PushApp staff;
- relevant decrypted context may be sent to the contracted AI provider during an active Coach request;
- the user may decline and still use the product without persistent memory;
- export, conversational correction, consent withdrawal, and deletion apply.

Consent must be affirmative and versioned (timestamp, locale, text version, state), not hidden inside
unrelated terms. Material changes to data type, purpose, recipient, or protection require renewed consent.
Withdrawal stops new summaries and deletes existing summaries/derived indexes after confirmation while
preserving core product objects.

Privacy policy and store disclosures must match. Jurisdiction-specific legal review remains a release
gate.

## 5. Private summary objects

Use distinct private objects, never an unrestricted field spread into outward Dream/Journey payloads.

### Dream Coach Context

Bounded derived fields may cover:

- approved aspiration/identity direction and why it matters;
- general starting point;
- durable boundaries/preferences relevant to future Journeys;
- unresolved questions and explicit uncertainties;
- provenance category, source conversation ID, timestamp, and schema version.

It contains no Steps, schedule, completion rules, or claim that the user wants to act now.

### Journey Coach Context

Bounded derived fields may cover:

- approved outcome and starting point;
- reasons already represented by Why;
- plan-shaping constraints/preferences;
- anticipated obstacle categories;
- rationale for approved adaptations;
- explicit assumptions/unresolved questions;
- provenance category, source change ID, timestamp, and schema version.

Do not duplicate Steps, reminders, Support Circle, reports, or authoritative Journey objects.

### Minimization

- Prefer enums/categories/references and short bounded summaries.
- No transcript, quotations, audio, screenshots, or unlimited version history.
- No diagnosis or unsupported sensitive inference about health, addiction, sexuality, religion, politics,
  trauma, relationships, motivation, or personality.
- Do not infer a sensitive attribute from Journey choice or behavior.
- Mark whether a field derives from an explicit statement or approved product change.
- Replace/remove stale fields; keep only minimal audit metadata needed for safe sync.

## 6. Creation and updates

- Persist only when consent is active and the associated Dream/Journey proposal is approved.
- Do not display the internal summary in every approval flow.
- Update only from an explicit statement or as a narrow deterministic consequence of the exact approved
  Dream/Journey/weekly-plan change.
- Approval of one change is not permission for an unrelated psychological inference.
- Behavior may inform a temporary recommendation but never silently rewrite persistent memory.
- Corrections made in Coach conversation update/remove the relevant field through the confirmed flow.

## 7. Permitted and prohibited use

Permitted, using only relevant minimum context:

- continue a Dream/Journey conversation;
- build a Journey for an approved Dream;
- offer a relevant Future Journey;
- explain plan rationale;
- propose an adaptation or Weekly Review change;
- distinguish explicit facts from assumptions requiring confirmation.

Prohibited:

- Friend Profile, Support Circle, Ally access, messaging, sharing, or sensitive notifications;
- Achievement, Level, XP, Support Score, ranking, ads, pricing, or marketing;
- cross-user comparison, analytics, engagement targeting, or shared-model training;
- unrelated Coach requests.

## 8. No-persistent-memory mode

If consent is declined/withdrawn:

- core objects persist normally;
- no Coach Context Summary is created or updated;
- transient context is available only inside the active conversation and deleted at its end;
- later conversations may ask again;
- declining does not reduce unrelated functionality, apply pressure, or trigger repeated consent prompts.

## 9. End-to-end encrypted sync

Summaries belong to the account but must be protected even from PushApp operators:

- encrypt/decrypt on trusted user devices; server stores ciphertext only;
- modern authenticated encryption, per-account/per-record key separation, versioned envelopes;
- secure multi-device key provisioning/recovery without database plaintext access;
- TLS in transit in addition to content encryption;
- deny-by-default ownership checks even for ciphertext;
- no plaintext in logs, analytics, crash reports, notifications, DomainEvents, backups, indexes,
  embeddings, or support tools;
- conflicts cannot merge accounts or resurrect deleted summaries;
- key-loss/recovery behavior is documented and tested.

Claude must propose the cryptographic/key-management design for security review before implementation.
Server-side “encryption at rest” is not end-to-end encryption.

## 10. AI-provider boundary

- Select relevant IDs before decryption.
- Decrypt only minimum necessary summaries on the trusted device/client.
- Send only relevant bounded fields through the approved provider seam.
- Never attach the full memory catalog or ship a production provider key in the client.
- Provider terms/configuration must prohibit training on this content and bound retention.
- Disclose provider category/purpose; exclude prompts/responses from ordinary observability logs.
- Provider failure cannot corrupt memory or block normal Journeys.

## 11. Access, correction, export, and deletion

No dedicated “What the Coach remembers” screen is required.

- Account export includes current summaries in understandable form, decrypted locally.
- Relevant context may be corrected naturally in Coach conversation.
- Dream/Journey deletion cascades to its summary.
- Consent withdrawal deletes all summaries and derived indexes.
- Account deletion removes ciphertext, keys, indexes/embeddings, provider artifacts where applicable,
  and backups according to the disclosed policy.
- Summary data never survives in a recipient-owned copy because it never enters sharing/messaging.

## 12. Isolation requirements

- Dedicated private repository/gateway types; never serialize by spreading Dream/Journey objects.
- Viewer/social DTOs contain no context field.
- Negative tests prove absence from Friend Profile, Support Circle, messages, sharing exports, analytics,
  logs, notifications, and DomainEvents.
- IDs authorize lookup only after verified ownership.
- Retention/deletion covers encrypted rows and every derived artifact.

## 13. Edge cases

- consent differs across devices;
- update races with edit/deletion;
- stale device restores deleted memory;
- key unavailable/lost or ciphertext corrupt;
- AI proposes unsupported sensitive inference;
- Dream merge/removal or Journey relink/freeze/completion/abandonment;
- export while records unavailable offline;
- provider/network failure after decryption;
- language/RTL ambiguity and long wording;
- deletion while provider request is in flight.

Fail closed: unavailable context means the Coach asks again; it never guesses, leaks, or blocks core use.

## 14. Acceptance criteria

1. Registration offers clear, affirmative, versioned consent.
2. Declining leaves core product and session-only Coach use available.
3. Only approved bounded context persists; no raw transcript is memory.
4. Updates derive only from explicit statements/exact approved changes, not behavior-only inference.
5. Server/operators cannot read synchronized plaintext.
6. Only relevant context is decrypted/sent during an active request.
7. No context enters social, notification, analytics, logs, reward, or sharing payloads.
8. Export, conversational correction, withdrawal, object deletion, and account deletion work.
9. Multi-device sync cannot resurrect deletion or cross accounts.
10. Security/privacy, store-compliance, and provider-retention reviews pass before production.

## 15. Out of scope

- raw chat-history memory;
- a dedicated memory-management screen;
- behavioral profiling/autonomous User Learning;
- advertising, ranking, pricing, or cross-user recommendations;
- automatic sensitive inference;
- model training on user context;
- sharing context with friends, Allies, creators, or employers.

## 16. Open questions

None at product level. Cryptography, recovery, provider configuration, and legal wording require
specialist approval and must not weaken these invariants.
