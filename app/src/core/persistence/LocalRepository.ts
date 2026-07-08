/**
 * LocalRepository — Repository backed by on-device storage (AsyncStorage).
 * This is the ONLY core file that touches AsyncStorage; engines stay
 * provider-agnostic behind the Repository interface.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppState } from '../types/domain';
import type { Repository } from './Repository';

const STORAGE_KEY = 'pushapp.state.v1';

export class LocalRepository implements Repository {
  async load(): Promise<AppState | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      // Corrupt payload — treat as first run rather than crash.
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
