/**
 * The display voice is a DIFFERENT FACE in each language, and that is exactly the kind of decision
 * that quietly breaks a layout: two faces at the same px look like two different sizes, and fixing
 * that by scaling the whole type block would move every card below it.
 *
 * The founder's instruction is the contract these tests hold: *"since the font differs between the
 * languages, make sure they occupy the same space on screen"*. So:
 *   · the FACE changes with the language;
 *   · the font SIZE is optically corrected, so neither language looks smaller than the other;
 *   · the LINE HEIGHT does not move — the box is identical, and nothing below it shifts.
 */
import { createElement, type ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'en' } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const i18next = require('i18next').default as { language: string };
interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[] };
  toJSON(): any;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

function styleFor(type: 'display' | 'displaySmall', language: string) {
  i18next.language = language;
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(createElement(ThemedText, { type }, 'שלום / hello'));
  });
  return StyleSheet.flatten(root.toJSON().props.style) as {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
}

afterEach(() => {
  i18next.language = 'en';
});

describe('which face is speaking', () => {
  it('uses the Latin serif for English and the Hebrew serif for Hebrew', () => {
    i18next.language = 'en';
    expect(displayFont()).toContain('Fraunces');
    i18next.language = 'he';
    expect(displayFont()).toContain('FrankRuhlLibre');
  });

  it('has an emphatic weight in both, matched by appearance rather than by number', () => {
    i18next.language = 'en';
    expect(displayFont('strong')).toBe('Fraunces_600SemiBold');
    i18next.language = 'he';
    expect(displayFont('strong')).toBe('FrankRuhlLibre_700Bold');
  });

  it('treats any Hebrew locale tag as Hebrew, not only the bare code', () => {
    i18next.language = 'he-IL';
    expect(displayFont()).toContain('FrankRuhlLibre');
  });

  it('falls back to the Latin face when no language is set at all', () => {
    (i18next as { language?: string }).language = undefined;
    expect(displayFont()).toContain('Fraunces');
  });
});

describe('the same space on screen — the rule that must not drift', () => {
  it.each(['display', 'displaySmall'] as const)(
    '%s keeps an identical line box in both languages',
    (type) => {
      const en = styleFor(type, 'en');
      const he = styleFor(type, 'he');
      expect(he.lineHeight).toBe(en.lineHeight);
    },
  );

  it('corrects the SIZE for the Hebrew face, since it reads smaller at the same px', () => {
    expect(displayScale()).toBe(1);
    i18next.language = 'he';
    expect(displayScale()).toBeGreaterThan(1);
    expect(styleFor('display', 'he').fontSize).toBeGreaterThan(styleFor('display', 'en').fontSize);
  });

  it('actually switches the family on the rendered text', () => {
    expect(styleFor('display', 'he').fontFamily).not.toBe(styleFor('display', 'en').fontFamily);
  });
});
