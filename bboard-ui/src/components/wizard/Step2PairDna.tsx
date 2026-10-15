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
import { getRecord, pairDna, conflictsFor, type StrainRecord } from '../../veilcore/records';
import { FingerprintReveal } from './FingerprintReveal';
import { Dropzone } from './Dropzone';
import { THIS_SITE } from '../../config/copy';
import { utcDate } from '../../veilcore/time';
import { REAL_CHAIN } from '../../veilcore/chain/config';
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
  doneLabel = 'Continue: see the certificate',
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
  // A lab report already saved to this plant, when this screen opened: saving replaces it.
  const [existing] = useState(() =>
    record?.dnaFingerprint ? { name: record.dnaFileName ?? 'a file', at: record.dnaPairedAt } : undefined,
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
      if (!updated) throw new Error('Could not find the plant to save it to.');
      setConflicts(found);
      setFileSha(sha);
      setPaired(updated);
      // Does a lab's signature name this exact file? Matched on the SHA-256, what a lab signs.
      void attestationsFor(updated.recordFingerprint).then((atts) =>
        setLabMatch(
          atts.find((a) => a.type === 'laboratory-report' && countsAsSigned(a) && a.documentHash === sha) ?? null,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (paired && paired.dnaFingerprint) {
    const priority = [paired, ...conflicts].slice().sort((a, b) => a.loggedAt - b.loggedAt)[0];
    const yoursFirst = priority.id === paired.id;
    return (
      <Stack spacing={2}>
        <ScreenHeading step={stepLabel} component={headingComponent} variant={headingComponent === 'h1' ? 'h4' : 'h5'}>
          Lab report saved to this plant
        </ScreenHeading>
        <FingerprintReveal
          fingerprint={paired.dnaFingerprint}
          label="PAIRING FINGERPRINT"
          headline="The report file stayed on your device."
          sub="It was read and fingerprinted here in your browser. Its fingerprint and file name were saved with your record."
        />
        {fileSha && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>
            File SHA-256: <b>{shortFingerprint(fileSha)}</b>. This is the fingerprint a lab signs: compare it with the
            lab&apos;s. The pairing fingerprint above is made from it, so the pairing can be dated on the network.
          </Typography>
        )}
        {labMatch && (
          <Alert severity="success" variant="outlined" data-lab-match="">
            This file matches the lab report {signerLabel(labMatch, 'signed by').lead}, by its SHA-256 (signature
            checked in this browser).
          </Alert>
        )}
        {labMatch === null && (
          <Typography variant="body2" color="text.secondary">
            No lab signature on this plant matches this file, so it stays your own statement.
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
            label={`Record · ${shortFingerprint(paired.recordFingerprint)}`}
          />
          <LinkIcon sx={{ color: 'primary.main' }} />
          <MChip
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            color="primary"
            variant="outlined"
            label={`Pairing · ${shortFingerprint(paired.dnaFingerprint)}`}
          />
        </Stack>
        {conflicts.length > 0 && (
          <Alert severity="warning" variant="outlined">
            Heads up: this lab report is also saved to {conflicts.length} other record
            {conflicts.length === 1 ? '' : 's'} you hold
            {yoursFirst
              ? '. This record was sealed earliest, by the clocks of the devices that sealed them.'
              : `. ${priority.strainName} was sealed earlier (${utcDate(priority.loggedAt)}, by its device's clock).`}
          </Alert>
        )}
        <Alert severity="success" variant="outlined">
          Saved. Your lab report&apos;s fingerprint is saved with this plant&apos;s record, as your statement that this
          report belongs to it. It is not a check of the genetics.{' '}
          {REAL_CHAIN
            ? 'It is not dated yet: date it below if you want the pairing on the network.'
            : `In ${THIS_SITE} the pairing isn’t dated yet.`}
        </Alert>
        {REAL_CHAIN && <PairDnaOnChainPanel recordId={paired.id} />}
        <Box>
          <Button variant="contained" size="large" onClick={onDone}>
            {doneLabel}
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
          Save your lab report to this plant
        </ScreenHeading>
        <Typography variant="body2" color="text.secondary">
          Got your lab report back? Save it to this plant, so it can later be compared against a fresh test.
        </Typography>
        {record && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Saving to: <b>{record.strainName}</b> · bred by {record.bredBy}
          </Typography>
        )}
      </Box>

      {intro}

      {existing && (
        <Alert severity="warning" variant="outlined" data-replaces="">
          <b>
            This plant already has a lab report saved: “{existing.name}”
            {existing.at ? `, saved ${utcDate(existing.at)}` : ''}.
          </b>{' '}
          Saving this one replaces it. Your plant page, its certificate and links you share will show the new one, not
          the old one. Nothing is deleted from your device.
          {REAL_CHAIN ? ' If you dated the old pairing on the network, that date stays there.' : ''}
        </Alert>
      )}

      <Alert icon={<ScienceIcon />} severity="info" variant="outlined">
        VeilCore doesn&apos;t test DNA: you save the lab report your testing lab gave you. It&apos;s read and
        fingerprinted on your device; the file is never uploaded. Its fingerprint and file name are saved with your
        record.{' '}
        {REAL_CHAIN
          ? 'Afterwards you can also date the pairing on the network.'
          : `In ${THIS_SITE} the pairing isn’t dated yet; on VeilCore’s contract it is.`}
      </Alert>

      <Dropzone
        file={file}
        onFile={setFile}
        title={isTouch() ? 'Tap to choose your lab report' : 'Drag your lab report here, or click to choose'}
        hint="The report file your testing lab returned — read locally, never uploaded."
      />

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        A lab can also sign a lab report with its own key; a signed one carries more weight than one you save yourself.
        Here, save the lab report file you have.
      </Typography>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        {onBack && (
          <Button variant="text" onClick={onBack} sx={{ minHeight: 44 }}>
            Back
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
          {busy
            ? 'Fingerprinting on your device…'
            : existing
              ? 'Replace the saved lab report'
              : 'Save it to this plant'}
        </Button>
        {onSkip && (
          <Button variant="text" color="inherit" onClick={onSkip} sx={{ minHeight: 44 }}>
            No report yet: skip
          </Button>
        )}
      </Stack>
      {!file && (
        <Typography id={hintId} variant="caption" color="text.secondary">
          Choose the lab report file first.
        </Typography>
      )}
      {busy && (
        <Typography id={hintId} variant="caption" color="text.secondary" role="status">
          Fingerprinting on your device…
        </Typography>
      )}
    </Stack>
  );
};
