// Lab results on a plant's page, both sides (veilcore/lab-results.ts).
//
// The breeder: results the lab sent back, opened here with the plant's own secret, and
// called the lab's only when the lab signed that exact file.
// The lab: send a result back to the breeder, signed with the lab's key and locked so only
// the breeder can open it.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockIcon from '@mui/icons-material/LockOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import type { StrainRecord } from '../../veilcore/records';
import type { RecordKeys } from '../../veilcore/record-keys';
import { sentByMe, parseShareCode, publicFingerprintOf, type SentTransfer } from '../../veilcore/transfers';
import { attestationsFor, countsAsSigned, type ResolvedAttestation } from '../../veilcore/attesters';
import { loadAttester, attestRecord } from '../../veilcore/attester-keys';
import { OPEN_SIGNING_KEY_EVENT } from '../AttesterSetup';
import {
  deliveryForRecord,
  fetchLockedResult,
  listResults,
  lockReport,
  openReport,
  rememberDelivery,
  reportFingerprint,
  sendLockedResult,
  type ResultSummary,
} from '../../veilcore/lab-results';

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;
const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const mb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** A sensible file name for an opened result, from what the bytes are. */
const nameFor = (bytes: Uint8Array, at: number): string => {
  const head = new TextDecoder().decode(bytes.slice(0, 8));
  const ext = head.startsWith('%PDF')
    ? 'pdf'
    : bytes[0] === 0x89 && head.slice(1, 4) === 'PNG'
      ? 'png'
      : bytes[0] === 0xff && bytes[1] === 0xd8
        ? 'jpg'
        : head.startsWith('PK')
          ? 'zip'
          : 'bin';
  return `Lab result ${new Date(at).toISOString().slice(0, 10)}.${ext}`;
};

const download = (bytes: Uint8Array, name: string) => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type ArrivedResult = { transfer: SentTransfer; result: ResultSummary };

/** Every result labs have sent back for this plant. null while loading. */
export const useArrivedResults = (recordId: string | undefined, enabled: boolean): ArrivedResult[] | null => {
  const [out, setOut] = useState<ArrivedResult[] | null>(null);
  useEffect(() => {
    if (!enabled || !recordId) return;
    let live = true;
    void (async () => {
      const mine = (await sentByMe()).filter((t) => t.source_record === recordId && t.claimed_at);
      const all: ArrivedResult[] = [];
      for (const transfer of mine) {
        const r = await listResults(transfer.id);
        if (Array.isArray(r)) for (const result of r) all.push({ transfer, result });
      }
      if (live) setOut(all.sort((a, b) => b.result.createdAt - a.result.createdAt));
    })();
    return () => {
      live = false;
    };
  }, [recordId, enabled]);
  return out;
};

type Opened = {
  bytes: Uint8Array;
  name: string;
  signedBy?: ResolvedAttestation;
  alsoConfirmedReceipt?: boolean;
};

/** The breeder's side. */
export const LabResultsPanel: React.FC<{
  record: StrainRecord;
  keys?: RecordKeys;
  onPair: (file: File) => void;
}> = ({ record, keys, onPair }) => {
  const arrived = useArrivedResults(record.id, true);
  const [opened, setOpened] = useState<Record<string, Opened>>({});
  const [busy, setBusy] = useState<string>();
  const [problem, setProblem] = useState<string>();

  const open = async ({ transfer, result }: ArrivedResult) => {
    if (!keys) return;
    setBusy(result.id);
    setProblem(undefined);
    try {
      const locked = await fetchLockedResult(transfer.id, result.id);
      if ('error' in locked) throw new Error(locked.error);
      const bytes = await openReport(locked, keys.recordSecret);
      const sha = reportFingerprint(bytes);
      // The lab's signature over exactly this file, about this plant, verified here.
      const atts = await attestationsFor(record.recordFingerprint);
      const signedBy = atts.find(
        (a) =>
          countsAsSigned(a) &&
          a.type === 'laboratory-report' &&
          a.documentHash === sha &&
          (!result.attestationId || a.attestationId === result.attestationId),
      );
      const alsoConfirmedReceipt =
        !!signedBy &&
        atts.some(
          (a) =>
            countsAsSigned(a) && a.type === 'chain-of-custody' && a.attester.publicKey === signedBy.attester.publicKey,
        );
      setOpened((o) => ({
        ...o,
        [result.id]: { bytes, name: nameFor(bytes, result.createdAt), signedBy, alsoConfirmedReceipt },
      }));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h2">
          Lab results
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Locked so only you can open them, with this plant&apos;s key from your backup. VeilCore can&apos;t read them.
        </Typography>
      </Box>
      {!keys && (
        <Alert severity="info" variant="outlined">
          This plant&apos;s key isn&apos;t on this device, so its results can&apos;t be opened here.{' '}
          <RouterLink to="/restore">Get your plants back from your backup</RouterLink> first.
        </Alert>
      )}
      {arrived === null ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Looking for results…</Typography>
        </Stack>
      ) : arrived.length === 0 ? (
        <Typography variant="body1">
          Nothing yet. When a lab you sent this plant to sends results, they show up here.
        </Typography>
      ) : (
        arrived.map((a) => {
          const o = opened[a.result.id];
          return (
            <Box key={a.result.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <LockIcon fontSize="small" color={o ? 'disabled' : 'primary'} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  From the delivery to {a.transfer.to_handle}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Sent {when(a.result.createdAt)} · {mb(a.result.size)}
              </Typography>
              {!o ? (
                <Button
                  variant="contained"
                  sx={{ mt: 1.5, minHeight: 44 }}
                  disabled={!keys || busy === a.result.id}
                  onClick={() => void open(a)}
                  startIcon={busy === a.result.id ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  Open
                </Button>
              ) : (
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {o.signedBy ? (
                    <Alert severity="success" variant="outlined" icon={<VerifiedIcon />}>
                      <b>Signed by {o.signedBy.attester.displayName ?? 'a lab'}</b> (key{' '}
                      {short(o.signedBy.attester.publicKey)}
                      ), checked here.
                      {o.alsoConfirmedReceipt && ' The same lab confirmed receiving the sample.'} Who holds that key is
                      the lab&apos;s own statement unless VeilCore has checked it.
                    </Alert>
                  ) : (
                    <Alert severity="warning" variant="outlined">
                      No lab signature matches this exact file. It opened with your key, but don&apos;t treat it as the
                      lab&apos;s result until they sign it.
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button variant="outlined" onClick={() => download(o.bytes, o.name)} sx={{ minHeight: 44 }}>
                      Save the report
                    </Button>
                    {!record.dnaFingerprint && (
                      <Button
                        variant="contained"
                        onClick={() => onPair(new File([o.bytes as BlobPart], o.name))}
                        sx={{ minHeight: 44 }}
                      >
                        Pair it with this plant
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}
            </Box>
          );
        })
      )}
      {problem && (
        <Alert severity="error" variant="outlined">
          {problem}
        </Alert>
      )}
    </Stack>
  );
};

/** The lab's side: send a result back on a delivery this lab received. */
export const SendResultsPanel: React.FC<{ record: StrainRecord; onDone: () => void }> = ({ record, onDone }) => {
  const stored = deliveryForRecord(record.id);
  const [lock, setLock] = useState(stored?.recipient);
  const [code, setCode] = useState('');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; sha: string }>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [sent, setSent] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const attester = loadAttester();
  const transferId = record.transferId ?? stored?.transferId;
  const subject = record.receivedFromCommitment ?? stored?.sourceCommitment;

  if (!transferId || !subject) {
    return (
      <Alert severity="info" variant="outlined">
        This plant didn&apos;t come in a delivery, so there&apos;s nobody to send results back to.
      </Alert>
    );
  }

  const useCode = () => {
    const p = parseShareCode(code);
    if (p.transferId !== transferId) return setProblem('That code is for a different delivery.');
    if (!p.resultLock) return setProblem('That code has no lock in it. Ask the breeder to send it again from the app.');
    rememberDelivery({
      transferId,
      receivedRecordId: record.id,
      ...(record.receivedFrom ? { sourceRecordId: record.receivedFrom } : {}),
      sourceCommitment: subject,
      recipient: p.resultLock,
      receivedAt: record.receivedAt ?? Date.now(),
    });
    setProblem(undefined);
    setLock(p.resultLock);
  };

  const choose = async (f: File) => {
    setProblem(undefined);
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (bytes.length > 14 * 1024 * 1024) return setProblem('That file is over 14 MB.');
    setFile({ name: f.name, bytes, sha: reportFingerprint(bytes) });
  };

  const send = async () => {
    if (!file || !lock || !attester) return;
    setBusy(true);
    setProblem(undefined);
    try {
      // Sign only about the record this delivery really came from (same check as receipt).
      if (record.receivedFrom && (await publicFingerprintOf(record.receivedFrom)) !== subject) {
        throw new Error('The breeder’s record could not be confirmed from the public registry, so nothing was signed.');
      }
      const signed = await attestRecord(attester, subject, file.sha, 'laboratory-report');
      if (signed.error || !signed.attestationId)
        throw new Error(`Your signature was not recorded: ${signed.error ?? 'no answer'}.`);
      const locked = await lockReport(file.bytes, lock);
      const out = await sendLockedResult(transferId, locked, signed.attestationId);
      if ('error' in out) throw new Error(`Signed, but the file didn’t send: ${out.error}. Try again.`);
      setSent(true);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent && file) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Sent
        </Typography>
        <Typography variant="body1">
          Only the breeder can open it. Your signature is public: anyone checking this plant sees that{' '}
          {attester?.displayName ?? 'your lab'} signed a report with fingerprint {short(file.sha)}, but not the report.
        </Typography>
        <Button variant="contained" size="large" onClick={onDone} sx={{ py: 1.3 }}>
          Back to the plant
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h2">
          Send results back to the breeder
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Your browser signs the report&apos;s fingerprint with your lab&apos;s key and locks the file so only the
          breeder can open it. VeilCore only ever holds the locked file.
        </Typography>
      </Box>

      {!attester ? (
        <Alert severity="info" variant="outlined">
          Set up your lab&apos;s signature first, so the breeder can tell the result is yours.{' '}
          <Button size="small" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SIGNING_KEY_EVENT))}>
            Set it up
          </Button>
        </Alert>
      ) : !lock ? (
        <Stack spacing={1.25}>
          <Typography variant="body1">
            This browser doesn&apos;t have the breeder&apos;s lock for this delivery. Paste the delivery code they sent
            you.
          </Typography>
          <TextField label="Delivery code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
          <Button variant="outlined" onClick={useCode} disabled={!code.trim()} sx={{ alignSelf: 'flex-start' }}>
            Use this code
          </Button>
        </Stack>
      ) : (
        <>
          {file ? (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mb(file.bytes.length)} · fingerprint {short(file.sha)}
              </Typography>
              <Button size="small" onClick={() => setFile(undefined)} sx={{ mt: 0.5 }}>
                Choose a different file
              </Button>
            </Box>
          ) : (
            <Button variant="outlined" size="large" onClick={() => pick.current?.click()} sx={{ py: 1.3 }}>
              Choose the report
            </Button>
          )}
          <input
            ref={pick}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void choose(f);
            }}
          />
          <Button
            variant="contained"
            size="large"
            disabled={!file || busy}
            onClick={() => void send()}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
            sx={{ py: 1.5 }}
          >
            {busy ? 'Signing and locking…' : 'Sign, lock and send'}
          </Button>
        </>
      )}
      {problem && (
        <Alert severity="warning" variant="outlined">
          {problem}
        </Alert>
      )}
    </Stack>
  );
};
