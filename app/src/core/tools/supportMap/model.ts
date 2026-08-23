/**
 * My Support Map — the pure model of who a person would want beside them, in which moments.
 *
 * IT MAPS A PERCEPTION, NOT A FACT, and that distinction runs through every rule here. Putting
 * somebody on this map does not mean they agreed, are available, are safe, or know about it. Nothing
 * in this file creates a friendship, an Ally, a Support Circle membership or a message — the map is
 * a private picture and the social graph is somewhere else entirely (PRD §1, §9).
 *
 * WHY IT STARTS FROM SITUATIONS. A network map that opens with "who is in your life?" produces a
 * clinical diagram and a lot of forgetting. Five vivid moments — a hard day, the edge of giving up,
 * needing a next step, good news, keeping your word — make people REMEMBER, and they surface the
 * thing the exercise is for: that these are usually five different people (PRD §2).
 *
 * A TYPED NAME IS A LABEL, NOT AN ACCOUNT. Manual people are private strings with their own ids.
 * They are never contacts, never shadow users, never searchable, and two identical names are never
 * merged — people know two Michals and the app does not get to decide they are one (PRD §11).
 *
 * EMPTY ROLES ARE PART OF THE RESULT. A role nobody comes to mind for is shown as a gentle gap, and
 * the model treats it as data, never as a deficiency to be fixed by inviting a stranger.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** The five moments, in the order they are asked (PRD §5). */
export const SUPPORT_ROLES = [
  'listening',
  'persistence',
  'advice',
  'celebration',
  'accountability',
] as const;
export type SupportRole = (typeof SUPPORT_ROLES)[number];

/** Where a person on the map came from. */
export type PersonSource = 'friend' | 'manual';

export interface SupportPerson {
  id: string;
  source: PersonSource;
  /** The Support Circle profile id, for someone already in the app. */
  friendId?: string;
  /** What the person called them. For a friend this is a cached display name. */
  label: string;
}

export interface SupportMapRecord {
  id: string;
  people: SupportPerson[];
  /** Person ids per role. A role may hold several people; a person may hold several roles. */
  roles: Record<SupportRole, string[]>;
  status: 'draft' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

export function startMap(id: string, now: number): SupportMapRecord {
  return {
    id,
    people: [],
    roles: { listening: [], persistence: [], advice: [], celebration: [], accountability: [] },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add somebody the person typed. Never merges by name: two people can share one, and deciding they
 * are the same person is not the app's call.
 */
export function addManualPerson(
  map: SupportMapRecord,
  id: string,
  label: string,
  now: number,
): SupportMapRecord {
  const trimmed = label.trim();
  if (trimmed.length === 0) return map;
  return {
    ...map,
    people: [...map.people, { id, source: 'manual', label: trimmed }],
    updatedAt: now,
  };
}

/** Add someone from the Support Circle, or return the map unchanged if they are already on it. */
export function addFriendPerson(
  map: SupportMapRecord,
  id: string,
  friendId: string,
  label: string,
  now: number,
): SupportMapRecord {
  if (map.people.some((p) => p.source === 'friend' && p.friendId === friendId)) return map;
  return {
    ...map,
    people: [...map.people, { id, source: 'friend', friendId, label }],
    updatedAt: now,
  };
}

/** Put somebody in a role, or take them out of it. The same person may hold several. */
export function toggleRole(
  map: SupportMapRecord,
  role: SupportRole,
  personId: string,
  now: number,
): SupportMapRecord {
  const current = map.roles[role];
  const next = current.includes(personId)
    ? current.filter((id) => id !== personId)
    : [...current, personId];
  return { ...map, roles: { ...map.roles, [role]: next }, updatedAt: now };
}

/** Remove somebody from the map entirely, and from every role they held. */
export function removePerson(map: SupportMapRecord, personId: string, now: number): SupportMapRecord {
  const roles = { ...map.roles };
  for (const role of SUPPORT_ROLES) roles[role] = roles[role].filter((id) => id !== personId);
  return {
    ...map,
    people: map.people.filter((p) => p.id !== personId),
    roles,
    updatedAt: now,
  };
}

/** The people in one role, resolved. Ids with no person behind them are skipped, never rendered. */
export function peopleInRole(map: SupportMapRecord, role: SupportRole): SupportPerson[] {
  return map.roles[role]
    .map((id) => map.people.find((p) => p.id === id))
    .filter((p): p is SupportPerson => p !== undefined);
}

/** Every role a person holds — what the map draws around them. */
export function rolesOfPerson(map: SupportMapRecord, personId: string): SupportRole[] {
  return SUPPORT_ROLES.filter((role) => map.roles[role].includes(personId));
}

/** The roles nobody came to mind for. Shown as a gentle gap, never as a warning. */
export function unfilledRoles(map: SupportMapRecord): SupportRole[] {
  return SUPPORT_ROLES.filter((role) => peopleInRole(map, role).length === 0);
}

/**
 * A map may always be confirmed, including an entirely empty one.
 *
 * This function exists to say that out loud rather than to gate anything: "nobody comes to mind" is
 * a true and complete answer, and a tool that refused to save it would be arguing with somebody
 * about their own life (PRD §11).
 */
export function canConfirm(): boolean {
  return true;
}

export function confirmMap(map: SupportMapRecord, now: number): SupportMapRecord {
  return { ...map, status: 'confirmed', confirmedAt: now, updatedAt: now };
}

/** The people who are NOT in the app — the only ones an invitation could ever be about (PRD §8). */
export function invitablePeople(map: SupportMapRecord): SupportPerson[] {
  return map.people.filter((p) => p.source === 'manual');
}

/**
 * The smallest summary that carries the map (PRD §9). Counts and role names only: no names, no
 * friend ids, no pairing of a person to a role. Even this is not read by anything today — the coach,
 * Home, notifications and matching are all excluded by the influence contract.
 */
export interface SupportMapSummary {
  confirmedAt: number;
  mappedRoleCount: number;
  unfilledRoles: SupportRole[];
  inAppFriendCount: number;
  externalLabelCount: number;
}

export function summarise(map: SupportMapRecord, confirmedAt: number): SupportMapSummary {
  return {
    confirmedAt,
    mappedRoleCount: SUPPORT_ROLES.length - unfilledRoles(map).length,
    unfilledRoles: unfilledRoles(map),
    inAppFriendCount: map.people.filter((p) => p.source === 'friend').length,
    externalLabelCount: map.people.filter((p) => p.source === 'manual').length,
  };
}

/**
 * How long a map stays current — ninety days (PRD §9). After that it is still visible and still
 * true as a memory; it is simply labelled ready for review before being used as invitation context,
 * because who you would call changes.
 */
export const MAP_FRESH_DAYS = 90;

export function needsReview(map: SupportMapRecord, now: number): boolean {
  if (!map.confirmedAt) return false;
  return now - map.confirmedAt > MAP_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

export function isSupportMapRecord(value: unknown): value is SupportMapRecord {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Partial<SupportMapRecord>;
  if (typeof m.id !== 'string' || !Array.isArray(m.people)) return false;
  if (typeof m.roles !== 'object' || m.roles === null) return false;
  if (!SUPPORT_ROLES.every((role) => Array.isArray((m.roles as Record<string, unknown>)[role]))) return false;
  return m.status === 'draft' || m.status === 'confirmed';
}
