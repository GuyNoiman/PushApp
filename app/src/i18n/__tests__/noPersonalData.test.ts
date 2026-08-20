/**
 * NOBODY'S NAME BUT THE USER'S — a guard on every shipped string.
 *
 * THE BUG THIS EXISTS BECAUSE OF (2026-08-20): the coach's opening line was
 * *"Hi Guy, how can I help you today?"* in English and the same with **גיא** in Hebrew. The
 * founder's own name had been written into the copy during development and shipped. The partner
 * opened the app on his iPad, was greeted by somebody else's name in his own language, and reported
 * that the app was full of a stranger's things. He was right.
 *
 * A name in copy is invisible to every other test in this repo: it renders, it translates, it passes
 * i18n parity. The only thing that catches it is a rule that says whose names may appear at all —
 * and the answer is nobody's. A real user's name reaches the screen through interpolation, at
 * runtime, from their own profile.
 *
 * The list below is the DEVELOPMENT identities that could plausibly leak: the founder's name in both
 * scripts, his handles and his address. Add to it when a new person works on the app; never add a
 * user's data to it.
 */
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES = path.join(__dirname, '..', 'resources');

/** Development identities that must never appear in shipped copy. */
const FORBIDDEN: readonly { pattern: RegExp; what: string }[] = [
  { pattern: /\bguynoiman\b/i, what: "the founder's handle" },
  { pattern: /guynoiman3@gmail\.com/i, what: "the founder's email" },
  { pattern: /גיא/, what: "the founder's given name (Hebrew)" },
  // English "Guy" is a real word, so this looks for it as a NAME: greeted, addressed or possessive.
  { pattern: /\b(hi|hey|hello|dear)[, ]+guy\b/i, what: "the founder's given name (English)" },
  { pattern: /\bguy['’]s\b/i, what: "the founder's given name (English, possessive)" },
];

function resourceFiles(): string[] {
  const out: string[] = [];
  for (const lang of fs.readdirSync(RESOURCES)) {
    const dir = path.join(RESOURCES, lang);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.json')) out.push(path.join(dir, file));
    }
  }
  return out;
}

describe('shipped copy carries nobody’s personal data', () => {
  const files = resourceFiles();

  it('finds resource files to check at all (a silent empty sweep would prove nothing)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN)('never contains $what', ({ pattern }) => {
    const offenders = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8')));
    expect(offenders.map((f) => path.relative(RESOURCES, f))).toEqual([]);
  });
});
