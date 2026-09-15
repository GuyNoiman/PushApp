/**
 * The product's NAME — one constant, because it is about to change.
 *
 * ── WHY IT IS NOT WRITTEN INTO THE COPY ────────────────────────────────────────────────────────
 *
 * The name that shipped is dropped (D107) and no replacement has been chosen. The approved
 * onboarding screens name the product in running copy three times, and the build spec
 * (`04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`) carries it as the token
 * `⟨PRODUCT⟩` for exactly that reason: a name typed into eleven strings is eleven places to miss
 * when it changes, in two languages, under review.
 *
 * So every string that names the product interpolates `{{product}}`, and `{{product}}` is fed from
 * HERE — registered once as an i18next default variable in `@/i18n`, so no call site has to pass it
 * and no call site can forget to. **When the name is decided, this line is the change.**
 *
 * Until then it holds the current repo name, which is what the app is called today.
 */
export const PRODUCT_NAME = 'PushApp';
