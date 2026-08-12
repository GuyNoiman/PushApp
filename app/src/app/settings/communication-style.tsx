/**
 * Communication Style (Settings › App › Communication Style, PRD §3/§8) — view the current unified
 * communication style and retake the questionnaire, or reset to the Warm default. The preference lives
 * in the ONE profile blob ({@link '@/state/ProfileProvider'}); the questionnaire is a separate route.
 *
 * Presentational only (Engineering Bible §19): it reads the preference and routes; no scoring here.
 * Style names appear here (PRD §8: allowed on the settings/result page) but are never framed as a
 * diagnosis or permanent identity.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DEFAULT_COMMUNICATION_PROFILE } from '@/core/communication/communicationProfile';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useProfile } from '@/state/ProfileProvider';

export default function CommunicationStyleSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('communication');
  const { profile, setCommunicationProfile } = useProfile();
  const current = profile.communicationProfile;

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
          <ThemedText type="title">{t('settings.title')}</ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.intro')}
          </ThemedText>

          {/* Current style — a plain preview, never a diagnosis (PRD §8). */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.currentLabel')}
            </ThemedText>
            <ThemedText type="subtitle">{t(`styleNames.${current}`)}</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {t(`styleDescriptions.${current}`)}
            </ThemedText>
          </View>

          {/* Actions — retake, and reset to the Warm default when the user is off it. */}
          <View style={[styles.card, styles.actions, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <SettingsRow
              icon="chatbubbles-outline"
              label={t('settings.retake')}
              onPress={() => router.push('/settings/communication-style-quiz?restart=1' as Href)}
            />
            {current !== DEFAULT_COMMUNICATION_PROFILE ? (
              <>
                <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                <SettingsRow
                  icon="refresh-outline"
                  label={t('settings.useDefault')}
                  onPress={() => setCommunicationProfile(DEFAULT_COMMUNICATION_PROFILE)}
                />
              </>
            ) : null}
          </View>
        </View>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: { padding: 0, gap: 0, overflow: 'hidden' },
  divider: { height: 1, marginLeft: Spacing.three },
  pressed: { opacity: 0.6 },
});
