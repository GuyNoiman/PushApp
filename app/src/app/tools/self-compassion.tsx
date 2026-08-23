/**
 * A Self-Compassion Moment — one to three minutes, no setup, and nothing learned about the person.
 *
 * SIX SCREENS (PRD §5): the opening, an acknowledgement, a reminder that this is human, a kind
 * sentence chosen or written, three breaths carrying it, and a finish that says plainly that nothing
 * was saved.
 *
 * WHAT IS NOT HERE, and each absence is deliberate: no "what happened?", no long free text, no
 * count of how often it was opened, no streak, no follow-up, no reminder, no inference of distress
 * from repetition. The tool asks for nothing because the moment it is used in has nothing to spare
 * (PRD §1, §8).
 *
 * IT ALWAYS OPENS AT THE BEGINNING. This is a practice, not a questionnaire, so there is no resume
 * and no progress to restore (PRD §7). A saved phrase, if the person deliberately kept one, is
 * offered as a shortcut and nothing more.
 *
 * SAFETY: it is not therapy, not diagnosis and not crisis support, it never claims to detect a
 * crisis, and every screen can be left.
 */
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BreathCircle } from '@/components/tools/BreathCircle';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  canSave,
  COMPASSION_STEPS,
  CUSTOM_PHRASE_MAX_CHARS,
  hasPhrase,
  isSavedPhrase,
  KINDNESS_PHRASES,
  nextStep,
  previousStep,
  type CarriedPhrase,
  type CompassionStep,
  type KindnessPhraseId,
  type SavedPhrase,
} from '@/core/tools/selfCompassion/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { useToolRecords } from '@/state/ToolRecordsStore';

/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('selfCompassion');

export default function SelfCompassionScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('selfCompassion', isSavedPhrase);

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  /** null = the opening. Everything else is the practice, always from its start. */
  const [step, setStep] = useState<CompassionStep | null>(null);
  const [phrase, setPhrase] = useState<CarriedPhrase>({ kind: 'none' });
  const [custom, setCustom] = useState('');

  const saved: SavedPhrase | undefined = store.records[0];

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const phraseText = useMemo(() => {
    if (phrase.kind === 'authored') return t(`selfCompassion.phrases.${phrase.id}`);
    if (phrase.kind === 'custom') return phrase.text.trim();
    return '';
  }, [phrase, t]);

  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };

  const progressOf = (current: CompassionStep) =>
    (COMPASSION_STEPS.indexOf(current) + 1) / COMPASSION_STEPS.length;

  if (step === null) {
    return (
      <ToolOpening
        title={t('selfCompassion.title')}
        lead={t('selfCompassion.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('selfCompassion.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('selfCompassion.intro.time')}
        chooseLabel={t('opening.chooseLabel')}
        routes={[
          {
            id: 'read',
            title: t('selfCompassion.routes.read.title'),
            blurb: t('selfCompassion.routes.read.blurb'),
            time: t('selfCompassion.routes.read.time'),
          },
          {
            // Authored audio guidance is a recording we do not have yet, and the tool says so rather
            // than offering a button that plays nothing (PRD §6 / the delivery honesty rule).
            id: 'audio',
            title: t('selfCompassion.routes.audio.title'),
            blurb: t('selfCompassion.routes.audio.blurb'),
            time: t('selfCompassion.routes.audio.time'),
            disabled: true,
            note: t('selfCompassion.routes.audio.note'),
          },
        ]}
        startLabel={t('opening.start')}
        onStart={() => {
          // A saved phrase is a shortcut, never a starting point that assumes today feels the same.
          setPhrase({ kind: 'none' });
          setCustom('');
          setStep('acknowledge');
        }}
        onClose={close}
        closeLabel={t('close', { ns: 'common' })}
        accent={PALETTE.accent}
        tint={PALETTE.tint}
      />
    );
  }

  if (step === 'acknowledge' || step === 'humanity') {
    const key = step === 'acknowledge' ? 'acknowledge' : 'humanity';
    return (
      <ToolStep
        {...common}
        stepLabel={t(`selfCompassion.steps.${key}`)}
        progress={progressOf(step)}
        question={t(`selfCompassion.${key}.line`)}
        help={t(`selfCompassion.${key}.help`)}
        onBack={previousStep(step) ? () => setStep(previousStep(step)) : undefined}
        primaryLabel={t('selfCompassion.continue')}
        onPrimary={() => setStep(nextStep(step))}
        contentStyle={styles.centered}>
        <View style={styles.circleWrap}>
          <BreathCircle
            inLabel={t('selfCompassion.breath.in')}
            outLabel={t('selfCompassion.breath.out')}
            tintColor={tint}
            accentColor={accent}
            size={180}
          />
        </View>
      </ToolStep>
    );
  }

  if (step === 'kindness') {
    return (
      <ToolStep
        {...common}
        stepLabel={t('selfCompassion.steps.kindness')}
        progress={progressOf(step)}
        question={t('selfCompassion.kindness.question')}
        help={t('selfCompassion.kindness.help')}
        onBack={() => setStep('humanity')}
        primaryLabel={t('selfCompassion.continue')}
        onPrimary={() => setStep('breathe')}>
        {KINDNESS_PHRASES.map((id: KindnessPhraseId) => (
          <ToolChoiceCard
            key={id}
            label={t(`selfCompassion.phrases.${id}`)}
            selected={phrase.kind === 'authored' && phrase.id === id}
            onPress={() =>
              setPhrase(
                phrase.kind === 'authored' && phrase.id === id ? { kind: 'none' } : { kind: 'authored', id },
              )
            }
            accentColor={accent}
            tintColor={tint}
            role="radio"
          />
        ))}
        <ToolTextField
          value={custom}
          onChangeText={(text) => {
            setCustom(text);
            setPhrase(text.trim().length > 0 ? { kind: 'custom', text } : { kind: 'none' });
          }}
          placeholder={t('selfCompassion.kindness.customPlaceholder')}
          accessibilityLabel={t('selfCompassion.kindness.customLabel')}
          maxChars={CUSTOM_PHRASE_MAX_CHARS}
          multiline={false}
        />
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('selfCompassion.kindness.optional')}
        </ThemedText>
      </ToolStep>
    );
  }

  if (step === 'breathe') {
    return (
      <ToolStep
        {...common}
        stepLabel={t('selfCompassion.steps.breathe')}
        progress={progressOf(step)}
        question={t('selfCompassion.breathe.title')}
        onBack={() => setStep('kindness')}
        primaryLabel={t('selfCompassion.continue')}
        onPrimary={() => setStep('finish')}
        contentStyle={styles.centered}>
        <View style={styles.circleWrap}>
          <BreathCircle
            phrase={hasPhrase(phrase) ? phraseText : undefined}
            inLabel={t('selfCompassion.breath.in')}
            outLabel={t('selfCompassion.breath.out')}
            tintColor={tint}
            accentColor={accent}
          />
        </View>
      </ToolStep>
    );
  }

  // ── Finish ─────────────────────────────────────────────────────────────────
  const alreadySaved = saved !== undefined && canSave(phrase) === false;
  return (
    <ThemedView style={styles.container}>
      <ToolStep
        {...common}
        stepLabel={t('selfCompassion.steps.finish')}
        question={t('selfCompassion.finish.title')}
        help={hasPhrase(phrase) ? phraseText : t('selfCompassion.finish.noPhrase')}
        primaryLabel={t('selfCompassion.finish.done')}
        onPrimary={close}
        secondaryLabel={canSave(phrase) ? t('selfCompassion.finish.save') : undefined}
        onSecondary={
          canSave(phrase)
            ? () => {
                const now = Date.now();
                // One saved phrase, replaced rather than accumulated: this is a sentence to carry,
                // not a collection to browse.
                if (saved) store.remove(saved.id);
                store.put({ id: createId('phrase'), phrase, createdAt: now, updatedAt: now });
                close();
              }
            : undefined
        }
        footnote={alreadySaved ? undefined : t('selfCompassion.finish.nothingSaved')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'stretch' },
  circleWrap: { alignItems: 'center', paddingVertical: Spacing.four },
});
