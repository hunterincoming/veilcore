// VeilCore evidence bundle: the checks verify.html runs (docs/evidence-bundle.md).
//
// Plain browser JavaScript with no imports and no network. It is copied into verify.html
// as it is, right after the canonicalisation code of the published SDK (veilcore-records,
// dist/canonical.js, also copied in as it is), which defines `canonicalise`. SHA-256 and
// Ed25519 come from the browser's own WebCrypto.
//
// The same checks the site and the registry make, written out again here so the page
// needs nothing from VeilCore (the site's commitment.ts, key-binding.ts, proofs.ts; the
// SDK's batch.js and signing.js; the registry's conformance.mjs). The site's tests run
// these against the site's own code for many records (bboard-ui/src/veilcore/evidence/
// verify-page.test.ts), so the two can't drift apart unnoticed.
//
// Every check is a verifier: anything malformed is a failed check with a reason, never a
// thrown error.
// SPDX-License-Identifier: Apache-2.0
/* global canonicalise */
var VeilcoreVerify = (function () {
  'use strict';

  var HEX64 = /^[0-9a-f]{64}$/;
  /** SPEC 5.4: a path deeper than 64 is refused, not folded. */
  var MAX_DEPTH = 64;
  var enc = new TextEncoder();

  function isHex64(v) {
    return typeof v === 'string' && HEX64.test(v);
  }
  function isObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }
  function messageOf(e) {
    return e && typeof e.message === 'string' ? e.message : String(e);
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
  function subtle() {
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      throw new Error('this browser has no WebCrypto here; open the file in a current Chrome or Firefox');
    }
    return globalThis.crypto.subtle;
  }
  async function sha256Hex(bytes) {
    return toHex(new Uint8Array(await subtle().digest('SHA-256', bytes)));
  }
  function sha256Text(text) {
    return sha256Hex(enc.encode(text));
  }

  /** H(tag, a, b, ...) of SPEC 3.6.1 and 3.7: SHA-256 over the tag padded to 32 bytes and each 32-byte piece. */
  async function tagged(tag, hexParts) {
    var t = enc.encode(tag);
    if (t.length > 32) throw new Error('tag too long');
    var all = new Uint8Array(32 * (hexParts.length + 1));
    all.set(t);
    for (var i = 0; i < hexParts.length; i++) {
      if (!isHex64(hexParts[i])) throw new Error('every piece is 64 lowercase hex characters');
      all.set(hexToBytes(hexParts[i]), 32 * (i + 1));
    }
    return sha256Hex(all);
  }

  // ---- 1. the record's fingerprint ---------------------------------------------------

  /**
   * Recompute the fingerprint from the sealed fields. A record that names its key (it has
   * keyBinding) folds it in at the top, SPEC 3.6.1: H(keyrecord, keyBinding, contentHash).
   * Any other record: the content hash, SHA-256 of the canonical fields (SPEC 4.4).
   */
  async function fingerprintOf(fields) {
    if (!isObject(fields)) throw new Error('the sealed fields are not a JSON object');
    var canonical = canonicalise(fields);
    var contentHash = await sha256Text(canonical);
    if (fields.keyBinding !== undefined) {
      if (!isHex64(fields.keyBinding)) throw new Error('keyBinding is not 64 lowercase hex characters');
      return {
        form: 'key-bound',
        canonical: canonical,
        contentHash: contentHash,
        fingerprint: await tagged('veilcore:v1:keyrecord', [fields.keyBinding, contentHash]),
      };
    }
    return { form: 'content', canonical: canonical, contentHash: contentHash, fingerprint: contentHash };
  }

  async function checkFingerprint(record) {
    var out = { ok: false, form: null, stated: null, computed: null, contentHash: null, canonicalMatches: null, reason: null };
    try {
      if (!isObject(record)) throw new Error('there is no record in this evidence');
      out.stated = typeof record.fingerprint === 'string' ? record.fingerprint : null;
      var fp = await fingerprintOf(record.sealedFields);
      out.form = fp.form;
      out.computed = fp.fingerprint;
      out.contentHash = fp.contentHash;
      if (typeof record.canonical === 'string') out.canonicalMatches = record.canonical === fp.canonical;
      if (out.stated !== out.computed) {
        out.reason = 'The fingerprint worked out from the sealed fields is not the one this record states. The fields, or the fingerprint, were changed.';
      } else if (out.canonicalMatches === false) {
        out.reason = 'The canonical bytes in this bundle are not the canonical form of the sealed fields.';
      } else {
        out.ok = true;
      }
    } catch (e) {
      out.reason = 'The sealed fields could not be checked: ' + messageOf(e);
    }
    return out;
  }

  // ---- 2. the inclusion proof ----------------------------------------------------------

  /** SPEC 5.2 to 5.4. Hashing is over the hex TEXT with the ASCII prefixes "00" and "01". */
  async function foldProof(proof) {
    if (!isObject(proof)) return { ok: false, reason: 'the proof is not a JSON object' };
    var commitment = proof.commitment;
    var root = proof.root;
    var path = proof.path;
    if (!isHex64(commitment) || !isHex64(root)) {
      return { ok: false, reason: 'the proof’s commitment and root must be 64 lowercase hex characters' };
    }
    if (!Array.isArray(path)) return { ok: false, reason: 'the proof has no path' };
    if (path.length > MAX_DEPTH) return { ok: false, reason: 'the proof’s path is deeper than 64' };
    var steps = [];
    for (var i = 0; i < path.length; i++) {
      var step = path[i];
      if (!isObject(step) || !isHex64(step.sibling) || typeof step.siblingIsLeft !== 'boolean') {
        return { ok: false, reason: 'step ' + (i + 1) + ' of the proof’s path is malformed' };
      }
      steps.push({ sibling: step.sibling, left: step.siblingIsLeft });
    }
    var node = await sha256Text('00' + commitment);
    for (var j = 0; j < steps.length; j++) {
      node = steps[j].left ? await sha256Text('01' + steps[j].sibling + node) : await sha256Text('01' + node + steps[j].sibling);
    }
    return node === root ? { ok: true, computedRoot: node } : { ok: false, computedRoot: node, reason: 'the proof’s path does not lead to the root it names' };
  }

  async function checkProof(proof, fingerprint, batchRoot) {
    if (proof === null || proof === undefined) return { status: 'none' };
    try {
      if (!isObject(proof)) return { status: 'fail', reason: 'The proof is not a JSON object.' };
      if (proof.commitment !== fingerprint) {
        return { status: 'fail', reason: 'The proof is for a different fingerprint from this record’s.' };
      }
      var folded = await foldProof(proof);
      if (!folded.ok) return { status: 'fail', reason: 'The proof does not check: ' + folded.reason + '.', computedRoot: folded.computedRoot };
      if (batchRoot !== undefined && batchRoot !== null && batchRoot !== proof.root) {
        return { status: 'fail', reason: 'The proof leads to ' + proof.root + ', not to this bundle’s batch root ' + String(batchRoot) + '.', computedRoot: folded.computedRoot };
      }
      return { status: 'ok', root: proof.root, batchId: typeof proof.batchId === 'string' ? proof.batchId : null, depth: proof.path.length };
    } catch (e) {
      return { status: 'fail', reason: 'The proof could not be checked: ' + messageOf(e) };
    }
  }

  // ---- 3. the record's key (only when the holder included it) -----------------------------

  async function checkKey(key, fields, contentHash, fingerprint) {
    if (key === null || key === undefined) return { status: 'absent' };
    try {
      if (!isObject(key) || !isHex64(key.identity) || !isHex64(key.keySalt)) {
        return { status: 'fail', reason: 'The key’s parts are not 64 lowercase hex characters each.' };
      }
      if (!isObject(fields) || !isHex64(fields.keyBinding)) {
        return { status: 'fail', reason: 'This record does not name a key (it has no keyBinding), so no key can be matched to it.' };
      }
      var binding = await tagged('veilcore:v1:keybind', [key.identity, key.keySalt]);
      if (binding !== fields.keyBinding) return { status: 'fail', reason: 'This key is not the one the record names.' };
      if (!isHex64(contentHash) || (await tagged('veilcore:v1:keyrecord', [binding, contentHash])) !== fingerprint) {
        return { status: 'fail', reason: 'The key matches the record’s keyBinding, but the fingerprint does not follow from it.' };
      }
      return { status: 'ok', identity: key.identity };
    } catch (e) {
      return { status: 'fail', reason: 'The key could not be checked: ' + messageOf(e) };
    }
  }

  // ---- 4. the lab report pairing -------------------------------------------------------

  /** SPEC 3.7: the pairing fingerprint is H(commit, the file's SHA-256). */
  async function checkPairing(lab) {
    if (!isObject(lab)) return { status: 'none' };
    try {
      if (!isHex64(lab.fileSha256)) return { status: 'no-sha' };
      var pairing = await tagged('veilcore:v1:commit', [lab.fileSha256]);
      return pairing === lab.pairingFingerprint
        ? { status: 'ok' }
        : { status: 'fail', reason: 'The lab report’s SHA-256 does not lead to the pairing fingerprint saved to the plant.' };
    } catch (e) {
      return { status: 'fail', reason: 'The lab report pairing could not be checked: ' + messageOf(e) };
    }
  }

  // ---- 5. lab signatures (SPEC 7) ------------------------------------------------------

  // Ed25519 keys nobody holds a private key for: with one, a made-up signature verifies for
  // every message under the check WebCrypto runs. Refused, as the SDK refuses them
  // (signing.js SMALL_ORDER), compared with the sign bit cleared, plus any y >= p.
  var SMALL_ORDER = [
    '0000000000000000000000000000000000000000000000000000000000000000',
    '0100000000000000000000000000000000000000000000000000000000000000',
    '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
    'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
    'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
    'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
    'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  ];
  function usableKey(hex) {
    if (!isHex64(hex)) return false;
    var y = hexToBytes(hex);
    y[31] &= 0x7f;
    if (SMALL_ORDER.indexOf(toHex(y)) !== -1) return false;
    if (y[31] === 0x7f && y[0] >= 0xed) {
      for (var i = 1; i < 31; i++) if (y[i] !== 0xff) return true;
      return false;
    }
    return true;
  }
  function isSig(v) {
    return typeof v === 'string' && /^[0-9a-f]{128}$/.test(v);
  }
  function isText(v) {
    return typeof v === 'string' && v.length > 0;
  }

  /** The bytes a lab signs (SDK attester.js attestationPayload). */
  function attestationPayload(a) {
    var who = { publicKey: a.attester.publicKey };
    // Present means signed, null included (which the canonicaliser then refuses), as in the SDK.
    if (a.attester.displayName !== undefined) who.displayName = a.attester.displayName;
    if (a.attester.role !== undefined) who.role = a.attester.role;
    if (a.attester.accreditation !== undefined) who.accreditation = a.attester.accreditation;
    return canonicalise({
      attestationId: a.attestationId,
      attester: who,
      documentHash: a.documentHash,
      hashAlgorithm: a.hashAlgorithm,
      issuedAt: a.issuedAt,
      subjectCommitment: a.subjectCommitment,
      type: a.type,
    });
  }
  function retractionPayload(r) {
    return canonicalise({ attestationId: r.attestationId, attesterPublicKey: r.attesterPublicKey, reason: r.reason, retractedAt: r.retractedAt });
  }

  /** 'valid' | 'invalid' | 'unsupported' (this browser has no Ed25519). */
  async function ed25519(publicKeyHex, signatureHex, text) {
    if (!usableKey(publicKeyHex) || !isSig(signatureHex)) return 'invalid';
    var key;
    try {
      key = await subtle().importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
    } catch (e) {
      return e && (e.name === 'NotSupportedError' || /not supported|unrecognized|unknown/i.test(messageOf(e))) ? 'unsupported' : 'invalid';
    }
    try {
      return (await subtle().verify({ name: 'Ed25519' }, key, hexToBytes(signatureHex), enc.encode(text))) ? 'valid' : 'invalid';
    } catch (e) {
      return 'invalid';
    }
  }

  async function checkSignature(a, fingerprint) {
    var out = {
      attestationId: isObject(a) && typeof a.attestationId === 'string' ? a.attestationId : '(no id)',
      type: isObject(a) && typeof a.type === 'string' ? a.type : '',
      publicKey: isObject(a) && isObject(a.attester) && typeof a.attester.publicKey === 'string' ? a.attester.publicKey : '',
      displayName: isObject(a) && isObject(a.attester) && typeof a.attester.displayName === 'string' ? a.attester.displayName : '',
      documentHash: isObject(a) && typeof a.documentHash === 'string' ? a.documentHash : '',
      issuedAt: isObject(a) && typeof a.issuedAt === 'string' ? a.issuedAt : '',
      aboutThisRecord: isObject(a) && a.subjectCommitment === fingerprint,
      signature: 'invalid',
      retraction: null,
    };
    try {
      if (
        !isObject(a) || !isObject(a.attester) || !a.signature ||
        !(a.signatureAlgorithm === undefined || a.signatureAlgorithm === null || a.signatureAlgorithm === 'ed25519') ||
        !isText(a.attestationId) || !isText(a.type) || !isHex64(a.subjectCommitment) || !isText(a.documentHash) ||
        a.hashAlgorithm !== 'sha256' || !isText(a.issuedAt)
      ) {
        return out;
      }
      out.signature = await ed25519(a.attester.publicKey, a.signature, attestationPayload(a));
      var r = a.retraction;
      if (isObject(r)) {
        var ok =
          r.attestationId === a.attestationId && r.attesterPublicKey === a.attester.publicKey && isText(r.reason) && isText(r.retractedAt)
            ? await ed25519(r.attesterPublicKey, r.signature, retractionPayload(r))
            : 'invalid';
        out.retraction = { signature: ok, reason: typeof r.reason === 'string' ? r.reason : '', retractedAt: typeof r.retractedAt === 'string' ? r.retractedAt : '' };
      }
    } catch (e) {
      out.signature = 'invalid';
    }
    return out;
  }

  // ---- 5b. the sample details on deliveries (evidence.json `custody`) --------------------
  //
  // A lab's receipt covers what the breeder wrote about the sample and what the lab wrote on
  // arrival through its signed id, which ends `_sc1_<digest>`: SHA-256 of the canonical JSON
  // of { format: 'veilcore/sample-custody/v1', transferId, sample, arrival } (the site's
  // transfers.ts custodyDigest and the registry's transfer.mjs custodyDigest). Worked out
  // again here from the values in the bundle, so "covered" never rests on the bundle's word.
  //
  // Sample details sealed with the delivery's key (since 16 Oct 2026): the id ends
  // `_sc2_<digest>`, SHA-256 of the canonical JSON of { format: 'veilcore/sample-custody/v2',
  // transferId, salt, sample, arrival }, where the salt is 32 random bytes the breeder sealed
  // with the sample. The bundle carries the salt (entry.salt), so the same check works here.

  var CUSTODY_FORMAT = 'veilcore/sample-custody/v1';
  var CUSTODY_FORMAT_V2 = 'veilcore/sample-custody/v2';
  var CUSTODY_SALT = /^[A-Za-z0-9_-]{43}$/;

  function stringFields(v) {
    if (!isObject(v)) return null;
    var keys = Object.keys(v);
    for (var i = 0; i < keys.length; i++) if (typeof v[keys[i]] !== 'string') return null;
    return v;
  }
  function samePlain(a, b) {
    return a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();
  }
  /** Where what arrived differs from what was sent (the site's custody.ts custodyDifferences, word for word). */
  function custodyDifferences(sample, arrival) {
    var out = [];
    function pair(label, sent, got) {
      if (sent && got && !samePlain(sent, got)) out.push(label + ' differs: sent ' + sent + ', received ' + got);
      else if (sent && !got) out.push(label + ' not confirmed on arrival (sent ' + sent + ')');
    }
    pair('Sample ID', sample.sampleId, arrival.sampleId);
    if (arrival.sealIntact === 'no-seal') {
      if (sample.sealNumber) out.push('No seal on arrival (sent with seal ' + sample.sealNumber + ')');
    } else {
      pair('Seal number', sample.sealNumber, arrival.sealNumber);
    }
    if (arrival.sealIntact === 'no') out.push('Seal not intact on arrival');
    return out;
  }

  /**
   * One delivery: 'covered' (the digest of these values is the one the receipt's signed id
   * carries, and that signature checks here, is about this record and isn't withdrawn),
   * 'changed' (the id carries the digest of other values), 'not-covered' (a receipt from
   * before sample details), 'unsigned' (no receipt signature here that checks), 'never-used'
   * (nobody used the lab code), or 'malformed'. `signatures` are checkSignature's results.
   */
  async function checkCustody(entry, signatures, attestations) {
    var out = {
      transferId: isObject(entry) && typeof entry.transferId === 'string' ? entry.transferId : '(no delivery id)',
      received: isObject(entry) && typeof entry.received === 'boolean' ? entry.received : null,
      receiptAttestationId: isObject(entry) && typeof entry.receiptAttestationId === 'string' ? entry.receiptAttestationId : null,
      stated: isObject(entry) && typeof entry.covered === 'string' ? entry.covered : null,
      status: 'malformed',
      computed: null,
      carried: null,
      sample: {},
      arrival: {},
      differences: [],
      format: CUSTODY_FORMAT,
      salt: null,
    };
    try {
      var sample = isObject(entry) ? stringFields(entry.sample || {}) : null;
      var arrival = isObject(entry) ? stringFields(entry.arrival || {}) : null;
      if (!sample || !arrival || typeof entry.transferId !== 'string') return out;
      out.sample = sample;
      out.arrival = arrival;
      // Sealed details the holder's browser couldn't open when the bundle was made: nothing to check.
      if (entry.locked === true) {
        out.status = 'locked';
        return out;
      }
      // Sealed sample details carry their salt; one that isn't 32 bytes of base64url is refused.
      if (entry.salt !== undefined && entry.salt !== null) {
        if (typeof entry.salt !== 'string' || !CUSTODY_SALT.test(entry.salt)) return out;
        out.salt = entry.salt;
        out.format = CUSTODY_FORMAT_V2;
      }
      out.computed = await sha256Text(canonicalise(out.salt
        ? { format: CUSTODY_FORMAT_V2, transferId: entry.transferId, salt: out.salt, sample: sample, arrival: arrival }
        : { format: CUSTODY_FORMAT, transferId: entry.transferId, sample: sample, arrival: arrival }));
      if (out.received === false && !out.receiptAttestationId) {
        out.status = 'never-used';
        return out;
      }
      var m = out.receiptAttestationId ? /_sc([12])_([0-9a-f]{64})$/.exec(out.receiptAttestationId) : null;
      out.carried = m ? m[2] : null;
      // A receipt in the other form than these details carries a digest of something else.
      var sameForm = !!m && (m[1] === '2') === !!out.salt;
      var sig = null;
      for (var i = 0; i < signatures.length; i++) {
        if (signatures[i].attestationId === out.receiptAttestationId && attestations[i] && attestations[i].attestationId === out.receiptAttestationId) sig = signatures[i];
      }
      var good = !!sig && sig.signature === 'valid' && sig.aboutThisRecord && sig.type === 'chain-of-custody' &&
        !(sig.retraction && sig.retraction.signature === 'valid');
      if (!good) out.status = 'unsigned';
      else if (out.carried === null) out.status = 'not-covered';
      else out.status = sameForm && out.carried === out.computed ? 'covered' : 'changed';
      if (out.status === 'covered') out.differences = custodyDifferences(sample, arrival);
    } catch (e) {
      out.status = 'malformed';
      out.reason = messageOf(e);
    }
    return out;
  }

  // ---- 6. the Bitcoin stamp file (OpenTimestamps) ---------------------------------------
  //
  // Read here, so the page says only what the file itself shows: whether it is about this
  // batch root (it starts from SHA-256 of root.bin), and which Bitcoin block it names, with
  // the value that block's merkle root must be. The format is python-opentimestamps' (the
  // same reader as scripts/check-bitcoin-stamp.mjs). This page can't reach Bitcoin, so it
  // never says the block holds that value: the OpenTimestamps tools check that.

  var OTS_MAGIC = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00,
    0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94];
  var OTS_TAGS = { '0588960d73d71901': 'bitcoin', '83dfe30d2ef90c8e': 'pending', '06869a0d73d71b45': 'litecoin', '30fe8087b5c7ead7': 'ethereum' };
  var OTS_FILE_HASH = { 0x02: { name: 'sha1', len: 20 }, 0x03: { name: 'ripemd160', len: 20 }, 0x08: { name: 'sha256', len: 32 } };
  var OTS_OPS = { 0xf0: 'append', 0xf1: 'prepend', 0xf2: 'reverse', 0xf3: 'hexlify', 0x02: 'sha1', 0x03: 'ripemd160', 0x08: 'sha256', 0x67: 'keccak256' };
  var OTS_MAX_MSG = 4096;
  var OTS_MAX_ATTESTATIONS = 64;
  var OTS_MAX_STEPS = 20000;

  function otsReader(bytes) {
    var pos = 0;
    function take(n) {
      if (pos + n > bytes.length) throw new Error('the file ends too early');
      var b = bytes.subarray(pos, pos + n);
      pos += n;
      return b;
    }
    function varuint() {
      var value = 0;
      var mul = 1;
      for (;;) {
        var b = take(1)[0];
        value += (b & 0x7f) * mul;
        if (!(b & 0x80)) break;
        mul *= 128;
        if (mul > Math.pow(2, 49)) throw new Error('a number in the file is too large');
      }
      return value;
    }
    function varbytes(max, min) {
      var n = varuint();
      if (n > max) throw new Error('a field is too long');
      if (n < (min || 0)) throw new Error('a field is too short');
      return take(n);
    }
    return { take: take, varuint: varuint, varbytes: varbytes, byte: function () { return take(1)[0]; }, done: function () { return pos === bytes.length; } };
  }

  /** The file's structure: the digest it starts from and every attestation with the steps to it. */
  function parseOts(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new Error('no stamp file');
    var r = otsReader(bytes);
    var head = r.take(OTS_MAGIC.length);
    for (var i = 0; i < OTS_MAGIC.length; i++) if (head[i] !== OTS_MAGIC[i]) throw new Error('it is not an OpenTimestamps file');
    if (r.varuint() !== 1) throw new Error('it is an OpenTimestamps version this page doesn’t read');
    var fileHash = OTS_FILE_HASH[r.byte()];
    if (!fileHash) throw new Error('it starts from a hash this page doesn’t know');
    var digest = toHex(r.take(fileHash.len));
    var attestations = [];
    var steps = 0;
    function attestation(path) {
      var tag = toHex(r.take(8));
      var payload = otsReader(r.varbytes(8192));
      var kind = OTS_TAGS[tag] || 'unknown';
      var a = { kind: kind, path: path };
      if (kind === 'bitcoin' || kind === 'litecoin') a.height = payload.varuint();
      else if (kind === 'pending') a.uri = new TextDecoder().decode(payload.varbytes(1000));
      if (kind !== 'unknown' && !payload.done()) throw new Error('an attestation has bytes left over');
      if (attestations.length >= OTS_MAX_ATTESTATIONS) throw new Error('it has too many attestations');
      attestations.push(a);
    }
    function timestamp(path, depth) {
      if (depth > 256) throw new Error('the stamp is nested too deeply');
      function doTag(tag) {
        if (tag === 0x00) return attestation(path);
        var op = OTS_OPS[tag];
        if (!op) throw new Error('it has an operation this page doesn’t know (0x' + tag.toString(16) + ')');
        if (++steps > OTS_MAX_STEPS) throw new Error('it has too many steps');
        var arg = op === 'append' || op === 'prepend' ? toHex(r.varbytes(OTS_MAX_MSG, 1)) : null;
        timestamp(path.concat([{ op: op, arg: arg }]), depth + 1);
      }
      var tag = r.byte();
      while (tag === 0xff) {
        doTag(r.byte());
        tag = r.byte();
      }
      doTag(tag);
    }
    timestamp([], 0);
    if (!r.done()) throw new Error('it has unexpected bytes at the end');
    return { fileHash: fileHash.name, digest: digest, attestations: attestations };
  }

  /** Follow one attestation's steps from the digest. null when a step needs a hash this browser lacks. */
  async function runOtsPath(digestHex, path) {
    var msg = hexToBytes(digestHex);
    for (var i = 0; i < path.length; i++) {
      var s = path[i];
      if (s.op === 'append') msg = concatBytes(msg, hexToBytes(s.arg));
      else if (s.op === 'prepend') msg = concatBytes(hexToBytes(s.arg), msg);
      else if (s.op === 'reverse') msg = msg.slice().reverse();
      else if (s.op === 'hexlify') msg = enc.encode(toHex(msg));
      else if (s.op === 'sha256') msg = new Uint8Array(await subtle().digest('SHA-256', msg));
      else if (s.op === 'sha1') msg = new Uint8Array(await subtle().digest('SHA-1', msg));
      else return null;
      if (msg.length > OTS_MAX_MSG) throw new Error('a step’s result is too long');
    }
    return msg;
  }
  function concatBytes(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  /**
   * What a stamp file shows about a batch root: 'bitcoin' (it names Bitcoin blocks, with
   * the merkle root each must have), 'pending' (only a stamping server's promise),
   * 'other-root' (it is about some other file), or 'unreadable'.
   */
  async function readStamp(bytes, rootHex) {
    var parsed;
    try {
      parsed = parseOts(bytes);
    } catch (e) {
      return { status: 'unreadable', reason: messageOf(e) };
    }
    if (!isHex64(rootHex)) return { status: 'unreadable', reason: 'there is no batch root to compare it with' };
    if (parsed.fileHash !== 'sha256' || parsed.digest !== (await sha256Hex(hexToBytes(rootHex)))) {
      return { status: 'other-root', reason: 'it does not start from SHA-256 of root.bin, so it is about some other file' };
    }
    var bitcoin = [];
    var pending = [];
    for (var i = 0; i < parsed.attestations.length; i++) {
      var a = parsed.attestations[i];
      if (a.kind === 'bitcoin') {
        var msg;
        try {
          msg = await runOtsPath(parsed.digest, a.path);
        } catch (e) {
          return { status: 'unreadable', reason: messageOf(e) };
        }
        // The steps end on the merkle root as it sits in the block header; explorers print it reversed.
        bitcoin.push({ height: a.height, merkleRoot: msg && msg.length === 32 ? toHex(msg.slice().reverse()) : null });
      } else if (a.kind === 'pending') {
        pending.push(a.uri);
      }
    }
    bitcoin.sort(function (x, y) { return x.height - y.height; });
    if (bitcoin.length) return { status: 'bitcoin', bitcoin: bitcoin, pending: pending };
    if (pending.length) return { status: 'pending', bitcoin: [], pending: pending };
    return { status: 'unreadable', reason: 'it names no Bitcoin block and no stamping server' };
  }

  // ---- 7. what to look up --------------------------------------------------------------

  var EXPLORERS = {
    mainnet: 'https://midnightexplorer.com/',
    preprod: 'https://preprod.midnightexplorer.com/',
    preview: 'https://preview.midnightexplorer.com/',
  };

  function anchorLookup(a, root, current) {
    if (!isObject(a)) return null;
    return {
      current: current,
      chain: typeof a.chain === 'string' ? a.chain : 'midnight',
      network: typeof a.network === 'string' ? a.network : 'unknown',
      testNetwork: a.network !== 'mainnet',
      txHash: typeof a.txHash === 'string' ? a.txHash : null,
      contractAddress: typeof a.contractAddress === 'string' ? a.contractAddress : null,
      blockHeight: typeof a.blockHeight === 'number' ? a.blockHeight : null,
      anchoredAt: typeof a.anchoredAt === 'string' ? a.anchoredAt : null,
      replacedAt: typeof a.replacedAt === 'string' ? a.replacedAt : null,
      explorer: EXPLORERS[a.network] || null,
      root: root,
    };
  }

  function lookups(ev) {
    var batch = isObject(ev.batch) ? ev.batch : null;
    var proof = isObject(ev.proof) ? ev.proof : null;
    var root = batch && isHex64(batch.root) ? batch.root : proof && isHex64(proof.root) ? proof.root : null;
    var midnight = [];
    var current = (batch && batch.anchor) || (proof && proof.anchor) || null;
    var c = anchorLookup(current, root, true);
    if (c && c.txHash) midnight.push(c);
    var earlier = batch && Array.isArray(batch.earlierAnchors) ? batch.earlierAnchors : [];
    for (var i = 0; i < earlier.length; i++) {
      var e = anchorLookup(earlier[i], root, false);
      if (e && e.txHash) midnight.push(e);
    }
    var ots = batch && isObject(batch.opentimestamps) ? batch.opentimestamps : null;
    return {
      root: root,
      midnight: midnight,
      // The registry's report of the stamp, named as such; what the file itself shows is readStamp's.
      bitcoin: ots && ots.available ? { status: ots.status === 'bitcoin' ? 'bitcoin' : 'pending', file: ots.file || 'proof/root.bin.ots', bitcoinBlockHeight: typeof ots.bitcoinBlockHeight === 'number' ? ots.bitcoinBlockHeight : null } : null,
    };
  }

  /** "2026-10-15 11:00 UTC", as the site prints times (time.ts utcStamp); null for no time. */
  function utc(t) {
    if (typeof t !== 'string' && typeof t !== 'number') return null;
    var d = new Date(t);
    if (isNaN(d.getTime())) return null;
    var iso = d.toISOString();
    return iso.slice(0, 10) + ' ' + iso.slice(11, 16) + ' UTC';
  }

  var NETWORK_WORDS = { mainnet: 'Midnight’s main network', preprod: 'Midnight preprod (a test network)', preview: 'Midnight Preview (a test network)' };
  function networkWords(n) {
    return NETWORK_WORDS[n] || 'the Midnight network “' + n + '”';
  }

  /**
   * The steps to date the record on Midnight, in plain words, with every value written in.
   * README.txt says the same steps (bundle.ts midnightSteps; the site's tests compare them).
   */
  function midnightSteps(a) {
    var when = utc(a.anchoredAt);
    var out = [];
    out.push(a.explorer
      ? 'Open the Midnight explorer for ' + networkWords(a.network) + ': ' + a.explorer + ' (type the address in yourself).'
      : 'Open a Midnight explorer for ' + networkWords(a.network) + '.');
    out.push('Search for transaction ' + a.txHash + '.' + (a.blockHeight !== null || when
      ? ' VeilCore’s registry reports it is' + (a.blockHeight !== null ? ' in block ' + a.blockHeight : '') + (when ? (a.blockHeight !== null ? ',' : '') + ' at ' + when : '') + '; the explorer’s own block and time are the ones to rely on.'
      : ''));
    out.push('Check that the transaction succeeded and that it called VeilCore’s contract ' + (a.contractAddress || '(the bundle doesn’t name it)') + '. Note its block and time: that time is the date.');
    out.push('Check that it wrote this batch root: ' + a.root + '. The batch root is one fingerprint that stands for every record in the batch; this record’s proof leads to it.');
    out.push('The explorer may not show the batch root in plain text: it sits inside the contract’s state after the call. If you can’t see it there, read that state from a Midnight indexer yourself (README.txt, “For technical readers”, says how), or open this record’s check page on VeilCore’s site, which does that look-up in your own browser.');
    out.push('If the transaction succeeded, called that contract and wrote that root, this record existed, unchanged, by that transaction’s time: whoever had it sealed held this record by then. If any of it doesn’t match, nothing here dates the record.');
    return out;
  }

  /** The Bitcoin stamp's steps. README.txt says the same (bundle.ts bitcoinSteps). */
  function bitcoinSteps(pending) {
    return [
      'The batch root was also stamped on Bitcoin with OpenTimestamps. The stamp file is proof/root.bin.ots; the file it stamps is proof/root.bin (the batch root as 32 bytes).',
      'Easiest: on opentimestamps.org, drop in root.bin.ots and then root.bin.',
      'Or with the official OpenTimestamps client, in the proof folder: ots verify root.bin.ots' +
        (pending ? ' (run ots upgrade root.bin.ots first; that needs the internet once).' : '.'),
    ];
  }

  /**
   * Whether the bundle can be used to date the record at all: its fingerprint matches, its
   * proof leads to the batch root, and the key, if it is included, matches. Otherwise the
   * look-up steps are withheld and the page says which check failed.
   */
  function datable(report) {
    var failed = [];
    if (!report.fingerprint || !report.fingerprint.ok) failed.push('the fingerprint does not match the sealed fields');
    if (report.proof && report.proof.status === 'fail') failed.push('the proof does not lead to the batch root');
    if (report.key && report.key.status === 'fail') failed.push('the key does not match the record');
    // Not in a batch yet: not a failure, but there is nothing to date it with either.
    var notBatched = !report.proof || report.proof.status === 'none';
    return { ok: failed.length === 0 && !notBatched, failed: failed, notBatched: notBatched };
  }

  // ---- everything ----------------------------------------------------------------------

  /**
   * Run every check on an evidence object (evidence.json). `files` are files the person
   * picked to check as well: { name, bytes } (a lab report, root.bin).
   */
  async function checkAll(ev, files, opts) {
    var out = { fingerprint: null, proof: null, key: null, pairing: null, signatures: [], custody: [], lookups: null, files: [], stamp: null, datable: null };
    if (!isObject(ev)) {
      out.fingerprint = { ok: false, reason: 'This is not a VeilCore evidence file.' };
      out.proof = { status: 'none' };
      out.key = { status: 'absent' };
      out.pairing = { status: 'none' };
      out.lookups = { root: null, midnight: [], bitcoin: null };
      out.datable = datable(out);
      return out;
    }
    var record = isObject(ev.record) ? ev.record : null;
    out.fingerprint = await checkFingerprint(record);
    var fingerprint = out.fingerprint.computed;
    var batchRoot = isObject(ev.batch) ? ev.batch.root : undefined;
    out.proof = await checkProof(ev.proof, fingerprint, batchRoot);
    out.key = await checkKey(ev.key, record && record.sealedFields, out.fingerprint.contentHash, fingerprint);
    out.pairing = await checkPairing(ev.labReport);
    var sigs = Array.isArray(ev.signatures) ? ev.signatures : [];
    for (var i = 0; i < sigs.length; i++) out.signatures.push(await checkSignature(sigs[i], fingerprint));
    var custody = Array.isArray(ev.custody) ? ev.custody : [];
    for (var c = 0; c < custody.length; c++) out.custody.push(await checkCustody(custody[c], out.signatures, sigs));
    out.lookups = lookups(ev);
    out.datable = datable(out);
    var embeddedOts = opts && opts.ots instanceof Uint8Array ? opts.ots : null;
    if (embeddedOts) out.stamp = await readStamp(embeddedOts, out.lookups.root);
    var list = Array.isArray(files) ? files : [];
    for (var k = 0; k < list.length; k++) {
      var f = list[k];
      var sha = await sha256Hex(f.bytes);
      var entry = { name: f.name, sha256: sha, is: 'other' };
      if (/(^|\/)root\.bin$/.test(f.name)) {
        entry.is = 'root.bin';
        entry.ok = out.lookups.root !== null && f.bytes.length === 32 && toHex(f.bytes) === out.lookups.root;
      } else if (/(^|\/)root\.bin\.ots$/.test(f.name)) {
        entry.is = 'root.bin.ots';
        entry.stamp = await readStamp(f.bytes, out.lookups.root);
        entry.ok = entry.stamp.status === 'bitcoin' || entry.stamp.status === 'pending';
        if (!out.stamp) out.stamp = entry.stamp;
      } else if (isObject(ev.labReport) && isHex64(ev.labReport.fileSha256)) {
        entry.is = 'lab report?';
        entry.ok = sha === ev.labReport.fileSha256;
      }
      out.files.push(entry);
    }
    return out;
  }

  return {
    checkAll: checkAll,
    datable: datable,
    midnightSteps: midnightSteps,
    bitcoinSteps: bitcoinSteps,
    readStamp: readStamp,
    parseOts: parseOts,
    networkWords: networkWords,
    utc: utc,
    checkFingerprint: checkFingerprint,
    checkProof: checkProof,
    checkKey: checkKey,
    checkPairing: checkPairing,
    checkSignature: checkSignature,
    checkCustody: checkCustody,
    custodyDifferences: custodyDifferences,
    fingerprintOf: fingerprintOf,
    foldProof: foldProof,
    lookups: lookups,
    tagged: tagged,
    sha256Hex: sha256Hex,
  };
})();
