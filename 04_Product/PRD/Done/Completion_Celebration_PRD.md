# PRD — Completion Celebration

Status: **Implemented (MVP slice) — 2026-08-12 (Decision Log D42); green (jest 852/852 at ship, 969/969
as of 2026-08-13), reviewed (code-reviewer + security-privacy).** Deferred: **I1-a** in-app Ally
completion/thanks message (§5 — needs a notify/message backend, post-MVP per D29) and **I1-b**
device-verified image export (needs the native build). Also deferred, cross-cutting to every new MVP
screen (not unique to this PRD): the founder's on-device visual/RTL/gendered-address QA pass, gated on
the Apple Developer account (E1). Moved to `Done/` 2026-08-13 — code-complete/green/reviewed is the
Done-tracking bar; the on-device visual pass and I1-a/I1-b remain open follow-ups, tracked here and in
`MVP_Task_List.md`.
Stage: **MVP** (I1).
Owner: founder + AI product team.
Related: `Daily_Step_Reporting_PRD.md`, Journey completion D41, Friend Profile, Support Circle,
`Future/Achievements_Engine_PRD.md`, and future Journey sharing.

---

## 0. MVP implementation scope (founder decisions, 2026-08-12)

Grounded in the actual code (explorer map, 2026-08-12): the Step confetti already exists
(`app/src/components/home/Confetti.tsx`); the `JourneyCompleted` event already fires but no UI
listens; `expo-sharing` is already used once (data export); there is NO push backend, NO in-app
messaging, and NO image-capture dependency; reduced-motion handling does not exist anywhere yet.

**Building now (this slice):** improved small Step celebration (2–3 random variants + suppression on
the final Step) with a reduced-motion guard; the big Journey-completion ceremony (dedicated route,
reusing the Weekly-Review auto-open-next-foreground latch; idempotent, one major event at a time); the
fixed completion card (swipeable variants, name-revealing and name-omitting) with durable safe-fields-only
card data on the completed Journey and a reopenable **Share completion** action; sharing via the device
share sheet; a "small celebrations" Settings toggle. Image save/share is isolated behind a thin platform
GATEWAY with a degraded fallback for Expo Go/web. A **gentle final confirmation** is added before the last
Step completes a Journey (both the swipe-to-done path and the ⋯ report path), copy: "By doing this step you
complete the Journey. Confirm?" (en + he, form-of-address aware).

**Deferred (recorded as follow-up in `04_Product/MVP_Task_List.md`, NOT built in this slice):**
1. **§5 Allies & thanks — sending the completion/thanks to Allies inside the app.** No delivery channel
   exists (no push backend; in-app messaging is post-MVP per D29). The ceremony still offers the OS share
   sheet now; the in-app Ally delivery lights up when the notification/message backend lands.
2. **Real device-verified image export.** The `react-native-view-shot`/captureRef path does not run in
   Expo Go / web and can only be verified once the Apple native dev build exists (Apple account still
   pending). The gateway is built now; the native path is verified later.

---

## 1. Purpose

Make real progress feel visible without turning PushApp into a game or interrupting the user excessively.
A completed Step receives a brief lightweight celebration. Completing an entire Journey receives a distinct,
larger ceremony and a reusable shareable completion card.

The celebration recognizes action and transformation. It never celebrates app usage, Partial, Not Done,
Postpone, or an intermediate Milestone in the MVP.

## 2. Two celebration tiers

### 2.1 Small — completed Step

- Trigger only when a Step is reported **Done**.
- Show a short, non-blocking visual celebration.
- Maintain several approved variants, selected randomly for variety: examples include different confetti,
  stars, sparkles, or a small firework treatment.
- Keep every variant comparable in duration/intensity so randomness does not imply different achievement value.
- Do not show the small celebration when this Step also completes the Journey; only the big ceremony appears.
- Do not create or store a shareable artifact for a Step.
- Do not ask the user to share a Step or Milestone in the MVP.

The user may disable **small celebrations only** through Settings → Advanced. Reduced-motion accessibility
must replace animation with a calm static acknowledgement. Sound and haptics, if used, respect system settings
and accessibility preferences.

### 2.2 Big — completed Journey

- Trigger when the last required Step completes the Journey.
- Journey completion is final under D41. The completing action should be deliberate enough to avoid an
  accidental irreversible completion; implementation may use a gentle final confirmation or make the ceremony
  itself clearly acknowledge finality.
- Suppress the small Step celebration and show only the big Journey ceremony.
- The big ceremony cannot be disabled.
- If completion occurs while the ceremony cannot be shown, present the most important pending completion the
  next time the user opens PushApp. Show only one major pending event at a time.
- The ceremony ends when the user closes it; there is no required Coach reflection in this moment.

## 3. Completion card

The big ceremony creates a fixed PushApp-designed completion-card object displayed alongside the completed
Journey. It is not an Achievement from the global Achievement engine and must not be called one in canonical
product terminology. User-facing action label: **Share completion**.

The card:

- uses a fixed on-brand structure;
- offers several prewritten presentation variants the user can swipe/browse between;
- includes variants that reveal the Journey name and variants that omit it;
- does not expose Step reports, private notes, Dream information, Ally names, or other sensitive data;
- remains accessible from the completed Journey after the ceremony;
- can be shared again later with a newly entered personal caption;
- is distinct from the future **Share Journey** action, which will share a Journey structure/template without
  reports or completion framing.

The user's personal caption is transient sharing input. It is passed to the selected destination when
supported but is not stored on the completion card or in PushApp history.

## 4. Share destinations

From the big ceremony or the completed Journey, the user may:

- share through the device share sheet, including compatible social apps;
- save/export the rendered card as an image where the platform permits;
- send the completion to current Journey Allies through PushApp;
- close without sharing.

External sharing uses the selected fixed card variant plus optional personal caption. PushApp must clearly
preview the exact privacy level before the native share sheet opens.

MVP does not include a public PushApp feed, public ranking, automatic posting, or milestone sharing.

## 5. Allies and thanks

After Journey completion, ask whether the user wants to share the completion with the Support Circle and
thank them. Only people who were accepted Allies at the exact completion moment are eligible.

- Later-added people do not gain access to the completion message retroactively.
- Removed/former Allies are not included.
- Sending is always opt-in; closing the ceremony sends nothing.
- Allies receive the completion as a message using the approved fixed template plus the owner's optional
  personal text.
- Recipient access must follow existing Journey visibility and messaging authorization at send/open time.

## 6. Completion history

The fixed completion card and its selected/reconstructable variants remain attached to a Journey with
`completed` status. The user can reopen **Share completion** and share again later.

PushApp does not store captions entered for prior shares. It stores only what is required to reconstruct the
approved completion card, such as Journey identity, completion timestamp, template/version, and safe display
fields. Deleting the Journey or account follows the authoritative deletion policy and removes owner-controlled
card data/media.

## 7. Interaction with settings and other systems

- Settings → Advanced controls small celebrations only.
- Reduced Motion overrides animation independently of the PushApp toggle.
- Journey completion does not depend on successful rendering, saving, or sharing.
- Sharing failure never rolls back completion.
- XP/Level, global Achievements, Coins, and Missions are Future and are not displayed or granted by this MVP
  ceremony.
- A Journey-completion card is not included in the friend's global Achievement collection.

## 8. Edge cases

- duplicate Done events, rapid taps, retry, or concurrent completion on multiple devices;
- final Step was already completed offline and sync later marks the Journey completed;
- app killed/backgrounded during the ceremony;
- several Journeys complete before the next foreground;
- Journey deleted before a pending ceremony opens;
- Journey name changed near completion;
- very long Journey name and all supported languages/RTL;
- share destination unavailable or native share cancelled;
- image rendering/save permission fails;
- selected privacy-preserving variant versus revealing variant;
- Ally removed, blocked, or account-deleted between completion and send/open;
- user has no Allies;
- small-celebration toggle changes while an animation is active;
- reduced motion, screen reader, large text, dark/light mode, and color-blind safety.

## 9. Technical requirements

- Idempotent celebration event keyed to the first authoritative transition to `completed`.
- Separate ephemeral small-celebration effect from durable Journey-completion-card state.
- Versioned/config-driven small variants and completion-card templates.
- Renderable card data contains only explicitly approved safe fields; no raw report content.
- Pending-major-event queue persists across restart, shows one event, and discards stale/deleted targets.
- Native sharing/saving is isolated behind a platform gateway and never controls Journey state.
- Ally recipient set is snapshotted at completion; authorization is revalidated before send/open.
- Localized copy is authored natively for every supported locale and respects form of address.

## 10. Acceptance criteria

1. Done on a non-final Step shows exactly one randomly selected small variant.
2. Partial, Not Done, Postpone, and intermediate Milestone completion show no completion celebration.
3. The final Step shows only the big Journey ceremony and Journey completion remains final.
4. Small celebrations can be disabled; the big Journey ceremony cannot.
5. A missed/background completion ceremony appears on next foreground, with only one major event shown.
6. The user can browse privacy-different card variants, add a transient caption, share/save, or close.
7. The completed Journey retains a separate **Share completion** action for later reuse.
8. Current completion-time Allies can receive an opt-in completion/thanks message; no one else is included.
9. Sharing/rendering failure never changes completion, and duplicate events never create duplicate cards.
10. Hebrew/English, RTL/LTR, accessibility, privacy, offline, failure, and deletion states pass verification.

## 11. Out of scope

- global Achievement engine/catalog;
- XP, Buddy Level, Coins, or Missions;
- Milestone sharing or celebration ceremony;
- Step sharing;
- public PushApp completion/Achievement feed;
- future Journey template sharing;
- stored social captions or social-post history;
- photo proof attached to a Step report.

