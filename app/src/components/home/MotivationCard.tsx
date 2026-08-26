/**
 * MotivationCard — the first slice of the Personalized Motivation Engine on Home
 * (`04_Product/PRD/Motivation_First_Slice_PRD.md`).
 *
 * WHAT IT IS NOT: a feed, a streak-saver, or a nudge. It appears at most once a day, only when one
 * of four moments is open, and only when the app can back the sentence with a number it counted
 * itself. On most days it is simply absent, and that is the intended behaviour rather than a bug.
 *
 * THE NUMBER IS THE POINT. Generic encouragement is what makes motivation feel empty; a figure the
 * person can check ("{{n}} Steps behind you") is what makes it land. Which is why the engine cannot
 * select an item whose facts are missing: a sentence here can never be shown with a hole or an
 * invention in it.
 *
 * FEEDBACK IS ONE BINARY SIGNAL, and dismissing is not one of its values — "not now" hides the card
 * for the day and records no opinion. A "not helpful" retires that item for this person for good.
 * Nothing but an id, a version and a verdict is ever stored (PRD §5).
 *
 * Presentational (Engineering Bible §19): every decision was made by the pure engines behind
 * `core.getMotivationCard()`; this file renders the answer and reports back what happened.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export function MotivationCard() {
  const theme = useTheme();
  const { t } = useTranslation('motivation');
  const { core, snapshot } = useApp();

  const card = useMemo(
    () => core.getMotivationCard(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core, snapshot],
  );

  // Spending the day's one slot is a deliberate act, not a side effect of computing the card: a
  // render that never reached the screen must not use somebody's card up. The selector returns the
  // same card for the rest of the day once this lands, so recording it cannot make it disappear.
  useEffect(() => {
    if (card) core.noteMotivationShown(card);
  }, [core, card?.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [answered, setAnswered] = useState(false);

  if (!card) return null;

  const rate = (verdict: 'helpful' | 'notHelpful' | 'dismissed') => {
    setAnswered(true);
    core.rateMotivation(card.itemId, verdict);
  };

  const openDoor = () => {
    if (card.door === 'journey' && card.journeyId) {
      router.push(`/journey/${card.journeyId}` as Href);
    } else if (card.door === 'today') {
      router.push('/(tabs)' as Href);
    }
  };

  return (
    <View
      style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.head}>
        <Ionicons name="sparkles-outline" size={16} color={theme.tealStrong} />
        <ThemedText type="smallBold" style={[styles.title, { color: theme.tealStrong }]}>
          {card.title}
        </ThemedText>
      </View>

      <ThemedText type="default">{card.body}</ThemedText>

      {card.door ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={card.door === 'journey' ? t('card.doorJourney') : t('card.doorToday')}
          onPress={openDoor}
          style={({ pressed }) => [styles.door, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {card.door === 'journey' ? t('card.doorJourney') : t('card.doorToday')}
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={[styles.divider, { backgroundColor: theme.hairline }]} />

      {answered ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('card.thanks')}
        </ThemedText>
      ) : (
        <View style={styles.actions}>
          <FeedbackChip icon="thumbs-up-outline" label={t('card.helpful')} onPress={() => rate('helpful')} />
          <FeedbackChip
            icon="thumbs-down-outline"
            label={t('card.notHelpful')}
            onPress={() => rate('notHelpful')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('card.dismiss')}
            onPress={() => rate('dismissed')}
            hitSlop={6}
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textMuted">
              {t('card.dismiss')}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function FeedbackChip({
  icon,
  label,
  onPress,
}: {
  icon: 'thumbs-up-outline' | 'thumbs-down-outline';
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: theme.hairline },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.two,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { flex: 1 },
  door: { alignSelf: 'flex-start', paddingVertical: Spacing.half },
  divider: { height: 1, marginTop: Spacing.one },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dismiss: { marginStart: 'auto', paddingHorizontal: Spacing.one, paddingVertical: Spacing.one },
  pressed: { opacity: 0.7 },
});
