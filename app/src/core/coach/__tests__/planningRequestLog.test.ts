/**
 * THE LOCK ON TODAY'S PLANNING CONVERSATION (Stage 0 of
 * `04_Product/Planning_From_Portrait_Plan_2026-09-16.md`).
 *
 * The second conversation is about to learn to continue from the Portrait. Every one of those
 * changes is gated on a Portrait being present, and "gated" is a claim that is easy to make and easy
 * to break by one stray line: a directive that gains a trailing newline, a known-facts list built in
 * a different order, a reader offered one more question. None of those would fail an ordinary
 * behavioural test, and every one of them changes what somebody without a Portrait is sent.
 *
 * So this records EVERY model request of a career planning conversation with no Portrait (the
 * understanding call, the signal reading, each composed turn and each conversation reading) from the
 * opening message through the understanding check to the finished spec, and snapshots it. It was
 * written before any of the handoff existed. If this snapshot changes, the planning conversation
 * changed for everybody, and that is a decision rather than an update.
 */
import { getExpert } from '../../learning/registry';
import { CoachOrchestrator, CONFIRM_QUESTION_ID } from '../CoachOrchestrator';
import { buildJourneyInput } from '../goalSpecToJourney';
import { INTERVIEW_PLAYBOOK } from '../interviewPlaybook';
import { drivePlanning, planningMock, requestLog } from './planningConversation';

/** A fixed local midnight, so the build at the end is reproducible. */
const NOW = new Date(2026, 8, 16).getTime();

/** The opening message and the two answers given in words rather than taps. */
const LOCKED_OPENING = 'I have been applying for months and nobody answers';
const LOCKED_ANSWERS = {
  // Words, not a card, for one diagnosis question and one interview question, so the signal reading
  // and a free-text answer are both in the log and not only taps.
  'career.diagnosis.applyNoResponse.target': { say: 'honestly I apply to anything that looks close' },
  'career.foundation': { say: 'I want work that feels like mine' },
};

describe('a planning conversation with no Portrait', () => {
  async function run() {
    const llm = planningMock();
    const orchestrator = new CoachOrchestrator({ llm });
    const opening = orchestrator.start();
    const driven = await drivePlanning(orchestrator, LOCKED_OPENING, LOCKED_ANSWERS);
    return { llm, opening, ...driven };
  }

  it('opens with the playbook line, reaches the understanding check, and ends in a buildable spec', async () => {
    const { opening, asked, last } = await run();

    expect(opening.coachMessage).toBe(INTERVIEW_PLAYBOOK.opening);
    expect(asked[asked.length - 1]).toBe(CONFIRM_QUESTION_ID);
    expect(last.done).toBe(true);
    expect(last.goalSpec).toBeDefined();
    const input = buildJourneyInput(last.goalSpec!, getExpert(last.goalSpec!.domain), { now: NOW });
    expect(input.title).toBe('find a job that fits');
  });

  it('sends exactly the requests it sent before the Portrait handoff existed', async () => {
    const { llm, asked } = await run();

    expect({ asked, ...requestLog(llm.calls) }).toMatchSnapshot();
  });
});
