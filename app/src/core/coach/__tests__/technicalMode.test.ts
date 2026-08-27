/**
 * Technical mode — the switch, and the promises that come with it.
 *
 * The feature is small and the risk is not: a debug commentary that could swallow somebody's opening
 * message, cost a model call, or leak into the transcript the model reads would be worse than not
 * having it at all. These are those three, plus the words.
 */
import { noteOf, technicalModeCommand } from '../technicalMode';

describe('technicalModeCommand', () => {
  it('recognises the founder’s phrase, in Hebrew', () => {
    expect(technicalModeCommand('עבור למצב טכני')).toBe('on');
    expect(technicalModeCommand('  עבור למצב טכני  ')).toBe('on');
    expect(technicalModeCommand('מצב טכני')).toBe('on');
  });

  it('recognises the way out', () => {
    expect(technicalModeCommand('צא ממצב טכני')).toBe('off');
    expect(technicalModeCommand('כבה מצב טכני')).toBe('off');
    expect(technicalModeCommand('exit technical mode')).toBe('off');
    expect(technicalModeCommand('technical mode off')).toBe('off');
  });

  it('works in English too', () => {
    expect(technicalModeCommand('technical mode')).toBe('on');
    expect(technicalModeCommand('Switch to Technical Mode')).toBe('on');
  });

  it('is not confused by trailing punctuation or doubled spaces', () => {
    expect(technicalModeCommand('עבור  למצב  טכני.')).toBe('on');
    expect(technicalModeCommand('technical mode!')).toBe('on');
  });

  it('NEVER swallows a sentence that merely contains the words', () => {
    // The whole reason it is an exact match on the message rather than a search inside it: this is
    // exactly the kind of opening this product's users type, and having it silently become a debug
    // toggle would lose their goal.
    expect(technicalModeCommand('I want to move into a more technical mode of working')).toBeNull();
    expect(technicalModeCommand('אני רוצה לעבור למצב טכני יותר בעבודה שלי')).toBeNull();
    expect(technicalModeCommand('technical mode would suit me better')).toBeNull();
  });

  it('says nothing about an ordinary message', () => {
    expect(technicalModeCommand('I want to find a new job')).toBeNull();
    expect(technicalModeCommand('')).toBeNull();
    expect(technicalModeCommand('   ')).toBeNull();
  });
});

describe('noteOf', () => {
  it('renders a title and its fields', () => {
    expect(noteOf('Journey selected', { chosen: 'diagnosis', id: 'career.proof' })).toBe(
      'Journey selected\n· chosen: diagnosis\n· id: career.proof',
    );
  });

  it('drops what is unknown rather than printing "undefined"', () => {
    expect(noteOf('Diagnosis', { subtype: 'apply', bottleneck: undefined, note: null, blank: '' })).toBe(
      'Diagnosis\n· subtype: apply',
    );
  });

  it('is just the title when nothing is known', () => {
    expect(noteOf('Nothing to report', { a: undefined })).toBe('Nothing to report');
  });
});
