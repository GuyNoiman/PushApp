/**
 * communicationProfile — proves the pure preference + scoring (PRD §7): votes tally, a plurality
 * wins, ties leave `primary` null for the conditional tie-break page, the deterministic `breakTie`
 * settles a draw without hidden weighting, the persisted id shape validates untrusted input, and the
 * applied-style accessor the framework-free layer reads defaults and round-trips correctly.
 */
import {
  COMMUNICATION_PROFILE_IDS,
  DEFAULT_COMMUNICATION_PROFILE,
  breakTie,
  getCommunicationProfile,
  isCommunicationProfileId,
  leadingStyles,
  profileToCoachStyle,
  scoreAnswers,
  setCommunicationProfile,
  tallyVotes,
  type CommunicationProfileId,
} from '@/core/communication/communicationProfile';

describe('communicationProfile', () => {
  describe('registry + default', () => {
    it('exposes exactly the four PRD §4 styles', () => {
      expect([...COMMUNICATION_PROFILE_IDS]).toEqual(['direct', 'explanatory', 'warm', 'energizing']);
    });

    it('defaults to Warm (PRD §7 Default)', () => {
      expect(DEFAULT_COMMUNICATION_PROFILE).toBe('warm');
    });
  });

  // Declared before every other block that could touch the module value, so the "before any set"
  // assertion below is genuinely reading a fresh module (jest runs tests in declaration order).
  describe('applied-style accessor (what the framework-free layer reads)', () => {
    afterEach(() => {
      setCommunicationProfile(DEFAULT_COMMUNICATION_PROFILE);
    });

    it('reads the Warm default before anything sets it', () => {
      expect(getCommunicationProfile()).toBe(DEFAULT_COMMUNICATION_PROFILE);
      expect(getCommunicationProfile()).toBe('warm');
    });

    it('round-trips every style id', () => {
      for (const id of COMMUNICATION_PROFILE_IDS) {
        setCommunicationProfile(id);
        expect(getCommunicationProfile()).toBe(id);
      }
    });

    it('only a validated id can ever reach it (the guard is the gate)', () => {
      // The ProfileProvider normalizes through `isCommunicationProfileId` before mirroring, so a
      // persisted Coach voice id or garbage never becomes the applied style.
      const stored: unknown = 'steady';
      setCommunicationProfile(isCommunicationProfileId(stored) ? stored : DEFAULT_COMMUNICATION_PROFILE);
      expect(getCommunicationProfile()).toBe('warm');
    });
  });

  describe('isCommunicationProfileId', () => {
    it('accepts the four ids and rejects everything else (incl. Coach voice ids)', () => {
      for (const id of COMMUNICATION_PROFILE_IDS) expect(isCommunicationProfileId(id)).toBe(true);
      // `direct` collides by name with the Coach enum but is a valid profile id; the others don't.
      expect(isCommunicationProfileId('steady')).toBe(false);
      expect(isCommunicationProfileId('gentle')).toBe(false);
      expect(isCommunicationProfileId('spark')).toBe(false);
      expect(isCommunicationProfileId(undefined)).toBe(false);
      expect(isCommunicationProfileId(null)).toBe(false);
      expect(isCommunicationProfileId(3)).toBe(false);
      expect(isCommunicationProfileId('')).toBe(false);
    });
  });

  describe('tallyVotes', () => {
    it('counts one vote per answer and ignores unanswered pages', () => {
      const votes = tallyVotes(['warm', 'warm', undefined, 'direct', undefined, 'warm']);
      expect(votes).toEqual({ direct: 1, explanatory: 0, warm: 3, energizing: 0 });
    });
  });

  describe('scoreAnswers', () => {
    it('picks the plurality style as primary (PRD §7.3)', () => {
      const answers: CommunicationProfileId[] = ['warm', 'warm', 'direct', 'warm', 'energizing', 'direct'];
      const { primary, leaders } = scoreAnswers(answers);
      expect(primary).toBe('warm');
      expect(leaders).toEqual(['warm']);
    });

    it('leaves primary null on a tie so the UI can run the tie-break page', () => {
      const answers: CommunicationProfileId[] = ['warm', 'warm', 'direct', 'direct', 'energizing', 'explanatory'];
      const { primary, leaders } = scoreAnswers(answers);
      expect(primary).toBeNull();
      expect(leaders.sort()).toEqual(['direct', 'warm']);
    });

    it('reports no leaders when nothing was answered', () => {
      const { primary, leaders } = scoreAnswers([undefined, undefined, undefined, undefined, undefined, undefined]);
      expect(primary).toBeNull();
      expect(leaders).toEqual([]);
    });
  });

  describe('leadingStyles', () => {
    it('returns all styles sharing the max vote count', () => {
      const leaders = leadingStyles({ direct: 2, explanatory: 2, warm: 1, energizing: 0 });
      expect(leaders.sort()).toEqual(['direct', 'explanatory']);
    });
  });

  describe('breakTie (deterministic fallback, PRD §7 Ties)', () => {
    it('prefers the Warm default when it shares the lead', () => {
      expect(breakTie(['direct', 'warm'])).toBe('warm');
      expect(breakTie(['warm', 'energizing'])).toBe('warm');
    });

    it('falls to the first tied style in registry order when the default is not tied', () => {
      expect(breakTie(['explanatory', 'energizing'])).toBe('explanatory');
      expect(breakTie(['energizing', 'direct'])).toBe('direct');
    });

    it('returns the default when there are no leaders', () => {
      expect(breakTie([])).toBe(DEFAULT_COMMUNICATION_PROFILE);
    });
  });

  describe('profileToCoachStyle (seam — not wired into the live Coach)', () => {
    it('maps every profile id to a valid Coach voice id', () => {
      expect(profileToCoachStyle('direct')).toBe('direct');
      expect(profileToCoachStyle('warm')).toBe('gentle');
      expect(profileToCoachStyle('energizing')).toBe('spark');
      expect(profileToCoachStyle('explanatory')).toBe('steady');
    });
  });
});
