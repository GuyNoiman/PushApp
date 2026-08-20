/**
 * Direction Statement — one sentence about where somebody is pointed.
 *
 * **NOT A DREAM AND NOT A COMMITMENT** (founder). That line sits at the bottom of every step, and it
 * is the reason this screen ends without offering to create anything. Every other tool in the tab
 * finishes by asking whether to keep something; this one deliberately does not, because a direction
 * that becomes a task stops being a direction.
 *
 * SIX STEPS: what draws you · what you bring · five phrasings · how alive it feels · make it yours ·
 * what these words mean to you.
 *
 * THE DRAWERS ARE FED BY CONTRIBUTORS, not by the two tools the founder's design names — a Passion
 * Map and Strength Evidence do not exist yet. "What draws me" comes from the Values Clarification's
 * final five, which is a person's own narrowed, ranked answer and the strongest material we have.
 * "What I bring" is deliberately EMPTY and typed by the person: guessing at somebody's strengths from
 * what they value would be the app telling them what they are good at, which is the one thing that
 * drawer must never do. See `../../core/tools/direction/contributors`.
 *
 * PRIVACY (G1): on-device only.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { contributedChips } from '@/core/tools/direction/contributors';
import {
  CHIPS_PER_DRAWER,
  DRAFT_TEMPLATES,
  THOUGHT_LIMIT,
  WORD_TARGET,
  addOwnChip,
  canCompose,
  chosenChips,
  drawerChips,
  gloss,
  importantWords,
  noteWhatWouldMakeItTen,
  rateAliveness,
  setSentence,
  slotsFor,
  startDirection,
  stepDraft,
  toggleChip,
  withinTarget,
  wordCount,
  type Drawer,
} from '@/core/tools/direction/model';
import { CUSTOM_VALUE_KEY } from '@/core/tools/values/catalog';
import { readValues } from '@/core/tools/values/flow';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useValues } from '@/state/ValuesStore';

type Step = 'intro' | 'draws' | 'brings' | 'drafts' | 'refine' | 'trim' | 'gloss' | 'done';
/** The six the person counts. `intro` and `done` are not steps, they are the ends. */
const COUNTED: Step[] = ['draws', 'brings', 'drafts', 'refine', 'trim', 'gloss'];

export default function DirectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const valuesStore = useValues();

  // The person's own five, in their order, resolved to the words they will see.
  const contributed = useMemo(() => {
    const run = valuesStore.state;
    const reading = run ? readValues(run) : null;
    const values = (reading?.values ?? []).map((v) => ({
      key: v.key,
      label:
        v.key === CUSTOM_VALUE_KEY ? (run?.custom?.name ?? '') : t(`values.names.${v.key}`),
    }));
    return contributedChips({ values: values.filter((v) => v.label.length > 0) });
  }, [valuesStore.state, t]);

  const [step, setStep] = useState<Step>('intro');
  const [state, setState] = useState(() => startDirection(contributed));
  const [own, setOwn] = useState('');

  // The values run can finish after this screen mounts; take the chips when they appear.
  const chips = state.chips.length === 0 && contributed.length > 0 ? contributed : state.chips;
  const current = chips === state.chips ? state : { ...state, chips };

  const slots = slotsFor(current);
  const sentence = useMemo(() => {
    if (current.sentence.length > 0) return current.sentence;
    if (!slots) return '';
    const andB = slots.b ? t('direction.templates.and', { b: slots.b }) : '';
    return t(`direction.templates.${current.draft}`, { draw: slots.draw, a: slots.a, andB });
  }, [current.sentence, current.draft, slots, t]);

  const index = COUNTED.indexOf(step);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tools'))}
            hitSlop={8}
            style={styles.iconButton}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('direction.title')}
          </ThemedText>
          {step !== 'done' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('lifeWheel.saveExit')}
              onPress={() => router.replace('/(tabs)/tools')}>
              <ThemedText type="small" style={{ color: theme.tint }}>
                {t('lifeWheel.saveExit')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        {index >= 0 ? (
          <View style={styles.progressRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('direction.step', { current: index + 1, total: COUNTED.length })}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.tint, width: `${((index + 1) / COUNTED.length) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'intro' ? (
            <>
              <Title>{t('direction.intro.lead')}</Title>
              <Body>{t('direction.intro.body')}</Body>
              <Cta label={t('direction.intro.begin')} onPress={() => setStep('draws')} />
            </>
          ) : null}

          {step === 'draws' || step === 'brings' ? (
            <DrawerStep
              drawer={step as Drawer}
              state={current}
              onToggle={(id) => setState(toggleChip(current, step as Drawer, id))}
              own={own}
              setOwn={setOwn}
              onAddOwn={() => {
                setState(addOwnChip(current, step as Drawer, own));
                setOwn('');
              }}
              onContinue={() => setStep(step === 'draws' ? 'brings' : 'drafts')}
              canContinue={
                step === 'draws'
                  ? chosenChips(current, 'draws').length > 0
                  : canCompose(current)
              }
            />
          ) : null}

          {step === 'drafts' ? (
            <>
              <Title>{t('direction.drafts.title')}</Title>
              <Body>{t('direction.drafts.body')}</Body>
              <Sentence text={sentence} />
              <View style={styles.draftRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('back', { ns: 'common' })}
                  onPress={() => setState(stepDraft(current, -1))}
                  style={({ pressed }) => [styles.arrow, { borderColor: theme.hairline }, pressed && styles.pressed]}>
                  <Ionicons name="chevron-back" size={18} color={theme.text} />
                </Pressable>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('direction.drafts.label', { n: DRAFT_TEMPLATES.indexOf(current.draft) + 1 })}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('next', { ns: 'common' })}
                  onPress={() => setState(stepDraft(current, 1))}
                  style={({ pressed }) => [styles.arrow, { borderColor: theme.hairline }, pressed && styles.pressed]}>
                  <Ionicons name="chevron-forward" size={18} color={theme.text} />
                </Pressable>
              </View>
              <Cta label={t('direction.continue')} onPress={() => setStep('refine')} />
            </>
          ) : null}

          {step === 'refine' ? (
            <>
              <Title>{t('direction.refine.title')}</Title>
              <Sentence text={sentence} />

              <ThemedText type="small" style={[styles.spaced, { color: theme.text }]}>
                {t('direction.refine.alive')}
              </ThemedText>
              <View style={styles.scaleRow}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current.aliveness === n }}
                    accessibilityLabel={String(n)}
                    onPress={() => setState(rateAliveness(current, n))}
                    style={[
                      styles.dot,
                      {
                        borderColor: current.aliveness === n ? theme.tint : theme.hairline,
                        backgroundColor: current.aliveness === n ? theme.tint : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{
                        color: current.aliveness === n ? theme.backgroundElement : theme.textSecondary,
                      }}>
                      {n}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" style={[styles.spaced, { color: theme.text }]}>
                {t('direction.refine.makeItTen')}
              </ThemedText>
              <TextInput
                value={current.whatWouldMakeItTen ?? ''}
                onChangeText={(text) => setState(noteWhatWouldMakeItTen(current, text))}
                placeholder={t('direction.refine.thought')}
                placeholderTextColor={theme.textMuted}
                accessibilityLabel={t('direction.refine.makeItTen')}
                maxLength={THOUGHT_LIMIT}
                style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
              />
              <ThemedText type="small" style={[styles.count, { color: theme.textMuted }]}>
                {`${(current.whatWouldMakeItTen ?? '').length} / ${THOUGHT_LIMIT}`}
              </ThemedText>

              <Cta
                label={t('direction.continue')}
                disabled={current.aliveness === undefined}
                onPress={() => {
                  setState(setSentence(current, sentence));
                  setStep('trim');
                }}
              />
            </>
          ) : null}

          {step === 'trim' ? (
            <>
              <Title>{t('direction.trim.title')}</Title>
              <Body>{t('direction.trim.body')}</Body>
              <TextInput
                value={current.sentence}
                onChangeText={(text) => setState(setSentence(current, text))}
                accessibilityLabel={t('direction.trim.title')}
                multiline
                style={[
                  styles.sentenceInput,
                  { color: theme.text, borderColor: theme.hairline, fontFamily: displayFont() },
                ]}
              />
              <View style={styles.footRow}>
                <ThemedText
                  type="small"
                  style={{ color: withinTarget(current.sentence) ? theme.tealStrong : theme.textMuted }}>
                  {t('direction.trim.words', { count: wordCount(current.sentence) })}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {t('direction.trim.target', WORD_TARGET)}
                </ThemedText>
              </View>
              <Cta
                label={t('direction.continue')}
                disabled={wordCount(current.sentence) === 0}
                onPress={() => setStep('gloss')}
              />
            </>
          ) : null}

          {step === 'gloss' ? (
            <>
              <Title>{t('direction.gloss.title')}</Title>
              <Body>{t('direction.gloss.body')}</Body>
              {importantWords(current).map((word) => (
                <View key={word} style={styles.glossBlock}>
                  <ThemedText type="displaySmall">{word}</ThemedText>
                  <TextInput
                    value={current.glosses[word] ?? ''}
                    onChangeText={(text) => setState(gloss(current, word, text))}
                    placeholder={t('direction.gloss.placeholder')}
                    placeholderTextColor={theme.textMuted}
                    accessibilityLabel={word}
                    style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
                  />
                </View>
              ))}
              <Cta label={t('direction.continue')} onPress={() => setStep('done')} />
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <Title>{t('direction.result.title')}</Title>
              <Sentence text={current.sentence} />
              {/* No offer to keep anything. A direction that becomes a task stops being a direction. */}
              <Body>{t('direction.result.note')}</Body>
              <Cta label={t('direction.result.done')} onPress={() => router.replace('/(tabs)/tools')} />
            </>
          ) : null}

          <ThemedText type="small" style={[styles.footnote, { color: theme.textMuted }]}>
            {t('direction.notADream')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** One drawer: what is on offer, what they have taken, and a box to add their own. */
function DrawerStep({
  drawer,
  state,
  onToggle,
  own,
  setOwn,
  onAddOwn,
  onContinue,
  canContinue,
}: {
  drawer: Drawer;
  state: ReturnType<typeof startDirection>;
  onToggle: (id: string) => void;
  own: string;
  setOwn: (v: string) => void;
  onAddOwn: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const offered = drawerChips(state, drawer);
  const taken = state.chosen[drawer];

  return (
    <>
      <Title>{t(`direction.${drawer}.title`)}</Title>
      <Body>{t(`direction.${drawer}.body`)}</Body>

      {offered.length === 0 ? (
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t(`direction.${drawer}.empty`)}
        </ThemedText>
      ) : (
        <View style={styles.chips}>
          {offered.map((chip) => {
            const on = taken.includes(chip.id);
            return (
              <Pressable
                key={chip.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={chip.text}
                onPress={() => onToggle(chip.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: on ? theme.tint : theme.hairline,
                    backgroundColor: on ? theme.tealTint : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small" style={{ color: on ? theme.tealStrong : theme.text }}>
                  {chip.text}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {`${taken.length} / ${CHIPS_PER_DRAWER}`}
      </ThemedText>

      <View style={styles.addRow}>
        <TextInput
          value={own}
          onChangeText={setOwn}
          placeholder={t(`direction.${drawer}.add`)}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t(`direction.${drawer}.add`)}
          onSubmitEditing={onAddOwn}
          style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.hairline }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: own.trim().length === 0 }}
          accessibilityLabel={t(`direction.${drawer}.add`)}
          disabled={own.trim().length === 0}
          onPress={onAddOwn}
          hitSlop={8}
          style={({ pressed }) => [(pressed || own.trim().length === 0) && styles.pressed]}>
          <Ionicons name="add-circle-outline" size={26} color={theme.tint} />
        </Pressable>
      </View>

      <Cta label={t('direction.continue')} disabled={!canContinue} onPress={onContinue} />
    </>
  );
}

function Sentence({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.sentenceBox,
        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
      ]}>
      <ThemedText style={[styles.sentence, { color: theme.text, fontFamily: displayFont() }]}>
        {text}
      </ThemedText>
    </View>
  );
}

function Title({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <ThemedText style={[styles.title, { fontFamily: displayFont(), color: theme.text }]}>
      {children}
    </ThemedText>
  );
}

function Body({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 21 }}>
      {children}
    </ThemedText>
  );
}

function Cta({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: theme.tint },
        (pressed || disabled) && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  track: { flex: 1, height: 4, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2 },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  title: { fontSize: 22, lineHeight: 30 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  flex: { flex: 1 },
  sentenceBox: {
    marginTop: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sentence: { fontSize: 20, lineHeight: 30 },
  sentenceInput: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 18,
    lineHeight: 28,
    minHeight: 100,
    textAlignVertical: 'top',
    textAlign: isRTL() ? 'right' : 'left',
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaced: { paddingTop: Spacing.three },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    textAlign: isRTL() ? 'right' : 'left',
  },
  count: { textAlign: isRTL() ? 'left' : 'right' },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glossBlock: { gap: Spacing.one, paddingTop: Spacing.three },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  footnote: { textAlign: 'center', paddingTop: Spacing.four },
  pressed: { opacity: 0.6 },
});
