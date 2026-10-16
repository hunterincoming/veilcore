// Correcting a record.
//
// Records are never edited and never voided. A correction issues a NEW record that
// supersedes the old one, and both remain. A record that can be quietly changed is not
// evidence, and voiding is rewriting under another name.
//
// The severity of a correction is classified by WHICH FIELD CHANGED, never chosen by
// the holder. If the holder picks, every correction is cosmetic - nobody flags their own
// correction as the kind that invalidates their downstream agreements.
//
// SPDX-License-Identifier: Apache-2.0

import { supersedesFor, diffRecords, classifyCorrection } from 'veilcore-records';
import { toEnvelope, sealEnvelope } from './envelope';
import { holderPartyId } from './holder';
import type { StrainRecord } from './records';

/**
 * Every name a correction's `changedFields` may hold (CONTRACT.md #18). The registry keeps
 * a correction's list of changed fields readable, so it accepts only these names and never
 * free text; its copy is `CHANGED_FIELD_NAMES` in the registry's sealed.js, and the
 * cross-repo contract test (registry-contract.test.ts) checks the two hold the same names.
 * Add a name here and there together.
 */
// prettier-ignore
export const CHANGED_FIELD_NAMES: readonly string[] = Object.freeze([
  // The app's own record fields (records.ts StrainRecord).
  'id', 'nonce', 'strainName', 'bredBy', 'dateCreated', 'notes', 'loggedAt', 'recordFingerprint', 'keyBinding',
  'parents', 'breedingMethod', 'profile', 'taxon', 'animal', 'photoFingerprints', 'refId', 'dnaFingerprint',
  'dnaFileName', 'dnaPairedAt', 'dnaFileSha256', 'dnaResultId', 'attestation', 'supersedes', 'supersededBy',
  'receivedFrom', 'receivedFromCommitment', 'receivedAt', 'transferId', 'quantity', 'licenseIds',
  'deliveryNote', 'labRef', 'resultLock', 'receiptRejected',
  // Envelope paths (envelope.ts toEnvelope, veilcore-records committedFields and diffRecords).
  'attestations', 'commitmentAlgorithm', 'extensions', 'fieldSchema', 'fieldSetRoot', 'formatVersion',
  'holder', 'holder.id', 'identification', 'identification.method', 'identification.reportHash',
  'identification.performedOn', 'jurisdictionBindings', 'ledgerIdentity', 'registrations', 'sealedAt',
  'subject', 'subject.name', 'subject.originator', 'subject.taxon', 'subject.internalDesignation',
  'subject.claimedCreationDate', 'subjectType', 'profileData',
  'profileData.breedingMethod', 'profileData.notes', 'profileData.breed', 'profileData.sex',
  'profileData.individualId', 'profileData.idScheme', 'profileData.herd', 'profileData.parentIds',
  // Envelope paths older sites wrote, and the SDK's other classified names.
  'profileData.cultivarName', 'profileData.breederName', 'profileData.claimedCreationDate',
  'profileData.internalReference', 'profileData.taxon', 'profileData.phenotypeSelection',
]);

export type CorrectionPreview = {
  changedFields: string[];
  descentSeverity: 'cosmetic' | 'material';
  termsSeverity: 'cosmetic' | 'material';
  /** What the holder needs to understand before committing to this. */
  consequence: string;
};

/** Exported for the translations test: the app shows these words through app.plant.fix.c.* keys. */
export const CONSEQUENCE: Record<string, string> = {
  'cosmetic|cosmetic':
    'Nothing downstream is affected. Offspring keep their ancestry checks, and any agreements stand.',
  'cosmetic|material':
    'Offspring are unaffected: the material did not change. But anyone with an agreement on this record needs to know, because the terms may refer to what you changed.',
  'material|cosmetic':
    'Anyone relying on descent from this record needs to check again. Existing agreements are unaffected.',
  'material|material':
    'Both descent and existing agreements are affected. Offspring will need their ancestry checked again, and the other parties to your agreements need to be told.',
};

/**
 * What a correction would do, before it is made.
 *
 * Shown to the holder first because the consequence is not obvious from the edit. A
 * breeder fixing a spelling should be told that nothing breaks; a breeder correcting a
 * parent should be told that everything downstream re-checks.
 */
export const previewCorrection = (before: StrainRecord, after: StrainRecord): CorrectionPreview => {
  // Both envelopes carry the same holder id, so it cannot show up as a change; a fixed
  // placeholder keeps this synchronous without putting any part of the key in it.
  const id = 'preview';
  const changes = diffRecords(toEnvelope(before, id), toEnvelope(after, id));
  const sev = classifyCorrection(changes);
  return {
    changedFields: changes.map((c) => c.field),
    descentSeverity: sev.descent,
    termsSeverity: sev.terms,
    consequence: CONSEQUENCE[`${sev.descent}|${sev.terms}`] ?? '',
  };
};

/**
 * Build the correcting record.
 *
 * The original is untouched. The new record carries a supersedes block naming the
 * original, the classified severities, and WHICH fields changed - not their values, so
 * a downstream party learns the kind of change without learning contents they were
 * never granted.
 */
export const buildCorrection = async (
  before: StrainRecord,
  after: StrainRecord,
  reason: string,
): Promise<{ envelope: unknown; supersedes: unknown }> => {
  const id = await holderPartyId();
  const beforeEnv = toEnvelope(before, id);
  const afterEnv = await sealEnvelope(after, id);
  const supersedes = supersedesFor(beforeEnv, afterEnv, reason, 'holder');
  return { envelope: { ...afterEnv, supersedes }, supersedes };
};
