/**
 * GlossyTile — the chunky 3D rounded-square button from the v14 mockup (Home's
 * area buttons: Missions/Friends/Consistency/Achievements; later the Buddy scene's
 * side buttons). A saturated colour face with a soft inner top highlight, an inner
 * bottom shadow for volume, and a drop shadow beneath — tactile "game UI", reserved
 * for reward/identity surfaces (Design System: concentrate game-juice here, keep
 * work surfaces calm).
 *
 * Presentational only — no business logic (Engineering Bible §19).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The accent roles this tile can be painted with — each maps to a Design System meaning. */
export type GlossyTileColor = 'gold' | 'purple' | 'pink' | 'teal' | 'blue' | 'coral';

const GRADIENTS: Record<GlossyTileColor, { top: string; mid: string; bottom: string; shadow: string }> = {
  gold: { top: '#FFD873', mid: '#F0B429', bottom: '#D89311', shadow: '#8A5E00' },
  purple: { top: '#A79FF0', mid: '#8B6FD6', bottom: '#5D53C4', shadow: '#3A3280' },
  pink: { top: '#F79BC0', mid: '#EC6F9C', bottom: '#CE4E85', shadow: '#8C2F5C' },
  teal: { top: '#5EC4CD', mid: '#17A2A6', bottom: '#1F7C86', shadow: '#0E4A50' },
  blue: { top: '#7FBEF7', mid: '#4A80E0', bottom: '#1B5FA6', shadow: '#0F3A6E' },
  coral: { top: '#FBB08E', mid: '#F2765E', bottom: '#D85A30', shadow: '#7A2E12' },
};

export function GlossyTile({
  color,
  children,
  badge,
  onPress,
  accessibilityLabel,
  size = 60,
}: {
  /** Which accent role paints the face — pick by meaning, not decoration. */
  color: GlossyTileColor;
  /** Icon/glyph content, centered on the face (emoji or short text is fine). */
  children?: ReactNode;
  /** A small count shown in a red bubble, top-right — omit for none. */
  badge?: number;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Side length in px. */
  size?: number;
}) {
  const theme = useTheme();
  const g = GRADIENTS[color];
  const radius = Math.round(size * 0.32);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: g.mid,
          shadowColor: g.shadow,
        },
        pressed && styles.pressed,
      ]}>
      {/* Soft top highlight for the glossy sphere-on-a-tile look. */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            borderRadius: radius,
            top: 0,
            height: '55%',
            backgroundColor: g.top,
            opacity: 0.55,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>

      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 10.5,
    lineHeight: 13,
  },
});
