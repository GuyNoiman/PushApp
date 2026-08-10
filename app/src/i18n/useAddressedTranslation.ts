/**
 * useAddressedTranslation — like `useTranslation`, but every `t(...)` call carries the user's FORM OF
 * ADDRESS (לשון פנייה) as i18next **context**, so gendered `key_feminine` / `key_masculine` variants
 * resolve automatically (the base `key` is the fallback — see D31 + {@link ./addressForm}).
 *
 * Use it for user-facing copy that inflects by gender (Hebrew coach questions, greetings addressed to
 * "you"). Plain labels/nouns can keep `useTranslation`. Because it reads the form from React context,
 * a component using this hook re-renders when the user changes their form of address.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useProfile } from '@/state/ProfileProvider';
import { addressContext } from './addressForm';

/** A translate function that already applies the active form of address as context. */
export type AddressedT = (key: string, options?: Record<string, unknown>) => string;

export function useAddressedTranslation(ns?: string): { t: AddressedT } {
  const { t: baseT } = useTranslation(ns);
  const { profile } = useProfile();
  const context = addressContext(profile.addressForm);

  const t = useCallback<AddressedT>(
    (key, options) => baseT(key, { context, ...options }) as unknown as string,
    [baseT, context],
  );

  return { t };
}
