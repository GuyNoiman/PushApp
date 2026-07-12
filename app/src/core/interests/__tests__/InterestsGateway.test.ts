/**
 * Interests gateway tests — the RESERVED, vendor-free boundary (deferred domain).
 * These lock the inertness of the seam: the disabled pillar reads as no-interests
 * (getInterests → []) and setting topics is a no-op. If a future change wires real
 * interests/recommendation logic in, these tests force it through a conscious
 * review (and security-privacy) rather than landing silently.
 */
import { NullInterestsGateway } from '../InterestsGateway';
import { getInterestsGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullInterestsGateway (reserved seam — inert)', () => {
  it('is disabled', () => {
    expect(NullInterestsGateway.enabled).toBe(false);
  });

  it('getInterests returns an empty list (no interests logic yet)', async () => {
    await expect(NullInterestsGateway.getInterests()).resolves.toEqual([]);
  });

  it('setInterests is a no-op that resolves', async () => {
    await expect(NullInterestsGateway.setInterests(['fitness'])).resolves.toBeUndefined();
  });

  it('does not implement the optional recommend() while deferred', () => {
    expect(NullInterestsGateway.recommend).toBeUndefined();
  });
});

describe('getInterestsGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getInterestsGateway()).toBe(getInterestsGateway());
  });

  it('is inert while the reserved flag is off', () => {
    expect(featureFlags.interests).toBe(false);
    expect(getInterestsGateway().enabled).toBe(false);
  });
});
