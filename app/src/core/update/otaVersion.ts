/**
 * The number that goes up every time an update is published.
 *
 * ── WHY IT IS HERE AND NOT IN `app.json` ───────────────────────────────────────────────────────
 *
 * The founder's question was the right one: why not just bump `1.0.0` to `1.0.2` each time? Because
 * `expo.version` belongs to the NATIVE BUILD, and this project runs `runtimeVersion: {policy:
 * "fingerprint"}` — the Expo config is part of that fingerprint. Changing the version was measured,
 * not guessed: `1.0.0` → `1.0.1` moved the iOS fingerprint from `8634cdf5…` to `37cd640b…`, which
 * would have left both installed phones matching no runtime at all and unable to receive another
 * update until somebody installed a new binary. The number meant to end the confusion would have
 * caused a much worse one.
 *
 * A file under `src/` cannot do that. Application source is not a fingerprint input — it could not
 * be, or no over-the-air update could ever match the build it was meant for. So this number can
 * change on every publish, for free, forever.
 *
 * ── WHAT IT IS FOR ─────────────────────────────────────────────────────────────────────────────
 *
 * Settings › About already names the running update by id and date, which is authoritative and
 * unarguable — and is a hash, which nobody can hold in their head or say out loud. This is the
 * human-sized version of the same fact: "am I on 17 or on 19?" is a question two people can settle
 * across a room, and settling it across a room is the entire problem this exists for.
 *
 * ── IT IS NOT EDITED BY HAND ───────────────────────────────────────────────────────────────────
 *
 * `tools/publish-ota.mjs` increments it immediately before every publish and commits nothing — the
 * bump rides along in whatever commit follows. A hand-edit is not wrong, just pointless: the next
 * publish overwrites it.
 */

/** Incremented by `tools/publish-ota.mjs` on every publish. Not for hand-editing. */
export const OTA_VERSION = 4;
