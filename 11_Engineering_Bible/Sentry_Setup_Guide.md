# Adding Sentry — what the founder does, and what happens after

Written 2026-08-28, at the founder's request. Stage 5 of
`Operational_Monitoring_Implementation_Plan.md`.

**Read this first: your part takes about ten minutes and costs nothing. Everything after it is mine.**

---

## 0. Why we are doing this at all

Today, if the app breaks for a real person, we find out when they tell us. That is the whole reason
— not metrics, not engagement, not knowing what anyone did. A crash reporter tells us **that
something failed, on which screen, in which version**, and it is explicitly forbidden from telling us
anything else (§11.4 of the console PRD).

## 1. What you do

### Step 1 — create the account

Go to **https://sentry.io/signup/** and sign up. Use the support address if you have one by then;
otherwise your own is fine and can be changed later.

Choose the **Developer** plan — it is **free**, permanently, and includes 5,000 errors a month. For
two testers that is roughly a hundred times what we will use. **Do not add a payment method.** If it
asks for one, you are on the wrong plan; go back and pick Developer.

### Step 2 — create the organisation

Name it something durable, not a codename: `PushApp` is fine. This becomes part of URLs and is
awkward to change.

### Step 3 — create ONE project

- Platform: **React Native**
- Project name: `pushapp-mobile`
- Alert frequency: the default is fine; we will tune it once there is traffic.

One project, not one per platform. iOS and Android crashes are the same product's crashes, and
splitting them means reading two dashboards to answer one question.

### Step 4 — copy the DSN, and send it to me

After creating the project Sentry shows a **DSN** — a URL shaped like:

```
https://<a long hex string>@o<numbers>.ingest.sentry.io/<numbers>
```

Find it again any time at **Settings → Projects → pushapp-mobile → Client Keys (DSN)**.

**Send me that string.** It is not a secret in the way a password is — a DSN is compiled into every
copy of the app and anyone with the app can read it. It only permits *sending* events, never reading
them. So pasting it here is fine.

### Step 5 — two settings to change before we ship

In **Settings → Projects → pushapp-mobile → Security & Privacy**:

- **Data Scrubber** — on (it is on by default; confirm it).
- **Scrub IP Addresses** — turn **ON**. It is off by default, and our own contract forbids retaining
  IP addresses (§11.4). This is the one setting whose default is wrong for us.

That is everything you do.

---

## 2. What I do after the DSN arrives

1. **Add the SDK** (`@sentry/react-native`) and wire it behind the existing gateway seam, so the app
   still runs with no DSN and every test keeps passing without a vendor.
2. **Apply the contract that is already written and tested**: `core/monitoring/telemetryContract.ts`
   is an allowlist of the 25 fields §11.3 permits, and everything else is dropped before anything
   leaves the device. Its canary tests plant a string for every prohibited category — coach
   transcript, Journey title, reason note, Tool answer, Mirror contribution, message plaintext,
   name, email, birth date, token, clipboard, storage dump — and fail if any survives into the
   serialized payload. **That test is the deliverable; the SDK is the easy part.**
3. **Turn off everything Sentry does by default that our contract forbids**: automatic breadcrumbs
   from taps and console output, session replay, screenshots, view hierarchy, and the `request`
   context that carries full URLs.
4. **Wire source maps into the EAS build and update**, so a stack trace names a function rather than
   a minified letter.
5. **Run the §11.5 canary QA on a real device** — a deliberate handled error and a deliberate fatal
   one, then inspect the actual outbound payload. A release fails if any canary survives.
6. **Add the disclosure** to the privacy policy: operational diagnostics are part of the service and
   cannot be switched off (§11.1), and exactly what they contain.

## 3. What it costs, honestly

**Money: nothing.** The Developer plan is free at our volume and there is no card on file. If we ever
exceeded 5,000 errors a month, Sentry stops accepting events rather than charging — which is the
behaviour we want anyway.

**A build: yes.** `@sentry/react-native` is a native dependency, so adding it moves the runtime
fingerprint and cuts every installed build off from over-the-air updates until a new build is
installed on both phones. That is why it is deliberately last, and why it should ride the same build
as the Hebrew localization waiting in `locales/README.md`.

**A privacy-policy line: yes**, and a store data-safety answer. Both are written as part of step 6.

## 4. What it will NOT do

It is not analytics. It does not tell us who did what, how long anyone stayed, or which feature is
popular — that is Stage 4, it needs its own separate consent, and declining it must never affect
crash monitoring or anything the person can do (§11.2).

It does not record sessions, take screenshots, or capture what anybody typed. Those are Sentry
features and they will be off.

## 5. The state right now

- ✅ `core/monitoring/telemetryContract.ts` — the allowlist, the screen-identifier reduction, stack
  and duration handling. Written and tested.
- ✅ The §11.5 canary suite — 12 tests, every prohibited category planted.
- ⛔ **Waiting on you: the DSN.**
- ⛔ Then: the SDK, the source maps, the on-device canary run, the policy line, the build.
