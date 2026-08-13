/**
 * FinalStepConfirmSheet — the ONE gentle confirmation shown before a check-in that would COMPLETE a
 * Journey (Completion Celebration PRD §2.2; D41 makes completion final). It is deliberately calm, not
 * alarming: "By completing this step you complete the Journey. Confirm?" Confirm proceeds with the
 * check-in (which triggers the big ceremony already built); Cancel leaves the Journey fully active
 * with no side effect — no accidental irreversible completion.
 *
 * Presentational only (Engineering Bible §19): the willComplete decision + the pending action live in
 * {@link ../../hooks/useFinalStepConfirm}; this component only renders the dialog. Copy is gender-aware
 * (D31) via {@link useAddressedTranslation} from the `celebration` namespace. The centred-dialog shape
 * matches the Journey delete confirmation so the two confirmations read consistently.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';

export function FinalStepConfirmSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { t } = useAddressedTranslation('celebration');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
            CARD_SHADOW,
          ]}>
          <ThemedText type="subtitle">{t('confirmFinal.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('confirmFinal.body')}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('confirmFinal.cancel')}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('confirmFinal.cancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('confirmFinal.confirm')}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {t('confirmFinal.confirm')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Calm work-surface card depth (matches the Journey delete confirm) — subtle, not game-juice. */
const CARD_SHADOW = {
  shadowColor: '#2E2E2C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  btn: {
    flex: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
