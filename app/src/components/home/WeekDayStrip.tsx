/**
 * WeekDayStrip — the week as seven pills, which is the first thing Home now says.
 *
 * It replaces the two Step sections' shared blind spot: a week told as one long list has no shape,
 * and an EMPTY day — real, useful information — is invisible in it. Here a week can be read in one
 * glance: where today sits, which days still have something open, which are finished, and which are
 * genuinely free.
 *
 * THE FOUNDER'S SPECIFICATION, and each part has a reason (`04_Product/PRD/Week_By_Day_Home_PRD.md`):
 *  - **Letters only, no dates.** A date is a lookup; a letter is recognition. Hebrew uses one letter,
 *    English three, which is the shortest form each language can still be read in.
 *  - **The current week only, no scrolling.** The engine does not build next week yet, so offering
 *    it would show an empty week that is not true.
 *  - **One mark under the letter:** a dot for open Steps, a check for a day whose Steps are all
 *    done, nothing at all for an empty day (whose pill also dims).
 *  - **The check occupies the dot's own box**, so the strip does not jump the moment a day completes.
 *
 * Colour is never the only signal: the selected pill is filled AND announced as selected, and every
 * pill's state is spoken in words.
 *
 * Presentational only — the caller supplies the days and owns the selection.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { DayMark, WeekDay } from '@/core/util/weekByDay';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** The box both marks share, so a day completing never changes the pill's height. */
const MARK_BOX = 14;

export function WeekDayStrip({
  days,
  selectedIndex,
  onSelect,
}: {
  days: readonly WeekDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  const letters = t('week.letters', { returnObjects: true }) as unknown as string[];
  const names = t('week.days', { returnObjects: true }) as unknown as string[];

  return (
    <View style={styles.strip}>
      {days.map((day, index) => {
        const selected = index === selectedIndex;
        const empty = day.mark === 'empty';
        return (
          <Pressable
            key={day.dayStart}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${t('week.dayA11y', { day: names[day.weekday] })}, ${t(
              `week.state.${day.mark}`,
            )}`}
            onPress={() => onSelect(index)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: selected ? theme.tint : theme.backgroundElement,
                borderColor: selected ? theme.tint : theme.hairline,
              },
              // An empty day is quieter than the others, but never invisible: it is still a day you
              // can open, and seeing that it is free is half the point of the strip.
              empty && !selected && styles.emptyPill,
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={[
                styles.letter,
                { color: selected ? onAccent : empty ? theme.textMuted : theme.text },
              ]}>
              {letters[day.weekday]}
            </ThemedText>
            <DayMarkGlyph
              mark={day.mark}
              color={selected ? onAccent : theme.tint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The dot, the check, or nothing — all three occupying the same box so the strip never jumps. */
function DayMarkGlyph({ mark, color }: { mark: DayMark; color: string }) {
  return (
    <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {mark === 'open' ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      {mark === 'done' ? <Ionicons name="checkmark" size={MARK_BOX} color={color} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // No horizontal padding of its own: the strip lives INSIDE the week card, which owns the inset.
  strip: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingBottom: Spacing.three,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  emptyPill: {
    opacity: 0.6,
  },
  letter: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
  },
  mark: {
    height: MARK_BOX,
    width: MARK_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.8,
  },
});
