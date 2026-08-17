/**
 * rtl — the direction decisions that are pure enough to pin.
 *
 * Deliberately narrow. Most of what went wrong in Hebrew on a real iPhone is
 * style-only (does a row mirror, does a chevron point the right way on screen)
 * and a unit test asserting "this style object contains the string 'left'" would
 * prove nothing — that part needs a device. What IS testable, and what actually
 * regressed, are the two counter-intuitive rules below:
 *   · `START_TEXT_ALIGN` must NOT vary with direction. React Native mirrors an
 *     explicit 'left'/'right' itself, so a well-meaning `isRTL() ? 'right' :
 *     'left'` flips twice and lands back on the wrong side.
 *   · `isolate()` must WRAP, never reorder — that is the whole point of using a
 *     Unicode isolate for a Latin handle or a "3 / 6" counter inside Hebrew.
 */
import { I18nManager } from 'react-native';

import {
  chevronName,
  directionalTranslateX,
  isolate,
  isRTL,
  isRTLLocale,
  START_TEXT_ALIGN,
  writingDirection,
} from '@/i18n/rtl';

/** `I18nManager.isRTL` is a native constant; swap it for the length of one test. */
function withDirection(rtl: boolean, run: () => void) {
  const original = I18nManager.isRTL;
  Object.defineProperty(I18nManager, 'isRTL', { value: rtl, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(I18nManager, 'isRTL', { value: original, configurable: true });
  }
}

describe('rtl — which languages read right-to-left', () => {
  it('knows the RTL scripts we ship or will ship, and nothing else', () => {
    expect(isRTLLocale('he')).toBe(true);
    expect(isRTLLocale('ar')).toBe(true);
    expect(isRTLLocale('en')).toBe(false);
    expect(isRTLLocale('ru')).toBe(false);
  });
});

describe('rtl — the applied direction drives the affordances', () => {
  it('reports the applied direction', () => {
    withDirection(true, () => expect(isRTL()).toBe(true));
    withDirection(false, () => expect(isRTL()).toBe(false));
  });

  it('points a "forward" chevron the way the language reads', () => {
    withDirection(false, () => expect(chevronName()).toBe('chevron-forward'));
    withDirection(true, () => expect(chevronName()).toBe('chevron-back'));
  });

  it('flips a horizontal translate so an animation reads the same both ways', () => {
    withDirection(false, () => expect(directionalTranslateX(28)).toBe(28));
    withDirection(true, () => expect(directionalTranslateX(28)).toBe(-28));
  });

  it('pins the base writing direction to the applied direction', () => {
    withDirection(false, () => expect(writingDirection()).toBe('ltr'));
    withDirection(true, () => expect(writingDirection()).toBe('rtl'));
  });
});

describe('rtl — START_TEXT_ALIGN means "start", and must not be flipped by hand', () => {
  it('stays the same value in BOTH directions', () => {
    // React Native mirrors an explicit left/right itself once the layout direction
    // is RTL. Making this conditional would flip it a second time — the exact bug
    // that left Hebrew text inputs aligned to the wrong edge.
    withDirection(false, () => expect(START_TEXT_ALIGN).toBe('left'));
    withDirection(true, () => expect(START_TEXT_ALIGN).toBe('left'));
  });
});

describe('rtl — isolate() protects a run without reordering it', () => {
  it('wraps in FIRST STRONG ISOLATE … POP DIRECTIONAL ISOLATE', () => {
    expect(isolate('@sam')).toBe('⁨@sam⁩');
  });

  it('keeps the payload byte-for-byte, in its original order', () => {
    // The whole point: a numeric counter must not become "6 / 3" in Hebrew.
    expect(isolate('3 / 6').slice(1, -1)).toBe('3 / 6');
    expect(isolate('בוקר טוב').slice(1, -1)).toBe('בוקר טוב');
  });

  it('accepts a number as readily as a string', () => {
    expect(isolate(42)).toBe('⁨42⁩');
  });

  it('does not depend on the applied direction — isolation is symmetric', () => {
    withDirection(false, () => expect(isolate('@sam')).toBe('⁨@sam⁩'));
    withDirection(true, () => expect(isolate('@sam')).toBe('⁨@sam⁩'));
  });
});
