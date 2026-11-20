// Propose a pin for a timestamp authority (docs/offline.md, "Whose timestamp"):
//
//   node scripts/tsa-pin.mjs https://timestamp.sectigo.com
//
// Asks the authority for a token on 32 random bytes, finds the certificate that signed it
// (scripts/tsa-signer.mjs, as the site does), checks the token with veilcore-records, and prints
// the certificate (PEM), its SHA-256 and a pin entry for bboard-ui/src/config/tsa-pins.json. It
// trusts nothing it prints: before the entry goes in, check the certificate the way the entries
// already there were checked, e.g. that it chains to the authority's root in your operating
// system's trust store (the command is printed), and against what the authority publishes.
// Sends nothing but the request; no secrets.
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomBytes } from 'node:crypto';
import { timestampTokenBytes, verifyTimestampToken } from 'veilcore-records';
import { signerCertificateOf } from './tsa-signer.mjs';

const der = (tag, ...parts) => {
  const body = Buffer.concat(parts);
  const n = body.length;
  const len = n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.concat([Buffer.from([tag]), len, body]);
};
const SHA256_OID = Buffer.from('0609608648016503040201', 'hex');

const main = async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: node scripts/tsa-pin.mjs <timestamp authority address>');
    process.exit(2);
  }
  const data = randomBytes(32);
  const digest = createHash('sha256').update(data).digest();
  const nonce = randomBytes(8);
  nonce[0] = (nonce[0] & 0x7f) | 1;
  const req = der(
    0x30,
    der(0x02, Buffer.from([1])),
    der(0x30, der(0x30, SHA256_OID, Buffer.from([5, 0])), der(0x04, digest)),
    der(0x02, nonce),
    Buffer.from([0x01, 0x01, 0xff]),
  );
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/timestamp-query' }, body: req });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const token = timestampTokenBytes(new Uint8Array(await res.arrayBuffer()));
  if (!token) throw new Error('not a granted timestamp');
  const v = await verifyTimestampToken(token, data);
  if (!v.ok) throw new Error(`the token did not check: ${v.checks.filter((c) => !c.ok).map((c) => c.what).join('; ')}`);
  const cert = signerCertificateOf(token);
  if (!cert) throw new Error('no signing certificate in the token');
  const fp = createHash('sha256').update(cert).digest('hex');
  const pem = `-----BEGIN CERTIFICATE-----\n${Buffer.from(cert).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
  console.log(pem);
  console.log(`Signed by: ${v.signerSubject}\nTime: ${v.genTime}\nCertificate SHA-256: ${fp}\n`);
  console.log('Check it before pinning it, for example (save the PEM above as signer.pem and the');
  console.log("token's intermediate certificate, if it carries one, as intermediate.pem):");
  console.log('  openssl verify -purpose timestampsign -untrusted intermediate.pem signer.pem\n');
  console.log('Pin entry for bboard-ui/src/config/tsa-pins.json, once checked:');
  console.log(JSON.stringify({ name: '<the authority>', certSha256: fp, subject: v.signerSubject, verified: '<how you checked it>' }, null, 2));
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
