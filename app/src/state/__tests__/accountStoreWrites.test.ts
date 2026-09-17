/**
 * Every React-side store writes through `writeAccountStore`, or is on a short list of stores that
 * belong to the phone.
 *
 * WHY A SCAN (2026-09-17). Between the wipe that a switch of account or a deletion runs and the
 * restart that follows it, the account stores are held (`accountStoreWrites.ts`), because they still
 * hold the account that left in memory. A store that wrote AsyncStorage directly would step around
 * that hold without anybody noticing, and could write the last person's data back for the next one.
 * So this reads the source of the React layer (state, hooks, components, screens) and fails for any
 * direct write that is not on the list below.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../..');
const REACT_LAYER = ['state', 'hooks', 'components', 'app'];

/**
 * Files allowed to write AsyncStorage directly, each for a reason:
 *  · the hold itself;
 *  · language and theme belong to the phone and are kept across a switch;
 *  · which over-the-air update this phone has announced is a fact about the installed app.
 */
const DIRECT_WRITERS_ALLOWED = [
  'state/accountStoreWrites.ts',
  'state/LanguagePreference.tsx',
  'state/ThemePreference.tsx',
  'components/home/UpdateAppliedNotice.tsx',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe('account stores write through the hold', () => {
  const files = REACT_LAYER.flatMap((dir) => sourceFiles(join(SRC, dir)));
  const directWriters = files
    .filter((file) => /AsyncStorage\s*\.\s*(setItem|multiSet|mergeItem|multiMerge)\s*\(/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file).split('\\').join('/'))
    .sort();

  it('finds the stores it is supposed to be guarding (the scan itself works)', () => {
    const usingTheHold = files.filter((file) => readFileSync(file, 'utf8').includes('writeAccountStore('));
    expect(usingTheHold.length).toBeGreaterThanOrEqual(10);
    expect(directWriters).toEqual(expect.arrayContaining(['state/LanguagePreference.tsx']));
  });

  it('has no direct AsyncStorage write outside the phone-owned stores', () => {
    // A failure here names the file. If what it stores belongs to the account, write through
    // `writeAccountStore` (state/accountStoreWrites.ts); if it belongs to the phone, add it above, with why.
    expect(directWriters.filter((file) => !DIRECT_WRITERS_ALLOWED.includes(file))).toEqual([]);
  });
});
