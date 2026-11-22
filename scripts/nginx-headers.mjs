// For a copy served by nginx instead of Vercel (docs/SELF-HOSTING.md): the same headers and routes
// scripts/vercel-config.mjs wrote to .vercel/output/config.json, as nginx `location` blocks.
//
//   node scripts/vercel-config.mjs                 # first, in the shell the site was built in
//   node scripts/nginx-headers.mjs > veilcore-site.conf
//
// Then `include` the file inside your `server { … }` block, after setting `root` to the folder
// holding .vercel/output/static. Every page gets the site's headers (Content-Security-Policy
// included), the two Ask model workers get their own Content-Security-Policy, /sw.js is never
// cached, /tools/passkey-check serves its .html file, and any other path that is not a file
// serves /index.html. nginx's `add_header` in a location replaces the ones above it, so each
// block carries its whole set.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SITE_ROUTE_SRC, modelWorkerRouteSrc } from './ask-model-csp.mjs';
import { SW_ROUTE_SRC } from './release-check.mjs';

const quote = (v) => {
  if (/["\\\n\r]/.test(v)) throw new Error(`A header value nginx can't quote: ${v}`);
  return `"${v}"`;
};
const headerLines = (h, pad) =>
  Object.entries(h)
    .map(([k, v]) => `${pad}add_header ${k} ${quote(String(v))} always;`)
    .join('\n');

/** nginx configuration text for Vercel Build Output routes (config.json `routes`). */
export const nginxConf = (routes) => {
  const by = (src) => routes.find((r) => r.src === src)?.headers;
  const site = by(SITE_ROUTE_SRC);
  const sw = by(SW_ROUTE_SRC);
  const download = by(modelWorkerRouteSrc('download'));
  const engine = by(modelWorkerRouteSrc('engine'));
  const passkey = routes.find((r) => r.src === '^/tools/passkey-check$');
  if (!site || !sw || !download || !engine || !passkey)
    throw new Error('.vercel/output/config.json does not have the routes scripts/vercel-config.mjs writes. Run it again first.');
  const block = (match, headers, tryFiles) =>
    `location ${match} {\n${headerLines(headers, '  ')}\n  try_files ${tryFiles};\n}`;
  return [
    '# Written by scripts/nginx-headers.mjs from .vercel/output/config.json. Do not edit by hand:',
    '# build again, run scripts/vercel-config.mjs, then this.',
    block(`~ ${modelWorkerRouteSrc('download')}`, download, '$uri =404'),
    block(`~ ${modelWorkerRouteSrc('engine')}`, engine, '$uri =404'),
    block('= /sw.js', { ...site, ...sw }, '$uri =404'),
    block('= /tools/passkey-check', site, `${passkey.dest} =404`),
    block('/', site, '$uri /index.html'),
    '',
  ].join('\n\n');
};

const main = () => {
  const config = JSON.parse(readFileSync('.vercel/output/config.json', 'utf8'));
  process.stdout.write(nginxConf(config.routes ?? []));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
