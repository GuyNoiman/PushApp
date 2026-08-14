# Encryption Design — On-Device Data at Rest

Status: **PROPOSED (design only, no code written).** Owner: security-privacy, with the founder's
explicit approval to invest specialist effort here (2026-08-14). Awaiting founder sign-off on
sequencing and on the two open questions in §13.

Stage: **MVP** for the device-local scheme described here. Everything that needs a server
(multi-device provisioning, key escrow, E2EE sync) is Commercial-era and is listed as out of scope
in §12.

**The single question this document answers:** *How is the user's data encrypted on the device,
and how are the keys that protect it created, stored, lost, recovered, and replaced?*

It does not describe the social/sync privacy boundary (that is `SocialGateway`'s whitelist and
`Social_Backend_Proposal.md`), nor auth (`Auth_Backend_Proposal.md`, decision E3). It complements
Engineering Bible 02 "Encryption / Local Before Cloud" and 03 "Encryption at rest" by making those
principles concrete.

---

## 1. What we are protecting, and from whom

### 1.1 The data

Everything in `AppState`, persisted as one JSON blob through `EncryptedLocalRepository`:

| Data | Why it is sensitive |
|---|---|
| Journeys, Milestones, Steps, titles | Reveals what the person is trying to change about themselves |
| The user's **"why"** | The most personal sentence in the product |
| `reasonLog` (Miss-Recovery), including the free-text `note` | Why someone failed, in their own words |
| `behaviorLog` (`RawBehaviorRecord`) | The coach's raw behavioural signal; a minute-by-minute portrait of a life |
| `onboardingAnswers` | Self-reported context given once, under a specific promise |
| Timing evidence store | Derived behavioural timing |
| Buddy / XP / Coins | Low sensitivity, but rides in the same blob |

Several of these are **whitelist-barred from ever leaving the device** (see the G1 comments in
`app/src/core/types/domain.ts` and `app/src/core/social/SocialGateway.ts`). Encryption at rest is
the second half of that promise: barring data from the network is worth little if it sits readable
in a file that a backup, a forensic tool, or another app's file-access bug can reach.

**Known gap (outside `AppState`, see §12.2):** the private profile blob at AsyncStorage key
`pushapp.profile` holds **country, birth date, form of address and communication style in
plaintext**. It is not covered by the current scheme. Bringing it under the same envelope is
proposed as Phase C5.

### 1.2 Threat model

**In scope — what this design defends against:**

1. **Device theft or loss**, including a device handed in for repair or resale. The attacker has
   the file system but not the passcode, or has a locked device and time.
2. **Backup extraction.** An unencrypted iTunes/Finder backup, an ADB backup, or a cloud backup
   dump exposes app files. Keychain/Keystore material is protected differently from app files,
   which is precisely the separation we rely on.
3. **Another process on the same device reading our files** through an OS bug or a shared
   container misconfiguration.
4. **Silent corruption or tampering of the stored blob.** This is the one the current cipher does
   *not* defend against and is the main reason for this document.

**Out of scope — honestly stated, not hand-waved:**

- A **rooted/jailbroken device, or malware running as our app**. It can read the key from the
  keychain the same way we do. No client-side scheme fixes this.
- **Memory disclosure.** JavaScript strings cannot be zeroed; the plaintext `AppState` lives in the
  JS heap for the app's lifetime by design. Encryption at rest is not encryption in use.
- **A malicious OS or a compromised platform CSPRNG.** We depend on `SecRandomCopyBytes` /
  `SecureRandom` and cannot verify them from JS.
- **Screen capture, shoulder surfing, an unlocked device in someone else's hands.**

### 1.3 Design invariants

Every choice below is checked against these. If a proposal violates one, the proposal is wrong.

- **I1 — Never delete the only readable copy of the data.** Any migration or rotation keeps the
  previous (key, ciphertext) pair whole until the new pair has been read back and verified.
- **I2 — Exactly one commit point.** Every multi-write sequence has a single write that flips
  authority. Every state before it and after it is readable.
- **I3 — Never encrypt under material we are not sure is random.** Refuse and throw, never degrade.
- **I4 — Never write plaintext to disk, not even "temporarily", not even as a migration backup.**
- **I5 — Fail loud, not empty.** Undecryptable data must never silently present as "first run" and
  must never be overwritten by the fresh state that follows.
- **I6 — Boring, standard constructions only.** No novel modes, no home-made KDFs, no custom
  padding, no invented envelope semantics. Every primitive here is an RFC or a NIST publication
  with a public test-vector suite.

---

## 2. Current state, verified 2026-08-14

Read in full: `app/src/core/persistence/EncryptedLocalRepository.ts`.

**What is already right, and should be preserved:**

- A 256-bit DEK in `expo-secure-store` (OS keychain / Android Keystore), never in AsyncStorage,
  never logged. AsyncStorage holds ciphertext plus a non-secret IV.
- A **versioned envelope** `{ v, iv, ct }`. There is already a version field to build on.
- **Two-slot generation design** with a single commit point (`rotateLegacyKey`), plus a legacy
  plaintext migration that deletes the plaintext only after a successful encrypted write. The
  reasoning in that file's header is correct and this design generalises it rather than replacing it.
- `clear()` destroys the DEK as well as the ciphertext, so surviving remnants are unrecoverable.
- A `CryptoProvider` seam, injected, so the cipher can be swapped without touching callers.

**The randomness fix landed this session — verified and sound.** `expo-crypto@15.0.9` is present in
`app/package.json`; `fillWithSecureRandom` prefers Web Crypto, then `ExpoCrypto.getRandomValues`,
then throws `InsecureRandomnessError`; an all-zero-buffer guard catches a stubbed native module.
Choosing `getRandomValues` over `getRandomBytes` is exactly right: reading
`node_modules/expo-crypto/build/Crypto.js` confirms `getRandomValues` delegates straight to the
native module with no fallback and no byte-count clamp, while `getRandomBytes` is the API Expo
documents as falling back to `Math.random` under a debugger. Two refinements are proposed in §9.6
(wrap the native call so its throw becomes an `InsecureRandomnessError`, and treat the
all-zero guard as a hard failure at every call site). Nothing about the fix needs reversing.

**The defects this document exists to fix:**

| # | Defect | Consequence |
|---|---|---|
| D1 | **AES-256-CBC with no MAC.** The file's own header admits it. `crypto-js` cannot do AES-GCM. | Ciphertext is malleable. A flipped byte does not fail loudly; PKCS#7 either throws or yields silently corrupted plaintext. There is no way to distinguish "wrong key", "corrupt", and "tampered". |
| D2 | **Failure degrades to `null` = "first run".** | `AppCore.start()` then seeds demo data and the next `onChanged` overwrites the unreadable-but-existing ciphertext. **This is how real data gets destroyed.** Violates I1 and I5. |
| D3 | **Envelope `v` is written but never read.** `decrypt()` ignores `parsed.v` entirely, and `encrypt()` writes `v: 1` into slots named `.v2`, conflating ciphersuite version with key generation. | A future ciphersuite could be fed to the wrong decryptor. No downgrade detection. |
| D4 | **No AAD.** Nothing binds a blob to its slot, its key generation, or its version. | A blob can be replayed into another slot; header fields can be edited freely. |
| D5 | **No defined key-loss behaviour.** Key gone + ciphertext present is indistinguishable from first run. | Total silent data loss, presented to the user as an empty app. |
| D6 | Padding-oracle *shape* (CBC + PKCS#7 + a boolean success signal). | Not exploitable in the current local-only threat model (no attacker-controlled oracle), but it is a construction we should not carry into a world with sync. |
| D7 | `save()` is called unawaited (`void this.repo.save(...)`) on every state change. | Concurrent encrypt+write races; last-write-wins is undefined. Made more visible by any slower cipher. Fix by serialising saves (§10, Phase C0). |

---

## 3. Cipher choice

### 3.1 Decision

**XChaCha20-Poly1305 AEAD.**

| Parameter | Value |
|---|---|
| Algorithm | XChaCha20-Poly1305 (`draft-irtf-cfrg-xchacha-03`; ChaCha20-Poly1305 is RFC 8439) |
| Key size | **256 bits** (32 bytes) |
| Nonce size | **192 bits** (24 bytes), uniformly random per message |
| Tag size | **128 bits** (16 bytes), Poly1305, appended to the ciphertext |
| AAD | The canonical envelope header bytes (§3.4) |
| Encoding on disk | Lowercase hex, matching today's envelope (§3.5) |

### 3.2 Why this is the boring choice

- **Authenticated encryption is the whole point.** AEAD fixes D1 outright: a modified byte anywhere
  in nonce, ciphertext, tag or AAD makes decryption *fail*, deterministically, with a
  cryptographically sound signal. That turns "we cannot tell corrupt from wrong-key" into a
  reliable input for the recovery logic in §6.
- **ChaCha20-Poly1305 is standard.** RFC 8439, mandatory-to-implement in TLS 1.3, ubiquitous in
  Signal, WireGuard, age, libsodium. XChaCha20 is the same construction with an HChaCha20 nonce
  extension, and is what libsodium's `crypto_secretbox`-era APIs standardised on.
- **Pure-JS friendly.** ChaCha is designed for software; a JS implementation is fast and, crucially,
  **constant-time by construction**. A pure-JS AES is table-driven and therefore cache-timing
  leaky. On a device where we cannot reach a native AES-NI implementation without a dev build
  (§4), ChaCha is the *safer* pure-JS primitive, not merely the faster one.
- **The 192-bit nonce is the deciding factor.** See §3.3.

### 3.3 The nonce-reuse hazard, stated plainly

For any ChaCha20-Poly1305 or AES-GCM key, **reusing a nonce is catastrophic, not merely
weakening**. Two messages under the same (key, nonce) leak the XOR of their plaintexts, and for
Poly1305/GHASH it additionally permits recovery of the one-time authenticator key, which turns a
confidentiality break into a **forgery** capability. There is no partial credit here.

PushApp's write pattern makes this a live concern rather than a theoretical one:

- `AppCore.onChanged` writes the **entire state** on **every change**. A single active user
  produces thousands of writes per year, all under one long-lived key that is rotated only on
  explicit events (§8).
- The state is highly repetitive between writes, so a nonce collision would compare two nearly
  identical plaintexts. That is close to the worst case for a keystream-reuse attack.
- **The device state can be rolled back.** An iOS backup restore, an Android restore, or a user
  reinstalling over old data can return the app to an earlier persisted state *while keeping the
  same key*. This single fact rules out any counter-based nonce: a counter that resets or rewinds
  on restore produces guaranteed reuse. It is the classic way this construction is broken in
  practice.

**How this design prevents it:**

1. **Random nonces, never counters.** Every `encrypt()` call draws a fresh 24-byte nonce from
   `fillWithSecureRandom`, the same refuse-or-throw path as the key. This is immune to state
   rollback by construction, which is exactly why it is chosen.
2. **192 bits makes random safe.** With random nonces the collision risk follows the birthday
   bound: for a 192-bit nonce, the probability stays negligible past 2^80 messages. AES-GCM's
   96-bit nonce, by contrast, is only considered safe for random nonces up to roughly 2^32 messages
   per key (NIST SP 800-38D's guidance for random IVs). We are nowhere near 2^32 today, but the
   whole point of picking the wide nonce is that we never have to *reason* about the write count,
   never have to enforce a rotation schedule to stay under a bound, and never have to revisit this
   if the state starts being written more often.
3. **No nonce is ever reused across keys either.** A new key generation always means new nonces;
   there is no key-and-nonce carry-over path in the design.
4. **The nonce is authenticated.** It sits in the header, and the header is the AAD (§3.4), so a
   nonce cannot be swapped between blobs undetected.
5. **A negative test enforces it** (§9.2): 10,000 encryptions of identical plaintext must produce
   10,000 distinct nonces and 10,000 distinct ciphertexts.

### 3.4 Associated data (AAD)

The envelope header is authenticated but not encrypted. AAD is the canonical UTF-8 bytes of a
**fixed-template** string (built by string concatenation in a fixed order, *not* by
`JSON.stringify` over an object, so byte-stability never depends on key ordering):

```
{"v":3,"alg":"XC20P","kg":<generation>,"slot":"<storage key name>"}
```

This binds each blob to its ciphersuite version, its key generation, and the storage slot it
belongs in. It closes D3 and D4: a v3 blob replayed into the legacy slot fails; an edited `kg`
fails; a downgrade attempt to a weaker suite fails at the tag check rather than at a hopeful
`if`. AAD is free (it costs one Poly1305 block) and it is the standard way to authenticate
metadata that must stay readable.

### 3.5 Envelope format v3

```
{"v":3,"alg":"XC20P","kg":3,"n":"<48 hex chars = 24-byte nonce>","ct":"<hex ciphertext||tag>"}
```

- `v` is the **ciphersuite/envelope version** and `kg` is the **key generation**. D3 conflated
  these; they are separated permanently. `decrypt()` **must** switch on `v` and reject anything it
  does not recognise, rather than optimistically parsing.
- Hex is retained rather than base64. It is what the code already uses, it needs no new dependency,
  and Hermes' base64 availability is not something to assume. The cost is 2x expansion of the
  ciphertext on disk. Measure it (§9.7); if a real state blob makes this matter, switch to base64
  via `@scure/base` (MIT, zero-dependency, same maintainer as noble) as a later, isolated change.
- **UTF-8 encoding must be verified, not assumed.** `crypto-js`' `enc.Utf8` currently handles the
  Hebrew content. Moving to a byte-oriented library means going through `TextEncoder`/`TextDecoder`,
  whose presence under Hermes must be confirmed on device (§9.5). Hebrew, RTL marks and emoji are
  first-class content in this product, so a silent mojibake here would be a data-integrity bug, not
  a cosmetic one.

### 3.6 Alternatives considered

| Option | Verdict |
|---|---|
| **AES-256-GCM** | Perfectly standard and would be fine, but the 96-bit nonce forces us to reason about a message-count bound under random nonces, and a rollback-safe counter is not available to us (§3.3). Pure-JS AES is also table-driven and cache-timing leaky. Rejected on nonce width and pure-JS timing, not on strength. |
| **AES-256-GCM-SIV** (RFC 8452) | The genuinely nonce-misuse-resistant option and a strong second choice. Rejected because it is deterministic-by-design (identical plaintext gives identical ciphertext, which leaks "nothing changed" to a file-system observer), it is slower in pure JS, and XChaCha's wide random nonce already removes the hazard SIV exists to mitigate. |
| **AES-256-CBC + HMAC-SHA256, encrypt-then-MAC** | Standard and correct when built exactly right (separate keys via HKDF, MAC over IV‖ct‖AAD, constant-time compare), and it needs **no new dependency at all** since `crypto-js` has HMAC. It is the cheapest option on paper. Rejected because it is the composition most often assembled wrongly, it keeps the CBC/PKCS#7 padding-oracle shape (D6), and it keeps us on `crypto-js`, a library with no security audit and a long history of quietly weak defaults. Kept on record as the fallback if §4's library recommendation is ever blocked. |
| **SQLCipher / an encrypted DB** | Already rejected for the POC (native dependency). Unchanged: it would force a dev build, same as §4's native option, for a benefit we do not need while the whole state is one blob. |
| **OS-level file protection only** (iOS Data Protection, Android FBE) | Real and valuable, and we get it for free, but it protects only while locked and does nothing about backups or about the tamper-detection gap. It is a layer, not the layer. |
| **Keep CBC, add a MAC later** | Rejected: it is the status quo with a promise attached, and the promise has already been outstanding since the file was written. |

---

## 4. Library choice

### 4.1 Candidates evaluated, with a cost line for each

| Library | Licence | Cost | Runs in Expo Go? | Assessment |
|---|---|---|---|---|
| **`@noble/ciphers`** | MIT | **$0.** No paid tier, no service, no build infrastructure. ~540 KB unpacked, **zero runtime dependencies**, tree-shakeable to the chacha module. No native binary, so no effect on build minutes. | **Yes** — pure JS, no native module | Provides `xchacha20poly1305`, `chacha20poly1305`, AES-GCM and AES-GCM-SIV. **Independently audited by Cure53 at v1.0.0 (Sept 2024), funded by OpenSats**; self-audited at v2.2.0 (Apr 2026). Widely used across the Ethereum/Bitcoin JS ecosystem. **Recommended.** |
| **`react-native-quick-crypto`** | MIT | **$0 in licence, but not free in practice.** It is a native module, so Expo Go stops working and every device test needs a dev build. That means the ~**$99/yr Apple Developer Program** (already identified as the one unavoidable cost in E3/P3) becomes a prerequisite *for encryption work* rather than for shipping, plus local Xcode build time on every native change. Per CLAUDE.md §3.10 this cannot be recommended without founder approval. | **No** | Technically excellent (JSI-bound OpenSSL, real AES-GCM, orders of magnitude faster). Rejected **for now** purely on cost and workflow: it would break the founder's current QR-in-Expo-Go test loop and force a paid-account decision that E3 deliberately deferred. Revisit at P3 when the dev build exists anyway; the `CryptoProvider` seam means swapping to it later is a contained change. |
| **`crypto-js` (stay put) + HMAC** | MIT | **$0, and zero new dependencies.** The cheapest possible option. | Yes | The encrypt-then-MAC fallback from §3.6. Viable, unaudited, and keeps the CBC shape. Documented as the contingency, not the recommendation. |
| **`expo-crypto` alone** | MIT | $0, already installed | Yes | Provides digests and `getRandomValues` only. **No symmetric cipher.** Cannot satisfy the requirement. Remains our RNG source regardless of which cipher library wins. |
| **Web Crypto `SubtleCrypto`** | n/a | $0 | No | Hermes ships no Web Crypto and Expo's runtime does not polyfill it, as the existing code comments already establish. Available on web only. Not usable as the primary path. |
| **`libsodium.js` (WASM/asm.js)** | ISC | $0 licence, but ~300 KB+ WASM and unreliable WASM support under Hermes | Doubtful | The reference implementation of exactly this construction, but the bundle-size and Hermes-WASM risk is not worth it when noble gives the same primitives in plain JS. Rejected. |

### 4.2 Recommendation

**Add `@noble/ciphers`, pinned, and use `xchacha20poly1305` from `@noble/ciphers/chacha`.**

**Pin `1.3.0`, not `2.x`, initially.** Reasons, both verified against the registry:

- The **Cure53 audit covers the v1.0.0 line**; v2 is self-audited so far.
- **v1.3.0 ships dual CJS + ESM** (`exports` has both `import` and `require` conditions). **v2.3.0
  is `"type": "module"`, ESM-only, and declares `engines.node >= 20.19.0`.** ESM-only packages
  require a `transformIgnorePatterns` entry in the `jest-expo` preset and can surprise Metro. That
  is solvable, but it is a build-config risk to take deliberately and separately, not on the same
  day we change the cipher.

Plan a controlled bump to `2.x` later, as its own change with the test vectors from §9.1 acting as
the regression gate.

**Supply-chain hygiene (this library will be able to read every reflection the user writes):**

- Pin the exact version (no `^`), commit the lockfile, and verify the integrity hash.
- Confirm zero runtime dependencies and no `postinstall` script before merging.
- Treat any future version bump as a security-reviewed change with the KAT suite as the gate.

**Cost summary: $0. No founder cost approval is required for the recommended path.** The only
cost-bearing option (`react-native-quick-crypto`, which drags in the ~$99/yr Apple Developer
Program and the end of the Expo Go loop) is explicitly **not** recommended now.

`crypto-js` stays installed until the migration window closes (§7) because it is the only thing
that can read existing v1/CBC data. It is removed in Phase C4.

---

## 5. Key management

### 5.1 Generation

A **256-bit DEK** from `fillWithSecureRandom`. No derivation from anything, because there is
nothing secret to derive from at MVP: auth is passwordless (E3, Apple/Google sign-in), so there is
no password, and the `auth.uid()` is an identifier, not a secret. **Deriving a key from a
non-secret is worse than useless — it is a key an attacker can compute.** Random generation is the
correct and standard choice for a device-local DEK.

I3 applies: if the CSPRNG cannot be reached, generation **throws** and nothing is written. The
current code already does this and it must survive the rewrite unchanged.

### 5.2 Storage

`expo-secure-store` (iOS Keychain `kSecClassGenericPassword`; Android Keystore-wrapped value in
SharedPreferences). Never AsyncStorage, never in a log, never in an export, never in an event, never
in a crash report.

Three `SecureStoreOptions` must be set **explicitly** rather than left to the default, and each is a
real decision:

| Option | Value | Why |
|---|---|---|
| `keychainAccessible` | **`AFTER_FIRST_UNLOCK`** | The default is `WHEN_UNLOCKED`. If any code path ever touches the store while the screen is locked (a notification response handler, a background task), `WHEN_UNLOCKED` returns nothing and the app sees a missing key, which under D5 looks exactly like data loss. `AFTER_FIRST_UNLOCK` still requires the device to have been unlocked once since boot, so it retains the protection that matters for a stolen powered-off device. |
| `keychainAccessible` — the `_THIS_DEVICE_ONLY` question | **Deliberately NOT device-only, at MVP** | `..._THIS_DEVICE_ONLY` keeps the key off iCloud Keychain and out of device-to-device migration. It is the stronger choice against a compromised Apple account, and it is what we should want *once an escrow or a backend exists*. Today it would mean: iOS restores the ciphertext to the new iPhone but not the key, giving **guaranteed, unavoidable data loss on every device upgrade**. Until §6's recovery path exists, availability wins. **This is founder open question Q1 (§13).** |
| `requireAuthentication` | **`false`** | Biometric-gating the DEK sounds attractive and is wrong here: it would make the key unreadable during any non-interactive work and would hard-fail for users with no biometrics enrolled. App-level lock, if wanted, is a separate product feature, not a key-storage setting. |
| `keychainService` | **set explicitly** to a constant (e.g. `pushapp.keys`) | Leaving it implicit makes the item harder to find deterministically and makes access-group behaviour depend on defaults. Note: once set, it must be supplied on every read; changing it later orphans the key, so it is set **once, during the C1 migration**, when a fresh key is being written anyway and the change is therefore free. |

### 5.3 Key hierarchy

**At MVP: one DEK, one consumer, no HKDF.** Domain separation is achieved by the AAD (§3.4), which
is sufficient while there is exactly one ciphertext consumer.

**The moment a second consumer appears** (an encrypted export file, a sync payload, a per-record
key), switch to a root key with **HKDF-SHA256** subkeys:

```
K_state  = HKDF-SHA256(ikm = K_root, salt = "", info = "pushapp/state/v3")
K_export = HKDF-SHA256(ikm = K_root, salt = "", info = "pushapp/export/v1")
```

HKDF (RFC 5869) with a distinct `info` label per purpose is the standard construction. It costs one
dependency, `@noble/hashes` (MIT, zero-dependency, same maintainer, **$0**). Deliberately deferred
so that today's change stays one library and one primitive.

### 5.4 Per-device vs per-account

**Today the DEK is per-device and account-independent, and that is correct.** The app is
offline-first; a key that depends on an account would break for anonymous and signed-out users, who
are the majority right now.

The extension path, designed for now and built later:

```
MVP (today)          K_state ──> keychain, per device
Backend era          K_root ──> keychain, per device
                       └─ wrapped by K_wrap (envelope), where K_wrap is
                          available on a second device via one of:
                            (a) a user-held recovery phrase (BIP-39 style, 128-bit entropy),
                            (b) a server-held wrap key released after re-auth (server can decrypt: state it),
                            (c) platform sync (iCloud Keychain / Google Block Store)
```

The envelope structure (a DEK wrapped by a KEK) is the standard, boring shape, and the current
two-slot design already anticipates a wrapped key living in its own slot. **Nothing in the MVP
scheme forecloses it**, because the ciphertext format does not depend on how the key was obtained.

**Multi-device provisioning requires a backend that does not exist.** Option (b) is the only one
that survives a lost device with no user-held secret, and it means the server can decrypt, which is
a product/privacy decision the founder must make (§13, Q2), not an engineering default.

### 5.5 Device replacement — what actually happens

Verified behaviour, since this is the difference between "my data moved" and "my life's reflections
are gone":

| Scenario | Ciphertext (AsyncStorage) | DEK (SecureStore) | Result |
|---|---|---|---|
| **iOS, encrypted backup restore to a new iPhone** | Restores | Restores, **provided the item is not `_THIS_DEVICE_ONLY`** | **Data survives.** This is why §5.2 keeps the default. |
| **iOS, unencrypted backup** | Restores | **Does not restore** (keychain items are excluded from unencrypted backups) | **Key loss.** Must be handled by §6, not by a blank Home screen. |
| **iOS, uninstall then reinstall, same bundle ID** | **Gone** | **Survives** (documented keychain behaviour) | Clean first run, with an orphan key that the next save reuses. Harmless, but §8 should mint fresh on a detected first run rather than reuse an orphan. |
| **Android, Auto Backup restore to a new device** | **May restore** (SharedPreferences/files are in Auto Backup by default) | **Never restores** (Keystore keys are hardware-bound and non-exportable) | **The worst case: ciphertext without a key.** This is the exact silent-empty failure. |
| **Android, uninstall/reinstall** | Gone | Gone | Clean first run. Correct. |

**Two concrete actions follow:**

1. **Exclude the ciphertext and the secure-store preferences from Android Auto Backup** (an
   `android:fullBackupContent` / `dataExtractionRules` exclusion via the Expo config plugin, or
   `allowBackup=false`). A clean first run is a far better failure than an undecryptable blob, and
   it removes an entire class of user-visible loss. Touches `app/app.json`.
2. **Implement §6 anyway.** The exclusion narrows the window; it does not close it (the unencrypted
   iOS backup case remains).

### 5.6 Key lifetime and what is never done

- The DEK never leaves the keychain, is never serialised into `AppState`, an export, an event, or a
  log line.
- No key is ever transmitted. There is nowhere to transmit it to, and there must not be until §13/Q2
  is answered.
- No key is derived from a device identifier, an install ID, a UUID, a timestamp, or a `uid`. All of
  those are guessable or enumerable.

---

## 6. Recovery and key-loss behaviour

Today this is **undefined and silent**: `load()` returns `null`, `AppCore` decides it is a first
run, seeds demo data, and the next state change overwrites the unreadable ciphertext. The user sees
an empty app and no explanation, and the last chance at recovery is destroyed by the app itself.
That is defect D2/D5 and it is the most damaging thing in the current implementation.

### 6.1 Classify the failure — AEAD makes this possible

`load()` must distinguish four states. Note that **only authenticated encryption makes this
classification trustworthy**; under CBC these are indistinguishable.

| State | Detection | Meaning |
|---|---|---|
| **FIRST_RUN** | No ciphertext, no key | Genuine new install. Seed as today. |
| **KEY_LOST** | Ciphertext present, key absent | Backup restore without keychain, Android Keystore loss, keychain reset |
| **UNREADABLE** | Ciphertext present, key present, **tag verification fails** | Wrong key generation, corruption, or tampering |
| **MALFORMED** | Decrypts and authenticates, but the plaintext is not valid `AppState` JSON | Our bug, effectively. Should be impossible once the tag verifies. |

### 6.2 Behaviour: quarantine, then ask

For KEY_LOST / UNREADABLE / MALFORMED:

1. **Quarantine, never delete.** Copy the unreadable blob to `pushapp.state.quarantine.<epochMs>`
   and remove it from the live slot. Keep at most **two** quarantined blobs, dropping the oldest, so
   storage is bounded. If a future fix or a recovered key ever appears, the data is still there.
2. **Record a marker** (`pushapp.recovery.state`) holding the classification and the timestamp, so
   the state survives a relaunch and can be reported.
3. **Do not return `null`.** `Repository.load()` gains a typed result so the composition root can
   branch. This is an interface change (§11) and it is the single most important behavioural fix in
   this document.
4. **Block the happy path.** The app must **not** seed demo data and must **not** write a fresh
   state over the slot until the user has explicitly chosen. I5.
5. **Show a Recovery screen** that tells the truth.

### 6.3 What the user sees

Copy intent below; hand the final wording to content-writer, in English and Hebrew, no
em-dashes, human tone:

> **We can't open your data on this device**
>
> Your Journeys are still stored here, but the key that unlocks them isn't. This usually happens
> after restoring from a backup that didn't include the phone's secure storage.
>
> We keep your data encrypted so that nobody else can read it, including us. That protection is also
> why we can't unlock it for you.
>
> - **Restore from a file you saved** (if you exported your data before)
> - **Start fresh** (your old data stays locked on this device until you delete it)
> - **Get help**

Three properties matter: it is honest, it does not blame the user, and **nothing is deleted until
the user picks**. "Start fresh" requires a typed or two-step confirmation and only then clears the
quarantine.

### 6.4 What is and is not recoverable — no comfortable ambiguity

- **Without the key, the data is gone.** XChaCha20-Poly1305 with a 256-bit random key and no escrow
  is not brute-forceable. There is no support ticket, no back door, no vendor recovery. This is the
  intended property and the direct cost of the privacy promise.
- **The only recovery that exists at MVP is a user-held export.** `app/src/state/accountExport.ts`
  and `useAccountActions.ts` already implement export via the OS share sheet. This design promotes
  that from a GDPR portability checkbox to **the recovery mechanism**, which has two consequences:
  1. **Prompt for it.** Once, after onboarding completes, and again at a low-friction moment such as
     completing a first Journey. Framed as "keep a copy", never as a scary warning.
  2. **The export is currently plaintext JSON** leaving the device through the share sheet, carrying
     the "why", the reason notes and the behaviour log. That is a genuine privacy exposure that
     partially undoes the at-rest work (it can land in Files, iCloud Drive, or a chat app). Options,
     in order of preference: encrypt the export under a user-chosen passphrase (needs a slow KDF:
     scrypt or Argon2id from `@noble/hashes`, **$0**, but pure-JS cost on device must be measured
     before choosing parameters); or, at minimum, warn clearly at the share sheet about what the
     file contains. **Tracked as Phase C4; flagged to the founder as a product decision.**
- **Restore-from-file** must validate the import (shape and version) and must itself go through the
  quarantine-first path so a bad import cannot destroy a good store.

### 6.5 Interaction with `firstRunFlag`

`firstRunFlag` deliberately survives `repo.clear()` so a post-deletion relaunch does not re-seed.
The recovery path must not confuse the two: **"the user deleted their account" and "we cannot read
the data" are different states and must stay separate markers.** Recovery reads
`pushapp.recovery.state`; seeding reads `firstRunConsumed`. Neither is allowed to imply the other.

---

## 7. Migration from the v1 CBC envelope

**This is the highest-risk part of the work. Real data exists on the founder's device.** The
governing rule is I1: at no point does the only readable copy stop existing.

### 7.1 Slots

| Slot | Contents | Role |
|---|---|---|
| `pushapp.state.enc.v2` + `pushapp.dek.v2` | AES-CBC, envelope `v:1` | **Legacy. Left completely untouched until the migration is proven complete.** |
| `pushapp.state.enc.v3` + `pushapp.dek.v3` | XChaCha20-Poly1305, envelope `v:3` | The new generation |
| `pushapp.migration.state` | `none` / `dualwrite` / `complete` + counters | Resumability and observability |

Adding new slots rather than rewriting the old ones is what makes every intermediate state
readable. The existing `rotateLegacyKey` already proves this pattern works and its reasoning
(quoted in that file's header) applies unchanged.

### 7.2 The sequence, with the commit point marked

On `load()`, when a v2 pair exists and no verified v3 pair does:

```
1. Decrypt v2 under the v2 key (crypto-js CBC).            v2 pair intact
   If it does not decrypt, ABORT the migration and route
   to §6 UNREADABLE. Never migrate what we cannot read.
2. Mint a fresh v3 DEK from the CSPRNG. Refuse on failure. v2 pair intact
3. Encrypt the plaintext under v3 -> write v3 blob slot.   v2 pair intact
4. VERIFY: read the v3 blob back from storage, decrypt it
   with the in-memory v3 key, and compare the result
   byte-for-byte with the source plaintext.                v2 pair intact
   Any mismatch -> delete the v3 blob, abort, keep using
   v2, retry next launch. No state is lost.
5. Write the v3 DEK to the keychain.        <== COMMIT     v3 becomes authoritative
6. Set migration.state = "dualwrite".
7. From now until step 9, every save() writes BOTH the v3
   blob (authoritative) and the v2 blob (re-encrypted
   under the surviving v2 key).                            revert is lossless
8. Count clean cold starts that read and verify v3.
9. After 3 clean cold starts (or 7 days, whichever first)
   with zero decrypt failures: migration.state="complete",
   stop dual-writing, delete the v2 blob and the v2 key.   window closed
```

**Step 4 is what makes this different from the existing rotation.** The current
`rotateLegacyKey()` writes the new ciphertext and commits the new key without ever reading the new
blob back. It is safe against crashes but not against a *write* that silently fails or truncates.
Verify-before-commit closes that.

**Step 7 is what makes it genuinely reversible.** Without dual-write, a rollback to a pre-v3 build
would return the user to the pre-migration snapshot and lose everything written since. With
dual-write, both slots stay current, so a JS-only OTA revert loses nothing. The cost is one extra
encryption per save during a bounded window, which is negligible relative to what it buys.

**We do not write a plaintext backup at any point.** The untouched v2 pair *is* the backup. This is
I4 and it is non-negotiable.

### 7.3 Crash matrix

| Crash point | On-disk state | Next launch |
|---|---|---|
| Before step 3 | v2 only | Migration retried from the start. No loss. |
| Between 3 and 5 | v2 pair + orphan v3 blob, **no v3 key** | v3 key absent, so the reader falls through to v2 (the existing `readCiphertextAndKey` fall-through shape). The orphan blob is overwritten by the retry. No loss. |
| Exactly at 5 (partial keychain write) | SecureStore writes are atomic per item; the key is either there or not | Either the previous row or the next. No loss. |
| Between 5 and 6 | Both pairs valid, marker stale | v3 verifies and wins; marker is repaired to `dualwrite`. No loss. |
| During the dual-write window | Both current | Either is readable; v3 wins. No loss. |
| Between 9's marker write and the deletes | Both present, marker `complete` | v3 wins; the stale v2 pair is tidied. No loss. |
| Keychain unavailable at any point | Nothing committed | Retry next launch, exactly as `rotateLegacyKey` already handles. No loss. |

**In every row, at least one complete (key, ciphertext) pair is readable.** That is the property to
test for (§9.4), not merely to assert here.

### 7.4 Kill switch and rollout

- A build-time flag `CRYPTO_V3_ENABLED`. If a field problem appears, an **OTA JS update** flips it
  off; the dual-write window means the v2 pair is still current and the app keeps working.
- **Roll out to the founder's device first**, and ask him to take a data export **before** installing
  the migration build. It costs one tap and it is the only backup that exists outside the scheme.
- Ship the v3 **reader** one release before the v3 **writer** if there is any pre-existing installed
  base to worry about. At MVP there is effectively one device, so this is optional; note it as the
  standard practice for later.

---

## 8. Rotation

### 8.1 Generations on record

| Gen | Minted by | Status |
|---|---|---|
| **gen1** | Pre-CSPRNG-fix code, possibly `Math.random`-derived. **Must be treated as compromised.** | Already retired by `rotateLegacyKey()`. Ciphertext under gen1 must be re-encrypted **and the gen1 blob deleted**, since it may be decryptable by anyone who can guess the seed. |
| **gen2** | Current code, AES-CBC, key from a real CSPRNG | Strong key, unauthenticated ciphertext. Retired by the §7 migration. |
| **gen3** | XChaCha20-Poly1305 | Target |

The §7 migration therefore doubles as the rotation away from every weak-RNG-era key: any device
that ever held a gen1 key ends up on a freshly minted gen3 key, with gen1 and gen2 material deleted
once the window closes. **A weak key stays weak forever, so re-encryption is the only remedy; there
is no way to "strengthen" data already encrypted under it.**

One tightening: for gen1, deletion of the old ciphertext should be **mandatory** at window close,
not best-effort. A gen1 blob left on disk is a blob an attacker can brute-force offline.

### 8.2 Triggers

Rotate when, and only when, something happens:

- A **ciphersuite change** (this migration).
- **`clear()` / account deletion** (already implemented, correct).
- **"Start fresh"** from the recovery screen.
- **Suspected key exposure**, e.g. a future `requireAuthentication` change or a keychain anomaly.
- A **detected downgrade or version mismatch** in the envelope.
- **A genuine first run that finds an orphan key** (the iOS uninstall/reinstall case in §5.5): mint
  fresh rather than reuse.

### 8.3 No periodic rotation, and why

Scheduled rotation is standard for keys that travel (TLS, tokens, anything with exposure over
time). **A DEK that never leaves the OS keychain has no exposure that accrues with time.** Rotating
it on a timer would add a recurring re-encrypt-and-commit operation, which is the single most
dangerous operation in this design, in exchange for no threat reduction. **Rotate on events, not on
a calendar.** This is a deliberate decision, recorded so nobody "fixes" it later.

### 8.4 One routine, not several

The v1-plaintext migration, the gen1 rotation, and the v3 migration are the same operation:
*read under old material, write under new material into a separate slot, verify, commit, tidy.*
Generalise it into a single reusable, exhaustively-tested `migrateGeneration(from, to)` rather than
a third bespoke code path. Three near-identical hand-written sequences is how the fourth one
develops a data-loss bug.

---

## 9. Test and verification plan

### 9.1 Known-Answer Tests (the gate for any library change)

Assert our wrapper reproduces the published XChaCha20-Poly1305 vectors from
`draft-irtf-cfrg-xchacha-03` §A.3 (and the RFC 8439 §2.8.2 ChaCha20-Poly1305 vector), byte for
byte, with AAD. This is the test that makes a library swap or version bump safe: if
`@noble/ciphers` ever changes semantics, or if we later move to `react-native-quick-crypto`, these
vectors fail immediately rather than silently producing blobs the other implementation cannot read.

### 9.2 Cipher properties

- **Tamper detection.** Flip one bit in each of: the first ciphertext byte, a middle byte, the last
  tag byte, a nonce byte, and each AAD field. **All must fail decryption.** Include an explicit
  regression note that under the old CBC path some of these produced silently corrupted plaintext.
- **Nonce uniqueness.** 10,000 encryptions of identical plaintext: 10,000 distinct nonces, 10,000
  distinct ciphertexts, zero repeats.
- **Cross-slot replay.** A valid v3 blob written into a different slot, or with `kg` edited, must
  fail (AAD binding).
- **Version routing.** A `v:1` envelope must be routed to the legacy reader and never accepted as
  v3; a `v:3` envelope must never reach the CBC reader; an unknown `v` must fail closed.
- **Wrong key.** Fails with a tag error, not with garbage.

### 9.3 Data integrity

- **Unicode round-trip:** Hebrew text, RTL/bidi control marks, combining marks, emoji including
  4-byte code points and ZWJ sequences, and mixed Hebrew/English. This is a first-class correctness
  test, not an edge case.
- **Size:** a realistic `AppState`, and a 10x synthetic one with a long `behaviorLog` and
  `reasonLog`.
- **No plaintext on disk:** after `save()`, dump every AsyncStorage key and assert that no known
  sensitive substring (a "why", a reason note, a Journey title, an onboarding answer) appears
  anywhere, including in the quarantine slots and the migration marker.

### 9.4 Migration and rotation

- **Crash matrix:** parametrise failure injection at each of the 9 steps in §7.2, against both a
  failing KV and a failing SecureStore. **Assert after every single failure that the data is still
  readable, and that a retry on the next launch converges.** The existing failing-backend harness in
  `EncryptedLocalRepository.test.ts` (the "a rotation that fails part-way never loses data" block)
  is the right pattern to extend.
- **Verify-before-commit:** simulate a storage write that silently truncates; the migration must
  abort at step 4 and leave v2 authoritative.
- **Dual-write window:** simulate an OTA revert mid-window and assert the v2 pair is current, with
  no lost writes.
- **Idempotence:** a second launch after a completed migration is a plain load, no re-migration.
- **gen1 mandatory deletion:** assert the gen1 blob and key are gone once the window closes.

### 9.5 Runtime environment checks (must run on device, not on the host)

- **`TextEncoder` / `TextDecoder` presence under Hermes.** If absent, a UTF-8 encoding path must be
  chosen deliberately before any Hebrew data is encrypted. Blocking check.
- **`@noble/ciphers` bundles and runs under Metro/Hermes**, including in a release build (dead-code
  elimination and ESM interop behave differently there).

### 9.6 The on-device CSPRNG check — exactly what to run and what each result means

This could **not** be confirmed from the host. Node's `globalThis.crypto` masks the device path
entirely: in Jest, source 1 (Web Crypto) always wins and `ExpoCrypto.getRandomValues` is never
exercised. **The on-device path is currently unverified.**

**What to build:** a dev-only diagnostic, reachable behind a hidden gesture in Settings or a
temporary dev route (not shipped to production), that runs and displays:

1. `typeof (globalThis as any).crypto?.getRandomValues`
2. Three separate 32-byte draws via `ExpoCrypto.getRandomValues`, printed as hex
3. One 4096-byte draw, with: the count of zero bytes, the number of distinct byte values observed,
   and the max single-value frequency
4. A full `EncryptedLocalRepository` save/load round-trip on a throwaway store

**What to run it in, in this order:** Expo Go on the founder's iPhone; Expo Go with **remote JS
debugging attached** (this is where the old `getRandomBytes` fallback used to bite, so it must be
proven that `getRandomValues` does not degrade); an Android device or emulator if Android is in
scope; and again after **every Expo SDK upgrade**.

**Interpretation:**

| Result | Meaning | Action |
|---|---|---|
| (1) prints `undefined` | Expected under Hermes. Confirms the device really uses the `expo-crypto` branch, so that branch is the one that matters. | Proceed |
| (1) prints `function` | Something polyfilled Web Crypto. Find out what, and whether it is a real CSPRNG or a shim. | Investigate before trusting |
| (2) throws `UnavailabilityError` | The native module is not linked. | **Correct behaviour is to refuse to encrypt.** Verify `InsecureRandomnessError` is what surfaces (see the refinement below). |
| (2) returns all zeros | A stubbed or no-op module. | The existing all-zero guard must fire. Encryption must refuse. |
| (2) returns identical values across the three draws | Broken or seeded-once source. | **Stop. Do not ship.** |
| (3) shows ~16 zero bytes in 4096, ~256 distinct values, max frequency roughly 16-35 | Consistent with uniform random | Proceed |
| (3) shows strong skew, few distinct values, or visible structure | Broken source | **Stop. Do not ship.** |
| (4) round-trips | The whole stack works on device | Proceed |

**Be precise about what this proves.** It demonstrates the source is *present and not obviously
broken*. It does **not** prove cryptographic strength. That claim rests on the platform
(`SecRandomCopyBytes` / `SecureRandom`) and is untestable from JS. The test's real job is catching a
stub, a broken link, or a debugger-mode degradation, and those are exactly the failures that have
actually occurred here.

**Two refinements to the code that landed this session** (verified as sound, these only harden it):

1. On native, `typeof ExpoCrypto.getRandomValues === 'function'` is **always true** (it is a JS
   wrapper). So if the *native* module is missing, the wrapper throws an `UnavailabilityError`, not
   our `InsecureRandomnessError`, and the "anything else throws" branch is unreachable. **Wrap the
   call in try/catch and rethrow as `InsecureRandomnessError`** so the failure is unmistakable in a
   crash report, which is the stated intent of that class.
2. Keep the all-zero guard exactly as it is. On 16 and 32 byte draws the false-positive probability
   is 2^-128 and 2^-256, so it can only ever fire on a genuinely broken source. Apply it to the
   nonce as well as the key.

### 9.7 Performance

Measure on the founder's actual device, not the simulator: encrypt + decrypt of a realistic
`AppState` and a 10x one, p50 and p95, and the on-disk size before and after (the hex-vs-base64
question in §3.5 depends on this number). `AppCore.onChanged` writes the whole state on every
change, unawaited, so if p95 is bad the fix is **debouncing and serialising saves** (D7, Phase C0),
not weakening the cipher. Expect XChaCha in pure JS to be faster than the `crypto-js` AES it
replaces, so a regression would indicate a wiring problem, not a cipher cost.

### 9.8 Build configuration

- If the `2.x` line of `@noble/ciphers` is adopted later, `jest-expo`'s `transformIgnorePatterns`
  needs an entry for the ESM-only package. Pinning `1.3.0` avoids this for now.
- CI (or the local test run) must stay green throughout; no phase lands red.

---

## 10. Sequencing — nothing here blocks the MVP build

Each phase is independently reviewable, independently revertible, and leaves the app fully working.

| Phase | What | Risk | Blocks MVP? |
|---|---|---|---|
| **C0** | **Fix the silent-loss path first, with no cipher change at all.** Classify load failures (§6.1), quarantine instead of overwrite, typed `load()` result, recovery screen. Also serialise/debounce `save()` (D7). | Low. No crypto change, so no migration risk. | No |
| **C1** | Add `@noble/ciphers@1.3.0`. Implement the v3 `CryptoProvider` behind the existing seam, with the KAT and property tests (§9.1-9.3). **Write nothing to disk yet.** | Very low. Pure addition. | No |
| **C2** | Run the on-device CSPRNG and `TextEncoder` checks (§9.5, §9.6). **Gate: C3 does not start until these pass.** | None | No |
| **C3** | The migration (§7): dual-write window, verify-before-commit, kill switch. Founder exports his data first. | **The high-risk phase.** Everything above exists to de-risk it. | No |
| **C4** | Close the window: delete v2/gen1 material, remove `crypto-js`, set the SecureStore options (§5.2) and the Android backup exclusion (§5.5). | Low | No |
| **C5** | Optional follow-ons: encrypted export (§6.4), bringing `pushapp.profile` under the envelope (§12.2), HKDF subkeys when a second consumer appears. | Low | No |

**C0 is deliverable on its own and is the highest value per unit of risk in this entire document.**
It stops the app from destroying unreadable data, which is a live behaviour today, and it needs no
cipher change to do it.

---

## 11. Files this design will eventually touch — nothing is changed now

Several of these are under active modification by other work. **This is a design document; no code
is being changed by it.**

- `app/src/core/persistence/EncryptedLocalRepository.ts` — the cipher provider, the v3 envelope, the
  generalised migration routine, the failure classification
- `app/src/core/persistence/Repository.ts` — `load()` returns a typed result instead of
  `AppState | null` (**an interface change; coordinate, since `AppCore.ts` is actively being edited**)
- `app/src/core/AppCore.ts` — handle the new load result; do not seed on a recovery state; serialise saves
- `app/src/core/persistence/firstRunFlag.ts` — keep the recovery marker distinct from the first-run marker
- `app/src/core/persistence/__tests__/*` — extend both existing suites
- `app/package.json` / lockfile — add `@noble/ciphers`, later remove `crypto-js`
- `app/app.json` — Android Auto Backup exclusion
- A new recovery screen under `app/src/app/` plus i18n strings (en + he), copy by content-writer
- `app/src/state/accountExport.ts` / `useAccountActions.ts` — export-as-recovery prompt, optional
  encrypted export (C5)
- `11_Engineering_Bible/Engineering_Decisions.md` — a new **E6** entry once the founder approves
- `Current_Context.md` + `00_Foundation/CHANGELOG.md` at sprint end

Explicitly **not** touched: `core/engines/*`, `core/social/*`, `core/notify/*`, `core/types/domain.ts`.
The `Repository` abstraction is exactly the boundary that keeps this change out of the engines.

---

## 12. Out of scope

### 12.1 Deferred to the backend era

- **Multi-device sync and E2EE.** Needs a server. The key envelope in §5.4 is the designed hook.
- **Key escrow / server-assisted recovery.** Requires the founder's answer to Q2 (§13) and a backend.
- **Recovery phrase (BIP-39 style).** A real option for user-held escrow, but it is a significant UX
  burden and belongs to the multi-device conversation, not to a single-device MVP.
- **Per-record or per-field encryption, searchable encryption.** Unjustifiable while the entire state
  is one blob written atomically.
- **Key attestation / Secure Enclave-bound keys.** Would prevent key extraction from a jailbroken
  device. Native, dev-build territory. Revisit at P3.
- **Encryption in transit and server-side at rest.** Covered by TLS and Supabase; belongs to
  `Social_Backend_Proposal.md` and the RLS review, not here.

### 12.2 Known gaps deliberately left for later, recorded so they are not forgotten

- **`pushapp.profile` is plaintext AsyncStorage** and holds **country, birth date, form of address
  and communication style**. Birth date is directly identifying. Proposed as Phase C5. Recorded here
  rather than silently ignored.
- **The data export is plaintext** (§6.4). Product decision needed.
- **Rooted/jailbroken devices, memory hygiene, screen capture** (§1.2). Accepted, not solvable
  client-side.
- **`pushapp.firstRunConsumed`, theme and language preferences** stay plaintext. Deliberate: they are
  not personal data and one of them must survive a wipe by design.

---

## 13. Open questions for the founder

Only two things here are genuinely his to decide. Everything else is engineering judgement and is
decided above.

**Q1 — Availability vs strength on the keychain.** Should the DEK be marked
`WHEN_UNLOCKED_THIS_DEVICE_ONLY` (stronger: never syncs to iCloud Keychain or a new device, but
**guarantees data loss on every iPhone upgrade** until a recovery mechanism exists), or left
migratable (weaker against a compromised Apple account, but the user's Journeys survive a device
upgrade)? **Recommendation: leave it migratable at MVP, and revisit the moment §6's recovery path
and/or a backend escrow exists.** §5.2.

**Q2 — Should recovery ever be possible without the user holding something?** Server-assisted
recovery means the server can decrypt, which contradicts "nobody else can read it, including us".
The alternative is that a user who loses their device and has no export loses everything.
**Recommendation: keep the strong promise, and make the export prompt good enough that few people
are ever in that position.** §5.4, §6.4.

---

## 14. Cost

**$0.** The recommended path (`@noble/ciphers`, MIT, pure JS, zero runtime dependencies, no service,
no build infrastructure) incurs no charge and keeps the founder's Expo Go test loop intact. No
founder cost approval is required.

The one option that would cost money, `react-native-quick-crypto`, is **not** recommended now
precisely because it forces a dev build and therefore pulls the ~$99/yr Apple Developer Program
forward from E3/P3 into encryption work. Per CLAUDE.md §3.10 it is flagged rather than assumed, with
the free alternative recommended in its place. Revisit only if a dev build already exists for other
reasons.

If §6.4's encrypted export is later adopted, `@noble/hashes` (MIT, zero-dependency) is also **$0**.

---

## 15. Related documents

- `app/src/core/persistence/EncryptedLocalRepository.ts` — the current implementation and its own
  reasoning, which this document extends rather than discards
- `11_Engineering_Bible/Engineering_Decisions.md` — E1 (stack), E3 (auth, incl. the R2 secure-store
  hardening precedent). A new **E6** entry is due once this is approved.
- `11_Engineering_Bible/Auth_Backend_Proposal.md` — privacy red-lines R1/R2
- `11_Engineering_Bible/Social_Backend_Proposal.md` — the sync-side privacy boundary
- `11_Engineering_Bible/Engineering_Bible_02.md` §Encryption / Local Before Cloud, `_03.md` §Security
- `app/src/core/social/SocialGateway.ts`, `app/src/core/types/domain.ts` — the G1 on-device-only
  whitelist this design exists to make real
