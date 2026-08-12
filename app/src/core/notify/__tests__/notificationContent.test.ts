/**
 * notificationContent — the unified notification content service (D40). Proves the full type matrix
 * resolves, form-of-address (D31) selects the right Hebrew variant, missing params degrade safely, the
 * tone seam is an accepted no-op, and — most importantly — the privacy invariant holds: a social-type
 * body carries ONLY a person's display name, never the owner's private free text.
 */
import { changeLanguage } from '@/i18n';
import { buildNotificationContent } from '@/core/notify/notificationContent';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_IDS,
  type NotificationParamsByType,
  type NotificationType,
} from '@/core/notify/notificationTypes';

// expo-localization has no JS impl under jest — boot the i18n core deterministically on English.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

/** The nine Support-Circle types (everything but the shipped reminder). */
const SOCIAL_TYPES = NOTIFICATION_TYPE_IDS.filter((t): t is NotificationType => t !== 'reminder');

/** Sample params for any type — social types get a display name; reminder gets owner Journey/Step text. */
function sampleParams<T extends NotificationType>(type: T): NotificationParamsByType[T] {
  if (type === 'reminder') {
    return { journeyTitle: 'Run every morning', stepTitle: 'Lace up and jog 10 min' } as NotificationParamsByType[T];
  }
  return { name: 'Dana' } as NotificationParamsByType[T];
}

describe('buildNotificationContent', () => {
  afterEach(async () => {
    await changeLanguage('en');
  });

  describe('type matrix', () => {
    for (const type of NOTIFICATION_TYPE_IDS) {
      it(`"${type}" resolves to non-empty title + body with no unresolved placeholders`, () => {
        const spec = NOTIFICATION_TYPES[type];
        const { title, body } = buildNotificationContent(type, sampleParams(type), { addressForm: 'neutral' });

        expect(title.length).toBeGreaterThan(0);
        expect(body.length).toBeGreaterThan(0);
        // No raw interpolation slots survived.
        expect(title).not.toContain('{{');
        expect(body).not.toContain('{{');
        // Keys exist — i18next returns the key string itself when a key is missing.
        expect(title).not.toBe(`${spec.keyGroup}.title`);
        expect(body).not.toBe(`${spec.keyGroup}.body`);
      });
    }
  });

  describe('form of address (D31)', () => {
    it('neutral / feminine / masculine select distinct Hebrew reminder bodies', async () => {
      await changeLanguage('he');
      const neutral = buildNotificationContent('reminder', {}, { addressForm: 'neutral' }).body;
      const feminine = buildNotificationContent('reminder', {}, { addressForm: 'feminine' }).body;
      const masculine = buildNotificationContent('reminder', {}, { addressForm: 'masculine' }).body;

      expect(feminine).not.toBe(masculine);
      expect(feminine).not.toBe(neutral);
      expect(masculine).not.toBe(neutral);
    });

    it('English has no gendered address, so every form yields the same body', () => {
      const neutral = buildNotificationContent('reminder', {}, { addressForm: 'neutral' }).body;
      const feminine = buildNotificationContent('reminder', {}, { addressForm: 'feminine' }).body;
      expect(feminine).toBe(neutral);
    });
  });

  describe('reminder is owner-content passthrough', () => {
    it('uses the owner’s own Journey/Step text when present', () => {
      const { title, body } = buildNotificationContent(
        'reminder',
        { journeyTitle: 'My Journey', stepTitle: 'My Step' },
        { addressForm: 'neutral' },
      );
      expect(title).toBe('My Journey');
      expect(body).toBe('My Step');
    });

    it('falls back to a gentle localized nudge when no owner text is given', () => {
      const { title, body } = buildNotificationContent('reminder', {}, { addressForm: 'neutral' });
      expect(title.length).toBeGreaterThan(0);
      expect(body.length).toBeGreaterThan(0);
      expect(title).not.toBe('reminder.title');
    });
  });

  describe('missing-param safety', () => {
    it('a blank display name degrades to a generic, never a raw {{name}}', () => {
      for (const type of SOCIAL_TYPES) {
        const { body } = buildNotificationContent(type, { name: '' }, { addressForm: 'neutral' });
        expect(body).not.toContain('{{');
        expect(body.toLowerCase()).toContain('someone');
      }
    });
  });

  describe('communication style / tone (D40)', () => {
    it('resolves the reminder toned variant for the chosen style (fallback nudge)', () => {
      const base = buildNotificationContent('reminder', {}, { addressForm: 'neutral' });
      const warm = buildNotificationContent('reminder', {}, { addressForm: 'neutral', styleId: 'warm' });
      const direct = buildNotificationContent('reminder', {}, { addressForm: 'neutral', styleId: 'direct' });

      // Each style yields its own toned copy, distinct from the base and from each other.
      expect(warm.body).not.toBe(base.body);
      expect(direct.body).not.toBe(base.body);
      expect(warm.body).not.toBe(direct.body);
      expect(warm.title.length).toBeGreaterThan(0);
      expect(warm.body).not.toContain('{{');
    });

    it('falls back to base copy for a type that has no toned variant yet', () => {
      // The social types have no toned variants authored yet — every style resolves the base copy.
      const base = buildNotificationContent('ally_request', { name: 'Dana' }, { addressForm: 'neutral' });
      for (const styleId of ['direct', 'explanatory', 'warm', 'energizing'] as const) {
        const toned = buildNotificationContent('ally_request', { name: 'Dana' }, { addressForm: 'neutral', styleId });
        expect(toned).toEqual(base);
      }
    });

    it('still applies form of address on top of a toned variant (D31 × D40)', async () => {
      await changeLanguage('he');
      const feminine = buildNotificationContent('reminder', {}, { addressForm: 'feminine', styleId: 'warm' }).body;
      const masculine = buildNotificationContent('reminder', {}, { addressForm: 'masculine', styleId: 'warm' }).body;
      expect(feminine).not.toBe(masculine);
    });
  });

  describe('privacy invariant (G1 + Support Circle §7)', () => {
    // Owner-private strings that must NEVER surface in a social-type notification body.
    const OWNER_PRIVATE = ['Run every morning', 'Lace up and jog', 'because I felt anxious', 'my reason note'];

    it('social types accept ONLY a display name — no Journey/Step/reason params exist', () => {
      for (const type of SOCIAL_TYPES) {
        expect(NOTIFICATION_TYPES[type].params).toEqual(['name']);
        expect(NOTIFICATION_TYPES[type].privacy).toBe('lock-safe');
      }
    });

    it('a social body contains only the friend’s name in a fixed template', () => {
      for (const type of SOCIAL_TYPES) {
        const { body } = buildNotificationContent(type, { name: 'Dana' }, { addressForm: 'neutral' });
        // The name is the only variable; no owner private content can appear (the param contract forbids it).
        for (const secret of OWNER_PRIVATE) {
          expect(body).not.toContain(secret);
        }
      }
    });

    it('only the reminder is owner-content; every social type is lock-safe', () => {
      expect(NOTIFICATION_TYPES.reminder.privacy).toBe('owner-content');
      expect(SOCIAL_TYPES.every((t) => NOTIFICATION_TYPES[t].privacy === 'lock-safe')).toBe(true);
    });
  });
});
