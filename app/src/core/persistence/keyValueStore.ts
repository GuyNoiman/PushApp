/**
 * KeyValueStore — the minimal AsyncStorage-shaped seam every on-device store in
 * this folder writes through. It lives in its own module (rather than inside one
 * repository) so the repositories AND the quarantine helper can share one
 * definition without importing each other. Injected everywhere, so tests run
 * against an in-memory map and never touch a native module.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
