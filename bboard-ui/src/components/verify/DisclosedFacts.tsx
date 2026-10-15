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
import { DISCLOSURE_FIELDS, GENETICS_LABEL, LEGACY_NAME, keysOn, type Disclosure } from '../../veilcore/disclosure';
import type { StrainRecord } from '../../veilcore/records';
import { ACCENT } from '../../config/theme';
import { networkLabel, isTestNetwork } from '../../config/network';
import { displayName } from '../../veilcore/display-name';
import { utcStamp as fmt } from '../../veilcore/time';
import { savedReportSentence, type FactStatus, type SavedReport } from '../../veilcore/saved-report';

/** The words for each mark: read by screen readers on every line, and shown in the key. */
export const FACT_WORDS: Record<FactStatus, string> = {
  checked: 'Checked in this browser',
  reported: 'Not checked here',
  failed: 'Failed or withdrawn',
};

const MarkIcon: React.FC<{ status: FactStatus; label?: boolean }> = ({ status, label = false }) => {
  // On a line, the mark is named for screen readers (titleAccess); in the key, the words
  // beside it already say it.
  const a11y = label ? { titleAccess: FACT_WORDS[status] } : { 'aria-hidden': true as const };
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
export const FactKey: React.FC = () => (
  <Stack
    direction="row"
    sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, alignItems: 'center' }}
    data-fact-key=""
    aria-label="What the marks mean"
  >
    {(['checked', 'reported', 'failed'] as const).map((st) => (
      <Stack key={st} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <MarkIcon status={st} />
        <Typography variant="caption" color="text.secondary">
          {FACT_WORDS[st]}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

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
  const shared = new Set(data.disclosed);
  const notShared = DISCLOSURE_FIELDS.filter((f) => !shared.has(LEGACY_NAME[f.key])).map((f) => f.label);
  return (
    <Stack spacing={1.25}>
      {shared.has('own') &&
        (preview ? (
          <Fact ok={false}>
            Prior possession: shown only once the registry reports this record&apos;s batch anchored, and then as the
            registry&apos;s report.
          </Fact>
        ) : (data.anchored ?? data.priorPossession) ? (
          <Fact ok={false}>
            Prior possession: the registry reports this record&apos;s batch anchored on{' '}
            {networkLabel(data.anchorNetwork ?? '')}. This page has not checked the chain.
            {isTestNetwork(data.anchorNetwork ?? '')
              ? ' A test network can be reset and its dates carry no evidential weight.'
              : ''}
          </Fact>
        ) : (
          <Fact ok={false}>Prior possession: not anchored yet, so its date rests on this registry&apos;s records.</Fact>
        ))}
      {shared.has('dna') &&
        (data.labReport ? (
          <Fact status={data.labReport.status}>{data.labReport.text}</Fact>
        ) : (
          <Fact ok={false}>
            {data.dnaPairedByHolder
              ? 'The holder saved a lab report to this record.'
              : 'The holder has not saved a lab report to this record.'}
          </Fact>
        ))}
      {/* No tick: "intact" is the registry's say-so, and this page walks no descent
          (round D verification). Every line here is a report, never a check. */}
      {shared.has('lineage') &&
        (data.lineageIntact === true ? (
          <Fact ok={false}>
            The registry reports the lineage intact — an unbroken chain back to the sealed record. This page has not
            checked it.
          </Fact>
        ) : (
          <Fact ok={false}>
            Lineage: not checked on this page. The registry does not walk descent for a shared link.
          </Fact>
        ))}
      {shared.has('sealed') && data.sealedAt !== undefined && (
        <Fact ok={false}>
          Sealed, by the holder&apos;s device clock: {fmt(data.sealedAt)}. This is the holder&apos;s own statement.
          {data.registryFirstSeen ? ` First stored by this registry: ${fmt(data.registryFirstSeen)}.` : ''}
        </Fact>
      )}
      {shared.has('parents') && (
        <Fact ok={false}>
          {data.parents?.length
            ? `Parents, as the holder states them: ${data.parents.map(displayName).join(' × ')}`
            : 'No parents recorded.'}
        </Fact>
      )}
      {shared.has('method') && (
        <Fact ok={false}>
          {data.breedingMethod
            ? `Breeding method, as the holder states it: ${displayName(data.breedingMethod)}`
            : 'No breeding method recorded.'}
        </Fact>
      )}

      {shared.size === 0 && (
        <Typography variant="body2" color="text.secondary">
          The holder has shared nothing beyond the basics above.
        </Typography>
      )}

      {notShared.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Not shared by the holder: {notShared.join('; ')}.
        </Typography>
      )}

      <Divider sx={{ my: 0.5 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.disabled">
          {GENETICS_LABEL}
        </Typography>
      </Stack>
    </Stack>
  );
};

/** The preview's lab report line: what the check page will say, from where the saved report stands here. */
const previewReportLine = (saved: SavedReport | null | undefined): { status: FactStatus; text: string } | undefined => {
  if (!saved || saved.kind === 'none') return undefined;
  if (saved.kind === 'replaced' || saved.kind === 'withdrawn')
    return { status: 'failed', text: savedReportSentence(saved) };
  if (saved.kind === 'lab') return { status: 'checked', text: savedReportSentence(saved) };
  return { status: 'reported', text: savedReportSentence(saved) };
};

/** The holder's preview: what the verify page will show under these switches. */
export const DisclosedFacts: React.FC<{ record: StrainRecord; disclosure: Disclosure; saved?: SavedReport | null }> = ({
  record,
  disclosure,
  saved,
}) => {
  const labReport = previewReportLine(saved);
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        Always shown: the cultivar name, the record id, its fingerprint ({shortFingerprint(record.recordFingerprint)}
        ), when the registry first stored it, and what this page could check about its batch and any signed attestations
        (a lab&apos;s receipt, a lab report).
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
