/**
 * THE SECOND CONVERSATION CONTINUES FROM THE PORTRAIT (Stage 1 of
 * `04_Product/Planning_From_Portrait_Plan_2026-09-16.md`).
 *
 * Somebody who has just told the coach who they are should not be asked it again. These tests hold
 * the promises that make that true without making anything else worse:
 *
 *   1. THE OPENING REMEMBERS. A stated want is quoted back; an inferred one is remembered in the
 *      coach's own voice and never quoted as if said; a thin Portrait opens exactly as today.
 *   2. COVERED QUESTIONS ARE NEVER ASKED, and that holds offline, because coverage is a table and not
 *      a model call. Time, horizon, scheduling and staging are ALWAYS asked.
 *   3. WHAT THEY SAY NOW WINS. A covered question is still offered to the reader, and the Portrait's
 *      baseline is only a default for an answer this conversation left empty.
 *   4. A DIFFERENT GOAL IS A DIFFERENT CONVERSATION. A career Portrait with a fitness reply gets
 *      today's fitness path, with no Portrait facts in any request after the goal is read. The
 *      sensitive-domain stop still fires.
 *   5. THE INTRODUCTION IGNORES IT. It is the conversation that builds the Portrait.
 *
 * The no-Portrait path is locked separately, request for request, in `planningRequestLog.test.ts`.
 */
import i18n from '../../../i18n';
import { SENSITIVE_DOMAINS } from '../sensitiveDomains';
import { CoachOrchestrator, CONFIRM_QUESTION_ID } from '../CoachOrchestrator';
import { INTERVIEW_PLAYBOOK } from '../interviewPlaybook';
import type { Held, Portrait } from '../portrait';
import type { LlmRequest } from '../../llm/LlmClient';
import { drivePlanning, planningMock, requestLog, stepOf, type PlanningScript } from './planningConversation';

const AT = 1_750_000_000_000;

function held<T>(value: T, confidence: Held<T>['confidence'], source: Held<T>['source']): Held<T> {
  return { value, confidence, source, updatedAt: AT };
}

const WANT = 'leave marketing for something that feels like mine';
const NOW_STATE = 'eight years in marketing and running on empty';
const OUTCOME = 'waking up and not dreading Monday';

/** Everything the first conversation could reasonably have understood about a career change. */
function richCareerPortrait(overrides: Partial<Portrait> = {}): Portrait {
  return {
    primaryWant: held(WANT, 'high', 'stated'),
    domain: held('career', 'high', 'inferred'),
    currentState: held(NOW_STATE, 'high', 'stated'),
    desiredOutcome: held(OUTCOME, 'medium', 'stated'),
    stage: held('explore', 'high', 'inferred'),
    bottleneck: held('lack_of_clarity', 'high', 'inferred'),
    ...overrides,
  };
}

/** The questions a covered Portrait must never put to the person. */
const COVERED_IDS = ['career.foundation', 'career.baseline', 'career.obstacles', 'career.motivation'];

/** A Portrait value that only the Portrait holds, never the opening line. */
const PORTRAIT_ONLY = [NOW_STATE, OUTCOME, 'from your first conversation', 'do not know what they want or where to aim'];

async function conversation(portrait: Portrait | undefined, script: PlanningScript = {}, opening = 'yes, still that') {
  const llm = planningMock(script);
  const orchestrator = new CoachOrchestrator({ llm, portrait });
  const first = orchestrator.start();
  const driven = await drivePlanning(orchestrator, opening);
  return { llm, orchestrator, first, ...driven };
}

const fitnessGoal = () => JSON.stringify({ goals: [{ title: 'get fit', kind: 'process', domain: 'body_image' }] });

describe('the opening remembers', () => {
  it('quotes a want they SAID', () => {
    const orchestrator = new CoachOrchestrator({ llm: planningMock(), portrait: richCareerPortrait() });

    const opening = orchestrator.start();

    expect(opening.coachMessage).toBe(
      i18n.t('planning.resume.openingStated', { ns: 'coachContent', want: WANT }),
    );
    expect(opening.coachMessage).toContain(`“${WANT}”`);
    expect(orchestrator.isResumed()).toBe(true);
  });

  it('remembers an INFERRED want without quoting it as if they had said it', () => {
    const orchestrator = new CoachOrchestrator({
      llm: planningMock(),
      portrait: richCareerPortrait({ primaryWant: held(WANT, 'medium', 'inferred') }),
    });

    const opening = orchestrator.start();

    expect(opening.coachMessage).toBe(
      i18n.t('planning.resume.openingUnquoted', { ns: 'coachContent', want: WANT }),
    );
    expect(opening.coachMessage).not.toContain('“');
    expect(opening.coachMessage).not.toContain('told me');
  });

  it.each([
    ['a low want', richCareerPortrait({ primaryWant: held(WANT, 'low', 'stated') })],
    ['no want at all', richCareerPortrait({ primaryWant: undefined })],
    ['a low domain', richCareerPortrait({ domain: held('career', 'low', 'inferred') })],
    ['a domain we do not seed yet', richCareerPortrait({ domain: held('health', 'high', 'stated') })],
    ['an empty Portrait', {}],
  ])('opens exactly as today with %s', async (_label, portrait) => {
    const withIt = await conversation(portrait, {}, 'I have been applying for months and nobody answers');
    const without = await conversation(undefined, {}, 'I have been applying for months and nobody answers');

    expect(withIt.first.coachMessage).toBe(INTERVIEW_PLAYBOOK.opening);
    expect(withIt.orchestrator.isResumed()).toBe(false);
    // Not only the opening: every request after it is the no-Portrait conversation's.
    expect(requestLog(withIt.llm.calls)).toEqual(requestLog(without.llm.calls));
  });
});

describe('what the Portrait already answers is never asked', () => {
  it('skips foundation, baseline, obstacles and motivation, and still asks time, horizon, scheduling and staging', async () => {
    const { asked, last } = await conversation(richCareerPortrait());

    for (const id of COVERED_IDS) expect(asked).not.toContain(id);
    expect(asked).toEqual(expect.arrayContaining(['career.time', 'shared.horizon', 'meta.scheduling', 'career.milestones']));
    // The check still stands between the conversation and the plan.
    expect(asked[asked.length - 1]).toBe(CONFIRM_QUESTION_ID);
    expect(last.done).toBe(true);
    expect(last.goalSpec?.domain).toBe('career');
  });

  it('never covers time because of a constraint, however clearly it was said', async () => {
    const { asked } = await conversation(
      richCareerPortrait({ constraints: held(['I only have an hour a week'], 'high', 'stated') }),
    );

    expect(asked).toContain('career.time');
  });

  it('holds offline: with every compose, reader and signal call failing, covered questions are still not asked', async () => {
    const fail = (): string => {
      throw new Error('no network');
    };
    const { asked, last } = await conversation(richCareerPortrait(), { compose: fail, reader: fail, signals: fail });

    for (const id of COVERED_IDS) expect(asked).not.toContain(id);
    expect(asked).toContain('career.time');
    expect(last.done).toBe(true);
  });

  it('hands the goal reading the Portrait, and the composer the first conversation, once the goal is career', async () => {
    const { llm } = await conversation(richCareerPortrait());

    const understanding = llm.calls.filter((r) => stepOf(r) === 'understanding');
    expect(understanding).toHaveLength(1);
    expect(lastMessage(understanding[0])).toContain(WANT);
    expect(lastMessage(understanding[0])).toContain(NOW_STATE);
    const composed = llm.calls.filter((r) => stepOf(r) === 'compose');
    expect(composed.length).toBeGreaterThan(0);
    for (const req of composed) expect(lastMessage(req)).toContain('from your first conversation');
  });

  it('continues with the remembered goal when the reply reads as no goal at all', async () => {
    const llm = planningMock({ understanding: () => JSON.stringify({ goals: [] }) });
    const orchestrator = new CoachOrchestrator({ llm, portrait: richCareerPortrait() });
    orchestrator.start();

    const turn = await orchestrator.triage('yes');

    // Not the closed process-type card: they were asked whether the remembered goal is still it.
    expect(turn.question?.id).not.toBe('meta.processType');
    expect(turn.state.spec.domain).toBe('career');
    expect(turn.state.spec.title).toBe(WANT);
  });
});

describe('what they say now wins over the Portrait', () => {
  const baselineOptions = () =>
    i18n.t('career.baseline.options', { ns: 'coachContent', returnObjects: true }) as unknown as string[];

  it('defaults baseline to the first option for somebody exploring', async () => {
    const { asked, last } = await conversation(richCareerPortrait());

    expect(asked).not.toContain('career.baseline');
    expect(last.goalSpec?.answers?.['career.baseline']).toBe(baselineOptions()[0]);
  });

  it('places somebody already growing on the last option, not on whatever a tap would give', async () => {
    const { asked, last } = await conversation(richCareerPortrait({ stage: held('grow', 'medium', 'stated') }));

    expect(asked).not.toContain('career.baseline');
    expect(last.goalSpec?.answers?.['career.baseline']).toBe(baselineOptions()[2]);
  });

  it('lets this conversation’s own answer overwrite that default', async () => {
    let offered = false;
    const { asked, last } = await conversation(richCareerPortrait(), {
      reader: (req) => {
        // A covered question is never asked, but it is still offered to the reader.
        if (!lastMessage(req).includes('id: career.baseline')) return JSON.stringify({ answered: {} });
        offered = true;
        return JSON.stringify({ answered: { 'career.baseline': 'already interviewing for product roles' } });
      },
    });

    expect(offered).toBe(true);
    expect(asked).not.toContain('career.baseline');
    expect(last.goalSpec?.answers?.['career.baseline']).toBe('already interviewing for product roles');
  });

  it('does not default baseline from a stage that was only inferred at medium', async () => {
    const { asked, last } = await conversation(
      richCareerPortrait({ stage: held('explore', 'medium', 'inferred') }),
    );

    // Covered by their own account of where they are, so not asked; but not a level we trust.
    expect(asked).not.toContain('career.baseline');
    expect(last.goalSpec?.answers?.['career.baseline']).toBeUndefined();
  });
});

describe('a different goal is a different conversation', () => {
  it('asks exactly what a fitness goal is asked with no Portrait, and sends no Portrait facts after the goal is read', async () => {
    const seeded = await conversation(richCareerPortrait(), { understanding: fitnessGoal }, 'actually I want to get fit');
    const plain = await conversation(undefined, { understanding: fitnessGoal }, 'actually I want to get fit');

    expect(seeded.asked).toEqual(plain.asked);
    expect(seeded.last.goalSpec?.answers).toEqual(plain.last.goalSpec?.answers);
    const afterTheGoal = seeded.llm.calls.filter((r) => stepOf(r) !== 'understanding');
    expect(afterTheGoal.length).toBeGreaterThan(0);
    for (const req of afterTheGoal) {
      const sent = JSON.stringify(req);
      for (const value of PORTRAIT_ONLY) expect(sent).not.toContain(value);
    }
  });

  it('still stops at a sensitive domain', async () => {
    const llm = planningMock({
      understanding: () => JSON.stringify({ goals: [{ title: 'stop drinking', kind: 'process', domain: 'addiction' }] }),
    });
    const orchestrator = new CoachOrchestrator({ llm, portrait: richCareerPortrait() });
    orchestrator.start();

    const turn = await orchestrator.triage('honestly it is the drinking I need help with');

    // The surface's stop reads exactly this; the Portrait must not have routed around it.
    expect(turn.activeExpert?.id).toBe('addiction');
    expect(SENSITIVE_DOMAINS.has(turn.activeExpert!.id)).toBe(true);
    for (const req of llm.calls.filter((r) => stepOf(r) !== 'understanding')) {
      for (const value of PORTRAIT_ONLY) expect(JSON.stringify(req)).not.toContain(value);
    }
  });
});

describe('the introduction ignores a Portrait it is handed', () => {
  it('opens, asks and sends exactly what it does without one', async () => {
    const run = async (portrait?: Portrait) => {
      const llm = planningMock({ other: () => '{}', understanding: () => JSON.stringify({ goals: [{ title: 'leave marketing', kind: 'process', domain: 'career' }] }) });
      const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction', portrait });
      const opening = orchestrator.start();
      await orchestrator.triage('Guy');
      const turn = await orchestrator.triage('I have had enough of marketing');
      return { llm, opening, turn, resumed: orchestrator.isResumed() };
    };

    const withIt = await run(richCareerPortrait());
    const without = await run();

    expect(withIt.resumed).toBe(false);
    expect(withIt.opening.coachMessage).toBe(without.opening.coachMessage);
    expect(withIt.turn.question?.id).toBe(without.turn.question?.id);
    expect(requestLog(withIt.llm.calls)).toEqual(requestLog(without.llm.calls));
  });
});

describe('technical notes name fields, never values', () => {
  it('keeps every Portrait value out of the commentary', async () => {
    const llm = planningMock();
    const orchestrator = new CoachOrchestrator({ llm, portrait: richCareerPortrait() });
    orchestrator.start();
    orchestrator.setTechnicalMode(true);
    const notes: string[] = [];

    let turn = await orchestrator.triage('yes, still that');
    notes.push(...(turn.technicalNotes ?? []));
    while (!turn.done && turn.question) {
      turn = await orchestrator.selectOption(0);
      notes.push(...(turn.technicalNotes ?? []));
    }

    const all = notes.join('\n');
    expect(all).toContain('Continuing from the first conversation');
    expect(all).toContain('Baseline taken from the first conversation');
    for (const value of [WANT, NOW_STATE, OUTCOME]) expect(all).not.toContain(value);
  });
});

function lastMessage(req: LlmRequest): string {
  return req.messages[req.messages.length - 1]?.content ?? '';
}
