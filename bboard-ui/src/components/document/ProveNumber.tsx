// "Prove one number" on a document with sealed numbers (docs/claims-screen.md): pick the
// number, at most / at least a bound (the number is never published) or exactly (it is), and
// prove it on Midnight from this browser. Before proving, the page says what earlier claims on
// that number already made public (SPEC 4.5, disclosure accounting). After, a link anyone can
// check (claim-link.ts).
//
// On a record kept on this device only (docs/device-only-records.md) the panel is shown only
// after the holder turns it on (DeviceOnlyProve, below), says exactly what would be published
// before anything is proved, and asks again before "exactly", which publishes the number itself.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { StrainRecord } from '../../veilcore/records';
import { SCHEMAS, shownNumber, storedNumber } from '../../veilcore/field-set';
import { claimLink, type MadeClaim } from '../../veilcore/claim-link';
import { callWordKey } from '../../veilcore/claim-call';
import { CLAIMS_READY } from '../../veilcore/chain/config';
import { canProve, proveNumber, proveShown, type How } from '../../veilcore/prove-number';
import { DEVICE_ONLY_CLAIMS_ENABLED } from '../../config/network';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import { schemaWords, slotWords } from './NumbersFields';
import { keyShort } from '../../veilcore/lab-key-text';
import { DatingPausedNotice } from '../DatingPausedNotice';
import { DATING_PAUSED } from '../../veilcore/chain/paused';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';

/** What a claim's words need: the slot and what it says about it. */
type ClaimLine = Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op' | 'bound' | 'value'>;

/** A claim in words: "Total THC is at most 0.300 %". */
export const claimWords = (c: ClaimLine, tr: Translator, labStands = false): string => {
  const s = SCHEMAS[c.schema]?.slots.find((x) => x.slot === c.slot);
  if (!s) return '';
  // A lab result's yes/no call says the result ("Not detected"), not the slot, only where a lab
  // stands behind the numbers (claim-call.ts); otherwise the slot and the number.
  const call = labStands ? callWordKey(s.path, c) : undefined;
  return call ? tr.t(call) : claimRawWords(c, tr);
};

/** A claim as the slot and the number: "Detected (1 yes, 0 no) is at most 0". */
export const claimRawWords = (c: ClaimLine, tr: Translator): string => {
  const s = SCHEMAS[c.schema]?.slots.find((x) => x.slot === c.slot);
  if (!s) return '';
  const label = slotWords(s.path, tr);
  const unit = s.unit ?? '';
  const scale = s.scale ?? 1;
  // No trailing space where the slot has no unit ("… is at most 0", not "… is at most 0 ").
  return (
    c.kind === 'value'
      ? tr.t('app.claim.line.value', { label, value: shownNumber(c.value ?? '0', scale), unit })
      : tr.t(c.op === 'at-most' ? 'app.claim.line.atMost' : 'app.claim.line.atLeast', {
          label,
          bound: shownNumber(c.bound ?? '0', scale),
          unit,
        })
  ).trimEnd();
};

export const ProveNumber: React.FC<{
  record: StrainRecord;
  labSignatureOk?: boolean;
  /** The record is kept on this device only: say what would be published, and ask again before "exactly". */
  deviceOnly?: boolean;
  /** What to prove when the panel opens (a test starts on "exactly"). */
  initialHow?: How;
}> = ({ record, labSignatureOk = false, deviceOnly = false, initialHow = 'at-most' }) => {
  const tr = useT();
  const { t } = tr;
  const held = record.fieldSet;
  const schema = held ? SCHEMAS[held.schema] : undefined;
  const filled = (schema?.slots ?? []).filter((s) => s.type === 'uint' && held?.values[s.slot] != null);
  const [slot, setSlot] = useState<number>(filled[0]?.slot ?? 0);
  const [how, setHow] = useState<How>(initialHow);
  // A record kept on this device only: "exactly" is asked for twice. Cleared by any change of what is proved.
  const [confirmedExact, setConfirmedExact] = useState(false);
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

  /** A number with its unit, when the slot has one ("12.50 m²", "120"). */
  const withUnit = (n: string) => (s.unit ? `${n} ${s.unit}` : n);
  const ready = canProve({ deviceOnly, how, confirmedExact, boundOk: bound !== undefined, meets });

  const prove = async () => {
    if (bound === undefined || !ready || busy) return;
    setBusy(true);
    setError(undefined);
    setMade(undefined);
    setCopied(false);
    try {
      setMade(
        await proveNumber(record, s.slot, how, bound, { progress: setProgress, confirmedExact, optedIn: deviceOnly }),
      );
      setConfirmedExact(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  // The laboratory's signature, once published on the same claims contract, goes in every link.
  const lab =
    record.labSignature && record.labOnChain && labSignatureOk
      ? {
          txId: record.labOnChain.txId,
          attester: record.labSignature.key,
          contract: record.labOnChain.contract,
          about: record.labSignature.about,
          // A v2 result's salt, so the checker can confirm the lab's binding about that record.
          bindingSalt: record.labResult?.statement.bindingSalt,
        }
      : undefined;
  const copy = async (c: MadeClaim) => {
    const withLab: MadeClaim =
      lab && lab.contract === c.contract
        ? {
            ...c,
            attested: {
              txId: lab.txId,
              attester: lab.attester,
              ...(lab.about ? { about: lab.about } : {}),
              ...(lab.about && lab.bindingSalt ? { bindingSalt: lab.bindingSalt } : {}),
            },
          }
        : c;
    await navigator.clipboard.writeText(claimLink(withLab, window.location.origin));
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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} data-claim-example="">
        {t('app.claim.example')}
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
            onChange={(e) => {
              setSlot(Number(e.target.value));
              setConfirmedExact(false);
            }}
          >
            {filled.map((f) => (
              <MenuItem key={f.slot} value={f.slot}>
                {slotWords(f.path, tr)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('app.claim.how')}
            value={how}
            onChange={(e) => {
              setHow(e.target.value as How);
              setConfirmedExact(false);
            }}
          >
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
                typed !== '' && bound === undefined
                  ? places === 0
                    ? t('app.claim.boundBadWhole')
                    : t('app.claim.boundBad', { places: String(places) })
                  : ''
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
              {t('app.claim.already', { label, list: earlier.map((c) => claimWords(c, tr, !!lab)).join('; ') })}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('app.claim.leak')} {t('app.claim.computer')}
          </Typography>
          {/* Who can tell which record a claim is about: said for every record, before the button. */}
          <Typography variant="body2" color="text.secondary" data-claim-tie="">
            {t('app.claim.tie')}
          </Typography>
          {deviceOnly && (
            <Alert severity="warning" variant="outlined" data-device-only-publish={how}>
              <Typography variant="subtitle2" component="h3">
                {t('app.doc.local.prove.publish.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }} data-device-only-publish-what="">
                {how === 'exactly'
                  ? t('app.doc.local.prove.publish.exact', {
                      schema: schemaWords(held.schema, tr),
                      label,
                      value: withUnit(shownNumber(sealed, scale)),
                    })
                  : bound === undefined
                    ? t('app.doc.local.prove.publish.noBound')
                    : t('app.doc.local.prove.publish.range', {
                        schema: schemaWords(held.schema, tr),
                        label,
                        bound: withUnit(shownNumber(bound, scale)),
                        direction: t(
                          how === 'at-most'
                            ? 'app.doc.local.prove.direction.atMost'
                            : 'app.doc.local.prove.direction.atLeast',
                        ),
                      })}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('app.doc.local.prove.publish.route')}
              </Typography>
              <Typography variant="body2" data-device-only-publish-tie="">
                {t('app.claim.tie')}
              </Typography>
              {how === 'exactly' && (
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={
                    <Checkbox
                      checked={confirmedExact}
                      onChange={(e) => setConfirmedExact(e.target.checked)}
                      disabled={busy}
                      slotProps={{ input: { 'data-device-only-confirm-exact': '' } as never }}
                    />
                  }
                  label={t('app.doc.local.prove.confirmExact', { value: withUnit(shownNumber(sealed, scale)) })}
                />
              )}
            </Alert>
          )}
          {bound !== undefined && meets && (
            <Typography variant="body2" data-claim-preview="">
              {t('app.claim.preview', {
                claim: claimWords(
                  how === 'exactly'
                    ? { schema: held.schema, slot: s.slot, kind: 'value', value: String(bound) }
                    : { schema: held.schema, slot: s.slot, kind: 'range', op: how, bound: String(bound) },
                  tr,
                  !!lab,
                ),
              })}
            </Typography>
          )}
          <DisclosureReceipt circuits={[how === 'exactly' ? 'proveValue' : 'proveRange']} />
          <DatingPausedNotice on={DATING_PAUSED} />
          <Box>
            <Button
              variant="contained"
              disabled={busy || !ready || DATING_PAUSED}
              data-prove-go=""
              onClick={() => void prove()}
            >
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
              {t('app.claim.done')} {claimWords(made, tr, !!lab)}.
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
                <Typography variant="body2">{claimWords(c, tr, !!lab)}</Typography>
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
          <Typography variant="caption" color="text.secondary" data-claims-signed={lab ? 'lab' : 'holder'}>
            {lab ? t('app.claim.labSigned', { key: keyShort(lab.attester) }) : t('app.claim.holderTyped')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

/**
 * "Prove one number" for a record kept on this device only: the holder's choice, off every time
 * the page is opened. Until it is turned on the page says what proving would do and shows no
 * way to do it. (`initialOn` is for a test.)
 */
export const DeviceOnlyProve: React.FC<{ record: StrainRecord; initialOn?: boolean; initialHow?: How }> = ({
  record,
  initialOn = false,
  initialHow,
}) => {
  const { t } = useT();
  const [on, setOn] = useState(initialOn);
  if (!DEVICE_ONLY_CLAIMS_ENABLED)
    return (
      <Typography variant="body2" color="text.secondary" data-device-only-no-prove="">
        {t('app.doc.local.prove.off')}
      </Typography>
    );
  return (
    <>
      <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-device-only-prove={on ? 'on' : 'off'}>
        <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
          {t('app.doc.local.prove.title')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('app.doc.local.prove.text')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }} data-device-only-prove-tie="">
          {t('app.claim.tie')}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={on} onChange={(e) => setOn(e.target.checked)} />}
          label={t('app.doc.local.prove.choice')}
        />
      </Paper>
      {proveShown({ deviceOnly: true, optedIn: on, enabled: DEVICE_ONLY_CLAIMS_ENABLED }) && (
        <ProveNumber record={record} deviceOnly initialHow={initialHow} />
      )}
    </>
  );
};
