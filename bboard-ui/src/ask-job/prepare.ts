// "Do it for me": getting a job ready, on this device (design v2, 4). Nothing here is sent.
//
//   - Sealing needs this browser's vault key already here (api-store.ts vaultReadiness, which
//     never makes one and asks nothing when the key is here). Without it: "Open VeilCore once
//     with a connection first."
//   - A batch's or a collection's records are sealed here and held for the backup (the ledger's
//     `held` state, bulk-import.ts holdForBackup). Every change to them on the result screen drops
//     this job's held rows (dropHeld: held rows only) and seals them again, and bumps the plan's rev.
//   - Reports: each agreement is read fresh (readAll), never from what a page read earlier, so
//     preparing "What's due" reads the deal channels. Those are reads, with no holder key.
//   - Getting a record ready to license: its key date stamp (one sponsored step), and the backup.
// SPDX-License-Identifier: Apache-2.0

import {
  checkRows,
  dropHeld,
  guessAnimalMapping,
  guessMapping,
  holdForBackup,
  loadLedger,
  readSheet,
  recordRowHash,
  sealRows,
  MAX_ROWS,
  tooManyRows,
} from '../veilcore/bulk-import';
import { vaultReadiness } from '../veilcore/api-store';
import { allRecords, type StrainRecord } from '../veilcore/records';
import { keysFor, keysWithoutBackup } from '../veilcore/record-keys';
import { heldLicenses } from '../veilcore/held-licenses';
import { readAll } from '../veilcore/deal-client';
import { ledgerOf, periodRows } from '../veilcore/royalty-ledger';
import { withDealCurrency } from '../veilcore/royalty-terms';
import { agreementsWaitForBackup, type LicenseTerms } from '../veilcore/licenses';
import { chainNotReady } from '../veilcore/chain/config';
import { DATING_PAUSED } from '../veilcore/chain/paused';
import { isAnimal } from '../veilcore/animal-profile';
import { isReceivedRecord } from '../ask/hint';
import {
  batchProblems,
  batchRows,
  existingOf,
  firstFreeStart,
  ownDefaults,
  semenCodeApplies,
  suggestTags,
  type BatchPlan,
  type ChildDetails,
} from '../ask/batch';
import type { JobPlan } from '../ask/plan';
import { licenseeParty, reportsLive } from './senders';
import {
  editJob,
  newJobId,
  putJob,
  setDropHeld,
  withHash,
  type ApproveRefusal,
  type BatchSpec,
  type Figures,
  type Job,
  type ReportRef,
  type Step,
} from './store';
import { stampsLookUsed } from './capacity';

setDropHeld(dropHeld);

/** The most reports one job sends (design v2, 1). */
export const MAX_REPORTS = 5;

/** The words a batch's records are named and labelled with, in the person's language. */
export type Words = {
  readonly cloneName: (name: string) => string;
  readonly youngName: (name: string) => string;
  readonly scheme: (s: 'Ear tag' | 'Microchip') => string;
};

export type Refusal =
  | 'vault'
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

const takenRows = (records: readonly StrainRecord[]): ReadonlySet<string> =>
  new Set([...Object.keys(loadLedger().rows), ...records.map(recordRowHash)]);
const takenNames = (records: readonly StrainRecord[]): ReadonlySet<string> =>
  new Set([
    ...records.map((r) => r.strainName),
    ...Object.values(loadLedger().rows).flatMap((e) => (e.record?.strainName ? [e.record.strainName] : [])),
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

const vaultHere = async (): Promise<boolean> => (await vaultReadiness()) === 'have';

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
  const baseName =
    s.preset === 'clones'
      ? parent
        ? words.cloneName(parent.strainName)
        : ''
      : words.youngName(first?.strainName ?? s.sireCode ?? '');
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
  const taxon = s.taxon ?? defaults.taxon;
  return {
    preset: s.preset,
    count: s.count,
    baseName,
    bredBy: s.bredBy ?? defaults.bredBy,
    taxon,
    date: job.frozen.today,
    ...(parent ? { parent } : {}),
    ...(sire ? { sire } : {}),
    ...(dam ? { dam } : {}),
    ...(s.sireCode && !sire
      ? {
          typedSire: { name: '', individualId: s.sireCode },
          ...(s.ai && semenCodeApplies(taxon) ? { semenCode: s.sireCode } : {}),
        }
      : {}),
    ...(s.preset === 'offspring' ? { idScheme: s.idScheme ?? '' } : {}),
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
  !!f && (f.nothing === true || /^\d+(\.\d+)?$/.test((f.quantity ?? '').trim()));

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

/** Seal a batch's records here, held for the backup: the job's old held rows go first. */
const sealBatch = async (
  job: Job,
  words: Words,
): Promise<{ rowHashes: string[] } | { refused: Refusal; words?: string }> => {
  if (job.refs.rowHashes?.length) await dropHeld(job.refs.rowHashes);
  const p = batchPlanOf(job, words);
  if (!p) return { refused: 'records' };
  const all = allRecords();
  const plan: BatchPlan = { ...p, start: firstFreeStart(p, takenRows(all), takenNames(all)) };
  if (batchProblems(plan, existingOf(all, isAnimal)).length) return { rowHashes: [] };
  const rows = batchRows(plan);
  const r = await sealRows(rows, { commit: holdForBackup, batchSize: rows.length, gapMs: 0 });
  const refused = Object.values(r.outcomes).find((o) => o.state === 'refused');
  if (refused?.state === 'refused') return { refused: 'records', words: refused.reason };
  if (Object.values(r.outcomes).some((o) => o.state === 'sealed')) return { refused: 'already' };
  return { rowHashes: rows.map((x) => x.hash) };
};

const prepareBatch = async (
  plan: Extract<JobPlan, { job: 'batch' }>,
  now: number,
  today: string,
  words: Words,
): Promise<Prepared> => {
  if (!(await vaultHere())) return { refused: 'vault' };
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
  };
  const draft = base('batch', now, today, {
    refs: {
      ...(plan.parent ? { parentId: plan.parent.v } : {}),
      ...(plan.sire ? { sireId: plan.sire.v } : {}),
      ...(plan.dam ? { damId: plan.dam.v } : {}),
    },
    spec,
    backupNeeded: true,
    steps: [{ id: 'records', kind: 'records', state: 'todo' }],
  });
  const sealed = await sealBatch(draft, words);
  if ('refused' in sealed) return sealed;
  return { job: await putJob({ ...draft, refs: { ...draft.refs, rowHashes: sealed.rowHashes } }) };
};

/** Change a batch's own values on the result screen: sealed again, rev bumped (compare-and-set). */
export const changeBatch = async (job: Job, change: Partial<BatchSpec>, words: Words): Promise<Prepared> => {
  const next: Job = { ...job, spec: { ...job.spec!, ...change } };
  const sealed = await sealBatch(next, words);
  if ('refused' in sealed) return sealed;
  const r = await editJob(job.id, job.hash, (j) => ({
    ...j,
    spec: next.spec,
    refs: { ...j.refs, rowHashes: sealed.rowHashes },
  }));
  if ('refused' in r) {
    // Changed in another tab meanwhile: what was just sealed goes again.
    await dropHeld(sealed.rowHashes);
    return { refused: r.refused };
  }
  return r;
};

// ---- bring in a collection ------------------------------------------------------------------

const prepareImport = async (
  plan: Extract<JobPlan, { job: 'import' }>,
  now: number,
  today: string,
): Promise<Prepared> => {
  if (!(await vaultHere())) return { refused: 'vault' };
  return {
    job: await putJob(
      base('import', now, today, {
        // A collection's spec: animals or plants, and the number said ("add my 40 mothers"), if any.
        spec: { preset: plan.kind === 'animal' ? 'offspring' : 'clones', count: plan.expect?.v ?? 0 },
        backupNeeded: true,
        steps: [{ id: 'records', kind: 'records', state: 'todo' }],
      }),
    ),
  };
};

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
  const checked = checkRows(sheet, mapping, { existing: allRecords() });
  if (checked.blocked) return { refused: 'file', words: checked.blocked };
  if (job.refs.rowHashes?.length) await dropHeld(job.refs.rowHashes);
  const ready = checked.rows.filter((r) => r.status === 'ready');
  const problems = checked.rows.filter((r) => r.status === 'problem');
  if (ready.length) {
    const r = await sealRows(ready, { commit: holdForBackup, batchSize: ready.length, gapMs: 0 });
    const refused = Object.values(r.outcomes).find((o) => o.state === 'refused');
    if (refused?.state === 'refused') return { refused: 'records', words: refused.reason };
  }
  const expect = job.spec?.count || undefined;
  const e = await editJob(job.id, job.hash, (j) => ({
    ...j,
    refs: { ...j.refs, rowHashes: ready.map((r) => r.hash) },
    sheet: {
      fileName: file.name.slice(0, 200),
      ready: ready.length,
      fix: problems.map((p) => p.line).slice(0, 50),
      ...(expect ? { expect } : {}),
    },
  }));
  if ('refused' in e) {
    await dropHeld(ready.map((r) => r.hash));
    return { refused: e.refused };
  }
  return { ...e, problems: problems.slice(0, 50).map((p) => ({ line: p.line, text: p.problems.join(' ') })) };
};

// ---- what's due -------------------------------------------------------------------------------

const prepareDue = async (now: number, today: string): Promise<Prepared> => {
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
    const terms = withDealCurrency(
      h.agreement!.terms as unknown as LicenseTerms,
      ledger.reports[0]?.statement.currency,
      ledger.payout?.currency,
    );
    // Reports not sent yet (a report sent back to fix is corrected on the agreement's own page).
    for (const row of periodRows(terms, ledger, today))
      if (row.step === 'report')
        reports.push({
          inviteId: h.inviteId,
          periodFrom: row.period.from,
          periodTo: row.period.to,
          statementId: crypto.randomUUID(),
        });
  }
  if (!reports.length) return { refused: 'nothingDue' };
  if (reports.length > MAX_REPORTS) return { refused: 'tooManyReports', words: String(reports.length) };
  const steps: Step[] = reports.map((_, i) => ({ id: `report${i}`, kind: 'report', state: 'todo' }));
  return { job: await putJob(base('due', now, today, { refs: { reports }, steps })) };
};

/** A report's figures, typed on the result screen (compare-and-set; kept until it is sent). */
export const setFigures = (job: Job, stepId: string, f: Figures): Promise<Prepared> =>
  editJob(job.id, job.hash, (j) => ({ ...j, figures: { ...(j.figures ?? {}), [stepId]: f } }));

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
  const steps: Step[] = stamped
    ? []
    : [
        {
          id: 'stamp',
          kind: 'stamp',
          state: 'todo',
        },
      ];
  return {
    job: await putJob(
      base('ready', now, today, {
        refs: { recordId: r.id },
        backupNeeded: agreementsWaitForBackup(),
        steps,
      }),
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

export const prepareJob = (plan: JobPlan, words: Words, now = Date.now(), today: string): Promise<Prepared> => {
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
