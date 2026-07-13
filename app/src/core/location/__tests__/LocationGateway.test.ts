/**
 * Location gateway tests — the RESERVED, vendor-free boundary (deferred domain).
 * They lock the inertness of the seam: the disabled pillar schedules nothing
 * (watchPlace → null) and clearing is a no-op. If a future change wires a real
 * location gateway in, these tests force it through a conscious review (and
 * security-privacy + store review, red-line R2) rather than landing silently.
 */
import { NullLocationGateway } from '../LocationGateway';
import { getLocationGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullLocationGateway (reserved seam — inert)', () => {
  it('is disabled', () => {
    expect(NullLocationGateway.enabled).toBe(false);
  });

  it('watchPlace returns null (nothing scheduled)', async () => {
    await expect(
      NullLocationGateway.watchPlace({ id: 'p1', transition: 'enter' }),
    ).resolves.toBeNull();
  });

  it('clearPlace is a no-op that resolves', async () => {
    await expect(
      NullLocationGateway.clearPlace({ id: 'p1', transition: 'enter' }),
    ).resolves.toBeUndefined();
  });
});

describe('getLocationGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getLocationGateway()).toBe(getLocationGateway());
  });

  it('is inert while the reserved flag is off', () => {
    expect(featureFlags.location).toBe(false);
    expect(getLocationGateway().enabled).toBe(false);
  });
});
