/**
 * Journey creation wizard ("Build your own") — the POC subset of
 * 04_Product/UX/Journey_Creation_Screen.md. A short, low-effort wizard:
 * Name → your Why → Duration & rhythm → Steps (+ Starter Step) → Reminders →
 * Summary. Only the Name is truly required; everything else has sensible
 * defaults (Product_Bible §5: "complexity belongs to the system, not the user").
 *
 * Presentational only — it gathers input and calls the AppCore facade to create
 * the Journey. No reward/Buddy/Journey math lives here (Engineering Bible §19).
 * Out of POC scope and intentionally omitted: Phases, public/creator, Support.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/journey/ChoiceChips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { NewStepInput } from '@/core/engines/JourneyEngine';
import type { Cadence, Rhythm } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

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

  // Stage 1 — Name.
  const [title, setTitle] = useState('');

  // Stage 2 — Your why (identity & motivation). Saved as Journey.why[].
  const [whyStart, setWhyStart] = useState('');
  const [whyKeepGoing, setWhyKeepGoing] = useState('');
  const [hardMoments, setHardMoments] = useState<string[]>([]); // "what to remember when it's hard"
  const [hardMomentDraft, setHardMomentDraft] = useState('');

  // Stage 3 — Duration & rhythm.
  const [durationDays, setDurationDays] = useState(60);
  const [rhythm, setRhythm] = useState<Rhythm>('daily');

  // Stage 4 — Steps. The first Step is a recommended Starter Step (≤2 min).
  const [starterTitle, setStarterTitle] = useState('');
  const [starterDescription, setStarterDescription] = useState('');
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

  const inputStyle = [styles.input, { borderColor: theme.backgroundSelected, color: theme.text }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Step {stage + 1} of {STAGE_TITLES.length}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={dismiss}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Close
                </ThemedText>
              </Pressable>
            </View>
            <ProgressBars count={STAGE_TITLES.length} active={stage} />
            <ThemedText type="subtitle" style={styles.stageTitle}>
              {STAGE_TITLES[stage]}
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {stage === 0 && (
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  What Journey do you want to take? Give it a clear name or goal.
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Run 5km, Learn to draw…"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  returnKeyType="next"
                />
              </View>
            )}

            {stage === 1 && (
              <View style={styles.stack}>
                <ThemedText type="small" themeColor="textSecondary">
                  Optional, but it helps. Your answers stay private and later power personal
                  encouragement.
                </ThemedText>
                <View style={styles.field}>
                  <ThemedText type="smallBold">Why are you starting this?</ThemedText>
                  <TextInput
                    style={[...inputStyle, styles.multiline]}
                    value={whyStart}
                    onChangeText={setWhyStart}
                    placeholder="What makes this matter to you?"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                  />
                </View>
                <View style={styles.field}>
                  <ThemedText type="smallBold">What will keep you going?</ThemedText>
                  <TextInput
                    style={[...inputStyle, styles.multiline]}
                    value={whyKeepGoing}
                    onChangeText={setWhyKeepGoing}
                    placeholder="The person you want to become…"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                  />
                </View>
                <View style={styles.field}>
                  <ThemedText type="smallBold">What to remember when it&apos;s hard</ThemedText>
                  <View style={styles.addRow}>
                    <TextInput
                      style={[...inputStyle, styles.flex]}
                      value={hardMomentDraft}
                      onChangeText={setHardMomentDraft}
                      placeholder="A short reminder…"
                      placeholderTextColor={theme.textSecondary}
                      maxLength={50}
                      returnKeyType="done"
                      onSubmitEditing={addHardMoment}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add reminder"
                      onPress={addHardMoment}
                      style={[styles.addButton, { borderColor: theme.text }]}>
                      <ThemedText type="smallBold">Add</ThemedText>
                    </Pressable>
                  </View>
                  {hardMoments.length > 0 && (
                    <View style={styles.chipWrap}>
                      {hardMoments.map((line, index) => (
                        <ThemedView
                          key={`${line}_${index}`}
                          type="backgroundSelected"
                          style={styles.savedChip}>
                          <ThemedText type="small">{line}</ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${line}`}
                            onPress={() => removeHardMoment(index)}>
                            <ThemedText type="smallBold" themeColor="textSecondary">
                              ✕
                            </ThemedText>
                          </Pressable>
                        </ThemedView>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {stage === 2 && (
              <View style={styles.stack}>
                <View style={styles.field}>
                  <ThemedText type="smallBold">How long is this Journey?</ThemedText>
                  <ChoiceChips
                    options={DURATION_OPTIONS}
                    value={durationDays}
                    onChange={setDurationDays}
                  />
                </View>
                <View style={styles.field}>
                  <ThemedText type="smallBold">How often will you show up?</ThemedText>
                  <ChoiceChips options={RHYTHM_OPTIONS} value={rhythm} onChange={setRhythm} />
                </View>
              </View>
            )}

            {stage === 3 && (
              <View style={styles.stack}>
                <View style={[styles.starterBox, { backgroundColor: theme.successTint }]}>
                  <View style={styles.starterHeader}>
                    <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                      ★ Starter Step
                    </ThemedText>
                    <View style={[styles.badge, { backgroundColor: theme.teal }]}>
                      <ThemedText type="small" style={styles.recommendedLabel}>
                        Recommended
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Make the first Step tiny — something you can finish in under 2 minutes. The goal
                    is to help you start, not finish the whole Journey. {STARTER_EXAMPLES}
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
                </View>

                <ThemedText type="smallBold">Your Steps</ThemedText>
                {steps.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Steps are optional — add a few concrete actions, or skip and let your rhythm
                    guide you.
                  </ThemedText>
                ) : (
                  steps.map((step, index) => (
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
                  ))
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a Step"
                  onPress={() => setSteps((prev) => [...prev, newDraftStep()])}
                  style={[styles.addStep, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">+ Add a Step</ThemedText>
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
                <SummaryRow
                  label="Duration"
                  value={DURATION_OPTIONS.find((d) => d.value === durationDays)?.label ?? `${durationDays} days`}
                />
                <SummaryRow
                  label="Rhythm"
                  value={RHYTHM_OPTIONS.find((r) => r.value === rhythm)?.label ?? rhythm}
                />
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={stage === 0}
              onPress={() => setStage((s) => Math.max(0, s - 1))}
              style={[
                styles.navButton,
                { borderColor: theme.hairline },
                stage === 0 && styles.disabled,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                Back
              </ThemedText>
              {stage > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  {STAGE_TITLES[stage - 1]}
                </ThemedText>
              )}
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
                onPress={() => setStage((s) => Math.min(STAGE_TITLES.length - 1, s + 1))}
                style={[
                  styles.navButton,
                  styles.primary,
                  { backgroundColor: theme.coral },
                  !canContinue && styles.disabled,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Next
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.text, opacity: 0.7 }}>
                  {STAGE_TITLES[stage + 1]}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** The top step-progress bars; the active stage is filled. */
function ProgressBars({ count, active }: { count: number; active: number }) {
  const theme = useTheme();
  return (
    <View style={styles.progressBars}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressBar,
            { backgroundColor: index <= active ? theme.teal : theme.hairline },
          ]}
        />
      ))}
    </View>
  );
}

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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageTitle: {
    lineHeight: 40,
  },
  progressBars: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  stack: {
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  starterBox: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  starterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
  },
  recommendedLabel: {
    color: '#ffffff',
    fontWeight: '700',
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
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
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
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  navButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  primary: {
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.4,
  },
});
