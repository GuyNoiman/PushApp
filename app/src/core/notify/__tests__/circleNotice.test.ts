/**
 * circleNotice — the Support-Circle notice sent when the owner stops a Journey (founder decision,
 * 2026-08-14). These tests pin the three things that make the notice safe to send:
 *
 *  · LOCK-SAFETY — it carries a display name and NOTHING else. Not by convention: there is no field
 *    on the notice, and no param on `journey_closed`, that a Journey title could travel in. So a
 *    friend's lock screen can learn that someone stopped a Journey, never WHICH Journey.
 *  · WHO — only ACCEPTED members. A person who never answered the invite never saw the Journey.
 *  · BEST-EFFORT — delivery is a consequence of an action that already committed, so a missing or
 *    throwing sink is swallowed and never propagates back to the cancel.
 */
import {
  buildJourneyClosedNotice,
  deliverCircleNotice,
  setCircleNoticeSink,
  type CircleNotice,
} from '../circleNotice';
import { NOTIFICATION_TYPES } from '../notificationTypes';
import type { AllyMember, SocialProfile } from '@/core/social/SocialGateway';

function profile(id: string, over: Partial<SocialProfile> = {}): SocialProfile {
  return { id, handle: id, buddySummary: {}, ...over };
}

function member(id: string, status: AllyMember['status']): AllyMember {
  return { profile: profile(id), bundle: 'encourager', status };
}

afterEach(() => setCircleNoticeSink(null));

describe('buildJourneyClosedNotice', () => {
  it('notifies the ACCEPTED members only', () => {
    const notice = buildJourneyClosedNotice(
      [
        member('a1', 'accepted'),
        member('a2', 'accepted'),
        member('a3', 'requested'),
        member('a4', 'declined'),
      ],
      profile('me', { handle: 'sam' }),
    );

    expect(notice?.recipientIds).toEqual(['a1', 'a2']);
  });

  it('returns null when nobody accepted — there is no notice with no recipients', () => {
    expect(buildJourneyClosedNotice([], profile('me'))).toBeNull();
    expect(buildJourneyClosedNotice([member('a3', 'requested')], profile('me'))).toBeNull();
  });

  it('collapses a duplicated member row to ONE recipient', () => {
    const notice = buildJourneyClosedNotice(
      [member('a1', 'accepted'), member('a1', 'accepted')],
      profile('me'),
    );
    expect(notice?.recipientIds).toEqual(['a1']);
  });

  it('uses the owner’s Buddy name, else their @handle', () => {
    const named = buildJourneyClosedNotice(
      [member('a1', 'accepted')],
      profile('me', { handle: 'sam', buddySummary: { name: 'Dana' } }),
    );
    expect(named?.params.name).toBe('Dana');

    const handled = buildJourneyClosedNotice([member('a1', 'accepted')], profile('me', { handle: 'sam' }));
    expect(handled?.params.name).toBe('@sam');
  });

  it('leaves the name EMPTY when the owner is unknown, so the reader’s device localizes "someone"', () => {
    const notice = buildJourneyClosedNotice([member('a1', 'accepted')], null);
    expect(notice?.params.name).toBe('');
  });
});

describe('circleNotice — lock safety', () => {
  it('carries the display name and nothing else', () => {
    const notice = buildJourneyClosedNotice(
      [member('a1', 'accepted')],
      profile('me', { buddySummary: { name: 'Dana' } }),
    )!;

    expect(Object.keys(notice.params)).toEqual(['name']);
    expect(Object.keys(notice).sort()).toEqual(['params', 'recipientIds', 'type']);
    // The catalogue backs it up: journey_closed interpolates a name, is lock-safe, and is never toned.
    expect(NOTIFICATION_TYPES.journey_closed.params).toEqual(['name']);
    expect(NOTIFICATION_TYPES.journey_closed.privacy).toBe('lock-safe');
    expect(NOTIFICATION_TYPES.journey_closed.neverToned).toBe(true);
  });

  it('cannot carry the Journey it is about — nothing but the type, the recipients and the name', () => {
    const notice = buildJourneyClosedNotice(
      [member('a1', 'accepted')],
      profile('me', { buddySummary: { name: 'Dana' } }),
    )!;
    // The builder is never handed the Journey at all, so its every serialized value is accounted
    // for: the catalogued type id, the recipient ids, and the display name. Nothing else exists to
    // leak — which is what makes the lock screen safe by construction, not by copy discipline.
    expect(JSON.parse(JSON.stringify(notice))).toEqual({
      type: 'journey_closed',
      recipientIds: ['a1'],
      params: { name: 'Dana' },
    });
  });
});

describe('deliverCircleNotice', () => {
  const notice: CircleNotice = { type: 'journey_closed', recipientIds: ['a1'], params: { name: 'Dana' } };

  it('hands the notice to the registered sink', async () => {
    const sink = jest.fn();
    setCircleNoticeSink(sink);

    await deliverCircleNotice(notice);

    expect(sink).toHaveBeenCalledWith(notice);
  });

  it('is a silent no-op with no sink registered (the delivery backend has not landed)', async () => {
    await expect(deliverCircleNotice(notice)).resolves.toBeUndefined();
  });

  it('swallows a throwing sink — a notice never fails the action it followed', async () => {
    setCircleNoticeSink(() => {
      throw new Error('offline');
    });
    await expect(deliverCircleNotice(notice)).resolves.toBeUndefined();

    setCircleNoticeSink(async () => {
      throw new Error('server said no');
    });
    await expect(deliverCircleNotice(notice)).resolves.toBeUndefined();
  });
});
