/**
 * SupportCarousel — "be there for someone", as one person at a time (2026-08-19 redesign).
 *
 * It replaces `SupportBoard`'s list of rows. The founder's design puts the people in a swipeable
 * ring of faces with one of them in focus, a line saying why they surfaced, and the actions right
 * under them — and the change is not decorative. A list of five people asking for attention is a
 * chore; one person, with their name and their reason, is a person. This section is the one place
 * on Home that is about somebody else, and it should feel like meeting them rather than like
 * processing a queue.
 *
 * TWO TABS, kept from the board because the distinction is real: someone who has gone quiet needs a
 * NUDGE, and someone who just moved deserves a CHEER, and the app must never send one dressed as the
 * other.
 *
 * THREE ACTIONS, and one of them does not exist yet. Message is in the design because free-text
 * messaging is coming (founder, 2026-08-19: *"the ability to send a message will be in the app very
 * soon, so design it now"*). Until it lands it opens the Inbox rather than doing nothing: a button
 * that answers a tap with silence teaches people to stop tapping.
 *
 * Presentational only — the caller supplies the people and every handler.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SupportTone = 'nudge' | 'cheer';

/** One person in the carousel, with the reason they surfaced. */
export interface SupportPerson {
  key: string;
  initials: string;
  name: string;
  /** The WHY line, e.g. "Quiet for 4 days on 'Run 5km'". Always shown. */
  status: string;
  /** The tone-appropriate outreach: a nudge for a quiet friend, a cheer for one who moved. */
  onPress: () => void;
  /** Opens a message to this person (the Inbox for now — see the header). */
  onMessage: () => void;
}

export function SupportCarousel({
  needSupport,
  deservePraise,
}: {
  needSupport: SupportPerson[];
  deservePraise: SupportPerson[];
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const [tone, setTone] = useState<SupportTone>('nudge');
  const [index, setIndex] = useState(0);

  const people = tone === 'nudge' ? needSupport : deservePraise;
  const accent = tone === 'nudge' ? theme.gold : theme.tint;
  // Switching tabs must never leave the focus pointing past the end of a shorter list.
  useEffect(() => setIndex(0), [tone]);
  const focused = people[Math.min(index, Math.max(people.length - 1, 0))];

  return (
    <View style={styles.wrap}>
      <View style={[styles.tabs, { borderColor: theme.hairline }]}>
        {(['cheer', 'nudge'] as SupportTone[]).map((value) => {
          const active = tone === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(`support.tab.${value}`)}
              onPress={() => setTone(value)}
              style={styles.tab}>
              <Ionicons
                name={value === 'cheer' ? 'sparkles-outline' : 'heart-outline'}
                size={15}
                color={active ? theme.tint : theme.textMuted}
              />
              <ThemedText type="smallBold" style={{ color: active ? theme.tint : theme.textMuted }}>
                {t(`support.tab.${value}`)}
              </ThemedText>
              {active ? <View style={[styles.underline, { backgroundColor: theme.tint }]} /> : null}
            </Pressable>
          );
        })}
      </View>

      {people.length === 0 || !focused ? (
        <ThemedText type="small" style={[styles.empty, { color: theme.textSecondary }]}>
          {t(`support.empty.${tone}`)}
        </ThemedText>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.faces}>
            {people.map((person, i) => {
              const active = person.key === focused.key;
              return (
                <Pressable
                  key={person.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${person.name}. ${person.status}`}
                  onPress={() => setIndex(i)}
                  style={[
                    styles.face,
                    active && styles.faceActive,
                    {
                      borderColor: active ? accent : theme.hairline,
                      backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.initials,
                      {
                        color: active ? theme.text : theme.textMuted,
                        fontFamily: displayFont(),
                        fontSize: Math.round((active ? 20 : 16) * displayScale()),
                      },
                    ]}>
                    {person.initials}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText
            style={[
              styles.name,
              { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(19 * displayScale()) },
            ]}>
            {focused.name}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {focused.status}
          </ThemedText>

          <View style={styles.actions}>
            <Action
              icon="chatbubble-ellipses-outline"
              label={t('support.action.message')}
              onPress={focused.onMessage}
              color={theme.textSecondary}
            />
            <Action
              icon={tone === 'nudge' ? 'heart' : 'sparkles'}
              label={t(`support.action.${tone}`)}
              onPress={focused.onPress}
              color={accent}
              emphasis
            />
          </View>
        </>
      )}
    </View>
  );
}

/** One action. The emphasised one is the tone's own outreach; the other is quieter by design. */
function Action({
  icon,
  label,
  onPress,
  color,
  emphasis = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  emphasis?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: emphasis ? color : theme.hairline },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={16} color={color} />
      <ThemedText type="smallBold" style={{ color: emphasis ? color : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  underline: {
    position: 'absolute',
    bottom: -1,
    start: 0,
    end: 0,
    height: 2,
    borderRadius: Radius.pill,
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  faces: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  face: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The focused face is bigger and ringed: one person is being talked about, and it should be
  // obvious which one without reading the name below.
  faceActive: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
  },
  initials: {
    letterSpacing: 0.4,
  },
  name: {
    lineHeight: 26,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
