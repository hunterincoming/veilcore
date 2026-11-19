// "Pack for REPROCANN / SEDRONAR" (/records/authority-pack): the form an association's officer
// fills, and the pack it makes (veilcore/authority-pack.ts), drawn below it, ready to print or
// save as a PDF from the browser's own print window. The site makes no file of its own: the
// browser's PDF keeps the check links clickable, and nothing new is added to the site's bundle.
//
// What the officer types stays in this page's state: never saved, never sent. The look-ups
// (each record's proof, its anchor on Midnight, a lab's signature) are given the records only
// (authority-pack-gather.ts), so the number of linked patients can't be in any request.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  GlobalStyles,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { AppHeader } from '../AppHeader';
import { useT, loadAppStrings } from '../../i18n/app';
import { appEn } from '../../i18n/app/en';
import { makeTranslator, type AppDict, type Translator } from '../../i18n/translate';
import { LANGUAGE_CODES, type Lang } from '../../config/languages';
import { isKeptOnDeviceOnly, lockedRecords, useRecords, type StrainRecord } from '../../veilcore/records';
import {
  batchSums,
  buildPack,
  localDay,
  isDay,
  lastSixMonths,
  packRecords,
  permitYear,
  selectPack,
  type AuthorityPack,
  type PackForm,
  type PackPeriod,
} from '../../veilcore/authority-pack';
import { PackDocument, PACK_PRINT_STYLES } from './PackDocument';

type PeriodKind = 'six' | 'permit' | 'other';

/** Today on the officer's own calendar: the same calendar a record's day is read on (authority-pack.ts dayOf). */
const today = (): string => localDay(Date.now());

/** A typed whole number, undefined when empty, NaN when it isn't one. */
const typedNumber = (s: string): number | undefined => {
  const t = s.trim();
  if (!t) return undefined;
  return /^\d{1,7}$/.test(t) ? Number(t) : NaN;
};

const LANG_NAMES: Record<Lang, string> = { es: 'Español', en: 'English', de: 'Deutsch', fr: 'Français', ja: '日本語' };

/** The app's words in the pack's language, which may differ from the screen's. */
const usePackT = (lang: Lang): Translator | undefined => {
  const [tr, setTr] = useState<Translator>();
  useEffect(() => {
    let live = true;
    setTr(undefined);
    const load: Promise<AppDict> = lang === 'en' ? Promise.resolve(appEn as AppDict) : loadAppStrings(lang);
    void load.catch(() => appEn as AppDict).then((dict) => live && setTr(makeTranslator(lang, dict)));
    return () => {
      live = false;
    };
  }, [lang]);
  return tr;
};

/** The look-ups, loaded only when the officer makes a pack. */
const gather = async (selection: ReturnType<typeof selectPack>, packLang: Lang, tr: Translator) => {
  const [
    { gatherPackFacts },
    { recordProof },
    { lookUpAnchor },
    { documentCheckLink },
    { verifyPath, nameLinkParams },
    { isDocument },
  ] = await Promise.all([
    import('../../veilcore/authority-pack-gather'),
    import('../verify/useAnchorCheck'),
    import('../../veilcore/chain/anchor-lookup'),
    import('../../veilcore/document-link'),
    import('../../veilcore/verify-link'),
    import('../../veilcore/document-profile'),
  ]);
  const origin = window.location.origin;
  const langParam: Record<string, string> = packLang === 'en' ? {} : { lang: packLang };
  return gatherPackFacts(selection, {
    proof: (fp) => recordProof(fp),
    anchor: (proof) => lookUpAnchor(proof),
    deviceOnly: (r) => isKeptOnDeviceOnly(r),
    link: (r) => {
      if (!/^[0-9a-f]{64}$/.test(r.recordFingerprint ?? '')) return undefined;
      try {
        return isDocument(r)
          ? documentCheckLink(r as never, origin, packLang)
          : `${origin}${verifyPath(r.id, r.recordFingerprint, { ...nameLinkParams(r), ...langParam })}`;
      } catch {
        return undefined;
      }
    },
    // The same look-up as the document page's lab panel (DocumentDetail.tsx, LabSignaturePanel.tsx).
    lab: async (r: StrainRecord) => {
      const sig = r.labSignature;
      if (!sig || !r.fieldSet) return { verdict: undefined, signer: '' };
      const [
        { labSignatureChecks, keyFromHex },
        { claimMaterial, commitmentHex },
        { attestationsFor, signerLabel },
        { findBinding },
      ] = await Promise.all([
        import('../../veilcore/lab-attest'),
        import('../../veilcore/claims-input'),
        import('../../veilcore/attesters'),
        import('../../veilcore/claims-key'),
      ]);
      const m = await claimMaterial(r as never);
      const ok = labSignatureChecks(sig, commitmentHex(m));
      const key = keyFromHex(sig.key);
      const salt = r.labResult?.statement.bindingSalt;
      if (!ok || !key || !sig.about) return { verdict: { ok, lab: { ok, signer: { kind: 'none' } } }, signer: '' };
      const [list, aboutList] = await Promise.all([
        attestationsFor(sig.record, { claimsKeyBindings: true, asHolder: true }),
        attestationsFor(sig.about, { asHolder: true }),
      ]);
      const signer = findBinding(list, sig.record, key, sig.about, aboutList, salt);
      return {
        verdict: { ok, lab: { ok, signer } },
        signer: signer.kind === 'bound' ? signerLabel(signer.attestation, 'Signed by', Date.now(), tr).text : '',
      };
    },
  });
};

export const AuthorityPackPage: React.FC = () => {
  const { t } = useT();
  const records = useRecords();
  const [kind, setKind] = useState<PeriodKind>('six');
  const [permitStart, setPermitStart] = useState('');
  const [from, setFrom] = useState(() => lastSixMonths(today()).from);
  const [to, setTo] = useState(today);
  const [association, setAssociation] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [plants, setPlants] = useState('');
  const [inFlower, setInFlower] = useState('');
  const [patients, setPatients] = useState('');
  const [packLang, setPackLang] = useState<Lang>('es');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pack, setPack] = useState<AuthorityPack>();
  const packT = usePackT(packLang);

  // A pack is a snapshot of the form: any change takes it away until it is made again.
  const changed =
    <A,>(f: (v: A) => void) =>
    (v: A) => {
      f(v);
      setPack(undefined);
    };

  const period: PackPeriod | undefined =
    kind === 'six'
      ? lastSixMonths(today())
      : kind === 'permit'
        ? isDay(permitStart)
          ? permitYear(permitStart)
          : undefined
        : isDay(from) && isDay(to) && from <= to
          ? { from, to }
          : undefined;
  const [pFrom, pTo] = [period?.from, period?.to];
  const selection = useMemo(
    () => (pFrom && pTo ? selectPack(records, { from: pFrom, to: pTo }) : undefined),
    [records, pFrom, pTo],
  );
  const sums = selection ? batchSums(selection) : undefined;
  const numbers = { plants: typedNumber(plants), inFlower: typedNumber(inFlower), patients: typedNumber(patients) };
  const bad = (n: number | undefined) => n !== undefined && Number.isNaN(n);
  const ready = !!period && !!packT && !bad(numbers.plants) && !bad(numbers.inFlower) && !bad(numbers.patients);
  // Only the VeilCore records the pack covers: what it names, what its links carry, what it counts.
  const inPack = selection ? packRecords(selection) : [];

  // The PDF's file name is the page's title: the period, not "Your records".
  useEffect(() => {
    if (!pack) return;
    const before = document.title;
    document.title = `REPROCANN ${pack.selection.period.from} – ${pack.selection.period.to}`;
    return () => {
      document.title = before;
    };
  }, [pack]);

  const make = async () => {
    if (!ready || !selection || !packT || busy) return;
    setBusy(true);
    setError(undefined);
    setPack(undefined);
    try {
      const facts = await gather(selection, packLang, packT);
      const form: PackForm = {
        ...(numbers.plants !== undefined ? { plants: numbers.plants } : {}),
        ...(numbers.inFlower !== undefined ? { inFlower: numbers.inFlower } : {}),
        ...(numbers.patients !== undefined ? { patients: numbers.patients } : {}),
        ...(association.trim() ? { association: association.trim() } : {}),
        ...(preparedBy.trim() ? { preparedBy: preparedBy.trim() } : {}),
      };
      setPack(buildPack(selection, facts, form, { madeAt: new Date(), locked: lockedRecords().length }));
    } catch (e) {
      setError(t('app.pack.form.failed', { reason: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }} data-authority-pack-page="">
      <GlobalStyles styles={PACK_PRINT_STYLES} />
      <Box data-no-print="">
        <AppHeader />
        <Button
          component={RouterLink}
          to="/records"
          startIcon={<HomeIcon />}
          sx={{ mb: 1.5, ml: -1.5, minHeight: 44, px: 1.5 }}
        >
          {t('app.plant.home')}
        </Button>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              {t('app.pack.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('app.pack.intro')}
            </Typography>
          </Box>
          <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-pack-form="">
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }} id="pack-period">
                  {t('app.pack.form.period')}
                </Typography>
                <RadioGroup
                  aria-labelledby="pack-period"
                  value={kind}
                  onChange={(e) => changed(setKind)(e.target.value as PeriodKind)}
                >
                  <FormControlLabel value="six" control={<Radio />} label={t('app.pack.form.periodSix')} />
                  <FormControlLabel value="permit" control={<Radio />} label={t('app.pack.form.periodPermit')} />
                  <FormControlLabel value="other" control={<Radio />} label={t('app.pack.form.periodOther')} />
                </RadioGroup>
                {kind === 'permit' && (
                  <TextField
                    type="date"
                    label={t('app.pack.form.permitStart')}
                    value={permitStart}
                    onChange={(e) => changed(setPermitStart)(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'data-permit-start': '' } }}
                    sx={{ mt: 1 }}
                    fullWidth
                  />
                )}
                {kind === 'other' && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }}>
                    <TextField
                      type="date"
                      label={t('app.pack.form.from')}
                      value={from}
                      onChange={(e) => changed(setFrom)(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'data-period-from': '' } }}
                      fullWidth
                    />
                    <TextField
                      type="date"
                      label={t('app.pack.form.to')}
                      value={to}
                      onChange={(e) => changed(setTo)(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'data-period-to': '' } }}
                      fullWidth
                    />
                  </Stack>
                )}
                {kind === 'other' && isDay(from) && isDay(to) && from > to && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {t('app.pack.form.badPeriod')}
                  </Typography>
                )}
                {period && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-pack-period="">
                    {period.from} – {period.to}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('app.pack.form.countsTitle')}
                </Typography>
                {/* The officer declares both figures. The batches' sums are a hint beside the boxes,
                    never put in them: a sum of sealed batches is not an inventory. */}
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t('app.pack.form.countsHelp')}
                </Typography>
                {sums && (
                  <Box sx={{ mb: 1.5 }} data-pack-counts-preview="">
                    {sums.plants === undefined && sums.inFlower === undefined ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('app.pack.form.sumsNone')}
                      </Typography>
                    ) : (
                      <>
                        {sums.plants !== undefined && (
                          <Typography variant="body2" color="text.secondary" data-pack-sum="plants">
                            {t('app.pack.form.sumsPlants', {
                              plants: sums.plants,
                              counted: sums.plantsCounted,
                              batches: sums.batches,
                            })}
                          </Typography>
                        )}
                        {sums.inFlower !== undefined && (
                          <Typography variant="body2" color="text.secondary" data-pack-sum="inFlower">
                            {t('app.pack.form.sumsFlower', {
                              inFlower: sums.inFlower,
                              counted: sums.inFlowerCounted,
                              batches: sums.batches,
                            })}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label={t('app.pack.form.plants')}
                    value={plants}
                    onChange={(e) => changed(setPlants)(e.target.value)}
                    error={bad(numbers.plants)}
                    helperText={bad(numbers.plants) ? t('app.pack.form.badNumber') : undefined}
                    slotProps={{ htmlInput: { inputMode: 'numeric', 'data-pack-plants': '' } }}
                    fullWidth
                  />
                  <TextField
                    label={t('app.pack.form.inFlower')}
                    value={inFlower}
                    onChange={(e) => changed(setInFlower)(e.target.value)}
                    error={bad(numbers.inFlower)}
                    helperText={bad(numbers.inFlower) ? t('app.pack.form.badNumber') : undefined}
                    slotProps={{ htmlInput: { inputMode: 'numeric', 'data-pack-in-flower': '' } }}
                    fullWidth
                  />
                </Stack>
              </Box>

              <TextField
                label={t('app.pack.form.patients')}
                value={patients}
                onChange={(e) => changed(setPatients)(e.target.value)}
                error={bad(numbers.patients)}
                helperText={bad(numbers.patients) ? t('app.pack.form.badNumber') : t('app.pack.form.patientsHelp')}
                // Never kept by the browser either: no autofill history for this box.
                slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', 'data-pack-patients': '' } }}
                fullWidth
              />
              <TextField
                label={t('app.pack.form.association')}
                value={association}
                onChange={(e) => changed(setAssociation)(e.target.value.slice(0, 200))}
                fullWidth
              />
              <TextField
                label={t('app.pack.form.preparedBy')}
                value={preparedBy}
                onChange={(e) => changed(setPreparedBy)(e.target.value.slice(0, 200))}
                fullWidth
              />
              <TextField
                select
                label={t('app.pack.form.lang')}
                value={packLang}
                onChange={(e) => changed(setPackLang)(e.target.value as Lang)}
                slotProps={{ htmlInput: { 'data-pack-lang': '' } }}
                fullWidth
              >
                {(['es', ...LANGUAGE_CODES.filter((l) => l !== 'es')] as Lang[]).map((l) => (
                  <MenuItem key={l} value={l} lang={l}>
                    {LANG_NAMES[l]}
                  </MenuItem>
                ))}
              </TextField>

              {selection && !selection.batches.length && !selection.lots.length && (
                <Alert severity="info" variant="outlined" data-pack-empty="">
                  {t('app.pack.form.none')}
                </Alert>
              )}
              {inPack.length > 0 && (
                <Alert severity="warning" variant="outlined" data-pack-links-warn="">
                  {t('app.pack.form.linksWarn', {
                    list: inPack
                      .map(
                        (r) =>
                          `${r.strainName || r.id}${isKeptOnDeviceOnly(r) ? ` (${t('app.doc.local.homeLine')})` : ''}`,
                      )
                      .join(' · '),
                  })}
                  {inPack.some((r) => isKeptOnDeviceOnly(r)) && (
                    <Box component="span" sx={{ display: 'block', mt: 1 }}>
                      {t('app.pack.form.linksLocal')}
                    </Box>
                  )}
                </Alert>
              )}
              <Button
                variant="contained"
                size="large"
                onClick={() => void make()}
                disabled={!ready || busy}
                sx={{ py: 1.4 }}
                data-pack-make=""
              >
                {t('app.pack.form.make')}
              </Button>
              {busy && (
                <Box role="status">
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {t('app.pack.form.making')}
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
              {error && (
                <Alert severity="error" variant="outlined">
                  {error}
                </Alert>
              )}
            </Stack>
          </Paper>
          {pack && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <Button variant="contained" onClick={() => window.print()} sx={{ minHeight: 44 }} data-pack-print="">
                {t('app.pack.form.print')}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {t('app.pack.form.printHelp')}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>
      {pack && packT && (
        <Box sx={{ mt: 2.5 }} lang={packLang}>
          <PackDocument pack={pack} tr={packT} />
        </Box>
      )}
    </Box>
  );
};
