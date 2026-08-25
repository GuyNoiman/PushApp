/**
 * The one Strength Evidence record, read and written through the shared tool store.
 *
 * A LIST STORE HOLDING ONE THING, on purpose: `ToolRecordsStore` already gets persistence,
 * unreadable-blob handling and account deletion right for seven tools, and an eighth provider would
 * be an eighth place to get one of those subtly wrong. So the map lives under a fixed id and the
 * rest follows from the list.
 *
 * State only (Engineering Bible §19) — every rule about what a strength MEANS is in
 * `core/tools/strengthEvidence/model`.
 */
import { useCallback, useMemo } from 'react';

import { startStrengthEvidence, type StrengthEvidenceState } from '@/core/tools/strengthEvidence/model';
import { useToolRecords } from '@/state/ToolRecordsStore';

/** The id the single record lives under. */
const RECORD_ID = 'current';

export interface UseStrengthEvidence {
  /** False until storage has been read, so the tool never opens on an empty map that is not empty. */
  ready: boolean;
  state: StrengthEvidenceState;
  save: (next: StrengthEvidenceState) => void;
  /** Start again from nothing. The person's decision, never the tool's. */
  reset: () => void;
}

/**
 * The stored shape guard, required by the store for the reason its header gives: stored JSON
 * outlives the code that wrote it, and a tool that trusts the blob renders a two-version-old record
 * into a crash. Everything past `id` is re-checked field by field below.
 */
function isStoredMap(value: unknown): value is StrengthEvidenceState & { id: string } {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string';
}

export function useStrengthEvidence(): UseStrengthEvidence {
  const records = useToolRecords('strengthEvidence', isStoredMap);

  const state = useMemo<StrengthEvidenceState>(() => {
    const stored = records.records[0];
    if (!stored) return startStrengthEvidence();
    // Defensive: a hand-edited or half-written blob must open as an empty map rather than crash the
    // tool. Only the fields the model knows are carried across.
    return {
      stories: Array.isArray(stored.stories) ? stored.stories : [],
      strengths: Array.isArray(stored.strengths) ? stored.strengths : [],
      ...(stored.analysisMode ? { analysisMode: stored.analysisMode } : {}),
      ...(typeof stored.confirmedAt === 'number' ? { confirmedAt: stored.confirmedAt } : {}),
      personalisationAllowed: stored.personalisationAllowed === true,
    };
  }, [records.records]);

  const save = useCallback(
    (next: StrengthEvidenceState) => records.put({ id: RECORD_ID, ...next }),
    [records],
  );

  const reset = useCallback(() => records.clearAll(), [records]);

  return { ready: records.ready, state, save, reset };
}
