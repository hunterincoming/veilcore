// A batch of new records from one parent or a pair: "Cut 12 clones from this", "Record offspring"
// (ask/batch.ts). Review → save the backup → save. The review works offline; saving needs a
// connection, and the screen says so. Each child names its parent(s) inside its own sealed record.
//
// The backup is part of the flow, not a refusal at the end: the children are sealed in this
// browser first (bulk-import.ts holdForBackup), so the backup holds every new key, and only then
// sent, through the bulk import's own path (sealRows), as the same records.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Box, Button, LinearProgress, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { BackupStep } from './BackupStep';
import { FlowFrame, ScreenHeading, focusScreenHeading, softDisabled } from './FlowFrame';
import { today } from './log-flow-state';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { allRecords, useRecords, type StrainRecord } from '../../veilcore/records';
import { isAnimal } from '../../veilcore/animal-profile';
import { isStrain } from '../../veilcore/strain-profile';
import { holderKey } from '../../veilcore/holder';
import { makeVaultIfSafe } from '../../veilcore/api-store';
import {
  holdForBackup,
  loadLedger,
  recordRowHash,
  sealRows,
  type PreparedRow,
  type SealProgress,
} from '../../veilcore/bulk-import';
import {
  batchProblems,
  batchRows,
  childNames,
  firstFreeStart,
  isReceived,
  ownDefaults,
  type BatchPlan,
  type BatchPreset,
} from '../../ask/batch';
import { MAX_BATCH, type Handoff } from '../../ask/handoff';
import { sireAndDam } from '../../ask/prefill';
import { AskFilledBanner } from '../ask/AskFill';

type Screen = 'review' | 'backup' | 'saving' | 'done';
const STEP: Record<Screen, number> = { review: 1, backup: 2, saving: 3, done: 3 };

/** Whether the browser says it is online (it can be wrong the other way: a save still says so). */
const subscribeOnline = (l: () => void) => {
  window.addEventListener('online', l);
  window.addEventListener('offline', l);
  return () => {
    window.removeEventListener('online', l);
    window.removeEventListener('offline', l);
  };
};
const useOnline = (): boolean =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

/** Rows this browser already has: in the bulk import's ledger (sent or waiting), or records in the set. */
const takenRows = (records: readonly StrainRecord[]): ReadonlySet<string> =>
  new Set([...Object.keys(loadLedger().rows), ...records.map(recordRowHash)]);

const VAULT_WORDS: Record<string, AppKey> = {
  locked: 'app.sealed.refuse.noKey',
  unknown: 'app.sealed.refuse.unknown',
  'cant-store': 'app.sealed.refuse.cantStore',
};

export const BatchFlow: React.FC<{ handoff: Handoff }> = ({ handoff }) => {
  const preset: BatchPreset = handoff.preset === 'offspring' ? 'offspring' : 'clones';
  const tr = useT();
  const { t } = tr;
  const navigate = useNavigate();
  const records = useRecords();
  const online = useOnline();

  // Parents only from this browser's own records, picked here or handed over by Ask or the
  // record's own page. A link never picks one.
  const own = (id: string) => records.find((r) => r.id === id);
  const handed =
    handoff.source !== 'link' ? (handoff.parents ?? []).map(own).filter((r): r is StrainRecord => !!r) : [];
  const plants = records.filter((r) => !isAnimal(r) && !isStrain(r));
  const animals = records.filter(isAnimal);
  const pair = sireAndDam(handed.filter(isAnimal));

  const [parentId, setParentId] = useState(preset === 'clones' ? (handed.find((r) => !isAnimal(r))?.id ?? '') : '');
  const [sireId, setSireId] = useState(pair.sire?.id ?? '');
  const [damId, setDamId] = useState(pair.dam?.id ?? '');
  const [countText, setCountText] = useState(String(handoff.count ?? 1));
  const parent = own(parentId);
  const sire = own(sireId);
  const dam = own(damId);
  // Defaults only from records the person logged themselves: a received record's name, breeder
  // and species are someone else's words (the provenance rule, docs/ask-veilcore.md).
  const named = preset === 'clones' ? [parent] : [dam, sire];
  const firstOwn = named.find((r) => r && !isReceived(r));
  const defaultBase = !firstOwn
    ? ''
    : preset === 'clones'
      ? t('app.ask.batch.cloneName', { name: firstOwn.strainName })
      : t('app.ask.batch.youngName', { name: firstOwn.strainName });
  const defaults = ownDefaults(named);
  const anyReceived = named.some((r) => isReceived(r));
  const [baseTyped, setBaseTyped] = useState<string>();
  const [bredByTyped, setBredByTyped] = useState<string>();
  const [taxonTyped, setTaxonTyped] = useState<string>();
  const baseName = baseTyped ?? defaultBase;
  const bredBy = bredByTyped ?? defaults.bredBy;
  const taxon = taxonTyped ?? defaults.taxon;
  const [date, setDate] = useState(today());
  const count = /^\d{1,4}$/.test(countText.trim()) ? Number(countText.trim()) : NaN;
  const unnumbered: BatchPlan = {
    preset,
    count,
    baseName,
    date,
    bredBy,
    taxon,
    ...(parent ? { parent } : {}),
    ...(sire ? { sire } : {}),
    ...(dam ? { dam } : {}),
  };
  // Numbered past any child already made: the same clones again, or a second litter the same day,
  // are new records, never the old ones said to be saved again.
  const taken = useMemo(() => takenRows(records), [records]);
  const start = useMemo(
    () => firstFreeStart(unnumbered, taken),
    [taken, preset, count, baseName, date, bredBy, taxon, parentId, sireId, damId],
  );
  const plan: BatchPlan = { ...unnumbered, start };
  const problems = batchProblems(plan);
  const names = childNames(baseName, Number.isFinite(count) ? count : 0, start);

  const [screen, setScreen] = useState<Screen>('review');
  const [rows, setRows] = useState<PreparedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<SealProgress>({ done: 0, total: 0 });
  const [saved, setSaved] = useState<string[]>([]);
  const hintId = useId();
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    return focusScreenHeading();
  }, [screen]);

  const step = t('app.log.stepOf', { n: STEP[screen], total: 3 });
  const blocked = problems.length > 0 || !online || busy;

  /** Seal every child here and keep it for the backup; nothing is sent yet. */
  const prepare = async () => {
    if (blocked) return;
    setBusy(true);
    setError(undefined);
    try {
      holderKey();
      const vault = await makeVaultIfSafe();
      if (VAULT_WORDS[vault]) {
        setError(t(VAULT_WORDS[vault]));
        return;
      }
      // Numbered again against what this browser holds now (another tab may have made some).
      const made = batchRows({ ...plan, start: firstFreeStart(plan, takenRows(allRecords())) });
      const result = await sealRows(made, { commit: holdForBackup, batchSize: made.length, gapMs: 0 });
      const refused = Object.values(result.outcomes).find((o) => o.state === 'refused');
      if (refused && refused.state === 'refused') {
        setError(refused.reason);
        return;
      }
      // Any outcome now is a row the bulk import already had: never say an old record was saved.
      if (Object.values(result.outcomes).some((o) => o.state === 'sealed')) {
        setError(t('app.ask.batch.already'));
        return;
      }
      setRows(made);
      setScreen('backup');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** Send the sealed children: the same records, through the bulk import's path. */
  const send = async () => {
    setBusy(true);
    setError(undefined);
    const result = await sealRows(rows, { onProgress: setProgress });
    setBusy(false);
    const ids = Object.values(result.outcomes).flatMap((o) => (o.state === 'sealed' ? [o.recordId] : []));
    setSaved(ids);
    if (result.stopped) setError(result.stopped);
    else setScreen('done');
  };

  const filled = new Set<string>(
    handoff.source === 'ask'
      ? [
          ...(handoff.count ? ['count'] : []),
          ...(preset === 'clones' && parentId && parentId === handed[0]?.id ? ['parent'] : []),
          ...(pair.sire && sireId === pair.sire.id ? ['sire'] : []),
          ...(pair.dam && damId === pair.dam.id ? ['dam'] : []),
        ]
      : handoff.source === 'link'
        ? ['count']
        : [],
  ); /** A field Ask or a link filled: marked on the review screen (AskFill.tsx). */
  const mark = (field: string): Record<string, string> =>
    screen === 'review' && filled.has(field) ? { className: 'vc-ask-filled', 'data-ask-filled': field } : {};

  const body = (() => {
    switch (screen) {
      case 'review':
        return (
          <Stack spacing={2.5} data-batch-review={preset}>
            <Box>
              <ScreenHeading step={step}>
                {preset === 'clones' ? t('app.ask.batch.clonesTitle') : t('app.ask.batch.offspringTitle')}
              </ScreenHeading>
              <Typography variant="body1" color="text.secondary">
                {preset === 'clones' ? t('app.ask.batch.clonesIntro') : t('app.ask.batch.offspringIntro')}
              </Typography>
            </Box>
            {handoff.source !== 'record' && <AskFilledBanner source={handoff.source} />}
            {preset === 'clones' ? (
              <TextField
                select
                {...mark('parent')}
                label={t('app.ask.batch.cutFrom')}
                value={parentId}
                // A long name wraps on a phone instead of being cut off.
                slotProps={{ select: { sx: { whiteSpace: 'normal', overflowWrap: 'anywhere' } } }}
                onChange={(e) => setParentId(e.target.value)}
                helperText={plants.length ? undefined : t('app.ask.batch.noPlants')}
                fullWidth
              >
                {plants.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.strainName}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <>
                {(['sire', 'dam'] as const).map((role) => (
                  <TextField
                    key={role}
                    select
                    {...mark(role)}
                    label={t(role === 'sire' ? 'app.animal.sire' : 'app.animal.dam')}
                    value={role === 'sire' ? sireId : damId}
                    slotProps={{ select: { sx: { whiteSpace: 'normal', overflowWrap: 'anywhere' } } }}
                    onChange={(e) => (role === 'sire' ? setSireId : setDamId)(e.target.value)}
                    helperText={animals.length ? undefined : t('app.ask.batch.noAnimals')}
                    fullWidth
                  >
                    <MenuItem value="">{t('app.ask.batch.notListed')}</MenuItem>
                    {animals
                      .filter((r) => r.id !== (role === 'sire' ? damId : sireId))
                      .map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.strainName || r.refId}
                        </MenuItem>
                      ))}
                  </TextField>
                ))}
              </>
            )}
            <TextField
              {...mark('count')}
              label={preset === 'clones' ? t('app.ask.batch.howManyClones') : t('app.ask.batch.howManyYoung')}
              value={countText}
              onChange={(e) => setCountText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              error={problems.includes('count') && countText !== ''}
              helperText={t('app.ask.batch.upTo', { max: MAX_BATCH })}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              fullWidth
            />
            <TextField
              label={preset === 'clones' ? t('app.log.bredBy') : t('app.animal.breeder')}
              value={bredBy}
              onChange={(e) => setBredByTyped(e.target.value.slice(0, 200))}
              required
              fullWidth
            />
            <TextField
              label={preset === 'clones' ? t('app.log.species') : t('app.animal.species')}
              value={taxon}
              onChange={(e) => setTaxonTyped(e.target.value.slice(0, 200))}
              required={preset === 'offspring'}
              fullWidth
            />
            {anyReceived && (
              <Typography variant="body2" color="text.secondary" data-batch-received="">
                {t('app.ask.batch.receivedNote')}
              </Typography>
            )}
            <TextField
              label={t('app.ask.batch.baseName')}
              value={baseName}
              multiline
              maxRows={3}
              onChange={(e) => setBaseTyped(e.target.value.slice(0, 180))}
              helperText={names.length ? t('app.ask.batch.namedLike', { example: names[0] }) : undefined}
              fullWidth
            />
            <TextField
              label={preset === 'clones' ? t('app.ask.batch.cutOn') : t('app.ask.batch.bornOn')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            {names.length > 0 && problems.length === 0 && (
              <Box data-batch-children={names.length}>
                <Typography variant="subtitle2" component="h2">
                  {tr.tp('app.ask.batch.willMake', names.length)}
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {names.slice(0, 4).map((n) => (
                    <Typography component="li" variant="body2" key={n}>
                      {n}
                    </Typography>
                  ))}
                  {names.length > 5 && (
                    <Typography component="li" variant="body2" color="text.secondary">
                      …
                    </Typography>
                  )}
                  {names.length > 4 && (
                    <Typography component="li" variant="body2">
                      {names[names.length - 1]}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            <Alert severity="info" variant="outlined">
              {t('app.ask.batch.private')}
            </Alert>
            {!online && (
              <Alert severity="warning" variant="outlined" data-batch-offline="">
                {t('app.ask.batch.offline')}
              </Alert>
            )}
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              size="large"
              fullWidth
              {...softDisabled(blocked, hintId)}
              onClick={() => void prepare()}
              sx={{ py: 1.6 }}
            >
              {busy ? t('app.ask.batch.sealing') : t('app.log.nextSaveBackup')}
            </Button>
            <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {problems.includes('parent')
                ? t(preset === 'clones' ? 'app.ask.batch.needParent' : 'app.ask.batch.needParents')
                : problems.length
                  ? t('app.ask.batch.needAll')
                  : t('app.ask.batch.needsConnection')}
            </Typography>
          </Stack>
        );
      case 'backup':
        return (
          <BackupStep
            title={t('app.ask.batch.backupTitle')}
            stepLabel={step}
            finishLabel={tr.tp('app.ask.batch.saveThem', rows.length)}
            onDone={() => {
              setScreen('saving');
              void send();
            }}
          />
        );
      case 'saving':
        return (
          <Stack spacing={2.5}>
            <ScreenHeading step={step}>{t('app.ask.batch.savingTitle')}</ScreenHeading>
            <LinearProgress
              variant="determinate"
              value={progress.total ? Math.round((100 * progress.done) / progress.total) : 0}
              aria-label={t('app.ask.batch.savingTitle')}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="body1" role="status">
              {t('app.import.seal.of', { done: progress.done, total: progress.total || rows.length })}
            </Typography>
            {error && (
              <>
                <Alert severity="warning" variant="outlined">
                  {error}
                </Alert>
                <Button variant="contained" size="large" fullWidth disabled={busy} onClick={() => void send()}>
                  {t('app.common.tryAgain')}
                </Button>
              </>
            )}
          </Stack>
        );
      case 'done':
        return (
          <Stack spacing={2.5} data-batch-saved={saved.length}>
            <ScreenHeading step={step}>{tr.tp('app.ask.batch.saved', saved.length)}</ScreenHeading>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {saved.slice(0, 5).map((id, i) => (
                <li key={id}>
                  <Link component={RouterLink} to={`/record/${id}`}>
                    {names[i] ?? id}
                  </Link>
                </li>
              ))}
            </Box>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }} data-batch-chain="">
              <Typography variant="subtitle2" component="h2">
                {t('app.ask.batch.chainTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('app.ask.batch.chainText')}
              </Typography>
              {saved[0] && (
                <Button component={RouterLink} to={`/record/${saved[0]}`} sx={{ mt: 1, px: 0 }}>
                  {t('app.ask.batch.chainOpen')}
                </Button>
              )}
            </Box>
            <Button variant="contained" size="large" fullWidth onClick={() => void navigate('/records')}>
              {t('app.ask.batch.toRecords')}
            </Button>
          </Stack>
        );
    }
  })();

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log" step={step}>
        {body}
      </FlowFrame>
    </Box>
  );
};
