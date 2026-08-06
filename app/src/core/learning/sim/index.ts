/**
 * Adaptive-coach closed-loop simulation (S1.13–S1.15) — the headless proof rig. It wires the real
 * engines + pure re-planner together and drives them with seeded personas over a virtual clock, to
 * PROVE the coach actually adapts to how a user behaves. See {@link ./run} for an eyeball-friendly
 * timeline and {@link ./__tests__/Simulation.test} for the machine-checked assertions.
 */
export * from './personas';
export * from './scenarios';
export * from './MockReminderEngine';
export * from './Simulation';
