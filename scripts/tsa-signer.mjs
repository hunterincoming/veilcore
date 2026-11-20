// Which certificate signed an RFC 3161 token, and is it one VeilCore pins? (docs/offline.md,
// "Whose timestamp"). Used by the site (bboard-ui/src/veilcore/instant-stamp.ts) and by
// `node scripts/tsa-pin.mjs`, in the browser and in Node alike: plain Uint8Array and WebCrypto.
//
// The certificate is chosen exactly as veilcore-records' verifyTimestampToken chooses the one it
// checks the signature with: the first certificate in the token that matches the SignerInfo's
// identifier (issuer and serial, or subject key identifier). Matching on anything looser let a
// token signed by another key pass a pin by carrying the pinned certificate beside it (registry
// review, 5 Nov 2026; lineage/tsa.mjs signerCertificate is the same logic over Buffers).
// SPDX-License-Identifier: Apache-2.0

const tlv = (b, at) => {
  if (at + 2 > b.length) throw new Error("truncated");
  const tag = b[at];
  let len = b[at + 1];
  let hdr = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 3) throw new Error("bad length");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[at + 2 + i];
    hdr = 2 + n;
  }
  if (at + hdr + len > b.length) throw new Error("truncated");
  return {
    tag,
    start: at + hdr,
    end: at + hdr + len,
    whole: b.subarray(at, at + hdr + len),
  };
};
const children = (b, node) => {
  const out = [];
  for (let at = node.start; at < node.end; ) {
    const k = tlv(b, at);
    out.push(k);
    at = k.end;
  }
  return out;
};
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const derLen = (n) =>
  n < 0x80
    ? [n]
    : n < 0x100
      ? [0x81, n]
      : n < 0x10000
        ? [0x82, n >> 8, n & 0xff]
        : [0x83, n >> 16, (n >> 8) & 0xff, n & 0xff];
const der = (tag, ...parts) => {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(1 + derLen(len).length + len);
  out.set([tag, ...derLen(len)], 0);
  let at = 1 + derLen(len).length;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** A token or a full TimeStampResp, DER: the SignedData's fields. */
const signedDataOf = (b) => {
  let ci = tlv(b, 0);
  let kids = children(b, ci);
  // A TimeStampResp is SEQUENCE { status, timeStampToken }: step into the token.
  if (
    kids.length === 2 &&
    kids[0].tag === 0x30 &&
    kids[1].tag === 0x30 &&
    kids[1].end === ci.end &&
    b[kids[1].start] === 0x06
  ) {
    ci = kids[1];
    kids = children(b, ci);
  }
  const explicit = kids[1];
  const [sd] = children(b, explicit);
  return children(b, sd);
};

const certIds = (b, certNode) => {
  const [tbs] = children(b, certNode);
  const f = children(b, tbs);
  let k = f[0].tag === 0xa0 ? 1 : 0;
  const serial = b.subarray(f[k].start, f[k].end);
  k++; // past the serial
  k++; // past the signature algorithm
  const issuer = f[k++].whole;
  // Every extensions block and every subject key identifier: a certificate with more than one of
  // either is refused (ambiguous), since two parsers can then pick different ones (re-check of
  // the PR #145 fixes: veilcore-records keeps the last, a first-match reader the first).
  const blocks = f.filter((x) => x.tag === 0xa3);
  const skis = [];
  for (const ext of blocks) {
    const [list] = children(b, ext);
    for (const e of children(b, list)) {
      const parts = children(b, e);
      if (
        parts[0].tag === 0x06 &&
        same(b.subarray(parts[0].start, parts[0].end), [0x55, 0x1d, 0x0e])
      ) {
        const octets = parts[parts.length - 1];
        const inner = tlv(b, octets.start);
        skis.push(b.subarray(inner.start, inner.end));
      }
    }
  }
  if (blocks.length > 1 || skis.length > 1)
    throw new Error("ambiguous certificate");
  return { serial, issuer, ski: skis[0] };
};

/** The DER of the certificate that signed this token (DER bytes), or undefined. Never throws. */
export const signerCertificateOf = (token) => {
  try {
    const b = token instanceof Uint8Array ? token : new Uint8Array(token);
    const sd = signedDataOf(b);
    const signerInfos = sd[sd.length - 1];
    if (signerInfos.tag !== 0x31) return undefined;
    const infos = children(b, signerInfos);
    if (infos.length !== 1) return undefined;
    const sid = children(b, infos[0])[1];
    let match;
    if (sid.tag === 0x30) {
      const [issuer, serial] = children(b, sid);
      const wantIssuer = issuer.whole;
      const wantSerial = b.subarray(serial.start, serial.end);
      match = (c) => same(c.issuer, wantIssuer) && same(c.serial, wantSerial);
    } else if (sid.tag === 0x80) {
      const ski = b.subarray(sid.start, sid.end);
      match = (c) => !!c.ski && same(c.ski, ski);
    } else return undefined;
    const certs = sd.find((k) => k.tag === 0xa0);
    if (!certs) return undefined;
    // Exactly one certificate may match the signer: any certificate this can't read, or a second
    // match, makes the token ambiguous, and it is refused.
    const found = [];
    for (const c of children(b, certs).filter((k) => k.tag === 0x30)) {
      if (match(certIds(b, c))) found.push(c);
    }
    // The same certificate carried twice is one certificate; two different ones are not.
    const distinct = found.filter(
      (c, i) => found.findIndex((d) => same(d.whole, c.whole)) === i,
    );
    return distinct.length === 1
      ? new Uint8Array(distinct[0].whole)
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The same token with its certificates taken out (DER). Checked with veilcore-records'
 * verifyTimestampToken(stripped, data, { certificates: [pinned] }), the signature can then only
 * be checked with the pinned certificate's key: what the pin binds is exactly the key the
 * signature was checked with, whatever else the token carried.
 */
export const stripCertificates = (token) => {
  const b = token instanceof Uint8Array ? token : new Uint8Array(token);
  const ci = tlv(b, 0);
  const [type, explicit] = children(b, ci);
  const [sd] = children(b, explicit);
  const fields = children(b, sd).filter((k) => k.tag !== 0xa0);
  return der(
    0x30,
    type.whole,
    der(0xa0, der(0x30, ...fields.map((k) => k.whole))),
  );
};

export const PINS_FORMAT = "veilcore-tsa-pins/v1";

/** Whether a value is a pin file: each pin a name and a certificate's SHA-256. */
export const isPinFile = (v) =>
  typeof v === "object" &&
  v !== null &&
  v.format === PINS_FORMAT &&
  Array.isArray(v.pins) &&
  v.pins.every(
    (p) =>
      typeof p?.name === "string" &&
      p.name.length > 0 &&
      /^[0-9a-f]{64}$/.test(String(p.certSha256)),
  );

const hex = (buf) =>
  Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );

/** The pin this token's signing certificate matches, with that certificate's DER, or undefined. */
export const pinOf = async (token, pins) => {
  const cert = signerCertificateOf(token);
  if (!cert) return undefined;
  const fp = hex(await crypto.subtle.digest("SHA-256", cert));
  const pin = pins.find((p) => p.certSha256 === fp);
  return pin ? { ...pin, cert } : undefined;
};
