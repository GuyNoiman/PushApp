/**
 * TESTER TOOLS — TEMPORARY. REMOVE BEFORE REAL USERS.
 *
 * The founder asked for it on 2026-09-17: a way to see, on his own phone, what the introduction
 * conversation actually built into the Portrait, in the shape it is stored. D111 says the Portrait is
 * never shown in the UI, and that stays true for everybody else — this is a deliberate, temporary
 * exception for testing, recorded in `04_Product/Gap_Register.md` ("Tester tools (temporary)").
 *
 * So it is hidden rather than merely tucked away: tapping Settings › About {@link TESTER_TOOLS_TAPS}
 * times in quick succession turns the tools on, and the same again turns them off. No build flag and
 * no server, just one local key, which an account wipe clears (`accountExport.ts`).
 *
 * ── HOW TO REMOVE IT ───────────────────────────────────────────────────────────────────────────
 *
 * Delete this file, `components/settings/TesterToolsNotice.tsx`, `app/settings/portrait-tester.tsx`,
 * their tests (`state/__tests__/TesterTools.test.tsx`, `app/settings/__tests__/portraitTester.test.tsx`),
 * the `testerTools` block in both `settings.json` files, `AppCore.getPortraitHandoffUsedAt`, and every
 * line that imports from here (the Settings tab and `accountExport.ts`). `tsc` names anything left.
 *
 * No React Native and no UI in this file on purpose: `accountExport.ts` imports the key, and that
 * module has to stay importable without the theme.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/** The one persisted key. Wiped on account deletion (`ACCOUNT_STORAGE_KEYS`). */
export const TESTER_TOOLS_KEY = 'pushapp.testerTools';

/** How many taps in a row flip the tools on or off. */
export const TESTER_TOOLS_TAPS = 7;

/**
 * A pause longer than this between two taps starts the count again, so somebody who opens About now
 * and then over a month never stumbles into it.
 */
export const TESTER_TOOLS_TAP_GAP_MS = 2000;

/** How long the "on" / "off" notice stays up. */
const NOTICE_MS = 2000;

export interface TesterTools {
  /** Whether the tools are on. False until the stored value has loaded. */
  enabled: boolean;
  /** Whether the stored value has been read yet, so a screen can wait rather than flash "locked". */
  loaded: boolean;
  /** One tap on the unlock target. The {@link TESTER_TOOLS_TAPS}th in a row flips `enabled`. */
  tap: () => void;
  /** Which way the last flip went, while its notice is showing; null otherwise. */
  notice: 'on' | 'off' | null;
}

export function useTesterTools(): TesterTools {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<'on' | 'off' | null>(null);
  const taps = useRef({ count: 0, lastAt: 0 });
  const enabledRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(TESTER_TOOLS_KEY);
        if (mounted && raw === 'true') {
          enabledRef.current = true;
          setEnabled(true);
        }
      } catch {
        // A read failure leaves the tools off, which is the safe side to fail on.
      }
      if (mounted) setLoaded(true);
    })();
    return () => {
      mounted = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const tap = useCallback(() => {
    const now = Date.now();
    const state = taps.current;
    state.count = now - state.lastAt > TESTER_TOOLS_TAP_GAP_MS ? 1 : state.count + 1;
    state.lastAt = now;
    if (state.count < TESTER_TOOLS_TAPS) return;

    state.count = 0;
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setNotice(next ? 'on' : 'off');
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
    void AsyncStorage.setItem(TESTER_TOOLS_KEY, next ? 'true' : 'false').catch(() => {
      // Not surviving a reload is the whole cost of a failed write here.
    });
  }, []);

  return { enabled, loaded, tap, notice };
}
