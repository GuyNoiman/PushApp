import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
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
// The weight lives in the FAMILY NAME (custom fonts ignore `fontWeight`), so each
// role picks the right variant: HEADINGS/display use Baloo 2 (rounded, warm) and
// BODY uses Inter. Baloo 2 runs slightly small at a given px, so headings keep
// their generous line-heights for optical balance.
const styles = StyleSheet.create({
  small: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  default: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 20,
    lineHeight: 26,
  },
  link: {
    fontFamily: FontFamily.bodyMedium,
    lineHeight: 22,
    fontSize: 15,
  },
  linkPrimary: {
    fontFamily: FontFamily.bodySemiBold,
    lineHeight: 22,
    fontSize: 15,
    color: '#4A80E0',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
