// "Prove one number" on a document with sealed numbers (docs/claims-screen.md): pick the
// number, at most / at least a bound (the number is never published) or exactly (it is), and
// prove it on Midnight from this browser. Before proving, the page says what earlier claims on
// that number already made public (SPEC 4.5, disclosure accounting). After, a link anyone can
// check (claim-link.ts).
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { StrainRecord } from '../../veilcore/records';
import { addClaim } from '../../veilcore/records';
import { SCHEMAS, shownNumber, storedNumber } from '../../veilcore/field-set';
import { claimMaterial, commitmentHex } from '../../veilcore/claims-input';
import { claimLink, type MadeClaim } from '../../veilcore/claim-link';
import { CLAIMS_READY } from '../../veilcore/chain/config';
import type { DocumentRecordLike } from '../../veilcore/document-profile';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import { slotWords } from './NumbersFields';

type How = 'at-most' | 'at-least' | 'exactly';

/** A claim in words: "Total THC is at most 0.300 %". */
export const claimWords = (c: MadeClaim, tr: Translator): string => {
  const s = SCHEMAS[c.schema]?.slots.find((x) => x.slot === c.slot);
  if (!s) return '';
  const label = slotWords(s.path, tr);
  const unit = s.unit ?? '';
  const scale = s.scale ?? 1;
  return c.kind === 'value'
    ? tr.t('app.claim.line.value', { label, value: shownNumber(c.value ?? '0', scale), unit })
    : tr.t(c.op === 'at-most' ? 'app.claim.line.atMost' : 'app.claim.line.atLeast', {
        label,
        bound: shownNumber(c.bound ?? '0', scale),
        unit,
      });
};

export const ProveNumber: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const tr = useT();
  const { t } = tr;
  const held = record.fieldSet;
  const schema = held ? SCHEMAS[held.schema] : undefined;
  const filled = (schema?.slots ?? []).filter((s) => s.type === 'uint' && held?.values[s.slot] != null);
  const [slot, setSlot] = useState<number>(filled[0]?.slot ?? 0);
  const [how, setHow] = useState<How>('at-most');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [made, setMade] = useState<MadeClaim>();
  const [copied, setCopied] = useState(false);
  if (!held || !schema || filled.length === 0) return null;

  const s = schema.slots.find((x) => x.slot === slot) ?? filled[0];
  const scale = s.scale ?? 1;
  const places = Math.round(Math.log10(scale));
  const sealed = BigInt(held.values[s.slot] ?? '0');
  const bound = how === 'exactly' ? sealed : storedNumber(typed, scale);
  const meets =
    bound !== undefined && (how === 'at-most' ? sealed <= bound : how === 'at-least' ? sealed >= bound : true);
  const earlier = (record.claims ?? []).filter((c) => c.schema === held.schema && c.slot === s.slot);
  const label = slotWords(s.path, tr);

  const prove = async () => {
    if (bound === undefined || !meets || busy) return;
    setBusy(true);
    setError(undefined);
    setMade(undefined);
    setCopied(false);
    try {
      const { proveRangeOnChain, proveValueOnChain } = await import('../../veilcore/chain/claims-call');
      const m = await claimMaterial(record as DocumentRecordLike & { fieldSet: typeof held });
      const receipt =
        how === 'exactly'
          ? await proveValueOnChain(m, s.slot, { progress: setProgress })
          : await proveRangeOnChain(m, s.slot, how, bound, { progress: setProgress });
      const claim: MadeClaim = {
        kind: how === 'exactly' ? 'value' : 'range',
        contract: receipt.contract,
        txId: receipt.txId,
        blockHeight: receipt.blockHeight,
        ...(receipt.blockTime !== undefined ? { blockTime: receipt.blockTime } : {}),
        record: commitmentHex(m),
        ...(record.keyBinding ? { keyBinding: record.keyBinding } : {}),
        schema: held.schema,
        slot: s.slot,
        ...(how === 'exactly' ? { value: sealed.toString() } : { op: how, bound: bound.toString() }),
      };
      addClaim(record.id, claim);
      setMade(claim);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const copy = async (c: MadeClaim) => {
    await navigator.clipboard.writeText(claimLink(c, window.location.origin));
    setCopied(true);
  };

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-prove-number="">
      <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
        {t('app.claim.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {t('app.claim.text')}
      </Typography>
      {!CLAIMS_READY ? (
        <Alert severity="info" variant="outlined" data-claims-not-ready="">
          {t('app.claim.notReady')}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <TextField
            select
            label={t('app.claim.number')}
            value={s.slot}
            onChange={(e) => setSlot(Number(e.target.value))}
          >
            {filled.map((f) => (
              <MenuItem key={f.slot} value={f.slot}>
                {slotWords(f.path, tr)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label={t('app.claim.how')} value={how} onChange={(e) => setHow(e.target.value as How)}>
            <MenuItem value="at-most">{t('app.claim.atMost')}</MenuItem>
            <MenuItem value="at-least">{t('app.claim.atLeast')}</MenuItem>
            <MenuItem value="exactly">{t('app.claim.exactly')}</MenuItem>
          </TextField>
          {how !== 'exactly' && (
            <TextField
              label={t('app.claim.bound')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              error={typed !== '' && bound === undefined}
              helperText={
                typed !== '' && bound === undefined ? t('app.claim.boundBad', { places: String(places) }) : ''
              }
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          )}
          {how === 'exactly' && (
            <Alert severity="warning" variant="outlined">
              {t('app.claim.exactWarn', { label, value: shownNumber(sealed, scale), unit: s.unit ?? '' })}
            </Alert>
          )}
          {bound !== undefined && !meets && (
            <Alert severity="error" variant="outlined" data-claim-wont-meet="">
              {t('app.claim.wontMeet')}
            </Alert>
          )}
          {earlier.length > 0 && (
            <Alert severity="info" variant="outlined" data-claim-earlier="">
              {t('app.claim.already', { label, list: earlier.map((c) => claimWords(c, tr)).join('; ') })}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('app.claim.leak')} {t('app.claim.computer')}
          </Typography>
          <Box>
            <Button variant="contained" disabled={busy || bound === undefined || !meets} onClick={() => void prove()}>
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
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}
          {made && (
            <Alert severity="success" variant="outlined" data-claim-made="">
              {t('app.claim.done')} {claimWords(made, tr)}.
            </Alert>
          )}
        </Stack>
      )}
      {(record.claims ?? []).length > 0 && (
        <Box sx={{ mt: 2 }} data-claims-made="">
          <Typography variant="overline" sx={{ display: 'block' }}>
            {t('app.claim.made')}
          </Typography>
          <Stack spacing={0.75}>
            {(record.claims ?? []).map((c) => (
              <Stack key={c.txId} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2">{claimWords(c, tr)}</Typography>
                <Button size="small" onClick={() => void copy(c)}>
                  {t('app.claim.copy')}
                </Button>
              </Stack>
            ))}
          </Stack>
          {copied && (
            <Typography variant="body2" role="status">
              {t('app.claim.copied')}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {t('app.claim.holderTyped')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
