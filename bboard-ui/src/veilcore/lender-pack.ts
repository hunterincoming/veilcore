// A lender pack: one .zip a licensor gives a lender (or a buyer, or anyone weighing what a
// license earns), checkable without VeilCore (docs/agreements-live.md, item 12).
//
//   deal-records/   the signed record of this license's deal with each holder, oldest first
//                   (SPEC 11.10): every statement the licensee signed, every payment both
//                   sides signed for, exactly as signed.
//   summary.txt     what those records add up to, worked out by veilcore-records'
//                   checkDealRecord: the same code a lender runs with
//                   `npx veilcore-records deal`, so the summary is never this page's word.
//   README.txt      what it shows, what it can't, and how to check it.
//
// A lender reads everything under its own confidentiality terms; that is how royalty lending
// works, and why this pack hides nothing from them. What it adds over a spreadsheet: the
// payer's own signatures. What it can't show: who holds the licensee's key. The README says
// to confirm that with the licensee, as lenders already confirm receivables.
// SPDX-License-Identifier: Apache-2.0

import { strToU8 } from 'fflate';
import { checkDealRecord, type DealRecordCheck } from 'veilcore-records';
import type { License, OnChainLicense } from './licenses';
import type { DealParty } from './deal-client';

type DealRecord = Record<string, unknown> & { license?: { commitment?: string } };

/**
 * The deals to put in a pack: today's holder only, unless `earlier` asks for the deals of
 * holders it was handed on from (hand-on.ts), oldest first. Earlier holders' statements and
 * payments are theirs too, so they go to a third party only when asked for.
 */
export const dealsOf = (oc: OnChainLicense, earlier = false): { label: string; party: DealParty }[] =>
  [...(earlier ? (oc.previous ?? []) : []), oc].flatMap((d) =>
    d.partySecret && d.licenseeNonce && d.commitment && d.issuerRecord && d.termsSentAt
      ? [
          {
            label: d.label || 'licensee',
            party: {
              side: 'issuer' as const,
              mySecret: d.partySecret,
              theirPublic: d.licenseeNonce,
              commitment: d.commitment,
              issuerRecord: d.issuerRecord,
              invite: { id: d.inviteId, token: d.issuerToken },
            },
          },
        ]
      : [],
  );

const sums = (o: Record<string, string>): string =>
  Object.entries(o)
    .map(([cur, v]) => `${v} ${cur}`)
    .join(', ') || 'none';

/** summary.txt: one block per deal, from checkDealRecord. */
export const summaryText = (
  license: Pick<License, 'recordId' | 'agreementFingerprint'>,
  deals: readonly { label: string; file: string; check: DealRecordCheck }[],
  now: Date,
): string => {
  const out: string[] = [
    'VEILCORE LENDER PACK: SUMMARY',
    '',
    `Made ${now.toISOString().slice(0, 10)} by the licensor, from the signed records in deal-records/.`,
    `Record: ${license.recordId}`,
    `Agreement fingerprint: ${license.agreementFingerprint}`,
    '',
    'Worked out by veilcore-records checkDealRecord (SPEC 11.10), the same code as',
    '`npx veilcore-records deal <file>`. Check it yourself rather than rely on this file.',
    '',
  ];
  for (const d of deals) {
    const c = d.check;
    out.push(`== ${d.label}  (${d.file})`);
    out.push(`License commitment: ${c.license?.commitment ?? '(not named)'}`);
    out.push(`Licensee key: ${c.keys.licensee || '(not named)'}  <- confirm with the licensee that this is theirs`);
    out.push(`Messages: ${c.verified} of ${c.messages} signed by the side they name.`);
    for (const p of c.problems) out.push(`PROBLEM: ${p}`);
    for (const r of c.rejected) out.push(`Does not count: message ${r.index} (${r.type}): ${r.reason}`);
    for (const s of c.statements) {
      const state = s.settled
        ? `settled, paid ${s.paid!.paidOn} by ${s.paid!.method}, ref ${s.paid!.reference}`
        : s.paid
          ? 'licensee says paid; not confirmed'
          : s.reply === 'accepted'
            ? 'accepted, not paid'
            : s.reply === 'disputed'
              ? 'disputed'
              : 'not answered';
      out.push(`  ${s.periodFrom} to ${s.periodTo}: ${s.amountOwed} ${s.currency}, ${state}`);
      for (const n of s.notes) out.push(`      ${n}`);
    }
    out.push(`Settled (both signed): ${sums(c.settled)}`);
    out.push(`Accepted, not settled: ${sums(c.open)}`);
    out.push('');
  }
  return out.join('\n');
};

/** README.txt: for someone who has never heard of VeilCore. */
export const readmeText = (): string =>
  [
    'VEILCORE LENDER PACK',
    '',
    'This is the royalty history of one license, as the two sides signed it.',
    '',
    'WHAT IT SHOWS',
    'Each royalty statement in deal-records/ is signed by the licensee (the payer).',
    'Each acceptance and each "received" is signed by the licensor. Each "paid" is signed',
    'by the licensee. A statement counts as settled only when the licensee signed that they',
    'paid AND the licensor signed that the same amount arrived. Change one character in a',
    'file and its signature no longer checks.',
    '',
    'WHAT IT CANNOT SHOW',
    'Who holds the licensee key. One person can make both keys and sign a whole deal with',
    'themselves. Before relying on this history, confirm with the licensee directly that',
    'the licensee key in the file is theirs, as you would confirm any receivable.',
    'It also does not show that money moved, except as both sides’ signed statements.',
    '',
    'HOW TO CHECK IT (no account, nothing from VeilCore)',
    'With Node.js installed:',
    '  npx veilcore-records deal deal-records/<file>.json',
    'It checks every signature and prints the totals. The format is open: SPEC.md',
    'section 11.10 at github.com/hunterincoming/veilcore-sdk.',
    '',
    'THE LICENSE ITSELF',
    'Whether the license is live is public on the Midnight network, not in this pack: ask',
    'the licensee to prove it to you from their VeilCore page (they answer a one-time',
    'challenge you choose), or check the record’s page on veilcore.org.',
    '',
    'A CLAIM ON THE RECORD',
    'A lender can record a claim on the licensed record that only the lender can release,',
    'visible to anyone who checks the record. It flags a pledge to the next lender. It is',
    'not a legal filing: a UCC-1 or your jurisdiction’s equivalent is still yours to file.',
    '',
  ].join('\n');

const safe = (s: string) =>
  s
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'deal';

/** Every file in the pack, from records already read. */
export const lenderPackFiles = async (
  license: Pick<License, 'recordId' | 'agreementFingerprint'>,
  records: readonly { label: string; record: DealRecord }[],
  now = new Date(),
): Promise<Record<string, Uint8Array>> => {
  const files: Record<string, Uint8Array> = {};
  const deals: { label: string; file: string; check: DealRecordCheck }[] = [];
  for (const [i, r] of records.entries()) {
    const file = `deal-records/${i + 1}-${safe(r.label)}.json`;
    files[file] = strToU8(JSON.stringify(r.record, null, 2) + '\n');
    deals.push({ label: r.label, file, check: await checkDealRecord(r.record) });
  }
  files['summary.txt'] = strToU8(summaryText(license, deals, now));
  files['README.txt'] = strToU8(readmeText());
  return files;
};

/** Read every deal of the license, build the pack, and download it. */
export const downloadLenderPack = async (license: License): Promise<void> => {
  const oc = license.onChain;
  if (!oc) throw new Error('This license is not on chain.');
  const { dealRecordOf, readAll } = await import('./deal-client');
  const { publicOf } = await import('./deal');
  const records: { label: string; record: DealRecord }[] = [];
  for (const d of dealsOf(oc)) {
    const entries = await readAll(d.party);
    records.push({ label: d.label, record: dealRecordOf(d.party, publicOf(d.party.mySecret), entries) });
  }
  if (records.length === 0) throw new Error('This license has no deal messages yet.');
  const { zipFiles } = await import('./evidence/bundle');
  const zip = zipFiles(await lenderPackFiles(license, records));
  const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-lender-pack-${safe(license.recordId)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
