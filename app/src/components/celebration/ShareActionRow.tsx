/**
 * ShareActionRow (Completion Celebration, I1) — the share / save action buttons for the ceremony
 * (PRD §4). "Share completion" is always offered (it degrades to text share when image export is
 * unavailable — web / Expo Go); "Save image" appears only when the platform can render the card to
 * an image (`imageAvailable`).
 *
 * Presentational only (Engineering Bible §19): it renders buttons and calls the handlers the parent
 * passes; the parent owns the gateway call, the privacy preview, and the calm outcome handling.
 * `busy` disables the row while a share is in flight so a double-tap can't fire two sheets.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function ShareActionRow({
  imageAvailable,
  busy,
  onShare,
  onSave,
}: {
  imageAvailable: boolean;
  busy: boolean;
  onShare: () => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('celebration');
  const rtl = isRTL();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ceremony.share')}
        onPress={onShare}
        disabled={busy}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: theme.tint },
          (pressed || busy) && styles.pressed,
        ]}>
        <View style={[styles.inner, rtl && styles.innerRTL]}>
          <Ionicons name="share-outline" size={18} color={theme.background} />
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {t('ceremony.share')}
          </ThemedText>
        </View>
      </Pressable>

      {imageAvailable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ceremony.saveImage')}
          onPress={onSave}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: theme.hairline },
            (pressed || busy) && styles.pressed,
          ]}>
          <View style={[styles.inner, rtl && styles.innerRTL]}>
            <Ionicons name="download-outline" size={18} color={theme.text} />
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('ceremony.saveImage')}
            </ThemedText>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  primary: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  innerRTL: {
    flexDirection: 'row-reverse',
  },
  pressed: {
    opacity: 0.7,
  },
});
