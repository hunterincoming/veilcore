// Attestations, and what they are worth.
//
// "Lab attested" collapses three very different things: an unsigned claim the registry
// recorded, a claim signed by a key, and a claim signed by a key whose holder has named
// an external accreditor. Showing them identically overstates the weakest one, which is
// the same failure as the simulate button.
//
// Two checks are made here rather than taken from the registry (attack round D):
//   - an attestation counts for a record only if it names that record's commitment.
//     A genuine signature is about whatever it names; one about record X was shown on
//     record Y because nothing compared the two;
//   - a retraction counts only if the attester signed it. An unsigned "retraction" in
//     the registry's answer used to make a genuine attestation read as withdrawn.
//
// What is still the registry's word: whether VeilCore's operator matched a key's name to
// a public licence or accreditation listing (`vettedAttester` with `registeredAs.nameCheck`,
// round 4; the procedure is docs/lab-name-checks.md). The label says exactly that: where,
// which licence, on what day. VeilCore doesn't vouch for the lab's work. A mark with no
// check record, or an expired one, reads "name not checked" (signerLabel below).
//
// SPDX-License-Identifier: Apache-2.0

import type { SignedAttestation, AttestationStrength, Retraction } from 'veilcore-records';
import { verifyAttestation, verifyRetraction } from 'veilcore-records';
import { readJson, isObject, isString } from './json';
import { enT, type Translator } from '../i18n/translate';
import type { AppKey } from '../i18n/app/en';

const BASE = import.meta.env.VITE_API_BASE ?? '';

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * What VeilCore's operator recorded when matching a key's name (registry round 4,
 * docs/lab-name-checks.md): the public listing, the licence or certificate number there,
 * the lab's own email domain the code came back from, the day, and who.
 */
export type NameCheck = {
  source: 'licence-listing' | 'accreditation';
  sourceUrl: string;
  licenceNo?: string;
  emailDomain: string;
  /** YYYY-MM-DD */
  checkedAt: string;
  /** Initials. */
  checkedBy: string;
  /** YYYY-MM-DD; the check stops counting at the start of this day (UTC). */
  expiresAt: string;
  /** The registered name the check was for. */
  checkedName: string;
};

export type ResolvedAttestation = SignedAttestation & {
  strength: AttestationStrength;
  /**
   * True only when the registry operator has checked who holds this key. Absent from
   * older registry versions, which is read as false. The registry's word.
   */
  vettedAttester?: boolean;
  registeredAs: {
    displayName?: string;
    /** The attester's own claim, recorded and not verified. */
    accreditation?: { scheme: string; identifier: string; accreditor: string } | null;
    vetted?: boolean;
    /** The operator's record of the name check (round 4). Absent from older registries. */
    nameCheck?: NameCheck | null;
    nameCheckStatus?: 'checked' | 'expired' | 'not-checked' | 'withdrawn';
  } | null;
  /** A retraction, present only when its signature verified against this attestation. */
  retraction: Retraction | null;
  /**
   * The registry reported a retraction that does not verify (unsigned, or signed by a
   * key other than the attester's). It is not honoured, and is reported as what it is.
   */
  retractionUnverified?: boolean;
  /** Verified in this browser, not taken from the registry's word for it. */
  signatureValid: boolean;
};

/** What arrives from the registry, before anything is checked. */
type IncomingAttestation = Omit<ResolvedAttestation, 'signatureValid' | 'retractionUnverified' | 'retraction'> & {
  retraction: unknown;
};

/**
 * The fields the display and the signature check actually read.
 *
 * A malformed member is dropped rather than rendered. Showing an attestation whose
 * shape we could not confirm would put a row on screen that says something about a
 * record without anything behind it, which is the failure this module exists to
 * avoid in the first place.
 */
const isIncomingAttestation = (v: unknown): v is IncomingAttestation => {
  if (!isObject(v)) return false;
  if (!isString(v.attestationId) || !isString(v.subjectCommitment)) return false;
  if (!isString(v.strength) || !isString(v.issuedAt)) return false;
  if (!isObject(v.attester) || !isString(v.attester.publicKey)) return false;
  if (v.registeredAs !== null && v.registeredAs !== undefined && !isObject(v.registeredAs)) return false;
  return true;
};

const isRetractionShape = (v: unknown): v is Retraction =>
  isObject(v) &&
  isString(v.attestationId) &&
  isString(v.attesterPublicKey) &&
  isString(v.reason) &&
  isString(v.retractedAt) &&
  isString(v.signature);

/** A retraction counts only if the attester's own key signed it, for this attestation. */
const checkRetraction = async (r: unknown, a: SignedAttestation): Promise<Retraction | null> => {
  if (!isRetractionShape(r)) return null;
  if (r.attestationId !== a.attestationId) return null;
  try {
    return (await verifyRetraction(r, a)) ? r : null;
  } catch {
    return null;
  }
};

/**
 * Every attestation about a record, checked here before being shown. Attestations about
 * any other commitment are dropped: they are not about this record.
 */
export const attestationsFor = async (commitment?: string): Promise<ResolvedAttestation[]> => {
  if (!commitment || !HEX64.test(commitment)) return [];
  try {
    const res = await fetch(`${BASE}/attestations/subject/${encodeURIComponent(commitment)}`);
    if (!res.ok) return [];
    const body = await readJson(res);
    if (!isObject(body) || !Array.isArray(body.attestations)) return [];
    const incoming = body.attestations
      .filter(isIncomingAttestation)
      // Bound to the record on screen. A valid signature about another record is a
      // valid signature about another record.
      .filter((a) => a.subjectCommitment === commitment);

    return await Promise.all(
      incoming.map(async (a): Promise<ResolvedAttestation> => {
        const { retraction: reported, ...rest } = a;
        let signatureValid = false;
        try {
          // The registry saying a signature is valid is not evidence. Checking it here is.
          signatureValid = await verifyAttestation(rest);
        } catch {
          signatureValid = false;
        }
        const retraction = reported === null || reported === undefined ? null : await checkRetraction(reported, rest);
        return {
          ...rest,
          signatureValid,
          retraction,
          retractionUnverified: reported !== null && reported !== undefined && retraction === null,
        };
      }),
    );
  } catch {
    return [];
  }
};

/** Signed, verified here, bound to the record, and not withdrawn by its signer. */
export const countsAsSigned = (a: ResolvedAttestation): boolean => a.signatureValid && a.retraction === null;

// ---- what a page may say about a signer's name (round 4) ----

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = (s: unknown): number => (typeof s === 'string' && DAY.test(s) ? Date.parse(`${s}T00:00:00Z`) : NaN);
/** 12 months, with a day to spare for a leap year. The registry refuses longer; so does this page. */
const MAX_CHECK_MS = 366 * 86_400_000;

/**
 * The name check behind a signer, if it counts here and now: the registry marked the key,
 * sent a check record for the name the key is registered under, the record's listing is an
 * https address, and it hasn't expired by this browser's clock. Otherwise null, and the
 * page says "name not checked". The record is the registry's word; the dates and the link
 * are checked here so an old or malformed record never reads as current.
 */
export const currentNameCheck = (
  a: ResolvedAttestation,
  now: number = Date.now(),
): (NameCheck & { sourceHost: string }) | null => {
  if (a.vettedAttester !== true) return null;
  const c: unknown = a.registeredAs?.nameCheck;
  if (!isObject(c)) return null;
  const name = a.registeredAs?.displayName;
  if (!isString(name) || !name.trim() || c.checkedName !== name) return null;
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
    source: c.source,
    sourceUrl: url.href,
    ...(c.licenceNo ? { licenceNo: c.licenceNo } : {}),
    emailDomain: c.emailDomain,
    checkedAt: c.checkedAt as string,
    checkedBy: c.checkedBy,
    expiresAt: c.expiresAt as string,
    checkedName: name,
    sourceHost: url.hostname.replace(/^www\./, ''),
  };
};

/** A name check that counts, on a signature that counts. Used everywhere a page names a signer. */
export const nameChecked = (a: ResolvedAttestation, now: number = Date.now()): boolean =>
  countsAsSigned(a) && currentNameCheck(a, now) !== null;

export type SignerLabel = {
  checked: boolean;
  /**
   * "<lead> Acme Labs", or "<lead> a key named “Acme Labs” (name not checked)", or
   * "<lead> a key nobody has named". No full stop, so a page can continue the sentence.
   */
  lead: string;
  /** Who, in the words that follow "signed by". */
  who: string;
  /** Only when checked: what the operator matched, in pieces so a page can link the listing. */
  match: { before: string; host: string; href: string; after: string } | null;
  /** Only when checked. */
  disclaimer: string | null;
  /** What follows the lead's full stop: '' or " VeilCore’s operator matched … VeilCore doesn’t vouch …". */
  rest: string;
  /** The whole label as plain text. */
  text: string;
};

/**
 * The one label for a signer, used on every screen (round 4).
 *
 *   checked:     "Receipt signed by Acme Labs. VeilCore’s operator matched this name to
 *                 cannabis.example.gov (license TL-1) on 2026-10-14. VeilCore doesn’t vouch
 *                 for the lab’s work."
 *   not checked: "Receipt signed by a key named “Acme Labs” (name not checked)"
 *
 * "Not checked" covers no mark, a mark with no check record (every mark made before round
 * 4), an expired check, a withdrawn signature and a signature that doesn't verify.
 */
/** The lead words the app uses, and their sentence in each language ("Receipt signed by {who}"). */
const LEADS: Record<string, AppKey> = {
  'Receipt signed by': 'app.signer.lead.receipt',
  'Signed by': 'app.signer.lead.signed',
  'signed by': 'app.signer.lead.signedLower',
  by: 'app.signer.lead.by',
};

export const signerLabel = (
  a: ResolvedAttestation,
  leadWords = 'Receipt signed by',
  now: number = Date.now(),
  tr: Translator = enT,
): SignerLabel => {
  const check = countsAsSigned(a) ? currentNameCheck(a, now) : null;
  const leadOf = (who: string) =>
    LEADS[leadWords] ? tr.t(LEADS[leadWords], { who }) : leadWords ? `${leadWords} ${who}` : ` ${who}`;
  if (check) {
    const who = check.checkedName.trim();
    const lead = leadOf(who);
    const number = check.licenceNo
      ? tr.t(check.source === 'accreditation' ? 'app.signer.certificateNo' : 'app.signer.licenseNo', {
          no: check.licenceNo,
        })
      : '';
    const match = {
      before: tr.t('app.signer.matchBefore'),
      host: check.sourceHost,
      href: check.sourceUrl,
      after: tr.t('app.signer.matchAfter', { number, date: check.checkedAt }),
    };
    const disclaimer = tr.t('app.signer.disclaimer');
    const rest = tr.t('app.signer.rest', { before: match.before, host: match.host, after: match.after, disclaimer });
    return { checked: true, lead, who, match, disclaimer, rest, text: tr.t('app.signer.text', { lead, rest }) };
  }
  const name = (a.registeredAs?.displayName ?? a.attester.displayName)?.trim();
  const who = name ? tr.t('app.signer.keyNamed', { name }) : tr.t('app.signer.keyUnnamed');
  const lead = leadOf(who);
  return { checked: false, lead, who, match: null, disclaimer: null, rest: '', text: lead };
};

/** What to tell a breeder about how much an attestation is worth. */
export const strengthLabel = (
  a: ResolvedAttestation,
  tr: Translator = enT,
): { label: string; why: string; ok: boolean } => {
  if (!a.signature) {
    return { label: tr.t('app.lab.strength.unsigned'), why: tr.t('app.lab.strength.unsignedWhy'), ok: false };
  }
  if (!a.signatureValid) {
    return { label: tr.t('app.lab.strength.invalid'), why: tr.t('app.lab.strength.invalidWhy'), ok: false };
  }
  if (a.retraction) {
    return {
      label: tr.t('app.lab.strength.retracted'),
      why: tr.t('app.lab.strength.retractedWhy', { date: tr.date(a.retraction.retractedAt) }),
      ok: false,
    };
  }
  const unverifiedRetraction = a.retractionUnverified ? tr.t('app.lab.strength.unverifiedRetraction') : '';
  // A signer is described by its name only with a current name check behind it (round 4):
  // anyone can register a key under a lab's name and sign their own record, and the
  // accreditation inside an attestation is whatever the signer typed — "Signed ·
  // accredited attester" used to be shown on exactly that (attack round 11).
  const s = signerLabel(a, 'Signed by', undefined, tr);
  if (s.checked) {
    const acc = a.registeredAs?.accreditation;
    return {
      label: tr.t('app.lab.strength.matched'),
      why: tr.t('app.lab.strength.matchedWhy', {
        text: s.text,
        acc: acc ? tr.t('app.lab.strength.accreditation', { scheme: acc.scheme, by: acc.accreditor }) : '',
        unverified: unverifiedRetraction,
      }),
      ok: true,
    };
  }
  const record: unknown = a.registeredAs?.nameCheck;
  const expired =
    a.registeredAs?.nameCheckStatus === 'expired' || (isObject(record) && dayMs(record.expiresAt) <= Date.now())
      ? tr.t('app.lab.strength.expired')
      : '';
  return {
    label: tr.t('app.lab.strength.notChecked'),
    why:
      (a.registeredAs?.displayName
        ? tr.t('app.lab.strength.anyName', { text: s.text, expired })
        : tr.t('app.lab.strength.unregistered')) + unverifiedRetraction,
    ok: false,
  };
};
