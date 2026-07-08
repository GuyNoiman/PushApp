/** Tiny, dependency-free id generator. Pure TS — no vendor imports. */
let counter = 0;

export function createId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
