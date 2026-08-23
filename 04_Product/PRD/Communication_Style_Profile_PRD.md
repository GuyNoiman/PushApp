# PRD — Communication Style Profile

Status: **IMPLEMENTED (MVP scope) — 2026-08-24.** Founder-approved mechanism consolidated 2026-08-12;
the quiz, the four styles, the result screen, Settings retake/reset and account-level persistence
shipped in commit `8313fc7` (D40). **The consumption paths — this PRD's Acceptance Criterion #4, and
the thing that was missing — are now wired:** reminder copy has resolved through the user's style
since the notification-content service landed (`core/notify/reminderCopy.ts`), and on 2026-08-24 the
LIVE COACH began speaking in the chosen voice (`CoachOrchestrator` took a `styleId`;
`useLiveCoach` passes `profileToCoachStyle(getCommunicationProfile())`). The three voices that were
named stubs — direct, gentle, spark — were written from §4, each with the limit §4 states for it;
until then every style resolved back to `steady` and the questionnaire changed only a confirmation
screen. Ready to move to `Done/` once the founder confirms the voices read right on a device.

---

## 1. Purpose

Let each user choose how PushApp speaks to them. A short, scripted questionnaire shows realistic notification
events in several safe writing styles. The user selects one preferred formulation per page; the most-selected
style becomes the account's primary Communication Style.

The selection adapts presentation, not truth or product behavior. Every style communicates the same event,
urgency, action, and privacy-safe information. PushApp never infers personality, vulnerability, diagnosis, or
persuadability from the result.

## 2. Research foundation and product interpretation

PushApp is not a therapist or medical provider. Research on clinician/patient and health-behavior
communication is used only to derive broadly applicable supportive-language principles.

- [Self-Determination Theory meta-analysis](https://pubmed.ncbi.nlm.nih.gov/30295176/) found that combinations
  of autonomy-, competence-, and relatedness-supportive techniques improve perceived support and motivation;
  no single phrasing technique was universally sufficient.
- [Motivational Interviewing overview](https://pmc.ncbi.nlm.nih.gov/articles/PMC3330017/) emphasizes empathy,
  collaboration, shared decision-making, and eliciting the person's own motivation rather than imposing it.
- [Autonomy-supportive digital-language experiment](https://journals.sagepub.com/doi/pdf/10.1177/2055207619832767?download=true)
  explains why controlling “should/must” language can create reactance and why preferences differ between
  people.
- [Self-Determination Theory health meta-analysis](https://selfdeterminationtheory.org/SDT/documents/2012-NgNtoumanis_PPS.pdf)
  supports autonomy, competence, and relatedness as useful foundations for sustained behavior.
- [Cochrane framing review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12926860/) found little consistent
  behavioral advantage for positive versus negative framing across contexts. PushApp therefore does not claim
  one “scientifically best” style and does not include a fear/loss style merely to test it.

Binding principles across **every** style:

- preserve autonomy and offer a clear next action;
- support competence and acknowledge real progress;
- use truthful, concrete, privacy-safe information;
- never shame, guilt, threaten, diagnose, moralize, or fabricate urgency;
- never imply that PushApp is providing treatment;
- never make the user's worth depend on completion or consistency.

## 3. Entry points

- **Onboarding:** after Personal Information and the six-question onboarding questionnaire, or at another K1
  position that does not interrupt the first Coach conversation. The onboarding shell owns final placement.
- **Settings → Communication Style:** view the current style and retake the questionnaire at any time.
- **Weekly Review:** when communication appears ineffective, PushApp may ask whether the user wants to review
  their style and link to Settings. It never selects or changes a style automatically.

The questionnaire is skippable. Skip retains the default style. Retaking does not affect timing, permissions,
or past messages.

## 4. The four approved product styles

These four styles are a product synthesis of researched communication dimensions; they are not a validated
clinical taxonomy. The questionnaire measures contextual wording preference, not personality or treatment fit.

### 4.1 Direct

Short, concrete, action-first, low-emotion. It states what happened or what can be done next without extra
explanation. Direct never becomes commanding, cold, or judgmental.

### 4.2 Explanatory

Context-first and rationale-rich within notification-length limits. It explains why the message matters or
what the relevant state means. Explanatory never becomes verbose, clinical, or patronizing.

### 4.3 Warm

Human, caring, and relational. It emphasizes support and “we are here with you” without pretending the app has
feelings, forming dependency, or using therapeutic claims.

### 4.4 Energizing

Upbeat, concise, and momentum-oriented. It highlights capability and the next positive action. Energizing never
uses hype, excessive punctuation, streak panic, or forced positivity.

These are delivery preferences, not user types. Internal identifiers must be namespaced to avoid collision
with existing Coach implementation enums (for example `communication_profile.direct`).

## 5. Questionnaire interaction

- Standalone introduction: explain that six quick choices tailor how PushApp communicates.
- Six pages, one notification event per page.
- Four formulations per page, one for each style.
- The user selects exactly one formulation, then continues.
- Do not display style names, explanations, scores, or “correct” answers during selection.
- Randomize answer order independently per page while keeping stable accessibility focus behavior.
- Show **Question X of 6** and an overall progress bar.
- Back permits changing an answer; only the latest choice counts.
- Save after every page and resume after restart.
- Allow Skip/exit and retain the previously saved/default style.
- Target completion time: under two minutes.

Introduction copy:

> How should PushApp speak to you?
>
> You'll see 6 short messages, each written in a few different ways. Choose the version you would most like to
> receive. There are no right or wrong answers.

Primary action: **Start**. Secondary action: **Maybe later**.

## 6. Six notification comparisons

The exact localized copy must be authored natively in each supported language. The English catalog below is
the semantic source and style reference, not a machine-translation instruction.

### Q1 — friend request received

Event truth: another user sent a friend request. Action opens the request.

| Style | Title | Body |
|---|---|---|
| Direct | New friend request | Alex sent you a friend request. Review it now. |
| Explanatory | A new friend request | Alex would like to connect with you. Open the request to accept or decline. |
| Warm | Someone would like to join you | Alex sent you a friend request. Take a look and see if you'd like to connect. |
| Energizing | Your circle may be growing | Alex wants to connect — open the request and choose what feels right. |

### Q2 — a friend may need support

Event truth: an authorized friend is eligible for the privacy-safe Home support prompt. Never name the Journey,
Step, report, or reason.

| Style | Title | Body |
|---|---|---|
| Direct | A friend may need support | Alex may need support. Send a message. |
| Explanatory | A friend may need support | Alex may benefit from a check-in. You can open their profile and send a message. |
| Warm | You could make Alex's day a little easier | Alex may need support. A personal message could mean a lot. |
| Energizing | Your support can make a difference | Alex may need you today — send a quick message. |

### Q3 — Steps remain today

Event truth: one or more Steps in today's authorized set remain incomplete. Use count only when accurate; do not
expose sensitive Step names on the lock screen.

| Style | Title | Body |
|---|---|---|
| Direct | 2 Steps remain today | Open today's plan and choose your next Step. |
| Explanatory | 2 Steps remain in today's plan | Completing them will finish the plan you set for today. Choose your next Step. |
| Warm | You're still moving forward | Two Steps are waiting today. We're here when you're ready for the next one. |
| Energizing | Two Steps between you and today's plan | Pick the next one and keep your momentum going. |

### Q4 — Streak may be lost

Event truth: an incomplete Step in today's derived daily set means the Streak will end at day close under the
authoritative Streak policy. This is truthful urgency, never a threat.

| Style | Title | Body |
|---|---|---|
| Direct | Your Streak needs one more Step | Complete today's remaining Step to keep your Streak. |
| Explanatory | One Step remains to keep your Streak | Your Streak continues when today's full plan is completed. One Step is still open. |
| Warm | Your progress is still yours | One Step remains to keep your Streak today. Whatever happens, you can keep moving forward. |
| Energizing | Your Streak is within reach | One more Step today — you've still got time to keep it going. |

### Q5 — positive progress

Event truth: the user has made meaningful, verified progress. The copy must use the actual available measure
rather than generic praise disconnected from behavior.

| Style | Title | Body |
|---|---|---|
| Direct | Good progress this week | You completed 4 of your planned Steps. Keep going. |
| Explanatory | You've completed 4 planned Steps | That is 4 completed Steps toward this week's plan. Review your progress or continue. |
| Warm | Look at what you've already done | Four planned Steps completed this week — your effort is showing. |
| Energizing | You're building real momentum | Four planned Steps are done this week. Keep it moving. |

### Q6 — scheduled Step reminder

Event truth: the user chose a reminder for a specific Step/Journey context. Sensitive content follows the
notification privacy preference.

| Style | Title | Body |
|---|---|---|
| Direct | Time for your next Step | Your planned Step is ready. Open it now. |
| Explanatory | It's time for your planned Step | This reminder is arriving at the time you chose for this Step. Open it when you're ready. |
| Warm | A little reminder for something that matters to you | It's time for the Step you planned. We're here when you're ready. |
| Energizing | Ready for your next move? | The Step you planned is here — let's get started. |

Names, counts, times, and safe context are dynamic tokens and must be accurate. Questionnaire previews use
clearly fictional/example data and state that they are examples.

## 7. Scoring and selection

1. Every answer maps to exactly one of the four style IDs.
2. Each selected answer gives that style one vote.
3. After six questions, the style with the most votes becomes the primary Communication Style.
4. Do not infer secondary traits or retain a personality label.
5. Store the six current answers only as needed to explain/edit/retake the preference; privacy-minimizing
   implementation may store the result plus questionnaire version and discard raw choices after save.

### Ties

With six questions and four styles, ties are possible. If two or more styles share the lead:

- show one additional tie-break page containing a new neutral scheduled-reminder event;
- present only one formulation for each tied style;
- the selected formulation becomes the primary style;
- if the tie-break page is skipped, retain the prior saved style; for a first-time user, use the default.

The tie-break page is conditional and is not described as a seventh scored question. It resolves preference
only; it does not add hidden weighting.

### Default

Default style: **Warm**. It best matches PushApp's established supportive product voice before the user
expresses a preference. All default copy remains concise and autonomy-supportive. Safety/legal/error copy uses
dedicated neutral wording regardless of style.

## 8. Result and confirmation

After selection, show a plain-language preview rather than a personality result:

> Your Communication Style is set to Warm
>
> PushApp will use a more caring, human tone while still telling you clearly what matters. You can change this
> anytime in Settings.

Actions: **Save** and **Try again**. Settings also offers **Use default**.

Style names may be shown on the result/settings page, but never framed as a diagnosis or permanent identity.

## 9. Scope of application

One account-level primary style applies to:

- non-safety Coach wording and conversational delivery;
- notification titles and bodies;
- eligible in-app nudges authored in the same catalog.

The style does **not** change:

- facts, recommendation logic, Journey/Step content, or Coach decisions;
- timing, channel, frequency, notification eligibility, or permission behavior;
- user/friend messages;
- legal, consent, privacy, security, crisis, safety, destructive-action, error, or store-compliance copy;
- form of address, language, or accessibility rules.

For the Coach, style changes phrasing only. Safety and domain boundaries always override it. For notifications,
every event has reviewed variants with identical semantic meaning and action.

## 10. Copy catalog and localization

- Config-before-code catalog keyed by event, style, locale, and content version.
- Every event has all four variants or falls back to the locale's neutral approved variant.
- Resolve copy at send/reconciliation time so current language, form of address, privacy, and style apply.
- Native authoring/review for Hebrew and every locale; do not mechanically translate tone.
- Dynamic tokens have safe fallbacks and cannot expose unauthorized content.
- Copy review verifies semantic parity, length, lock-screen truncation, gender/form-of-address, RTL, and
  forbidden persuasion patterns.

## 11. Change behavior

- Retaking and saving applies immediately to future Coach messages and future/rescheduled notifications.
- Already delivered messages never change.
- Reconcile scheduled notification copy where the OS safely permits; otherwise apply at the next schedule.
- Style never changes automatically based on opens, completion, or Weekly Review.
- Weekly Review may recommend revisiting the questionnaire but cannot recommend or select a specific answer.
- Offline changes save locally and sync through the account preference when available; deterministic conflict
  policy is required for multi-device edits.

## 12. Privacy and analytics

- Communication Style is a private account adaptation preference and never appears on Friend Profile or in
  Support Circle payloads.
- Do not store or analyze which style “works” on a user's vulnerabilities or sensitive topics.
- Product analytics may measure aggregate questionnaire completion and missing-copy failures, but must not
  correlate style with raw Coach content, health domains, or private message text.
- Include the preference in export and delete it with the account.

## 13. Edge cases

- skip before/after answering; tie and skipped tie-break;
- retake with a different result; reset to default;
- language or form-of-address changes after selection;
- missing/invalid locale/style/event variant;
- notification already scheduled or delivered;
- Coach safety response overrides style;
- dynamic count becomes stale before delivery;
- privacy setting hides names/content;
- offline, multiple devices, old questionnaire/catalog version;
- very long translations, RTL/LTR, large text, screen reader, reduced motion;
- user disables notifications but continues using Coach;
- account deletion/export.

## 14. Acceptance criteria

1. Six single-choice pages show the same six event meanings in all four styles without labels or order bias.
2. Vote counting selects the plurality style; a conditional tie-break resolves ties without hidden weighting.
3. Skip preserves the previous/default style and never blocks onboarding or app use.
4. The saved style affects both eligible Coach phrasing and notification copy, but never logic or protected copy.
5. All four variants for an event preserve facts, urgency, action, privacy, and form-of-address semantics.
6. Settings supports view, retake, save, cancel, and reset to the Warm default.
7. Missing variants fall back safely; no AI generates notification copy in the MVP.
8. English/Hebrew, RTL/LTR, accessibility, offline, scheduled-content reconciliation, privacy, and account
   deletion/export pass verification.

## 15. Out of scope

- automatic experimentation or style optimization;
- LLM-generated notification copy;
- per-Journey or per-friend styles;
- adapting timing, channel, or frequency from this questionnaire;
- clinical/therapeutic personality assessment;
- manipulative, loss/fear, shame, or guilt style;
- changing safety, legal, consent, crisis, or error copy;
- future Calendar/location/channel-selection engine.
