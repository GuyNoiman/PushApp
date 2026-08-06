/**
 * Coach layer entry point — the conversational coach that interviews the user to build a Journey
 * (adaptive coach, S2). Starts with the editable {@link interviewPlaybook} config; the S2.3
 * orchestrator, parser and safety wiring land on top of the {@link ../llm/LlmClient} seam.
 */
export * from './interviewPlaybook';
export * from './coachPrompts';
export * from './communicationStyles';
export * from './CoachOrchestrator';
export * from './SafetyLayer';
