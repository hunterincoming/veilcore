// Talking to the registry's deal channel (registry lineage/deals.mjs) with the keys from
// deal.ts. The registry only carries ciphertext; everything shown comes from messages that
// opened under this deal's key and carry their sender's signature.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { OnChainLicense } from './licenses';
import { isNumber, isObject, isString, readJson } from './json';
import { dealOrder } from './deal-order';
import { contentOf } from './deal-content';
import { withTabLock } from './tab-lock';
import {
  dealKeys,
  openMessage,
  sealMessage,
  signMessage,
  writeTokenHash,
  type DealBody,
  type DealKeys,
  type DealMessage,
  type DealSide,
} from './deal';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** A message as this page shows it: opened, signed, and where the registry dated it. */
export type DealEntry = DealMessage & {
  readonly seq: number;
  readonly fingerprint: string;
  readonly receivedAt: number;
  readonly signature: string;
  readonly mine: boolean;
};

const post = async (path: string, body: unknown): Promise<unknown> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new Error('Could not reach the VeilCore registry. Check your connection and try again.');
  }
  const out = await readJson(res).catch(() => undefined);
  if (!res.ok)
    throw new Error(isObject(out) && isString(out.error) ? out.error : `The registry answered ${res.status}.`);
  return out;
};

/** What a side needs to use the channel: its own key, the other's public key, the license. */
export type DealParty = {
  readonly side: DealSide;
  readonly mySecret: string;
  readonly theirPublic: string;
  readonly commitment: string;
  readonly issuerRecord: string;
  /** The license invite and this side's token for it: opening a new channel needs them (registry deals.mjs). */
  readonly invite?: { readonly id: string; readonly token: string };
};

/** The issuer's side of the deal's channel, once both keys and the license are known. */
export const dealParty = (oc: OnChainLicense): DealParty | undefined =>
  oc.partySecret && oc.licenseeNonce && oc.commitment && oc.issuerRecord
    ? {
        side: 'issuer',
        mySecret: oc.partySecret,
        theirPublic: oc.licenseeNonce,
        commitment: oc.commitment,
        issuerRecord: oc.issuerRecord,
        invite: { id: oc.inviteId, token: oc.issuerToken },
      }
    : undefined;

const dealKeyOf = (p: DealParty): string => `${p.side}:${p.commitment}:${p.issuerRecord}:${p.theirPublic}`;

/**
 * The messages of each deal as this page last read them (a license page, the backup), in
 * memory only, for as long as the page is open: never stored. Ask's "What's due" reads its
 * royalty steps from here, so it makes no request of its own (docs/ask-veilcore.md).
 */
const readHere = new Map<string, DealEntry[]>();
const readListeners = new Set<() => void>();
let readVersion = 0;

/** A deal's messages as this page last read them, or undefined when it hasn't read them. */
export const dealEntriesReadHere = (p: DealParty): readonly DealEntry[] | undefined => readHere.get(dealKeyOf(p));

/** Re-renders when this page reads a deal's messages again. */
export const useDealsReadHere = (): number =>
  useSyncExternalStore(
    (l) => {
      readListeners.add(l);
      return () => readListeners.delete(l);
    },
    () => readVersion,
  );

const keepRead = (p: DealParty, entries: DealEntry[]): DealEntry[] => {
  readHere.set(dealKeyOf(p), entries);
  readVersion++;
  readListeners.forEach((l) => l());
  return entries;
};

const opened = new Map<string, Promise<DealKeys>>();

/** The deal's keys, and the channel opened at the registry (once per page). */
export const connect = (p: DealParty): Promise<DealKeys> => {
  const id = `${p.side}:${p.commitment}:${p.issuerRecord}`;
  let k = opened.get(id);
  if (!k) {
    k = (async () => {
      const keys = await dealKeys(p.mySecret, p.theirPublic, p.commitment, p.issuerRecord);
      // Only the issuer opens the channel (registry deals.mjs); the licensee reads the one it opened.
      if (p.side !== 'issuer') return keys;
      await post('/deals', {
        dealId: keys.dealId,
        writeTokenHash: writeTokenHash(keys.writeToken),
        ...(p.invite ? { inviteId: p.invite.id, token: p.invite.token } : {}),
      });
      return keys;
    })();
    opened.set(id, k);
    k.catch(() => opened.delete(id));
  }
  return k;
};

/** Sign, encrypt and leave a message. */
export const say = async (p: DealParty, body: DealBody): Promise<{ seq: number; fingerprint: string }> => {
  const keys = await connect(p);
  const sealed = await sealMessage({ ...body, from: p.side, at: Date.now() }, p.mySecret, keys);
  const out = await post(`/deals/${keys.dealId}/messages`, { ...sealed, token: keys.writeToken });
  if (!isObject(out) || !isNumber(out.seq) || !isString(out.fingerprint))
    throw new Error('Unexpected answer from the registry.');
  return { seq: out.seq, fingerprint: out.fingerprint };
};

// ---- money messages: signed once, sent at most once --------------------------------------------
//
// say() signs with the time of each call, so a report sent again after a lost answer was a
// second signed report, and a page that read both could count what is owed twice. sayOnce
// signs a message once and keeps it, sealed, until the registry has it; sending it again
// sends that same message (the same signature, which the reader shows once). Before a resend,
// and before any report, it reads the deal fresh and sends nothing if it is already there.
// One tab at a time per deal (tab-lock.ts), so a second tab or a second tap waits, then finds
// it sent. What is kept is the ciphertext and the signature only, never the message in clear.

const OUTBOX_KEY = 'veilcore.deal-outbox.v1';
/**
 * How long a report, an answer, "I paid" or "received" that landed is remembered: a second tap
 * or tab in that time sends nothing. Other messages (payout details, reminders) are forgotten
 * once they land, so the same details can be sent again after a change in between.
 */
export const LANDED_MS = 10 * 60_000;
const ONCE: ReadonlySet<DealBody['type']> = new Set(['statement', 'reply', 'paid', 'received']);
/** How long a message signed and not yet confirmed is kept, to be sent again as it was. */
export const KEEP_MS = 30 * 86_400_000;

type Kept = {
  readonly iv: string;
  readonly ct: string;
  readonly signature: string;
  readonly madeAt: number;
  readonly landedAt?: number;
};

/** In memory when the browser keeps nothing: still one message per tab. */
let outboxHere: Record<string, Kept> = {};

const isKept = (v: unknown): v is Kept =>
  isObject(v) && isString(v.iv) && isString(v.ct) && isString(v.signature) && isNumber(v.madeAt);

const readOutbox = (now: number): Record<string, Kept> => {
  let box: Record<string, unknown> = outboxHere;
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (raw) {
      const v = JSON.parse(raw) as unknown;
      if (isObject(v)) box = v;
    }
  } catch {
    /* nothing kept, or unreadable: what this tab has */
  }
  const out: Record<string, Kept> = {};
  for (const [k, v] of Object.entries(box))
    if (isKept(v) && (v.landedAt ? now - v.landedAt < LANDED_MS : now - v.madeAt < KEEP_MS)) out[k] = v;
  return out;
};

const writeOutbox = (box: Record<string, Kept>): void => {
  outboxHere = box;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(box));
  } catch {
    /* kept in this tab only */
  }
};

const hexOf = (b: ArrayBuffer): string =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

/** Which message this is, by what it says: the deal, the side, and the body without its id. */
const outboxKeyOf = async (dealId: string, side: DealSide, body: DealBody): Promise<string> =>
  hexOf(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`veilcore/deal-outbox/v1\n${dealId}\n${side}\n${contentOf(body)}`),
    ),
  );

export type SayOnceResult = {
  readonly signature: string;
  /** It was already there (sent from another tab, or by a send whose answer was lost): nothing sent now. */
  readonly already: boolean;
};

/** For the tests: forget what this tab kept. */
export const __resetOutboxForTests = (): void => {
  outboxHere = {};
};

/**
 * Sign once, encrypt and leave a message, and never twice for what it says: for the royalty
 * messages (a report, an answer, "I paid", "received", reminders and payout details), where a
 * second copy could be counted. A failure leaves the signed message kept: trying again sends it.
 */
export const sayOnce = async (p: DealParty, body: DealBody, now: () => number = Date.now): Promise<SayOnceResult> => {
  const keys = await connect(p);
  const key = await outboxKeyOf(keys.dealId, p.side, body);
  const landed = (signature: string, already: boolean): SayOnceResult => {
    const box = readOutbox(now());
    const k = box[key];
    if (k && ONCE.has(body.type)) writeOutbox({ ...box, [key]: { ...k, landedAt: now() } });
    else if (k) {
      const rest = { ...box };
      delete rest[key];
      writeOutbox(rest);
    }
    return { signature, already };
  };
  return withTabLock(`veilcore.deal-send.${keys.dealId}`, async () => {
    // Read inside the lock: what another tab kept or sent while this one waited counts.
    const box = readOutbox(now());
    let kept = box[key];
    if (kept?.landedAt) return { signature: kept.signature, already: true };
    const again = !!kept;
    if (!kept) {
      const m = { ...body, from: p.side, at: now() } as DealMessage;
      const sealed = await sealMessage(m, p.mySecret, keys);
      kept = { iv: sealed.iv, ct: sealed.ct, signature: signMessage(m, p.mySecret), madeAt: now() };
      // Kept before it is sent: a lost answer from here on is sent again as this same message.
      writeOutbox({ ...box, [key]: kept });
    }
    if (again || body.type === 'statement') {
      const there = await readAll(p);
      const want = body.type === 'statement' ? contentOf(body) : undefined;
      if (
        there.some((e) => e.signature === kept.signature) ||
        (want !== undefined && there.some((e) => e.mine && e.type === 'statement' && contentOf(e) === want))
      )
        return landed(kept.signature, true);
    }
    const out = await post(`/deals/${keys.dealId}/messages`, { iv: kept.iv, ct: kept.ct, token: keys.writeToken });
    if (!isObject(out) || !isNumber(out.seq) || !isString(out.fingerprint))
      throw new Error('Unexpected answer from the registry.');
    return landed(kept.signature, false);
  });
};

/** Every message of the deal that opens and checks out, oldest first. Anything else is left out. */
export const readAll = async (p: DealParty): Promise<DealEntry[]> => {
  const keys = await connect(p);
  const all: DealEntry[] = [];
  const seen = new Set<string>();
  let after = 0;
  for (let page = 0; page < 20; page++) {
    let out: unknown;
    try {
      out = await post(`/deals/${keys.dealId}/read`, { token: keys.writeToken, after });
    } catch (e) {
      // Not opened yet: the issuer opens it when it sends the terms. Nothing to show so far.
      if (e instanceof Error && /no such deal/.test(e.message)) return keepRead(p, []);
      throw e;
    }
    const list = isObject(out) && Array.isArray(out.messages) ? out.messages : [];
    for (const raw of list) {
      if (!isObject(raw) || !isNumber(raw.seq) || !isString(raw.iv) || !isString(raw.ct)) continue;
      after = Math.max(after, raw.seq);
      const o = await openMessage({ iv: raw.iv, ct: raw.ct }, keys, p.side);
      // A replayed copy carries the same signature: shown once.
      if (!o || seen.has(o.signature)) continue;
      seen.add(o.signature);
      all.push({
        ...o.message,
        seq: raw.seq,
        // Worked out here, never taken from the registry (review round 3, L1).
        fingerprint: await fingerprintOf(raw.iv, raw.ct),
        receivedAt: isNumber(raw.receivedAt) ? raw.receivedAt : 0,
        signature: o.signature,
        mine: o.mine,
      });
    }
    if (list.length < 200) break;
  }
  // In the registry's order (seq), never the senders' own clocks: a message signed with an earlier
  // time can't jump ahead of one already there (panel review, M2; deal-order.ts).
  return keepRead(p, dealOrder(all));
};

/** What the registry dates for a message: SHA-256 of "iv.ct", hex (registry deals.mjs). */
export const fingerprintOf = async (iv: string, ct: string): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${iv}.${ct}`))), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/** The deal's messages, read now and every `everyMs` while mounted. */
export const useDeal = (
  p: DealParty | undefined,
  everyMs = 15_000,
): { entries: DealEntry[] | undefined; error?: string; refresh: () => void } => {
  const [entries, setEntries] = useState<DealEntry[]>();
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);
  const key = p ? dealKeyOf(p) : '';
  useEffect(() => {
    if (!p) return;
    let live = true;
    const run = () =>
      readAll(p)
        .then((e) => {
          if (!live) return;
          setEntries(e);
          setError(undefined);
        })
        .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    void run();
    const t = setInterval(() => void run(), everyMs);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [key, everyMs, tick]);
  return { entries, error, refresh: () => setTick((n) => n + 1) };
};

/**
 * The deal's record, to keep or to show anyone: every message as its sender signed it, both
 * public keys, and where to fetch the proof that the registry dated each one (its batch, then
 * Midnight and Bitcoin). Anyone can check each signature (deal.ts verifyDisclosed) without
 * VeilCore. It holds the terms and amounts in the clear: it is for the two parties, and
 * whoever they choose to show.
 */
export const downloadDealRecord = (p: DealParty, mine: string, entries: readonly DealEntry[]): void => {
  const record = dealRecordOf(p, mine, entries);
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-deal-record-${p.commitment.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** The deal's record as an object (downloadDealRecord's file, and the backup's dealRecords). */
export const dealRecordOf = (p: DealParty, mine: string, entries: readonly DealEntry[]) => {
  const keys =
    p.side === 'issuer' ? { issuer: mine, licensee: p.theirPublic } : { issuer: p.theirPublic, licensee: mine };
  return {
    v: 'veilcore/deal-record/v1',
    savedAt: new Date().toISOString(),
    license: { commitment: p.commitment, issuerRecord: p.issuerRecord },
    keys,
    signing:
      'Ed25519 over "veilcore/deal-message/v1\\n" + canonical JSON of each message (veilcore-records canonicalise)',
    messages: entries.map((e) => ({
      message: Object.fromEntries(
        Object.entries(e).filter(([k]) => !['seq', 'mine', 'signature', 'fingerprint', 'receivedAt'].includes(k)),
      ),
      signature: e.signature,
      fingerprint: e.fingerprint,
      // The registry's order and time: a checker orders the deal by seq, never the signed times.
      seq: e.seq,
      receivedAt: e.receivedAt,
      proof: `${BASE}/proof/${e.fingerprint}`,
    })),
  };
};
