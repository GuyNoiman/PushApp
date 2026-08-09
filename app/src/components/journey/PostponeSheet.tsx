/**
 * PostponeSheet — Screen 1 of the Miss-Recovery loop (PRD §2). Two blame-free
 * choices when a Step won't happen right now:
 *   • Postpone — keep the Step and move it to a better time.
 *   • Not this time — let this occurrence go (then we ask what happened).
 *
 * BOTH are FREE this slice — there is NO Grace-Token cost and NO token/streak
 * language anywhere (founder decision, PRD §9). Copy is caring, never accusatory.
 *
 * Presentational only — reports the choice upward; no business logic (Bible §19).
 */
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PostponeSheet({
  visible,
  stepTitle,
  onPostpone,
  onLetGo,
  onClose,
}: {
  visible: boolean;
  stepTitle: string;
  /** Keep the Step and move it (→ reschedule). */
  onPostpone: () => void;
  /** Let this occurrence go (→ "what happened?"). Free — no penalty. */
  onLetGo: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('postpone.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.sub}>
            {stepTitle}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.keepA11y')}
            onPress={onPostpone}
            style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.keep')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('postpone.keepHint')}
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.letGoA11y')}
            onPress={onLetGo}
            style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.letGo')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('postpone.letGoHint')}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 18, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  sub: {
    marginBottom: Spacing.two,
  },
  option: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
