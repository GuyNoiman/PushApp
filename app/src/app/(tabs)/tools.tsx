/**
 * Tools — the fifth tab, in the slot the Inbox left on 2026-08-20 (founder's option 1).
 *
 * WHAT IT IS FOR, in his words: *"a Tools tab with all kinds of questionnaires and games for the
 * user"*. The through-line is that everything here is something the user DOES inside the app and
 * comes out of knowing themselves a little better — as opposed to Home, which is about the world
 * outside the app and what they promised to do in it.
 *
 * WHAT IS HERE TODAY IS WHAT EXISTS TODAY, and the screen says so plainly. It lists the one real
 * tool the app already has (the communication-style questionnaire) and names what is coming without
 * pretending it is here: a row that opens nothing is how a product teaches people that its buttons
 * are decorative. When a tool lands it gets a row and the "coming" list gets shorter.
 *
 * Presentational only — every entry is a push to a screen that owns its own logic.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chevronName } from '@/i18n/rtl';

export default function ToolsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('tools');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="display">{t('title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('subtitle')}
          </ThemedText>
        </View>

        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ToolCard
            icon="chatbubbles-outline"
            title={t('communication.title')}
            body={t('communication.body')}
            action={t('communication.action')}
            onPress={() => router.push('/settings/communication-style' as Href)}
          />

          {/* Named, not offered. Each of these is real work that has not been done, and a row that
              opens nothing would be worse than a sentence that is honest about it. */}
          <View style={[styles.soon, { borderColor: theme.hairline }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('soon.title')}
            </ThemedText>
            {(['reflection', 'strengths', 'games'] as const).map((key) => (
              <View key={key} style={styles.soonRow}>
                <Ionicons name="ellipse-outline" size={9} color={theme.textMuted} />
                <ThemedText type="small" themeColor="textMuted" style={styles.soonText}>
                  {t(`soon.${key}`)}
                </ThemedText>
              </View>
            ))}
          </View>
        </TabScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** One tool: what it is, what it gives you, and one way in. */
function ToolCard({
  icon,
  title,
  body,
  action,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardHead}>
        <View style={[styles.tile, { backgroundColor: theme.tealTint }]}>
          <Ionicons name={icon} size={18} color={theme.tealStrong} />
        </View>
        <ThemedText type="displaySmall" style={styles.cardTitle} numberOfLines={2}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {body}
      </ThemedText>
      <View style={styles.cardAction}>
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          {action}
        </ThemedText>
        <Ionicons name={chevronName()} size={14} color={theme.tint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: 2,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, minWidth: 0 },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  soon: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  soonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  soonText: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
});
