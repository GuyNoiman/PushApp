/**
 * "Getting to know PushApp" — the Journey that replaced the profile page in the first run
 * (founder, 2026-09-03).
 *
 * The interesting thing to pin is not the copy, which will change. It is that the fields the
 * retired page asked for still get asked for, and that the Steps which name a screen actually carry
 * that screen — a Step that says "go and fill in your profile" and opens nothing is worse than the
 * page it replaced.
 */
import { INTRO_JOURNEY_LINKS, introJourneyInput } from '../introJourney';

const content = {
  title: 'Getting to know PushApp',
  why: ['Have it set up my way', 'Know where things are'],
  steps: [
    { title: 'Fill in your profile', description: 'Name, username, country.' },
    { title: 'Choose the hours', description: 'When a reminder may arrive.' },
    { title: 'Open Tools', description: 'Try one.' },
  ],
};

describe('the Journey it builds', () => {
  it('is an ordinary Journey, not a tutorial with a Journey painted on it', () => {
    const input = introJourneyInput(content);
    expect(input.title).toBe('Getting to know PushApp');
    expect(input.rhythm).toBe('few-times-week');
    expect(input.durationDays).toBeGreaterThan(0);
    expect(input.why).toHaveLength(2);
  });

  it('opens on the profile, which is the page it exists to replace', () => {
    const [first] = introJourneyInput(content).steps;
    expect(first.title).toBe('Fill in your profile');
    expect(first.appLink).toBe('/settings/profile');
    expect(first.isStarterStep).toBe(true);
  });

  it('gives every Step the screen it names, in the order the copy is written', () => {
    const steps = introJourneyInput(content).steps;
    expect(steps.map((s) => s.appLink)).toEqual([...INTRO_JOURNEY_LINKS]);
  });

  it('marks only the first Step as the Starter Step', () => {
    const steps = introJourneyInput(content).steps;
    expect(steps.filter((s) => s.isStarterStep)).toHaveLength(1);
  });

  it('carries the descriptions through, so a Step says why it is worth a minute', () => {
    const steps = introJourneyInput(content).steps;
    expect(steps.every((s) => (s.description ?? '').length > 0)).toBe(true);
  });

  /**
   * The links live in code and the copy lives in the locale files, which means a translator adding
   * a fourth Step would produce one with nowhere to go. That is allowed (it is still a real Step),
   * but it must not throw or silently attach the wrong screen to it.
   */
  it('leaves a Step with no matching link simply linkless', () => {
    const extra = { ...content, steps: [...content.steps, { title: 'Extra', description: 'x' }] };
    const steps = introJourneyInput(extra).steps;
    expect(steps).toHaveLength(4);
    expect(steps[3].appLink).toBeUndefined();
    expect(steps[0].appLink).toBe('/settings/profile');
  });
});
