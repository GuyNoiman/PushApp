/**
 * The design is warm-light only — there is no dark design yet (Design System §2,
 * §7). We ignore the system colour scheme and always report `light` so the whole
 * app renders in the on-brand warm palette. Dark mode is future work; restoring
 * `export { useColorScheme } from 'react-native'` is all it will take.
 */
export function useColorScheme(): 'light' {
  return 'light';
}
