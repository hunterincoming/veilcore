// "Laboratory signature" on a document with sealed numbers (veilcore/lab-attest.ts;
// docs/lab-attested-similarity.md): download the request for the laboratory, add the signature
// it sends back (checked against this record and the key), then publish it on Midnight with
// proveAttested. After that, every claim link from this record names the signature too. The
// record store notifies the page (records.ts useRecords), so nothing here re-reads it.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { StrainRecord } from '../../veilcore/records';
import { setLabOnChain, setLabSignature } from '../../veilcore/records';
import type { DocumentRecordLike } from '../../veilcore/document-profile';
import type { HeldFieldSet } from '../../veilcore/field-set';
import { CLAIMS_READY } from '../../veilcore/chain/config';
import { keyShort } from '../../veilcore/lab-key-text';
import { useT } from '../../i18n/app';
import { Fact } from './DocumentParts';

type Held = DocumentRecordLike & { readonly fieldSet: HeldFieldSet };

const fileName = (title: string, what: string): string =>
  `${
    (title || 'record')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'record'
  }-${what}.json`;

export const LabSignaturePanel: React.FC<{
  record: StrainRecord;
  /** The stored signature still checks against this record (DocumentDetail checks it). */
  signatureOk: boolean | undefined;
}> = ({ record, signatureOk }) => {
  const tr = useT();
  const { t } = tr;
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const sig = record.labSignature;
  const on = record.labOnChain;
  if (!record.fieldSet) return null;
  const held = record as unknown as Held;

  const download = async () => {
    setError(undefined);
    try {
      const { labRequestFor, saveFile } = await import('../../veilcore/lab-attest');
      const req = await labRequestFor(held);
      saveFile(fileName(record.strainName, 'lab-request'), JSON.stringify(req, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const add = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setNote(undefined);
    try {
      const { readLabSignature } = await import('../../veilcore/lab-attest');
      const { claimMaterial, commitmentHex } = await import('../../veilcore/claims-input');
      const commitment = commitmentHex(await claimMaterial(held));
      const checked = readLabSignature(await file.text(), commitment);
      setLabSignature(record.id, checked);
      setNote(t('app.attest.added'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (pick.current) pick.current.value = '';
    }
  };

  const publish = async () => {
    if (!sig || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { proveAttestedOnChain } = await import('../../veilcore/chain/claims-call');
      const { claimMaterial } = await import('../../veilcore/claims-input');
      const receipt = await proveAttestedOnChain(await claimMaterial(held), sig, { progress: setProgress });
      setLabOnChain(record.id, {
        contract: receipt.contract,
        txId: receipt.txId,
        blockHeight: receipt.blockHeight,
        ...(receipt.blockTime !== undefined ? { blockTime: receipt.blockTime } : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-lab-signature="">
      <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
        {t('app.attest.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {t('app.attest.text')}
      </Typography>
      <input
        ref={pick}
        type="file"
        accept="application/json,.json"
        hidden
        data-lab-signature-file=""
        onChange={(e) => void add(e.target.files?.[0])}
      />
      <Stack spacing={1.5}>
        {sig && signatureOk === false && (
          <Alert severity="error" variant="outlined" data-lab-stale="">
            {t('app.attest.stale')}
          </Alert>
        )}
        {sig && signatureOk !== false && (
          <Box data-lab-signed="">
            <Fact label={t('app.claim.check.labKey')} mono>
              {sig.key}
            </Fact>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('app.attest.signedBy', { key: keyShort(sig.key) })}{' '}
              {sig.name ? t('app.attest.fileSays', { name: sig.name }) : ''}
            </Typography>
          </Box>
        )}
        {sig && signatureOk && on && (
          <Alert severity="success" variant="outlined" data-lab-published="">
            {t('app.attest.published', { block: String(on.blockHeight ?? '?') })}
          </Alert>
        )}
        {sig && signatureOk && !on && (
          <>
            <Typography variant="body2">{t('app.attest.publishText')}</Typography>
            {!CLAIMS_READY ? (
              <Alert severity="info" variant="outlined">
                {t('app.claim.notReady')}
              </Alert>
            ) : (
              <Box>
                <Button variant="contained" disabled={busy} onClick={() => void publish()} sx={{ minHeight: 44 }}>
                  {busy ? t('app.attest.publishing') : t('app.attest.publish')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('app.claim.computer')}
                </Typography>
              </Box>
            )}
          </>
        )}
        {busy && (
          <Box role="status">
            <LinearProgress sx={{ mb: 0.5 }} />
            <Typography variant="body2">{progress}</Typography>
          </Box>
        )}
        {!sig && (
          <>
            <Box>
              <Button variant="outlined" onClick={() => void download()} sx={{ minHeight: 44 }} data-lab-request="">
                {t('app.attest.request')}
              </Button>
            </Box>
            <Alert severity="info" variant="outlined">
              {t('app.attest.requestWarn')} {t('app.attest.how', { site: window.location.origin })}
            </Alert>
          </>
        )}
        <Box>
          <Button
            variant={sig ? 'text' : 'contained'}
            onClick={() => pick.current?.click()}
            disabled={busy}
            sx={{ minHeight: 44 }}
            data-lab-add=""
          >
            {sig ? t('app.attest.addOther') : t('app.attest.add')}
          </Button>
        </Box>
        {note && (
          <Typography variant="body2" role="status">
            {note}
          </Typography>
        )}
        {error && (
          <Alert severity="error" variant="outlined" data-lab-error="">
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};
