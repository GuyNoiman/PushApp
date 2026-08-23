# PRD — Personalized Motivation Engine

Status: **Future Vision — initial concept captured; open product and architecture questions.**
Stage: **Future / Commercial** — not part of the MVP or initial POC.
Owner: founder + AI product team.
Related: `Adaptive_Communication_Engine_PRD.md`, `../Communication_Style_Profile_PRD.md`,
`../Smart_Notification_Timing_PRD.md`, Dream and Journey context, domain experts, Coach, notification
content, on-call tools, and outcome metrics.
Research references: `../../../05_Research/Competitive_Landscape.md` and
`../../../05_Research/Rega_Motivation_and_Coaching_Review_2026-08-24.md`.

---

## 1. Purpose

Deliver timely, truthful encouragement that reconnects the user to their Dream and makes real progress
tangible. The engine should learn which approved motivational messages are actually helpful while minimizing
interruptions and never optimizing for opens or time in the app.

The founder's intent is that PushApp eventually sends the best motivational content for the relevant person
and moment. Feedback on each message improves both personal selection and the shared quality ranking used for
future users.

## 2. User value

Motivation often fades between planning and action. Generic quotes can feel empty, while private progress may
contain evidence that the person's effort is already changing real life. The engine can reconnect:

- the Dream — why the change matters;
- the Journey — what the person is working on now;
- verified progress — what has already changed;
- the next useful action — when one is appropriate.

Example messages raised by the founder:

- “So far, you have saved an estimated ₪X.”
- “You have smoked an estimated X fewer cigarettes since starting.”
- “Your current average is down to X.”
- a truthful health-oriented encouragement supported by an approved source and the user's verified inputs;
- a known motivational quotation whose source and reuse rights are verified;
- a personalized sentence grounded in the user's Dream and approved Coach context.

## 3. Content families

### 3.1 Computed progress statements

Derived from user-confirmed baselines and authoritative progress events. Possible metrics include money saved,
time reclaimed, units reduced, distance accumulated, or another domain-appropriate result.

Requirements:

- disclose that an estimate is an estimate;
- show or make accessible the baseline and formula;
- allow the user to edit the baseline;
- never invent missing consumption, price, health, or outcome data;
- never present medical improvement as fact unless it is an approved general statement whose conditions are
  truly met;
- keep financial/outcome metrics private and out of lock-screen text by default unless the user explicitly
  opts in.

### 3.2 Approved motivational quotations

- Store source, author attribution, language, translation provenance, license/public-domain status, eligible
  themes, and safety exclusions.
- Do not use unattributed internet quotations or copyrighted text without a valid basis.
- A quote must be relevant to the Dream/Journey context; the system does not send quotes merely to create
  activity.

### 3.3 Authored motivation templates

Human-reviewed templates with variables for truthful, privacy-safe context. Templates have stable identifiers,
supported Communication Styles, languages, eligible triggers, and contraindications.

### 3.4 Coach/domain-informed messages

Future Coach or domain-expert output may propose a message, but it must pass the same safety, truth,
localization, frequency, and feedback contracts as catalog content. The initial architecture should not assume
that free-form generation is required.

## 4. Relationship to other engines

- **Personalized Motivation Engine:** owns eligible motivational content, computed facts, feedback, ranking,
  and selection candidates.
- **Communication Style Profile:** controls how an eligible meaning is phrased; it does not decide the fact,
  timing, or ranking.
- **Smart Notification Timing:** proposes Journey-specific times; it does not author motivation.
- **Adaptive Communication Engine:** may eventually choose the channel or choose silence.
- **Coach:** owns the user-facing relationship and may explain or discuss a message.
- **Domain experts:** may define domain-specific formulas, safety rules, and approved content packs.

This separation is a proposed architecture boundary, not yet approved.

## 5. Delivery surfaces and timing

Potential surfaces:

- low-frequency push notification;
- an in-app Coach message;
- Home motivation card;
- Journey detail;
- Weekly Review;
- future on-call tool completion.

The engine does not independently increase notification frequency. Every delivery must pass account Active
Hours, Journey eligibility, notification permissions, privacy-safe lock-screen rules, cooldowns, and the
communication scheduler. Silence is always a valid selection.

### 5.1 Message-to-action contract

Competitive review of Rega reinforced that useful motivation is often embedded in a path the user can act on,
not presented as an isolated quote. Each motivational candidate may therefore include **at most one optional
door** to a contextually relevant destination:

- today's relevant Step;
- a truthful progress detail;
- an appropriate Tool;
- a conversation with the Coach;
- a separately governed immediate-support surface.

The action is not mandatory. The engine must omit it when no genuinely useful destination exists, and it must
never add a call to action merely to increase opens or time in the app. Opening the destination is not proof
that the message helped.

Each candidate should keep structured fields for its eligibility reason, intended meaning, optional door,
privacy-safe lock-screen version, Communication Style variants, and safety/cooldown rules. This is a product
requirement; the final storage schema remains an architecture decision.

The exact triggers remain open. Candidate moments include sustained progress, approaching a difficult Step,
recovery after a miss, a meaningful milestone, or a user-invoked request for encouragement.

## 6. Like / dislike feedback

Every delivered motivational item must have an accessible **Helpful / Not helpful** response, expressed in
the final UI as lightweight like/dislike controls or equivalent wording.

Requirements:

- feedback is optional and never blocks the user;
- record content/template version, language, surface, broad eligible context, and response;
- never store private notification text, Dream text, or sensitive free text in the ranking dataset;
- allow correction of accidental feedback where practical;
- a dislike reduces the likelihood of repeating that content for the same user;
- aggregate feedback changes the content's shared ranking and therefore its chance of selection for other
  eligible users;
- one user's repeated actions must not dominate the global score;
- lack of feedback is not a dislike;
- opening the notification is a delivery/timing signal, not proof that its motivational content helped.

## 7. Ranking and learning direction

Founder-approved concept: every explicit feedback event contributes to content quality and affects future
selection probability.

The exact model is open. A naive global average is insufficient because it over-rewards early content,
penalizes new content, ignores language/domain differences, and can be manipulated. The future design should
consider:

- per-user exclusions and preferences;
- language, Communication Style, content family, surface, and broad non-sensitive context;
- minimum sample sizes and confidence-aware ranking;
- controlled exploration so new content can be evaluated;
- recency decay and version-specific scores;
- abuse resistance and per-account feedback limits;
- global quality floors and human removal/override;
- success measured primarily by explicit helpfulness, not notification opens.

No algorithm should infer emotional vulnerability, diagnosis, addiction severity, or persuadability.

## 8. Content management and architecture options

The content needs a central, versioned source of truth regardless of who authors it.

### Option A — bundled in the app

Simple and offline-capable, but requires an app release for every content correction, cannot update rankings
centrally, and fragments content across versions. Not recommended as the only source.

### Option B — owned independently by every domain expert

Experts can maintain high-quality domain logic, but content, feedback, localization, and safety rules may
fragment. Useful as an authoring source, not necessarily as runtime ownership.

### Option C — generated/owned by the Coach

Highly personalized, but more expensive, difficult to rank across users, harder to moderate/version, and more
likely to mix private context into analytics. Not recommended as the sole initial mechanism.

### Option D — central catalog and ranking service with expert-authored packs

A central service owns identifiers, versions, translations, feedback, eligibility, quality ranking, and
retirement. Domain experts contribute formulas/content packs; the Coach selects, presents, or explains through
one voice. This is the current architecture recommendation for later validation.

Because cross-user rankings must update without an app release, the long-term runtime source is likely
account/backend-side. A small safe catalog may be cached locally for offline in-app use. Final authority,
hosting, cost, and sync behavior remain open.

## 9. Safety and privacy

- No shame, fear, guilt, diagnosis, treatment claim, fabricated urgency, or guaranteed outcome.
- Health messages require a reviewed source, jurisdiction/language suitability, and clear distinction between
  general information and the user's personal health.
- Never reveal sensitive Journey context or computed money/consumption figures on the lock screen without
  explicit opt-in.
- Dream and Coach context remain encrypted/minimized under their own contracts; raw content is not copied into
  the global feedback dataset.
- Users can disable motivational notifications, hide a topic/content family, reset personal feedback, and
  delete/export applicable preference data.
- A disliked or unsafe item can be globally paused immediately.
- Crisis or high-risk content routes to separately approved safety behavior; motivation is not crisis care.

## 10. Edge cases

- missing or stale baseline makes a computed statement impossible;
- the user changes pack price, consumption baseline, unit, currency, locale, or time zone;
- the metric improves and later regresses;
- a notification is delivered but its underlying number changes before opening;
- the same message is translated differently across versions;
- a quotation attribution is disputed or its license changes;
- a message is highly rated globally but repeatedly disliked by one user;
- a new content item has no feedback;
- malicious accounts coordinate likes/dislikes;
- a message is duplicated across Coach, Home, and notification surfaces;
- the suggested destination is no longer available when the message is opened;
- the user completed the suggested Step on another device after the message was selected;
- a motivational message has no genuinely useful action and must remain text-only;
- a high-distress or crisis signal is mistakenly offered to the ordinary ranking engine;
- the Journey is frozen, completed, abandoned, deleted, or unlinked from a Dream;
- the app is offline when feedback is submitted;
- two devices submit opposite feedback;
- the user disables notifications but still wants in-app motivation;
- a calculated financial or health statement would reveal sensitive information to another person viewing the
  device.

## 11. Open product questions

1. Which roadmap stage receives the first slice, and is it in-app only before any motivational push?
2. Which content families launch first: computed facts, authored templates, quotations, or Coach-authored text?
3. Where can the user inspect and edit the baseline/formula behind outcome metrics?
4. Does one metric belong to a Journey, Dream, or both? Can a Journey have several metrics?
5. Which moments make a user eligible for motivation without becoming intrusive?
6. Should Helpful/Not helpful appear directly in notification actions, only after opening, or both?
7. Does a dislike mean “wrong message,” “wrong moment,” “wrong tone,” “already knew this,” or simply not
   helpful? Is one binary signal sufficient?
8. How does Communication Style interact with content ranking when the same meaning has several formulations?
9. What repetition/cooldown rules apply per item, theme, Journey, and account?
10. May users ask for “motivate me now,” and does that use the same ranking model?
11. Which health-related computed statements are permitted, and who reviews their evidence and localization?
12. How are quotes sourced, licensed, attributed, translated, retired, and challenged?
13. Should every eligible item offer a destination, or only when a genuinely useful action exists?
14. Is the first user-invoked surface an explicit “encourage me now” action, a Home card, or neither?

## 12. Open architecture questions

1. Where is the authoritative content catalog hosted, and what is cached on device?
2. Are ranking and eligibility one service or separate pure engines behind repositories?
3. Do domain experts return content identifiers, structured facts, or fully authored candidate messages?
4. Does the Coach receive one selected message to voice, or choose among ranked candidates?
5. How is encrypted Dream context used without exposing raw text to ranking, logs, or analytics?
6. What is the minimum backend needed for cross-user ranking, moderation, versioning, and emergency removal?
7. Which model, if any, is needed at runtime versus offline authoring and review?
8. How are global, language-specific, style-specific, and user-specific scores combined?
9. What confidence/exploration algorithm prevents popularity lock-in and unsafe experimentation?
10. How are costs bounded and observable before any generative path is enabled?

## 13. Promotion gates

Before development:

- complete cited behavioral/content-ranking research;
- approve the first content family and surface;
- security/privacy review of context, computed data, and feedback;
- product-guardian review against growth-before-engagement;
- store-compliance review for health claims and notification behavior;
- cost review before any metered model/service;
- architecture plan for catalog, scoring, moderation, offline behavior, and deletion;
- native-language content and safety review.

## 14. Out of scope for this document

- notification timing learning;
- Communication Style questionnaire;
- general Coach conversation;
- on-call coping tools;
- Achievements, XP, Coins, Missions, and Leveling;
- automatic changes to a weekly plan;
- medical treatment, diagnosis, or crisis intervention.
