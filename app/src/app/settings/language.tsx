/**
 * Language picker (Settings › Language) — a searchable, alphabetical list of
 * every language PushApp ships. A search box filters case-insensitively over both
 * the endonym (the language's own name) and its English name, so it's findable in
 * either language. The list is sorted by English name via `localeCompare`; the
 * current language shows a checkmark. Tapping applies the choice through
 * LanguagePreference, and if that flips text direction the RestartPrompt appears.
 *
 * Presentational + a little local search state (Engineering Bible §19): the one
 * durable choice lives in LanguagePreference; i18n side-effects live in `@/i18n`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RestartPrompt } from '@/components/settings/RestartPrompt';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { isRTL } from '@/i18n/rtl';
import { useLanguagePreference } from '@/state/LanguagePreference';

export default function LanguagePickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('settings');
  const { language, setLanguage, pendingRestart } = useLanguagePreference();
  const [query, setQuery] = useState('');

  // Alphabetical by English name, then filtered case-insensitively over both
  // names so a user can search in whichever language they think in.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...LANGUAGES]
      .sort((a, b) => a.englishName.localeCompare(b.englishName))
      .filter(
        (l) =>
          q === '' ||
          l.englishName.toLowerCase().includes(q) ||
          l.endonym.toLowerCase().includes(q),
      );
  }, [query]);

  const select = (code: LanguageCode) => setLanguage(code);

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
            <Ionicons
              name={isRTL() ? 'chevron-forward' : 'chevron-back'}
              size={24}
              color={theme.text}
            />
          </Pressable>
          <ThemedText type="title">{t('language.title')}</ThemedText>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('language.search')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <RestartPrompt visible={pendingRestart} />

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            {results.map((lang, i) => {
              const selected = lang.code === language;
              return (
                <Pressable
                  key={lang.code}
                  accessibilityRole="button"
                  accessibilityLabel={lang.englishName}
                  accessibilityState={{ selected }}
                  onPress={() => select(lang.code)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.rowMain}>
                    <ThemedText type="default" numberOfLines={1}>
                      {lang.endonym}
                    </ThemedText>
                    {lang.endonym !== lang.englishName ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {lang.englishName}
                      </ThemedText>
                    ) : null}
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={theme.teal} />
                  ) : null}
                  {i < results.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.one,
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowMain: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    position: 'absolute',
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
