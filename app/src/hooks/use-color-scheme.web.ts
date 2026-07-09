/**
 * The design is warm-light only — there is no dark design yet (Design System §2,
 * §7). On web we also always report `light` so the app renders in the on-brand
 * warm palette regardless of the browser's system colour scheme. Dark mode is
 * future work.
 */
export function useColorScheme(): 'light' {
  return 'light';
}
