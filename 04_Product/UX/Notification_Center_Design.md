# Notification Center — Approved Design Contract

Status: **Founder-approved direction, 2026-08-23.**
Related PRD: `../PRD/Notification_Center_PRD.md`.
Stage: **MVP**.
Visual board: `Notification_Center_Design_Board.svg`.

## 1. Visual intent

The center is a calm inbox for activity, not a social feed. Use one subject per card, generous vertical air,
quiet timestamps and only the actions that can be completed immediately. New items receive a soft themed
surface plus an explicit dot/accessibility label. They do not pulse or shout.

## 2. Feed anatomy

```text
┌──────────────────────────────────────┐
│ Back              Notifications   ⚙ │
├──────────────────────────────────────┤
│ New                                  │
│ ┌──────────────────────────────────┐ │
│ │ Avatar  Actor + event       •    │ │
│ │         Time                     │ │
│ │         [response] [response]    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Avatar  Actionable request  •    │ │
│ │         Time                     │ │
│ │         [Approve]   Decline       │ │
│ └──────────────────────────────────┘ │
│ Earlier                              │
│ ┌──────────────────────────────────┐ │
│ │ Avatar  Navigable event           │ │
│ │         Time                      │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- The entire navigable row is tappable. There is no View button.
- Nested action controls stop row navigation.
- Social positive choices use equal outlined weight.
- A true decision uses one filled Approve action and one quiet text Decline action.
- Grouped rows show up to three overlapping avatars and open detail; they never expose a bulk action.

## 3. Preferences anatomy

Each optional category row contains a label, short explanation, an in-app switch and a device switch.
Essential System and account notices are shown in a separate softly tinted block with locked controls and an
explanation. The headings above the two switch columns must remain aligned when copy wraps.

## 4. Required visual variants

| Variant | Direction | Reading order | Theme checks |
|---|---|---|---|
| Hebrew Light | RTL | avatar at start/right; new dot at logical end/left; Back points right in native navigation | warm near-white base, white cards, visible hairline |
| Hebrew Dark | RTL | same logical order as Hebrew Light | deep green-neutral base, lifted card surface, AA copy |
| English Light | LTR | avatar at start/left; new dot at logical end/right; Back points left | warm near-white base, white cards, visible hairline |
| English Dark | LTR | same logical order as English Light | deep green-neutral base, lifted card surface, AA copy |

All spacing uses logical start/end properties. Do not mirror meaningful icons, numerals, media, clocks or
status semantics. Localize the complete sentence and locale-format grouped names; do not reverse strings.

## 5. Component states

### Activity row

- Default / New / Pressed / Seen / Unavailable.
- New = themed soft surface + dot + accessible “New” state.
- Unavailable = remove after refresh; if already visible and tapped, show neutral unavailable feedback.

### Decision row

- Ready / Responding / Approved / Declined / Failed / Resolved elsewhere.
- Responding disables both actions.
- Success replaces controls with localized historical copy only after server confirmation.
- Failure restores both controls and announces a recoverable error.

### Parallel social actions

- Two outlined controls of equal visual weight, each with a distinct label/icon.
- Neither uses the filled decision color.
- If one capability is unavailable, show only the valid action rather than a disabled false promise.

### Bell

- No badge at zero; numeric badge 1–99; `99+` thereafter.
- Badge is anchored to logical end/top and mirrors with direction.
- No pulse. Screen readers announce the count.

## 6. Responsive and accessibility contract

- Minimum target 44×44 points.
- At large Dynamic Type, action buttons wrap or stack below the copy; they never overlap it.
- Very long actor names truncate only after the event meaning remains available to accessibility services.
- The timestamp is secondary but readable in both themes.
- Row and nested actions are separate accessibility elements.
- Focus remains on the resolved row after an inline decision.

## 7. Design QA board

Implementation review must capture all four combinations below using the same test fixtures:

1. Hebrew RTL · Light — feed with new social response, request decision, grouped event and seen event.
2. Hebrew RTL · Dark — preferences with optional and locked essential categories.
3. English LTR · Light — the same feed fixtures, fully English.
4. English LTR · Dark — the same preferences, fully English.

The four-state visual board is stored beside this file. The interactive founder-review concept is preserved
in the Codex thread; this file is the permanent, implementation-safe design contract. The PRD, not the
concept’s sample copy, is authoritative.
