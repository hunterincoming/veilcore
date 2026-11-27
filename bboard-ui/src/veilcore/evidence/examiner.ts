// EXAMINER-SUMMARY.html for the evidence bundle: a printable summary for a lawyer, an
// examiner or a court clerk, with the record as sealed, its dates (Bitcoin and the RFC 3161
// token first, Midnight third: what a court trusts first, summit 5b item 13), its
// identifiers, how it was checked, what rests on tools VeilCore didn't write and what is
// VeilCore's own, the lab signatures and sample receipts, and what it shows and doesn't
// (docs/evidence-bundle.md, docs/evidence-in-practice.md).
//
// Text only. The page has no script at all, loads nothing and links nowhere: its
// Content-Security-Policy forbids scripts and every request, and every value in it is
// HTML-escaped here, so a plant's name or a lab's can never become markup. It is a
// printout of what the VeilCore site found when it made the bundle; it checks nothing when
// opened. verify.html, next to it, does the checks.
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isObject, isString } from '../json';
import {
  fileDating,
  fileDatingNote,
  fileRootAnchor,
  fileRootGiven,
  fileRootsDisagree,
  fileTxConflictLines,
  inFolder,
  keptAnchorLine,
  type Evidence,
  type FileRootFacts,
  type SignatureLine,
} from './bundle';
import {
  anchorLookup,
  bitcoinSteps,
  midnightSteps,
  networkWords,
  oneLine,
  sealedNameOf,
  subjectOf,
  utcWords,
  UNCONFIRMED_WORDS,
  DISAGREE_WORDS,
  reporterWords,
} from './words';

/**
 * The times that are one party's own clock, naming only those the bundle has (review 9 of PR
 * #233: a bundle with no "first saw" time named it anyway).
 */
const ownClocks = (firstSeen: boolean, sigs: boolean): string => {
  const parts = [
    'The sealing time in the record',
    firstSeen ? 'the registry’s “first saw” time' : null,
    sigs ? 'the time on each lab signature' : null,
  ].filter((x): x is string => !!x);
  if (parts.length === 1) return `${parts[0]}: one party’s own clock.`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}: each is one party’s own clock.`;
};
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
  // An animal record's own fields (veilcore/animal-profile.ts); a plant record has none of them.
  ['name', 'Animal name'],
  ['individualId', 'Individual ID'],
  ['idScheme', 'ID scheme'],
  ['species', 'Species'],
  ['breed', 'Breed'],
  ['sex', 'Sex'],
  ['dateOfBirth', 'Date of birth (the holder’s statement)'],
  ['breeder', 'Breeder or holder'],
  ['herd', 'Herd or farm'],
  ['bredBy', 'Bred by'],
  ['dateCreated', 'Stated date'],
  ['parents', 'Parents'],
  ['breedingMethod', 'Breeding method'],
  ['taxon', 'Species'],
  ['refId', 'Lot or reference'],
  ['notes', 'Notes'],
  ['photoFingerprints', 'Photos'],
  ['profile', 'Kind of record'],
  ['loggedAt', 'Sealed at (the holder’s device clock)'],
  ['keyBinding', 'Names a key'],
  ['nonce', 'Random salt (keeps the proof code unguessable)'],
];

/**
 * A strain or line record's own fields (veilcore/strain-profile.ts), first and in these words;
 * the same as verify.html (its STRAIN_LABELS). `name` and `species` are shared with the animal
 * profile, so a strain says what they are for it.
 */
const STRAIN_PROFILE = 'veilcore/profile/strain/v1';
const STRAIN_LABELS: [string, string][] = [
  ['name', 'Strain or line name'],
  ['designation', 'Designation (the holder’s own code)'],
  ['group', 'Kind'],
  ['species', 'Species'],
  ['deposits', 'Deposit numbers'],
  ['method', 'How it was made'],
  ['generation', 'Generation or passage'],
  ['madeOn', 'Made or isolated on (the holder’s statement)'],
  ['maker', 'Made or isolated by'],
];

/**
 * A document record's own fields (veilcore/document-profile.ts, SPEC 11.11), first and in these
 * words; the same as verify.html (its DOCUMENT_LABELS). The holder states all of them.
 */
const DOCUMENT_PROFILE = 'veilcore/profile/document/v1';
const DOCUMENT_LABELS: [string, string][] = [
  ['title', 'Title'],
  ['type', 'Type'],
  ['files', 'Files (sealed by SHA-256; the files themselves are not in the record)'],
  ['issuer', 'Issued by (the holder’s statement)'],
  ['reference', 'Reference'],
  ['issued', 'Date on the document (the holder’s statement)'],
  ['about', 'Records it concerns'],
  ['holder', 'Held by'],
  ['fieldSchema', 'Numbers sealed with it: form'],
  ['fieldSetRoot', 'Numbers sealed with it: code that commits to them (the numbers are not shown)'],
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
        // An animal's sire or dam: its role, and its individual ID when it has one.
        const role = p.role === 'sire' ? 'Sire: ' : p.role === 'dam' ? 'Dam: ' : '';
        const id =
          (isString(p.individualId) && p.individualId ? ` (ID ${p.individualId})` : '') +
          // A strain's parent: its deposit number when it has one.
          (isString(p.deposit) && p.deposit ? ` (deposit ${p.deposit})` : '');
        return `${role}${name}${id}${isString(p.recordId) && p.recordId ? ` (record ${p.recordId})` : ''}`;
      })
      .join('; ');
  }
  if (key === 'deposits' && Array.isArray(v)) return v.length === 0 ? '(none)' : v.map(String).join('; ');
  // A document's files: name, size and SHA-256 each (the same words as verify.html's fieldText).
  if (key === 'files' && Array.isArray(v)) {
    return v.length === 0
      ? '(none)'
      : v
          .map((f) =>
            isObject(f)
              ? `${isString(f.name) ? f.name : '(no name)'}, ${isNumber(f.size) ? `${f.size} bytes` : 'size not given'}, SHA-256 ${isString(f.sha256) ? f.sha256 : '(missing)'}`
              : String(f),
          )
          .join('; ');
  }
  if (key === 'about' && Array.isArray(v)) {
    return v.length === 0
      ? '(none)'
      : v
          .map((a) =>
            isObject(a)
              ? `${isString(a.name) && a.name ? a.name : '(no name)'}${isString(a.recordId) && a.recordId ? ` (record ${a.recordId})` : ''}`
              : String(a),
          )
          .join('; ');
  }
  if (key === 'photoFingerprints' && Array.isArray(v)) {
    return v.length === 0
      ? '(none)'
      : `${v.length} photo${v.length === 1 ? '' : 's'}, sealed by their codes: ${v.map(String).join(', ')}`;
  }
  if (key === 'loggedAt' && isNumber(v)) return `${utcWords(v) ?? String(v)} (the holder’s word only)`;
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
  const first =
    fields.profile === STRAIN_PROFILE ? STRAIN_LABELS : fields.profile === DOCUMENT_PROFILE ? DOCUMENT_LABELS : [];
  const labels = [...first, ...FIELD_LABELS.filter(([k]) => !first.some(([s]) => s === k))];
  for (const [k, label] of labels) {
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
  salt?: string;
  locked?: boolean;
}): string =>
  c.received === false
    ? 'No: the lab code was never used'
    : c.locked
      ? 'Can’t say: these details are stored locked, and the browser that made this bundle didn’t have their key'
      : c.covered === 'covered'
        ? c.salt
          ? 'Yes: the receipt’s signature covers these details. The receipt’s id ends with the SHA-256 of the canonical JSON of { format: "veilcore/sample-custody/v2", transferId, salt, sample, arrival }, using the salt below. Checked in the holder’s browser when the bundle was made; verify.html, in this folder, rechecks it offline.'
          : 'Yes: the receipt’s signature covers these details. Checked in the holder’s browser when the bundle was made; verify.html, in this folder, rechecks it offline.'
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
      ['Sample details', c.locked ? 'Locked: not in this bundle' : anything ? null : 'None written'],
      // Sealed with the delivery's key (CONTRACT.md #27): the salt the digest is taken with.
      ['Salt sealed with the sample details', c.salt ?? null],
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
  if (items.some((c) => c.salt)) {
    out.push(
      p(
        'Sample details with a salt are stored locked on VeilCore’s registry, and VeilCore doesn’t have their key. They are in this bundle because the holder’s browser opened them. With the salt, anyone can work out the digest the lab’s receipt id carries and compare: verify.html does.',
        'muted',
      ),
    );
  }
  out.push(
    p(
      'These are what the breeder and the lab each typed. VeilCore doesn’t check them, and nothing here shows they are true.',
      'muted',
    ),
  );
  return out.join('');
};

/** A backup file folder's token files (bundle.ts tstNames). */
const tstFiles = (c: FileRootFacts): string[] =>
  c.tokens === 1 ? ['root.tst'] : Array.from({ length: c.tokens }, (_, i) => `root-${i + 1}.tst`);

/** How to check the RFC 3161 token with OpenSSL and nothing from VeilCore. */
const TSA_STEPS: string[] = [
  'The token is proof/root.tst; the file it stamps is proof/root.bin (the batch root as 32 bytes). It shows the batch root existed by the time it states, and nothing earlier.',
  'With OpenSSL, in the proof folder: openssl ts -verify -data root.bin -in root.tst -token_in -CAfile <the authority’s published chain file>. It must print Verification: OK.',
  'Get that chain file from the authority’s own website, not from VeilCore.',
];

/** The RFC 3161 token's legal standing, in one line. */
const tsaStanding = (q: { scheme: string; trustedList?: string } | undefined): string =>
  q
    ? `Legal standing: VeilCore’s registry stated this authority is qualified under ${oneLine(q.scheme)}${q.trustedList ? ` (${oneLine(q.trustedList)})` : ''}. Check its trusted list yourself for the token’s date. Where it is qualified, EU law presumes a qualified time stamp’s date is accurate (eIDAS Article 41).`
    : 'Legal standing: VeilCore doesn’t record whether this authority is qualified. Check its status yourself on the EU trusted list. If the token is a qualified time stamp, EU law presumes its date is accurate (eIDAS Article 41); if not, a court weighs it as it would any signed timestamp.';

/** An RFC 3161 token's standing, for a bundle from a backup file (it records no authority's status). */
const TOKEN_STANDING = tsaStanding(undefined).replace(/^Legal standing:/, 'Legal standing of an RFC 3161 token:');

/** Bitcoin's and Midnight's legal standing: not qualified under EU law, and only a few places presume their date. */
const CHAIN_STANDING =
  'not a qualified electronic time stamp under EU law (eIDAS), and most places have no law presuming its date (Vermont, 12 V.S.A. § 1913, is one exception). A court weighs it as evidence.';

/**
 * The page. `sigs` are the lab signatures as the holder's browser checked them when the
 * bundle was made; `hasOts`, whether the bundle has the Bitcoin stamp file.
 */
export const examinerSummaryHtml = (ev: Evidence, sigs: readonly SignatureLine[], hasOts: boolean): string => {
  const fields = ev.record.sealedFields;
  const name = sealedNameOf(fields) ? oneLine(sealedNameOf(fields)) : ev.record.id;
  const subject = subjectOf(fields);
  const anchor = ev.batch?.anchor ?? null;
  const tx = anchor && isString(anchor.txHash) ? anchor.txHash : null;
  const test = anchor ? anchor.network !== 'mainnet' : true;
  const fromFile = ev.registry.source === 'backup-file';
  // Who said where the batch was recorded: the registry, or only the holder's backup file.
  const who = reporterWords(ev.registry.source);
  const said = fromFile ? 'as the holder’s backup file says it, not confirmed' : 'as VeilCore’s registry reported it';
  const lookup = ev.batch && anchor ? anchorLookup(anchor, ev.batch.root, undefined, fromFile) : null;
  const ots = ev.batch && hasOts ? ev.batch.opentimestamps : null;
  const tsa = ev.batch?.rfc3161?.available ? ev.batch.rfc3161 : null;
  const made = utcWords(ev.createdAt) ?? ev.createdAt;
  const keyBound = isString(fields.keyBinding);
  // A bundle made from a backup file: each root the file gives, with its own dates (review 8).
  const fd = fileDating(ev);
  const fileRoots = fromFile ? fd.roots : [];
  const anyOts = !!ots || fd.ots;
  const anyTsa = !!tsa || fd.tokens;
  const anyTx = !!tx || fd.tx;
  const anyAnchor = !!anchor || fd.tx;

  // Two Midnight transactions for one batch root (review 10 of PR #233): each named, none ranked.
  const kept = keptAnchorLine(ev);
  const twoTx = [...(kept ? [kept] : []), ...fileTxConflictLines(ev)];
  // Each "- folder: transaction" line goes in one list under the line before it.
  const twoTxHtml = twoTx
    .reduce<{ head: string; items: string[] }[]>((out, l) => {
      if (l.startsWith('- ') && out.length) out[out.length - 1].items.push(l.slice(2));
      else out.push({ head: l, items: [] });
      return out;
    }, [])
    .map((g) => `${p(g.head)}${g.items.length ? list(g.items) : ''}`)
    .join('');
  const banner = fileRoots.length
    ? fileDatingNote(ev)
    : test
      ? anchor
        ? `Practice data. This record is dated on ${networkWords(anchor.network)}. A test network can be reset and its dates carry no weight.`
        : tsa || ots?.status === 'bitcoin'
          ? `This record is not dated on Midnight yet. The ${tsa ? 'RFC 3161 token' : 'Bitcoin stamp'} below dates its batch root.`
          : 'This record is not dated on any network yet. Until it is, nothing here dates it.'
      : null;

  // How it was checked: what the site did when it made the bundle, and what it did not do.
  const checked: string[] = [
    ...(fromFile ? [`Not confirmed: ${UNCONFIRMED_WORDS}`] : []),
    ...(ev.registry.fileRoots?.length
      ? [
          `From the holder’s backup file, not confirmed with VeilCore’s registry: ${ev.registry.fileRoots
            .map((c) => `${c.folder} (batch ${oneLine(c.batchId)}, batch root ${c.root}${fileRootGiven(c)})`)
            .join('; ')}.`,
          ...(fileRootsDisagree(ev) ? [`More than one root: ${DISAGREE_WORDS}`] : []),
          ...(ev.registry.registryRoots ?? []).map(
            (r) => `VeilCore’s registry gave the holder’s browser another root for this batch: ${r}.`,
          ),
        ]
      : []),
    `The record’s proof code was worked out again from the sealed fields below and matched${keyBound ? ' (with the record’s key binding folded in)' : ''}. The bundle can’t be made if it doesn’t.`,
    ev.proof && ev.batch
      ? `The proof leads from the record’s proof code to the root of batch ${ev.batch.batchId}. The batch root is one code that stands for every record in the batch.`
      : fileRoots.length
        ? `The proof in each folder from the holder’s backup file leads from the record’s proof code to the batch root that folder names (a proof that doesn’t is left out). The batch root is one code that stands for every record in the batch.`
        : 'The record is not in a batch yet, so there is no proof and nothing to look up.',
  ];
  if (ev.key) checked.push('The record’s key is in the bundle and matches the key the record names.');
  const okSigs = sigs.filter((s) => s.ok).length;
  if (sigs.length)
    checked.push(
      `${okSigs} of ${sigs.length} lab signature${sigs.length === 1 ? '' : 's'} checked (Ed25519).${okSigs < sigs.length ? ' The others do not check and should be ignored.' : ''}`,
    );
  // The dates in the order a court trusts them (summit 5b item 13): Bitcoin, the RFC 3161
  // token, then Midnight.
  if (ots)
    checked.push(
      'Not checked for you: the Bitcoin block. The stamp file is in the bundle; verify.html reads it, and the steps below say how to check it against Bitcoin.',
    );
  if (tsa)
    checked.push(
      'The RFC 3161 token was checked against the batch root in the holder’s browser when the bundle was made (a token that doesn’t check is left out). The steps below say how to check it again with OpenSSL.',
    );
  if (fileRoots.length) {
    if (fd.ots)
      checked.push(
        'Not checked for you: the Bitcoin block. Each Bitcoin stamp file from the backup file was read in the holder’s browser and starts from its folder’s batch root (one that doesn’t is left out); verify.html reads it, and the steps below say how to check it against Bitcoin.',
      );
    if (fd.tokens)
      checked.push(
        'Each RFC 3161 token from the backup file was checked in the holder’s browser against its folder’s batch root, signed by a timestamp authority this site pins, with a time inside that authority’s certificate dates (a token that doesn’t check is left out). The steps below say how to check it again with OpenSSL.',
      );
  }
  checked.push(
    tx
      ? `Not checked for you: the Midnight transaction. ${who.replace(/^t/, 'T')} ${fromFile ? 'names' : 'reported'} it; nobody has looked it up on the chain for you. The steps below say how.`
      : fileRoots.length
        ? fd.tx
          ? 'Not checked for you: the Midnight transaction the backup file names for each folder. Nobody has looked it up on the chain for you. The steps below say how.'
          : 'The holder’s backup file names no Midnight transaction for this record, so there is none to look up.'
        : 'There is no Midnight transaction to look up yet.',
  );

  const ids: [string, string | null][] = [
    ['Record ID', ev.record.id],
    ['Proof code', ev.record.fingerprint],
    ['How the proof code is made', ev.record.fingerprintAlgorithm],
    ['Content hash (SHA-256 of the sealed fields)', ev.record.contentHash],
    [
      'Batch',
      ev.batch?.batchId ??
        (fileRoots.length
          ? `${[...new Set(fileRoots.map((c) => oneLine(c.batchId)))].join(', ')} (${said})`
          : 'not in a batch yet'),
    ],
    ['Batch root', ev.batch?.root ?? (fileRoots.length ? [...new Set(fileRoots.map((c) => c.root))].join(', ') : null)],
    ['Batch sealed by the registry at', ev.batch?.sealedAt ? (utcWords(ev.batch.sealedAt) ?? ev.batch.sealedAt) : null],
    [
      'Registry first saw the record',
      ev.registry.firstSeen
        ? `${utcWords(ev.registry.firstSeen) ?? ev.registry.firstSeen} (the registry’s own clock, its word only)`
        : null,
    ],
  ];

  // Midnight: third, and as VeilCore's registry reported it. Nothing in the bundle read it from the chain.
  const midnightRows: [string, string | null][] = [
    ['Network', anchor ? networkWords(anchor.network) : 'not recorded on a network yet'],
    ['Contract', anchor && isString(anchor.contractAddress) ? anchor.contractAddress : null],
    ['Transaction', tx],
    [`Block (${said})`, anchor && isNumber(anchor.blockHeight) ? String(anchor.blockHeight) : null],
    [`Time (${said})`, anchor ? utcWords(anchor.anchoredAt) : null],
  ];
  for (const a of ev.batch?.earlierAnchors ?? []) {
    midnightRows.push([
      'Recorded earlier on',
      `${networkWords(a.network)}, transaction ${String(a.txHash)} (a later one took its place)`,
    ]);
  }

  const bitcoinRows: [string, string | null][] = ots
    ? [
        [
          fromFile ? 'Status the holder’s backup file gives' : 'Status the registry reported',
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

  const tsaRows: [string, string | null][] = tsa
    ? [
        ['Time the token states', tsa.genTime ? (utcWords(tsa.genTime) ?? tsa.genTime) : '(not read)'],
        [`Authority (${said})`, tsa.tsa ? oneLine(tsa.tsa) : null],
        ['Signer named in the token', tsa.signer ? oneLine(tsa.signer) : null],
        ['Token file', 'proof/root.tst, over proof/root.bin (the batch root as 32 bytes)'],
        [
          'Asked for',
          tsa.requestedAfterSeal ? 'After the batch was sealed, so its time is later than the sealing' : null,
        ],
      ]
    : [];

  /** One root from the backup file: its batch, its Midnight transaction and its stamps, as the file gives them. */
  const fileRootBlock = (c: FileRootFacts): string => {
    const a = fileRootAnchor(c);
    const rows: [string, string | null][] = [
      ['Folder', c.folder],
      ['Batch', oneLine(c.batchId)],
      ['Batch root', c.root],
      [
        'Given',
        c.otherTransaction
          ? 'Later in the backup file: the same batch root as another folder, with another Midnight transaction VeilCore’s registry gave later (a second date record for this root)'
          : c.later
            ? 'Later in the backup file: one it says VeilCore’s registry gave after another for the same batch'
            : 'First in the backup file: the proof it gives for this record',
      ],
      ['Midnight network', a ? networkWords(a.network) : 'The backup file names no Midnight transaction for this root'],
      ['Contract', a && isString(a.contractAddress) ? a.contractAddress : null],
      ['Transaction', a ? String(a.txHash) : null],
      [`Block (${said})`, a && isNumber(a.blockHeight) ? String(a.blockHeight) : null],
      [`Time (${said})`, a ? utcWords(a.anchoredAt) : null],
      [
        'Bitcoin stamp (OpenTimestamps)',
        c.opentimestamps.available
          ? `${
              c.opentimestamps.status === 'bitcoin'
                ? `Names Bitcoin block ${isNumber(c.opentimestamps.bitcoinBlockHeight) ? c.opentimestamps.bitcoinBlockHeight : '(not given)'}`
                : 'Pending: not yet in a Bitcoin block'
            }, as the stamp file in the backup file shows it. File: ${c.folder}/root.bin.ots, over ${c.folder}/root.bin`
          : 'None in the backup file',
      ],
      [
        'RFC 3161 tokens',
        c.tokens
          ? `${c.tokens} in the backup file, over ${c.folder}/root.bin: ${tstFiles(c)
              .map((f) => `${c.folder}/${f}`)
              .join(', ')}`
          : 'None in the backup file',
      ],
    ];
    return `<h3>From the holder’s backup file: ${escapeHtml(c.folder)}</h3>${table(rows)}`;
  };

  const lab = ev.labReport;
  const labRows: [string, string | null][] = lab
    ? [
        ['Lab report SHA-256', lab.fileSha256 ?? '(not kept for this older pairing)'],
        ['Pairing code', lab.pairingFingerprint],
        ['File name', lab.fileName ?? null],
        [
          `Saved to the ${subject} at`,
          lab.pairedAt ? `${utcWords(lab.pairedAt) ?? lab.pairedAt} (the holder’s device clock)` : null,
        ],
        ['File in this bundle', lab.fileIncluded ?? 'No: only its code'],
        // Round 5: what a check link shows of it, and the salt the holder's link carries.
        [
          'On a check link',
          lab.pairBinding
            ? `Only the code ${lab.pairBinding}, made from the file’s SHA-256, the proof code and the salt ${lab.pairSalt ?? ''} that the holder’s check link carries after #ds=. With the file and that link, anyone can make it again; nobody else can tell which file it is.`
            : null,
        ],
      ]
    : [];

  const sigBlocks = sigs.map((s) => {
    if (!s.ok) return `<div class="sig bad">${p(s.text)}</div>`;
    const rows: [string, string | null][] = [
      [
        'What was signed',
        `${s.what ?? s.type ?? ''}${s.savedReport ? ` (the lab report saved to this ${subject})` : ''}`,
      ],
      ['Signing key', s.publicKey ?? null],
      ['Name it gives itself', s.displayName ? `${s.displayName} (not verified)` : null],
      [
        s.type === 'chain-of-custody'
          ? 'Signed code (the lab’s record of the delivery, not the sample)'
          : s.attestationId?.endsWith('_ld1')
            ? 'Signed code (the report file bound to this record with the lab report salt)'
            : 'Document SHA-256',
        s.documentHash ?? null,
      ],
      [
        'Signed at',
        s.issuedAt
          ? `${s.issuedAt} (dated only by the signer’s clock: nothing in this bundle dates the signature)`
          : null,
      ],
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
    fileRoots.length
      ? `Once ${[fd.ots ? 'a folder’s Bitcoin stamp' : null, fd.tokens ? 'a folder’s RFC 3161 token (by the time it states)' : null, fd.tx ? 'the Midnight transaction a folder names' : null].filter(Boolean).join(' or ') || 'a date for one of these batch roots'} is checked and holds that folder’s batch root: this record existed, unchanged, by that date. Whoever had it sealed held this record by then.`
      : `Once ${[ots ? 'the Bitcoin stamp' : null, tsa ? 'the RFC 3161 token in proof/root.tst (by the time it states)' : null, 'the Midnight transaction'].filter(Boolean).join(' or ')} is checked and holds this batch root: this record existed, unchanged, by that date. Whoever had it sealed held this record by then.`,
    'The sealed fields above are exactly what the proof code was made from: any change to them, even one character, gives a different proof code.',
  ];
  if (ev.key) shows.push('The record named this key when it was sealed, so the key can’t have been swapped since.');
  if (okSigs)
    shows.push(
      'Each signature that checks was made with the key shown, over the SHA-256 shown. For a receipt, that is the code of the lab’s own record of the delivery, not of the sample.',
    );
  const doesNot: string[] = [
    subject === 'document'
      ? 'That the document is genuine, that the issuer named in it issued it, or that what it says is true. The title, type, issuer and dates are the holder’s statements. A matching file shows only that a file with exactly those bytes was in the holder’s hands by the date.'
      : 'That anything the record says is true: the name, who bred it, the stated date. The breeder wrote those.',
    `Who holds the ${subject} or the record now.`,
    'That a signing key belongs to the lab it names. VeilCore doesn’t vouch for anyone.',
    fileRoots.length
      ? `Any date at all until ${[fd.ots ? 'a folder’s Bitcoin stamp checks' : null, fd.tokens ? 'a folder’s RFC 3161 token checks' : null, fd.tx ? 'a folder’s batch root is found in the Midnight transaction it names' : null].filter(Boolean).join(' or ') || 'one of these batch roots is dated'}.`
      : `Any date at all until ${[ots ? 'the Bitcoin stamp checks' : null, tsa ? 'the RFC 3161 token checks' : null, 'the batch root is found in the named Midnight transaction'].filter(Boolean).join(' or ')}.`,
    ownClocks(!!ev.registry.firstSeen, sigs.length > 0),
  ];
  if (lab)
    doesNot.push(
      `When the lab report was saved to the ${subject}. That came after sealing and isn’t inside the record’s proof code, so the batch doesn’t date it.`,
    );
  // Bitcoin and Midnight only: the RFC 3161 token's standing is its own line in section 2.
  const chains = [anyOts ? 'the Bitcoin stamp' : null, anyAnchor ? 'the Midnight date' : null].filter(
    (x): x is string => !!x,
  );
  doesNot.push(
    `${
      chains.length === 2
        ? 'Neither the Bitcoin stamp nor the Midnight date is a qualified electronic time stamp under EU law (eIDAS); most places have no law presuming their date. '
        : chains.length === 1
          ? `${chains[0].replace(/^t/, 'T')} is not a qualified electronic time stamp under EU law (eIDAS); most places have no law presuming its date. `
          : ''
    }${tsa ? 'The RFC 3161 token’s standing is in its own line in section 2. ' : fd.tokens ? `${TOKEN_STANDING} ` : ''}How much weight a court or agency gives any of it is for them to decide.`,
  );

  const steps: string[] = [];
  if (ots) steps.push(`<h3>The Bitcoin stamp</h3>${list(bitcoinSteps(ots.status !== 'bitcoin'), true)}`);
  if (tsa) steps.push(`<h3>The RFC 3161 token</h3>${list(TSA_STEPS, true)}`);
  if (lookup) {
    steps.push(`<h3>Date it on Midnight (${said})</h3>${list(midnightSteps(lookup), true)}`);
  }
  for (const c of fileRoots) {
    const a = fileRootAnchor(c);
    const l = a ? anchorLookup(a, c.root, undefined, true) : null;
    const each: string[] = [];
    if (c.opentimestamps.available)
      each.push(
        `Bitcoin: on opentimestamps.org, drop in ${c.folder}/root.bin.ots and then ${c.folder}/root.bin; or, in that folder, ots verify root.bin.ots${c.opentimestamps.status === 'bitcoin' ? '' : ' (run ots upgrade root.bin.ots first; that needs the internet once)'}.`,
      );
    if (c.tokens)
      each.push(
        `RFC 3161 token: in that folder, openssl ts -verify -data root.bin -in ${tstFiles(c)[0]} -token_in -CAfile <the authority’s published chain file>. It must print Verification: OK. Get that chain file from the authority’s own website, not from VeilCore.`,
      );
    steps.push(
      `<h3>${escapeHtml(c.folder)} (${said})</h3>${
        l
          ? list(
              midnightSteps(l).map((x) => inFolder(x, c)),
              true,
            )
          : p('The backup file names no Midnight transaction for this root.')
      }${each.length ? list(each) : ''}`,
    );
  }

  // How someone who disagrees can check this: what rests on tools anyone has, and what rests
  // on VeilCore's own code (summit 5b item 13; the judge's two layers).
  const standard: string[] = [
    'The record’s content hash: the SHA-256 of record/sealed-fields.canonical.json, with any SHA-256 tool.',
  ];
  if ((ev.proof && ev.batch) || fileRoots.length)
    standard.push(
      `The path from the proof code to the batch root (${fileRoots.length ? 'inclusion-proof.json in each proof/backup-file-* folder' : 'proof/inclusion-proof.json'}): SHA-256 steps, which any SHA-256 tool can redo by SPEC.md.`,
    );
  if (anyOts) standard.push('The Bitcoin stamp: the OpenTimestamps client, or opentimestamps.org.');
  if (anyTsa) standard.push('The RFC 3161 token: OpenSSL (openssl ts), with the authority’s own published files.');
  if (anyTx) standard.push('That the Midnight transaction exists, succeeded and when: any Midnight explorer.');
  if (sigs.length)
    standard.push(
      'The lab signatures: Ed25519, with any Ed25519 tool. The bytes signed follow VeilCore’s published format (SPEC.md).',
    );
  const veilcoreOnly: string[] = [
    'verify.html and any script in the proof folder: VeilCore wrote them, and nobody outside VeilCore has audited them.',
  ];
  if (keyBound)
    veilcoreOnly.push('How the record’s key is folded into its proof code (key binding): VeilCore’s own scheme.');
  if (anyTx)
    veilcoreOnly.push(
      'That the Midnight transaction wrote this batch root: reading it needs VeilCore’s compiled contract. VeilCore’s contract wrote it.',
    );

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
  :root { --ink: #16181d; --muted: #4b4740; --line: #cfc6b1; --note: #f6f3ec; --warn: #8a4b00; --serif: Georgia, "Times New Roman", serif; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: #fffdf7; }
  main { max-width: 820px; margin: 0 auto; padding: 20px 16px 40px; overflow-wrap: anywhere; }
  h1 { font: 700 1.5rem/1.2 var(--serif); margin: 0 0 2px; }
  h2 { font: 700 1.1rem/1.25 var(--serif); margin: 18px 0 6px; padding-bottom: 2px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 0.92rem; margin: 10px 0 4px; }
  p { margin: 4px 0; }
  .muted { color: var(--muted); }
  .note { background: var(--note); border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
  .warn { border-left: 4px solid var(--warn); }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4px 0; }
  th, td { text-align: left; vertical-align: top; padding: 3px 6px; border-top: 1px dashed var(--line); overflow-wrap: anywhere; }
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
    h3 { break-after: avoid; }
    .cols { display: block; }
    .cols > div { break-inside: avoid; }
    footer { break-inside: avoid; }
    body, .note { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff; }
  }
</style>
</head>
<body data-summary="veilcore-examiner-summary/v1">
<main>
  <h1>${escapeHtml(title)}</h1>
  ${p(`Made ${made} by the VeilCore site, from the holder’s own copy of the record. Bundle format ${ev.format}; record format ${ev.spec.version}.`, 'muted')}
  ${banner ? `<div class="note warn" data-practice="yes">${p(banner)}</div>` : ''}
  ${twoTx.length ? `<div class="note warn" data-two-transactions="yes">${twoTxHtml}</div>` : ''}
  <div class="note">${p('This page is a printout of what the VeilCore site found when it made this bundle. It runs no code and checks nothing when opened. To check the files yourself, open verify.html in the same folder (it works offline); README.txt explains every file.')}${p('You don’t need to open any link to read this: everything it says is on the page. The addresses and commands below are only for checking it.', 'muted')}</div>

  <h2>1. The record as it was sealed</h2>
  ${p('Exactly what the proof code was made from, in the holder’s own words.', 'muted')}
  ${table(sealedRows(fields), 'sealed')}

  <h2>2. The dates</h2>
  ${!fileRoots.length && (ots || tsa) ? p(`${[ots ? 'Bitcoin' : null, tsa ? 'the timestamp authority’s token' : null, anchor ? 'Midnight' : null].filter(Boolean).join(', then ').replace(/^t/, 'T')}${anchor ? '' : ', then Midnight once it is dated there'}. Each is separate: any one that checks dates the record.`, 'muted') : ''}
  ${ots ? `<h3>Bitcoin (OpenTimestamps)</h3>${table(bitcoinRows)}${p(`Legal standing: ${CHAIN_STANDING} Bitcoin has run since 2009, and anyone can check the stamp.`, 'muted')}` : ''}
  ${tsa ? `<h3>RFC 3161 token from a Time Stamping Authority</h3>${table(tsaRows)}${p(tsaStanding(tsa.qualified), 'muted')}` : ''}
  ${
    fileRoots.length
      ? `${p(`Each root the holder’s backup file gives for this record, with what the file gives to date it. Not confirmed with VeilCore’s registry. Each date is separate: any one that checks dates the record.${fd.ots || fd.tx ? ` Legal standing of ${[fd.ots ? 'a Bitcoin stamp' : null, fd.tx ? 'a Midnight date' : null].filter(Boolean).join(' or ')}: ${CHAIN_STANDING}` : ''}${fd.tokens ? ` ${TOKEN_STANDING}` : ''}`, 'muted')}${fileRoots.map(fileRootBlock).join('')}`
      : `<h3>Midnight</h3>
  ${table(midnightRows)}`
  }
  ${anchor ? p(`${said.replace(/^a/, 'A')}: nothing in this bundle read it from Midnight for you. Legal standing: ${CHAIN_STANDING} Midnight is a newer public blockchain, and a court may want an expert to read it.`, 'muted') : ''}

  <h2>3. Proof code and batch</h2>
  ${table(ids)}

  <h2>4. How it was checked</h2>
  ${p(`By the VeilCore site, in the holder’s browser, at ${made}:`)}
  ${list(checked)}
  ${steps.join('\n  ')}

  <h2>5. How someone who disagrees can check this</h2>
  <div class="cols" data-layers="">
    <div data-layer="standard"><h3>Checkable with tools VeilCore didn’t write</h3>${list(standard)}</div>
    <div data-layer="veilcore"><h3>VeilCore-specific, not yet audited</h3>${list(veilcoreOnly)}</div>
  </div>
  ${p('Rely on what you can check with tools VeilCore didn’t write. Treat the rest as VeilCore’s word until it is audited.', 'muted')}

  <h2>6. Lab reports, signatures and sample receipts</h2>
  ${lab ? `<h3>Lab report saved to this ${subject}</h3>${table(labRows)}` : p(`No lab report is saved to this ${subject}.`)}
  ${sigs.length ? `<h3>Signatures about this record</h3>${p('Each signature is dated only by the signer’s clock. Nothing in this bundle dates a signature.', 'muted')}${sigBlocks.join('')}` : p('No lab signatures about this record are in this bundle.')}
  ${custodySection(ev)}

  <h2>7. What this shows and what it does not</h2>
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
