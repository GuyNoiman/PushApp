/**
 * What may be sent, and what cannot be.
 *
 * The interesting tests here are about ABSENCE. §11.4 of the monitoring PRD is a list of things that
 * must never leave the device, and the way this module guarantees most of it is by having nowhere to
 * put them: one free-text field, which a person wrote on purpose, and an allowlist of named facts.
 * A test that a Journey title cannot ride along is a test that the shape has no room for one.
 */
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  REPORT_CATEGORIES,
  checkReport,
  sendableDescription,
  type ReportDraft,
} from '../model';

const draft = (over: Partial<ReportDraft> = {}): ReportDraft => ({
  category: 'not_working',
  description: 'The space bar does nothing on the second question',
  ...over,
});

describe('what makes a report sendable', () => {
  it('accepts a real one', () => {
    expect(checkReport(draft())).toEqual([]);
  });

  it('asks for more than a couple of characters', () => {
    expect(checkReport(draft({ description: 'asdf' }))).toEqual(['tooShort']);
    expect(DESCRIPTION_MIN_CHARS).toBeGreaterThan(1);
  });

  it('treats a whitespace-only description as empty', () => {
    expect(checkReport(draft({ description: '            ' }))).toContain('tooShort');
  });

  it('lets somebody report without leaving an address', () => {
    // Refusing to listen until they hand over a contact detail is collecting one in exchange for
    // being heard. Absent is fine; present-and-malformed is not.
    expect(checkReport(draft({ contactEmail: undefined }))).toEqual([]);
    expect(checkReport(draft({ contactEmail: '   ' }))).toEqual([]);
    expect(checkReport(draft({ contactEmail: 'not-an-address' }))).toEqual(['badEmail']);
    expect(checkReport(draft({ contactEmail: 'someone@example.com' }))).toEqual([]);
  });

  it('rejects a category outside the closed set', () => {
    expect(checkReport(draft({ category: 'payment' as never }))).toContain('noCategory');
  });

  it('offers no payment category while there is no billing', () => {
    expect(REPORT_CATEGORIES).not.toContain('payment');
  });
});

describe('the description', () => {
  it('is trimmed at the edges and capped, and never otherwise altered', () => {
    const written = '  I could not find where to change the reminder time.  ';
    expect(sendableDescription(written)).toBe('I could not find where to change the reminder time.');
    expect(sendableDescription('x'.repeat(5000))).toHaveLength(DESCRIPTION_MAX_CHARS);
  });
});

describe('what cannot ride along', () => {
  it('has no field a Journey title, a coach line or a Tool answer would fit in', () => {
    const sendable = draft();
    // The type has exactly three keys. This test fails the day somebody adds `extra` or `context`,
    // which is the moment to have the §11.4 conversation rather than six months later.
    expect(Object.keys(sendable).sort()).toEqual(['category', 'description']);
    expect(Object.keys({ ...sendable, contactEmail: 'a@b.co' }).sort()).toEqual([
      'category',
      'contactEmail',
      'description',
    ]);
  });
});
