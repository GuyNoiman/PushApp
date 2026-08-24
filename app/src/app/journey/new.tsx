/**
 * Journey creation wizard ("Build your own") — the POC subset of
 * 04_Product/UX/Journey_Creation_Screen.md. A short, low-effort wizard:
 * Name → your Why → Duration & rhythm → Steps (+ Starter Step) → Reminders →
 * Summary. Only the Name is truly required; everything else has sensible
 * defaults (Product_Bible §5: "complexity belongs to the system, not the user").
 * Visual language matches mockup v14 screens 05–08: pencil-edit value rows,
 * a below-bars step tooltip, a "Recommended" Starter Step card, and grey
 * delete-chip lines on "Your why". Privacy/support and public/creator are out
 * of POC scope (POC_and_MVP_Scope.md), so this wizard stays at 6 stages, not
 * the full 7 shown in the mockup gallery.
 *
 * Presentational only — it gathers input and calls the AppCore facade to create
 * the Journey. No reward/Buddy/Journey math lives here (Engineering Bible §19).
 * Out of POC scope and intentionally omitted: Phases, public/creator, Support.
 */
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/journey/ChoiceChips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { FUTURE_JOURNEY_POLICY } from '@/core/config/futureJourneys';
import {
  clampJourneyDays,
  MAX_JOURNEY_DAYS,
  OFFERED_JOURNEY_DAYS,
} from '@/core/config/journeyLength';
import type { NewStepInput } from '@/core/engines/JourneyEngine';
import { startInstantInDays } from '@/core/journeys/futureJourneys';
import type { Cadence, Journey, Rhythm, SchedulingPrefs } from '@/core/types/domain';
import { defaultReminderTimeFor } from '@/core/util/reminderView';
import { useTheme } from '@/hooks/use-theme';
import { isolate, isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** A Step the user is still editing in the wizard (before it becomes a real Step). */
interface DraftStep {
  key: string;
  title: string;
  description: string;
  cadence: Cadence;
}

// The six wizard stages, keyed for i18n (`new.stages.<key>`). Labels are resolved
// through `t` in the component so the wizard reads in the active language.
const STAGE_KEYS = ['name', 'why', 'duration', 'steps', 'reminders', 'summary'] as const;

// Option *values* live here (config-before-code); their labels resolve via `t`
// inside the component so nothing user-facing is hard-coded in English.
const RHYTHM_VALUES: Rhythm[] = ['daily', 'few-times-week', 'weekly'];
// The one-tap lengths. Any number up to the ceiling is reachable through the field beside them
// (founder, 2026-08-25: "up to 60 means 10 and 50 too"), and the ceiling itself lives in
// `core/config/journeyLength` so the wizard and the coach can never offer different maximums.
const DURATION_VALUES = OFFERED_JOURNEY_DAYS;
const CADENCE_VALUES: Cadence[] = ['once', 'daily', 'weekly'];
const REMINDER_SLOTS = [
  { hour: 8, minute: 0, key: 'morning' },
  { hour: 12, minute: 0, key: 'midday' },
  { hour: 19, minute: 0, key: 'evening' },
] as const;

/**
 * The slot to pre-select: the one closest to when the user has told us they are available
 * ({@link defaultReminderTimeFor} with no Journey yet, so it reads Active Hours). Falls out as
 * "midday" for an account with no preference, which is the least likely of the three to land
 * somewhere the user is asleep.
 */
function nearestReminderSlot(prefs: SchedulingPrefs): number {
  const { hour, minute } = defaultReminderTimeFor({ steps: [] }, prefs);
  const target = hour * 60 + minute;
  let best = 0;
  for (let i = 1; i < REMINDER_SLOTS.length; i++) {
    const here = Math.abs(REMINDER_SLOTS[i].hour * 60 + REMINDER_SLOTS[i].minute - target);
    const bestSoFar = Math.abs(REMINDER_SLOTS[best].hour * 60 + REMINDER_SLOTS[best].minute - target);
    if (here < bestSoFar) best = i;
  }
  return best;
}

/**
 * The three start modes offered at final approval (Future Journey Management, §5). `now` is the
 * DEFAULT, so a user who never touches this row gets exactly today's behaviour: a Journey that starts
 * immediately, created through the unchanged {@link AppCore.createJourney}.
 */
const START_MODE_VALUES = ['now', 'scheduled', 'manual'] as const;
type StartModeValue = (typeof START_MODE_VALUES)[number];

/**
 * Date selection WITHOUT a native picker, on purpose: the app ships no date-picker dependency, and
 * adding one would break the Expo Go / web preview this is tested in. So a scheduled start is chosen
 * as a day OFFSET — one tap for the common answers ({@link FUTURE_JOURNEY_POLICY.startPresetDays}),
 * then a day at a time in either direction for anything else. The resolved calendar date is always
 * shown in full, so the user is choosing a date, not an abstraction.
 */
const START_PRESET_KEYS = ['week', 'twoWeeks', 'month'] as const;

let draftCounter = 0;
function newDraftStep(): DraftStep {
  draftCounter += 1;
  return { key: `draft_${draftCounter}`, title: '', description: '', cadence: 'weekly' };
}

export default function NewJourneyScreen() {
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('journey');

  const [stage, setStage] = useState(0);
  const [openTooltip, setOpenTooltip] = useState<number | null>(null);

  // Stage 1 — Name.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  // Stage 2 — Your why (identity & motivation). Saved as Journey.why[].
  const [whyStart, setWhyStart] = useState('');
  const [whyKeepGoing, setWhyKeepGoing] = useState('');
  const [hardMoments, setHardMoments] = useState<string[]>([]); // "what to remember when it's hard"
  const [hardMomentDraft, setHardMomentDraft] = useState('');

  // Stage 3 — Duration & rhythm.
  const [durationDays, setDurationDays] = useState(60);
  const [rhythm, setRhythm] = useState<Rhythm>('daily');
  const [editingField, setEditingField] = useState<'duration' | 'rhythm' | null>(null);

  // Stage 4 — Steps. The first Step is a recommended Starter Step (≤2 min).
  const [starterTitle, setStarterTitle] = useState('');
  const [starterDescription, setStarterDescription] = useState('');
  const [starterOpen, setStarterOpen] = useState(false);
  const [steps, setSteps] = useState<DraftStep[]>([]);

  // Stage 5 — Reminders. ON by default, matching the app-wide default a Journey now arrives with
  // (founder, 2026-08-17): a plan you are never reminded of is a plan you will not do. The toggle is
  // the one-tap opt-out, and switching it off is written back as an explicit Off on create, so what
  // this screen shows is what the Journey actually gets. Permission is still requested in-context.
  const [remindEnabled, setRemindEnabled] = useState(true);
  // The pre-selected slot is the one nearest the user's OWN Active Hours, not a fixed "morning".
  // This screen used to offer 08:00 by default while the engine's default rule used 09:00, so the
  // same Journey was reminded at a different time depending on which screen created it — and 08:00
  // can sit outside the window the user told us they are available in.
  const [remindTimeIndex, setRemindTimeIndex] = useState(() =>
    nearestReminderSlot(core.getSchedulingPrefs()),
  );

  // Stage 6 — the start mode (Future Journey Management §5), chosen at FINAL APPROVAL. Defaults to
  // `now`: leaving this row alone creates the Journey exactly as it always has.
  const [startMode, setStartMode] = useState<StartModeValue>('now');
  const [startInDays, setStartInDays] = useState<number>(FUTURE_JOURNEY_POLICY.startPresetDays[0]);

  const [creating, setCreating] = useState(false);

  const canContinue = stage !== 0 || title.trim().length > 0;
  const isLast = stage === STAGE_KEYS.length - 1;

  // User-facing labels for the option chips, resolved in the active language.
  const rhythmOptions = useMemo(
    () => RHYTHM_VALUES.map((value) => ({ value, label: t(`new.rhythm.${value}`) })),
    [t],
  );
  const durationOptions = useMemo(
    () => DURATION_VALUES.map((value) => ({ value, label: t(`new.duration.${value}`) })),
    [t],
  );
  /** What is being typed in the "or a number of days" field, before it is applied. */
  const [durationDraft, setDurationDraft] = useState('');
  const applyDurationDraft = useCallback(() => {
    const typed = Number.parseInt(durationDraft, 10);
    setDurationDraft('');
    if (!Number.isFinite(typed)) return;
    // Clamped, never refused: somebody who types 90 gets 60 and can see that they did, which is a
    // better answer than an error message about a rule they did not know.
    setDurationDays(clampJourneyDays(typed));
    setEditingField(null);
  }, [durationDraft]);
  const cadenceOptions = useMemo(
    () => CADENCE_VALUES.map((value) => ({ value, label: t(`new.cadence.${value}`) })),
    [t],
  );
  const reminderOptions = REMINDER_SLOTS.map((slot, index) => ({
    value: index,
    label: t(`new.reminders.${slot.key}`),
  }));

  // The Future list is capped (§10). At the cap the two "for later" modes are shown DIMMED with a
  // plain explanation beside them — never hidden, never an error dialog, and never a silent failure
  // at Create. Start now is always available, so the wizard can never dead-end.
  const futureFull = snapshot?.futureCapacity?.capReached ?? false;
  const startModeOptions = useMemo(
    () =>
      START_MODE_VALUES.map((value) => ({
        value,
        label: t(`new.start.${value}`),
        disabled: futureFull && value !== 'now',
      })),
    [t, futureFull],
  );
  const startPresetOptions = useMemo(
    () =>
      FUTURE_JOURNEY_POLICY.startPresetDays.map((days, index) => ({
        value: days,
        label: t(`new.start.presets.${START_PRESET_KEYS[index]}`),
      })),
    [t],
  );

  // The chosen day, resolved through the pure helper so the wizard, the summary and the stored
  // instant can never disagree. Recomputed per render (it depends on today) — cheap, and always
  // right if the screen is left open across midnight.
  const startsAt = startInstantInDays(startInDays, Date.now());
  const startDateLabel = new Date(startsAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const nudgeStartDay = (delta: number) =>
    setStartInDays((days) =>
      Math.min(
        FUTURE_JOURNEY_POLICY.maxScheduleDays,
        Math.max(FUTURE_JOURNEY_POLICY.minScheduleDays, days + delta),
      ),
    );

  const why = useMemo(
    () => [whyStart.trim(), whyKeepGoing.trim(), ...hardMoments].filter(Boolean),
    [whyStart, whyKeepGoing, hardMoments],
  );

  const stepInputs = useMemo<NewStepInput[]>(() => {
    const list: NewStepInput[] = [];
    if (starterTitle.trim()) {
      list.push({
        title: starterTitle.trim(),
        description: starterDescription.trim() || undefined,
        isStarterStep: true,
        cadence: 'once',
      });
    }
    for (const s of steps) {
      if (s.title.trim()) {
        list.push({
          title: s.title.trim(),
          description: s.description.trim() || undefined,
          cadence: s.cadence,
        });
      }
    }
    return list;
  }, [starterTitle, starterDescription, steps]);

  const addHardMoment = () => {
    const value = hardMomentDraft.trim();
    if (!value) return;
    setHardMoments((prev) => [...prev, value]);
    setHardMomentDraft('');
  };

  const removeHardMoment = (index: number) =>
    setHardMoments((prev) => prev.filter((_, i) => i !== index));

  const updateStep = (key: string, patch: Partial<DraftStep>) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const removeStep = (key: string) => setSteps((prev) => prev.filter((s) => s.key !== key));

  const goToStage = (next: number) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenTooltip(null);
    setStage(next);
  };

  // Dismiss the modal safely — router.back() is a no-op with no history
  // (web reload / deep-link straight onto this route), which would trap the user.
  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const handleCreate = async () => {
    if (creating || !title.trim()) return;
    setCreating(true);
    try {
      const input = {
        title: title.trim(),
        why,
        durationDays,
        rhythm,
        steps: stepInputs,
        // Journey Support Circle (D2): a wizard-built Journey has user-typed Step titles, so it is
        // Companion-INELIGIBLE — it may only ever offer the Encourager bundle.
        createdVia: 'manual' as const,
      };

      // The start mode chosen at final approval (§5). `now` keeps the original call untouched; the
      // two "for later" modes go through the Future facade, which can decline at the cap — in which
      // case nothing was created, so the wizard stays open rather than dismissing onto nothing.
      let journey: Journey | null;
      if (startMode === 'now') {
        journey = core.createJourney(input);
      } else if (startMode === 'scheduled') {
        journey = core.createFutureJourney(input, {
          mode: 'scheduled',
          at: startsAt,
          // The user's zone at approval, stored as CONTEXT only — `startsAt` is already absolute and
          // is never re-derived from it.
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        journey = core.createFutureJourney(input, { mode: 'manual' });
      }
      if (!journey) return;

      if (remindEnabled) {
        // Ask for notification permission only now, in context (never at launch).
        await core.initReminders();
        const time = REMINDER_SLOTS[remindTimeIndex];
        // Create a MANAGED Fixed ReminderRule (D40) rather than a raw one-off notification, so it
        // is viewable/editable afterward on the Journey screen. It schedules through the
        // Communication Scheduler when permission is granted, and is (re)scheduled once granted
        // otherwise — so we save it regardless of the permission result.
        await core.setJourneyReminderFixed(
          journey.id,
          { hour: time.hour, minute: time.minute, weekdays: [] },
          {
            title: t('new.reminders.notificationTitle', { title: journey.title }),
            body: starterTitle.trim() || t('new.reminders.notificationBody'),
          },
        );
      } else {
        // The user deliberately turned the reminder off in the wizard. A Journey now arrives with a
        // default reminder ON, so that choice has to be written back — otherwise the app would nudge
        // someone who just told it not to. The rule keeps its time for an easy switch back on.
        await core.setJourneyReminderOff(journey.id);
      }

      dismiss();
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: theme.hairline, color: theme.text }];
  const rhythmLabel = t(`new.rhythm.${rhythm}`);
  const durationLabel = DURATION_VALUES.includes(durationDays)
    ? t(`new.duration.${durationDays}`)
    : t('new.duration.days', { count: durationDays });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          <View style={[styles.top, { borderBottomColor: theme.hairline }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('new.closeA11y')}
              onPress={dismiss}
              style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]}>
              <ChevronIcon color={theme.textSecondary} />
            </Pressable>
            <ThemedText type="subtitle" style={styles.topTitle}>
              {stage === 1 ? t('new.stages.why') : t('new.header')}
            </ThemedText>
            {/* "3 / 6" is two numbers around a neutral separator: left to the RTL paragraph
                it would swap into "6 / 3". Isolated, the counter keeps its own order. */}
            <ThemedText type="small" themeColor="textMuted">
              {isolate(t('new.progress', { current: stage + 1, total: STAGE_KEYS.length }))}
            </ThemedText>
          </View>

          <View style={styles.body}>
            <View style={styles.progressWrap}>
              <View style={styles.progressBars}>
                {STAGE_KEYS.map((key, index) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={t('new.stageA11y', {
                      label: t(`new.stages.${key}`),
                      index: index + 1,
                      total: STAGE_KEYS.length,
                    })}
                    onPress={() => setOpenTooltip((prev) => (prev === index ? null : index))}
                    hitSlop={{ top: 8, bottom: 8 }}
                    style={styles.progressBarHit}>
                    <View
                      style={[
                        styles.progressBar,
                        { backgroundColor: index <= stage ? theme.teal : theme.hairline },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
              {openTooltip !== null && (
                <View style={styles.tooltipRow}>
                  <View style={[styles.tooltip, { backgroundColor: theme.text }]}>
                    <ThemedText type="small" style={[styles.tooltipText, { color: theme.backgroundElement }]}>
                      {t(`new.stages.${STAGE_KEYS[openTooltip]}`)}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {stage !== 1 && (
              <ThemedText type="subtitle" style={styles.stageTitle}>
                {stage === 0 ? t('new.stage0Title') : t(`new.stages.${STAGE_KEYS[stage]}`)}
              </ThemedText>
            )}

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {stage === 0 && (
                <View style={styles.stack}>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow
                      label={t('new.name.label')}
                      value={title || t('new.name.untitled')}
                      valueColor={title ? theme.text : theme.textMuted}
                      editing={editingTitle}
                      onPress={() => setEditingTitle((v) => !v)}
                    />
                    {editingTitle && (
                      <TextInput
                        style={[...inputStyle, styles.rowEditInput]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('new.name.placeholder')}
                        placeholderTextColor={theme.textSecondary}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => setEditingTitle(false)}
                        onBlur={() => setEditingTitle(false)}
                      />
                    )}
                  </View>

                  <View style={styles.field}>
                    <ThemedText type="smallBold">{t('new.description.label')}</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.abig]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t('new.description.placeholder')}
                      placeholderTextColor={theme.textSecondary}
                      multiline
                    />
                  </View>
                </View>
              )}

              {stage === 1 && (
                <View style={styles.stack}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('new.why.intro')}
                  </ThemedText>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">{t('new.why.start')}</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.ansBox]}
                      value={whyStart}
                      onChangeText={setWhyStart}
                      placeholder={t('new.why.answerPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      multiline
                    />
                  </View>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">{t('new.why.succeed')}</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.ansBox]}
                      value={whyKeepGoing}
                      onChangeText={setWhyKeepGoing}
                      placeholder={t('new.why.answerPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      multiline
                    />
                  </View>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">{t('new.why.hard')}</ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      {t('new.why.hardHint')}
                    </ThemedText>
                    <View style={styles.addRow}>
                      <View style={[styles.reminderInputWrap, { borderColor: theme.hairline }]}>
                        <TextInput
                          style={[styles.reminderInput, { color: theme.text }]}
                          value={hardMomentDraft}
                          onChangeText={setHardMomentDraft}
                          placeholder={t('new.why.hardPlaceholder')}
                          placeholderTextColor={theme.textMuted}
                          maxLength={50}
                          returnKeyType="done"
                          onSubmitEditing={addHardMoment}
                        />
                        <ThemedText type="small" themeColor="textMuted" style={styles.charHint}>
                          {t('new.why.charHint', { count: hardMomentDraft.length })}
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('new.why.addA11y')}
                        onPress={addHardMoment}
                        style={[styles.addButton, { backgroundColor: theme.teal }]}>
                        <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                          {t('add', { ns: 'common' })}
                        </ThemedText>
                      </Pressable>
                    </View>
                    {hardMoments.map((line, index) => (
                      <View
                        key={`${line}_${index}`}
                        style={[styles.savedChip, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" style={styles.savedChipText}>
                          {line}
                        </ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('new.why.removeA11y', { line })}
                          onPress={() => removeHardMoment(index)}
                          hitSlop={6}>
                          <XIcon color={theme.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {stage === 2 && (
                <View style={styles.stack}>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow
                      label={t('new.duration.label')}
                      value={durationLabel}
                      valueColor={theme.tealStrong}
                      editing={editingField === 'duration'}
                      onPress={() =>
                        setEditingField((v) => (v === 'duration' ? null : 'duration'))
                      }
                    />
                    {editingField === 'duration' && (
                      <View style={styles.rowEditInput}>
                        <ChoiceChips
                          options={durationOptions}
                          value={durationDays}
                          onChange={(v) => {
                            setDurationDays(v);
                            setEditingField(null);
                          }}
                        />
                        {/* Any number up to the ceiling. A life does not round to the nearest month. */}
                        <View style={styles.durationCustom}>
                          <TextInput
                            value={durationDraft}
                            onChangeText={setDurationDraft}
                            onBlur={applyDurationDraft}
                            onSubmitEditing={applyDurationDraft}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder={t('new.duration.customPlaceholder')}
                            placeholderTextColor={theme.textMuted}
                            style={[styles.input, styles.durationInput, { borderColor: theme.hairline, color: theme.text }]}
                          />
                          <ThemedText type="small" themeColor="textMuted">
                            {t('new.duration.customHint', { max: MAX_JOURNEY_DAYS })}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow
                      label={t('new.rhythm.typeLabel')}
                      value={t('new.rhythm.typeValue')}
                      valueColor={theme.tealStrong}
                    />
                  </View>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow
                      label={t('new.rhythm.label')}
                      value={rhythmLabel}
                      valueColor={theme.tealStrong}
                      editing={editingField === 'rhythm'}
                      onPress={() => setEditingField((v) => (v === 'rhythm' ? null : 'rhythm'))}
                    />
                    {editingField === 'rhythm' && (
                      <View style={styles.rowEditInput}>
                        <ChoiceChips
                          options={rhythmOptions}
                          value={rhythm}
                          onChange={(v) => {
                            setRhythm(v);
                            setEditingField(null);
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {stage === 3 && (
                <View style={styles.stack}>
                  <View
                    style={[
                      styles.starterBox,
                      { backgroundColor: theme.successTint, borderColor: theme.success },
                    ]}>
                    <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                      <StarIcon color={theme.tealStrong} />
                      <ThemedText type="small" style={{ color: theme.tealStrong, fontWeight: '700' }}>
                        {t('new.steps.recommended')}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.starterCopy}>
                      {t('new.steps.starterCopyPre')}
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {t('new.steps.starterCopyBold')}
                      </ThemedText>
                      {t('new.steps.starterCopyPost')}
                    </ThemedText>
                  </View>

                  {starterOpen ? (
                    <ThemedView type="backgroundElement" style={styles.stepBox}>
                      <View style={styles.stepBoxHeader}>
                        <View style={styles.starterHeader}>
                          <StarIcon color={theme.tealStrong} />
                          <ThemedText type="small" style={{ color: theme.tealStrong, fontWeight: '700' }}>
                            {t('new.steps.starterLabel')}
                          </ThemedText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('new.steps.removeStarterA11y')}
                          onPress={() => {
                            setStarterOpen(false);
                            setStarterTitle('');
                            setStarterDescription('');
                          }}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            {t('remove', { ns: 'common' })}
                          </ThemedText>
                        </Pressable>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('new.steps.starterExamples')}
                      </ThemedText>
                      <TextInput
                        style={inputStyle}
                        value={starterTitle}
                        onChangeText={setStarterTitle}
                        placeholder={t('new.steps.starterPlaceholder')}
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TextInput
                        style={[...inputStyle, styles.multiline]}
                        value={starterDescription}
                        onChangeText={setStarterDescription}
                        placeholder={t('new.steps.starterDetailPlaceholder')}
                        placeholderTextColor={theme.textSecondary}
                        multiline
                      />
                    </ThemedView>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('new.steps.addStarter')}
                      onPress={() => setStarterOpen(true)}
                      style={[styles.addStep, { borderColor: theme.success }]}>
                      <StarIcon color={theme.tealStrong} />
                      <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                        {t('new.steps.addStarter')}
                      </ThemedText>
                    </Pressable>
                  )}

                  {steps.map((step, index) => (
                    <ThemedView key={step.key} type="backgroundElement" style={styles.stepBox}>
                      <View style={styles.stepBoxHeader}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('new.steps.stepN', { index: index + 1 })}
                        </ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('new.steps.removeStepA11y', { index: index + 1 })}
                          onPress={() => removeStep(step.key)}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            {t('remove', { ns: 'common' })}
                          </ThemedText>
                        </Pressable>
                      </View>
                      <TextInput
                        style={inputStyle}
                        value={step.title}
                        onChangeText={(text) => updateStep(step.key, { title: text })}
                        placeholder={t('new.steps.stepTitlePlaceholder')}
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TextInput
                        style={[...inputStyle, styles.multiline]}
                        value={step.description}
                        onChangeText={(text) => updateStep(step.key, { description: text })}
                        placeholder={t('new.steps.stepDetailPlaceholder')}
                        placeholderTextColor={theme.textSecondary}
                        multiline
                      />
                      <ChoiceChips
                        options={cadenceOptions}
                        value={step.cadence}
                        onChange={(value) => updateStep(step.key, { cadence: value })}
                      />
                    </ThemedView>
                  ))}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('new.steps.addStep')}
                    onPress={() => setSteps((prev) => [...prev, newDraftStep()])}
                    style={[styles.addStep, { borderColor: theme.coral }]}>
                    <PlusIcon color={theme.coralStrong} />
                    <ThemedText type="smallBold" style={{ color: theme.coralStrong }}>
                      {t('new.steps.addStep')}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {stage === 4 && (
                <View style={styles.stack}>
                  <View style={styles.switchRow}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{t('new.reminders.toggle')}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('new.reminders.toggleHint')}
                      </ThemedText>
                    </View>
                    <Switch value={remindEnabled} onValueChange={setRemindEnabled} />
                  </View>
                  {remindEnabled && (
                    <View style={styles.field}>
                      <ThemedText type="smallBold">{t('new.reminders.when')}</ThemedText>
                      <ChoiceChips
                        options={reminderOptions}
                        value={remindTimeIndex}
                        onChange={setRemindTimeIndex}
                      />
                    </View>
                  )}
                </View>
              )}

              {stage === 5 && (
                <View style={styles.stack}>
                  <SummaryRow label={t('new.summary.journey')} value={title.trim() || t('new.summary.none')} />
                  <SummaryRow label={t('new.summary.duration')} value={durationLabel} />
                  <SummaryRow label={t('new.summary.rhythm')} value={rhythmLabel} />
                  <SummaryRow
                    label={t('new.summary.steps')}
                    value={
                      stepInputs.length === 0
                        ? t('new.summary.noStepsYet')
                        : stepInputs.some((s) => s.isStarterStep)
                          ? t('new.summary.stepsWithStarter', { count: stepInputs.length })
                          : t('new.summary.stepsCount', { count: stepInputs.length })
                    }
                  />
                  <SummaryRow
                    label={t('new.summary.why')}
                    value={why.length === 0 ? t('new.summary.none') : t('new.summary.whySaved', { count: why.length })}
                  />
                  <SummaryRow
                    label={t('new.summary.reminder')}
                    value={
                      remindEnabled
                        ? t(`new.reminders.${REMINDER_SLOTS[remindTimeIndex].key}`)
                        : t('new.summary.off')
                    }
                  />
                  <SummaryRow
                    label={t('new.summary.start')}
                    value={
                      startMode === 'scheduled'
                        ? startDateLabel
                        : t(`new.start.${startMode}`)
                    }
                  />

                  {/* WHEN DOES IT START (Future Journey Management §5) — the last question before
                      Create, because that is the moment the plan is approved. Three chips, with
                      "Start now" preselected: doing nothing here behaves exactly as it always has. */}
                  <View style={[styles.field, styles.startBlock]}>
                    <ThemedText type="smallBold">{t('new.start.label')}</ThemedText>
                    <ChoiceChips
                      options={startModeOptions}
                      value={startMode}
                      onChange={setStartMode}
                    />
                    {futureFull && (
                      <ThemedText type="small" themeColor="textMuted">
                        {t('new.start.full', { max: FUTURE_JOURNEY_POLICY.max })}
                      </ThemedText>
                    )}

                    {/* No native date picker on purpose: presets for the common answers, then a day
                        at a time either way. The resolved date reads in full above the nudges. */}
                    {startMode === 'scheduled' && !futureFull && (
                      <View style={styles.field}>
                        <ChoiceChips
                          options={startPresetOptions}
                          value={startInDays}
                          onChange={setStartInDays}
                        />
                        <View style={[styles.dateRow, { borderColor: theme.hairline }]}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('new.start.earlierA11y')}
                            disabled={startInDays <= FUTURE_JOURNEY_POLICY.minScheduleDays}
                            onPress={() => nudgeStartDay(-1)}
                            style={[
                              styles.dateNudge,
                              { backgroundColor: theme.tealTint },
                              startInDays <= FUTURE_JOURNEY_POLICY.minScheduleDays && styles.disabled,
                            ]}>
                            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                              −
                            </ThemedText>
                          </Pressable>
                          <ThemedText type="smallBold" style={styles.dateValue}>
                            {t('new.start.on', { date: startDateLabel })}
                          </ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('new.start.laterA11y')}
                            disabled={startInDays >= FUTURE_JOURNEY_POLICY.maxScheduleDays}
                            onPress={() => nudgeStartDay(1)}
                            style={[
                              styles.dateNudge,
                              { backgroundColor: theme.tealTint },
                              startInDays >= FUTURE_JOURNEY_POLICY.maxScheduleDays && styles.disabled,
                            ]}>
                            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                              +
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {startMode === 'manual' && !futureFull && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('new.start.manualHint')}
                      </ThemedText>
                    )}
                  </View>

                  <ThemedText type="small" themeColor="textSecondary" style={styles.summaryNote}>
                    {t('new.summary.note')}
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.navlbl}>
                <ThemedText type="small" themeColor="textMuted">
                  {/* The guillemets are Bidi-MIRRORED characters, so inside Hebrew copy the
                      renderer would flip them a second time and undo the choice below. Isolating
                      each glyph pins it to its own (LTR) run, so what we pick is what is drawn. */}
                  {stage > 0
                    ? `${isolate(isRTL() ? '›' : '‹')} ${t(`new.stages.${STAGE_KEYS[stage - 1]}`)}`
                    : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {!isLast
                    ? `${t(`new.stages.${STAGE_KEYS[stage + 1]}`)} ${isolate(isRTL() ? '‹' : '›')}`
                    : ''}
                </ThemedText>
              </View>
              <View style={styles.footerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('back', { ns: 'common' })}
                  disabled={stage === 0}
                  onPress={() => goToStage(Math.max(0, stage - 1))}
                  style={[
                    styles.navButton,
                    styles.outlineButton,
                    { borderColor: theme.tealTint, backgroundColor: theme.backgroundElement },
                    stage === 0 && styles.disabled,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {t('back', { ns: 'common' })}
                  </ThemedText>
                </Pressable>

                {isLast ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('new.createA11y')}
                    disabled={!title.trim() || creating}
                    onPress={handleCreate}
                    style={[
                      styles.navButton,
                      styles.primary,
                      { backgroundColor: theme.coral },
                      (!title.trim() || creating) && styles.disabled,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                      {creating ? t('new.creating') : t('create', { ns: 'common' })}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('next', { ns: 'common' })}
                    disabled={!canContinue}
                    onPress={() => goToStage(Math.min(STAGE_KEYS.length - 1, stage + 1))}
                    style={[
                      styles.navButton,
                      styles.primary,
                      { backgroundColor: theme.coral },
                      !canContinue && styles.disabled,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                      {t('next', { ns: 'common' })}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** A labelled value row with a pencil edit affordance (mockup v14: `.rowE`/`.editpen`). */
function EditRow({
  label,
  value,
  valueColor,
  editing,
  onPress,
}: {
  label: string;
  value: string;
  valueColor?: string;
  editing?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  return (
    <View style={[styles.rowE, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="smallBold" style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </ThemedText>
      {onPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('new.name.editA11y', { label })}
          accessibilityState={{ expanded: !!editing }}
          onPress={onPress}
          hitSlop={6}
          style={[styles.editPen, { backgroundColor: theme.tealTint }]}>
          <PencilIcon color={theme.tealStrong} />
        </Pressable>
      )}
    </View>
  );
}

/** A label/value row on the final Summary stage. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.summaryValue}>
        {value}
      </ThemedText>
    </View>
  );
}

// ── Inline icons (Design System: no icon-font CDN; small hand-drawn SVGs) ──

/**
 * The wizard's back chevron. An SVG path is drawn in absolute coordinates and is NOT
 * mirrored by the layout, so "back" has to be flipped by hand to keep pointing at
 * where the user came from — the right-hand side under RTL.
 */
function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={isRTL() ? styles.mirrored : undefined}>
      <Path
        d="M15 6l-6 6 6 6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20l4-1 11-11-3-3L5 16l-1 4z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="14" y1="7" x2="17" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7L12 2z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  flex: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  progressWrap: {
    zIndex: 3,
  },
  progressBars: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  progressBarHit: {
    flex: 1,
    paddingVertical: Spacing.one,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
  },
  tooltipRow: {
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  tooltip: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  tooltipText: {
    // Colour is applied inline from the active theme (backgroundElement).
    fontWeight: '600',
  },
  stageTitle: {
    marginTop: Spacing.three,
  },
  content: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  stack: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  qBlock: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  abig: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  ansBox: {
    minHeight: 46,
    textAlignVertical: 'top',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // ── Edit row (Name / Duration / Type / How often) ──
  rowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    // backgroundColor is applied inline from the active theme (backgroundElement).
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowValue: {
    marginStart: 'auto',
  },
  editPen: {
    width: 30,
    height: 30,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationCustom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  durationInput: { width: 72, textAlign: 'center' },
  rowEditInput: {
    marginTop: Spacing.two,
  },

  // ── Your why ──
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reminderInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderInput: {
    flex: 1,
    fontSize: 14,
  },
  charHint: {
    marginStart: Spacing.two,
  },
  addButton: {
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  savedChipText: {
    flex: 1,
    marginEnd: Spacing.two,
  },

  // ── Plan the steps ──
  starterBox: {
    borderWidth: 1.5,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  starterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  starterCopy: {
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
  },
  stepBox: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  stepBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.card,
    paddingVertical: Spacing.three,
  },

  // ── Reminders ──
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },

  // ── Summary ──
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'auto',
  },
  summaryNote: {
    marginTop: Spacing.two,
  },
  startBlock: {
    marginTop: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  // ≥44pt touch targets on both nudges (a11y), with the date reading between them.
  dateNudge: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: {
    flex: 1,
    textAlign: 'center',
  },

  // ── Footer ──
  footer: {
    paddingBottom: Spacing.three,
    paddingTop: Spacing.one,
  },
  navlbl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.one,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navButton: {
    flex: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    borderWidth: 1.5,
  },
  primary: {
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.35,
  },
  // Hand-mirror for artwork the layout can't flip for us (SVG paths).
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
