/**
 * The words of a motivation card. What is asserted here is the contract, not the sentences: every
 * catalog item has copy in both languages and all four voices, no placeholder ever reaches a
 * screen, and the number in the sentence is the number the engine was given.
 */
import { changeLanguage } from '@/i18n';
import {
  DEFAULT_COMMUNICATION_PROFILE,
  setCommunicationProfile,
} from '@/core/communication/communicationProfile';
import { MOTIVATION_CATALOG } from '../catalog';
import { buildMotivationCard } from '../motivationCopy';
import type { MotivationFacts, MotivationItem } from '../types';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const STYLES = ['direct', 'explanatory', 'warm', 'energizing'] as const;

/** Facts where everything is known, so any item can be phrased. */
const allFacts: MotivationFacts = {
  stepsDoneTotal: 12,
  stepsDoneThisWeek: 4,
  streakDays: 5,
  runningJourneys: 1,
  journeyId: 'j1',
  journeyTitle: 'Run 5km',
  daysMoving: 20,
  journeyProgressPct: 40,
  stepsToMilestone: 2,
  daysSinceLastDone: 3,
  returnedAfterMiss: true,
};

const select = (item: MotivationItem, facts: MotivationFacts = allFacts) => ({
  item,
  facts,
  alreadyShownToday: false,
});

describe('buildMotivationCard', () => {
  afterEach(async () => {
    setCommunicationProfile(DEFAULT_COMMUNICATION_PROFILE);
    await changeLanguage('en');
  });

  it('returns nothing for nothing', () => {
    expect(buildMotivationCard(null)).toBeNull();
  });

  it('every item has real copy in both languages and all four voices', async () => {
    for (const lang of ['en', 'he'] as const) {
      await changeLanguage(lang);
      for (const item of MOTIVATION_CATALOG) {
        const seen = new Set<string>();
        for (const style of STYLES) {
          setCommunicationProfile(style);
          const card = buildMotivationCard(select(item))!;
          expect(card.title).toBeTruthy();
          expect(card.body).toBeTruthy();
          expect(`${card.title} ${card.body}`).not.toContain('{{');
          // A raw key leaking through would also mean the copy is missing.
          expect(`${card.title} ${card.body}`).not.toContain(`${item.id}.`);
          seen.add(`${card.title}|${card.body}`);
        }
        // The four voices differ, or the style the person chose changes nothing they can read.
        expect(seen.size).toBe(STYLES.length);
      }
    }
  });

  it('speaks the number it was handed', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'stepsTotal')!;
    const card = buildMotivationCard(select(item, { ...allFacts, stepsDoneTotal: 37 }))!;
    expect(`${card.title} ${card.body}`).toContain('37');
  });

  it('drops a Journey door that would open nowhere, and keeps the words', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'journeyShare')!;
    const card = buildMotivationCard(select(item, { ...allFacts, journeyId: undefined }))!;
    expect(card.door).toBeUndefined();
    expect(card.body).toBeTruthy();
  });

  it('carries the item id and version, so feedback attaches to the MEANING not the wording', () => {
    const item = MOTIVATION_CATALOG[0];
    setCommunicationProfile('warm');
    const warm = buildMotivationCard(select(item))!;
    setCommunicationProfile('direct');
    const direct = buildMotivationCard(select(item))!;
    expect(warm.itemId).toBe(direct.itemId);
    expect(warm.version).toBe(direct.version);
    expect(warm.body).not.toBe(direct.body);
  });
});
