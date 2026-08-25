/**
 * The facts that travel with a report — collected here, once, from the platform.
 *
 * IT IS A FUNCTION AND NOT A SPREAD, and that is the point. Everything it returns is a field §8.3
 * names, read from a specific source; there is no object being copied in whose shape could change
 * under us. When somebody adds a device identifier to `Constants` next year, nothing here starts
 * sending it.
 *
 * The `runtimeId` deserves a note: it is the over-the-air update actually running, from the same
 * module the About row reads (`core/util/buildInfo`). It is the difference between "version 1.0.0",
 * which every install has said since the first build, and knowing which copy of the app the person
 * in front of the problem was actually looking at.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { readRunningBundle, shortUpdateId } from '../util/buildInfo';
import type { ReportDiagnostics, ReportSource } from './model';

export function collectDiagnostics(source: ReportSource, locale?: string): ReportDiagnostics {
  const bundle = readRunningBundle();
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
      ? Platform.OS
      : undefined;
  return {
    appVersion: Constants.expoConfig?.version,
    build: bundle.kind === 'embedded' ? 'embedded' : undefined,
    runtimeId: bundle.kind === 'update' ? shortUpdateId(bundle.id) : undefined,
    ...(platform ? { platform } : {}),
    osVersion: String(Platform.Version),
    ...(locale ? { locale } : {}),
    source,
  };
}
