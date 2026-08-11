# PRD — Communication Style Profile

Status: **Open (selection gated on onboarding)** — direction resolved by the founder 2026-08-11 (Decision Log
**D40**); prior: Approved 2026-08-10. **D40 resolution:** ONE **unified** preference drives **both** the coach
tone and the notification copy, **selected via the (future) onboarding questionnaire** — so this feature's
selection UI is gated on onboarding (parked). The name/terminology must **not** collide with the coach's
existing `communicationStyles` (steady/direct/gentle/spark) — product-guardian to ratify. The real engineering
weight is converting reminder copy from baked-literal to **resolve-at-reconcile** so language/gender/style
actually apply to notifications.
Stage: **MVP** (after basic reminder timing/control).
Owner: founder + AI product team.
Related: `Smart_Notification_Timing_PRD.md`, `Weekly_Review_PRD.md`, Settings, notification content,
and form-of-address preference.

---

## 1. Purpose

Users differ in how they prefer PushApp to phrase reminders. A short scripted Settings experience lets
the user choose between prewritten examples and creates one account-level notification style. The system
does not infer or change tone automatically.

## 2. Entry points

- Settings → Communication Style;
- optional Weekly Review suggestion when communication appears ineffective;
- direct return to Settings at any time.

The Weekly Review never recommends a specific style. It only asks whether the user wants to review their
preference and links to this screen.

## 3. Scripted comparison flow

- Default profile exists before configuration.
- Show six pairwise comparisons, each expressing the same underlying reminder in two approved ways.
- The user selects the preferred version in each pair.
- The user may skip/exit and retain the prior/default profile.
- At completion, show a human-readable summary and Save.
- The flow can be rerun; Reset restores the default.

## 4. Style dimensions

The six comparisons derive account-level preferences for:

- direct vs gentle;
- brief vs explanatory;
- matter-of-fact vs warm/supportive;
- calm vs energetic;
- no emoji vs light emoji;
- factual progress summary vs encouraging framing.

The exact scoring implementation is deterministic/config-driven. Do not use an LLM or raw free-text input.

## 5. Copy catalog

- Notification variants are written, reviewed, localized, and tagged against style dimensions in advance.
- The selected profile chooses the closest approved variant; it never generates free text.
- Hebrew/English and every future language receive native-quality variants rather than mechanical tone
  translation.
- Form of address is an independent mandatory rule applied after style selection.
- No guilt, threat, shame, fake urgency, fabricated friend activity, streak-loss pressure, or curiosity trap.

## 6. Scope

In MVP the style affects notification copy only. It does not change:

- AI Coach personality/conversation;
- messages written by friends;
- permissions, safety, legal, destructive-action, or error copy;
- Support Circle communication;
- Journey content.

## 7. Change behavior

- One style profile applies across all Journeys and notifications.
- Save affects future notifications only; reconcile scheduled notification content where the OS safely
  permits, otherwise apply from the next scheduling cycle.
- Timing and style are independent selections. Weekly Review may include a timing proposal and a link to
  this screen in the same experience; the user may do either, both, or neither.
- Style changes are manual and are never treated as an automated experiment.

## 8. Edge cases

- exit after any comparison;
- rerun produces different choices;
- language changes after configuration;
- missing localized variant;
- address-form fallback;
- notifications already scheduled;
- offline configuration and later account sync;
- conflicting edits on multiple devices;
- legacy/default user;
- accessibility, RTL, long text, and Dynamic Type.

## 9. Technical requirements

- Store derived dimension values/profile version on the account with local cache; avoid retaining every
  historical answer unless needed for an explicit product purpose.
- Config-before-code variant catalog with stable IDs, locale, dimensions, content version, and safe fallback.
- Missing/invalid variants fall back to the neutral default, never arbitrary AI output.
- Include preference in export/deletion.

## 10. Acceptance criteria

1. Six pairwise scripted comparisons produce a clear summary and saved account preference.
2. Skip, rerun, reset, offline cache, and multi-device synchronization behave safely.
3. Every notification resolves to a preapproved localized variant or neutral fallback.
4. Style applies globally to notification copy only and respects form of address.
5. Forbidden persuasive patterns and sensitive-copy surfaces are excluded by tests/content review.

## 11. Out of scope

- AI-generated copy;
- automatic style learning from opens;
- per-Journey style;
- Coach personality customization;
- channel selection.

