/**
 * KeyboardSafeScrollView — the ONE scrolling body used by every screen that holds a text input, so
 * no screen has to remember the keyboard settings (Device QA 2026-08-17, A3: the field being typed
 * into sat behind the keyboard on the birth-date editor and on Active Hours' last day row).
 *
 * WHY NOT a KeyboardAvoidingView here: React Native already solves this natively on iOS.
 * `automaticallyAdjustKeyboardInsets` grows the scroll view's bottom content inset by the keyboard
 * overlap AND scrolls the focused input back above the keyboard (RCTScrollViewComponentView's
 * `_keyboardWillChangeFrame` — it measures the first responder and offsets the content by the
 * difference). That is exactly the missing behaviour, from the framework, with no new dependency.
 * A KeyboardAvoidingView wrapped around the same scroll view would shrink it a second time and
 * double-count the inset, so the two must not be combined. KeyboardAvoidingView stays the right
 * tool for what this component cannot move: a composer bar pinned below the scroll body (Coach) or
 * a bottom sheet.
 *
 * On Android the window itself resizes (Expo's default `softwareKeyboardLayoutMode: resize`) and the
 * platform brings the focused view into view, so the inset prop is iOS-only by design.
 *
 * `keyboardShouldPersistTaps="handled"` is the other half of the fix: without it the first tap on a
 * button while the keyboard is up only dismisses the keyboard, so "Save" / "Add" / a search result
 * needs two taps.
 *
 * Presentational only (Engineering Bible §19) — it renders a ScrollView and nothing else. Every
 * ScrollView prop passes through, and a caller may override any default. `ref` passes through too
 * (React 19 treats it as an ordinary prop), so a caller can drive the scroll position — that is what
 * TabScrollView needs to return a tab to the top.
 */
import { type Ref } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

export function KeyboardSafeScrollView(props: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      // iOS-only prop; spread so it is not passed at all on Android/web.
      {...(Platform.OS === 'ios' ? { automaticallyAdjustKeyboardInsets: true } : null)}
      {...props}
    />
  );
}
