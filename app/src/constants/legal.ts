/**
 * The public legal documents, as URLs. Two constants, in one place, because two screens now link to
 * them: Settings › Privacy policy, and the onboarding Account screen's legal line (build spec §4,
 * "Terms and Privacy must each be a real link to a real document").
 *
 * They live outside any screen so a published document can never be linked from one place and
 * missed in the other.
 */

/** The published privacy policy. Live today; the Settings row has linked to it since 2026-08. */
export const PRIVACY_POLICY_URL = 'https://pushapp-invite.expo.app/privacy.html';

/**
 * The terms of use.
 *
 * ⚠ NOT PUBLISHED YET. The approved Account screen states that continuing agrees to it, so the link
 * has to exist and point somewhere real before this reaches a store build — store-compliance owns
 * getting the document written and deployed to this path.
 */
export const TERMS_URL = 'https://pushapp-invite.expo.app/terms.html';
