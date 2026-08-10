/**
 * Form-of-address (gender-aware i18n, D31). Pins two things: the `addressContext` mapping
 * (neutral → no context → base key; feminine/masculine → their i18next context), and that a gendered
 * coachContent key actually resolves its `_feminine` variant while an ungendered key falls back to the
 * base in every form. This is the safety net for the mechanism the coach + engines rely on.
 */
import i18n, { changeLanguage } from '@/i18n';
import { addressContext, getAddressForm, setAddressForm, DEFAULT_ADDRESS_FORM } from '@/i18n/addressForm';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

afterEach(() => setAddressForm(DEFAULT_ADDRESS_FORM));

describe('addressContext', () => {
  it('maps neutral → undefined (base key) and the genders → their context', () => {
    expect(addressContext('neutral')).toBeUndefined();
    expect(addressContext('feminine')).toBe('feminine');
    expect(addressContext('masculine')).toBe('masculine');
  });

  it('round-trips the applied form and defaults it argument-free', () => {
    expect(getAddressForm()).toBe('neutral');
    setAddressForm('feminine');
    expect(getAddressForm()).toBe('feminine');
    expect(addressContext()).toBe('feminine');
  });
});

describe('coachContent resolves gendered variants (Hebrew)', () => {
  beforeAll(async () => {
    await changeLanguage('he');
  });
  afterAll(async () => {
    await changeLanguage('en');
  });

  it('picks the _feminine variant for feminine, and the base otherwise', () => {
    const base = i18n.t('interview.baseline', { ns: 'coachContent' });
    const fem = i18n.t('interview.baseline', { ns: 'coachContent', context: 'feminine' });
    expect(fem).not.toBe(base); // a real feminine inflection exists
    expect(fem).toContain('מתחילה');
    // Masculine has no explicit variant → falls back to the base (which reads masculine).
    expect(i18n.t('interview.baseline', { ns: 'coachContent', context: 'masculine' })).toBe(base);
  });

  it('falls back to the base key when a string has no gendered variant', () => {
    const base = i18n.t('interview.foundation', { ns: 'coachContent' });
    expect(i18n.t('interview.foundation', { ns: 'coachContent', context: 'feminine' })).toBe(base);
  });
});
