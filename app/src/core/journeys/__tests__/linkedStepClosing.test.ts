/**
 * linkedStepClosing — which open Steps a thing done in the app closes (Gap Register B2).
 *
 * The rule is read by DESTINATION, never by position, so the cases below are about links, not about
 * where a Step sits: the old three-Step intro Journey and the new four-Step one close by the same
 * rules, a spelling of the same screen still matches, and nothing that is not open and running is
 * ever touched.
 */
import type { Journey, Step } from '../../types/domain';
import { ACTION_CLOSES, destinationOf, IN_APP_DESTINATIONS, stepsClosedBy, type InAppAction } from '../linkedStepClosing';

function step(id: string, appLink?: string, extra: Partial<Step> = {}): Step {
  return { id, title: id, done: false, ...(appLink !== undefined ? { appLink } : {}), ...extra } as Step;
}

function journey(id: string, steps: Step[], extra: Partial<Journey> = {}): Journey {
  return { id, title: id, steps, status: 'active', createdAt: 0, ...extra } as Journey;
}

/** The intro Journey as the two test phones already hold it: three Steps, Active Hours second. */
const oldIntro = () =>
  journey('old', [step('p', '/settings/profile'), step('h', '/settings/active-hours'), step('t', '/tools')]);

/** The approved four. */
const newIntro = () =>
  journey('new', [step('p', '/settings/profile'), step('t', '/tools'), step('f', '/friends'), step('c', '/coach')]);

describe('destinationOf', () => {
  it('reads the same screen however the link spells it', () => {
    expect(destinationOf('/tools')).toBe('/tools');
    expect(destinationOf('/(tabs)/tools')).toBe('/tools');
    expect(destinationOf('/tools/')).toBe('/tools');
    expect(destinationOf('/coach?source=step')).toBe('/coach');
    expect(destinationOf(' /settings/profile#top ')).toBe('/settings/profile');
  });

  it('reads anything that is not an in-app path as no destination at all', () => {
    expect(destinationOf(undefined)).toBeUndefined();
    expect(destinationOf('https://example.com/tools')).toBeUndefined();
    expect(destinationOf('//tools')).toBeUndefined();
    expect(destinationOf('tools')).toBeUndefined();
  });
});

describe('stepsClosedBy', () => {
  it('maps each of the five actions to its own destination, and to no other', () => {
    expect(ACTION_CLOSES).toEqual({
      profileSaved: IN_APP_DESTINATIONS.profile,
      activeHoursSaved: IN_APP_DESTINATIONS.activeHours,
      toolUsed: IN_APP_DESTINATIONS.tools,
      friendsVisited: IN_APP_DESTINATIONS.friends,
      journeyBuiltWithCoach: IN_APP_DESTINATIONS.coach,
    });
  });

  it.each<[InAppAction, string]>([
    ['profileSaved', 'p'],
    ['toolUsed', 't'],
    ['friendsVisited', 'f'],
    ['journeyBuiltWithCoach', 'c'],
  ])('%s closes exactly the new intro Step that points at it', (action, stepId) => {
    expect(stepsClosedBy([newIntro()], action)).toEqual([{ journeyId: 'new', stepId }]);
  });

  it('closes the OLD intro Journey by the same rules, Active Hours Step included', () => {
    const journeys = [oldIntro()];
    expect(stepsClosedBy(journeys, 'profileSaved')).toEqual([{ journeyId: 'old', stepId: 'p' }]);
    expect(stepsClosedBy(journeys, 'activeHoursSaved')).toEqual([{ journeyId: 'old', stepId: 'h' }]);
    expect(stepsClosedBy(journeys, 'toolUsed')).toEqual([{ journeyId: 'old', stepId: 't' }]);
    // Nothing on it points at the friends area or the coach.
    expect(stepsClosedBy(journeys, 'friendsVisited')).toEqual([]);
    expect(stepsClosedBy(journeys, 'journeyBuiltWithCoach')).toEqual([]);
  });

  it('never picks a Step that is already done or was shed by the coach', () => {
    const j = journey('j', [
      step('done', '/tools', { done: true }),
      step('dropped', '/tools', { dropped: true }),
      step('open', '/tools'),
    ]);
    expect(stepsClosedBy([j], 'toolUsed')).toEqual([{ journeyId: 'j', stepId: 'open' }]);
  });

  it.each(['frozen', 'completed', 'abandoned', 'future'] as const)(
    'leaves a %s Journey exactly as it is',
    (status) => {
      expect(stepsClosedBy([newIntro()].map((j) => ({ ...j, status })), 'profileSaved')).toEqual([]);
    },
  );

  it('treats a legacy Journey with no status and a completedAt as finished', () => {
    const legacy = { ...newIntro(), status: undefined, completedAt: 1 } as Journey;
    expect(stepsClosedBy([legacy], 'profileSaved')).toEqual([]);
  });

  it('ignores ordinary Steps with no link, which is almost every Step there is', () => {
    const j = journey('j', [step('walk'), step('read')]);
    for (const action of Object.keys(ACTION_CLOSES) as InAppAction[]) {
      expect(stepsClosedBy([j], action)).toEqual([]);
    }
  });
});
