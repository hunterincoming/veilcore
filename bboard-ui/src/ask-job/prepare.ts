// "Do it for me": getting a job ready, on this device (design v2, 4). Nothing here is sent.
//
//   - Never on a check or prove page (holder-guard.ts): a job isn't got ready there at all.
//   - Sealing needs this browser's vault key already here (vault.ts vaultKeyIfAny: read here, no
//     request). Without it: "Open VeilCore once with a connection first."
//   - A batch's or a collection's records are sealed here and held for the backup (the ledger's
//     `held` state, bulk-import.ts holdForBackup), each row marked as this job's. A change on the
//     result screen first checks the job is still the one shown, seals the new rows, then changes
//     the job compare-and-set; only then are the old rows it no longer uses dropped (or, refused,
//     the new ones). Rows another job holds are never shared.
//   - Reports: each agreement is read fresh (readAll), never from what a page read earlier, so
//     preparing "What's due" reads the deal channels. Those are reads, with no holder key. What
//     each report will come to (the top-up to a yearly minimum included) is worked out from that
//     read and fixed in the plan: the report is signed only if it still comes to exactly that.
//   - Getting a record ready to license: its key date stamp (one sponsored step), and the backup.
// SPDX-License-Identifier: Apache-2.0

import {
  checkRows,
  dropHeld,
  guessAnimalMapping,
  guessMapping,
  holdForBackup,
  HELD_FOR_BACKUP,
  loadLedger,
  readSheet,
  recordRowHash,
  sealRows,
  MAX_ROWS,
  tooManyRows,
  type PreparedRow,
} from '../veilcore/bulk-import';
import { vaultKeyIfAny } from '../veilcore/vault';
import { holderRequestsPaused } from '../veilcore/holder-guard';
import { allRecords, type StrainRecord } from '../veilcore/records';
import { keysFor, keysWithoutBackup } from '../veilcore/record-keys';
import { heldLicense, heldLicenses } from '../veilcore/held-licenses';
import { readAll } from '../veilcore/deal-client';
import { ledgerOf, minimumProgress, periodRows, reportLines } from '../veilcore/royalty-ledger';
import { currencyOf, withDealCurrency } from '../veilcore/royalty-terms';
import { endsContractYear, periodsOf, addDays } from '../veilcore/royalty-periods';
import { currencyDigits, minorText, subtractAmount, sumAmounts, toMinor } from '../veilcore/money';
import { agreementsWaitForBackup, type LicenseTerms } from '../veilcore/licenses';
import { chainNotReady } from '../veilcore/chain/config';
import { DATING_PAUSED } from '../veilcore/chain/paused';
import { clearStampRetry, stampRetries } from '../veilcore/chain/key-stamp';
import { isAnimal } from '../veilcore/animal-profile';
import { isReceivedRecord } from '../ask/hint';
import {
  batchProblems,
  batchRows,
  existingOf,
  firstFreeStart,
  ownDefaults,
  semenCodeApplies,
  speciesGroup,
  suggestTags,
  type BatchPlan,
  type ChildDetails,
  type SpeciesGroup,
} from '../ask/batch';
import type { JobPlan } from '../ask/plan';
import { licenseeParty, reportsLive } from './senders';
import {
  editJob,
  getJob,
  newJobId,
  putJob,
  setStoreHooks,
  withHash,
  type ApproveRefusal,
  type BatchSpec,
  type Figures,
  type Job,
  type ReportRef,
  type Step,
} from './store';
import { stampsLookUsed } from './capacity';

setStoreHooks({
  dropHeld: (hashes, job) => dropHeld(hashes, job),
  rowsPending: (hashes) => {
    const rows = loadLedger().rows;
    return hashes.some((h) => rows[h]?.state === 'pending');
  },
  forgetStamps: (job) => {
    for (const [id, e] of Object.entries(stampRetries())) if (e.byJob === job && !e.stopped) clearStampRetry(id);
  },
});

/** The most reports one job sends (design v2, 1). */
export const MAX_REPORTS = 5;

/** The words a batch's records are named and labelled with, in the person's language. */
export type Words = {
  readonly cloneName: (name: string) => string;
  /** Young named by their kind where the species says it ("Bella pup"), else "Bella offspring". */
  readonly youngName: (name: string, group?: SpeciesGroup) => string;
  readonly scheme: (s: 'Ear tag' | 'Microchip') => string;
};

export type Refusal =
  | 'vault'
  | 'paused'
  | 'records'
  | 'already'
  | 'nothingDue'
  | 'tooManyReports'
  | 'offline'
  | 'noChain'
  | 'noKey'
  | 'readyNow'
  | 'file'
  | ApproveRefusal;

export type Prepared = { readonly job: Job } | { readonly refused: Refusal; readonly words?: string };

/** What only the person can answer before Approve. */
export type Question = 'bredBy' | 'taxon' | 'scheme' | 'file' | 'figures' | 'backup';

const own = (id: string | undefined): StrainRecord | undefined => {
  const r = id ? allRecords().find((x) => x.id === id) : undefined;
  return r && !isReceivedRecord(r) ? r : undefined;
};

/** Rows and names already used, this job's own held rows aside (they are what is being changed). */
const takenRows = (records: readonly StrainRecord[], mine: ReadonlySet<string>): ReadonlySet<string> =>
  new Set([...Object.keys(loadLedger().rows).filter((h) => !mine.has(h)), ...records.map(recordRowHash)]);
const takenNames = (records: readonly StrainRecord[], mine: ReadonlySet<string>): ReadonlySet<string> =>
  new Set([
    ...records.map((r) => r.strainName),
    ...Object.entries(loadLedger().rows).flatMap(([h, e]) =>
      e.record?.strainName && !mine.has(h) ? [e.record.strainName] : [],
    ),
  ]);

const base = (kind: Job['kind'], now: number, today: string, extra: Partial<Job>): Job =>
  withHash({
    v: 1,
    id: newJobId(),
    kind,
    state: 'ready',
    rev: 1,
    hash: '',
    createdAt: now,
    frozen: { today },
    refs: {},
    backupNeeded: false,
    steps: [],
    ...extra,
  });

// ---- a batch: births or cuts ------------------------------------------------------------------

/** The batch a job's references and values make: what the result screen shows and seals. */
export const batchPlanOf = (job: Job, words: Words): BatchPlan | undefined => {
  const s = job.spec;
  if (!s) return undefined;
  const parent = own(job.refs.parentId);
  const sire = own(job.refs.sireId);
  const dam = own(job.refs.damId);
  const named = s.preset === 'clones' ? [parent] : [dam, sire];
  const defaults = ownDefaults(named);
  const first = named.find(Boolean);
  const taxon = s.taxon ?? defaults.taxon;
  const baseName =
    s.preset === 'clones'
      ? parent
        ? words.cloneName(parent.strainName)
        : ''
      : words.youngName(first?.strainName ?? s.sireCode ?? '', speciesGroup(taxon));
  const males = s.males ?? 0;
  const females = s.females ?? 0;
  const tags = suggestTags(s.firstTag ?? '', s.count);
  const children: ChildDetails[] = Array.from({ length: s.count }, (_, i) =>
    s.preset === 'clones'
      ? { tag: tags[i] ?? '' }
      : {
          ...(i < males ? { sex: 'male' as const } : i < males + females ? { sex: 'female' as const } : {}),
          individualId: s.ids?.[i] ?? (s.count === 1 ? (s.individualId ?? '') : ''),
        },
  );
  return {
    preset: s.preset,
    count: s.count,
    baseName,
    bredBy: s.bredBy ?? defaults.bredBy,
    taxon,
    date: s.date === 'yesterday' ? addDays(job.frozen.today, -1) : job.frozen.today,
    ...(parent ? { parent } : {}),
    ...(sire ? { sire } : {}),
    ...(dam ? { dam } : {}),
    ...(s.sireCode && !sire ? { typedSire: { name: '', individualId: s.sireCode } } : {}),
    ...(s.sireCode && s.ai && semenCodeApplies(taxon) ? { semenCode: s.sireCode } : {}),
    ...(s.preset === 'offspring' ? { idScheme: s.idScheme ?? '' } : { lotName: s.lotName ?? '' }),
    children,
  };
};

/** What the person must answer before a job can be approved. */
export const questionsOf = (job: Job, words: Words): Question[] => {
  const out: Question[] = [];
  if (job.kind === 'batch') {
    const p = batchPlanOf(job, words);
    if (p) {
      const problems = batchProblems(p);
      if (problems.includes('bredBy')) out.push('bredBy');
      if (problems.includes('species')) out.push('taxon');
      if (problems.includes('scheme')) out.push('scheme');
    }
  }
  if (job.kind === 'import' && !job.sheet) out.push('file');
  if (job.kind === 'due' && (job.refs.reports ?? []).some((_, i) => !figuresDone(job.figures?.[`report${i}`])))
    out.push('figures');
  if (job.backupNeeded && !backupDone(job)) out.push('backup');
  return out;
};

const figuresDone = (f: Figures | undefined): boolean =>
  !!f && f.amount !== undefined && (f.nothing === true || /^\d+(\.\d+)?$/.test((f.quantity ?? '').trim()));

/** The held records' ids: the ledger's, for this job's rows. */
export const heldIds = (job: Job): string[] => {
  const rows = loadLedger().rows;
  return (job.refs.rowHashes ?? []).flatMap((h) => (rows[h] ? [rows[h].recordId] : []));
};

/** Whether the new keys this job made (or the agreements' key) are in a checked backup. */
export const backupDone = (job: Job): boolean => {
  if (job.kind === 'ready') return !agreementsWaitForBackup();
  const ids = new Set(heldIds(job));
  if (!ids.size) return false;
  return !keysWithoutBackup().some((k) => ids.has(k.recordId));
};

/** Getting a job ready is never done on a check or prove page, and needs this browser's vault key. */
const cannot = (): Prepared | undefined =>
  holderRequestsPaused() ? { refused: 'paused' } : !vaultKeyIfAny() ? { refused: 'vault' } : undefined;

/** Hold these rows for this job's backup. */
const hold = async (rows: PreparedRow[], job: string): Promise<{ ok: true } | { refused: Refusal; words?: string }> => {
  if (!rows.length) return { ok: true };
  const r = await sealRows(rows, { commit: holdForBackup, batchSize: rows.length, gapMs: 0, heldBy: job });
  const refused = Object.values(r.outcomes).find((o) => o.state === 'refused');
  if (refused?.state === 'refused') return { refused: 'records', words: refused.reason };
  if (Object.values(r.outcomes).some((o) => o.state === 'sealed')) return { refused: 'already' };
  if (r.stopped && r.stopped !== HELD_FOR_BACKUP) return { refused: 'records', words: r.stopped };
  return { ok: true };
};

/** A batch's rows as they'd be sealed now: numbered past everything but this job's own rows. */
const batchRowsOf = (job: Job, words: Words): PreparedRow[] | undefined => {
  const p = batchPlanOf(job, words);
  if (!p) return undefined;
  const all = allRecords();
  const mine = new Set(job.refs.rowHashes ?? []);
  const plan: BatchPlan = { ...p, start: firstFreeStart(p, takenRows(all, mine), takenNames(all, mine)) };
  if (batchProblems(plan, existingOf(all, isAnimal)).length) return [];
  return batchRows(plan);
};

/**
 * Put a job's new rows in place of its old ones, compare-and-set: the job must still be the one
 * the screen drew. Old rows it no longer uses are dropped only once the change is in; a refused
 * change drops only what it sealed new.
 */
const replaceRows = async (job: Job, rows: PreparedRow[], change: (j: Job) => Omit<Job, 'hash'>): Promise<Prepared> => {
  // Checked first, before sealing anything: still waiting, and still the plan shown.
  const now = await getJob(job.id);
  if (!now) return { refused: 'gone' };
  if (now.state !== 'ready') return { refused: 'notReady' };
  if (now.hash !== job.hash) return { refused: 'changed' };
  const held = await hold(rows, job.id);
  const old = new Set(job.refs.rowHashes ?? []);
  const fresh = rows.map((r) => r.hash);
  if ('refused' in held) {
    await dropHeld(
      fresh.filter((h) => !old.has(h)),
      job.id,
    );
    return held;
  }
  const r = await editJob(job.id, job.hash, (j) => ({ ...change(j), refs: { ...j.refs, rowHashes: fresh } }));
  const keep = new Set('refused' in r ? old : fresh);
  await dropHeld(
    [...old, ...fresh].filter((h) => !keep.has(h)),
    job.id,
  );
  return r;
};

const prepareBatch = async (
  plan: Extract<JobPlan, { job: 'batch' }>,
  now: number,
  today: string,
  words: Words,
): Promise<Prepared> => {
  for (const id of [plan.parent?.v, plan.sire?.v, plan.dam?.v]) if (id && !own(id)) return { refused: 'records' };
  const spec: BatchSpec = {
    preset: plan.preset,
    count: plan.count.v,
    ...(plan.males ? { males: plan.males.v } : {}),
    ...(plan.females ? { females: plan.females.v } : {}),
    ...(plan.typedSire ? { sireCode: plan.typedSire.code.v, ai: plan.typedSire.ai } : {}),
    ...(plan.individualId ? { individualId: plan.individualId.v } : {}),
    ...(plan.idScheme ? { idScheme: words.scheme(plan.idScheme.v) } : {}),
    ...(plan.idsLater ? { idsLater: true } : {}),
    ...(plan.firstTag ? { firstTag: plan.firstTag.v } : {}),
    ...(plan.lotName ? { lotName: plan.lotName.v } : {}),
    ...(plan.date.v === 'yesterday' ? { date: 'yesterday' as const } : {}),
  };
  const job = base('batch', now, today, {
    refs: {
      ...(plan.parent ? { parentId: plan.parent.v } : {}),
      ...(plan.sire ? { sireId: plan.sire.v } : {}),
      ...(plan.dam ? { damId: plan.dam.v } : {}),
    },
    spec,
    backupNeeded: true,
    steps: [{ id: 'records', kind: 'records', state: 'todo' }],
  });
  const rows = batchRowsOf(job, words) ?? [];
  const held = await hold(rows, job.id);
  if ('refused' in held) {
    await dropHeld(
      rows.map((r) => r.hash),
      job.id,
    );
    return held;
  }
  return { job: await putJob({ ...job, refs: { ...job.refs, rowHashes: rows.map((r) => r.hash) } }) };
};

/** Change a batch's own values on the result screen: sealed again, rev bumped (compare-and-set). */
export const changeBatch = async (job: Job, change: Partial<BatchSpec>, words: Words): Promise<Prepared> => {
  const next: Job = { ...job, spec: { ...job.spec!, ...change } };
  const rows = batchRowsOf(next, words);
  if (!rows) return { refused: 'records' };
  return replaceRows(job, rows, (j) => ({ ...j, spec: next.spec }));
};

// ---- bring in a collection ------------------------------------------------------------------

const prepareImport = async (
  plan: Extract<JobPlan, { job: 'import' }>,
  now: number,
  today: string,
): Promise<Prepared> => ({
  job: await putJob(
    base('import', now, today, {
      // A collection's spec: animals or plants, and the number said ("add my 40 mothers"), if any.
      spec: { preset: plan.kind === 'animal' ? 'offspring' : 'clones', count: plan.expect?.v ?? 0 },
      backupNeeded: true,
      steps: [{ id: 'records', kind: 'records', state: 'todo' }],
    }),
  ),
});

/** The file picked on the result screen: read, checked and held for the backup, as the import does. */
export const attachFile = async (
  job: Job,
  file: Pick<File, 'name' | 'size' | 'arrayBuffer'>,
): Promise<Prepared & { problems?: { line: number; text: string }[] }> => {
  let sheet;
  try {
    sheet = await readSheet(file);
  } catch (e) {
    return { refused: 'file', words: e instanceof Error ? e.message : String(e) };
  }
  if (sheet.rows.length > MAX_ROWS || sheet.moreRows) return { refused: 'file', words: tooManyRows(sheet) };
  const animal = job.spec?.preset === 'offspring';
  const mapping = { ...guessMapping(sheet.headers), ...(animal ? { animal: guessAnimalMapping(sheet.headers) } : {}) };
  // The rows this job holds already are its own: not "already saved".
  const ledger = loadLedger();
  const mine = new Set(job.refs.rowHashes ?? []);
  const checked = checkRows(sheet, mapping, {
    existing: allRecords(),
    ledger: { version: 1, rows: Object.fromEntries(Object.entries(ledger.rows).filter(([h]) => !mine.has(h))) },
  });
  if (checked.blocked) return { refused: 'file', words: checked.blocked };
  const ready = checked.rows.filter((r) => r.status === 'ready');
  const problems = checked.rows.filter((r) => r.status === 'problem');
  const expect = job.spec?.count || undefined;
  // The file's name is shown from the screen, never kept in the job (it repeats what the person has).
  const r = await replaceRows(job, ready, (j) => ({
    ...j,
    sheet: {
      fileName: '',
      ready: ready.length,
      fix: problems.map((p) => p.line).slice(0, 50),
      ...(expect ? { expect } : {}),
    },
  }));
  return 'refused' in r
    ? r
    : { ...r, problems: problems.slice(0, 50).map((p) => ({ line: p.line, text: p.problems.join(' ') })) };
};

// ---- what's due -------------------------------------------------------------------------------

/** A held license's terms as its deal names them (the deal's currency, as the license page does). */
export const dealTerms = (inviteId: string, currency?: string): LicenseTerms | undefined => {
  const h = heldLicense(inviteId);
  if (!h?.agreement) return undefined;
  return withDealCurrency(h.agreement.terms as unknown as LicenseTerms, currency);
};

/**
 * What each report of a job comes to, in order, from the figures given (the stored ones unless
 * `draft` says otherwise): its lines, plus the top-up to the yearly minimum where its period ends a
 * contract year, counting the reports before it in this job that fall in the same year. Exactly
 * what senders.ts will build from a fresh read, if nothing changed since prepare.
 */
export const reportAmounts = (
  job: Pick<Job, 'refs' | 'figures'>,
  draft: Readonly<Record<string, Figures | undefined>> = {},
): ({ amount: string; currency: string; base: string; topUp: string; rate?: string } | undefined)[] => {
  const refs = job.refs.reports ?? [];
  const bases: (string | undefined)[] = [];
  return refs.map((ref, i) => {
    const key = `report${i}`;
    const f = key in draft ? draft[key] : job.figures?.[key];
    const h = heldLicense(ref.inviteId);
    const terms = dealTerms(ref.inviteId, ref.currency);
    if (!f || !terms || !h?.agreement) return (bases[i] = undefined);
    const input = f.nothing
      ? { quantity: '0', offspring: '0' }
      : { quantity: f.quantity || '0', offspring: f.offspring || '0' };
    const opts = { type: h.agreement.type, periodFrom: ref.periodFrom };
    const b = reportLines(terms, input, opts);
    if (!b) return (bases[i] = undefined);
    bases[i] = b.total;
    const currency = currencyOf(terms);
    const digits = currencyDigits(currency);
    let topUp = minorText(0n, digits);
    if (ref.minimum) {
      const m = ref.minimum;
      const earlier = refs
        .slice(0, i)
        .map((r, k) =>
          r.inviteId === ref.inviteId && r.periodFrom >= m.yearFrom && r.periodTo <= m.yearTo ? bases[k] : '0',
        )
        .map((x) => x ?? '0');
      const owed = sumAmounts([m.owedBefore, ...earlier, b.total], digits) ?? '0';
      const left = subtractAmount(m.minimum, owed, digits);
      if (left && (toMinor(left, digits) ?? 0n) > 0n) topUp = left;
    }
    const out = reportLines(terms, input, { ...opts, minimumTopUp: topUp });
    if (!out) return undefined;
    const rule = out.lines.find((l) => l.kind === 'royalty');
    return { amount: out.total, currency, base: b.total, topUp, ...(rule?.rate ? { rate: rule.rate } : {}) };
  });
};

const prepareDue = async (now: number, today: string): Promise<Prepared> => {
  if (holderRequestsPaused()) return { refused: 'paused' };
  const live = heldLicenses().filter(reportsLive);
  const reports: ReportRef[] = [];
  for (const h of live) {
    const party = licenseeParty(h);
    if (!party) continue;
    let entries;
    try {
      // Fresh, not from what a page read earlier (design v2, 4).
      entries = await readAll(party);
    } catch {
      return { refused: 'offline' };
    }
    const ledger = ledgerOf(entries);
    const currency = ledger.reports[0]?.statement.currency ?? ledger.payout?.currency;
    const terms = withDealCurrency(h.agreement!.terms as unknown as LicenseTerms, currency);
    const digits = currencyDigits(currencyOf(terms));
    // Reports not sent yet (a report sent back to fix is corrected on the agreement's own page).
    for (const row of periodRows(terms, ledger, today)) {
      if (row.step !== 'report') continue;
      const p = row.period;
      const ends =
        !!terms.yearlyMinimum &&
        !!terms.startDate &&
        !!terms.reporting &&
        periodsOf(terms.reporting, terms.startDate, terms.endDate, p.to).some((x) => x.from === p.from) &&
        endsContractYear(terms.startDate, p, terms.endDate);
      const progress = ends ? minimumProgress(terms, ledger.reports, p.from) : undefined;
      reports.push({
        inviteId: h.inviteId,
        periodFrom: p.from,
        periodTo: p.to,
        statementId: crypto.randomUUID(),
        currency: currencyOf(terms),
        dueOn: p.reportDue,
        ...(progress
          ? {
              minimum: {
                yearFrom: progress.from,
                yearTo: progress.to,
                owedBefore: progress.owed,
                minimum: progress.minimum || minorText(0n, digits),
              },
            }
          : {}),
      });
    }
  }
  if (!reports.length) return { refused: 'nothingDue' };
  if (reports.length > MAX_REPORTS) return { refused: 'tooManyReports', words: String(reports.length) };
  const steps: Step[] = reports.map((_, i) => ({ id: `report${i}`, kind: 'report', state: 'todo' }));
  return { job: await putJob(base('due', now, today, { refs: { reports }, steps })) };
};

/**
 * A report's figures, typed on the result screen (compare-and-set; kept until it is sent), with
 * what every report then comes to: an earlier report's figures change a later one's top-up.
 */
export const setFigures = (job: Job, stepId: string, f: Figures): Promise<Prepared> =>
  editJob(job.id, job.hash, (j) => {
    const typed = {
      ...(j.figures ?? {}),
      [stepId]: { quantity: f.quantity, offspring: f.offspring, nothing: f.nothing },
    };
    const amounts = reportAmounts({ ...j, figures: typed });
    const figures = Object.fromEntries(
      Object.entries(typed).map(([k, v]) => {
        const a = amounts[Number(k.slice('report'.length))];
        return [k, { ...v, ...(a ? { amount: a.amount, currency: a.currency } : {}) }];
      }),
    );
    return { ...j, figures };
  });

// ---- one record ready to license --------------------------------------------------------------

/** Whether a record is ready to license from here: its key stamped, and the agreements' key backed up. */
export const readyToLicense = (recordId: string): boolean => !!keysFor(recordId)?.anchor && !agreementsWaitForBackup();

const prepareReady = async (
  plan: Extract<JobPlan, { job: 'ready' }>,
  now: number,
  today: string,
): Promise<Prepared> => {
  const r = own(plan.record.v);
  if (!r) return { refused: 'records' };
  if (readyToLicense(r.id)) return { refused: 'readyNow' };
  const stamped = !!keysFor(r.id)?.anchor;
  if (!stamped) {
    const why = chainNotReady();
    if (why || DATING_PAUSED) return { refused: 'noChain', ...(why ? { words: why } : {}) };
    if (!keysFor(r.id)) return { refused: 'noKey' };
  }
  const steps: Step[] = stamped ? [] : [{ id: 'stamp', kind: 'stamp', state: 'todo' }];
  return {
    job: await putJob(
      base('ready', now, today, { refs: { recordId: r.id }, backupNeeded: agreementsWaitForBackup(), steps }),
    ),
  };
};

/** Whether today's free stamps look used up from here: the stamp then goes out tomorrow. */
export const stampTomorrow = (now = Date.now()): boolean =>
  stampsLookUsed(
    allRecords().map((r) => r.id),
    now,
  );

// ---- one entry ---------------------------------------------------------------------------------

export const prepareJob = async (plan: JobPlan, words: Words, now = Date.now(), today: string): Promise<Prepared> => {
  // Never on a check or prove page; records need the vault key here. Neither asks anything.
  if (holderRequestsPaused()) return { refused: 'paused' };
  if (plan.job === 'batch' || plan.job === 'import') {
    const no = cannot();
    if (no) return no;
  }
  switch (plan.job) {
    case 'batch':
      return prepareBatch(plan, now, today, words);
    case 'import':
      return prepareImport(plan, now, today);
    case 'due':
      return prepareDue(now, today);
    case 'ready':
      return prepareReady(plan, now, today);
  }
};
