// Talking to the registry's deal channel (registry lineage/deals.mjs) with the keys from
// deal.ts. The registry only carries ciphertext; everything shown comes from messages that
// opened under this deal's key and carry their sender's signature.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { isNumber, isObject, isString, readJson } from './json';
import {
  dealKeys,
  openMessage,
  sealMessage,
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

const opened = new Map<string, Promise<DealKeys>>();

/** The deal's keys, and the channel opened at the registry (once per page). */
export const connect = (p: DealParty): Promise<DealKeys> => {
  const id = `${p.side}:${p.commitment}:${p.issuerRecord}`;
  let k = opened.get(id);
  if (!k) {
    k = (async () => {
      const keys = await dealKeys(p.mySecret, p.theirPublic, p.commitment, p.issuerRecord);
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

/** Every message of the deal that opens and checks out, oldest first. Anything else is left out. */
export const readAll = async (p: DealParty): Promise<DealEntry[]> => {
  const keys = await connect(p);
  const all: DealEntry[] = [];
  const seen = new Set<string>();
  let after = 0;
  for (let page = 0; page < 20; page++) {
    const out = await post(`/deals/${keys.dealId}/read`, { token: keys.writeToken, after });
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
  // In the order their senders signed them, not the order the registry hands them over: the
  // registry can't make an older word look like the latest (review round 3, M1, L2).
  return all.sort((x, y) => x.at - y.at || (x.signature < y.signature ? -1 : 1));
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
  const key = p ? `${p.side}:${p.commitment}:${p.issuerRecord}:${p.theirPublic}` : '';
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
  const keys =
    p.side === 'issuer' ? { issuer: mine, licensee: p.theirPublic } : { issuer: p.theirPublic, licensee: mine };
  const record = {
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
      receivedAt: e.receivedAt,
      proof: `${BASE}/proof/${e.fingerprint}`,
    })),
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-deal-record-${p.commitment.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
