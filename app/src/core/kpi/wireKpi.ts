/**
 * Turning the KPI stream on for a real device.
 *
 * Everything the gateway needs that AppCore cannot know: the installation id out
 * of device storage, and the running build's version, platform and channel. Kept
 * out of `AppCore` so the core stays framework-free, and out of the provider so
 * the provider stays a bridge rather than a place decisions are made.
 *
 * A failure here disables measurement and nothing else. There is no state in
 * which a person's app works worse because a metric could not be configured.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '../social/supabaseClient';
import { readRunningBundle } from '../util/buildInfo';
import { getKpiGateway } from './index';
import { getRuntimeReporter } from './reportRuntime';
import { KPI_INSTALL_ID_KEY, replaceInstallId, resolveInstallId, type IdStore } from './installId';
import type { KpiContext, KpiGateway, OnceStore } from './KpiGateway';

/** Prefix of the once-per-install markers. Exported so a switch of account can wipe them. */
export const KPI_ONCE_PREFIX = 'pushapp.kpi.once.';
const ONCE_PREFIX = KPI_ONCE_PREFIX;

/**
 * What the running app holds in memory for the KPI stream, once wired: the context every event is
 * stamped with, the id store behind it, and the set of once-per-install events already sent.
 *
 * Module-level so {@link startNewKpiInstallation} can replace them. Wiping the keys from storage
 * alone would change nothing until the next launch: the running gateway reads the id from here.
 */
let live: { context: KpiContext; idStore: IdStore; seen: Set<string> } | null = null;

/**
 * A tiny synchronous cache over AsyncStorage.
 *
 * The once-per-install guard has to answer synchronously — `record()` returns
 * void and must not make a call site await a metric. So the keys are read once
 * at startup and the writes are fire-and-forget: a crash between the write and
 * the flush can duplicate one event, which is a far smaller cost than making
 * every call site asynchronous.
 */
async function loadOnceStore(seen: Set<string>): Promise<OnceStore> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) if (key.startsWith(ONCE_PREFIX)) seen.add(key.slice(ONCE_PREFIX.length));
  } catch {
    // No memory of what was sent means an event may repeat once. Acceptable.
  }
  return {
    has: (key) => seen.has(key),
    remember: (key) => {
      seen.add(key);
      void AsyncStorage.setItem(`${ONCE_PREFIX}${key}`, '1').catch(() => undefined);
    },
  };
}

/** The native build number, when the platform reports one. Absent on web and in Expo Go. */
function nativeBuildVersion(): string | null {
  const v = (Constants as unknown as { nativeBuildVersion?: string | null }).nativeBuildVersion;
  return v ? String(v) : null;
}

async function loadIdStore(): Promise<IdStore> {
  const cache = new Map<string, string>();
  try {
    const existing = await AsyncStorage.getItem(KPI_INSTALL_ID_KEY);
    if (existing) cache.set(KPI_INSTALL_ID_KEY, existing);
  } catch {
    // A fresh id is minted below; a reinstall is genuinely a new installation.
  }
  return {
    get: (key) => cache.get(key) ?? null,
    set: (key, value) => {
      cache.set(key, value);
      void AsyncStorage.setItem(key, value).catch(() => undefined);
    },
  };
}

/**
 * Build the gateway for this device, or null when it cannot be configured.
 *
 * It also reports WHICH BUILD this phone is running (founder option B,
 * 2026-08-31), from here rather than from its own call site: the installation id
 * and the build's identity are already assembled in this one place, and a second
 * assembly would be a second chance to get the id wrong.
 */
export async function wireKpiGateway(): Promise<KpiGateway | null> {
  try {
    const seen = new Set<string>();
    const [idStore, once] = await Promise.all([loadIdStore(), loadOnceStore(seen)]);
    const installId = resolveInstallId(idStore);
    const bundle = readRunningBundle();
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const context: KpiContext = {
      installId,
      appVersion: Constants.expoConfig?.version ?? null,
      platform,
      channel: bundle.kind === 'development' ? 'development' : (bundle.channel ?? null),
    };
    const wired = { context, idStore, seen };
    live = wired;
    getRuntimeReporter().report(context, nativeBuildVersion());
    return getKpiGateway(
      // The channel names which audience this copy belongs to (preview vs
      // production), which is what makes a number about testers separable from a
      // number about users. Read through `wired` rather than captured, so a switch
      // of account that replaces the id is seen by the very next event.
      () => wired.context,
      once,
    );
  } catch {
    return null;
  }
}

/**
 * Make this phone a NEW installation for measurement: a fresh install id, and no memory of which
 * once-per-install events were sent. Called when the account is switched (see `installId.ts` for why
 * that now counts as a new installation).
 *
 * Both halves, storage and memory: removing the keys alone would leave the running gateway stamping
 * events with the old id until the next launch. Never throws — measurement must not be the reason a
 * sign-out fails. Returns the new id (its write to storage is fire-and-forget, like every id write here).
 */
export async function startNewKpiInstallation(random: () => number = Math.random): Promise<string> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const once = keys.filter((key) => key.startsWith(KPI_ONCE_PREFIX));
    if (once.length > 0) await AsyncStorage.multiRemove(once);
  } catch {
    // An event may be counted once more for the next account. Acceptable.
  }
  if (live) {
    live.seen.clear();
    const installId = replaceInstallId(live.idStore, random);
    live.context = { ...live.context, installId };
    return installId;
  }
  // Not wired (measurement off, or not started yet): the next launch reads whatever is stored, so
  // storing a fresh id is the whole job.
  return replaceInstallId(
    {
      get: () => null,
      set: (key, value) => {
        void AsyncStorage.setItem(key, value).catch(() => undefined);
      },
    },
    random,
  );
}

/** The install id the running KPI stream stamps events with, or null when it is not wired. */
export function liveKpiInstallId(): string | null {
  return live?.context.installId ?? null;
}

/**
 * Resolves once this device holds a Supabase session — immediately when it already does.
 *
 * `kpi_events` accepts inserts from `authenticated` only, and a fresh install has no session until
 * the anonymous bootstrap in `AuthProvider` returns. An event sent before then is refused by the
 * database and, being fire-and-forget, is lost without a trace. `appKpi` holds events until this
 * resolves, so the first screen of a fresh install is counted like every other.
 *
 * Never rejects. With no backend it resolves at once (there is nothing to wait for, and the gateway
 * is null anyway); with a backend that never produces a session it simply never resolves, and the
 * held events stay held — which is no worse than sending them to be refused.
 */
export function whenKpiSessionReady(): Promise<void> {
  const client = supabase;
  if (!client) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let subscription: { unsubscribe: () => void } | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      subscription?.unsubscribe();
      resolve();
    };
    try {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (session) finish();
      });
      subscription = data.subscription;
      if (done) subscription.unsubscribe();
      void client.auth.getSession().then(
        ({ data: current }) => {
          if (current.session) finish();
        },
        () => undefined,
      );
    } catch {
      // A client that cannot even be asked is a client that will refuse the insert. Hold.
    }
  });
}
