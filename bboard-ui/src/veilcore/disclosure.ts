// Selective disclosure — what a stranger with a record's id is shown.
//
// The holder picks which facts about a record anyone holding its id may see. The
// genetics are never in this set — they are undisclosable by design.
//
// The choice is a GRANT stored by the registry against the record (PUT
// /api/records/:id/disclosure, holder key required), not a list in the link. It used to
// ride in ?show=, which whoever had the link could edit to read parent names and
// breeding method (attack round D). The registry now answers only what the holder
// granted; a ?show= in a link can narrow that, never widen it. One grant per record:
// it applies to everyone who has the id, from any link or certificate QR code.
//
// Sealed records (CONTRACT.md #7): the registry can't read a record, so a grant carries
// the values it publishes (grantValuesFor), read from the record in this browser, and the
// fingerprint they were read from. The registry answers a value only while that is still
// the record's fingerprint; after a record changes, syncGrants sends the grant again.
//
// The keys are named after what the recipient LEARNS, not after the field being
// revealed. `descent-clean` describes an outcome; `lineage` described our internal
// shape. That distinction is what lets a registry in another domain reuse this
// vocabulary without inheriting our schema, and it comes from Mako's format spec.
//
// SPDX-License-Identifier: Apache-2.0

import { holderKey, holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';
import { enT, type Translator } from '../i18n/translate';
import { isAnimal } from './animal-profile';
import type { StrainRecord } from './records';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export type DisclosureKey =
  | 'existence' // a sealed record exists, held by this party from this date
  | 'attestation-status' // whether the holder saved a lab report
  | 'descent-clean' // free of unmet obligations through declared ancestry
  | 'sealed-at' // when the holder says it was sealed
  | 'parent-names' // the parent cultivar names; for an animal, its sire and dam with their IDs
  | 'breeding-method' // how it was produced (plants only)
  | 'individual-id'; // an animal's individual ID and its scheme (animals only)

export type Disclosure = Record<DisclosureKey, boolean>;

/**
 * The facts a holder can grant, in display order, with their default for a record that
 * has no grant yet. "My other cultivars" and "Terms of my other agreements" are gone:
 * they were facts about the holder rather than this record, and the registry never
 * answers them.
 */
export const DISCLOSURE_FIELDS: { key: DisclosureKey; label: string; def: boolean }[] = [
  // Labels say what the recipient is actually shown, not the best case. They are read by
  // the holder choosing and by the stranger on the verify page, so they say neither "you"
  // nor "the holder".
  { key: 'existence', label: 'Prior possession (shown only once anchored)', def: true },
  { key: 'attestation-status', label: 'Whether a DNA report is saved', def: true },
  { key: 'descent-clean', label: 'Lineage status, as the registry reports it', def: true },
  { key: 'sealed-at', label: 'When it was sealed (the holder’s device clock)', def: true },
  { key: 'parent-names', label: 'Parent cultivar names', def: false },
  { key: 'breeding-method', label: 'Breeding method', def: false },
  { key: 'individual-id', label: 'Individual ID and its scheme', def: false },
];

/**
 * The facts a holder can share about a record of this kind: a plant has a breeding method
 * and no individual ID; an animal has an individual ID and no breeding method. The registry
 * never answers individual-id for a plant record.
 */
export const fieldsFor = (kind: 'plant' | 'animal'): typeof DISCLOSURE_FIELDS =>
  DISCLOSURE_FIELDS.filter((f) => f.key !== (kind === 'animal' ? 'breeding-method' : 'individual-id'));

/** The registry's older names, which /verify answers in `disclosed`. */
export const LEGACY_NAME: Record<DisclosureKey, string> = {
  existence: 'own',
  'attestation-status': 'dna',
  'descent-clean': 'lineage',
  'sealed-at': 'sealed',
  'parent-names': 'parents',
  'breeding-method': 'method',
  'individual-id': 'individualId',
};

const FROM_LEGACY: Record<string, DisclosureKey> = Object.fromEntries(
  Object.entries(LEGACY_NAME).map(([k, v]) => [v, k as DisclosureKey]),
);

/** A key in either spelling, or undefined for anything else. */
export const toDisclosureKey = (k: string): DisclosureKey | undefined =>
  DISCLOSURE_FIELDS.some((f) => f.key === k) ? (k as DisclosureKey) : FROM_LEGACY[k];

/** What the recipient is told about a key, by name. */
export const labelOf = (k: DisclosureKey, tr: Translator = enT): string =>
  DISCLOSURE_FIELDS.some((f) => f.key === k) ? tr.t(`app.verify.field.${k}`) : k;

/** Always hidden, never togglable — shown to the recipient as a locked row. */
export const GENETICS_LABEL = 'The genetics themselves — never disclosed, by design';
/** GENETICS_LABEL in the visitor's language. */
export const geneticsLabel = (tr: Translator = enT): string => tr.t('app.verify.field.genetics');

export const defaultDisclosure = (): Disclosure =>
  DISCLOSURE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f.def }), {} as Disclosure);

export const noDisclosure = (): Disclosure =>
  DISCLOSURE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {} as Disclosure);

/** The keys switched on, in display order. */
export const keysOn = (d: Disclosure): DisclosureKey[] => DISCLOSURE_FIELDS.filter((f) => d[f.key]).map((f) => f.key);

export const disclosureFrom = (keys: readonly string[]): Disclosure => {
  const on = new Set(keys.map(toDisclosureKey).filter((k): k is DisclosureKey => k !== undefined));
  return DISCLOSURE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: on.has(f.key) }), {} as Disclosure);
};

export type Grant = { show: DisclosureKey[]; updatedAt: string | null };

const isGrantBody = (v: unknown): v is { show: string[]; updatedAt?: string | null } =>
  isObject(v) &&
  Array.isArray(v.show) &&
  v.show.every(isString) &&
  (v.updatedAt === undefined || v.updatedAt === null || isString(v.updatedAt));

const errorOf = async (res: Response): Promise<string> => {
  try {
    const body = await readJson(res);
    if (isObject(body) && isString(body.error)) return body.error;
  } catch {
    /* not JSON */
  }
  return `the registry answered ${String(res.status)}`;
};

/**
 * What the holder has granted for a record, as the registry holds it. null when there is
 * no holder key in this browser or the registry could not be asked.
 */
export const loadGrant = async (recordId: string): Promise<Grant | { error: string } | null> => {
  const key = holderKeyIfAny();
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/api/records/${encodeURIComponent(recordId)}/disclosure`, {
      headers: { 'x-holder-key': key },
    });
    if (!res.ok) return { error: await errorOf(res) };
    const body = await readJson(res);
    if (!isGrantBody(body)) return { error: 'unexpected response from the registry' };
    return { show: keysOn(disclosureFrom(body.show)), updatedAt: body.updatedAt ?? null };
  } catch {
    return null;
  }
};

/** The values a grant publishes (CONTRACT.md #7): only for the keys granted. */
export type GrantValues = {
  loggedAt?: number;
  parents?: { name: string; role?: string; individualId?: string }[];
  breedingMethod?: string;
  individualId?: string;
  idScheme?: string;
  dnaFingerprint?: string;
  dnaFileSha256?: string;
};

/**
 * What a grant publishes, read from the record here. Only the granted keys' values, and
 * never a parent's linked record id: no public answer uses it, and descent goes by
 * fingerprint. existence and descent-clean are the registry's own facts and carry none.
 */
export const grantValuesFor = (r: StrainRecord, show: readonly DisclosureKey[]): GrantValues => {
  const on = new Set(show);
  const v: GrantValues = {};
  if (on.has('sealed-at') && typeof r.loggedAt === 'number') v.loggedAt = r.loggedAt;
  if (on.has('parent-names')) {
    v.parents = (r.parents ?? []).map((p) => ({
      name: p.name,
      ...(p.role !== undefined ? { role: p.role } : {}),
      ...(p.individualId !== undefined ? { individualId: p.individualId } : {}),
    }));
  }
  if (on.has('breeding-method') && !isAnimal(r) && r.breedingMethod) v.breedingMethod = r.breedingMethod;
  if (on.has('individual-id') && isAnimal(r)) {
    if (r.refId) v.individualId = r.refId;
    if (r.animal?.idScheme) v.idScheme = r.animal.idScheme;
  }
  if (on.has('attestation-status')) {
    if (r.dnaFingerprint) v.dnaFingerprint = r.dnaFingerprint;
    if (r.dnaFileSha256) v.dnaFileSha256 = r.dnaFileSha256;
  }
  return v;
};

const putGrant = (r: StrainRecord, show: DisclosureKey[]) =>
  fetch(`${BASE}/api/records/${encodeURIComponent(r.id)}/disclosure`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-holder-key': holderKey() },
    body: JSON.stringify({ show, forFingerprint: r.recordFingerprint || null, values: grantValuesFor(r, show) }),
  });

/**
 * Store the holder's choice as the record's grant. Replaces the previous one; [] withdraws
 * everything. Success only on the registry's positive answer echoing what it stored, so
 * the page never shows a link whose view the registry did not agree to.
 */
export const saveGrant = async (record: StrainRecord, d: Disclosure): Promise<Grant | { error: string }> => {
  const show = keysOn(d);
  try {
    const res = await putGrant(record, show);
    if (!res.ok) return { error: await errorOf(res) };
    const body = await readJson(res);
    if (!isGrantBody(body)) return { error: 'unexpected response from the registry' };
    const stored = keysOn(disclosureFrom(body.show));
    // The registry stored something other than what was asked: say so rather than show
    // a preview that does not match what a stranger will see.
    if (stored.join(',') !== show.join(',')) {
      return { error: `the registry stored a different set (${stored.join(', ') || 'nothing'}) from the one chosen` };
    }
    return { show: stored, updatedAt: body.updatedAt ?? null };
  } catch {
    return { error: 'could not reach the registry' };
  }
};

/** A grant as GET /api/disclosures lists it. */
type ListedGrant = { recordId: string; show: string[]; forFingerprint: string | null };
const isListedGrant = (v: unknown): v is ListedGrant =>
  isObject(v) &&
  isString(v.recordId) &&
  Array.isArray(v.show) &&
  v.show.every(isString) &&
  (v.forFingerprint === null || v.forFingerprint === undefined || isString(v.forFingerprint));

/** Grants whose values are worth sending: one that publishes a value. */
const VALUE_KEYS: readonly DisclosureKey[] = [
  'attestation-status',
  'sealed-at',
  'parent-names',
  'breeding-method',
  'individual-id',
];

let syncing: Promise<number> | null = null;
let again: { force: Set<string> } | null = null;

/**
 * Send again the grants whose values were read from an older version of their record (or
 * before grants carried values): GET /api/disclosures, then a PUT for each whose
 * forFingerprint isn't the record's fingerprint now. `force` names records whose granted
 * values changed without the fingerprint changing (a DNA report paired). Only records
 * this browser holds, opened, and matching their fingerprint (api-store.ts): a value is
 * never published from a record that doesn't. Returns how many were sent.
 */
export const syncGrants = (
  getRecord: (id: string) => StrainRecord | undefined,
  force: readonly string[] = [],
  isIntact: (id: string) => boolean = () => true,
): Promise<number> => {
  if (!holderKeyIfAny()) return Promise.resolve(0);
  if (syncing) {
    // One at a time; a request made meanwhile runs once more after, with every forced id.
    again ??= { force: new Set() };
    for (const id of force) again.force.add(id);
    return syncing;
  }
  const run = async (forced: ReadonlySet<string>): Promise<number> => {
    const key = holderKeyIfAny();
    if (!key) return 0;
    let listed: ListedGrant[];
    try {
      const res = await fetch(`${BASE}/api/disclosures`, { headers: { 'x-holder-key': key } });
      if (!res.ok) return 0;
      const body = await readJson(res);
      listed = Array.isArray(body) ? body.filter(isListedGrant) : [];
    } catch {
      return 0;
    }
    let sent = 0;
    for (const g of listed) {
      const r = getRecord(g.recordId);
      if (!r || !r.recordFingerprint || !isIntact(r.id)) continue;
      const show = keysOn(disclosureFrom(g.show));
      if (!show.some((k) => VALUE_KEYS.includes(k))) continue;
      if (g.forFingerprint === r.recordFingerprint && !forced.has(r.id)) continue;
      try {
        if ((await putGrant(r, show)).ok) sent++;
      } catch {
        /* tried again at the next sync */
      }
    }
    return sent;
  };
  syncing = (async () => {
    let total = 0;
    let forced = new Set(force);
    for (;;) {
      total += await run(forced);
      if (!again) break;
      forced = again.force;
      again = null;
    }
    return total;
  })().finally(() => {
    syncing = null;
  });
  return syncing;
};

/**
 * What is shared now, and what pressing the button does (round 5): the switches can start
 * on (the defaults) while nothing is saved yet, and the words used to read as if that
 * contradicted them.
 */
export const sharedNowWords = (
  stored: { show: string[]; updatedAt: string | null } | 'loading' | 'unknown',
  unsaved: boolean,
  tr: Translator = enT,
): string => {
  if (stored === 'loading') return tr.t('app.prove.share.checkingNow');
  const save = tr.t('app.prove.share.saveNote');
  if (stored === 'unknown') return tr.t('app.prove.share.couldntRead', { save });
  if (stored.updatedAt === null) return tr.t('app.prove.share.onlyBasicsUnsaved', { save });
  const now = stored.show.length
    ? stored.show.map((k) => labelOf(k as DisclosureKey, tr)).join(tr.t('app.prove.share.semicolon'))
    : tr.t('app.prove.share.onlyBasics');
  return tr.t('app.prove.share.sharedNow', { now, differs: unsaved ? tr.t('app.prove.share.differs', { save }) : '' });
};
