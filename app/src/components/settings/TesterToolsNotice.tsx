/**
 * TesterToolsNotice — TEMPORARY. REMOVE BEFORE REAL USERS, with `state/TesterTools.ts`.
 *
 * The short notice that says which way the hidden tester tools just flipped. There is no toast in the
 * app and this is not the moment to design one, so it is a plain pill over the bottom of Settings.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Renders nothing unless a flip has just happened. */
export function TesterToolsNotice({ notice }: { notice: 'on' | 'off' | null }) {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  if (!notice) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        accessibilityLiveRegion="polite"
        style={[styles.pill, { backgroundColor: theme.text }]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {notice === 'on' ? t('testerTools.unlocked') : t('testerTools.locked')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  pill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
