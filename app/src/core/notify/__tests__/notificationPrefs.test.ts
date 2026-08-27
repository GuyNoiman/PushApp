/**
 * Notification preferences — the switches that used to be a promise and nothing else.
 *
 * `CommunicationPrefs` had been in the model, persisted, migrated and exported since the social
 * pillar landed, and until 2026-08-28 nothing read it and no screen wrote it. These tests hold the
 * two halves of making it true: an OFF switch actually silences its kind, and an ABSENT preference
 * means on — because a person who has never expressed one should keep getting what they already got.
 */
import { buildNotifications } from '../../social/notifications';
import type { Cheer } from '../../social/SocialGateway';
import type { CommunicationPrefs } from '../../types/domain';
import { isKindEnabled, isSettingOn, NOTIFICATION_SETTINGS } from '../notificationPrefs';

const prefs = (over: Partial<CommunicationPrefs> = {}): CommunicationPrefs => ({
  remindersEnabled: true,
  socialCheerEnabled: true,
  socialNudgeEnabled: true,
  locationOptIn: false,
  calendarOptIn: false,
  ...over,
});

const cheer = (over: Partial<Cheer> = {}): Cheer => ({
  id: 'c1',
  fromId: 'friend_1',
  toId: 'me',
  journeyId: 'j1',
  kind: 'cheer',
  createdAt: 1000,
  ...over,
});

const feed = (over: Parameters<typeof buildNotifications>[0] extends infer T ? Partial<T> : never = {}) =>
  buildNotifications({ receivedCheers: [], friends: [], incomingAllyInvites: [], readIds: new Set(), ...over });

describe('isSettingOn', () => {
  it('treats an ABSENT preference as on', () => {
    // The three newest fields are optional so an existing account loads without them.
    expect(isSettingOn(prefs(), 'journeyStatusEnabled')).toBe(true);
    expect(isSettingOn(undefined, 'socialCheerEnabled')).toBe(true);
  });

  it('respects an explicit off', () => {
    expect(isSettingOn(prefs({ socialCheerEnabled: false }), 'socialCheerEnabled')).toBe(false);
  });
});

describe('isKindEnabled', () => {
  it('maps each bell kind onto the switch a person would look for', () => {
    expect(isKindEnabled('cheer', prefs({ socialCheerEnabled: false }))).toBe(false);
    expect(isKindEnabled('nudge', prefs({ socialNudgeEnabled: false }))).toBe(false);
    expect(isKindEnabled('friendRequest', prefs({ socialRequestsEnabled: false }))).toBe(false);
    expect(isKindEnabled('allyInvite', prefs({ socialRequestsEnabled: false }))).toBe(false);
    expect(isKindEnabled('journeyPaused', prefs({ journeyStatusEnabled: false }))).toBe(false);
    expect(isKindEnabled('journeyResumed', prefs({ journeyStatusEnabled: false }))).toBe(false);
    expect(isKindEnabled('mirrorInvite', prefs({ mirrorInvitesEnabled: false }))).toBe(false);
  });

  it('turning one off does not silence the others', () => {
    const only = prefs({ socialCheerEnabled: false });
    expect(isKindEnabled('cheer', only)).toBe(false);
    expect(isKindEnabled('nudge', only)).toBe(true);
    expect(isKindEnabled('allyInvite', only)).toBe(true);
  });

  it('shows a kind nothing governs, rather than hiding it', () => {
    // A new kind added without a switch must appear. Silence-by-default is how a notification
    // quietly stops existing for everybody.
    expect(isKindEnabled('somethingNew' as never, prefs())).toBe(true);
  });
});

describe('the feed honours the switches', () => {
  it('drops a cheer that was switched off', () => {
    expect(feed({ receivedCheers: [cheer()] })).toHaveLength(1);
    expect(feed({ receivedCheers: [cheer()], prefs: prefs({ socialCheerEnabled: false }) })).toEqual([]);
  });

  it('keeps a nudge when only cheers were switched off', () => {
    const items = feed({
      receivedCheers: [cheer({ id: 'c2', kind: 'nudge' })],
      prefs: prefs({ socialCheerEnabled: false }),
    });
    expect(items.map((i) => i.kind)).toEqual(['nudge']);
  });

  it('shows everything when no preferences were given at all', () => {
    expect(feed({ receivedCheers: [cheer()] })).toHaveLength(1);
  });
});

describe('the catalogue of switches', () => {
  it('offers "outside the app" for reminders ONLY, because nothing else can', () => {
    // We hold no push token and there is no server that can reach a phone. Every other kind arrives
    // when the app next asks, so a second switch for it would be a control over something that
    // cannot happen.
    const outside = NOTIFICATION_SETTINGS.filter((s) => s.canLeaveTheApp).map((s) => s.id);
    expect(outside).toEqual(['reminders']);
  });

  it('covers every bell kind exactly once', () => {
    const covered = NOTIFICATION_SETTINGS.flatMap((s) => s.kinds);
    expect([...covered].sort()).toEqual([
      'allyInvite',
      'cheer',
      'friendRequest',
      'journeyPaused',
      'journeyResumed',
      'mirrorInvite',
      'nudge',
    ]);
    expect(new Set(covered).size).toBe(covered.length);
  });
});
