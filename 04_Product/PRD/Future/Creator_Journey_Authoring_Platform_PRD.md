# PRD — Creator Journey Authoring Platform

Status: **Future Vision — strategic direction approved; open product, UX, business, compliance, and
architecture decisions remain.**
Stage: **Future / Commercial (V4)** — not part of the POC or MVP.
Owner: founder + AI product team.
Related: Creator Marketplace, Growth Library, Journey Engine, rich Step types, `../Step_Dependencies_PRD.md`,
Milestones, Journey Success Policy, creator/professional tier, Community Insights, analytics, and
`../../../05_Research/Creator_Journey_Authoring_Competitive_Research_2026-08-13.md`.

---

## 1. Purpose

Provide a professional web-based authoring environment where coaches, teachers, facilitators, and other
approved creators can build structured workshops and programs as PushApp Journeys.

The platform turns expert knowledge into an actionable experience that helps users continue between lessons,
sessions, or moments of motivation. A creator should be able to combine structure, timing, media, reflection,
reporting, and support without needing software-development skills.

This is not the end-user Coach-led Journey creation flow. It is a separate professional authoring product for
reusable Journeys that can later be published, shared, sold, assigned, or offered through the Marketplace.

### 1.1 Approved sequencing principle

PushApp first builds and proves a platform that helps its own users persist through meaningful real-world
change. Only after the Journey, Coach, recovery, support, and adaptation systems work coherently should the
same capabilities be exposed as professional creator tooling.

The creator platform is therefore a later authoring layer over a proven persistence engine—not the mechanism
through which that engine is first invented. Once PushApp can reliably help its own users continue, recover,
and complete Journeys, creators gain a differentiated way to deliver that capability to their audiences.

## 2. Product fit

PushApp's core hierarchy remains:

> Dream → Journey → Milestone (optional) → Step

Creator programs do not introduce a competing Course, Workshop, Lesson, Module, or Task object. Creators may
describe their offering externally as a workshop or program, but it is represented inside PushApp as a
Journey composed of Milestones and Steps.

The creator platform supports richer configuration than the consumer flow, while preserving the principle:

> Complexity belongs to the system, not to the participant.

## 3. Creator roles and initial audience

Potential creators include:

- coaches and mentors;
- workshop facilitators;
- course and educational-content creators;
- fitness, wellbeing, and personal-growth professionals;
- organizations publishing branded Journeys;
- PushApp's internal content team.

Professional verification, regulated fields, organizational roles, co-authors, editors, reviewers, and
publisher permissions remain open. Creator access is not automatically granted to every consumer account.

## 4. Authoring workspace

The future website should provide:

- a creator dashboard listing Draft, In Review, Published, Paused, and Archived Journeys;
- Create Journey, duplicate, import, preview, submit, publish, pause, archive, and create-new-version actions;
- autosave and explicit version history;
- desktop-first editing with responsive review, while participant consumption remains mobile-first;
- clear separation between content, structure, rules, presentation, and publishing metadata;
- validation that prevents publication of an incomplete or impossible Journey.

### 4.1 Recommended authoring model

Competitive research supports a three-level workspace:

1. **Journey outline** — an always-visible ordered list of Milestones and Steps;
2. **Step editor** — participant-facing content, interaction, reporting, and completion rule;
3. **Journey rules** — timing, progression, support, success, and publication.

The authoring model should remain an outline/timeline with an optional dependency overlay, not a free-form
workflow canvas. Basic authoring must stay simple. Advanced rules appear only when intentionally opened.

Creators should also have reusable libraries for Steps, media, and complete Journey templates. Reusing an
item creates an independently editable copy unless a later shared-component model is explicitly designed.

### 4.2 Creator-private guidance

A Journey and each reusable Step may include private creator instructions that participants never see. This
field may describe authoring intent, evidence or references, suitable audience, contraindications, facilitation
notes, and safe adaptations. It must not contain hidden claims or rules that materially affect participants;
those belong in participant-visible content and the Journey policy.

Private guidance has two distinct scopes:

- **Journey guidance** — the overall professional method, boundaries, tone, intended progression, and common
  forms of participant difficulty;
- **Step guidance for the Coach** — context-specific instructions for how the Coach should support a user who
  opens a real-time conversation while currently working on that Step.

These scopes must not be collapsed into one unstructured prompt.

## 5. Journey definition

### 5.1 Identity and fit

The creator defines:

- Journey name;
- short description;
- longer description explaining what change the Journey supports;
- a paragraph describing which Dreams or aspirations it may fit;
- target audience and optional prerequisites;
- creator identity and credentials where relevant;
- language and available translations;
- cover image/visual identity;
- estimated duration;
- expected weekly effort and time per Step;
- difficulty and complexity;
- relevant categories/tags used for discovery, not exposed as user profiling;
- what the participant should be able to do, understand, or sustain by the end.

Dream fit is descriptive metadata and a matching signal. Adopting a creator Journey does not silently create,
rename, or link the user's Dream; the user and Coach approve the relationship.

### 5.2 Journey rules

The creator may configure, subject to platform-safe limits:

- fixed or flexible start date;
- total duration or completion window;
- active days and suggested timing;
- pause/freeze policy;
- editing permissions: editable, partially editable, or locked;
- reminder recommendations;
- reporting mechanism;
- Support Circle recommendation or requirement where allowed;
- privacy-safe Community Insights eligibility;
- success policy and completion threshold;
- restart/repeat policy;
- optional versus mandatory Steps;
- Grace Token/flexibility policy when that future system is active.

Safe defaults should cover common programs. Advanced rules remain collapsed until intentionally enabled.

## 6. Visual Journey structure builder

Creators need a structured editor that shows:

- ordered Milestones;
- Steps within each Milestone;
- dates, cadence, and estimated effort;
- repeated Steps;
- dependencies and waiting Steps;
- mandatory and optional Steps;
- completion and success rules;
- content type and reporting method;
- warnings for unreachable, overloaded, or contradictory configurations.

The initial direction should favor an outline/timeline with a visual dependency overlay—not a general-purpose
project-management graph. Dependency semantics remain governed by `Step_Dependencies_PRD.md`; this platform
only authors capabilities that the Journey Engine supports.

## 7. Milestones

Milestones divide a Journey into meaningful stages and may define:

- title and participant-facing purpose;
- entry conditions;
- included Steps;
- duration or target period;
- exit condition;
- completion threshold;
- feedback, reflection, or checkpoint shown at completion;
- whether the next Milestone starts automatically or requires participant confirmation.

### 7.1 Repeating-until-ready Milestone hypothesis

The founder proposed a cyclic Milestone that repeats until the participant feels ready to continue. Potential
behavior:

1. the Milestone contains a repeatable practice cycle;
2. at each cycle boundary, the participant reports readiness;
3. the user may repeat the cycle or request to move forward;
4. the Coach or creator-defined readiness rule may recommend—not force—the next stage;
5. the participant approves advancement.

This concept is not yet approved. It requires decisions about maximum duration, what happens when readiness
never occurs, scheduled cohort synchronization, progress calculation, refunds/access windows, and whether a
creator may impose objective prerequisites in addition to self-reported readiness.

## 8. Step authoring

### 8.1 Core fields

Each Step may define:

- title and instructions;
- purpose/connection to the Journey;
- Milestone;
- mandatory or optional status;
- estimated duration;
- scheduling/cadence;
- repetition rule;
- dependency/predecessor when supported;
- completion/reporting method;
- attachments and participant inputs;
- creator feedback shown before, during, or after completion;
- private real-time Coach guidance for this Step;
- privacy classification and Support Circle visibility constraints.

### 8.1.1 Step-level real-time Coach guidance

For each Step, an authorized creator may define private guidance used when the participant opens a real-time
Coach conversation while that Step is relevant. The guidance may include:

- the purpose of the Step and the change mechanism it supports;
- common difficulties or resistance participants may experience;
- clarifying questions the Coach may ask;
- safe suggestions, alternatives, or ways to reduce the Step without abandoning its purpose;
- signals that the Coach should recommend pausing, escalating, or seeking qualified human support;
- statements, promises, or interventions the Coach must avoid;
- the conditions under which the Coach may propose a Journey adjustment for participant approval.

At conversation time, the Coach may receive the applicable Journey guidance, current Step guidance, and the
minimum necessary participant context. This is contextual input—not a script that overrides the Coach's core
identity, safety rules, product policy, or the participant's explicit choices.

If several Steps are relevant, the system should prioritize the Step from which the participant opened the
conversation. Otherwise it uses the most immediate active Step and may ask the participant which issue they
want help with. It must not silently combine large amounts of unrelated creator guidance.

The participant should experience one consistent PushApp Coach. The Coach may use the creator's professional
method, but must not impersonate the creator or imply that the creator is personally present unless that is
actually true.

Creator guidance is versioned with the Journey template. Updating it must not silently alter the professional
method for active participants unless the update is classified as safe and compatible, or the participant
accepts the applicable Journey-version change.

#### Safety and quality constraints

- Platform safety, crisis, privacy, and regulated-domain rules always outrank creator guidance.
- Guidance must pass publication review and prompt-injection/content-safety validation.
- A creator cannot instruct the Coach to request unnecessary personal data, expose private context, make
  prohibited claims, or pressure the participant to continue.
- The Coach distinguishes authored facts from current participant facts and must not assume the participant
  experienced a listed difficulty.
- Guidance provided to the model and its use should be traceable by Journey version and Step identifier for
  quality review without exposing unrelated private conversation content to the creator.
- The creator does not receive the participant's Coach conversation merely because creator guidance was used.

#### Authoring assistance

The editor should structure this field rather than presenting only a blank prompt box. Suggested sections are:

1. Step purpose;
2. likely difficulties;
3. useful questions;
4. permitted adaptations;
5. escalation signals;
6. avoid.

Templates and examples should help non-technical professionals write useful guidance. The final authoring
interface may offer a free-text advanced field, but creators never edit the platform's system instructions.

### 8.2 Rich Step types

Future supported experiences may include:

- real-world action with participant report;
- text lesson or instruction;
- image/gallery;
- audio lesson, guided exercise, or meditation;
- video;
- PDF/document or presentation;
- external link;
- checklist;
- open question;
- single-choice or multiple-choice question;
- quiz with optional answer logic and explanation;
- number, scale, date, or other structured input;
- photo upload;
- audio response or file upload, subject to later privacy/cost review;
- reflection or journal prompt;
- guided in-app exercise;
- Coach/AI conversation with an approved purpose and bounded context.

Every type requires an explicit completion rule. Merely opening media must not automatically prove meaningful
completion unless the creator and platform policy define an appropriate threshold.

### 8.3 Repetition

Creators may define a Step that repeats:

- on selected days;
- a number of times per week;
- at a fixed interval;
- until a Milestone exit condition;
- for a bounded number of occurrences.

The participant receives separate scheduled occurrences while the authored Step remains one template. Editing
future occurrences must not rewrite completed history.

### 8.4 Dependencies

Creators may express supported sequential relationships such as:

> complete or partially complete Step A before Step B becomes available.

The authoring interface must prevent cycles, dangling references, unsupported cross-Milestone relationships,
or chains beyond the engine's approved limits. It must explain participant-facing consequences in plain
language rather than exposing database mechanics.

### 8.5 Release rules

The first creator-platform release should prefer a small, understandable vocabulary:

- available immediately;
- available on a scheduled date or relative Journey day;
- available after the previous required Step is completed;
- available after the previous required Step is completed plus a defined delay;
- released manually by an authorized professional under a separately consented delivery mode.

These rules cover common patterns found across course and coaching platforms without creating an unrestricted
automation engine. Manual release must never leave a participant permanently blocked without a visible status,
responsible party, and recovery path.

## 9. Success and completion policy

The creator defines what it means to complete the Journey without turning completion into an arbitrary score.
Potential controls:

- mandatory Steps that cannot be omitted from successful completion;
- optional Steps excluded from the minimum requirement;
- minimum percentage or weighted threshold for remaining eligible Steps;
- required Milestones;
- allowed misses or Grace behavior;
- required input/quiz threshold where pedagogically justified;
- final Step or final reflection requirement.

The editor must show a human-readable simulation:

> To complete this Journey, participants must finish all 4 mandatory Steps and at least 12 of the 16 remaining
> Steps, including Milestones 1–3.

Complex weighting should be avoided unless research proves it is necessary. The system must reject a policy
that makes completion impossible or allows the Journey to complete without its core promise.

## 10. Participant input and data ownership

Rich Steps may collect sensitive participant content. Before enabling any input type, define:

- who can see it: participant only, Coach, creator, Ally, or no human;
- whether creator access is individual, aggregated, or prohibited;
- retention, export, deletion, and account-deletion behavior;
- whether it is required for completion;
- encryption and storage location;
- moderation and illegal-content handling;
- file type, size, malware scanning, and storage cost;
- whether AI may process it and under what explicit consent;
- whether a creator can respond or grade it;
- protections for minors and regulated/sensitive domains.

Default: creators do not receive private participant free text, photos, reports, or Coach conversations unless a
separate, explicit product contract and consent flow permits it. Aggregate completion analytics must not become
surveillance.

## 11. Preview, testing, and validation

Before publication, creators should be able to:

- preview every participant screen in supported languages and RTL;
- simulate different start dates, time zones, and week boundaries;
- run through the Journey as a test participant;
- test dependency unlocks, repetition, misses, pauses, and completion thresholds;
- inspect media loading, captions, transcripts, accessibility labels, and input validation;
- invite private testers without making the Journey discoverable;
- receive a validation report listing errors and warnings;
- reset test data without affecting production analytics.

High-risk configuration errors should block submission. Quality warnings may require acknowledgement or
review.

### 11.1 Journey Health Check

Before publication, the platform should generate both a technical validation report and a participant-centered
Journey Health Check. It should identify:

- impossible, circular, or unreachable progression;
- repeated Steps that cannot occur enough times before the Journey ends;
- overloaded days or implausible weekly effort;
- an unclear, trivial, or impossible success policy;
- mandatory Steps without an accessible alternative;
- missing captions, transcripts, alternative text, or localization;
- unnecessary or sensitive participant-data collection;
- dependencies whose participant-facing consequence is unclear;
- a promised outcome that is unsupported by meaningful real-world action.

Safety, privacy, accessibility, and structural failures block submission. Quality guidance remains a
recommendation and does not pretend to guarantee participant outcomes.

### 11.2 Demo participant

Visual preview and behavioral testing are separate. Each creator workspace should include a persistent demo
participant that does not count toward live analytics or participant limits. The creator may reset it, change
its time zone/week boundary, advance simulated time, submit different outcomes, and observe the Journey exactly
as a participant would.

## 12. Drafting, versions, and updates

- Every edit autosaves to a Draft version.
- Published versions are immutable snapshots for audit and participant continuity.
- Minor safe corrections may apply to active participants only under defined compatibility rules.
- Structural changes create a new version and never silently rewrite an active participant's plan.
- The creator sees which versions have active participants.
- A participant may remain on the original version, accept migration, or receive a Coach-guided proposal,
  depending on the change.
- Retiring a Journey removes it from new adoption but preserves existing participant access and history under
  the applicable policy.

Open: define which changes are copy-only, compatible, migratable, or breaking.

## 13. Publishing and Marketplace lifecycle

Potential lifecycle:

1. Draft;
2. private test;
3. submitted for review;
4. changes requested or approved;
5. published privately, by link/code, to selected clients/cohorts, or publicly in the Marketplace;
6. paused, retired, or archived;
7. new version submitted.

Review may cover:

- safety and prohibited claims;
- creator identity/credentials;
- content quality and Journey coherence;
- copyright and media ownership;
- privacy and data collection;
- accessibility and localization;
- pricing/refund disclosure;
- technical validation.

Paid publication, revenue share, subscriptions, refunds, taxes, regional availability, moderation, and store
payment compliance require separate commercial and compliance specifications.

### 13.1 Recommended release sequence

Competitive research supports the following staged rollout:

1. **Internal Studio** — PushApp's content team authors and tests first-party Journeys.
2. **Invited professionals** — a small verified group authors private Journeys distributed by assignment,
   link, or code.
3. **Controlled catalogue** — reviewed creator Journeys become discoverable to selected audiences.
4. **Marketplace and organizations** — paid access, revenue share, teams, branded catalogues, cohorts, and
   public creator onboarding only after safety, moderation, payments, and continuity are proven.

An open creator platform must not be the first release.

## 14. Creator analytics

Creators may receive privacy-preserving information such as:

- starts, active participants, and completions;
- aggregate Step/Milestone completion and drop-off;
- aggregate difficulty, clarity, usefulness, and recommendation feedback;
- version comparison;
- media completion/errors;
- broad timing patterns when sufficiently aggregated;
- Community Insights and reviews under their own rules.

Creators must not see private Dreams, individual reasons for misses, personal Coach context, Ally activity,
free-text answers, photos, or health behavior unless a separate consented feature explicitly permits it.
Minimum cohort thresholds and suppression are required to prevent re-identification.

## 15. Accessibility, localization, and media requirements

- Captions for video and transcripts for audio are required before public publication.
- Images need alternative text; interactive content needs screen-reader labels and keyboard navigation.
- Every participant-facing field must support localization rather than embedding text in media.
- Preview must cover RTL and text expansion.
- The creator declares ownership/license for uploaded media and quotations.
- Supported formats, duration, compression, storage limits, streaming, offline availability, and moderation are
  architecture/cost decisions—not creator-defined freedoms.

## 16. AI assistance hypothesis

The authoring platform may later help creators:

- convert an outline into a proposed Journey structure;
- identify missing Milestones, overloaded weeks, unclear completion rules, or inaccessible media;
- suggest Step wording, questions, summaries, and translations;
- generate a test plan and flag contradictory rules;
- propose Dream-fit metadata;
- analyze aggregate participant friction and propose a new version.

AI always proposes; the creator reviews and approves. It must not invent professional credentials, medical
claims, citations, or participant outcomes. Metered generation requires a separate cost gate.

This authoring assistance is separate from the participant-facing Coach using approved Journey and Step
guidance during a real-time support conversation.

## 17. Edge cases

- empty Journey, Milestone, or mandatory-Step set;
- circular or unreachable dependencies;
- repeated Step and dependency rules conflict;
- completion threshold is impossible or trivially satisfied;
- cyclic Milestone never exits;
- duration ends before required Steps can occur;
- creator deletes/replaces media used by active participants;
- creator account is suspended while participants are active;
- published Journey contains a broken link or unavailable media;
- participant is offline during an input or media Step;
- upload fails, duplicates, contains malware, or exceeds limits;
- a quiz answer or success rule changes after completion;
- localization is incomplete or changes the meaning of a question;
- participant changes time zone/week boundary mid-Journey;
- creator edits while a reviewer is reviewing the same version;
- two editors overwrite one another;
- Journey is free, paid, gifted, assigned by a coach, or joined by code;
- participant requests deletion while aggregate creator analytics exist;
- a cohort is too small to show safe analytics;
- accessibility requirement is missing at submission;
- copyright complaint requires urgent media removal;
- creator tries to collect contact, payment, or sensitive data through an open question.

## 18. Open product questions

### Creator and business model

1. Who may become a creator, and what verification is required?
2. Is the first release for PushApp's internal team, invited coaches, or an open creator platform?
3. Are creators building public Marketplace Journeys, private client Journeys, cohort workshops, or all three?
4. Can several creators co-author one Journey, and which roles can edit, review, publish, or view analytics?
5. What pricing and revenue-share model applies, and who owns the participant relationship?

### Structure and participant experience

6. Which rich Step types are required in the first creator-platform release?
7. Are branching paths ever needed, or do linear dependencies and Milestones cover the vision?
8. Can creators require specific Support Circle participation, or only recommend it?
9. How does a repeating-until-ready Milestone exit, and may it have a maximum cycle count?
10. Can a creator lock a Journey completely, and which participant adaptations must always remain available for
    accessibility or changed life circumstances?
11. Does the Coach adapt a creator Journey, or must every structural change be approved by the creator's policy?
12. Which Step types or professional domains require structured Coach guidance before publication?
13. How should the Coach behave when the participant opens a general conversation while several Steps are
    simultaneously active?

### Success policy

14. Is completion based only on mandatory/optional Steps plus a simple percentage, or are weighted Steps needed?
15. Can quizzes require a passing score, retries, or creator review?
16. What happens when a participant cannot complete a mandatory Step for a legitimate reason?
17. Can the Journey finish when its duration expires but the completion threshold is not met?

### Content and data

18. Which participant inputs can creators see, and what consent is required?
19. Are open answers private reflection by default or creator-submitted coursework?
20. Who moderates uploads and creator content?
21. Which media formats, limits, streaming/offline rules, and storage quotas apply?
22. How do localization, captions, transcripts, and accessibility affect publication approval?

### Publishing and updates

23. What distinguishes private test, private publication, cohort assignment, link sharing, and Marketplace
    publication?
24. Which edits may reach active participants without creating a new version?
25. Can active participants migrate between versions, and who approves the change?
26. What happens to active participants when a Journey or creator is suspended?
27. Which reviews, ratings, completion data, and outcome claims may appear publicly?

## 19. Open architecture questions

1. What is the versioned Journey-template schema, and how does an adopted Journey snapshot relate to it?
2. How are repeated Step occurrences generated without duplicating authoring data or rewriting history?
3. How are media assets stored, transcoded, streamed, cached, scanned, and deleted?
4. Which authoring validations run locally, server-side, or during review?
5. How are concurrent editing, autosave, comments, review locks, and version conflicts handled?
6. How does preview execute safely without contaminating real event, notification, XP, or analytics systems?
7. What backend services are required for publishing, entitlements, assignment, cohorts, and analytics?
8. How are aggregate analytics anonymized and suppressed for small cohorts?
9. How are templates localized and versioned independently from structural logic?
10. What audit trail is required for creator changes, moderator actions, participant consent, and claims?
11. How is the applicable Step guidance selected, bounded, versioned, retrieved, and injected into a real-time
    Coach conversation without exceeding context or exposing unrelated participant information?
12. What evaluation suite verifies that creator guidance improves responses without overriding Coach safety,
    privacy, or product behavior?

## 20. Promotion gates

Before development:

- choose the first creator audience and publication mode;
- define the minimal rich Step catalog and success policy;
- prove the core PushApp persistence, recovery, Coach, and Support Circle systems before exposing professional
  authoring;
- define the structured Step-level Coach-guidance schema, review rules, and evaluation suite;
- produce a creator UX prototype and participant preview flow;
- architect the versioned template/adoption model;
- security/privacy review of every participant input and creator analytics surface;
- store/commercial compliance review for paid content, health claims, creator content, and moderation;
- cost review for media storage, streaming, transcoding, AI, and creator quotas;
- product-guardian review to prevent drift into a generic course/LMS or task-management product;
- define creator support, review, takedown, and active-participant continuity.

## 21. Competitive conclusions

Research across LearnWorlds, Thinkific, Kajabi, Teachable, Quenza, CoachAccountable, Circle, and Mighty
Networks shows three established product centers: course/content delivery, professional client management,
and community-led programs. PushApp should learn their familiar authoring conventions—outline-first editing,
reusable content, autosave, preview, test users, drip/release rules, explicit publishing states, and private
professional notes—without turning into a generic LMS or community platform.

PushApp's differentiated authoring proposition is:

> A Journey Studio that converts professional guidance into sustained real-world action, including recurrence,
> meaningful completion, recovery, participant-approved adaptation, and consented personal support.

The first professional release should therefore prioritize the Journey Engine, participant simulation,
version safety, and privacy. Commerce, public community, cohorts, and marketing automation follow later.

Full findings and sources:
`../../../05_Research/Creator_Journey_Authoring_Competitive_Research_2026-08-13.md`.

## 22. Out of scope for this initial PRD

- implementation of the website;
- final pricing and revenue share;
- open creator enrollment;
- coach marketplace and appointment management;
- live video classes or webinar hosting;
- general-purpose website/page builder;
- unrestricted workflow graph or project-management features;
- direct creator access to private Coach conversations or unrestricted participant data;
- final rich Step schemas and media limits.
