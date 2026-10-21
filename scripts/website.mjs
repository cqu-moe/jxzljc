import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const dist = new URL('website/dist/', root);
const theme = await readFile(new URL(import.meta.resolve('@cqu-moe/theme/styles.css')), 'utf8');
const css = await readFile(new URL('website/public/style.css', root), 'utf8');
assert(!/#(?:[\da-f]{3,8})\b|\b(?:oklch|oklab|rgb|rgba|hsl|hsla)\s*\(|transition\s*:\s*all/i.test(css), 'Use CQU semantic colors and explicit transitions');
const tokens = new Set([...`${theme}\n${css}`.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) assert(tokens.has(token), `Unknown theme token: ${token}`);
if (!process.argv.includes('--check')) {
  const script = await readFile(new URL('jxzljc.user.js', root), 'utf8');
  const version = script.match(/^\/\/ @version\s+(\S+)/m)?.[1];
  assert(version, 'Userscript version is missing');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(new URL('website/public/', root), dist, { recursive: true });
  const html = (await readFile(new URL('website/index.html', root), 'utf8')).replaceAll('{{version}}', version);
  assert(!html.includes('{{'), 'Unresolved page placeholder');
  await writeFile(new URL('index.html', dist), html);
  await writeFile(new URL('theme.css', dist), theme);
  await writeFile(new URL('jxzljc.user.js', dist), script);
  // Reuse the shipped UI with isolated window, draft storage and request boundaries.
  await writeFile(new URL('demo-userscript.js', dist), `function mountEvaluationDemo(fetch) {\nconst window = { top: null, self: null };\nconst localStorage = { getItem: () => null };\n${script}\n}\n`);
  console.log(`Static website built at ${fileURLToPath(dist)}`);
}
console.log('Website CQU theme tokens and semantic colors verified.');
