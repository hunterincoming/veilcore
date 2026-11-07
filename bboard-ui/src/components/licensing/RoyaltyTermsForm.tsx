// The royalty terms form (royalty-terms.ts): presets first, then the full form behind "Edit
// details". Phone-first: one column, big targets, the common case in three taps (a preset, the
// amount, a look at the governing law filled in from the browser).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { RIGHTS_FOR, subjectOf, type LicenseTerms } from '../../veilcore/licenses';
import {
  DEDUCTIONS,
  PERIODS,
  PRESETS_FOR,
  UNITS_FOR,
  periodLabel,
  termsSentence,
  unitDefinitionText,
  unitLabel,
  type BankFees,
  type PresetId,
  type RoyaltyRule,
  type RoyaltyUnit,
} from '../../veilcore/royalty-terms';
import { useT } from '../../i18n/app';
import { forKind, labelOr, type RecordKind, type Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import { rightOptionKey, type SetTerm } from './LicenseTermsFields';
import { ONCHAIN_PAYMENTS } from '../../config/copy';
import { ONCHAIN_TOKENS } from '../../veilcore/onchain-pay';

/** Common currencies first; any ISO code can be typed in the full form. */
export const CURRENCIES = [
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'CAD',
  'AUD',
  'CHF',
  'MXN',
  'BRL',
  'ARS',
  'COP',
  'UYU',
  'ZAR',
  'THB',
  // On the test network a deal can be in a Midnight token, paid from a wallet (OnChainPay.tsx).
  ...(ONCHAIN_PAYMENTS ? ONCHAIN_TOKENS.map((t) => t.code) : []),
];

const numeric = (s: string, max = 16) => s.replace(/[^0-9.]/g, '').slice(0, max);
const intOf = (s: string): number | undefined => {
  const n = parseInt(s.replace(/[^0-9]/g, '').slice(0, 4), 10);
  return Number.isFinite(n) ? n : undefined;
};

/** The preset buttons: each fills explicit terms (royalty-terms.ts applyPreset). */
export const PresetPicker: React.FC<{
  kind: RecordKind;
  picked?: PresetId;
  onPick: (id: PresetId) => void;
}> = ({ kind, picked, onPick }) => {
  const tr = forKind(useT(), kind);
  return (
    <Box data-presets="">
      <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
        {tr.t('app.roy.p.title')}
      </Typography>
      <Box
        role="radiogroup"
        aria-label={tr.t('app.roy.p.title')}
        sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}
      >
        {PRESETS_FOR[kind].map((id) => (
          <ButtonBase
            key={id}
            role="radio"
            aria-checked={picked === id}
            data-preset={id}
            onClick={() => onPick(id)}
            sx={{
              display: 'block',
              textAlign: 'left',
              borderRadius: 2,
              border: 2,
              borderColor: picked === id ? 'primary.main' : 'divider',
              bgcolor: picked === id ? 'action.selected' : 'background.paper',
              p: 1.75,
              minHeight: 64,
            }}
          >
            <Typography variant="subtitle2">{tr.t(`app.roy.p.${id}` as AppKey)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {tr.t(`app.roy.p.${id}Help` as AppKey)}
            </Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
};

/** The one field a preset leaves: the rate or the amount per unit. */
export const AmountField: React.FC<{ terms: LicenseTerms; set: SetTerm; tr: Translator; autoFocus?: boolean }> = ({
  terms: t,
  set,
  tr,
  autoFocus,
}) => {
  const r = t.royalty;
  if (!r) return null;
  const currency = t.currency ?? '';
  return r.kind === 'percent' ? (
    <TextField
      label={tr.t('app.roy.f.amountPct')}
      value={r.rate}
      onChange={(e) => set('royalty', { ...r, rate: numeric(e.target.value, 8) })}
      autoFocus={autoFocus}
      fullWidth
      slotProps={{
        htmlInput: { inputMode: 'decimal', 'data-amount': '' },
        input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
      }}
    />
  ) : (
    <TextField
      label={tr.t('app.roy.f.amountUnit', { unit: unitLabel(r.unit, tr), currency })}
      value={r.amount}
      onChange={(e) => set('royalty', { ...r, amount: numeric(e.target.value) })}
      autoFocus={autoFocus}
      fullWidth
      slotProps={{
        htmlInput: { inputMode: 'decimal', 'data-amount': '' },
        input: { endAdornment: <InputAdornment position="end">{currency}</InputAdornment> },
      }}
    />
  );
};

/** The deal in one paragraph, every value in it. */
export const TermsSummaryLine: React.FC<{ terms: LicenseTerms; kind: RecordKind }> = ({ terms, kind }) => {
  const tr = forKind(useT(), kind);
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-terms-sentence="">
      <Typography variant="overline" sx={{ display: 'block' }}>
        {tr.t('app.roy.f.summary')}
      </Typography>
      <Typography variant="body2">{termsSentence(terms, tr)}</Typography>
    </Paper>
  );
};

const RuleFields: React.FC<{
  rule: RoyaltyRule;
  onChange: (r: RoyaltyRule) => void;
  kind: RecordKind;
  currency: string;
  tr: Translator;
}> = ({ rule: r, onChange, kind, currency, tr }) => {
  const units = UNITS_FOR[kind].includes(r.kind === 'per-unit' ? r.unit : 'batch')
    ? UNITS_FOR[kind]
    : [...UNITS_FOR[kind], ...(r.kind === 'per-unit' ? [r.unit] : [])];
  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={r.kind}
        onChange={(_, v: 'percent' | 'per-unit' | null) => {
          if (!v || v === r.kind) return;
          const unit = UNITS_FOR[kind][0];
          onChange(
            v === 'percent'
              ? { kind: 'percent', rate: '', base: 'gross' }
              : { kind: 'per-unit', amount: '', unit, unitDefinition: unitDefinitionText(unit, tr) },
          );
        }}
        aria-label={tr.t('app.roy.f.shape')}
      >
        <ToggleButton value="percent">{tr.t('app.roy.f.shapePct')}</ToggleButton>
        <ToggleButton value="per-unit">{tr.t('app.roy.f.shapeUnit')}</ToggleButton>
      </ToggleButtonGroup>
      {r.kind === 'percent' ? (
        <>
          <TextField
            label={tr.t('app.roy.f.amountPct')}
            value={r.rate}
            onChange={(e) => onChange({ ...r, rate: numeric(e.target.value, 8) })}
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            }}
          />
          <TextField
            select
            label={tr.t('app.roy.f.base')}
            value={r.base ?? 'gross'}
            onChange={(e) =>
              onChange(
                e.target.value === 'net'
                  ? {
                      ...r,
                      base: 'net',
                      deductions: r.deductions ?? [...DEDUCTIONS],
                      deductionCapPct: r.deductionCapPct ?? '15',
                    }
                  : { kind: 'percent', rate: r.rate, base: 'gross' },
              )
            }
          >
            <MenuItem value="gross">{tr.t('app.roy.f.gross')}</MenuItem>
            <MenuItem value="net">{tr.t('app.roy.f.net')}</MenuItem>
          </TextField>
          {r.base === 'net' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {tr.t('app.roy.f.deductions')}
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap' }}>
                {DEDUCTIONS.map((d) => (
                  <FormControlLabel
                    key={d}
                    control={
                      <Checkbox
                        checked={(r.deductions ?? []).includes(d)}
                        onChange={(e) =>
                          onChange({
                            ...r,
                            deductions: e.target.checked
                              ? DEDUCTIONS.filter((x) => x === d || (r.deductions ?? []).includes(x))
                              : (r.deductions ?? []).filter((x) => x !== d),
                          })
                        }
                      />
                    }
                    label={tr.t(`app.roy.ded.${d}` as AppKey)}
                  />
                ))}
              </Stack>
              <TextField
                label={tr.t('app.roy.f.cap')}
                value={r.deductionCapPct ?? ''}
                onChange={(e) => onChange({ ...r, deductionCapPct: numeric(e.target.value, 8) })}
                sx={{ mt: 1 }}
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: 'decimal' },
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                }}
              />
            </Box>
          )}
        </>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={tr.t('app.roy.f.amountPlain')}
              value={r.amount}
              onChange={(e) => onChange({ ...r, amount: numeric(e.target.value) })}
              fullWidth
              slotProps={{
                htmlInput: { inputMode: 'decimal' },
                input: { endAdornment: <InputAdornment position="end">{currency}</InputAdornment> },
              }}
            />
            <TextField
              select
              label={tr.t('app.roy.f.unit')}
              value={r.unit}
              onChange={(e) => {
                const unit = e.target.value as RoyaltyUnit;
                onChange({ ...r, unit, unitDefinition: unitDefinitionText(unit, tr) });
              }}
              sx={{ minWidth: 200 }}
            >
              {units.map((u) => (
                <MenuItem key={u} value={u}>
                  {unitLabel(u, tr)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label={tr.t('app.roy.f.unitDef')}
            value={r.unitDefinition ?? ''}
            onChange={(e) => onChange({ ...r, unitDefinition: e.target.value.slice(0, 300) })}
            multiline
            fullWidth
          />
        </>
      )}
    </Stack>
  );
};

/** Currency, reporting, fees, records and law: every deal with money in it has these. */
export const MoneyTermsFields: React.FC<{ terms: LicenseTerms; set: SetTerm; tr: Translator }> = ({
  terms: t,
  set,
  tr,
}) => {
  const s = t.reporting ?? { every: 'quarter' as const, reportDueDays: 30, paymentDueDays: 14 };
  const currency = t.currency ?? '';
  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={tr.t('app.roy.f.currency')}
          value={CURRENCIES.includes(currency) ? currency : currency || 'USD'}
          onChange={(e) => set('currency', e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {[...new Set([...CURRENCIES, ...(currency ? [currency] : [])])].map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={tr.t('app.roy.f.minimum', { currency })}
          helperText={tr.t('app.roy.f.minimumHelp')}
          value={t.yearlyMinimum ?? ''}
          onChange={(e) => set('yearlyMinimum', numeric(e.target.value))}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={tr.t('app.roy.f.every')}
          value={s.every}
          onChange={(e) => set('reporting', { ...s, every: e.target.value as typeof s.every })}
          sx={{ minWidth: 180 }}
        >
          {PERIODS.map((p) => (
            <MenuItem key={p} value={p}>
              {periodLabel(p, tr)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={tr.t('app.roy.f.reportDue')}
          value={String(s.reportDueDays)}
          onChange={(e) => set('reporting', { ...s, reportDueDays: intOf(e.target.value) ?? 0 })}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <TextField
          label={tr.t('app.roy.f.payDue')}
          value={String(s.paymentDueDays)}
          onChange={(e) => set('reporting', { ...s, paymentDueDays: intOf(e.target.value) ?? 0 })}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Stack>
      <TextField
        select
        label={tr.t('app.roy.f.fees')}
        value={t.bankFees ?? 'each-own'}
        onChange={(e) => set('bankFees', e.target.value as BankFees)}
        fullWidth
      >
        {(['each-own', 'licensee', 'licensor'] as const).map((f) => (
          <MenuItem key={f} value={f}>
            {tr.t(`app.roy.fees.${f}` as AppKey)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={tr.t('app.roy.f.fx')}
        helperText={tr.t('app.roy.f.fxHelp')}
        value={t.fxSource ?? ''}
        onChange={(e) => set('fxSource', e.target.value.slice(0, 120))}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={tr.t('app.roy.f.recordsYears')}
          value={String(t.recordsYears ?? '')}
          onChange={(e) => set('recordsYears', intOf(e.target.value))}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <TextField
          label={tr.t('app.roy.f.notice')}
          value={String(t.checkNoticeDays ?? '')}
          onChange={(e) => set('checkNoticeDays', intOf(e.target.value))}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
        {tr.t('app.roy.f.recordsHelp')}
      </Typography>
      <LawField terms={t} set={set} tr={tr} />
      <TextField
        label={tr.t('app.roy.f.disputes')}
        value={t.disputes ?? ''}
        onChange={(e) => set('disputes', e.target.value.slice(0, 200))}
        fullWidth
      />
    </Stack>
  );
};

export const LawField: React.FC<{ terms: LicenseTerms; set: SetTerm; tr: Translator }> = ({ terms: t, set, tr }) => (
  <TextField
    label={tr.t('app.roy.f.law')}
    helperText={tr.t('app.roy.f.lawHelp')}
    value={t.governingLaw ?? ''}
    onChange={(e) => set('governingLaw', e.target.value.slice(0, 120))}
    required
    fullWidth
    slotProps={{ htmlInput: { 'data-law': '' } }}
  />
);

/** The full license form for new terms (royalty-terms.ts), behind "Edit details". */
export const FullLicenseFields: React.FC<{ terms: LicenseTerms; set: SetTerm; territoryRequired: boolean }> = ({
  terms: t,
  set,
  territoryRequired,
}) => {
  const kind = subjectOf(t);
  const tr = forKind(useT(), kind);
  const rights = RIGHTS_FOR[kind].includes(t.rights) ? RIGHTS_FOR[kind] : [...RIGHTS_FOR[kind], t.rights];
  const currency = t.currency ?? '';
  const off = t.offspring;
  const offPct = off?.rule.kind === 'percent' ? off.rule.rate : '';
  const offAmount = off?.rule.kind === 'per-unit' ? off.rule.amount : '';
  const setOffspring = (rule: RoyaltyRule | undefined) => set('offspring', rule ? { ...(off ?? {}), rule } : undefined);
  return (
    <Stack spacing={2.5} data-full-terms="">
      <TextField
        label={tr.t('app.lic.f.licensee')}
        helperText={tr.t('app.lic.f.licenseeHelp')}
        value={t.licensee}
        onChange={(e) => set('licensee', e.target.value)}
        fullWidth
      />
      <TextField
        label={tr.t('app.roy.f.licensor')}
        helperText={tr.t('app.roy.f.licensorHelp')}
        value={t.licensor ?? ''}
        onChange={(e) => set('licensor', e.target.value.slice(0, 120))}
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
            {labelOr(tr, rightOptionKey(r), r)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={tr.t('app.lic.f.territory')}
        placeholder={tr.t('app.lic.f.territoryPh')}
        helperText={territoryRequired ? tr.t('app.roy.f.territoryRequired') : tr.t('app.lic.f.territoryHelp')}
        required={territoryRequired}
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
      <Typography variant="overline">{tr.t('app.lic.row.royalty')}</Typography>
      {t.royalty && (
        <RuleFields rule={t.royalty} onChange={(r) => set('royalty', r)} kind={kind} currency={currency} tr={tr} />
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={tr.t('app.lic.f.offspring')}
          helperText={tr.t('app.lic.f.offspringHelp')}
          value={offPct}
          onChange={(e) => {
            const v = numeric(e.target.value, 8);
            setOffspring(v ? { kind: 'percent', rate: v, base: 'gross' } : undefined);
          }}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
        <TextField
          label={tr.t('app.roy.f.offspringAmount', { currency })}
          value={offAmount}
          onChange={(e) => {
            const v = numeric(e.target.value);
            setOffspring(
              v
                ? {
                    kind: 'per-unit',
                    amount: v,
                    unit: kind === 'plant' ? 'plant' : 'offspring',
                  }
                : undefined,
            );
          }}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
      </Stack>
      {off && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={tr.t('app.roy.f.years')}
            value={off.years ? String(off.years) : ''}
            onChange={(e) => set('offspring', { ...off, years: intOf(e.target.value), generations: undefined })}
            fullWidth
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <TextField
            label={tr.t('app.roy.f.generations')}
            value={off.generations ? String(off.generations) : ''}
            onChange={(e) => set('offspring', { ...off, generations: intOf(e.target.value), years: undefined })}
            fullWidth
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Stack>
      )}
      <Typography variant="overline">{tr.t('app.roy.f.moneyTitle')}</Typography>
      <MoneyTermsFields terms={t} set={set} tr={tr} />
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

/**
 * The license terms step: presets, then the three fields a preset leaves (who, the amount, the
 * law and the territory, required on every license), an "Edit details" button for the full form, and the deal in
 * one paragraph. TermsBuilder shows it; nothing else decides what it holds.
 */
export const LicenseTermsStep: React.FC<{
  kind: RecordKind;
  terms: LicenseTerms;
  set: SetTerm;
  preset?: PresetId;
  /** Absent when renewing: the preset list isn't offered again. */
  onPick?: (id: PresetId) => void;
  details: boolean;
  setDetails: (open: boolean) => void;
}> = ({ kind, terms: t, set, preset, onPick, details, setDetails }) => {
  const tr = forKind(useT(), kind);
  return (
    <Stack spacing={2.5}>
      {onPick && <PresetPicker kind={kind} picked={preset} onPick={onPick} />}
      {preset && !details && (
        <Stack spacing={2.5} data-quick-terms="">
          <TextField
            label={tr.t('app.lic.f.licensee')}
            helperText={tr.t('app.lic.f.licenseeHelp')}
            value={t.licensee}
            onChange={(e) => set('licensee', e.target.value)}
            fullWidth
          />
          <AmountField terms={t} set={set} tr={tr} />
          {/* Required on every license of living material: no "any territory" default (panel review). */}
          <TextField
            label={tr.t('app.lic.f.territory')}
            placeholder={tr.t('app.lic.f.territoryPh')}
            helperText={tr.t('app.roy.f.territoryRequired')}
            required
            value={t.territory}
            onChange={(e) => set('territory', e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { 'data-territory': '' } }}
          />
          <LawField terms={t} set={set} tr={tr} />
        </Stack>
      )}
      {preset && (
        <Box>
          <Button variant="outlined" onClick={() => setDetails(!details)} aria-expanded={details} data-edit-details="">
            {details ? tr.t('app.roy.f.hide') : tr.t('app.roy.f.edit')}
          </Button>
          <Collapse in={details} unmountOnExit>
            <Box sx={{ pt: 1.5 }}>
              <FullLicenseFields terms={t} set={set} territoryRequired />
            </Box>
          </Collapse>
        </Box>
      )}
      {preset && <TermsSummaryLine terms={t} kind={kind} />}
    </Stack>
  );
};

/**
 * "Is this cannabis, hemp or another controlled plant?" (panel review): asked of every plant
 * license, never left to the species field. The record's species only preselects the answer.
 */
export const ControlledQuestion: React.FC<{
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  hinted: boolean;
  tr: Translator;
}> = ({ value, onChange, hinted, tr }) => (
  <Stack spacing={0.75} data-controlled-question="">
    <Typography variant="subtitle2" component="p" id="controlled-q">
      {tr.t('app.lic.controlled.q')}
    </Typography>
    <ToggleButtonGroup
      exclusive
      value={value === undefined ? null : value ? 'yes' : 'no'}
      onChange={(_, v: 'yes' | 'no' | null) => v && onChange(v === 'yes')}
      aria-labelledby="controlled-q"
      size="small"
    >
      <ToggleButton value="yes" data-controlled="yes">
        {tr.t('app.lic.controlled.yes')}
      </ToggleButton>
      <ToggleButton value="no" data-controlled="no">
        {tr.t('app.lic.controlled.no')}
      </ToggleButton>
    </ToggleButtonGroup>
    {hinted && (
      <Typography variant="caption" color="text.secondary">
        {tr.t('app.lic.controlled.hint')}
      </Typography>
    )}
  </Stack>
);

/** What a cannabis license carries, on both sides' pages: shown only when it is one. */
export const ControlledWarnings: React.FC<{ tr: Translator }> = ({ tr }) => (
  <Alert severity="warning" variant="outlined" data-controlled-warnings="">
    <Stack spacing={0.75}>
      <span>{tr.t('app.lic.controlled.border')}</span>
      <span>{tr.t('app.lic.controlled.japan')}</span>
      <span>{tr.t('app.lic.controlled.regulator')}</span>
      <span>{tr.t('app.lic.controlled.courts')}</span>
    </Stack>
  </Alert>
);
