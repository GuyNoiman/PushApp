/**
 * Mirror Feedback — the whole tool except the one thing that cannot be built yet.
 *
 * **NOTHING SENDS.** The founder's instruction (2026-08-21) was to build everything except the
 * invitation itself, because Inbox and push delivery are in progress. So the Send button explains
 * that in a sentence, and says plainly that nothing was sent and nobody was contacted — the PRD is
 * explicit that production must never claim an invitation was delivered.
 *
 * ── WHAT THE SCREEN IS CAREFUL ABOUT ───────────────────────────────────────────────────────────
 *
 * **The two modes are offered equally, with their consequences, BEFORE anybody is chosen.** They are
 * two different promises to the people being asked, not two settings — and the screen says the mode
 * locks at the first invitation, before that becomes a surprise.
 *
 * **The confidentiality copy says de-identified and never anonymous.** Context can still make
 * somebody guessable, and a finite threshold does not change that. Saying "anonymous" would be a
 * promise to somebody who is not our user that we cannot keep.
 *
 * **A custom question is reviewed, explained, and never rewritten.** A question sent in somebody's
 * name has to be the question they wrote — so the gate reports what it found and the person decides,
 * except for the two things that cannot be sent at all.
 *
 * All the rules live in `../../core/tools/mirror/`; this screen renders them.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  CUSTOM_QUESTION_MAX_CHARS,
  QUESTIONS_PER_ROUND,
  QUESTION_BANK,
  QUESTION_CATEGORIES,
  recommendedSet,
  reviewCustomQuestion,
  type QuestionCategory,
} from '@/core/tools/mirror/questionBank';
import {
  getMirrorGateway,
  type MirrorResponseRow,
  type MirrorRoundRow,
  type MirrorSynthesisRow,
  type MirrorSynthesisStatus,
} from '@/core/tools/mirror';
import {
  CONFIDENTIAL_THRESHOLD,
  NUDGE_AFTER_DAYS,
  ROUND_OPEN_DAYS,
  type MirrorMode,
} from '@/core/tools/mirror/round';
import { createId } from '@/core/util/id';
import { useSocial } from '@/state/SocialProvider';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

type Step = 'round' | 'mode' | 'pick' | 'custom' | 'review' | 'sent';

/** A question in the round: one from the bank, or one the person wrote. */
interface Chosen {
  id: string;
  /** Present for a custom question; the bank's copy is looked up by id. */
  text?: string;
}

export default function MirrorScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');

  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<MirrorMode>('visible');
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [category, setCategory] = useState<QuestionCategory>('moments');

  const social = useSocial();

  /**
   * THE ROUND YOU ALREADY HAVE COMES FIRST (PRD §4).
   *
   * Opening this tool used to start a new round every time, which is wrong in the one case that
   * matters: somebody who asked five people a week ago comes back here to READ what came of it, and
   * was met by the first question of a fresh setup. So the newest round that was actually sent takes
   * the screen, and starting another is a deliberate choice made from there.
   */
  const [round, setRound] = useState<MirrorRoundRow | null>(null);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const gateway = getMirrorGateway();
      if (!gateway.enabled) return;
      try {
        const rounds = await gateway.myRounds();
        const latest = rounds.find((r) => r.status !== 'draft');
        if (!mounted || !latest) return;
        setRound(latest);
        setStep('round');
      } catch {
        // Offline: the wizard is a perfectly good place to be, and it says so when Send fails.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * WHO CAN BE ASKED: the Support Circle, and nobody else. Somebody outside the app needs the shared
   * invitation path that does not exist yet, and offering them here would promise a delivery we
   * cannot make.
   */
  const friends = useMemo(
    () =>
      social.friends
        .filter((f) => f.status === 'accepted')
        .map((f) => ({
          id: f.profile.id,
          name: f.profile.buddySummary?.name?.trim() || `@${f.profile.handle}`,
        })),
    [social.friends],
  );
  const [contributors, setContributors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const toggleContributor = useCallback((id: string) => {
    setContributors((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  }, []);

  /**
   * Open the round and send the invitations.
   *
   * A CONFIDENTIAL round needs enough people to answer before it can say anything at all, so asking
   * fewer than the threshold is refused HERE, before anybody is invited — inviting three people to
   * something that can never produce a result would waste their time and the requester's hope.
   */
  const send = useCallback(async () => {
    const gateway = getMirrorGateway();
    setSendError(null);
    if (mode === 'confidential' && contributors.length < CONFIDENTIAL_THRESHOLD) {
      setSendError(t('mirror.review.needMore', { count: CONFIDENTIAL_THRESHOLD }));
      return;
    }
    if (!gateway.enabled) {
      setSendError(t('mirror.review.offline'));
      return;
    }
    setSending(true);
    try {
      await gateway.openRound({
        id: createId('mirror'),
        mode,
        // A bank question travels as its ID (the copy is authored and localised at read time); a
        // custom one travels as the person's own words, because there is nowhere else they exist.
        questionIds: chosen.filter((q) => q.text === undefined).map((q) => q.id),
        customQuestions: chosen.filter((q) => q.text !== undefined).map((q) => q.text as string),
        contributorIds: contributors,
        closesAt: Date.now() + ROUND_OPEN_DAYS * 24 * 60 * 60 * 1000,
      });
      setStep('sent');
    } catch {
      // Never a false success: the round is not open, and the screen says so.
      setSendError(t('mirror.review.failed'));
    } finally {
      setSending(false);
    }
  }, [mode, contributors, chosen, t]);

  const label = (q: Chosen) => q.text ?? t(`mirror.bank.${q.id}`);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() =>
              step === 'mode' || step === 'round'
                ? router.canGoBack()
                  ? router.back()
                  : router.replace('/(tabs)/tools')
                : setStep(step === 'custom' ? 'pick' : step === 'review' ? 'pick' : 'mode')
            }
            hitSlop={8}
            style={styles.iconButton}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('mirror.title')}
          </ThemedText>
          <View style={styles.iconButton} />
        </View>

        <KeyboardSafeScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'round' && round ? (
            <RoundStep
              round={round}
              onNewRound={() => {
                setRound(null);
                setChosen([]);
                setContributors([]);
                setStep('mode');
              }}
            />
          ) : null}

          {step === 'mode' ? (
            <ModeStep mode={mode} setMode={setMode} onContinue={() => setStep('pick')} />
          ) : null}

          {step === 'pick' ? (
            <PickStep
              chosen={chosen}
              setChosen={setChosen}
              category={category}
              setCategory={setCategory}
              onWriteOwn={() => setStep('custom')}
              onContinue={() => setStep('review')}
              label={label}
            />
          ) : null}

          {step === 'custom' ? (
            <CustomStep
              onAdd={(text) => {
                setChosen((prev) => [...prev, { id: `custom-${prev.length}`, text }]);
                setStep('pick');
              }}
              onCancel={() => setStep('pick')}
              full={chosen.length >= QUESTIONS_PER_ROUND}
            />
          ) : null}

          {step === 'review' ? (
            <ReviewStep
              mode={mode}
              chosen={chosen}
              label={label}
              onEdit={() => setStep('pick')}
              friends={friends}
              contributors={contributors}
              onToggleContributor={toggleContributor}
              onSend={() => void send()}
              sending={sending}
              sendError={sendError}
            />
          ) : null}

          {/* The round is open and the invitations are out. What this screen must NOT do is promise
              a result: a confidential round says nothing at all until enough people have answered,
              and saying "you'll have it soon" would be a guess about other people's evenings. */}
          {step === 'sent' ? (
            <>
              <Title>{t('mirror.sent.title')}</Title>
              <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 21 }}>
                {t(`mirror.sent.${mode}`, { count: contributors.length, days: ROUND_OPEN_DAYS })}
              </ThemedText>
              <Cta label={t('mirror.sent.done')} onPress={() => router.replace('/(tabs)/tools')} />
            </>
          ) : null}
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * THE ROUND THAT WAS ALREADY SENT — while it collects, and once it is over.
 *
 * ── WHAT THIS SCREEN IS NOT ALLOWED TO SHOW ────────────────────────────────────────────────────
 *
 * While a confidential round collects, a COUNT and nothing else: not who answered, not who did not,
 * not when any of it happened. Against a list of people the requester chose themselves, a timestamp
 * is a name. That is also why nothing at all opens before the round closes, even when the fifth
 * answer arrived on the first evening.
 *
 * ── AND WHAT IT ASKS FOR RATHER THAN DOES ──────────────────────────────────────────────────────
 *
 * The result is produced by `supabase/functions/mirror-synthesis`, because producing it means
 * reading the contributors' raw words and this device belongs to the one person who must never see
 * them. All this screen does is ask, and read back the paragraphs the server decided were safe to
 * publish. A question that produced nothing says so plainly, in its own words — that is a legitimate
 * outcome and not an error to hide.
 */
function RoundStep({ round, onNewRound }: { round: MirrorRoundRow; onNewRound: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const social = useSocial();

  const [current, setCurrent] = useState(round);
  const [answered, setAnswered] = useState(0);
  const [status, setStatus] = useState<MirrorSynthesisStatus | null>(null);
  const [syntheses, setSyntheses] = useState<MirrorSynthesisRow[]>([]);
  const [responses, setResponses] = useState<MirrorResponseRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [closing, setClosing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const over =
    current.status === 'closed' || (current.closesAt !== undefined && Date.now() >= current.closesAt);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const gateway = getMirrorGateway();
      setBusy(true);
      try {
        if (!over) {
          const count = await gateway.answeredCount(current.id);
          if (mounted) setAnswered(count);
        } else if (current.mode === 'visible') {
          const rows = await gateway.visibleResponses(current.id);
          if (mounted) setResponses(rows);
        } else {
          const result = await gateway.requestSynthesis(current.id);
          if (!mounted) return;
          setStatus(result);
          if (result === 'delivered') {
            const rows = await gateway.synthesis(current.id);
            if (mounted) setSyntheses(rows);
          }
        }
      } catch {
        if (mounted) setStatus('unavailable');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [current, over, attempt]);

  /** The five, in the order every contributor saw them. */
  const questions = useMemo(
    () => [
      ...current.questionIds.map((id) => ({ id, text: t(`mirror.bank.${id}`) })),
      ...current.customQuestions.map((text, index) => ({ id: `custom:${index}`, text })),
    ],
    [current, t],
  );

  /** Visible mode only: the contributor agreed to be named, so name them. */
  const nameFor = useCallback(
    (id: string) => {
      const friend = social.friends.find((f) => f.profile.id === id);
      if (!friend) return t('mirror.round.someone');
      return friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
    },
    [social.friends, t],
  );

  /** Three days in and still short: say the number, never who is missing. */
  const nudge =
    !over &&
    current.mode === 'confidential' &&
    current.openedAt !== undefined &&
    Date.now() >= current.openedAt + NUDGE_AFTER_DAYS * 24 * 60 * 60 * 1000 &&
    answered < CONFIDENTIAL_THRESHOLD;

  const close = useCallback(async () => {
    setClosing(true);
    try {
      await getMirrorGateway().closeRound(current.id);
      setCurrent((r) => ({ ...r, status: 'closed', closedAt: Date.now() }));
    } catch {
      // It stays open, and nothing on screen claims otherwise.
    } finally {
      setClosing(false);
    }
  }, [current.id]);

  const card = { borderColor: theme.hairline, backgroundColor: theme.backgroundElement };

  return (
    <>
      <Title>{t('mirror.title')}</Title>

      <View style={[styles.card, card]}>
        <View style={styles.rowHead}>
          <Ionicons
            name={current.mode === 'visible' ? 'people-outline' : 'shield-checkmark-outline'}
            size={18}
            color={theme.tealStrong}
          />
          <ThemedText type="smallBold" style={styles.flex}>
            {t(`mirror.mode.${current.mode}`)}
          </ThemedText>
        </View>
        {current.mode === 'confidential' ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t('mirror.round.neverRaw')}
          </ThemedText>
        ) : null}
      </View>

      {/* Still collecting. A number, a promise about timing, and the one action that is theirs. */}
      {!over ? (
        <>
          <ThemedText type="displaySmall">
            {current.mode === 'confidential'
              ? t('mirror.round.collecting', { count: answered, needed: CONFIDENTIAL_THRESHOLD })
              : t('mirror.round.collectingVisible', { count: answered })}
          </ThemedText>
          <Body>{t('mirror.round.collectingNote')}</Body>
          {nudge ? <Body>{t('mirror.round.nudge')}</Body> : null}
          <Cta
            label={closing ? t('mirror.round.closing') : t('mirror.round.close')}
            disabled={closing}
            onPress={() => void close()}
          />
        </>
      ) : null}

      {/* Visible mode: their words, as they wrote them, with their name on them. */}
      {over && current.mode === 'visible' ? (
        <>
          <ThemedText type="displaySmall">{t('mirror.round.visibleTitle')}</ThemedText>
          {questions.map((q) => {
            const written = responses.filter((r) => r.questionId === q.id);
            return (
              <View key={q.id} style={[styles.card, card]}>
                <ThemedText type="smallBold">{q.text}</ThemedText>
                {written.length === 0 ? (
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {t('mirror.round.emptyNote')}
                  </ThemedText>
                ) : (
                  written.map((r) => (
                    <View key={`${r.contributorId}:${r.questionId}`} style={styles.answer}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {nameFor(r.contributorId)}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.text, lineHeight: 21 }}>
                        {r.body}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </>
      ) : null}

      {/* Confidential mode: patterns, or an honest reason there are none. */}
      {over && current.mode === 'confidential' ? (
        busy ? (
          <Body>{t('mirror.round.producing')}</Body>
        ) : status === 'delivered' ? (
          <>
            <ThemedText type="displaySmall">{t('mirror.round.delivered')}</ThemedText>
            <Body>{t('mirror.round.deliveredNote')}</Body>
            {questions.map((q) => {
              const row = syntheses.find((sy) => sy.questionId === q.id);
              const published = row && !row.rejection ? row.body : null;
              const note =
                row?.rejection === 'noPattern'
                  ? t('mirror.round.noPattern')
                  : row?.rejection === 'leaked'
                    ? t('mirror.round.leakedNote')
                    : t('mirror.round.emptyNote');
              return (
                <View key={q.id} style={[styles.card, card]}>
                  <ThemedText type="smallBold">{q.text}</ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: published ? theme.text : theme.textMuted, lineHeight: 21 }}>
                    {published ?? note}
                  </ThemedText>
                </View>
              );
            })}
          </>
        ) : status === 'notEnough' ? (
          <>
            <ThemedText type="displaySmall">{t('mirror.round.notEnough')}</ThemedText>
            <Body>{t('mirror.round.notEnoughBody')}</Body>
          </>
        ) : status === 'collecting' ? (
          // The server disagrees about the deadline and the server is right — its clock is the one
          // the contributors are answering against.
          <Body>{t('mirror.round.collectingNote')}</Body>
        ) : (
          <>
            <Body>{t('mirror.round.unavailable')}</Body>
            <Cta label={t('mirror.round.retry')} onPress={() => setAttempt((n) => n + 1)} />
          </>
        )
      ) : null}

      {over ? <Cta label={t('mirror.round.newRound')} onPress={onNewRound} /> : null}
    </>
  );
}

/** Both modes, equally, with what each one promises the people being asked. */
function ModeStep({
  mode,
  setMode,
  onContinue,
}: {
  mode: MirrorMode;
  setMode: (m: MirrorMode) => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [explaining, setExplaining] = useState(false);

  return (
    <>
      <Title>{t('mirror.mode.title')}</Title>
      <Body>{t('mirror.mode.body')}</Body>

      {(['visible', 'confidential'] as const).map((value) => {
        const on = mode === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(`mirror.mode.${value}`)}
            onPress={() => setMode(value)}
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: on ? theme.tint : theme.hairline,
                backgroundColor: on ? theme.tealTint : theme.backgroundElement,
              },
              pressed && styles.pressed,
            ]}>
            <View style={styles.rowHead}>
              <Ionicons
                name={value === 'visible' ? 'people-outline' : 'shield-checkmark-outline'}
                size={22}
                color={on ? theme.tealStrong : theme.textSecondary}
              />
              <ThemedText type="displaySmall" style={styles.flex}>
                {t(`mirror.mode.${value}`)}
              </ThemedText>
              <Ionicons
                name={on ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={on ? theme.tint : theme.textMuted}
              />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
              {t(`mirror.mode.${value}Body`)}
            </ThemedText>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('mirror.mode.how')}
        onPress={() => setExplaining((v) => !v)}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.tint }}>
          {t('mirror.mode.how')}
        </ThemedText>
      </Pressable>
      {explaining ? (
        <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
          {t('mirror.mode.howBody')}
        </ThemedText>
      ) : null}

      {/* Said before it can be a surprise. */}
      <ThemedText type="small" style={{ color: theme.textMuted, lineHeight: 20 }}>
        {t('mirror.mode.locked')}
      </ThemedText>

      <Cta label={t('mirror.pick.continue')} onPress={onContinue} />
    </>
  );
}

/** Exactly five, from the bank or written. The counter is fixed and always visible. */
function PickStep({
  chosen,
  setChosen,
  category,
  setCategory,
  onWriteOwn,
  onContinue,
  label,
}: {
  chosen: Chosen[];
  setChosen: (next: Chosen[]) => void;
  category: QuestionCategory;
  setCategory: (c: QuestionCategory) => void;
  onWriteOwn: () => void;
  onContinue: () => void;
  label: (q: Chosen) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const full = chosen.length >= QUESTIONS_PER_ROUND;

  const toggle = (id: string) => {
    const already = chosen.some((q) => q.id === id);
    if (already) setChosen(chosen.filter((q) => q.id !== id));
    else if (!full) setChosen([...chosen, { id }]);
  };

  return (
    <>
      <View style={styles.rowHead}>
        <Title>{t('mirror.pick.title')}</Title>
      </View>
      <ThemedText type="small" style={{ color: theme.tint }}>
        {t('mirror.pick.counter', { count: chosen.length, total: QUESTIONS_PER_ROUND })}
      </ThemedText>

      <View style={styles.tabs}>
        {QUESTION_CATEGORIES.map((c) => {
          const on = category === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`mirror.pick.categories.${c}`)}
              onPress={() => setCategory(c)}
              style={({ pressed }) => [
                styles.tab,
                { backgroundColor: on ? theme.tint : 'transparent', borderColor: theme.hairline },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="small"
                style={{ color: on ? theme.backgroundElement : theme.textSecondary }}>
                {t(`mirror.pick.categories.${c}`)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {QUESTION_BANK.filter((q) => q.category === category).map((q) => {
        const on = chosen.some((c) => c.id === q.id);
        return (
          <Pressable
            key={q.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(`mirror.bank.${q.id}`)}
            onPress={() => toggle(q.id)}
            style={({ pressed }) => [
              styles.row,
              { borderColor: on ? theme.tint : theme.hairline },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={[styles.flex, { color: theme.text, lineHeight: 20 }]}>
              {t(`mirror.bank.${q.id}`)}
            </ThemedText>
            <Ionicons
              name={on ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={on ? theme.tint : theme.textMuted}
            />
          </Pressable>
        );
      })}

      {/* Anything written is listed too, so five is always five things you can see. */}
      {chosen
        .filter((q) => q.text)
        .map((q) => (
          <View key={q.id} style={[styles.row, { borderColor: theme.tint }]}>
            <ThemedText type="small" style={[styles.flex, { color: theme.text, lineHeight: 20 }]}>
              {label(q)}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label(q)}. ${t('remove', { ns: 'common' })}`}
              onPress={() => setChosen(chosen.filter((c) => c.id !== q.id))}
              hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
        ))}

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mirror.pick.recommended')}
          onPress={() => setChosen(recommendedSet().map((id) => ({ id })))}
          style={({ pressed }) => [styles.softButton, { borderColor: theme.hairline }, pressed && styles.pressed]}>
          <Ionicons name="star-outline" size={15} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.tint }}>
            {t('mirror.pick.recommended')}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: full }}
          accessibilityLabel={t('mirror.pick.writeOwn')}
          disabled={full}
          onPress={onWriteOwn}
          style={({ pressed }) => [
            styles.softButton,
            { borderColor: theme.hairline },
            (pressed || full) && styles.pressed,
          ]}>
          <Ionicons name="create-outline" size={15} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.tint }}>
            {t('mirror.pick.writeOwn')}
          </ThemedText>
        </Pressable>
      </View>

      <Cta label={t('mirror.pick.continue')} disabled={!full} onPress={onContinue} />
    </>
  );
}

/** The gate: it reports what it found, explains it, and never rewrites the sentence. */
function CustomStep({
  onAdd,
  onCancel,
  full,
}: {
  onAdd: (text: string) => void;
  onCancel: () => void;
  full: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [text, setText] = useState('');
  const review = useMemo(() => reviewCustomQuestion(text), [text]);
  const touched = text.trim().length > 0;

  return (
    <>
      <Title>{t('mirror.custom.title')}</Title>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('mirror.custom.placeholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t('mirror.custom.title')}
        multiline
        style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
      />
      <ThemedText type="small" style={[styles.count, { color: theme.textMuted }]}>
        {`${[...text].length} / ${CUSTOM_QUESTION_MAX_CHARS}`}
      </ThemedText>

      <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
        {t('mirror.custom.guidance')}
      </ThemedText>

      {touched ? (
        review.ok ? (
          <View style={[styles.card, { borderColor: theme.tint, backgroundColor: theme.tealWash }]}>
            <View style={styles.rowHead}>
              <Ionicons name="checkmark-circle" size={18} color={theme.tint} />
              <ThemedText type="smallBold" style={styles.flex}>
                {t('mirror.custom.ready')}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('mirror.custom.readyBody')}
            </ThemedText>
          </View>
        ) : (
          review.problems.map((problem) => (
            <View
              key={problem}
              style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.goldTint }]}>
              <ThemedText type="small" style={{ color: theme.text, lineHeight: 20 }}>
                {t(`mirror.custom.problems.${problem}`, { max: CUSTOM_QUESTION_MAX_CHARS })}
              </ThemedText>
            </View>
          ))
        )
      ) : null}

      <Cta
        label={t('mirror.custom.add')}
        disabled={full || !touched || review.blocking}
        onPress={() => onAdd(text.trim())}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('mirror.custom.cancel')}
        onPress={onCancel}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('mirror.custom.cancel')}
        </ThemedText>
      </Pressable>
    </>
  );
}

/** The last screen before sending — and the honest reason it does not send. */
function ReviewStep({
  mode,
  chosen,
  label,
  onEdit,
  friends,
  contributors,
  onToggleContributor,
  onSend,
  sending,
  sendError,
}: {
  mode: MirrorMode;
  chosen: Chosen[];
  label: (q: Chosen) => string;
  onEdit: () => void;
  friends: { id: string; name: string }[];
  contributors: string[];
  onToggleContributor: (id: string) => void;
  onSend: () => void;
  sending: boolean;
  sendError: string | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');

  return (
    <>
      <Title>{t('mirror.review.title')}</Title>

      <View style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
        <View style={styles.rowHead}>
          <Ionicons
            name={mode === 'visible' ? 'people-outline' : 'shield-checkmark-outline'}
            size={18}
            color={theme.tealStrong}
          />
          <ThemedText type="smallBold" style={styles.flex}>
            {t(`mirror.mode.${mode}`)}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
          {t(`mirror.mode.${mode}Body`)}
        </ThemedText>
        {mode === 'confidential' ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t('mirror.round.sealed')}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.rowHead}>
        <ThemedText type="smallBold" style={styles.flex}>
          {t('mirror.review.questions', { count: chosen.length })}
        </ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('mirror.review.edit')} onPress={onEdit}>
          <ThemedText type="small" style={{ color: theme.tint }}>
            {t('mirror.review.edit')}
          </ThemedText>
        </Pressable>
      </View>
      {chosen.map((q) => (
        <ThemedText key={q.id} type="small" style={{ color: theme.text, lineHeight: 21 }}>
          {`· ${label(q)}`}
        </ThemedText>
      ))}

      {/* WHO IS ASKED. Only people already in the Support Circle: somebody outside the app cannot be
          invited yet (that needs the shared invitation path), and offering it would promise a
          delivery we cannot make. */}
      <ThemedText type="smallBold">{t('mirror.review.whoTitle')}</ThemedText>
      {friends.length === 0 ? (
        <ThemedText type="small" style={{ color: theme.textMuted, lineHeight: 20 }}>
          {t('mirror.review.noFriends')}
        </ThemedText>
      ) : (
        friends.map((friend) => {
          const picked = contributors.includes(friend.id);
          return (
            <Pressable
              key={friend.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: picked }}
              accessibilityLabel={friend.name}
              onPress={() => onToggleContributor(friend.id)}
              style={[
                styles.card,
                {
                  borderColor: picked ? theme.tint : theme.hairline,
                  backgroundColor: picked ? theme.tealTint : theme.backgroundElement,
                },
              ]}>
              <View style={styles.rowHead}>
                <Ionicons
                  name={picked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={picked ? theme.tint : theme.textMuted}
                />
                <ThemedText type="small" style={styles.flex}>{friend.name}</ThemedText>
              </View>
            </Pressable>
          );
        })
      )}

      {mode === 'confidential' ? (
        <ThemedText type="small" style={{ color: theme.textMuted, lineHeight: 20 }}>
          {t('mirror.round.collectingNote')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {mode === 'confidential'
          ? t('mirror.review.people', { count: CONFIDENTIAL_THRESHOLD })
          : t('mirror.review.visibleAnyNumber')}
      </ThemedText>

      {sendError ? (
        <ThemedText type="small" style={{ color: theme.danger }}>{sendError}</ThemedText>
      ) : null}

      <Cta
        label={sending ? t('mirror.review.sending') : t('mirror.review.send')}
        disabled={sending || contributors.length === 0}
        onPress={onSend}
      />
    </>
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
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  title: { fontSize: 22, lineHeight: 30 },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  answer: { gap: Spacing.one, paddingTop: Spacing.one },
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.two, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  buttons: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.three, flexWrap: 'wrap' },
  softButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    marginTop: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.card,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 96,
    textAlignVertical: 'top',
    textAlign: isRTL() ? 'right' : 'left',
  },
  count: { textAlign: isRTL() ? 'left' : 'right' },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  quiet: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
