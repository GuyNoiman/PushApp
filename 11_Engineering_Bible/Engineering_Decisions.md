# Engineering Decisions

Status: Living Document

The running log of concrete engineering/technology decisions, complementing the
principles in `Engineering_Bible_01..05.md`. Every entry follows the Bible §16
requirement: **what · why · alternatives · tradeoffs · future**. Engineering
decisions are prefixed **E**; product decisions live in `06_Decisions/Decision_Log.md` (D-prefix).

---

## E1 — POC technology stack

- **Date:** 2026-07-08
- **Owner:** Founder + engineering (decided jointly, per CLAUDE.md §6).
- **Stage:** POC (see `04_Product/POC_and_MVP_Scope.md`).

### Context
The POC must be **testable on the founder's iOS device periodically** for feedback, a
**web interface for creating Journeys** is wanted later, and the founder is highly
cost-conscious. The Engineering Bible mandates: native-quality feel, offline-first,
vendor independence, business logic outside the UI, and platform-agnostic core systems.

### Decision
**Expo (React Native) + TypeScript**, organized as an **engine-based architecture**:

1. **UI layer** — Expo + `expo-router`. Thin screens that render engine output and send
   user intents back. No business rules in components (Bible §19).
2. **Core engines** (plain TypeScript, no UI/vendor imports) — `JourneyEngine`,
   `BuddyEngine`, `RewardEngine`, `MissionEngine`, `ReminderEngine`. Pure business logic,
   communicating through a lightweight **event bus** (Bible §7, §5 "Event-Driven"):
   e.g. `JourneyCheckedIn` → Reward grants XP/Coins → Buddy reacts. Engines never know
   their consumers.
3. **Configuration before code** (Bible §3) — XP rules, coin rewards, Buddy evolution
   stages, and mission definitions live in `src/core/config/*` data, not hardcoded logic.
4. **Persistence** — a `Repository` interface (offline-first, local device storage now).
   The cloud backend, when the social pillar arrives, implements the **same interface**,
   so no engine depends on a provider (Bible §3 "Vendor Independence", §8 "Local Before Cloud").
5. **Reminders** — on-device **local notifications** (`expo-notifications`) for the POC's
   time/day reminders. No push server, no APNs, no Apple Developer account needed yet.

### Why
- **Instant iOS testing at $0** — Expo Go runs the app on the founder's iPhone via a QR
  scan, with **no Mac and no Apple Developer account** ($99/yr) during the POC feedback loop.
- **Future web reuse** — the TypeScript engines are UI-agnostic; the later web
  Journey-builder reuses them (React Native Web / shared core). Satisfies Bible §20
  "Platform Agnostic".
- **Bible-aligned** — engines-before-features, config-before-code, offline-first,
  replaceable providers behind interfaces, business logic out of the UI.
- **Cost-optimal** — the entire POC path (tooling, device testing, local storage, local
  notifications) is **$0**. A paid Apple Developer account is needed only for
  TestFlight/App Store distribution — not for the feedback loop.

### Alternatives considered
- **Native Swift / SwiftUI** — best-in-class native feel, but requires a Mac + Xcode + a
  paid Apple Developer account to run on a physical device, and gives no path to the future
  web client. Rejected for the POC on cost and reach; the engine boundary keeps a future
  native rewrite possible without touching business logic.
- **Flutter** — capable and cross-platform, but Dart wouldn't share code with a web
  (JS/TS) Journey-builder, and Expo Go's zero-friction device testing is a better fit for
  this feedback loop. Rejected.
- **PWA / mobile web** — $0 and instantly testable, but iOS push/notification support is
  limited and the "native feel" the Bible requires is harder. Rejected for a
  notification-driven, companion-centric product.

### Tradeoffs accepted
- React Native is not literally native; very heavy custom animation or platform-specific
  polish may later need native modules. Acceptable at POC scale, and isolated to the UI layer.
- A dependency on the Expo toolchain. Mitigated: business value lives in framework-free
  engines, so leaving Expo later would not require rewriting product logic.

### Future considerations
- Add a cloud backend (**Supabase free tier** is the current front-runner) behind the
  `Repository`/social abstraction when the **social / Allies** pillar is implemented —
  cost-guardian tracks the free-tier quota before it lands.
- A paid Apple Developer account + EAS builds become relevant only for TestFlight/App
  Store distribution (post-POC).
- The web Journey-builder reuses the core engines when it is scheduled.

### Reflected in
- `CLAUDE.md` §6 (Stack summary), `06_Decisions/Decision_Log.md` (E1), the `app/` scaffold.
