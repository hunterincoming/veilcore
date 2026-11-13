// "Laboratory signature" on a record of numbers a lab signed (veilcore/lab-numbers.ts;
// docs/lab-signing.md). The lab wrote the record and sent it inside its report; the breeder added
// it here. This panel says who signed (from the lab's binding, checked in this browser, in the
// wording every page uses for signers) and publishes the signature on Midnight with
// proveAttested. After that, every claim link from this record names it too. The record store
// notifies the page (records.ts useRecords), so nothing here re-reads the record.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { StrainRecord } from '../../veilcore/records';
import { setLabOnChain } from '../../veilcore/records';
import type { DocumentRecordLike } from '../../veilcore/document-profile';
import type { HeldFieldSet } from '../../veilcore/field-set';
import { CLAIMS_READY } from '../../veilcore/chain/config';
import { keyShort } from '../../veilcore/lab-key-text';
import { signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import type { LabSigner } from '../../veilcore/claim-link';
import { useT } from '../../i18n/app';
import { Fact } from './DocumentParts';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';
import { withdrawnWords } from '../lab/signer-words';

type Held = DocumentRecordLike & { readonly fieldSet: HeldFieldSet };

/** Who the lab's binding names for this record's signature, checked here (claims-key.ts). */
const useSigner = (record: StrainRecord): LabSigner | undefined => {
  const [signer, setSigner] = useState<LabSigner>();
  const sig = record.labSignature;
  const salt = record.labResult?.statement.bindingSalt;
  // A v2 result without a salt has no binding to look up: nothing is sent for it.
  const unsalted = !!record.labResult && salt === undefined;
  useEffect(() => {
    setSigner(undefined);
    if (!sig?.about || unsalted) return void setSigner({ kind: 'none' });
    let live = true;
    void (async () => {
      try {
        const [{ attestationsFor }, { findBinding }, { keyFromHex }] = await Promise.all([
          import('../../veilcore/attesters'),
          import('../../veilcore/claims-key'),
          import('../../veilcore/lab-attest'),
        ]);
        const key = keyFromHex(sig.key);
        const about = sig.about;
        const [list, aboutList] = await Promise.all([
          // The holder's own page (8 Nov 2026): the lab's report signature on the record the
          // numbers are about is private, served only to the holder key, so it asks with it.
          attestationsFor(sig.record, { claimsKeyBindings: true, asHolder: true }),
          about ? attestationsFor(about, { asHolder: true }) : Promise.resolve([]),
        ]);
        if (live)
          setSigner(key && about ? findBinding(list, sig.record, key, about, aboutList, salt) : { kind: 'none' });
      } catch {
        if (live) setSigner({ kind: 'none' });
      }
    })();
    return () => {
      live = false;
    };
  }, [sig, salt, unsalted]);
  return signer;
};

export const LabSignaturePanel: React.FC<{
  record: StrainRecord;
  /** The stored signature still checks against this record (DocumentDetail checks it). */
  signatureOk: boolean | undefined;
}> = ({ record, signatureOk }) => {
  const tr = useT();
  const { t } = tr;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const sig = record.labSignature;
  const on = record.labOnChain;
  const signer = useSigner(record);
  if (!record.fieldSet || !sig) return null;
  const held = record as unknown as Held;

  const publish = async () => {
    if (busy) return;
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

  // A lab result v2 signed before binding salts: no name binding is read for it (SPEC 11.12).
  const unsalted = !!record.labResult && record.labResult.statement.bindingSalt === undefined;
  const who = unsalted
    ? t('app.lr.check.noSalt')
    : signer?.kind === 'bound'
      ? signerLabel(signer.attestation as ResolvedAttestation, 'Signed by', Date.now(), tr).text
      : signer?.kind === 'retracted'
        ? withdrawnWords(signer, !!record.labResult, tr)
        : signer?.kind === 'conflict'
          ? t('app.claim.check.labConflict')
          : signer
            ? t('app.claim.check.labUnidentified')
            : '';

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-lab-signature="">
      <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
        {t('app.attest.title')}
      </Typography>
      <Stack spacing={1.5}>
        {signatureOk !== true ? (
          signatureOk === false && (
            <Alert severity="error" variant="outlined" data-lab-stale="">
              {t('app.attest.stale')}
            </Alert>
          )
        ) : (
          <Box data-lab-signed={signer?.kind ?? 'checking'}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('app.attest.signedBy', { key: keyShort(sig.key) })} {who}
            </Typography>
            <Fact label={t('app.claim.check.labKey')} mono>
              {sig.key}
            </Fact>
          </Box>
        )}
        {signatureOk && on && (
          <Alert severity="success" variant="outlined" data-lab-published="">
            {t('app.attest.published', { block: String(on.blockHeight ?? '?') })}
          </Alert>
        )}
        {signatureOk && !on && (
          <>
            <Typography variant="body2">{t('app.attest.publishText')}</Typography>
            {!CLAIMS_READY ? (
              <Alert severity="info" variant="outlined">
                {t('app.claim.notReady')}
              </Alert>
            ) : (
              <Box>
                <DisclosureReceipt circuits={['proveAttested']} />
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() => void publish()}
                  sx={{ minHeight: 44, mt: 1.5 }}
                >
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
        {error && (
          <Alert severity="error" variant="outlined" data-lab-error="">
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};
