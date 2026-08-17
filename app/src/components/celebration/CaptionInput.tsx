/**
 * CaptionInput (Completion Celebration, I1) — a TRANSIENT personal-caption field for the share
 * ceremony. The text is passed to the share destination but is NEVER persisted on the card or in
 * PushApp history (PRD §3, §6): it lives only in the parent's local state for this one session.
 *
 * Presentational only (Engineering Bible §19): a controlled input driven by props. RTL-aware
 * alignment and theme tokens.
 */
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

/** A short cap so the transient caption stays a caption (and can't grow into stored-looking content). */
const MAX_CAPTION = 200;

export function CaptionInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('celebration');

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('ceremony.captionLabel')}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={(next) => onChange(next.slice(0, MAX_CAPTION))}
        placeholder={t('ceremony.captionPlaceholder')}
        placeholderTextColor={theme.textMuted}
        multiline
        maxLength={MAX_CAPTION}
        accessibilityLabel={t('ceremony.captionLabel')}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.hairline,
            color: theme.text,
            textAlign: START_TEXT_ALIGN,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 64,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
