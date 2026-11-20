// Bitcoin block headers, checked in a browser: proof of work, and a link to a pinned checkpoint.
//
// An OpenTimestamps stamp ends on a value that one Bitcoin block's merkle root must be. Saying
// "block N holds it" normally means asking a block explorer. This file lets a page check it
// instead, from 80-byte block headers that anyone may supply (an explorer, a file):
//
//   - each header hashes (double SHA-256) to at or under the target its own nBits sets, and
//     that target is no easier than Bitcoin's minimum (powLimit);
//   - each header's previous-block field is the hash of the header one lower, so the headers
//     form one chain;
//   - the chain reaches a checkpoint: a block height and hash pinned in the page itself, chosen
//     and updated as docs/bitcoin-header-check.md says;
//   - going up from a checkpoint (to a block newer than every checkpoint), nBits must follow
//     Bitcoin's difficulty rule exactly: unchanged inside each 2016-block period, and at each
//     adjustment the value Bitcoin Core's CalculateNextWorkRequired gives. So every header on
//     the way up carries real mainnet difficulty, not an easy target someone chose.
//
// Going down from a checkpoint (to an older block) the hash chain alone ties block N to the
// pinned hash; the proof of work is checked too. Nothing here asks the network: the caller
// fetches the headers (bboard-ui/src/veilcore/bitcoin/header-fetch.ts does, from two
// explorers that must agree) and this file decides. Every check is a verifier: a bad input is
// a failed result with a reason, never a thrown error.
//
// Plain browser JavaScript with no imports. verify.html (the evidence bundle's offline page)
// copies it in as it is, minus the one `export` line at the end; the site and the tests import
// it as a module. SHA-256 comes from the browser's own WebCrypto. Mainnet only: testnets have
// other rules (minimum-difficulty blocks) and are refused by the difficulty check.
// SPDX-License-Identifier: Apache-2.0

var BtcHeaderChain = (function () {
  'use strict';

  /** Bitcoin mainnet's easiest allowed target: nBits 0x1d00ffff, difficulty 1 (chainparams powLimit). */
  var POW_LIMIT = BigInt('0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  /** Blocks per difficulty period, and the period's intended length in seconds (two weeks). */
  var INTERVAL = 2016;
  var TIMESPAN = 14 * 24 * 60 * 60;
  /** The most headers one check will take, so a page never walks a whole chain. */
  var DEFAULT_MAX_HEADERS = 2016;
  /** Going up, no header's time may be this far before the checkpoint's (see verifyLink). */
  var TIME_FLOOR = 3 * 60 * 60;
  var HEX64 = /^[0-9a-f]{64}$/;
  var HEX160 = /^[0-9a-f]{160}$/;

  function fail(code, reason) {
    return { ok: false, code: code, reason: reason };
  }
  function isHeight(n) {
    return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  }
  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
    return out;
  }
  function toHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }
  /** Internal byte order <-> the hex explorers and Bitcoin Core print (reversed). */
  function reversedHex(bytes) {
    return toHex(bytes.slice().reverse());
  }
  function u32le(b, at) {
    return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
  }
  function putU32le(b, at, v) {
    b[at] = v & 0xff;
    b[at + 1] = (v >>> 8) & 0xff;
    b[at + 2] = (v >>> 16) & 0xff;
    b[at + 3] = (v >>> 24) & 0xff;
  }
  function subtle() {
    if (!globalThis.crypto || !globalThis.crypto.subtle) throw new Error('this browser has no WebCrypto here');
    return globalThis.crypto.subtle;
  }
  async function sha256d(bytes) {
    var once = await subtle().digest('SHA-256', bytes);
    return new Uint8Array(await subtle().digest('SHA-256', once));
  }

  /**
   * What an 80-byte header (160 hex characters) says. Hashes in explorer order; the merkle root
   * also as it sits in the header (`merkleRootInternal`), which is where a stamp's steps end.
   */
  async function readHeader(hex) {
    if (typeof hex !== 'string' || !HEX160.test(hex)) throw new Error('a block header is 80 bytes (160 lowercase hex characters)');
    var b = hexToBytes(hex);
    return {
      header: hex,
      hash: reversedHex(await sha256d(b)),
      version: u32le(b, 0) | 0,
      prevHash: reversedHex(b.subarray(4, 36)),
      merkleRoot: reversedHex(b.subarray(36, 68)),
      merkleRootInternal: toHex(b.subarray(36, 68)),
      time: u32le(b, 68),
      bits: u32le(b, 72),
      nonce: u32le(b, 76),
    };
  }

  /**
   * The 80-byte header an Esplora explorer's block JSON describes (mempool.space and
   * blockstream.info both serve this API): version, previousblockhash, merkle_root, timestamp,
   * bits, nonce. The caller must still check it hashes to the JSON's `id`: the fields are the
   * explorer's word until then.
   */
  function headerFromEsplora(json) {
    if (typeof json !== 'object' || json === null) throw new Error('not a block');
    var prev = json.height === 0 && json.previousblockhash == null ? '0'.repeat(64) : json.previousblockhash;
    var ints = [json.version, json.timestamp, json.bits, json.nonce];
    for (var i = 0; i < ints.length; i++) {
      if (typeof ints[i] !== 'number' || !Number.isInteger(ints[i]) || ints[i] < -0x80000000 || ints[i] > 0xffffffff)
        throw new Error('a block field is not a 32-bit number');
    }
    if (typeof prev !== 'string' || !HEX64.test(prev) || typeof json.merkle_root !== 'string' || !HEX64.test(json.merkle_root))
      throw new Error('a block hash field is not 32 bytes of hex');
    var b = new Uint8Array(80);
    putU32le(b, 0, json.version >>> 0);
    b.set(hexToBytes(prev).reverse(), 4);
    b.set(hexToBytes(json.merkle_root).reverse(), 36);
    putU32le(b, 68, json.timestamp >>> 0);
    putU32le(b, 72, json.bits >>> 0);
    putU32le(b, 76, json.nonce >>> 0);
    return toHex(b);
  }

  /** The target a compact nBits sets (Core's arith_uint256::SetCompact), or null if negative, zero or overflowing. */
  function compactToTarget(bits) {
    if (typeof bits !== 'number' || !Number.isInteger(bits) || bits < 0 || bits > 0xffffffff) return null;
    var size = bits >>> 24;
    var word = bits & 0x007fffff;
    if (word === 0 || bits & 0x00800000) return null;
    var target = size <= 3 ? BigInt(word >>> (8 * (3 - size))) : BigInt(word) << BigInt(8 * (size - 3));
    if (target === BigInt(0) || target >= BigInt(1) << BigInt(256)) return null;
    return target;
  }

  /** A target as compact nBits (Core's arith_uint256::GetCompact, never negative). */
  function targetToCompact(target) {
    var size = target === BigInt(0) ? 0 : Math.ceil(target.toString(2).length / 8);
    var compact = size <= 3 ? Number(target << BigInt(8 * (3 - size))) : Number(target >> BigInt(8 * (size - 3)));
    // The 0x00800000 bit is the sign: move one byte over instead of setting it.
    if (compact & 0x00800000) {
      compact >>>= 8;
      size += 1;
    }
    return ((compact | (size << 24)) >>> 0);
  }

  /**
   * The nBits of the first block of a new period (Core's CalculateNextWorkRequired, mainnet):
   * the last block's target scaled by how long the period took (last block's time minus the
   * period's first block's time), held to between a quarter and four times two weeks, and never
   * easier than powLimit.
   */
  function nextBits(lastBits, firstTime, lastTime) {
    var span = lastTime - firstTime;
    if (span < TIMESPAN / 4) span = TIMESPAN / 4;
    if (span > TIMESPAN * 4) span = TIMESPAN * 4;
    var target = compactToTarget(lastBits);
    if (target === null) return null;
    var next = (target * BigInt(span)) / BigInt(TIMESPAN);
    if (next > POW_LIMIT) next = POW_LIMIT;
    return targetToCompact(next);
  }

  /** The expected number of hashes behind one header with these nBits (Core's GetBlockProof). */
  function workOf(bits) {
    var target = compactToTarget(bits);
    if (target === null) return BigInt(0);
    return (BigInt(1) << BigInt(256)) / (target + BigInt(1));
  }

  /** Why a header has no valid proof of work, or null when it has. */
  function powProblem(h) {
    var target = compactToTarget(h.bits);
    var bitsHex = '0x' + ('00000000' + h.bits.toString(16)).slice(-8);
    if (target === null) return 'its nBits ' + bitsHex + ' is not a valid target';
    if (target > POW_LIMIT) return 'its target (nBits ' + bitsHex + ') is easier than Bitcoin allows';
    if (BigInt('0x' + h.hash) > target) return 'its hash is above its own target (nBits ' + bitsHex + '): no proof of work';
    return null;
  }

  /** Checkpoints as given, or null if any is malformed: [{height, hash}], heights increasing. */
  function cleanCheckpoints(checkpoints) {
    if (!Array.isArray(checkpoints) || checkpoints.length === 0) return null;
    var out = [];
    for (var i = 0; i < checkpoints.length; i++) {
      var c = checkpoints[i];
      if (!c || !isHeight(c.height) || typeof c.hash !== 'string' || !HEX64.test(c.hash)) return null;
      if (out.length && c.height <= out[out.length - 1].height) return null;
      out.push({ height: c.height, hash: c.hash });
    }
    return out;
  }

  /**
   * Which headers a check of block `height` needs, from the pinned checkpoints:
   *   - 'down': from block `height` up to the nearest checkpoint at or above it;
   *   - 'up' (only when no checkpoint above is within reach): from the nearest checkpoint below
   *     it up to block `height`, plus, for each
   *     difficulty adjustment on the way whose period started before that checkpoint, the
   *     period's first block, which must itself be a checkpoint (its time sets the new nBits).
   * Within `maxHeaders` (default 2016).
   * Down whenever it fits, even when up is shorter: down can't be faked, up costs a miner real
   * work for each block above the checkpoint.
   * Returns { ok, direction, checkpoint, from, to, anchors: [checkpoint...] } or a failure.
   */
  function plan(height, checkpoints, maxHeaders) {
    var pins = cleanCheckpoints(checkpoints);
    if (!pins) return fail('bad-checkpoints', 'the pinned checkpoints are malformed');
    if (!isHeight(height)) return fail('bad-height', 'not a block height');
    var max = isHeight(maxHeaders) && maxHeaders > 0 ? maxHeaders : DEFAULT_MAX_HEADERS;
    var above = null;
    var below = null;
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].height >= height && above === null) above = pins[i];
      if (pins[i].height <= height) below = pins[i];
    }
    var down = above && above.height - height + 1 <= max ? above : null;
    var up = null;
    var anchors = [];
    var missingAnchor = false;
    if (below && below.height < height && height - below.height + 1 <= max) {
      up = below;
      var byHeight = {};
      for (var j = 0; j < pins.length; j++) byHeight[pins[j].height] = pins[j];
      for (var r = Math.ceil((below.height + 1) / INTERVAL) * INTERVAL; r <= height; r += INTERVAL) {
        var first = r - INTERVAL;
        if (first >= below.height) continue; // inside the walk
        if (!byHeight[first]) {
          up = null;
          missingAnchor = true;
          break;
        }
        anchors.push(byHeight[first]);
      }
    }
    // Down whenever it fits: it rests on the hash chain alone. Up only when no pin above is
    // close enough: it rests on proof of work, which a determined miner can pay for.
    if (down)
      return { ok: true, direction: 'down', checkpoint: above, from: height, to: above.height, anchors: [] };
    if (up) return { ok: true, direction: 'up', checkpoint: below, from: below.height, to: height, anchors: anchors };
    if (missingAnchor)
      return fail('no-anchor', 'a difficulty adjustment between the checkpoint and block ' + height + ' needs its period’s first block pinned, and it is not');
    return fail('too-far', 'block ' + height + ' is more than ' + max + ' blocks from every pinned checkpoint');
  }

  /**
   * Check block `height` against the pinned checkpoints, from headers given as
   * [{height, header}] (extra ones are ignored). On success:
   *   { ok: true, height, hash, merkleRoot, merkleRootInternal, time, direction, checkpoint,
   *     headersChecked, workToCheckpoint }
   * where workToCheckpoint is the expected hashes behind the headers between block `height`
   * and the checkpoint (a decimal string). Otherwise { ok: false, code, reason }.
   */
  async function verifyLink(opts) {
    try {
      return await verifyLinkInner(opts || {});
    } catch (e) {
      return fail('error', e && typeof e.message === 'string' ? e.message : String(e));
    }
  }

  async function verifyLinkInner(opts) {
    var p = plan(opts.height, opts.checkpoints, opts.maxHeaders);
    if (!p.ok) return p;
    if (!Array.isArray(opts.headers)) return fail('missing', 'no headers given');
    var given = Object.create(null);
    for (var i = 0; i < opts.headers.length; i++) {
      var g = opts.headers[i];
      if (!g || !isHeight(g.height) || typeof g.header !== 'string') return fail('malformed', 'a header entry is malformed');
      if (given[g.height] !== undefined && given[g.height] !== g.header) return fail('conflict', 'two different headers are given for block ' + g.height);
      given[g.height] = g.header;
    }
    var wanted = [];
    for (var w = p.from; w <= p.to; w++) wanted.push(w);
    for (var x = 0; x < p.anchors.length; x++) wanted.push(p.anchors[x].height);
    for (var m = 0; m < wanted.length; m++)
      if (given[wanted[m]] === undefined) return fail('missing', 'the header for block ' + wanted[m] + ' is missing');
    function need(height) {
      return readHeader(given[height]);
    }
    var chain = [];
    for (var h = p.from; h <= p.to; h++) chain.push(await need(h));
    var anchors = Object.create(null);
    for (var a = 0; a < p.anchors.length; a++) {
      var ah = await need(p.anchors[a].height);
      if (ah.hash !== p.anchors[a].hash)
        return fail('checkpoint', 'block ' + p.anchors[a].height + '’s header does not hash to its pinned checkpoint');
      anchors[p.anchors[a].height] = ah;
    }
    var pinned = p.direction === 'down' ? chain[chain.length - 1] : chain[0];
    if (pinned.hash !== p.checkpoint.hash)
      return fail('checkpoint', 'block ' + p.checkpoint.height + '’s header does not hash to its pinned checkpoint');
    // Three passes, so each failure is named by the rule it breaks: first the hash chain, then
    // (going up) the difficulty rule, then each header's proof of work.
    for (var k = 1; k < chain.length; k++) {
      if (chain[k].prevHash !== chain[k - 1].hash)
        return fail('link', 'block ' + (p.from + k) + '’s previous-block hash is not block ' + (p.from + k - 1) + '’s hash');
    }
    if (p.direction === 'up') {
      for (var d = 1; d < chain.length; d++) {
        var height = p.from + d;
        var expected;
        if (height % INTERVAL !== 0) {
          expected = chain[d - 1].bits;
        } else {
          var first = height - INTERVAL >= p.from ? chain[height - INTERVAL - p.from] : anchors[height - INTERVAL];
          expected = nextBits(chain[d - 1].bits, first.time, chain[d - 1].time);
        }
        if (chain[d].bits !== expected)
          return fail('difficulty', 'block ' + height + '’s nBits is not the difficulty Bitcoin’s rules set for it');
        // Times, so a block made up on top of a checkpoint can't carry a date from well before it.
        // Once 11 headers are in the walk, Bitcoin's own rule: after the median of the 11 before
        // it. Before that (the 10 headers below the checkpoint aren't fetched), a floor this page
        // sets: no more than three hours before the checkpoint's time. Bitcoin times aren't in
        // order, so the floor is loose on purpose; it can only refuse, never pass, a header.
        if (chain[d].time <= chain[0].time - TIME_FLOOR)
          return fail('time', 'block ' + height + '’s time is more than three hours before the checkpoint’s');
        if (d >= 11) {
          var prev = [];
          for (var t = d - 11; t < d; t++) prev.push(chain[t].time);
          prev.sort(function (x, y) { return x - y; });
          if (chain[d].time <= prev[5]) return fail('time', 'block ' + height + '’s time is not after the median of the 11 before it');
        }
      }
    }
    var work = BigInt(0);
    for (var q = 0; q < chain.length; q++) {
      var pow = powProblem(chain[q]);
      if (pow) return fail('pow', 'block ' + (p.from + q) + ': ' + pow);
      if (p.direction === 'down' ? q > 0 : true) work += workOf(chain[q].bits);
    }
    for (var an in anchors) {
      var apow = powProblem(anchors[an]);
      if (apow) return fail('pow', 'block ' + an + ': ' + apow);
    }
    var target = p.direction === 'down' ? chain[0] : chain[chain.length - 1];
    return {
      ok: true,
      height: opts.height,
      hash: target.hash,
      header: target.header,
      merkleRoot: target.merkleRoot,
      merkleRootInternal: target.merkleRootInternal,
      time: target.time,
      direction: p.direction,
      checkpoint: { height: p.checkpoint.height, hash: p.checkpoint.hash },
      headersChecked: chain.length + p.anchors.length,
      // Up: how many mined blocks (the checkpoint's excluded) the link rests on.
      blocksOfWork: p.direction === 'up' ? chain.length - 1 : 0,
      workToCheckpoint: work.toString(),
    };
  }

  return {
    POW_LIMIT: POW_LIMIT,
    INTERVAL: INTERVAL,
    DEFAULT_MAX_HEADERS: DEFAULT_MAX_HEADERS,
    readHeader: readHeader,
    headerFromEsplora: headerFromEsplora,
    compactToTarget: compactToTarget,
    targetToCompact: targetToCompact,
    nextBits: nextBits,
    workOf: workOf,
    powProblem: powProblem,
    plan: plan,
    verifyLink: verifyLink,
  };
})();
export { BtcHeaderChain };
