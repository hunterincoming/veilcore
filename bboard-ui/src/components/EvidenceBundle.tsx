// "Download evidence bundle": one .zip with everything anyone needs to check this record's
// date without VeilCore (veilcore/evidence/bundle.ts, docs/evidence-bundle.md), a printable
// summary and a sample declaration (evidence/examiner.ts, evidence/declaration.ts). Two
// choices, both off unless the holder ticks them: the record's key, and the lab report file
// (for a document record: a copy of the document's own files, each checked against the record).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { allRecords, useSealedView, type StrainRecord } from '../veilcore/records';
import { datingOf } from './flow/useDnaTie';
import type { RecordKeys } from '../veilcore/record-keys';
import {
  downloadEvidenceBundle,
  lockedParentsOf,
  UNREACHABLE,
  type EvidenceOptions,
} from '../veilcore/evidence/bundle';
import type { BackupFileStamps } from '../veilcore/stamps';
import { MAX_FINGERPRINT_BYTES } from '../veilcore/commitment';
import { InEnglishNote, useRecordT } from '../i18n/app';
import { isDocument } from '../veilcore/document-profile';
import { bitcoinStampFor } from '../veilcore/proofs';
import { recordProof } from './verify/useAnchorCheck';
import { BundleFromBackupFile } from './BundleFromBackupFile';

/** The button's English (app.plant.bundle.download): the landing page names it. */
export const DOWNLOAD_EVIDENCE_LABEL = 'Download evidence bundle';

export const EvidenceBundle: React.FC<{
  record: StrainRecord;
  keys?: RecordKeys;
  /** How the dialog is opened: a button by default. */
  trigger?: (open: () => void) => React.ReactNode;
}> = ({ record, keys, trigger }) => {
  const [open, setOpen] = useState(false);
  const [includeKey, setIncludeKey] = useState(false);
  const [includeLab, setIncludeLab] = useState(false);
  // Off unless ticked: it asks two outside sites (docs/bitcoin-header-check.md).
  const [includeBtc, setIncludeBtc] = useState(false);
  // Offered only when the record's batch is stamped in a Bitcoin block: otherwise there are no
  // headers to fetch, and the option would do nothing.
  const [stampedOnBitcoin, setStampedOnBitcoin] = useState(false);
  const [labFile, setLabFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // VeilCore's registry couldn't be reached (and this browser has no copy it gave): the bundle
  // can be made from the holder's backup file instead (BundleFromBackupFile).
  const [offline, setOffline] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { t, tp } = useRecordT(record);
  const { locked } = useSealedView();
  // The holder's own parent records locked in this browser: left out, and said (review L8).
  const lockedParents = lockedParentsOf(record, new Set(locked.map((l) => l.id)));
  const label = t('app.plant.bundle.download');

  const canKey = !!record.keyBinding && !!keys?.recordSecret;
  const doc = isDocument(record);
  const hasLab = !doc && !!record.dnaFingerprint;
  const hasDocFiles = doc && (record.document?.files?.length ?? 0) > 0;
  const include = doc ? 'app.doc.bundle.includeFiles' : 'app.plant.bundle.includeLab';
  const sealed = !!record.recordFingerprint && !!record.nonce;

  useEffect(() => {
    if (!open) return;
    let live = true;
    void recordProof(record.recordFingerprint).then((p) => {
      if (live) setStampedOnBitcoin(p.status !== 'none' && bitcoinStampFor(p.proof)?.status === 'bitcoin');
    });
    return () => {
      live = false;
    };
  }, [open, record.recordFingerprint]);

  const close = () => {
    setOpen(false);
    setError(null);
    setDone(null);
    setOffline(false);
  };

  /** The holder's choices as bundle options, or words saying what is missing. */
  const choices = async (): Promise<EvidenceOptions | { error: string }> => {
    if (includeLab && (doc ? docFiles.length === 0 : !labFile))
      return { error: t(doc ? 'app.doc.bundle.chooseOrUntick' : 'app.plant.bundle.chooseOrUntick') };
    const tooBig = (doc ? docFiles : labFile ? [labFile] : []).find((f) => f.size > MAX_FINGERPRINT_BYTES);
    if (includeLab && tooBig) return { error: t('app.plant.bundle.tooBig', { name: tooBig.name }) };
    // The record dating the saved DNA report, if one does: README.txt names it.
    const datedBy = datingOf(record, undefined, allRecords())?.id;
    return {
      includeKey: canKey && includeKey,
      bitcoinHeaders: stampedOnBitcoin && includeBtc,
      ...(datedBy ? { dnaReportDatedBy: datedBy } : {}),
      ...(lockedParents ? { lockedParents } : {}),
      ...(!doc && includeLab && labFile
        ? { labFile: { name: labFile.name, bytes: new Uint8Array(await labFile.arrayBuffer()) } }
        : {}),
      ...(doc && includeLab && docFiles.length > 0
        ? {
            documentFiles: await Promise.all(
              docFiles.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })),
            ),
          }
        : {}),
    };
  };

  const download = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const options = await choices();
      if ('error' in options) {
        setError(options.error);
        return;
      }
      const out = await downloadEvidenceBundle(record, keys, options);
      if ('error' in out) {
        setError(out.error);
        if (out.error === UNREACHABLE) setOffline(true);
      } else setDone(out.name);
    } finally {
      setBusy(false);
    }
  };

  /** The same bundle, made straight from a backup file the holder picked (nothing kept here). */
  const fromFile = async (_r: StrainRecord, file: BackupFileStamps) => {
    const options = await choices();
    if ('error' in options) return options;
    return downloadEvidenceBundle(record, keys, { ...options, fromBackupFile: file });
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="evidence-bundle-title">
        <DialogTitle id="evidence-bundle-title">{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {t('app.plant.bundle.intro')}
              <InEnglishNote />
            </Typography>
            {!sealed && (
              <Alert severity="warning" variant="outlined">
                {t('app.plant.bundle.notSealed')}
              </Alert>
            )}
            {lockedParents > 0 && (
              <Typography variant="body2" color="text.secondary" data-locked-parents="">
                {tp('app.sealed.lockedParents', lockedParents)}
              </Typography>
            )}
            {record.keyBinding && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canKey && includeKey}
                    disabled={!canKey}
                    onChange={(e) => setIncludeKey(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('app.plant.bundle.includeKey')}
                    {t('app.common.sentenceSep')}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {t(doc ? 'app.doc.bundle.keyIs' : 'app.plant.bundle.keyIs')}
                    </Typography>
                    {t('app.common.sentenceSep')}
                    {canKey ? t('app.plant.bundle.keyWith') : t('app.plant.bundle.keyNotHere')}
                  </Typography>
                }
              />
            )}
            {sealed && stampedOnBitcoin && (
              <FormControlLabel
                control={<Checkbox checked={includeBtc} onChange={(e) => setIncludeBtc(e.target.checked)} />}
                label={<Typography variant="body2">{t('app.plant.bundle.includeBtc')}</Typography>}
              />
            )}
            {(hasLab || hasDocFiles) && (
              <Stack spacing={1}>
                <FormControlLabel
                  control={<Checkbox checked={includeLab} onChange={(e) => setIncludeLab(e.target.checked)} />}
                  label={<Typography variant="body2">{t(include)}</Typography>}
                />
                {includeLab && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, pl: 4 }}>
                    <Button size="small" variant="outlined" onClick={() => fileInput.current?.click()}>
                      {t(doc ? 'app.doc.bundle.chooseFiles' : 'app.plant.bundle.chooseLab')}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                      {doc
                        ? docFiles.length > 0
                          ? docFiles.map((f) => f.name).join(', ')
                          : t('app.doc.bundle.checkedAgainst')
                        : labFile
                          ? labFile.name
                          : t('app.plant.bundle.checkedAgainst')}
                    </Typography>
                    <input
                      ref={fileInput}
                      type="file"
                      hidden
                      multiple={doc}
                      aria-label={t(doc ? 'app.doc.bundle.filesAria' : 'app.plant.bundle.labFileAria')}
                      onChange={(e) =>
                        doc ? setDocFiles(Array.from(e.target.files ?? [])) : setLabFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </Stack>
                )}
              </Stack>
            )}
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
            {done && (
              <Alert severity="success" variant="outlined">
                {t('app.plant.bundle.downloaded', { name: done })}
              </Alert>
            )}
            {offline && sealed && (
              <Stack spacing={1} data-bundle-offline="">
                <Typography variant="body2">{t('app.filebundle.offline')}</Typography>
                <BundleFromBackupFile record={record} make={fromFile} />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('app.common.close')}</Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<DownloadIcon />}
            disabled={busy || !sealed}
            onClick={() => void download()}
          >
            {busy ? t('app.plant.bundle.making') : t('app.plant.bundle.downloadButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
