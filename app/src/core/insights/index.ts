/**
 * Adaptive-coach insights entry point. Exposes the pure projection boundary
 * (deriveInsights → deriveOutreachInsight, the single server-eligibility chokepoint) and
 * the InsightGateway seam. Phase 1 uses NullInsightGateway — no network.
 */
export * from './deriveInsights';
export * from './InsightGateway';
