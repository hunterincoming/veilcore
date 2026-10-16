// EXAMINER-SUMMARY.html for the evidence bundle: a printable summary for a lawyer, an
// examiner or a court clerk, with the record as sealed, its identifiers, how it was
// checked, the lab signatures and sample receipts, the Bitcoin stamp, and what it shows
// and doesn't (docs/evidence-bundle.md, docs/evidence-in-practice.md).
//
// Text only. The page has no script at all, loads nothing and links nowhere: its
// Content-Security-Policy forbids scripts and every request, and every value in it is
// HTML-escaped here, so a plant's name or a lab's can never become markup. It is a
// printout of what the VeilCore site found when it made the bundle; it checks nothing when
// opened. verify.html, next to it, does the checks.
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isObject, isString } from '../json';
import type { Evidence, SignatureLine } from './bundle';
import { anchorLookup, bitcoinSteps, midnightSteps, networkWords, oneLine, utcWords } from './words';

export const EXAMINER_FILE = 'EXAMINER-SUMMARY.html';

/**
 * Every character that could start markup or end an attribute, as an entity; and every
 * control or format character (a direction mark such as U+202E reorders the text after it,
 * even in HTML) and line or paragraph separator as a space (round 2 of the 15 Oct review).
 */
export const escapeHtml = (v: unknown): string =>
  String(v)
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ')
    .replace(/[&<>"'`]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The sealed fields in plain words, in the order verify.html shows them. */
const FIELD_LABELS: [string, string][] = [
  ['strainName', 'Plant name'],
  ['bredBy', 'Bred by'],
  ['dateCreated', 'Stated date'],
  ['parents', 'Parents'],
  ['breedingMethod', 'Breeding method'],
  ['taxon', 'Species'],
  ['refId', 'Lot or reference'],
  ['notes', 'Notes'],
  ['photoFingerprints', 'Photos'],
  ['profile', 'Kind of record'],
  ['loggedAt', 'Sealed at (the breeder’s device clock)'],
  ['keyBinding', 'Names a key'],
  ['nonce', 'Random salt (keeps the fingerprint unguessable)'],
];

/** What a record that names its key says about it, here and in verify.html (word for word). */
export const KEY_NAMED =
  'Yes. The record names a key; the key itself is in this bundle only if the holder included it.';

/** One sealed field as text, as verify.html says it (fieldText there). */
export const fieldText = (key: string, v: unknown): string => {
  if (v === '' || v === null || v === undefined) return '(empty)';
  if (key === 'parents' && Array.isArray(v)) {
    if (v.length === 0) return '(none)';
    return v
      .map((p) => {
        if (!isObject(p)) return String(p);
        const name = isString(p.name) && p.name ? p.name : '(no name)';
        return isString(p.recordId) && p.recordId ? `${name} (record ${p.recordId})` : name;
      })
      .join('; ');
  }
  if (key === 'photoFingerprints' && Array.isArray(v)) {
    return v.length === 0
      ? '(none)'
      : `${v.length} photo${v.length === 1 ? '' : 's'}, sealed by fingerprint: ${v.map(String).join(', ')}`;
  }
  if (key === 'loggedAt' && isNumber(v)) return `${utcWords(v) ?? String(v)} (the breeder’s word only)`;
  // The same words as verify.html (its fieldText): the record names a key; whether the key
  // itself is here depends on the holder (round 2 of the 15 Oct review: "Yes: 4bcad…" read as
  // the key being in the bundle, beside verify.html saying it wasn't).
  if (key === 'keyBinding' && isString(v)) return `${KEY_NAMED} Key binding: ${v}`;
  if (isString(v)) return v;
  return JSON.stringify(v);
};

const sealedRows = (fields: Record<string, unknown>): [string, string][] => {
  const rows: [string, string][] = [];
  const seen = new Set<string>();
  for (const [k, label] of FIELD_LABELS) {
    seen.add(k);
    if (Object.prototype.hasOwnProperty.call(fields, k)) rows.push([label, fieldText(k, fields[k])]);
  }
  for (const k of Object.keys(fields).sort()) if (!seen.has(k)) rows.push([k, fieldText(k, fields[k])]);
  return rows;
};

/** A table of label/value rows; values are text, long hex wraps anywhere. */
const table = (rows: readonly (readonly [string, string | null | undefined])[], cls = ''): string =>
  `<table${cls ? ` class="${cls}"` : ''}><tbody>${rows
    .filter((r) => r[1] !== null && r[1] !== undefined && r[1] !== '')
    .map(
      ([k, v]) =>
        `<tr><th scope="row">${escapeHtml(k)}</th><td${/^[0-9a-f]{64}$/.test(String(v)) ? ' class="hex"' : ''}>${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</tbody></table>`;

const list = (items: readonly string[], ordered = false): string =>
  `<${ordered ? 'ol' : 'ul'}>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;

const p = (text: string, cls = ''): string => `<p${cls ? ` class="${cls}"` : ''}>${escapeHtml(text)}</p>`;

/** The sample details' fields in plain words (transfers.ts SampleDetails, ArrivalDetails). */
export const CUSTODY_LABELS: Record<string, string> = {
  sampleId: 'Sample ID',
  sealNumber: 'Seal number',
  takenFrom: 'Taken from',
  takenOn: 'Taken on',
  witness: 'Witness (VeilCore doesn’t check this)',
  sealIntact: 'Seal on arrival',
  arrivedOn: 'Arrived on',
  condition: 'Condition',
  labRef: 'Lab number',
};
export const SEAL_WORDS: Record<string, string> = { yes: 'intact', no: 'not intact', 'no-seal': 'no seal' };

const custodyRows = (side: string, d: Readonly<Record<string, unknown>>): [string, string][] =>
  Object.keys(d)
    .filter((k) => isString(d[k]) && d[k] !== '')
    .sort((a, b) => {
      const order = Object.keys(CUSTODY_LABELS);
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    })
    .map((k) => [
      `${side}: ${CUSTODY_LABELS[k] ?? k}`,
      k === 'sealIntact' ? (SEAL_WORDS[String(d[k])] ?? String(d[k])) : String(d[k]),
    ]);

/** Whether the receipt's signature covers a delivery's details, in the summary's words. */
export const coveredWords = (c: {
  covered: string;
  received?: boolean;
  receiptAttestationId: string | null;
}): string =>
  c.received === false
    ? 'No: the lab code was never used'
    : c.covered === 'covered'
      ? 'Yes: the receipt’s signature covers these details. Checked in the holder’s browser when the bundle was made; verify.html, in this folder, rechecks it offline.'
      : c.covered === 'changed'
        ? 'No: the lab changed its arrival details after signing. verify.html, in this folder, rechecks this offline.'
        : c.covered === 'unsigned'
          ? c.receiptAttestationId
            ? 'No: the receipt’s signature in this bundle doesn’t check, or its signer withdrew it'
            : 'No: no receipt was signed for this delivery'
          : 'No: the receipt was signed before receipts covered sample details. verify.html, in this folder, rechecks this offline.';

/** The deliveries and what was written about each sample, when the bundle has them (Evidence.custody). */
const custodySection = (ev: Evidence): string => {
  const items = ev.custody ?? [];
  if (!items.length) return '';
  const out: string[] = ['<h3>Deliveries and sample receipts: what was written about the sample</h3>'];
  for (const c of items) {
    const covered = c.covered === 'covered';
    const anything = Object.keys(c.sample).length > 0 || Object.keys(c.arrival).length > 0;
    const rows: [string, string | null][] = [
      ['Delivery', c.transferId],
      ['Lab code used', c.received === undefined ? null : c.received ? 'Yes' : 'No: nobody used it'],
      ['Receipt signature', c.receiptAttestationId ?? '(no receipt signed)'],
      ['Covered by the lab’s signature', coveredWords(c)],
      ['Sample details', anything ? null : 'None written'],
      ...custodyRows('Sent', c.sample),
      // What the lab wrote, labelled as not covered unless the signature covers it.
      ...custodyRows(covered ? 'Received' : 'Received (not covered by the lab’s signature)', c.arrival),
    ];
    out.push(`<div class="custody" data-custody="${escapeHtml(c.covered)}">${table(rows)}</div>`);
    if (c.differences.length) out.push(list(c.differences));
    else if (covered) {
      const matched = [
        c.sample.sampleId && c.arrival.sampleId ? 'Sample ID' : null,
        c.sample.sealNumber && c.arrival.sealNumber ? 'seal number' : null,
      ].filter((x): x is string => !!x);
      if (matched.length) out.push(p(`${matched.join(' and ').replace(/^s/, 'S')} match what was sent.`));
    }
  }
  out.push(
    p(
      'These are what the breeder and the lab each typed. VeilCore doesn’t check them, and nothing here shows they are true.',
      'muted',
    ),
  );
  return out.join('');
};

/**
 * The page. `sigs` are the lab signatures as the holder's browser checked them when the
 * bundle was made; `hasOts`, whether the bundle has the Bitcoin stamp file.
 */
export const examinerSummaryHtml = (ev: Evidence, sigs: readonly SignatureLine[], hasOts: boolean): string => {
  const fields = ev.record.sealedFields;
  const name = isString(fields.strainName) && fields.strainName ? oneLine(fields.strainName) : ev.record.id;
  const anchor = ev.batch?.anchor ?? null;
  const tx = anchor && isString(anchor.txHash) ? anchor.txHash : null;
  const test = anchor ? anchor.network !== 'mainnet' : true;
  const lookup = ev.batch && anchor ? anchorLookup(anchor, ev.batch.root) : null;
  const ots = ev.batch && hasOts ? ev.batch.opentimestamps : null;
  const made = utcWords(ev.createdAt) ?? ev.createdAt;
  const keyBound = isString(fields.keyBinding);

  const banner = test
    ? anchor
      ? `Practice data. This record is dated on ${networkWords(anchor.network)}. A test network can be reset and its dates carry no weight.`
      : 'This record is not dated on any network yet. Until it is, nothing here dates it.'
    : null;

  // How it was checked: what the site did when it made the bundle, and what it did not do.
  const checked: string[] = [
    `The record’s fingerprint was worked out again from the sealed fields below and matched${keyBound ? ' (with the record’s key binding folded in)' : ''}. The bundle can’t be made if it doesn’t.`,
    ev.proof && ev.batch
      ? `The proof leads from the record’s fingerprint to the root of batch ${ev.batch.batchId}. The batch root is one fingerprint that stands for every record in the batch.`
      : 'The record is not in a batch yet, so there is no proof and nothing to look up.',
  ];
  if (ev.key) checked.push('The record’s key is in the bundle and matches the key the record names.');
  const okSigs = sigs.filter((s) => s.ok).length;
  if (sigs.length)
    checked.push(
      `${okSigs} of ${sigs.length} lab signature${sigs.length === 1 ? '' : 's'} checked (Ed25519).${okSigs < sigs.length ? ' The others do not check and should be ignored.' : ''}`,
    );
  checked.push(
    tx
      ? 'Not checked for you: the Midnight transaction. VeilCore’s registry reported it; nobody has looked it up on the chain for you. The steps below say how.'
      : 'There is no Midnight transaction to look up yet.',
  );
  if (ots)
    checked.push(
      'Not checked for you: the Bitcoin block. The stamp file is in the bundle; verify.html reads it, and the steps below say how to check it against Bitcoin.',
    );

  const ids: [string, string | null][] = [
    ['Record ID', ev.record.id],
    ['Fingerprint', ev.record.fingerprint],
    ['How the fingerprint is made', ev.record.fingerprintAlgorithm],
    ['Content hash (SHA-256 of the sealed fields)', ev.record.contentHash],
    ['Batch', ev.batch?.batchId ?? 'not in a batch yet'],
    ['Batch root', ev.batch?.root ?? null],
    ['Batch sealed by the registry at', ev.batch?.sealedAt ? (utcWords(ev.batch.sealedAt) ?? ev.batch.sealedAt) : null],
    ['Network', anchor ? networkWords(anchor.network) : 'not recorded on a network yet'],
    ['Contract', anchor && isString(anchor.contractAddress) ? anchor.contractAddress : null],
    ['Transaction', tx],
    ['Block (as the registry reported it)', anchor && isNumber(anchor.blockHeight) ? String(anchor.blockHeight) : null],
    ['Time (as the registry reported it)', anchor ? utcWords(anchor.anchoredAt) : null],
    [
      'Registry first saw the record',
      ev.registry.firstSeen
        ? `${utcWords(ev.registry.firstSeen) ?? ev.registry.firstSeen} (the registry’s own clock, its word only)`
        : null,
    ],
  ];
  for (const a of ev.batch?.earlierAnchors ?? []) {
    ids.push([
      'Recorded earlier on',
      `${networkWords(a.network)}, transaction ${String(a.txHash)} (a later one took its place)`,
    ]);
  }

  const bitcoinRows: [string, string | null][] = ots
    ? [
        [
          'Status the registry reported',
          ots.status === 'bitcoin'
            ? `In Bitcoin block ${isNumber(ots.bitcoinBlockHeight) ? ots.bitcoinBlockHeight : '(not given)'}`
            : 'Pending: not yet in a Bitcoin block',
        ],
        [
          'Block time (as reported)',
          ots.bitcoinBlockTime ? (utcWords(ots.bitcoinBlockTime) ?? ots.bitcoinBlockTime) : null,
        ],
        ['Stamp file', 'proof/root.bin.ots, over proof/root.bin (the batch root as 32 bytes)'],
      ]
    : [];

  const lab = ev.labReport;
  const labRows: [string, string | null][] = lab
    ? [
        ['Lab report SHA-256', lab.fileSha256 ?? '(not kept for this older pairing)'],
        ['Pairing fingerprint', lab.pairingFingerprint],
        ['File name', lab.fileName ?? null],
        [
          'Saved to the plant at',
          lab.pairedAt ? `${utcWords(lab.pairedAt) ?? lab.pairedAt} (the holder’s device clock)` : null,
        ],
        ['File in this bundle', lab.fileIncluded ?? 'No: only its fingerprint'],
      ]
    : [];

  const sigBlocks = sigs.map((s) => {
    if (!s.ok) return `<div class="sig bad">${p(s.text)}</div>`;
    const rows: [string, string | null][] = [
      ['What was signed', `${s.what ?? s.type ?? ''}${s.savedReport ? ' (the lab report saved to this plant)' : ''}`],
      ['Signing key', s.publicKey ?? null],
      ['Name it gives itself', s.displayName ? `${s.displayName} (not checked)` : null],
      [
        s.type === 'chain-of-custody'
          ? 'Signed fingerprint (the lab’s record of the delivery, not the sample)'
          : 'Document SHA-256',
        s.documentHash ?? null,
      ],
      ['Signed at', s.issuedAt ? `${s.issuedAt} (the signer’s own clock)` : null],
      ['Signature ID', s.attestationId ?? null],
      [
        'Status',
        s.withdrawn
          ? `Withdrawn by the same key${s.withdrawnAt ? ` at ${s.withdrawnAt}` : ''}${s.withdrawnReason ? ` (${s.withdrawnReason})` : ''}`
          : 'Signature checks',
      ],
    ];
    return `<div class="sig">${table(rows)}</div>`;
  });

  const shows: string[] = [
    `Once the Midnight transaction${ots ? ' (or the Bitcoin stamp)' : ''} is looked up and holds this batch root: this record existed, unchanged, by that date. Whoever had it sealed held this record by then.`,
    'The sealed fields above are exactly what was fingerprinted: any change to them, even one character, gives a different fingerprint.',
  ];
  if (ev.key) shows.push('The record named this key when it was sealed, so the key can’t have been swapped since.');
  if (okSigs)
    shows.push(
      'Each signature that checks was made with the key shown, over the SHA-256 shown. For a receipt, that is the fingerprint of the lab’s own record of the delivery, not of the sample.',
    );
  const doesNot: string[] = [
    'That anything the record says is true: the name, who bred it, the stated date. The breeder wrote those.',
    'Who holds the plant or the record now.',
    'That a signing key belongs to the lab it names. VeilCore doesn’t vouch for anyone.',
    `Any date at all until the batch root is found in the named transaction${ots ? ' (or the Bitcoin stamp checks)' : ''}.`,
    'The sealing time in the record and the registry’s “first saw” time: each is one party’s own clock.',
  ];
  if (lab)
    doesNot.push(
      'When the lab report was saved to the plant. That came after sealing and isn’t inside the record’s fingerprint, so the batch doesn’t date it.',
    );
  doesNot.push(
    'This is not a qualified electronic time stamp (EU eIDAS) or any other legally recognised time stamp. How much weight a court or agency gives it is for them to decide.',
  );

  const steps: string[] = [];
  if (lookup) {
    steps.push(`<h3>Date it on Midnight</h3>${list(midnightSteps(lookup), true)}`);
  }
  if (ots) steps.push(`<h3>The Bitcoin stamp</h3>${list(bitcoinSteps(ots.status !== 'bitcoin'), true)}`);

  const title = `Examiner summary: ${name} (${ev.record.id})`;
  return `<!doctype html>
<!--
  VeilCore evidence bundle: the examiner summary (docs/evidence-bundle.md).
  A printout. It has no script, loads nothing and checks nothing when opened; its
  Content-Security-Policy forbids scripts and every request. To check the files,
  open verify.html in the same folder.
  SPDX-License-Identifier: Apache-2.0
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>
  :root { --ink: #1e2227; --muted: #575e66; --line: #c2c7cd; --note: #f3f5f7; --warn: #8a4b00; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: #fff; }
  main { max-width: 820px; margin: 0 auto; padding: 20px 16px 40px; overflow-wrap: anywhere; }
  h1 { font-size: 1.35rem; margin: 0 0 2px; }
  h2 { font-size: 1.02rem; margin: 18px 0 6px; padding-bottom: 2px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 0.92rem; margin: 10px 0 4px; }
  p { margin: 4px 0; }
  .muted { color: var(--muted); }
  .note { background: var(--note); border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
  .warn { border-left: 4px solid var(--warn); }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4px 0; }
  th, td { text-align: left; vertical-align: top; padding: 3px 6px; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
  th { color: var(--muted); font-weight: 500; width: 34%; }
  td.hex { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; word-break: break-all; }
  ol, ul { padding-left: 20px; margin: 4px 0; }
  li { margin: 2px 0; }
  .sig { margin: 6px 0; }
  .sig.bad { color: #9e2a0b; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  footer { margin-top: 16px; font-size: 0.82rem; color: var(--muted); }
  @media (max-width: 560px) { th { width: 40%; } .cols { grid-template-columns: 1fr; } }
  @page { margin: 11mm; }
  @media print {
    body { font-size: 9pt; line-height: 1.3; }
    main { max-width: none; padding: 0; }
    h1 { font-size: 13pt; } h2 { font-size: 10.5pt; margin-top: 10px; break-after: avoid; } h3 { font-size: 9.5pt; margin-top: 6px; }
    th { width: 24%; } th, td { padding: 1px 4px; }
    td.hex { font-size: 7.5pt; }
    .note { padding: 4px 8px; margin: 4px 0; }
    tr, .sig, li { break-inside: avoid; }
  }
</style>
</head>
<body data-summary="veilcore-examiner-summary/v1">
<main>
  <h1>${escapeHtml(title)}</h1>
  ${p(`Made ${made} by the VeilCore site, from the holder’s own copy of the record. Bundle format ${ev.format}; record format ${ev.spec.version}.`, 'muted')}
  ${banner ? `<div class="note warn" data-practice="yes">${p(banner)}</div>` : ''}
  <div class="note">${p('This page is a printout of what the VeilCore site found when it made this bundle. It runs no code and checks nothing when opened. To check the files yourself, open verify.html in the same folder (it works offline); README.txt explains every file.')}</div>

  <h2>1. The record as it was sealed</h2>
  ${p('Exactly what was fingerprinted, in the breeder’s own words.', 'muted')}
  ${table(sealedRows(fields), 'sealed')}

  <h2>2. Fingerprint, batch and transaction</h2>
  ${table(ids)}

  <h2>3. How it was checked</h2>
  ${p(`By the VeilCore site, in the holder’s browser, at ${made}:`)}
  ${list(checked)}
  ${steps.join('\n  ')}

  <h2>4. Lab reports, signatures and sample receipts</h2>
  ${lab ? `<h3>Lab report saved to this plant</h3>${table(labRows)}` : p('No lab report is saved to this plant.')}
  ${sigs.length ? `<h3>Signatures about this record</h3>${sigBlocks.join('')}` : p('No lab signatures about this record are in this bundle.')}
  ${custodySection(ev)}
  ${ots ? `<h2>5. The Bitcoin stamp</h2>${table(bitcoinRows)}` : ''}

  <h2>${ots ? '6' : '5'}. What this shows and what it does not</h2>
  <div class="cols">
    <div><h3>What this shows</h3>${list(shows)}</div>
    <div><h3>What this does not show</h3>${list(doesNot)}</div>
  </div>

  <footer>
    ${p('VeilCore doesn’t vouch for anyone or for anything a record says. This page is not legal advice. The records are as the holder sealed them.')}
    ${p('Files: README.txt explains each file; verify.html checks them offline; DECLARATION-TEMPLATE.txt is sample text for a declaration about this bundle (not legal advice).')}
  </footer>
</main>
</body>
</html>
`;
};
