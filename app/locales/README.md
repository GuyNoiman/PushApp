# `locales/` — the Hebrew system strings, waiting for a build

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

## The rule this is here to teach

**Check the runtime fingerprint before and after touching `app.json`.** If it moved, an update is a
build, and publishing one without the other reaches nobody — silently, which is the part that costs
a day.
