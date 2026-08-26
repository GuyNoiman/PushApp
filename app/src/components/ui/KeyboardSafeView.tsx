/**
 * KeyboardSafeView — the ONE wrapper for a screen whose input is PINNED below the scroll body: a
 * coach composer, a message bar, a bottom sheet with a field in it.
 *
 * ── THE BUG IT EXISTS FOR (partner, 2026-08-26, Android) ───────────────────────────────────────
 *
 * *"When you write to the coach you cannot see the window — you cannot see what you are typing."*
 * The keyboard opened and sat straight on top of the composer, on Android only.
 *
 * ── WHY IT WAS ANDROID ONLY, AND WHY IT STARTED ────────────────────────────────────────────────
 *
 * Every one of these screens passed `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`, and
 * `undefined` means NO avoidance at all. That was correct once: Android used to resize the whole
 * window when the keyboard opened (`softwareKeyboardLayoutMode: resize`), so the layout shrank and
 * the composer came up on its own — which is exactly what `KeyboardSafeScrollView`'s header still
 * described until today.
 *
 * **Edge-to-edge ended that.** From SDK 54 the Android window draws behind the system bars and no
 * longer resizes for the keyboard; the keyboard simply overlays the app. Nothing in our code
 * changed, the platform did, and the assumption that had been safe for a year quietly became the
 * bug. That is worth remembering: this class of failure arrives without a commit.
 *
 * So the behaviour is now explicit on BOTH platforms, and it is decided here rather than in nine
 * screens that would drift apart.
 *
 * Presentational only (Engineering Bible §19).
 */
import { KeyboardAvoidingView, Platform, type KeyboardAvoidingViewProps } from 'react-native';

/**
 * `padding` on both, deliberately.
 *
 * iOS has always used it. On Android under edge-to-edge, React Native computes the overlap between
 * this view's own frame and the keyboard frame and pads by exactly that — which is right whether or
 * not the window resizes, and is therefore the safer of the two once the platform's behaviour is no
 * longer something we can assume.
 */
export const KEYBOARD_AVOIDING_BEHAVIOR: KeyboardAvoidingViewProps['behavior'] = 'padding';

export function KeyboardSafeView(props: KeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      // iOS measures from the top of the screen, so a screen with its own header must say how tall
      // it is. Android measures this view's real frame and needs no offset.
      {...(Platform.OS === 'android' ? { keyboardVerticalOffset: 0 } : null)}
      {...props}
    />
  );
}
