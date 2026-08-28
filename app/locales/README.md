# `locales/` — the Hebrew system strings

> **WIRED BACK IN on 2026-08-28**, riding the same build as the Sentry SDK. The three lines below are
> in `app.json` again. Everything under this line is the history of why they were ever taken out, and
> the rule that came from it — both worth keeping, because the next native change will face the same
> choice.

These two files are **not wired into `app.json` right now, on purpose.**

## What they are for

They give iOS the app's permission prompts in the user's language, and they exist alongside the
change that actually matters for language: declaring Hebrew as a **supported localization** of the
bundle.

Without that declaration the app tells iOS it is English-only, however much Hebrew the JavaScript
renders. Two consequences were reported from a device on 2026-08-27:

1. The keyboard's own **dictation transcribed English while the person spoke Hebrew**, in the My
   Best Possible Year tool.
2. Every **system permission prompt appears in English** for a Hebrew user.

## Why they are unwired

`runtimeVersion` is `{ "policy": "fingerprint" }`. Any change to the NATIVE configuration —
`ios.infoPlist`, `expo.locales`, a plugin, a permission — recomputes that fingerprint, and an
over-the-air update published under a new fingerprint **reaches no installed build at all**.

That is exactly what happened on 2026-08-28: the three lines below were added, an update was
published on top of them, and it silently went to a runtime version neither phone was on. The update
carrying the Notifications screen, the privacy-policy row, the backup warning and the coach-edit fix
reached nobody until the change was reverted and it was published again.

So they wait here until there is a build to carry them, rather than sitting in `app.json` blocking
every over-the-air update in the meantime.

## What to re-apply, at the next native build

In `app.json`, under `expo`:

```jsonc
"locales": { "en": "./locales/en.json", "he": "./locales/he.json" },
"ios": {
  "infoPlist": {
    "CFBundleLocalizations": ["en", "he"],
    "CFBundleDevelopmentRegion": "en"
  }
}
```

Then build. Nothing else about these files needs to change.

## Why every string is under an `"ios"` key

The first Android build to carry these files **failed**, and iOS's succeeded. Expo's `locales` map is
not iOS-only: its Android plugin writes the same keys into `res/values-b+en/strings.xml` and
`res/values-b+he/strings.xml`. Those keys are iOS `Info.plist` names, so nothing in Android's default
`values/strings.xml` matches them — and Android Lint fails a release build on
`ExtraTranslation`: *"NSCameraUsageDescription is translated here but not found in default locale"*.
Eight errors, one per string per language.

The error EAS reported for it was `EAS_BUILD_UNKNOWN_GRADLE_ERROR` with no cause attached, which is
worth knowing: the reason was 1,900 lines into a brotli-compressed log, and the first guess
(Sentry's source-map upload, which is what broke the iOS build of the same commit) was wrong.

The locale file format has a per-platform section, so the fix is structural rather than a lint
suppression:

```jsonc
{ "ios": { "NSCameraUsageDescription": "…" } }
```

Keys at the ROOT of the file go to both platforms; keys under `"ios"` go only to iOS. Android now
gets an empty `<resources/>` for each language, which is correct — an Android permission rationale is
not an `Info.plist` key, and if Android ever needs its own strings they belong under an `"android"`
section rather than shared with these.

## The rule this is here to teach

**Check the runtime fingerprint before and after touching `app.json`.** If it moved, an update is a
build, and publishing one without the other reaches nobody — silently, which is the part that costs
a day.
