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

// ---- sealed sample details (CONTRACT.md #27) ------------------------------------------------
//
// The same values as the registry's test/fixtures/sealed-custody-vectors.json (the cross-repo
// contract test checks they are equal): both sides compute the same v2 digest from them, and
// each opens the box the other sealed. The offer key is bytes 255..224 and the salt bytes 0..31.
// Test data only.

export const SEALED_TRANSFER_ID = 'TR-0A1B2C3D';
/** The salt the sender's sealed sample carries: 32 bytes, base64url. */
export const CROSS_SALT = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
/** The delivery's offer key (test data), base64url, and its kid. */
export const CROSS_OFFER_KEY = '__79_Pv6-fj39vX08_Lx8O_u7ezr6uno5-bl5OPi4eA';
export const CROSS_OFFER_KID = 'fc186215188aa10f';
/** custodyDigestV2('TR-0A1B2C3D', CROSS_SALT, CROSS_SAMPLE, CROSS_ARRIVAL), on both sides. */
export const CROSS_DIGEST_V2 = '61e855c1308ebd64e41bd75d06bba68ef8f4d1951f9815ceec1fdebb029b3356';
/** { ...CROSS_SAMPLE, salt: CROSS_SALT } sealed by the site's vault.ts sealCustody (padded). */
export const SAMPLE_BOX_FROM_SITE = {
  v: 1,
  alg: 'A256GCM',
  kid: 'fc186215188aa10f',
  iv: 'nV71UjW8iYA7-4zP',
  ct: 'i9Hr9cqWUQ71uPXqo56Mp602b8pOF3oScJx8CBeAS4JibUfSZlXinDU3rjhkJPzXHCTYaN_jrOBGCWTBouN3r7B5Nb44VXmRPc_RT4AprAcodE6UkpJx2Cxp_ow_vVPDWBga7dxQVqcP8etsnIuBkRK1jMhm84idj2lMldGD5bCBnpLv63ssNd19SKf12oo7zj9SOBt_71O-JjRx8tUVQqXbtT4-3wnz7pF-Qvt04KgUtwbrgwRBuoyn_WbspIRrYZJmUY41mqO_sU5DusM94dMCqp9Ux1AHN7mbAUv7f32x0iMxyH-VP-gDIxZIt33HhAm-LKzOzP-KFW-9otWtRaSWfv8CHgVYkhPtNlHS9gmGrw8zeLZFi4d02Z7NclSf7LcjzXx-r-Uqi9TXRdhrCoSxVfuo2ekUnaiJEot2szzAIDZr96IjVClJJ-ku4J5dvlN15jx8wpAfSwPKXIiQ0_vyXznXYG6Ph0QNvrW8ZHVuh6DfSFk6kSCeHhteqisqzgRCsqxWIO6fWFV8NANSHkDdlH4oiNnb5bAkhv1HBw89U5F23Ups44JuhDiDHv114G-qD0DIiYRP8zTDDCSYQImPyDoWHeWbRZj-SybAC9LzTo28V-0fpV0PHDzhp_yWQqjOD5IyxGo17CgBiaRGs7NQ25LbFUVxoM1T4htJ1ALI3S9R3J8_-e1719zIOPRLve8g0qZ7zOLciKGne-f50EFwYrBdOMejm8mEGy_UnC-wJj_GOaxq5M8rMw6a3gBvcn1yWkuWd7Sc8DSDBtGZvrjS7dEWizo_7ZanZp1HPjuTKcSF21K6KTk_hriAYjCVykuhMhc0OdP3mPM-9q5Jbj-HsVwD5OBDU5RHMmHYpyhbSFyTpuIJfFvBlhmUaSV76WDR0De2ikqWnZqwOw4aUUKZt0mwLN2AYZFKHrshSjx_Ck-yGM5W3Sd6ykcrZs-w7UwPSk-zVTKV1NyNWrHSstW-fx4pKXWhzkXHWybtBxhPupaTJbUnza99sUFoH3argXr4g-OKDFlObJ7km9q_lfO01beHKg0LiVJxevUcKUtydJ2h7rx2CjwKZbKCcCq6VaI_Oo9gNNolcxlN21-GcJFRqllu1lCBAxBUOWz9vOmOGNHg4KkNJ_oPnHRLofgxlpTk5cd8TwP7UD_cdQTlutfjHCo58aE8cyPa9jDmOGOeFQ0aaAIWcDEg2amGzbvCEoSY5SSljgN645XJ0ZHDTsrX6F2SFqvBAfvIDZyNc044q1KEbAPcdT08hnHZ2ONrNd8DfmdJMtnJePhB2xo5wk3BrGuFwnSySiLbrtj-flakg6clNAgMHTkmw_usH0BQFmAcv8uWZnCErn7_KyD3o2-9p9E2y6yl929aIhfYLBo',
};
/** CROSS_ARRIVAL sealed by the registry's test helper (node:crypto, unpadded). */
export const ARRIVAL_BOX_FROM_REGISTRY = {
  v: 1,
  alg: 'A256GCM',
  kid: 'fc186215188aa10f',
  iv: 'yABIbCWfvmCsCIfO',
  ct: 'TUQq7FWtnjcUTD_CU__BWiA9ljbMipcGhRdiOVFpduXOVhMB9IvRxlIGjQKoKfHDFNW54-zEbN_4fTnrnHFKfbvcbuZODVH0VoqOHD3AWn4vUijkEH38IFbawaZ5bDyd37af8Wwra4bqy_t6zqHUMbXcJTewtYBJ1-HnkqInYh6mqqEitZUFDtuuvOQBH-NUrBqQY2seEkNT6TMf2evUAE72j5LCQ6fdwhUcFQ',
};
