// Lab reports on a plant's page, both sides (veilcore/lab-results.ts).
//
// The breeder: lab reports the lab sent back, opened here with the plant's own secret,
// and called the lab's only when the key that signed that exact file is the key that
// signed for the sample (veilcore/custody.ts reportSigner).
// The lab: what came with the delivery, its own reference number, the lab reports it
// sent (withdraw one, or send a corrected file), and sending one: checked first, then
// signed, locked and sent, and the signature withdrawn again if the file didn't arrive.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockIcon from '@mui/icons-material/LockOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import { RECORDS_KEY, updateReceivedNotes, type StrainRecord } from '../../veilcore/records';
import { rowStateOf } from '../../veilcore/api-store';
import type { RecordKeys } from '../../veilcore/record-keys';
import {
  custodyOf,
  hasDetails,
  sentByMe,
  parseShareCode,
  publicFingerprintOf,
  quantityPhrase,
  recipientName,
  type DeliveryCustody,
  type SentTransfer,
} from '../../veilcore/transfers';
import { attestationsFor, countsAsSigned, signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { loadAttester, attestRecord, retract } from '../../veilcore/attester-keys';
import {
  arrivalLine,
  breederReceipt,
  custodyDifferences,
  differenceWords,
  labReceipt,
  sampleLine,
  reportSigner,
  type BreederReceipt,
  type ReportSigner,
} from '../../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../../config/network';
import { OPEN_SIGNING_KEY_EVENT } from '../AttesterSetup';
import { NameCheckText } from '../NameCheckText';
import { focusScreenHeading } from './FlowFrame';
import {
  deleteResult,
  deliveryForRecord,
  fetchLockedResult,
  LAB_CHANGED_EVENT,
  labChanged,
  listResults,
  liveResults,
  localStamp,
  lockReport,
  markOpened,
  openReport,
  rememberDelivery,
  reportLockFor,
  reportFileName,
  reportFileType,
  type ReportFileType,
  reportFingerprint,
  resultState,
  sendLockedResult,
  sentRowWords,
  sendRefusal,
  shortResultId,
  wasOpened,
  type ResultState,
  type ResultSummary,
} from '../../veilcore/lab-results';
import { correctionWithdrawn, savedReportStatus, type SavedReport } from '../../veilcore/saved-report';
import { DateLabReport } from '../stage/DateLabReport';
import { labSentPhrase } from './plant-status-words';
import { rich, useRecordT, useT } from '../../i18n/app';
import { enT, type Translator } from '../../i18n/translate';

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;
/** Every time on a lab report screen: local, with the zone's short name (round 5). */
const when = (t: number, locale?: string) => localStamp(t, locale);
const day = (t: number | string, locale?: string) => new Date(t).toLocaleDateString(locale, { dateStyle: 'medium' });
const mb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** A counter that moves whenever LAB_CHANGED_EVENT fires, for hooks to reload on. */
const useLabVersion = (): number => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((x) => x + 1);
    window.addEventListener(LAB_CHANGED_EVENT, bump);
    return () => window.removeEventListener(LAB_CHANGED_EVENT, bump);
  }, []);
  return v;
};

const download = (bytes: Uint8Array, name: string, mime = 'application/octet-stream') => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// --- the breeder's deliveries ------------------------------------------------------------

export type ArrivedResult = {
  transfer: SentTransfer;
  result: ResultSummary;
  state: ResultState;
  /** The record the lab's claim made, when the registry says. */
  receivedRecord?: string;
  /** The lab's receipt tied to this delivery, when there is one (custody.ts reportSigner). */
  receiptAttestationId?: string;
};

export type Deliveries = {
  /** Every delivery of this plant (for the receipt: custody.ts breederReceipt). */
  sent: SentTransfer[];
  /** Codes made for this plant that nobody has used yet. */
  open: SentTransfer[];
  /** Every lab report sent back on this plant's deliveries, withdrawn and replaced ones included. */
  arrived: ArrivedResult[];
};

const arrivedOn = async (transfers: readonly SentTransfer[]): Promise<ArrivedResult[]> => {
  const all: ArrivedResult[] = [];
  for (const transfer of transfers) {
    const r = await listResults(transfer.id);
    if ('error' in r) continue;
    const receivedRecord = r.receivedRecord ?? transfer.received_record;
    const receiptAttestationId = r.receiptAttestationId ?? transfer.receipt_attestation_id ?? undefined;
    for (const result of r.results) {
      all.push({
        transfer,
        result,
        state: resultState(result, r.results),
        ...(receivedRecord ? { receivedRecord } : {}),
        ...(receiptAttestationId ? { receiptAttestationId } : {}),
      });
    }
  }
  return all.sort((a, b) => b.result.createdAt - a.result.createdAt);
};

/**
 * A plant's deliveries: open codes, and lab reports that came back. null while loading.
 * With lab reports off (config/network.ts LAB_RESULTS_ENABLED) nothing is asked about
 * them and `arrived` is empty, so no lab report panel shows.
 */
export const useDeliveries = (recordId: string | undefined, enabled: boolean): Deliveries | null => {
  const [out, setOut] = useState<Deliveries | null>(null);
  const version = useLabVersion();
  useEffect(() => {
    if (!enabled || !recordId) return;
    let live = true;
    void (async () => {
      const mine = (await sentByMe()).filter((t) => t.source_record === recordId);
      const arrived = LAB_RESULTS_ENABLED ? await arrivedOn(mine.filter((t) => t.claimed_at)) : [];
      if (live) setOut({ sent: mine, open: mine.filter((t) => !t.claimed_at), arrived });
    })();
    return () => {
      live = false;
    };
  }, [recordId, enabled, version]);
  return out;
};

/** Lab reports a breeder hasn't opened on this device yet. */
export const waitingReports = (arrived: readonly ArrivedResult[] | undefined): ArrivedResult[] =>
  (arrived ?? []).filter((a) => a.state === 'live' && !wasOpened(a.result.id));

/** Home: for each of the breeder's plants, the lab reports waiting to be opened. */
export const useWaitingByRecord = (enabled: boolean): Record<string, ArrivedResult[]> => {
  const [out, setOut] = useState<Record<string, ArrivedResult[]>>({});
  const version = useLabVersion();
  useEffect(() => {
    if (!enabled || !LAB_RESULTS_ENABLED) return;
    let live = true;
    void (async () => {
      // The most recent deliveries that were received: older ones rarely get new reports.
      const claimed = (await sentByMe()).filter((t) => t.claimed_at).slice(0, 40);
      const waiting = waitingReports(await arrivedOn(claimed));
      const by: Record<string, ArrivedResult[]> = {};
      for (const a of waiting) {
        const id = a.transfer.source_record;
        if (id) (by[id] ??= []).push(a);
      }
      if (live) setOut(by);
    })();
    return () => {
      live = false;
    };
  }, [enabled, version]);
  return out;
};

// --- receipt, from signatures checked here (veilcore/custody.ts) --------------------------

/** Signatures about a commitment, reloaded when lab work changes here. null while loading. */
export const useAttestations = (commitment: string | undefined): ResolvedAttestation[] | null => {
  const [out, setOut] = useState<ResolvedAttestation[] | null>(null);
  const version = useLabVersion();
  useEffect(() => {
    let live = true;
    void attestationsFor(commitment).then((a) => {
      if (live) setOut(a);
    });
    return () => {
      live = false;
    };
  }, [commitment, version]);
  return out;
};

/**
 * `sent`: lab reports that still stand. `sentEver`: every one sent on the delivery, withdrawn
 * and replaced ones too, so a lab whose reports were all withdrawn is told that, not "not yet"
 * (round 6).
 */
export type LabCardFacts = { signed: boolean; sent: number; sentEver: number };

/** Home, for a lab: per received plant, whether its receipt is signed and how many lab reports went back. */
export const useLabCardFacts = (records: readonly StrainRecord[], enabled: boolean): Record<string, LabCardFacts> => {
  const [out, setOut] = useState<Record<string, LabCardFacts>>({});
  const version = useLabVersion();
  const ids = records
    .filter((r) => r.receivedFrom)
    .slice(0, 40)
    .map((r) => r.id)
    .join(',');
  useEffect(() => {
    if (!enabled || !ids) return;
    let live = true;
    void (async () => {
      const me = loadAttester()?.keypair.publicKey;
      const facts: Record<string, LabCardFacts> = {};
      for (const r of records.filter((x) => ids.split(',').includes(x.id))) {
        const atts = await attestationsFor(r.receivedFromCommitment);
        const list = r.transferId && LAB_RESULTS_ENABLED ? await listResults(r.transferId) : { results: [] };
        facts[r.id] = {
          signed: labReceipt(r, atts, me).kind === 'signed',
          // Only reports that still stand: not withdrawn, not replaced by a correction.
          sent: 'error' in list ? 0 : liveResults(list.results).length,
          sentEver: 'error' in list ? 0 : list.results.length,
        };
        if (live) setOut({ ...facts });
      }
    })();
    return () => {
      live = false;
    };
    // `records` changes identity on every sync; the ids are what matter (deps: ids).
  }, [ids, enabled, version]);
  return out;
};

/** The holder's own deliveries (GET /transfers/sent), reloaded when lab work changes here. null while loading. */
const useSent = (enabled: boolean): SentTransfer[] | null => {
  const [out, setOut] = useState<SentTransfer[] | null>(null);
  const version = useLabVersion();
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void sentByMe().then((t) => {
      if (live) setOut(t);
    });
    return () => {
      live = false;
    };
  }, [enabled, version]);
  return out;
};

/**
 * The breeder's receipt line, for the plant's status, the certificate and the check page:
 * only a receipt the lab tied to one of the breeder's own deliveries (custody.ts).
 */
export const useBreederReceipt = (record: StrainRecord | undefined, enabled: boolean): BreederReceipt | null => {
  const on = enabled && !!record;
  const atts = useAttestations(on ? record?.recordFingerprint : undefined);
  const sent = useSent(on);
  return atts === null || sent === null || !record ? null : breederReceipt(record, atts, sent);
};

/** The lab's own receipt line for a received plant. */
export const useLabReceipt = (record: StrainRecord | undefined, enabled: boolean) => {
  const atts = useAttestations(enabled ? record?.receivedFromCommitment : undefined);
  return atts === null || !record
    ? null
    : labReceipt(record, atts, loadAttester()?.keypair.publicKey, deliveryForRecord(record.id)?.receiptLinked);
};

// --- the lab report saved to the plant (veilcore/saved-report.ts) ------------------------

/**
 * Where the lab report saved to this plant stands, for the plant page, next step,
 * certificate and Show someone. null while loading. Pass `arrived` when the page already
 * has it; otherwise it is loaded here.
 */
export const useSavedReport = (
  record: StrainRecord | undefined,
  arrived?: readonly ArrivedResult[] | null,
): SavedReport | null => {
  const own = !!record && !record.receivedFrom;
  const loaded = useDeliveries(record?.id, own && arrived === undefined);
  const atts = useAttestations(own && record?.dnaFingerprint ? record.recordFingerprint : undefined);
  if (!record || !own) return null;
  if (!record.dnaFingerprint) return { kind: 'none' };
  const list = arrived === undefined ? (loaded?.arrived ?? null) : arrived;
  if (list === null || atts === null) return null;
  return savedReportStatus(record, list, atts);
};

/** What the breeder is told about a saved report the lab replaced or withdrew. */
export const SavedReportAlert: React.FC<{ saved: SavedReport | null; onOpen?: (resultId: string) => void }> = ({
  saved,
  onOpen,
}) => {
  const { t } = useT();
  if (!saved || (saved.kind !== 'replaced' && saved.kind !== 'withdrawn')) return null;
  const newer = saved.newer;
  return (
    <Alert
      severity="warning"
      variant="outlined"
      action={
        newer && onOpen ? (
          <Button color="inherit" onClick={() => onOpen(newer.result.id)} sx={{ minHeight: 40 }}>
            {saved.kind === 'replaced' ? t('app.plant.next.corrected.action') : t('app.plant.next.labWithdrew.action')}
          </Button>
        ) : undefined
      }
    >
      {saved.kind === 'replaced'
        ? rich(
            newer ? t('app.lab.results.replacedNewer') : t('app.lab.results.replacedNone'),
            { b: (c) => <b>{c}</b> },
            { lab: saved.lab === 'the lab' ? t('app.lab.theLab') : saved.lab },
          )
        : rich(t(newer ? 'app.lab.results.withdrawnNewer' : 'app.lab.results.withdrawn'), { b: (c) => <b>{c}</b> })}
    </Alert>
  );
};

// --- the breeder's side ------------------------------------------------------------------

type Opened = { bytes: Uint8Array; name: string; sha: string; signer: ReportSigner; type: ReportFileType };

/** What the breeder is told once, when a lab report first arrives: what others can see. */
const SEEN_VISIBILITY = 'veilcore.lab-visibility-seen.v1';
const seenVisibility = (): boolean => {
  try {
    return localStorage.getItem(SEEN_VISIBILITY) === '1';
  } catch {
    return false;
  }
};

/** Exactly what a stranger with a link sees about a lab report (VerifyPage.tsx). (app.lab.results.publicWords.) */
export const PUBLIC_REPORT_WORDS =
  'The lab’s signature is public; the report isn’t. Anyone with a link to this plant’s check page sees that a lab report about it was signed, the report file’s SHA-256, and the name the lab’s key is registered under: marked “name not checked” unless VeilCore’s operator has matched it to a public license or accreditation listing. If you save the report to this plant and share “Whether a DNA report is saved” in Show someone, they also see that the saved file matches it.';

const SignerLine: React.FC<{ signer: ReportSigner }> = ({ signer }) => {
  const tr = useT();
  const { t } = tr;
  const b = (c: React.ReactNode) => <b>{c}</b>;
  if (signer.kind === 'unsigned') {
    return (
      <Alert severity="warning" variant="outlined">
        {t('app.lab.results.unsigned')}
      </Alert>
    );
  }
  if (signer.kind === 'other-key' || signer.kind === 'no-receipt') {
    const who = signerLabel(signer.report, undefined, undefined, tr).who;
    return (
      <Alert severity="warning" variant="outlined">
        {rich(
          t(signer.kind === 'no-receipt' ? 'app.lab.results.noReceipt' : 'app.lab.results.otherKey'),
          { b },
          { who },
        )}
        <NameCheckText label={signerLabel(signer.report, undefined, undefined, tr)} />
      </Alert>
    );
  }
  const a = signer.report;
  // One label for every screen (attesters.ts signerLabel): a checked name says what was
  // matched, where and when; any other reads "name not checked".
  const label = signerLabel(a, 'Signed by', undefined, tr);
  return (
    <Alert severity={label.checked ? 'success' : 'info'} variant="outlined" icon={<VerifiedIcon />}>
      {rich(t('app.lab.results.signed'), { b }, { lead: label.lead, key: short(a.attester.publicKey) })}
      {label.checked ? <NameCheckText label={label} /> : t('app.lab.results.anyName')}
    </Alert>
  );
};

/** The breeder's side: lab reports back on this plant. `autoOpen` opens one straight away. */
export const LabResultsPanel: React.FC<{
  record: StrainRecord;
  keys?: RecordKeys;
  arrived: ArrivedResult[] | null;
  autoOpen?: string;
  /** Where the lab report saved to this plant stands (useSavedReport). */
  saved?: SavedReport | null;
  onPair: (file: File, from: { resultId: string; sha: string }) => void;
}> = ({ record, keys, arrived, autoOpen, saved, onPair }) => {
  const [opened, setOpened] = useState<Record<string, Opened>>({});
  const [busy, setBusy] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [toldVisibility, setToldVisibility] = useState(seenVisibility);
  const tried = useRef(false);
  const tr = useRecordT(record);
  const { t } = tr;

  const open = useCallback(
    async ({ transfer, result, receiptAttestationId }: ArrivedResult) => {
      if (!keys) return;
      setBusy(result.id);
      setProblem(undefined);
      try {
        const locked = await fetchLockedResult(transfer.id, result.id);
        if ('error' in locked) throw new Error(locked.error);
        const bytes = await openReport(locked, keys.recordSecret, transfer.id);
        const sha = reportFingerprint(bytes);
        const atts = await attestationsFor(record.recordFingerprint);
        const signer = reportSigner(atts, {
          sha,
          attestationId: result.attestationId,
          subject: record.recordFingerprint,
          receiptAttestationId,
        });
        markOpened(result.id);
        setOpened((o) => ({
          ...o,
          [result.id]: {
            bytes,
            sha,
            name: reportFileName(bytes, result.createdAt, result.id),
            signer,
            type: reportFileType(bytes),
          },
        }));
      } catch (e) {
        setProblem(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(undefined);
      }
    },
    [keys, record.recordFingerprint],
  );

  // One tap from the plant page lands on the opened lab report, not on another Open.
  useEffect(() => {
    if (tried.current || !autoOpen || !arrived || !keys) return;
    const a = arrived.find((x) => x.result.id === autoOpen && x.state === 'live');
    tried.current = true;
    if (a) void open(a);
  }, [autoOpen, arrived, keys, open]);

  const savedSha = saved && saved.kind !== 'none' ? saved.sha : undefined;
  const savedId = record.dnaResultId ?? (saved?.kind === 'lab' ? saved.resultId : undefined) ?? undefined;
  // Deliveries where nothing from the lab stands: the original replaced, the correction withdrawn.
  const emptied = arrived
    ? [...new Map(arrived.map((a) => [a.transfer.id, a.transfer])).values()].filter((t) =>
        correctionWithdrawn(arrived.filter((a) => a.transfer.id === t.id).map((a) => a.result)),
      )
    : [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h2">
          {t('app.plant.action.labReports')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('app.lab.results.locked')}
        </Typography>
      </Box>
      {!keys && (
        <Alert severity="info" variant="outlined">
          {rich(t('app.lab.results.noKey'), { link: (c) => <RouterLink to="/restore">{c}</RouterLink> })}
        </Alert>
      )}
      {arrived && arrived.length > 0 && !toldVisibility && (
        <Alert
          severity="info"
          variant="outlined"
          action={
            <Button
              color="inherit"
              onClick={() => {
                try {
                  localStorage.setItem(SEEN_VISIBILITY, '1');
                } catch {
                  /* private window: it shows again next time, which is harmless */
                }
                setToldVisibility(true);
              }}
              sx={{ minHeight: 40, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t('app.lab.results.gotIt')}
            </Button>
          }
        >
          {rich(t('app.lab.results.whatOthersSee'), { b: (c) => <b>{c}</b> })}
        </Alert>
      )}
      {saved && (saved.kind === 'replaced' || saved.kind === 'withdrawn') && <SavedReportAlert saved={saved} />}
      {emptied.map((t) => (
        <Alert key={t.id} severity="warning" variant="outlined">
          {tr.t('app.lab.results.noCurrent', { lab: recipientName(t, tr) })}
        </Alert>
      ))}
      {arrived === null ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t('app.lab.results.looking')}</Typography>
        </Stack>
      ) : arrived.length === 0 ? (
        <Typography variant="body1">{t('app.lab.results.nothingYet')}</Typography>
      ) : (
        arrived.map((a) => {
          const o = opened[a.result.id];
          const gone = a.state !== 'live';
          const isSaved = savedId ? savedId === a.result.id : !!o && !!savedSha && o.sha === savedSha;
          return (
            <Box
              key={a.result.id}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, opacity: gone ? 0.8 : 1 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <LockIcon fontSize="small" color={o || gone ? 'disabled' : 'primary'} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('app.lab.results.from', { lab: recipientName(a.transfer, tr), id: shortResultId(a.result.id) })}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('app.lab.results.sent', { when: when(a.result.createdAt, tr.locale) })}
                {gone ? '' : ` · ${mb(a.result.size)}`}
                {a.result.replaces ? t('app.lab.results.corrects', { id: shortResultId(a.result.replaces) }) : ''}
                {isSaved ? t('app.lab.results.savedHere') : ''}
              </Typography>
              {a.state === 'withdrawn' ? (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                  {t('app.lab.results.withdrawnOn', {
                    date: day(a.result.withdrawnAt ?? a.result.createdAt, tr.locale),
                  })}
                  {isSaved ? t('app.lab.results.stillSaved') : ''}
                </Typography>
              ) : a.state === 'replaced' ? (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                  {t('app.lab.results.replacedByNewer')}
                  {isSaved ? t('app.lab.results.stillSaved') : ''}
                </Typography>
              ) : !o ? (
                <Button
                  variant="contained"
                  sx={{ mt: 1.5, minHeight: 44 }}
                  disabled={!keys || busy === a.result.id}
                  onClick={() => void open(a)}
                  startIcon={busy === a.result.id ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {busy === a.result.id ? t('app.lab.results.opening') : t('app.plant.open')}
                </Button>
              ) : (
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  <SignerLine signer={o.signer} />
                  <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {t('app.lab.results.fileLine', { type: o.type.label, sha: short(o.sha), name: o.name })}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => download(o.bytes, o.name, o.type.mime)}
                      sx={{ minHeight: 44 }}
                    >
                      {t('app.lab.results.download')}
                    </Button>
                    {!isSaved && (
                      <Button
                        variant="contained"
                        onClick={() =>
                          onPair(new File([o.bytes as BlobPart], o.name, { type: o.type.mime }), {
                            resultId: a.result.id,
                            sha: o.sha,
                          })
                        }
                        sx={{ minHeight: 44 }}
                      >
                        {t('app.plant.next.save.action')}
                      </Button>
                    )}
                  </Stack>
                  {!isSaved && record.dnaFingerprint && (
                    <Typography variant="caption" color="text.secondary">
                      {t('app.lab.results.replacesSaved')}
                    </Typography>
                  )}
                </Stack>
              )}
              {/* The saved lab report: date it, or where it was dated (components/stage). */}
              {isSaved && !gone && <DateLabReport record={record} saved={saved} variant="card" />}
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

// --- the lab's side ----------------------------------------------------------------------

/** The delivery's sample details (GET /transfers/:id/custody), reloaded when lab work changes here. */
const useDeliveryCustody = (transferId: string | undefined): DeliveryCustody | null => {
  const [out, setOut] = useState<DeliveryCustody | null>(null);
  const version = useLabVersion();
  useEffect(() => {
    if (!transferId) return;
    let live = true;
    void custodyOf(transferId).then((c) => {
      if (live) setOut('error' in c ? null : c);
    });
    return () => {
      live = false;
    };
  }, [transferId, version]);
  return out;
};

/** What came with the delivery, and the lab's own reference for it. */
export const ReceivedFacts: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const [ref, setRef] = useState(record.labRef ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => setRef(record.labRef ?? ''), [record.labRef]);
  const custody = useDeliveryCustody(record.transferId ?? deliveryForRecord(record.id)?.transferId);
  const differs = custody && hasDetails(custody.arrival) ? custodyDifferences(custody.sample, custody.arrival) : [];
  const qty = quantityPhrase(record.quantity);
  const tr = useT();
  const { t } = tr;
  const b = (c: React.ReactNode) => <b>{c}</b>;
  const save = () => {
    updateReceivedNotes(record.id, { labRef: ref.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('app.lab.facts.title')}
        </Typography>
        <Typography variant="body2">
          {t('app.lab.facts.labelled', { name: record.strainName, by: record.bredBy || t('app.lab.facts.unknown') })}
          {record.transferId ? t('app.lab.facts.code', { code: record.transferId }) : ''}
          {record.receivedAt ? t('app.lab.facts.arrived', { date: day(record.receivedAt, tr.locale) }) : ''}
        </Typography>
        <Typography variant="body2">
          {rich(t('app.lab.facts.quantity'), { b }, { qty: qty ?? t('app.lab.facts.notGiven') })}
        </Typography>
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {rich(t('app.lab.facts.note'), { b }, { note: record.deliveryNote ?? t('app.lab.facts.none') })}
        </Typography>
        {custody?.locked && (
          <Typography variant="body2" color="text.secondary" data-custody-locked="">
            {t('app.lab.custody.locked')}
          </Typography>
        )}
        {custody && hasDetails(custody.sample) && (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }} data-sample-details="">
            {rich(t('app.lab.recv.breederWrote'), { b }, { line: sampleLine(custody.sample, tr) })}
          </Typography>
        )}
        {custody && hasDetails(custody.arrival) && (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }} data-arrival-details="">
            {rich(t('app.lab.facts.onArrival'), { b }, { line: arrivalLine(custody.arrival, tr) })}
          </Typography>
        )}
        {differs.map((d) => (
          <Typography key={d} variant="body2" data-custody-line="">
            {t('app.lab.custody.line', { v: differenceWords(d, tr) })}
          </Typography>
        ))}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', pt: 1 }}>
          <TextField
            size="small"
            label={t('app.lab.facts.ref')}
            value={ref}
            onChange={(e) => setRef(e.target.value.slice(0, 200))}
            fullWidth
            helperText={t('app.lab.facts.refHelp')}
          />
          <Button
            variant="outlined"
            onClick={save}
            disabled={ref.trim() === (record.labRef ?? '')}
            sx={{ minHeight: 40 }}
          >
            {saved ? t('app.backup.saved') : t('app.lab.facts.save')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

type MySent = { list: ResultSummary[]; signed: Map<string, string>; retracted: Set<string> };

/** The lab's view of what it sent on a delivery: the list, and its own signatures over each. */
const loadMySent = async (transferId: string, subject: string): Promise<MySent | { error: string }> => {
  const [list, atts] = await Promise.all([listResults(transferId), attestationsFor(subject)]);
  if ('error' in list) return list;
  const me = loadAttester()?.keypair.publicKey;
  const mine = atts.filter((a) => a.type === 'laboratory-report' && a.attester.publicKey === me && a.signatureValid);
  return {
    list: list.results,
    signed: new Map(mine.filter(countsAsSigned).map((a) => [a.attestationId, a.documentHash])),
    retracted: new Set(mine.filter((a) => a.retraction).map((a) => a.attestationId)),
  };
};

/** The lab's side: what it sent, and sending a lab report back on a delivery it received. */
export const SendResultsPanel: React.FC<{
  record: StrainRecord;
  onSignReceipt: () => void;
}> = ({ record, onSignReceipt }) => {
  const stored = deliveryForRecord(record.id);
  // Only a lock from the lab code, or from the sender's sealed offer, ever locks a report
  // (round 3, P1); one that can't be vouched for waits until the code is pasted again.
  const vouched = reportLockFor(record, rowStateOf(RECORDS_KEY, record.id) === 'open');
  const [lock, setLock] = useState('lock' in vouched ? vouched.lock : undefined);
  const lockConflict = 'conflict' in vouched && !lock;
  const [code, setCode] = useState('');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; sha: string }>();
  const [busy, setBusy] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [note, setNote] = useState<string>();
  const [sent, setSent] = useState(false);
  const [mySent, setMySent] = useState<MySent | null>(null);
  const [replacing, setReplacing] = useState<ResultSummary>();
  const [confirm, setConfirm] = useState<string>();
  // Moves when the screen changes under the person (sent, withdrawn, a file chosen): focus
  // then goes to the new screen's heading, so a screen reader says where they are.
  const [screen, setScreen] = useState(0);
  const pick = useRef<HTMLInputElement>(null);
  const attester = loadAttester();
  const receipt = useLabReceipt(record, true);
  const transferId = record.transferId ?? stored?.transferId;
  const subject = record.receivedFromCommitment ?? stored?.sourceCommitment;
  const tr = useT();
  const { t } = tr;

  const reload = useCallback(async () => {
    if (!transferId || !subject) return;
    const r = await loadMySent(transferId, subject);
    if ('error' in r) setProblem(tr.t('app.lab.out.couldntLoad', { error: r.error }));
    else setMySent(r);
  }, [transferId, subject, tr]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (screen > 0) return focusScreenHeading();
  }, [screen]);

  if (!LAB_RESULTS_ENABLED) {
    return (
      <Alert severity="info" variant="outlined">
        {t('app.lab.out.offHere')}
      </Alert>
    );
  }

  if (!transferId || !subject) {
    return (
      <Alert severity="info" variant="outlined">
        {t('app.lab.out.noDelivery')}
      </Alert>
    );
  }

  const useCode = () => {
    const p = parseShareCode(code);
    if (p.transferId !== transferId) return setProblem(t('app.lab.out.otherDelivery'));
    if (!p.resultLock) return setProblem(t('app.lab.out.noLock'));
    rememberDelivery({
      transferId,
      receivedRecordId: record.id,
      ...(record.receivedFrom ? { sourceRecordId: record.receivedFrom } : {}),
      sourceCommitment: subject,
      recipient: p.resultLock,
      receivedAt: record.receivedAt ?? Date.now(),
      // Pasted by the lab: settles a record whose own lock differed (round 3, P1).
      lockConfirmed: true,
    });
    updateReceivedNotes(record.id, { resultLock: p.resultLock, resultLockFrom: 'code' });
    setProblem(undefined);
    setLock(p.resultLock);
  };

  const choose = async (f: File) => {
    setProblem(undefined);
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (bytes.length > 14 * 1024 * 1024) return setProblem(t('app.lab.out.tooBig'));
    setFile({ name: f.name, bytes, sha: reportFingerprint(bytes) });
    setScreen((n) => n + 1);
  };

  /** Withdraw: the signature first (so it never stands for a file that's gone), then the file. */
  const withdraw = async (r: ResultSummary) => {
    if (!attester) return;
    setBusy(r.id);
    setProblem(undefined);
    setNote(undefined);
    try {
      if (r.attestationId && !mySent?.retracted.has(r.attestationId)) {
        const out = await retract(attester, r.attestationId, 'issued-in-error');
        if (out.error) throw new Error(t('app.lab.out.withdrawFailed', { error: out.error }));
      }
      const del = await deleteResult(transferId, r.id);
      if ('error' in del) {
        throw new Error(t('app.lab.out.fileStillThere', { error: del.error }));
      }
      setNote(
        t('app.lab.out.withdrawnNote', {
          extra: r.replaces ? t('app.lab.out.spaced', { v: t('app.lab.out.correctionWarning') }) : '',
        }),
      );
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirm(undefined);
      setBusy(undefined);
      labChanged();
      await reload();
      setScreen((n) => n + 1);
    }
  };

  const send = async () => {
    if (!file || !lock || !attester) return;
    setBusy('send');
    setProblem(undefined);
    setNote(undefined);
    try {
      // Checked before anything is signed: the cap, the same file sent twice, a stale correction.
      const fresh = await loadMySent(transferId, subject);
      if ('error' in fresh) throw new Error(t('app.lab.out.couldntCheck', { error: fresh.error }));
      setMySent(fresh);
      const refusal = sendRefusal(file.sha, fresh.list, fresh.signed, replacing?.id, tr);
      if (refusal) throw new Error(refusal);
      // Sign only about the record this delivery really came from (same check as receipt).
      if (record.receivedFrom && (await publicFingerprintOf(record.receivedFrom)) !== subject) {
        throw new Error(t('app.lab.out.notConfirmed'));
      }
      const locked = await lockReport(file.bytes, lock);
      // The registry links the signature when the file arrives, so the signature comes
      // first; if the file then doesn't arrive, the signature is withdrawn at once.
      const signed = await attestRecord(attester, subject, file.sha, 'laboratory-report');
      if (signed.error || !signed.attestationId)
        throw new Error(t('app.lab.out.notRecorded', { error: signed.error ?? t('app.lab.out.noAnswer') }));
      const out = await sendLockedResult(transferId, locked, signed.attestationId, replacing?.id);
      if ('error' in out) {
        const undo = await retract(attester, signed.attestationId, 'issued-in-error');
        throw new Error(
          undo.error
            ? t('app.lab.out.didntSendUndoFailed', { error: out.error, undo: undo.error })
            : t('app.lab.out.didntSend', { error: out.error }),
        );
      }
      // The old report goes as a whole (round 3): its signature withdrawn as replaced, and
      // its file withdrawn at the registry too, so the breeder can't open the wrong one.
      if (replacing) {
        const left: string[] = [];
        if (replacing.attestationId && fresh.signed.has(replacing.attestationId)) {
          const old = await retract(attester, replacing.attestationId, 'superseded');
          if (old.error) left.push(t('app.lab.out.oldSigLeft', { error: old.error }));
        }
        const gone = await deleteResult(transferId, replacing.id);
        if ('error' in gone) left.push(t('app.lab.out.oldFileLeft', { error: gone.error }));
        if (left.length) {
          setNote(t('app.lab.out.oldLeft', { left: left.join(t('app.lab.out.andJoin')) }));
        }
      }
      setSent(true);
      setScreen((n) => n + 1);
      labChanged();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  };

  if (sent && file) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
          {t('app.lab.out.sent')}
        </Typography>
        <Typography variant="body1">{t('app.lab.out.sentText', { sha: short(file.sha) })}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.lab.out.sentName', { name: attester?.displayName ?? t('app.lab.out.yourLab') })}
        </Typography>
        {note && (
          <Alert severity="warning" variant="outlined">
            {note}
          </Alert>
        )}
      </Stack>
    );
  }

  const list = mySent?.list ?? [];

  return (
    <Stack spacing={2.5}>
      {list.length > 0 && (
        <Box>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            {t('app.lab.out.youSent')}
          </Typography>
          <Stack spacing={1}>
            {list.map((r) => {
              const state = resultState(r, list);
              return (
                <Box key={r.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t('app.lab.out.rowHead', { id: shortResultId(r.id), when: when(r.createdAt, tr.locale) })}
                    {r.replaces ? t('app.lab.results.corrects', { id: shortResultId(r.replaces) }) : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sentRowWords(state, r, mySent, tr)}
                  </Typography>
                  {state === 'live' && attester && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      {confirm === r.id ? (
                        <>
                          <Button
                            color="error"
                            variant="contained"
                            size="small"
                            disabled={!!busy}
                            onClick={() => void withdraw(r)}
                            sx={{ minHeight: 40 }}
                          >
                            {busy === r.id ? t('app.lab.out.withdrawing') : t('app.lab.out.yesWithdraw')}
                          </Button>
                          <Button size="small" onClick={() => setConfirm(undefined)} sx={{ minHeight: 40 }}>
                            {t('app.lab.out.keepIt')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!!busy}
                            onClick={() => setConfirm(r.id)}
                            sx={{ minHeight: 40 }}
                          >
                            {t('app.lab.out.withdraw')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!!busy}
                            onClick={() => {
                              setReplacing(r);
                              setFile(undefined);
                              setScreen((n) => n + 1);
                            }}
                            sx={{ minHeight: 40 }}
                          >
                            {t('app.lab.out.sendCorrected')}
                          </Button>
                        </>
                      )}
                    </Stack>
                  )}
                  {confirm === r.id && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      {t('app.lab.out.confirmText')}
                      {r.replaces && <b>{t('app.lab.out.spaced', { v: t('app.lab.out.correctionWarning') })}</b>}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
      {note && (
        <Alert severity="success" variant="outlined">
          {note}
        </Alert>
      )}

      <Box>
        <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
          {replacing ? t('app.lab.out.sendCorrected') : t('app.plant.action.sendResults')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {replacing
            ? t('app.lab.out.replacesIntro', {
                id: shortResultId(replacing.id),
                when: when(replacing.createdAt, tr.locale),
              })
            : t('app.lab.out.intro')}
        </Typography>
        {replacing && (
          <Button size="small" onClick={() => setReplacing(undefined)} sx={{ mt: 0.5 }}>
            {t('app.lab.out.cancelCorrection')}
          </Button>
        )}
      </Box>

      {record.receiptRejected ? (
        <Alert severity="info" variant="outlined">
          {t('app.lab.out.turnedAway')}
        </Alert>
      ) : !attester ? (
        <Alert severity="info" variant="outlined">
          {t('app.lab.out.setUpFirst')}{' '}
          <Button size="small" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SIGNING_KEY_EVENT))}>
            {t('app.plant.next.setup.action')}
          </Button>
        </Alert>
      ) : !lock ? (
        <Stack spacing={1.25}>
          <Typography variant="body1" {...(lockConflict ? { 'data-lock-conflict': '' } : {})}>
            {t(lockConflict ? 'app.lab.out.pasteAgain' : 'app.lab.out.noLockHere')}
          </Typography>
          <TextField
            label={t('app.lab.recv.codeLabel')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={useCode} disabled={!code.trim()} sx={{ alignSelf: 'flex-start' }}>
            {t('app.lab.out.useCode')}
          </Button>
        </Stack>
      ) : (
        <>
          {receipt?.kind === 'not-signed' && (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Button color="inherit" onClick={onSignReceipt} sx={{ minHeight: 40 }}>
                  {t('app.plant.action.signReceipt')}
                </Button>
              }
            >
              {t('app.lab.out.notSignedReceipt')}
            </Alert>
          )}
          {receipt?.kind === 'signed' && !receipt.linked && (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Button color="inherit" onClick={onSignReceipt} sx={{ minHeight: 40 }}>
                  {t('app.plant.next.link.action')}
                </Button>
              }
            >
              {t('app.lab.out.notLinked')}
            </Alert>
          )}
          {file ? (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('app.lab.out.fileFp', { size: mb(file.bytes.length), fp: short(file.sha) })}
              </Typography>
              <Button size="small" onClick={() => setFile(undefined)} sx={{ mt: 0.5 }}>
                {t('app.lab.out.differentFile')}
              </Button>
            </Box>
          ) : (
            <Button variant="outlined" size="large" onClick={() => pick.current?.click()} sx={{ py: 1.3 }}>
              {replacing ? t('app.lab.out.chooseCorrected') : t('app.lab.out.chooseReport')}
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
            disabled={!file || !!busy}
            onClick={() => void send()}
            startIcon={busy === 'send' ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
            sx={{ py: 1.5 }}
          >
            {busy === 'send' ? t('app.lab.out.signing') : t('app.lab.out.signLockSend')}
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

/** One line for a lab's Home card: who it's from, when, receipt, lab reports sent. */
export const labCardLine = (r: StrainRecord, facts?: LabCardFacts, tr: Translator = enT): string =>
  [
    r.bredBy || tr.t('app.lab.card.unknownBreeder'),
    r.receivedAt ? tr.t('app.lab.card.received', { date: day(r.receivedAt, tr.locale) }) : undefined,
    r.receiptRejected
      ? tr.t('app.lab.card.turnedAway')
      : facts === undefined
        ? undefined
        : facts.signed
          ? tr.t('app.lab.card.signed')
          : tr.t('app.lab.card.notSigned'),
    labSentPhrase(facts, tr),
    r.labRef ? tr.t('app.lab.card.ref', { ref: r.labRef }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
