/**
 * What the backup may carry. The founder's rule (2026-08-24): the raw wording stays on the device,
 * our reading of it goes up — so a new phone keeps the picture of a life and the server never holds
 * the sentences somebody wrote.
 *
 * These tests are the enforcement. A field added later that carries free text will pass the type
 * checker and fail here, which is the point.
 */
import type { AppState, Journey } from '../../types/domain';
import { backupCarriesRawText, redactForBackup } from '../redactForBackup';

const journey = (over: Partial<Journey> = {}): Journey =>
  ({
    id: 'j1',
    title: 'Run three times a week',
    why: ['so I can keep up with my daughter'],
    steps: [],
    createdAt: 1,
    ...over,
  }) as Journey;

const state = (over: Partial<AppState> = {}): AppState =>
  ({
    dreams: [],
    journeys: [journey()],
    buddy: { name: 'Pip', xp: 3, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: {} as AppState['schedulingPrefs'],
    reasonLog: [
      { stepId: 's1', journeyId: 'j1', at: 10, reasonId: 'too_tired', note: 'I just could not face it' },
    ],
    behaviorLog: [{ at: 1, kind: 'open' }] as unknown as AppState['behaviorLog'],
    ...over,
  }) as AppState;

describe('what never leaves the device', () => {
  it('strips the raw "why" — the most personal sentence in the product', () => {
    const backup = redactForBackup(state());
    expect(backup.journeys[0].why).toEqual([]);
    expect(JSON.stringify(backup)).not.toContain('keep up with my daughter');
  });

  it('strips a miss-recovery note and KEEPS its classification', () => {
    const backup = redactForBackup(state());
    expect(JSON.stringify(backup)).not.toContain('could not face it');
    // The reading survives, which is the whole point of the rule.
    expect(backup.reasonLog?.[0].reasonId).toBe('too_tired');
    expect(backup.reasonLog?.[0].at).toBe(10);
  });

  it('strips an end-of-Journey note and keeps its verdict', () => {
    const withFeedback = state({
      journeys: [journey({ feedback: { host: 'completed', at: 5, helped: 'yes', reasonId: 'life', note: 'my father was ill' } })],
    });
    const backup = redactForBackup(withFeedback);
    expect(JSON.stringify(backup)).not.toContain('father');
    expect(backup.journeys[0].feedback).toMatchObject({ helped: 'yes', reasonId: 'life' });
  });

  it('strips the behavioural log entirely — a portrait of a life is not ours to hold', () => {
    expect(redactForBackup(state()).behaviorLog).toEqual([]);
  });

  it('never mutates the state it was handed', () => {
    const original = state();
    redactForBackup(original);
    expect(original.journeys[0].why).toEqual(['so I can keep up with my daughter']);
    expect(original.reasonLog?.[0].note).toBe('I just could not face it');
  });
});

describe('what a restore still gets', () => {
  it('keeps everything that makes a restore worth having', () => {
    const backup = redactForBackup(state());
    expect(backup.journeys[0].title).toBe('Run three times a week');
    expect(backup.journeys[0].id).toBe('j1');
    expect(backup.buddy.xp).toBe(3);
    expect(backup.reasonLog).toHaveLength(1);
  });
});

describe('the guard', () => {
  it('recognises raw text before it could travel', () => {
    expect(backupCarriesRawText(state())).toBe(true);
  });

  it('passes a redacted state', () => {
    expect(backupCarriesRawText(redactForBackup(state()))).toBe(false);
  });
});

describe('coach memory', () => {
  it('travels as a reading, without the sentences it was read from', () => {
    const withMemory = state({
      coachMemory: {
        consent: { state: 'granted', version: '2026-08-24', locale: 'he', at: 5 },
        dreams: [],
        journeys: [
          {
            kind: 'journey',
            id: 'j1',
            schemaVersion: 1,
            updatedAt: 5,
            provenance: 'approvedChange',
            outcome: 'Run three times a week',
            reasons: ['so I can keep up with my daughter'],
            constraints: [],
            obstacleCategories: [],
            adaptationRationale: [],
            assumptions: [],
          },
        ],
      },
    });

    // The founder's rule, stated again on 2026-08-25: the raw material stays on the device, the
    // insight the coach drew from it goes up. So the memory TRAVELS…
    const backed = redactForBackup(withMemory);
    expect(backed.coachMemory?.journeys).toHaveLength(1);
    expect(backed.coachMemory?.journeys[0].outcome).toBe('Run three times a week');
    // …and the one field inside it that is a verbatim copy of the person's own sentence does not.
    expect(backed.coachMemory?.journeys[0].reasons).toEqual([]);
    expect(JSON.stringify(backed)).not.toContain('keep up with my daughter');
    expect(backupCarriesRawText(withMemory)).toBe(true);
    expect(backupCarriesRawText(backed)).toBe(false);
  });
});
