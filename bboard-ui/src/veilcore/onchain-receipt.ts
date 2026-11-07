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
  | 'license'
  | 'newLicense'
  | 'licenseEntry'
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
  | 'timeLimit'
  // What the ledger writes reveal (LEDGER_FACTS), beyond the disclosed values:
  | 'step'
  | 'keyLink'
  | 'moveCount'
  | 'licenseLink'
  | 'licenseList'
  | 'licenseCount'
  | 'parentLink'
  | 'obligationLink'
  | 'obligationCount';

/**
 * What writing each ledger field makes public, for every field of both contracts. A step's own
 * counter and its "last …" cells say which step this was, and tie its codes together (the
 * receipt says that on every step); the maps and counters say how codes are linked and how
 * many licenses and obligations a record carries.
 */
export const LEDGER_FACTS = {
  // veilcore.compact
  protocolVersion: 'step',
  anchorSeq: 'step',
  proofSeq: 'step',
  batchSeq: 'step',
  pairSeq: 'step',
  rotationSeq: 'step',
  transferSeq: 'step',
  presentationSeq: 'step',
  sealSeq: 'step',
  descentSeq: 'step',
  obligationSeq: 'step',
  lastAnchor: 'step',
  lastBatchRoot: 'step',
  lastOwnershipProof: 'step',
  lastOwnershipChallenge: 'step',
  lastPairedRecord: 'step',
  lastPairedDna: 'step',
  lastRotatedFrom: 'step',
  lastRotatedTo: 'step',
  lastRecoveredOrigin: 'step',
  lastPresentation: 'step',
  lastPresentationRoot: 'step',
  lastPresentationUnsealed: 'step',
  lastIssuedLicense: 'step',
  lastActivatedLicense: 'step',
  lastTransferredLicense: 'step',
  lastActivatedRecord: 'step',
  lastDescentChild: 'step',
  lastDescentParent: 'step',
  lastObligationRecord: 'step',
  lastObligation: 'step',
  lastBeneficiary: 'step',
  lastProposedObligation: 'step',
  lastProposedAgainst: 'step',
  lastProposedBy: 'step',
  originOf: 'keyLink',
  headOf: 'keyLink',
  recoveryOf: 'keyLink',
  licenseStatusOf: 'licenseLink',
  pendingTransferOf: 'licenseLink',
  licenseSlotOf: 'licenseLink',
  licenseAtSlot: 'licenseLink',
  activeLicenses: 'licenseList',
  lastSealTime: 'licenseList',
  unsealedChanges: 'licenseList',
  rootsSinceSeal: 'licenseList',
  pendingParentOf: 'parentLink',
  parentsOf: 'parentLink',
  hasOffspring: 'parentLink',
  pendingObligations: 'obligationLink',
  openObligations: 'obligationLink',
  obligationCountOf: 'obligationCount',
  pendingObligationsBy: 'obligationCount',
  rotationsOf: 'moveCount',
  recoveriesOf: 'moveCount',
  pendingLicensesBy: 'licenseCount',
  activeLicensesBy: 'licenseCount',
  // veilcore-claims.compact
  claimSeq: 'step',
  lastClaimKind: 'step',
  lastClaimRecord: 'step',
  lastClaimOther: 'step',
  lastClaimSchema: 'step',
  lastClaimSlot: 'step',
  lastClaimParam: 'step',
  lastClaimOp: 'step',
  lastClaimAttesterX: 'step',
  lastClaimAttesterY: 'step',
} as const satisfies Record<string, ReceiptFact>;

export type LedgerField = keyof typeof LEDGER_FACTS;

export type ReceiptContract = 'veilcore' | 'claims';

export type CircuitReceipt = {
  readonly contract: ReceiptContract;
  /** Each disclose() expression (whitespace collapsed) and the fact it is shown as. */
  readonly disclosed: Readonly<Record<string, ReceiptFact>>;
  /**
   * Every ledger field the circuit writes (directly or through the circuits it calls). What a
   * write reveals is LEDGER_FACTS's: that the step happened, which codes it ties together, and
   * the counts a record carries. onchain-receipt.test.ts checks this list against the sources.
   */
  readonly writes: readonly LedgerField[];
  /** Called from a screen in this app (config.ts BROWSER_CIRCUITS, CLAIMS_BROWSER_CIRCUITS). */
  readonly screen: boolean;
};

// The record key's fingerprint: commit(localGeneticSecret()), disclosed by liveSelf() in every
// circuit that acts as a record.
const SELF = 'commit(localGeneticSecret())';

export const RECEIPTS = {
  // ---- records ----
  anchor: {
    writes: [
      'activeLicensesBy',
      'anchorSeq',
      'lastAnchor',
      'obligationCountOf',
      'pendingLicensesBy',
      'pendingObligationsBy',
      'recoveriesOf',
      'recoveryOf',
      'rotationsOf',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', recoveryCommitment: 'recovery' },
  },
  anchorBatch: {
    writes: ['batchSeq', 'lastBatchRoot'],
    contract: 'veilcore',
    screen: false,
    disclosed: { root: 'batch' },
  },
  proveOwnership: {
    writes: ['lastOwnershipChallenge', 'lastOwnershipProof', 'proofSeq'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', challenge: 'challenge' },
  },
  pairDna: {
    writes: ['lastPairedDna', 'lastPairedRecord', 'pairSeq'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', dnaCommitment: 'dnaReport' },
  },
  rotateRecordSecret: {
    writes: [
      'headOf',
      'lastRecoveredOrigin',
      'lastRotatedFrom',
      'lastRotatedTo',
      'originOf',
      'rotationSeq',
      'rotationsOf',
    ],
    contract: 'veilcore',
    screen: false,
    disclosed: { [SELF]: 'yourRecord', newRecordCommitment: 'newKey' },
  },
  recoverRecordSecret: {
    writes: [
      'headOf',
      'lastRecoveredOrigin',
      'lastRotatedFrom',
      'lastRotatedTo',
      'originOf',
      'recoveriesOf',
      'recoveryOf',
      'rotationSeq',
      'rotationsOf',
    ],
    contract: 'veilcore',
    screen: false,
    disclosed: { recordCommitment: 'yourRecord', newRecordCommitment: 'newKey', newRecoveryCommitment: 'recovery' },
  },
  replaceRecoveryCommitment: {
    writes: ['recoveryOf'],
    contract: 'veilcore',
    screen: false,
    disclosed: { recordCommitment: 'yourRecord', newRecoveryCommitment: 'recovery' },
  },
  // ---- licenses ----
  issueLicense: {
    writes: ['lastIssuedLicense', 'licenseStatusOf', 'pendingLicensesBy'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', licenseCommitment: 'license' },
  },
  countersignLicense: {
    writes: [
      'activeLicenses',
      'activeLicensesBy',
      'lastActivatedLicense',
      'lastActivatedRecord',
      'licenseAtSlot',
      'licenseSlotOf',
      'licenseStatusOf',
      'pendingLicensesBy',
      'rootsSinceSeal',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { recordCommitment: 'issuerRecord', 'licenseKey(lc, rc)': 'licenseEntry', slot: 'slot', lc: 'license' },
  },
  proposeTransfer: {
    writes: ['pendingTransferOf', 'transferSeq'],
    contract: 'veilcore',
    screen: true,
    disclosed: {
      recordCommitment: 'issuerRecord',
      'licenseKey(licenseCommit(licenseSecret(), rc), rc)': 'licenseEntry',
      newLicenseCommitment: 'newLicense',
    },
  },
  approveTransfer: {
    writes: [
      'activeLicenses',
      'lastTransferredLicense',
      'licenseAtSlot',
      'licenseSlotOf',
      'licenseStatusOf',
      'pendingTransferOf',
      'transferSeq',
      'unsealedChanges',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: {
      [SELF]: 'yourRecord',
      issuingRecord: 'issuerRecord',
      licenseCommitment: 'license',
      expectedNewLicense: 'newLicense',
    },
  },
  withdrawTransfer: {
    writes: ['pendingTransferOf', 'transferSeq'],
    contract: 'veilcore',
    screen: true,
    disclosed: {
      recordCommitment: 'issuerRecord',
      'licenseKey(licenseCommit(licenseSecret(), rc), rc)': 'licenseEntry',
    },
  },
  revokeLicense: {
    writes: [
      'activeLicenses',
      'activeLicensesBy',
      'licenseAtSlot',
      'licenseSlotOf',
      'licenseStatusOf',
      'pendingLicensesBy',
      'pendingTransferOf',
      'unsealedChanges',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', issuingRecord: 'issuerRecord', licenseCommitment: 'license' },
  },
  sealRevocations: {
    writes: ['activeLicenses', 'lastSealTime', 'rootsSinceSeal', 'sealSeq', 'unsealedChanges'],
    contract: 'veilcore',
    screen: false,
    disclosed: { bound: 'timeLimit' },
  },
  proveLicense: {
    writes: ['lastPresentation', 'lastPresentationRoot', 'lastPresentationUnsealed', 'presentationSeq'],
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
    writes: ['pendingParentOf'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', parentRecord: 'otherRecord' },
  },
  confirmParent: {
    writes: ['descentSeq', 'hasOffspring', 'lastDescentChild', 'lastDescentParent', 'parentsOf', 'pendingParentOf'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', childRecord: 'otherRecord' },
  },
  withdrawParent: {
    writes: ['pendingParentOf'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord' },
  },
  // ---- obligations ----
  proposeObligation: {
    writes: [
      'lastProposedAgainst',
      'lastProposedBy',
      'lastProposedObligation',
      'pendingObligations',
      'pendingObligationsBy',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  encumberOwnRecord: {
    writes: [
      'lastBeneficiary',
      'lastObligation',
      'lastObligationRecord',
      'obligationCountOf',
      'obligationSeq',
      'openObligations',
    ],
    contract: 'veilcore',
    screen: false,
    disclosed: { [SELF]: 'yourRecord', obligationCommitment: 'obligation' },
  },
  withdrawObligation: {
    writes: ['pendingObligations', 'pendingObligationsBy'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  acceptObligation: {
    writes: [
      'lastBeneficiary',
      'lastObligation',
      'lastObligationRecord',
      'obligationCountOf',
      'obligationSeq',
      'openObligations',
      'pendingObligations',
      'pendingObligationsBy',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', beneficiary: 'otherRecord', obligationCommitment: 'obligation' },
  },
  rejectObligation: {
    writes: ['pendingObligations', 'pendingObligationsBy'],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', beneficiary: 'otherRecord', obligationCommitment: 'obligation' },
  },
  discharge: {
    writes: [
      'lastBeneficiary',
      'lastObligation',
      'lastObligationRecord',
      'obligationCountOf',
      'obligationSeq',
      'openObligations',
    ],
    contract: 'veilcore',
    screen: true,
    disclosed: { [SELF]: 'yourRecord', record: 'otherRecord', obligationCommitment: 'obligation' },
  },
  // ---- claims (veilcore-claims.compact) ----
  proveValue: {
    writes: [
      'claimSeq',
      'lastClaimAttesterX',
      'lastClaimAttesterY',
      'lastClaimKind',
      'lastClaimOp',
      'lastClaimOther',
      'lastClaimParam',
      'lastClaimRecord',
      'lastClaimSchema',
      'lastClaimSlot',
    ],
    contract: 'claims',
    screen: true,
    disclosed: { record: 'certificate', schema: 'certKind', slot: 'line', value: 'value' },
  },
  proveRange: {
    writes: [
      'claimSeq',
      'lastClaimAttesterX',
      'lastClaimAttesterY',
      'lastClaimKind',
      'lastClaimOp',
      'lastClaimOther',
      'lastClaimParam',
      'lastClaimRecord',
      'lastClaimSchema',
      'lastClaimSlot',
    ],
    contract: 'claims',
    screen: true,
    disclosed: { record: 'certificate', schema: 'certKind', slot: 'line', op: 'comparison', bound: 'limit' },
  },
  proveDistinct: {
    writes: [
      'claimSeq',
      'lastClaimAttesterX',
      'lastClaimAttesterY',
      'lastClaimKind',
      'lastClaimOp',
      'lastClaimOther',
      'lastClaimParam',
      'lastClaimRecord',
      'lastClaimSchema',
      'lastClaimSlot',
    ],
    contract: 'claims',
    screen: false,
    disclosed: { first: 'certificate', second: 'otherCertificate', 'schemaOf(terms)': 'certKind' },
  },
  proveUnchanged: {
    writes: [
      'claimSeq',
      'lastClaimAttesterX',
      'lastClaimAttesterY',
      'lastClaimKind',
      'lastClaimOp',
      'lastClaimOther',
      'lastClaimParam',
      'lastClaimRecord',
      'lastClaimSchema',
      'lastClaimSlot',
    ],
    contract: 'claims',
    screen: false,
    disclosed: { original: 'certificate', corrected: 'otherCertificate', schema: 'certKind', mayChange: 'mask' },
  },
  proveAttested: {
    writes: [
      'claimSeq',
      'lastClaimAttesterX',
      'lastClaimAttesterY',
      'lastClaimKind',
      'lastClaimOp',
      'lastClaimOther',
      'lastClaimParam',
      'lastClaimRecord',
      'lastClaimSchema',
      'lastClaimSlot',
    ],
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
  const add = (f: ReceiptFact) => {
    if (!out.includes(f)) out.push(f);
  };
  for (const c of circuits) for (const f of Object.values(RECEIPTS[c].disclosed) as ReceiptFact[]) add(f);
  for (const c of circuits)
    for (const w of RECEIPTS[c].writes as readonly LedgerField[]) if (LEDGER_FACTS[w] !== 'step') add(LEDGER_FACTS[w]);
  // Every step: which step it was, and that it ties the codes above together.
  add('step');
  return out;
};

/**
 * What stays private, the same on every receipt (app.receipt.stay.*). Checked against the code:
 * a record's name is sealed (api-store.ts PUBLIC_FIELDS), its kind (`profile`) is not.
 */
export const STAYS = ['genetics', 'locked', 'kind'] as const;
