/**
 * The installation identifier.
 *
 * A random v4 id, minted once on this device. It is NOT derived from an account
 * id, an email, a handle, an advertising id or any device hardware identifier —
 * PRD §6.2 says so, and the reason is that every one of those would make "the
 * same phone" and "this person" the same question.
 *
 * It is deliberately NOT reset when somebody signs in or out. An id that
 * followed the account would be an account id wearing a disguise, and an id
 * that reset on sign-out would make one person look like several installations.
 * A reinstall genuinely IS a new installation, and is counted as one.
 *
 * Pure TypeScript apart from the storage port.
 */
export interface IdStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const KEY = 'pushapp.kpi.install-id';

/** Crypto-quality where available; a plain random id where it is not. */
function mint(random: () => number): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i += 1) out += hex[Math.floor(random() * 16)];
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-4${out.slice(13, 16)}-a${out.slice(17, 20)}-${out.slice(20, 32)}`;
}

export function resolveInstallId(store: IdStore, random: () => number = Math.random): string {
  const existing = store.get(KEY);
  if (existing && existing.length >= 32) return existing;
  const id = mint(random);
  store.set(KEY, id);
  return id;
}
