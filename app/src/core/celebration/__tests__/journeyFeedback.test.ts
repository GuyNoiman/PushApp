/**
 * The end-of-Journey question, and the trap it exists to avoid.
 *
 * The completion ceremony only ever meets people who FINISHED. Collect feedback only there and
 * every training label comes from a success — the library learns that everything works, invisibly,
 * from data that looks clean (Plan_Library_and_Learning_PRD §6.4). These tests pin the two hosts
 * that a completion-only design never hears from, and the rules that keep the question a request
 * rather than a nag.
 */
import {
  buildJourneyFeedback,
  isQuietlyDead,
  journeyWorked,
  pendingFeedback,
  QUIET_DEATH_DAYS,
} from '../journeyFeedback';
import type { Journey, ReasonEntry, Step } from '../../types/domain';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 2, 11, 10, 0, 0).getTime();

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Drink a protein shake',
    why: [],
    durationDays: 56,
    rhythm: 'daily',
    status: 'active',
    steps: [step('s1')],
    createdAt: NOW - 30 * DAY,
    ...over,
  };
}

describe('who gets asked, and in what order', () => {
  it('asks a CANCELED Journey — the answer a completion-only design never hears', () => {
    const canceled = journey({ status: 'abandoned', abandonedAt: NOW - DAY, stepsAtAbandon: 12 });

    expect(pendingFeedback([canceled], [], NOW)).toMatchObject({ host: 'canceled' });
  });

  it('asks a Journey that QUIETLY DIED — the most common ending, and the one nobody instruments', () => {
    const dead = journey({ createdAt: NOW - (QUIET_DEATH_DAYS + 5) * DAY });

    expect(pendingFeedback([dead], [], NOW)).toMatchObject({ host: 'quiet' });
  });

  it('waits for the ceremony before asking a COMPLETED Journey', () => {
    const justFinished = journey({
      status: 'completed',
      completedAt: NOW - 60_000,
      steps: [step('s1', { done: true })],
    });

    // The card comes first: a question landing on top of the celebration reads as though the app
    // doubted it.
    expect(pendingFeedback([justFinished], [], NOW)).toBeNull();

    const seen = {
      ...justFinished,
      completionCard: {
        journeyId: 'j1',
        journeyTitleSnapshot: 'Drink a protein shake',
        completedAt: NOW - 60_000,
        templateVersion: 1,
        totalSteps: 1,
        durationDays: 56,
        ceremonyShownAt: NOW - 30_000,
      },
    };
    expect(pendingFeedback([seen], [], NOW)).toMatchObject({ host: 'completed' });
  });

  it('asks about ONE Journey at a time, newest ending first', () => {
    const old = journey({ id: 'old', status: 'abandoned', abandonedAt: NOW - 10 * DAY });
    const recent = journey({ id: 'recent', status: 'abandoned', abandonedAt: NOW - DAY });

    expect(pendingFeedback([old, recent], [], NOW)?.journeyId).toBe('recent');
  });

  it('never asks twice — a DISMISSED question is answered', () => {
    // Present-but-empty feedback is what a dismissal writes. Re-asking would turn a request into
    // a nag, which is the one thing this question must never become.
    const dismissed = journey({
      status: 'abandoned',
      abandonedAt: NOW - DAY,
      feedback: { host: 'canceled', at: NOW - DAY },
    });

    expect(pendingFeedback([dismissed], [], NOW)).toBeNull();
  });
});

describe('what counts as quietly dead', () => {
  it('needs a full silence, not a bad week', () => {
    expect(isQuietlyDead(journey({ createdAt: NOW - (QUIET_DEATH_DAYS - 1) * DAY }), [], NOW)).toBe(false);
    expect(isQuietlyDead(journey({ createdAt: NOW - QUIET_DEATH_DAYS * DAY }), [], NOW)).toBe(true);
  });

  it('counts an honest "couldn’t today" as a sign of life', () => {
    // Someone reporting misses every week has not abandoned anything. Treating them as dead would
    // ask the one person still showing up why they left.
    const log: ReasonEntry[] = [
      {
        id: 'r1',
        journeyId: 'j1',
        stepId: 's1',
        reasonId: 'no_time',
        at: NOW - 2 * DAY,
        action: 'cancel',
        leverIds: [],
        outcome: 'accepted',
      },
    ];
    const silentSinceCreation = journey({ createdAt: NOW - 60 * DAY });

    expect(isQuietlyDead(silentSinceCreation, log, NOW)).toBe(false);
  });

  it('leaves a FROZEN Journey alone', () => {
    // The user told us they were pausing it. Asking why they stopped would be the app failing to
    // listen to something it was just told.
    const frozen = journey({ status: 'frozen', createdAt: NOW - 60 * DAY });

    expect(isQuietlyDead(frozen, [], NOW)).toBe(false);
  });
});

describe('did it work?', () => {
  it('treats finishing as the evidence — unless the user says otherwise', () => {
    const finished = journey({ status: 'completed', completedAt: NOW });

    expect(journeyWorked(finished)).toBe(true);
    expect(journeyWorked({ ...finished, feedback: { host: 'completed', at: NOW, helped: 'no' } })).toBe(false);
  });

  it('does not read "partly" as a failure', () => {
    // The honest middle answer. A library that scored it negative would learn to avoid every
    // Journey people found genuinely mixed.
    const mixed = journey({ feedback: { host: 'canceled', at: NOW, helped: 'partly' } });

    expect(journeyWorked(mixed)).toBe(true);
  });

  it('keeps "we do not know" distinguishable from "no"', () => {
    // A Journey that was never labelled is missing data, not a bad Journey. Collapsing the two is
    // how a training set fills up with silent negatives.
    expect(journeyWorked(journey({ status: 'abandoned', abandonedAt: NOW }))).toBeUndefined();
  });
});

describe('the record', () => {
  it('keeps a skipped answer as a real record, so the ask is not repeated', () => {
    expect(buildJourneyFeedback({ host: 'quiet', now: NOW })).toEqual({ host: 'quiet', at: NOW });
  });

  it('drops a whitespace-only note rather than storing an empty one', () => {
    expect(buildJourneyFeedback({ host: 'canceled', helped: 'no', note: '   ', now: NOW })).toEqual({
      host: 'canceled',
      at: NOW,
      helped: 'no',
    });
  });
});
