// npm run check:site -- <url> [--manifest <file>]
//
// Check that a copy of the site serves exactly the files of a published release (CONTRACT.md
// #31), from your own computer, without trusting VeilCore: the site's /release.json names the
// network and commit; the manifest for that commit is read from THIS checkout of the public
// code (releases/<network>/<commit>.json; `git pull` first), or from --manifest; then every
// file it lists is fetched from the site and its SHA-256 compared.
//
// Exit 0: every file matches. 1: something differs or is missing. 2: nothing could be
// checked (no release list on the site, no manifest for that commit here, or the site
// couldn't be reached).
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allMatch, checkFiles, isManifest, manifestPath, readRelease } from './release-check.mjs';

/**
 * The whole check, for the command and for tests.
 * @returns {Promise<{ code: 0 | 1 | 2, lines: string[] }>}
 */
export const checkSite = async (url, { manifestFile, repoRoot = process.cwd(), fetchImpl = fetch } = {}) => {
  const lines = [];
  const site = String(url ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/?#]+$/.test(site)) return { code: 2, lines: ['Give the site’s address, such as https://veilcore.org.'] };
  const r = await readRelease(site, fetchImpl);
  if (!r.ok) return { code: 2, lines: [r.problem] };
  const { network, commit, date } = r.release;
  lines.push(`${site} says it is release ${commit} on ${network}, made ${date}.`);
  const file = manifestFile ?? join(repoRoot, manifestPath(network, commit));
  if (!existsSync(file))
    return {
      code: 2,
      lines: [
        ...lines,
        `No manifest for that release here: ${manifestPath(network, commit)} is not in this copy of the code. Run git pull and try again, or give one with --manifest <file>.`,
      ],
    };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    manifest = null;
  }
  if (!isManifest(manifest)) return { code: 2, lines: [...lines, `${file} is not a release manifest.`] };
  if (manifest.commit !== commit || manifest.network !== network)
    return {
      code: 1,
      lines: [...lines, `The manifest given is for release ${manifest.commit} on ${manifest.network}, not the one the site names.`],
    };
  if (manifest.uncommittedChanges)
    lines.push('Note: that release was built from a checkout with uncommitted changes, so its files are not exactly the published code at that commit.');
  const out = await checkFiles(site, manifest, { fetchImpl });
  if (allMatch(out)) {
    lines.push(`All ${out.total} files match the release’s published list.`);
    return { code: 0, lines };
  }
  lines.push(`${out.matched.length} of ${out.total} files match the release’s published list.`);
  for (const p of out.differ) lines.push(`  differs: ${p}`);
  for (const p of out.missing) lines.push(`  missing: ${p}`);
  return { code: 1, lines };
};

const main = async () => {
  const args = process.argv.slice(2);
  const at = args.indexOf('--manifest');
  const manifestFile = at >= 0 ? args[at + 1] : undefined;
  const url = args.find((a, i) => !a.startsWith('--') && !(at >= 0 && i === at + 1));
  if (!url) {
    console.error('usage: npm run check:site -- <the site’s address> [--manifest <file>]');
    process.exit(2);
  }
  const { code, lines } = await checkSite(url, { manifestFile });
  for (const l of lines) console.log(l);
  process.exit(code);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
