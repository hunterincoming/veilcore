// Fetching Bitcoin block headers from two explorers, for btc-header-chain.js to check.
//
// Two explorers that don't share a backend (mempool.space and blockstream.info; both serve the
// Esplora API). One supplies the headers between block N and a pinned checkpoint, ten blocks per
// request (GET /blocks/:height, from the block JSON's fields; each must hash to the block's id).
// The other must give the same block hash for block N (GET /block-height/:height). Agreement on
// that one hash is agreement on the whole run: the run is a hash chain ending at it, so an
// explorer that gives block N's hash has, by the hash's preimage resistance, the same headers
// below it. When the first explorer can't be reached the second supplies the run and the first
// is asked for the hash; both must answer.
//
// When block N is too far from every checkpoint for the run to be fetched, the result says so
// and carries only what the two explorers agree on (their word, with block N's own proof of
// work checked): the page words that as the explorers' word, never as linked.
//
// Used by the site's check page and evidence bundle (bboard-ui/src/veilcore/bitcoin/) and by
// scripts/btc-checkpoints.mjs. Not part of verify.html, which never touches the network.
// SPDX-License-Identifier: Apache-2.0

import { BtcHeaderChain } from './btc-header-chain.js';

export const EXPLORERS = [
  { name: 'mempool.space', base: 'https://mempool.space/api' },
  { name: 'blockstream.info', base: 'https://blockstream.info/api' },
];

/** An explorer couldn't be reached or answered with something that isn't an answer. */
export class Unreachable extends Error {
  constructor(message) {
    super(message);
    this.name = 'Unreachable';
  }
}
/** An explorer answered with something false (a header that doesn't hash to its id, a wrong height). */
export class Lied extends Error {
  constructor(message) {
    super(message);
    this.name = 'Lied';
  }
}

const HEX64 = /^[0-9a-f]{64}$/;

const getter = (opts) => async (url, as) => {
  const f = opts.fetchImpl || globalThis.fetch;
  let res;
  try {
    res = await f(url, {
      signal: AbortSignal.timeout(opts.timeoutMs || 10_000),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch (e) {
    throw new Unreachable(`${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) throw new Unreachable(`${url}: HTTP ${res.status}`);
  try {
    return as === 'json' ? await res.json() : (await res.text()).trim();
  } catch (e) {
    throw new Unreachable(`${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** One explorer's block hash at `height` (explorer order, lowercase hex). */
export const blockHashAt = async (explorer, height, opts = {}) => {
  const hash = await getter(opts)(`${explorer.base}/block-height/${height}`, 'text');
  if (!HEX64.test(hash)) throw new Unreachable(`${explorer.name}: not a block hash for block ${height}`);
  return hash;
};

/** One explorer's chain height. */
export const tipHeight = async (explorer, opts = {}) => {
  const t = await getter(opts)(`${explorer.base}/blocks/tip/height`, 'text');
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < 0) throw new Unreachable(`${explorer.name}: not a block height`);
  return n;
};

/**
 * The headers at `heights` from one explorer, each rebuilt from the block JSON and checked to
 * hash to the JSON's id. Pages of /blocks/:height run `concurrency` at a time (default 4).
 * Returns [{height, header}] in increasing height. Throws Unreachable or Lied.
 */
export const fetchHeaders = async (explorer, heights, opts = {}) => {
  const get = getter(opts);
  const want = new Set(heights);
  const have = new Map();
  const concurrency = Math.max(1, opts.concurrency || 4);
  // At most three rounds, and a round that adds nothing ends it: an explorer that leaves blocks
  // out can't make this browser ask again and again.
  let rounds = 0;
  while ([...want].some((h) => !have.has(h))) {
    if (++rounds > 3) throw new Unreachable(`${explorer.name}: it left some blocks out`);
    const before = have.size;
    const missing = [...want].filter((h) => !have.has(h)).sort((a, b) => b - a);
    const starts = [];
    for (const h of missing) if (!starts.some((s) => h <= s && h > s - 10)) starts.push(h);
    for (let i = 0; i < starts.length; i += concurrency) {
      const pages = await Promise.all(
        starts.slice(i, i + concurrency).map((s) => get(`${explorer.base}/blocks/${s}`, 'json')),
      );
      for (const [p, page] of pages.entries()) {
        if (!Array.isArray(page)) throw new Unreachable(`${explorer.name}: /blocks/${starts[i + p]} is not a list`);
        for (const block of page) {
          if (!block || typeof block !== 'object' || !Number.isSafeInteger(block.height)) continue;
          if (!want.has(block.height)) continue;
          let header;
          try {
            header = BtcHeaderChain.headerFromEsplora(block);
          } catch (e) {
            throw new Lied(`${explorer.name}: block ${block.height}: ${e instanceof Error ? e.message : String(e)}`);
          }
          const read = await BtcHeaderChain.readHeader(header);
          if (read.hash !== block.id)
            throw new Lied(`${explorer.name}: block ${block.height}'s fields don't hash to the id it gives`);
          const before = have.get(block.height);
          if (before && before !== header) throw new Lied(`${explorer.name}: two different blocks at ${block.height}`);
          have.set(block.height, header);
        }
      }
    }
    if (have.size === before) throw new Unreachable(`${explorer.name}: it left some blocks out`);
  }
  return [...want].sort((a, b) => a - b).map((height) => ({ height, header: have.get(height) }));
};

/** The heights a plan needs. */
export const planHeights = (p) => {
  const out = [];
  for (let h = p.from; h <= p.to; h++) out.push(h);
  for (const a of p.anchors) out.push(a.height);
  return out;
};

/**
 * Check block `height` with two explorers against the pinned `checkpoints`:
 *   { status: 'linked', linked, headers, explorers }      the run links it to a checkpoint
 *   { status: 'explorers', header, hash, explorers, why }  too far: both explorers agree on
 *                                                          its header, its own proof of work holds
 *   { status: 'failed', reason }                           an explorer gave something false, the
 *                                                          two disagree, or the run doesn't check
 *   { status: 'unreachable', reason }                      an explorer couldn't be reached
 */
export const checkBlock = async (height, checkpoints, opts = {}) => {
  const explorers = opts.explorers || EXPLORERS;
  if (explorers.length < 2 || new Set(explorers.map((e) => new URL(e.base).host)).size < 2)
    return { status: 'failed', reason: 'the check needs two block explorers on different hosts' };
  const p = BtcHeaderChain.plan(height, checkpoints, opts.maxHeaders);
  const heights = p.ok ? planHeights(p) : [height];
  let headers;
  let order = explorers;
  try {
    try {
      headers = await fetchHeaders(explorers[0], heights, opts);
    } catch (e) {
      if (!(e instanceof Unreachable)) throw e;
      order = [explorers[1], explorers[0]];
      headers = await fetchHeaders(explorers[1], heights, opts);
    }
    const second = await blockHashAt(order[1], height, opts);
    const mine = await BtcHeaderChain.readHeader(headers.find((h) => h.height === height).header);
    if (second !== mine.hash)
      return {
        status: 'failed',
        reason: `${order[0].name} and ${order[1].name} give different blocks at height ${height}`,
      };
    const names = order.map((e) => e.name);
    if (!p.ok) {
      const pow = BtcHeaderChain.powProblem(mine);
      if (pow) return { status: 'failed', reason: `block ${height}: ${pow}` };
      return { status: 'explorers', header: mine.header, hash: mine.hash, read: mine, explorers: names, why: p.code };
    }
    const linked = await BtcHeaderChain.verifyLink({ height, headers, checkpoints, maxHeaders: opts.maxHeaders });
    if (!linked.ok) return { status: 'failed', reason: linked.reason };
    return { status: 'linked', linked, headers, explorers: names };
  } catch (e) {
    if (e instanceof Unreachable) return { status: 'unreachable', reason: e.message };
    if (e instanceof Lied) return { status: 'failed', reason: e.message };
    throw e;
  }
};
