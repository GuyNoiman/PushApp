/**
 * Answering somebody's Mirror round — the contributor's side, and the half of this tool that is
 * about a person who is not the user.
 *
 * WHAT THEY ARE TOLD BEFORE THEY WRITE A WORD (Mirror_Feedback_PRD §8.3, §12): which mode this is,
 * and therefore what happens to what they write. In VISIBLE mode their name is on it and the person
 * will read their words. In CONFIDENTIAL mode nobody — including the person who asked — ever sees
 * what they wrote; only a pattern across several people comes back. Those are two different promises
 * and this screen never blurs them.
 *
 * THEIR READING IS PRIVATE. Opening this changes nothing the requester can see; only submitting does.
 *
 * NOTHING IS REQUIRED. A question they have nothing to say to is left empty, and an empty answer is
 * simply not sent — a contributor is doing somebody a favour, not filling in a form.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  getMirrorGateway,
  type MirrorInvitationRow,
  type MirrorRoundRow,
} from '@/core/tools/mirror';
import { QUESTION_BANK } from '@/core/tools/mirror/questionBank';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';

const ANSWER_MAX_CHARS = 600;

export default function MirrorAnswerScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const gateway = getMirrorGateway();

  const [pending, setPending] = useState<{ round: MirrorRoundRow; invitation: MirrorInvitationRow }[]>([]);
  const [openIndex, setOpenIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const all = await gateway.invitationsForMe();
        if (mounted) setPending(all.filter((row) => row.invitation.status === 'sent'));
      } catch {
        if (mounted) setError(t('mirror.answer.loadFailed'));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [gateway, t]);

  const current = pending[openIndex];

  /** The five questions, authored copy resolved by id and custom ones carried as written. */
  const questions = useMemo(() => {
    if (!current) return [] as { id: string; text: string }[];
    const bank = current.round.questionIds.map((id) => ({
      id,
      text: QUESTION_BANK.some((q) => q.id === id) ? t(`mirror.bank.${id}`) : id,
    }));
    const custom = current.round.customQuestions.map((text, index) => ({
      id: `custom:${index}`,
      text,
    }));
    return [...bank, ...custom];
  }, [current, t]);

  const submit = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const written = questions
        .map((q) => ({ questionId: q.id, body: (answers[q.id] ?? '').trim() }))
        .filter((a) => a.body.length > 0);
      if (written.length === 0) {
        setError(t('mirror.answer.nothingWritten'));
        return;
      }
      await gateway.submitAnswers(current.round.id, written);
      setDone(true);
    } catch {
      setError(t('mirror.answer.failed'));
    } finally {
      setBusy(false);
    }
  }, [current, questions, answers, gateway, t]);

  const decline = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      await gateway.declineInvitation(current.round.id);
      setDone(true);
    } catch {
      setError(t('mirror.answer.failed'));
    } finally {
      setBusy(false);
    }
  }, [current, gateway, t]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={close}
            hitSlop={8}
            style={styles.icon}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>{t('mirror.answer.header')}</ThemedText>
          <View style={styles.icon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {done ? (
            <>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) }]}>
                {t('mirror.answer.thanks')}
              </ThemedText>
              <ThemedText type="small" style={[styles.body, { color: theme.textSecondary }]}>
                {t('mirror.answer.thanksBody')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={[styles.cta, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.background }}>{t('mirror.answer.close')}</ThemedText>
              </Pressable>
            </>
          ) : !current ? (
            <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
              {error ?? t('mirror.answer.none')}
            </ThemedText>
          ) : (
            <>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) }]}>
                {t('mirror.answer.title')}
              </ThemedText>

              {/* The promise, before a single word is written. */}
              <View
                style={[
                  styles.card,
                  {
                    borderColor: theme.hairline,
                    backgroundColor: current.round.mode === 'confidential' ? theme.tealTint : theme.backgroundElement,
                  },
                ]}>
                <View style={styles.rowHead}>
                  <Ionicons
                    name={current.round.mode === 'confidential' ? 'shield-checkmark-outline' : 'people-outline'}
                    size={18}
                    color={theme.tealStrong}
                  />
                  <ThemedText type="smallBold" style={styles.flex}>
                    {t(`mirror.answer.mode.${current.round.mode}`)}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                  {t(`mirror.answer.mode.${current.round.mode}Body`)}
                </ThemedText>
              </View>

              <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
                {t('mirror.answer.privateReading')}
              </ThemedText>

              {questions.map((question) => (
                <View key={question.id} style={styles.question}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{question.text}</ThemedText>
                  <ToolTextField
                    value={answers[question.id] ?? ''}
                    onChangeText={(text) => setAnswers((current) => ({ ...current, [question.id]: text }))}
                    placeholder={t('mirror.answer.placeholder')}
                    accessibilityLabel={question.text}
                    maxChars={ANSWER_MAX_CHARS}
                  />
                </View>
              ))}

              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void submit()}
                style={[styles.cta, { backgroundColor: busy ? theme.backgroundElement : theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: busy ? theme.textMuted : theme.background }}>
                  {busy ? t('mirror.answer.sending') : t('mirror.answer.send')}
                </ThemedText>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => void decline()} style={styles.secondary}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>{t('mirror.answer.decline')}</ThemedText>
              </Pressable>

              {pending.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenIndex((i) => (i + 1) % pending.length)}
                  style={styles.secondary}>
                  <ThemedText type="small" style={{ color: theme.tint }}>
                    {t('mirror.answer.next', { count: pending.length - 1 })}
                  </ThemedText>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  title: { textAlign: START_TEXT_ALIGN },
  body: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  card: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  question: { gap: Spacing.two },
  cta: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
});
