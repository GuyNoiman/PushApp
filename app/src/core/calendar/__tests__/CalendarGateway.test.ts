/**
 * Calendar gateway tests — the RESERVED, vendor-free boundary (deferred domain).
 * They lock the inertness of the seam: the disabled pillar schedules nothing
 * (watchEvents → null) and clearing is a no-op. If a future change wires a real
 * calendar gateway in, these tests force it through a conscious review (and
 * security-privacy + store review, red-line R2) rather than landing silently.
 */
import { NullCalendarGateway } from '../CalendarGateway';
import { getCalendarGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullCalendarGateway (reserved seam — inert)', () => {
  it('is disabled', () => {
    expect(NullCalendarGateway.enabled).toBe(false);
  });

  it('watchEvents returns null (nothing scheduled)', async () => {
    await expect(
      NullCalendarGateway.watchEvents({ id: 'w1', minutesBefore: 10 }),
    ).resolves.toBeNull();
  });

  it('clearWatch is a no-op that resolves', async () => {
    await expect(
      NullCalendarGateway.clearWatch({ id: 'w1', minutesBefore: 10 }),
    ).resolves.toBeUndefined();
  });
});

describe('getCalendarGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getCalendarGateway()).toBe(getCalendarGateway());
  });

  it('is inert while the reserved flag is off', () => {
    expect(featureFlags.calendar).toBe(false);
    expect(getCalendarGateway().enabled).toBe(false);
  });
});
