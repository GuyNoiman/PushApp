/**
 * The installation identifier.
 *
 * A random v4 id, minted once on this device. It is NOT derived from an account
 * id, an email, a handle, an advertising id or any device hardware identifier —
 * PRD §6.2 says so, and the reason is that every one of those would make "the
 * same phone" and "this person" the same question.
 *
 * It is deliberately NOT reset when somebody signs in. An id that followed the
 * account would be an account id wearing a disguise. A reinstall genuinely IS a
 * new installation, and is counted as one.
 *
 * SIGNING OUT NOW REPLACES IT (2026-09-17, Dev_Accounts_And_Restore_Plan Stage 1).
 * This used to say an id reset on sign-out "would make one person look like
 * several installations", and that cost is real and accepted. What changed is
 * what sign-out does: it now wipes the phone back to a fresh install so the next
 * account cannot inherit the last one's data. An id that survived that wipe would
 * be the one thread still joining two accounts' events on one phone, and the
 * once-per-install funnel events would never be counted for the second account.
 * So a switch of account is treated as the new installation it effectively is.
 *
 * Pure TypeScript apart from the storage port.
 */
export interface IdStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Where the id lives. Exported so the one place that loads it and the wipe name the same key. */
export const KPI_INSTALL_ID_KEY = 'pushapp.kpi.install-id';
const KEY = KPI_INSTALL_ID_KEY;

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

/** Mint a new id unconditionally and store it — the switch-of-account case described above. */
export function replaceInstallId(store: IdStore, random: () => number = Math.random): string {
  const id = mint(random);
  store.set(KEY, id);
  return id;
}
