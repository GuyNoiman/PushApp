/**
 * AccountScope — how the app lets go of an account's data held in memory, after that account has
 * been switched away from or deleted.
 *
 * THE PROBLEM (2026-09-17, `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`). A switch or a
 * deletion wipes the phone's storage, but the Profile store, the Tools stores, the celebration switch
 * and every screen-level hook (the tester flag, the Communication Style questionnaire) still hold the
 * previous person's data in memory, and would show it, or write it back, until the app restarts.
 *
 * DECIDED: RESTART. At the very end of `switchAccount()` and of Delete account, once the resume point
 * is saved and every write has landed, the app relaunches with the same `restartApp()` a language
 * change uses. It is the only approach that guarantees no store anywhere still holds the old account,
 * including stores nobody has written yet. From just before the wipe until the relaunch, the account
 * stores cannot write at all (`accountStoreWrites.ts`).
 *
 * THE FALLBACK, where the app cannot relaunch itself (web, Expo Go, jest): everything inside this
 * component is mounted again from scratch, by changing a key. In the root layout that covers the
 * celebration switch, the Profile store, the Tools shelf, the Life Wheel, Values, Passion Map,
 * Reflections and tool-records stores, Messaging, the backup provider, and every screen with its
 * hooks. It does NOT cover what sits above it: the core (already reset by then), the session and the
 * stores that follow it (Auth, Entitlement, Social, which reload when the account id changes), and
 * language and theme, which belong to the phone and are kept on purpose. The write hold is released
 * once the new stores are mounted, because by then there is nothing old left in memory to write.
 */
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { canRestartApp, restartApp } from '@/i18n/restart';
import { releaseAccountStoreWrites } from '@/state/accountStoreWrites';

/** How the app let go of the previous account: a real relaunch, or the in-place fallback. */
export type AccountRestart = 'restarted' | 'remounted';

interface AccountScopeValue {
  /** Mount everything inside the scope again from scratch. */
  remount(): void;
}

/** Outside the scope (a test rendering one hook) there is nothing to mount again. */
const AccountScopeContext = createContext<AccountScopeValue>({ remount: () => {} });

export function AccountScope({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);

  // After the commit that replaced the old stores with fresh ones. Not before it: until the old ones
  // are unmounted, a tap could still reach them, and what they would write is the last account's.
  useEffect(() => {
    if (generation > 0) releaseAccountStoreWrites();
  }, [generation]);

  const remount = useCallback(() => setGeneration((current) => current + 1), []);
  const value = useMemo<AccountScopeValue>(() => ({ remount }), [remount]);

  return (
    <AccountScopeContext.Provider value={value}>
      <Fragment key={generation}>{children}</Fragment>
    </AccountScopeContext.Provider>
  );
}

/**
 * The last step of a switch or a deletion: relaunch the app, or, where it cannot relaunch itself,
 * mount the account scope again. Call it only after every write has been flushed; a relaunch does not
 * wait for anything.
 */
export function useRestartForNextAccount(): () => AccountRestart {
  const { remount } = useContext(AccountScopeContext);
  return useCallback((): AccountRestart => {
    if (canRestartApp()) {
      restartApp();
      return 'restarted';
    }
    remount();
    return 'remounted';
  }, [remount]);
}
