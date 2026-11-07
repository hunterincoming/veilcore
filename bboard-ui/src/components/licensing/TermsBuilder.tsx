// TermsBuilder (/record/:id/license) — standalone terms builder. On save, the agreement
// is hashed locally and attached to the record (a plant, an animal or a strain) + its report
// fingerprint, then created as a Draft the breeder can issue.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import { getRecord, useRecords, useRecordsLoaded, type StrainRecord } from '../../veilcore/records';
import { isAnimal } from '../../veilcore/animal-profile';
import { isStrain } from '../../veilcore/strain-profile';
import { useT } from '../../i18n/app';
import { forKind, type RecordKind } from '../../i18n/translate';
import {
  subjectOf,
  sealAgreement,
  createLicense,
  renewLicense,
  getLicense,
  feeNote,
  hasVeilcoreFee,
  SHOW_VEILCORE_FEE,
  agreementLabel,
  agreementTagline,
  type AgreementType,
  type LicenseTerms,
  useAgreementsWaitForBackup,
} from '../../veilcore/licenses';
import { AgreementsBackupFirst } from './AgreementsBackupFirst';
import { AppHeader } from '../AppHeader';
import { AGREEMENTS_REAL } from '../../veilcore/agreements-real';
import { AgreementTermsFields, emptyTermsFor, type SetTerm } from './LicenseTermsFields';
import { AgreementTypeChip } from './AgreementTypeChip';
import {
  applyPreset,
  currencyForLocale,
  isCannabisRecord,
  lawForLocale,
  PRESETS_FOR,
  ruleOf,
  termsProblems,
  termsToSeal,
  unitDefinitionText,
  type PresetId,
} from '../../veilcore/royalty-terms';
import { LicenseTermsStep, MoneyTermsFields } from './RoyaltyTermsForm';
import type { AppKey } from '../../i18n/app/en';

/** The browser's own locale (navigator.language), for a first guess at currency and law. */
const browserLocale = (): string | undefined => {
  try {
    return typeof navigator === 'undefined' ? undefined : navigator.language;
  } catch {
    return undefined;
  }
};

/** A renewal of terms made before the royalty fields: the same deal, written out in them. */
const asNewTerms = (t: LicenseTerms, ctx: { currency: string; governingLaw: string }): LicenseTerms => {
  if (t.royalty) return t;
  const rule = ruleOf(t);
  const base = applyPreset('custom', t, { kind: subjectOf(t), ...ctx });
  // The same rule, written out (review round 1, 8): a fee per harvest or per unit sold stays one,
  // with its unit's own definition, rather than turning into an empty percent.
  if (rule?.kind === 'per-unit')
    return { ...base, royalty: { ...rule, unitDefinition: unitDefinitionText(rule.unit) } };
  if (rule?.kind === 'percent') return { ...base, royalty: { kind: 'percent', rate: rule.rate, base: 'gross' } };
  return base;
};

const isType = (v: string | null): v is AgreementType =>
  v === 'license' || v === 'lab-transfer' || v === 'breeder-share';

/**
 * The page opened straight on its address (a reload, a link): the records arrive after the
 * first render, so it re-renders with them and waits for the first load before saying the
 * record isn't here (final review, L1). The form itself starts only once the record is known,
 * so its first values (the licensor, the record's kind) are read from the record.
 */
export const TermsBuilder: React.FC = () => {
  const { id = '' } = useParams();
  useRecords();
  const loaded = useRecordsLoaded();
  const record = getRecord(id);
  const tr = forKind(useT(), 'plant');
  if (record) return <TermsBuilderFor key={record.id} record={record} />;
  if (!loaded)
    return (
      <Box>
        <AppHeader />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
          <CircularProgress size={20} />
          <Typography>{tr.t('app.lic.builder.loading')}</Typography>
        </Stack>
      </Box>
    );
  return (
    <Box>
      <AppHeader />
      <Typography sx={{ mb: 1 }}>{tr.t('app.lic.builder.notHere')}</Typography>
      <Button component={RouterLink} to="/records" startIcon={<ArrowBackIcon />}>
        {tr.t('app.lic.builder.records')}
      </Button>
    </Box>
  );
};

const TermsBuilderFor: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const [params] = useSearchParams();
  const supersedeId = params.get('supersede') ?? undefined;
  const navigate = useNavigate();
  const prior = supersedeId ? getLicense(supersedeId) : undefined;

  // When renewing, keep the prior agreement's type; otherwise take it from ?type= (the
  // action the user clicked), defaulting to a commercial license.
  const typeParam = params.get('type');
  const type: AgreementType = prior?.type ?? (isType(typeParam) ? typeParam : 'license');

  // What the record is about decides the words and the options (licenses.ts RIGHTS_FOR): a
  // plant is cultivated and propagated, an animal bred and its semen or embryos collected, a
  // strain used, subcultured and the source of derived strains.
  const kind: RecordKind = isAnimal(record) ? 'animal' : isStrain(record) ? 'strain' : 'plant';
  const tr = forKind(useT(), kind);
  const locale = browserLocale();
  const guess = { currency: currencyForLocale(locale), governingLaw: lawForLocale(locale, tr.locale) };
  const presets = PRESETS_FOR[kind];
  // A license is made from a preset (or Custom, the full form). A kind with only Custom opens on it.
  const [preset, setPreset] = useState<PresetId | undefined>(
    prior ? 'custom' : type === 'license' && presets.length === 1 ? 'custom' : undefined,
  );
  const [details, setDetails] = useState(Boolean(prior) || (type === 'license' && presets.length === 1));
  const [t, setT] = useState<LicenseTerms>(() => {
    const start = prior?.terms ?? emptyTermsFor(type, kind);
    const named = { ...start, licensor: start.licensor ?? record.bredBy ?? '' };
    if (type === 'breeder-share')
      return {
        ...named,
        currency: guess.currency,
        governingLaw: guess.governingLaw,
        reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
        bankFees: 'each-own',
        recordsYears: 3,
        checkNoticeDays: 30,
      };
    if (type !== 'license') return named;
    if (prior) return asNewTerms(named, guess);
    return presets.length === 1 ? applyPreset('custom', named, { kind, ...guess, tr }) : named;
  });
  const [busy, setBusy] = useState(false);
  const set: SetTerm = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const blocked = useAgreementsWaitForBackup();
  const cannabis = kind === 'plant' && isCannabisRecord(record);
  const pick = (id: PresetId) => {
    setPreset(id);
    setT((p) => applyPreset(id, p, { kind, ...guess, tr }));
    if (id === 'custom') setDetails(true);
  };

  // A breeder share with a royalty on offspring carries the same money terms as a license.
  const shareMoney = type === 'breeder-share' && (Number(t.offspringRoyaltyPct) || 0) > 0;
  const toSeal = (): LicenseTerms => {
    if (type === 'breeder-share' && !shareMoney) {
      // A free share keeps the shape it always had: none of the money terms.
      const {
        currency: _c,
        governingLaw: _g,
        reporting: _r,
        bankFees: _b,
        recordsYears: _y,
        checkNoticeDays: _n,
        fxSource: _f,
        disputes: _d,
        yearlyMinimum: _m,
        licensor: _l,
        ...rest
      } = t;
      void [_c, _g, _r, _b, _y, _n, _f, _d, _m, _l];
      return rest;
    }
    return termsToSeal(
      shareMoney
        ? { ...t, offspring: { rule: { kind: 'percent', rate: t.offspringRoyaltyPct ?? '', base: 'gross' } } }
        : t,
    );
  };
  // A commercial license needs its royalty and the money terms; the others just need a counterparty.
  const problems =
    type === 'license'
      ? preset
        ? termsProblems(t, { territoryRequired: cannabis })
        : ['preset']
      : shareMoney && !t.governingLaw?.trim()
        ? ['law']
        : t.licensee.trim()
          ? []
          : ['licensee'];
  const canSave = problems.length === 0;

  const onSave = async () => {
    if (!canSave || blocked) return;
    setBusy(true);
    try {
      // Presets are expanded already: what is sealed is every value, as shown (royalty-terms.ts).
      const terms = toSeal();
      const { agreementFingerprint, agreementSalt } = await sealAgreement(type, terms, record.recordFingerprint);
      const lic = supersedeId
        ? renewLicense(supersedeId, terms, agreementFingerprint, agreementSalt)
        : createLicense({
            type,
            recordId: record.id,
            recordFingerprint: record.recordFingerprint,
            dnaFingerprint: record.dnaFingerprint,
            terms,
            agreementFingerprint,
            agreementSalt,
          });
      if (lic) navigate(`/license/${lic.id}`);
    } finally {
      setBusy(false);
    }
  };

  const heading = supersedeId
    ? tr.t('app.lic.builder.renewHeading', { type: agreementLabel(type, tr) })
    : agreementLabel(type, tr);
  const saveLabel = tr.t(
    busy ? 'app.lic.builder.saving' : supersedeId ? 'app.lic.builder.saveAmended' : 'app.lic.builder.saveDraft',
  );

  return (
    <Box>
      <AppHeader />
      <AgreementsBackupFirst />
      <Button
        component={RouterLink}
        to={`/record/${record.id}`}
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        {tr.t('app.lic.builder.back', { name: record.strainName })}
      </Button>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="h4">{heading}</Typography>
        <AgreementTypeChip type={type} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {agreementTagline(type, tr)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {tr.t('app.lic.builder.intro', { name: record.strainName })}
        {!AGREEMENTS_REAL && ` ${tr.t('app.copy.agreementsSimulated')}`}
      </Typography>
      {type === 'license' && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: -2, mb: 3 }}
          data-evidence-note=""
        >
          {tr.t('app.lic.evidenceNote')}
        </Typography>
      )}

      {type === 'license' ? (
        <Stack spacing={2.5}>
          <LicenseTermsStep
            kind={kind}
            terms={t}
            set={set}
            preset={preset}
            onPick={!prior && presets.length > 1 ? pick : undefined}
            details={details}
            setDetails={setDetails}
            cannabis={cannabis}
          />
        </Stack>
      ) : (
        <AgreementTermsFields type={type} terms={t} set={set} />
      )}
      {shareMoney && (
        <Stack spacing={2} sx={{ mt: 3 }} data-share-money="">
          <Typography variant="overline">{tr.t('app.roy.f.moneyTitle')}</Typography>
          <MoneyTermsFields terms={t} set={set} tr={tr} />
        </Stack>
      )}

      {SHOW_VEILCORE_FEE && hasVeilcoreFee(type, t) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {feeNote(tr)}
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />
      {problems.length > 0 && preset && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }} data-still-needed="">
          {tr.t('app.roy.f.missing', {
            what: problems.map((p) => tr.t(`app.roy.f.need.${p}` as AppKey)).join(', '),
          })}
        </Alert>
      )}
      <Box>
        <Button variant="contained" size="large" disabled={busy || !canSave || blocked} onClick={onSave}>
          {saveLabel}
        </Button>
      </Box>
    </Box>
  );
};
