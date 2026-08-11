/**
 * Active Hours (Settings › App › Active Hours) — the PRIVATE editor for the account-
 * level outer boundary within which PushApp may send optional reminders (D40). A
 * Journey may choose a NARROWER relevant window, but never one outside Active Hours;
 * an out-of-hours reminder is moved earlier to fit (clamp), never dropped.
 *
 * Two modes: a single shared daily range, or "Set each day separately" → seven
 * independent day rows (each enabled + start/end), ordered by the user's
 * `weekStartDay` (D33). Presentational only (Engineering Bible §19): it materializes
 * an editable draft from the core prefs, holds local edit state, and on Save hands a
 * normalized {@link ActiveHours} to `AppCore.setActiveHours` — no scheduling logic
 * lives here. Times use a lightweight HH:MM field (a proper wheel picker is a
 * ux-designer follow-up; kept dependency-free for now).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { allDayWindow, resolveActiveHours, type Weekday } from '@/core/util/availability';
import type { ActiveHours, AllowedWindow, DayActiveHours } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';
import { useProfile } from '@/state/ProfileProvider';

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtTime = (t: { hour: number; minute: number }) => `${pad2(t.hour)}:${pad2(t.minute)}`;
const isAllDay = (w: AllowedWindow) => w.start.hour === w.end.hour && w.start.minute === w.end.minute;

/** Parse "HH:MM" into a valid {hour,minute}, or null when malformed/out of range. */
function parseTime(raw: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** A shared window applied to every (enabled) day. */
function sharedDays(window: AllowedWindow): DayActiveHours[] {
  return Array.from({ length: 7 }, () => ({ enabled: true, window }));
}

/** Whether the draft is the clean all-day, all-days-enabled default (⇒ clear the pref). */
function isDefault(draft: ActiveHours): boolean {
  return draft.mode === 'shared' && draft.days.every((d) => d.enabled && isAllDay(d.window));
}

export default function ActiveHoursScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('settings');
  const { core } = useApp();
  const { profile } = useProfile();

  const [draft, setDraft] = useState<ActiveHours>(() => resolveActiveHours(core.getSchedulingPrefs()));
  const perDay = draft.mode === 'perDay';

  // Weekday labels (Sun..Sat) + the user's week ordering (D33 — never hardcode Sun/Mon).
  const weekdayNames = t('weekdays', { ns: 'common', returnObjects: true }) as string[];
  const dayOrder = useMemo<Weekday[]>(
    () => Array.from({ length: 7 }, (_, i) => (((profile.weekStartDay + i) % 7) as Weekday)),
    [profile.weekStartDay],
  );

  // Shared mode edits a single window (mirrored onto every day). The representative is
  // the first day in the user's week order, so "preview before saving" shows what will apply.
  const sharedWindow = draft.days[dayOrder[0]].window;

  const setSharedWindow = (window: AllowedWindow) => setDraft({ mode: 'shared', days: sharedDays(window) });

  const setDay = (weekday: Weekday, patch: Partial<DayActiveHours>) =>
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) => (i === weekday ? { ...day, ...patch } : day)),
    }));

  const toggleMode = (toPerDay: boolean) => {
    if (toPerDay) {
      setDraft((d) => ({ ...d, mode: 'perDay' }));
    } else {
      // Collapse to a single shared range (the first enabled day's window, else all-day).
      const firstEnabled = draft.days.find((day) => day.enabled);
      setSharedWindow(firstEnabled?.window ?? allDayWindow());
    }
  };

  const onSave = () => {
    core.setActiveHours(isDefault(draft) ? undefined : draft);
    router.back();
  };

  const summary = useMemo(() => {
    if (isDefault(draft)) return t('activeHours.summaryAllDay');
    if (draft.days.every((d) => !d.enabled)) return t('activeHours.summaryOff');
    if (draft.mode === 'shared') {
      return isAllDay(sharedWindow)
        ? t('activeHours.summaryAllDay')
        : t('activeHours.range', { start: fmtTime(sharedWindow.start), end: fmtTime(sharedWindow.end) });
    }
    return t('activeHours.summaryPerDay');
  }, [draft, sharedWindow, t]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('activeHours.title')}</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textMuted">
            {t('activeHours.intro')}
          </ThemedText>

          {/* Shared range — hidden in per-day mode. */}
          {!perDay && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
                {t('activeHours.everyDay')}
              </ThemedText>
              <View style={styles.timeRow}>
                <TimeField
                  label={t('activeHours.start')}
                  value={sharedWindow.start}
                  onChange={(start) => setSharedWindow({ ...sharedWindow, start })}
                />
                <TimeField
                  label={t('activeHours.end')}
                  value={sharedWindow.end}
                  onChange={(end) => setSharedWindow({ ...sharedWindow, end })}
                />
              </View>
              <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
                {t('activeHours.allDayHint')}
              </ThemedText>
            </View>
          )}

          {/* Per-day toggle. */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <ThemedText type="default">{t('activeHours.perDayToggle')}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {t('activeHours.perDayToggleDetail')}
                </ThemedText>
              </View>
              <Switch
                value={perDay}
                onValueChange={toggleMode}
                trackColor={{ true: theme.teal }}
                accessibilityLabel={t('activeHours.perDayToggle')}
              />
            </View>
          </View>

          {/* Per-day rows — ordered by the user's week start (D33). */}
          {perDay && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              {dayOrder.map((weekday, i) => {
                const day = draft.days[weekday];
                return (
                  <View key={weekday}>
                    {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.hairline }]} /> : null}
                    <View style={styles.dayRow}>
                      <View style={styles.dayHeader}>
                        <ThemedText type="default">{weekdayNames[weekday]}</ThemedText>
                        <Switch
                          value={day.enabled}
                          onValueChange={(enabled) => setDay(weekday, { enabled })}
                          trackColor={{ true: theme.teal }}
                          accessibilityLabel={weekdayNames[weekday]}
                        />
                      </View>
                      {day.enabled ? (
                        <View style={styles.timeRow}>
                          <TimeField
                            label={t('activeHours.start')}
                            value={day.window.start}
                            onChange={(start) => setDay(weekday, { window: { ...day.window, start } })}
                          />
                          <TimeField
                            label={t('activeHours.end')}
                            value={day.window.end}
                            onChange={(end) => setDay(weekday, { window: { ...day.window, end } })}
                          />
                        </View>
                      ) : (
                        <ThemedText type="small" themeColor="textMuted">
                          {t('activeHours.dayOff')}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Summary of what will apply. */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
            {summary}
          </ThemedText>
        </ScrollView>

        {/* Save / Cancel footer. */}
        <View style={[styles.footer, { borderTopColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel', { ns: 'common' })}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}>
            <ThemedText type="default" themeColor="textSecondary">
              {t('cancel', { ns: 'common' })}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('save', { ns: 'common' })}
            onPress={onSave}
            style={({ pressed }) => [styles.footerButton, styles.saveButton, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {t('save', { ns: 'common' })}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** A single HH:MM time field: commits a valid value on end-editing, reverts otherwise. */
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { hour: number; minute: number };
  onChange: (t: { hour: number; minute: number }) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState(fmtTime(value));
  // Keep the field in sync when the value changes from outside (e.g. mode switch).
  const shown = fmtTime(value);
  const [lastShown, setLastShown] = useState(shown);
  if (shown !== lastShown) {
    setLastShown(shown);
    setDraft(shown);
  }

  const commit = () => {
    const parsed = parseTime(draft);
    if (parsed) onChange(parsed);
    else setDraft(fmtTime(value)); // revert to the last valid value
  };

  return (
    <View style={styles.timeField}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={5}
        textAlign="center"
        style={[styles.timeInput, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.background }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: { padding: Spacing.one },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  cardTitle: { paddingHorizontal: Spacing.one },
  timeRow: { flexDirection: 'row', gap: Spacing.three },
  timeField: { flex: 1, gap: Spacing.two },
  timeInput: {
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  hint: { paddingHorizontal: Spacing.one },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchLabel: { flex: 1, gap: 1 },
  dayRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, marginVertical: Spacing.two },
  summary: { paddingHorizontal: Spacing.one },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {},
  pressed: { opacity: 0.6 },
});
