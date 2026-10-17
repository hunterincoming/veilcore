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
import { LEGACY_NAME, fieldsFor, geneticsLabel, keysOn, labelOf, type Disclosure } from '../../veilcore/disclosure';
import type { StrainRecord } from '../../veilcore/records';
import { OK_COLOR } from '../../config/theme';
import { isTestNetwork } from '../../config/network';
import { displayName } from '../../veilcore/display-name';
import { utcStamp as fmt } from '../../veilcore/time';
import { savedReportSentence, type FactStatus, type SavedReport } from '../../veilcore/saved-report';
import { dnaTieMeaning, dnaTieOf, dnaTieSentence, isTied, type DnaTie } from '../../veilcore/dna-tie';
import { useT, type Translator } from '../../i18n/app';
import { forKind } from '../../i18n/translate';
import { damOf, isAnimal, sireOf } from '../../veilcore/animal-profile';
import { parentWords } from '../flow/AnimalForm';
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
    <CheckCircleIcon {...a11y} sx={{ fontSize: 18, color: OK_COLOR, mt: '2px' }} />
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

/**
 * The key to the three marks, in words, above the lines that use them. With `anyName`, the
 * one sentence about signers' names (persona review, 17 Oct): it used to repeat under every
 * signature.
 */
export const FactKey: React.FC<{ anyName?: boolean }> = ({ anyName = false }) => {
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
      {anyName && (
        <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }} data-any-name="">
          {t('app.verify.mark.anyName')}
        </Typography>
      )}
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
  /** `animal` for a record sealed under the animal profile (the registry's `subjectKind`). */
  subjectKind?: string;
  /** An animal's sire and dam, under the parent-names grant: name and individual ID. */
  sire?: { name: string; individualId: string };
  dam?: { name: string; individualId: string };
  /** An animal's individual ID and its scheme, under the individual-id grant. */
  individualId?: string;
  idScheme?: string;
  /** The record's name, when the holder published it with the `name` grant (round 5). */
  name?: string;
  /**
   * The name came in the holder's link (after the #): it is shown above, so the list of what
   * wasn't shared doesn't name it too (persona review, 17 Oct).
   */
  nameInLink?: boolean;
  /** Who bred it, as the holder wrote it, under the `bred-by` grant (persona review, 17 Oct). */
  bredBy?: string;
  /**
   * The lab report line, worked out by the page (saved-report.ts publicReportLine): whether
   * the saved file is a lab report a lab signed. Without it, a plain line that claims nothing.
   */
  labReport?: { status: FactStatus; text: string; tie?: DnaTie };
};

/**
 * The line above it: whether the record is tied to the plant by a DNA report (veilcore/
 * dna-tie.ts), in neutral words for whoever reads the check page, with the same mark as
 * the report line. "Not tied yet" says only that none is saved; it blames no one.
 */
const TieFact: React.FC<{ tie: DnaTie; status: FactStatus; animal?: boolean }> = ({ tie, status, animal = false }) => {
  // "Tied to the animal" for an animal record (translate.ts forKind).
  const tr = forKind(useT(), animal ? 'animal' : 'plant');
  return (
    <Stack spacing={0.25} data-dna-tie={tie.state}>
      <Fact status={tie.state === 'none' ? 'reported' : status}>
        <b>{dnaTieSentence(tie, undefined, 'public', tr)}</b>
      </Fact>
      {isTied(tie) && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 3.25 }}>
          {dnaTieMeaning(tr)}
        </Typography>
      )}
    </Stack>
  );
};

/** The shared facts, then what was not shared, then the genetics row. */
export const SharedFacts: React.FC<{ data: SharedFactsData; preview?: boolean }> = ({ data, preview = false }) => {
  const animal = data.subjectKind === 'animal';
  // An animal's facts say "animal" where a plant's say "plant" (translate.ts forKind).
  const tr = forKind(useT(), animal ? 'animal' : 'plant');
  const { t } = tr;
  const shared = new Set(data.disclosed);
  const notShared = fieldsFor(animal ? 'animal' : 'plant')
    .filter((f) => !shared.has(LEGACY_NAME[f.key]) && !(f.key === 'name' && data.nameInLink))
    .map((f) => labelOf(f.key, tr));
  const clean = (p?: { name: string; individualId: string }) =>
    p ? parentWords({ name: displayName(p.name), individualId: displayName(p.individualId) }, tr) : '';
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
          <>
            {data.labReport.tie && <TieFact tie={data.labReport.tie} status={data.labReport.status} animal={animal} />}
            {/* With nothing saved, the tie line already says so. */}
            {data.labReport.tie?.state !== 'none' && <Fact status={data.labReport.status}>{data.labReport.text}</Fact>}
          </>
        ) : (
          <Fact ok={false}>{data.dnaPairedByHolder ? t('app.verify.dna.saved') : t('app.verify.report.notSaved')}</Fact>
        ))}
      {/* Lineage: no line (persona review, 17 Oct). The registry walks no descent for a shared
          link, so it only ever said "not checked"; the switch is gone from the share screen too.
          A registry that says "intact" is still only its say-so: a report, never a tick. */}
      {shared.has('lineage') && data.lineageIntact === true && <Fact ok={false}>{t('app.verify.lineage.intact')}</Fact>}
      {shared.has('sealed') && data.sealedAt !== undefined && (
        <Fact ok={false}>
          {t('app.verify.sealedAt', {
            date: fmt(data.sealedAt),
            first: data.registryFirstSeen ? t('app.verify.firstStoredBy', { date: fmt(data.registryFirstSeen) }) : '',
          })}
        </Fact>
      )}
      {/* An animal's sire and dam, by role, with their IDs: as the holder states them. */}
      {shared.has('parents') && animal && (data.sire || data.dam) && (
        <>
          {data.sire && <Fact ok={false}>{t('app.animal.verify.sireLine', { v: clean(data.sire) })}</Fact>}
          {data.dam && <Fact ok={false}>{t('app.animal.verify.damLine', { v: clean(data.dam) })}</Fact>}
        </>
      )}
      {shared.has('parents') && !(animal && (data.sire || data.dam)) && (
        <Fact ok={false}>
          {data.parents?.length
            ? t('app.verify.parents', { list: data.parents.map(displayName).join(' × ') })
            : t('app.verify.noParents')}
        </Fact>
      )}
      {shared.has('individualId') && animal && (
        <Fact ok={false}>
          {data.individualId
            ? t('app.animal.verify.idLine', {
                id: displayName(data.individualId),
                scheme: displayName(data.idScheme ?? ''),
              })
            : t('app.animal.verify.noId')}
        </Fact>
      )}
      {shared.has('method') && !animal && (
        <Fact ok={false}>
          {data.breedingMethod
            ? t('app.verify.method', { method: breedingMethodWords(displayName(data.breedingMethod), tr) })
            : t('app.verify.noMethod')}
        </Fact>
      )}

      {/* The name, published on purpose (round 5): anyone with the ID sees it. */}
      {shared.has('name') && (
        <Fact ok={false}>
          {data.name ? t('app.verify.nameShared', { name: displayName(data.name) }) : t('app.verify.noNameShared')}
        </Fact>
      )}

      {/* Who bred it, as the holder wrote it: only if the holder shared it. */}
      {shared.has('bredBy') && (
        <Fact ok={false}>
          {data.bredBy ? t('app.verify.bredByShared', { name: displayName(data.bredBy) }) : t('app.verify.noBredBy')}
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
): { status: FactStatus; text: string; tie: DnaTie } | undefined => {
  if (!saved) return undefined;
  const tie = dnaTieOf(saved, tr);
  if (saved.kind === 'none') return { status: 'reported', text: tr.t('app.verify.report.notSaved'), tie };
  if (saved.kind === 'replaced' || saved.kind === 'withdrawn')
    return { status: 'failed', text: savedReportSentence(saved, tr), tie };
  if (saved.kind === 'lab') return { status: 'checked', text: savedReportSentence(saved, tr), tie };
  return { status: 'reported', text: savedReportSentence(saved, tr), tie };
};

/** The holder's preview: what the verify page will show under these switches. */
export const DisclosedFacts: React.FC<{ record: StrainRecord; disclosure: Disclosure; saved?: SavedReport | null }> = ({
  record,
  disclosure,
  saved,
}) => {
  const animal = isAnimal(record);
  const tr = forKind(useT(), animal ? 'animal' : 'plant');
  const labReport = previewReportLine(saved, tr);
  const sire = sireOf(record);
  const dam = damOf(record);
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
          name: record.strainName,
          bredBy: record.bredBy,
          ...(animal
            ? {
                subjectKind: 'animal',
                ...(sire ? { sire: { name: sire.name, individualId: sire.individualId ?? '' } } : {}),
                ...(dam ? { dam: { name: dam.name, individualId: dam.individualId ?? '' } } : {}),
                individualId: record.refId ?? '',
                idScheme: record.animal?.idScheme ?? '',
              }
            : {}),
          ...(labReport ? { labReport } : {}),
        }}
      />
    </Stack>
  );
};
