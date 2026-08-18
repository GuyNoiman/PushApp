/**
 * The recurring shape — the fix for the founder's verdict, "the plan that was built for me didn't
 * help me at all".
 *
 * He asked to drink a protein shake daily and received Steps about walking at a comfortable pace
 * and eating meals at regular times, because the expert held a hardcoded four-Milestone table and
 * his words were used only to pick a domain. These tests pin the two properties that make that
 * impossible now: the user's own sentence IS the plan, and a repeated action gets no Milestone arc.
 */
import i18n from '../../../../i18n';
import { buildRecurringStructure, recurringOccurrences } from '../buildRecurring';
import { RECURRING_APPROACHES, recurringSetupCount } from '../recurringApproaches';
import { fillSlots } from '../slots';
import type { GoalInput } from '../../types';

const SHAKE: GoalInput = { title: 'Drink a protein shake', isHabit: true, shape: 'recurring' };

describe('a recurring plan is made of the user’s own words', () => {
  it('repeats the goal VERBATIM as the spine of the plan', () => {
    const structure = buildRecurringStructure({ goal: SHAKE, occurrences: 5 });
    const spine = structure.unstagedSteps!.filter((s) => s.title === 'Drink a protein shake');

    expect(spine).toHaveLength(5);
  });

  it('puts the user’s words INSIDE each setup Step, rather than writing about something else', () => {
    const structure = buildRecurringStructure({ goal: SHAKE, approach: 'prepare', occurrences: 1 });
    const setup = structure.unstagedSteps!.slice(0, recurringSetupCount('prepare'));

    // Every setup Step mentions what the user actually asked for…
    expect(setup.every((s) => s.title.includes('Drink a protein shake'))).toBe(true);
    // …and none of them is a bare echo of it: the frame is the library's contribution.
    expect(setup.every((s) => s.title !== 'Drink a protein shake')).toBe(true);
    // No slot survives into a user-facing title.
    expect(setup.every((s) => !s.title.includes('{ACTION}'))).toBe(true);
  });

  it('gives a repeated action NO Milestone arc', () => {
    const structure = buildRecurringStructure({ goal: SHAKE, occurrences: 3 });

    // There is no second phase of drinking a protein shake. An empty arc means every surface
    // renders no stage line at all, rather than a Milestone the user never approved (Device QA A1).
    expect(structure.milestones).toEqual([]);
    expect(structure.stepsByMilestone).toEqual([]);
  });

  it('builds a DIFFERENT plan per approach, so there is something to compare', () => {
    const titles = RECURRING_APPROACHES.map((a) =>
      buildRecurringStructure({ goal: SHAKE, approach: a.id, occurrences: 1 })
        .unstagedSteps!.map((s) => s.title)
        .join('|'),
    );

    // Without variants there is nothing to compare, and without comparison there is no learning.
    expect(new Set(titles).size).toBe(RECURRING_APPROACHES.length);
  });

  it('falls back to the safe default for an unknown approach instead of throwing', () => {
    const unknown = buildRecurringStructure({
      goal: SHAKE,
      approach: 'no_such_approach' as never,
      occurrences: 1,
    });
    const fallback = buildRecurringStructure({ goal: SHAKE, approach: 'anchor', occurrences: 1 });

    expect(unknown).toEqual(fallback);
  });

  it('never mints an unbounded number of Steps', () => {
    const huge = buildRecurringStructure({ goal: SHAKE, occurrences: 10_000 });

    expect(huge.unstagedSteps!.length).toBeLessThanOrEqual(202);
  });
});

describe('how many repetitions fit', () => {
  it('counts ACTIVE days, not calendar days', () => {
    // Twice a week for four weeks = 8 active days, less the 2 setup Steps.
    expect(
      recurringOccurrences({ durationDays: 28, preferredDays: [1, 4], setupStepCount: 2 }),
    ).toBe(6);
  });

  it('treats an empty day preference as every day', () => {
    expect(recurringOccurrences({ durationDays: 14, preferredDays: [], setupStepCount: 2 })).toBe(12);
  });

  it('always leaves the user at least one thing to actually do', () => {
    // Setup that would eat every available day must not produce a Journey of pure preparation.
    expect(
      recurringOccurrences({ durationDays: 7, preferredDays: [0], setupStepCount: 5 }),
    ).toBe(1);
  });
});

describe('slot filling', () => {
  it('leaves the template intact when there is no action, so the defect is visible in QA', () => {
    expect(fillSlots('Get everything {ACTION} needs', { action: '   ' })).toBe(
      'Get everything {ACTION} needs',
    );
  });

  it('fills every occurrence of the slot', () => {
    expect(fillSlots('{ACTION} then {ACTION}', { action: 'read' })).toBe('read then read');
  });
});

describe('the translation cache (D55)', () => {
  it('renders the FRAME in the user’s language and leaves their words untouched', async () => {
    const previous = i18n.language;
    await i18n.changeLanguage('he');
    try {
      const hebrewGoal = { title: 'שייק חלבון', isHabit: true, shape: 'recurring' as const };
      const setup = buildRecurringStructure({ goal: hebrewGoal, approach: 'prepare', occurrences: 1 })
        .unstagedSteps!.slice(0, recurringSetupCount('prepare'));

      // The authored English frame is gone…
      expect(setup.every((s) => !s.title.includes('Get everything'))).toBe(true);
      // …and the user's own words survived it verbatim. Translating AFTER filling would have sent
      // "שייק חלבון" through a translator and handed it back as "protein shake".
      expect(setup.every((s) => s.title.includes('שייק חלבון'))).toBe(true);
    } finally {
      await i18n.changeLanguage(previous);
    }
  });

  it('falls back to the authored English when a language has not been rendered yet', async () => {
    const previous = i18n.language;
    await i18n.changeLanguage('es');
    try {
      const setup = buildRecurringStructure({ goal: SHAKE, approach: 'prepare', occurrences: 1 })
        .unstagedSteps![0];

      // English, never a missing-key placeholder.
      expect(setup.title).toContain('Get everything');
    } finally {
      await i18n.changeLanguage(previous);
    }
  });
});
