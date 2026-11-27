// "Compare two of your records" (veilcore/two-record-claims.ts): prove on Midnight that two of the
// holder's records are different (proveDistinct), or that a correction only changed what it says
// (proveUnchanged), without showing the numbers. On a record's page, folded under "More ways to
// prove" (TwoRecordWayIn, below), never on a default screen: its summary is the way in, and its
// two plain-sentence buttons open the panel. It is not a page of its own: every page of the app is
// listed in scripts/release-check.mjs APP_ROUTES, which this change doesn't touch.
//
// Before anything is proved the panel says what would be proved, what goes public, and what it
// does not show (SPEC 4.5, "Limits that shall be stated wherever claims are offered"). A pair the
// contract would refuse is refused here first, in plain words. Built, not yet run on Midnight's
// main network: the status line says so until config/copy.ts TWO_RECORD_CLAIMS_RUN_ON_MAINNET is
// turned on, and the button stays off while the sponsor doesn't pay for these two calls
// (TWO_RECORD_CLAIMS_SPONSORED).
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { isKeptOnDeviceOnly, renameTransactions, type StrainRecord } from '../../veilcore/records';
import { readyTwoClaimLink, twoClaimLinkNow } from '../../veilcore/link-hashes';
import { copyLink } from '../../veilcore/copy-link';
import {
  carriedClaims,
  changedSlots,
  comparedOf,
  formSlots,
  distinctRefusal,
  pairCandidates,
  twoRecordFormOffered,
  unchangedRefusal,
  type HeldTwoClaim,
  type TwoClaim,
  type TwoKind,
  type TwoRefusal,
} from '../../veilcore/two-record-claims';
import { proveDistinct, proveUnchanged, twoClaimsReadyHere } from '../../veilcore/prove-two';
import { CANONICAL_ORIGIN } from '../../config/network';
import { useT } from '../../i18n/app';
import { schemaWords, slotWords } from './NumbersFields';
import { TwoRecordLimits, TwoRecordStatus, refusalWords, slotList, slotName, twoClaimWords } from './TwoRecordParts';
import { seen } from './DocumentParts';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';
import { DatingPausedNotice } from '../DatingPausedNotice';
import { DATING_PAUSED } from '../../veilcore/chain/paused';
import { errorWords } from '../../i18n/error-words';
import { claimRawWords } from './ProveNumber';

/**
 * The way in, on a record's page: "More ways to prove", folded. Inside, the two claims as plain
 * sentences; either opens the panel. Shown only on the forms these claims are offered on, and
 * never for a record kept on this device only or a lab's copy.
 */
export const TwoRecordWayIn: React.FC<{
  record: StrainRecord;
  all: readonly StrainRecord[];
  /** Tests: open, and with this claim picked. */
  initialOpen?: boolean;
  initialKind?: TwoKind;
  ready?: boolean;
}> = ({ record, all, initialOpen = false, initialKind, ready }) => {
  const { t } = useT();
  const [kind, setKind] = useState<TwoKind | undefined>(initialKind);
  const [open, setOpen] = useState(initialOpen || initialKind !== undefined);
  // Never on a lab's copy (records.ts StrainRecord.copy): its numbers are the lab's, not this holder's.
  if (!twoRecordFormOffered(record.fieldSet?.schema) || isKeptOnDeviceOnly(record) || record.copy === true) return null;
  return (
    <Accordion
      disableGutters
      variant="outlined"
      expanded={open}
      onChange={(_e, o) => setOpen(o)}
      data-two-way-in=""
      slotProps={{ transition: { unmountOnExit: true } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
        <Typography variant="subtitle1" component="h2">
          {t('app.tworec.more.title')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('app.tworec.more.text')}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <TwoRecordStatus />
        </Box>
        {kind === undefined ? (
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            {(['distinct', 'unchanged'] as const).map((k) => (
              <Button key={k} variant="outlined" onClick={() => setKind(k)} data-two-link={k} sx={{ minHeight: 44 }}>
                {t(k === 'distinct' ? 'app.tworec.more.distinct' : 'app.tworec.more.unchanged')}
              </Button>
            ))}
          </Stack>
        ) : (
          <TwoRecordPanel record={record} all={all} initialKind={kind} {...(ready !== undefined ? { ready } : {})} />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const nameOf = (r: StrainRecord | undefined): string => seen(r?.strainName || r?.id || '');

/** The panel itself: what to prove, the other record, the list for a correction, and the button. */
export const TwoRecordPanel: React.FC<{
  record: StrainRecord;
  all: readonly StrainRecord[];
  initialKind?: TwoKind;
  /** Tests: whether this build can send them (prove-two.ts twoClaimsReadyHere). */
  ready?: boolean;
}> = ({ record, all, initialKind = 'distinct', ready = twoClaimsReadyHere() }) => {
  const tr = useT();
  const { t } = tr;
  const schema = record.fieldSet?.schema ?? '';
  const candidates = pairCandidates(record, all, (r) => isKeptOnDeviceOnly(r) || r.copy === true);
  const [kind, setKind] = useState<TwoKind>(initialKind);
  const [otherId, setOtherId] = useState<string>(candidates[0]?.id ?? '');
  const other = candidates.find((c) => c.id === otherId) ?? candidates[0];
  // A correction: the numbers allowed to change start as the ones that did; the holder may add more.
  const changed = other ? changedSlots(other, record) : [];
  const [ticked, setTicked] = useState<readonly number[] | undefined>(undefined);
  const mayChange = ticked ?? changed;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [made, setMade] = useState<HeldTwoClaim>();
  const [copied, setCopied] = useState(false);
  // A link made but not copied (the browser refused the clipboard after a look-up): one more tap.
  const [readyLink, setReadyLink] = useState<string>();

  if (!twoRecordFormOffered(schema) || isKeptOnDeviceOnly(record) || record.copy === true)
    return (
      <Alert severity="info" variant="outlined" data-two-not-offered="">
        {refusalWords({ key: 'app.tworec.refuse.notOffered' }, tr)}
      </Alert>
    );

  const { k } = comparedOf(schema);
  const refusal: TwoRefusal | undefined = !other
    ? undefined
    : kind === 'distinct'
      ? distinctRefusal(record, other)
      : unchangedRefusal(other, record, mayChange, (i) => slotName(schema, i, tr));
  const canGo = ready && !!other && !refusal && !busy && !DATING_PAUSED;

  const prove = async () => {
    if (!other || !canGo) return;
    setBusy(true);
    setError(undefined);
    setMade(undefined);
    setCopied(false);
    try {
      setMade(
        kind === 'distinct'
          ? await proveDistinct(record, other, { progress: setProgress })
          : await proveUnchanged(other, record, mayChange, {
              progress: setProgress,
              words: (i) => slotName(schema, i, tr),
            }),
      );
    } catch (e) {
      setError(errorWords(e, tr));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  /** The two records a claim names, first and second, by their names here. */
  const namesFor = (c: HeldTwoClaim) => ({
    a: nameOf(all.find((r) => r.id === c.ids[0]) ?? (c.ids[0] === record.id ? record : undefined)),
    b: nameOf(all.find((r) => r.id === c.ids[1]) ?? (c.ids[1] === record.id ? record : undefined)),
  });
  const copy = async (c: TwoClaim) => {
    // Its transaction by its hash, an older build's identifier looked up, checked and saved back
    // first (link-hashes.ts); no link at all when that can't be done right now. The clipboard is
    // asked inside the tap, before anything waits (copy-link.ts).
    const done = copyLink(twoClaimLinkNow(c, CANONICAL_ORIGIN), () =>
      readyTwoClaimLink(c, CANONICAL_ORIGIN, { save: renameTransactions }),
    );
    setCopied(false);
    setReadyLink(undefined);
    setError(undefined);
    try {
      const r = await done;
      if (r.copied) setCopied(true);
      else setReadyLink(r.link);
    } catch {
      setError(t('app.claim.linkLater'));
    }
  };
  const copyReady = (link: string) => {
    setReadyLink(undefined);
    navigator.clipboard.writeText(link).then(
      () => setCopied(true),
      () => setReadyLink(link),
    );
  };

  return (
    <Stack spacing={2} data-two-panel={kind}>
      <TextField
        select
        label={t('app.tworec.what')}
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as TwoKind);
          setError(undefined);
          setMade(undefined);
        }}
        slotProps={{ htmlInput: { 'data-two-kind': kind } }}
      >
        <MenuItem value="distinct">{t('app.tworec.more.distinct')}</MenuItem>
        <MenuItem value="unchanged">{t('app.tworec.more.unchanged')}</MenuItem>
      </TextField>
      <Typography variant="body2">
        {t('app.tworec.this')}: <b>{nameOf(record)}</b>
      </Typography>
      {!other ? (
        <Alert severity="info" variant="outlined" data-two-none="">
          {t('app.tworec.none', { schema: schemaWords(schema, tr) })}
        </Alert>
      ) : (
        <>
          <TextField
            select
            label={t(kind === 'distinct' ? 'app.tworec.other' : 'app.tworec.original')}
            value={other.id}
            onChange={(e) => {
              setOtherId(e.target.value);
              setTicked(undefined);
              setError(undefined);
            }}
            slotProps={{ htmlInput: { 'data-two-other': other.id } }}
          >
            {candidates.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {nameOf(c)}
              </MenuItem>
            ))}
          </TextField>
          {kind === 'distinct' ? (
            <Typography variant="body2">{t('app.tworec.distinct.text', { k: String(k) })}</Typography>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('app.tworec.unchanged.text')}
              </Typography>
              <Typography variant="subtitle2" component="h3">
                {t('app.tworec.unchanged.list')}
              </Typography>
              <Stack data-two-mask={mayChange.join(',')}>
                {formSlots(schema).map((s) => (
                  <FormControlLabel
                    key={s.slot}
                    control={
                      <Checkbox
                        checked={mayChange.includes(s.slot)}
                        disabled={busy}
                        onChange={(e) =>
                          setTicked(
                            e.target.checked
                              ? [...mayChange, s.slot].sort((x, y) => x - y)
                              : mayChange.filter((i) => i !== s.slot),
                          )
                        }
                        slotProps={{ input: { 'data-two-slot': String(s.slot) } as never }}
                      />
                    }
                    label={
                      changed.includes(s.slot)
                        ? t('app.tworec.unchanged.changed', { label: slotWords(s.path, tr) })
                        : slotWords(s.path, tr)
                    }
                  />
                ))}
              </Stack>
            </Box>
          )}
          {kind === 'unchanged' &&
            (() => {
              // What earlier claims on the earlier record's numbers already made public carries over
              // to this record for every number left unticked (SPEC 4.5, disclosure accounting).
              const carried = carriedClaims(other.claims, mayChange);
              return carried.length > 0 ? (
                <Alert severity="info" variant="outlined" data-two-carries={String(carried.length)}>
                  {t('app.tworec.unchanged.carries', {
                    list: carried.map((c) => claimRawWords(c, tr)).join('; '),
                  })}
                </Alert>
              ) : null;
            })()}
          {refusal ? (
            <Alert severity="error" variant="outlined" data-two-refusal={refusal.key.split('.').pop()}>
              {refusalWords(refusal, tr)}
            </Alert>
          ) : (
            <Typography variant="body2" data-two-preview="">
              {kind === 'distinct'
                ? t('app.tworec.preview.distinct', { k: String(k) })
                : mayChange.length === 0
                  ? t('app.tworec.preview.unchangedNone')
                  : t('app.tworec.preview.unchanged', { list: slotList(schema, mayChange, tr) })}
            </Typography>
          )}
        </>
      )}
      <TwoRecordLimits kind={kind} />
      <Typography variant="body2" color="text.secondary">
        {t('app.claim.computer')}
      </Typography>
      <Typography variant="body2" color="text.secondary" data-two-tie="">
        {t('app.tworec.tie')}
      </Typography>
      <DisclosureReceipt circuits={[kind === 'distinct' ? 'proveDistinct' : 'proveUnchanged']} />
      <DatingPausedNotice on={DATING_PAUSED} />
      {!ready && (
        <Alert severity="info" variant="outlined" data-two-unpaid="">
          {t('app.tworec.unpaid')}
        </Alert>
      )}
      <Box>
        <Button variant="contained" disabled={!canGo} data-two-go="" onClick={() => void prove()}>
          {busy ? t('app.claim.going') : t('app.claim.go')}
        </Button>
      </Box>
      {busy && (
        <Box role="status">
          <LinearProgress sx={{ mb: 0.5 }} />
          <Typography variant="body2">{progress}</Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" variant="outlined" data-two-error="">
          {error}
        </Alert>
      )}
      {made && (
        <Alert severity="success" variant="outlined" data-two-made="">
          {t('app.claim.done')} {twoClaimWords(made, namesFor(made), tr)}.
        </Alert>
      )}
      {(record.twoClaims ?? []).length > 0 && (
        <Box data-two-claims-made={String(record.twoClaims?.length)}>
          <Typography variant="overline" sx={{ display: 'block' }}>
            {t('app.tworec.made')}
          </Typography>
          <Stack spacing={0.75}>
            {(record.twoClaims ?? []).map((c) => (
              <Stack key={c.txId} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2">{twoClaimWords(c, namesFor(c), tr)}</Typography>
                <Button size="small" onClick={() => void copy(c)} data-two-copy={c.kind}>
                  {t('app.claim.copy')}
                </Button>
              </Stack>
            ))}
          </Stack>
          {readyLink && (
            <Button
              size="small"
              variant="contained"
              sx={{ mt: 1 }}
              onClick={() => copyReady(readyLink)}
              data-claim-copy-ready=""
            >
              {t('app.claim.linkReady')}
            </Button>
          )}
          {copied && (
            <Typography variant="body2" role="status">
              {t('app.claim.copied')}
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
};
