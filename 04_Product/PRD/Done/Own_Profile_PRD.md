# PRD — Own Profile

Status: **Approved · Phase 1 IMPLEMENTED (2026-08-10)** — the unified profile model + the My Profile
screen (display name, `@username`, country, birth date, form of address) are built and green; the
profile **photo is Phase 2** (deferred by design) and auth-provider seeding wires in with E1. See §10
(current implementation) + §11 (resolution & phased build) and Decision Log **D34**.
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Friend_Profile_PRD.md`, Q1 form-of-address, K1 Onboarding, E1 authentication, Settings,
`Week_Boundary_Preference_PRD.md`, and Decision Log D31.

---

## 1. Purpose

The authenticated user's profile stores identity and adaptation preferences without crowding the main
Settings screen or exposing private information to friends. Settings remains the home of privacy controls;
the Own Profile is the home of identity fields and profile editing.

## 2. MVP fields

- profile photo;
- display name;
- `@username`;
- full birth date, stored privately; default is Not specified and the user may add/edit it later;
- country, defaulted from the device region without GPS or location permission and editable by the user;
- form of address — used for gender-aware language, not shown to friends;
- future-compatible structure for additional private profile fields.

Email and authentication-provider identifiers remain account data, not public profile data. Privacy
settings live in their own Settings area and are not duplicated here.

## 3. Authentication-provider seeding

Google may provide a stable provider subject ID, name, given/family name, profile-picture URL, email,
email-verification state, and sometimes locale. Apple may provide name and email, but name is returned
only on first authorization and must be persisted immediately; Apple may provide a relay email and no
profile photo. Neither provider supplies reliable age, country, or form of address for this feature.

Imported values are initial suggestions and remain editable. `@username` is generated from the display
name where possible, with a random fallback; it is never derived directly from the email address.
If no display name is available, PushApp generates a random editable display name. Form of address
defaults to neutral and remains editable (reconciled with Decision Log D31, 2026-08-10 — supersedes the
earlier "masculine" default). `@username` is generated and managed by PushApp. Internal
relationships always use stable internal IDs, never email or username.

App language is not edited on this screen. It is a single account preference edited only through
Settings → Language.

## 4. Profile-photo editing

- Default photo is the user's initials.
- Tapping the photo area offers camera or photo library.
- If permission is denied, close the picker and do not reprompt automatically. Ask again only after a
  later deliberate tap.
- Failure shows an actionable error and Retry; keep the previous photo until replacement succeeds.
- Support camera removal/replacement and photo removal back to initials.
- The implementation plan defines supported formats, normalization, dimensions, file-size limits, and
  compression. Binding safety requirements: correct orientation, remove location/EXIF metadata, prevent
  animated/unsafe media from bypassing validation, keep the prior photo until replacement succeeds, and
  delete owner-controlled media with the account.
- Server update authorization requires the authenticated user to own the profile.

## 5. Privacy and visibility

Age/birthday, country, form of address, email, gender-related preference, and provider information are
private and never included in friend-profile payloads. Profile photo, display name, `@username`, Level,
and separately authorized social/progress information may appear to accepted friends as defined by
`Friend_Profile_PRD.md`.

## 6. Edge cases

- provider omits or withholds every optional field;
- Apple returns the name only once;
- Google/Apple profile image becomes unavailable later;
- username collision, rename, and old-handle lookup;
- denied camera/library permission;
- malformed, huge, unsupported, or incorrectly oriented image;
- upload interrupted or app closed during replacement;
- legacy profile missing new fields uses safe defaults;
- language has no grammatical form-of-address distinction;
- partial onboarding resumes without losing saved fields;
- account merge/conflict between local data and authenticated profile;
- account export and deletion include/remove all owner-controlled profile fields and media.

## 7. Approved defaults

- Every field has a safe default: initials for photo; device region for country; generated editable
  values for display name and `@username`; masculine for form of address; Not specified for birth date.
- Birth date is not required during Onboarding and may be added later.
- Country uses device region only; the feature does not request GPS/location permission.
- Country supplies the default week-start convention; week-boundary display/edit behavior is owned by
  `Week_Boundary_Preference_PRD.md`.
- There is no “Preview as friend” action in MVP.
- Image format/dimension/compression choices are technical planning decisions subject to the binding
  safety requirements in §4.

## 8. Acceptance criteria

The screen must work in English/Hebrew, LTR/RTL, light/dark, permission-denied, loading, error, and
legacy-data states. Authorization tests must prove one user cannot read private fields or mutate another
user's profile. Defaults must allow every existing/new user to open the profile without incomplete-state
failure, while every field remains editable as specified.

## 9. Out of scope

- friend-profile presentation;
- privacy-settings design;
- Support Circle management;
- Achievement design;
- public profiles.

---

## 10. Current implementation & gaps (code audit, 2026-08-10)

Identity is **scattered across separate stores today — there is no unified profile model:**
- **`@username`** lives in the social layer (`SocialProvider.setHandle`) with a local generated fallback
  (`components/settings/ProfileIdentity.tsx` + `core/social/username.ts`).
- **display name + email** come only from a **dev-simulated** Google sign-in (`core/profile/simulatedUser.ts`);
  no real persistence or editing.
- **form of address** is a standalone `AddressPreference` provider (D31) — **default `neutral`** (the §3/§7
  "masculine" is corrected to neutral above).
- **week-start day** is a standalone `WeekStartPreference` provider (D33) — derives its default from the
  device REGION directly; **there is no `country` field**.
- **birth date, profile photo** do not exist.
- `core/profile/ProfileGateway.ts` is a reserved seam for **derived, PII-free traits** (preferred
  time-of-day, consistency) — **NOT** the home for identity fields; do not overload it.

## 11. Approved resolution, own-vs-friend boundary & phased build (founder, 2026-08-10 — binding)

**Two distinct uses of "profile" (founder):**
- **Own Profile = the private self area** — the user opens a dedicated screen and sees / edits **ALL**
  their fields.
- **Friend Profile** (`Friend_Profile_PRD.md`, P1) = **what a friend sees** — a **public SUBSET only**
  (photo, display name, `@username`, Level, separately-authorized progress). It **never** exposes the
  private fields (country, birth date, form of address, email, provider info — §5).

**Unified model (option A, approved):** one source-of-truth **`Profile`** object holds every field; the
friend-facing view is a **filtered projection** of it (private fields are never in any shared payload —
keep the existing shared-only privacy model). The framework-free modules that engines read
(`i18n/addressForm`, `util/week`) are **mirrored FROM** the unified profile, so there is one source.
`AddressPreference` + `WeekStartPreference` fold into it.

**Decisions:**
- **Form of address default → `neutral`** (reconciled with D31; §3/§7 updated).
- **Country → ALL countries.** A full country list for the picker + a compact country→week-start mapping
  (week start is only ever Sun / Mon / Sat worldwide, so: a Sunday-countries set + a Saturday-countries
  set + everyone-else = Monday), with a device-region fallback. Country supplies the week-start DEFAULT
  (a manual week-start override still wins — owned by `Week_Boundary_Preference_PRD.md`).
- **Phased build:** **Phase 1 = the fields + the Own Profile screen** (display name, `@username`, country,
  birth date, form of address) on the unified model; **Phase 2 = the profile photo** (its own slice with
  the §4 binding safety requirements + `expo-image-picker`). **Auth-provider seeding (§3)** wires in when
  real OAuth lands (E1, Apple-gated); until then fields use the §7 safe defaults and are editable.
**Reflected in:** Decision Log (to follow) + the implementation.
