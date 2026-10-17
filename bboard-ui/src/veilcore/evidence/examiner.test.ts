// The evidence bundle's printable pages: EXAMINER-SUMMARY.html (text only, no script, no
// network, every value escaped) and DECLARATION-TEMPLATE.txt (sample text, the bundle's
// facts filled in, every other file's SHA-256), and that every file any of the bundle's
// files names is in the bundle.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { generateKeypair, signAttestation, signRetraction } from 'veilcore-records';
import type { InclusionProof } from 'veilcore-records';
import { pairingFingerprintOfSha } from '../commitment';
import { fingerprintRecord } from '../commitment';
import type { StrainRecord } from '../records';
import {
  buildEvidence,
  bundleFiles,
  custodyEntries,
  fileList,
  reconcile,
  signatureLines,
  zipFiles,
  type Evidence,
  type SignatureLine,
} from './bundle';
import { custodyDigest, custodyDigestV2, type SentTransfer } from '../transfers';
import { EXAMINER_FILE, escapeHtml, examinerSummaryHtml } from './examiner';
import { DECLARATION_FILE, DECLARATION_WARNING, declarationText } from './declaration';
import { practiceBatch, practiceRecord } from './test-records';

const NOW = new Date('2026-10-15T12:00:00Z');
const TX = 'c3'.repeat(32);
const CONTRACT = '7a'.repeat(32);
const OTS = new Uint8Array([...new TextEncoder().encode('\x00OpenTimestamps\x00\x00Proof\x00'), 0xbf, 0x89, 1, 2, 3]);
const HOSTILE = '<img src=x onerror=alert(1)> </style><script>alert("x")</script> & \'q\' `b`';

const sha256 = async (b: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

/** A sealed record whose name, notes and lab name are hostile markup; batched, dated, signed. */
const setup = async (opts: { network?: string; batched?: boolean; ots?: boolean; withdrawn?: boolean } = {}) => {
  const report = new TextEncoder().encode('practice lab report, test data');
  const fileSha = await sha256(report);
  const base = await practiceRecord(2);
  const fields = { ...base, strainName: `Practice ${HOSTILE}`, notes: `Notes ${HOSTILE}` };
  const sealed: StrainRecord = {
    ...fields,
    recordFingerprint: await fingerprintRecord({ ...fields, nonce: fields.nonce as string }),
    dnaFingerprint: pairingFingerprintOfSha(fileSha),
    dnaFileName: `Lab ${HOSTILE}.pdf`,
    dnaFileSha256: fileSha,
    dnaPairedAt: Date.parse('2026-10-15T10:00:00Z'),
  };
  const batch = await practiceBatch([sealed, await practiceRecord(3)]);
  const anchor = {
    chain: 'midnight',
    network: opts.network ?? 'preprod',
    contractAddress: CONTRACT,
    txHash: TX,
    blockHeight: 77,
    anchoredAt: '2026-10-15T11:00:00.000Z',
  };
  const proof = { ...batch.proofs[sealed.recordFingerprint], anchor } as unknown as InclusionProof;
  const kp = await generateKeypair();
  const signed = await signAttestation(
    {
      attestationId: 'att_practice_1',
      type: 'laboratory-report',
      subjectCommitment: sealed.recordFingerprint,
      documentHash: fileSha,
      hashAlgorithm: 'sha256',
      issuedAt: '2026-10-15T09:00:00Z',
      attester: { publicKey: kp.publicKey, displayName: `Lab ${HOSTILE}` },
    },
    kp.privateKey,
  );
  const retraction = opts.withdrawn
    ? await signRetraction(
        {
          attestationId: signed.attestationId,
          attesterPublicKey: kp.publicKey,
          reason: 'superseded',
          retractedAt: '2026-10-16T00:00:00Z',
        },
        kp.privateKey,
      )
    : null;
  const g = await reconcile(sealed.recordFingerprint, {
    source: 'evidence-route',
    registryFirstSeen: '2026-10-15T10:30:00.000Z',
    proof: opts.batched === false ? null : proof,
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      anchor,
      earlierAnchors: [],
      opentimestamps:
        opts.ots === false ? { available: false, status: 'none' } : { available: true, status: 'pending' },
    },
    ots: opts.ots === false ? null : OTS,
    attestations: [{ ...signed, retraction }],
  });
  const options = { includeKey: false, labFile: { name: 'Lab report.pdf', bytes: report }, now: NOW };
  const built = await buildEvidence(sealed, g, options);
  // Sample details as custody.ts gives them (Evidence.custody), with a hostile value.
  const ev: Evidence = {
    ...built,
    custody: [
      {
        transferId: 'T-PRACTICE-1',
        receiptAttestationId: 'att_receipt_1',
        covered: 'covered',
        sample: { sampleId: 'BLU-07', sealNumber: '4471', witness: `J. Doe ${HOSTILE}` },
        arrival: { sampleId: 'BLU-07', sealNumber: '4417', sealIntact: 'yes', arrivedOn: '2026-10-15' },
        differences: ['Seal number differs: sent 4471, received 4417'],
      },
    ],
  };
  const files = await bundleFiles(ev, g, options);
  const dir = `${sealed.id}-evidence/`;
  const get = (p: string) => strFromU8(files[`${dir}${p}`]);
  return { record: sealed, batch, ev, g, files, dir, get, fileSha, kp };
};

/** Every tag name in a page. */
const tagsOf = (html: string): string[] =>
  [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1].toLowerCase());
const ALLOWED_TAGS = new Set([
  'html',
  'head',
  'meta',
  'title',
  'style',
  'body',
  'main',
  'h1',
  'h2',
  'h3',
  'p',
  'div',
  'table',
  'tbody',
  'tr',
  'th',
  'td',
  'ol',
  'ul',
  'li',
  'footer',
]);
const OWNERSHIP = /\b(owns|owned|owners?|ownership)\b|\b(you|they|holder|breeder) owns?\b/i;

describe('EXAMINER-SUMMARY.html', () => {
  it('is in the bundle and says what a reader needs on one page', async () => {
    const s = await setup();
    const html = s.get(EXAMINER_FILE);
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    // The record as sealed, the identifiers, the transaction and network.
    expect(text).toContain(s.record.id);
    expect(text).toContain(s.record.recordFingerprint);
    expect(text).toContain(s.ev.record.contentHash);
    expect(text).toContain(s.batch.batchId);
    expect(text).toContain(s.batch.root);
    expect(text).toContain(TX);
    expect(text).toContain(CONTRACT);
    expect(text).toContain('Midnight preprod (a test network)');
    expect(text).toContain('2026-10-15 11:00 UTC');
    expect(text).toContain('Bred by');
    expect(text).toContain('Stated date');
    // How it was checked: what the site did, and what it did not do.
    expect(text).toMatch(/How it was checked/);
    expect(text).toMatch(/fingerprint was worked out again from the sealed fields below and matched/);
    expect(text).toMatch(/The proof leads from the record’s fingerprint to the root of batch/);
    expect(text).toMatch(/Not checked for you: the Midnight transaction/);
    expect(text).toMatch(/1 of 1 lab signature checked/);
    expect(text).toContain(`Search for transaction ${TX}.`);
    // Lab report, signature, sample receipt.
    expect(text).toContain(s.fileSha);
    expect(text).toContain(s.kp.publicKey);
    expect(text).toMatch(/\(not checked\)/);
    expect(text).toContain('Sent: Seal number');
    expect(text).toContain('Received: Seal on arrival');
    expect(text).toContain('Seal number differs: sent 4471, received 4417');
    expect(html).toContain('data-custody="covered"');
    // The Bitcoin stamp, as reported.
    expect(text).toMatch(/Pending: not yet in a Bitcoin block/);
    expect(text).toContain('ots verify root.bin.ots');
    // What it shows and does not.
    expect(text).toMatch(/What this shows/);
    expect(text).toMatch(/What this does not show/);
    expect(text).toMatch(/existed, unchanged, by that date/);
    expect(text).toMatch(/not a qualified electronic time stamp/);
    expect(text).toMatch(/VeilCore doesn’t vouch for anyone/);
    expect(text).toMatch(/not legal advice/);
    expect(text).toMatch(/runs no code and checks nothing when opened/);
    // Test network: practice data, said up front.
    expect(html).toContain('data-practice="yes"');
    expect(text).toMatch(/Practice data\. This record is dated on Midnight preprod/);
    // Product rules.
    expect(text).not.toMatch(OWNERSHIP);
    expect(text).not.toMatch(/track and trace|certif|guarantee|court-proof/i);
    if (process.env.EVIDENCE_DUMP_DIR) {
      const fs = await import('node:fs');
      fs.mkdirSync(process.env.EVIDENCE_DUMP_DIR, { recursive: true });
      for (const f of [EXAMINER_FILE, DECLARATION_FILE, 'README.txt'])
        fs.writeFileSync(`${process.env.EVIDENCE_DUMP_DIR}/${f}`, s.get(f));
    }
  });

  it('every value is text: hostile names, notes, lab names and custody fields never become markup', async () => {
    const s = await setup();
    const html = s.get(EXAMINER_FILE);
    expect(new Set(tagsOf(html))).toEqual(new Set([...tagsOf(html)].filter((t) => ALLOWED_TAGS.has(t))));
    expect(html).not.toMatch(/<script|<img|<\/style><script/i);
    expect(html.match(/<style>/g)).toHaveLength(1);
    expect(html.match(/<\/style>/g)).toHaveLength(1);
    // Each hostile string is there, escaped, where it was typed.
    expect(html).toContain(escapeHtml(`Practice ${HOSTILE}`));
    expect(html).toContain(escapeHtml(`Notes ${HOSTILE}`));
    expect(html).toContain(escapeHtml(`Lab ${HOSTILE} (not checked)`));
    expect(html).toContain(escapeHtml(`J. Doe ${HOSTILE}`));
    expect(escapeHtml('<>&"\'`')).toBe('&#60;&#62;&#38;&#34;&#39;&#96;');
  });

  it('loads nothing and runs nothing: no script, no link, no source, and a policy that forbids both', async () => {
    const s = await setup();
    const html = s.get(EXAMINER_FILE);
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/script-src|connect-src|img-src|font-src/);
    expect(html).not.toMatch(/<(script|link|iframe|object|embed|form|img|svg|base|audio|video)\b/i);
    // Every "<" a value brought is escaped, so each real "<" starts one of the page's own tags.
    const tags = html.replace(/<!--[\s\S]*?-->/g, '').match(/<[a-zA-Z!][^>]*>/g) ?? [];
    for (const tag of tags) expect(tag).not.toMatch(/\s(src|href|action|srcset|formaction|on[a-z]+)\s*=/i);
    const style = /<style>([\s\S]*)<\/style>/.exec(html)?.[1] ?? '';
    expect(style).not.toMatch(/url\(|@import|expression\(/i);
    expect(html).not.toMatch(/javascript:/i);
    // Web addresses appear only as words to type in (the explorer), never as something to load.
    for (const m of html.matchAll(/https?:\/\/[^\s<"]+/g)) {
      const before = html.slice(Math.max(0, m.index - 2), m.index);
      expect(before, m[0]).not.toMatch(/["'=]/);
    }
  });

  it('mainnet: no practice banner; not in a batch: nothing to look up; no stamp: no Bitcoin section', async () => {
    const main = await setup({ network: 'mainnet' });
    const mainHtml = main.get(EXAMINER_FILE);
    expect(mainHtml).not.toContain('data-practice');
    expect(mainHtml).toContain('Midnight&#39;s main network');
    const unbatched = await setup({ batched: false });
    const u = unbatched.get(EXAMINER_FILE).replace(/<[^>]+>/g, ' ');
    expect(u).toMatch(/not in a batch yet, so there is no proof and nothing to look up/);
    expect(u).not.toContain(TX);
    expect(u).toMatch(/This record is not dated on any network yet/);
    const noStamp = await setup({ ots: false });
    const n = noStamp.get(EXAMINER_FILE).replace(/<[^>]+>/g, ' ');
    expect(n).not.toMatch(/Bitcoin stamp|root\.bin\.ots/);
  });

  it('a withdrawn signature says so; one that does not check is not described as signed', async () => {
    const s = await setup({ withdrawn: true });
    const text = s.get(EXAMINER_FILE).replace(/<[^>]+>/g, ' ');
    expect(text).toMatch(/Withdrawn by the same key at 2026-10-16T00:00:00Z \(superseded\)/);
    const forged = await signatureLines(
      [
        {
          ...(JSON.parse(s.get('lab/signatures.json')) as Record<string, unknown>[])[0],
          documentHash: 'cd'.repeat(32),
        },
      ],
      s.record.recordFingerprint,
    );
    const html = examinerSummaryHtml(s.ev, forged, true).replace(/<[^>]+>/g, ' ');
    expect(html).toMatch(/0 of 1 lab signature checked/);
    expect(html).toMatch(/does not check\. Ignore it\./);
    expect(html).not.toMatch(/Signature checks/);
  });
});

describe('DECLARATION-TEMPLATE.txt', () => {
  it('is sample text, says so first and last, and has the bundle’s facts filled in', async () => {
    const s = await setup();
    const raw = s.get(DECLARATION_FILE);
    const flat = raw.replace(/\s+/g, ' ');
    expect(raw.split('\n')[1]).toBe('SAMPLE TEXT. NOT LEGAL ADVICE. Have a lawyer in your jurisdiction adapt it');
    expect(flat.trim().endsWith(DECLARATION_WARNING)).toBe(true);
    expect(flat).toContain(s.record.id);
    expect(flat).toContain(s.record.recordFingerprint);
    expect(flat).toContain(s.batch.root);
    expect(flat).toContain(TX);
    expect(flat).toContain('2026-10-15 12:00 UTC');
    expect(flat).toMatch(/PART 1: DECLARATION OF THE RECORD HOLDER/);
    expect(flat).toMatch(/PART 2 \(OPTIONAL\): DECLARATION OF A TECHNICAL WITNESS/);
    expect(flat).toMatch(/I declare under penalty of perjury/);
    expect(flat).toMatch(/practice data: do not use it as evidence/);
    expect(flat).toMatch(/sample ID "BLU-07", seal number "4471"/);
    expect(flat).toMatch(/I know \/ I do not know who controls that key/);
    // Where the structure comes from, and what a blockchain anchor is not.
    expect(flat).toMatch(/902\(13\) and 902\(14\)/);
    expect(flat).toMatch(/12 V\.S\.A\. 1913/);
    expect(flat).toMatch(/not qualified time stamps/);
    expect(flat).not.toMatch(OWNERSHIP);
    expect(flat).not.toMatch(/track and trace|guarantee|court-proof/i);
    // Short lines for any text reader; a long value is never broken.
    expect(raw.split('\n').filter((l) => l.length > 78 && !/[0-9A-Za-z_-]{40,}/.test(l))).toEqual([]);
  });

  it('Schedule A lists every other file in the bundle with its true SHA-256', async () => {
    const s = await setup();
    const raw = s.get(DECLARATION_FILE);
    const sched = raw.slice(raw.indexOf('SCHEDULE A'), raw.indexOf('NOTES FOR WHOEVER'));
    const listed = [...sched.matchAll(/^- (\S.*)\n {2}SHA-256 ([0-9a-f]{64})$/gm)].map((m) => [m[1], m[2]]);
    const others = Object.keys(s.files)
      .map((k) => k.slice(s.dir.length))
      .filter((k) => k !== DECLARATION_FILE)
      .sort();
    expect(listed.map((l) => l[0])).toEqual(others);
    for (const [path, sha] of listed) expect(await sha256(s.files[`${s.dir}${path}`]), path).toBe(sha);
  });
});

describe('every file the bundle names is in it', () => {
  it('README, verify.html, the summary and the declaration name only files that exist', async () => {
    for (const opts of [{}, { ots: false }, { batched: false }]) {
      const s = await setup(opts);
      const inZip = new Set(Object.keys(unzipSync(zipFiles(s.files, NOW))).map((k) => k.slice(s.dir.length)));
      // README's list is the zip's list (bundle.test.ts checks the other direction too).
      for (const f of fileList(s.ev, inZip.has('proof/root.bin.ots'))) expect(inZip.has(f.path), f.path).toBe(true);
      // verify.html's "Other files in this folder": each named file is there.
      const verify = s.get('verify.html');
      const other = /<p id="other-files">([\s\S]*?)<\/p>/.exec(verify)?.[1] ?? '';
      const named = [...other.matchAll(/<code>([^<]+)<\/code>/g)].map((m) => m[1]);
      expect(named).toEqual(['README.txt', EXAMINER_FILE, DECLARATION_FILE]);
      for (const f of named) expect(inZip.has(f), f).toBe(true);
      // The summary's and the declaration's file names.
      const names = (t: string) =>
        [
          ...t.matchAll(
            /\b((?:record|proof|lab|key|spec)\/[A-Za-z0-9._/-]+|[A-Z-]+\.(?:html|txt)|verify\.html|evidence\.json)\b/g,
          ),
        ]
          .map((m) => m[1].replace(/\.$/, ''))
          .filter((n) => !n.endsWith('/'));
      const lab = s.ev.labReport?.fileIncluded ?? '';
      const summary = s.get(EXAMINER_FILE).replace(/<[^>]+>/g, ' ');
      if (lab) expect(summary).toContain(lab);
      for (const f of names(lab ? summary.split(lab).join(' ') : summary))
        expect(inZip.has(f), `summary names ${f}`).toBe(true);
      const decl = s.get(DECLARATION_FILE).replace(/\s+/g, ' ');
      if (lab) expect(decl).toContain(lab);
      for (const f of names(lab ? decl.split(lab).join(' ') : decl))
        expect(inZip.has(f) || f === 'docs/evidence-in-practice.md', `declaration names ${f}`).toBe(true);
    }
  });
});

describe('sample receipts in the bundle (custody fields)', () => {
  const delivery = async (opts: { tamper?: boolean; noReceipt?: boolean; otherRecord?: boolean } = {}) => {
    const s = await setup();
    const sample = { sampleId: 'BLU-07', sealNumber: '4471', takenFrom: 'Mother M3', witness: 'J. Doe' };
    const arrival = { sampleId: 'BLU-07', sealNumber: '4417', sealIntact: 'yes' as const, arrivedOn: '2026-10-15' };
    const digest = await custodyDigest('T-PRACTICE-1', sample, arrival);
    const lab = await generateKeypair();
    const receipt = await signAttestation(
      {
        attestationId: `att_${'ab'.repeat(8)}_sc1_${digest}`,
        type: 'chain-of-custody',
        subjectCommitment: s.record.recordFingerprint,
        documentHash: 'e1'.repeat(32),
        hashAlgorithm: 'sha256',
        issuedAt: '2026-10-15T12:30:00Z',
        attester: { publicKey: lab.publicKey, displayName: 'Practice Lab' },
      },
      lab.privateKey,
    );
    const sent: SentTransfer = {
      id: 'T-PRACTICE-1',
      source_record: opts.otherRecord ? 'VEIL-SOMEONE-ELSE' : s.record.id,
      to_handle: 'lab',
      created_at: 1,
      claimed_at: 2,
      sample_custody: sample,
      arrival_custody: opts.tamper ? { ...arrival, condition: 'changed after signing' } : arrival,
      custodyDigest: opts.tamper
        ? await custodyDigest('T-PRACTICE-1', sample, { ...arrival, condition: 'changed after signing' })
        : digest,
      receipt_attestation_id: receipt.attestationId,
    };
    const g = { ...s.g, attestations: opts.noReceipt ? s.g.attestations : [...s.g.attestations, receipt] };
    const ev = await buildEvidence(s.record, g, {
      includeKey: false,
      labFile: { name: 'Lab report.pdf', bytes: new TextEncoder().encode('practice lab report, test data') },
      now: NOW,
      deliveries: [sent],
    });
    return { s, ev, g, sent };
  };

  it('a receipt whose signature checks covers what each side wrote; the summary and declaration show it', async () => {
    const { ev, g } = await delivery();
    expect(ev.custody).toEqual([
      {
        transferId: 'T-PRACTICE-1',
        received: true,
        receiptAttestationId: expect.stringMatching(/_sc1_[0-9a-f]{64}$/) as unknown,
        covered: 'covered',
        sample: { sampleId: 'BLU-07', sealNumber: '4471', takenFrom: 'Mother M3', witness: 'J. Doe' },
        arrival: { sampleId: 'BLU-07', sealNumber: '4417', sealIntact: 'yes', arrivedOn: '2026-10-15' },
        differences: ['Seal number differs: sent 4471, received 4417'],
      },
    ]);
    const files = await bundleFiles(ev, g, { includeKey: false });
    const dir = `${ev.record.id}-evidence/`;
    const html = strFromU8(files[`${dir}${EXAMINER_FILE}`]);
    expect(html).toContain('data-custody="covered"');
    expect(html).toContain('Seal number differs: sent 4471, received 4417');
    expect(html).toMatch(/a receipt for a sample/);
    const decl = strFromU8(files[`${dir}${DECLARATION_FILE}`]).replace(/\s+/g, ' ');
    expect(decl).toContain('sample ID "BLU-07", seal number "4471", taken from "Mother M3", witness "J. Doe"');
    expect(decl).toMatch(
      /a lab signed a receipt for it \(signature att_(ab){8}_sc1_[0-9a-f]{64}, in lab\/signatures\.json\), and its signature covers what each of us wrote/,
    );
    expect(decl).toContain(
      'The lab wrote on arrival: sample ID "BLU-07", seal number "4417", seal on arrival intact, arrived on 2026-10-15. What arrived differs from what was sent: Seal number differs: sent 4471, received 4417.',
    );
    // The summary says the coverage can be rechecked offline.
    expect(html).toContain('verify.html, in this folder, rechecks it offline');
    // evidence.json carries the same.
    expect((JSON.parse(strFromU8(files[`${dir}evidence.json`])) as Evidence).custody?.[0].covered).toBe('covered');
  });

  it('changed after signing, no checked receipt, or another plant’s delivery: never “covered”', async () => {
    expect((await delivery({ tamper: true })).ev.custody?.[0].covered).toBe('changed');
    const unsigned = (await delivery({ noReceipt: true })).ev.custody?.[0];
    expect(unsigned?.covered).toBe('unsigned');
    expect(unsigned?.differences).toEqual([]);
    expect((await delivery({ otherRecord: true })).ev.custody).toBeUndefined();
    // A forged receipt (its signature doesn't check) is unsigned too.
    const { s, g, sent } = await delivery();
    const forged = g.attestations.map((a) =>
      a.type === 'chain-of-custody' ? { ...a, issuedAt: '2020-01-01T00:00:00Z' } : a,
    );
    expect((await custodyEntries(s.record, [sent], forged))[0].covered).toBe('unsigned');
    expect((await custodyEntries(s.record, [sent], g.attestations))[0].covered).toBe('covered');
  });

  it('sealed sample details (CONTRACT.md #27): the opened values and the salt go in; the summary explains the v2 check', async () => {
    const s = await setup();
    const sample = { sampleId: 'BLU-07', sealNumber: '4471', witness: 'J. Doe' };
    const arrival = { sampleId: 'BLU-07', sealNumber: '4471', sealIntact: 'yes' as const, arrivedOn: '2026-10-15' };
    const salt = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
    const digest = await custodyDigestV2('T-PRACTICE-2', salt, sample, arrival);
    const lab = await generateKeypair();
    const receipt = await signAttestation(
      {
        attestationId: `att_${'cd'.repeat(8)}_sc2_${digest}`,
        type: 'chain-of-custody',
        subjectCommitment: s.record.recordFingerprint,
        documentHash: 'e2'.repeat(32),
        hashAlgorithm: 'sha256',
        issuedAt: '2026-10-16T12:30:00Z',
        attester: { publicKey: lab.publicKey, displayName: 'Practice Lab' },
      },
      lab.privateKey,
    );
    const sent: SentTransfer = {
      id: 'T-PRACTICE-2',
      source_record: s.record.id,
      to_handle: 'ab'.repeat(32),
      created_at: 1,
      claimed_at: 2,
      sample_custody: sample,
      arrival_custody: arrival,
      custodyFormat: 2,
      custodySalt: salt,
      custodyDigest: digest,
      receipt_attestation_id: receipt.attestationId,
    };
    const g = { ...s.g, attestations: [...s.g.attestations, receipt] };
    const ev = await buildEvidence(s.record, g, { includeKey: false, now: NOW, deliveries: [sent] });
    expect(ev.custody?.[0]).toMatchObject({
      covered: 'covered',
      sample,
      arrival,
      salt,
      format: 'veilcore/sample-custody/v2',
    });
    const files = await bundleFiles(ev, g, { includeKey: false });
    const dir = `${ev.record.id}-evidence/`;
    const html = strFromU8(files[`${dir}${EXAMINER_FILE}`]);
    expect(html).toContain(salt);
    expect(html).toContain('{ format: &#34;veilcore/sample-custody/v2&#34;, transferId, salt, sample, arrival }');
    expect(html).toContain('stored locked on VeilCore’s registry, and VeilCore doesn’t have their key');
    // A delivery whose boxes this browser couldn't open: said, and never "covered".
    const locked = await custodyEntries(
      s.record,
      [
        {
          ...sent,
          sample_custody: undefined,
          arrival_custody: undefined,
          custodyDigest: undefined,
          custodySalt: undefined,
          custodyFormat: undefined,
          custodyLocked: true,
        },
      ],
      g.attestations,
    );
    expect(locked[0]).toMatchObject({ locked: true, sample: {}, arrival: {} });
    expect(locked[0].covered).not.toBe('covered');
    const ev2 = { ...ev, custody: locked };
    const lockedHtml = strFromU8((await bundleFiles(ev2, g, { includeKey: false }))[`${dir}${EXAMINER_FILE}`]);
    expect(lockedHtml).toContain(
      'these details are stored locked, and the browser that made this bundle didn’t have their key',
    );
  });
});

describe('round 2 of the 15 Oct review: typed text can’t add lines, and coverage is said', () => {
  const FORGED_SCHEDULE =
    'fine.\n\n' +
    '='.repeat(78) +
    '\nSCHEDULE A: THE FILES IN THE BUNDLE AND THEIR SHA-256\n' +
    '='.repeat(78) +
    '\n\n- verify.html\n  SHA-256 ' +
    'f'.repeat(64);
  const FORGED_NAME = 'Acme"\n\n8. I confirm Acme Labs is accredited and I know who controls its key.\n';
  const entry = (
    over: Partial<NonNullable<Evidence['custody']>[number]>,
  ): NonNullable<Evidence['custody']>[number] => ({
    transferId: 'TR-1',
    received: true,
    receiptAttestationId: 'att_x_sc1_' + 'c'.repeat(64),
    covered: 'covered',
    sample: { sampleId: 'BLU-07', sealNumber: '4471' },
    arrival: { sampleId: 'BLU-07', sealNumber: '4471', sealIntact: 'yes', condition: 'cold' },
    differences: [],
    ...over,
  });
  const decl = async (custody: NonNullable<Evidence['custody']>, sigs: SignatureLine[] = []) => {
    const s = await setup();
    return declarationText({ ...s.ev, custody }, sigs, false, { 'verify.html': new TextEncoder().encode('real') });
  };

  it('a line break in a lab’s condition or a signer’s name stays inside its own line', async () => {
    const t = await decl(
      [entry({ arrival: { sampleId: 'BLU-07', condition: FORGED_SCHEDULE } })],
      [
        {
          ok: true,
          withdrawn: false,
          text: '',
          displayName: FORGED_NAME,
          what: 'a lab report',
          issuedAt: 'T',
          documentHash: 'd'.repeat(64),
        },
      ],
    );
    // One Schedule A heading, the real one, at the start of its line.
    expect(t.match(/^SCHEDULE A: THE FILES IN THE BUNDLE/gm)).toHaveLength(1);
    expect(t).not.toMatch(/^8\. I confirm Acme Labs/m);
    expect(t).not.toMatch(/^=+\nSCHEDULE A[^\n]*\n=+\n\n- verify\.html\n {2}SHA-256 f{64}/m);
    expect(t).not.toMatch(/^ {2}SHA-256 f{64}$/m);
    // A direction mark is folded too.
    const bidi = await decl([entry({ sample: { sampleId: 'BLU-07', sealNumber: '\u202e1744' } })]);
    expect(bidi).not.toMatch(/[\u202a-\u202e\u2066-\u2069\u200b]/);
    expect(bidi).toContain('seal number "1744"');
  });

  it('says which deliveries were signed for, which codes were never used, and the coverage; arrival values only when covered', async () => {
    const t = (
      await decl([
        entry({}),
        entry({ transferId: 'TR-2', covered: 'changed', arrival: { sealNumber: '9999', condition: 'tube cracked' } }),
        entry({
          transferId: 'TR-3',
          covered: 'not-covered',
          receiptAttestationId: 'att_old',
          arrival: { sealNumber: '8888' },
        }),
        entry({ transferId: 'TR-4', covered: 'unsigned', receiptAttestationId: null, arrival: { sealNumber: '7777' } }),
        entry({ transferId: 'TR-5', received: false, covered: 'unsigned', receiptAttestationId: null, arrival: {} }),
      ])
    ).replace(/\s+/g, ' ');
    const line = (id: string) =>
      t.slice(t.indexOf(`- Delivery ${id}:`), t.indexOf('[Describe how', t.indexOf(`- Delivery ${id}:`)) + 1);
    expect(line('TR-1')).toContain('its signature covers what each of us wrote');
    expect(line('TR-1')).toContain('The lab wrote on arrival: sample ID "BLU-07", seal number "4471"');
    expect(line('TR-1')).toContain('The sample ID and seal number the lab wrote match what I wrote.');
    expect(line('TR-2')).toMatch(/then changed what it wrote on arrival, so its signature doesn't cover that/);
    expect(line('TR-2')).not.toMatch(/wrote on arrival:|9999|tube cracked/);
    expect(line('TR-3')).toMatch(/before receipts covered sample details/);
    expect(line('TR-3')).not.toContain('8888');
    expect(line('TR-4')).toMatch(/No lab signed a receipt for it/);
    expect(line('TR-4')).not.toContain('7777');
    expect(t).toMatch(
      /- Delivery TR-5: the lab code was never used, so no lab received a sample through it\. When I made the lab code I wrote: sample ID "BLU-07", seal number "4471"\./,
    );
    expect(t.match(/The lab wrote on arrival/g)).toHaveLength(1);
  });

  it('a receipt’s signed SHA-256 is said to be the delivery’s fingerprint, not the sample’s', async () => {
    const s = await setup();
    const kp = await generateKeypair();
    const r = await signAttestation(
      {
        attestationId: 'att_r',
        type: 'chain-of-custody',
        subjectCommitment: s.record.recordFingerprint,
        documentHash: 'e1'.repeat(32),
        hashAlgorithm: 'sha256',
        issuedAt: '2026-10-15T12:30:00Z',
        attester: { publicKey: kp.publicKey, displayName: 'Lab' },
      },
      kp.privateKey,
    );
    const [line] = await signatureLines([r], s.record.recordFingerprint);
    expect(line.text).not.toMatch(/receipt for a sample with SHA-256/);
    expect(line.text).toContain(
      `Its signed SHA-256, ${'e1'.repeat(32)}, is the fingerprint of the lab's own record of the delivery, not a hash of the sample.`,
    );
    const html = examinerSummaryHtml(s.ev, [line], false);
    expect(html).toContain('Signed fingerprint (the lab’s record of the delivery, not the sample)');
  });

  it('the summary folds direction marks and line breaks to spaces, and says a key is named, not included', async () => {
    const s = await setup();
    expect(escapeHtml('Acme \u202eLabs\n8.')).toBe('Acme  Labs 8.');
    const html = examinerSummaryHtml(
      {
        ...s.ev,
        record: { ...s.ev.record, sealedFields: { ...s.ev.record.sealedFields, keyBinding: '4b'.repeat(32) } },
      },
      [],
      false,
    );
    expect(html).toContain('The record names a key; the key itself is in this bundle only if the holder included it.');
    expect(html).not.toMatch(/Names its own key/);
  });
});
