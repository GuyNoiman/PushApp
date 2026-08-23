/**
 * The support map: a private picture that never touches the social graph, never merges two people
 * with one name, and treats "nobody comes to mind" as a real answer.
 */
import {
  addFriendPerson,
  addManualPerson,
  canConfirm,
  confirmMap,
  invitablePeople,
  isSupportMapRecord,
  MAP_FRESH_DAYS,
  needsReview,
  peopleInRole,
  removePerson,
  rolesOfPerson,
  startMap,
  summarise,
  SUPPORT_ROLES,
  toggleRole,
  unfilledRoles,
} from '../model';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function mapWithTwo() {
  let m = startMap('m1', NOW);
  m = addManualPerson(m, 'p1', 'Dana', NOW);
  m = addFriendPerson(m, 'p2', 'friend-9', 'Yuval', NOW);
  return m;
}

describe('the five moments', () => {
  it('are listening, persistence, advice, celebration, accountability', () => {
    expect([...SUPPORT_ROLES]).toEqual([
      'listening',
      'persistence',
      'advice',
      'celebration',
      'accountability',
    ]);
  });
});

describe('people on the map', () => {
  it('never merges two people who share a name', () => {
    let m = startMap('m1', NOW);
    m = addManualPerson(m, 'p1', 'Michal', NOW);
    m = addManualPerson(m, 'p2', 'Michal', NOW);
    expect(m.people).toHaveLength(2);
    expect(m.people[0].id).not.toBe(m.people[1].id);
  });

  it('ignores a blank name', () => {
    expect(addManualPerson(startMap('m1', NOW), 'p1', '   ', NOW).people).toEqual([]);
  });

  it('adds a friend once, however many roles they end up in', () => {
    let m = addFriendPerson(startMap('m1', NOW), 'p1', 'friend-9', 'Yuval', NOW);
    m = addFriendPerson(m, 'p2', 'friend-9', 'Yuval', NOW);
    expect(m.people).toHaveLength(1);
  });

  it('lets one person hold several roles', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'listening', 'p1', NOW);
    m = toggleRole(m, 'celebration', 'p1', NOW);
    expect(rolesOfPerson(m, 'p1')).toEqual(['listening', 'celebration']);
  });

  it('lets one role hold several people', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'advice', 'p1', NOW);
    m = toggleRole(m, 'advice', 'p2', NOW);
    expect(peopleInRole(m, 'advice').map((p) => p.label)).toEqual(['Dana', 'Yuval']);
  });

  it('removing somebody takes them out of every role', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'listening', 'p1', NOW);
    m = toggleRole(m, 'advice', 'p1', NOW);
    m = removePerson(m, 'p1', NOW);
    expect(m.people.map((p) => p.id)).toEqual(['p2']);
    expect(peopleInRole(m, 'listening')).toEqual([]);
  });

  it('skips an id with no person behind it rather than rendering a blank', () => {
    const m = { ...mapWithTwo(), roles: { ...startMap('m', NOW).roles, listening: ['ghost'] } };
    expect(peopleInRole(m, 'listening')).toEqual([]);
  });
});

describe('gaps', () => {
  it('an empty map is a valid, confirmable result', () => {
    const empty = startMap('m1', NOW);
    expect(canConfirm()).toBe(true);
    expect(unfilledRoles(empty)).toEqual([...SUPPORT_ROLES]);
    expect(confirmMap(empty, NOW).status).toBe('confirmed');
  });

  it('names exactly the roles nobody came to mind for', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'listening', 'p1', NOW);
    expect(unfilledRoles(m)).not.toContain('listening');
    expect(unfilledRoles(m)).toHaveLength(SUPPORT_ROLES.length - 1);
  });
});

describe('invitations', () => {
  it('can only ever be about people who are not in the app', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'listening', 'p2', NOW);
    expect(invitablePeople(m).map((p) => p.label)).toEqual(['Dana']);
  });
});

describe('the summary', () => {
  it('carries counts and role names, and no names or friend ids', () => {
    let m = mapWithTwo();
    m = toggleRole(m, 'listening', 'p1', NOW);
    m = toggleRole(m, 'advice', 'p2', NOW);
    const summary = summarise(m, NOW);

    expect(summary).toEqual({
      confirmedAt: NOW,
      mappedRoleCount: 2,
      unfilledRoles: ['persistence', 'celebration', 'accountability'],
      inAppFriendCount: 1,
      externalLabelCount: 1,
    });

    const serialised = JSON.stringify(summary);
    expect(serialised).not.toContain('Dana');
    expect(serialised).not.toContain('Yuval');
    expect(serialised).not.toContain('friend-9');
  });
});

describe('freshness', () => {
  it('asks for a review after ninety days, and stays visible either way', () => {
    const m = confirmMap(mapWithTwo(), NOW);
    expect(needsReview(m, NOW + (MAP_FRESH_DAYS - 1) * DAY)).toBe(false);
    expect(needsReview(m, NOW + (MAP_FRESH_DAYS + 1) * DAY)).toBe(true);
  });

  it('an unconfirmed map never asks for a review', () => {
    expect(needsReview(startMap('m1', NOW), NOW + 999 * DAY)).toBe(false);
  });
});

describe('isSupportMapRecord', () => {
  it('rejects a blob missing one of the five roles', () => {
    const m = mapWithTwo();
    expect(isSupportMapRecord(m)).toBe(true);
    expect(isSupportMapRecord({ ...m, roles: { listening: [] } })).toBe(false);
  });
});
