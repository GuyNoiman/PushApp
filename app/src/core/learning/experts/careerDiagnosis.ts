/**
 * careerDiagnosis — the missing rung between what a person SAYS and the Journey they get.
 *
 * WHY IT EXISTS. Somebody says "I apply and nobody answers". Until now the Career expert asked four
 * fixed questions and returned one hardcoded arc for everybody, so eighteen authored Career Journeys
 * sat in the library validated, translated and unreachable. But "nobody answers" is a symptom with
 * at least three different causes, and each one is a different FAMILY of Journeys:
 *
 *   the TARGET is too broad          → LAND_ROLE / DIRECTION_GAP          (career.jobTarget)
 *   the PROOF is missing             → LAND_ROLE / PROOF_GAP              (career.proof)
 *   there is no ACCESS               → LAND_ROLE / OPPORTUNITY_ACCESS_GAP (career.access)
 *   the SEARCH keeps collapsing      → LAND_ROLE / SEARCH_PROCESS_GAP     (career.searchProcess)
 *   the INTERVIEW room is where it stops → LAND_ROLE / INTERVIEW_STAGE_GAP (career.interviewStage)
 *
 * Treating the wrong one is exactly how a job search stays busy and stays stuck. The order below is
 * not arbitrary and is not ours: it is the partner's, from
 * `07_Assets/Partner_Packages/Career_v1.1_2026-08-20/09_…Diagnosis_and_Selection_Guide_v1.1.md`,
 * and it runs target → capability-vs-proof → access → process. Target first because a broad target
 * makes every later reading meaningless; capability before proof because "I cannot do it yet" and
 * "I can do it but cannot show it" look identical from the outside and lead to opposite plans.
 *
 * ── THE SHAPE, AND WHY IT IS THIS SHAPE ─────────────────────────────────────────────────────────
 *
 * **A question maps an ANSWER VALUE to an outcome. It does not know how the answer was captured.**
 * That is the whole design. A value can arrive from a tapped option card (free, deterministic) or
 * from a model reading what the person wrote in their own words (a call, and a conversation). The
 * founder wants the second — "less of a form, more of a conversation" — and the tree must not have
 * to change when we move between them, or the diagnosis becomes a property of the input widget.
 *
 * **Stopping is a first-class answer.** Three of the outcomes below name no family at all: a
 * capability gap (a different section of the library entirely), too little search history to read,
 * and a search where target, proof and access are all credible and the pattern is still unclear. The
 * partner's own rule is that the coach must not motivate past an unresolved diagnosis, so an
 * unresolved diagnosis has to be something this module can RETURN — not something it papers over by
 * picking the closest family.
 *
 * SECURITY-PRIVACY G1: authored content and closed enum values only. The person's own words never
 * enter this module.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads, no vendor imports.
 */

/**
 * The signals a Career diagnosis can establish — the partner's own names, from
 * `07_Assets/Partner_Packages/Career_v1.2_2026-08-23/02_Career_Interview_Diagnosis_Mapping_v1.2.json`.
 *
 * WHY HIS NAMES AND NOT OURS. Until 2026-08-23 this file had four signals of its own invention
 * (`target`, `proof`, `access`, `searchProcess`) which happened to line up with four of his. Keeping
 * two vocabularies for one thing is how a mapping quietly drifts: he authors the questions and the
 * meaning of each answer, and if his `visibleProofMissing` and our `proof` diverge by one case,
 * nobody notices until somebody is routed to the wrong Journey. There is now one vocabulary and it
 * is his.
 *
 * The eleven core signals plus the conditional ones for transitions and growth. Not every signal has
 * a question in every tree — a tree asks what it needs.
 */
export const CAREER_SIGNALS = [
  // Core (C1–C11).
  'careerDirectionClarity',
  'activeJobSearch',
  'targetClarity',
  'existingRelevantExperience',
  'visibleProofMissing',
  'peopleAccess',
  'recentInterviewEvidence',
  'searchHistorySufficient',
  'targetStillMeaningful',
  'realisticCapacity',
  'socialSupportFit',
  // Conditional — transition (T1–T2) and growth / current role (G1–G3).
  'transitionType',
  'transitionPrimaryGap',
  'concretePromotionTarget',
  'growthSubBottleneck',
  'currentRoleFitLever',
] as const;
export type CareerDiagnosisSignal = (typeof CAREER_SIGNALS)[number];

/**
 * What is already known about a person, by signal.
 *
 * THIS IS THE "LISTEN FIRST" HALF, and it is the partner's first principle: *do not ask a question
 * when the opening message already supports a signal value*. Values arrive from a model classifying
 * what somebody wrote in their own words — his `means` field is the contract for that classification
 * — or from an earlier answer. Either way they land here as closed values, and a question whose
 * signal is already known is not asked.
 */
export type CareerKnownSignals = Readonly<Partial<Record<CareerDiagnosisSignal, string>>>;

/**
 * Where a diagnosis lands. Either it names the family to route to — a `subtype` + `bottleneck` pair
 * that matches exactly one {@link ../library/goalFamily.GoalFamily} — or it says, honestly, that the
 * diagnosis is not finished and why.
 */
export type CareerDiagnosisOutcome =
  | { kind: 'family'; subtype: string; bottleneck: string }
  | { kind: 'unresolved'; reason: UnresolvedReason };

/**
 * Why a diagnosis stopped without a family. Each of these is a real, different next move, which is
 * why they are not one "unknown". The list SHRANK on 2026-08-20 when CAR_G11 and CAR_G12 were
 * ingested: "the search keeps collapsing" and "I stall at the interview" now have Journeys to route
 * to and are no longer unresolved.
 */
export type UnresolvedReason =
  /** They cannot do the target work yet. That is a skill-building goal, not a job-search one. */
  | 'capabilityGap'
  /** Too little search behind them to read a pattern from. Diagnosing now would be inventing. */
  | 'notEnoughEvidence'
  /** Target, proof and access all credible and still no pattern. Keep looking; force nothing. */
  | 'noClearPattern';

/** One answer a person can give, and where it lands them. */
export interface CareerDiagnosisOption {
  /** The closed value this answer records. Stable; safe to persist and to classify text into. */
  value: string;
  /**
   * The value this answer implies for the question's SIGNAL, in the partner's vocabulary — so an
   * answer heard in conversation ("I'm applying for three different kinds of role") can be matched
   * to the option it corresponds to without the person being asked again. Absent ⇒ this option
   * cannot be inferred from a signal and only counts when it is actually chosen.
   */
  signalValue?: string;
  /** Authored English, and its key in the `library` translation cache. */
  label: string;
  labelKey: string;
  /**
   * Where this answer ends the diagnosis. ABSENT ⇒ it settles nothing on its own and the next
   * question is asked, which is how "the target is clear" moves on to the proof check.
   */
  outcome?: CareerDiagnosisOutcome;
}

/** One question in the tree. */
export interface CareerDiagnosisQuestion {
  id: string;
  signal: CareerDiagnosisSignal;
  /** Authored English, and its key in the `library` translation cache. */
  prompt: string;
  promptKey: string;
  options: readonly CareerDiagnosisOption[];
}

/** An ordered diagnosis, run top to bottom until an answer carries an outcome. */
export interface CareerDiagnosisTree {
  id: string;
  questions: readonly CareerDiagnosisQuestion[];
}

const K = 'career.diagnosis.applyNoResponse';

/**
 * "I apply and nobody answers" — the one diagnosis the partner specified end to end.
 *
 * The labels are OURS, and that is worth stating plainly: he wrote the questions as a coach would
 * say them out loud, with the answers described as categories rather than as words a person picks.
 * Turning a category into something a person can say is a translation, not a redesign, but it means
 * the wording below has not been through him. It goes back to him for correction.
 */
export const APPLY_NO_RESPONSE: CareerDiagnosisTree = {
  id: 'career.applyNoResponse',
  questions: [
    {
      id: `${K}.target`,
      signal: 'targetClarity',
      prompt: 'What kinds of roles are you applying for at the moment?',
      promptKey: `${K}.target.prompt`,
      options: [
        {
          value: 'broad',
          signalValue: 'broad',
          label: 'Several different kinds of role',
          labelKey: `${K}.target.broad`,
          // A broad target makes every later reading meaningless, so this ends the diagnosis here.
          outcome: { kind: 'family', subtype: 'LAND_ROLE', bottleneck: 'DIRECTION_GAP' },
        },
        {
          value: 'clear',
          signalValue: 'clear',
          label: 'One fairly clear kind of role',
          labelKey: `${K}.target.clear`,
        },
      ],
    },
    {
      id: `${K}.proof`,
      /**
       * His `visibleProofMissing` (C5). This ONE question also carries `existingRelevantExperience`
       * (C4): its first answer is "I cannot do the work yet", which is C4 = no and is the reason the
       * diagnosis stops rather than routing to a proof Journey. Asking them separately would make a
       * person say the same thing twice, so the tree asks once and the mapping is recorded here.
       */
      signal: 'visibleProofMissing',
      prompt:
        'Think of two or three central requirements of that role. Do you have real examples showing you have already done something like them?',
      promptKey: `${K}.proof.prompt`,
      options: [
        {
          value: 'cannotYet',
          label: 'Honestly, I cannot do that work yet',
          labelKey: `${K}.proof.cannotYet`,
          // NOT a proof gap. Sending someone who cannot yet do the work to "make your experience
          // visible" asks them to evidence something that is not there.
          outcome: { kind: 'unresolved', reason: 'capabilityGap' },
        },
        {
          value: 'cannotShow',
          signalValue: 'missing',
          label: 'I can do it, but it is hard to show',
          labelKey: `${K}.proof.cannotShow`,
          outcome: { kind: 'family', subtype: 'LAND_ROLE', bottleneck: 'PROOF_GAP' },
        },
        {
          value: 'haveExamples',
          signalValue: 'available',
          label: 'Yes, I have clear relevant examples',
          labelKey: `${K}.proof.haveExamples`,
        },
      ],
    },
    {
      id: `${K}.access`,
      signal: 'peopleAccess',
      prompt: 'How do most of your opportunities reach you?',
      promptKey: `${K}.access.prompt`,
      options: [
        {
          value: 'applicationsOnly',
          signalValue: 'no',
          label: 'Almost entirely through open applications',
          labelKey: `${K}.access.applicationsOnly`,
          outcome: {
            kind: 'family',
            subtype: 'LAND_ROLE',
            bottleneck: 'OPPORTUNITY_ACCESS_GAP',
          },
        },
        {
          value: 'peopleToo',
          signalValue: 'yes',
          label: 'Through conversations and people who know me, too',
          labelKey: `${K}.access.peopleToo`,
        },
      ],
    },
    {
      id: `${K}.searchProcess`,
      /**
       * His `searchHistorySufficient` (C8). The "I reach interviews and it stops there" answer is
       * also `recentInterviewEvidence` = yes (C7); see that option.
       */
      signal: 'searchHistorySufficient',
      prompt:
        'With a clear target, relevant proof and reasonable access, how much focused searching have you actually done, and where does it break?',
      promptKey: `${K}.searchProcess.prompt`,
      options: [
        {
          value: 'barelyStarted',
          signalValue: 'no',
          label: 'I have barely started',
          labelKey: `${K}.searchProcess.barelyStarted`,
          outcome: { kind: 'unresolved', reason: 'notEnoughEvidence' },
        },
        {
          value: 'collapses',
          label: 'I start, and then the search falls apart',
          labelKey: `${K}.searchProcess.collapses`,
          outcome: { kind: 'family', subtype: 'LAND_ROLE', bottleneck: 'SEARCH_PROCESS_GAP' },
        },
        {
          value: 'interviewsNoOffer',
          label: 'I reach interviews and it stops there',
          labelKey: `${K}.searchProcess.interviewsNoOffer`,
          // NOT the partner's own bottleneck string. He gives this and the previous answer the same
          // `SEARCH_PROCESS_GAP`, but a family is identified here by the (subtype, bottleneck) pair,
          // and two families sharing a pair would route to whichever was declared first. See
          // `../library/career/interviewStage`'s header — raised with him.
          outcome: { kind: 'family', subtype: 'LAND_ROLE', bottleneck: 'INTERVIEW_STAGE_GAP' },
        },
        {
          value: 'noPattern',
          label: 'I have searched properly and I see no pattern',
          labelKey: `${K}.searchProcess.noPattern`,
          outcome: { kind: 'unresolved', reason: 'noClearPattern' },
        },
      ],
    },
  ],
};

/**
 * How many questions this tree still needs, given what is known. Used by a caller that wants to say
 * "two more short questions" rather than opening an interview of unknown length.
 */
export function remainingQuestionCount(
  tree: CareerDiagnosisTree,
  answers: CareerDiagnosisAnswers,
  known: CareerKnownSignals = {},
): number {
  const merged = applyKnownSignals(tree, answers, known);
  let count = 0;
  for (const question of tree.questions) {
    const answer = merged[question.id];
    if (answer === undefined) {
      count += 1;
      continue;
    }
    if (optionFor(question, answer)?.outcome) break;
  }
  return count;
}

/** Answers gathered so far, keyed by question id. Values are the closed option `value` strings. */
export type CareerDiagnosisAnswers = Readonly<Record<string, string>>;

/** Find the option a recorded value refers to. `undefined` for a value this question never offered. */
export function optionFor(
  question: CareerDiagnosisQuestion,
  value: string,
): CareerDiagnosisOption | undefined {
  return question.options.find((option) => option.value === value);
}

/**
 * Fold what is ALREADY KNOWN into the answers, so a question whose signal the person has effectively
 * answered in conversation is never put to them again.
 *
 * This is the partner's first principle made mechanical (`…Mapping_v1.2.json`, `principles[0]`):
 * *do not ask a question when the opening message already supports a signal value*. A known signal
 * is matched to the option that declares it (`signalValue`); a value no option declares — including
 * his explicit `unknown` — is ignored, because "we could not tell" is not an answer and must leave
 * the question askable.
 *
 * An answer the person actually gave always wins over an inferred one. A classifier reading free
 * text is a guess with a confidence; a tapped option is not.
 */
export function applyKnownSignals(
  tree: CareerDiagnosisTree,
  answers: CareerDiagnosisAnswers,
  known: CareerKnownSignals = {},
): CareerDiagnosisAnswers {
  const merged: Record<string, string> = { ...answers };
  for (const question of tree.questions) {
    if (merged[question.id] !== undefined) continue;
    const value = known[question.signal];
    if (value === undefined) continue;
    const option = question.options.find((o) => o.signalValue === value);
    if (option) merged[question.id] = option.value;
  }
  return merged;
}

/**
 * The next question to ask, or `null` when there is nothing left to ask.
 *
 * THE STOP RULE, which is the partner's and is the reason this is not just "walk the list": as soon
 * as one answer settles the diagnosis, every remaining question is a question whose answer cannot
 * change what we choose — and asking it is exactly the form-filling the coach is meant not to be.
 *
 * With `known`, the rule gets its other half: a question whose signal is already supported is
 * treated as answered and skipped. Between the two, the coach asks only what is both unknown AND
 * still able to change the routing.
 */
export function nextQuestion(
  tree: CareerDiagnosisTree,
  answers: CareerDiagnosisAnswers,
  known: CareerKnownSignals = {},
): CareerDiagnosisQuestion | null {
  const merged = applyKnownSignals(tree, answers, known);
  for (const question of tree.questions) {
    const answer = merged[question.id];
    if (answer === undefined) return question;
    // An answer we do not recognise settles nothing; ask the next question rather than trusting it.
    if (optionFor(question, answer)?.outcome) return null;
  }
  return null;
}

/**
 * What the answers so far amount to. `null` while the diagnosis is still open — which is different
 * from `unresolved`, and the difference matters: `null` means "ask the next question", `unresolved`
 * means "we asked everything and the honest answer is that this is not a job-search bottleneck".
 */
export function outcomeOf(
  tree: CareerDiagnosisTree,
  answers: CareerDiagnosisAnswers,
  known: CareerKnownSignals = {},
): CareerDiagnosisOutcome | null {
  const merged = applyKnownSignals(tree, answers, known);
  for (const question of tree.questions) {
    const answer = merged[question.id];
    if (answer === undefined) return null;
    const outcome = optionFor(question, answer)?.outcome;
    if (outcome) return outcome;
  }
  // Every question answered and none of them settled it. That cannot happen with the tree above —
  // its last question settles on every option — but a tree is content, and content changes.
  return null;
}

/** True when the outcome names a family we can route to. A narrow helper, used by callers as a gate. */
export function routesToFamily(
  outcome: CareerDiagnosisOutcome | null,
): outcome is { kind: 'family'; subtype: string; bottleneck: string } {
  return outcome?.kind === 'family';
}
