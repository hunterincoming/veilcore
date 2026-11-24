// The maintenance-authority states a pinned contract may be in (docs/contract-v2.md 3.3, rule 10),
// and which one a state's authority is in. No imports, so the state check (state-check.ts), the
// pinned list (pinned-contracts.ts) and the site can all use it.
// SPDX-License-Identifier: Apache-2.0

/**
 * One maintenance-authority state a pinned contract may be in (docs/contract-v2.md 3.3). A state
 * whose authority matches none of its contract's key states is refused.
 */
export type KeyState = {
  /** Nobody can sign a maintenance update (an empty committee). */
  readonly retired: boolean;
  /** Keys in the committee and signatures needed. Not compared for a retired authority. */
  readonly committee: number;
  readonly threshold: number;
  /** The authority's counter. null: not compared (a contract retired from its deploy). */
  readonly counter: bigint | null;
  /** The block where this state began, as published; null when not recorded. */
  readonly block: number | null;
  /** What a checker shows for it, e.g. "one key, not yet handed to the committee". */
  readonly label: string;
};

/** The maintenance authority in a state, as a verifier reports it. */
export type AuthorityReport = {
  /** How many keys may sign a maintenance update. */
  readonly committee: number;
  /** How many of them must. */
  readonly threshold: number;
  /** Raised by every maintenance update (a key inserted, removed, or the authority replaced). */
  readonly counter: bigint;
  /** Nobody can sign: more signatures needed than there are keys (api/src/maintenance.ts). */
  readonly retired: boolean;
};

/**
 * The report for a state's maintenance authority (ContractState.maintenanceAuthority, from
 * either ledger). The state check (state-check.ts) and the site's check page both read it here.
 */
export const authorityReportOf = (a: {
  readonly committee: readonly unknown[];
  readonly threshold: number;
  readonly counter: bigint;
}): AuthorityReport => ({
  committee: a.committee.length,
  threshold: a.threshold,
  counter: a.counter,
  retired: a.threshold > a.committee.length,
});

/** The key state `authority` is in, or undefined when it is in none of them. */
export const matchKeyState = (
  states: readonly KeyState[],
  authority: {
    readonly retired: boolean;
    readonly committee: number;
    readonly threshold: number;
    readonly counter: bigint;
  },
): KeyState | undefined =>
  states.find(
    (s) =>
      s.retired === authority.retired &&
      (s.retired || (s.committee === authority.committee && s.threshold === authority.threshold)) &&
      (s.counter === null || s.counter === authority.counter),
  );
