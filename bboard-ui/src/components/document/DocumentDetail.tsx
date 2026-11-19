// A document record's own page (docs/document-profile.md): what was sealed, its date, the
// check link to send with the file, and "is this the same file?". No licensing, DNA report,
// lab codes or family tree: those are about genetics, and a document only points at them.
// The evidence bundle is here too: the offline package a lawyer or examiner checks without us.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  deleteDeviceOnly,
  deviceOnlyBackedUp,
  deviceOnlyConflict,
  isKeptOnDeviceOnly,
  labNameOf,
  useRecords,
  type StrainRecord,
} from '../../veilcore/records';
import {
  documentFieldsOf,
  type DocumentFile,
  type DocumentRecordLike,
  type DocumentType,
} from '../../veilcore/document-profile';
import { chainEntriesFor, documentChainLink, documentCheckLink, type AboutTarget } from '../../veilcore/document-link';
import { verifyPath } from '../../veilcore/verify-link';
import { documentKindOf } from '../../veilcore/document-kind';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { DOCUMENT_CHAIN_ENABLED, LAB_SIGNING_ENABLED, viabilityNotRead } from '../../config/network';
import { AnchorOnChainPanel } from '../chain/AnchorOnChainPanel';
import { AppHeader } from '../AppHeader';
import { EvidenceBundle } from '../EvidenceBundle';
import { useRecordKeys } from '../../veilcore/record-keys';
import { useVaultNeedsBackup } from '../../veilcore/vault';
import { keysOnlyHere } from '../flow/keys-only-here';
import { useStampRetries } from '../chain/useKeyStamp';
import { useT } from '../../i18n/app';
import { useI18n } from '../../i18n';
import { useRecordDate } from '../verify/useAnchorCheck';
import { DocumentDate, DocumentFacts, Fact, FileCompare, kindOrTypeWords, seen } from './DocumentParts';
import { ChainView } from './ChainView';
import { schemaWords, slotWords } from './NumbersFields';
import { DeviceOnlyProve, ProveNumber } from './ProveNumber';
import { LabSignaturePanel, useLabSigner } from './LabSignaturePanel';
import { labStandsOnRecord } from '../../veilcore/claim-call';
import { ResultFacts, ViabilityNotRead } from '../lab/ResultFacts';

/** The result file again, from the record that holds it: the same bundle the lab handed over. */
const downloadResult = async (record: StrainRecord) => {
  if (!record.labResult || !record.labSignature || !record.fieldSet) return;
  const [{ committedOnly }, { download }] = await Promise.all([
    import('../../veilcore/lab-numbers'),
    import('../lab/download'),
  ]);
  const { about: _about, ...signature } = record.labSignature;
  void _about;
  const bundle = {
    kind: 'veilcore-lab-numbers',
    v: 2,
    record: committedOnly(record as never),
    signature,
    statement: record.labResult.statement,
  };
  download(
    JSON.stringify(bundle, null, 2),
    `${record.labResult.statement.accession.replace(/[^A-Za-z0-9._-]+/g, '_')}.veilcore-result.json`,
  );
};
import { SCHEMAS, shownNumber, type HeldFieldSet } from '../../veilcore/field-set';

/** The numbers sealed with the document, from the holder's own copy: nobody else has them. */
const HeldNumbers: React.FC<{ held: HeldFieldSet }> = ({ held }) => {
  const tr = useT();
  const schema = SCHEMAS[held.schema];
  if (!schema) return null;
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-held-numbers="">
      <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
        {tr.t('app.doc.nums.heldTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {tr.t('app.doc.nums.heldText', { schema: schemaWords(held.schema, tr) })}
      </Typography>
      <Stack spacing={0.5}>
        {schema.slots
          .filter((s) => s.type === 'uint' && held.values[s.slot] !== null && held.values[s.slot] !== undefined)
          .map((s) => (
            <Typography key={s.slot} variant="body2" data-held-slot={s.slot}>
              {slotWords(s.path, tr)}: <b>{shownNumber(held.values[s.slot] as string, s.scale ?? 1)}</b> {s.unit ?? ''}
            </Typography>
          ))}
      </Stack>
    </Paper>
  );
};

export const DocumentDetail: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const tr = useT();
  const { t } = tr;
  // The links open in the holder's language (?lang=), so an inspector reads it as they do.
  const { lang } = useI18n();
  // Until VeilCore reports the batch on Midnight, a checker is told not to rely on the link.
  // The same date answer the check page reads (shared and cached, so no extra lookups): the
  // link isn't ready while it has no batch reported on Midnight, or Midnight disagrees with it.
  const { proof: dateProof, anchor: dateAnchor } = useRecordDate(record.recordFingerprint);
  const notDatedYet =
    dateProof !== 'checking' &&
    (dateProof.status !== 'anchor-reported' || (dateAnchor !== 'checking' && dateAnchor?.status === 'failed'));
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState<string>();
  const keys = useRecordKeys()[record.id];
  const records = useRecords();
  // A viability result is not read where those are off (mainnet): no facts, no numbers, nothing to
  // publish or prove from it here. The record stays, and its result file can still be downloaded.
  const viabilityOff = viabilityNotRead({ kind: record.labResult?.statement.kind, schema: record.fieldSet?.schema });
  const read = viabilityOff ? undefined : record.fieldSet;
  // Kept on this device and in the backup only (docs/device-only-records.md): said plainly, and
  // nothing on this page that would send its details anywhere is offered.
  const local = isKeptOnDeviceOnly(record);
  // A copy of a result a lab keeps (records.ts StrainRecord.copy): its date is the lab's, not this
  // holder's. Said plainly, and nothing that would present it as dated by this holder is offered:
  // no check link ("proves you had this file"), no evidence bundle or declaration, no key stamp.
  const copy = record.copy === true && !!record.labSignature;
  // Whether a backup file the holder has checked holds it: until one does, this browser has
  // the only copy, and the page says that instead of "this browser and your backup".
  const backedUp = local && deviceOnlyBackedUp(record);
  // The registry answered with something other than this record's proof code alone: said, and
  // nothing is done about it (records.ts mergeDeviceOnly: this device's copy is what is shown).
  const conflict = local && deviceOnlyConflict(record.id);
  // The records list's own test (AppHome.tsx, keys-only-here.ts): no checked backup holds this
  // record's keys, and VeilCore doesn't hold its locked copy under a backed-up vault key yet.
  // Read again whenever the records, their keys or the vault's backup state change.
  useVaultNeedsBackup();
  const keysNotBacked = REAL_CHAIN && !local && keysOnlyHere(records).includes(record.id);
  // A key stamp that stopped ("may have been sent", "can't be made here") is not left folded away.
  const stampStopped = !!useStampRetries()[record.id]?.stopped;
  const [techOpen, setTechOpen] = useState(false);
  useEffect(() => {
    if (stampStopped) setTechOpen(true);
  }, [stampStopped]);
  const navigate = useNavigate();
  const removeFromDevice = () => {
    if (!window.confirm(t('app.doc.local.deleteConfirm'))) return;
    if (deleteDeviceOnly(record.id)) void navigate('/records');
  };
  // A kept laboratory signature is checked again against the record before anything shows it
  // as signed (lab-attest.ts): a record restored or edited by hand may no longer match.
  const [labOk, setLabOk] = useState<boolean>();
  // Whose key signed it, from the lab's binding (looked up only for a record with a lab signature).
  const labSigner = useLabSigner(record);
  const labState = { signatureOk: labOk, signer: labSigner };
  // A lab stands behind this record: the same rule as the check page (claim-call.ts labStands).
  const labHere = labStandsOnRecord(labOk, labSigner);
  useEffect(() => {
    setLabOk(undefined);
    const sig = record.labSignature;
    if (!sig || !record.fieldSet) return;
    let live = true;
    void (async () => {
      try {
        const [{ labSignatureChecks }, { claimMaterial, commitmentHex }] = await Promise.all([
          import('../../veilcore/lab-attest'),
          import('../../veilcore/claims-input'),
        ]);
        const m = await claimMaterial(record as DocumentRecordLike & { fieldSet: NonNullable<typeof record.fieldSet> });
        if (live) setLabOk(labSignatureChecks(sig, commitmentHex(m)));
      } catch {
        if (live) setLabOk(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [record]);
  const d = record.document;
  const files: readonly DocumentFile[] = d?.files ?? [];

  // The same link with the records it is about (document-link.ts documentChainLink): made only
  // when the holder presses its own button, since it shows those records' details too.
  const [chainCopied, setChainCopied] = useState(false);
  const chain = DOCUMENT_CHAIN_ENABLED ? chainEntriesFor(record as never, records as never) : [];
  const copyChainLink = async () => {
    setLinkError(undefined);
    try {
      const link = documentChainLink(record as never, records as never, window.location.origin, lang);
      await navigator.clipboard.writeText(link);
      setChainCopied(true);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : String(e));
    }
  };
  // Where an "About" entry's link goes from the holder's own page: the named record's public
  // check page, with its proof code when this browser holds the record.
  const aboutTarget = (id: string): AboutTarget => {
    const held = records.find((r) => r.id === id);
    return held?.recordFingerprint
      ? { kind: 'record', to: verifyPath(id, held.recordFingerprint) }
      : { kind: 'id-only', to: verifyPath(id) };
  };
  const hasClaims = (record.claims ?? []).length > 0;

  const copyLink = async () => {
    setLinkError(undefined);
    try {
      const link = documentCheckLink(record as DocumentRecordLike, window.location.origin, lang);
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : String(e));
    }
  };

  const f = documentFieldsOf(record as DocumentRecordLike) as {
    title: string;
    type: DocumentType;
    issuer: string;
    reference: string;
    issued: string;
    holder: string;
    notes: string;
    files: DocumentFile[];
    about: { name: string; recordId?: string }[];
    fieldSchema?: string;
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }} data-document-page="">
      <AppHeader />
      <Button
        component={RouterLink}
        to="/records"
        startIcon={<HomeIcon />}
        sx={{ mb: 1.5, ml: -1.5, minHeight: 44, px: 1.5 }}
      >
        {t('app.plant.home')}
      </Button>
      <Stack spacing={2.5}>
        <Box>
          <Chip
            label={
              DOCUMENT_CHAIN_ENABLED && documentKindOf(record)
                ? `${t('app.doc.kind')} · ${kindOrTypeWords(record, tr)}`
                : t('app.doc.kind')
            }
            size="small"
            sx={{ mb: 1 }}
            data-document-chip=""
          />
          <Typography variant="h4" component="h1" tabIndex={-1} sx={{ wordBreak: 'break-word' }}>
            {record.strainName}
          </Typography>
        </Box>
        {local && (
          <Alert
            severity={backedUp ? 'info' : 'warning'}
            variant="outlined"
            data-device-only={backedUp ? 'in-backup' : 'not-in-backup'}
            action={
              <Button
                component={RouterLink}
                to="/backup"
                color="inherit"
                variant="outlined"
                sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
              >
                {t('app.doc.local.backup')}
              </Button>
            }
          >
            <Typography variant="subtitle2" component="h2">
              {t('app.doc.local.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }} data-device-only-copies="">
              {t(
                backedUp ? (hasClaims ? 'app.doc.local.textProved' : 'app.doc.local.text') : 'app.doc.local.notBacked',
              )}
            </Typography>
            <Typography variant="body2" data-device-only-sent="">
              {t('app.doc.local.sent')}
            </Typography>
            {hasClaims && (
              <Typography variant="body2" sx={{ mt: 1 }} data-device-only-proved="">
                {t('app.doc.local.proved')}
              </Typography>
            )}
          </Alert>
        )}
        {/* Not kept on this device only, and its keys are in no checked backup (the records list's
            test): said at the top, since the key stamp's own "back up first" is folded away below. */}
        {keysNotBacked && (
          <Alert
            severity="warning"
            variant="outlined"
            data-document-not-backed=""
            action={
              <Button
                component={RouterLink}
                to="/backup"
                color="inherit"
                variant="outlined"
                sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
              >
                {t('app.doc.local.backup')}
              </Button>
            }
          >
            {t('app.doc.notBacked')}
          </Alert>
        )}
        {conflict && (
          <Alert severity="warning" variant="outlined" data-device-only-conflict="">
            {t('app.doc.local.conflict')}
          </Alert>
        )}
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={1.5}>
            {copy ? (
              <Alert severity="info" variant="outlined" data-document-copy="">
                <Typography variant="subtitle2" component="h2">
                  {t('app.doc.copy.title')}
                </Typography>
                <Typography variant="body2">
                  {t('app.doc.copy.text', { lab: labNameOf(record) || t('app.doc.copy.aLab') })}
                </Typography>
              </Alert>
            ) : (
              <DocumentDate fingerprint={record.recordFingerprint} />
            )}
            <Fact label={t('app.doc.k.sealed')}>{tr.date(record.loggedAt)}</Fact>
            <Fact label={t('app.doc.k.proofCode')} mono>
              {record.recordFingerprint}
            </Fact>
          </Stack>
        </Paper>
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <DocumentFacts fields={f} aboutTarget={DOCUMENT_CHAIN_ENABLED ? aboutTarget : undefined} />
        </Paper>
        {record.labResult && record.labSignature && (
          <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-lab-result-panel="">
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t('app.lr.panelTitle')}
            </Typography>
            {viabilityOff ? (
              <ViabilityNotRead />
            ) : (
              <ResultFacts statement={record.labResult.statement} code={record.labSignature.record} />
            )}
            <Button
              variant="outlined"
              sx={{ mt: 2, minHeight: 44 }}
              onClick={() => void downloadResult(record)}
              data-result-download=""
            >
              {t('app.lr.tools.download')}
            </Button>
          </Paper>
        )}
        {viabilityOff && !(record.labResult && record.labSignature) && (
          <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
            <ViabilityNotRead />
          </Paper>
        )}
        {read && <HeldNumbers held={read} />}
        <ChainView record={record} />
        {/* Signing sends details out of this browser: not for a record kept here only. Proving a
            number publishes a fact on Midnight: for such a record it is the holder's own choice,
            off until they turn it on (ProveNumber.tsx DeviceOnlyProve). */}
        {!local && (
          <>
            {read && LAB_SIGNING_ENABLED && <LabSignaturePanel record={record} {...labState} />}
            {read && <ProveNumber record={record} labSignatureOk={labOk === true} labStands={labHere} />}
          </>
        )}
        {read && local && <DeviceOnlyProve record={record} />}
        {!copy && (
          <Paper sx={{ p: { xs: 2.5, md: 3 }, scrollMarginTop: 16 }} data-document-share="" id="check-link">
            <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
              {t('app.doc.share.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('app.doc.share.text')}
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
              {t('app.doc.share.warn')}
            </Alert>
            {notDatedYet && (
              <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }} data-share-not-dated="">
                {t('app.doc.share.notDatedYet')}
              </Alert>
            )}
            <Button variant="contained" onClick={() => void copyLink()} sx={{ minHeight: 44 }}>
              {t('app.doc.share.copy')}
            </Button>
            {copied && (
              <Typography variant="body2" role="status" sx={{ mt: 1 }}>
                {t('app.doc.share.copied')}
              </Typography>
            )}
            {chain.length > 0 && (
              <Box sx={{ mt: 2.5 }} data-document-chain-share="">
                <Typography variant="subtitle2" component="h3">
                  {t('app.doc.chain.share.title')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('app.doc.chain.share.text')}
                </Typography>
                <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
                  {t('app.doc.chain.share.warn', {
                    list: chain
                      .map((c) => {
                        const r = records.find((x) => x.id === c.id);
                        // A record kept on this device only is marked: this link is how its fields leave.
                        return `${seen(r?.strainName || c.id)}${isKeptOnDeviceOnly(r) ? ` (${t('app.doc.local.homeLine')})` : ''}`;
                      })
                      .join(' · '),
                  })}
                  {chain.some((c) => isKeptOnDeviceOnly(records.find((x) => x.id === c.id))) || local ? (
                    <Box component="span" sx={{ display: 'block', mt: 1 }} data-chain-share-local="">
                      {t('app.doc.chain.share.warnLocal')}
                    </Box>
                  ) : null}
                </Alert>
                <Button variant="outlined" onClick={() => void copyChainLink()} sx={{ minHeight: 44 }}>
                  {t('app.doc.chain.share.copy')}
                </Button>
                {chainCopied && (
                  <Typography variant="body2" role="status" sx={{ mt: 1 }}>
                    {t('app.doc.chain.share.copied')}
                  </Typography>
                )}
              </Box>
            )}
            {linkError && (
              <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
                {linkError}
              </Alert>
            )}
          </Paper>
        )}
        <Paper sx={{ p: { xs: 2.5, md: 3 }, scrollMarginTop: 16 }} id="compare-file">
          <FileCompare files={files} title={t('app.doc.compare.title')} text={t('app.doc.compare.text')} />
        </Paper>
        {!copy && (
          <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-document-bundle="">
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {t('app.plant.bundle.intro')}
            </Typography>
            <EvidenceBundle record={record} keys={keys} />
          </Paper>
        )}
        {/* The key's date stamp, folded under "Technical details" (secretary walkthrough, 18 Nov):
            open, it made a finished document look unfinished. The document's date doesn't need
            it; answering "prove you hold this record" later does, so it stays one tap away. The
            panel stays mounted while folded, so a stamp that failed is still tried again. */}
        {REAL_CHAIN && !copy && (
          <Accordion
            disableGutters
            variant="outlined"
            expanded={techOpen}
            onChange={(_e, open) => setTechOpen(open)}
            data-document-technical=""
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
              <Typography variant="subtitle1" component="h2">
                {t('app.doc.tech.title')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('app.doc.tech.text')}
              </Typography>
              {/* The key's date stamp is the one thing here that sends anything, and only when the
                  holder presses its button (useKeyStamp: by itself it only tries a failed one again). */}
              {local && (
                <Typography variant="body2" sx={{ mb: 1.5 }} data-device-only-stamp="">
                  {t('app.doc.local.stamp')}
                </Typography>
              )}
              <AnchorOnChainPanel recordId={record.id} />
            </AccordionDetails>
          </Accordion>
        )}
        {local && (
          <Box>
            <Button color="error" onClick={removeFromDevice} sx={{ minHeight: 44 }} data-device-only-delete="">
              {t('app.doc.local.delete')}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
};
