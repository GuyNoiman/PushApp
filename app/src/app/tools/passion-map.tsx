/**
 * Passion Map — the guided reflection, built to `04_Product/PRD/Tools_Documentation/Passion_Map_PRD.md`.
 *
 * **A REFLECTION, NOT A TEST**, and the founder's sharper version of it: the digital Ikigai tools
 * rush to a purpose sentence as though it were uncovered objectively, and here the user stays the
 * author. Every screen below is shaped by that — the groupings arrive marked SUGGESTED, nothing is
 * the map until Save my map, and a run with three Sparks is honestly called early clues rather than
 * padded out to look complete.
 *
 * ONE COGNITIVE OPERATION PER SCREEN (PRD §6), and every step autosaves: six prompts is more than one
 * sitting for some people, and a run that loses itself when the phone rings is a run nobody finishes.
 *
 * A RETURNING PERSON LANDS ON THEIR MAP, not on the game again (§4.2), with the three things they
 * can do from it: add today's signal, edit, or start over. Starting over writes a DRAFT and leaves
 * the confirmed map alone until the new one is confirmed — abandoning a restart can never erase a
 * usable result.
 *
 * PRIVACY (G1): Sparks, Why notes and daily moments are on-device only.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  MOMENTS_PER_DAY,
  MOMENT_MAX_CHARS,
  NARROW_TO,
  PROMPTS,
  SPARKS_PER_PROMPT,
  SPARK_CAP,
  SPARK_MAX_CHARS,
  WHY_MAX_CHARS,
  addSignal,
  addSpark,
  capReached,
  confirmMap,
  currentPrompt,
  evidenceCount,
  isEarlyClues,
  localDay,
  moveSpark,
  narrow,
  nextPrompt,
  proposeThemes,
  removeSpark,
  renameTheme,
  setThemes,
  setWhy,
  signalsOn,
  sparksFromPrompt,
  startMap,
  visibleLength,
  type Energy,
  type PassionMapState,
  type Pull,
} from '@/core/tools/passionMap/model';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { usePassionMap } from '@/state/PassionMapStore';

type Screen = 'intro' | 'collect' | 'review' | 'why' | 'arrange' | 'map' | 'signal';

export default function PassionMapScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = usePassionMap();

  const [screen, setScreen] = useState<Screen | null>(null);
  const [run, setRun] = useState<PassionMapState>(startMap);

  // Open where the PRD says: on the confirmed map if there is one, on the draft if a run was left
  // unfinished, otherwise on the introduction.
  useEffect(() => {
    if (!store.ready || screen !== null) return;
    if (store.draft) {
      setRun(store.draft);
      setScreen('collect');
    } else if (store.map) {
      setRun(store.map);
      setScreen('map');
    } else {
      setScreen('intro');
    }
  }, [store.ready, store.draft, store.map, screen]);

  /** Every change to a RUN is a draft write. Nothing here touches the confirmed map. */
  const update = useCallback(
    (next: PassionMapState) => {
      setRun(next);
      store.saveDraft(next);
    },
    [store],
  );

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
            {t('passionMap.title')}
          </ThemedText>
          <View style={styles.iconButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {screen === 'intro' ? <Intro onStart={() => setScreen('collect')} /> : null}

          {screen === 'collect' ? (
            <Collect
              run={run}
              update={update}
              onDone={() => setScreen('review')}
            />
          ) : null}

          {screen === 'review' ? (
            <Review run={run} update={update} onDone={() => setScreen('why')} />
          ) : null}

          {screen === 'why' ? (
            <Why
              run={run}
              update={update}
              onDone={() => {
                update(setThemes(run, proposeThemes(run, () => t('passionMap.arrange.suggested'))));
                setScreen('arrange');
              }}
            />
          ) : null}

          {screen === 'arrange' ? (
            <Arrange
              run={run}
              update={update}
              onSave={() => {
                // The END of the run: the result is computed here, once, from this run's themes plus
                // whatever the days since the LAST run said (founder, 2026-08-25). Those signals are
                // spent in the process — they shape this result and do not vote again in the next.
                const confirmed = confirmMap(run, Date.now(), store.map?.signals ?? []);
                store.confirm(confirmed);
                setRun(confirmed);
                setScreen('map');
              }}
            />
          ) : null}

          {screen === 'map' ? (
            <MapSummary
              map={store.map ?? run}
              onAddSignal={() => setScreen('signal')}
              onStartOver={() => {
                const fresh = startMap();
                setRun(fresh);
                store.saveDraft(fresh);
                setScreen('collect');
              }}
            />
          ) : null}

          {screen === 'signal' ? (
            <Signal
              map={store.map ?? run}
              onSave={(next) => {
                store.updateMap(next);
                setRun(next);
                setScreen('map');
              }}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  return (
    <>
      <Title>{t('passionMap.intro.lead')}</Title>
      <Body>{t('passionMap.intro.body')}</Body>
      {(['meta', 'cap', 'skippable', 'editable'] as const).map((key) => (
        <ThemedText key={key} type="small" style={{ color: theme.textMuted }}>
          {t(`passionMap.intro.${key}`)}
        </ThemedText>
      ))}
      <Cta label={t('passionMap.intro.start')} onPress={onStart} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('passionMap.intro.notNow')}
        onPress={() => router.replace('/(tabs)/tools')}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('passionMap.intro.notNow')}
        </ThemedText>
      </Pressable>
    </>
  );
}

/** One prompt per screen, with both caps visible, and Skip carrying no warning (PRD §6.2). */
function Collect({
  run,
  update,
  onDone,
}: {
  run: PassionMapState;
  update: (s: PassionMapState) => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [draft, setDraft] = useState('');
  const prompt = currentPrompt(run);

  useEffect(() => {
    if (prompt === null) onDone();
  }, [prompt, onDone]);
  if (!prompt) return null;

  const here = sparksFromPrompt(run, prompt).length;
  const cap = capReached(run, prompt);
  const tooLong = visibleLength(draft.trim()) > SPARK_MAX_CHARS;

  const advance = () => {
    setDraft('');
    update(nextPrompt(run));
  };

  return (
    <>
      <ThemedText type="small" style={{ color: theme.tint }}>
        {t('passionMap.collect.step', { current: PROMPTS.indexOf(prompt) + 1, total: PROMPTS.length })}
      </ThemedText>
      <Title>{t(`passionMap.prompts.${prompt}`)}</Title>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t('passionMap.collect.placeholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t(`passionMap.prompts.${prompt}`)}
        editable={cap === null}
        style={[
          styles.input,
          { color: theme.text, borderColor: tooLong ? theme.danger : theme.hairline },
        ]}
      />
      <View style={styles.footRow}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('passionMap.collect.counts', {
            here,
            perPrompt: SPARKS_PER_PROMPT,
            total: run.sparks.length,
            cap: SPARK_CAP,
          })}
        </ThemedText>
        <ThemedText type="small" style={{ color: tooLong ? theme.danger : theme.textMuted }}>
          {`${visibleLength(draft)} / ${SPARK_MAX_CHARS}`}
        </ThemedText>
      </View>

      {cap === 'total' ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {t('passionMap.collect.capReached')}
        </ThemedText>
      ) : null}

      {/* What has been collected here, so removing a slip does not need another screen. */}
      <View style={styles.chips}>
        {sparksFromPrompt(run, prompt).map((spark) => (
          <Pressable
            key={spark.id}
            accessibilityRole="button"
            accessibilityLabel={`${spark.text}. ${t('remove', { ns: 'common' })}`}
            onPress={() => update(removeSpark(run, spark.id))}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: theme.tint, backgroundColor: theme.tealTint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: theme.tealStrong }}>
              {spark.text}
            </ThemedText>
            <Ionicons name="close" size={13} color={theme.tealStrong} />
          </Pressable>
        ))}
      </View>

      <View style={styles.buttons}>
        <Cta
          label={t('passionMap.collect.add')}
          disabled={draft.trim().length === 0 || tooLong || cap !== null}
          onPress={() => {
            update(addSpark(run, prompt, draft));
            setDraft('');
          }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('passionMap.collect.skip')}
        onPress={advance}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.tint }}>
          {here > 0 ? t('passionMap.review.continue') : t('passionMap.collect.skip')}
        </ThemedText>
      </Pressable>
    </>
  );
}

/** Everything collected, and the three to five that ring truest today. */
function Review({
  run,
  update,
  onDone,
}: {
  run: PassionMapState;
  update: (s: PassionMapState) => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [chosen, setChosen] = useState<string[]>([...run.chosen]);

  const toggle = (id: string) =>
    setChosen((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < NARROW_TO.max
          ? [...prev, id]
          : prev,
    );

  return (
    <>
      <Title>{t('passionMap.review.title')}</Title>
      <Body>{t('passionMap.review.body')}</Body>

      {run.sparks.map((spark) => {
        const on = chosen.includes(spark.id);
        return (
          <View
            key={spark.id}
            style={[
              styles.row,
              {
                borderColor: on ? theme.tint : theme.hairline,
                backgroundColor: on ? theme.tealTint : theme.backgroundElement,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={spark.text}
              onPress={() => toggle(spark.id)}
              style={styles.rowMain}>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={on ? theme.tint : theme.textMuted}
              />
              <ThemedText type="displaySmall" style={styles.flex}>
                {spark.text}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${spark.text}. ${t('remove', { ns: 'common' })}`}
              onPress={() => {
                setChosen((prev) => prev.filter((x) => x !== spark.id));
                update(removeSpark(run, spark.id));
              }}
              hitSlop={8}>
              <Ionicons name="trash-outline" size={17} color={theme.textMuted} />
            </Pressable>
          </View>
        );
      })}

      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {t('passionMap.review.chosen', { count: chosen.length })}
      </ThemedText>
      {chosen.length > 0 && chosen.length < 4 ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {t('passionMap.review.earlyClues')}
        </ThemedText>
      ) : null}

      <Cta
        label={t('passionMap.review.continue')}
        disabled={chosen.length === 0}
        onPress={() => {
          update(narrow(run, chosen));
          onDone();
        }}
      />
    </>
  );
}

/** The optional Why pass. "Optional" is beside the input, never buried in secondary copy (§6.4). */
function Why({
  run,
  update,
  onDone,
}: {
  run: PassionMapState;
  update: (s: PassionMapState) => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');

  const chosen = run.chosen
    .map((id) => run.sparks.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  const spark = chosen[index];

  useEffect(() => {
    if (!spark) onDone();
  }, [spark, onDone]);
  if (!spark) return null;

  const next = (save: boolean) => {
    if (save && draft.trim()) update(setWhy(run, spark.id, draft));
    setDraft('');
    setIndex((i) => i + 1);
  };

  return (
    <>
      <Title>{spark.text}</Title>
      <Body>{t('passionMap.why.title')}</Body>
      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {t('passionMap.why.optional')}
      </ThemedText>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t('passionMap.why.placeholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t('passionMap.why.title')}
        multiline
        maxLength={WHY_MAX_CHARS}
        style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.hairline }]}
      />
      <Cta label={t('passionMap.why.continue')} onPress={() => next(true)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('passionMap.why.skip')}
        onPress={() => next(false)}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('passionMap.why.skip')}
        </ThemedText>
      </Pressable>
    </>
  );
}

/**
 * The arrangement. Drag is not the only way in (§12 accessibility): every Spark has a Move to…
 * control, which is also simply easier than dragging on a phone.
 */
function Arrange({
  run,
  update,
  onSave,
}: {
  run: PassionMapState;
  update: (s: PassionMapState) => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');

  const sparkText = (id: string) => run.sparks.find((s) => s.id === id)?.text ?? '';
  const grouped = new Set(run.themes.flatMap((th) => th.sparkIds));
  const loose = run.chosen.filter((id) => !grouped.has(id));

  return (
    <>
      <Title>{t('passionMap.arrange.title')}</Title>
      <Body>{t('passionMap.arrange.body')}</Body>

      {run.themes.map((theme_) => (
        <View
          key={theme_.id}
          style={[styles.group, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
          {renaming === theme_.id ? (
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              accessibilityLabel={t('passionMap.arrange.rename')}
              onSubmitEditing={() => {
                update(renameTheme(run, theme_.id, name));
                setRenaming(null);
              }}
              style={[styles.input, { color: theme.text, borderColor: theme.tint }]}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${theme_.title}. ${t('passionMap.arrange.rename')}`}
              onPress={() => {
                setRenaming(theme_.id);
                setName(theme_.suggested ? '' : theme_.title);
              }}
              style={styles.groupHead}>
              <ThemedText type="displaySmall">{theme_.title}</ThemedText>
              {theme_.suggested ? (
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {t('passionMap.arrange.suggested')}
                </ThemedText>
              ) : null}
              <Ionicons name="pencil-outline" size={15} color={theme.textMuted} />
            </Pressable>
          )}

          <View style={styles.chips}>
            {theme_.sparkIds.map((id) => (
              <View key={id} style={[styles.chip, { borderColor: theme.hairline }]}>
                <ThemedText type="small">{sparkText(id)}</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${sparkText(id)}. ${t('passionMap.arrange.ungrouped')}`}
                  onPress={() => update(moveSpark(run, id, null))}
                  hitSlop={8}>
                  <Ionicons name="close" size={13} color={theme.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ))}

      {loose.length > 0 ? (
        <>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t('passionMap.arrange.ungrouped')}
          </ThemedText>
          {loose.map((id) => (
            <View key={id} style={[styles.row, { borderColor: theme.hairline }]}>
              <ThemedText type="small" style={styles.flex}>
                {sparkText(id)}
              </ThemedText>
              {run.themes.map((th) => (
                <Pressable
                  key={th.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${sparkText(id)} → ${th.title}`}
                  onPress={() => update(moveSpark(run, id, th.id))}
                  hitSlop={6}
                  style={({ pressed }) => [styles.moveTo, { borderColor: theme.tint }, pressed && styles.pressed]}>
                  <ThemedText type="small" style={{ color: theme.tint }}>
                    {th.title}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </>
      ) : null}

      <Cta label={t('passionMap.arrange.save')} onPress={onSave} />
    </>
  );
}

/** Where a returning person lands: the map, and the three things they can do from it (§4.2). */
function MapSummary({
  map,
  onAddSignal,
  onStartOver,
}: {
  map: PassionMapState;
  onAddSignal: () => void;
  onStartOver: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const evidence = evidenceCount(map);
  // The result is what the RUN produced, not a live recomputation: the map must not drift underneath
  // somebody between two openings of the same screen.
  const result = map.result;
  const early = result?.earlyClues ?? isEarlyClues(map);

  return (
    <>
      <Title>{early ? t('passionMap.result.earlyTitle') : t('passionMap.result.title')}</Title>
      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {evidence.moments > 0
          ? t('passionMap.result.basedOn', evidence)
          : t('passionMap.result.firstRun')}
      </ThemedText>

      {map.themes.map((theme_) => (
        <View
          key={theme_.id}
          style={[styles.group, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="displaySmall">{theme_.title}</ThemedText>
          <View style={styles.chips}>
            {theme_.sparkIds.map((id) => (
              <View key={id} style={[styles.chip, { borderColor: theme.hairline }]}>
                <ThemedText type="small">
                  {map.sparks.find((s) => s.id === id)?.text ?? ''}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* What the days before this run said — part of the RESULT, not a proposal awaiting approval. */}
      {(result?.refinements ?? []).map((p) => (
        <View
          key={`${p.kind}-${p.subject}`}
          style={[styles.group, { borderColor: theme.tint, backgroundColor: theme.tealWash }]}>
          <ThemedText type="small" style={{ color: theme.text, lineHeight: 21 }}>
            {t(`passionMap.proposal.${p.kind}`, { subject: p.subject, days: p.days })}
          </ThemedText>
        </View>
      ))}

      {/* And what the days SINCE it are saying, which is material for the next run rather than a
          change being offered now. */}
      {evidence.moments === 0 ? (
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('passionMap.result.noInsightYet')}
        </ThemedText>
      ) : (
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('passionMap.result.feedsNextRun', { count: evidence.moments })}
        </ThemedText>
      )}

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t('passionMap.result.clues')}
      </ThemedText>

      <Cta label={t('passionMap.result.addSignal')} onPress={onAddSignal} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('passionMap.result.startOver')}
        onPress={onStartOver}
        style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.tint }}>
          {t('passionMap.result.startOver')}
        </ThemedText>
      </Pressable>
    </>
  );
}

/** The daily moment. Energy and Pull are asked separately, and stay separate (§7.2). */
function Signal({
  map,
  onSave,
}: {
  map: PassionMapState;
  onSave: (next: PassionMapState) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [text, setText] = useState('');
  const [energy, setEnergy] = useState<Energy>('neutral');
  const [pull, setPull] = useState<Pull>('maybe');
  const [note, setNote] = useState('');

  const today = signalsOn(map, localDay(Date.now())).length;
  const full = today >= MOMENTS_PER_DAY;
  const tooLong = visibleLength(text.trim()) > MOMENT_MAX_CHARS;

  return (
    <>
      <Title>{t('passionMap.signal.title')}</Title>
      <Body>{t('passionMap.signal.body')}</Body>

      <ThemedText type="small" style={{ color: theme.text }}>
        {t('passionMap.signal.what')}
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('passionMap.signal.placeholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t('passionMap.signal.what')}
        editable={!full}
        style={[
          styles.input,
          { color: theme.text, borderColor: tooLong ? theme.danger : theme.hairline },
        ]}
      />
      <ThemedText
        type="small"
        style={[styles.count, { color: tooLong ? theme.danger : theme.textMuted }]}>
        {`${visibleLength(text)} / ${MOMENT_MAX_CHARS}`}
      </ThemedText>

      <Choice
        label={t('passionMap.signal.energy')}
        options={(['drained', 'neutral', 'energized'] as const).map((v) => ({
          value: v,
          label: t(`passionMap.signal.${v}`),
        }))}
        value={energy}
        onChange={(v) => setEnergy(v as Energy)}
      />
      <Choice
        label={t('passionMap.signal.pull')}
        options={(['avoid', 'maybe', 'return'] as const).map((v) => ({
          value: v,
          label: t(`passionMap.signal.${v}`),
        }))}
        value={pull}
        onChange={(v) => setPull(v as Pull)}
      />

      <ThemedText type="small" style={{ color: theme.text }}>
        {`${t('passionMap.signal.note')} (${t('passionMap.signal.noteOptional')})`}
      </ThemedText>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('passionMap.signal.notePlaceholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t('passionMap.signal.note')}
        multiline
        maxLength={WHY_MAX_CHARS}
        style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.hairline }]}
      />

      {full ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {t('passionMap.signal.full')}
        </ThemedText>
      ) : null}

      <Cta
        label={t('passionMap.signal.save')}
        disabled={full || text.trim().length === 0 || tooLong}
        onPress={() =>
          onSave(addSignal(map, { text, energy, pull, note, at: Date.now() }))
        }
      />
    </>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.choiceBlock}>
      <ThemedText type="small" style={{ color: theme.text }}>
        {label}
      </ThemedText>
      <View style={styles.buttons}>
        {options.map((option) => {
          const on = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.choice,
                {
                  borderColor: on ? theme.tint : theme.hairline,
                  backgroundColor: on ? theme.tealTint : 'transparent',
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={{ color: on ? theme.tealStrong : theme.textSecondary }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
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
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  title: { fontSize: 22, lineHeight: 30 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    textAlign: isRTL() ? 'right' : 'left',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  count: { textAlign: isRTL() ? 'left' : 'right' },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  group: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  moveTo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  choiceBlock: { gap: Spacing.one, paddingTop: Spacing.three },
  buttons: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  choice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  quiet: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
