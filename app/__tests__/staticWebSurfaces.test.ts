/**
 * A guard for the two static web surfaces — the operations console and the
 * Journey Studio.
 *
 * WHY THIS EXISTS. The studio shipped with no `<script type="module">` tag at
 * all. Every module was correct, every unit test passed, and the page rendered
 * perfectly in a browser — because it was verified by importing the view modules
 * by hand from the console and calling them, which is exactly the step a real
 * visitor does not perform. The page as a VISITOR loads it was never opened. It
 * deployed, and the sign-in button did nothing.
 *
 * These sites have no bundler, so nothing resolves an import path or a script
 * src until a browser does. That is the trade for having no build step, and this
 * is the price of it: the wiring gets checked here instead.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const APP = resolve(__dirname, '..');
const SITES = ['console', 'creator'];

/** `src="…"` / `href="…"` that point at a file in the site rather than at a URL. */
function localRefs(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('mailto:')) continue;
    out.push(ref);
  }
  return out;
}

/** Relative `import … from '…'` specifiers in an ES module. */
function localImports(js: string): string[] {
  const out: string[] = [];
  for (const m of js.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) out.push(m[1]);
  for (const m of js.matchAll(/\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return out;
}

function jsFilesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return jsFilesUnder(full);
    return full.endsWith('.js') ? [full] : [];
  });
}

describe.each(SITES)('%s', (site) => {
  const root = join(APP, site);
  const html = readFileSync(join(root, 'index.html'), 'utf8');

  it('loads an entry module — the tag that was missing', () => {
    const entry = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
    expect(entry).not.toBeNull();
    expect(existsSync(join(root, entry![1]))).toBe(true);
  });

  it('loads its configuration before the entry module', () => {
    // config.js defines the global the entry module reads on its first line. If
    // it came after, the site would fail only in production, where the file is
    // real and the timing is not the dev server's.
    const configAt = html.indexOf('src="config.js"');
    const entryAt = html.search(/<script[^>]*type="module"/);
    expect(configAt).toBeGreaterThan(-1);
    expect(configAt).toBeLessThan(entryAt);
  });

  it('ships a config.example.js, since config.js itself is never committed', () => {
    expect(existsSync(join(root, 'config.example.js'))).toBe(true);
  });

  it('points every local src/href at a file that exists', () => {
    const missing = localRefs(html).filter((ref) => !existsSync(join(root, ref)));
    expect(missing).toEqual([]);
  });

  it('resolves every relative import in every module', () => {
    const broken: string[] = [];
    for (const file of jsFilesUnder(join(root, 'src'))) {
      for (const spec of localImports(readFileSync(file, 'utf8'))) {
        // The browser resolves these literally: no extension guessing, no index
        // lookup. So does this.
        if (!existsSync(resolve(dirname(file), spec))) broken.push(`${file} → ${spec}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('makes no request to a third-party origin', () => {
    // The whole trust argument for these pages is that every request goes to the
    // project's own Supabase. A CDN script tag would quietly end that.
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\//);
    expect(html).not.toMatch(/<link[^>]+href="https?:\/\//);
  });
});
