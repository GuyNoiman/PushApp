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
import he from '@/i18n/resources/he/onboarding.json';
import en from '@/i18n/resources/en/onboarding.json';

const content = {
  title: 'Getting to know the app',
  why: ['Have it set up my way', 'Know where things are'],
  steps: [
    { title: 'Complete my profile', description: 'Make the app feel truly mine' },
    { title: 'Discover one Tool', description: 'A short moment of self-discovery' },
    { title: 'Explore the friends area', description: 'You can also continue on your own' },
    { title: 'Build a personal Journey with my coach', description: 'The path we will choose together' },
  ],
};

describe('the Journey it builds', () => {
  it('is an ordinary Journey, not a tutorial with a Journey painted on it', () => {
    const input = introJourneyInput(content);
    expect(input.title).toBe('Getting to know the app');
    expect(input.rhythm).toBe('few-times-week');
    expect(input.durationDays).toBeGreaterThan(0);
    expect(input.why).toHaveLength(2);
  });

  it('opens on the profile, which is the page it exists to replace', () => {
    const [first] = introJourneyInput(content).steps;
    expect(first.title).toBe('Complete my profile');
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
    expect(steps).toHaveLength(5);
    expect(steps[4].appLink).toBeUndefined();
    expect(steps[0].appLink).toBe('/settings/profile');
  });
});

/**
 * The approved four (build spec §7, founder 2026-09-16), transcribed there from the approved screens.
 * Pinned in BOTH languages, verbatim, because a Step's words are the one thing a person reads before
 * deciding whether to take it — and Active Hours, which used to be the second Step, must be gone.
 */
describe('the approved four Steps', () => {
  it('goes to the profile, the Tools tab, the friends area and the planning coach, in that order', () => {
    expect([...INTRO_JOURNEY_LINKS]).toEqual(['/settings/profile', '/tools', '/friends', '/coach']);
    expect(INTRO_JOURNEY_LINKS).not.toContain('/settings/active-hours');
  });

  it('is written in Hebrew exactly as approved', () => {
    expect(he.introJourney.title).toBe('היכרות עם האפליקציה');
    expect(he.introJourney.steps).toEqual([
      { title: 'להשלים את הפרופיל שלי', description: 'כדי שהאפליקציה תרגיש באמת שלי' },
      { title: 'לגלות כלי אחד', description: 'היכרות קצרה עם עצמי' },
      { title: 'להכיר את אזור החברים', description: 'אפשר גם להמשיך לבד' },
      { title: 'לבנות מסע אישי עם המאמן', description: 'הדרך שנבחר יחד' },
    ]);
  });

  it('is written in English exactly as approved', () => {
    expect(en.introJourney.title).toBe('Getting to know the app');
    expect(en.introJourney.steps).toEqual(content.steps);
  });

  it.each([
    ['he', he],
    ['en', en],
  ])('builds exactly four linked Steps from the %s copy', (_lang, locale) => {
    const steps = introJourneyInput(locale.introJourney).steps;
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.appLink)).toEqual([...INTRO_JOURNEY_LINKS]);
  });
});
