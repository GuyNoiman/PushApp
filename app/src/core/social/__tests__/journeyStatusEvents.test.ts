/**
 * An Ally learns about a pause (R6, D79).
 *
 * The feature is small; the thing that has to be held down is what may NOT ride it. A paused
 * Journey used to vanish from an Ally's view with no explanation, and the fix for that is one step
 * away from becoming a channel for "why" — a reason, a note, a message. So most of this file is the
 * negative test: the insert carries three fields, the row type has no text on it, and the SQL has no
 * column for one either.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildNotifications,
  journeyStatusNotificationId,
  type NotificationFeedInput,
} from '../notifications';
import type { JourneyStatusEvent } from '../SocialGateway';

const event = (over: Partial<JourneyStatusEvent> = {}): JourneyStatusEvent => ({
  id: 'evt_1',
  ownerId: 'owner_1',
  journeyId: 'journey_1',
  kind: 'paused',
  at: 1_700_000_000_000,
  ...over,
});

const feed = (over: Partial<NotificationFeedInput> = {}) =>
  buildNotifications({
    receivedCheers: [],
    friends: [],
    incomingAllyInvites: [],
    readIds: new Set(),
    ...over,
  });

describe('the pause reaches the bell', () => {
  it('turns a pause into a notification attributed to the person who chose it', () => {
    const [item] = feed({ journeyStatusEvents: [event()] });
    expect(item.kind).toBe('journeyPaused');
    expect(item.actorId).toBe('owner_1');
    expect(item.journeyId).toBe('journey_1');
    expect(item.at).toBe(1_700_000_000_000);
  });

  it('turns a resume into its own kind', () => {
    const [item] = feed({ journeyStatusEvents: [event({ kind: 'resumed' })] });
    expect(item.kind).toBe('journeyResumed');
  });

  it('asks nothing of the reader', () => {
    // A pause is news, not a request. Making it actionable would turn "my friend needed a break"
    // into something they have to respond to.
    const [item] = feed({ journeyStatusEvents: [event()] });
    expect(item.actionable).toBe(false);
  });

  it('is read-markable like everything else, and its id is stable', () => {
    const e = event();
    const id = journeyStatusNotificationId(e);
    expect(journeyStatusNotificationId(e)).toBe(id);
    const [item] = feed({ journeyStatusEvents: [e], readIds: new Set([id]) });
    expect(item.read).toBe(true);
  });

  it('sits in the same chronological order as everything else', () => {
    const items = feed({
      journeyStatusEvents: [event({ id: 'old', at: 1000 }), event({ id: 'new', at: 3000 })],
    });
    expect(items.map((i) => i.id)).toEqual(['journeystatus:new', 'journeystatus:old']);
  });

  it('is simply absent when the server sent none', () => {
    expect(feed()).toEqual([]);
    expect(feed({ journeyStatusEvents: [] })).toEqual([]);
  });
});

describe('nothing else rides this row', () => {
  it('the event type carries ids, a kind and a time — and nothing that could hold a sentence', () => {
    expect(Object.keys(event()).sort()).toEqual(['at', 'id', 'journeyId', 'kind', 'ownerId']);
  });

  it('only two kinds exist', () => {
    // A third kind would be a third thing an Ally is told without anyone deciding they should be.
    const kinds: JourneyStatusEvent['kind'][] = ['paused', 'resumed'];
    expect(kinds).toHaveLength(2);
  });

  it('the notification it becomes carries no free text either', () => {
    const [item] = feed({ journeyStatusEvents: [event()] });
    const values = Object.values(item).filter((v) => typeof v === 'string');
    // Every string on it is an id or an enum — nothing a person typed.
    expect(values.every((v) => /^[\w:.-]+$/.test(v))).toBe(true);
  });

  it('the SQL has no column a reason could be written into', () => {
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/0009_journey_status_events.sql'),
      'utf8',
    );
    const table = sql.slice(
      sql.indexOf('create table if not exists public.journey_status_events'),
      sql.indexOf(');', sql.indexOf('create table if not exists public.journey_status_events')),
    );
    for (const forbidden of ['reason', 'note', 'message', 'text ', 'comment', 'body']) {
      // `journey_id text` and `kind text` are the only text columns, and both are matched by name
      // below rather than by type.
      if (forbidden === 'text ') continue;
      expect(table).not.toContain(forbidden);
    }
    const columns = table
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[a-z_]+\s+(uuid|text|timestamptz)/.test(l))
      .map((l) => l.split(/\s+/)[0]);
    expect(columns.sort()).toEqual(['created_at', 'id', 'journey_id', 'kind', 'owner_id']);
  });

  it('the SQL lets only an accepted Ally of that Journey read it, and nobody update it', () => {
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/0009_journey_status_events.sql'),
      'utf8',
    );
    // The read gate reuses `is_ally`, which already carries accepted-status AND still-friends, so
    // this policy cannot drift from the one governing every other Ally read.
    expect(sql).toContain('public.is_ally(journey_id, owner_id, auth.uid())');
    // An event is a record of a moment, not a value: correcting it would make the moment negotiable.
    expect(sql).not.toContain('for update');
  });
});
