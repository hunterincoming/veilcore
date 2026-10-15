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

  // ---- 6. what to look up --------------------------------------------------------------

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
      bitcoin: ots && ots.available ? { status: ots.status === 'bitcoin' ? 'bitcoin' : 'pending', file: ots.file || 'proof/root.bin.ots', bitcoinBlockHeight: ots.bitcoinBlockHeight || null } : null,
    };
  }

  // ---- everything ----------------------------------------------------------------------

  /**
   * Run every check on an evidence object (evidence.json). `files` are files the person
   * picked to check as well: { name, bytes } (a lab report, root.bin).
   */
  async function checkAll(ev, files) {
    var out = { fingerprint: null, proof: null, key: null, pairing: null, signatures: [], lookups: null, files: [] };
    if (!isObject(ev)) {
      out.fingerprint = { ok: false, reason: 'This is not a VeilCore evidence file.' };
      out.proof = { status: 'none' };
      out.key = { status: 'absent' };
      out.pairing = { status: 'none' };
      out.lookups = { root: null, midnight: [], bitcoin: null };
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
    out.lookups = lookups(ev);
    var list = Array.isArray(files) ? files : [];
    for (var k = 0; k < list.length; k++) {
      var f = list[k];
      var sha = await sha256Hex(f.bytes);
      var entry = { name: f.name, sha256: sha, is: 'other' };
      if (/(^|\/)root\.bin$/.test(f.name)) {
        entry.is = 'root.bin';
        entry.ok = out.lookups.root !== null && f.bytes.length === 32 && toHex(f.bytes) === out.lookups.root;
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
    checkFingerprint: checkFingerprint,
    checkProof: checkProof,
    checkKey: checkKey,
    checkPairing: checkPairing,
    checkSignature: checkSignature,
    fingerprintOf: fingerprintOf,
    foldProof: foldProof,
    lookups: lookups,
    tagged: tagged,
    sha256Hex: sha256Hex,
  };
})();
