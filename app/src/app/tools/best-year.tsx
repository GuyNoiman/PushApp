/**
 * My Best Possible Year — the first exercise on the writing surface, and a private page rather than
 * a questionnaire.
 *
 * FIVE STEPS, the founder's: choose the day you are writing FROM · a short preparation · write ·
 * decide when it comes back · and only then, an offer to keep something as a Dream.
 *
 * THE PREPARATION STEP IS NOT DECORATION. Three sentences decide whether this exercise works: write
 * in the PAST TENSE, write TO SOMEBODY who has not seen you this year, and keep it REALISTIC. Skip
 * them and people write a wish list, which teaches nobody anything. The exercise's whole claim is
 * that a year you could actually have is the only kind you can walk towards.
 *
 * DICTATION IS STILL THE KEYBOARD'S, even now that recording exists. Every phone keyboard has a
 * microphone that dictates into any text field, in every language the phone speaks, and the text
 * never leaves the device. Speech-to-TEXT of a recording is a different thing again: on-device
 * recognition costs another permission and is markedly worse in Hebrew, and cloud transcription
 * costs money per minute and would send the most personal audio the app holds across the network.
 * Neither is scheduled — see `11_Engineering_Bible/Engineering_Decisions.md` E6.
 *
 * A RECORDED VOICE, on the other hand, is here (2026-08-21): {@link ../../components/tools/AttachmentStrip}
 * adds a photo or a voice note, and both are files on this device that travel with the letter.
 *
 * NOTHING BECOMES A DREAM WITHOUT BEING TYPED BY THE PERSON. The founder's rule for this exercise is
 * explicit — confirmation before any Dream is created — and this goes one step further than the Life
 * Wheel: there, the candidate was an area name we already had; here it would be a sentence pulled
 * out of somebody's private letter. So the letter is never parsed. The person is asked what they are
 * aiming at, in their own words, on a page that already has their own words in front of them.
 *
 * PRIVACY (G1): the letter stays on this phone, and the delivery screen says so where a person can
 * read it before they commit anything.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttachmentStrip } from '@/components/tools/AttachmentStrip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Attachment } from '@/core/media/MediaGateway';
import {
  REFLECTION_EXERCISES,
  buildReflection,
  hasContent,
  wordCount,
} from '@/core/tools/reflections/model';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';
import { useReflections } from '@/state/ReflectionsStore';

const EXERCISE = REFLECTION_EXERCISES.bestYear;
const STEPS = 5;

type Step = 'date' | 'prepare' | 'write' | 'deliver' | 'done';
const ORDER: Step[] = ['date', 'prepare', 'write', 'deliver', 'done'];

export default function BestYearScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const reflections = useReflections();
  const { core } = useApp();

  const [step, setStep] = useState<Step>('date');
  const [horizon, setHorizon] = useState<number>(EXERCISE.horizons[0]);
  const [keepCheckpoint, setKeepCheckpoint] = useState(true);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [prompt, setPrompt] = useState<string>(EXERCISE.prompts[0]);
  const [dreamTitle, setDreamTitle] = useState('');
  const [dreamAdded, setDreamAdded] = useState(false);
  const [saved, setSaved] = useState<{ deliverAt?: number; checkpointAt?: number } | null>(null);

  const words = useMemo(() => wordCount(sections), [sections]);
  const index = ORDER.indexOf(step);

  const formatDate = (ms?: number) =>
    ms === undefined
      ? ''
      : new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const save = () => {
    const reflection = buildReflection({
      id: `refl-${Date.now()}`,
      exercise: 'bestYear',
      writtenAt: Date.now(),
      sections,
      attachments,
      horizonDays: horizon,
      keepCheckpoint,
    });
    reflections.add(reflection);
    setSaved({ deliverAt: reflection.deliverAt, checkpointAt: reflection.checkpointAt });
    setStep('done');
  };

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
            <Ionicons
              name={isRTL() ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={theme.text}
            />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="smallBold">{t('bestYear.title')}</ThemedText>
            {step !== 'done' ? (
              <ThemedText type="small" style={{ color: theme.tint }}>
                {t('bestYear.step', { current: index + 1, total: STEPS })}
              </ThemedText>
            ) : null}
          </View>
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

        {/* The step rail from the design: done, here, still to come. */}
        {step !== 'done' ? (
          <View style={styles.rail}>
            {ORDER.slice(0, STEPS).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.railDot,
                  {
                    borderColor: i <= index ? theme.tint : theme.hairline,
                    backgroundColor: i < index ? theme.tint : 'transparent',
                  },
                ]}>
                {i < index ? (
                  <Ionicons name="checkmark" size={12} color={theme.backgroundElement} />
                ) : (
                  <ThemedText type="small" style={{ color: i === index ? theme.tint : theme.textMuted }}>
                    {i + 1}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'date' ? (
            <>
              <Title>{t('bestYear.date.title')}</Title>
              <Body>{t('bestYear.date.body')}</Body>
              {EXERCISE.horizons.map((days) => (
                <Pressable
                  key={days}
                  accessibilityRole="button"
                  accessibilityState={{ selected: horizon === days }}
                  accessibilityLabel={t(`bestYear.date.in${days}`)}
                  onPress={() => setHorizon(days)}
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      borderColor: horizon === days ? theme.tint : theme.hairline,
                      backgroundColor: horizon === days ? theme.tealTint : theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="displaySmall">{t(`bestYear.date.in${days}`)}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {formatDate(Date.now() + days * 24 * 60 * 60 * 1000)}
                  </ThemedText>
                </Pressable>
              ))}
              <Cta label={t('values.reduce.continue')} onPress={() => setStep('prepare')} />
            </>
          ) : null}

          {step === 'prepare' ? (
            <>
              <Title>{t('bestYear.prepare.title')}</Title>
              <Body>{t('bestYear.prepare.body')}</Body>
              <Cta label={t('bestYear.prepare.begin')} onPress={() => setStep('write')} />
            </>
          ) : null}

          {step === 'write' ? (
            <>
              <Title>{t('bestYear.write.title')}</Title>
              <Body>{t('bestYear.write.body')}</Body>

              {/* The four angles. Jumping-off points, never required fields — a letter with one
                  paragraph in it is a finished letter. */}
              <View style={styles.chips}>
                {EXERCISE.prompts.map((key) => {
                  const on = prompt === key;
                  const written = (sections[key] ?? '').trim().length > 0;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={t(`bestYear.write.prompts.${key}`)}
                      onPress={() => setPrompt(key)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          borderColor: on ? theme.tint : theme.hairline,
                          backgroundColor: on ? theme.tealTint : 'transparent',
                        },
                        pressed && styles.pressed,
                      ]}>
                      {written ? (
                        <Ionicons name="checkmark" size={13} color={theme.tealStrong} />
                      ) : null}
                      <ThemedText
                        type="small"
                        style={{ color: on ? theme.tealStrong : theme.textSecondary }}>
                        {t(`bestYear.write.prompts.${key}`)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {t(`bestYear.write.hints.${prompt}`)}
              </ThemedText>

              <View
                style={[
                  styles.paper,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                ]}>
                <TextInput
                  value={sections[prompt] ?? ''}
                  onChangeText={(text) => setSections((prev) => ({ ...prev, [prompt]: text }))}
                  placeholder={t('bestYear.write.placeholder')}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel={t(`bestYear.write.prompts.${prompt}`)}
                  multiline
                  style={[styles.paperInput, { color: theme.text }]}
                />
                <ThemedText type="small" style={[styles.words, { color: theme.textMuted }]}>
                  {t('bestYear.write.words', { count: words })}
                </ThemedText>
              </View>

              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {t('bestYear.write.dictate')}
              </ThemedText>

              {/* A photo or a voice note, when this build can offer them. A letter with one photo
                  and no words is still a letter. */}
              <AttachmentStrip attachments={attachments} onChange={setAttachments} />

              <Cta
                label={t('values.reduce.continue')}
                disabled={!hasContent(sections, attachments)}
                onPress={() => setStep('deliver')}
              />
            </>
          ) : null}

          {step === 'deliver' ? (
            <>
              <Title>{t('bestYear.deliver.title')}</Title>
              <Body>{t('bestYear.deliver.body')}</Body>

              <View
                style={[
                  styles.choice,
                  { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="displaySmall">{t(`bestYear.date.in${horizon}`)}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {formatDate(Date.now() + horizon * 24 * 60 * 60 * 1000)}
                </ThemedText>
              </View>

              {/* The founder's halfway note. It is offered, and it is described as what it is. */}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: keepCheckpoint }}
                accessibilityLabel={t('bestYear.deliver.checkpoint')}
                onPress={() => setKeepCheckpoint((v) => !v)}
                style={({ pressed }) => [
                  styles.choice,
                  {
                    borderColor: keepCheckpoint ? theme.tint : theme.hairline,
                    backgroundColor: keepCheckpoint ? theme.tealTint : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.row}>
                  <Ionicons
                    name={keepCheckpoint ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={keepCheckpoint ? theme.tint : theme.textMuted}
                  />
                  <ThemedText type="displaySmall" style={styles.flex}>
                    {t('bestYear.deliver.checkpoint')}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('bestYear.deliver.checkpointNote')}
                </ThemedText>
              </Pressable>

              <Cta label={t('bestYear.deliver.save')} onPress={save} />
            </>
          ) : null}

          {step === 'done' && saved ? (
            <>
              <Title>{t('bestYear.result.title')}</Title>
              <Body>{t('bestYear.result.returns', { date: formatDate(saved.deliverAt) })}</Body>
              {saved.checkpointAt ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('bestYear.result.checkpointOn', { date: formatDate(saved.checkpointAt) })}
                </ThemedText>
              ) : null}

              {/* Their words, typed by them. The letter itself is never read by anything. */}
              <ThemedText type="small" style={[styles.dreamLead, { color: theme.textSecondary }]}>
                {t('bestYear.result.dreamsLead')}
              </ThemedText>
              {dreamAdded ? (
                <View style={styles.row}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.tint} />
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {t('bestYear.result.dreamAdded')}
                  </ThemedText>
                </View>
              ) : (
                <>
                  <TextInput
                    value={dreamTitle}
                    onChangeText={setDreamTitle}
                    placeholder={t('bestYear.result.dreamPlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    accessibilityLabel={t('bestYear.result.dreamPlaceholder')}
                    style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: dreamTitle.trim().length === 0 }}
                    accessibilityLabel={t('bestYear.result.addDream')}
                    disabled={dreamTitle.trim().length === 0}
                    onPress={() => {
                      core.createDream({ title: dreamTitle });
                      setDreamAdded(true);
                    }}
                    style={({ pressed }) => [
                      styles.choice,
                      styles.row,
                      { borderColor: theme.tint },
                      (pressed || dreamTitle.trim().length === 0) && styles.pressed,
                    ]}>
                    <Ionicons name="add-circle-outline" size={18} color={theme.tint} />
                    <ThemedText type="small" style={{ color: theme.tint }}>
                      {t('bestYear.result.addDream')}
                    </ThemedText>
                  </Pressable>
                </>
              )}

              <Cta
                label={t('bestYear.result.done')}
                onPress={() => router.replace('/(tabs)/tools')}
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
  headerText: { flex: 1, alignItems: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  rail: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  railDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  title: { fontSize: 24, lineHeight: 32 },
  choice: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  paper: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  paperInput: { minHeight: 200, fontSize: 16, lineHeight: 25, textAlignVertical: 'top' },
  words: { textAlign: isRTL() ? 'left' : 'right' },
  input: {
    marginTop: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    textAlign: isRTL() ? 'right' : 'left',
  },
  dreamLead: { paddingTop: Spacing.four },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  pressed: { opacity: 0.6 },
});
