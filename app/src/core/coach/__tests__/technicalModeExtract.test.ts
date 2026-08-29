/**
 * The technical-mode switch, when it is not the whole message.
 *
 * A tester wrote the command with a sentence after it and nothing happened —
 * no switch, and no sign the words had been read as an ordinary message. The
 * first version matched only a whole message, to protect somebody writing "a
 * more technical mode of working" from having their opening swallowed.
 *
 * Both halves are pinned here: the phrasings that must now work, and the two
 * sentences that must still NOT be treated as a command. The second list is the
 * reason the rule is a clause boundary rather than a substring search.
 */
import { extractTechnicalMode, technicalModeCommand } from '../technicalMode';
describe('extract', () => {
  const cases: [string, string | null, string][] = [
    ['עבור למצב טכני', 'on', ''],
    ['עבור למצב טכני. אני רוצה למצוא עבודה חדשה', 'on', 'אני רוצה למצוא עבודה חדשה'],
    ['אני רוצה למצוא עבודה חדשה. עבור למצב טכני', 'on', 'אני רוצה למצוא עבודה חדשה'],
    ['עבור למצב טכני, ספר לי מה קורה', 'on', 'ספר לי מה קורה'],
    ['מצב טכני\nאני רוצה לרוץ', 'on', 'אני רוצה לרוץ'],
    ['צא ממצב טכני. תודה', 'off', 'תודה'],
    ['technical mode on. now help me', 'on', 'now help me'],
    ['exit technical mode', 'off', ''],
    ['I want to move into a more technical mode of working', null, 'I want to move into a more technical mode of working'],
    ['אני רוצה לעבור למצב טכני יותר בעבודה שלי', null, 'אני רוצה לעבור למצב טכני יותר בעבודה שלי'],
    ['', null, ''],
  ];
  it.each(cases)('%s', (input, command, rest) => {
    const out = extractTechnicalMode(input);
    expect(out.command).toBe(command);
    expect(out.rest).toBe(rest);
  });
  it('keeps the whole-message helper working', () => {
    expect(technicalModeCommand('עבור למצב טכני')).toBe('on');
    expect(technicalModeCommand('עבור למצב טכני. ועוד משהו')).toBeNull();
  });
});
