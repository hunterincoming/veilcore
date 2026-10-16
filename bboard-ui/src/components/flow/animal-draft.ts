// Logging an animal: what its first screen keeps between visits, and what it is sealed as
// (veilcore/seal-record.ts sealAnimalRecord). Kept beside the plant's draft (log-flow-state.ts)
// so switching "A plant" / "An animal" never loses what was typed for the other.
//
// Which one the first screen shows is remembered in this browser (LOG_KIND_KEY): a breeder
// who logs cattle sees the animal form first next time. Plant is the default.
// SPDX-License-Identifier: Apache-2.0

import type { AnimalSex } from '../../veilcore/animal-profile';
import type { AnimalSealInput } from '../../veilcore/seal-record';
import type { ParentRef } from '../../veilcore/records';

export type LogKind = 'plant' | 'animal';
export const LOG_KIND_KEY = 'veilcore.log-kind.v1';

/** A sire or dam as typed: a name and an ID, or a logged animal picked (recordId). */
export type ParentDraft = { name: string; individualId: string; recordId?: string };

export type AnimalDraft = {
  name: string;
  species: string;
  breed: string;
  individualId: string;
  idScheme: string;
  sex: AnimalSex;
  /** '' when not stated. */
  dateOfBirth: string;
  sire: ParentDraft;
  dam: ParentDraft;
  breeder: string;
  herd: string;
  notes: string;
  photos: { readonly name: string; readonly fingerprint: string }[];
};

const emptyParent = (): ParentDraft => ({ name: '', individualId: '' });

export const emptyAnimalDraft = (): AnimalDraft => ({
  name: '',
  species: '',
  breed: '',
  individualId: '',
  idScheme: '',
  sex: 'unknown',
  dateOfBirth: '',
  sire: emptyParent(),
  dam: emptyParent(),
  breeder: '',
  herd: '',
  notes: '',
  photos: [],
});

const parentHas = (p: ParentDraft) => Boolean(p.name.trim() || p.individualId.trim() || p.recordId);

export const animalDraftHasContent = (d: AnimalDraft): boolean =>
  Boolean(
    d.name.trim() ||
    d.species.trim() ||
    d.breed.trim() ||
    d.individualId.trim() ||
    d.idScheme.trim() ||
    d.sex !== 'unknown' ||
    d.dateOfBirth ||
    parentHas(d.sire) ||
    parentHas(d.dam) ||
    d.breeder.trim() ||
    d.herd.trim() ||
    d.notes.trim() ||
    d.photos.length,
  );

/** What is still needed before "Next: check it", or undefined when nothing is. */
export type AnimalMissing = 'species' | 'nameOrId' | 'scheme' | 'breeder';
export const animalMissing = (d: AnimalDraft): AnimalMissing | undefined => {
  if (!d.name.trim() && !d.individualId.trim()) return 'nameOrId';
  if (d.individualId.trim() && !d.idScheme.trim()) return 'scheme';
  if (!d.species.trim()) return 'species';
  if (!d.breeder.trim()) return 'breeder';
  return undefined;
};

/** One line, trimmed: a pasted line break or tab becomes a space (the profile seals one line). */
const line = (v: string) =>
  v
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

const parentOf = (role: 'sire' | 'dam', p: ParentDraft): ParentRef[] =>
  parentHas(p)
    ? [
        {
          role,
          name: line(p.name),
          individualId: line(p.individualId),
          ...(p.recordId ? { recordId: p.recordId } : {}),
        },
      ]
    : [];

/** What the draft is sealed as: text trimmed to one line, the sire before the dam, photos as fingerprints. */
export const animalSealInputOf = (d: AnimalDraft): AnimalSealInput => ({
  name: line(d.name),
  species: line(d.species),
  breed: line(d.breed),
  individualId: line(d.individualId),
  idScheme: line(d.idScheme),
  sex: d.sex,
  dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(d.dateOfBirth) ? d.dateOfBirth : '',
  parents: [...parentOf('sire', d.sire), ...parentOf('dam', d.dam)],
  breeder: line(d.breeder),
  herd: line(d.herd),
  notes: d.notes.trim(),
  photoFingerprints: d.photos.map((p) => p.fingerprint),
});

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '');
const HEX64 = /^[0-9a-f]{64}$/;

const parseParent = (v: unknown): ParentDraft => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    name: str(o.name),
    individualId: str(o.individualId),
    ...(typeof o.recordId === 'string' && o.recordId ? { recordId: str(o.recordId, 128) } : {}),
  };
};

/** A stored animal draft read back, keeping only well-formed fields. */
export const parseAnimalDraft = (v: unknown): AnimalDraft | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const sex = o.sex === 'female' || o.sex === 'male' ? o.sex : 'unknown';
  const photos = Array.isArray(o.photos)
    ? (o.photos as unknown[])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
        .map((p) => ({ name: str(p.name), fingerprint: str(p.fingerprint, 64) }))
        .filter((p) => HEX64.test(p.fingerprint))
        .slice(0, 50)
    : [];
  return {
    name: str(o.name),
    species: str(o.species),
    breed: str(o.breed),
    individualId: str(o.individualId),
    idScheme: str(o.idScheme),
    sex,
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(str(o.dateOfBirth)) ? str(o.dateOfBirth) : '',
    sire: parseParent(o.sire),
    dam: parseParent(o.dam),
    breeder: str(o.breeder),
    herd: str(o.herd),
    notes: str(o.notes, 2000),
    photos,
  };
};

/** Which form the first screen opens on: the last one chosen in this browser, else a plant. */
export const loadLogKind = (): LogKind => {
  try {
    return localStorage.getItem(LOG_KIND_KEY) === 'animal' ? 'animal' : 'plant';
  } catch {
    return 'plant';
  }
};

export const saveLogKind = (k: LogKind): void => {
  try {
    localStorage.setItem(LOG_KIND_KEY, k);
  } catch {
    /* a browser that keeps nothing: the choice lasts this visit */
  }
};
