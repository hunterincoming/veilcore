// DECLARATION-TEMPLATE.txt for the evidence bundle: fill-in-the-blanks sample text for a
// declaration about the record and this bundle, by the record holder and, optionally, a
// technical witness (docs/evidence-in-practice.md says where its structure comes from:
// US Federal Rules of Evidence 902(11), (13) and (14), 28 U.S.C. 1746, Vermont 12 V.S.A.
// 1913). The facts the bundle already holds are filled in; everything only the person
// signing can know is a [blank]. Schedule A lists every other file in the bundle with its
// SHA-256, so a copy can be matched to the original file by file.
//
// It is sample text and says so at the top and the bottom: not legal advice.
// SPDX-License-Identifier: Apache-2.0

import { isNumber, isString } from '../json';
import type { Evidence, SignatureLine } from './bundle';
import { networkWords, oneLine, sealedNameOf, subjectOf, utcWords, wrap } from './words';
import { CUSTODY_LABELS, SEAL_WORDS } from './examiner';

export const DECLARATION_FILE = 'DECLARATION-TEMPLATE.txt';

export const DECLARATION_WARNING =
  'SAMPLE TEXT. NOT LEGAL ADVICE. Have a lawyer in your jurisdiction adapt it before anyone signs it.';

const hexOf = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const sha256Hex = async (bytes: Uint8Array): Promise<string> =>
  hexOf(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)));

/**
 * The template. `files` are the bundle's other files, by their path inside the bundle
 * folder (not this one): Schedule A lists each with its SHA-256.
 */
export const declarationText = async (
  ev: Evidence,
  sigs: readonly SignatureLine[],
  hasOts: boolean,
  files: Readonly<Record<string, Uint8Array>>,
): Promise<string> => {
  const fields = ev.record.sealedFields;
  // Everything anyone other than VeilCore typed is put on one line (words.ts oneLine), so no
  // value can start a line, a paragraph or a schedule of its own in the text someone signs
  // (round 2 of the 15 Oct review: a line break in a lab's notes or a signer's name did).
  const t = (v: unknown): string => oneLine(v);
  const subject = subjectOf(fields);
  const name = t(sealedNameOf(fields)) || `[${subject} name]`;
  const anchor = ev.batch?.anchor ?? null;
  const tx = anchor && isString(anchor.txHash) ? t(anchor.txHash) : null;
  const test = anchor ? anchor.network !== 'mainnet' : true;
  const ots = ev.batch && hasOts ? ev.batch.opentimestamps : null;
  const made = utcWords(ev.createdAt) ?? ev.createdAt;
  const okSigs = sigs.filter((s) => s.ok);
  const custody = ev.custody ?? [];

  const schedule: string[] = [];
  for (const path of Object.keys(files).sort()) {
    schedule.push(`- ${path}`, `  SHA-256 ${await sha256Hex(files[path])}`);
  }

  const L: string[] = [];
  const add = (...lines: string[]) => L.push(...lines);
  const rule = '='.repeat(78);
  /** Custody fields in words, each typed value in quotes on one line: 'sample ID "BLU-07", seal number "4471"'. */
  const custodyWords = (d: Readonly<Record<string, string>>): string =>
    Object.entries(d)
      .filter(([, v]) => t(v) !== '')
      .map(
        ([k, v]) =>
          `${t(CUSTODY_LABELS[k] ?? k)
            .replace(/ \(.*\)$/, '')
            .toLowerCase()
            .replace(
              /\bid\b/,
              'ID',
            )} ${k === 'sealIntact' ? t(SEAL_WORDS[v] ?? v) : k === 'takenOn' || k === 'arrivedOn' ? t(v) : `"${t(v)}"`}`,
      )
      .join(', ');

  /**
   * One delivery, in words (round 2 of the 15 Oct review): whether the lab code was used,
   * whether a lab signed a receipt for it, and whether that signature covers what each side
   * wrote. What the lab wrote on arrival is given only when the signature covers it, with
   * any difference said plainly; otherwise the coverage is said instead.
   */
  const deliveryLine = (c: (typeof custody)[number]): string => {
    const sent = custodyWords(c.sample);
    const got = custodyWords(c.arrival);
    const id = t(c.transferId);
    const wrote = ` When I made the lab code I wrote: ${sent || '[nothing]'}.`;
    const how = ' [Describe how the sample was taken, sealed and sent, and who saw it.]';
    if (c.received === false) {
      return `   - Delivery ${id}: the lab code was never used, so no lab received a sample through it.${sent ? wrote : ''}`;
    }
    const receipt = c.receiptAttestationId ? t(c.receiptAttestationId) : null;
    if (c.covered === 'covered' && receipt) {
      const diffs = c.differences.map(t);
      const matched = [
        c.sample.sampleId && c.arrival.sampleId ? 'sample ID' : null,
        c.sample.sealNumber && c.arrival.sealNumber ? 'seal number' : null,
      ].filter((x): x is string => !!x);
      const compare = diffs.length
        ? ` What arrived differs from what was sent: ${diffs.join('; ')}.`
        : matched.length
          ? ` The ${matched.join(' and ')} the lab wrote ${matched.length > 1 ? 'match' : 'matches'} what I wrote.`
          : '';
      return `   - Delivery ${id}: a lab signed a receipt for it (signature ${receipt}, in lab/signatures.json), and its signature covers what each of us wrote.${wrote} The lab wrote on arrival: ${got || '[nothing]'}.${compare}${how}`;
    }
    const used = c.received ? ' The lab code was used.' : '';
    const coverage =
      c.covered === 'changed'
        ? ` A lab signed a receipt for it (signature ${receipt ?? '[none]'}), but then changed what it wrote on arrival, so its signature doesn't cover that; it is left out here.`
        : c.covered === 'not-covered'
          ? ` A lab signed a receipt for it (signature ${receipt ?? '[none]'}) before receipts covered sample details, so its signature doesn't cover what it wrote on arrival; that is left out here.`
          : receipt
            ? ` A receipt (signature ${receipt}) is linked to it, but its signature doesn't check in this bundle or its signer withdrew it, so nothing the lab wrote is covered; it is left out here.`
            : ` No lab signed a receipt for it, so nothing the lab wrote is covered${got ? '; it is left out here' : ''}.`;
    return `   - Delivery ${id}:${used}${coverage}${wrote}${how}`;
  };

  add(rule, DECLARATION_WARNING, rule, '');
  add(
    'HOW TO USE THIS FILE',
    'This is a starting point for a written declaration about the record in this bundle and how the bundle was made and kept. Facts the bundle already holds are filled in. Everything in [square brackets] is for the person signing to fill in or delete. Delete every statement that is not true, or that you do not know yourself. Do not sign anything you have not read and checked.',
    '',
    'Courts and agencies differ on what form a declaration takes: a declaration under penalty of perjury, a sworn affidavit before a notary, a statutory declaration, or a form of their own. The closing wording below is the US federal form (28 U.S.C. 1746). The notes at the end say where the structure comes from. VeilCore does not vouch for the record, the signer, or any lab.',
  );
  if (test) {
    add(
      '',
      anchor
        ? `NOTE: this record is dated on ${t(networkWords(anchor.network))}. A test network can be reset and its dates carry no weight. This bundle is practice data: do not use it as evidence.`
        : 'NOTE: this record is not dated on any network yet. Until it is, nothing in this bundle dates it.',
    );
  }
  add('', '', rule, 'PART 1: DECLARATION OF THE RECORD HOLDER', rule, '');
  add(
    '[Name of court, office or agency, if any]',
    '[Case, application or reference number, if any]',
    '',
    `DECLARATION OF [FULL NAME] ABOUT AN ELECTRONIC RECORD OF "${name}"`,
    '',
    'I, [full name], declare:',
    '',
    `1. Who I am. I am [of legal age]. I live or work in [city, country]. I [bred / hold / keep the breeding records for] the ${subject === 'animal' ? 'animal' : 'plant material'} this record describes. [My role, for example: breeder; I run ___; employee of ___ working as ___.] I know the facts below myself [or: I know them because ___].`,
    '',
    `2. The record. On or about [date], I [or: ___, acting for me,] made an electronic record of the ${subject} "${name}" on the VeilCore website at [web address], using [device and browser]. The website sealed the record on that device. Its record ID is ${t(ev.record.id)}. Its proof code is:`,
    `   ${t(ev.record.fingerprint)}`,
    `   The sealing time inside the record, by that device's clock, is ${utcWords(ev.record.sealedAtDeviceClock) ?? t(ev.record.sealedAtDeviceClock)}. The record's contents, exactly as sealed, are in record/sealed-fields.json in the bundle and are shown in EXAMINER-SUMMARY.html. [I typed them myself / ___ typed them from ___.] [They were true to the best of my knowledge when they were typed.]`,
    '',
  );
  if (ev.batch) {
    add(
      `3. How the record was dated. VeilCore's registry put the record's proof code in batch ${t(ev.batch.batchId)}. The batch root, one code that stands for every record in the batch, is:`,
      `   ${t(ev.batch.root)}`,
    );
    if (tx && anchor) {
      add(
        `   The registry reported that this batch root was recorded on ${t(networkWords(anchor.network))}${isNumber(anchor.blockHeight) ? `, in block ${anchor.blockHeight}` : ''}${utcWords(anchor.anchoredAt) ? `, at ${utcWords(anchor.anchoredAt)}` : ''}, in transaction:`,
        `   ${tx}`,
        '   [On [date] I / ___ looked that transaction up on [explorer or indexer] and saw that it succeeded, that it called contract [address], and that it was in block [number] at [time]. / I have not looked it up myself.]',
      );
    } else {
      add('   The batch had not been recorded on a network when this bundle was made.');
    }
    if (ots) {
      add(
        `   The batch root was also stamped on Bitcoin with OpenTimestamps (proof/root.bin.ots). When the bundle was made, the registry reported the stamp as ${ots.status === 'bitcoin' ? `in Bitcoin block ${isNumber(ots.bitcoinBlockHeight) ? ots.bitcoinBlockHeight : '[not given]'}` : 'pending, not yet in a Bitcoin block'}. [Result of checking it, if done: ___]`,
      );
    }
    add('');
  } else {
    add(
      '3. How the record was dated. When this bundle was made the record was not yet in a batch, so nothing in the bundle dates it.',
      '',
    );
  }
  add(
    `4. How the files in the bundle were made. On ${made}, I [or: ___] downloaded this bundle, the folder ${t(ev.record.id)}-evidence, from the VeilCore website's page for this record, in [browser] on [device]. The website made the files from my browser's copy of the record and from what VeilCore's registry returned. It checked that the record's proof code matches its contents before making them.`,
  );
  if (ev.labReport?.fileIncluded)
    add(
      `   I chose to include the lab report file ${t(ev.labReport.fileIncluded)}. [It is the file I received from [lab] on [date] by [email / ___].]`,
    );
  if (ev.key) add("   I chose to include the record's key (key/key-binding.json).");
  add(
    '',
    '5. How the files were kept. Since it was downloaded, the bundle has been kept [where, for example: on my computer at ___; on a USB drive kept ___; sent by email to ___ on ___]. [Who else had access to it: ___.] [It has not been changed. / Describe any change.]',
    '',
    '6. True copies. The files listed in Schedule A are true and complete copies of the files in the bundle as it was downloaded. Each can be identified by its SHA-256 value, listed in Schedule A: a file with a different SHA-256 is not the same file. [I checked the values on [date] using [tool].]',
    '',
  );
  let n = 7;
  if (okSigs.length || custody.length) {
    add(`${n++}. Lab signatures, deliveries and sample receipts.`);
    for (const s of okSigs) {
      const doc = t(s.documentHash ?? '[none]');
      add(
        `   - A key that calls itself ${s.displayName ? `"${t(s.displayName)}"` : '[no name given]'} signed ${t(s.what ?? 'a statement')} about this record at ${t(s.issuedAt ?? '[time]')} (the signer's own clock).${s.withdrawn ? ' The same key later withdrew it.' : ''} ${s.type === 'chain-of-custody' ? `What it signed for the delivery is the code ${doc}: the lab's own record of the delivery, not a hash of the sample.` : s.attestationId?.endsWith('_ld1') ? `What it signed is the code ${doc}, which binds the report file to this record with a salt only the sender and the lab hold.` : `The signed document's SHA-256 is ${doc}.`} [I know / I do not know who controls that key.] [I sent the sample to [lab] on [date] by [courier, tracking number].]`,
      );
    }
    for (const c of custody) add(deliveryLine(c));
    add('');
  }
  add(
    `${n}. What I am not saying. I do not say that VeilCore, any lab, or anyone else vouches for what the record says. [Add anything else you want to make clear.]`,
    '',
    'I declare under penalty of perjury [under the laws of the United States of America, if signed outside the United States] that the foregoing is true and correct.',
    '',
    'Executed on [date] at [city, state or region, country].',
    '',
    '______________________________',
    '[Signature]',
    '[Printed name]',
    '',
    '',
    rule,
    'PART 2 (OPTIONAL): DECLARATION OF A TECHNICAL WITNESS',
    rule,
    '',
    'Use this part only if someone with the right skills checked the bundle independently. Delete it otherwise.',
    '',
    'I, [full name], declare:',
    '',
    '1. Who I am. [Qualifications: training, work, experience with cryptographic hashes, blockchains or digital evidence.] I am not employed by VeilCore [or: describe any connection to VeilCore or to the parties].',
    '',
    `2. What I received. On [date] I received the bundle, the folder ${t(ev.record.id)}-evidence, from [name], by [means]. I worked on [a copy / the original] on [computer, operating system].`,
    '',
    '3. What I checked, and how.',
    '   a. I computed the SHA-256 of each file with [tool and version]. [They match / do not match] Schedule A.',
    '   b. I opened verify.html with the network off in [browser and version]. It showed: [for example "The files agree with each other", "Proof code matches", "Proof leads to the batch root"; list every result shown].',
  );
  if (tx && anchor) {
    add(
      `   c. On [date] I looked up transaction ${tx} on ${t(networkWords(anchor.network))} using [explorer or indexer, and its address]. It [succeeded / did not], called contract [address], was in block [number] at [time], and [did / did not] write the batch root above.`,
    );
  } else {
    add('   c. [The look-up of the network transaction, once there is one.]');
  }
  if (ots) {
    add(
      '   d. I ran [ots verify proof/root.bin.ots, OpenTimestamps client version ___ / opentimestamps.org] on [date]. Result: [___].',
    );
  }
  add(
    '',
    "4. How the method works. [In plain words: a SHA-256 value changes completely if one byte of the input changes; the record's proof code is worked out from its sealed fields as the published VeilCore record format says (spec/SPEC-sections.md); the proof shows the proof code is one of the records under the batch root; the transaction shows when the batch root was recorded. Say what you did not check, for example who typed the record or whether what it says is true.]",
    '',
    'I declare under penalty of perjury [under the laws of the United States of America, if signed outside the United States] that the foregoing is true and correct.',
    '',
    'Executed on [date] at [city, state or region, country].',
    '',
    '______________________________',
    '[Signature]',
    '[Printed name]',
    '',
    '',
    rule,
    'SCHEDULE A: THE FILES IN THE BUNDLE AND THEIR SHA-256',
    rule,
    '',
    `The folder ${t(ev.record.id)}-evidence, as downloaded ${made}. This file (${DECLARATION_FILE}) is not listed: it is the one you edit.`,
    '',
    ...schedule,
    '',
    '',
    rule,
    'NOTES FOR WHOEVER ADAPTS THIS (delete before signing)',
    rule,
    '',
    '- US federal courts: Federal Rules of Evidence 902(13) and 902(14) let a record made by an electronic process, or data copied from a device or file and identified by its hash, be authenticated by a written certification of a qualified person instead of live testimony. The certification must meet Rule 902(11) or 902(12), and the other side must get reasonable written notice before the trial or hearing. It goes only to authenticity: the other side can still object on other grounds, such as hearsay or relevance. 28 U.S.C. 1746 gives the "under penalty of perjury" wording used above.',
    '- Vermont, 12 V.S.A. 1913: a record registered in a blockchain is self-authenticating with a written declaration, made under oath, of a qualified person stating their qualification, when the record entered the blockchain, when it was received from it, and that it was kept and made as a regular practice. The presumptions it gives do not cover whether the contents of the record are true.',
    '- European Union: under eIDAS (Regulation 910/2014, Article 41) only a qualified electronic time stamp, from a qualified trust service provider, is presumed accurate. The Midnight transaction and the Bitcoin stamp in this bundle are not qualified time stamps. A court may still accept them, and weighs them case by case with the rest of the evidence.',
    '- Courts look closely at how a sample or document was taken, sealed and kept (its chain of custody). Say who took and sealed the sample, and who saw it, if anyone did.',
    '- Sources and plain-English background: docs/evidence-in-practice.md in the VeilCore repository.',
    '',
    DECLARATION_WARNING,
  );
  return wrap(L.join('\n')) + '\n';
};
