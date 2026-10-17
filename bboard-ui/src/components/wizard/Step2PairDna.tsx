// Step 2 — Pair a lab report. The breeder picks the report their testing lab returned;
// the file is fingerprinted locally and never uploaded. Its fingerprint and file name are
// saved with the record on VeilCore's server. Pairing is the holder's own statement
// that this report belongs to this record; it is not a check of the genetics.
//
// Two fingerprints, never mixed (round 5): the file's plain SHA-256, which is what a lab
// signs, and the pairing fingerprint, the contract's `commit` over that SHA-256, which is
// what can be dated on the network. Both are saved; the screen names each. Saving over a
// lab report already saved asks first and says what changes.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import { motion } from 'framer-motion';
import { fingerprintFile, shortFingerprint } from '../../veilcore/commitment';
import { reportFingerprint } from '../../veilcore/lab-results';
import { attestationsFor, countsAsSigned, signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { labSaltsOf, signsReport } from '../../veilcore/lab-doc';
import { getRecord, pairDna, conflictsFor, type StrainRecord } from '../../veilcore/records';
import { FingerprintReveal } from './FingerprintReveal';
import { Dropzone } from './Dropzone';
import { rich, useRecordT } from '../../i18n/app';
import { recordTitle } from '../../veilcore/animal-profile';
import { utcDate } from '../../veilcore/time';
import { REAL_CHAIN, chainNotReady } from '../../veilcore/chain/config';
import { useRecordKeys } from '../../veilcore/record-keys';
import { PairDnaOnChainPanel } from '../chain/PairDnaOnChainPanel';
import { ScreenHeading, focusScreenHeading, isTouch, softDisabled } from '../flow/FlowFrame';

const MChip = motion(Chip);

export const Step2PairDna: React.FC<{
  recordId: string;
  onDone: () => void;
  /** Left out where there is nothing to go back to (logging, after the date stamp). */
  onBack?: () => void;
  onSkip?: () => void;
  /** h1 when this is the whole screen (logging), h2 inside the plant's page. */
  headingComponent?: 'h1' | 'h2';
  /** The flow's step counter, read with the heading. */
  stepLabel?: string;
  /** The button after pairing; the old wizard went on to the certificate. */
  doneLabel?: string;
  /** Shown above the drop zone, e.g. in the logging flow, before a lab ever got a cutting. */
  intro?: React.ReactNode;
  /** A report already in hand (a lab result just opened), so nobody picks it again. */
  initialFile?: File;
  /** The lab report the file came from, when it was opened from one. */
  from?: { resultId: string; sha: string };
}> = ({
  recordId,
  onDone,
  onBack,
  onSkip,
  doneLabel,
  intro,
  initialFile,
  from,
  headingComponent = 'h2',
  stepLabel,
}) => {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const hintId = useId();
  const pairedOnce = useRef(false);
  const [busy, setBusy] = useState(false);
  const [paired, setPaired] = useState<StrainRecord>();
  const [conflicts, setConflicts] = useState<StrainRecord[]>([]);
  const [error, setError] = useState<string>();
  const [fileSha, setFileSha] = useState<string>();
  const [labMatch, setLabMatch] = useState<ResolvedAttestation | null>();
  const record = getRecord(recordId);
  const keys = useRecordKeys()[recordId];
  const tr = useRecordT(getRecord(recordId));
  const { t, tp } = tr;
  const thisSite = t('app.copy.thisSite');
  const b = (c: React.ReactNode) => <b>{c}</b>;
  // The file came from a lab through VeilCore (opened from a lab report), not picked by hand.
  const fromLab = !!from && !!initialFile;
  // A lab report already saved to this plant, when this screen opened: saving replaces it.
  const [existing] = useState(() =>
    record?.dnaFingerprint ? { name: record.dnaFileName ?? t('app.pair.aFile'), at: record.dnaPairedAt } : undefined,
  );

  // Pairing changes the whole screen: start it at the top, focus on its heading.
  useEffect(() => {
    if (!paired || pairedOnce.current) return;
    pairedOnce.current = true;
    return focusScreenHeading();
  }, [paired]);

  const onPair = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const dnaHex = await fingerprintFile(file);
      const sha = reportFingerprint(new Uint8Array(await file.arrayBuffer()));
      const found = conflictsFor(dnaHex, recordId);
      const updated = pairDna(recordId, dnaHex, file.name, {
        fileSha256: sha,
        ...(from && from.sha === sha ? { resultId: from.resultId } : {}),
      });
      if (!updated) throw new Error(t('app.pair.noPlant'));
      setConflicts(found);
      setFileSha(sha);
      setPaired(updated);
      // Does a lab's signature name this exact file? Matched on the SHA-256, what a lab signs.
      // A signature since round 6 names it bound with s from the delivery's offer key (lab-doc.ts).
      void attestationsFor(updated.recordFingerprint, { asHolder: true }).then((atts) =>
        setLabMatch(
          atts.find(
            (a) => a.type === 'laboratory-report' && countsAsSigned(a) && signsReport(a, sha, labSaltsOf(updated)),
          ) ?? null,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (paired && paired.dnaFingerprint) {
    // "Below" only when the panel below can date it now (round 6): it says nothing on a build
    // that can't send, and only explains when the plant's key has no date stamp yet.
    const datableBelow = REAL_CHAIN && !chainNotReady() && !!keys?.anchor;
    const priority = [paired, ...conflicts].slice().sort((a, b) => a.loggedAt - b.loggedAt)[0];
    const yoursFirst = priority.id === paired.id;
    return (
      <Stack spacing={2}>
        <ScreenHeading step={stepLabel} component={headingComponent} variant={headingComponent === 'h1' ? 'h4' : 'h5'}>
          {t('app.pair.savedTitle')}
        </ScreenHeading>
        <FingerprintReveal
          fingerprint={paired.dnaFingerprint}
          label={t('app.pair.fpLabel')}
          headline={fromLab ? t('app.pair.openedHere') : t('app.pair.stayed')}
          sub={fromLab ? t('app.pair.openedHereSub') : t('app.pair.stayedSub')}
        />
        {fileSha && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>
            {rich(t('app.pair.fileSha'), { b }, { sha: shortFingerprint(fileSha) })}
          </Typography>
        )}
        {labMatch && (
          <Alert severity="success" variant="outlined" data-lab-match="">
            {t('app.pair.labMatch', { lead: signerLabel(labMatch, 'signed by', undefined, tr).lead })}
          </Alert>
        )}
        {labMatch === null && (
          <Typography variant="body2" color="text.secondary">
            {t('app.pair.noLabMatch')}
          </Typography>
        )}
        {/* the 1-2 punch completing */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <MChip
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            color="primary"
            variant="outlined"
            label={t('app.pair.recordChip', { fp: shortFingerprint(paired.recordFingerprint) })}
          />
          <LinkIcon sx={{ color: 'text.secondary' }} />
          <MChip
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            color="primary"
            variant="outlined"
            label={t('app.pair.pairingChip', { fp: shortFingerprint(paired.dnaFingerprint) })}
          />
        </Stack>
        {conflicts.length > 0 && (
          <Alert severity="warning" variant="outlined">
            {tp('app.pair.conflicts', conflicts.length, {
              tail: yoursFirst
                ? t('app.pair.earliest')
                : t('app.pair.earlier', { name: priority.strainName, date: utcDate(priority.loggedAt) }),
            })}
          </Alert>
        )}
        <Alert severity="success" variant="outlined">
          {t('app.pair.saved', {
            dated: datableBelow
              ? t('app.pair.dateBelow')
              : REAL_CHAIN
                ? t('app.pair.notDated')
                : t('app.pair.notDatedHere', { thisSite }),
          })}
        </Alert>
        {REAL_CHAIN && <PairDnaOnChainPanel recordId={paired.id} />}
        <Box>
          <Button variant="contained" size="large" onClick={onDone}>
            {doneLabel ?? t('app.pair.seeCertificate')}
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading
          step={stepLabel}
          component={headingComponent}
          variant={headingComponent === 'h1' ? 'h4' : 'h5'}
          mb={0.5}
        >
          {t('app.pair.title')}
        </ScreenHeading>
        <Typography variant="body2" color="text.secondary">
          {t('app.pair.intro')}
        </Typography>
        {record && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {rich(t('app.pair.savingTo'), { b }, { name: recordTitle(record), by: record.bredBy })}
          </Typography>
        )}
      </Box>

      {intro}

      {existing && (
        <Alert severity="warning" variant="outlined" data-replaces="">
          {rich(
            t(REAL_CHAIN ? 'app.pair.replacesChain' : 'app.pair.replaces'),
            { b },
            { name: existing.name, saved: existing.at ? t('app.pair.savedOn', { date: utcDate(existing.at) }) : '' },
          )}
        </Alert>
      )}

      <Alert icon={<ScienceIcon />} severity="info" variant="outlined">
        {t('app.pair.noDna', {
          after: REAL_CHAIN ? t('app.pair.afterChain') : t('app.pair.afterDemo', { thisSite }),
        })}
      </Alert>

      <Dropzone
        file={file}
        onFile={setFile}
        title={isTouch() ? t('app.pair.tap') : t('app.pair.drag')}
        hint={t('app.pair.dropHint')}
      />

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      {/* A lab report that came from the lab through VeilCore is already the lab's signed
          one: its signature is checked once it's saved (round 6). */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {fromLab ? t('app.pair.fromLab') : t('app.pair.labCanSign')}
      </Typography>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        {onBack && (
          <Button variant="text" onClick={onBack} sx={{ minHeight: 44 }}>
            {t('app.common.back')}
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          {...softDisabled(busy || !file, hintId)}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          onClick={() => {
            if (!busy && file) void onPair();
          }}
        >
          {busy ? t('app.pair.fingerprinting') : existing ? t('app.pair.replace') : t('app.plant.next.save.action')}
        </Button>
        {onSkip && (
          <Button variant="text" color="inherit" onClick={onSkip} sx={{ minHeight: 44 }}>
            {t('app.pair.skip')}
          </Button>
        )}
      </Stack>
      {!file && (
        <Typography id={hintId} variant="caption" color="text.secondary">
          {t('app.pair.chooseFirst')}
        </Typography>
      )}
      {busy && (
        <Typography id={hintId} variant="caption" color="text.secondary" role="status">
          {t('app.pair.fingerprinting')}
        </Typography>
      )}
    </Stack>
  );
};
