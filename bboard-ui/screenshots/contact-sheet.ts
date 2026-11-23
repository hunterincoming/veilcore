// After the screenshot run: index.html in the same folder, one row per page and one column per
// language and width, each picture linking to its full size. Pages that redirect say where they
// landed; pages that need a record are listed as skipped.
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LANGS, VIEWPORTS, shotName, shotsDir } from './shots';

type Meta = { route: string; path: string; lang: string; viewport: string; landed: string; title: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export default function contactSheet(): void {
  const dir = shotsDir();
  if (!existsSync(dir)) return;
  const metas = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'skipped.json')
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Meta);
  const paths = [...new Set(metas.map((m) => m.path))].sort();
  const skipped = existsSync(path.join(dir, 'skipped.json'))
    ? (JSON.parse(readFileSync(path.join(dir, 'skipped.json'), 'utf8')) as string[])
    : [];
  let commit = '';
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout */
  }
  const cols = LANGS.flatMap(({ lang }) => Object.keys(VIEWPORTS).map((vp) => ({ lang, vp })));

  const rows = paths.map((p) => {
    const first = metas.find((m) => m.path === p)!;
    const note = first.landed !== p ? ` <small>goes to ${esc(first.landed)}</small>` : '';
    const cells = cols.map(({ lang, vp }) => {
      const f = shotName(lang, vp, p);
      return existsSync(path.join(dir, f))
        ? `<td><a href="${esc(f)}"><img loading="lazy" src="${esc(f)}" alt="${esc(`${p} ${lang} ${vp}`)}"></a></td>`
        : '<td class="none">not taken</td>';
    });
    return `<tr><th><code>${esc(p)}</code>${note}<br><small>${esc(first.title)}</small></th>${cells.join('')}</tr>`;
  });

  writeFileSync(
    path.join(dir, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page screenshots</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#fff;color:#111}
table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
th{width:180px}td img{width:180px;display:block}td.none{color:#999}small{color:#555}
thead th{position:sticky;top:0;background:#f3f3f3}
</style></head><body>
<h1>Page screenshots</h1>
<p>${paths.length} pages, ${metas.length} pictures${commit ? `, commit <code>${esc(commit)}</code>` : ''}, ${esc(new Date().toISOString())}. Click a picture for full size.</p>
<table><thead><tr><th>Page</th>${cols.map(({ lang, vp }) => `<th>${lang} ${vp}</th>`).join('')}</tr></thead>
<tbody>${rows.join('\n')}</tbody></table>
${skipped.length ? `<p>Skipped (need a record or licence): ${skipped.map((s) => `<code>${esc(s)}</code>`).join(', ')}</p>` : ''}
</body></html>
`,
  );
  console.log(`Contact sheet: ${path.join(dir, 'index.html')}`);
}
