// The private channel between the two sides of one license (docs/agreements-live.md, 3).
//
// Each side makes one Ed25519 key for the deal. Its public half is the random value that
// side contributes to the 6-digit code (license-invites.ts: the licensee's nonce and the
// issuer's nonce), so the two people who read the same code to each other know they hold
// each other's real keys: a registry that swapped a key would make the codes differ.
//
// One key, two uses, as libsodium and age do with Ed25519 keys:
//   - signing: every message is signed by its sender, so a statement, an acceptance or a
//     confirmation of payment can be shown to anyone later as that party's own words;
//   - key agreement: the same key, converted to X25519, gives both sides one shared secret,
//     from which come the encryption key, the channel's id at the registry and the token
//     that lets them write to it. The registry stores only ciphertext and can neither read
//     nor forge a message (a forged one fails the signature, a changed one fails AES-GCM).
//
// Bound to the license: the key derivation is salted with the license's commitment and the
// issuer record it was keyed on, so the same two keys used for another license give
// another channel.
// SPDX-License-Identifier: Apache-2.0

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { canonicalise } from 'veilcore-records';
import { currencyDigits, isDecimal, sumAmounts } from './money';

const HEX64 = /^[0-9a-f]{64}$/;
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const bytes = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const utf8 = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s);
const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64u = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) =>
    c.charCodeAt(0),
  );

/**
 * Ed25519 verification that refuses what lenient verification lets through (review round 3,
 * M4): a public key of small order (with which a trivial signature "verifies" for every
 * message), a non-canonical encoding, and anything but strict RFC 8032 (zip215: false).
 */
export const verifyStrict = (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean => {
  try {
    if (publicKey.length !== 32 || signature.length !== 64) return false;
    const point = ed25519.Point.fromHex(hex(publicKey));
    if (point.isSmallOrder()) return false;
    return ed25519.verify(signature, message, publicKey, { zip215: false });
  } catch {
    return false;
  }
};

/** A side's key for one deal: the secret stays on its device (and in its backup). */
export type PartyKey = { readonly secret: string; readonly public: string };

export const newPartyKey = (): PartyKey => {
  const secret = ed25519.utils.randomSecretKey();
  return { secret: hex(secret), public: hex(ed25519.getPublicKey(secret)) };
};

export const publicOf = (secret: string): string => hex(ed25519.getPublicKey(bytes(secret)));

/** What both sides derive, and only they can. */
export type DealKeys = {
  /** The channel's name at the registry: 32 hex characters. */
  readonly dealId: string;
  /** Lets either side write to the channel; the registry keeps only its SHA-256. */
  readonly writeToken: string;
  readonly enc: CryptoKey;
  readonly mine: string;
  readonly theirs: string;
};

export const dealKeys = async (
  mySecret: string,
  theirPublic: string,
  commitment: string,
  issuerRecord: string,
): Promise<DealKeys> => {
  for (const [name, v] of [
    ['key', mySecret],
    ['their key', theirPublic],
    ['commitment', commitment],
    ['record', issuerRecord],
  ] as const)
    if (!HEX64.test(v)) throw new Error(`The deal's ${name} is not 64 hex characters.`);
  let shared: Uint8Array;
  try {
    shared = x25519.getSharedSecret(
      ed25519.utils.toMontgomerySecret(bytes(mySecret)),
      ed25519.utils.toMontgomery(bytes(theirPublic)),
    );
  } catch {
    throw new Error('The other side’s key is not a usable key.');
  }
  if (shared.every((b) => b === 0)) throw new Error('The other side’s key is not a usable key.');
  const salt = sha256(bytes(commitment + issuerRecord));
  const okm = hkdf(sha256, shared, salt, utf8('veilcore/deal/v1'), 64);
  const enc = await crypto.subtle.importKey('raw', okm.slice(0, 32) as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  return {
    dealId: hex(okm.slice(32, 48)),
    writeToken: b64u(okm.slice(48, 64)),
    enc,
    mine: publicOf(mySecret),
    theirs: theirPublic,
  };
};

/** SHA-256 of the write token, hex: all the registry ever learns of it. */
export const writeTokenHash = (token: string): string => hex(sha256(utf8(token)));

// --- messages --------------------------------------------------------------------------

/** What a side may say. Amounts are decimal strings, never floats. */
export type DealBody =
  | {
      readonly type: 'terms';
      /**
       * The agreement as the issuer drew it up: everything the licensee needs to recompute its
       * fingerprint (licenses.ts sealAgreement) and check it is the one they are agreeing to.
       */
      readonly agreementType: string;
      readonly terms: Record<string, unknown>;
      readonly recordFingerprint: string;
      readonly agreementSalt: string;
      readonly agreementFingerprint: string;
    }
  | { readonly type: 'agree'; readonly agreementFingerprint: string }
  | {
      /** The licensee's own record of the licensed plant: where an offspring royalty goes on chain. */
      readonly type: 'plant-record';
      readonly recordIdentity: string;
      readonly name: string;
    }
  | {
      readonly type: 'payout';
      /** How the payee wants to be paid: a payment partner and its account, or other. */
      readonly method: string;
      readonly account: string;
      readonly currency: string;
      /** Bank transfer details as the payee wrote them (several lines). */
      readonly details?: string;
      /** The payee's own payment link (https), where offered. */
      readonly link?: string;
      /**
       * For a token paying a currency (`cardano:USDCx` for USD): how many units of the currency
       * one token counts as. Only "1" is offered: the payee signs that the token pays at par
       * (cardano-pay.ts, SPEC 11.10 "Settled on chain"). Absent for every other method.
       */
      readonly rate?: string;
    }
  | {
      /** The payee's details for an invoice: only for a statement called an invoice. */
      readonly type: 'invoice-details';
      readonly legalName: string;
      readonly address?: string;
      /** A VAT number, a Japan T-number or the like, as the payee wrote it. */
      readonly taxId?: string;
    }
  | {
      /**
       * A signed, dated note to the other side about one period (royalty-ledger.ts): a reminder
       * from either side, or a notice of breach from the licensor. It says only what the
       * period's dates and the messages show; it never decides who is late.
       */
      readonly type: 'notice';
      readonly kind: 'reminder' | 'breach';
      readonly about: 'report' | 'answer' | 'payment' | 'receipt' | 'other';
      readonly periodFrom: string;
      readonly periodTo: string;
      /** The report it is about, by its signature, when there is one. */
      readonly statementSig?: string;
      /** The date the terms set for the step, when they set one. */
      readonly dueOn?: string;
      /** The sender's calendar date when it was sent. */
      readonly asOf: string;
      readonly note?: string;
    }
  | {
      readonly type: 'statement';
      readonly statementId: string;
      readonly periodFrom: string;
      readonly periodTo: string;
      /** What the royalty is figured on: reported sales, or units under a flat fee. */
      readonly basis: 'sales' | 'units';
      readonly quantity: string;
      readonly currency: string;
      readonly amountOwed: string;
      readonly note?: string;
      /** The sales report the figure came from: its fingerprint, not the file (evidence.ts). */
      readonly evidence?: { readonly sha256: string; readonly name: string; readonly size: number };
      /**
       * The lines the amount is made of (royalty-ledger.ts StatementLine), each rounded to the
       * currency on its own; amountOwed is their sum. Absent on statements made before them.
       */
      readonly lines?: readonly StatementLine[];
      /** Tax the payer withholds and pays to its tax office, declared with the report. */
      readonly taxWithheld?: string;
      readonly taxNote?: string;
      /** The report this one corrects, by its signature: one the licensor asked to fix. */
      readonly replaces?: string;
    }
  | {
      readonly type: 'reply';
      readonly statementId: string;
      /** The statement's own signature: names exactly one statement, whatever its id (review round 3, M2). */
      readonly statementSig: string;
      readonly decision: 'accepted' | 'disputed';
      readonly note?: string;
    }
  | {
      readonly type: 'paid';
      readonly statementId: string;
      /** The statement's own signature: names exactly one statement, whatever its id (review round 3, M2). */
      readonly statementSig: string;
      readonly amount: string;
      readonly currency: string;
      readonly method: string;
      /** The account it was paid to, as the payer saw it. */
      readonly payTo: string;
      readonly reference: string;
      readonly paidOn: string;
      /** The payout details it was paid to, by their signature: a change since shows. */
      readonly payoutSig?: string;
      /** Tax withheld from the amount owed: amount is what was sent after it. */
      readonly taxWithheld?: string;
      readonly taxNote?: string;
      /** The payer ticked that it confirmed changed details with the payee another way. */
      readonly detailsConfirmed?: boolean;
    }
  | {
      readonly type: 'received';
      readonly statementId: string;
      /** The statement's own signature: names exactly one statement, whatever its id (review round 3, M2). */
      readonly statementSig: string;
      readonly amount: string;
      readonly currency: string;
      readonly note?: string;
    }
  | {
      /**
       * The licensee asks the licensor to hand this license on to someone else (hand-on.ts).
       * A request only: nothing moves until both of them act on chain.
       */
      readonly type: 'handon-ask';
      /** Who to, in the licensee's words. */
      readonly to: string;
      readonly note?: string;
    }
  | {
      /**
       * The licensor names the new holder's license commitment, checked with them by a
       * read-aloud code: what the current holder proposes the move to (proposeTransfer), and
       * the only one the licensor will approve (approveTransfer checks it).
       */
      readonly type: 'handon';
      readonly newLicense: string;
      /** The new holder, in the licensor's words. */
      readonly to: string;
    }
  | {
      /**
       * The licensor called off the hand-on to `newLicense`: the current holder's page stops
       * offering it. Nothing on chain changes (the contract still approves only one commitment).
       */
      readonly type: 'handon-off';
      readonly newLicense: string;
    }
  | {
      /** A W3C Verifiable Credential the licensor signed for the licensee to keep (credentials.ts). */
      readonly type: 'credential';
      readonly credential: Record<string, unknown>;
    };

/** One line of a statement: what it is for, how it was worked out, and what it comes to. */
export type StatementLine = {
  readonly kind: 'royalty' | 'offspring' | 'minimum';
  /** Sales in the currency, or a count of units (absent on a minimum top-up). */
  readonly quantity?: string;
  /** The rate as the terms set it: a percent for sales, an amount per unit. */
  readonly rate?: string;
  /** For a percent of net sales: the gross figure and what was taken off it (capped as the terms say). */
  readonly gross?: string;
  readonly deducted?: string;
  readonly amount: string;
};

export type DealSide = 'issuer' | 'licensee';

/** A message as signed: who, when, what. */
export type DealMessage = DealBody & { readonly from: DealSide; readonly at: number };

/**
 * The bytes a signature covers: the canonical JSON every VeilCore format uses (keys sorted,
 * no spaces; veilcore-records canonicalise), so a partner or a court can recompute them.
 */
export const canonical = (v: DealMessage): string => canonicalise(v);

const DOMAIN = 'veilcore/deal-message/v1\n';

/** What goes to the registry: the IV and the ciphertext, base64url. */
export type Sealed = { readonly iv: string; readonly ct: string };

/**
 * This side's signature on a message, hex. Ed25519 is deterministic: the same message (its
 * signed time included) always has the same signature, which is how a resent copy is known.
 */
export const signMessage = (m: DealMessage, mySecret: string): string =>
  hex(ed25519.sign(utf8(DOMAIN + canonical(m)), bytes(mySecret)));

/** Sign with this side's key, then encrypt for the channel. */
export const sealMessage = async (m: DealMessage, mySecret: string, keys: DealKeys): Promise<Sealed> => {
  const sig = signMessage(m, mySecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: utf8(keys.dealId) },
      keys.enc,
      utf8(JSON.stringify({ m, sig })),
    ),
  );
  return { iv: b64u(iv), ct: b64u(ct) };
};

/**
 * Whether a signed message has the shape its type says, field by field. A message from the
 * other side can be signed and still carry an object where a page expects text, or a time
 * that isn't one; shown as is, that broke the whole license page, Revoke included (attack pass
 * 21 Oct, finding 4). Anything that doesn't fit is dropped like a bad signature.
 */
export const wellFormed = (m: unknown, now = Date.now()): m is DealMessage => {
  if (typeof m !== 'object' || m === null || Array.isArray(m)) return false;
  const o = m as Record<string, unknown>;
  const text = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
  const opt = (v: unknown, max = 1000) => v === undefined || text(v, max);
  const day = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const dec = (v: unknown) => typeof v === 'string' && v.length <= 40 && isDecimal(v);
  const sig = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{128}$/.test(v);
  const plain = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const optDec = (v: unknown) => v === undefined || dec(v);
  const optSig = (v: unknown) => v === undefined || sig(v);
  /** An amount as the published checker reads it (no leading zeros), in at most the currency's digits. */
  const money = (v: unknown, digits: number) =>
    dec(v) && /^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(v as string) && ((v as string).split('.')[1] ?? '').length <= digits;
  const line = (v: unknown, digits: number): boolean => {
    if (!plain(v)) return false;
    const l = v as Record<string, unknown>;
    const known = ['kind', 'quantity', 'rate', 'gross', 'deducted', 'amount'];
    return (
      Object.keys(l).every((k) => known.includes(k)) &&
      (l.kind === 'royalty' || l.kind === 'offspring' || l.kind === 'minimum') &&
      optDec(l.quantity) &&
      opt(l.rate, 40) &&
      optDec(l.gross) &&
      optDec(l.deducted) &&
      money(l.amount, digits)
    );
  };
  /** Lines, when there are any: well formed, and adding up to the amount owed to the last digit. */
  const linesSumTo = (v: unknown, owed: unknown, currency: unknown): boolean => {
    if (v === undefined) return true;
    const digits = currencyDigits(typeof currency === 'string' ? currency : undefined);
    if (!Array.isArray(v) || v.length === 0 || v.length > 12 || !v.every((l) => line(l, digits))) return false;
    const amounts = (v as { amount: string }[]).map((l) => l.amount);
    const places = Math.max(0, ...[...amounts, owed as string].map((a) => (a.split('.')[1] ?? '').length));
    if (places > 8) return false;
    const sum = sumAmounts(amounts, places);
    return sum !== undefined && sum === sumAmounts([owed as string], places);
  };
  if (o.from !== 'issuer' && o.from !== 'licensee') return false;
  // Signed times from 2020 to a day ahead: the order of the deal is the order of these.
  if (typeof o.at !== 'number' || !Number.isSafeInteger(o.at) || o.at < 1_577_836_800_000 || o.at > now + 86_400_000)
    return false;
  switch (o.type) {
    case 'terms':
      return (
        text(o.agreementType, 40) &&
        plain(o.terms) &&
        text(o.recordFingerprint) &&
        text(o.agreementSalt) &&
        text(o.agreementFingerprint)
      );
    case 'agree':
      return text(o.agreementFingerprint);
    case 'plant-record':
      return text(o.recordIdentity) && text(o.name);
    case 'payout':
      return (
        text(o.method, 80) &&
        text(o.account) &&
        text(o.currency, 10) &&
        opt(o.details, 1000) &&
        (o.link === undefined || (text(o.link, 300) && /^https:\/\/\S+$/.test(o.link as string))) &&
        optDec(o.rate)
      );
    case 'invoice-details':
      return text(o.legalName, 200) && o.legalName !== '' && opt(o.address, 500) && opt(o.taxId, 80);
    case 'notice':
      return (
        (o.kind === 'reminder' || (o.kind === 'breach' && o.from === 'issuer')) &&
        ['report', 'answer', 'payment', 'receipt', 'other'].includes(o.about as string) &&
        day(o.periodFrom) &&
        day(o.periodTo) &&
        optSig(o.statementSig) &&
        (o.dueOn === undefined || day(o.dueOn)) &&
        day(o.asOf) &&
        opt(o.note) &&
        (o.kind !== 'breach' || (typeof o.note === 'string' && o.note.trim() !== ''))
      );
    case 'statement': {
      const e = o.evidence as Record<string, unknown> | undefined;
      return (
        text(o.statementId, 100) &&
        day(o.periodFrom) &&
        day(o.periodTo) &&
        (o.basis === 'sales' || o.basis === 'units') &&
        dec(o.quantity) &&
        text(o.currency, 10) &&
        dec(o.amountOwed) &&
        opt(o.note) &&
        linesSumTo(o.lines, o.amountOwed, o.currency) &&
        optDec(o.taxWithheld) &&
        opt(o.taxNote, 300) &&
        optSig(o.replaces) &&
        (e === undefined ||
          (plain(e) &&
            typeof e.sha256 === 'string' &&
            /^[0-9a-f]{64}$/.test(e.sha256) &&
            text(e.name) &&
            Number.isSafeInteger(e.size)))
      );
    }
    case 'reply':
      return (
        text(o.statementId, 100) &&
        sig(o.statementSig) &&
        (o.decision === 'accepted' || o.decision === 'disputed') &&
        opt(o.note)
      );
    case 'paid':
      return (
        text(o.statementId, 100) &&
        sig(o.statementSig) &&
        dec(o.amount) &&
        text(o.currency, 10) &&
        text(o.method, 80) &&
        text(o.payTo) &&
        text(o.reference, 120) &&
        day(o.paidOn) &&
        optSig(o.payoutSig) &&
        optDec(o.taxWithheld) &&
        opt(o.taxNote, 300) &&
        (o.detailsConfirmed === undefined || typeof o.detailsConfirmed === 'boolean')
      );
    case 'received':
      return text(o.statementId, 100) && sig(o.statementSig) && dec(o.amount) && text(o.currency, 10) && opt(o.note);
    case 'handon-ask':
      return text(o.to, 80) && o.to !== '' && opt(o.note);
    case 'handon':
      return typeof o.newLicense === 'string' && /^[0-9a-f]{64}$/.test(o.newLicense) && text(o.to, 80) && o.to !== '';
    case 'handon-off':
      return typeof o.newLicense === 'string' && /^[0-9a-f]{64}$/.test(o.newLicense);
    case 'credential':
      return plain(o.credential);
    default:
      return false;
  }
};

/** A message that opened and whose signature is its claimed sender's. */
export type Opened = { readonly message: DealMessage; readonly signature: string; readonly mine: boolean };

/**
 * Decrypt and check. Undefined for anything that doesn't open under this channel's key, isn't
 * signed by the side it names, or isn't one of the two keys of this deal.
 */
export const openMessage = async (s: Sealed, keys: DealKeys, myside: DealSide): Promise<Opened | undefined> => {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64u(s.iv) as BufferSource, additionalData: utf8(keys.dealId) },
      keys.enc,
      unb64u(s.ct) as BufferSource,
    );
    const { m, sig } = JSON.parse(new TextDecoder().decode(plain)) as { m: DealMessage; sig: string };
    if (m?.from !== 'issuer' && m?.from !== 'licensee') return undefined;
    const mine = m.from === myside;
    const signer = mine ? keys.mine : keys.theirs;
    if (typeof sig !== 'string' || !/^[0-9a-f]{128}$/.test(sig)) return undefined;
    if (!verifyStrict(bytes(sig), utf8(DOMAIN + canonical(m)), bytes(signer))) return undefined;
    if (!wellFormed(m)) return undefined;
    return { message: m, signature: sig, mine };
  } catch {
    return undefined;
  }
};

/** Check a disclosed message against a public key, without the channel: for a third party. */
export const verifyDisclosed = (m: DealMessage, signature: string, signerPublic: string): boolean => {
  try {
    return verifyStrict(bytes(signature), utf8(DOMAIN + canonical(m)), bytes(signerPublic));
  } catch {
    return false;
  }
};
