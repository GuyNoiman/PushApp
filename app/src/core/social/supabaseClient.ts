/**
 * Supabase client — the ONLY module that constructs the SDK (vendor isolation,
 * Engineering Bible §3). Configured for React Native: AsyncStorage-backed session
 * persistence + auto-refresh, no URL session detection (that's a web-OAuth concern).
 * Uses the CLIENT-SAFE publishable key from env; the secret key never ships (§12).
 *
 * Null when the social env is absent, so the four local pillars run untouched.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
