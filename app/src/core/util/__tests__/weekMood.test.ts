/**
 * The week's summary card. The numbers are computed elsewhere (`core/util/weekByDay.summariseWeek`);
 * what this file holds down is the SENTENCE, because that is the part that could quietly start
 * lying.
 *
 * A summary card is the easiest place in a product to flatter someone. The rule here is that the
 * line reports the week back — wide open, just started, building, strong, finished — and that "well
 * done" is never said to a week that has not happened.
 */
import { moodFor } from '@/core/util/weekByDay';

describe('the sentence the week has earned', () => {
  it('says the week is empty when nothing is planned, not that you did nothing', () => {
    expect(moodFor(0, 0)).toBe('empty');
  });

  it('says it is starting when the week holds Steps and none are done', () => {
    expect(moodFor(0, 5)).toBe('starting');
  });

  it('says building in the middle of a week', () => {
    expect(moodFor(1, 5)).toBe('building');
    expect(moodFor(3, 5)).toBe('building');
  });

  it('only says strong from three quarters of the way', () => {
    expect(moodFor(3, 4)).toBe('strong');
    expect(moodFor(7, 10)).toBe('building');
  });

  it('says complete only when everything planned is done', () => {
    expect(moodFor(5, 5)).toBe('complete');
    expect(moodFor(4, 5)).toBe('strong');
  });

  it('does not break on a count that overshoots its own total', () => {
    expect(moodFor(6, 5)).toBe('complete');
  });
});
