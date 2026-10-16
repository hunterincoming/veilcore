// The facts a holder has chosen to share about a record, as a stranger sees them.
//
// One component renders both the public verify page (from what the registry answered)
// and the holder's preview in step 5 (from the record and the switches), so the preview
// says what the page will say. Facts the holder did not share are named as "not
// shared", never shown as a negative finding: an absent field from the registry means
// the holder did not share it, not "no" (attack round D: "DNA report not yet paired" was
// printed for a record whose holder had paired one and not shared it).
//
// Three marks, different in shape and named in words (round 5), never colour alone:
//   ✓ checked in this browser, ○ not checked here (someone's report), ⊗ failed or withdrawn.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Divider, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotCheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FailedIcon from '@mui/icons-material/HighlightOff';
import LockIcon from '@mui/icons-material/LockOutlined';
import { shortFingerprint } from '../../veilcore/commitment';
import {
  DISCLOSURE_FIELDS,
  LEGACY_NAME,
  geneticsLabel,
  keysOn,
  labelOf,
  type Disclosure,
} from '../../veilcore/disclosure';
import type { StrainRecord } from '../../veilcore/records';
import { ACCENT } from '../../config/theme';
import { isTestNetwork } from '../../config/network';
import { displayName } from '../../veilcore/display-name';
import { utcStamp as fmt } from '../../veilcore/time';
import { savedReportSentence, type FactStatus, type SavedReport } from '../../veilcore/saved-report';
import { useT, type Translator } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { networkWords } from '../../i18n/network-words';
import { breedingMethodWords } from '../flow/breeding-methods';

/** The words for each mark: read by screen readers on every line, and shown in the key. */
export const FACT_WORDS: Record<FactStatus, AppKey> = {
  checked: 'app.verify.mark.checked',
  reported: 'app.verify.mark.reported',
  failed: 'app.verify.mark.failed',
};

const MarkIcon: React.FC<{ status: FactStatus; label?: boolean }> = ({ status, label = false }) => {
  const { t } = useT();
  // On a line, the mark is named for screen readers (titleAccess); in the key, the words
  // beside it already say it.
  const a11y = label ? { titleAccess: t(FACT_WORDS[status]) } : { 'aria-hidden': true as const };
  return status === 'checked' ? (
    <CheckCircleIcon {...a11y} sx={{ fontSize: 18, color: ACCENT, mt: '2px' }} />
  ) : status === 'failed' ? (
    <FailedIcon {...a11y} sx={{ fontSize: 18, color: 'error.main', mt: '2px' }} />
  ) : (
    <NotCheckedIcon {...a11y} sx={{ fontSize: 18, color: 'text.secondary', mt: '2px' }} />
  );
};

// data-fact names what the line is, so a test (or an auditor) can count the ticks.
export const Fact: React.FC<{ ok?: boolean; status?: FactStatus; children: React.ReactNode }> = ({
  ok = true,
  status,
  children,
}) => {
  const st: FactStatus = status ?? (ok ? 'checked' : 'reported');
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }} data-fact={st}>
      <MarkIcon status={st} label />
      <Typography
        variant="body2"
        sx={{ color: st === 'checked' ? 'text.primary' : st === 'failed' ? 'error.main' : 'text.secondary' }}
      >
        {children}
      </Typography>
    </Stack>
  );
};

/** The key to the three marks, in words, above the lines that use them. */
export const FactKey: React.FC = () => {
  const { t } = useT();
  return (
    <Stack
      direction="row"
      sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, alignItems: 'center' }}
      data-fact-key=""
      aria-label={t('app.verify.mark.key')}
    >
      {(['checked', 'reported', 'failed'] as const).map((st) => (
        <Stack key={st} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <MarkIcon status={st} />
          <Typography variant="caption" color="text.secondary">
            {t(FACT_WORDS[st])}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};

/** What the registry sends for the shared facts (the older key names it answers in). */
export type SharedFactsData = {
  /** The shared keys, in the registry's older names: own, dna, lineage, sealed, parents, method. */
  disclosed: readonly string[];
  /**
   * The registry reports the record's batch anchored, on any network. The prior-possession
   * line is drawn from this and the network, not from `priorPossession`: a current registry
   * sets `priorPossession` only for a mainnet anchor, and a Preview-era anchor must still be
   * shown, as Preview, with its warning.
   */
  anchored?: boolean;
  /** Only for a registry too old to send `anchored`, where it meant "anchored on any network". */
  priorPossession?: boolean;
  anchorNetwork?: string;
  /** This page found the batch root's anchor on Midnight itself (veilcore/chain/anchor-check.ts). */
  anchorCheckedOnChain?: boolean;
  dnaPairedByHolder?: boolean;
  lineageIntact?: boolean | null;
  sealedAt?: number | string;
  registryFirstSeen?: string | null;
  parents?: string[];
  breedingMethod?: string | null;
  /**
   * The lab report line, worked out by the page (saved-report.ts publicReportLine): whether
   * the saved file is a lab report a lab signed. Without it, a plain line that claims nothing.
   */
  labReport?: { status: FactStatus; text: string };
};

/** The shared facts, then what was not shared, then the genetics row. */
export const SharedFacts: React.FC<{ data: SharedFactsData; preview?: boolean }> = ({ data, preview = false }) => {
  const tr = useT();
  const { t } = tr;
  const shared = new Set(data.disclosed);
  const notShared = DISCLOSURE_FIELDS.filter((f) => !shared.has(LEGACY_NAME[f.key])).map((f) => labelOf(f.key, tr));
  return (
    <Stack spacing={1.25}>
      {shared.has('own') &&
        (preview ? (
          <Fact ok={false}>{t('app.verify.own.preview')}</Fact>
        ) : (data.anchored ?? data.priorPossession) ? (
          <Fact ok={false}>
            {t('app.verify.own.anchored', {
              network: networkWords(data.anchorNetwork ?? '', tr),
              found: data.anchorCheckedOnChain ? t('app.verify.own.found') : t('app.verify.own.notConfirmed'),
              test: isTestNetwork(data.anchorNetwork ?? '') ? t('app.plant.date.testNote') : '',
            })}
          </Fact>
        ) : (
          <Fact ok={false}>{t('app.verify.own.notAnchored')}</Fact>
        ))}
      {shared.has('dna') &&
        (data.labReport ? (
          <Fact status={data.labReport.status}>{data.labReport.text}</Fact>
        ) : (
          <Fact ok={false}>{data.dnaPairedByHolder ? t('app.verify.dna.saved') : t('app.verify.report.notSaved')}</Fact>
        ))}
      {/* No tick: "intact" is the registry's say-so, and this page walks no descent
          (round D verification). Every line here is a report, never a check. */}
      {shared.has('lineage') &&
        (data.lineageIntact === true ? (
          <Fact ok={false}>{t('app.verify.lineage.intact')}</Fact>
        ) : (
          <Fact ok={false}>{t('app.verify.lineage.notChecked')}</Fact>
        ))}
      {shared.has('sealed') && data.sealedAt !== undefined && (
        <Fact ok={false}>
          {t('app.verify.sealedAt', {
            date: fmt(data.sealedAt),
            first: data.registryFirstSeen ? t('app.verify.firstStoredBy', { date: fmt(data.registryFirstSeen) }) : '',
          })}
        </Fact>
      )}
      {shared.has('parents') && (
        <Fact ok={false}>
          {data.parents?.length
            ? t('app.verify.parents', { list: data.parents.map(displayName).join(' × ') })
            : t('app.verify.noParents')}
        </Fact>
      )}
      {shared.has('method') && (
        <Fact ok={false}>
          {data.breedingMethod
            ? t('app.verify.method', { method: breedingMethodWords(displayName(data.breedingMethod), tr) })
            : t('app.verify.noMethod')}
        </Fact>
      )}

      {shared.size === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('app.verify.sharedNothing')}
        </Typography>
      )}

      {notShared.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {t('app.verify.notShared', { list: notShared.join(t('app.prove.share.semicolon')) })}
        </Typography>
      )}

      <Divider sx={{ my: 0.5 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.disabled">
          {geneticsLabel(tr)}
        </Typography>
      </Stack>
    </Stack>
  );
};

/** The preview's lab report line: what the check page will say, from where the saved report stands here. */
const previewReportLine = (
  saved: SavedReport | null | undefined,
  tr: Translator,
): { status: FactStatus; text: string } | undefined => {
  if (!saved || saved.kind === 'none') return undefined;
  if (saved.kind === 'replaced' || saved.kind === 'withdrawn')
    return { status: 'failed', text: savedReportSentence(saved, tr) };
  if (saved.kind === 'lab') return { status: 'checked', text: savedReportSentence(saved, tr) };
  return { status: 'reported', text: savedReportSentence(saved, tr) };
};

/** The holder's preview: what the verify page will show under these switches. */
export const DisclosedFacts: React.FC<{ record: StrainRecord; disclosure: Disclosure; saved?: SavedReport | null }> = ({
  record,
  disclosure,
  saved,
}) => {
  const tr = useT();
  const labReport = previewReportLine(saved, tr);
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.verify.alwaysShown', { fp: shortFingerprint(record.recordFingerprint) })}
      </Typography>
      <FactKey />
      <SharedFacts
        preview
        data={{
          disclosed: keysOn(disclosure).map((k) => LEGACY_NAME[k]),
          dnaPairedByHolder: Boolean(record.dnaFingerprint),
          lineageIntact: null,
          sealedAt: record.loggedAt,
          parents: (record.parents ?? []).map((p) => p.name).filter(Boolean),
          breedingMethod: record.breedingMethod || null,
          ...(labReport ? { labReport } : {}),
        }}
      />
    </Stack>
  );
};
