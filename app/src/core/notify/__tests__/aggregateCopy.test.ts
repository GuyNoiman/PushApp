/**
 * aggregateCopy — the words of one adaptive aggregate.
 *
 * What matters here is not the sentences (copy changes) but the promises they have to keep: one
 * Journey and several Journeys read as different sentences, the chosen communication style reaches
 * this notification too (D84), a long list stays a readable banner instead of a wall of titles, and
 * NO Step title ever appears — the aggregate is counts plus the user's own Journey titles.
 */
import { changeLanguage } from '@/i18n';
import { buildAggregateCopy } from '@/core/notify/aggregateCopy';
import {
  DEFAULT_COMMUNICATION_PROFILE,
  setCommunicationProfile,
} from '@/core/communication/communicationProfile';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const journeys = (...titles: string[]) =>
  titles.map((journeyTitle, i) => ({ journeyId: `j${i}`, journeyTitle }));

describe('buildAggregateCopy', () => {
  afterEach(async () => {
    setCommunicationProfile(DEFAULT_COMMUNICATION_PROFILE);
    await changeLanguage('en');
  });

  it('names the single Journey when the send speaks for one', () => {
    const copy = buildAggregateCopy({ journeys: journeys('Run 5km'), pendingStepCount: 2 });
    expect(copy?.title).toContain('Run 5km');
    expect(copy?.body).toBeTruthy();
  });

  it('lists the Journeys and their total Step count when it speaks for several', () => {
    const copy = buildAggregateCopy({
      journeys: journeys('Run 5km', 'Read at night'),
      pendingStepCount: 5,
    });
    expect(copy?.body).toContain('Run 5km');
    expect(copy?.body).toContain('Read at night');
    expect(copy?.body).toContain('5');
  });

  it('names at most three Journeys and counts the rest', () => {
    const copy = buildAggregateCopy({
      journeys: journeys('One', 'Two', 'Three', 'Four', 'Five'),
      pendingStepCount: 9,
    });
    expect(copy?.body).toContain('Three');
    expect(copy?.body).not.toContain('Four');
    expect(copy?.body).toContain('2 more');
  });

  it('speaks in the style the user chose', () => {
    const input = { journeys: journeys('Run 5km', 'Read at night'), pendingStepCount: 4 };
    setCommunicationProfile('direct');
    const direct = buildAggregateCopy(input);
    setCommunicationProfile('warm');
    const warm = buildAggregateCopy(input);
    expect(direct?.title).not.toEqual(warm?.title);
    expect(direct?.body).not.toEqual(warm?.body);
  });

  it('sends nothing rather than something blank when there is no Journey to name', () => {
    expect(buildAggregateCopy({ journeys: [], pendingStepCount: 0 })).toBeNull();
    expect(buildAggregateCopy({ journeys: journeys('  '), pendingStepCount: 1 })).toBeNull();
  });

  it('leaves no unresolved placeholder in either language', async () => {
    for (const lang of ['en', 'he'] as const) {
      await changeLanguage(lang);
      const copy = buildAggregateCopy({
        journeys: journeys('Run 5km', 'Read at night', 'Call Dad', 'Stretch'),
        pendingStepCount: 7,
      });
      expect(copy?.title).not.toMatch(/\{\{|aggregate\./);
      expect(copy?.body).not.toMatch(/\{\{|aggregate\./);
    }
  });
});
