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
import { useMemo, useState } from 'react';
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
import type { NewStepInput } from '@/core/engines/JourneyEngine';
import type { Cadence, Rhythm } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
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

const STAGE_TITLES = ['Name', 'Your why', 'Duration & rhythm', 'Steps', 'Reminders', 'Summary'];

const RHYTHM_OPTIONS: { value: Rhythm; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'few-times-week', label: 'A few times a week' },
  { value: 'weekly', label: 'Weekly' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const REMINDER_TIMES = [
  { hour: 8, minute: 0, label: 'Morning · 8:00' },
  { hour: 12, minute: 0, label: 'Midday · 12:00' },
  { hour: 19, minute: 0, label: 'Evening · 19:00' },
];

const STARTER_EXAMPLES = 'e.g. "Put on workout clothes", "Open LinkedIn and save one job"';

let draftCounter = 0;
function newDraftStep(): DraftStep {
  draftCounter += 1;
  return { key: `draft_${draftCounter}`, title: '', description: '', cadence: 'weekly' };
}

export default function NewJourneyScreen() {
  const { core } = useApp();
  const router = useRouter();
  const theme = useTheme();

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

  // Stage 5 — Reminders (opt-in; permission requested in-context on create).
  const [remindEnabled, setRemindEnabled] = useState(false);
  const [remindTimeIndex, setRemindTimeIndex] = useState(0);

  const [creating, setCreating] = useState(false);

  const canContinue = stage !== 0 || title.trim().length > 0;
  const isLast = stage === STAGE_TITLES.length - 1;

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
      const journey = core.createJourney({
        title: title.trim(),
        why,
        durationDays,
        rhythm,
        steps: stepInputs,
      });

      if (remindEnabled) {
        // Ask for notification permission only now, in context (never at launch).
        const granted = await core.initReminders();
        if (granted) {
          const time = REMINDER_TIMES[remindTimeIndex];
          await core.scheduleDailyReminder({
            title: `Time for ${journey.title}`,
            body: starterTitle.trim() || 'Take your next Step.',
            hour: time.hour,
            minute: time.minute,
          });
        }
      }

      dismiss();
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: theme.hairline, color: theme.text }];
  const rhythmLabel = RHYTHM_OPTIONS.find((r) => r.value === rhythm)?.label ?? rhythm;
  const durationLabel =
    DURATION_OPTIONS.find((d) => d.value === durationDays)?.label ?? `${durationDays} days`;

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
              accessibilityLabel="Close"
              onPress={dismiss}
              style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]}>
              <ChevronIcon color={theme.textSecondary} />
            </Pressable>
            <ThemedText type="subtitle" style={styles.topTitle}>
              {stage === 1 ? 'Your why' : 'New Journey'}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {stage + 1} / {STAGE_TITLES.length}
            </ThemedText>
          </View>

          <View style={styles.body}>
            <View style={styles.progressWrap}>
              <View style={styles.progressBars}>
                {STAGE_TITLES.map((label, index) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} — step ${index + 1} of ${STAGE_TITLES.length}`}
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
                    <ThemedText type="small" style={styles.tooltipText}>
                      {STAGE_TITLES[openTooltip]}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {stage !== 1 && (
              <ThemedText type="subtitle" style={styles.stageTitle}>
                {stage === 0 ? 'Name & goal' : STAGE_TITLES[stage]}
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
                      label="Name"
                      value={title || 'Untitled Journey'}
                      valueColor={title ? theme.text : theme.textMuted}
                      editing={editingTitle}
                      onPress={() => setEditingTitle((v) => !v)}
                    />
                    {editingTitle && (
                      <TextInput
                        style={[...inputStyle, styles.rowEditInput]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Run 5km, Learn to draw…"
                        placeholderTextColor={theme.textSecondary}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => setEditingTitle(false)}
                        onBlur={() => setEditingTitle(false)}
                      />
                    )}
                  </View>

                  <View style={styles.field}>
                    <ThemedText type="smallBold">Description</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.abig]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="What this Journey is about, in your words."
                      placeholderTextColor={theme.textSecondary}
                      multiline
                    />
                  </View>
                </View>
              )}

              {stage === 1 && (
                <View style={styles.stack}>
                  <ThemedText type="small" themeColor="textSecondary">
                    A few words now become your own encouragement later — in your voice.
                  </ThemedText>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">Why start this Journey?</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.ansBox]}
                      value={whyStart}
                      onChangeText={setWhyStart}
                      placeholder="Type your answer…"
                      placeholderTextColor={theme.textMuted}
                      multiline
                    />
                  </View>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">How will you feel if you succeed?</ThemedText>
                    <TextInput
                      style={[...inputStyle, styles.ansBox]}
                      value={whyKeepGoing}
                      onChangeText={setWhyKeepGoing}
                      placeholder="Type your answer…"
                      placeholderTextColor={theme.textMuted}
                      multiline
                    />
                  </View>
                  <View style={styles.qBlock}>
                    <ThemedText type="smallBold">What to remember when it&apos;s hard?</ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      Short lines we&apos;ll surface when you&apos;re drifting.
                    </ThemedText>
                    <View style={styles.addRow}>
                      <View style={[styles.reminderInputWrap, { borderColor: theme.hairline }]}>
                        <TextInput
                          style={[styles.reminderInput, { color: theme.text }]}
                          value={hardMomentDraft}
                          onChangeText={setHardMomentDraft}
                          placeholder="A short reminder…"
                          placeholderTextColor={theme.textMuted}
                          maxLength={50}
                          returnKeyType="done"
                          onSubmitEditing={addHardMoment}
                        />
                        <ThemedText type="small" themeColor="textMuted" style={styles.charHint}>
                          {hardMomentDraft.length}/50
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add reminder"
                        onPress={addHardMoment}
                        style={[styles.addButton, { backgroundColor: theme.teal }]}>
                        <ThemedText type="smallBold" style={styles.addButtonLabel}>
                          Add
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
                          accessibilityLabel={`Remove ${line}`}
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
                      label="Duration"
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
                          options={DURATION_OPTIONS}
                          value={durationDays}
                          onChange={(v) => {
                            setDurationDays(v);
                            setEditingField(null);
                          }}
                        />
                      </View>
                    )}
                  </View>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow label="Type" value="Frequency" valueColor={theme.tealStrong} />
                  </View>
                  <View style={[styles.field, { borderColor: theme.hairline }]}>
                    <EditRow
                      label="How often"
                      value={rhythmLabel}
                      valueColor={theme.tealStrong}
                      editing={editingField === 'rhythm'}
                      onPress={() => setEditingField((v) => (v === 'rhythm' ? null : 'rhythm'))}
                    />
                    {editingField === 'rhythm' && (
                      <View style={styles.rowEditInput}>
                        <ChoiceChips
                          options={RHYTHM_OPTIONS}
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
                        Recommended
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.starterCopy}>
                      Adding a small first Step you can finish in{' '}
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        up to 2 minutes
                      </ThemedText>{' '}
                      raises your chance of completing the Journey.
                    </ThemedText>
                  </View>

                  {starterOpen ? (
                    <ThemedView type="backgroundElement" style={styles.stepBox}>
                      <View style={styles.stepBoxHeader}>
                        <View style={styles.starterHeader}>
                          <StarIcon color={theme.tealStrong} />
                          <ThemedText type="small" style={{ color: theme.tealStrong, fontWeight: '700' }}>
                            Starter Step
                          </ThemedText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove Starter Step"
                          onPress={() => {
                            setStarterOpen(false);
                            setStarterTitle('');
                            setStarterDescription('');
                          }}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            Remove
                          </ThemedText>
                        </Pressable>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {STARTER_EXAMPLES}
                      </ThemedText>
                      <TextInput
                        style={inputStyle}
                        value={starterTitle}
                        onChangeText={setStarterTitle}
                        placeholder="Your ≤2-minute first Step"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TextInput
                        style={[...inputStyle, styles.multiline]}
                        value={starterDescription}
                        onChangeText={setStarterDescription}
                        placeholder="Optional: a little more detail"
                        placeholderTextColor={theme.textSecondary}
                        multiline
                      />
                    </ThemedView>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add a Starter Step"
                      onPress={() => setStarterOpen(true)}
                      style={[styles.addStep, { borderColor: theme.success }]}>
                      <StarIcon color={theme.tealStrong} />
                      <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                        Add a Starter Step
                      </ThemedText>
                    </Pressable>
                  )}

                  {steps.map((step, index) => (
                    <ThemedView key={step.key} type="backgroundElement" style={styles.stepBox}>
                      <View style={styles.stepBoxHeader}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Step {index + 1}
                        </ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove Step ${index + 1}`}
                          onPress={() => removeStep(step.key)}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            Remove
                          </ThemedText>
                        </Pressable>
                      </View>
                      <TextInput
                        style={inputStyle}
                        value={step.title}
                        onChangeText={(text) => updateStep(step.key, { title: text })}
                        placeholder="Step title"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TextInput
                        style={[...inputStyle, styles.multiline]}
                        value={step.description}
                        onChangeText={(text) => updateStep(step.key, { description: text })}
                        placeholder="Optional description"
                        placeholderTextColor={theme.textSecondary}
                        multiline
                      />
                      <ChoiceChips
                        options={CADENCE_OPTIONS}
                        value={step.cadence}
                        onChange={(value) => updateStep(step.key, { cadence: value })}
                      />
                    </ThemedView>
                  ))}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a step"
                    onPress={() => setSteps((prev) => [...prev, newDraftStep()])}
                    style={[styles.addStep, { borderColor: theme.coral }]}>
                    <PlusIcon color={theme.coralStrong} />
                    <ThemedText type="smallBold" style={{ color: theme.coralStrong }}>
                      Add a step
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {stage === 4 && (
                <View style={styles.stack}>
                  <View style={styles.switchRow}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">Remind me</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        A gentle on-device nudge. We&apos;ll ask permission only if you turn this on.
                      </ThemedText>
                    </View>
                    <Switch value={remindEnabled} onValueChange={setRemindEnabled} />
                  </View>
                  {remindEnabled && (
                    <View style={styles.field}>
                      <ThemedText type="smallBold">When?</ThemedText>
                      <ChoiceChips
                        options={REMINDER_TIMES.map((t, i) => ({ value: i, label: t.label }))}
                        value={remindTimeIndex}
                        onChange={setRemindTimeIndex}
                      />
                    </View>
                  )}
                </View>
              )}

              {stage === 5 && (
                <View style={styles.stack}>
                  <SummaryRow label="Journey" value={title.trim() || '—'} />
                  <SummaryRow label="Duration" value={durationLabel} />
                  <SummaryRow label="Rhythm" value={rhythmLabel} />
                  <SummaryRow
                    label="Steps"
                    value={
                      stepInputs.length === 0
                        ? 'None yet'
                        : `${stepInputs.length}${stepInputs.some((s) => s.isStarterStep) ? ' (incl. Starter Step)' : ''}`
                    }
                  />
                  <SummaryRow label="Your why" value={why.length === 0 ? '—' : `${why.length} saved`} />
                  <SummaryRow
                    label="Reminder"
                    value={remindEnabled ? REMINDER_TIMES[remindTimeIndex].label : 'Off'}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.summaryNote}>
                    Starts now. Your Steps will appear on Home right away.
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.navlbl}>
                <ThemedText type="small" themeColor="textMuted">
                  {stage > 0 ? `‹ ${STAGE_TITLES[stage - 1]}` : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {!isLast ? `${STAGE_TITLES[stage + 1]} ›` : ''}
                </ThemedText>
              </View>
              <View style={styles.footerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  disabled={stage === 0}
                  onPress={() => goToStage(Math.max(0, stage - 1))}
                  style={[
                    styles.navButton,
                    styles.outlineButton,
                    { borderColor: theme.tealTint, backgroundColor: theme.backgroundElement },
                    stage === 0 && styles.disabled,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    Back
                  </ThemedText>
                </Pressable>

                {isLast ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create the Journey"
                    disabled={!title.trim() || creating}
                    onPress={handleCreate}
                    style={[
                      styles.navButton,
                      styles.primary,
                      { backgroundColor: theme.coral },
                      (!title.trim() || creating) && styles.disabled,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                      {creating ? 'Creating…' : 'Create'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next"
                    disabled={!canContinue}
                    onPress={() => goToStage(Math.min(STAGE_TITLES.length - 1, stage + 1))}
                    style={[
                      styles.navButton,
                      styles.primary,
                      { backgroundColor: theme.coral },
                      !canContinue && styles.disabled,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                      Next
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
  return (
    <View style={styles.rowE}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="smallBold" style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </ThemedText>
      {onPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
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

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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
    color: '#ffffff',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowValue: {
    marginLeft: 'auto',
  },
  editPen: {
    width: 30,
    height: 30,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginLeft: Spacing.two,
  },
  addButton: {
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    color: '#ffffff',
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
    marginRight: Spacing.two,
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
    textAlign: 'right',
  },
  summaryNote: {
    marginTop: Spacing.two,
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
});
