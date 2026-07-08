/**
 * buddyStages config tests — pure TS. The stage→display-name lookup backs the
 * Buddy evolution reveal (surfaced via the AppCore facade), so it must stay in
 * sync with BUDDY_STAGES data (Engineering Bible §3 configuration-before-code).
 */
import { BUDDY_STAGES, stageDisplayName } from '../buddyStages';

describe('stageDisplayName', () => {
  it('returns the configured display name for every known stage', () => {
    for (const def of BUDDY_STAGES) {
      expect(stageDisplayName(def.stage)).toBe(def.displayName);
    }
  });

  it('maps the named stages to their human labels', () => {
    expect(stageDisplayName('egg')).toBe('Egg');
    expect(stageDisplayName('hatchling')).toBe('Hatchling');
    expect(stageDisplayName('guardian')).toBe('Guardian');
  });
});
