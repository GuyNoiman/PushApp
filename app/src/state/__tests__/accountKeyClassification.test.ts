/**
 * Every `pushapp.` storage key is either WIPED when the account is switched, or KEPT on purpose.
 *
 * WHY A SCAN AND NOT A LIST (2026-09-17). The deletion key list has already missed things twice: the
 * Tools landed after it was written (2026-08-21), and the conversation budget and trace keys and the
 * messaging device key were found missing while planning account switching. A hand-kept list cannot
 * notice a key it was never told about. So this reads the source, finds every `pushapp.` key that is
 * defined anywhere, and fails for any key nobody has classified. Adding a key now means deciding, in
 * the same commit, whether it belongs to the account or to the phone.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockForgetDeviceKeys = jest.fn(async () => {});
const mockStartNewKpiInstallation = jest.fn(async () => 'new-id');
jest.mock('@/core/messaging', () => ({ forgetDeviceKeys: () => mockForgetDeviceKeys() }));
jest.mock('@/core/kpi/wireKpi', () => ({
  KPI_ONCE_PREFIX: 'pushapp.kpi.once.',
  startNewKpiInstallation: () => mockStartNewKpiInstallation(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { KPI_INSTALL_ID_KEY } from '@/core/kpi/installId';
import { KPI_ONCE_PREFIX } from '@/core/kpi/wireKpi';
import { BUDGET_KEY_PREFIX } from '@/core/llm/conversationBudgetStore';
import { TRACE_KEY_PREFIX } from '@/core/llm/conversationTrace';
import {
  CIPHERTEXT_KEY,
  DEK_STORE_KEY,
  LEGACY_CIPHERTEXT_KEY,
  LEGACY_DEK_STORE_KEY,
} from '@/core/persistence/EncryptedLocalRepository';
import { FIRST_RUN_CONSUMED_KEY } from '@/core/persistence/firstRunFlag';
import { STORAGE_KEY } from '@/core/persistence/LocalRepository';
import { QUARANTINE_KEY_PREFIX, RECOVERY_MARKER_KEY } from '@/core/persistence/quarantine';
import {
  ACCOUNT_STORAGE_KEYS,
  ACCOUNT_STORAGE_PREFIXES,
  DEVICE_PREFERENCE_KEYS,
  SWITCH_ACCOUNT_STORAGE_KEYS,
} from '@/state/accountExport';
import { wipeForAccountSwitch } from '@/state/accountWipe';
import { LANGUAGE_PREFERENCE_KEY } from '@/state/LanguagePreference';
import { PROFILE_KEY } from '@/state/ProfileProvider';
import { TESTER_TOOLS_KEY } from '@/state/TesterTools';
import { THEME_PREFERENCE_KEY } from '@/state/ThemePreference';
import { TOOL_RECORD_STORAGE_KEYS } from '@/state/ToolRecordsStore';

/** `components/home/UpdateAppliedNotice.tsx` — named here rather than imported, to keep the UI out. */
const UPDATE_SEEN_KEY = 'pushapp.updateSeen.v1';
/** `core/messaging/index.ts` — in the secure store, removed by `forgetDeviceKeys`. */
const MESSAGE_DEVICE_KEY = 'pushapp.messageDeviceKey.v1';

/** Removed by exact key, by `accountWipe.wipeForAccountSwitch`. */
const WIPED_EXACT: readonly string[] = [...SWITCH_ACCOUNT_STORAGE_KEYS, MESSAGE_DEVICE_KEY];
/** Removed by prefix, by `accountWipe.wipeForAccountSwitch` (and `startNewKpiInstallation`). */
const WIPED_PREFIXES: readonly string[] = [...ACCOUNT_STORAGE_PREFIXES, KPI_ONCE_PREFIX];
/** Replaced rather than removed: a switch of account is a new installation for measurement. */
const REPLACED: readonly string[] = [KPI_INSTALL_ID_KEY];
/** Removed by `AppCore.resetToFirstRun` → `Repository.clear()` (state, keys, quarantine). */
const WIPED_BY_CORE_RESET: readonly string[] = [
  STORAGE_KEY,
  CIPHERTEXT_KEY,
  DEK_STORE_KEY,
  LEGACY_CIPHERTEXT_KEY,
  LEGACY_DEK_STORE_KEY,
  RECOVERY_MARKER_KEY,
];
const WIPED_BY_CORE_RESET_PREFIXES: readonly string[] = [QUARANTINE_KEY_PREFIX];
/**
 * KEPT, each for a reason:
 *  · language and theme describe the phone and the person holding it, not the account;
 *  · `firstRunConsumed` is what stops the demo Journeys being seeded into a wiped phone;
 *  · `updateSeen` is which over-the-air update this phone has already announced — a fact about the
 *    installed app, and announcing it again to the next account would be noise.
 */
const KEPT: readonly string[] = [...DEVICE_PREFERENCE_KEYS, FIRST_RUN_CONSUMED_KEY, UPDATE_SEEN_KEY];
/** Keys built at runtime from a prefix, and the generated list that must cover every one of them. */
const GENERATED: Record<string, readonly string[]> = { 'pushapp.tool.': TOOL_RECORD_STORAGE_KEYS };

const SRC = join(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

/** Every `pushapp.` key written in quotes or backticks anywhere in the app source. */
function definedKeys(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/['"`](pushapp\.[A-Za-z0-9._-]+)/g)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

function classify(key: string): string | null {
  if (WIPED_EXACT.includes(key)) return 'wiped';
  if (WIPED_PREFIXES.some((prefix) => key.startsWith(prefix))) return 'wiped';
  if (REPLACED.includes(key)) return 'replaced';
  if (WIPED_BY_CORE_RESET.includes(key)) return 'core reset';
  if (WIPED_BY_CORE_RESET_PREFIXES.some((prefix) => key.startsWith(prefix))) return 'core reset';
  if (KEPT.includes(key)) return 'kept';
  if (key in GENERATED) return 'wiped (generated)';
  return null;
}

describe('every pushapp. key is classified', () => {
  const keys = definedKeys();

  it('finds the keys it is supposed to be guarding (the scan itself works)', () => {
    expect(keys).toEqual(expect.arrayContaining([PROFILE_KEY, TESTER_TOOLS_KEY, BUDGET_KEY_PREFIX, TRACE_KEY_PREFIX]));
    expect(keys.length).toBeGreaterThan(20);
  });

  it('has no key that is neither wiped nor deliberately kept', () => {
    const unclassified = keys.filter((key) => classify(key) === null);
    // A failure here names the key. Decide whether it belongs to the account (add it to
    // ACCOUNT_STORAGE_KEYS in state/accountExport.ts) or to the phone (add it to KEPT above, with why).
    expect(unclassified).toEqual([]);
  });

  it('covers every generated key with the generated list', () => {
    for (const [prefix, generated] of Object.entries(GENERATED)) {
      expect(generated.length).toBeGreaterThan(0);
      for (const key of generated) {
        expect(key.startsWith(prefix)).toBe(true);
        expect(SWITCH_ACCOUNT_STORAGE_KEYS).toContain(key);
      }
    }
  });

  it('never both wipes and keeps a key', () => {
    for (const key of KEPT) expect(WIPED_EXACT).not.toContain(key);
  });
});

describe('what a switch keeps and what deletion keeps', () => {
  it('a switch keeps language and theme; deletion keeps nothing', () => {
    expect(SWITCH_ACCOUNT_STORAGE_KEYS).not.toContain(LANGUAGE_PREFERENCE_KEY);
    expect(SWITCH_ACCOUNT_STORAGE_KEYS).not.toContain(THEME_PREFERENCE_KEY);
    expect(ACCOUNT_STORAGE_KEYS).toContain(LANGUAGE_PREFERENCE_KEY);
    expect(ACCOUNT_STORAGE_KEYS).toContain(THEME_PREFERENCE_KEY);
    expect(SWITCH_ACCOUNT_STORAGE_KEYS).toHaveLength(ACCOUNT_STORAGE_KEYS.length - 2);
  });
});

describe('wipeForAccountSwitch on a real (mock) storage', () => {
  it('removes the account keys and prefixes, keeps the phone keys, and starts a new installation', async () => {
    const accountKeys = [...SWITCH_ACCOUNT_STORAGE_KEYS];
    const prefixed = [`${BUDGET_KEY_PREFIX}introduction`, `${TRACE_KEY_PREFIX}planning`];
    const phoneKeys = [...KEPT];
    await AsyncStorage.multiSet([...accountKeys, ...prefixed, ...phoneKeys].map((key) => [key, 'x']));

    await wipeForAccountSwitch();

    const left = await AsyncStorage.getAllKeys();
    for (const key of [...accountKeys, ...prefixed]) expect(left).not.toContain(key);
    for (const key of phoneKeys) expect(left).toContain(key);
    expect(mockForgetDeviceKeys).toHaveBeenCalledTimes(1);
    expect(mockStartNewKpiInstallation).toHaveBeenCalledTimes(1);
  });
});
