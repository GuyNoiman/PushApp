/**
 * ProviderButton — one full-width "Continue with Apple / Google" button.
 *
 * Lifted out of `app/sign-in.tsx` on 2026-09-15, unchanged, because the approved onboarding puts an
 * account screen inside the first run (D104) and it must be the SAME button: Apple's Human
 * Interface Guidelines are specific about the mark, the wording, and black-on-light /
 * white-on-dark, and a second copy of that is a second thing to get wrong at review.
 *
 * BUTTONS, not the native Apple component: `AppleAuthentication.AppleAuthenticationButton` is a
 * native view, and importing it would pull a native module into screens that must also render in
 * Expo Go, on web and under jest. A custom button following the HIG is what Apple permits.
 *
 * Presentational only (Engineering Bible §19): the identity work belongs to AuthProvider →
 * AuthGateway → nativeIdentity. This asks, shows a spinner, and reports.
 *
 * Layout is direction-aware; Yoga mirrors the row under RTL.
 */
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';

export function ProviderButton({
  icon,
  label,
  busy,
  disabled,
  background,
  foreground,
  borderColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  busy: boolean;
  disabled: boolean;
  background: string;
  foreground: string;
  borderColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.provider,
        { backgroundColor: background },
        borderColor ? { borderWidth: 1, borderColor } : null,
        pressed && styles.pressed,
        disabled && !busy && styles.dimmed,
      ]}>
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={foreground} />
          <ThemedText style={[styles.providerLabel, { color: foreground }]}>{label}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.button,
  },
  providerLabel: {
    fontSize: 15,
    fontFamily: FontFamily.headingBold,
  },
  pressed: {
    opacity: 0.6,
  },
  dimmed: {
    opacity: 0.4,
  },
});
