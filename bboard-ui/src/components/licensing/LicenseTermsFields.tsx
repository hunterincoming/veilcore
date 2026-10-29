// LicenseTermsFields — the plain-language terms form, shared by the standalone terms
// builder route and the in-wizard licensing step.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import {
  BASES_FOR,
  RIGHTS_FOR,
  subjectOf,
  type AgreementType,
  type LicenseTerms,
  type Rights,
  type UnitBasis,
} from '../../veilcore/licenses';
import { useT } from '../../i18n/app';
import { forKind, type RecordKind } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

export type SetTerm = <K extends keyof LicenseTerms>(k: K, v: LicenseTerms[K]) => void;

/** Renders the right term fields for the chosen agreement type. */
export const AgreementTermsFields: React.FC<{ type: AgreementType; terms: LicenseTerms; set: SetTerm }> = ({
  type,
  terms,
  set,
}) => {
  if (type === 'lab-transfer') return <LabTransferFields terms={terms} set={set} />;
  if (type === 'breeder-share') return <BreederShareFields terms={terms} set={set} />;
  return <LicenseTermsFields terms={terms} set={set} />;
};

// The plant options keep the words they always had; the others read app.lic.f.r.<right>.
const RIGHT_OPTION: Partial<Record<Rights, AppKey>> = {
  cultivate: 'app.lic.f.r.cultivate',
  'cultivate+propagate': 'app.lic.f.r.propagate',
  'full-transfer': 'app.lic.f.r.full',
};
const BASIS_OPTION: Record<UnitBasis, AppKey> = {
  'per-plant': 'app.lic.f.b.plant',
  'per-harvest': 'app.lic.f.b.harvest',
  'per-dose': 'app.lic.f.b.dose',
  'per-offspring': 'app.lic.f.b.offspring',
  'per-batch': 'app.lic.f.b.batch',
  'per-unit-sold': 'app.lic.f.b.unit',
};
export const rightOptionKey = (r: Rights): AppKey => RIGHT_OPTION[r] ?? (`app.lic.f.r.${r}` as AppKey);
export const basisOptionKey = (b: UnitBasis): AppKey => BASIS_OPTION[b];

export const LicenseTermsFields: React.FC<{ terms: LicenseTerms; set: SetTerm }> = ({ terms: t, set }) => {
  // The terms say what the record is about (subject), so the form, the licensee's page and the
  // certificate all use that kind's words: breeding and doses for an animal, use and batches
  // for a strain.
  const kind: RecordKind = subjectOf(t);
  const tr = forKind(useT(), kind);
  // A saved value this kind doesn't list (an old draft) stays selectable rather than vanishing.
  const rights = RIGHTS_FOR[kind].includes(t.rights) ? RIGHTS_FOR[kind] : [...RIGHTS_FOR[kind], t.rights];
  const bases = BASES_FOR[kind].includes(t.unitBasis) ? BASES_FOR[kind] : [...BASES_FOR[kind], t.unitBasis];
  return (
    <Stack spacing={2.5}>
      <TextField
        label={tr.t('app.lic.f.licensee')}
        helperText={tr.t('app.lic.f.licenseeHelp')}
        value={t.licensee}
        onChange={(e) => set('licensee', e.target.value)}
        fullWidth
      />
      <TextField
        select
        label={tr.t('app.lic.f.rights')}
        helperText={tr.t('app.lic.f.rightsHelp')}
        value={t.rights}
        onChange={(e) => set('rights', e.target.value as LicenseTerms['rights'])}
        fullWidth
      >
        {rights.map((r) => (
          <MenuItem key={r} value={r}>
            {tr.t(rightOptionKey(r))}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={tr.t('app.lic.f.territory')}
        placeholder={tr.t('app.lic.f.territoryPh')}
        helperText={tr.t('app.lic.f.territoryHelp')}
        value={t.territory}
        onChange={(e) => set('territory', e.target.value)}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={tr.t('app.lic.f.start')}
          type="date"
          value={t.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={tr.t('app.lic.f.end')}
          type="date"
          helperText={tr.t('app.lic.f.endHelp')}
          value={t.endDate}
          onChange={(e) => set('endDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={tr.t('app.lic.f.royaltyType')}
          value={t.royaltyType}
          onChange={(e) => set('royaltyType', e.target.value as LicenseTerms['royaltyType'])}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="percent">{tr.t('app.lic.f.percent')}</MenuItem>
          <MenuItem value="flat">{tr.t('app.lic.f.flat')}</MenuItem>
        </TextField>
        <TextField
          label={t.royaltyType === 'percent' ? tr.t('app.lic.f.royaltyPct') : tr.t('app.lic.f.flatFee')}
          helperText={t.royaltyType === 'percent' ? tr.t('app.lic.f.pctHelp') : tr.t('app.lic.f.flatHelp')}
          value={t.royaltyAmount}
          onChange={(e) => set('royaltyAmount', e.target.value)}
          fullWidth
        />
        <TextField
          select
          label={tr.t('app.lic.f.basis')}
          helperText={tr.t('app.lic.f.basisHelp')}
          value={t.unitBasis}
          onChange={(e) => set('unitBasis', e.target.value as LicenseTerms['unitBasis'])}
          sx={{ minWidth: 180 }}
        >
          {bases.map((b) => (
            <MenuItem key={b} value={b}>
              {tr.t(basisOptionKey(b))}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label={tr.t('app.lic.f.offspring')}
          helperText={tr.t('app.lic.f.offspringHelp')}
          value={t.offspringRoyaltyPct ?? ''}
          onChange={(e) => set('offspringRoyaltyPct', e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Stack>
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Switch checked={t.sublicensable} onChange={(e) => set('sublicensable', e.target.checked)} />}
          label={tr.t('app.lic.f.sublicense')}
        />
        <FormControlLabel
          control={<Switch checked={t.exclusive} onChange={(e) => set('exclusive', e.target.checked)} />}
          label={tr.t('app.lic.f.exclusive')}
        />
      </Stack>
      <TextField
        label={tr.t('app.lic.f.extra')}
        helperText={tr.t('app.lic.f.extraHelpDeal')}
        value={t.extraTerms}
        onChange={(e) => set('extraTerms', e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
    </Stack>
  );
};

export const emptyTerms = (): LicenseTerms => {
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return {
    licensee: '',
    rights: 'cultivate',
    territory: '',
    startDate: today,
    endDate: d.toISOString().slice(0, 10),
    royaltyType: 'percent',
    royaltyAmount: '',
    unitBasis: 'per-unit-sold',
    offspringRoyaltyPct: '',
    sublicensable: false,
    exclusive: false,
    extraTerms: '',
  };
};

/** The royalty basis a new license on this kind of record starts with. */
const FIRST_BASIS: Record<RecordKind, UnitBasis> = {
  plant: 'per-unit-sold',
  animal: 'per-dose',
  strain: 'per-batch',
};

/**
 * Blank terms seeded with sensible defaults for the chosen agreement type and what the record
 * is about. A plant's terms carry no subject, so they are exactly what they were before.
 */
export const emptyTermsFor = (type: AgreementType, kind: RecordKind = 'plant'): LicenseTerms => {
  const base: LicenseTerms = {
    ...emptyTerms(),
    rights: RIGHTS_FOR[kind][0],
    unitBasis: FIRST_BASIS[kind],
    ...(kind === 'plant' ? {} : { subject: kind }),
  };
  if (type === 'lab-transfer') {
    return {
      ...base,
      labPurpose: 'tissue-culture',
      noPropagationBeyondPurpose: true,
      onCompletion: 'return',
      confidentiality: true,
    };
  }
  if (type === 'breeder-share') {
    return { ...base, mayBreed: true, mayDistribute: false, attributionRequired: true, offspringRoyaltyPct: '' };
  }
  return base;
};

// ---- Lab transfer: custody, not commerce. No royalty, no VeilCore fee. ----
export const LabTransferFields: React.FC<{ terms: LicenseTerms; set: SetTerm }> = ({ terms: t, set }) => {
  const tr = useT();
  return (
    <Stack spacing={2.5}>
      <TextField
        label={tr.t('app.lic.f.lab')}
        helperText={tr.t('app.lic.f.labHelp')}
        value={t.licensee}
        onChange={(e) => set('licensee', e.target.value)}
        fullWidth
      />
      <TextField
        select
        label={tr.t('app.lic.f.purpose')}
        helperText={tr.t('app.lic.f.purposeHelp')}
        value={t.labPurpose ?? 'tissue-culture'}
        onChange={(e) => set('labPurpose', e.target.value as LicenseTerms['labPurpose'])}
        fullWidth
      >
        <MenuItem value="tissue-culture">{tr.t('app.lic.purpose.tissue-culture')}</MenuItem>
        <MenuItem value="propagation">{tr.t('app.lic.purpose.propagation')}</MenuItem>
        <MenuItem value="dna-testing">{tr.t('app.lic.purpose.dna-testing')}</MenuItem>
        <MenuItem value="storage">{tr.t('app.lic.purpose.storage')}</MenuItem>
      </TextField>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={tr.t('app.lic.f.start')}
          type="date"
          value={t.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={tr.t('app.lic.f.end')}
          type="date"
          helperText={tr.t('app.lic.f.custodyEnd')}
          value={t.endDate}
          onChange={(e) => set('endDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <TextField
        select
        label={tr.t('app.lic.f.onCompletion')}
        helperText={tr.t('app.lic.f.onCompletionHelp')}
        value={t.onCompletion ?? 'return'}
        onChange={(e) => set('onCompletion', e.target.value as LicenseTerms['onCompletion'])}
        fullWidth
      >
        <MenuItem value="return">{tr.t('app.lic.f.returnIt')}</MenuItem>
        <MenuItem value="destroy">{tr.t('app.lic.f.destroyIt')}</MenuItem>
      </TextField>
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={t.noPropagationBeyondPurpose ?? true}
              onChange={(e) => set('noPropagationBeyondPurpose', e.target.checked)}
            />
          }
          label={tr.t('app.lic.f.noPropagation')}
        />
        <FormControlLabel
          control={
            <Switch checked={t.confidentiality ?? true} onChange={(e) => set('confidentiality', e.target.checked)} />
          }
          label={tr.t('app.lic.f.confidential')}
        />
      </Stack>
      <TextField
        label={tr.t('app.lic.f.extra')}
        helperText={tr.t('app.lic.f.extraHelpTransfer')}
        value={t.extraTerms}
        onChange={(e) => set('extraTerms', e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
    </Stack>
  );
};

// ---- Breeder share: sharing material with another breeder. ----
export const BreederShareFields: React.FC<{ terms: LicenseTerms; set: SetTerm }> = ({ terms: t, set }) => {
  const tr = useT();
  return (
    <Stack spacing={2.5}>
      <TextField
        label={tr.t('app.lic.f.breeder')}
        helperText={tr.t('app.lic.f.breederHelp')}
        value={t.licensee}
        onChange={(e) => set('licensee', e.target.value)}
        fullWidth
      />
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Switch checked={t.mayBreed ?? false} onChange={(e) => set('mayBreed', e.target.checked)} />}
          label={tr.t('app.lic.f.mayBreed')}
        />
        <FormControlLabel
          control={
            <Switch checked={t.mayDistribute ?? false} onChange={(e) => set('mayDistribute', e.target.checked)} />
          }
          label={tr.t('app.lic.f.mayDistribute')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={t.attributionRequired ?? true}
              onChange={(e) => set('attributionRequired', e.target.checked)}
            />
          }
          label={tr.t('app.lic.f.attribution')}
        />
      </Stack>
      <TextField
        label={tr.t('app.lic.f.offspring')}
        helperText={tr.t('app.lic.f.shareOffspringHelp')}
        value={t.offspringRoyaltyPct ?? ''}
        onChange={(e) => set('offspringRoyaltyPct', e.target.value)}
        sx={{ maxWidth: 260 }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={tr.t('app.lic.f.start')}
          type="date"
          value={t.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={tr.t('app.lic.f.end')}
          type="date"
          value={t.endDate}
          onChange={(e) => set('endDate', e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <TextField
        label={tr.t('app.lic.f.extra')}
        helperText={tr.t('app.lic.f.extraHelpShare')}
        value={t.extraTerms}
        onChange={(e) => set('extraTerms', e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
    </Stack>
  );
};
