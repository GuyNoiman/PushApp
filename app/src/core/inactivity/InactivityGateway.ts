/**
 * InactivityGateway — the account's lifecycle clock, which does not belong on the device.
 *
 * ONE METHOD, and its shape is the decision: the app says "an authenticated person is here" and gets
 * back the verdict that was STANDING WHEN THEY ARRIVED. It cannot say when they were here (the server
 * reads its own clock) and it cannot say whether they are frozen (that is the server's to decide).
 * A client that could set either could set both, and then the whole lifecycle is a local flag with a
 * network round trip in front of it.
 *
 * Vendor-independent (Engineering Bible §3): one implementation file touches the SDK.
 */

/** What the server knew about this account at the moment the app said hello. */
export interface AccountLifecycleVerdict {
  /** Server time, as epoch ms — the anchor the device replaces its own clock's guess with. */
  lastActiveAt: number;
  /** Present when the account WAS frozen on arrival, so the device can apply a freeze it slept through. */
  frozenAt?: number;
  /** Why. A closed value, today only `inactivity_21_days`. */
  reason?: string;
}

export interface InactivityGateway {
  readonly enabled: boolean;
  /**
   * Record authenticated foreground activity and read the standing verdict.
   *
   * Returns null when there is no session, no network, or no backend — which is not an error and not
   * a verdict: the local engine's own gap measurement stays the fallback it always was.
   */
  touch(): Promise<AccountLifecycleVerdict | null>;
}

export const NullInactivityGateway: InactivityGateway = {
  enabled: false,
  async touch() {
    return null;
  },
};
