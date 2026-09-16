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
import { resolveInstallId, type IdStore } from './installId';
import type { KpiGateway, OnceStore } from './KpiGateway';

const ONCE_PREFIX = 'pushapp.kpi.once.';

/**
 * A tiny synchronous cache over AsyncStorage.
 *
 * The once-per-install guard has to answer synchronously — `record()` returns
 * void and must not make a call site await a metric. So the keys are read once
 * at startup and the writes are fire-and-forget: a crash between the write and
 * the flush can duplicate one event, which is a far smaller cost than making
 * every call site asynchronous.
 */
async function loadOnceStore(): Promise<OnceStore> {
  const seen = new Set<string>();
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
    const existing = await AsyncStorage.getItem('pushapp.kpi.install-id');
    if (existing) cache.set('pushapp.kpi.install-id', existing);
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
    const [idStore, once] = await Promise.all([loadIdStore(), loadOnceStore()]);
    const installId = resolveInstallId(idStore);
    const bundle = readRunningBundle();
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const context = {
      installId,
      appVersion: Constants.expoConfig?.version ?? null,
      platform,
      channel: bundle.kind === 'development' ? 'development' : (bundle.channel ?? null),
    } as const;
    getRuntimeReporter().report(context, nativeBuildVersion());
    return getKpiGateway(
      // The channel names which audience this copy belongs to (preview vs
      // production), which is what makes a number about testers separable from a
      // number about users.
      () => context,
      once,
    );
  } catch {
    return null;
  }
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
