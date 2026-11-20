#!/usr/bin/env node
// Updates the Bitcoin checkpoints a release pins (bboard-ui/evidence-page/btc-checkpoints.json),
// which the check page and the evidence bundle's verify.html link stamped blocks to.
//
//   npm run btc:checkpoints              add new checkpoints, then commit the file
//   npm run btc:checkpoints -- --check   change nothing; ask both explorers about every pin
//
// The rule (docs/bitcoin-header-check.md, "Checkpoints"): one pin at every block height that
// is a multiple of `spacing` (144, about a day) from `start` (969696, the first block of the
// difficulty period VeilCore's first stamps are in) up to the explorers' tip minus
// `minConfirmations` (100). A new pin is trusted for these reasons together, none of them an
// explorer's word alone:
//   1. It is linked to the pins already in the file with btc-header-chain.js, the same code
//      the page runs: below the lowest pin, by the hash chain down to it; above the highest,
//      by the hash chain up from it with Bitcoin's difficulty rule on every header. So a new
//      pin is as good as the seed (971005, see the file's `seed`) plus real proof of work.
//   2. One explorer supplies the headers; the other must give the same hash for every new pin.
//   3. It is at least `minConfirmations` blocks deep at both explorers when it is pinned.
// Nothing is written unless all of that holds. Review the diff before committing: it should
// only add pins, in order, and change `updated`.
//
// Network: mempool.space and blockstream.info, a few hundred requests the first time (about a
// minute), a few dozen after. No keys.
// Tests: node --test scripts/btc-checkpoints.test.mjs
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BtcHeaderChain } from '../bboard-ui/evidence-page/btc-header-chain.js';
import { blockHashAt, EXPLORERS, fetchHeaders, planHeights, tipHeight } from '../bboard-ui/evidence-page/btc-header-fetch.js';

export const FILE = new URL('../bboard-ui/evidence-page/btc-checkpoints.json', import.meta.url);

/** A fetch that waits and tries again (three times) when an explorer says it is busy. */
export const politeFetch =
  (base = globalThis.fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms))) =>
  async (url, init) => {
    for (let i = 0; ; i++) {
      const res = await base(url, init);
      if (!(res.status === 429 || res.status >= 500) || i === 3) return res;
      await wait(2000 * 2 ** i);
    }
  };

const between = (lo, hi, spacing) => {
  const out = [];
  for (let h = Math.ceil(lo / spacing) * spacing; h <= hi; h += spacing) out.push(h);
  return out;
};

/**
 * The file with new pins added, or an Error saying why not. `log` gets one line per step.
 * Pins are only ever added, never changed or removed.
 */
export const update = async (file, opts = {}) => {
  const log = opts.log ?? (() => undefined);
  const [a, b] = opts.explorers ?? EXPLORERS;
  const fo = { fetchImpl: opts.fetchImpl, concurrency: opts.concurrency ?? 3, timeoutMs: 20_000 };
  const { spacing, start, minConfirmations } = file;
  if (!(spacing > 0 && start >= 0 && start % 2016 === 0 && minConfirmations >= 6))
    throw new Error('btc-checkpoints.json: spacing, start (a multiple of 2016) or minConfirmations is wrong');
  let pins = file.checkpoints.map((c) => ({ height: c.height, hash: c.hash }));
  if (!BtcHeaderChain.plan(pins[0].height, pins).ok) throw new Error('btc-checkpoints.json: the pins are malformed');

  const tips = [await tipHeight(a, fo), await tipHeight(b, fo)];
  const top = Math.min(...tips) - minConfirmations;
  log(`tips: ${a.name} ${tips[0]}, ${b.name} ${tips[1]}; pinning up to ${top}`);

  const agree = async (newPins) => {
    for (const p of newPins) {
      const theirs = await blockHashAt(b, p.height, fo);
      if (theirs !== p.hash) throw new Error(`${a.name} and ${b.name} give different blocks at ${p.height}`);
    }
  };
  const pinsFrom = async (headers, heights) => {
    const out = [];
    const byHeight = new Map(headers.map((h) => [h.height, h.header]));
    for (const h of heights) out.push({ height: h, hash: (await BtcHeaderChain.readHeader(byHeight.get(h))).hash });
    return out;
  };

  // Below the lowest pin: the hash chain down to it.
  const low = pins[0];
  const missingBelow = between(start, low.height - 1, spacing);
  if (missingBelow.length) {
    const from = missingBelow[0];
    const run = { height: from, checkpoints: [low], maxHeaders: low.height - from + 1 };
    const heights = [];
    for (let h = from; h <= low.height; h++) heights.push(h);
    log(`linking ${from}..${low.height} down to the pin at ${low.height} (${heights.length} headers from ${a.name})`);
    const headers = await fetchHeaders(a, heights, fo);
    const linked = await BtcHeaderChain.verifyLink({ ...run, headers });
    if (!linked.ok) throw new Error(`below ${low.height}: ${linked.reason}`);
    const added = await pinsFrom(headers, missingBelow);
    await agree(added);
    pins = [...added, ...pins];
  }

  // Above the highest pin: the hash chain up from it, with the difficulty rule.
  const high = pins[pins.length - 1];
  const missingAbove = between(high.height + 1, top, spacing);
  if (missingAbove.length) {
    const to = missingAbove[missingAbove.length - 1];
    const p = BtcHeaderChain.plan(to, pins, to - high.height + 1);
    if (!p.ok || p.direction !== 'up') throw new Error(`above ${high.height}: ${p.ok ? 'no route up' : p.reason}`);
    const heights = planHeights(p);
    log(`linking ${high.height}..${to} up from the pin at ${high.height} (${heights.length} headers from ${a.name})`);
    const headers = await fetchHeaders(a, heights, fo);
    const linked = await BtcHeaderChain.verifyLink({ height: to, headers, checkpoints: pins, maxHeaders: to - high.height + 1 });
    if (!linked.ok) throw new Error(`above ${high.height}: ${linked.reason}`);
    const added = await pinsFrom(headers, missingAbove);
    await agree(added);
    pins = [...pins, ...added];
  }

  const added = pins.length - file.checkpoints.length;
  log(added ? `${added} new pin${added === 1 ? '' : 's'}, ${b.name} agrees with each` : 'nothing new to pin');
  return {
    ...file,
    updated: added ? (opts.today ?? new Date().toISOString().slice(0, 10)) : file.updated,
    checkpoints: pins,
  };
};

/** Ask both explorers about every pin; the list of disagreements (empty when all agree). */
export const check = async (file, opts = {}) => {
  const fo = { fetchImpl: opts.fetchImpl, timeoutMs: 20_000 };
  const problems = [];
  for (const c of file.checkpoints)
    for (const ex of opts.explorers ?? EXPLORERS) {
      const theirs = await blockHashAt(ex, c.height, fo);
      if (theirs !== c.hash) problems.push(`${ex.name} gives ${theirs} at ${c.height}, the file pins ${c.hash}`);
    }
  return problems;
};

const main = async () => {
  const file = JSON.parse(readFileSync(FILE, 'utf8'));
  const fetchImpl = politeFetch();
  if (process.argv.includes('--check')) {
    const problems = await check(file, { fetchImpl });
    for (const p of problems) console.log(`DIFFERS: ${p}`);
    console.log(problems.length ? 'FAIL' : `PASS: both explorers give every one of the ${file.checkpoints.length} pins`);
    process.exit(problems.length ? 1 : 0);
  }
  const next = await update(file, { fetchImpl, log: (s) => console.log(s) });
  writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${FILE.pathname}. Review the diff, then commit it.`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  main().catch((e) => {
    console.error(`Not updated: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
