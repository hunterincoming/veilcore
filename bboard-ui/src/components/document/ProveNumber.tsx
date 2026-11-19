// "Prove one number" on a document with sealed numbers (docs/claims-screen.md): pick the
// number, at most / at least a bound (the number is never published) or exactly (it is), and
// prove it on Midnight from this browser. Before proving, the page says what earlier claims on
// that number already made public (SPEC 4.5, disclosure accounting). After, a link anyone can
// check (claim-link.ts).
//
// On a lab's genotype comparison or parentage check (veilcore/marker-claims.ts) the panel offers a
// fixed list instead ("Markers differing: at least …"), fills a bound rounded away from the exact
// count, warns before an exact bound, counts what is public per sample, and states the limits.
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
import { allRecords, type StrainRecord } from '../../veilcore/records';
import { SCHEMAS, shownNumber, storedNumber } from '../../veilcore/field-set';
import { claimLink, withMore, type MadeClaim } from '../../veilcore/claim-link';
import { callWordKey } from '../../veilcore/claim-call';
import { CLAIMS_READY } from '../../veilcore/chain/config';
import { canProve, claimsReadyHere, proveNumber, proveShown, type How } from '../../veilcore/prove-number';
import {
  LINE_KEYS,
  OFFER_KEYS,
  callPairs,
  linkClaims,
  offerAllowed,
  offerOf,
  offersFor,
  panelClaims,
  roundedBound,
  type MarkerOffer,
} from '../../veilcore/marker-claims';
import { DEVICE_ONLY_CLAIMS_ENABLED } from '../../config/network';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import { schemaWords, slotWords } from './NumbersFields';
import { keyShort } from '../../veilcore/lab-key-text';
import { DatingPausedNotice } from '../DatingPausedNotice';
import { DATING_PAUSED } from '../../veilcore/chain/paused';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';

/** A slot's path in a published form ("match.matches"). */
const slotPath = (schema: string, slot: number): string =>
  SCHEMAS[schema]?.slots.find((x) => x.slot === slot)?.path ?? '';

/** What a claim's words need: the slot and what it says about it. */
type ClaimLine = Pick<MadeClaim, 'schema' | 'slot' | 'kind' | 'op' | 'bound' | 'value'>;

/** A claim in words: "Total THC is at most 0.300 %". */
export const claimWords = (c: ClaimLine, tr: Translator, labStands = false): string => {
  const s = SCHEMAS[c.schema]?.slots.find((x) => x.slot === c.slot);
  if (!s) return '';
  // A lab result's yes/no call says the result ("Not detected"), not the slot, only where a lab
  // stands behind the numbers (claim-call.ts); otherwise the slot and the number.
  const call = labStands ? callWordKey(s.path, c) : undefined;
  if (call) return tr.t(call);
  // A lab's count ("Markers differing: at least 6"), likewise only where a lab stands behind it.
  const offer = labStands ? offerOf(c) : undefined;
  if (offer && offer.id !== 'call' && c.kind === 'range' && c.bound !== undefined)
    return tr.t(LINE_KEYS[offer.id], { n: c.bound });
  return claimRawWords(c, tr);
};

/** The limits of claims on a lab's genotype comparison or parentage check (SPEC 4.5, 11.12), said wherever they are offered or checked. */
export const MarkerLimits: React.FC = () => {
  const { t } = useT();
  return (
    <Box data-marker-limits="">
      <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
        {t('app.marker.limits.title')}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {(
          [
            'app.marker.limits.examine',
            'app.marker.limits.oneParty',
            'app.marker.limits.labWord',
            'app.marker.limits.meaning',
            'app.marker.limits.which',
            'app.marker.limits.later',
            'app.marker.limits.size',
            'app.marker.limits.opening',
          ] as const
        ).map((k) => (
          <Typography key={k} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t(k)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
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
  // A lab's genotype comparison or parentage check: only what its form offers (marker-claims.ts).
  const offers = held ? offersFor(held) : undefined;
  // Read when drawn: the panel is drawn again whenever its own record changes (a claim made).
  const all = allRecords();
  /** The bound filled in for an offer: the lab's count rounded away from itself. */
  const filledFor = (o: MarkerOffer | undefined): string =>
    o && o.how !== 'exactly' && held ? roundedBound(BigInt(held.values[o.slot] ?? '0'), o.how).toString() : '';
  const [offerId, setOfferId] = useState<MarkerOffer['id'] | undefined>(offers?.[0]?.id);
  const offer = offers?.find((o) => o.id === offerId) ?? offers?.[0];
  const [slotPicked, setSlot] = useState<number>(filled[0]?.slot ?? 0);
  const [howPicked, setHow] = useState<How>(initialHow);
  const slot = offer ? offer.slot : slotPicked;
  const how = offer ? offer.how : howPicked;
  // A record kept on this device only: "exactly" is asked for twice. Cleared by any change of what is proved.
  const [confirmedExact, setConfirmedExact] = useState(false);
  const [typed, setTyped] = useState(() => filledFor(offers?.[0]));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [made, setMade] = useState<MadeClaim>();
  const [copied, setCopied] = useState(false);
  if (!held || !schema || filled.length === 0 || (offers && offers.length === 0)) return null;

  const s = schema.slots.find((x) => x.slot === slot) ?? filled[0];
  const scale = s.scale ?? 1;
  const places = Math.round(Math.log10(scale));
  const sealed = BigInt(held.values[s.slot] ?? '0');
  const bound = how === 'exactly' ? sealed : storedNumber(typed, scale);
  const meets =
    bound !== undefined && (how === 'at-most' ? sealed <= bound : how === 'at-least' ? sealed >= bound : true);
  const earlier = offers ? [] : (record.claims ?? []).filter((c) => c.schema === held.schema && c.slot === s.slot);
  // On a marker panel, everything already public about this sample on that panel, any number, any result.
  const onPanel = offers ? panelClaims(record, all) : [];
  const exactOnPanel = onPanel.filter((p) => p.exact).length;
  const pairsOnPanel = callPairs(onPanel.map((p) => p.claim));
  // The lab's call and a count on this result, both public once this is proved (rule 3).
  const hereClaims = onPanel.filter((p) => p.here).map((p) => offerOf(p.claim));
  const pairWould = !!offer && (offer.count ? hereClaims.some((o) => o && !o.count) : hereClaims.some((o) => o?.count));
  const exactCount = !!offer?.count && bound !== undefined && bound === sealed;
  const rounded = !!offer?.count && typed !== '' && typed === filledFor(offer) && bound !== sealed;
  const callKey = offer && !offer.count ? callWordKey(s.path, { kind: 'value', value: sealed.toString() }) : undefined;
  const label = slotWords(s.path, tr);

  /** A number with its unit, when the slot has one ("12.50 m²", "120"). */
  const withUnit = (n: string) => (s.unit ? `${n} ${s.unit}` : n);
  // On a marker form, only what is offered and never "at least 0" (marker-claims.ts offerAllowed).
  const allowed = bound !== undefined && offerAllowed(held.schema, s.slot, how, how === 'exactly' ? undefined : bound);
  const ready = canProve({ deviceOnly, how, confirmedExact, boundOk: allowed, meets });

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
  const copy = async (c: MadeClaim, together: readonly MadeClaim[] = [c]) => {
    const one = withMore(together[0] ?? c, together.slice(1));
    const withLab: MadeClaim =
      lab && lab.contract === c.contract
        ? {
            ...one,
            attested: {
              txId: lab.txId,
              attester: lab.attester,
              ...(lab.about ? { about: lab.about } : {}),
              ...(lab.about && lab.bindingSalt ? { bindingSalt: lab.bindingSalt } : {}),
            },
          }
        : one;
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
      {!claimsReadyHere(CLAIMS_READY) ? (
        <Alert severity="info" variant="outlined" data-claims-not-ready="">
          {t('app.claim.notReady')}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {offers && (
            <TextField
              select
              label={t('app.claim.how')}
              value={offer?.id ?? ''}
              onChange={(e) => {
                const next = offers.find((o) => o.id === e.target.value);
                setOfferId(next?.id);
                setTyped(filledFor(next));
                setConfirmedExact(false);
              }}
              slotProps={{ htmlInput: { 'data-marker-offer': offer?.id } }}
            >
              {offers.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.id === 'call'
                    ? t('app.marker.offer.call', {
                        call: (() => {
                          const k = callWordKey(slotPath(held.schema, o.slot), {
                            kind: 'value',
                            value: held.values[o.slot] ?? '',
                          });
                          return k ? t(k) : '';
                        })(),
                      })
                    : t(OFFER_KEYS[o.id])}
                </MenuItem>
              ))}
            </TextField>
          )}
          {!offers && (
            <>
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
            </>
          )}
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
          {rounded && (
            <Typography variant="body2" color="text.secondary" data-marker-rounded="">
              {t(how === 'at-most' ? 'app.marker.rounded.up' : 'app.marker.rounded.down', {
                sealed: shownNumber(sealed, scale),
              })}
            </Typography>
          )}
          {exactCount && (
            <Alert severity="warning" variant="outlined" data-marker-exact="">
              {t(how === 'at-most' ? 'app.marker.exactWarn.atMost' : 'app.marker.exactWarn.atLeast')}
              {exactOnPanel > 0 && ` ${t('app.marker.exactRepeat', { n: String(exactOnPanel) })}`}
            </Alert>
          )}
          {pairWould && (
            <Alert severity="warning" variant="outlined" data-marker-pair="">
              {t('app.marker.pairWarn')}
            </Alert>
          )}
          {how === 'exactly' && callKey && (
            <Alert severity="info" variant="outlined" data-marker-call="">
              {t('app.marker.callPublish', { call: t(callKey) })}
            </Alert>
          )}
          {how === 'exactly' && !callKey && (
            <Alert severity="warning" variant="outlined">
              {t('app.claim.exactWarn', { label, value: shownNumber(sealed, scale), unit: s.unit ?? '' })}
            </Alert>
          )}
          {bound !== undefined && !meets && (
            <Alert severity="error" variant="outlined" data-claim-wont-meet="">
              {t('app.claim.wontMeet')}
            </Alert>
          )}
          {onPanel.length > 0 && (
            <Alert severity="info" variant="outlined" data-marker-panel={String(onPanel.length)}>
              {t('app.marker.panelAlready', {
                list: onPanel
                  .map((p) =>
                    t('app.marker.panelItem', {
                      claim: claimWords(p.claim, tr),
                      result: p.here
                        ? t('app.marker.thisResult')
                        : t('app.marker.resultNamed', { accession: p.accession ?? '', panel: p.panel ?? '' }),
                    }),
                  )
                  .join('; '),
              })}
              {exactOnPanel > 0 && !exactCount && ` ${t('app.marker.exactRepeat', { n: String(exactOnPanel) })}`}
              {pairsOnPanel > 0 && ` ${t('app.marker.pairsPublic', { n: String(pairsOnPanel) })}`}
            </Alert>
          )}
          {offers && <MarkerLimits />}
          {earlier.length > 0 && (
            <Alert severity="info" variant="outlined" data-claim-earlier="">
              {t('app.claim.already', { label, list: earlier.map((c) => claimWords(c, tr)).join('; ') })}
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
          {offers &&
            (() => {
              const claims = record.claims ?? [];
              const newest = claims[claims.length - 1];
              const together = newest ? linkClaims(newest, claims) : [];
              return together.length > 1 ? (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  data-marker-copy-all={String(together.length)}
                  onClick={() => void copy(newest, together)}
                >
                  {t('app.marker.copyAll', { n: String(together.length) })}
                </Button>
              ) : null;
            })()}
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
