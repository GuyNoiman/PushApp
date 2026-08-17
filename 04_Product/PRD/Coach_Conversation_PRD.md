# PRD — Coach Conversation Surface and Context Handoff

Status: **Approved product behavior — agent intelligence and orchestration are specified separately; security
architecture and production AI backend remain release gates.**  
Stage: **MVP.**  
Owner: founder + AI product team.  
Related: `Coach_Context_Summaries_PRD.md`, `Dream_Management_PRD.md`, `Done/Weekly_Review_PRD.md`,
Journey editing, miss recovery, real-time support, onboarding, communication style, AI-agent architecture,
account export/deletion, and Decision D30/D45.

---

## 1. Purpose

The Coach conversation is PushApp's single conversational surface for helping a user turn intention into
action, review and change an existing Journey, recover from difficulty, or receive relevant support in the
moment.

This PRD defines:

- how the conversation is opened;
- how its source becomes visible, trustworthy context;
- the four approved conversation purposes;
- the one rolling thread and unfinished-draft lifecycle;
- proposal and approval boundaries;
- offline, failure, privacy, safety, and lifecycle behavior.

It does **not** define the internal architecture, prompts, models, experts, or orchestration of the intelligent
Coach. Those are being specified independently. The conversation surface consumes that system through a stable
contract.

## 2. Current code truth and gaps

The current app contains two development implementations behind `featureFlags.liveCoach`:

- `LiveCoachScreen`, using the experimental Gemini-backed `CoachOrchestrator`;
- `ScriptedCoachScreen`, a deterministic conversation created only to validate visual design.

Neither is the final production Coach.

Current limitations:

- the scripted flow may ignore the meaning of free-text replies and routes to manual Journey creation;
- the experimental live flow is available only in configured development builds;
- conversation state exists only in React memory and is lost when the screen is unmounted;
- the conversation has no durable visible history;
- entry points pass only coarse route parameters, mainly `mode=edit` and `journeyId`;
- several entry points open a generic Coach conversation with no source-specific opening;
- sensitive-domain handling is based on an experimental broad handoff and may route to manual creation;
- failure recovery can return the user to an earlier state;
- no production contract defines concurrent conversations, stale context, retention, reset, or account deletion.

These behaviors are development scaffolding, not approved production behavior.

## 3. Approved principles

1. The scripted conversation is **development-only** and must never ship to end users.
2. The experimental Gemini implementation is not treated as the final Coach specification.
3. There is one user-facing Coach and one rolling conversation thread.
4. Every entry point provides explicit, minimal context about why the user opened the Coach.
5. The same Coach surface supports several purposes without creating separate chat identities.
6. The Coach may propose; creating or changing product state requires the user's explicit approval.
7. Conversation continuity should reduce repetition without turning transcripts into unrestricted behavioral
   profiling.
8. Manual Journey creation may remain during development, but is removed from the ordinary production path
   once the Coach is sufficiently capable. A safety boundary must never be bypassed through manual creation.

## 4. Conversation purposes

The initial purpose enum is extensible and contains:

### 4.1 Create a Journey

The user wants to express a Dream, aspiration, goal, or change and receive a Journey proposal.

Potential sources:

- Home Coach entry;
- onboarding completion;
- My Dreams;
- Future/Parked goal activation;
- a general Coach conversation that develops into Journey creation.

### 4.2 Edit an existing Journey

The user opens the Coach from a specific Journey to discuss a change. The context includes the stable Journey
identifier, current version/revision, lifecycle status, and requested edit intent where known.

The Coach never edits the Journey silently. It presents a complete proposal and applies it only after approval.

### 4.3 Real-time support

The user asks for immediate help related to a current Journey or Step—for example, managing an urge while
working toward smoking cessation. The goal is useful support in the present moment, not automatically changing
the Journey.

The context may include the Journey, the Step from which the conversation opened, current Step state, and
approved creator/Step guidance when that future capability exists. It excludes unrelated private data.

### 4.4 General reflection or direction

The user wants to discuss a Dream, difficulty, decision, or direction without committing to creating or editing
a Journey. The Coach may later ask whether the user wants a proposal, but conversation alone does not create
one.

New entry purposes may be added later without creating another conversation history. Each requires its own
context contract, safety behavior, user-facing opening, and tests.

## 5. Entry-context contract

### 5.1 Structured context envelope

Every entry point opens the Coach with a typed, versioned envelope rather than an arbitrary hidden prompt.
Minimum fields:

- `purpose`;
- `sourceSurface` and `sourceAction`;
- referenced Dream, Journey, Step, report, weekly proposal, or other approved object IDs;
- authoritative object revision/version where needed;
- language and form of address;
- client-generated idempotency/entry ID;
- timestamp and schema version.

The client never supplies trusted Journey content, owner identity, permission, or status merely as free text.
The Coach service resolves referenced objects through the authenticated account and retrieves only the minimum
fields permitted for that purpose.

### 5.2 Visible contextual opening

The context is represented in the conversation by a visible, localized opening on the user's behalf, for
example:

> I need real-time help with my smoking-cessation Journey.

Other examples:

- “I want to make a change to my Morning Movement Journey.”
- “I marked today's Step as Not Done and want help deciding what to do next.”
- “I want to create a new Journey.”

The opening must be truthful and must not claim that the user said details they did not provide. Sensitive
reason text, private reports, or inferred diagnoses are not copied into it. The user can see which Journey or
Step supplied the context and can remove or change that context before continuing when the situation is not
time-critical.

The structured envelope remains authoritative; the visible sentence is presentation, not an instruction that
the model may parse as trusted state.

### 5.3 Entry-point behavior

- **Journey edit:** immediately identifies the Journey and opens in edit purpose.
- **Not Done/Partial report:** opens after the report is safely saved; passing its reason requires explicit
  permission and minimization. A report failure does not open a conversation that assumes success.
- **Real-time help:** minimizes steps before reaching support; contextual opening may be sent immediately and
  remains visible.
- **Weekly Review editing:** references the pending proposal and its revision; later approval remains governed
  by the Weekly Review PRD.
- **General entry:** opens the existing thread without inventing object context.
- **Stale or unauthorized object:** explains that the original context is no longer available and continues as
  a general conversation; it never exposes another account's data.

## 6. One rolling conversation

### 6.1 Thread model

The user has one rolling Coach conversation rather than separate chats for each Journey or purpose. New
contextual sessions appear as visible boundaries inside that thread.

The thread may contain several completed conversational episodes, such as Journey creation followed later by
real-time support. The active context changes; older context is not automatically attached to every new model
request.

### 6.2 History

Conversation history remains visible across navigation and app restart until the user:

- resets Coach history;
- deletes the account;
- removes it through an applicable data-control flow;
- or a later approved retention policy, clearly disclosed in advance, requires deletion.

The current approved product behavior does **not** automatically delete completed visible history after seven
days. Seven days applies only to unfinished resumable workflow state.

History retention does not authorize sending the entire transcript to the AI provider. Each request uses a
bounded current window plus separately approved Coach Context Summaries when consent exists.

### 6.3 Active draft and seven-day expiry

An unfinished structured workflow—answers, current question, unsent draft, proposal-in-progress, pending tool
call, and referenced revisions—is stored as an active draft.

- Returning within seven days resumes from the saved point.
- The user may choose **Continue** or **Reset conversation**.
- After seven days without activity, the unfinished workflow state expires and cannot execute pending actions.
- Messages already sent remain in visible history; unsent text and incomplete selections are deleted.
- Returning after expiry begins a new episode with a neutral note that the unfinished process expired.
- Reset deletes the active draft and visible history after confirmation but does not undo Journeys or changes
  already approved and applied.

### 6.4 One active workflow

Only one structured Coach workflow may be active at a time.

If a new contextual entry arrives while another workflow is unfinished, show:

- continue the existing workflow;
- pause it and start the new request;
- cancel the new request.

Real-time safety support may interrupt a lower-priority creation/edit workflow without deleting it. The paused
workflow remains resumable until its original seven-day expiry. The interface still presents one thread, not
parallel chat rooms.

## 7. Proposal and approval contract

The Coach can discuss and prepare a proposal, but cannot directly mutate authoritative product objects.

### 7.1 Creation proposal

Before creating a Journey, show the meaningful proposal fields, including:

- Dream relationship;
- Journey name and intended change;
- Milestones and Steps where applicable;
- schedule, active days, and relevant windows;
- reminders;
- Support Circle recommendation;
- completion/success rules;
- assumptions or unresolved details that materially affect the Journey.

### 7.2 Edit proposal

An edit proposal shows the current state, proposed state, affected future occurrences, and any impact on
reminders, dependencies, Support Circle visibility, completion, or weekly planning.

### 7.3 Atomic approval

- Discussion and partial revisions do not apply product changes.
- The user approves the complete final proposal.
- The server/engine validates referenced revisions before applying.
- A stale proposal is rebuilt or reconfirmed rather than force-applied.
- Repeated approval, retries, or lost responses are idempotent and never create duplicate Journeys or edits.
- The conversation records that a proposal was approved or rejected but does not become the authoritative
  Journey history.

## 8. Production availability and fallback

- Production must never silently fall back to the scripted design prototype.
- When the intelligent Coach is unavailable, show an honest availability/error state, preserve the active
  draft, and offer retry.
- A manual Journey builder may be offered only while it remains an explicitly supported development/MVP
  fallback and the failure is ordinary availability—not a safety restriction.
- Once the Coach meets the approved capability threshold, manual Journey creation is removed from ordinary
  product navigation.
- Read-only conversation history remains available when the Coach service is unavailable, subject to local
  data availability.

## 9. Safety behavior

- Safety decisions are based on the user's request, risk, and required capability—not merely a broad domain
  label such as addiction or relationships.
- A safe behavioral Journey such as reducing smoking may remain supported while medical treatment, diagnosis,
  medication direction, abuse crisis, or imminent danger follows the applicable specialist/safety flow.
- A safety stop explains the boundary without shaming or falsely claiming professional care.
- Manual Journey creation cannot bypass a safety restriction.
- Imminent-risk behavior uses a separately approved crisis protocol and localized resources; generic fallback
  text is insufficient.
- The Coach never impersonates a professional, creator, or human who is not actually present.
- Creator or expert guidance is subordinate to PushApp safety, privacy, and user choice.

## 10. Privacy, storage, and security

Raw Coach history is among the product's most sensitive data.

Approved requirements:

- history and active drafts are private account data and never visible to friends, Allies, creators, employers,
  or ordinary analytics;
- no transcript text in logs, crash reports, notification previews, DomainEvents, engagement analytics, or
  model-training datasets;
- account export includes the history in an understandable form;
- reset and account deletion remove history, drafts, derived indexes, provider artifacts where applicable, and
  backups under the disclosed policy;
- only minimum relevant context crosses the AI-provider boundary;
- provider retention/training settings and production key architecture require security review;
- attachments, voice, images, and files are not implicitly part of transcript storage.

Architecture must choose one of two compliant MVP approaches before implementation:

1. encrypted on-device history, which survives app restarts but not device loss/reinstallation; or
2. account-synchronized end-to-end encrypted history, with reviewed key recovery and multi-device deletion.

Plaintext cloud transcript storage is not an acceptable default. The user asked that history remain if it can
be protected safely; inability to meet the security floor requires limiting persistence transparently rather
than silently weakening protection.

Coach Context Summaries remain separate. A visible transcript is not persistent inference memory, and resetting
history does not silently retain transcript-derived summaries. The reset flow must state whether separately
consented summaries are also being deleted and allow the user to include them.

## 11. Offline and failure behavior

- Opening an existing thread offline shows locally available history.
- Sending while offline remains visibly queued as unsent or fails locally; it is never displayed as delivered.
- Unsent content is not submitted automatically days later without a visible pending state and user control.
- Closing/backgrounding while the Coach is responding preserves the request ID and draft state.
- A late response is accepted only for the matching active episode and context revision.
- Timeouts provide retry without duplicating the user's message or action.
- If creation/edit succeeds but the response is lost, reconciliation retrieves the authoritative result.
- Provider or backend failure cannot corrupt Journey state or delete conversation history.

## 12. Notifications

- Coach response notifications are optional, respect active hours and notification privacy, and never include
  sensitive transcript or Journey detail on the lock screen.
- Tapping re-authenticates and opens the correct conversation episode.
- A response notification is suppressed when the user is already viewing the conversation.
- No repeated notification is sent merely because the response remains unread.

## 13. UX requirements

- One consistent Coach identity and voice across all purposes.
- Visible context boundary when the source or purpose changes.
- Clear distinction between sent, sending, failed, and unsent messages.
- Reset history is available from the conversation menu, requires confirmation, and explains its effect.
- Long histories load progressively and preserve scroll position.
- The newest actionable content receives focus without unexpectedly jumping while the user reads older content.
- Full English/Hebrew, LTR/RTL, dynamic type, screen-reader, keyboard, reduced-motion, and light/dark support.
- Generated contextual openings use the active language and form of address without rewriting prior history
  when language changes.

## 14. Edge cases and scenarios

- empty, whitespace-only, extremely long, pasted, or unsupported-language input;
- several goals or several referenced Journeys in one message;
- entry from a Step that becomes Done, deleted, postponed, or unavailable before the Coach responds;
- Journey frozen, completed, abandoned, deleted, or changed during a conversation;
- pending Weekly Review proposal expires during editing;
- user enters from Not Done but the report failed to persist;
- two contextual entries arrive almost simultaneously;
- real-time help interrupts Journey creation;
- application closes while waiting for the provider;
- app restart, OS termination, device clock change, and seven-day draft expiry;
- offline send, reconnect, duplicated response, lost acknowledgement, and out-of-order response;
- sign-out and a different account signs in on the same device;
- device replacement or reinstall under either approved storage architecture;
- user resets while a request or product mutation is in flight;
- account deletion while a provider call is in flight;
- consent to Coach Context Summaries is declined or withdrawn;
- context references another user's shared Journey after access is revoked;
- sensitive request, crisis language, medical instruction, abuse, minors, or illegal content;
- provider unavailable, rate-limited, over budget, malformed, or returns unsafe output;
- model suggests an unsupported action or invents product state;
- history is too large for one request or for smooth rendering;
- language or form of address changes mid-episode;
- conversation notification opens a stale/deleted episode.

## 15. Required tests

### Context and authorization

- every current entry point produces the correct typed purpose and minimum references;
- server rejects forged, stale, unauthorized, cross-account, or malformed context;
- generated opening is visible, localized, and contains no prohibited private data;
- object deletion/access revocation invalidates context safely.

### Persistence

- navigation and process restart preserve history and active workflow;
- unfinished workflow resumes before seven days and expires correctly afterward;
- reset removes history/draft and does not undo approved Journeys;
- account switch never exposes the previous account's transcript;
- export and account deletion include/remove every history artifact.

### Proposal safety

- no create/edit occurs before final approval;
- stale proposal cannot apply;
- retries are idempotent;
- partial/rejected proposal changes nothing;
- safety stop cannot route around itself through manual creation.

### Reliability and UX

- offline, timeout, background, duplicate, late, and out-of-order scenarios;
- no scripted prototype in a production build;
- English/Hebrew, RTL, long text, accessibility, and error states;
- one active workflow and real-time interruption behavior;
- transcript never enters social, analytics, notifications, logs, or creator payloads.

## 16. Success signals

Use aggregate, privacy-safe operational signals only:

- contextual entry successfully opened;
- user reached a proposal where relevant;
- proposal approved, edited, or declined;
- Journey created/edited without duplication;
- active workflow resumed or expired;
- technical failure/retry rate;
- safety handoff category without transcript text;
- one-week Journey continuation measured from authoritative Journey events, not chat engagement.

Do not optimize message count, session length, or time in conversation. The Coach succeeds when it helps the
user take useful action safely.

## 17. Acceptance criteria

1. Production cannot render the scripted design prototype.
2. Every entry point opens the one Coach thread with a typed, authorized, visible context boundary.
3. Create, edit, real-time support, and general reflection are supported purposes.
4. History survives navigation/restart under the approved protected storage architecture.
5. Unfinished workflow state resumes for seven days, then expires without deleting sent history.
6. The user can reset history; account deletion/export cover it completely.
7. No Journey or other state changes before explicit final approval, and retries are idempotent.
8. Offline/provider failures preserve drafts and authoritative product state.
9. Safety restrictions cannot be bypassed through manual Journey creation.
10. History and context do not leak to social, creator, analytics, logs, or lock-screen surfaces.
11. The surface passes context authorization, lifecycle, security, accessibility, RTL, and failure tests.

## 18. Open implementation and specialist gates

Product behavior is approved. The following do not require founder product decisions unless a proposed design
would weaken the requirements above:

- final Coach/expert agent architecture and evaluation suite;
- production model/provider and server-side key handling;
- on-device versus end-to-end encrypted sync choice for transcript history;
- key recovery and multi-device conflict behavior;
- exact crisis/safety protocol and country-specific resources;
- data-retention/legal wording and provider deletion guarantees;
- cost caps, graceful rate limiting, and provider fallback architecture;
- migration from development-only local conversation state.

Security/privacy and store-compliance review are mandatory before production.

## 19. Out of scope

- defining the internal Coach/expert architecture;
- multiple named Coach chats or user-created conversation folders;
- social sharing of Coach conversations;
- creator access to transcripts;
- autonomous Journey mutation;
- voice/video conversation and transcript attachments;
- model training on private conversations;
- permanent manual Journey creation after the Coach meets its approved capability threshold.

