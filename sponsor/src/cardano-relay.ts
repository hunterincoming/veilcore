// The Cardano lookup the site checks stablecoin royalty payments with (bboard-ui
// veilcore/cardano-pay.ts, docs/royalty-pay.md), on the read-only relay beside the indexer
// relay. One route, GET /cardano/tx/<hash>, answered from Blockfrost's Cardano API with the
// project id kept here, never in the site. It only reads, and it answers in one fixed shape
// built field by field from what Blockfrost said: nothing of Blockfrost's own answer, errors
// or headers reaches the browser.
//
//   { hash, valid, confirmations, blockTime?, outputs: [{ address, amounts: [{ unit, quantity }] }],
//     msg: [ ...the transaction's CIP-20 (label 674) message lines ] }
//
// 404 when Cardano has no such transaction (yet). Off unless CARDANO_BLOCKFROST_PROJECT_ID is
// set. The site believes it no more than an indexer: the page works out the reference, the
// amount and the address itself, and the rule settles nothing without all three.
// SPDX-License-Identifier: Apache-2.0

export type CardanoNetwork = "mainnet" | "preprod";

export type CardanoAnswer = { readonly status: number; readonly body: unknown };

const HASH = /^[0-9a-f]{64}$/;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Blockfrost's Cardano API for a network. */
export const blockfrostCardano = (network: CardanoNetwork): string =>
  `https://cardano-${network}.blockfrost.io/api/v0`;

/** The CIP-20 message lines in Blockfrost's /txs/{hash}/metadata answer: label 674, `msg`. */
export const messageLines = (metadata: unknown): string[] => {
  if (!Array.isArray(metadata)) return [];
  const out: string[] = [];
  for (const m of metadata) {
    if (!isObj(m) || String(m.label) !== "674" || !isObj(m.json_metadata)) continue;
    const msg = m.json_metadata.msg;
    for (const l of Array.isArray(msg) ? msg : [msg])
      if (typeof l === "string" && l.length <= 64 && out.length < 64) out.push(l);
  }
  return out;
};

/** The outputs in Blockfrost's /txs/{hash}/utxos answer, only address, unit and quantity. */
export const outputsOf = (
  utxos: unknown,
): { address: string; amounts: { unit: string; quantity: string }[] }[] | undefined => {
  if (!isObj(utxos) || !Array.isArray(utxos.outputs)) return undefined;
  const out: { address: string; amounts: { unit: string; quantity: string }[] }[] = [];
  for (const o of utxos.outputs.slice(0, 500)) {
    if (!isObj(o) || typeof o.address !== "string" || o.address.length > 200 || !Array.isArray(o.amount)) return undefined;
    if (o.collateral === true) continue;
    const amounts: { unit: string; quantity: string }[] = [];
    for (const a of o.amount.slice(0, 100)) {
      if (!isObj(a) || typeof a.unit !== "string" || !/^(lovelace|[0-9a-f]{56,120})$/.test(a.unit)) return undefined;
      if (typeof a.quantity !== "string" || !/^\d{1,40}$/.test(a.quantity)) return undefined;
      amounts.push({ unit: a.unit, quantity: a.quantity });
    }
    out.push({ address: o.address, amounts });
  }
  return out;
};

export type CardanoRelay = { readonly tx: (hash: string, ip?: string) => Promise<CardanoAnswer> };

export const createCardanoRelay = (o: {
  network: CardanoNetwork;
  projectId: string;
  fetch?: typeof fetch;
  /** Lookups per client per minute. */
  perMinute?: number;
  now?: () => number;
  timeoutMs?: number;
}): CardanoRelay => {
  const f = o.fetch ?? fetch;
  const base = blockfrostCardano(o.network);
  const now = o.now ?? Date.now;
  const limit = o.perMinute ?? 30;
  const seen = new Map<string, { minute: number; count: number }>();
  const get = async (path: string): Promise<{ status: number; json?: unknown }> => {
    const res = await f(`${base}${path}`, {
      headers: { project_id: o.projectId, accept: "application/json" },
      signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
    });
    if (!res.ok) return { status: res.status };
    return { status: 200, json: (await res.json()) as unknown };
  };
  const fail = (status: number, reason: string): CardanoAnswer => ({ status, body: { ok: false, reason } });
  return {
    tx: async (hash, ip) => {
      if (!HASH.test(hash)) return fail(400, "Not a Cardano transaction hash.");
      const key = ip ?? "?";
      const minute = Math.floor(now() / 60_000);
      const c = seen.get(key);
      const count = c && c.minute === minute ? c.count + 1 : 1;
      seen.set(key, { minute, count });
      if (seen.size > 10_000) for (const [k, v] of seen) if (v.minute !== minute) seen.delete(k);
      if (count > limit) return fail(429, "Too many lookups. Try again in a minute.");
      try {
        const tx = await get(`/txs/${hash}`);
        if (tx.status === 404) return fail(404, "Cardano has no such transaction.");
        if (tx.status !== 200 || !isObj(tx.json)) return fail(502, "Cardano could not be read.");
        const [utxos, meta, tip] = await Promise.all([
          get(`/txs/${hash}/utxos`),
          get(`/txs/${hash}/metadata`),
          get("/blocks/latest"),
        ]);
        const outputs = utxos.status === 200 ? outputsOf(utxos.json) : undefined;
        const height = tx.json.block_height;
        const tipHeight = isObj(tip.json) ? tip.json.height : undefined;
        if (!outputs || meta.status !== 200 || !Number.isSafeInteger(tipHeight))
          return fail(502, "Cardano could not be read.");
        const confirmations =
          Number.isSafeInteger(height) && (tipHeight as number) >= (height as number)
            ? (tipHeight as number) - (height as number) + 1
            : 0;
        const blockTime = tx.json.block_time;
        return {
          status: 200,
          body: {
            hash,
            valid: tx.json.valid_contract !== false,
            confirmations,
            ...(Number.isSafeInteger(blockTime) ? { blockTime } : {}),
            outputs,
            msg: messageLines(meta.json),
          },
        };
      } catch {
        return fail(502, "Cardano could not be read.");
      }
    },
  };
};
