# The Tool Addition Protocol

Status: **Living · established 2026-08-20** by the founder, on adding the first tool (Life Wheel).
Governs everything that lands in the Tools tab.

> **A tool is not added until it has answered every question below.** The influence section is not
> paperwork — it is the half of a tool that the user never sees and that decides whether the app
> feels perceptive or invasive.

---

## 1. The rule the protocol exists to serve

Founder, 2026-08-20:

> Every tool has to give the user value AND help us learn about the user. So besides its own result,
> it has to influence different elements in the app — and for each tool we will have to specify what
> those are.

A tool that only gives a result is a widget. A tool that only collects is a survey. The Tools tab is
neither: it is the one place a person volunteers something true about themselves, in exchange for
something worth having.

---

## 2. What every tool must declare

### 2.1 The tool itself
- **What the person walks away with**, in one sentence they would recognise.
- **How long it takes.** It goes on the card; people decide on it.
- **The category** it belongs to — what it does FOR you, not what it is made of.
- **Whether it is resumable.** Anything over four minutes must be.

### 2.2 What it teaches us — the influence contract
Four questions, and every one needs a written answer:

1. **What does it now know that nothing else in the app knew?** If the answer is "roughly what
   onboarding asks", the tool is collecting, not learning, and the questions need rethinking.
2. **What is the SMALLEST derived summary that carries it?** Not the raw answers. Something PII-free
   and coarse enough that a person reading it aloud would not feel exposed.
3. **Which parts of the app may read it, one by one, with a reason each.** A list. Not "the coach and
   anything relevant" — that is not a list, it is a permission.
4. **When does it go stale?** Everything a tool learns is a snapshot of a season. A finding with no
   expiry becomes a fact about someone forever, which is the opposite of an app about change.

### 2.3 What it may never do
Standing limits, applying to every tool, no exceptions per tool:
- **Never create anything by itself.** Not a Journey, not a Step, not a reminder. It may OFFER, one
  tap, clearly labelled. A tool that quietly adds things to somebody's app is how the partner ended
  up looking at a stranger's Journeys.
- **Never nag.** A low answer is not a permission to bring it up later.
- **Never show a number about a person's life that they did not ask for.**
- **Never send its raw answers anywhere.** On-device only (G1), by default and by design.
- **Never score, grade or compare.** The tool reflects; the person decides.

### 2.4 Copy
- A **name** and **one sentence saying what it does TO you**, in every language we ship. Enforced by
  `app/src/core/tools/__tests__/copy.test.ts` — a tool with no sentence fails CI.
- If it is derived from an existing tool in the world, **the wording and the order are ours.**

### 2.5 Where the code goes
| Piece | Location |
|---|---|
| The catalogue row | `app/src/core/tools/catalog.ts` |
| The pure model + its reading | `app/src/core/tools/<tool>/model.ts` |
| The influence contract, in code | `app/src/core/tools/<tool>/signals.ts` |
| Stored answers + the summary | `app/src/state/<Tool>Store.tsx` |
| The screen | `app/src/app/tools/<tool>.tsx` |
| Copy | `app/src/i18n/resources/{en,he}/tools.json` |

The split is the point: the reading is pure and testable, the influence is a file somebody can open
and audit, and the screen holds no logic at all.

---

## 3. Worked example — the Life Wheel (2026-08-20)

**Gives:** a reading of your own year in eight minutes, in your own numbers. · 8 min · Know yourself ·
resumable.

**Knows what nothing else did:** not which areas someone is *interested* in — onboarding asks that,
and people are generous with it — but which area they are quietly PAYING for. Every area is asked
twice, how it is going and how much it matters, and the finding is the distance between them.

**Smallest summary:** `{ takenAt, pressingArea, pressingGap, strongestArea }`. Four fields, no answers.

**Who may read it:**
| Reader | Why |
|---|---|
| The coach, as opening context | So it understands a goal in the light of what is actually costing the person. **Context, never an agenda** — it does not steer. |
| A later "which area?" question | It can offer the pressing one first instead of a flat list of eight. |
| **The user's Dreams** — founder, 2026-08-20 | A pressing area is offered as a Dream at the end of the reading. **Offered, one tap, never inserted** (§2.3). A Dream is an aspiration, not a plan: adding one schedules nothing. |
| Nobody else | Not Home, not notifications, not the Buddy, not the Circle. |

**Stale after:** 90 days. A gap reported in January that is still being raised in April is a coach
that stopped listening. The record stays; it stops being used.

---

## 4. The queue, and what each still needs

Six tools are named in the tab and not built. None has an influence contract yet, and none should be
built before it has one.

| Tool | The obvious value | The influence question nobody has answered |
|---|---|---|
| Weekly reflection | Ten minutes on what the week was really about | Should it feed the Weekly Review, or compete with it? |
| Breathe | Two minutes out of your own head | Probably influences NOTHING, and that is a legitimate answer worth writing down |
| Strengths map | What you are good at, in your own words | Could it change how the coach argues with you? |
| Focus timer | One stretch of work with nothing else in it | Does a finished session count as a Step? |
| Act of kindness | One small thing for someone else | The only tool that touches the Circle |
| For a hard day | Somewhere to put it down | The most sensitive one. What it learns may be the thing it must learn LEAST from |

---

## 4b. STANDING REMINDER — the influence contracts are owed (founder, 2026-08-20)

**The founder asked to be reminded of this at the end of the tool-building run.** He is adding tools
first and will write every influence contract afterwards, in one pass, once he can see them together.
That is a reasonable order — the contracts are easier to write against a real set than one at a time —
and it means §2.2 is **deferred, not waived**.

**Eight tools in total.** As of 2026-08-20 the built ones are:

| Tool | Influence contract |
|---|---|
| My questionnaire | Pre-dates the protocol; feeds the coach's onboarding profile |
| How to talk to me | Pre-dates the protocol; sets the coach's voice (D40) |
| Life Wheel | **Written.** A pressing area is OFFERED as a Dream (§3) |
| Values clarification | **Owed** |
| My Best Possible Year | **Answered by D66** — a reflection is for the user and teaches us nothing. The only thing it hands over is the sentence a person deliberately types into the Dream box, which is not the letter being read |
| The rest of the reflection family (daily · week start · birthdays · moments) | **Answered by D66**, in advance |
| The remaining three | Owed, along with the tools |

**Nothing ships to a real user with an unwritten contract.** A tool can be built and tested without
one; it should not reach somebody's phone without one, because the contract is the part that decides
whether the app feels perceptive or invasive.

## 5. Notes

- **"It influences nothing" is a valid contract** — written down, with the reason. What is not valid
  is leaving it unanswered.
- **The list of readers only grows by decision.** Adding one is an edit to this document and to the
  tool's `signals.ts`, not a convenient import somewhere.
- Related: `06_Decisions/Decision_Log.md` (D64, D65), `04_Product/Design_System.md` §0.
