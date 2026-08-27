/**
 * DateWheel — a day/month/year picker built from primitives only.
 *
 * WHY IT IS HAND-BUILT. The founder's objection was that typing a date is dated, and he is right.
 * The reason the app had a text field anyway is a standing engineering constraint: no new NATIVE
 * dependency, so the app keeps working in Expo Go and the web preview. A native date picker breaks
 * that; three scrolling columns do not. Nobody was ever waiting on a product decision here — that
 * was a mistake in how the item was framed.
 *
 * HOW IT WORKS: three vertical lists that snap to a row. The selected row is the one at the centre
 * line, which is what makes it read as a wheel without any animation library. Scroll position is the
 * only state; there is no gesture handling of our own.
 *
 * WHY NOT VALIDATE AND WARN: a wheel cannot produce an invalid date, so the "that isn't a real date"
 * hint the text field needed has nowhere to appear. 31 February is unreachable because the day
 * column is rebuilt from the chosen month and year — including leap years.
 *
 * Presentational only: it reports a chosen ISO date upward and holds no business logic (Bible §19).
 */
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Row height in points. The visible window is exactly five rows, so the centre one is the choice. */
const ROW = 36;
const VISIBLE_ROWS = 5;
const CENTRE_OFFSET = Math.floor(VISIBLE_ROWS / 2);

/** The oldest year offered. 120 years is past any real birth date and keeps the list finite. */
const OLDEST_YEARS = 120;

export interface DateParts {
  year: number;
  /** 1–12, NOT the JavaScript 0-based month — this is a user-facing value all the way through. */
  month: number;
  day: number;
}

/** Days in a month, leap years included — the reason 31 February is unreachable. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** `YYYY-MM-DD`, zero-padded. The one format the profile stores. */
export function toIsoDate(parts: DateParts): string {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

/**
 * Parse `YYYY-MM-DD` into parts, or return null. Used to open the wheel on the date already saved
 * rather than on an arbitrary default — reopening the editor should show what is stored.
 */
export function fromIsoDate(iso: string | null | undefined): DateParts | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const parts = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (parts.month < 1 || parts.month > 12) return null;
  if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) return null;
  return parts;
}

export function DateWheel({
  value,
  monthNames,
  thisYear,
  onChange,
}: {
  value: DateParts;
  /** Twelve month names in the active language, index 0 = January. Supplied so this stays i18n-free. */
  monthNames: readonly string[];
  /** The current year, injected rather than read from the clock (Bible §19 — no clock in a component). */
  thisYear: number;
  onChange: (parts: DateParts) => void;
}) {
  const theme = useTheme();

  const years = useMemo(
    () => Array.from({ length: OLDEST_YEARS + 1 }, (_, i) => thisYear - i),
    [thisYear],
  );
  const months = useMemo(() => monthNames.map((name, i) => ({ label: name, value: i + 1 })), [monthNames]);
  // Rebuilt from the chosen month/year, so switching to February shortens the column and a day
  // that no longer exists is clamped rather than silently kept.
  const days = useMemo(
    () => Array.from({ length: daysInMonth(value.year, value.month) }, (_, i) => i + 1),
    [value.year, value.month],
  );

  const pick = (next: Partial<DateParts>) => {
    const merged = { ...value, ...next };
    const max = daysInMonth(merged.year, merged.month);
    onChange({ ...merged, day: Math.min(merged.day, max) });
  };

  return (
    <View style={styles.row}>
      <Column
        rows={days.map((d) => ({ key: String(d), label: String(d) }))}
        selectedKey={String(value.day)}
        onSelect={(key) => pick({ day: Number(key) })}
      />
      <Column
        rows={months.map((m) => ({ key: String(m.value), label: m.label }))}
        selectedKey={String(value.month)}
        onSelect={(key) => pick({ month: Number(key) })}
        flex={2}
      />
      <Column
        rows={years.map((y) => ({ key: String(y), label: String(y) }))}
        selectedKey={String(value.year)}
        onSelect={(key) => pick({ year: Number(key) })}
      />
      {/* The centre line — the visual promise that the middle row is the chosen one. */}
      <View pointerEvents="none" style={[styles.centreLine, { borderColor: theme.teal }]} />
    </View>
  );
}

function Column({
  rows,
  selectedKey,
  onSelect,
  flex = 1,
}: {
  rows: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  flex?: number;
}) {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, rows.findIndex((r) => r.key === selectedKey));

  /** Which row the column came to rest on, reported upward only when it is a different one. */
  const report = (offsetY: number) => {
    const i = Math.round(offsetY / ROW);
    const row = rows[Math.max(0, Math.min(rows.length - 1, i))];
    if (row && row.key !== selectedKey) onSelect(row.key);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ flex, height: ROW * VISIBLE_ROWS }}
      showsVerticalScrollIndicator={false}
      // The wheel lives inside a page that also scrolls vertically. Without this the parent takes
      // the drag on Android and the column barely moves.
      nestedScrollEnabled
      snapToInterval={ROW}
      decelerationRate="fast"
      // Padding of two rows top and bottom is what lets the FIRST and LAST entries reach the centre.
      contentContainerStyle={{ paddingVertical: ROW * CENTRE_OFFSET }}
      contentOffset={{ x: 0, y: index * ROW }}
      // BOTH events, and that is the bug this file was reported for (device, 2026-08-27: "I cannot
      // change my birth date"). `onMomentumScrollEnd` only fires when a flick leaves the list
      // COASTING. Nudging the wheel one or two rows — which is what changing a birth date actually
      // is — ends the gesture with no momentum at all, so the column snapped to the new row on
      // screen and reported nothing: the value silently stayed as it was, and the person watched the
      // right number sit under the line while the row above kept saying the old one.
      //
      // Reporting from the drag as well is safe: `onSelect` is guarded on an actual change, so a
      // gesture that DOES coast fires once from the drag and then no-ops on the momentum.
      onScrollEndDrag={(e) => report(e.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={(e) => report(e.nativeEvent.contentOffset.y)}>
      {rows.map((r) => {
        const selected = r.key === selectedKey;
        return (
          <View key={r.key} style={styles.cell}>
            <ThemedText
              type={selected ? 'smallBold' : 'small'}
              style={{ color: selected ? theme.text : theme.textMuted }}>
              {r.label}
            </ThemedText>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, position: 'relative' },
  cell: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  centreLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW * CENTRE_OFFSET,
    height: ROW,
    borderRadius: Radius.input,
    borderWidth: 1,
    opacity: 0.5,
  },
});
