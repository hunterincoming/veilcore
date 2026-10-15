// Lab signatures about a record, checked by the partner rather than taken from the registry.
//
// The same rules as the site's check page (bboard-ui/src/veilcore/attesters.ts):
//   - a signature counts for a record only if it names that record's fingerprint;
//   - it is verified here (Ed25519, veilcore-records verifyAttestation), never on the
//     registry's word;
//   - a withdrawal counts only if the signer's key signed it; an unsigned one in the
//     registry's answer is ignored and reported as such;
//   - a chain-of-custody signature is a lab's receipt for a sample only when the registry
//     ties its id to a delivery of this record (the holder's /verify `custody` list); any
//     other is a signed custody statement, not tied to a delivery, and is not counted
//     (anyone can sign one about any fingerprint). A receipt whose signature doesn't cover
//     the delivery's sample details, or whose details differ from what was sent, says so;
//   - a signer is named as checked only when VeilCore's operator recorded a name check
//     (docs/lab-name-checks.md) that is current by this clock, for the name the key is
//     registered under, with an https listing. Anything else is "name not checked".
// The name check is the registry operator's record: it says the operator matched a key's
// name to a public listing on a day. VeilCore doesn't vouch for the lab's work.
// SPDX-License-Identifier: Apache-2.0

import { verifyAttestation, verifyRetraction, type Retraction, type SignedAttestation } from 'veilcore-records';
import { pairingFingerprintOfSha } from './hash.js';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';

/**
 * A name somebody else typed, fit to print: control and format characters (bidi
 * overrides, zero-width characters) removed, styled lookalikes folded (NFKC), whitespace
 * collapsed, at most 120 characters. Empty when nothing readable is left.
 */
export const cleanName = (v: unknown, max = 120): string | null => {
  if (!isString(v)) return null;
  const s = v
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}⠀ㅤﾠ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/[\p{L}\p{N}]/u.test(s)) return null;
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : s;
};

export type NameCheckStatus = 'checked' | 'expired' | 'withdrawn' | 'not-checked';

export type NameCheck = {
  /** The public listing VeilCore's operator matched the name to. */
  readonly listing: string;
  readonly listingHost: string;
  /** The licence or certificate number as listed, when there is one. */
  readonly number?: string;
  readonly numberKind?: 'license' | 'certificate';
  /** YYYY-MM-DD */
  readonly checkedOn: string;
  /** YYYY-MM-DD: the check stops counting at the start of this day (UTC). */
  readonly expiresOn: string;
};

/** One entry of the registry's /verify `custody` list: a delivery receipt and its sample details. */
export type CustodyEntry = {
  readonly receiptAttestationId: string;
  /**
   * covered: the receipt's signature covers the sample details the delivery records;
   * changed: it was signed over other details (they were changed after signing);
   * not-covered: a receipt from before sample details, which doesn't cover them.
   */
  readonly covered: 'covered' | 'changed' | 'not-covered';
  /** How what arrived differs from what was sent (e.g. another seal number), in plain words. */
  readonly differences: readonly string[];
};

export type LabReceipt = {
  /**
   * lab-receipt: a lab's receipt for a sample, tied by the registry to a delivery of this
   * record; custody-statement: a chain-of-custody signature not tied to any delivery (not
   * counted); lab-report: a signed report file; signed-statement: anything else.
   */
  readonly kind: 'lab-receipt' | 'custody-statement' | 'lab-report' | 'signed-statement';
  readonly attestationId: string;
  /** The signer's date for it. */
  readonly issuedAt: string;
  /** Verified here. */
  readonly signatureVerified: boolean;
  /** Withdrawn by its signer, with a withdrawal their key signed. Withdrawn is not deleted. */
  readonly withdrawn: boolean;
  /** The registry reports a withdrawal the signer's key did not sign: ignored. */
  readonly withdrawalNotSigned: boolean;
  /** Verified and not withdrawn (and, for chain of custody, tied to a delivery). Only these count. */
  readonly counts: boolean;
  /**
   * lab-receipt: the delivery's sample details, as the registry reports them. `clean` only
   * when the signature covers them and nothing differs: a 'changed' or 'not-covered'
   * receipt, or any difference, is never clean.
   */
  readonly custody?: {
    readonly covered: CustodyEntry['covered'];
    readonly differences: readonly string[];
    readonly clean: boolean;
  };
  readonly signer: {
    readonly publicKey: string;
    /** The name the key is registered under (anyone can register any name), cleaned. */
    readonly registeredName: string | null;
    readonly nameCheck: NameCheckStatus;
  };
  /** Present only when nameCheck is 'checked' and the signature counts. */
  readonly nameCheckRecord: NameCheck | null;
  /** lab-report: the SHA-256 of the report file the lab signed. */
  readonly documentSha256?: string;
  /** lab-report: whether it is the report saved to the record now (null: the holder doesn't share that). */
  readonly matchesSavedReport?: boolean | null;
  /** One plain sentence, the same words the site uses. */
  readonly words: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = (s: unknown): number => (isString(s) && DAY.test(s) ? Date.parse(`${s}T00:00:00Z`) : NaN);
const MAX_CHECK_MS = 366 * 86_400_000;

type Incoming = SignedAttestation & {
  vettedAttester?: unknown;
  registeredAs?: unknown;
  retraction?: unknown;
};

const isIncoming = (v: unknown): v is Incoming =>
  isObject(v) &&
  isString(v.attestationId) &&
  isString(v.subjectCommitment) &&
  isString(v.type) &&
  isString(v.issuedAt) &&
  isString(v.documentHash) &&
  isObject(v.attester) &&
  isString(v.attester.publicKey);

/** The name check behind a key, if it counts at `now`; null otherwise. */
export const currentNameCheck = (a: Incoming, now: number): NameCheck | null => {
  if (a.vettedAttester !== true || !isObject(a.registeredAs)) return null;
  const c = a.registeredAs.nameCheck;
  const name = a.registeredAs.displayName;
  if (!isObject(c) || !isString(name) || !name.trim() || c.checkedName !== name) return null;
  if (c.source !== 'licence-listing' && c.source !== 'accreditation') return null;
  if (!isString(c.emailDomain) || !c.emailDomain || !isString(c.checkedBy)) return null;
  if (c.licenceNo !== undefined && !isString(c.licenceNo)) return null;
  const at = dayMs(c.checkedAt);
  const until = dayMs(c.expiresAt);
  if (!Number.isFinite(at) || !Number.isFinite(until)) return null;
  if (until <= now || at > now + 86_400_000 || until <= at || until - at > MAX_CHECK_MS) return null;
  let url: URL;
  try {
    url = new URL(c.sourceUrl as string);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  return {
    listing: url.href,
    listingHost: url.hostname.replace(/^www\./, ''),
    ...(c.licenceNo
      ? {
          number: c.licenceNo,
          numberKind: c.source === 'accreditation' ? ('certificate' as const) : ('license' as const),
        }
      : {}),
    checkedOn: c.checkedAt as string,
    expiresOn: c.expiresAt as string,
  };
};

const statusOf = (a: Incoming, check: NameCheck | null, now: number): NameCheckStatus => {
  if (check) return 'checked';
  const reg = isObject(a.registeredAs) ? a.registeredAs : {};
  if (reg.nameCheckStatus === 'withdrawn') return 'withdrawn';
  const rec = reg.nameCheck;
  if (reg.nameCheckStatus === 'expired' || (isObject(rec) && dayMs(rec.expiresAt) <= now)) return 'expired';
  return 'not-checked';
};

const KIND_WORDS: Record<LabReceipt['kind'], string> = {
  'lab-receipt': 'Lab’s receipt for a sample',
  'custody-statement': 'Signed custody statement (not tied to a delivery)',
  'lab-report': 'Lab report',
  'signed-statement': 'Signed statement',
};

const wordsFor = (r: Omit<LabReceipt, 'words'>): string => {
  const what = KIND_WORDS[r.kind];
  if (!r.signatureVerified) return `${what}: the signature does not verify, so it is not counted.`;
  if (r.withdrawn) return `${what}: withdrawn by its signer, so it is not counted.`;
  if (r.kind === 'custody-statement') {
    const who = !r.signer.registeredName
      ? 'a key nobody has named'
      : r.signer.nameCheck === 'checked'
        ? `${r.signer.registeredName} (a name VeilCore’s operator checked)`
        : `a key named “${r.signer.registeredName}” (name not checked)`;
    return `${what}: signature verified, signed by ${who}. The registry ties it to no delivery of this record, and anyone can sign one, so it is not counted.`;
  }
  const c = r.nameCheckRecord;
  const by = c
    ? `signed by ${r.signer.registeredName}. VeilCore’s operator matched this name to ${c.listingHost}${
        c.number ? ` (${c.numberKind} ${c.number})` : ''
      } on ${c.checkedOn}. VeilCore doesn’t vouch for the lab’s work.`
    : r.signer.registeredName
      ? `signed by a key named “${r.signer.registeredName}” (name not checked). Anyone can register a key under any name, so the name doesn’t show who signed.`
      : 'signed by a key nobody has named.';
  const cu = r.custody;
  const custody = !cu
    ? ''
    : cu.covered === 'changed'
      ? ' The lab changed its arrival details after signing, so its signature does NOT cover them.'
      : cu.covered === 'not-covered'
        ? ' It doesn’t cover the sample details (an older receipt).'
        : cu.differences.length
          ? ` What arrived does NOT match what was sent: ${cu.differences.map((d) => d.replace(/[.\s]+$/, '')).join('; ')}.`
          : ' Its signature covers the sample details, and what arrived matches what was sent.';
  const report =
    r.kind === 'lab-report' && r.matchesSavedReport === true
      ? ' It is the report file saved to this record now.'
      : r.kind === 'lab-report' && r.matchesSavedReport === false
        ? ' It is not the report file saved to this record now.'
        : '';
  return `${what}, signature verified, ${by}${report}${custody}`;
};

/**
 * Check the registry's attestations for `fingerprint`. Members that are malformed or name
 * another fingerprint are dropped (`dropped` counts them): they are not about this record.
 */
export const checkSignatures = async (
  incoming: readonly unknown[],
  fingerprint: string,
  opts: {
    now: number;
    /**
     * The lab report saved to the record now, when the holder shares that: whether one is
     * saved, and its pairing fingerprint when the registry sends it. Undefined: not shared.
     */
    savedReport?: { readonly paired: boolean; readonly pairing: string | null };
    /** The registry's /verify `custody` list (when the holder shares lab status). Undefined: not shared. */
    custody?: readonly CustodyEntry[];
  },
): Promise<{ receipts: LabReceipt[]; dropped: number }> => {
  const mine = incoming.filter(isIncoming).filter((a) => a.subjectCommitment === fingerprint);
  const receipts = await Promise.all(
    mine.map(async (a): Promise<LabReceipt> => {
      const { vettedAttester: _v, registeredAs: _r, retraction: reported, ...rest } = a;
      void _v;
      void _r;
      const signed = rest;
      let signatureVerified = false;
      try {
        signatureVerified = await verifyAttestation(signed);
      } catch {
        signatureVerified = false;
      }
      let withdrawn = false;
      if (reported !== null && reported !== undefined) {
        try {
          withdrawn =
            isObject(reported) &&
            reported.attestationId === signed.attestationId &&
            (await verifyRetraction(reported as Retraction, signed));
        } catch {
          withdrawn = false;
        }
      }
      // Matched on the whole id: the registry tied exactly this receipt to a delivery.
      const delivery =
        a.type === 'chain-of-custody'
          ? opts.custody?.find((e) => e.receiptAttestationId === a.attestationId)
          : undefined;
      const kind: LabReceipt['kind'] =
        a.type === 'chain-of-custody'
          ? delivery
            ? 'lab-receipt'
            : 'custody-statement'
          : a.type === 'laboratory-report'
            ? 'lab-report'
            : 'signed-statement';
      const counts = signatureVerified && !withdrawn && kind !== 'custody-statement';
      const nameChecked = signatureVerified && !withdrawn ? currentNameCheck(a, opts.now) : null;
      const check = counts ? nameChecked : null;
      const reg = isObject(a.registeredAs) ? a.registeredAs : {};
      const name = cleanName(
        isString(reg.displayName) && reg.displayName.trim() ? reg.displayName : a.attester.displayName,
      );
      const doc = a.documentHash.toLowerCase();
      const saved = opts.savedReport;
      // Matched through the pairing fingerprint the record stores (the contract's commit over
      // the file's SHA-256), recomputed here, not through a SHA-256 the registry states.
      const matchesSavedReport =
        kind !== 'lab-report' || saved === undefined
          ? null
          : !saved.paired
            ? false
            : saved.pairing === null
              ? null
              : /^[0-9a-f]{64}$/.test(doc) && (await pairingFingerprintOfSha(doc)) === saved.pairing;
      const r: Omit<LabReceipt, 'words'> = {
        kind,
        attestationId: a.attestationId.slice(0, 200),
        issuedAt: a.issuedAt.slice(0, 40),
        signatureVerified,
        withdrawn,
        withdrawalNotSigned: reported !== null && reported !== undefined && !withdrawn,
        counts,
        signer: {
          publicKey: a.attester.publicKey,
          registeredName: name,
          nameCheck: statusOf(a, nameChecked, opts.now),
        },
        nameCheckRecord: check,
        ...(kind === 'lab-report'
          ? {
              documentSha256: doc,
              matchesSavedReport,
            }
          : {}),
        ...(delivery
          ? {
              custody: {
                covered: delivery.covered,
                differences: delivery.differences,
                clean: delivery.covered === 'covered' && delivery.differences.length === 0,
              },
            }
          : {}),
      };
      return { ...r, words: wordsFor(r) };
    }),
  );
  return { receipts, dropped: incoming.length - mine.length };
};
