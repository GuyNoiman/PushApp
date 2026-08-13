# PRD — i18n Localization & RTL

Status: **Backfill PRD** — documents an ALREADY-SHIPPED feature retroactively; captured 2026-08-13.
Not a forward spec.
Stage: **MVP** (task N1).
Owner: founder + AI product team.
Related Decision Log: **D29** (item 4 — multi-language i18n with Hebrew + RTL across all screens is
fundamental to who the MVP is for: the founder, a Hebrew speaker), **D30** (domain experts are internal
tools; the meta-agent owns the user's language), **D31** (gender-aware form of address across languages).
Related code: `app/src/i18n/index.ts`, `app/src/i18n/rtl.ts`, `app/src/i18n/addressForm.ts`,
`app/src/i18n/languages.ts`, `app/src/state/LanguagePreference.tsx`,
`app/src/components/settings/RestartPrompt.tsx`, `app/src/i18n/__tests__/parity.test.ts`,
`app/src/i18n/resources/{en,he}/*.json`.

---

## 1. Purpose

The MVP's first real user is the founder, a Hebrew speaker, so the app and the coach must speak Hebrew and
lay out right-to-left — not as a late retrofit but as a foundational layer (D29). This PRD documents the
localization **architecture** as a reference: the i18next setup, the namespace split with en/he parity
enforced by a test, the RTL helpers and the restart handshake, and the gender-aware form-of-address
mechanism (D31). It is a reference doc because these mechanics are shared by every feature; capturing them
once keeps future features i18n-aware by default.

## 2. Current shipped behavior

### 2.1 The i18next instance (`i18n/index.ts`)

One i18next instance, framework-free at its core (any engine/service calls `i18n.t(...)` outside React) with
`react-i18next` wired so components use `useTranslation` and re-render on a language change. Key properties:

- **Boot language** resolves **synchronously** from the device locale (`resolveDeviceLanguage`, defensive —
  degrades to English if `getLocales()` is empty or throws), so the first frame renders sensibly; the
  persisted user choice is reconciled a moment later by `LanguagePreference`.
- **Namespaces:** copy is split into **21 namespaces** (`common` is default): `common`, `settings`, `home`,
  `journeys`, `journey`, `coach`, `coachContent`, `circle`, `inbox`, `explore`, `buddy`, `shop`, `missions`,
  `achievements`, `weeklyReview`, `dreams`, `notify`, `onboarding`, `communication`, `celebration`,
  `inactivity` — each with an `en` and `he` resource.
- Config: `fallbackLng` = default language, `interpolation.escapeValue: false` (React already escapes),
  `returnNull: false` (a missing key falls back, never renders null).

### 2.2 Language preference + the RTL restart handshake (`LanguagePreference.tsx`)

A small provider owns the one persisted choice (`AsyncStorage`, key `pushapp.languagePreference`) and applies
it, mirroring ThemePreference. First-run resolution: stored choice → device locale (if shipped) → English.

Because switching between an LTR and an RTL language flips the **whole** layout — which React Native can only
fully apply on a fresh launch — a direction change calls `I18nManager.forceRTL(...)` (persists natively for
next launch) and raises `pendingRestart`, and the UI shows `RestartPrompt` asking the user to reopen the app.
This is honest about Expo Go's lack of auto-reload. On a plain boot the provider force-syncs direction if it
desynced (e.g. fresh install on an RTL device) but deliberately does **not** raise the restart banner — that
is reserved for a **deliberate** user language change.

### 2.3 RTL helpers (`i18n/rtl.ts`)

`I18nManager.isRTL` is the single source of the currently-applied direction; `isRTLLocale(code)` answers the
direction a language *wants* (RTL set: `he`, `ar`, `fa`, `ur`) so callers can detect a flip before forcing
it. Helpers: `isRTL()`, `chevronName()` (returns the correctly-mirrored forward chevron), and
`directionalTranslateX(x)` (flips a horizontal translate so animations read the same in both directions).

### 2.4 Parity test (`__tests__/parity.test.ts`)

For every namespace, the test flattens each language's resources to dotted leaf keys and asserts the `en` and
`he` base-key sets match **both ways** — so a screen translated against `en` never renders a raw key in `he`.
It strips the form-of-address context suffix (`_feminine` / `_masculine`) before comparing (gendered variants
are legitimately language-specific), but keeps plurals strict. This keeps the rollout honest as keys grow.

### 2.5 Form of address / gender (`i18n/addressForm.ts`, D31)

`AddressForm = 'neutral' | 'feminine' | 'masculine'`, default `neutral`. Gendered copy resolves through
i18next **context**: a string provides `key_feminine` / `key_masculine` and the base `key` is the fallback,
so English (and any language without a variant) simply uses the base. The module holds the currently-applied
form as a plain value so the **framework-free** layer (coach + engines, which call `i18n.t` directly) applies
it too; the unified `ProfileProvider` (Own Profile) is the source of truth and mirrors it via
`setAddressForm`. `addressContext(form)` returns `undefined` for `neutral` (base key) or the form name
otherwise.

### 2.6 The coach's language (D30)

The meta-agent ("Steady") is the sole user-facing voice: domain experts are internal tools carrying no
user-language requirement, and the meta-agent re-voices every expert question through per-intent templates in
the user's active language (deterministic, no extra LLM call). So the coach converses in the user's language
without translating unspecced expert content.

## 3. Decisions already made

- **D29 (item 4):** i18n layer + Hebrew + RTL across all screens + the coach conversing in Hebrew are IN the
  MVP.
- **D30:** the meta-agent owns the user's language; experts stay internal, un-translated.
- **D31:** gender-aware form of address via i18next context + a persisted `addressForm` preference, applied
  in both React and the framework-free layer.

## 4. Open questions & edge cases NOT yet handled

1. **KNOWN GAP — engine/config DATA strings are still English.** The parity test covers the i18n resource
   JSON, but hardcoded English lives in **config/data** that never goes through i18next:
   `core/config/missions.ts` (mission `title`s like "Check in on a Step", "Dress up your Buddy"),
   `core/config/shopItems.ts` (item names), and `components/achievements/sampleAchievements.ts`. These render
   in English even in Hebrew. Several sit behind hidden/archived surfaces (Shop, Missions, Achievements are
   not MVP-visible per D29/D26), which is why it hasn't bitten yet — but any surface that shows them is
   un-localized. Decide per-surface: localize, or keep hidden.
2. **RTL is code-level only; device verification pending.** The RTL helpers, `forceRTL`, and the restart
   handshake are built and unit-logic-tested, but full RTL layout correctness (mirroring, gesture direction,
   alignment across all screens) can only be confirmed on a **real device / native build**, which does not
   exist yet (Apple account pending). Expo Go's inability to auto-reload on a direction flip is worked around
   with `RestartPrompt`, but the visual pass is outstanding.
3. **Parity guarantees keys, not translation quality.** The test proves `he` has every `en` key and vice
   versa; it cannot detect a Hebrew string that is wrong, machine-sounding, or an accidental English value
   copied into the `he` file. Human copy review (per the human-copy rule) is a separate, ongoing need.
4. **Gendered-variant coverage is uneven by design.** Because the parity test strips gender suffixes, a
   string can have a Hebrew `_feminine`/`_masculine` variant and no English one (fine), but there is no test
   asserting that strings which *should* be gendered in Hebrew actually have both variants — a missing
   variant silently falls back to the base (possibly wrong-gender) copy. No coverage check exists for "did we
   remember to gender this Hebrew string."
5. **Only two languages ship.** The architecture generalizes (RTL set already lists `ar`/`fa`/`ur`), but only
   `en` + `he` resources exist. Adding a language is documented (drop resources, add the catalogue row) but
   untested for a third locale.
6. **Form of address only wired where converted.** D31 says strings convert incrementally (coach + Home
   first); a string that hasn't been converted to gendered variants addresses the user in the neutral/base
   form regardless of preference. Which surfaces are fully gendered vs. still neutral is not tracked here.
7. **Auth-provider gender auto-detect not wired.** D31 specifies auto-setting the form from a Google/Apple
   sign-in gender; that wiring lands with real OAuth (E1, Apple-gated) and is not active — the form is
   user-set only for now.

## 5. Out of scope / deferred

- Localizing the English config/data strings in `missions.ts` / `shopItems.ts` / `sampleAchievements.ts`
  (§4.1) — pending a per-surface decision.
- On-device RTL visual verification across all screens (native build required).
- A third language / general locale expansion.
- A test asserting gendered-variant completeness for Hebrew strings (§4.4).
- Auth-provider gender auto-detect (E1 / OAuth, Apple-gated).
