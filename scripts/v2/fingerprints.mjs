// Contract v2's published key table, docs/fingerprints-v2.md, read for the tools that check a
// v2 deployment against it: the deploy (bboard-cli/src/launcher/deploy-v2.ts), the deployment
// check (scripts/verify-deployment.mjs --v2-record) and the committee gate (scripts/committee/gate.mjs).
//
// The table is written by `npm run fingerprints -w contract-v2` on the maintainer's Mac and
// checked on a second machine (docs/runbooks/deploy-v2.md, steps 4 to 7). Its rows are
// `veilcore/keys/<circuit>.verifier` and `veilcore-claims/keys/<circuit>.verifier`, each with a
// SHA-256. Every v2 key goes in the V4 slot. v1's table (docs/fingerprints.md) is never used here.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED_CIRCUITS, parse } from '../../contract-v2/scripts/fingerprints.mjs';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FINGERPRINTS_V2 = path.join(ROOT, 'docs', 'fingerprints-v2.md');
export const V2_CONTRACTS = ['veilcore', 'veilcore-claims'];
/** The verifier-key slot (ContractOperationVersion) every v2 key goes in. */
export const V2_KEY_SLOT = 'v4';
export { EXPECTED_CIRCUITS };

const HEADER = /^Commit ([0-9a-f]{7,40}|unknown), compiler ([^ .]+(?:\.[0-9]+)*(?: \([^)]*\))?)\./;

/**
 * The table's verifier-key pins, per contract: circuit -> SHA-256. Throws, naming the problem,
 * when a contract has not exactly its expected number of circuits (24 and 5).
 */
export const parseFingerprintsV2 = (text) => {
  const rows = parse(String(text).replace(/\r/g, ''));
  const pins = { veilcore: {}, 'veilcore-claims': {} };
  for (const [p, h] of rows) {
    const m = /^(veilcore|veilcore-claims)\/keys\/([A-Za-z_][A-Za-z0-9_]*)\.verifier$/.exec(p);
    if (m) pins[m[1]][m[2]] = h;
  }
  for (const c of V2_CONTRACTS) {
    const n = Object.keys(pins[c]).length;
    if (n !== EXPECTED_CIRCUITS[c])
      throw new Error(`docs/fingerprints-v2.md lists ${n} verifier keys for ${c}; it must list ${EXPECTED_CIRCUITS[c]}.`);
  }
  let commit;
  let compiler;
  for (const l of String(text).split('\n')) {
    const h = HEADER.exec(l.trim());
    if (h) [commit, compiler] = [h[1], h[2]];
  }
  return { pins, commit, compiler };
};

/** docs/fingerprints-v2.md, read and checked, with the SHA-256 of the file itself. */
export const loadFingerprintsV2 = (file = FINGERPRINTS_V2) => {
  if (!existsSync(file))
    throw new Error(
      `${path.relative(ROOT, file) || file} is not in this checkout. It is added by its own PR after the keys are built ` +
        'on the Mac and rebuilt on a second machine (docs/runbooks/deploy-v2.md, step 7). Nothing can be checked ' +
        'against v2 keys before then.',
    );
  const text = readFileSync(file, 'utf8');
  return { ...parseFingerprintsV2(text), fileSha256: createHash('sha256').update(text).digest('hex') };
};

/**
 * The slot a verifier key's own bytes are for, from their header: compactc 0.31 keys say
 * "midnight:verifier-key[v6]:" (slot v3), 0.36 keys "midnight:verifier-key[v7]:" (slot v4).
 * The same rule as scripts/committee/core.mjs slotOfKeyBytes.
 */
export const slotOfKey = (vk) => {
  const m = /^midnight:verifier-key\[v(\d+)\]:/.exec(Buffer.from(vk.slice(0, 40)).toString('latin1'));
  return m?.[1] === '6' ? 'v3' : m?.[1] === '7' ? 'v4' : undefined;
};

export const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');
