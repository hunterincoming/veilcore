// The disclosure receipt: what each on-chain action makes public on Midnight, in the app's
// own fixed words, shown just before the person confirms (components/chain/DisclosureReceipt).
//
// Built from the contracts, not from prose. Each circuit below lists every expression its
// `disclose()` calls reveal (in contract/src/*.compact, including the helper circuits it
// calls), and which fact the receipt names for each one. onchain-receipt.test.ts parses the
// .compact sources and fails when a circuit's disclose() set changes and this table does not,
// so the receipt can't quietly fall behind the contract.
//
// Every receipt also says the date: a transaction lands in a block, and the block has a time.
// What stays private is the same three sentences on every receipt (STAYS).
// SPDX-License-Identifier: Apache-2.0

/** One public fact, worded in app/<lang>/receipt.ts as app.receipt.fact.<key>. */
export type ReceiptFact =
  | 'yourRecord'
  | 'recovery'
  | 'newKey'
  | 'otherRecord'
  | 'issuerRecord'
  | 'challenge'
  | 'dnaReport'
  | 'licence'
  | 'newLicence'
  | 'licenceEntry'
  | 'slot'
  | 'presentation'
  | 'listVersion'
  | 'checkPassed'
  | 'obligation'
  | 'certificate'
  | 'otherCertificate'
  | 'certKind'
  | 'line'
  | 'value'
  | 'limit'
  | 'comparison'
  | 'mask'
  | 'labKey'
  | 'signatureCheck'
  | 'batch'
  | 'timeLimit';

export type ReceiptContract = 'veilcore' | 'claims';

export type CircuitReceipt = {
  readonly contract: ReceiptContract;
  /** Each disclose() expression (whitespace collapsed) and the fact it is shown as. */
  readonly disclosed: Readonly<Record<string, ReceiptFact>>;
  /** Called from a screen in this app (config.ts BROWSER_CIRCUITS, CLAIMS_BROWSER_CIRCUITS). */
  readonly screen: boolean;
};

// The record key's fingerprint: commit(localGeneticSecret()), disclosed by liveSelf() in every
// circuit that acts as a record.
const SELF = 'commit(localGeneticSecret())';

export const RECEIPTS = {
  // ---- records ----
  anchor: { contract: 'veilcore', screen: true, disclosed: { [SELF]: 'yourRecord', recoveryCommitment: 'recovery' } },
  anchorBatch: { contract: 'veilcore', screen: false, disclosed: { root: 'batch' } },
  proveOwnership: { contract: 'veilcore', screen: true, disclosed: { [SELF]: 'yourRecord', challenge: 'challenge' } },
  pairDna: { contract: 'veilcore', screen: true, disclosed: { [SELF]: 'yourRecord', dnaCommitment: 'dnaReport' } },
  rotateRecordSecret: {
    contract: 'veilcore',
    screen: false,
    disclosed: { [SELF]: 'yourRecord', newRecordCommitment: 'newKey' },
  },
  recoverRecordSecret: {
    contract: 'veilcore',
    screen: false,
    disclosed: { recordCommitment: 'yourRecord', newRecordCommitment: 'newKey', newRecoveryCommitment: 'recovery' },
  },
  replaceRecoveryCommitment: {
    contract: 'veilcore',
    screen: false,
    disclosed: { recordCommitment: 'yourRecord', newRecoveryCommitment: 'recovery' },
  },
  // ---- licences ----
  issueLicense: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', licenseCommitment: 'licence' },
  },
  countersignLicense: {
    contract: 'veilcore',
    screen: true,
    disclosed: { recordCommitment: 'issuerRecord', 'licenseKey(lc, rc)': 'licenceEntry', slot: 'slot', lc: 'licence' },
  },
  proposeTransfer: {
    contract: 'veilcore',
    screen: true,
    disclosed: {
      recordCommitment: 'issuerRecord',
      'licenseKey(licenseCommit(licenseSecret(), rc), rc)': 'licenceEntry',
      newLicenseCommitment: 'newLicence',
    },
  },
  approveTransfer: {
    contract: 'veilcore',
    screen: true,
    disclosed: {
      [SELF]: 'yourRecord',
      issuingRecord: 'issuerRecord',
      licenseCommitment: 'licence',
      expectedNewLicense: 'newLicence',
    },
  },
  withdrawTransfer: {
    contract: 'veilcore',
    screen: true,
    disclosed: {
      recordCommitment: 'issuerRecord',
      'licenseKey(licenseCommit(licenseSecret(), rc), rc)': 'licenceEntry',
    },
  },
  revokeLicense: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', issuingRecord: 'issuerRecord', licenseCommitment: 'licence' },
  },
  sealRevocations: { contract: 'veilcore', screen: false, disclosed: { bound: 'timeLimit' } },
  proveLicense: {
    contract: 'veilcore',
    screen: true,
    disclosed: {
      'challenge != default<Bytes<32>>': 'checkPassed',
      'path.leaf == leaf': 'checkPassed',
      'merkleTreePathRoot<24, Bytes<32>>(path)': 'listVersion',
      'presentationTag(record, challenge)': 'presentation',
    },
  },
  // ---- descent ----
  proposeParent: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', parentRecord: 'otherRecord' },
  },
  confirmParent: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', childRecord: 'otherRecord' },
  },
  withdrawParent: { contract: 'veilcore', screen: true, disclosed: { [SELF]: 'yourRecord' } },
  // ---- obligations ----
  proposeObligation: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  encumberOwnRecord: {
    contract: 'veilcore',
    screen: false,
    disclosed: { [SELF]: 'yourRecord', obligationCommitment: 'obligation' },
  },
  withdrawObligation: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  acceptObligation: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', beneficiary: 'otherRecord', obligationCommitment: 'obligation' },
  },
  rejectObligation: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', beneficiary: 'otherRecord', obligationCommitment: 'obligation' },
  },
  discharge: {
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  // ---- claims (veilcore-claims.compact) ----
  proveValue: {
    contract: 'claims',
    screen: true,
    disclosed: { record: 'certificate', schema: 'certKind', slot: 'line', value: 'value' },
  },
  proveRange: {
    contract: 'claims',
    screen: true,
    disclosed: { record: 'certificate', schema: 'certKind', slot: 'line', op: 'comparison', bound: 'limit' },
  },
  proveDistinct: {
    contract: 'claims',
    screen: false,
    disclosed: { first: 'certificate', second: 'otherCertificate', 'schemaOf(terms)': 'certKind' },
  },
  proveUnchanged: {
    contract: 'claims',
    screen: false,
    disclosed: { original: 'certificate', corrected: 'otherCertificate', schema: 'certKind', mayChange: 'mask' },
  },
  proveAttested: {
    contract: 'claims',
    screen: true,
    disclosed: {
      record: 'certificate',
      'jubjubPointX(key)': 'labKey',
      'jubjubPointY(key)': 'labKey',
      // The Schnorr check's challenge pieces (schnorr.compact schnorrVerify).
      q: 'signatureCheck',
      c: 'signatureCheck',
    },
  },
} as const satisfies Record<string, CircuitReceipt>;

export type ReceiptCircuit = keyof typeof RECEIPTS;

/** The facts a receipt for these circuits lists, once each, in table order. */
export const receiptFacts = (circuits: readonly ReceiptCircuit[]): ReceiptFact[] => {
  const out: ReceiptFact[] = [];
  for (const c of circuits)
    for (const f of Object.values(RECEIPTS[c].disclosed) as ReceiptFact[]) if (!out.includes(f)) out.push(f);
  return out;
};

/**
 * What stays private, the same on every receipt (app.receipt.stay.*). Checked against the code:
 * a record's name is sealed (api-store.ts PUBLIC_FIELDS), its kind (`profile`) is not.
 */
export const STAYS = ['genetics', 'locked', 'kind'] as const;
