/**
 * ToolRecordsStore — one home for what the record-keeping tools write, instead of one provider per
 * tool.
 *
 * WHY ONE STORE. The 2026-08-21 tool set added seven tools, and five of them store the same shape:
 * a list of records, each a draft until it is confirmed, plus a small preference or two. Seven
 * near-identical providers would be seven places to get persistence, corruption handling and
 * account deletion subtly different — and the deletion list has already been wrong once for exactly
 * that reason (see `accountExport.ts`). Here a new tool is a KEY in {@link TOOL_RECORD_KEYS} and
 * nothing else: storage, parsing, wiping and the deletion registration all follow from the list.
 *
 * PRIVACY (G1). Everything written through this store is ON-DEVICE ONLY: AsyncStorage, never synced,
 * never logged, never a DomainEvent. Several of these tools have an EMPTY influence contract (D66:
 * a reflection is for the user) — there is deliberately no derive step, no summary and no event on
 * this path for a future consumer to hook into. What a tool chooses to expose, it exposes through
 * its own `signals.ts`, one decision at a time.
 *
 * DRAFTS ARE NEVER DISCARDED. Nothing in here expires, prunes or tidies up; a half-written record is
 * the user's, and only the user deletes it.
 *
 * State only (Bible §19). Every rule about what a record MEANS lives in that tool's model.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Every tool that keeps records here. Adding one is adding a key. */
export const TOOL_RECORD_KEYS = [
  'gratitude',
  'whatWorked',
  'decisionClarity',
  'currentLoad',
  'obstacleToAction',
  'supportMap',
  'selfCompassion',
] as const;
export type ToolRecordKey = (typeof TOOL_RECORD_KEYS)[number];

/** The AsyncStorage key one tool's data lives under. */
export function toolStorageKey(tool: ToolRecordKey): string {
  return `pushapp.tool.${tool}`;
}

/** Every storage key this store owns — what an account deletion has to wipe. */
export const TOOL_RECORD_STORAGE_KEYS = TOOL_RECORD_KEYS.map(toolStorageKey);

/** Anything with an id can be a record. The tool's own model gives it meaning. */
export interface ToolRecordLike {
  id: string;
}

interface ToolBlob {
  records: unknown[];
  prefs: Record<string, unknown>;
}

const EMPTY_BLOB: ToolBlob = { records: [], prefs: {} };

interface ToolRecordsValue {
  /** False until storage has been read, so a tool never opens on an empty history that is not empty. */
  ready: boolean;
  blobs: Readonly<Record<ToolRecordKey, ToolBlob>>;
  put: (tool: ToolRecordKey, record: ToolRecordLike) => void;
  remove: (tool: ToolRecordKey, id: string) => void;
  clearTool: (tool: ToolRecordKey) => void;
  setPref: (tool: ToolRecordKey, name: string, value: unknown) => void;
}

function emptyBlobs(): Record<ToolRecordKey, ToolBlob> {
  return Object.fromEntries(TOOL_RECORD_KEYS.map((k) => [k, EMPTY_BLOB])) as Record<ToolRecordKey, ToolBlob>;
}

const EMPTY: ToolRecordsValue = {
  ready: true,
  blobs: emptyBlobs(),
  put: () => {},
  remove: () => {},
  clearTool: () => {},
  setPref: () => {},
};

const ToolRecordsContext = createContext<ToolRecordsValue>(EMPTY);

/** Read one tool's blob. An unreadable blob is an empty one — never a crash on launch. */
function parseBlob(raw: string | null): ToolBlob {
  if (!raw) return EMPTY_BLOB;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_BLOB;
    const { records, prefs } = parsed as Partial<ToolBlob>;
    return {
      // Records without an id cannot be updated or deleted later, so they are not records.
      records: Array.isArray(records)
        ? records.filter((r) => typeof r === 'object' && r !== null && typeof (r as ToolRecordLike).id === 'string')
        : [],
      prefs: typeof prefs === 'object' && prefs !== null ? (prefs as Record<string, unknown>) : {},
    };
  } catch {
    return EMPTY_BLOB;
  }
}

export function ToolRecordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [blobs, setBlobs] = useState<Record<ToolRecordKey, ToolBlob>>(emptyBlobs);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const pairs = await AsyncStorage.multiGet(TOOL_RECORD_STORAGE_KEYS);
        if (!mounted) return;
        const next = emptyBlobs();
        pairs.forEach(([key, raw], index) => {
          void key;
          next[TOOL_RECORD_KEYS[index]] = parseBlob(raw);
        });
        setBlobs(next);
      } catch {
        // Unreadable storage leaves every tool empty rather than blocking the app.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** One write path, so no caller can forget to persist what it just changed in memory. */
  const mutate = useCallback((tool: ToolRecordKey, change: (blob: ToolBlob) => ToolBlob) => {
    setBlobs((current) => {
      const next = { ...current, [tool]: change(current[tool] ?? EMPTY_BLOB) };
      void AsyncStorage.setItem(toolStorageKey(tool), JSON.stringify(next[tool])).catch(() => {});
      return next;
    });
  }, []);

  const put = useCallback(
    (tool: ToolRecordKey, record: ToolRecordLike) =>
      mutate(tool, (blob) => {
        const exists = blob.records.some((r) => (r as ToolRecordLike).id === record.id);
        return {
          ...blob,
          records: exists
            ? blob.records.map((r) => ((r as ToolRecordLike).id === record.id ? record : r))
            : [...blob.records, record],
        };
      }),
    [mutate],
  );

  const remove = useCallback(
    (tool: ToolRecordKey, id: string) =>
      mutate(tool, (blob) => ({
        ...blob,
        records: blob.records.filter((r) => (r as ToolRecordLike).id !== id),
      })),
    [mutate],
  );

  const clearTool = useCallback(
    (tool: ToolRecordKey) => mutate(tool, (blob) => ({ ...blob, records: [] })),
    [mutate],
  );

  const setPref = useCallback(
    (tool: ToolRecordKey, name: string, value: unknown) =>
      mutate(tool, (blob) => ({ ...blob, prefs: { ...blob.prefs, [name]: value } })),
    [mutate],
  );

  const value = useMemo(
    () => ({ ready, blobs, put, remove, clearTool, setPref }),
    [ready, blobs, put, remove, clearTool, setPref],
  );

  return <ToolRecordsContext.Provider value={value}>{children}</ToolRecordsContext.Provider>;
}

/**
 * One tool's records, typed by the caller.
 *
 * `isRecord` is the tool's own shape guard, and it is REQUIRED rather than optional: stored JSON
 * outlives the code that wrote it, and a tool that trusts the blob will one day render a record from
 * two versions ago into a crash.
 */
export function useToolRecords<T extends ToolRecordLike>(
  tool: ToolRecordKey,
  isRecord: (value: unknown) => value is T,
) {
  const store = useContext(ToolRecordsContext);
  const blob = store.blobs[tool] ?? EMPTY_BLOB;

  const records = useMemo(() => blob.records.filter(isRecord), [blob.records, isRecord]);

  const put = useCallback((record: T) => store.put(tool, record), [store, tool]);
  const remove = useCallback((id: string) => store.remove(tool, id), [store, tool]);
  const clearAll = useCallback(() => store.clearTool(tool), [store, tool]);
  const setPref = useCallback(
    (name: string, value: unknown) => store.setPref(tool, name, value),
    [store, tool],
  );

  return { ready: store.ready, records, prefs: blob.prefs, put, remove, clearAll, setPref };
}
