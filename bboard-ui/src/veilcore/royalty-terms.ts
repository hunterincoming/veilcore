// Royalty terms, v2 (docs/agreements-live.md, 4): what a license says about money, in explicit
// values both sides sign.
//
// Three rules from the design reviews:
//   1. A preset (a clone license, a seed license, ...) is only a way of filling the form. It
//      expands into explicit values before the agreement is sealed (licenses.ts sealAgreement);
//      no preset id is stored, so what was signed never depends on what a preset means later.
//   2. Nothing is filled in at display time. Terms made before these fields existed are read
//      through the fallback readers below (ruleOf, offspringOf, currencyOf, scheduleOf), which
//      say what the old fields said and nothing more. Old agreements keep their fingerprint.
//   3. The form only makes sensible combinations: a percent is always of sales, an amount is
//      always per a named unit with a one-line definition.
// SPDX-License-Identifier: Apache-2.0

import type { LicenseTerms, Rights, UnitBasis } from './licenses';
import { enT, type RecordKind, type Translator } from '../i18n/translate';
import type { AppKey } from '../i18n/app/en';
import { formatMoney, isDecimal, normaliseDecimal } from './money';

export type RoyaltyUnit =
  | 'cutting'
  | 'plant'
  | 'seed-pack'
  | 'seed-kg'
  | 'tonne'
  | 'hectare'
  | 'acre'
  | 'dose'
  | 'offspring'
  | 'batch'
  // Read from terms made before units were named (never offered on the form).
  | 'harvest'
  | 'unit-sold';

/** The units a new license on each kind of record can charge per. */
export const UNITS_FOR: Record<RecordKind, readonly RoyaltyUnit[]> = {
  plant: ['cutting', 'plant', 'seed-pack', 'seed-kg', 'tonne', 'hectare', 'acre'],
  animal: ['dose', 'offspring'],
  strain: ['batch'],
};

export type Deduction = 'returns' | 'excise' | 'freight';
export const DEDUCTIONS: readonly Deduction[] = ['returns', 'excise', 'freight'];

export type RoyaltyRule =
  | {
      readonly kind: 'percent';
      /** Percent of sales, as typed ("8", "7.5"). */
      readonly rate: string;
      /** Gross sales, or net of the listed deductions. Absent only on old terms. */
      readonly base?: 'gross' | 'net';
      readonly deductions?: readonly Deduction[];
      /** Deductions count up to this percent of gross sales. */
      readonly deductionCapPct?: string;
    }
  | {
      readonly kind: 'per-unit';
      /** The amount per unit, in the deal's currency. */
      readonly amount: string;
      readonly unit: RoyaltyUnit;
      /** What counts as one, with an example, in the breeder's words. Absent only on old terms. */
      readonly unitDefinition?: string;
    };

export type OffspringTerm = {
  readonly rule: RoyaltyRule;
  /** How long it runs: a number of years from the start, or of generations. Absent: as long as the license. */
  readonly years?: number;
  readonly generations?: number;
};

export type Period = 'month' | 'quarter' | 'half' | 'year';
export const PERIODS: readonly Period[] = ['month', 'quarter', 'half', 'year'];

export type Reporting = {
  readonly every: Period;
  /** Days after a period ends that its report is due. */
  readonly reportDueDays: number;
  /** Days after the report is due that payment is due: fixed from the period's end, not from any answer. */
  readonly paymentDueDays: number;
};

export type BankFees = 'each-own' | 'licensee' | 'licensor';

/** The fields these terms add to LicenseTerms. All optional: old terms have none of them. */
export type RoyaltyTermsFields = {
  /** ISO 4217 code of the deal's money. */
  currency?: string;
  /** The licensor's name as the deal names them: where payment references take their initials. */
  licensor?: string;
  royalty?: RoyaltyRule;
  offspring?: OffspringTerm;
  /** A yearly minimum, in the currency: the year's last report tops up to it. */
  yearlyMinimum?: string;
  reporting?: Reporting;
  bankFees?: BankFees;
  /** Where the rate comes from when sales are in another currency (the period's last day). */
  fxSource?: string;
  /** How long the licensee keeps sales records, and the notice before the licensor may check them. */
  recordsYears?: number;
  checkNoticeDays?: number;
  /** The law the deal is under, and where disputes go. Required on new terms. */
  governingLaw?: string;
  disputes?: string;
};

// ---- fallback readers: what the terms say, old or new, never more ----------------------------

const LEGACY_UNIT: Record<UnitBasis, RoyaltyUnit> = {
  'per-plant': 'plant',
  'per-harvest': 'harvest',
  'per-dose': 'dose',
  'per-offspring': 'offspring',
  'per-batch': 'batch',
  'per-unit-sold': 'unit-sold',
};

/** Whether the terms carry the new royalty fields (made with this form). */
export const isNewTerms = (t: Partial<LicenseTerms> | undefined): boolean => Boolean(t?.royalty);

/** Whether the terms set a reporting schedule and currency (new terms, a license or a breeder share). */
export const hasMoneyTerms = (t: Partial<LicenseTerms> | undefined): boolean => Boolean(t?.reporting && t.currency);

/** The royalty rule: the new field, or what the old royaltyType/royaltyAmount/unitBasis said. */
export const ruleOf = (t: Partial<LicenseTerms> | undefined): RoyaltyRule | undefined => {
  if (!t) return undefined;
  if (t.royalty) return t.royalty;
  if (!t.royaltyAmount) return undefined;
  return t.royaltyType === 'percent'
    ? { kind: 'percent', rate: t.royaltyAmount }
    : { kind: 'per-unit', amount: t.royaltyAmount, unit: LEGACY_UNIT[t.unitBasis as UnitBasis] ?? 'unit-sold' };
};

/** The royalty on offspring: the new field, or the old percent. */
export const offspringOf = (t: Partial<LicenseTerms> | undefined): OffspringTerm | undefined => {
  if (!t) return undefined;
  if (t.offspring) return t.offspring;
  return (Number(t.offspringRoyaltyPct) || 0) > 0
    ? { rule: { kind: 'percent', rate: String(t.offspringRoyaltyPct) } }
    : undefined;
};

export const hasOffspringRoyalty = (t: Partial<LicenseTerms> | undefined): boolean => offspringOf(t) !== undefined;

/**
 * The deal's currency. Old terms named none: their form asked for a flat fee in "$", so they are
 * read as US dollars. A reading, not a value written into them.
 */
export const currencyOf = (t: Partial<LicenseTerms> | undefined): string => t?.currency ?? 'USD';

/** The reporting schedule, or undefined for old terms (each statement then names its own dates). */
export const scheduleOf = (t: Partial<LicenseTerms> | undefined): Reporting | undefined => t?.reporting;

/**
 * Cannabis records (design v3, 1 and 10): the territory is required, and the licensor's own
 * payment link isn't offered. A plant sealed before profiles existed was sealed as cannabis.
 */
export const isCannabisRecord = (r: { profile?: string; taxon?: string } | undefined): boolean =>
  Boolean(r && (!r.profile || /cannabis|hemp|marijuana/i.test(r.taxon ?? '')));

// ---- presets -----------------------------------------------------------------------------------

export type PresetId = 'clone' | 'seed' | 'breeding' | 'semen' | 'custom';
export const PRESETS_FOR: Record<RecordKind, readonly PresetId[]> = {
  plant: ['clone', 'seed', 'custom'],
  animal: ['breeding', 'semen', 'custom'],
  strain: ['custom'],
};

/** What every preset shares (design v3, 1). */
export const SHARED_DEFAULTS = {
  exclusive: false,
  sublicensable: false,
  reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 } as Reporting,
  bankFees: 'each-own' as BankFees,
  recordsYears: 3,
  checkNoticeDays: 30,
};

/** Today, as a calendar date where the user is (not UTC). */
export const localDay = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** A calendar date plus whole years: 29 February goes to 28 February in a year without one. */
export const addYears = (day: string, years: number): string => {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y + years, m, 0)).getUTCDate();
  return `${y + years}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
};

/** The default unit definition for a unit, in the breeder's language (they can change it). */
export const unitDefinitionText = (unit: RoyaltyUnit, tr: Translator = enT): string =>
  tr.t(`app.roy.unitDef.${unit}` as AppKey);

const EUROZONE = new Set('AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES'.split(' '));
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  JP: 'JPY',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  UY: 'UYU',
  ZA: 'ZAR',
  TH: 'THB',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  PL: 'PLN',
  CZ: 'CZK',
  IL: 'ILS',
};
const LANG_CURRENCY: Record<string, string> = { ja: 'JPY', de: 'EUR', fr: 'EUR', es: 'EUR', en: 'USD' };

/** The region a browser locale names ("en-US" -> "US"), if any. */
export const regionOf = (locale: string | undefined): string | undefined => {
  try {
    return locale ? new Intl.Locale(locale).maximize().region : undefined;
  } catch {
    return undefined;
  }
};

/** A first guess at the deal's currency, from the browser's locale. Shown, and changeable. */
export const currencyForLocale = (locale: string | undefined): string => {
  const region = regionOf(locale);
  if (region && EUROZONE.has(region)) return 'EUR';
  if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  return LANG_CURRENCY[(locale ?? 'en').slice(0, 2)] ?? 'USD';
};

/** A first guess at the governing law: the browser's country, in the reader's language. */
export const lawForLocale = (locale: string | undefined, displayLocale?: string): string => {
  const region = regionOf(locale);
  if (!region) return '';
  try {
    return new Intl.DisplayNames(displayLocale ? [displayLocale] : undefined, { type: 'region' }).of(region) ?? '';
  } catch {
    return '';
  }
};

/** The first right of each preset (a clone or seed license propagates; semen and embryos are sold). */
const PRESET_RIGHTS: Record<PresetId, Rights | undefined> = {
  clone: 'cultivate+propagate',
  seed: 'cultivate+propagate',
  breeding: 'breed',
  semen: 'breed+sell',
  custom: undefined,
};
const PRESET_UNIT: Record<PresetId, RoyaltyUnit | undefined> = {
  clone: 'cutting',
  seed: 'seed-pack',
  breeding: 'offspring',
  semen: 'dose',
  custom: undefined,
};
/** What a custom license on each kind starts with: a percent of sales for a plant, per dose or batch otherwise. */
const CUSTOM_UNIT: Record<RecordKind, RoyaltyUnit | undefined> = { plant: undefined, animal: 'dose', strain: 'batch' };

/**
 * A preset's explicit values, laid over the terms so far (keeping who it's with, the territory,
 * the dates and anything already typed that the preset doesn't decide). Everything the deal
 * needs is set here, as a value: nothing is filled in later.
 */
export const applyPreset = (
  id: PresetId,
  t: LicenseTerms,
  ctx: { kind: RecordKind; currency: string; governingLaw: string; tr?: Translator },
): LicenseTerms => {
  const tr = ctx.tr ?? enT;
  const unit = PRESET_UNIT[id] ?? (id === 'custom' ? CUSTOM_UNIT[ctx.kind] : undefined);
  const royalty: RoyaltyRule = unit
    ? {
        kind: 'per-unit',
        amount: t.royalty?.kind === 'per-unit' ? t.royalty.amount : '',
        unit,
        unitDefinition: unitDefinitionText(unit, tr),
      }
    : { kind: 'percent', rate: t.royalty?.kind === 'percent' ? t.royalty.rate : '', base: 'gross' };
  return {
    ...t,
    rights: PRESET_RIGHTS[id] ?? t.rights,
    royalty,
    currency: t.currency ?? ctx.currency,
    governingLaw: t.governingLaw ?? ctx.governingLaw,
    ...SHARED_DEFAULTS,
    reporting: { ...SHARED_DEFAULTS.reporting },
  };
};

/** The old fields a rule corresponds to, so an older copy of the app still reads the deal. */
const LEGACY_BASIS: Partial<Record<RoyaltyUnit, UnitBasis>> = {
  plant: 'per-plant',
  cutting: 'per-plant',
  dose: 'per-dose',
  offspring: 'per-offspring',
  batch: 'per-batch',
  harvest: 'per-harvest',
};

/**
 * The terms exactly as they will be sealed: numbers normalised (the published checker refuses
 * "05"), empty optional values left out, and the old fields set to match the new ones so an older
 * copy of the app shows the same deal. Called once, before sealing; a preset never reaches here.
 */
export const termsToSeal = (t: LicenseTerms): LicenseTerms => {
  if (!t.royalty && !t.offspring) return t;
  const n = (s: string | undefined) => (s === undefined ? undefined : (normaliseDecimal(s) ?? s.trim()));
  const rule = (r: RoyaltyRule): RoyaltyRule =>
    r.kind === 'percent'
      ? {
          kind: 'percent',
          rate: n(r.rate)!,
          base: r.base ?? 'gross',
          ...(r.base === 'net' && r.deductions?.length ? { deductions: [...r.deductions] } : {}),
          ...(r.base === 'net' && r.deductionCapPct?.trim() ? { deductionCapPct: n(r.deductionCapPct) } : {}),
        }
      : {
          kind: 'per-unit',
          amount: n(r.amount)!,
          unit: r.unit,
          ...(r.unitDefinition?.trim() ? { unitDefinition: r.unitDefinition.trim() } : {}),
        };
  const royalty = t.royalty ? rule(t.royalty) : undefined;
  const offspring = t.offspring
    ? {
        rule: rule(t.offspring.rule),
        ...(t.offspring.years ? { years: t.offspring.years } : {}),
        ...(t.offspring.generations ? { generations: t.offspring.generations } : {}),
      }
    : undefined;
  const { offspring: _o, yearlyMinimum, fxSource, disputes, ...rest } = t;
  void _o;
  return {
    ...rest,
    ...(royalty
      ? {
          royalty,
          royaltyType: royalty.kind === 'percent' ? ('percent' as const) : ('flat' as const),
          royaltyAmount: royalty.kind === 'percent' ? royalty.rate : royalty.amount,
          unitBasis: royalty.kind === 'percent' ? 'per-unit-sold' : (LEGACY_BASIS[royalty.unit] ?? 'per-unit-sold'),
        }
      : {}),
    offspringRoyaltyPct: offspring?.rule.kind === 'percent' ? offspring.rule.rate : '',
    ...(offspring ? { offspring } : {}),
    ...(yearlyMinimum?.trim() && Number(yearlyMinimum) > 0 ? { yearlyMinimum: n(yearlyMinimum) } : {}),
    ...(fxSource?.trim() ? { fxSource: fxSource.trim() } : {}),
    ...(disputes?.trim() ? { disputes: disputes.trim() } : {}),
    licensor: t.licensor?.trim() ?? '',
    governingLaw: t.governingLaw?.trim() ?? '',
  };
};

/** What is missing before new terms can be saved (empty: ready). */
export const termsProblems = (t: LicenseTerms, opts: { territoryRequired: boolean }): string[] => {
  const out: string[] = [];
  if (!t.licensee.trim()) out.push('licensee');
  const r = t.royalty;
  if (r) {
    if (r.kind === 'percent' && !(isDecimal(r.rate) && Number(r.rate) > 0 && Number(r.rate) <= 100)) out.push('rate');
    if (r.kind === 'per-unit' && !(isDecimal(r.amount) && Number(r.amount) > 0)) out.push('amount');
    if (r.kind === 'percent' && r.base === 'net' && r.deductionCapPct && !isDecimal(r.deductionCapPct)) out.push('cap');
    if (!t.currency || !/^[A-Z]{3,6}$/.test(t.currency)) out.push('currency');
    if (!t.governingLaw?.trim()) out.push('law');
    if (t.yearlyMinimum?.trim() && !isDecimal(t.yearlyMinimum)) out.push('minimum');
    const o = t.offspring?.rule;
    if (o && !isDecimal(o.kind === 'percent' ? o.rate : o.amount)) out.push('offspring');
  } else if (!t.royaltyAmount.trim()) out.push('rate');
  if (opts.territoryRequired && !t.territory.trim()) out.push('territory');
  if (t.startDate && t.endDate && t.endDate < t.startDate) out.push('dates');
  return out;
};

// ---- words -------------------------------------------------------------------------------------

export const unitLabel = (u: RoyaltyUnit, tr: Translator = enT): string => tr.t(`app.roy.unit.${u}` as AppKey);
export const periodLabel = (p: Period, tr: Translator = enT): string => tr.t(`app.roy.every.${p}` as AppKey);

/** A rule in a few words: "8% of gross sales", "$2.00 per cutting". */
export const ruleText = (r: RoyaltyRule, currency: string, tr: Translator = enT): string => {
  if (r.kind === 'percent') {
    if (!r.base) return tr.t('app.roy.rule.pctOld', { rate: r.rate || '—' });
    if (r.base === 'gross') return tr.t('app.roy.rule.pctGross', { rate: r.rate || '—' });
    const ded = (r.deductions ?? []).map((d) => tr.t(`app.roy.ded.${d}` as AppKey)).join(', ');
    return r.deductionCapPct
      ? tr.t('app.roy.rule.pctNetCap', { rate: r.rate || '—', ded: ded || '—', cap: r.deductionCapPct })
      : tr.t('app.roy.rule.pctNet', { rate: r.rate || '—', ded: ded || '—' });
  }
  return tr.t('app.roy.rule.perUnit', {
    amount: r.amount ? formatMoney(r.amount, currency, tr.locale) : '—',
    unit: unitLabel(r.unit, tr),
  });
};

/**
 * The deal in one paragraph, every value in it (design v3, 1): shown on the form before saving
 * and to the licensee before they agree. Old terms say only what they hold.
 */
export const termsSentence = (t: LicenseTerms, tr: Translator, rightsWords: string): string => {
  const currency = currencyOf(t);
  const parts: string[] = [];
  parts.push(
    tr.t(t.exclusive ? 'app.roy.s.grantEx' : 'app.roy.s.grant', {
      who: t.licensee || '—',
      rights: rightsWords,
      where: t.territory || tr.t('app.roy.s.anywhere'),
      from: t.startDate || '—',
      to: t.endDate || '—',
    }),
  );
  parts.push(tr.t(t.sublicensable ? 'app.roy.s.subYes' : 'app.roy.s.subNo'));
  const r = ruleOf(t);
  if (r) {
    parts.push(tr.t('app.roy.s.royalty', { rule: ruleText(r, currency, tr) }));
    if (r.kind === 'per-unit' && r.unitDefinition) parts.push(tr.t('app.roy.s.counts', { def: r.unitDefinition }));
  }
  const o = offspringOf(t);
  if (o) {
    parts.push(
      o.years
        ? tr.t('app.roy.s.offspringFor', { rule: ruleText(o.rule, currency, tr), n: tr.tp('app.roy.years', o.years) })
        : o.generations
          ? tr.t('app.roy.s.offspringFor', {
              rule: ruleText(o.rule, currency, tr),
              n: tr.tp('app.roy.generations', o.generations),
            })
          : tr.t('app.roy.s.offspring', { rule: ruleText(o.rule, currency, tr) }),
    );
  }
  if (t.yearlyMinimum)
    parts.push(tr.t('app.roy.s.minimum', { amount: formatMoney(t.yearlyMinimum, currency, tr.locale) }));
  const s = scheduleOf(t);
  if (s) {
    parts.push(
      tr.t('app.roy.s.reporting', {
        every: periodLabel(s.every, tr),
        report: tr.tp('app.roy.days', s.reportDueDays),
        pay: tr.tp('app.roy.days', s.paymentDueDays),
        currency,
      }),
    );
  }
  if (t.bankFees) parts.push(tr.t(`app.roy.s.fees.${t.bankFees}` as AppKey));
  if (t.fxSource) parts.push(tr.t('app.roy.s.fx', { source: t.fxSource }));
  if (t.recordsYears)
    parts.push(
      tr.t('app.roy.s.records', {
        years: tr.tp('app.roy.years', t.recordsYears),
        days: tr.tp('app.roy.days', t.checkNoticeDays ?? 0),
      }),
    );
  if (t.governingLaw) parts.push(tr.t('app.roy.s.law', { law: t.governingLaw }));
  if (t.disputes) parts.push(tr.t('app.roy.s.disputes', { where: t.disputes }));
  return parts.join(' ');
};
