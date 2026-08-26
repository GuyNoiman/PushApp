/**
 * JourneyReminderCard — the managed Off/Fixed/Smart reminder surface for one Journey
 * (Journey Reminder Management, D40). Shows the current state (Off, "Fixed · 09:00 ·
 * Mon, Tue", or "Smart · Mon, Tue") and opens an editor to switch mode, pick a time, and choose
 * weekdays (ordered by the user's `weekStartDay`, D33). When notification permission is denied
 * it surfaces a calm "Reminders are off" state that deep-links to OS Settings.
 *
 * SMART is a real choice now (founder, 2026-08-26): the person hands the app the WHEN, and the
 * scheduler answers with ONE send for all their smart Journeys rather than one per Journey
 * (Smart_Notification_Timing_PRD §3). So the editor hides the time field in Smart mode — showing a
 * time the app is free to move would be promising something we do not mean — and keeps the day
 * picker, because which days somebody is reachable stays theirs to say.
 *
 * Presentational only (Engineering Bible §19): it reads/writes through the AppCore facade
 * (getJourneyReminder / setJourneyReminderFixed / setJourneyReminderSmart / setJourneyReminderOff)
 * and holds no
 * scheduling logic. A lightweight HH:MM field is used (a wheel picker is a ux-designer
 * follow-up), matching the Active Hours editor.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { ReminderMode } from '@/core/util/reminderView';
import type { Journey } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useProfile } from '@/state/ProfileProvider';

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtTime = (hour: number, minute: number) => `${pad2(hour)}:${pad2(minute)}`;

/** Parse "HH:MM" into a valid {hour,minute}, or null when malformed/out of range. */
function parseTime(raw: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function JourneyReminderCard({ journey }: { journey: Journey }) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const { core, snapshot } = useApp();
  const { profile } = useProfile();

  // Recomputed each render; the snapshot dependency re-renders on any reminder change.
  const reminder = useMemo(
    () => core.getJourneyReminder(journey.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core, journey.id, snapshot],
  );

  // Permission is read WITHOUT prompting on mount (null = still checking).
  const [permission, setPermission] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void core.refreshReminderPermission().then((granted) => {
      if (active) setPermission(granted);
    });
    return () => {
      active = false;
    };
  }, [core]);

  const [editing, setEditing] = useState(false);

  const weekdayNames = t('weekdays', { ns: 'common', returnObjects: true }) as string[];
  const dayOrder = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (profile.weekStartDay + i) % 7),
    [profile.weekStartDay],
  );

  const daysLabel = useMemo(() => {
    if (reminder.weekdays.length === 0 || reminder.weekdays.length === 7) {
      return t('detail.reminders.everyDay');
    }
    return dayOrder
      .filter((d) => reminder.weekdays.includes(d))
      .map((d) => weekdayNames[d])
      .join(', ');
  }, [reminder.weekdays, dayOrder, weekdayNames, t]);

  const summary =
    reminder.mode === 'off'
      ? t('detail.reminders.off')
      : reminder.mode === 'smart'
        ? `${t('detail.reminders.smart')} · ${daysLabel}`
        : `${t('detail.reminders.fixed')} · ${fmtTime(reminder.hour, reminder.minute)} · ${daysLabel}`;

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
        {t('detail.reminders.section')}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('detail.reminders.edit')}
        onPress={() => setEditing(true)}
        style={({ pressed }) => [
          styles.row,
          { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="notifications-outline" size={18} color={theme.tealStrong} />
        <ThemedText type="default" style={styles.rowValue}>
          {summary}
        </ThemedText>
        <Ionicons name="pencil" size={16} color={theme.textSecondary} />
      </Pressable>

      {/* Disabled-by-permission state (D40) — the only "attention" state in this slice. */}
      {permission === false && (
        <View style={[styles.permBanner, { backgroundColor: theme.goldTint, borderColor: theme.gold }]}>
          <Ionicons name="notifications-off-outline" size={18} color={theme.goldStrong} />
          <View style={styles.permText}>
            <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
              {t('detail.reminders.permissionOff')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.reminders.permissionOffBody')}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail.reminders.openSettings')}
            onPress={() => void Linking.openSettings().catch(() => {})}
            hitSlop={6}
            style={({ pressed }) => [styles.permBtn, { borderColor: theme.goldStrong }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
              {t('detail.reminders.openSettings')}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {editing && (
        <ReminderEditor
          journey={journey}
          initial={reminder}
          dayOrder={dayOrder}
          weekdayNames={weekdayNames}
          onClose={() => setEditing(false)}
        />
      )}
    </View>
  );
}

/** The Off/Fixed/Smart editor modal. Holds local draft state; saves through the AppCore facade. */
function ReminderEditor({
  journey,
  initial,
  dayOrder,
  weekdayNames,
  onClose,
}: {
  journey: Journey;
  initial: { mode: ReminderMode; hour: number; minute: number; weekdays: number[] };
  dayOrder: number[];
  weekdayNames: string[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const { core } = useApp();

  const [mode, setMode] = useState<ReminderMode>(initial.mode);
  const [timeText, setTimeText] = useState(fmtTime(initial.hour, initial.minute));
  // Empty stored weekdays = every day → all selected in the editor.
  const [days, setDays] = useState<number[]>(
    initial.weekdays.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : [...initial.weekdays],
  );

  const parsed = parseTime(timeText);
  // Smart needs no time — the app chooses it — so only the days have to hold up.
  const canSave =
    mode === 'off' || (days.length > 0 && (mode === 'smart' || !!parsed));

  const toggleDay = (d: number) =>
    setDays((prev) => {
      if (prev.includes(d)) {
        // Never allow zero days (a Fixed reminder with no day fires nothing).
        return prev.length > 1 ? prev.filter((x) => x !== d) : prev;
      }
      return [...prev, d];
    });

  const onSave = async () => {
    const weekdaysToSave = days.length === 7 ? [] : days;
    if (mode === 'off') {
      await core.setJourneyReminderOff(journey.id);
    } else if (mode === 'smart') {
      await core.setJourneyReminderSmart(journey.id, weekdaysToSave, {
        title: t('new.reminders.notificationTitle', { title: journey.title }),
        body: t('new.reminders.notificationBody'),
      });
    } else if (parsed) {
      await core.setJourneyReminderFixed(
        journey.id,
        { hour: parsed.hour, minute: parsed.minute, weekdays: weekdaysToSave },
        {
          title: t('new.reminders.notificationTitle', { title: journey.title }),
          body: t('new.reminders.notificationBody'),
        },
      );
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <ThemedText type="subtitle">{t('detail.reminders.editorTitle')}</ThemedText>

          {/* Mode selector: Off / Fixed + a disabled Smart affordance. */}
          <View style={styles.modeRow}>
            <ModeChip label={t('detail.reminders.modeOff')} active={mode === 'off'} onPress={() => setMode('off')} />
            <ModeChip
              label={t('detail.reminders.modeFixed')}
              active={mode === 'fixed'}
              onPress={() => setMode('fixed')}
            />
            <ModeChip
              label={t('detail.reminders.modeSmart')}
              active={mode === 'smart'}
              onPress={() => setMode('smart')}
            />
          </View>

          {mode === 'smart' && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.reminders.smartExplain')}
            </ThemedText>
          )}

          {mode === 'fixed' && (
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('detail.reminders.time')}
              </ThemedText>
              <TextInput
                value={timeText}
                onChangeText={setTimeText}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={5}
                textAlign="center"
                style={[styles.timeInput, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.background }]}
              />
            </View>
          )}

          {mode !== 'off' && (
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {mode === 'smart' ? t('detail.reminders.smartDays') : t('detail.reminders.days')}
              </ThemedText>
              <View style={styles.daysRow}>
                {dayOrder.map((d) => {
                  const active = days.includes(d);
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={weekdayNames[d]}
                      onPress={() => toggleDay(d)}
                      style={[
                        styles.dayChip,
                        { borderColor: active ? theme.teal : theme.hairline, backgroundColor: active ? theme.teal : 'transparent' },
                      ]}>
                      <ThemedText type="small" style={{ color: active ? theme.background : theme.textSecondary }}>
                        {weekdayNames[d].slice(0, 2)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancel', { ns: 'common' })}
              onPress={onClose}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('cancel', { ns: 'common' })}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('save', { ns: 'common' })}
              disabled={!canSave}
              onPress={onSave}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.teal },
                !canSave && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t('save', { ns: 'common' })}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.modeChip,
        { borderColor: active ? theme.teal : theme.hairline, backgroundColor: active ? theme.teal : 'transparent' },
      ]}>
      <ThemedText type="small" style={{ color: active ? theme.background : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.two },
  blockLabel: { marginBottom: Spacing.half },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  rowValue: { flex: 1 },
  pressed: { opacity: 0.7 },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  permText: { flex: 1, gap: 1 },
  permBtn: {
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  modeChip: {
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  field: { gap: Spacing.two },
  timeInput: {
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    alignSelf: 'flex-start',
    minWidth: 96,
  },
  daysRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  dayChip: {
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minWidth: 36,
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
