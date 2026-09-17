/**
 * Settings › Portrait (tester view) — TEMPORARY. REMOVE BEFORE REAL USERS.
 *
 * What the introduction conversation built into the Portrait, shown EXACTLY as it is stored, so the
 * founder can judge whether the introduction builds a good one (2026-09-17). D111 keeps the Portrait
 * out of the UI; this screen is the founder-approved, temporary exception, reachable only once the
 * hidden tester tools are on (`state/TesterTools.ts`, which also says how to remove all of it).
 *
 * Deliberately NOT a design: field names as they are in code, in the order of `PORTRAIT_FIELDS`, then
 * `value`, `confidence`, `source` and `updatedAt`. Labels follow the app language; the stored values
 * are shown as stored, with an enum's meaning from the taxonomy table underneath in small text.
 *
 * No clipboard package is installed and none is added for a tool that is going away, so the raw
 * object is shown as selectable monospace text instead of a "Copy as JSON" button.
 *
 * Personal Details (`ProfileProvider`) are a different thing and are not shown here.
 *
 * Presentational only: reads `core.getPortrait()` and re-renders on every core change via `snapshot`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { PORTRAIT_FIELDS, type Held, type Portrait, type PortraitFieldSpec } from '@/core/coach/portrait';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';
import { useTesterTools } from '@/state/TesterTools';

/** What an empty field, an empty value or a missing marker shows. */
const EMPTY = '—';

/** Code and stored values read left-to-right whatever the app language is. */
const LTR = { writingDirection: 'ltr', textAlign: 'left' } as const;

export default function PortraitTesterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('settings');
  const { core, snapshot } = useApp();
  const tester = useTesterTools();

  // `snapshot` is read so the screen re-renders whenever the core changes, the Portrait included.
  void snapshot;
  const portrait = core.getPortrait();
  const handoffUsedAt = core.getPortraitHandoffUsedAt();

  const when = (ms: number | undefined) =>
    typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toLocaleString(i18n.language) : EMPTY;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('testerTools.portraitTitle')}</ThemedText>
        </View>

        {/* A deep link must not get round the unlock: with the tools off, nothing of the Portrait
            is rendered at all. */}
        {!tester.loaded ? null : !tester.enabled ? (
          <View style={styles.content}>
            <ThemedText type="default" themeColor="textSecondary">
              {t('testerTools.lockedBody')}
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('testerTools.exists')}
              </ThemedText>
              <ThemedText type="smallBold" testID="portrait-exists">
                {portrait ? t('testerTools.yes') : t('testerTools.no')}
              </ThemedText>
              <ThemedText type="code" style={[LTR, styles.gapTop]}>
                portraitHandoffUsedAt
              </ThemedText>
              <ThemedText type="small" testID="portrait-handoff">
                {when(handoffUsedAt)}
              </ThemedText>
            </View>

            {PORTRAIT_FIELDS.map((spec) => (
              <FieldBlock key={spec.id} spec={spec} held={portrait?.[spec.id]} when={when} />
            ))}

            <View style={styles.gapTop}>
              <ThemedText type="smallBold">{t('testerTools.json')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('testerTools.jsonHint')}
              </ThemedText>
            </View>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="code" selectable style={LTR} testID="portrait-json">
                {JSON.stringify(portrait ?? null, null, 2)}
              </ThemedText>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** One field of the Portrait: its code name, then the four stored parts, or "—" when it is absent. */
function FieldBlock({
  spec,
  held,
  when,
}: {
  spec: PortraitFieldSpec;
  held: Portrait[keyof Portrait] | undefined;
  when: (ms: number | undefined) => string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={`portrait-field-${spec.id}`}
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <ThemedText type="smallBold" style={LTR}>
        {spec.id}
      </ThemedText>
      {held ? (
        <>
          <Part name="value">
            <ValueLines spec={spec} held={held} />
          </Part>
          <Part name="confidence">
            <ThemedText type="small" style={LTR}>
              {held.confidence || EMPTY}
            </ThemedText>
          </Part>
          <Part name="source">
            <ThemedText type="small" style={LTR}>
              {held.source || EMPTY}
            </ThemedText>
          </Part>
          <Part name="updatedAt">
            <ThemedText type="small">{when(held.updatedAt)}</ThemedText>
          </Part>
        </>
      ) : (
        <ThemedText type="small" themeColor="textMuted">
          {EMPTY}
        </ThemedText>
      )}
    </View>
  );
}

/** A labelled part of a field, the label being the stored property name. */
function Part({ name, children }: { name: string; children: ReactNode }) {
  return (
    <View style={styles.part}>
      <ThemedText type="code" themeColor="textSecondary" style={LTR}>
        {name}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * The stored value. A list is one bullet line per item; an enum also shows what it means, from the
 * taxonomy table the reader chose it from. Anything that is not the expected shape is shown as it is,
 * because a tester view that tidies a malformed value hides exactly what it exists to show.
 */
function ValueLines({ spec, held }: { spec: PortraitFieldSpec; held: Held<string> | Held<string[]> }) {
  const value: unknown = held.value;
  if (Array.isArray(value)) {
    if (value.length === 0) return <ThemedText type="small">{EMPTY}</ThemedText>;
    return (
      <>
        {value.map((item, i) => (
          <ThemedText key={`${i}-${String(item)}`} type="small">
            {`• ${String(item)}`}
          </ThemedText>
        ))}
      </>
    );
  }
  if (typeof value !== 'string') {
    return (
      <ThemedText type="small" style={LTR}>
        {value === undefined || value === null ? EMPTY : JSON.stringify(value)}
      </ThemedText>
    );
  }
  if (value === '') return <ThemedText type="small">{EMPTY}</ThemedText>;
  const meaning = spec.kind === 'enum' ? spec.values?.[value] : undefined;
  return (
    <>
      {/* An enum is a code token; free text is the person's own words, in whatever direction they read. */}
      <ThemedText type="small" style={spec.kind === 'enum' ? LTR : undefined}>
        {value}
      </ThemedText>
      {meaning ? (
        <ThemedText type="small" themeColor="textMuted" style={[LTR, styles.meaning]}>
          {meaning}
        </ThemedText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1, gap: Spacing.one },
  part: { gap: Spacing.half, marginTop: Spacing.one },
  meaning: { fontSize: 11 },
  gapTop: { marginTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
