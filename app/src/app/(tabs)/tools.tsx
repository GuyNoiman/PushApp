/**
 * Tools — the fifth tab, rebuilt 2026-08-20 from the founder's own designed screen.
 *
 * WHAT IT IS FOR, in his words: *"games and questionnaires for the user"*, including the onboarding
 * questionnaire, *"so the user can redo it if they want"*. The through-line is that everything here
 * is something you DO inside the app and come out of knowing yourself a little better — the opposite
 * of Home, which is about the world outside the app and what you promised to do in it.
 *
 * ── WHAT REPLACED WHAT, and why ─────────────────────────────────────────────────────────────────
 *
 * The previous version was a hero horizon over a flat grid of eight equal tiles. It was built from a
 * children's-app reference the founder sent, and it had one honest problem: eight tiles of identical
 * size and weight, six of which do not exist, reads as a waiting room whatever is drawn on top. Four
 * alternative directions were designed and he rejected all four; this is HIS screen, and it answers
 * the problem a different way — by giving the page an ORDER of attention instead of a flat list:
 *
 *   search        → for the person who already knows what they came for
 *   recently used → the strongest signal there is about what someone will open next
 *   categories    → five rooms, so eight tools stop being a bag
 *   recommended   → at most two, LIVE only, for the person who does not know where to start
 *
 * **The six unbuilt tools never appear as equals.** They live inside their category, greyed, with
 * "Coming" on them and no tap. They are never recommended, never counted as usable and never given a
 * tile the same weight as something that works. A page that recommends something unbuildable lies.
 *
 * **The filter control from the mockup is deliberately not built.** It has no defined behaviour yet,
 * and the rule this tab was built on the first time still holds: a button that answers a tap with
 * nothing is worse than no button. It lands when there is something to filter by.
 *
 * **PRIVACY (G1).** What somebody opens here — "for a hard day", three times this week — is a picture
 * of what they are struggling with. It is stored on the device and nowhere else
 * ({@link ../../state/ToolsShelf}), never synced and never logged.
 *
 * Presentational only (Bible §19): the catalogue is {@link ../../core/tools/catalog}, the arithmetic
 * is {@link ../../core/tools/shelf}, and the stored shelf is the provider.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { displayFont, displayScale } from '@/constants/displayFont';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  TOOL_CATALOG,
  TOOL_CATEGORY_IDS,
  isLive,
  toolsInCategory,
  type ToolCategoryId,
  type ToolDefinition,
} from '@/core/tools/catalog';
import { ago, recentlyUsed, recommended, savedTools, searchTools } from '@/core/tools/shelf';
import { paletteOfRoom } from '@/core/tools/rooms';
import { useOnTabPress } from '@/hooks/use-tab-press';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useToolsShelf } from '@/state/ToolsShelf';

/** The three lenses on the same catalogue, in the order the founder's design shows them. */
type Lens = 'all' | 'recent' | 'saved';
const LENSES: readonly Lens[] = ['all', 'recent', 'saved'];

export default function ToolsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('tools');
  const shelf = useToolsShelf();

  const [lens, setLens] = useState<Lens>('all');
  const [query, setQuery] = useState('');
  /** Which category is expanded. Null ⇒ the page's own order, which is the default view. */
  const [openCategory, setOpenCategory] = useState<ToolCategoryId | null>(null);

  /**
   * Tapping the Tools tab while inside a room leaves the room (founder, 2026-08-24). The gesture
   * already means "back to the start of this tab" — it returns a long screen to its top — and being
   * inside a room is the same kind of "inside" as being scrolled down.
   */
  useOnTabPress(
    useCallback(() => {
      setOpenCategory(null);
      setQuery('');
    }, []),
  );

  const label = useCallback((tool: ToolDefinition) => t(`items.${tool.key}`), [t]);

  // Read once per render so every "how long ago" on the screen agrees with itself.
  const now = Date.now();
  const recent = useMemo(() => recentlyUsed(shelf.usage), [shelf.usage]);
  const suggested = useMemo(() => recommended(shelf.usage, now), [shelf.usage, now]);
  const saved = useMemo(() => savedTools(shelf.saved), [shelf.saved]);
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchTools(query, label), [query, label]);

  /** Open a tool and remember it. A "coming" tool has no route and never reaches here. */
  const open = useCallback(
    (tool: ToolDefinition) => {
      if (!tool.route) return;
      shelf.markUsed(tool.key);
      router.push(tool.route as Href);
    },
    [router, shelf],
  );

  /** The list a lens is showing, once search or a lens has narrowed the catalogue. */
  const listed: ToolDefinition[] | null = searching
    ? results
    : lens === 'saved'
      ? saved
      : lens === 'recent'
        ? recent
        : openCategory
          ? toolsInCategory(openCategory)
          : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="display">{t('title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('subtitle')}
            </ThemedText>
          </View>

          {/* ── Search — for the person who already knows what they came for ── */}
          <View
            style={[
              styles.search,
              { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
            ]}>
            <Ionicons name="search" size={17} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('search')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('search')}
              style={[styles.searchInput, { color: theme.text, textAlign: isRTL() ? 'right' : 'left' }]}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('clearSearch', { ns: 'common' })}
                onPress={() => setQuery('')}
                hitSlop={10}>
                <Ionicons name="close-circle" size={17} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* ── The three lenses. Hidden while searching: a search is already a lens, and two at
              once is a state nobody can predict the result of. ── */}
          {!searching ? (
            <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
              {LENSES.map((value) => {
                const active = lens === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(`tabs.${value}`)}
                    onPress={() => {
                      setLens(value);
                      setOpenCategory(null);
                    }}
                    style={[
                      styles.segment,
                      active && { backgroundColor: theme.tint },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? theme.backgroundElement : theme.textSecondary }}>
                      {t(`tabs.${value}`)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* An open category needs a way back out of it. Without one the only exit is a lens tab,
              which is not where anyone looks for "back". */}
          {openCategory && !searching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back', { ns: 'common' })}
              onPress={() => setOpenCategory(null)}
              style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}>
              <Ionicons
                name={isRTL() ? 'chevron-forward' : 'chevron-back'}
                size={18}
                color={theme.tint}
              />
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {t(`categories.${openCategory}`)}
              </ThemedText>
            </Pressable>
          ) : null}

          {listed ? (
            <ToolList
              tools={listed}
              emptyText={
                searching
                  ? t('noMatch', { query: query.trim() })
                  : lens === 'saved'
                    ? t('savedEmpty')
                    : t('recentEmpty')
              }
              onOpen={open}
              shelf={shelf}
            />
          ) : (
            <>
              {/* ── Recently used — the strongest signal about what gets opened next ── */}
              {recent.length > 0 ? (
                <>
                  <SectionTitle>{t('sections.recent')}</SectionTitle>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.rail}>
                    {recent.map((tool) => {
                      const since = ago(shelf.usage[tool.key] ?? now, now);
                      return (
                        <Pressable
                          key={tool.key}
                          accessibilityRole="button"
                          accessibilityLabel={label(tool)}
                          onPress={() => open(tool)}
                          style={({ pressed }) => [
                            styles.recentCard,
                            { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                            pressed && styles.pressed,
                          ]}>
                          <View style={[styles.glyph, { backgroundColor: theme.tealTint }]}>
                            <Ionicons
                              name={tool.icon as keyof typeof Ionicons.glyphMap}
                              size={17}
                              color={theme.tealStrong}
                            />
                          </View>
                          <ThemedText type="displaySmall" numberOfLines={2} style={styles.recentTitle}>
                            {label(tool)}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textMuted }}>
                            {since.unit === 'now'
                              ? t('ago.now')
                              : t(`ago.${since.unit}`, { count: since.value })}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {/* ── The founder's eight rooms (2026-08-23). A room is what a tool does FOR you,
                  which is what turns a list of tools into a place instead of a drawer. Each room
                  wears its own colour (`core/tools/rooms`), and the two that hold nothing yet are
                  SHOWN and labelled "coming soon" rather than hidden — his call: a room a person can
                  see is a promise about where the product is going, and an empty one that is honest
                  about being empty says more than a gap in the row. ── */}
              <SectionTitle>{t('sections.categories')}</SectionTitle>
              {/* A GRID, not a rail (founder, 2026-08-24). Eight rooms behind a horizontal drag is a
                  menu you have to work to read; the whole point of rooms is that a person sees the
                  shape of the place at a glance. Two columns, every name in full. */}
              <View style={styles.categoryGrid}>
                {TOOL_CATEGORY_IDS.map((id) => {
                  const count = toolsInCategory(id).length;
                  const empty = count === 0;
                  const palette = paletteOfRoom(id);
                  const accent = theme[palette.accent];
                  const tint = theme[palette.tint];
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: empty }}
                      disabled={empty}
                      accessibilityLabel={`${t(`categories.${id}`)}, ${
                        empty ? t('soon') : t('count', { count })
                      }`}
                      onPress={() => setOpenCategory(id)}
                      style={({ pressed }) => [
                        styles.categoryCard,
                        {
                          backgroundColor: empty ? theme.backgroundElement : tint,
                          borderColor: empty ? theme.hairline : accent,
                          opacity: empty ? 0.6 : 1,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.glyph,
                          { backgroundColor: empty ? theme.backgroundSelected : theme.background },
                        ]}>
                        <Ionicons
                          name={CATEGORY_ICON[id]}
                          size={17}
                          color={empty ? theme.textMuted : accent}
                        />
                      </View>
                      <ThemedText type="displaySmall" style={styles.categoryTitle}>
                        {t(`categories.${id}`)}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textMuted }}>
                        {empty ? t('soon') : t('count', { count })}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── At most two, LIVE only, for the person who does not know where to start ── */}
              {suggested.length > 0 ? (
                <>
                  <SectionTitle>{t('sections.recommended')}</SectionTitle>
                  <View style={styles.recommendList}>
                    {suggested.map((tool) => (
                      <Pressable
                        key={tool.key}
                        accessibilityRole="button"
                        accessibilityLabel={label(tool)}
                        onPress={() => open(tool)}
                        style={({ pressed }) => [
                          styles.recommendCard,
                          { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                          pressed && styles.pressed,
                        ]}>
                        <View style={styles.recommendText}>
                          <ThemedText type="displaySmall" numberOfLines={1}>
                            {label(tool)}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            numberOfLines={2}
                            style={{ color: theme.textSecondary }}>
                            {t(`blurbs.${tool.key}`)}
                          </ThemedText>
                          {tool.minutes ? (
                            <ThemedText type="small" style={{ color: theme.textMuted }}>
                              {t('minutes', { count: tool.minutes })}
                            </ThemedText>
                          ) : null}
                        </View>
                        <View style={[styles.playCircle, { backgroundColor: theme.tint }]}>
                          <Ionicons
                            name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                            size={17}
                            color={theme.backgroundElement}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}

        </TabScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Category glyphs. Here rather than in the catalogue: a room's icon is a screen decision. */
const CATEGORY_ICON: Record<ToolCategoryId, keyof typeof Ionicons.glyphMap> = {
  selfKnowledge: 'person-outline',
  direction: 'compass-outline',
  action: 'walk-outline',
  records: 'book-outline',
  immediate: 'heart-outline',
  patterns: 'repeat-outline',
  support: 'people-outline',
  body: 'pulse-outline',
};

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="displaySmall" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

/**
 * A narrowed list of tools, as rows. A row carries the one line that says what the tool does TO you,
 * because a name and an icon ask a person to be curious and a sentence lets them choose.
 *
 * A tool that does not exist yet renders as a row too — greyed, labelled, and not pressable. It is a
 * roadmap the user can read, never a button that answers a tap with nothing.
 */
function ToolList({
  tools,
  emptyText,
  onOpen,
  shelf,
}: {
  tools: ToolDefinition[];
  emptyText: string;
  onOpen: (tool: ToolDefinition) => void;
  shelf: ReturnType<typeof useToolsShelf>;
}) {
  const theme = useTheme();
  const { t } = useTranslation('tools');

  if (tools.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
        {emptyText}
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {tools.map((tool) => {
        const live = isLive(tool);
        const saved = shelf.isSaved(tool.key);
        const name = t(`items.${tool.key}`);
        return (
          <View
            key={tool.key}
            style={[
              styles.row,
              { borderColor: theme.hairline },
              live
                ? { backgroundColor: theme.backgroundElement }
                : { borderStyle: 'dashed' as const },
            ]}>
            {/* NO PER-TOOL ICON since 2026-08-24 (founder). A glyph per row was decoration that
                cost the width the SENTENCE needs — and the sentence is the thing that lets somebody
                choose. It is now shown in full, never truncated. */}
            <Pressable
              accessibilityRole={live ? 'button' : 'text'}
              accessibilityLabel={live ? name : `${name}. ${t('soon')}`}
              disabled={!live}
              onPress={() => onOpen(tool)}
              style={styles.rowMain}>
              <View style={styles.rowText}>
                <ThemedText
                  type="displaySmall"
                  numberOfLines={1}
                  style={{
                    color: live ? theme.text : theme.textMuted,
                    fontSize: Math.round(16 * displayScale()),
                    fontFamily: displayFont(),
                  }}>
                  {name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {live
                    ? t(`blurbs.${tool.key}`)
                    : `${t('soon')} · ${t(`blurbs.${tool.key}`)}`}
                </ThemedText>
                {tool.minutes && live ? (
                  <View style={styles.rowTime}>
                    <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                    <ThemedText type="small" style={{ color: theme.textMuted }}>
                      {t('minutes', { count: tool.minutes })}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </Pressable>

            {/* An OVERFLOW, not a bookmark. Saving is one thing a person might want to do with a
                tool and sharing is another; a single-purpose button had no room to grow (founder,
                2026-08-24). The menu holds what exists today and is where the rest will land. */}
            {live ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('more')}: ${name}`}
                onPress={() =>
                  Alert.alert(name, undefined, [
                    {
                      text: saved ? t('unsave') : t('save'),
                      onPress: () => shelf.toggleSaved(tool.key),
                    },
                    { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                  ])
                }
                hitSlop={10}
                style={styles.saveButton}>
                <Ionicons
                  name={saved ? 'bookmark' : 'ellipsis-horizontal'}
                  size={17}
                  color={saved ? theme.tint : theme.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// Every live tool must have a blurb, and every blurb a tool. Asserted by the screen's test rather
// than at runtime, so a missing sentence fails in CI instead of rendering an i18n key to a user.
export const TOOL_KEYS = TOOL_CATALOG.map((tool) => tool.key);

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  content: { paddingBottom: BottomTabInset + Spacing.six },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: 2,
  },
  search: {
    marginHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  segmented: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  rail: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  recentCard: {
    width: 150,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  recentTitle: { minHeight: 40 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  categoryCard: {
    // Two per row, whatever the screen width. `48%` rather than a pixel width so a long room name
    // has room to wrap instead of being cut.
    width: '48%',
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  categoryTitle: {},
  glyph: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendList: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recommendText: { flex: 1, gap: 2 },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingEnd: Spacing.two,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTime: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: 2 },
  saveButton: { padding: Spacing.two },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  empty: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  pressed: { opacity: 0.7 },
});
