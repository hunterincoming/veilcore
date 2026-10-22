// Step 3 — The record certificate. A downloadable summary with a QR code to the
// record's verify page. Every check it shows is computed when it is shown: the integrity
// line recomputes the fingerprint from the stored fields (records.checkIntegrity, which
// uses veilcore-records' canonical serialisation), and the anchor line asks the registry
// for the batch proof and verifies it locally. Nothing is printed as a pass unless it was
// checked. The time is this device's clock until the record is anchored.
//
// The card itself, like the PNG and JSON made from it, stays in English in every language: it
// is a document that leaves the app, read next to the record file. The screen around it is
// translated, and says the file is in English (InEnglishNote).
//
// The card is drawn in fixed light colours (the site's light design), not the theme's, so
// the screen and the downloaded image look the same and stay readable wherever the image
// ends up. A test-network build marks the card as practice: a test record is not evidence.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Divider, Snackbar, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import ReportedIcon from '@mui/icons-material/ScheduleOutlined';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { getRecord, checkIntegrity, type IntegrityCheck } from '../../veilcore/records';
import { proofFor, type ProofState } from '../../veilcore/proofs';
import { IS_MAINNET, NETWORK, networkLabel, canonicalUrl } from '../../config/network';
import { useLicenses, activeLicenseCount, licensesForRecord } from '../../veilcore/licenses';
import { shortFingerprint } from '../../veilcore/commitment';
import { nameLinkParams, verifyPath } from '../../veilcore/verify-link';
import { ERROR_COLOR, HAIRLINE, INK_COLOR, LINE_COLOR, MUTED_COLOR, OK_COLOR, SHEET } from '../../config/theme';
import { utcDate, utcStamp as fmtStamp } from '../../veilcore/time';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { ProveOwnershipPanel } from '../chain/ProveOwnershipPanel';
import { useRecordKeys } from '../../veilcore/record-keys';
import { custodyLines, custodySummary, receiptLineFor } from '../../veilcore/custody';
import { signerLabel } from '../../veilcore/attesters';
import { NameCheckText } from '../NameCheckText';
import { useBreederReceipt, useSavedReport } from '../flow/LabResults';
import { savedReportSentence, type SavedReport } from '../../veilcore/saved-report';
import { dnaTieMeaning, dnaTieSentence } from '../../veilcore/dna-tie';
import { useDnaTie } from '../flow/useDnaTie';
import { InEnglishNote, useRecordT } from '../../i18n/app';
import { enT, forKind } from '../../i18n/translate';
import { certificateSummary } from './certificate-summary';
import { damOf, isAnimal, parentLine, recordTitle, sireOf } from '../../veilcore/animal-profile';
import { isStrain } from '../../veilcore/strain-profile';
import { strainGroupWords, strainParentWords } from '../flow/StrainForm';

// The certificate's own colours: a specimen sheet, ink on archival paper, every pair at
// least 4.5:1. A check that passed is a ✓ in the quiet green; one that failed is a ✗ in the
// error red. Its rules are the sheet's dashed hairlines.
const CERT = {
  ground: SHEET,
  ink: INK_COLOR,
  muted: MUTED_COLOR,
  line: LINE_COLOR,
  hairline: HAIRLINE,
  ok: OK_COLOR,
  error: ERROR_COLOR,
  practice: '#8F5500',
} as const;

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** The practice mark on a test-network certificate. */
export const PRACTICE_BAND = 'TEST NETWORK — PRACTICE ONLY, NOT EVIDENCE';
const PRACTICE_WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'><text x='320' y='210' text-anchor='middle' dominant-baseline='middle' transform='rotate(-28 320 210)' font-family='Arial, sans-serif' font-weight='900' font-size='50' letter-spacing='4' fill='#9A5B00' fill-opacity='0.08'>PRACTICE · TEST NETWORK</text></svg>",
)}")`;
export const IMAGE_NOT_EVIDENCE = 'This image is not evidence. The record file and the network transaction are.';

const Field: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="overline" sx={{ display: 'block', mb: 0.25, color: CERT.muted, lineHeight: 1.6 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ color: CERT.ink, overflowWrap: 'anywhere', ...(mono ? { fontFamily: MONO, fontSize: '0.8125rem' } : {}) }}
    >
      {children}
    </Typography>
  </Box>
);

export const Step3Certificate: React.FC<{
  recordId: string;
  onDone: () => void;
  onBack: () => void;
  /** Where the saved lab report stands, when the page already knows (else loaded here). */
  saved?: SavedReport | null;
}> = ({ recordId, onDone, onBack, saved: given }) => {
  useLicenses();
  const certRef = useRef<HTMLDivElement>(null);
  const record = getRecord(recordId);
  const { t } = useRecordT(record);
  const [toast, setToast] = useState<string>();
  // The card is in English (above); an animal's says "animal" where a plant's says "plant".
  const animal = isAnimal(record);
  const strain = isStrain(record);
  const en = forKind(enT, animal ? 'animal' : strain ? 'strain' : 'plant');
  const anchorHere = useRecordKeys()[recordId]?.anchor;
  const [integrity, setIntegrity] = useState<IntegrityCheck | 'checking'>('checking');
  const [anchor, setAnchor] = useState<ProofState | 'checking'>('checking');
  const receipt = useBreederReceipt(record, !!record && !record.receivedFrom);
  // Round 5: a saved lab report the lab replaced or withdrew is never printed as a tick.
  const loadedSaved = useSavedReport(given === undefined ? record : undefined);
  const saved = given === undefined ? loadedSaved : given;
  // The card is in English in every language (above), so the tie is too.
  const dna = useDnaTie(record, saved, en);

  useEffect(() => {
    if (!record) return;
    let live = true;
    void checkIntegrity(record).then((r) => live && setIntegrity(r));
    void proofFor(record.recordFingerprint).then((p) => live && setAnchor(p));
    return () => {
      live = false;
    };
  }, [record]);

  if (!record) return <Typography>{t('app.prove.share.notFound')}</Typography>;

  const integrityText: Record<IntegrityCheck | 'checking', string> = {
    checking: 'checking…',
    match: '✓ proof code recomputed from the stored fields: it matches',
    mismatch: '✗ proof code recomputed from the stored fields: it does NOT match, so the details have changed',
    unsealed: 'not sealed yet',
    'no-nonce': 'cannot be recomputed (this record predates stored nonces)',
  };
  const integrityLine = integrityText[integrity];

  // Only a proof checked here (bound to this record, folding to its root) is printed,
  // and its anchor as the registry's report. Nothing on a certificate says "anchored"
  // on the registry's word alone (attack round D).
  const anchorLine =
    anchor === 'checking'
      ? 'checking…'
      : anchor.status === 'anchor-reported'
        ? `Not confirmed. In batch ${anchor.proof.batchId} (inclusion checked); the registry reports the root on ${networkLabel(anchor.proof.anchor?.network ?? NETWORK)}, tx ${anchor.proof.anchor?.txHash ?? ''}. Look it up before relying on the date.`
        : anchor.status === 'pending'
          ? 'Not yet: in a batch waiting to be anchored. Until then, its date rests on this registry’s records.'
          : 'Not yet. Until it is anchored, its date rests on this registry’s records.';

  // The link and QR code name the record's fingerprint: the verify page checks the
  // proof and attestations against it, not against the registry's answer. The name goes
  // after the # (round 5): the certificate prints it anyway, and the registry no longer has it.
  const verifyLink = canonicalUrl(verifyPath(record.id, record.recordFingerprint, nameLinkParams(record)));

  // A used lab code is not a receipt: the registry writes it when anyone holding the code
  // takes delivery, with no name and no signature. Only a receipt the lab linked to the
  // delivery, checked here, is printed as one.
  const deliveryLine = receiptLineFor(record, receipt);
  // On screen, a checked name's listing is a link (round 4). The line ends with the label's
  // `rest` exactly when the name is checked; that tail is drawn by NameCheckText instead.
  const receiptLabel = !record.receivedFrom && receipt?.kind === 'signed' ? signerLabel(receipt.by) : null;
  const deliveryHead =
    receiptLabel?.checked && deliveryLine.endsWith(receiptLabel.rest)
      ? deliveryLine.slice(0, deliveryLine.length - receiptLabel.rest.length)
      : null;

  // A summary, not evidence: the record file and the network transaction are. It carries
  // no "it matches" line: a file can say anything about itself, so a check written into
  // it proves nothing. Whoever opens it recomputes the fingerprint (docs/spec).
  const sampleCustody =
    !record.receivedFrom && receipt?.kind === 'signed' ? custodySummary(receipt.custody) : undefined;
  const downloadJson = () => {
    // Agreements: how many, nothing else (certificate-summary.ts).
    const data = certificateSummary({
      ...(IS_MAINNET ? {} : { practice: PRACTICE_BAND }),
      record,
      ...(animal || strain ? {} : { agreements: licensesForRecord(record.id) }),
      anchored: anchorLine,
      secondParty: deliveryLine,
      ...(sampleCustody ? { sampleCustody } : {}),
      ...(dna.tie ? { dnaReport: dnaTieSentence(dna.tie, dna.date, 'holder', en) } : {}),
      ...(record.dnaFingerprint && saved ? { labReportSaved: savedReportSentence(saved, en) } : {}),
      note: `VeilCore record summary. No genetic data or lab files; it contains the record details. ${IMAGE_NOT_EVIDENCE.replace('This image', 'This summary')}`,
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.id}-summary.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(t('app.plant.cert.jsonDone'));
  };

  const download = async () => {
    if (!certRef.current) return;
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 2, backgroundColor: CERT.ground, cacheBust: true });
      const a = document.createElement('a');
      a.download = `${record.id}-veilcore-certificate.png`;
      a.href = dataUrl;
      a.click();
      setToast(t('app.plant.cert.pngDone'));
    } catch {
      setToast(t('app.plant.cert.pngFailed'));
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyLink);
    setToast(t('app.plant.cert.linkCopied'));
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="" sx={{ mb: 0.5 }}>
          {t('app.plant.action.certificate')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.cert.intro')}
          <InEnglishNote />
        </Typography>
      </Box>

      {/* the certificate itself (captured for download) */}
      <Box
        ref={certRef}
        data-certificate=""
        // English in every language (above): marked so, for screen readers and line breaking.
        lang="en"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          backgroundColor: CERT.ground,
          // Across the middle as well as the band, so cropping the band off doesn't make a
          // practice certificate look real. A faint picture, not text: the words over it
          // keep their contrast, and screen readers already have the band.
          ...(IS_MAINNET
            ? {}
            : {
                backgroundImage: PRACTICE_WATERMARK,
                backgroundRepeat: 'repeat-y',
                backgroundSize: '100% auto',
                backgroundPosition: 'center top',
              }),
          color: CERT.ink,
          border: `1px solid ${CERT.hairline}`,
          boxShadow: '0 1px 2px rgba(92, 79, 46, 0.08)',
        }}
      >
        {!IS_MAINNET && (
          <Box
            data-practice=""
            sx={{
              background: CERT.practice,
              color: '#FFFFFF',
              px: 2,
              py: 1,
              textAlign: 'center',
              fontWeight: 800,
              letterSpacing: '0.06em',
              fontSize: '0.875rem',
            }}
          >
            {PRACTICE_BAND}
          </Box>
        )}
        <Box sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <Box>
              <Typography variant="overline" sx={{ color: CERT.ink }}>
                VeilCore
              </Typography>
              <Typography variant="h5" component="p" sx={{ lineHeight: 1.1, color: CERT.ink }}>
                Record summary
              </Typography>
            </Box>
            {/* No seal: this site does not read the chain, so a reported anchor is the
                registry's word (proofs.ts). A neutral mark, labelled as exactly that. */}
            {anchor !== 'checking' && anchor.status === 'anchor-reported' && (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: CERT.muted }}>
                <ReportedIcon sx={{ fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: CERT.muted }}>
                  Anchor reported by the registry
                </Typography>
              </Stack>
            )}
          </Stack>

          <Divider sx={{ mb: 2.5, borderColor: CERT.hairline, borderBottomStyle: 'dashed', borderBottomWidth: 1.5 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
              {animal ? (
                <>
                  <Field label="Animal">{recordTitle(record)}</Field>
                  {record.refId && (
                    <Field label="Individual ID">
                      {record.refId} ({record.animal?.idScheme})
                    </Field>
                  )}
                  <Field label="Species">{[record.taxon, record.animal?.breed].filter(Boolean).join(' · ')}</Field>
                  <Field label="Sex">
                    {record.animal?.sex === 'female' ? 'Female' : record.animal?.sex === 'male' ? 'Male' : 'Not stated'}
                  </Field>
                  {sireOf(record) && <Field label="Sire">{parentLine(sireOf(record))}</Field>}
                  {damOf(record) && <Field label="Dam">{parentLine(damOf(record))}</Field>}
                  <Field label="Breeder or holder">{record.bredBy}</Field>
                  <Field label="Date of birth (holder's statement)">{record.dateCreated || 'Not stated'}</Field>
                </>
              ) : strain ? (
                <>
                  <Field label="Strain or line">{recordTitle(record)}</Field>
                  {record.refId && <Field label="Designation">{record.refId}</Field>}
                  <Field label="Kind and species">
                    {strainGroupWords(record.strain?.group, en)} · {record.taxon}
                  </Field>
                  {record.strain?.deposits && record.strain.deposits.length > 0 && (
                    <Field label="Deposit numbers">{record.strain.deposits.join(' · ')}</Field>
                  )}
                  {record.breedingMethod && <Field label="How it was made">{record.breedingMethod}</Field>}
                  {record.strain?.generation && <Field label="Generation or passage">{record.strain.generation}</Field>}
                  {(record.parents ?? []).length > 0 && (
                    <Field label="Parent strains">
                      {(record.parents ?? []).map((p) => strainParentWords(p)).join(' × ')}
                    </Field>
                  )}
                  <Field label="Made or isolated by">{record.bredBy}</Field>
                  <Field label="Made or isolated on (holder's statement)">{record.dateCreated || 'Not stated'}</Field>
                </>
              ) : (
                <>
                  <Field label="Cultivar">{record.strainName}</Field>
                  <Field label="Bred by">{record.bredBy}</Field>
                  <Field label="Stated creation date (breeder's claim)">{record.dateCreated}</Field>
                  {record.taxon && <Field label="Species">{record.taxon}</Field>}
                </>
              )}
              <Field label="Logged (the sealing device's clock)">{fmtStamp(record.loggedAt)}</Field>
              <Field label="Anchored">
                <Box component="span" sx={{ color: CERT.muted }}>
                  {anchorLine}
                </Box>
              </Field>
              {REAL_CHAIN && anchorHere && (
                <Field label={IS_MAINNET ? 'On-chain identity' : 'On-chain identity (test network)'}>
                  {shortFingerprint(anchorHere.identity)} · block {anchorHere.blockHeight}
                </Field>
              )}
              {/* A dated record shows a description existed; the DNA report is what ties it
                  to the plant. Said first, in one sentence, then what the saved file is. */}
              <Field
                label={
                  animal
                    ? 'Tied to the animal (DNA report)'
                    : strain
                      ? 'Tied to the strain (DNA report)'
                      : 'Tied to the plant (DNA report)'
                }
              >
                {!record.dnaFingerprint ? (
                  <Box component="span" data-dna-tie="none">
                    {dnaTieSentence({ state: 'none' }, dna.date, 'holder', en)}
                  </Box>
                ) : saved === null || saved === undefined || !dna.tie ? (
                  'checking…'
                ) : saved.kind === 'replaced' || saved.kind === 'withdrawn' ? (
                  <Box
                    component="span"
                    sx={{ color: CERT.error }}
                    data-saved-report={saved.kind}
                    data-dna-tie={dna.tie.state}
                  >
                    ✗ {dnaTieSentence(dna.tie, dna.date, 'holder', en)} {savedReportSentence(saved, en)}
                  </Box>
                ) : (
                  <Box
                    component="span"
                    sx={{ color: saved.kind === 'lab' ? CERT.ok : CERT.ink }}
                    data-saved-report={saved.kind}
                    data-dna-tie={dna.tie.state}
                  >
                    {saved.kind === 'lab' ? '✓ ' : ''}
                    {dnaTieSentence(dna.tie, dna.date, 'holder', en)} Saved
                    {record.dnaPairedAt ? ` ${utcDate(record.dnaPairedAt)}` : ''}. {savedReportSentence(saved, en)}{' '}
                    {dnaTieMeaning(en)}
                  </Box>
                )}
              </Field>
              <Field label="Unchanged since sealing">
                <Box
                  component="span"
                  sx={{
                    color: integrity === 'match' ? CERT.ok : integrity === 'mismatch' ? CERT.error : CERT.muted,
                  }}
                >
                  {integrityLine}
                </Box>
              </Field>
              <Field label="Lab receipt">
                {deliveryHead !== null && receiptLabel ? (
                  <>
                    {deliveryHead}
                    <NameCheckText label={receiptLabel} english />
                  </>
                ) : (
                  deliveryLine
                )}
                {/* The sample's chain of custody on that delivery: differences said plainly. */}
                {!record.receivedFrom &&
                  receipt?.kind === 'signed' &&
                  custodyLines(receipt.custody).map((l) => (
                    <Box component="span" key={l} sx={{ display: 'block', mt: 0.25 }} data-custody-line="">
                      {l}
                    </Box>
                  ))}
              </Field>
              {/* Date-checked (effectiveState: past its end date is expired), and said for what it
                  is: marked active, in this version from the issuer's own browser. */}
              {!animal && !strain && <Field label="Agreements marked active">{activeLicenseCount(record.id)}</Field>}
              <Field label="Record ID" mono>
                {record.id}
              </Field>
              <Field label="Proof code (SHA-256)" mono>
                <Box component="span" data-fingerprint="">
                  {record.recordFingerprint}
                </Box>
              </Field>
            </Stack>

            <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ p: 1.5, background: CERT.ground, borderRadius: 2, border: `1px solid ${CERT.hairline}` }}>
                {/* Drawn larger than before: the link now carries the 64-character proof code. */}
                <QRCodeSVG
                  value={verifyLink}
                  size={144}
                  bgColor={CERT.ground}
                  fgColor={CERT.ink}
                  level="M"
                  role="img"
                  aria-label="QR code that opens this record's public check page"
                  title="QR code that opens this record's public check page"
                />
              </Box>
              <Typography variant="caption" sx={{ color: CERT.muted }}>
                Scan to check the record
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: CERT.hairline, borderBottomStyle: 'dashed', borderBottomWidth: 1.5 }} />
          <Typography variant="body2" sx={{ color: CERT.ink, fontWeight: 700 }}>
            {IMAGE_NOT_EVIDENCE}
          </Typography>
          <Typography variant="caption" sx={{ color: CERT.muted, display: 'block', mt: 0.5 }}>
            Scan the code to check the record. No genetic data or lab files on this summary.
          </Typography>
        </Box>
      </Box>

      {REAL_CHAIN && <ProveOwnershipPanel recordId={recordId} />}

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <Button variant="text" onClick={onBack}>
          {t('app.common.back')}
        </Button>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink}>
          {t('app.plant.cert.copyLink')}
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download}>
          {t('app.plant.cert.downloadPng')}
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadJson}>
          {t('app.plant.cert.downloadJson')}
        </Button>
        <Button variant="contained" onClick={onDone}>
          {t('app.plant.cert.continue')}
        </Button>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(undefined)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
};
