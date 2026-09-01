/**
 * Whether this app is the newest build, for the surfaces that say so.
 *
 * Checked once per app session, not per render: the answer changes when a build
 * is published, which is a human-scale event, and a phone that is cut off stays
 * cut off. Failure is silent by construction — `unknown` renders as nothing.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { readRunningBundle } from '@/core/util/buildInfo';
import { fetchBuildManifest, updateStanding, type UpdateStanding } from '@/core/update/latestBuild';

let cached: UpdateStanding | null = null;

export function useUpdateStanding(): UpdateStanding {
  const [standing, setStanding] = useState<UpdateStanding>(
    cached ?? { state: 'unknown', reason: 'no-manifest' },
  );

  useEffect(() => {
    if (cached) return;
    let mounted = true;
    void (async () => {
      const bundle = readRunningBundle();
      const manifest = await fetchBuildManifest();
      const result = updateStanding({
        runtime: bundle.kind === 'development' ? null : (bundle.runtime ?? null),
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        development: bundle.kind === 'development',
        manifest,
      });
      cached = result;
      if (mounted) setStanding(result);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return standing;
}

/** Test seam: forget the session's answer. */
export function resetUpdateStanding(): void {
  cached = null;
}
