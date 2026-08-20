/**
 * Values Clarification — the second tool, and the first one you SORT rather than score.
 *
 * THE FLOW IS THE FOUNDER'S: sort → reduce → rank → presence → result. Nobody can rank sixty things
 * and nobody honestly ranks twenty, so the tool never asks a question the mind cannot answer — it
 * narrows by repeated easy decisions until the hard one is small enough to make. All of that
 * reasoning, and the ladder itself, is in {@link ../../core/tools/values/flow}; this screen renders
 * whichever stage the state is in and owns no logic of its own.
 *
 * THE GESTURES, corrected by the founder against his own design: **right = very important,
 * left = not for me now, down = in between.** They are defined in the model (`BUCKET_GESTURE`), not
 * here, because a direction is a meaning and a screen that owns it is a screen that can quietly
 * change it. The three BUTTONS do the same three things and are the primary path — a swipe is a
 * delight, and a tool whose only input is a gesture is a tool some people cannot use.
 *
 * TWO PASSES, offered up front (founder): a five-minute quick mapping over fifteen cards, and the
 * full sixty-five-card clarification. The quick one is presented AS a quick mapping, honestly, and
 * the result offers to go deeper without starting again.
 *
 * PRIVACY (G1): on-device only, and the result screen says so.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableValueCard } from '@/components/tools/SwipeableValueCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { CUSTOM_VALUE_KEY } from '@/core/tools/values/catalog';
import {
  addCustom,
  candidates,
  defineTargets,
  defineValue,
  deck,
  nextCard,
  presenceTargets,
  rank,
  readValues,
  reduceTo,
  setPresence,
  sortCard,
  stageOf,
  startValues,
  targetCount,
  undoSort,
  type Bucket,
  type ValueDefinition,
  type ValuesDepth,
  type ValuesState,
} from '@/core/tools/values/flow';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useValues } from '@/state/ValuesStore';

const BUCKETS: readonly Bucket[] = ['core', 'maybe', 'notNow'];
const BUCKET_ICON: Record<Bucket, keyof typeof Ionicons.glyphMap> = {
  core: 'star',
  maybe: 'ellipse-outline',
  notNow: 'close-circle-outline',
};

export default function ValuesScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useValues();

  const state = store.state;
  const stage = state ? stageOf(state) : null;

  const label = useCallback(
    (key: string) =>
      key === CUSTOM_VALUE_KEY ? (state?.custom?.name ?? '') : t(`values.names.${key}`),
    [t, state?.custom?.name],
  );
  const meaning = useCallback(
    (key: string) =>
      key === CUSTOM_VALUE_KEY
        ? (state?.custom?.meaning ?? '')
        : t(`values.descriptions.${key}`),
    [t, state?.custom?.meaning],
  );

  const begin = (depth: ValuesDepth) =>
    // The seed fixes this run's deck. Read once, here, so leaving and returning meets the same one.
    store.save(startValues(depth, Math.floor(Date.now() % 2_147_483_647)));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={t('values.title')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tools'))}
          right={
            state && stage !== 'done' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('lifeWheel.saveExit')}
                onPress={() => router.replace('/(tabs)/tools')}>
                <ThemedText type="small" style={{ color: theme.tint }}>
                  {t('lifeWheel.saveExit')}
                </ThemedText>
              </Pressable>
            ) : null
          }
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!store.ready ? null : !state ? (
            <Intro onPick={begin} />
          ) : stage === 'sort' ? (
            <Sort state={state} save={store.save} label={label} meaning={meaning} />
          ) : stage === 'reduce' ? (
            <Reduce state={state} save={store.save} label={label} meaning={meaning} />
          ) : stage === 'rank' ? (
            <Rank state={state} save={store.save} label={label} />
          ) : stage === 'presence' ? (
            <Presence state={state} save={store.save} label={label} />
          ) : stage === 'define' ? (
            <Define state={state} save={store.save} label={label} />
          ) : (
            <Result state={state} label={label} onRestart={store.clear} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  return (
    <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={onBack}
        hitSlop={8}
        style={styles.iconButton}>
        <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
      </Pressable>
      <ThemedText type="smallBold" style={styles.headerTitle}>
        {title}
      </ThemedText>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** Both passes, offered honestly: the quick one says what it costs in precision. */
function Intro({ onPick }: { onPick: (depth: ValuesDepth) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.intro.lead')}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t('values.intro.body')}
      </ThemedText>
      {(['quick', 'deep'] as const).map((depth) => (
        <Pressable
          key={depth}
          accessibilityRole="button"
          accessibilityLabel={t(`values.intro.${depth}`)}
          onPress={() => onPick(depth)}
          style={({ pressed }) => [
            styles.optionCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="displaySmall">{t(`values.intro.${depth}`)}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t(`values.intro.${depth}Meta`)}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {t(depth === 'quick' ? 'values.intro.quickNote' : 'values.intro.deepNote')}
          </ThemedText>
        </Pressable>
      ))}
    </>
  );
}

/** One card at a time, three ways out of it, and an undo because a swipe is easy to misfire. */
function Sort({
  state,
  save,
  label,
  meaning,
}: {
  state: ValuesState;
  save: (s: ValuesState) => void;
  label: (key: string) => string;
  meaning: (key: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [adding, setAdding] = useState(false);
  const [ownName, setOwnName] = useState('');
  const [ownMeaning, setOwnMeaning] = useState('');

  const card = nextCard(state);
  const cards = deck(state);
  const sorted = Object.keys(state.buckets).length;
  const last = cards.filter((c) => state.buckets[c.key] !== undefined).slice(-1)[0];

  if (!card) return null;

  return (
    <>
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.tint, width: `${(sorted / cards.length) * 100}%` },
            ]}
          />
        </View>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {`${sorted + 1} / ${cards.length}`}
        </ThemedText>
      </View>

      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.sort.title')}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t('values.sort.subtitle')}
      </ThemedText>

      <SwipeableValueCard
        cardKey={card.key}
        onSort={(bucket) => save(sortCard(state, card.key, bucket))}
        style={{
          ...styles.valueCard,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.hairline,
        }}>
        <View style={[styles.glyph, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="compass-outline" size={18} color={theme.tealStrong} />
        </View>
        <ThemedText
          style={[
            styles.valueName,
            { fontFamily: displayFont(), color: theme.text, fontSize: Math.round(28 * displayScale()) },
          ]}>
          {label(card.key)}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {meaning(card.key)}
        </ThemedText>
      </SwipeableValueCard>

      {/* The gestures, named in words. A swipe nobody can discover is a swipe nobody uses. */}
      <View style={styles.swipeHint}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {`← ${t('values.sort.swipeNotNow')}  ·  ↓ ${t('values.sort.swipeMaybe')}  ·  ${t('values.sort.swipeCore')} →`}
        </ThemedText>
      </View>

      <View style={styles.bucketRow}>
        {BUCKETS.map((bucket) => (
          <Pressable
            key={bucket}
            accessibilityRole="button"
            accessibilityLabel={`${label(card.key)}: ${t(`values.sort.${bucket}`)}`}
            onPress={() => save(sortCard(state, card.key, bucket))}
            style={({ pressed }) => [
              styles.bucketButton,
              {
                borderColor: bucket === 'core' ? theme.tint : theme.hairline,
                backgroundColor: bucket === 'core' ? theme.tealTint : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={BUCKET_ICON[bucket]}
              size={20}
              color={bucket === 'core' ? theme.tealStrong : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{ color: bucket === 'core' ? theme.tealStrong : theme.textSecondary }}>
              {t(`values.sort.${bucket}`)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.footRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !last }}
          accessibilityLabel={t('values.sort.undo')}
          disabled={!last}
          onPress={() => last && save(undoSort(state, last.key))}
          style={({ pressed }) => [styles.inlineButton, (pressed || !last) && styles.pressed]}>
          <Ionicons name="arrow-undo-outline" size={16} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.tint }}>
            {t('values.sort.undo')}
          </ThemedText>
        </Pressable>

        {!state.custom ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('values.sort.addOwn')}
            onPress={() => setAdding(true)}
            style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.tint }}>
              {t('values.sort.addOwn')}
            </ThemedText>
            <Ionicons name="add-circle-outline" size={16} color={theme.tint} />
          </Pressable>
        ) : null}
      </View>

      {adding ? (
        <View
          style={[
            styles.ownBox,
            { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
          ]}>
          <TextInput
            value={ownName}
            onChangeText={setOwnName}
            placeholder={t('values.sort.ownName')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t('values.sort.ownName')}
            style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
          />
          <TextInput
            value={ownMeaning}
            onChangeText={setOwnMeaning}
            placeholder={t('values.sort.ownMeaning')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t('values.sort.ownMeaning')}
            style={[styles.input, { color: theme.text, borderColor: theme.hairline }]}
          />
          <View style={styles.footRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('values.sort.ownCancel')}
              onPress={() => setAdding(false)}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {t('values.sort.ownCancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: ownName.trim().length === 0 }}
              accessibilityLabel={t('values.sort.ownAdd')}
              disabled={ownName.trim().length === 0}
              onPress={() => {
                save(addCustom(state, { name: ownName, meaning: ownMeaning }));
                setAdding(false);
              }}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {t('values.sort.ownAdd')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ThemedText type="small" style={[styles.centered, { color: theme.textMuted }]}>
        {t('values.sort.reviewable')}
      </ThemedText>
    </>
  );
}

/** Narrow to the rung's target. Nothing advances until exactly that many are chosen. */
function Reduce({
  state,
  save,
  label,
  meaning,
}: {
  state: ValuesState;
  save: (s: ValuesState) => void;
  label: (key: string) => string;
  meaning: (key: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const target = targetCount(state) ?? 0;
  const pool = useMemo(() => candidates(state), [state]);
  const [chosen, setChosen] = useState<string[]>([]);

  // A person who ends the sort with fewer than the target already has their answer.
  useEffect(() => {
    if (pool.length <= target) save(reduceTo(state, pool));
  }, [pool, target, state, save]);

  const toggle = (key: string) =>
    setChosen((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < target ? [...prev, key] : prev,
    );

  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.reduce.title', { count: target })}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {t('values.reduce.chosen', { chosen: chosen.length, count: target })}
      </ThemedText>

      {pool.map((key) => {
        const on = chosen.includes(key);
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label(key)}
            onPress={() => toggle(key)}
            style={({ pressed }) => [
              styles.pickRow,
              {
                borderColor: on ? theme.tint : theme.hairline,
                backgroundColor: on ? theme.tealTint : theme.backgroundElement,
              },
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={on ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={on ? theme.tint : theme.textMuted}
            />
            <View style={styles.pickText}>
              <ThemedText type="displaySmall">{label(key)}</ThemedText>
              <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary }}>
                {meaning(key)}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}

      <Cta
        label={t('values.reduce.continue')}
        disabled={chosen.length !== target}
        onPress={() => save(reduceTo(state, chosen))}
      />
    </>
  );
}

/** Order the five. "Now" is in the copy on purpose — values reorder with a season. */
function Rank({
  state,
  save,
  label,
}: {
  state: ValuesState;
  save: (s: ValuesState) => void;
  label: (key: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const [order, setOrder] = useState<string[]>(() => candidates(state));

  const move = (index: number, delta: number) => {
    const next = [...order];
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setOrder(next);
  };

  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.rank.title')}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t('values.rank.subtitle')}
      </ThemedText>

      {order.map((key, index) => (
        <View
          key={key}
          style={[
            styles.pickRow,
            { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
          ]}>
          <View style={[styles.rankBadge, { backgroundColor: theme.tealTint }]}>
            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText type="displaySmall" style={styles.pickText}>
            {label(key)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label(key)}: ${t('values.rank.up')}`}
            disabled={index === 0}
            onPress={() => move(index, -1)}
            hitSlop={8}
            style={({ pressed }) => [(pressed || index === 0) && styles.pressed]}>
            <Ionicons name="chevron-up" size={20} color={theme.tint} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label(key)}: ${t('values.rank.down')}`}
            disabled={index === order.length - 1}
            onPress={() => move(index, 1)}
            hitSlop={8}
            style={({ pressed }) => [
              (pressed || index === order.length - 1) && styles.pressed,
            ]}>
            <Ionicons name="chevron-down" size={20} color={theme.tint} />
          </Pressable>
        </View>
      ))}

      <Cta label={t('values.rank.continue')} onPress={() => save(rank(state, order))} />
    </>
  );
}

/** The step that turns a list into a finding: how present is this, today, for the top three. */
function Presence({
  state,
  save,
  label,
}: {
  state: ValuesState;
  save: (s: ValuesState) => void;
  label: (key: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const key = presenceTargets(state).find((k) => state.presence[k] === undefined);
  const [score, setScore] = useState(5);
  if (!key) return null;

  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.presence.title', { value: label(key) })}
      </ThemedText>

      <View style={styles.scaleRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: score === n }}
            accessibilityLabel={String(n)}
            onPress={() => setScore(n)}
            style={[
              styles.scaleDot,
              {
                borderColor: score === n ? theme.tint : theme.hairline,
                backgroundColor: score === n ? theme.tint : 'transparent',
              },
            ]}>
            <ThemedText
              type="small"
              style={{ color: score === n ? theme.backgroundElement : theme.textSecondary }}>
              {n}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <View style={styles.ends}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('values.presence.low')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('values.presence.high')}
        </ThemedText>
      </View>

      <Cta
        label={t('values.presence.continue')}
        onPress={() => {
          save(setPresence(state, key, score));
          setScore(5);
        }}
      />
    </>
  );
}

/**
 * The founder's five questions, one value at a time, deep pass only.
 *
 * EVERY FIELD IS OPTIONAL and "skip" is a real button. Twenty free-text boxes at the end of a
 * twenty-minute sort is a wall, and a wall at the end is where people stop — so the tool asks, and
 * silence is an answer.
 */
function Define({
  state,
  save,
  label,
}: {
  state: ValuesState;
  save: (s: ValuesState) => void;
  label: (key: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const key = defineTargets(state).find((k) => state.definitions?.[k] === undefined);
  const [draft, setDraft] = useState<ValueDefinition>({});
  if (!key) return null;

  const field = (name: keyof ValueDefinition) => (
    <View key={name} style={styles.fieldBlock}>
      <ThemedText type="small" style={{ color: theme.text }}>
        {t(`values.define.${name}`, { value: label(key) })}
      </ThemedText>
      <TextInput
        value={draft[name] ?? ''}
        onChangeText={(text) => setDraft((prev) => ({ ...prev, [name]: text }))}
        placeholder={t('values.define.placeholder')}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t(`values.define.${name}`, { value: label(key) })}
        multiline
        style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.hairline }]}
      />
    </View>
  );

  const finish = (definition: ValueDefinition) => {
    save(defineValue(state, key, definition));
    setDraft({});
  };

  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {label(key)}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t('values.define.lead')}
      </ThemedText>

      {(['meaning', 'livedLike', 'absentLike', 'step'] as const).map(field)}

      <Cta label={t('values.define.continue')} onPress={() => finish(draft)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('values.define.skip')}
        onPress={() => finish({})}
        style={({ pressed }) => [styles.centeredButton, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t('values.define.skip')}
        </ThemedText>
      </Pressable>
    </>
  );
}

function Result({
  state,
  label,
  onRestart,
}: {
  state: ValuesState;
  label: (key: string) => string;
  onRestart: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const result = readValues(state);
  if (!result) return null;

  return (
    <>
      <ThemedText style={[styles.big, { fontFamily: displayFont(), color: theme.text }]}>
        {t('values.result.title')}
      </ThemedText>

      {result.values.map((entry) => (
        <View
          key={entry.key}
          style={[
            styles.pickRow,
            { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
          ]}>
          <View style={[styles.rankBadge, { backgroundColor: theme.tealTint }]}>
            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
              {entry.position}
            </ThemedText>
          </View>
          <ThemedText type="displaySmall" style={styles.pickText}>
            {label(entry.key)}
          </ThemedText>
          {entry.presence !== undefined ? (
            <ThemedText type="small" style={{ color: theme.textMuted }}>
              {`${entry.presence} / 10`}
            </ThemedText>
          ) : null}
        </View>
      ))}

      <ThemedText type="small" style={{ color: theme.text, lineHeight: 21 }}>
        {result.widestGap
          ? t('values.result.gap', { value: label(result.widestGap.key) })
          : t('values.result.noGap')}
      </ThemedText>

      {result.steps.length > 0 ? (
        <>
          <ThemedText type="displaySmall" style={{ paddingTop: Spacing.three }}>
            {t('values.result.yourSteps')}
          </ThemedText>
          {result.steps.map((entry) => (
            <ThemedText key={entry.key} type="small" style={{ color: theme.text, lineHeight: 21 }}>
              {`${label(entry.key)} — ${entry.step}`}
            </ThemedText>
          ))}
        </>
      ) : null}

      {state.depth === 'quick' ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {t('values.result.deepen')}
        </ThemedText>
      ) : null}

      <Cta label={t('values.result.done')} onPress={() => router.replace('/(tabs)/tools')} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('values.result.retake')}
        onPress={onRestart}
        style={({ pressed }) => [styles.centeredButton, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.tint }}>
          {t('values.result.retake')}
        </ThemedText>
      </Pressable>

      <ThemedText type="small" style={[styles.centered, { color: theme.textMuted }]}>
        {t('values.result.private')}
      </ThemedText>
    </>
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
  headerRight: { minWidth: 36, alignItems: 'flex-end' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  big: { lineHeight: 32, fontSize: 24 },
  optionCard: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  progressTrack: { flex: 1, height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  valueCard: {
    marginTop: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    minHeight: 190,
  },
  glyph: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  valueName: { lineHeight: 36 },
  swipeHint: { alignItems: 'center', paddingTop: Spacing.two },
  fieldBlock: { gap: Spacing.one, paddingTop: Spacing.two },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  bucketRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  bucketButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    minHeight: 84,
  },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
  ownBox: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    textAlign: isRTL() ? 'right' : 'left',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pickText: { flex: 1, minWidth: 0, gap: 2 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.three },
  scaleDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  cta: {
    marginTop: Spacing.four,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  centered: { textAlign: 'center', paddingTop: Spacing.three },
  centeredButton: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
