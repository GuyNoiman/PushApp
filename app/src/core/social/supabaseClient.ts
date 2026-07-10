/**
 * Supabase client — the ONLY module that constructs the SDK (vendor isolation,
 * Engineering Bible §3). Configured for React Native with a SECURE, encrypted-at-
 * rest session store (OS keychain/keystore via expo-secure-store) instead of
 * plaintext AsyncStorage (Auth_Backend_Proposal red-line R2): a real user's
 * long-lived refresh token must never sit in cleartext.
 *
 * Uses the CLIENT-SAFE publishable key from env; the secret key never ships (§12).
 * Null when the social env is absent, so the four local pillars run untouched.
 *
 * NOTE: switching stores drops any pre-existing AsyncStorage session. That only
 * ever held throwaway ANONYMOUS users, so the effect is a fresh anonymous session
 * on first launch after this change — acceptable, no real identity is lost.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createSecureSessionStore } from './secureSessionStore';

/**
 * expo-secure-store has NO web implementation (its web module is a no-op that
 * throws), and there is no OS keychain in a browser. On web we therefore keep the
 * AsyncStorage (localStorage-backed) session store; the encrypted-at-rest upgrade
 * (R2) applies to the native builds where a real device keychain exists. Native
 * (iOS/Android) uses the chunked SecureStore adapter (see secureSessionStore.ts).
 */
const sessionStore =
  Platform.OS === 'web' ? AsyncStorage : createSecureSessionStore(SecureStore);

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: sessionStore,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
