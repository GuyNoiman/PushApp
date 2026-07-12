/**
 * Profile gateway tests — the RESERVED, vendor-free boundary (deferred domain).
 * These lock the inertness of the seam: the disabled pillar reads as no-profile
 * (getProfile → null) and recording a signal is a no-op. If a future change wires
 * real profiling logic in, these tests force it through a conscious review (and
 * security-privacy) rather than landing silently.
 */
import { NullProfileGateway, type UserProfile } from '../ProfileGateway';
import { getProfileGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullProfileGateway (reserved seam — inert)', () => {
  it('is disabled', () => {
    expect(NullProfileGateway.enabled).toBe(false);
  });

  it('getProfile returns null (no profiling logic yet)', async () => {
    await expect(NullProfileGateway.getProfile()).resolves.toBeNull();
  });

  it('recordSignal is a no-op that resolves', async () => {
    await expect(NullProfileGateway.recordSignal({ kind: 'noop' })).resolves.toBeUndefined();
  });

  it('UserProfile carries no PII (derived traits only)', () => {
    // Compile-time guard mirrored as a runtime shape check: only derived fields.
    const p: UserProfile = { preferredTimeOfDay: null, consistency: null };
    expect(Object.keys(p).sort()).toEqual(['consistency', 'preferredTimeOfDay']);
  });
});

describe('getProfileGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getProfileGateway()).toBe(getProfileGateway());
  });

  it('is inert while the reserved flag is off', () => {
    expect(featureFlags.profile).toBe(false);
    expect(getProfileGateway().enabled).toBe(false);
  });
});
