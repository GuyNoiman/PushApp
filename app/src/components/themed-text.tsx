import { useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { displayFont, displayScale } from '@/constants/displayFont';
import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN, writingDirection } from '@/i18n/rtl';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    /** A STATEMENT — the greeting, a section's own heading. Display serif (see {@link FontFamily}). */
    | 'display'
    /** The same voice one step down: a card's own title. */
    | 'displaySmall';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Text
      style={[
        // Direction FIRST, so every line follows the app's language: an explicit
        // alignment (never natural — see START_TEXT_ALIGN) plus a base writing
        // direction that keeps Hebrew-with-Latin copy in reading order. A caller's
        // own `style` still wins, so 'center' and the bilingual RestartPrompt are
        // untouched.
        { color: theme[themeColor ?? 'text'] },
        { textAlign: START_TEXT_ALIGN, writingDirection: writingDirection() },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'display' && styles.display,
        type === 'displaySmall' && styles.displaySmall,
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
const makeStyles = (c: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
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
    // The display voice, in whichever face this language speaks (see constants/displayFont). A
    // serif at a large size needs LESS letter-spacing and MORE line-height than a sans does at the
    // same px, or it reads cramped and bookish rather than composed.
    // The LINE HEIGHTS are fixed and language-independent on purpose: only the font SIZE is
    // corrected per face, so a heading occupies exactly the same box in Hebrew as in English and
    // nothing below it moves (see constants/displayFont).
    display: {
      fontFamily: displayFont(),
      fontSize: Math.round(28 * displayScale()),
      lineHeight: 36,
      letterSpacing: -0.2,
    },
    displaySmall: {
      fontFamily: displayFont(),
      fontSize: Math.round(19 * displayScale()),
      lineHeight: 26,
      letterSpacing: -0.1,
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
      color: c.blue,
    },
    code: {
      fontFamily: Fonts.mono,
      fontSize: 12,
    },
  });
