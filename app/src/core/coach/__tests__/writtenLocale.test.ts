/**
 * The coach answers in the language the person wrote in.
 *
 * The founder typed Hebrew to the coach inside an English install (2026-09-07) and was answered in
 * English, which is the app talking past the person in front of it. The app's language decides the
 * interface; it does not decide what somebody types.
 */
import { writtenLocale } from '../CoachOrchestrator';

describe('reading the language somebody wrote in', () => {
  it('recognises Hebrew', () => {
    expect(writtenLocale('אני רוצה לעשות שינוי בקריירה שלי')).toBe('he');
  });

  it('recognises English', () => {
    expect(writtenLocale('I want to change career')).toBe('en');
  });

  it('stays Hebrew when an English word sits inside a Hebrew sentence', () => {
    // A brand, a job title, a tool. This is ordinary, and swinging the whole conversation on it
    // would be worse than being wrong consistently.
    expect(writtenLocale('אני רוצה לעבור לתפקיד product manager')).toBe('he');
  });

  it('answers nothing for text with no letters at all, so the app language is kept', () => {
    expect(writtenLocale('123 :)')).toBeUndefined();
    expect(writtenLocale('   ')).toBeUndefined();
  });
});
