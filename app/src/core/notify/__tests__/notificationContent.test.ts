/**
 * notificationContent — the unified notification content service (D40). Proves the full type matrix
 * resolves, form-of-address (D31) selects the right Hebrew variant, missing params degrade safely, the
 * tone seam is an accepted no-op, and — most importantly — the privacy invariant holds: a social-type
 * body carries ONLY a person's display name, never the owner's private free text.
 */
import i18n, { changeLanguage } from '@/i18n';
import enNotify from '@/i18n/resources/en/notify.json';
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

/** The two OWNER-CONTENT types: a person's own Journeys, on their own device. */
const OWNER_TYPES: NotificationType[] = ['reminder', 'aggregate'];

/** The nine Support-Circle types (everything the owner's own content does not reach). */
const SOCIAL_TYPES = NOTIFICATION_TYPE_IDS.filter(
  (t): t is NotificationType => !OWNER_TYPES.includes(t),
);

/** Sample params for any type — social types get a display name; reminder gets owner Journey/Step text. */
function sampleParams<T extends NotificationType>(type: T): NotificationParamsByType[T] {
  if (type === 'reminder') {
    return { journeyTitle: 'Run every morning', stepTitle: 'Lace up and jog 10 min' } as NotificationParamsByType[T];
  }
  if (type === 'aggregate') {
    return {
      journeyTitles: ['Run every morning', 'Read at night'],
      journeyCount: 2,
      pendingStepCount: 3,
    } as NotificationParamsByType[T];
  }
  return { name: 'Dana' } as NotificationParamsByType[T];
}

/** The four communication styles, in PRD §4 order. */
const STYLES = ['direct', 'explanatory', 'warm', 'energizing'] as const;

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
    it('wraps the owner’s Journey title in toned copy, and passes the Step text through', () => {
      const { title, body } = buildNotificationContent(
        'reminder',
        { journeyTitle: 'My Journey', stepTitle: 'My Step' },
        { addressForm: 'neutral' },
      );
      // The title is NO LONGER a raw passthrough. It used to be `title === 'My Journey'`, which
      // short-circuited before the tone lookup — and since every real reminder carries a Journey
      // title, that meant communication style never reached a single notification (the AC#4 gap).
      // The title is now resolved through `reminder.titleFor`, so it carries the user's Journey
      // title AND their chosen tone.
      expect(title).toContain('My Journey');
      expect(title).not.toBe('My Journey');
      expect(title).not.toContain('{{');
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

    it('EVERY toneable type speaks in all four voices, in both languages (D84)', async () => {
      // The founder's decision of 2026-08-26: the style a person chose shapes the wording of every
      // notification, not only the reminder. Before this, ten types were base-only — someone who
      // picked "direct" still got the neutral sentence everywhere but their reminder.
      const toneable = NOTIFICATION_TYPE_IDS.filter((t) => !NOTIFICATION_TYPES[t].neverToned);
      for (const lang of ['en', 'he'] as const) {
        await changeLanguage(lang);
        for (const type of toneable) {
          const params = sampleParams(type);
          const base = buildNotificationContent(type, params, { addressForm: 'neutral' });
          const voices = STYLES.map((styleId) =>
            buildNotificationContent(type, params, { addressForm: 'neutral', styleId }),
          );
          for (const voice of voices) {
            expect(voice.title).not.toContain('{{');
            expect(voice.body).not.toContain('{{');
            // A voice that resolved to the base copy means its variant is missing from the file.
            expect(`${voice.title}|${voice.body}`).not.toBe(`${base.title}|${base.body}`);
          }
          // And the four are distinct from EACH OTHER — four keys pointing at one sentence would
          // pass the check above and still leave the choice meaningless.
          const distinct = new Set(voices.map((v) => `${v.title}|${v.body}`));
          expect(distinct.size).toBe(STYLES.length);
        }
      }
    });

    it('still falls back to base copy when a variant is genuinely missing', () => {
      // The safety net that makes authoring incremental: a missing key resolves the base sentence,
      // never a raw i18n key on somebody's lock screen.
      const base = buildNotificationContent('ally_request', { name: 'Dana' }, { addressForm: 'neutral' });
      i18n.removeResourceBundle('en', 'notify');
      i18n.addResourceBundle('en', 'notify', {
        ...enNotify,
        allyRequest: { title: enNotify.allyRequest.title, body: enNotify.allyRequest.body },
      });
      try {
        const toned = buildNotificationContent(
          'ally_request',
          { name: 'Dana' },
          { addressForm: 'neutral', styleId: 'warm' },
        );
        expect(toned).toEqual(base);
      } finally {
        i18n.removeResourceBundle('en', 'notify');
        i18n.addResourceBundle('en', 'notify', enNotify);
      }
    });

    it('NEVER tones journey_closed, even when a toned variant EXISTS for it', () => {
      // Telling someone a friend stopped a Journey must stay neutral and factual for every reader:
      // a "warm" or "energizing" spin on another person's setback is forced positivity. The
      // catalogue marks the type `neverToned`, so the style is dropped before the key lookup — the
      // guarantee is structural, not "we just didn't write the variants". To prove that, a warm
      // variant is authored here at runtime and must still be ignored.
      expect(NOTIFICATION_TYPES.journey_closed.neverToned).toBe(true);
      const base = buildNotificationContent('journey_closed', { name: 'Dana' }, { addressForm: 'neutral' });
      i18n.addResource('en', 'notify', 'journeyClosed.body_warm', 'Chin up! {{name}} let one go.');
      try {
        for (const styleId of ['direct', 'explanatory', 'warm', 'energizing'] as const) {
          expect(
            buildNotificationContent('journey_closed', { name: 'Dana' }, { addressForm: 'neutral', styleId }),
          ).toEqual(base);
        }
      } finally {
        i18n.removeResourceBundle('en', 'notify');
        i18n.addResourceBundle('en', 'notify', enNotify);
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
      expect(NOTIFICATION_TYPES.aggregate.privacy).toBe('owner-content');
      expect(SOCIAL_TYPES.every((t) => NOTIFICATION_TYPES[t].privacy === 'lock-safe')).toBe(true);
    });
  });
});
