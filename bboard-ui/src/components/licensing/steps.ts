// Where a real license is, in steps a person can follow (docs/simple-flow.md, rule 3: the
// page always says what to do next). Pure, so the words are tested without a browser.
//
// Making a license takes two people and four steps, and each side sees the same four in its
// own words, the current one marked. The pattern is the government-service "task list" and
// the e-signature "you are here" list: what's done, what's now, what comes after, one line
// each. The detail of each step shows under it only while it is the current one.
//
// Once the license is live, royalties are a loop rather than a list, so they get one line
// instead: the single thing this side should do now (nextRoyaltyStep), worked out from the
// signed messages, or "nothing to do" with who acts next.
// SPDX-License-Identifier: Apache-2.0

import { tokenOfMethod } from '../../veilcore/onchain-pay';
import { enT, type Translator } from '../../i18n/translate';

export type StepState = 'done' | 'now' | 'later';
export type Step = { readonly title: string; readonly state: StepState };

/** Steps from which are done: the first one not done is now, the rest later. */
const stepsOf = (list: readonly (readonly [string, boolean])[]): Step[] => {
  const now = list.findIndex(([, done]) => !done);
  return list.map(([title, done], i) => ({ title, state: done ? 'done' : i === now ? 'now' : 'later' }));
};

/** The licensor's four steps, from what its stored license shows. */
export const issuerSteps = (
  s: { linkMade: boolean; accepted: boolean; issued: boolean; live: boolean },
  tr: Translator = enT,
): Step[] =>
  stepsOf([
    [tr.t('app.lic.steps.i.link'), s.linkMade],
    [tr.t('app.lic.steps.i.accept'), s.accepted],
    [tr.t('app.lic.steps.i.code'), s.issued],
    [tr.t('app.lic.steps.i.activate'), s.live],
  ]);

/**
 * The licensee's four steps. The backup can be saved before or after they issue it, so each
 * step is done by its own fact, not by its place in the list.
 */
export const licenseeSteps = (
  s: { accepted: boolean; backedUp: boolean; issued: boolean; live: boolean },
  tr: Translator = enT,
): Step[] =>
  stepsOf([
    [tr.t('app.lic.steps.l.accept'), s.accepted],
    [tr.t('app.lic.steps.l.backup'), s.accepted && s.backedUp],
    [tr.t('app.lic.steps.l.code'), s.issued],
    [tr.t('app.lic.steps.l.activate'), s.live],
  ]);

// ---- royalties: the one next thing ---------------------------------------------------------

type StatementLike = { periodFrom: string; periodTo: string; amountOwed: string; currency: string };
type LineLike = {
  statement: StatementLike;
  reply?: { decision: string; note?: string };
  paid?: { amount: string; currency: string };
  received?: unknown;
};
type PayoutLike = { method: string; account: string; currency: string } | undefined;

export type NextRoyaltyStep = {
  /** One sentence: what to do now, or that it's the other side's turn. */
  readonly text: string;
  /** Whether this side has something to do (marked as such), or is waiting. */
  readonly yours: boolean;
  /** The step is filing a statement (a new one, or a corrected one): its button leads. */
  readonly file?: boolean;
};

const period = (s: StatementLike, tr: Translator) =>
  tr.t('app.lic.next.period', { from: s.periodFrom, to: s.periodTo });

/**
 * The single thing to do next on the royalty side of a live license. Lines come newest
 * first (ledgerOf). The oldest unfinished statement comes first: money is settled in order.
 */
export const nextRoyaltyStep = (
  side: 'issuer' | 'licensee',
  lines: readonly LineLike[],
  payout: PayoutLike,
  tr: Translator = enT,
): NextRoyaltyStep => {
  // A disputed statement is answered by a newer one for the same days: it is no longer open.
  const corrected = (l: LineLike) =>
    l.reply?.decision === 'disputed' &&
    lines
      .slice(0, lines.indexOf(l))
      .some((n) => n.statement.periodFrom <= l.statement.periodTo && n.statement.periodTo >= l.statement.periodFrom);
  const open = [...lines].reverse().filter((l) => !l.received && !corrected(l));
  if (side === 'issuer') {
    if (!payout) return { text: tr.t('app.lic.next.i.payout'), yours: true };
    // The oldest statement that needs this side, whichever the action: money settles in order.
    const act = open.find((l) => !l.reply || l.paid);
    if (act && !act.reply)
      return {
        text: tr.t('app.lic.next.i.check', { period: period(act.statement, tr) }),
        yours: true,
      };
    const toConfirm = act;
    if (toConfirm)
      return {
        text: tr.t('app.lic.next.i.confirm', {
          amount: toConfirm.paid!.amount,
          currency: toConfirm.paid!.currency,
          period: period(toConfirm.statement, tr),
        }),
        yours: true,
      };
    const toPay = open.find((l) => l.reply?.decision === 'accepted');
    if (toPay)
      return {
        text: tr.t('app.lic.next.i.waitPay', {
          amount: toPay.statement.amountOwed,
          currency: toPay.statement.currency,
        }),
        yours: false,
      };
    const disputed = open.find((l) => l.reply?.decision === 'disputed');
    if (disputed)
      return { text: tr.t('app.lic.next.i.disputed', { period: period(disputed.statement, tr) }), yours: false };
    return { text: tr.t('app.lic.next.i.nothing'), yours: false };
  }
  // The oldest statement that needs this side: one to pay, or one to correct.
  const act = open.find((l) => (l.reply?.decision === 'accepted' && !l.paid) || l.reply?.decision === 'disputed');
  const toPay = act?.reply?.decision === 'accepted' ? act : undefined;
  const disputed = act?.reply?.decision === 'disputed' ? act : undefined;
  if (toPay)
    return payout
      ? {
          text: tokenOfMethod(payout.method)
            ? tr.t('app.lic.next.l.payOnChain', {
                amount: toPay.statement.amountOwed,
                currency: toPay.statement.currency,
              })
            : tr.t('app.lic.next.l.pay', {
                amount: toPay.statement.amountOwed,
                currency: toPay.statement.currency,
                method: payout.method,
                account: payout.account,
              }),
          yours: true,
        }
      : { text: tr.t('app.lic.next.l.waitPayout'), yours: false };
  if (disputed)
    return {
      text: disputed.reply?.note
        ? tr.t('app.lic.next.l.disputedNote', { period: period(disputed.statement, tr), note: disputed.reply.note })
        : tr.t('app.lic.next.l.disputed', { period: period(disputed.statement, tr) }),
      yours: true,
      file: true,
    };
  const waitingReview = open.find((l) => !l.reply);
  if (waitingReview)
    return { text: tr.t('app.lic.next.l.waitCheck', { period: period(waitingReview.statement, tr) }), yours: false };
  const waitingConfirm = open.find((l) => l.paid);
  if (waitingConfirm) return { text: tr.t('app.lic.next.l.waitConfirm'), yours: false };
  return { text: tr.t('app.lic.next.l.file'), yours: true, file: true };
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The period a new statement most likely covers, so the form starts filled in: the day after
 * the last statement ended, through the end of last month (or today, if that's earlier than
 * the start). With no statement yet: last calendar month. Dates are UTC calendar days.
 */
export const suggestedPeriod = (lines: readonly LineLike[], now = new Date()): { from: string; to: string } => {
  const today = iso(now);
  const endOfLastMonth = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)));
  const startOfLastMonth = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  const lastEnd = lines
    .map((l) => l.statement.periodTo)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .pop();
  if (!lastEnd) return { from: startOfLastMonth, to: endOfLastMonth };
  const d = new Date(`${lastEnd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const from = iso(d);
  const to = from <= endOfLastMonth ? endOfLastMonth : today;
  return { from, to: to < from ? from : to };
};
