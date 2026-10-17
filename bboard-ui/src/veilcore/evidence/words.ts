// The words the evidence bundle's files share: dates in UTC, network names, the steps to
// date a record on Midnight and Bitcoin (the same, word for word, as verify.html says them:
// verify-core.js midnightSteps and bitcoinSteps; bundle.test.ts compares the two), and
// line wrapping for plain text. Used by README.txt, EXAMINER-SUMMARY.html and
// DECLARATION-TEMPLATE.txt so the three can't say different things.
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isString } from '../json';

const NETWORK_WORDS: Record<string, string> = {
  mainnet: "Midnight's main network",
  preprod: 'Midnight preprod (a test network)',
  preview: 'Midnight Preview (a test network)',
};
export const networkWords = (n: unknown): string =>
  (isString(n) && NETWORK_WORDS[n]) || `the Midnight network "${String(n)}"`;

/** The explorers verify.html names (verify-core.js EXPLORERS), by network. */
const EXPLORERS: Record<string, string> = {
  mainnet: 'https://midnightexplorer.com/',
  preprod: 'https://preprod.midnightexplorer.com/',
  preview: 'https://preview.midnightexplorer.com/',
};

/** "2026-10-15 11:00 UTC", as verify.html prints it; null for no time. */
export const utcWords = (t: unknown): string | null => {
  if (!isString(t) && !isNumber(t)) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const i = d.toISOString();
  return `${i.slice(0, 10)} ${i.slice(11, 16)} UTC`;
};

/** One anchor to look up, as verify.html's lookups() reads it from evidence.json. */
export type AnchorLookup = {
  readonly network: string;
  readonly txHash: string;
  readonly contractAddress: string | null;
  readonly blockHeight: number | null;
  readonly anchoredAt: string | null;
  readonly explorer: string | null;
  readonly root: string;
};

export const anchorLookup = (a: Record<string, unknown>, root: string): AnchorLookup | null =>
  isString(a.txHash)
    ? {
        network: isString(a.network) ? a.network : 'unknown',
        txHash: a.txHash,
        contractAddress: isString(a.contractAddress) ? a.contractAddress : null,
        blockHeight: isNumber(a.blockHeight) ? a.blockHeight : null,
        anchoredAt: isString(a.anchoredAt) ? a.anchoredAt : null,
        explorer: (isString(a.network) && EXPLORERS[a.network]) || null,
        root,
      }
    : null;

/**
 * The steps to date the record on Midnight: the same steps, in the same words, as
 * verify.html (verify-core.js midnightSteps; bundle.test.ts compares the two), in plain
 * ASCII for any text reader.
 */
export const midnightSteps = (a: AnchorLookup): string[] => {
  const when = utcWords(a.anchoredAt);
  const block = a.blockHeight !== null;
  return [
    a.explorer
      ? `Open the Midnight explorer for ${networkWords(a.network)}: ${a.explorer} (type the address in yourself).`
      : `Open a Midnight explorer for ${networkWords(a.network)}.`,
    `Search for transaction ${a.txHash}.` +
      (block || when
        ? ` VeilCore's registry reports it is${block ? ` in block ${a.blockHeight}` : ''}${when ? `${block ? ',' : ''} at ${when}` : ''}; the explorer's own block and time are the ones to rely on.`
        : ''),
    `Check that the transaction succeeded and that it called VeilCore's contract ${a.contractAddress ?? "(the bundle doesn't name it)"}. Note its block and time: that time is the date.`,
    `Check that it wrote this batch root: ${a.root}. The batch root is one code that stands for every record in the batch; this record's proof leads to it.`,
    `The explorer may not show the batch root in plain text: it sits inside the contract's state after the call. If you can't see it there, read that state from a Midnight indexer yourself (README.txt, "For technical readers", says how), or open this record's check page on VeilCore's site, which does that look-up in your own browser.`,
    `If the transaction succeeded, called that contract and wrote that root, this record existed, unchanged, by that transaction's time: whoever had it sealed held this record by then. If any of it doesn't match, nothing here dates the record.`,
  ];
};

/** The Bitcoin stamp's steps, as verify.html says them (verify-core.js bitcoinSteps). */
export const bitcoinSteps = (pending: boolean): string[] => [
  'The batch root was also stamped on Bitcoin with OpenTimestamps. The stamp file is proof/root.bin.ots; the file it stamps is proof/root.bin (the batch root as 32 bytes).',
  'Easiest: on opentimestamps.org, drop in root.bin.ots and then root.bin.',
  'Or with the official OpenTimestamps client, in the proof folder: ots verify root.bin.ots' +
    (pending ? ' (run ots upgrade root.bin.ots first; that needs the internet once).' : '.'),
];

/**
 * Text someone else typed (a plant's name, a signer's name, a lab's notes), made safe to put
 * on one line of README.txt, the examiner summary or the declaration (round 2 of the 15 Oct
 * review): every control or format character (line breaks, tabs, direction marks such as
 * U+202E, zero-width characters) and line or paragraph separator becomes a space, and runs
 * of spaces one. A line break in a lab's notes used to start a paragraph of its own in the
 * declaration, and a direction mark reversed the text after it.
 */
export const oneLine = (v: unknown): string =>
  String(v)
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

export const wrap = (text: string, width = 78): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.length <= width) return line;
      const indent = /^\s*(- |\d+\. |[a-z]\. )?/.exec(line)?.[0].replace(/[^ ]/g, ' ') ?? '';
      // The line's own leading spaces stay on its first line (an indented step keeps its indent).
      const lead = /^ */.exec(line)?.[0] ?? '';
      const words = line.slice(lead.length).split(' ');
      const lines: string[] = [];
      let cur = lead;
      for (const w of words) {
        if (cur.trim() && (cur + ' ' + w).length > width) {
          lines.push(cur);
          cur = indent + w;
        } else cur = cur.trim() ? `${cur} ${w}` : `${cur}${w}`;
      }
      if (cur) lines.push(cur);
      return lines.join('\n');
    })
    .join('\n');

/**
 * What the sealed fields describe: 'animal' for a record sealed under the animal profile
 * (veilcore/animal-profile.ts), else 'plant'. The bundle's files say "this animal" where a
 * plant's say "this plant"; nothing else about them changes.
 */
export const subjectOf = (fields: unknown): 'plant' | 'animal' =>
  typeof fields === 'object' &&
  fields !== null &&
  (fields as Record<string, unknown>).profile === 'veilcore/profile/animal-individual/v1'
    ? 'animal'
    : 'plant';

/** The record's name as sealed: a plant's name, or an animal's name or individual ID; else ''. */
export const sealedNameOf = (fields: unknown): string => {
  if (typeof fields !== 'object' || fields === null) return '';
  const f = fields as Record<string, unknown>;
  for (const k of ['strainName', 'name', 'individualId']) if (isString(f[k]) && f[k]) return f[k];
  return '';
};
