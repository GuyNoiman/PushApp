# Turquoise Path Visual System

Status: **Implementation brief — founder-approved direction, 2026-09-14.**  
Stage: **POC → MVP visual migration.**  
Applies to: every user-facing mobile surface in `app/src/app`, Light and Dark, LTR and RTL.  
Visual board: `Turquoise_Path_Screen_Board.html`.  
Reference images supplied by the founder on 2026-09-14 remain visual inspiration; this document is
the implementation contract.

## 1. Outcome

The app should feel calm, premium, human and visually memorable. It must not read as a generic stack
of white cards, a clinical wellness product, or a childish game.

The system has four recognizable ingredients:

1. **turquoise leads** every primary action and progress moment;
2. **warm editorial typography** gives important thoughts emotional weight;
3. **open compositions** use space, illustration and layering before adding another container;
4. **the connected path** runs quietly through the background as the app's recurring signature.

The approved reference is richer than the previous card-heavy concept. Richness comes from depth,
composition, typography, bespoke code-drawn forms and carefully placed color—not from adding more
information or decoration.

## 2. Non-negotiable visual rules

1. One screen, one primary purpose and one dominant action.
2. Turquoise is the only global brand/action accent. Other colors have restricted semantic jobs.
3. A card exists only when content needs a bounded interactive surface. Ordinary structure uses air,
   hairlines and typography.
4. Never put a card inside another card.
5. Display type is used for the sentence that matters; controls and explanations use the body face.
6. Every screen works independently in Light and Dark. Dark is authored, not inverted.
7. Every screen works in English/LTR and Hebrew/RTL. Layout uses logical start/end.
8. The connected path is background artwork. It occupies no layout space and content may cross it.
9. Urgency is communicated in words and restrained amber. Red is reserved for destructive or failed
   system states, never ordinary incomplete progress.
10. Motion explains a transition or celebrates real progress. Nothing loops merely to demand
    attention.

## 3. Foundation tokens

These values are the visual target. Claude should migrate `app/src/constants/theme.ts` once and make
components consume tokens; screens must not introduce local approximations.

### 3.1 Light

| Token | Value | Use |
|---|---:|---|
| `background` | `#F8F6F0` | warm page canvas |
| `backgroundElement` | `#FFFEFA` | ordinary raised surface |
| `backgroundRaised` | `#FFFFFF` | modal/sheet or strongest lift |
| `backgroundSelected` | `#EEECE5` | quiet selection |
| `text` | `#102C31` | primary ink |
| `textSecondary` | `#5F706E` | supporting copy |
| `textMuted` | `#7E8B89` | metadata only |
| `hairline` | `#DDE1DB` | edges and dividers |
| `teal` | `#12A8A6` | primary action/progress |
| `tealStrong` | `#087F80` | readable accent text/icons |
| `tealTint` | `#DFF5F2` | selected/settled surface |
| `tealWash` | `#F0F8F6` | large quiet wash |
| `pathLine` | `rgba(18,168,166,0.28)` | background path |
| `pathDot` | `rgba(18,168,166,0.55)` | background nodes |

### 3.2 Dark

| Token | Value | Use |
|---|---:|---|
| `background` | `#0B1C20` | deep teal-black canvas |
| `backgroundElement` | `#132A2E` | ordinary raised surface |
| `backgroundRaised` | `#193338` | modal/sheet or strongest lift |
| `backgroundSelected` | `#213A3E` | quiet selection |
| `text` | `#F1F7F4` | primary ink |
| `textSecondary` | `#A7B8B5` | supporting copy |
| `textMuted` | `#809693` | metadata only |
| `hairline` | `#294347` | edges and dividers |
| `teal` | `#4BD0CA` | primary action/progress |
| `tealStrong` | `#77E2DD` | readable accent text/icons |
| `tealTint` | `#153D3E` | selected/settled surface |
| `tealWash` | `#102B2E` | large quiet wash |
| `pathLine` | `rgba(91,218,211,0.25)` | background path |
| `pathDot` | `rgba(91,218,211,0.55)` | background nodes |

### 3.3 Restricted supporting colors

- **Warm clay `#EF9D72`:** celebration, warmth and authored illustrations only.
- **Amber `#C99435`:** genuine time pressure, once per screen at most.
- **Green `#32936F`:** explicit confirmed success where turquoise alone is ambiguous.
- **Coral `#C96D66`:** destructive actions and actionable errors only.
- **Violet `#9F8FD2`:** people/relationship illustration detail only; never a competing CTA.

Every supporting color needs a separately authored Dark value before implementation. Do not lighten
the Light value mechanically.

## 4. Typography

| Role | Latin | Hebrew | Weight | Contract |
|---|---|---|---:|---|
| Display | Fraunces | Frank Ruhl Libre | 500 | page titles, emotional statements, Journey/Tool names |
| Body | Inter | Inter | 400 | explanations, messages and ordinary content |
| Control | Inter | Inter | 500 | buttons, tabs, labels and compact state text |

- Maximum two display moments on one phone viewport.
- Body copy remains readable at platform accessibility sizes; no essential text is truncated merely
  to protect composition.
- Line-height boxes remain stable between Latin and Hebrew as already required by
  `displayFont.ts`.
- The logo/wordmark is an asset, not a heading style. It is excluded from automatic localization.

## 5. The connected-path signature

### 5.1 Shape

- It begins **at the exact left edge**, in the lower part of the screen.
- It finishes **at the exact right edge**, substantially higher.
- It contains three soft rises/falls while maintaining an overall upward direction.
- Both edge nodes are visible. Intermediate nodes vary subtly in size.
- The curve is organic and smooth; no angles, arrows, dashes or chart axes.

Reference normalized geometry:

```text
viewBox 0 0 520 270
M 0 258
C 42 250, 68 184, 112 194
S 166 246, 216 193
S 271 119, 321 149
S 380 191, 421 105
S 477 34, 520 14
```

The normalized path may scale non-uniformly to fill the available screen width. Its direction is a
brand gesture, not semantic reading order, so **do not mirror it in RTL**.

### 5.2 Layering

- Render as one reusable code-drawn SVG component: `ConnectedPathBackground`.
- Absolute fill/position; `pointerEvents="none"`; behind all content; never part of ScrollView
  measurement.
- Text, cards, images and controls may overlap it.
- It never reduces contrast: where it crosses dense copy, its local opacity remains low enough that
  the copy passes WCAG AA.
- It does not reserve a hero or illustration region.
- One path segment per screen. Do not repeat it inside every card.

### 5.3 Placement by surface

- **Welcome/onboarding:** the most visible use; starts roughly 55–65% down the first viewport and
  rises behind the promise.
- **Home/top-level tabs:** begins below the title zone and may pass behind the first module.
- **Coach/conversation:** quieter; it may sit behind early empty space but not compete with a long
  message history.
- **Journey detail:** the same visual may align with Milestone structure, but it remains decorative;
  the functional Milestone connector is separately accessible.
- **Weekly Review/completion:** may merge into a horizon/celebration composition.
- **Sheets, dialogs, keyboard states:** omit it when the remaining visible area would make it noise.

## 6. Depth, surfaces and geometry

- Page canvas is warm and nearly flat.
- One dominant authored surface may use a faint turquoise gradient, blur or large abstract shape.
- Ordinary cards: 20–24 radius, one hairline, low diffuse shadow in Light, tonal lift in Dark.
- Hero/editorial surfaces: 26–30 radius, only when the content is genuinely a single subject.
- Buttons: full pill. One filled turquoise primary action per action group.
- Choice chips: pills for short answers; large answer cards only when an explanation is necessary.
- Lists: rows separated by hairlines. Do not put every list row in a card.
- Avatars: circular, softly elevated, initials fallback. The selected carousel person may be 15–20%
  larger without moving the baseline.
- Bottom navigation: one translucent/raised surface; turquoise active icon; no rainbow tab colors.

## 7. Core components Claude should create first

1. `ConnectedPathBackground` — theme-aware, scalable, decorative and RTL-stable.
2. `EditorialScreenHeader` — kicker, display title, optional short lede and trailing actions.
3. `PrimaryPillButton`, `SecondaryPillButton`, `QuietTextButton`.
4. `SegmentedControl` — equal visual hierarchy for peer views.
5. `EditorialHeroSurface` — at most one per screen; supports code-drawn illustration slot.
6. `CalmCard` — edge and lift only; no nested-card styling.
7. `ProgressLine` — turquoise, always accompanied by meaningful text.
8. `StatePill` — neutral by default; amber only for real time pressure.
9. `AvatarCarousel` — equal baseline; selected item slightly larger; accessible previous/next.
10. `ListRow` and `SettingsRow` — typography/hairline hierarchy without card chrome.
11. `EmptyStateIllustration` — small code-drawn shape plus one next action.
12. `ScreenScaffold` — safe areas, max width, background path, scroll and bottom-nav inset.

## 8. Screen-by-screen composition contract

This table covers every production route currently under `app/src/app`. Development-only routes and
test files do not belong to the visual migration.

| Route/surface | Visual composition | Connected path |
|---|---|---|
| `/sign-in` | wordmark, one promise, provider buttons, quiet legal copy; no form-like card around the whole screen | visible and spacious behind promise |
| `/onboarding` | one idea per screen, compact progress, small authored illustration, primary action above fold | strongest recurring use; background only |
| `/return` | brief recognition and one return action; preserve calm | subtle |
| `/questionnaire` | editorial question, short answer choices, optional free text; answers visually distinct from Coach messages | faint, behind upper third |
| `/coach` | editorial session header followed by conversation; bubbles only for messages, never for surrounding UI | visible near opening, fades from dense history |
| `/dream-coach` | same Coach, with Dream context expressed by title/context line—not a new visual identity | same as Coach |
| Home `/` | date/greeting, bell+Inbox, one dynamic Coach surface, day selector, today's Steps, weekly summary, support carousel, Journey carousel | crosses open upper/middle space behind content |
| `/journeys` | editorial intro, Active/Future/History segmented control, one highlighted Journey then light rows/cards | behind title and first Journey |
| `/journey/[id]` | Journey story, progress, Support Circle, Milestone path and Steps; settings/actions remain secondary | may echo path, but functional structure stays distinct |
| `/journey/new` | temporary/development route only; use the same conversational visual language until retired | faint; never makes wizard feel like a different product |
| `/completion` | one large achievement composition, meaning before statistics, separate achievement-share action | becomes celebration trajectory |
| `/weekly-review` | authored horizon, last-week reflection, insight, next-week proposal and Coach editing action | merges with horizon visual |
| `/my-dreams` | aspirations as spacious editorial sections; no completion bars on Dreams | long quiet segment behind header |
| `/dream/[id]` | Dream statement first; linked Journeys underneath; Coach conversation as editing method | visible behind Dream statement |
| `/friends` | support-first carousel/people composition, then ordinary friend list | subtle behind people hero |
| `/friend/[id]` | avatar identity, relationship summary, actions, Journeys shared with viewer; no private profile data | very faint behind identity area |
| `/notifications` | editorial Activity header; rows; request actions visually distinct from reciprocal social actions | header only |
| `/inbox` | Messages/Requests/Groups segmented control, familiar conversation rows, clear unread state | header only |
| `/conversation/[id]` | minimal identity header, message history, composer; content dominates | omit after history grows |
| `/new-message` | search, known relationships first, request explanation before unknown recipient | very faint behind header |
| `/mirror-answer` | invitation context, one question at a time, privacy guidance before free text | faint background |
| `/tools` | editorial category introduction, one recommended Tool hero, For You/Recent/All, curated grid with category color families | visible behind editorial intro |
| all `/tools/*` routes | Tool-specific small illustration/color family, benefit/time, Start above fold; one question/task per step; result with next action | uses that Tool family's tint but same geometry |
| `/settings` | editorial header and unboxed grouped rows; configuration should feel quiet | subtle behind header only |
| `/settings/profile` | identity/photo hero then grouped editable fields; defaults remain clear | behind hero only |
| `/settings/active-hours` | visual daily span first, default schedule then per-day expansion | may serve as a quiet time arc, never data axis |
| `/settings/communication-style` | current style summary and preview samples | faint |
| `/settings/communication-style-quiz` | one notification example and one choice per turn | faint behind question |
| `/settings/notifications` | category and timing rows; system/account notices clearly non-optional | header only |
| `/settings/language` | simple language choices with immediate direction preview | faint |
| `/settings/country` | simple searchable choice; current inferred value explained | faint |
| `/settings/coach-memory` | clear trust explanation, retained insight categories and reset action | especially restrained |
| `/settings/report` | safe, calm reporting form; coral only for final destructive/report action if appropriate | omit if it reduces clarity |
| `/data-recovery` | serious but non-alarming recovery explanation and one safe next action | omit |

### 8.1 Tool detail color families

Turquoise remains the CTA everywhere. A Tool family may tint illustration/background only:

- Reflection: turquoise + mist blue.
- Self-knowledge: turquoise + muted violet.
- Connection: turquoise + warm clay.
- Immediate support: turquoise + quiet sky.
- Planning/action: turquoise + muted amber.
- Journaling: turquoise + sage.

No Tool gets a different primary-button color.

## 9. Required states

Every applicable screen needs the same visual quality in:

- initial/empty, populated, loading skeleton, cached/offline, recoverable error and retry;
- keyboard open and reduced vertical space;
- long names, long translations, large accessibility text and screen reader order;
- first use, resumed use and interrupted flow;
- completed, partial, not done, postponed, paused and canceled without shame;
- notification/message read, unread, pending, failed and deleted-account states;
- permissions not requested, denied and later reconsidered.

Loading must preserve the final composition. Do not replace an editorial screen with a centered
spinner. Empty states use a small illustration, one honest sentence and one useful action.

## 10. Light, Dark, RTL and accessibility matrix

Every changed screen must be reviewed in all four combinations:

| Direction | Light | Dark |
|---|---|---|
| LTR English | required | required |
| RTL Hebrew | required | required |

Additional checks:

- The connected path never mirrors in RTL; all semantic controls and navigation do.
- Back, chevrons, message alignment and carousel direction use logical direction.
- User-authored mixed-direction text retains Unicode natural behavior.
- Turquoise-on-background, text-on-card and button labels meet WCAG AA.
- Color is never the sole state signal.
- Respect Reduce Motion and platform font scaling.

## 11. Migration order for Claude

Do not redesign route files independently. Implement in this order:

1. add/migrate tokens and typography while retaining old aliases temporarily;
2. build `ConnectedPathBackground`, scaffold, headers, actions, rows, hero and progress primitives;
3. migrate authentication/onboarding/Coach first—the first impression and core promise;
4. migrate Home, Journeys and Journey detail;
5. migrate Tools and every Tool detail through shared Tool primitives;
6. migrate Circle, profiles, Activity and Inbox;
7. migrate Settings and exceptional recovery/reporting screens;
8. remove obsolete local styles only after route-by-route visual QA.

Each phase must be a small reviewable change. Do not combine the visual migration with domain logic,
schema changes or feature behavior.

## 12. Acceptance criteria

- [ ] Every production route in §8 uses the shared scaffold/tokens rather than re-creating the style.
- [ ] The connected path touches both horizontal edges, begins substantially lower at left, ends
      higher at right, is wavy, remains background-only and does not mirror in RTL.
- [ ] No content is moved to make room for the path; text may cross it without losing contrast.
- [ ] Light/Dark and Hebrew/English screenshots exist for every route family.
- [ ] No nested cards and no more than one dominant authored surface in the initial viewport.
- [ ] Turquoise owns primary action/progress consistently.
- [ ] Secondary colors are used only for their defined meaning.
- [ ] Important headings use the correct script-specific display face.
- [ ] Empty/loading/offline/error states match the same system.
- [ ] Existing behavior, privacy boundaries, analytics, navigation and accessibility labels do not
      change as a side effect of the visual migration.
- [ ] Device QA confirms safe areas, keyboard behavior, scrolling and no clipping at large text.

## 13. Explicitly not decided by this brief

- The final company/product name and final wordmark.
- New product features or changes to existing screen behavior.
- New gamification, Coins, Missions or Buddy behavior.
- Whether the connected path later becomes an animated progress metaphor. It is static and
  decorative in this implementation.

