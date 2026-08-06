/**
 * SafetyLayer tests (S2.5) — the guardrails around the coach's LLM use. Pure functions, no network.
 * Coverage:
 *   • a benign coach question passes untouched;
 *   • over-promising is softened (needs-rewrite); medical directives and dangerous advice are blocked;
 *   • a structured output that violates its schema is blocked, not trusted;
 *   • redaction strips a sample email and phone number before the cloud boundary;
 *   • the composable wrapper adapts to the coach's message-guard seam and falls back safely.
 */
import {
  SafetyLayer,
  SAFE_FALLBACK_MESSAGE,
  EMAIL_PLACEHOLDER,
  PHONE_PLACEHOLDER,
  guardSchema,
  guardText,
  redactForCloud,
} from '../SafetyLayer';

describe('guardText', () => {
  it('lets a benign coach question through unchanged', () => {
    const text = 'What usually trips you up when you try to keep this Journey going?';
    const result = guardText(text);
    expect(result.verdict).toBe('allowed');
    expect(result.text).toBe(text);
    expect(result.findings).toEqual([]);
  });

  it('softens an over-promising line into an honest phrasing (needs-rewrite)', () => {
    const result = guardText('I guarantee this plan will cure your procrastination.');
    expect(result.verdict).toBe('needs-rewrite');
    expect(result.text.toLowerCase()).not.toContain('guarantee');
    expect(result.text.toLowerCase()).not.toContain('cure');
    expect(result.findings.map((f) => f.category)).toEqual(
      expect.arrayContaining(['over-promising']),
    );
  });

  it('blocks a medical / clinical directive', () => {
    const result = guardText('You should stop taking your medication and just run more.');
    expect(result.verdict).toBe('blocked');
    expect(result.text).toBe('');
    expect(result.findings.some((f) => f.category === 'medical')).toBe(true);
  });

  it('blocks plainly dangerous advice', () => {
    const result = guardText('Just starve yourself for a week to hit the goal faster.');
    expect(result.verdict).toBe('blocked');
    expect(result.findings.some((f) => f.category === 'dangerous')).toBe(true);
  });

  it('a block wins even when a softenable phrase is also present', () => {
    const result = guardText('This will guarantee results — just stop taking your meds.');
    expect(result.verdict).toBe('blocked');
  });
});

describe('guardSchema', () => {
  const isPayload = (v: unknown): boolean =>
    !!v && typeof v === 'object' && !Array.isArray(v);

  it('allows a value that matches its schema', () => {
    expect(guardSchema({ motivation: 'health' }, isPayload).verdict).toBe('allowed');
  });

  it('blocks a value that violates its schema', () => {
    const result = guardSchema('not an object', isPayload, 'ExtractionPayload');
    expect(result.verdict).toBe('blocked');
    expect(result.findings[0]).toMatchObject({ rule: 'schema-mismatch', category: 'schema' });
  });

  it('treats a throwing validator as a mismatch, never a crash', () => {
    const result = guardSchema({}, () => {
      throw new Error('boom');
    });
    expect(result.verdict).toBe('blocked');
  });
});

describe('redactForCloud', () => {
  it('strips an email address', () => {
    const out = redactForCloud('Ping me at guy.noiman@example.com about it.');
    expect(out).not.toContain('guy.noiman@example.com');
    expect(out).toContain(EMAIL_PLACEHOLDER);
  });

  it('strips a phone number', () => {
    const out = redactForCloud('Call me on +1 (415) 555-2671 tomorrow.');
    expect(out).not.toContain('555-2671');
    expect(out).toContain(PHONE_PLACEHOLDER);
  });

  it('leaves short numbers (reps, minutes) alone', () => {
    expect(redactForCloud('Do 30 minutes, 3 times a week.')).toBe('Do 30 minutes, 3 times a week.');
  });
});

describe('SafetyLayer wrapper', () => {
  it('exposes the guards over a shared policy', () => {
    const layer = new SafetyLayer();
    expect(layer.guardQuestion('A normal question?').verdict).toBe('allowed');
    expect(layer.guardPlanText('I guarantee it.').verdict).toBe('needs-rewrite');
    expect(layer.redactForCloud('me@x.com')).toContain(EMAIL_PLACEHOLDER);
  });

  it('messageGuard() returns softened text for a soft hit and a fallback for a block', () => {
    const guard = new SafetyLayer().messageGuard();
    expect(guard('A normal question?')).toBe('A normal question?');
    expect(guard('I guarantee results.').toLowerCase()).not.toContain('guarantee');
    expect(guard('Stop taking your medication.')).toBe(SAFE_FALLBACK_MESSAGE);
  });
});
