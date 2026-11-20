// A laboratory's signed parentage result under `animal-parentage/v1` (docs/parentage.md), in the
// terms of ICAR's "Guidelines for Parentage Verification and Parentage Discovery Based on SNP
// Genotypes" (May 2023): the bands a count falls in, the bounds the site offers, and when a link's
// claims together say "meets ICAR 2023 acceptance".
//
// The lab genotypes the calf, sire and dam, counts the conflicts and signs the counts. The holder
// proves only ICAR's own class bounds (at most 2 with each parent, at most 3 across the trio, at
// least 175 SNPs compared with each parent), never a bound rounded from the count: "at most 5" is
// the top of ICAR's doubtful band, and a fixed class bound publishes nothing but the band.
// SPDX-License-Identifier: Apache-2.0

/** The published form (bboard-ui public/schemas/animal-parentage-v1.json). */
export const PARENTAGE_SCHEMA = 'veilcore/schema/animal-parentage/v1';

/** ICAR 2023, verification on the 195-SNP ISAG panel: counts of conflicts, and SNPs in common. */
export const ICAR_2023 = {
  /** One parent: 0 to 2 accepted, 3 to 5 doubtful, more than 5 excluded. */
  singleAccept: 2n,
  singleDoubt: 5n,
  /** The trio (ICAR step 2, on parents already accepted): 0 to 3 accepted, 4 to 7 doubtful, more than 7 excluded. */
  trioAccept: 3n,
  trioDoubt: 7n,
  /** SNPs called in common, the offspring with one parent. */
  minCommonSingle: 175n,
  /**
   * SNPs called in common for the trio step. The form has no slot for it, so no claim can show
   * it: the laboratory applies it before it grades the trio.
   */
  minCommonTrio: 165n,
} as const;

export type Band = 'accepted' | 'doubtful' | 'excluded';

/** The band a conflict count falls in, for one parent or for the trio. */
export const icarBand = (conflicts: bigint, test: 'single' | 'trio'): Band => {
  const [accept, doubt] =
    test === 'single' ? [ICAR_2023.singleAccept, ICAR_2023.singleDoubt] : [ICAR_2023.trioAccept, ICAR_2023.trioDoubt];
  return conflicts <= accept ? 'accepted' : conflicts <= doubt ? 'doubtful' : 'excluded';
};

/** The form's slots (animal-parentage-v1.json). */
export const PARENTAGE_SLOT = {
  sireCompared: 2,
  sireConflicts: 3,
  damCompared: 5,
  damConflicts: 6,
  trioConflicts: 8,
} as const;

export type ParentageTest = keyof typeof PARENTAGE_SLOT;

/** The five claims that together are ICAR 2023 acceptance, with the bound each proves. */
export const ACCEPTANCE: readonly {
  readonly id: ParentageTest;
  readonly slot: number;
  readonly how: 'at-most' | 'at-least';
  readonly bound: bigint;
}[] = [
  { id: 'sireConflicts', slot: PARENTAGE_SLOT.sireConflicts, how: 'at-most', bound: ICAR_2023.singleAccept },
  { id: 'damConflicts', slot: PARENTAGE_SLOT.damConflicts, how: 'at-most', bound: ICAR_2023.singleAccept },
  { id: 'trioConflicts', slot: PARENTAGE_SLOT.trioConflicts, how: 'at-most', bound: ICAR_2023.trioAccept },
  { id: 'sireCompared', slot: PARENTAGE_SLOT.sireCompared, how: 'at-least', bound: ICAR_2023.minCommonSingle },
  { id: 'damCompared', slot: PARENTAGE_SLOT.damCompared, how: 'at-least', bound: ICAR_2023.minCommonSingle },
];

/** The lab's grades (0 accepted, 1 doubtful, 2 excluded), by the form's slots. */
export const OUTCOME_SLOT = { sire: 4, dam: 7, trio: 9 } as const;

/**
 * Why a conflict claim isn't offered even though the count meets ICAR's bound, or undefined:
 * the laboratory graded that test as not accepted (`grade`), or, for the trio, a parent isn't
 * accepted (`parents`): ICAR grades the trio only once both parents are accepted. The compared
 * minimums are facts about the panel, offered whenever they are met.
 */
export const blockedBy = (
  id: ParentageTest,
  values: readonly (string | null | undefined)[],
): 'grade' | 'parents' | undefined => {
  const accepted = (slot: number) => values[slot] === '0';
  const countOk = (slot: number, bound: bigint) => {
    const v = values[slot];
    return v !== null && v !== undefined && BigInt(v) <= bound;
  };
  if (id === 'sireConflicts') return accepted(OUTCOME_SLOT.sire) ? undefined : 'grade';
  if (id === 'damConflicts') return accepted(OUTCOME_SLOT.dam) ? undefined : 'grade';
  if (id === 'trioConflicts') {
    const parents =
      accepted(OUTCOME_SLOT.sire) &&
      accepted(OUTCOME_SLOT.dam) &&
      countOk(PARENTAGE_SLOT.sireConflicts, ICAR_2023.singleAccept) &&
      countOk(PARENTAGE_SLOT.damConflicts, ICAR_2023.singleAccept);
    if (!parents) return 'parents';
    return accepted(OUTCOME_SLOT.trio) ? undefined : 'grade';
  }
  return undefined;
};

/** Whether the lab's number meets an acceptance bound (what the circuit would accept). */
export const meetsBound = (value: bigint, how: 'at-most' | 'at-least', bound: bigint): boolean =>
  how === 'at-most' ? value <= bound : value >= bound;

type Claim = {
  readonly schema: string;
  readonly slot: number;
  readonly kind: string;
  readonly op?: string;
  readonly bound?: string;
  readonly record: string;
  readonly ok: boolean;
};

/**
 * Whether a link's claims together say "meets ICAR 2023 acceptance": every one of the five, each
 * checked on Midnight, all on one record under the parentage form, each at least as strict as
 * ICAR's bound. Whether a laboratory stands behind the numbers is the caller's to add.
 */
export const meetsAcceptance = (claims: readonly Claim[]): boolean => {
  const first = claims[0];
  if (!first || first.schema !== PARENTAGE_SCHEMA) return false;
  return ACCEPTANCE.every((a) =>
    claims.some((c) => {
      if (!c.ok || c.schema !== PARENTAGE_SCHEMA || c.record !== first.record) return false;
      if (c.slot !== a.slot || c.kind !== 'range' || c.op !== a.how || c.bound === undefined) return false;
      if (!/^\d+$/.test(c.bound)) return false;
      return meetsBound(BigInt(c.bound), a.how, a.bound);
    }),
  );
};
