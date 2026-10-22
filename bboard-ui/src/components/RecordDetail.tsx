// RecordDetail (/record/:id) — a single cultivar's full picture and its available next
// actions. Reuses the wizard step components so a returning breeder can pair a report,
// pull the evidence summary, or check a report file against an existing record.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Collapse, Divider, Link, Paper, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import CodeIcon from '@mui/icons-material/DataObjectOutlined';
import {
  useRecords,
  getRecord,
  exportEnvelope,
  childrenOf,
  allRecords,
  integrityOf,
  useSealedView,
} from '../veilcore/records';
import { LockedRecords } from './LockedRecords';
import { RecordSaveNotices } from './RecordSaveNotices';
import { FinishReceiving } from './FinishReceiving';
import { useRecordKeys } from '../veilcore/record-keys';
import { ProveOwnershipPanel } from './chain/ProveOwnershipPanel';
import { BackupStep } from './flow/BackupStep';
import { SectionBand, focusScreenHeading, type Section } from './flow/FlowFrame';
import { ActionRow, PlantStatus } from './flow/PlantParts';
import { rich, useRecordT } from '../i18n/app';
import { damOf, isAnimal, recordTitle, sireOf } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';
import { strainGroupWords, strainParentWords } from './flow/StrainForm';
import { parentWords, sexWords } from './flow/AnimalForm';
import { breedingMethodWords } from './flow/breeding-methods';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  useLicenses,
  licensesForRecord,
  activeLicenseCount,
  agreementType,
  allLicenses,
  createsHeritableObligation,
} from '../veilcore/licenses';
import { shortFingerprint } from '../veilcore/commitment';
import { StatusChain } from './StatusChain';
import { LineageGraph } from './LineageGraph';
import { HeritableRights } from './HeritableRights';
import { FamilyOnChain } from './chain/FamilyOnChain';
import { AGREEMENTS_ON_CHAIN } from '../config/copy';
import { NextStep } from './NextStep';
import { StageRows } from './stage/StageRows';
import { LabReportOverview } from './stage/LabReportOverview';
import { isLabReportRecord } from './stage/record-kinds';
import { upstreamOwnRoyalties } from './stage/self-chain';
import { SettlementStatus } from './SettlementStatus';
import { EvidenceBundle } from './EvidenceBundle';
import { BreedingHistory } from './history/BreedingHistory';
import { REAL_CHAIN } from '../veilcore/chain/config';
import { AnchorOnChainPanel } from './chain/AnchorOnChainPanel';
import { AttestationPanel } from './AttestationPanel';
import { RecordHistory } from './RecordHistory';
import { SendToLab } from './SendToLab';
import { CorrectRecord } from './CorrectRecord';
import { LicenseStateChip } from './licensing/LicenseStateChip';
import { AgreementTypeChip } from './licensing/AgreementTypeChip';
import { AppHeader } from './AppHeader';
import { linkCard } from './a11y';
import { Step2PairDna } from './wizard/Step2PairDna';
import { Step3Certificate } from './wizard/Step3Certificate';
import { Step4CheckReport } from './wizard/Step4CheckReport';
import { Step5ProveDisclosure } from './wizard/Step5ProveDisclosure';
import {
  LabResultsPanel,
  ReceivedFacts,
  SavedReportAlert,
  SendResultsPanel,
  useBreederReceipt,
  useDeliveries,
  useLabCardFacts,
  useLabReceipt,
  useSavedReport,
  waitingReports,
} from './flow/LabResults';
import { SignReceiptPanel } from './ClaimTransfer';
import { WaitingDeliveries } from './SendToLab';
import { useRole, isBreeder, isLab } from '../veilcore/role';
import { utcStamp as fmt } from '../veilcore/time';
import { LAB_RESULTS_ENABLED } from '../config/network';
import { CODE_TEXT } from '../config/theme';

type Mode =
  | 'overview'
  | 'pair'
  | 'cert'
  | 'check'
  | 'share'
  | 'backup'
  | 'stamp'
  | 'prove'
  | 'tree'
  | 'results'
  | 'sendResults'
  | 'signReceipt';

/** Which section each screen of this page belongs to: its band says so. */
const MODE_SECTION: Record<Exclude<Mode, 'overview'>, Section> = {
  pair: 'log',
  check: 'log',
  backup: 'log',
  stamp: 'log',
  tree: 'log',
  cert: 'prove',
  share: 'prove',
  prove: 'prove',
  results: 'send',
  sendResults: 'send',
  signReceipt: 'send',
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box>
    <Typography variant="overline" sx={{ display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2">{children}</Typography>
  </Box>
);

/** An animal's own fields, in its technical details (animal-profile.ts). */
const AnimalFields: React.FC<{ record: NonNullable<ReturnType<typeof getRecord>> }> = ({ record }) => {
  const tr = useRecordT(record);
  const { t } = tr;
  const sire = sireOf(record);
  const dam = damOf(record);
  return (
    <>
      <Field label={t('app.animal.breeder')}>{record.bredBy}</Field>
      {record.refId && (
        <Field label={t('app.animal.individualId')}>
          {t('app.animal.idIn', { id: record.refId, scheme: record.animal?.idScheme ?? '' })}
        </Field>
      )}
      <Field label={t('app.animal.species')}>{record.taxon}</Field>
      {record.animal?.breed && <Field label={t('app.animal.breed')}>{record.animal.breed}</Field>}
      <Field label={t('app.animal.sex')}>{sexWords(record.animal?.sex, tr)}</Field>
      <Field label={t('app.animal.f.statedBirth')}>{record.dateCreated || t('app.animal.notStated')}</Field>
      {sire && <Field label={t('app.animal.sire')}>{parentWords(sire, tr)}</Field>}
      {dam && <Field label={t('app.animal.dam')}>{parentWords(dam, tr)}</Field>}
      {record.animal?.herd && <Field label={t('app.animal.herd')}>{record.animal.herd}</Field>}
    </>
  );
};

/** A strain's own fields, in its technical details (strain-profile.ts). */
const StrainFields: React.FC<{ record: NonNullable<ReturnType<typeof getRecord>> }> = ({ record }) => {
  const tr = useRecordT(record);
  const { t } = tr;
  const parents = (record.parents ?? []).map((p) => strainParentWords(p)).filter(Boolean);
  return (
    <>
      <Field label={t('app.strain.maker')}>{record.bredBy}</Field>
      {record.refId && <Field label={t('app.strain.designation')}>{record.refId}</Field>}
      <Field label={t('app.strain.k.kindSpecies')}>
        {strainGroupWords(record.strain?.group, tr)} · {record.taxon}
      </Field>
      {record.strain?.deposits && record.strain.deposits.length > 0 && (
        <Field label={t('app.strain.k.deposits')}>{record.strain.deposits.join(' · ')}</Field>
      )}
      {record.breedingMethod && <Field label={t('app.strain.method')}>{record.breedingMethod}</Field>}
      {record.strain?.generation && <Field label={t('app.strain.f.generation')}>{record.strain.generation}</Field>}
      {parents.length > 0 && <Field label={t('app.strain.f.parents')}>{parents.join(' × ')}</Field>}
      <Field label={t('app.strain.k.made')}>{record.dateCreated || t('app.strain.notStated')}</Field>
    </>
  );
};

export const RecordDetail: React.FC = () => {
  useRecords();
  useLicenses();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // The paste box sends a proof request here as ?prove=<challenge>.
  const [params] = useSearchParams();
  const pastedChallenge = params.get('prove') ?? undefined;
  const [mode, setMode] = useState<Mode>(pastedChallenge ? 'prove' : 'overview');
  const [exportError, setExportError] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const record = getRecord(id);
  const { locked } = useSealedView();
  const keys = useRecordKeys()[id];
  const role = useRole();
  const labOnly = isLab(role) && !isBreeder(role);
  const received = !!record?.receivedFrom;
  // The breeder's: open codes, and lab reports labs sent back (lab-results.ts).
  const deliveries = useDeliveries(record?.id, !!record && !received);
  const arrived = deliveries?.arrived ?? null;
  const waiting = waitingReports(arrived ?? undefined);
  // Who signed for the sample: from signatures checked here, never record.attestation.
  const breederReceipt = useBreederReceipt(record, !!record && !received);
  const labReceipt = useLabReceipt(record, received);
  const labFacts = useLabCardFacts(record && received ? [record] : [], received)[id];
  const labSent = labFacts?.sent;
  // Sent at some point, withdrawn ones included: "withdrawn", never "not yet" (round 6).
  const labSentEver = labFacts?.sentEver;
  // Where the lab report saved to this plant stands: the lab may have replaced or withdrawn it.
  const saved = useSavedReport(received ? undefined : record, arrived);
  const [pairFile, setPairFile] = useState<{ file: File; from?: { resultId: string; sha: string } }>();
  const [autoOpen, setAutoOpen] = useState<string>();
  // Opening a panel ("Show someone", "Certificate", …) or going back is a new screen: move
  // focus to its heading (or the plant's name), so a screen reader says where they are.
  // The first render is the route's, and App already focuses that.
  const firstMode = useRef(true);
  // An animal record's page says "animal" where a plant's says "plant" (i18n forKind).
  const tr = useRecordT(record);
  const { t, tp } = tr;
  const animal = isAnimal(record);
  const strain = isStrain(record);
  // Agreements, royalties and the variety-application history are plant records' for now.
  const plant = !animal && !strain;
  useEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    return focusScreenHeading();
  }, [mode]);

  // A record sealed with a key this browser doesn't have: shown as locked, not as missing.
  if (!record && locked.some((l) => l.id === id)) {
    return (
      <Box sx={{ maxWidth: 680, mx: 'auto' }}>
        <AppHeader />
        <Button
          component={RouterLink}
          to="/records"
          startIcon={<HomeIcon />}
          sx={{ mb: 1.5, ml: -1.5, minHeight: 44, px: 1.5 }}
        >
          {t('app.plant.home')}
        </Button>
        <LockedRecords only={id} />
      </Box>
    );
  }

  if (!record) {
    return (
      <Box>
        <AppHeader />
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" component="h1" sx={{ mb: 1 }}>
            {t('app.plant.notHere')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 2 }}>
            {t('app.plant.notHereText')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Button component={RouterLink} to="/records" startIcon={<ArrowBackIcon />}>
              {t('app.plant.yourRecords')}
            </Button>
            <Button component={RouterLink} to="/verify">
              {t('app.plant.checkARecord')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const back = () => setMode('overview');
  const openResult = (resultId?: string) => {
    setAutoOpen(resultId);
    setMode('results');
  };
  const licenses = licensesForRecord(record.id);
  const hasFamily = (record.parents?.length ?? 0) > 0 || childrenOf(record.id).length > 0;
  const datesReport = isLabReportRecord(record);
  // A later stage of the breeder's own line shows the obligations panel when a record
  // upstream carries an offspring royalty, even with no agreement of its own.
  const upstreamRoyalty =
    upstreamOwnRoyalties(record, allRecords(), (rid) =>
      allLicenses().filter(
        (l) => l.recordId === rid && l.state === 'active' && createsHeritableObligation(l.type, l.terms),
      ),
    ).length > 0;

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <AppHeader />

      <Button
        component={RouterLink}
        to="/records"
        startIcon={<HomeIcon />}
        sx={{ mb: 1.5, ml: -1.5, minHeight: 44, px: 1.5 }}
      >
        {t('app.plant.home')}
      </Button>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {recordTitle(record)}
        </Typography>
        {/* Who it came from, then the record's code on its own line in the code face, like
            the two lines on a plant tag (no dot-joined meta string). */}
        <Typography variant="body1" color="text.secondary" sx={{ overflowWrap: 'anywhere', mt: 0.5 }}>
          {/* Who sent it, from their sealed offer (persona review, 17 Oct); the id when they didn't say. */}
          {record.receivedFrom
            ? record.senderName
              ? t('app.home.receivedFromNamed', { name: record.senderName, id: record.receivedFrom })
              : t('app.home.receivedFrom', { name: record.receivedFrom })
            : t('app.plant.bredByName', { name: record.bredBy })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ...CODE_TEXT, overflowWrap: 'anywhere' }}>
          {record.id}
        </Typography>
      </Box>

      {/* Worked out in this browser (api-store.ts): the registry can't read the record to check it. */}
      {integrityOf(record.id) === 'mismatch' && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }} data-integrity="mismatch">
          {t('app.sealed.mismatch')}
        </Alert>
      )}
      <FinishReceiving record={record} />
      <RecordSaveNotices record={record} onShare={() => setMode('share')} />

      {/* A record that dates a lab report is not a plant: its own short page (components/stage). */}
      {mode === 'overview' && datesReport && (
        <LabReportOverview
          record={record}
          keys={keys}
          onShare={() => setMode('share')}
          onBackup={() => setMode('backup')}
        />
      )}

      {mode === 'overview' && !datesReport && (
        <Stack spacing={2.5}>
          {/* A superseded record must say so. Someone opening it years later needs to
              know a correction exists, and a correcting record needs to point back. */}
          {record.supersededBy && (
            <Alert severity="info" variant="outlined">
              {rich(t('app.plant.corrected'), {
                link: (c) => (
                  <Link component={RouterLink} to={`/record/${record.supersededBy}`}>
                    {c}
                  </Link>
                ),
              })}
            </Alert>
          )}

          {record.supersedes && (
            <Alert severity="info" variant="outlined">
              {rich(
                t('app.plant.corrects'),
                {
                  link: (c) => (
                    <Link component={RouterLink} to={`/record/${record.supersedes?.recordId}`}>
                      {c}
                    </Link>
                  ),
                },
                { fields: record.supersedes.changedFields.join(', '), reason: record.supersedes.reason },
              )}
            </Alert>
          )}

          <PlantStatus
            record={record}
            keys={keys}
            arrived={arrived}
            waiting={waiting.length}
            receipt={received ? labReceipt : breederReceipt}
            labSent={labSent}
            labSentEver={labSentEver}
            saved={saved}
          />

          {/* Right under the record's date: everything needed to check it without us. */}
          {record.recordFingerprint && record.nonce && (
            <EvidenceBundle
              record={record}
              keys={keys}
              trigger={(open) => (
                <Typography variant="body2" sx={{ mt: -1.5 }}>
                  {rich(t('app.plant.evidenceLine'), {
                    link: (c) => (
                      <Link component="button" type="button" onClick={open} sx={{ verticalAlign: 'baseline' }}>
                        {c}
                      </Link>
                    ),
                    muted: (c) => (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {c}
                      </Box>
                    ),
                  })}
                </Typography>
              )}
            />
          )}

          {/* The next step says "Open the lab report" unless the backup or date stamp comes
              first; then this says it, so a lab report never waits unseen. */}
          {waiting.length > 0 && REAL_CHAIN && (!keys?.backedUpAt || !keys?.anchor) && (
            <Alert
              severity="success"
              variant="outlined"
              icon={<LockIcon />}
              action={
                <Button color="inherit" onClick={() => openResult(waiting[0].result.id)} sx={{ minHeight: 40 }}>
                  {t('app.plant.open')}
                </Button>
              }
            >
              {tp('app.plant.reportsCameBack', waiting.length)}
            </Alert>
          )}

          {/* Same for a saved lab report the lab replaced or withdrew (round 5): when the
              backup or date stamp is the next step, this says it. */}
          {REAL_CHAIN && (!keys?.backedUpAt || !keys?.anchor) && <SavedReportAlert saved={saved} onOpen={openResult} />}

          {deliveries && <WaitingDeliveries open={deliveries.open} />}

          {received && <ReceivedFacts record={record} />}

          {/* One thing to do next, worked out from where the plant stands. */}
          <NextStep
            record={record}
            keys={keys}
            onBackup={() => setMode('backup')}
            onStamp={() => setMode('stamp')}
            onPairDna={() => setMode('pair')}
            onAgreement={() => navigate(`/record/${record.id}/license?type=license`)}
            waiting={waiting}
            onOpenResult={openResult}
            receipt={received ? labReceipt : breederReceipt}
            labSent={labSent}
            labSentEver={labSentEver}
            onSendResults={() => setMode('sendResults')}
            onSignReceipt={() => setMode('signReceipt')}
            labOnly={labOnly}
            saved={saved}
          />

          {/* Everything else, in one plain list: a row per thing, its section's icon
              first, so the same job looks the same here and on Home. */}
          <Box>
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              {t('app.plant.moreYouCanDo')}
            </Typography>
            <Paper sx={{ p: { xs: 0.75, md: 1 } }}>
              <ActionRow
                section="prove"
                label={t('app.plant.action.show')}
                hint={t('app.plant.action.showHint')}
                onClick={() => setMode('share')}
              />
              {REAL_CHAIN && keys?.anchor && (
                <ActionRow
                  section="prove"
                  label={t('app.plant.action.askedToProve')}
                  onClick={() => setMode('prove')}
                />
              )}
              <ActionRow section="prove" label={t('app.plant.action.certificate')} onClick={() => setMode('cert')} />
              {LAB_RESULTS_ENABLED && record.receivedFrom && record.transferId && (
                <ActionRow
                  section="send"
                  label={t('app.plant.action.sendResults')}
                  hint={t('app.plant.action.sendResultsHint')}
                  onClick={() => setMode('sendResults')}
                />
              )}
              {received && labReceipt?.kind === 'not-signed' && (
                <ActionRow
                  section="send"
                  label={t('app.plant.action.signReceipt')}
                  hint={t('app.plant.action.signReceiptHint')}
                  onClick={() => setMode('signReceipt')}
                />
              )}
              {received && labReceipt?.kind === 'signed' && !labReceipt.linked && (
                <ActionRow
                  section="send"
                  label={t('app.plant.action.linkReceipt')}
                  hint={t('app.plant.action.linkReceiptHint')}
                  onClick={() => setMode('signReceipt')}
                />
              )}
              {arrived && arrived.length > 0 && (
                <ActionRow section="send" label={t('app.plant.action.labReports')} onClick={() => openResult()} />
              )}
              {!labOnly && (
                <SendToLab
                  record={record}
                  trigger={(open) => (
                    <ActionRow section="send" label={t('app.plant.action.sendToLab')} onClick={open} />
                  )}
                />
              )}
              {!labOnly && plant && (
                <ActionRow
                  section="license"
                  label={t('app.plant.action.licenseIt')}
                  tag={t('app.copy.practiceLabel')}
                  onClick={() => navigate(`/record/${record.id}/license?type=license`)}
                />
              )}
              {!record.dnaFingerprint && !received && (
                <ActionRow section="log" label={t('app.plant.action.saveReport')} onClick={() => setMode('pair')} />
              )}
              {/* The next stage of a breeding history, and dating the saved lab report (components/stage). */}
              <StageRows record={record} labOnly={labOnly} saved={saved} />
              <ActionRow section="log" label={t('app.plant.action.checkReport')} onClick={() => setMode('check')} />
              {hasFamily && (
                <ActionRow section="log" label={t('app.plant.action.familyTree')} onClick={() => setMode('tree')} />
              )}
              {REAL_CHAIN && keys && (
                <ActionRow section="log" label={t('app.plant.action.freshBackup')} onClick={() => setMode('backup')} />
              )}
              {/* A holder who mistypes something needs a path that is not deletion. */}
              <CorrectRecord
                record={record}
                trigger={(open) => <ActionRow section="log" label={t('app.plant.action.fix')} last onClick={open} />}
              />
            </Paper>
            {!plant && !labOnly && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-no-licensing="">
                {t(strain ? 'app.strain.noLicensing' : 'app.animal.noLicensing')}
              </Typography>
            )}
          </Box>

          {licenses.length > 0 && (
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
                {t('app.plant.agreements')} {t('app.copy.practiceLabel') && `· ${t('app.copy.practiceLabel')}`}
              </Typography>
              <Stack spacing={1}>
                {licenses.map((l) => (
                  <Stack
                    key={l.id}
                    direction="row"
                    {...linkCard(() => navigate(`/license/${l.id}`), t('app.plant.openAgreement', { id: l.id }))}
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      '&:hover, &:focus-visible': { background: 'rgba(30,34,39,0.05)', outline: 'none' },
                    }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                      {l.terms.licensee || t('app.plant.unnamedCounterparty')} · {l.id}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <AgreementTypeChip type={agreementType(l)} />
                      <LicenseStateChip license={l} />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* The detail a dispute or a technical reader needs, one tap away rather than
              in front of everyone. Nothing here is hidden from the holder. */}
          <Box>
            <Button
              onClick={() => setDetails(!details)}
              aria-expanded={details}
              aria-controls="record-technical-details"
              color="inherit"
              endIcon={details ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ minHeight: 44 }}
            >
              {t('app.plant.technicalDetails')}
            </Button>
            <Collapse in={details} id="record-technical-details">
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2}>
                    {animal ? (
                      <AnimalFields record={record} />
                    ) : strain ? (
                      <StrainFields record={record} />
                    ) : (
                      <>
                        <Field label={t('app.log.bredBy')}>{record.bredBy}</Field>
                        {record.taxon && <Field label={t('app.log.species')}>{record.taxon}</Field>}
                        {record.breedingMethod && (
                          <Field label={t('app.plant.f.method')}>
                            {breedingMethodWords(record.breedingMethod, tr)}
                          </Field>
                        )}
                        {record.parents && record.parents.length > 0 && (
                          <Field label={t('app.log.parents')}>{record.parents.map((p) => p.name).join(' × ')}</Field>
                        )}
                        <Field label={t('app.plant.f.statedDate')}>{record.dateCreated}</Field>
                      </>
                    )}
                    <Field label={t('app.plant.f.sealedClock')}>{fmt(record.loggedAt)}</Field>
                    {record.refId && plant && <Field label={t('app.plant.f.ref')}>{record.refId}</Field>}
                    {record.photoFingerprints && record.photoFingerprints.length > 0 && (
                      <Field label={t('app.plant.f.photos')}>
                        {t('app.plant.f.photosSealed', { n: record.photoFingerprints.length })}
                      </Field>
                    )}
                    {record.notes && <Field label={t('app.log.notes')}>{record.notes}</Field>}
                    <Field label={t('app.plant.dnaReport')}>
                      {record.dnaFingerprint
                        ? t('app.plant.f.reportSaved', {
                            file: record.dnaFileName ?? t('app.plant.f.file'),
                            fp: shortFingerprint(record.dnaFingerprint),
                            sha:
                              saved && saved.kind !== 'none' && saved.sha
                                ? t('app.plant.f.fileSha', { sha: shortFingerprint(saved.sha) })
                                : '',
                          })
                        : t('app.plant.f.notSavedYet')}
                    </Field>
                    <Divider />
                    <Field label={t('app.plant.f.recordFingerprint')}>
                      <Box component="span" sx={CODE_TEXT}>
                        {shortFingerprint(record.recordFingerprint)}
                      </Box>
                    </Field>
                    <StatusChain record={record} licenseCount={activeLicenseCount(record.id)} />
                  </Stack>
                </Paper>
                <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                  <AttestationPanel record={record} receipt={received ? undefined : breederReceipt} />
                </Paper>
                <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                  <SettlementStatus record={record} />
                  {REAL_CHAIN && <AnchorOnChainPanel recordId={record.id} />}
                </Paper>
                {REAL_CHAIN && AGREEMENTS_ON_CHAIN && keys?.anchor && (
                  <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                    <FamilyOnChain record={record} />
                  </Paper>
                )}
                {/* Every other panel answers "what is true now". A dispute asks "what
                    happened, and in what order". */}
                <RecordHistory record={record} />
                {(licenses.length > 0 || upstreamRoyalty) && (
                  <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                    <HeritableRights record={record} />
                  </Paper>
                )}
                {/* Everything here in one file, with a page that checks it offline. */}
                <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={1}>
                    <Typography variant="overline" sx={{ display: 'block' }}>
                      {t('app.plant.evidenceBundle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('app.plant.evidenceBundleText')}
                    </Typography>
                    <Box>
                      <EvidenceBundle record={record} keys={keys} />
                    </Box>
                  </Stack>
                </Paper>
                {/* This plant and its linked parents held here, for a variety application. */}
                {!labOnly && plant && record.recordFingerprint && record.nonce && (
                  <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
                    <BreedingHistory record={record} />
                  </Paper>
                )}
                {/* The wire format. Any implementation can read this and recompute the
                    commitment without our code, our chain, or our permission. */}
                <Box>
                  <Button
                    variant="text"
                    startIcon={<CodeIcon />}
                    onClick={() => {
                      setExportError(null);
                      exportEnvelope(record.id).catch((e: unknown) =>
                        setExportError(e instanceof Error ? e.message : t('app.plant.exportFailed')),
                      );
                    }}
                  >
                    {t('app.plant.exportRecord')}
                  </Button>
                  {exportError && (
                    <Alert severity="error" variant="outlined">
                      {exportError}
                    </Alert>
                  )}
                </Box>
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      )}

      {mode !== 'overview' && (
        <Box>
          <SectionBand section={MODE_SECTION[mode]} />
          <Paper sx={{ p: { xs: 2.25, md: 3.5 }, mt: 1.5 }}>
            {mode === 'pair' && (
              <Step2PairDna
                recordId={record.id}
                onBack={back}
                onDone={back}
                doneLabel={t('app.plant.backToPlant')}
                initialFile={pairFile?.file}
                from={pairFile?.from}
              />
            )}
            {mode === 'results' && (
              <LabResultsPanel
                record={record}
                keys={keys}
                arrived={arrived}
                autoOpen={autoOpen}
                saved={saved}
                onPair={(file, from) => {
                  setPairFile({ file, from });
                  setMode('pair');
                }}
              />
            )}
            {mode === 'sendResults' && (
              <SendResultsPanel record={record} onSignReceipt={() => setMode('signReceipt')} />
            )}
            {mode === 'signReceipt' && <SignReceiptPanel record={record} receipt={labReceipt} onDone={back} />}
            {mode === 'cert' && <Step3Certificate recordId={record.id} onBack={back} onDone={back} saved={saved} />}
            {mode === 'check' && <Step4CheckReport onBack={back} onRestart={back} />}
            {mode === 'share' && (
              <Step5ProveDisclosure
                recordId={record.id}
                onBack={back}
                onDone={back}
                saved={saved}
                {...(datesReport ? { backLabel: t('app.plant.backToRecord') } : {})}
              />
            )}
            {mode === 'backup' && (
              <BackupStep
                title={t('app.backup.title')}
                finishLabel={datesReport ? t('app.plant.backToRecord') : t('app.plant.backToPlant')}
                onDone={back}
                headingComponent="h2"
              />
            )}
            {mode === 'stamp' && <AnchorOnChainPanel recordId={record.id} />}
            {mode === 'prove' && <ProveOwnershipPanel recordId={record.id} initialChallenge={pastedChallenge} />}
            {mode === 'tree' && <LineageGraph record={record} />}
          </Paper>
          {(mode === 'stamp' ||
            mode === 'prove' ||
            mode === 'tree' ||
            mode === 'results' ||
            mode === 'sendResults' ||
            mode === 'signReceipt') && (
            <Button onClick={back} startIcon={<ArrowBackIcon />} sx={{ mt: 1.5, minHeight: 44 }}>
              {t('app.plant.backToPlant')}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
