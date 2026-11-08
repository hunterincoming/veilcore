// The hint by the Ask bubble (components/ask/AskLauncher.tsx): only for someone who has a record,
// and with their own record's name, so the example works when they try it. Calves for someone
// whose records are mostly animals (where animals are offered); clones otherwise.
//
// The example must do what it says: it is read with Shortcuts before it is shown, and a record
// whose name would send it elsewhere ("Due Diligence" reads as What's due, "Backup" as the backup
// screen) is passed over for the next latest. No record that works: no hint.
//
// Only the person's own records: a received record's name was chosen by whoever sent it, and the
// hint puts its text in the Ask box with one tap, so it never comes from there.
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';
import type { StrainRecord } from '../veilcore/records';
import type { DraftKind } from './handoff';
import { interpret } from './shortcuts';

/**
 * The pages the hint shows on: the records list and a record's own page. Never over a licence,
 * its terms, royalties, the backup or an import, where it would sit on a table or a form.
 */
export const hintPage = (pathname: string): boolean =>
  /^\/records\/?$/.test(pathname) || /^\/record\/[^/]+\/?$/.test(pathname);

/**
 * An agreement's screens: its terms (being written or read), accepting or signing it, and its
 * royalty reports and payments. On a phone the Ask bubble is not shown there, so it never sits
 * on a term or a button someone is agreeing to.
 */
export const agreementScreen = (pathname: string): boolean =>
  /^\/record\/[^/]+\/license\/?$/.test(pathname) ||
  /^\/(license|license-invite|prove-license)\/[^/]+(\/.*)?$/.test(pathname) ||
  /^\/(claim|lender)\/?$/.test(pathname);

type HintRecord = Pick<StrainRecord, 'id' | 'strainName'> & {
  readonly profile?: string;
  readonly loggedAt?: number;
  readonly receivedFrom?: string;
};
export type HintKind = 'clones' | 'calves';

/** The example to show, or undefined. `render` writes it in the person's language. */
export const hintExample = (
  records: readonly HintRecord[],
  animalsOffered: boolean,
  render: (kind: HintKind, name: string) => string,
): { readonly kind: HintKind; readonly name: string; readonly text: string } | undefined => {
  const named = records.filter(
    (r) => !r.receivedFrom && (r.strainName ?? '').trim().length >= 2 && (r.strainName ?? '').length <= 60,
  );
  const animals = named.filter(isAnimal);
  const plants = named.filter((r) => !isAnimal(r) && !isStrain(r));
  const kind: HintKind = animalsOffered && animals.length > 0 && animals.length > plants.length ? 'calves' : 'clones';
  const ctx = {
    records: records as readonly StrainRecord[],
    kinds: ['plant', ...(animalsOffered ? (['animal'] as const) : [])] as DraftKind[],
  };
  const latestFirst = [...(kind === 'calves' ? animals : plants)].sort((a, b) => (b.loggedAt ?? 0) - (a.loggedAt ?? 0));
  for (const r of latestFirst.slice(0, 20)) {
    const name = (r.strainName ?? '').trim();
    const text = render(kind, name);
    const read = interpret(text, ctx);
    if (
      read.type === 'draft' &&
      read.draft.preset === (kind === 'calves' ? 'offspring' : 'clones') &&
      read.draft.parents?.includes(r.id)
    )
      return { kind, name, text };
  }
  return undefined;
};
