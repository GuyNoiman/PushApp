/**
 * addressForm — the user's grammatical FORM OF ADDRESS (לשון פנייה) for gender-aware i18n (D31).
 *
 * Hebrew (and many languages) inflect how you address someone by gender; English does not. The app
 * therefore resolves gendered copy through i18next **context**: a string that needs it provides
 * `key_feminine` / `key_masculine` variants, and the base `key` is the fallback (so English — and any
 * language without a variant — simply uses the base). See {@link ./useAddressedTranslation} for the
 * React side.
 *
 * This module holds the CURRENTLY-APPLIED form as a plain module value so the framework-free layer
 * (the coach + engines, which call `i18n.t` directly, never a React hook) can apply it too. The
 * {@link ../state/AddressPreference} provider is the source of truth and keeps this in sync via
 * {@link setAddressForm}; nothing else should mutate it.
 *
 * Pure TS — no React, no vendor SDKs.
 */
export type AddressForm = 'neutral' | 'feminine' | 'masculine';

/** The default until the user (or a sign-in) sets one: neutral → base keys, no gendered variant. */
export const DEFAULT_ADDRESS_FORM: AddressForm = 'neutral';

/** Runtime type guard for a persisted / external value. */
export function isAddressForm(value: unknown): value is AddressForm {
  return value === 'neutral' || value === 'feminine' || value === 'masculine';
}

let current: AddressForm = DEFAULT_ADDRESS_FORM;

/** The currently-applied form of address (what the framework-free layer reads). */
export function getAddressForm(): AddressForm {
  return current;
}

/** Set the applied form. Called ONLY by the AddressPreference provider to mirror its state here. */
export function setAddressForm(form: AddressForm): void {
  current = form;
}

/**
 * The i18next `context` for a form — `undefined` for `neutral` (so the base key is used), otherwise
 * the form name (so `key_feminine` / `key_masculine` resolve, falling back to the base key). Defaults
 * to the currently-applied form so the coach/engines can call it argument-free.
 */
export function addressContext(form: AddressForm = current): 'feminine' | 'masculine' | undefined {
  return form === 'neutral' ? undefined : form;
}
