// One vector for the sample's chain of custody, shared by the site's tests and, by value, the
// registry's (test/sample-custody.test.mjs, "cross-check vector"). The lab's receipt is signed
// over a digest of these values, so the site and the registry must normalise the same input
// to the same values and the same digest, character for character, or a receipt never links.
// Test data only.
// SPDX-License-Identifier: Apache-2.0

/** What the breeder and the lab typed: spaces around values, CR LF and blank lines, an NFD é. */
export const CROSS_SAMPLE_IN = {
  sampleId: '  BLU-07 ',
  sealNumber: '4471',
  takenFrom: 'Mother M3, bench 2',
  takenOn: '2024-02-29',
  witness: 'Jose\u0301 Doe',
};
export const CROSS_ARRIVAL_IN = {
  sampleId: 'BLU-07',
  sealNumber: ' 4417',
  sealIntact: 'no' as const,
  arrivedOn: '2026-10-15',
  condition: '  Cold, bag dry   \r\n\r\n\r\n\r\nTube cracked at the cap \r\n',
  labRef: 'ACC-9',
};
/** As both sides store them. */
export const CROSS_SAMPLE = {
  sampleId: 'BLU-07',
  sealNumber: '4471',
  takenFrom: 'Mother M3, bench 2',
  takenOn: '2024-02-29',
  witness: 'Jos\u00e9 Doe',
};
export const CROSS_ARRIVAL = {
  sampleId: 'BLU-07',
  sealNumber: '4417',
  sealIntact: 'no' as const,
  arrivedOn: '2026-10-15',
  condition: 'Cold, bag dry\n\nTube cracked at the cap',
  labRef: 'ACC-9',
};
/** custodyDigest('TR-0A1B2C3D', CROSS_SAMPLE, CROSS_ARRIVAL), as the registry computes it. */
export const CROSS_DIGEST = '083228467b457fa19feb4e89492888ee93bc9ac2c37df63158a9f1c7043b36d4';
