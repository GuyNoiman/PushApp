# Reply to the coaching partner — terminology alignment and model decisions (v1.1 package)

Status: **Draft for the founder's review and sending.** Prepared 2026-08-13 after the full terminology
audit of `PushApp_Guy_Content_Evaluation_v1.1`. Not yet sent.

Purpose: a single message the partner can work from, so the next version of their content lands aligned
with PushApp's product model instead of needing another editing pass on our side.

> **Note on counts:** the edit counts below are confirmed against the audit. Where a second editing pass
> was still running when this draft was written, the number was marked *(to confirm)*. **All counts are now
> confirmed** against the completed second pass (2026-08-14); no placeholders remain.

---

## 1. First, the part that matters most

The v1.1 package is **philosophically well aligned with PushApp**, and that is the hard part to get right.
Your Meta-Coach spec's Axiom 12 — *fade the coach; the product succeeds when the user needs less coaching,
not more engagement* — and the instruction not to invent a second food-related target just to keep
engagement are direct restatements of our own binding rule: **growth before engagement**. We are not
asking you to change any of that.

Everything below is **vocabulary and object-model alignment**, not a disagreement about coaching.

We also want to name what we did **not** change. Roughly 515 flagged occurrences were reviewed and
deliberately left alone: every use of *plan*, *goal*, *challenge*, *habit*, *program* and *task* that is
ordinary English or established academic usage, including the named frameworks (WOOP's "Plan", GROW's
"Goal → Reality → Options → Will") and every academic citation about intervention research. Rewriting
those would have damaged evidence-grade prose and misrepresented your sources.

---

## 2. Terminology changes we applied to your files

We edited your files directly for terminology only. No coaching content, sequencing, or clinical
judgement was altered.

### 2.1 `Step A–E` → `Stage A–E` (5 occurrences, plus mirrors)
File: `01_Eating_Daily_Consistency_Progression.md`.

**Step** is a protected PushApp object: the smallest unit of progress, the thing a user reports on. Your
headings used "Step A / Step B / …" to mean *stage of a mechanism*, while the same section correctly says
"the recurring **Step** has four content fields". Both senses collided inside one section.

We used **Stage**, deliberately not "Phase" — Phase is our own superseded name for Milestone and would
reintroduce a retired term.

### 2.2 `Arc` → `Milestones` (60 occurrences)
Across the Master Specs, the Journey examples, and the consolidated evaluation.

The numbered list under each `Arc` heading **is** the Milestone sequence, and your package already heads
identical content `## Milestones` elsewhere — so this also removes an internal inconsistency in your own
files. Prose such as "light Milestone arcs" was left alone; there "arc" is descriptive English attached to
the correct noun.

### 2.3 `Meta-Coach` → our coach naming (111 occurrences)
Confirmed 2026-08-14 after the second editing pass: 72 as `Meta-Coach`, plus 39 in your other casings
(`meta-coach`, `Meta-coach`, `META-COACH`, `Meta Coach`), across 27 files.

See §3.1. Filenames were **left unchanged** so the package stays traceable to the version you sent — so
`15_Meta_Coach_Master_Spec.md` and `14_Meta_Coach_Calibration_24_Cases.md` now carry our naming inside
files that keep your names. That mismatch is deliberate.

### 2.4 `intervention` → `comment`, for your reactive sense only (53 occurrences)
Confirmed 2026-08-14. See §3.2. The **45** academic and clinical uses were **not** touched, and four
further occurrences were left alone as genuinely ambiguous rather than guessed at — two in
`14_…_Calibration_24_Cases.md` (cases 11 and 18), one in `01_Eating_Daily_Consistency_Progression.md` §11,
and the `Observation before intervention` heading in the Body Image spec, which we left tied to the
identically-worded principle in your research synthesis.

### 2.5 `Ally` in crisis guidance — 3 occurrences, and this one is a safety point
Files: `On_Call/35_Addiction_On_Call_Coaching.md`, `Research/33_Addiction_Expert_Research_Synthesis.md`,
and the consolidated evaluation.

Your text read "contact Ally/support" and "activating a trusted Ally/support". See §3.3 — this is the
change we would most like you to carry into your own master copies.

---

## 3. Model decisions, and what we need from you

### 3.1 The coach
Your **Meta-Coach** is the same entity we call **the coach** (internally, the **meta-agent**).

There is a fault on our side here worth stating plainly: "meta-agent" was defined only in our decision log
and authoring guide and was **missing from our canonical terminology document**, so the brief you worked
from was not in the place you would look. We have added it. Going forward the canonical names are **"the
coach"** for anything user-facing and **"meta-agent"** for architecture.

**Please use those in the next version.** No other renaming of your architecture is needed — your
**Expert** usage matches ours exactly, including the rule that experts never speak to the user directly.

### 3.2 `intervention` means opposite things in our two vocabularies
- **Ours:** a **proactive** action PushApp initiates — a notification, a reminder, an outreach.
- **Yours:** a **reactive** coaching move made inside a conversation the user started.

Founder decision: **we keep `intervention` for the proactive sense; your reactive coaching move is
renamed `comment`.** Academic uses ("intervention research", "behaviour-change interventions") are
untouched and should stay as they are — those are citations.

### 3.3 An Ally is only someone the user chose to add to a Support Circle
This is the most important item in this message.

In PushApp an **Ally** is specifically a friend the user has added to the **Support Circle** of a
**particular Journey**, through an explicit invitation and consent flow, with a permission model
controlling exactly what that person can see. Nothing else is an Ally.

Your addiction on-call content used "Ally/support" to also mean sponsor, clinician, or family. Those
people are real and they matter, but they are **not modelled in PushApp at all** — there is no place a
user has entered them.

**The risk, stated concretely:** if that text were wired as written, a user in a high-risk moment would be
pointed at an in-app Ally list that may be completely empty, while the person who could actually help them
is not represented anywhere in the product.

So: when your content refers to real-world or professional support, please use **plain language** —
"someone you trust", "your sponsor", "a professional" — and reserve **Ally** strictly for the in-app
Support Circle relationship. Never route a user to the Ally list as if it were crisis support.

Whether real-world supporters should be modelled in the product at all is an open question on our side.
We are deliberately **not** inventing a term for them yet, because naming something is how you accidentally
decide it exists.

### 3.4 Dreams stay user-visible for now
Your Meta-Coach spec says the coach owns the internal representation of Dreams and should not expose the
internal taxonomy. In PushApp today a **Dream** is a first-class, user-visible object with its own screen.

You flagged this tension yourselves and deferred to us, which we appreciated. **Decision: the Dream stays
user-visible for now.** This is explicitly revisitable — we may hide it later — so please do not build
content that depends on the user never seeing their Dreams named.

### 3.5 There is ONE Weekly Review, and it is a shared mechanism
Your eating-consistency content describes a weekly `STABILIZE / ADAPT / PROGRESS` review at the level of a
single Journey. We have already shipped a **Weekly Review** in the product: a week-boundary proposal the
user explicitly approves within a 48-hour window, which never applies silently.

**Decision: there is exactly one Weekly Review.** Yours is not a second object — it **nests inside** ours.

The framing to design against: **the Weekly Review is a shared mechanism available to every domain expert
and every Journey, into which they can contribute information for display.** So a per-Journey adherence
review like yours becomes content presented within the one weekly surface the user already knows, rather
than a parallel ritual with the same name.

Please write future per-Journey review logic as a **contribution into** that surface.

---

## 4. Two mechanisms we already ship that your content does not know about

Your daily check-in model — **Kept it / Partly / Didn't happen** — maps almost exactly onto what we
shipped, so that needs no change. But two of our mechanisms are absent from the package, and if content is
ever wired without them the coach will re-invent them worse:

**Grace Tokens.** Our non-punishing allowance for a missed commitment. This is precisely the mechanic your
own axiom — *a lapse is data, not a reset* — is asking for, and it already exists.

**Step Postponement.** A user can move a Step rather than fail it, with the system adapting around it.

Please account for both in the next version rather than designing new forgiveness mechanics.

---

## 5. What we are asking for

1. Carry the terminology changes in §2 into your master copies, so our two versions do not diverge.
2. Use **the coach** / **meta-agent**, and **comment** for your reactive coaching move.
3. Fix the **Ally** usage in the crisis paths (§3.3) — this is the one we would prioritise.
4. Write per-Journey review logic as a contribution into the single Weekly Review (§3.5).
5. Account for **Grace Tokens** and **Step Postponement** (§4).

## 6. Still open on our side, so please do not design around them yet
- Whether real-world supporters (sponsor, clinician, family) become a modelled concept.
- Whether a Journey with no defined end — your "maintain / ongoing" pattern — is a Journey at all, or
  needs a different object. Our current definition says a Journey is a **finite** transformation with a
  completion. This is a genuine gap in our model, not an error in yours, and we are working on it.
- Whether the Dream screen stays user-visible long term (§3.4).

## 7. Housekeeping
`11_GUY_UPDATE_HE.md` is in Hebrew. Our repository language is English, but we keep partner correspondence
verbatim rather than translating it, and have recorded that as a deliberate exception.

Your package also contains internal duplicates (`10_PushApp_v1.1_COMPLETE_QUALITY_EVALUATION.md` is a
concatenation of the whole set, and several files appear twice in different folders). We handled it, but a
future version with a single source per document would reduce the chance of the copies drifting apart.
