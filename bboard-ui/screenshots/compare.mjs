// Compares two screenshot folders made on the same machine (docs/screenshots.md):
//   node screenshots/compare.mjs <before folder> <after folder> [diff folder]
// Prints each picture that differs (size, or how many pixels), writes a red-on-grey diff
// picture for each into the diff folder (default <after folder>/diff), and exits 1 if any
// picture differs or is missing on one side.
// PNGs are read with the PNG decoder Playwright already ships, so nothing new is installed.
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const [before, after, diffArg] = process.argv.slice(2);
if (!before || !after) {
  console.error('usage: node screenshots/compare.mjs <before folder> <after folder> [diff folder]');
  process.exit(2);
}
const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle');
const diffDir = diffArg ?? path.join(after, 'diff');

const pngs = (d) => new Set(readdirSync(d).filter((f) => f.endsWith('.png')));
const a = pngs(before);
const b = pngs(after);
let bad = 0;
let same = 0;

for (const f of [...a].filter((f) => !b.has(f))) (bad++, console.log(`missing after:  ${f}`));
for (const f of [...b].filter((f) => !a.has(f))) (bad++, console.log(`new:            ${f}`));

for (const f of [...a].filter((f) => b.has(f)).sort()) {
  const x = readFileSync(path.join(before, f));
  const y = readFileSync(path.join(after, f));
  if (x.equals(y)) {
    same++;
    continue;
  }
  const p = PNG.sync.read(x);
  const q = PNG.sync.read(y);
  if (p.width !== q.width || p.height !== q.height) {
    bad++;
    console.log(`size differs:   ${f} ${p.width}x${p.height} -> ${q.width}x${q.height}`);
    continue;
  }
  const out = new PNG({ width: p.width, height: p.height });
  let n = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    const differs =
      p.data[i] !== q.data[i] ||
      p.data[i + 1] !== q.data[i + 1] ||
      p.data[i + 2] !== q.data[i + 2] ||
      p.data[i + 3] !== q.data[i + 3];
    const g = Math.round((p.data[i] + p.data[i + 1] + p.data[i + 2]) / 3 / 3 + 170);
    out.data[i] = differs ? 255 : g;
    out.data[i + 1] = differs ? 0 : g;
    out.data[i + 2] = differs ? 0 : g;
    out.data[i + 3] = 255;
    if (differs) n++;
  }
  if (n === 0) {
    same++;
    continue;
  }
  bad++;
  mkdirSync(diffDir, { recursive: true });
  writeFileSync(path.join(diffDir, f), PNG.sync.write(out));
  console.log(`pixels differ:  ${f} ${n} of ${p.width * p.height}`);
}

console.log(`${same} the same, ${bad} different or missing.`);
process.exit(bad ? 1 : 0);
