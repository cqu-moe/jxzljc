import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const file = new URL('../jxzljc.user.js', import.meta.url);
const theme = await readFile(new URL(import.meta.resolve('@cqu-moe/theme/styles.css')), 'utf8');
// Only scope selectors to the userscript's shadow host; never restyle the school page.
const scoped = theme.replace(/:root(\[[^\]]+\]|:not\([^)]*\))?/g, (_, qualifier) => qualifier ? `:host(${qualifier})` : ':host');
const block = `/* cqu-theme:start */\n${scoped.trim()}\n      /* cqu-theme:end */`;
const source = await readFile(file, 'utf8');
const marker = /\/\* cqu-theme:start \*\/[\s\S]*?\/\* cqu-theme:end \*\//;
assert(marker.test(source), 'Missing embedded theme markers');
const output = source.replace(marker, block);
if (process.argv.includes('--write')) await writeFile(file, output);
else assert.equal(source, output, 'Theme has changed: run npm run build and commit the userscript');
const styles = output.replace(marker, '').match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert(styles, 'Missing userscript styles');
assert(!/#(?:[\da-f]{3,8})\b|\b(?:oklch|oklab|rgb|rgba|hsl|hsla)\s*\(|transition\s*:\s*all/i.test(styles), 'Use shared semantic colors and explicit transitions');
const tokens = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
for (const match of styles.matchAll(/var\((--[\w-]+)/g)) assert(tokens.has(match[1]), `Unknown theme token: ${match[1]}`);
console.log('CQU theme embedded and semantic color checks passed; visual review is separate.');
