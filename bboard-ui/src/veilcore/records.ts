// VeilCore record store — persisted to localStorage so a breeder's proof survives a
// browser refresh. Real hashing lives in commitment.ts; this only holds records and
// their status. Simulated settlement in demo mode.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { store, type SaveResult } from './store';
import { exportEnvelopeFor, toEnvelope, sealEnvelope } from './envelope';
import { holderPartyId, forgetHolderKey } from './holder';
import { proofFor } from './proofs';
import { reportSave, describeRefusals } from './save-status';
import { newNonce, fingerprintRecord } from './commitment';
import {
  adoptSealedSecrets,
  ensureKeys,
  ensureKeysFor,
  forgetKeys,
  keysFitRecord,
  keysFor,
  sealedSecretsOf,
  type SealedSecrets,
} from './record-keys';
import { bindingForSecret } from './key-binding';
import { isString } from './json';
import { withPairSalt } from './dna-link';
import { newNameSalt } from './verify-link';
import { isAnimal, type AnimalDetails, type ParentRole } from './animal-profile';
import { isStrain, STRAIN_GROUPS, type StrainDetails } from './strain-profile';
import type { DocumentDetails } from './document-profile';
import {
  allowReplace,
  checkRecordIntegrity,
  clearSealedState,
  datingRowOf,
  deleteLicenses,
  deleteRecords,
  integrityOf as storedIntegrityOf,
  isStoredAsIs,
  keepNewerCopy,
  loadNoticeOf,
  lockedRowsOf,
  makeVaultIfSafe,
  olderCopyOf,
  olderRowsOf,
  onSealedStateChange,
  recordSealedBytes,
  registryHasProofCode,
  rowStateOf,
  SEALED_MAX_BYTES,
  sendDatingRows,
  takeOlderCopy,
  type IntegrityCheck as StoredIntegrityCheck,
  type LoadNotice,
  type LockedRow,
} from './api-store';
import { clearUnusedVault, onVaultChange, vaultKeyIfAny, vaultNeedsBackup, vaultKid } from './vault';
import {
  disclosureFrom,
  keysOn,
  listGrants,
  registerGrantKeeper,
  registerRecordLookup,
  sendGrant,
  syncGrants,
  VALUELESS_KEYS,
  type DisclosureKey,
} from './disclosure';
import {
  dropNames,
  dropOfferKeys,
  inOutbox,
  keepName,
  keepOfferKey,
  outboxNames,
  outboxOfferKeys,
  outboxRecords,
  putInOutbox,
  takeFromOutbox,
} from './outbox';
import { holderKey, holderRequestsPaused } from './holder';
import { enT, type Translator } from '../i18n/translate';

/**
 * A second party confirming they received this material.
 *
 * Written by the registry when a recipient claims a transfer — never set by the holder,
 * because a confirmation you give yourself is not evidence. The identity is the
 * recipient's own handle and key, so the claim points at someone.
 */
export type Attestation = {
  /** Legacy name for addressedTo — kept so records written before the rename still render. */
  readonly attesterHandle?: string;
  /** The handle the sender addressed. Not a party this attestation confirms. */
  readonly addressedTo?: string;
  /** What the claim establishes, in words. */
  readonly confirms?: string;
  readonly attesterKey?: string;
  readonly type?: string;
  readonly transferId?: string;
  readonly attestedAt: number;
  /** Legacy, from before an attestation had to be earned. */
  readonly lab?: string;
};

/**
 * A parent: linked to a logged record (recordId set) or free-typed (name only). An animal
 * record's parents are its sire and dam: each has a role, and an individual ID ('' if none),
 * sealed with it (animal-profile.ts).
 */
export type ParentRef = {
  readonly recordId?: string;
  readonly name: string;
  readonly role?: ParentRole;
  readonly individualId?: string;
};

export type StrainRecord = {
  readonly id: string; // VEIL-XXXX
  /** Committed with the record and stored so the commitment can be recomputed. */
  readonly nonce?: string;
  readonly strainName: string;
  readonly bredBy: string;
  readonly dateCreated: string; // breeder's self-asserted claim (not cryptographically proven)
  readonly notes: string;
  readonly loggedAt: number; // when it was sealed, by this device's clock (not a trusted time until anchored)
  readonly recordFingerprint: string;
  /**
   * The record names its own key (key-binding.ts, SPEC 3.6.1): H(keybind, key, salt), sealed
   * and inside the fingerprint. Says nothing about the key without the salt, which stays
   * in this browser's record keys. Absent on records sealed before 14 October 2026.
   */
  readonly keyBinding?: string;
  readonly parents?: ParentRef[];
  readonly breedingMethod?: string;
  /**
   * The profile this record was sealed under. Absent on records sealed before
   * 3 October 2026, which keep the profile they were exported under (see envelope.ts).
   */
  readonly profile?: string;
  /** Species or other taxon, as the holder entered it. Optional for a plant, needed for an animal. */
  readonly taxon?: string;
  /**
   * An animal record's own details: breed, ID scheme, sex, herd (animal-profile.ts). Only on
   * records sealed under the animal profile, where refId is the individual ID and dateCreated
   * the date of birth.
   */
  readonly animal?: AnimalDetails;
  /**
   * A strain or line record's own details: group, deposit numbers, generation (strain-profile.ts).
   * Only on records sealed under the strain profile.
   */
  readonly strain?: StrainDetails;
  /**
   * A document record's own details: type, issuer, files (fingerprints only), the records it is
   * about (document-profile.ts). Only on records sealed under the document profile, where
   * strainName is the title, refId the reference and dateCreated the date on the document.
   */
  readonly document?: DocumentDetails;
  readonly photoFingerprints?: string[]; // photos hashed locally, never uploaded
  readonly refId?: string; // breeder's own reference / lot ID
  /**
   * The pairing fingerprint: the contract's `commit` over the report file's SHA-256
   * (commitment.ts fingerprintFile), so the pairing can be dated on the network. It is NOT
   * the file's SHA-256; a lab signs the SHA-256 (dnaFileSha256).
   */
  readonly dnaFingerprint?: string;
  readonly dnaFileName?: string;
  readonly dnaPairedAt?: number;
  /** The saved report file's plain SHA-256, hex: what a lab's signature names. Absent on pairings saved before 15 October 2026. */
  readonly dnaFileSha256?: string;
  /** The lab report (registry result id) the saved file came from, when it was saved from one. */
  readonly dnaResultId?: string;
  /**
   * The record's own pairing salt (round 5, CONTRACT.md #29; dna-link.ts): what a shared lab
   * report is published as is H(dnapair, the file's SHA-256, the record's proof code, this
   * salt), never the SHA-256. It travels only in the holder's check link, after the #. Sealed
   * with the record, outside its fingerprint; made once and kept.
   */
  readonly dnaPairSalt?: string;
  /**
   * The record's name salt (round 6, CONTRACT.md #33; verify-link.ts nameCodeOf): 32 random
   * bytes, hex. The record publishes the name's salted code (`nameCode`, a clear field made at
   * each save from the name, the proof code and this salt); the holder's check links carry the
   * salt after the # (`ns`), so a check page can tell whether the name in a link is the
   * record's. Sealed with the record, outside its fingerprint; made once and kept.
   */
  readonly nameSalt?: string;
  readonly attestation?: Attestation; // Phase 2.4

  // Set by the registry when a record arrives through a transfer. The recipient holds
  // material descended from the source, not a copy of the source's evidence.
  /** The source record's id. */
  /** Set on a correcting record: the record it supersedes, and how severely. */
  readonly supersedes?: {
    recordId: string;
    reason: string;
    descentSeverity: 'cosmetic' | 'material';
    termsSeverity: 'cosmetic' | 'material';
    effectiveAt: string;
    changedFields: string[];
  };
  /** Set on a superseded record: the correction that replaced it. */
  readonly supersededBy?: string;

  readonly receivedFrom?: string;
  /** The source record's commitment — what an attestation about the source points at. */
  readonly receivedFromCommitment?: string;
  readonly receivedAt?: number;
  readonly transferId?: string;
  readonly quantity?: string;
  readonly licenseIds?: string[]; // Phase 3

  // The receiver's own notes on a received record. None of these is in the record's
  // fingerprint (commitment.ts committedRecordFields), so writing them never changes what
  // the lab signed; they are kept in the receiver's own set, not shown publicly.
  /** The sender's note that came with the delivery (the claim gives it to the receiver only). */
  readonly deliveryNote?: string;
  /**
   * Who sent it, as the sender typed it in their sealed offer (persona review, 17 Oct): the
   * page says "From <name> · their record VEIL-…" instead of two ids. Only from a sealed
   * offer opened with the code's key; kept in the sealed copy only, never a clear field.
   */
  readonly senderName?: string;
  /** The lab's own reference or accession number. Not refId: refId is in the fingerprint. */
  readonly labRef?: string;
  /** The breeder's lock for lab reports, from the delivery code (a public key). */
  readonly resultLock?: string;
  /** The lab turned the sample away: nothing was signed. */
  readonly receiptRejected?: { readonly reason: 'damaged' | 'wrong-sample'; readonly at: number };

  // The holder's own choices, kept sealed with the record (outside the fingerprint).
  /**
   * What the holder chose to publish about this record (disclosure.ts): the only source of
   * what is published (CONTRACT.md #19). The registry's list of grants is a hint that one
   * may need sending again, never a choice.
   */
  readonly grant?: DisclosureKey[];
  /**
   * Keys the registry listed for this record before it was locked, which publish values
   * (round 3, P2). Not taken as the holder's choice: the app asks the holder first
   * (confirmGrant). Only `existence` and `descent-clean`, which publish nothing, are kept
   * without asking.
   */
  readonly grantToConfirm?: DisclosureKey[];
  /**
   * Where `resultLock` came from: the lab code (pasted here), or the sender's sealed offer
   * (round 3, P1). A lock without this was put on the record before either was required, and
   * is used only when it matches the lock this browser kept from the code (lab-results.ts
   * reportLockFor).
   */
  readonly resultLockFrom?: 'code' | 'offer';
  /**
   * The name the holder gave each delivery's recipient, by transfer id (CONTRACT.md #15).
   * The registry gets only a tag for it; the name is shown from here.
   */
  readonly sentTo?: Readonly<Record<string, string>>;
  /**
   * Each delivery's offer key, by transfer id (CONTRACT.md #27): on the sender's source record
   * for every lab code made from it, on a lab's received record for its own delivery. It opens
   * the delivery's sealed offer and sample details, which the registry stores locked. Kept
   * here, sealed with the vault key, so a restore from the backup file brings it back.
   */
  readonly offerKeys?: Readonly<Record<string, string>>;
  /**
   * The record's own secrets (record-keys.ts), sealed with the record (round 4, F5): its lab
   * reports are locked to the record secret, which used to live only in this browser and the
   * backup file, so a plant logged after the last checked backup lost it, and its lab reports,
   * when storage was wiped. Every save adds it to a record this browser holds keys for; a
   * load gives it back to a browser that has none (a restored vault key). Never a clear field,
   * never taken from a row the server holds in plain text, never in an export.
   */
  readonly secrets?: SealedSecrets;
};

/** The receiver's own notes on a received record: outside the fingerprint, so safe to change. */
export type ReceivedNotes = Partial<
  Pick<
    StrainRecord,
    'deliveryNote' | 'labRef' | 'resultLock' | 'resultLockFrom' | 'receiptRejected' | 'offerKeys' | 'senderName'
  >
>;

/**
 * A stored record, checked on the way in.
 *
 * Deliberately loose about which fields must be present and strict about the type
 * of any that are. A guard that demanded every field would silently drop a
 * breeder's older records from their own set, and losing someone's evidence to a
 * schema change is a worse failure than carrying a record with a missing note.
 * The id has to be there, because everything else keys off it.
 */
export const isStrainRecord = (v: unknown): v is StrainRecord => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== 'string') return false;
  const str = (x: unknown) => x === undefined || typeof x === 'string';
  const num = (x: unknown) => x === undefined || typeof x === 'number';
  return (
    str(r.strainName) &&
    str(r.bredBy) &&
    str(r.dateCreated) &&
    str(r.notes) &&
    str(r.recordFingerprint) &&
    str(r.nonce) &&
    str(r.dnaFingerprint) &&
    str(r.dnaFileSha256) &&
    str(r.dnaResultId) &&
    str(r.dnaPairSalt) &&
    str(r.nameSalt) &&
    str(r.profile) &&
    str(r.taxon) &&
    str(r.keyBinding) &&
    num(r.loggedAt) &&
    num(r.dnaPairedAt) &&
    (r.parents === undefined || Array.isArray(r.parents)) &&
    (r.animal === undefined || (typeof r.animal === 'object' && r.animal !== null && !Array.isArray(r.animal))) &&
    (r.strain === undefined || (typeof r.strain === 'object' && r.strain !== null && !Array.isArray(r.strain))) &&
    (r.document === undefined || (typeof r.document === 'object' && r.document !== null && !Array.isArray(r.document)))
  );
};

export type NewRecordInput = {
  /** Made with newRecordId() when the record's key had to exist before sealing. */
  id?: string;
  keyBinding?: string;
  nonce?: string;
  strainName: string;
  bredBy: string;
  dateCreated: string;
  notes: string;
  loggedAt: number;
  recordFingerprint: string;
  parents?: ParentRef[];
  breedingMethod?: string;
  profile?: string;
  taxon?: string;
  photoFingerprints?: string[];
  refId?: string;
  animal?: AnimalDetails;
  strain?: StrainDetails;
  document?: DocumentDetails;
  /** The name's salt (round 6): made when the record is sealed (seal-record.ts). */
  nameSalt?: string;
};

/** Records whose id is referenced as a parent by the given record (its children). */
export const childrenOf = (id: string): StrainRecord[] =>
  records.filter((r) => (r.parents ?? []).some((p) => p.recordId === id));

/** The registry's records collection: the holder's whole set is saved and read under it. */
export const RECORDS_KEY = 'veilcore.records.v1';

let records: StrainRecord[] = [];
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/**
 * What the last load found besides the records it could open (api-store.ts): records
 * sealed with a key this browser doesn't have, and whether the set came back whole.
 */
export type SealedView = {
  readonly locked: readonly LockedRow[];
  readonly notice: LoadNotice;
  /**
   * Why older records aren't locked yet, when it isn't a backup: this browser can't keep a
   * key (a private window, blocked site data), so none was made and nothing was changed.
   */
  readonly vaultProblem?: 'cant-store';
};
let sealedView: SealedView = { locked: [], notice: { truncated: false, unreadable: 0 } };
let vaultProblem: 'cant-store' | undefined;
const refreshSealedView = () => {
  sealedView = {
    locked: lockedRowsOf(RECORDS_KEY),
    notice: loadNoticeOf(RECORDS_KEY),
    ...(vaultProblem ? { vaultProblem } : {}),
  };
  notify();
};
onSealedStateChange(refreshSealedView);

/**
 * Records this browser can't open (CONTRACT.md #11): sealed with a vault key it doesn't
 * have. Shown by their public name, never sent back by a save, never edited or sent; they
 * can be deleted. The backup file holding the key opens them again.
 */
export const lockedRecords = (): readonly LockedRow[] => sealedView.locked;

/**
 * A record's fingerprint check, worked out in this browser when it was loaded or saved:
 * the registry can't read a record, so it no longer checks one. 'mismatch' means the
 * contents don't match the fingerprint; such a record is never saved again or sent.
 */
export const integrityOf = (id: string): StoredIntegrityCheck | undefined => storedIntegrityOf(id);

/** Ids whose plain-text (pre-sealing) row this session already tried to save sealed. */
const converted = new Set<string>();
let syncedOnce = false;
let converting: Promise<void> | null = null;

/**
 * Save again, sealed, the records the registry still holds in plain text (saved before
 * sealing), CONTRACT.md #23. Only under the key the holder's other rows use, and only once
 * that key is in a backup the app has checked: until then the plain-text rows stay as they
 * are (the registry still serves them to their holder, so waiting loses nothing), and a v2
 * backup made before still opens them.
 *
 * With no key here and no sealed row anywhere, one is made now (api-store.ts
 * makeVaultIfSafe), so there is something to back up; the app asks for the backup
 * (vault.ts vaultNeedsBackup), and conversion runs once it is checked. A browser that can't
 * keep a key makes none and converts nothing (sealedView.vaultProblem says why).
 *
 * The registry's grants for these records are its word, not the holder's (round 3, P2): a
 * server could list keys the holder never chose, and from then on the browser would publish
 * values the server never had (a DNA report's hash, the parents of a correction). So only the
 * keys that publish nothing (existence, descent-clean) are taken into the sealed copy; any
 * other key listed waits in `grantToConfirm`, and the app asks the holder (confirmGrant)
 * before it is shared again. After the save the kept grant is sent once (CONTRACT.md #19, L6).
 */
const convertLegacy = (): Promise<void> => {
  converting ??= (async () => {
    const legacy = records.filter((r) => rowStateOf(RECORDS_KEY, r.id) === 'legacy' && !converted.has(r.id));
    if (legacy.length === 0) return;
    if (!vaultKeyIfAny()) {
      if (lockedRecords().some((l) => l.kid)) return; // the key is in a backup; restore it first
      const made = await makeVaultIfSafe();
      vaultProblem = made === 'cant-store' ? 'cant-store' : undefined;
      refreshSealedView();
      return; // nothing is converted until the new key is in a checked backup
    }
    if (vaultNeedsBackup()) return;
    const listed = await listGrants();
    if (listed === null) return; // the registry couldn't list them now: tried again at the next sync
    const ids = new Set(legacy.map((r) => r.id));
    for (const id of ids) converted.add(id);
    const listedKeys = new Map(listed.map((g) => [g.recordId, keysOn(disclosureFrom(g.show))]));
    records = records.map((r) => {
      const keys = listedKeys.get(r.id);
      if (!ids.has(r.id) || r.grant !== undefined || !keys) return r;
      const ask = keys.filter((k) => !VALUELESS_KEYS.includes(k));
      return {
        ...r,
        grant: keys.filter((k) => VALUELESS_KEYS.includes(k)),
        ...(ask.length ? { grantToConfirm: ask } : {}),
      };
    });
    await saveAll();
    for (const id of ids) {
      const r = getRecord(id);
      if (r?.grant && rowStateOf(RECORDS_KEY, id) === 'open' && integrityOf(id) !== 'mismatch') {
        await sendGrant(r, r.grant);
      }
    }
  })().finally(() => {
    converting = null;
  });
  return converting;
};

// A checked backup (or a restored key) is what conversion waits for, and what records kept
// in this browser for the registry wait for (round 3, L1): they are read in again (another
// tab may have kept some) and sent.
let waitingForBackup = !vaultKeyIfAny() || vaultNeedsBackup();
onVaultChange(() => {
  const waiting = !vaultKeyIfAny() || vaultNeedsBackup();
  const justBackedUp = waitingForBackup && !waiting;
  waitingForBackup = waiting;
  if (waiting) return;
  if (records.some((r) => rowStateOf(RECORDS_KEY, r.id) === 'legacy')) void convertLegacy();
  else if (justBackedUp && Object.keys(outboxRecords()).length) void hydrate();
});

/** Re-fetch from the registry. Used on start, after a claim, and by the sync below. */
export const hydrate = async (opts: { resave?: boolean } = {}): Promise<void> => {
  const before = records;
  try {
    records = await store.load(RECORDS_KEY, isStrainRecord);
  } catch {
    // The registry could not answer now: keep what is shown, try again at the next sync. A
    // first load still shows what this browser keeps for the registry (outbox.ts).
    if (before.length === 0) {
      records = Object.values(outboxRecords()).filter(isStrainRecord);
      if (records.length) notify();
    }
    return;
  }
  // A record's secrets sealed with it (round 4, F5): kept here when this browser has none for
  // it, as after restoring the vault key on a new device or a wiped browser.
  for (const r of records) if (r.secrets && rowStateOf(RECORDS_KEY, r.id) === 'open') adoptSealedSecrets(r, r.secrets);
  // The registry sent an older copy of a record than this browser has seen (CONTRACT.md
  // #20): the newer copy this page holds stays, and is sent again.
  let kept = 0;
  for (const id of olderRowsOf(RECORDS_KEY)) {
    const mine = before.find((r) => r.id === id) ?? (outboxRecords()[id] as StrainRecord | undefined);
    if (!mine || !isStrainRecord(mine)) continue;
    records = [...records, mine];
    keepNewerCopy(RECORDS_KEY, id);
    kept++;
  }
  // What this browser keeps for the registry: shown, and sent with the next save (L1, L12).
  const merged = await mergeOutbox();
  // A record whose public rev isn't the one sealed inside it (round 3, L2): sent again, so
  // the registry checks saves against the right number.
  const revFix = (loadNoticeOf(RECORDS_KEY).revMismatch ?? 0) > 0;
  // A saved DNA report with no pairing salt yet (round 5): one is made and saved, so the
  // report is published only bound with it.
  const saltFix = withPairSalts();
  // A record without a name salt yet (round 6): one is made, and its name code saved with it.
  const nameSaltFix = withNameSalts();
  // A record sealed before round 5 whose name is still in the clear on the registry
  // (CONTRACT.md #28): saved again, with the name inside the box only.
  const nameFix = (loadNoticeOf(RECORDS_KEY).nameInClear ?? 0) > 0;
  notify();
  // Sent again with the next save; not straight after a refusal (saveAll reads the set back
  // with resave off), so a registry that keeps refusing is asked once per sync, not in a loop.
  if ((kept || merged || revFix || nameFix || saltFix || nameSaltFix) && opts.resave !== false) void saveAll();
  // Kept here and not on VeilCore yet: its proof code is dated now (CONTRACT.md #38).
  else void dateFirst();
  await convertLegacy();
  if (!syncedOnce) {
    syncedOnce = true;
    void resendGrants();
  }
};

/** disclosure.ts syncGrants over this set: never from a record that doesn't match its fingerprint. */
const resendGrants = (force: readonly string[] = []): Promise<number> =>
  syncGrants(getRecord, force, (id) => integrityOf(id) !== 'mismatch');

/**
 * Keep the holder's grant choice in the record's sealed copy before anything is published
 * (disclosure.ts saveGrant, CONTRACT.md #19). Awaited: a choice the registry didn't store
 * with the record is not published. A record saved before locking can't be changed until
 * the backup is checked; the registry holds it in plain text, so its grant is taken into the
 * sealed copy when it is converted (convertLegacy).
 */
const keepGrant = async (id: string, show: DisclosureKey[]): Promise<StrainRecord | { error: string }> => {
  const r = getRecord(id);
  if (!r) return { error: 'that record isn’t in this browser' };
  if (integrityOf(id) === 'mismatch') return { error: enT.t('app.sealed.mismatch') };
  // A choice made on the share screen answers the question about the grant listed before
  // locking too (P2).
  const { grantToConfirm: _ask, ...rest } = r;
  void _ask;
  // A saved DNA report is published only bound with the record's own pairing salt (round 5):
  // made now if it has none, and kept with the choice, before anything is published.
  const next: StrainRecord = withPairSalt({ ...rest, grant: [...show] });
  if (rowStateOf(RECORDS_KEY, id) === 'legacy') return next;
  records = records.map((x) => (x.id === id ? next : x));
  notify();
  const result = await store.save(RECORDS_KEY, records);
  reportSave('records', result);
  const refusedHere = result.refused.filter((x) => x.id === '*' || x.id === id);
  if (result.offline || refusedHere.length) {
    await hydrate();
    return { error: result.offline ? 'could not reach the registry' : describeRefusals(refusedHere) };
  }
  return getRecord(id) ?? next;
};
registerGrantKeeper(keepGrant);
registerRecordLookup((id) => getRecord(id));

/**
 * Keep the name the holder gave a delivery's recipient, sealed with the source record
 * (CONTRACT.md #15): the registry has only a tag for it.
 */
export const noteSentTo = (recordId: string, transferId: string, name: string, offerKey?: string): void => {
  const label = name.normalize('NFC').trim();
  if ((!label && !offerKey) || !getRecord(recordId)) return;
  records = records.map((r) =>
    r.id === recordId
      ? {
          ...r,
          ...(label ? { sentTo: { ...(r.sentTo ?? {}), [transferId]: label } } : {}),
          // The delivery's offer key, sealed with the record (CONTRACT.md #27).
          ...(offerKey ? { offerKeys: { ...(r.offerKeys ?? {}), [transferId]: offerKey } } : {}),
        }
      : r,
  );
  // A record saved before locking can't be changed until the backup is checked; the name
  // isn't a change to it, so it waits in this browser and goes with the record when it is
  // locked (L11). It used to be refused as a change, and lost.
  if (rowStateOf(RECORDS_KEY, recordId) === 'legacy') {
    if (label) keepName(recordId, transferId, label);
    if (offerKey) keepOfferKey(recordId, transferId, offerKey);
    notify();
    return;
  }
  persist();
};

/**
 * A delivery's offer key from this browser's records (the sender's source record or a lab's
 * received record keep it sealed, CONTRACT.md #27), if any has it.
 */
export const offerKeyInRecords = (transferId: string): string | undefined => {
  const id = transferId.toUpperCase();
  for (const r of records) {
    const k = r.offerKeys?.[id] ?? r.offerKeys?.[transferId];
    if (typeof k === 'string') return k;
  }
  return undefined;
};

/** The name the holder gave a delivery's recipient, if this browser's records have it. */
export const sentToName = (sourceRecordId: string | undefined, transferId: string): string | undefined =>
  sourceRecordId
    ? getRecord(sourceRecordId)?.sentTo?.[transferId]
    : records.find((r) => r.sentTo?.[transferId])?.sentTo?.[transferId];

// Records change on the server without this browser doing anything — an attestation
// lands when a recipient confirms receipt, which happens on someone else's machine.
// Polling is the honest simple answer; a socket would be better and is not worth the
// complexity until someone is actually waiting on it.
//
// Started by the app pages, not on import (attack round D): importing this module used
// to load and poll from every page, the landing page and a QR-scanned verify page
// included. It asks only when the tab is visible, and the store asks the registry only
// when this browser holds a key.
//
// Never on a prove page or the public check page (round 6, CONTRACT.md #36): the sync sends
// the holder key, and there it would tie the holder to the on-chain key the page names. The
// first sync waits for the next app page (App.tsx calls this on every app page).
let syncTimer: ReturnType<typeof setInterval> | undefined;
let firstSync = false;
export const SYNC_INTERVAL_MS = 30_000;
export const startRecordSync = (): void => {
  if (typeof window === 'undefined') return;
  if (syncTimer === undefined) {
    syncTimer = setInterval(() => {
      if (holderRequestsPaused()) return;
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void hydrate();
    }, SYNC_INTERVAL_MS);
    // Also on tab focus — the common case is a breeder switching back to check.
    window.addEventListener('focus', () => {
      if (!holderRequestsPaused()) void hydrate();
    });
  }
  if (!firstSync && !holderRequestsPaused()) {
    firstSync = true;
    void hydrate();
  }
};

/**
 * Save the whole set and act on what the registry says. A refusal used to be ignored,
 * so a record the registry never stored stayed on screen as though it had been. On a
 * refusal the set is reloaded from the registry — the rollback — and the holder is told.
 */
const saveAll = async (grantsToResend: readonly string[] = []): Promise<SaveResult> => {
  withSealedSecrets();
  const result = await store.save(RECORDS_KEY, records);
  settleOutbox(result);
  reportSave('records', result);
  // Whatever waits in this browser for its locked copy is dated now (CONTRACT.md #38).
  void dateFirst(result.accepted ?? []);
  // Rows held for the backup aren't refused: nothing to read back for them.
  if (!result.ok && !result.offline && (result.refused.length > 0 || !result.held?.length)) {
    await hydrate({ resave: false });
  }
  // A grant's published values were read from the record as it was: send them again for
  // the records whose fingerprint has changed since (disclosure.ts syncGrants).
  if (!result.offline) void resendGrants(grantsToResend);
  return result;
};

const persist = () => {
  void saveAll();
  notify();
};

/**
 * Give each opened record with a saved DNA report its own pairing salt, if it has none yet
 * (round 5, CONTRACT.md #29; dna-link.ts withPairSalt): a report shared on a check link is
 * published only bound with it. Only records this browser opened (never one held in plain
 * text, a stub or a locked row); they go with the next save. True when any was added.
 */
/**
 * A name salt for each record that has a name and none yet (round 6, CONTRACT.md #33): a
 * record made before round 6 gets one, and its name code goes with its next save. Only rows
 * this browser has opened (or made): never a row saved before locking, a claim's stub or a
 * locked row.
 */
const withNameSalts = (): boolean => {
  let added = false;
  const next = records.map((r) => {
    const state = rowStateOf(RECORDS_KEY, r.id);
    if (state !== undefined && state !== 'open') return r;
    const salted = withNameSalt(r);
    if (salted !== r) added = true;
    return salted;
  });
  if (added) records = next;
  return added;
};

const withPairSalts = (): boolean => {
  let added = false;
  const next = records.map((r) => {
    if (!r.dnaFingerprint || rowStateOf(RECORDS_KEY, r.id) !== 'open') return r;
    const salted = withPairSalt(r);
    if (salted !== r) added = true;
    return salted;
  });
  if (added) records = next;
  return added;
};

/**
 * Put each record's secrets into its sealed part (round 4, F5) where this browser holds keys
 * that fit the record and the record doesn't carry them yet: a record made before this goes
 * with them on its next save. Changes `records` only where something was added.
 */
const withSealedSecrets = (): void => {
  withPairSalts();
  withNameSalts();
  let added = false;
  const next = records.map((r) => {
    const k = keysFor(r.id);
    if (!k || !keysFitRecord(k, r) || r.secrets?.recordSecret === k.recordSecret) return r;
    // Secrets the record already carries that fit it are its own: never replaced from here.
    if (r.secrets && keysFitRecord(r.secrets, r)) return r;
    added = true;
    return { ...r, secrets: sealedSecretsOf(k) };
  });
  if (added) records = next;
};

/**
 * Before a lab code is made (round 4, F5): the record's secret, which its lab reports are
 * locked to, must be in the record's sealed copy on VeilCore, so a restore of the vault key
 * brings it back. Makes the keys if the record has none (as before), saves the record with
 * them, and answers ok only once the registry holds that sealed copy. Otherwise no lab code
 * is made, and the reason is given.
 */
export const recordSecretSaved = async (
  id: string,
): Promise<{ ok: true; recordSecret: string } | { error: string }> => {
  const r = getRecord(id);
  if (!r) return { error: 'that record isn’t in this browser' };
  let k;
  try {
    k = ensureKeysFor(r);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  const held = (): boolean => getRecord(id)?.secrets?.recordSecret === k.recordSecret;
  const stored = async (): Promise<boolean> => {
    const now = getRecord(id);
    return !!now && held() && rowStateOf(RECORDS_KEY, id) === 'open' && (await isStoredAsIs(RECORDS_KEY, now));
  };
  if (vaultNeedsBackup() || !vaultKeyIfAny()) return { error: enT.t('app.sealed.backupFirstAction') };
  // What the registry holds is known only after a load: read it first on a page that hasn't.
  if (rowStateOf(RECORDS_KEY, id) === undefined) await hydrate();
  if (await stored()) return { ok: true, recordSecret: k.recordSecret };
  const result = await saveAll();
  if ((held() && result.accepted?.includes(id)) || (await stored())) return { ok: true, recordSecret: k.recordSecret };
  const refusedHere = result.refused.filter((x) => x.id === '*' || x.id === id);
  return {
    error: result.offline
      ? 'could not reach the registry'
      : refusedHere.length
        ? describeRefusals(refusedHere)
        : 'VeilCore hasn’t saved it yet',
  };
};

// ---- what this browser keeps for the registry (outbox.ts; round 3, L1, L11, L12) -------------

/**
 * After a save: what the registry took is no longer kept here; what was held for the backup,
 * or couldn't be sent (offline, a refusal of the whole save that isn't about the rows: no key
 * here, the registry couldn't be asked), is. A new record stays kept whatever happened to it,
 * until the registry has it or the holder lets it go (discardUnsaved).
 */
const settleOutbox = (result: SaveResult): void => {
  if (result.accepted?.length) takeFromOutbox(result.accepted);
  // A change the registry refused by id, to a record it has, is its answer: not kept to send
  // again (the registry's copy is read back). A new record stays kept whatever the answer.
  const refusedIds = result.refused.filter((r) => r.id !== '*').map((r) => r.id);
  takeFromOutbox(refusedIds.filter((id) => rowStateOf(RECORDS_KEY, id) !== undefined));
  const transient = result.offline || result.refused.some((r) => r.id === '*');
  const keep = new Set([...(result.held ?? []), ...(transient ? (result.pending ?? []) : [])]);
  putInOutbox(records.filter((r) => keep.has(r.id)));
};

/**
 * Put back what this browser keeps for the registry into the set just loaded. A kept copy
 * the registry now holds as is goes; a kept copy of a row the registry sent an older copy of
 * stays, as the newer one; a kept copy of an emptied or locked row stays only when its
 * fingerprint is the row's public one (it is the holder's own, L4). Names kept for
 * recipients (L11) go back on their records. True when anything kept needs sending.
 */
const mergeOutbox = async (): Promise<boolean> => {
  let needsSave = false;
  const gone: string[] = [];
  for (const [id, kept] of Object.entries(outboxRecords())) {
    if (!isStrainRecord(kept)) {
      gone.push(id);
      continue;
    }
    const state = rowStateOf(RECORDS_KEY, id);
    if (state === 'open' && (await isStoredAsIs(RECORDS_KEY, kept))) {
      gone.push(id);
      continue;
    }
    if (state === 'legacy' || state === 'stub') continue; // never kept for these; the registry's row stands
    if (state === 'locked' && !allowReplace(RECORDS_KEY, id, kept.recordFingerprint)) continue;
    if (state === 'older') keepNewerCopy(RECORDS_KEY, id);
    const at = records.findIndex((r) => r.id === id);
    records = at >= 0 ? records.map((r, i) => (i === at ? kept : r)) : [kept, ...records];
    needsSave = true;
  }
  takeFromOutbox(gone);
  for (const [id, names] of Object.entries(outboxNames())) {
    const r = getRecord(id);
    if (!r) continue;
    const has = r.sentTo ?? {};
    if (Object.entries(names).every(([t, n]) => has[t] === n)) {
      if (rowStateOf(RECORDS_KEY, id) === 'open') dropNames(id);
      continue;
    }
    records = records.map((x) => (x.id === id ? { ...x, sentTo: { ...names, ...has } } : x));
    if (rowStateOf(RECORDS_KEY, id) === 'open') needsSave = true;
  }
  // The same for offer keys kept beside a record saved before sealing (CONTRACT.md #27).
  for (const [id, keys] of Object.entries(outboxOfferKeys())) {
    const r = getRecord(id);
    if (!r) continue;
    const has = r.offerKeys ?? {};
    if (Object.entries(keys).every(([t, k]) => has[t] === k)) {
      if (rowStateOf(RECORDS_KEY, id) === 'open') dropOfferKeys(id);
      continue;
    }
    records = records.map((x) => (x.id === id ? { ...x, offerKeys: { ...keys, ...has } } : x));
    if (rowStateOf(RECORDS_KEY, id) === 'open') needsSave = true;
  }
  return needsSave;
};

// ---- dating first (CONTRACT.md #38) ---------------------------------------------------------

/**
 * Send the proof codes of records VeilCore doesn't hold yet (kept in this browser: a new
 * record whose locked copy waits for a checked backup, or one a save couldn't send), so each
 * goes into the next batch now. Only `{ id, recordFingerprint, keyBinding? }` is sent: nothing
 * typed, and no vault key id, so it ties no key to the holder (round 3, L1 stays as it was).
 * The locked copy follows, unchanged, once it can be saved; the registry takes it only with
 * the same proof code. Tried again on every save and sync until the registry has it.
 */
let dating: Promise<void> | null = null;
const dateFirst = (skip: readonly string[] = []): Promise<void> => {
  dating ??= (async () => {
    const rows = Object.values(outboxRecords())
      .filter((r) => isString(r.id) && !skip.includes(r.id) && !registryHasProofCode(r.id))
      .map(datingRowOf)
      .filter((r): r is NonNullable<typeof r> => r !== undefined);
    if (rows.length === 0) return;
    const out = await sendDatingRows(rows);
    if ('error' in out) return; // offline or refused now: tried again with the next save or sync
    if (out.dated.length) notify();
  })().finally(() => {
    dating = null;
  });
  return dating;
};

/** Whether VeilCore has this record's proof code, so it is in the next batch (CONTRACT.md #38). */
export const proofCodeSent = (id: string): boolean => registryHasProofCode(id);

/** Why a record is shown but not on the registry yet, or undefined when it is. */
export type UnsavedReason = 'backup' | 'key' | 'retry';
export const unsavedReason = (id: string): UnsavedReason | undefined => {
  if (!inOutbox(id)) return undefined;
  if (vaultKeyIfAny() && vaultNeedsBackup()) return 'backup';
  if (!vaultKeyIfAny() && lockedRecords().some((l) => l.kid)) return 'key';
  return 'retry';
};

/**
 * Let go of a record kept in this browser that the registry never took (a new one), or of a
 * change to one it has (the registry's copy is shown again).
 */
export const discardUnsaved = async (id: string): Promise<void> => {
  if (!inOutbox(id)) return;
  takeFromOutbox([id]);
  // Its proof code alone was dated (CONTRACT.md #38): taken off VeilCore too, since the record
  // it dates is gone.
  if (rowStateOf(RECORDS_KEY, id) === 'dating') await deleteRecords([id]);
  if (rowStateOf(RECORDS_KEY, id) === undefined) {
    records = records.filter((r) => r.id !== id);
    forgetKeys(id);
    notify();
  }
  await hydrate();
};

/**
 * The holder answers the question about keys listed before the record was locked (P2):
 * share them again (they go through saveGrant, read from the record here), or not.
 */
export const confirmGrant = async (id: string, share: boolean): Promise<{ ok: true } | { error: string }> => {
  const r = getRecord(id);
  if (!r?.grantToConfirm?.length) return { ok: true };
  if (share) {
    const { saveGrant } = await import('./disclosure');
    const out = await saveGrant(r, disclosureFrom([...(r.grant ?? []), ...r.grantToConfirm]));
    return 'error' in out ? out : { ok: true };
  }
  const { grantToConfirm: _ask, ...rest } = r;
  void _ask;
  records = records.map((x) => (x.id === id ? (rest as StrainRecord) : x));
  notify();
  const result = await saveAll();
  return result.ok || result.held?.length ? { ok: true } : { error: describeRefusals(result.refused) };
};

/**
 * "Use this copy" (L2): the registry sent an older copy of a record than this browser had
 * seen, and this browser has no newer one. The holder takes the registry's copy as the
 * record; from then on it is shown, and changes to it are saved.
 */
export const adoptOlderCopy = (id: string): boolean => {
  const v = takeOlderCopy(RECORDS_KEY, id);
  if (!v || !isStrainRecord(v)) return false;
  records = [v, ...records.filter((r) => r.id !== id)];
  void checkRecordIntegrity(v);
  notify();
  return true;
};

/** The registry's older copy of a record, for the page that offers to use it. */
export const olderCopyOfRecord = (id: string): StrainRecord | undefined => {
  const v = olderCopyOf(RECORDS_KEY, id);
  return v && isStrainRecord(v) ? v : undefined;
};

/**
 * "I don't have that backup" (L1). The holder's rows sealed with a key nobody here has can
 * never be opened again, and while they are on the registry no other key is accepted for
 * this holder. With the holder's word, they are deleted (records and agreements), and a new
 * key is made for what comes next (it waits for a checked backup like any new key). Rows the
 * purge emptied and older copies are not this key's, and stay.
 */
export const abandonLostKey = async (): Promise<{ removed: number } | { error: string }> => {
  const kid = await vaultKid();
  const dead = (rows: readonly LockedRow[]) => rows.filter((l) => l.kid && l.kid !== kid && !l.older).map((l) => l.id);
  const recordIds = dead(lockedRecords());
  const licenseIds = dead(lockedRowsOf('veilcore.licenses.v1'));
  if (recordIds.length + licenseIds.length === 0) return { error: enT.t('app.sealed.lost.nothing') };
  let removed = 0;
  if (recordIds.length) {
    const out = await deleteRecords(recordIds);
    if ('error' in out) return out;
    removed += out.removed.length;
  }
  if (licenseIds.length) {
    const out = await deleteLicenses(licenseIds);
    if ('error' in out) return out;
    removed += out.removed.length;
  }
  await hydrate();
  if (!vaultKeyIfAny()) await makeVaultIfSafe();
  if (Object.keys(outboxRecords()).length) void saveAll();
  return { removed };
};

/**
 * 128 random bits. Ids were 24 bits (and corrections were the original id plus four
 * clock characters), so an attacker could store the next id first: the victim's save
 * was refused for that id and, for a correction, the original ended up pointing at the
 * attacker's record (attack round 11). Older short ids stay valid; only new ones change.
 */
export const newRecordId = (): string =>
  'VEIL-' +
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

/** Whether a record is over the size a sealed record may be (CONTRACT.md #21). */
export const tooLargeToSave = (r: Record<string, unknown>): boolean => recordSealedBytes(r) > SEALED_MAX_BYTES;
/** How full a record is, of the most a sealed record may be: 0 to 1 and over. */
export const sizeShare = (r: Record<string, unknown>): number => recordSealedBytes(r) / SEALED_MAX_BYTES;

/** What a record being typed would add beside its fields, so an estimate is never low. */
const SEALING_PLACEHOLDER = {
  id: `VEIL-${'0'.repeat(32)}`,
  nonce: '0'.repeat(64),
  keyBinding: '0'.repeat(64),
  recordFingerprint: '0'.repeat(64),
  loggedAt: 1_000_000_000_000,
  licenseIds: [],
};
/** sizeShare of fields still being typed (a form's draft), with what sealing adds. */
export const draftSizeShare = (fields: Record<string, unknown>): number =>
  sizeShare({ ...SEALING_PLACEHOLDER, ...fields });

/**
 * The live counter for a form (CONTRACT.md #21): nothing until a record is near the limit,
 * then how much is used, then that it is too large. Said while typing, so nothing typed is
 * lost to a refusal after.
 */
export const sizeWords = (share: number, tr: Translator = enT): string | undefined => {
  if (share < 0.9) return undefined;
  if (share > 1) return tr.t('app.sealed.size.over');
  return tr.t('app.sealed.size.near', {
    used: String(Math.ceil(share * (SEALED_MAX_BYTES / 1024))),
    max: String(SEALED_MAX_BYTES / 1024),
  });
};

/** A record's name salt (round 6): made with the record, so its first check link carries it. */
const withNameSalt = <T extends StrainRecord>(r: T): T =>
  r.nameSalt || !r.strainName?.trim() ? r : { ...r, nameSalt: newNameSalt() };

export const createRecord = (input: NewRecordInput): StrainRecord => {
  const record: StrainRecord = withNameSalt({ licenseIds: [], ...input, id: input.id ?? newRecordId() });
  // Refused before it is shown or sent: the caller still has what was typed.
  if (tooLargeToSave(record)) throw new Error(enT.t('app.sealed.tooLarge'));
  records = [record, ...records];
  // Kept in this browser until the registry has it (L12): a refused or held save never
  // takes away what was typed.
  holderKey();
  putInOutbox([record]);
  persist();
  return record;
};

/**
 * createRecord, with the save awaited: for a caller that must know the registry has the
 * record before it lets another tab go on (lab-report-date.ts). Shown at once, as
 * createRecord does; on a refusal the set is read back from the registry, so it goes.
 */
export const createRecordSaved = async (
  input: NewRecordInput,
): Promise<{ readonly record: StrainRecord; readonly result: SaveResult }> => {
  const record: StrainRecord = withNameSalt({ licenseIds: [], ...input, id: input.id ?? newRecordId() });
  records = [record, ...records];
  holderKey();
  putInOutbox([record]);
  notify();
  const result = await saveAll();
  return { record, result };
};

/**
 * Save many new records in one save, awaited: a whole collection is sent in batches
 * (bulk-import.ts), and one save per record would pass the registry's write limits. The
 * batch goes first in the set, then every record already here that is not in it, as every
 * save in the app sends the whole set. A record already sent (same id) is sent again as
 * the same record: the registry stores by id. Unlike createRecord, nothing is shown
 * before the registry has it: the set is read back after the save, unless the registry
 * could not be reached or refused the whole save, and the caller words what happened.
 */
export const createRecords = async (inputs: readonly NewRecordInput[]): Promise<SaveResult> => {
  const batch: StrainRecord[] = inputs.map((input) =>
    withNameSalt({ licenseIds: [], ...input, id: input.id ?? newRecordId() }),
  );
  const ids = new Set(batch.map((r) => r.id));
  const result = await store.save(RECORDS_KEY, [...batch, ...records.filter((r) => !ids.has(r.id))]);
  // Held for the backup (L1): nothing was sent, and the importer stops and says why.
  if (result.held?.length) {
    return {
      ok: false,
      refused: [
        { id: '*', reason: enT.t('app.sealed.refuse.backupFirstNew'), words: 'app.sealed.refuse.backupFirstNew' },
      ],
    };
  }
  if (!result.offline && !result.refused.some((r) => r.id === '*')) await hydrate();
  return result;
};

/**
 * Pair a DNA report's fingerprint with a record.
 *
 * The pairing is a note beside the sealed record, not part of it: the record fingerprint
 * (what the registry stores and anchors) does not cover it, and re-sealing would not
 * change that, because the registry's commitment has no field for it. So it is dated
 * with when it happened, and an export puts it under that date and says the registered
 * fingerprint does not cover it (envelope.ts exportEnvelopeFor), rather than under the
 * original sealing date.
 */
export const pairDna = (
  id: string,
  dnaFingerprint: string,
  dnaFileName: string,
  /** The file's plain SHA-256, and the lab report it came from (round 5): what a lab's signature is matched on. */
  extra: { fileSha256?: string; resultId?: string } = {},
): StrainRecord | undefined => {
  let updated: StrainRecord | undefined;
  records = records.map((r) => {
    if (r.id !== id) return r;
    // A new pairing replaces the old one whole: never the new file with the old lab report's id.
    const { dnaFileSha256: _s, dnaResultId: _r, ...rest } = r;
    void _s;
    void _r;
    // The record's own pairing salt (round 5): kept if it has one, made now if not.
    updated = withPairSalt({
      ...rest,
      dnaFingerprint,
      dnaFileName,
      dnaPairedAt: Date.now(),
      ...(extra.fileSha256 ? { dnaFileSha256: extra.fileSha256.toLowerCase() } : {}),
      ...(extra.resultId ? { dnaResultId: extra.resultId } : {}),
    });
    return updated;
  });
  if (updated) {
    // The pairing is outside the fingerprint, so a grant naming the report has to be sent
    // again even though the fingerprint is unchanged.
    void saveAll([id]);
    notify();
  }
  return updated;
};

/** Phase 2.4 — record a second-party (lab) attestation. */
// attestRecord removed deliberately.
//
// An attestation is a second party confirming they received material. It is created
// when a lab claims a transfer, recorded against their key. A client-side function that
// sets one is a way to manufacture the exact evidence this system exists to produce —
// a back door whether or not anything calls it.

/**
 * Recompute a record's fingerprint from its stored fields and compare it with the one it
 * was sealed with. This is the integrity check a certificate shows: it is computed, not
 * asserted. A record with no stored nonce (very early records) cannot be recomputed.
 */
export type IntegrityCheck = StoredIntegrityCheck;
export const checkIntegrity = (r: StrainRecord): Promise<IntegrityCheck> => checkRecordIntegrity(r);

export const getRecord = (id: string): StrainRecord | undefined => records.find((r) => r.id === id);

export const allRecords = (): StrainRecord[] => records;

/** Backs prove-ownership: does any record's paired DNA fingerprint match this one? */
export const findByDnaFingerprint = (dnaFingerprint: string): StrainRecord | undefined =>
  records.find((r) => r.dnaFingerprint === dnaFingerprint);

/** Conflict detection (Phase 2.3): other records already paired to this same fingerprint. */
export const conflictsFor = (dnaFingerprint: string, exceptId: string): StrainRecord[] =>
  records.filter((r) => r.id !== exceptId && r.dnaFingerprint === dnaFingerprint);

/**
 * Export a record in envelope form — the wire format other implementations read.
 *
 * The internal shape is convenient for this app; the envelope is what leaves it. Kept
 * separate on purpose: the internal model can change freely, the wire format changes
 * only by version.
 */
export const exportEnvelope = async (id: string): Promise<void> => {
  const r = getRecord(id);
  if (!r) return;
  const env = await exportEnvelopeFor(
    r,
    await holderPartyId(),
    await checkIntegrity(r),
    await proofFor(r.recordFingerprint),
  );
  const blob = new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.id}.veilcore.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---- demo data portability ----

/**
 * A record's fields that are the holder's alone, never in a file the holder may hand on:
 * its secrets (round 4, F5: they are in the backup file, which says it is secret), the keys
 * that open its deliveries' sealed offers, the names given to recipients, the holder's
 * sharing choices, a delivery's private notes, and its agreements (sealed terms; a count at
 * most, said by whoever builds the file).
 */
export const HOLDER_ONLY_FIELDS = [
  'secrets',
  'offerKeys',
  'sentTo',
  'senderName',
  'deliveryNote',
  'labRef',
  'resultLock',
  'resultLockFrom',
  'grant',
  'grantToConfirm',
  'licenseIds',
] as const;

/** The record as a file someone else may read: everything but HOLDER_ONLY_FIELDS. */
export const shareableRecord = (r: StrainRecord): Omit<StrainRecord, (typeof HOLDER_ONLY_FIELDS)[number]> => {
  const out: Record<string, unknown> = { ...r };
  for (const k of HOLDER_ONLY_FIELDS) delete out[k];
  return out as Omit<StrainRecord, (typeof HOLDER_ONLY_FIELDS)[number]>;
};

export const exportRecords = (): void => {
  // An export file is the kind people share: nothing only the holder should have.
  const out = records.map(shareableRecord);
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veilcore-records-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** The largest records file read for import. An export of the per-holder maximum is far smaller. */
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

/**
 * The fields a holder writes. Everything else on a stored record is written by the
 * registry (the delivery confirmation, where a received record came from) or lives in
 * another store (licence ids), and an import file is not a source for any of it: a
 * "restore" carrying a typed-in lab confirmation used to be imported and uploaded as is
 * (attack round D).
 */
const IMPORTABLE = [
  'id',
  'nonce',
  'strainName',
  'bredBy',
  'dateCreated',
  'notes',
  'loggedAt',
  'recordFingerprint',
  'keyBinding',
  'parents',
  'breedingMethod',
  'profile',
  'taxon',
  'animal',
  'strain',
  'photoFingerprints',
  'refId',
  'dnaFingerprint',
  'dnaFileName',
  'dnaPairedAt',
  'dnaFileSha256',
  'dnaResultId',
  'dnaPairSalt',
  'nameSalt',
  'supersedes',
  'supersededBy',
] as const;

const importable = (r: StrainRecord): StrainRecord => {
  const src = r as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of IMPORTABLE) if (src[k] !== undefined) out[k] = src[k];
  return out as unknown as StrainRecord;
};

export type ImportResult = {
  added: number;
  alreadyHere: number;
  /** Rows the file has sealed with a key this browser lacks, or emptied: skipped, not imported (L8). */
  locked?: number;
  /**
   * Records locked or emptied on the registry that the file couldn't put back: the file's
   * fingerprint isn't the row's public one, or the registry wouldn't take it (round 3, L4).
   */
  notImported?: number;
};

/** A row of an opened registry export this browser couldn't open: still sealed, or emptied by the purge. */
const isLockedRow = (v: unknown): boolean =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  ((typeof (v as { sealed?: unknown }).sealed === 'object' && (v as { sealed?: unknown }).sealed !== null) ||
    (v as { contentsRemoved?: unknown }).contentsRemoved === true);

/**
 * Restore records from an export.
 *
 * All or nothing, and additive: a file with any entry this version cannot read, or any
 * sealed entry whose fingerprint does not recompute from its fields, imports nothing.
 * Records already in this set are kept as they are, never overwritten by the file, so
 * an import cannot replace a holder's set with someone else's.
 */
export const importRecords = async (file: File): Promise<ImportResult> => {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('That file is larger than 20 MB. Nothing was imported.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not a VeilCore records export. Nothing was imported.');
  }
  if (!Array.isArray(parsed)) throw new Error('That file is not a VeilCore records export.');
  return importRecordRows(parsed);
};

/**
 * The records this browser holds open, as the backup file carries them (backup.ts): every
 * field the holder wrote, the holder-only salts included (the backup is the holder's own
 * secret file). With them, a backup is enough to show a record and recompute its proof code
 * even if VeilCore's registry is gone; keys alone would prove a key and nothing it stands for.
 */
export const recordsForBackup = async (): Promise<StrainRecord[]> => {
  // What this page shows is what is backed up; a page opened straight on /backup loads first.
  if (records.length === 0) await hydrate();
  return records.map(importable);
};

/** importRecords, from rows already read (an export file, or a backup's `recordData`). Same rules. */
export const importRecordRows = async (parsed: readonly unknown[]): Promise<ImportResult> => {
  // Rows still sealed with a key this browser doesn't have (an opened export keeps them as
  // the registry holds them) are skipped and counted, not a reason to import nothing.
  const lockedRows = parsed.filter(isLockedRow).length;
  const rows = parsed.filter((v) => !isLockedRow(v));
  const valid = rows.filter(isStrainRecord);
  // Refuse a file with unreadable entries rather than importing the rest. A partial
  // import looks like a success and leaves the holder believing they restored
  // records that are not there.
  if (valid.length !== rows.length) {
    throw new Error(
      `That file has ${String(rows.length - valid.length)} entries this version cannot read. Nothing was imported.`,
    );
  }
  const cleaned = valid.map(importable);
  for (const r of cleaned) {
    const check = await checkIntegrity(r);
    if (check === 'mismatch') {
      throw new Error(`${r.id}: its proof code does not match its fields. Nothing was imported.`);
    }
    if (check === 'no-nonce') {
      throw new Error(`${r.id}: it has a proof code but no nonce, so it cannot be checked. Nothing was imported.`);
    }
  }
  // Compared against what the registry holds now, not whatever this page last loaded:
  // a save is an upsert per id, so an id missed here would be overwritten there.
  await hydrate();
  const have = new Set(records.map((r) => r.id));
  // A record the registry holds locked or emptied (the purge, a lost key) is put back only
  // from the holder's own copy: its fingerprint must be the row's public one (L4). Anything
  // else for those ids is not imported, and counted, rather than said to be added and then
  // gone on the next load.
  const lockedHere = new Map(lockedRecords().map((l) => [l.id, l]));
  const fresh = cleaned.filter((r) => !have.has(r.id) && !lockedHere.has(r.id));
  const replacing = cleaned.filter((r) => lockedHere.has(r.id) && allowReplace(RECORDS_KEY, r.id, r.recordFingerprint));
  const mismatched = cleaned.filter((r) => lockedHere.has(r.id)).length - replacing.length;
  let refusedBack: string[] = [];
  const adding = [...fresh, ...replacing];
  if (adding.length > 0) {
    records = [...adding, ...records.filter((r) => !replacing.some((x) => x.id === r.id))];
    holderKey();
    putInOutbox(adding);
    notify();
    const result = await saveAll();
    // A replacement the registry refused is not imported (kept rows wait for the backup).
    const taken = new Set([...(result.accepted ?? []), ...(result.held ?? [])]);
    refusedBack = result.offline ? [] : replacing.filter((r) => !taken.has(r.id)).map((r) => r.id);
    if (refusedBack.length) {
      takeFromOutbox(refusedBack);
      await hydrate();
    }
  }
  return {
    added: adding.length - refusedBack.length,
    alreadyHere: cleaned.filter((r) => have.has(r.id)).length,
    ...(lockedRows ? { locked: lockedRows } : {}),
    ...(mismatched + refusedBack.length ? { notImported: mismatched + refusedBack.length } : {}),
  };
};

/**
 * Start over in this browser: stop using the current holder key and clear what is shown.
 *
 * Nothing is sent to the registry. "Clear all records on this device" used to save an
 * empty set to the registry under the holder's key, which a registry that treats a save
 * as the whole set would read as delete-all (attack round D). The records stay on the
 * registry under the old key; the caller makes sure the holder has that key first.
 */
export const startOver = (): void => {
  forgetHolderKey();
  // A vault key no accepted save used goes too (CONTRACT.md #23): kept, it would stop the
  // right backup from being restored here.
  clearUnusedVault();
  records = [];
  clearSealedState();
  converted.clear();
  syncedOnce = false;
  vaultProblem = undefined;
  refreshSealedView();
};

/**
 * Delete a locked record from VeilCore's registry (CONTRACT.md #11). The only thing a
 * locked record allows: this browser can't open, edit or send it.
 */
export const deleteLockedRecord = async (id: string): Promise<{ ok: true } | { error: string }> => {
  if (!lockedRecords().some((l) => l.id === id)) return { error: 'that record isn’t locked' };
  const out = await deleteRecords([id]);
  if ('error' in out) return out;
  if (!out.removed.includes(id)) return { error: 'no such record under this holder key' };
  await hydrate();
  return { ok: true };
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useRecords = (): StrainRecord[] => useSyncExternalStore(subscribe, () => records);

/** What useSealedView gives, outside a component. */
export const sealedViewNow = (): SealedView => sealedView;

/** The locked records and whether the last load came back whole, for the pages that show them. */
export const useSealedView = (): SealedView => useSyncExternalStore(subscribe, () => sealedView);

/**
 * What the sender's offer says about the material (CONTRACT.md #8): opened in the
 * recipient's browser with the key from the delivery code, or, for a code made before
 * offers were sealed, as the registry gave it with the claim (offerPlain).
 */
export type OfferFields = {
  readonly strainName?: string;
  readonly bredBy?: string;
  readonly dateCreated?: string;
  readonly profile?: string;
  readonly taxon?: string;
  readonly refId?: string;
  readonly animal?: { readonly breed?: string; readonly idScheme?: string; readonly sex?: string };
  readonly strain?: { readonly group?: string; readonly deposits?: readonly string[]; readonly generation?: string };
  readonly quantity?: string;
  readonly note?: string;
  /** The sender's name, as they typed it (sealed offers made since 17 Oct). */
  readonly from?: string;
  /**
   * The breeder's lock for lab reports, inside the sealed offer (round 3, P1): only a
   * sealed offer opened with the code's key is a source for it, never the registry.
   */
  readonly resultLock?: string;
};

/** An age X25519 recipient (lab-results.ts RECIPIENT; repeated so this module needn't load it). */
const LOCK = /^age1[02-9ac-hj-np-z]{58}$/;

const text = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** An offer's fields, keeping only strings where strings belong. */
export const offerFieldsOf = (v: unknown): OfferFields => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const a = typeof o.animal === 'object' && o.animal !== null ? (o.animal as Record<string, unknown>) : undefined;
  const out: Record<string, unknown> = {};
  for (const k of [
    'strainName',
    'bredBy',
    'dateCreated',
    'profile',
    'taxon',
    'refId',
    'quantity',
    'note',
    'from',
  ] as const) {
    const s = text(o[k]);
    if (s !== undefined) out[k] = s;
  }
  if (a) out.animal = { breed: text(a.breed) ?? '', idScheme: text(a.idScheme) ?? '', sex: text(a.sex) ?? 'unknown' };
  const st = typeof o.strain === 'object' && o.strain !== null ? (o.strain as Record<string, unknown>) : undefined;
  if (st)
    out.strain = {
      group: text(st.group) ?? '',
      deposits: Array.isArray(st.deposits)
        ? st.deposits.filter((d): d is string => typeof d === 'string').slice(0, 8)
        : [],
      generation: text(st.generation) ?? '',
    };
  const lock = text(o.resultLock)?.toLowerCase();
  if (lock && LOCK.test(lock)) out.resultLock = lock;
  return out;
};

/**
 * The received record, built in the recipient's browser from the claim's stub and the
 * sender's offer. What crosses is what names the material and where it came from, as the
 * registry's claim used to build it: the name, breeder, date, profile and taxon, and for
 * an animal its individual ID, scheme, breed and sex. The sender's notes, parents, method
 * and DNA report stay with the sender.
 */
const receivedFields = (r: StrainRecord, offer: OfferFields): StrainRecord => {
  // Only the registry's own fields of the stub (CONTRACT.md #8): anything else on it is the
  // server's, and would be sealed into the record as the recipient's own (round 3, P1).
  const stub: Record<string, unknown> = {};
  for (const k of ['id', 'strainName', 'profile', 'receivedFrom', 'receivedFromCommitment', 'receivedAt', 'transferId'])
    if ((r as unknown as Record<string, unknown>)[k] !== undefined)
      stub[k] = (r as unknown as Record<string, unknown>)[k];
  const base: Record<string, unknown> = {
    ...stub,
    strainName: offer.strainName ?? r.strainName,
    bredBy: offer.bredBy ?? (r.bredBy || ''),
    dateCreated: offer.dateCreated ?? (r.dateCreated || ''),
    notes: '',
    breedingMethod: '',
    parents: [],
    photoFingerprints: [],
    refId: '',
    licenseIds: [],
    loggedAt: r.receivedAt ?? Date.now(),
  };
  const profile = offer.profile ?? r.profile;
  if (profile !== undefined) base.profile = profile;
  if (offer.taxon !== undefined) base.taxon = offer.taxon;
  if (offer.quantity) base.quantity = offer.quantity;
  if (isAnimal(base)) {
    base.refId = offer.refId ?? '';
    base.animal = {
      breed: offer.animal?.breed ?? '',
      idScheme: offer.animal?.idScheme ?? '',
      sex: offer.animal?.sex ?? 'unknown',
      herd: '',
    };
  }
  // A strain's group, deposit numbers and generation name the material, like an animal's ID.
  if (isStrain(base)) {
    base.refId = offer.refId ?? '';
    const g = offer.strain?.group;
    base.strain = {
      group: (STRAIN_GROUPS as readonly string[]).includes(g ?? '') ? g : 'other',
      deposits: offer.strain?.deposits ?? [],
      generation: offer.strain?.generation ?? '',
    };
  }
  return base as StrainRecord;
};

/** What finishing a received record did: the record as the registry accepted it, or why not. */
export type ReceiveOutcome = { readonly record: StrainRecord } | { readonly error: string };

/**
 * Seal a record received through a transfer, and wait for the registry to accept it.
 *
 * The recipient did not produce the sender's evidence and cannot claim it, so a
 * received record arrives with no commitment. This creates theirs: a commitment over
 * what they actually received — the material, the quantity, the date, the source. The
 * claim leaves only a stub on the registry; with `offer`, the record is built here from it
 * and the sender's offer, then fingerprinted and saved sealed.
 *
 * Only a record the registry accepted is returned (CONTRACT.md #22): a receipt is never
 * signed over a fingerprint it didn't store. A record that can't be fingerprinted (an animal
 * whose offer didn't open has no species) or saved stays a stub, and the reason is returned.
 */
export const finishReceived = async (
  id: string,
  notes: ReceivedNotes = {},
  offer?: OfferFields,
): Promise<ReceiveOutcome> => {
  const r = getRecord(id);
  if (!r) return { error: 'that record isn’t in this browser' };
  if (r.recordFingerprint && rowStateOf(RECORDS_KEY, id) !== 'stub') {
    if (Object.keys(notes).length) updateReceivedNotes(id, notes);
    return { record: getRecord(id) ?? r };
  }
  const built = offer || rowStateOf(RECORDS_KEY, id) === 'stub' ? receivedFields(r, offer ?? {}) : r;
  const nonce = newNonce();
  let recordFingerprint: string;
  try {
    recordFingerprint = await fingerprintRecord({ ...built, nonce });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  const sealedRecord: StrainRecord = { ...built, ...notes, nonce, recordFingerprint };
  records = records.map((x) => (x.id === id ? sealedRecord : x));
  notify();
  const result = await store.save(RECORDS_KEY, records);
  reportSave('records', result);
  const refusedHere = result.refused.filter((x) => x.id === '*' || x.id === id);
  if (result.offline || refusedHere.length || rowStateOf(RECORDS_KEY, id) !== 'open') {
    // Not stored: the registry's stub comes back, and nothing is signed over this fingerprint.
    await hydrate();
    return {
      error: result.offline
        ? 'could not reach the registry'
        : refusedHere.length
          ? describeRefusals(refusedHere)
          : 'the registry didn’t store it',
    };
  }
  void resendGrants();
  return { record: getRecord(id) ?? sealedRecord };
};

/** finishReceived, as the record the registry accepted, or undefined. */
export const sealReceived = async (
  id: string,
  notes: ReceivedNotes = {},
  offer?: OfferFields,
): Promise<StrainRecord | undefined> => {
  const out = await finishReceived(id, notes, offer);
  return 'record' in out ? out.record : undefined;
};

/**
 * Change the receiver's own notes on a received record (a note, an accession number, the
 * breeder's lock, a rejection). Only fields outside the fingerprint; `undefined` clears one.
 */
export const updateReceivedNotes = (id: string, notes: ReceivedNotes): StrainRecord | undefined => {
  let updated: StrainRecord | undefined;
  records = records.map((r) => {
    if (r.id !== id || !r.receivedFrom) return r;
    const next: Record<string, unknown> = { ...r, ...notes };
    for (const k of Object.keys(notes)) if (next[k] === undefined) delete next[k];
    updated = next as StrainRecord;
    return updated;
  });
  if (updated) persist();
  return updated;
};

/**
 * Whether a correction of this record must wait for a checked backup (L7): the record was
 * saved before locking, or the key isn't in a checked backup yet. The page says so before
 * anything is typed.
 */
export const correctionWaitsForBackup = (id: string): boolean =>
  rowStateOf(RECORDS_KEY, id) === 'legacy' || (!!vaultKeyIfAny() && vaultNeedsBackup());

/**
 * Issue a correction.
 *
 * The original is not edited and not deleted — it is marked as superseded and stays on
 * file. A record that can be quietly changed is not evidence, and a record that can be
 * deleted is worse.
 *
 * Severity comes from the SDK, classified by which field changed. It is not a parameter
 * here, deliberately: a caller who could set it would set it to cosmetic.
 */
export const issueCorrection = async (
  originalId: string,
  edits: Partial<StrainRecord>,
  reason: string,
): Promise<StrainRecord | undefined> => {
  const before = getRecord(originalId);
  if (!before) return undefined;
  // Made from the original's fields, so never from ones that don't match its fingerprint.
  if (integrityOf(originalId) === 'mismatch') throw new Error(enT.t('app.sealed.mismatch'));
  // A correction is two saves the registry must both take: never of a record saved before
  // locking, nor under a key that isn't in a checked backup yet (round 3, L7, L1). Said up
  // front; it used to leave a correction on the registry while saying nothing had changed.
  if (correctionWaitsForBackup(originalId)) throw new Error(enT.t('app.sealed.backupFirstAction'));

  const { supersedesFor } = await import('veilcore-records');

  const nonce = newNonce();
  // A correction is a new record, so it names a key of its own, made now (never the
  // original's binding, which is about the original's key).
  const id = newRecordId();
  const { keyBinding } = bindingForSecret(ensureKeys(id).recordSecret);
  // The draft is not sealed yet, so it has no commitment. Typed loosely here for that
  // reason; the sealed record below has one.
  // Never the original's share choice (round 3, P2): what the correction publishes is the
  // holder's to choose again, so a grant the registry lists for the new id gets nothing.
  const draft = {
    ...before,
    ...edits,
    id,
    nonce,
    keyBinding,
    loggedAt: Date.now(),
    supersededBy: undefined,
    grant: undefined,
    grantToConfirm: undefined,
    // Its own secrets go in with its first save (round 4, F5), never the original's.
    secrets: undefined,
  } as StrainRecord;

  const holder = await holderPartyId();
  const supersedes = supersedesFor(toEnvelope(before, holder), await sealEnvelope(draft, holder), reason, 'holder');

  const corrected: StrainRecord = {
    ...draft,
    recordFingerprint: await fingerprintRecord({ ...draft, nonce }),
    supersedes,
  };
  if (tooLargeToSave(corrected)) {
    forgetKeys(id);
    throw new Error(enT.t('app.sealed.tooLarge'));
  }

  const previous = records;
  records = [corrected, ...records.map((r) => (r.id === originalId ? { ...r, supersededBy: corrected.id } : r))];
  notify();

  // Awaited, not fire-and-forget: a correction only exists once the registry holds both
  // halves. If it refused either, put everything back as it was — locally and on the
  // registry — and say why, rather than showing a correction nobody can verify.
  const result = await store.save(RECORDS_KEY, records);
  const refusedHere = result.refused.filter((x) => x.id === '*' || x.id === corrected.id || x.id === originalId);
  if (!result.offline && (refusedHere.length || result.held?.length)) {
    records = previous;
    notify();
    // The registry may have taken one half: a correction it stored is deleted before its
    // keys go (L7), so no orphan correction is left behind.
    if (result.accepted?.includes(corrected.id)) {
      const del = await deleteRecords([corrected.id]);
      if ('error' in del || !del.removed.includes(corrected.id)) {
        await hydrate();
        throw new Error(enT.t('app.sealed.correctionLeft', { id: corrected.id }));
      }
    }
    forgetKeys(id); // made for the correction above; nothing is sealed under them now
    await store.save(RECORDS_KEY, records);
    await hydrate();
    throw new Error(`The registry refused this correction, so nothing was changed. ${describeRefusals(refusedHere)}`);
  }
  settleOutbox(result);
  reportSave('records', result);
  if (!result.ok && !result.offline) await hydrate();
  return corrected;
};
