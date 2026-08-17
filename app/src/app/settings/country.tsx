/**
 * Country picker (My Profile › Country) — a searchable, alphabetical list of every country. Mirrors
 * the Language picker: a search box filters by localized name (or code), the list is sorted by the
 * localized name, and the current country shows a checkmark. Choosing one updates the unified Profile
 * (`setCountry`), which also recomputes the week-start default unless the user has overridden it (D33).
 *
 * Presentational + local search state (Engineering Bible §19): the durable choice lives in
 * ProfileProvider; country data/lookups live in `core/profile/countries`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { COUNTRY_CODES, countryName, type CountryCode } from '@/core/profile/countries';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useProfile } from '@/state/ProfileProvider';

export default function CountryPickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('settings');
  const { profile, setCountry } = useProfile();
  const [query, setQuery] = useState('');

  // Localized names, sorted alphabetically, filtered over the name + the code.
  const results = useMemo(() => {
    const locale = i18n.language;
    const rows = COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) }));
    const q = query.trim().toLowerCase();
    return rows
      .sort((a, b) => a.name.localeCompare(b.name, locale))
      .filter((r) => q === '' || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [query, i18n.language]);

  const select = (code: CountryCode) => {
    setCountry(code);
    router.back();
  };

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
          <ThemedText type="title">{t('profile.country')}</ThemedText>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('profile.countrySearch')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign={START_TEXT_ALIGN}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        </View>

        {/* Keyboard-safe: the search field stays up while the list is tapped, and the rows below
            the keyboard stay reachable (Device QA A3). */}
        <KeyboardSafeScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            {results.map((row, i) => {
              const selected = row.code === profile.country;
              return (
                <Pressable
                  key={row.code}
                  accessibilityRole="button"
                  accessibilityLabel={row.name}
                  accessibilityState={{ selected }}
                  onPress={() => select(row.code)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <ThemedText type="default" numberOfLines={1} style={styles.rowName}>
                    {row.name}
                  </ThemedText>
                  {selected ? <Ionicons name="checkmark" size={20} color={theme.teal} /> : null}
                  {i < results.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ThemedView>
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
  backButton: { padding: Spacing.one },
  searchWrap: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 15 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowName: { flex: 1 },
  pressed: { opacity: 0.6 },
  divider: { position: 'absolute', left: Spacing.three, right: 0, bottom: 0, height: 1 },
});
