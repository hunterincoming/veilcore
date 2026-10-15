// "Download evidence bundle": one .zip with everything anyone needs to check this record's
// date without VeilCore (veilcore/evidence/bundle.ts, docs/evidence-bundle.md). Two
// choices, both off unless the holder ticks them: the record's key, and the lab report file.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
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
import type { StrainRecord } from '../veilcore/records';
import type { RecordKeys } from '../veilcore/record-keys';
import { downloadEvidenceBundle } from '../veilcore/evidence/bundle';
import { MAX_FINGERPRINT_BYTES } from '../veilcore/commitment';

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
  const [labFile, setLabFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canKey = !!record.keyBinding && !!keys?.recordSecret;
  const hasLab = !!record.dnaFingerprint;
  const sealed = !!record.recordFingerprint && !!record.nonce;

  const close = () => {
    setOpen(false);
    setError(null);
    setDone(null);
  };

  const download = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      if (includeLab && !labFile) {
        setError('Choose the lab report file, or untick it.');
        return;
      }
      if (labFile && labFile.size > MAX_FINGERPRINT_BYTES) {
        setError(`${labFile.name} is larger than 200 MB, so it wasn’t read.`);
        return;
      }
      const out = await downloadEvidenceBundle(record, keys, {
        includeKey: canKey && includeKey,
        ...(includeLab && labFile
          ? { labFile: { name: labFile.name, bytes: new Uint8Array(await labFile.arrayBuffer()) } }
          : {}),
      });
      if ('error' in out) setError(out.error);
      else setDone(out.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => setOpen(true)}>
          {DOWNLOAD_EVIDENCE_LABEL}
        </Button>
      )}
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="evidence-bundle-title">
        <DialogTitle id="evidence-bundle-title">{DOWNLOAD_EVIDENCE_LABEL}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              One file with everything someone needs to check this record’s date without VeilCore: the record as it was
              sealed, the proof it is in a dated batch, where that batch was recorded, and a page that does the checks
              offline. A README inside says what it shows and what it doesn’t.
            </Typography>
            {!sealed && (
              <Alert severity="warning" variant="outlined">
                This record was sealed before its details were kept in a form anyone can check, so no bundle can be made
                for it.
              </Alert>
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
                    Include the record’s key.{' '}
                    {canKey
                      ? 'With it, anyone who has the bundle can tie this record to its key, and to everything that key does on the network. Leave it out unless they need it.'
                      : 'The key isn’t in this browser. Open your backup here to include it.'}
                  </Typography>
                }
              />
            )}
            {hasLab && (
              <Stack spacing={1}>
                <FormControlLabel
                  control={<Checkbox checked={includeLab} onChange={(e) => setIncludeLab(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      Include the lab report file. Without it, the bundle has only the report’s fingerprint, not what it
                      says.
                    </Typography>
                  }
                />
                {includeLab && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, pl: 4 }}>
                    <Button size="small" variant="outlined" onClick={() => fileInput.current?.click()}>
                      Choose the lab report file
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                      {labFile ? labFile.name : 'It’s checked against the one saved to this plant before it goes in.'}
                    </Typography>
                    <input
                      ref={fileInput}
                      type="file"
                      hidden
                      aria-label="Lab report file"
                      onChange={(e) => setLabFile(e.target.files?.[0] ?? null)}
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
                Downloaded {done}. Open verify.html inside it to check it.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<DownloadIcon />}
            disabled={busy || !sealed}
            onClick={() => void download()}
          >
            {busy ? 'Making it…' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
