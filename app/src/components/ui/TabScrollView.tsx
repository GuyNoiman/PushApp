/**
 * TabScrollView — the scrolling body of a bottom-tab SCREEN. It is
 * KeyboardSafeScrollView plus one behaviour: tapping the tab you are already on
 * returns this screen to the top (founder device pass 2026-08-17 — the standard
 * iOS gesture, which we did not have).
 *
 * It owns the scroll ref itself so a tab screen only has to swap its ScrollView
 * for this one: no ref to declare, no hook to remember, and no way to wire half
 * of it. Every ScrollView prop still passes through.
 *
 * Presentational only (Engineering Bible §19).
 */
import { useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { useScrollToTopOnTabPress } from '@/hooks/use-scroll-to-top';

export function TabScrollView(props: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(ref);
  return <KeyboardSafeScrollView ref={ref} {...props} />;
}
