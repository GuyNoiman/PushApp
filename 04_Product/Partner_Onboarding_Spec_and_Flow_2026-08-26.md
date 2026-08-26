# PushApp Onboarding — Current Specification, Data Contract, and Downstream Flow

Status: **Partner handoff — current implemented behavior, with historical rationale and known gaps**

As of: **2026-08-26**

## 1. What is authoritative

This handoff reconciles the implemented application with the immutable original PRD. It is the safest single document to read first.

- The original approved six-question specification remains preserved at `04_Product/PRD/Done/Onboarding_Questionnaire_PRD.md` and must not be edited.
- The implemented question set is now **version 2 with nine questions**. Questions 7–9 were added on 2026-08-18 with Decision D62 because those answers can change which version of a Journey is selected.
- The original PRD says onboarding opens the first Coach conversation. The current application instead completes onboarding and opens **Home**; the user opens the Coach from there.
- The original PRD includes profile photo in Personal Information. The current Personal Information page shows name, username, birth date, country, form of address, language, Active Hours, and week-start day. Photo remains an Own Profile field but is not currently shown in this page.

These are deliberate current-state notes, not silent rewrites of the completed PRD.

## 2. Product intent

Onboarding gives the application a small, non-diagnostic starting profile without turning first use into a long assessment. It should help the Coach ask fewer redundant questions and help Journey selection choose a better starting version while preserving uncertainty.

It does **not**:

- assign a personality or “growth style”;
- diagnose the person;
- create a Dream or Journey automatically;
- replace domain diagnosis;
- assume a skipped answer;
- turn free text into a marketing or analytics profile.

## 3. Current first-run flow

```text
First-run gate
  → Choose language
  → Review Personal Information
  → Nine-question introduction
      ├─ Start → Q1 … Q9
      └─ Maybe later → mark all nine skipped
  → Completion
      ├─ Continue
      └─ Optional: choose Communication Style, then return
  → Coach-memory consent
      ├─ Yes, remember
      └─ Not now
  → Notification permission pre-prompt
      ├─ Turn on reminders → request OS permission
      └─ Not now
  → Mark onboarding complete
  → Home
  → User opens Coach when ready
```

### Flow rules

- Language is mandatory and controls all following copy, direction, and Coach language.
- Every questionnaire question is individually skippable.
- `Maybe later` on the introduction skips all nine questions without pressure.
- Progress and answers are saved after every page; an interrupted flow resumes at the last page.
- Back allows correction without deleting later answers.
- Communication Style is optional and remains independently available in Settings.
- Coach-memory consent is optional. Declining does not reduce ordinary product access.
- Notification permission is optional. Declining or OS denial never blocks completion.
- Onboarding is considered complete only after the final permission pre-prompt resolves.

## 4. Personal Information

The current page displays or links to these account/profile preferences:

| Field | Source/default | Storage/use |
|---|---|---|
| Display name | Sign-in provider where trustworthy; editable fallback | Private Own Profile; public display uses its separately governed social projection |
| Username | Existing social handle or generated fallback | Account/social identity; unique handling belongs to the profile/social system |
| Full birth date | Provider/user; optional | Private profile field |
| Country | Device region default; editable | Private profile; localization defaults such as week start |
| Form of address | User choice | Localized and gender-aware wording |
| App language | Device language preselection, confirmed by user | UI, RTL/LTR, and Coach language |
| Active Hours | Existing scheduling default; editable | Outer boundary for optional communication |
| Week-start day | Country default; editable | Weekly boundaries and review |

Email remains authentication/account data rather than an editable public profile field. Precise location is not requested to determine country.

## 5. Current nine questions

All option identifiers below are stable stored values. User-facing labels are localized independently in English and Hebrew.

### Q1 — Desired areas

**Where would you most like to see change?** Select up to two.

| Stored id | User-facing answer |
|---|---|
| `health` | Health, fitness, and energy |
| `calm` | Calm and mental well-being |
| `work` | Work, career, or studies |
| `money` | Money and financial life |
| `relationships` | Relationships, partnership, and family |
| `habits` | Habits, time, and daily routine |
| `learning` | Learning, creativity, or a hobby |
| `other` | Something else; optional free text |

### Q2 — Desired outcome

**If one thing improved in your life, what would you want to look different?**

Optional free text. The user may choose that it is not clear yet.

### Q3 — Current starting point

**Where do things stand today?** Select one.

| Stored id | User-facing answer |
|---|---|
| `takingAction` | I am already taking action and want to progress better |
| `notStarted` | I know what I want, but I have not started yet |
| `noHowToBegin` | I have a direction, but I do not know how to begin |
| `tooManyDirections` | I have several directions and do not know which to choose |
| `triedInconsistent` | I tried before, but struggled to stay consistent |
| `noneFits` | None of these fits me; optional free text |

### Q4 — Preferred help

**What kind of help could suit you?** Select up to two.

| Stored id | User-facing answer |
|---|---|
| `clearPlan` | A clear plan I know how to follow |
| `smallSteps` | Small Steps that are easy to begin |
| `flexibility` | Flexibility when life changes |
| `seeProgress` | A clear view of my progress |
| `remindersEncouragement` | Reminders and encouragement at the right time |
| `supportClose` | Support from someone close to me |
| `dontKnow` | I do not know yet |
| `other` | Something else; optional free text |

This is a preference hypothesis, not a permanent setting or promise.

### Q5 — Likely friction

**What usually makes it harder for you to progress?** Select up to two.

| Stored id | User-facing answer |
|---|---|
| `lifeBusy` | Life gets busy and other things take priority |
| `excitementFades` | The initial excitement fades |
| `noClearPlan` | I do not have a clear enough plan |
| `tooMuchAtOnce` | I try to change too much at once |
| `hardToSeeProgress` | It is hard to feel or see progress |
| `hardToRestart` | After a miss, it is hard to get back on track |
| `lackSupport` | I lack support from other people |
| `dontKnow` | I do not know yet |
| `other` | Something else; optional free text |

This is a tentative hypothesis, never a diagnosis or trait.

### Q6 — Realistic capacity

**How much room do you realistically have for this right now?** Select one.

| Stored id | User-facing answer |
|---|---|
| `fewMinutes` | A few minutes on most days |
| `shortFewTimes` | A short amount of time a few times a week |
| `halfHour` | About half an hour on most days |
| `moreWhenNeeded` | I can invest more when needed |
| `changesWeekly` | It changes a lot from week to week |
| `dontKnow` | I do not know yet |

Optional free text records constraints the Coach should consider, such as work, family, study, health, or a changing schedule. Skipping the capacity choice does not delete a constraint the user already typed.

### Q7 — Starting mode

**When you start something new, what do you need first?** Select one.

| Stored id | User-facing answer |
|---|---|
| `clarityFirst` | To see the whole picture clearly before I begin |
| `actionFirst` | To start with something small, and get clear as I go |
| `dependsGoal` | It depends what it is |
| `dontKnow` | I am not sure |

### Q8 — Structure preference

**How much structure actually helps you?** Select one.

| Stored id | User-facing answer |
|---|---|
| `detailedStructure` | A detailed plan; I want to know what to do and when |
| `lightStructure` | A light frame; direction with room to decide as I go |
| `firmThenLoose` | Firm at the start, looser once it becomes routine |
| `dontKnow` | I am not sure |

### Q9 — Desired challenge now

**How much of a challenge do you want right now?** Select one.

| Stored id | User-facing answer |
|---|---|
| `gentleNow` | Something gentle; this is not the season to push |
| `meaningfulPush` | A real push, but one I can keep up |
| `hardPush` | As demanding as I can take |
| `dontKnow` | I am not sure |

This describes the current season, not a permanent trait.

## 6. Stored answer contract

The questionnaire stores this on-device answer envelope inside the encrypted application state:

```ts
interface OnboardingAnswers {
  version: number; // current: 2
  selections: Partial<Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9', string[]>>;
  freeText: Partial<Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6', string>>;
  skipped: Array<'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9'>;
}
```

Additional first-run state includes:

- the current `onboardingStep` for resume;
- `onboardingCompletedAt` for the first-run gate;
- language and profile preferences in their authoritative stores;
- Coach-memory consent state;
- notification permission/pre-prompt outcome.

Free text is retained verbatim on device, trimmed only when read into a derived summary. It is excluded from social data and analytics. Account export/deletion and the encrypted-state rules apply.

## 7. Derived Coach summary

The application derives, rather than separately hand-editing, this named summary:

```ts
interface CoachOnboardingSummary {
  version: number;
  areas: string[];
  areasOther?: string;
  outcome?: string;
  startingPoint?: string;
  startingPointOther?: string;
  help: string[];
  helpOther?: string;
  friction: string[];
  frictionOther?: string;
  capacity?: string;
  capacityConstraints?: string;
  startingMode?: string;
  structure?: string;
  challenge?: string;
  skipped: Array<'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9'>;
}
```

Changing an answer rebuilds the summary. Missing fields mean skipped or unknown, not a negative answer.

## 8. How onboarding currently feeds downstream systems

### 8.1 Coach

The Coach screen receives the derived onboarding summary when a conversation begins. The approved product intention is to use it for a grounded hypothesis and avoid repeating known information.

**Current implementation boundary:** the live Coach presently reads the structured profile for Journey-variant questions and selection. It does not yet use the complete summary to rewrite the opening greeting or automatically turn Q1/Q2 into the user's active goal. The user still tells the Coach what they want in the opening conversation.

### 8.2 Goal understanding and focus

The user's opening Coach message is read once to extract one or more goals with domain, process type, title, and any supported closed diagnosis signals.

- Several goals: the Coach reflects them back and asks which one to build first; the rest are preserved as deferred goals.
- One goal: continue directly.
- No usable goal: ask a fallback process-type question rather than fabricate an interpretation.

Onboarding Q1–Q3 provide stored context but do not currently bypass this conversational goal-understanding step.

### 8.3 Domain diagnosis

Onboarding is not the diagnosis.

Today the implemented diagnosis tree is the partner-authored Career route for an active job search where applications receive no response. It runs after goal understanding and before ordinary expert questions because it selects a Journey family rather than merely shaping a plan.

Diagnosis behavior:

1. The opening message may establish closed signals. A question whose signal is already known is skipped.
2. A tapped answer card records a deterministic closed value without a model call.
3. A free-text answer is read once for every supported signal; unsupported text causes the question to remain unresolved rather than guessed.
4. The tree stops as soon as an answer determines an outcome.
5. A successful outcome records `subtype + bottleneck` and maps to one Career Journey family.
6. An unresolved outcome is preserved as one of `capabilityGap`, `notEnoughEvidence`, or `noClearPattern`; the system does not force the nearest Journey.

The current Career sequence is conceptually target → capability versus proof → access → search/interview process. Other domains do not yet have equivalent authored diagnosis trees.

### 8.4 Journey family and Journey selection

- For the implemented Career diagnostic route, `subtype + bottleneck` selects the matching authored Goal Family and its Journey definition.
- For recurring goals, the generic recurring Journey can select a variant using onboarding profile signals.
- For process goals with an authored Career match, the selected Journey's authored Milestones and Steps build the plan.
- Where no authored library match exists, the domain expert or general planner remains the fallback.

### 8.5 Journey variant selection

Onboarding signals are ordered as evidence, not combined into a personality score:

1. Q5 friction selections — strongest because they describe experienced failure.
2. Q4 preferred-help selections.
3. Q7 starting mode.
4. Q8 structure preference.
5. Q9 desired challenge.

A Journey declares which signals distinguish its own variants. There is no global fixed taxonomy saying every Journey must vary on the same axis.

Selection precedence is:

1. answers given to this specific Journey's own question;
2. relevant coarse onboarding signals;
3. observed variant outcomes/ratings as a weak tie-break once enough evidence exists;
4. the Journey's declared default when nothing is known.

If onboarding already answers a Journey's declared variant question, the Coach does not ask it again.

Free-text onboarding answers are deliberately excluded from the variant selector. A selected variant may eventually be synchronized or measured; no outward selection should encode the user's private wording.

### 8.6 Capacity and scheduling

Q6 and its optional constraint text are stored in the Coach summary and are intended to inform realistic scheduling.

**Current implementation gap:** the present Journey interview still asks its own horizon and scheduling questions; Q6 is not yet applied automatically as a scheduling constraint. This should be treated as a known integration gap, not as a claim that the data already changes every plan.

## 9. Data-use matrix

| Onboarding data | Coach context | Diagnosis | Journey family | Journey variant | Scheduling today |
|---|---:|---:|---:|---:|---:|
| Q1 areas | Available in summary | No direct use | No direct use | No | No |
| Q2 desired outcome | Available in summary | No direct use | No direct use | No | No |
| Q3 starting point | Available in summary | No direct use | No direct use | No | No |
| Q4 help ids | Available in summary | No | No | Yes, when declared by Journey | No |
| Q5 friction ids | Available in summary | No | No | Yes, highest profile priority | No |
| Q6 capacity/constraints | Available in summary | No | No | No | Stored but not yet automatically applied |
| Q7 starting mode | Available in summary | No | No | Yes, when declared by Journey | Indirectly through selected variant |
| Q8 structure | Available in summary | No | No | Yes, when declared by Journey | Indirectly through selected variant |
| Q9 challenge | Available in summary | No | No | Yes, when declared by Journey | Indirectly through selected variant |
| Free text | Minimal Coach summary only | Not consumed by Career tree from onboarding | No | Explicitly prohibited | No automatic use |
| Coach opening message | Conversation input | May establish known signals | Determines domain/goal route | Can answer Journey-specific questions | Feeds the interview |
| Diagnosis answers | Conversation/plan state | Primary input | Yes | Selects within authored content where applicable | Not a cadence choice |

## 10. Why the flow is designed this way

The main reasons preserved across the original PRD, research, and D62 are:

- **Short first use:** the original six questions targeted approximately two minutes; the current nine target approximately three minutes.
- **Optionality:** every question is skippable because a forced answer is worse than an explicit unknown.
- **No personality result:** the earlier market-research form used six “Personal Growth Styles” as a recruitment/marketing result. The product intentionally does not assign those types.
- **Closed answers plus free text:** stable ids can shape plans predictably; free text lets people answer honestly without making every path generative.
- **Ask only what can change the plan:** Q7–Q9 were added only because changing those answers can select a materially different Journey variant.
- **Friction outranks preference:** what has actually broken progress is stronger evidence than what a person believes might help.
- **Journey-owned variant axes:** different Journeys may differ on certainty, structure, urgency, friction, or another authored dimension. The onboarding profile supplies an open bag of signals rather than imposing one taxonomy.
- **Diagnosis listens first:** the Coach does not repeat a question whose answer was already established by the person's message.
- **Unresolved is legitimate:** insufficient evidence or a capability gap is preserved rather than converted into an arbitrary Journey.
- **Privacy by minimization:** coarse ids may shape selection; private wording does not travel into library ranking or social systems.
- **Value before optional permissions:** Coach memory and notifications are contextual, non-blocking asks at the end.

## 11. Historical and rationale documents

Read in this order:

1. `04_Product/PRD/Done/Onboarding_Questionnaire_PRD.md` — original founder-approved six-question flow, copy, privacy, and rationale.
2. `06_Decisions/Decision_Log.md` §D62 — why Journeys own their variant axes and why Q7–Q9 were added.
3. `04_Product/PRD/Plan_Library_and_Learning_PRD.md` §§6.5–7.5 — selection precedence, profile signals, variants, and privacy boundaries.
4. `05_Research/Signup_and_First_Run_Competitive_Research.md` — competitor research and why PushApp favors a short, account-based, Coach-led first run.
5. `04_Product/PRD/Personal_Growth_Style_Assessment_Form.md` — the older ten-question market-research form and six marketing profiles; reference only, not product onboarding.
6. `04_Product/Partner_Brief_2026-08-20_Diagnosis_Questions.md` — why authored answer labels and signal mappings are needed.
7. `04_Product/Partner_Letter_2026-08-24_Diagnosis_Wired.md` — how the partner's mapping became the live Career diagnosis and Journey route.
8. `04_Product/Partner_Brief_2026-08-20_Diagnosis_Questions.md` and the current Career package under `07_Assets/Partner_Packages/` — source material for diagnosis semantics and card wording.

## 12. Implementation references

- `app/src/core/onboarding/model.ts` — stored and derived types.
- `app/src/core/onboarding/questions.ts` — version 2 question structure and stable ids.
- `app/src/core/onboarding/answers.ts` — skip, selection, free-text, and Coach-summary derivation.
- `app/src/i18n/resources/en/onboarding.json` — current English user-facing copy.
- `app/src/i18n/resources/he/onboarding.json` — current Hebrew user-facing copy.
- `app/src/app/onboarding.tsx` — implemented flow and branching.
- `app/src/core/learning/library/matchApproach.ts` — onboarding profile signal ordering.
- `app/src/core/coach/CoachOrchestrator.ts` — goal understanding, focus, diagnosis, expert interview, and variant-question skipping.
- `app/src/core/learning/experts/careerDiagnosis.ts` — current Career diagnosis contract.
- `app/src/core/coach/goalSpecToJourney.ts` — final Journey construction from the selected definition/variant.

## 13. Known follow-ups

These are integration gaps, not open questions about the nine-question copy:

1. Update or create a continuation to the immutable onboarding PRD so the formal documentation reflects version 2, the Home landing, Coach-memory consent, and current permission flow.
2. Decide whether Q1–Q3 should shape the first Coach response more visibly while still requiring the user to state the active goal.
3. Wire Q6 capacity into scheduling constraints or explicitly keep the Journey-specific scheduling interview authoritative.
4. Expand authored diagnosis trees beyond the one current Career route before claiming diagnosis-wide coverage.
5. Keep the partner-authored answer-card wording and signal/value parity tests synchronized with each Career package revision.
