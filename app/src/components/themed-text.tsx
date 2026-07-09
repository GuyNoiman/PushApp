import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// Type scale (Design System §3): display 26 · h1 20 · h2 16 · body 15 · caption 12.
// Headings use the rounded system display stack (ui-rounded / SF Pro Rounded /
// system) for the warm, friendly character; body uses the system sans.
const styles = StyleSheet.create({
  small: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 500,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  link: {
    lineHeight: 22,
    fontSize: 15,
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 15,
    color: '#4A80E0',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
