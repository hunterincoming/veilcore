// Seal a document (/documents/new; docs/document-profile.md). The files are hashed here, in
// the browser, and only their SHA-256, name and size are sealed: the bytes never leave the
// device. One page, not the plant flow's steps: a document has no parents, photos or DNA.
//
// "Grow batch" and "Harvest lot" (docs/document-chain.md) are the same record with a guided
// start: the form of its numbers is chosen for the holder, the reference is its batch or lot ID,
// and it says what it is about. Its sealed type is `other`; what kind it is is read back from
// the sealed schema id (veilcore/document-kind.ts). A file is still needed: the holder's own
// batch sheet, or a plain-text sheet made here from the details that are not counts.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DOCUMENT_ABOUT_MAX,
  DOCUMENT_FILES_MAX,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  fingerprintFile,
  isDocument,
  type DocumentFile,
  type DocumentType,
} from '../../veilcore/document-profile';
import { sealDocumentRecord } from '../../veilcore/seal-record';
import { createRecord, isKeptOnDeviceOnly, tooLargeToSave, useRecords } from '../../veilcore/records';
import { forgetKeys } from '../../veilcore/record-keys';
import { isLabReportRecord } from '../stage/lab-report-notes';
import { DEVICE_ONLY_RECORDS_ENABLED, DOCUMENT_CHAIN_ENABLED, DOCUMENT_RECORDS_ENABLED } from '../../config/network';
import { AppHeader } from '../AppHeader';
import { useT } from '../../i18n/app';
import { kindOrTypeWords, typeWords } from './DocumentParts';
import { DOCUMENT_KINDS, KIND_SCHEMA, kindFromQuery, type DocumentKind } from '../../veilcore/document-kind';
import { batchSheetFile, batchSheetText, chainNotes } from '../../veilcore/document-chain';
import { NumbersFields } from './NumbersFields';
import { BackupStep } from '../flow/BackupStep';
import { FlowFrame } from '../flow/FlowFrame';
import { makeFieldSet, numbersOf, type TypedNumbers } from '../../veilcore/field-set';

const MB = Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024));
/** A one-line field as sealed: trimmed, no line breaks or tabs. */
const line = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 200).trim();

export const DocumentNew: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const navigate = useNavigate();
  const records = useRecords();
  const inputId = useId();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [reading, setReading] = useState<string>();
  const [fileProblem, setFileProblem] = useState<string>();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('other');
  // The guided start (docs/document-chain.md): '' is any other document, exactly as before.
  const [kind, setKind] = useState<DocumentKind | ''>('');
  const [site, setSite] = useState('');
  const [variety, setVariety] = useState('');
  const [sheet, setSheet] = useState<string>();
  // The numbers on it (field-set.ts): a published schema and what was typed into its slots.
  const [schema, setSchema] = useState('');
  const [typed, setTyped] = useState<TypedNumbers>({});
  const [issuer, setIssuer] = useState('');
  const [reference, setReference] = useState('');
  const [issued, setIssued] = useState('');
  const [about, setAbout] = useState<string[]>([]);
  const [holder, setHolder] = useState('');
  const [notes, setNotes] = useState('');
  // Keep it on this device and in the backup only (docs/device-only-records.md). Off unless ticked.
  const [deviceOnly, setDeviceOnly] = useState(false);
  // A document just sealed that way: the backup step comes next, before its page. Until a
  // backup that holds it is saved and checked, this browser has the only copy.
  const [sealedLocal, setSealedLocal] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [tried, setTried] = useState(false);

  // Arriving from "A grow batch or a harvest lot" or from a record's "Next in its chain": the
  // kind and what it is about are already set, once. Only one of this browser's own records that
  // could be picked by hand is accepted, and a record kept on this device only makes this one
  // kept here too (it could not name that record otherwise). Nothing in the address is trusted
  // beyond that, and everything stays editable.
  const [query] = useSearchParams();
  const fromLink = useRef(false);
  const linkKind = kindFromQuery(query.get('kind'));
  const linkAbout = query.get('about');
  useEffect(() => {
    if (fromLink.current || !DOCUMENT_RECORDS_ENABLED || !DOCUMENT_CHAIN_ENABLED) return;
    if (linkAbout && records.length === 0) return; // the records are still loading
    fromLink.current = true;
    if (linkKind) {
      setKind(linkKind);
      setSchema(KIND_SCHEMA[linkKind]);
      setType('other');
    }
    const target = linkAbout
      ? records.find((r) => r.id === linkAbout && !isLabReportRecord(r) && !r.supersededBy)
      : undefined;
    if (!target) return;
    if (isKeptOnDeviceOnly(target)) {
      if (!DEVICE_ONLY_RECORDS_ENABLED) return;
      setDeviceOnly(true);
    }
    setAbout([target.id]);
  }, [records, linkKind, linkAbout]);

  if (!DOCUMENT_RECORDS_ENABLED) return <Navigate to="/new" replace />;

  // What it can be about: the holder's records, another document among them (a harvest lot is
  // about its grow batch: docs/document-chain.md), never a record that dates a lab report. A new
  // record has no id yet, so it can't be picked for itself (and seal-record.ts refuses that).
  const aboutOptions = records.filter(
    (r) => (DOCUMENT_CHAIN_ENABLED || !isDocument(r)) && !isLabReportRecord(r) && !r.supersededBy,
  );
  // A record kept on this device only can be picked only for a record that is kept here too:
  // what a record is about is sealed into its locked copy, which an ordinary record sends
  // (records.ts createRecord refuses it as well).
  const keptHere = DEVICE_ONLY_RECORDS_ENABLED && deviceOnly;
  const blocked = (r: (typeof records)[number]) => !keptHere && isKeptOnDeviceOnly(r);
  const anyBlocked = aboutOptions.some(blocked);
  const aboutNames = about
    .map((rid) => records.find((r) => r.id === rid))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => line(r.strainName) || r.id);

  const startAs = (k: DocumentKind | '') => {
    setKind(k);
    setTyped({});
    setSchema(k ? KIND_SCHEMA[k] : '');
    if (k) setType('other');
    setSheet(undefined);
  };
  /** The title a batch or lot gets when the holder writes none: its kind and its ID. Never a count. */
  const sealedTitle = () =>
    line(title) || (kind && line(reference) ? line(t(`app.doc.chain.titleFor.${kind}`, { id: line(reference) })) : '');
  const sheetInput = () => ({
    kind: kind as DocumentKind,
    reference: line(reference),
    issued,
    site: line(site),
    variety: line(variety),
    holder: line(holder),
    about: aboutNames,
  });
  /** No file of their own: a plain-text sheet from what was typed, downloaded and added as the file. */
  const makeSheet = async () => {
    if (!kind) return;
    setFileProblem(undefined);
    const file = batchSheetFile(sheetInput());
    const f = await fingerprintFile(file);
    if (files.some((x) => x.sha256 === f.sha256)) {
      setFileProblem(t('app.doc.f.duplicate', { name: f.name }));
      return;
    }
    if (files.length >= DOCUMENT_FILES_MAX) {
      setFileProblem(t('app.doc.f.full', { max: String(DOCUMENT_FILES_MAX) }));
      return;
    }
    const { download } = await import('../lab/download');
    download(batchSheetText(sheetInput()), f.name, 'text/plain');
    setFiles([...files, f]);
    setSheet(f.name);
  };

  const addFiles = async (picked: FileList | null) => {
    if (!picked) return;
    setFileProblem(undefined);
    let next = files;
    for (const file of Array.from(picked)) {
      if (next.length >= DOCUMENT_FILES_MAX) {
        setFileProblem(t('app.doc.f.full', { max: String(DOCUMENT_FILES_MAX) }));
        break;
      }
      setReading(file.name);
      try {
        const f = await fingerprintFile(file);
        if (next.some((x) => x.sha256 === f.sha256)) setFileProblem(t('app.doc.f.duplicate', { name: f.name }));
        else next = [...next, f];
      } catch {
        setFileProblem(t('app.doc.f.tooLarge', { name: file.name, mb: String(MB) }));
      }
    }
    setReading(undefined);
    setFiles(next);
    // The title starts as the first file's name, without its extension, until the holder writes one.
    if (!kind && !title && next[0]) setTitle(line(next[0].name.replace(/\.[^.]{1,8}$/, '')));
  };

  const numbers = schema ? numbersOf(schema, typed) : undefined;
  const missing = !files.length
    ? t('app.doc.need.file')
    : kind && !line(reference)
      ? t('app.doc.chain.need.reference')
      : !sealedTitle()
        ? t('app.doc.need.title')
        : !line(holder)
          ? t('app.doc.need.holder')
          : numbers?.bad.length
            ? t('app.doc.need.numbers')
            : schema && !numbers?.any
              ? t(kind ? 'app.doc.chain.need.aNumber' : 'app.doc.need.aNumber')
              : undefined;

  const seal = async () => {
    setTried(true);
    if (missing || busy) return;
    setBusy(true);
    setError(undefined);
    let id: string | undefined;
    let created = false;
    try {
      const sealed = await sealDocumentRecord({
        title: sealedTitle(),
        type: kind ? 'other' : type,
        issuer: line(issuer),
        reference: line(reference),
        issued,
        files,
        deviceOnly: keptHere,
        about: about
          .map((rid) => records.find((r) => r.id === rid))
          .filter((r): r is NonNullable<typeof r> => !!r && !blocked(r))
          .map((r) => ({ recordId: r.id, name: line(r.strainName) || r.id })),
        holder: line(holder),
        notes: kind
          ? chainNotes(
              { site: t('app.doc.chain.note.site'), variety: t('app.doc.chain.note.variety') },
              site,
              variety,
              notes,
            )
          : notes.trim(),
        ...(numbers?.any ? { fieldSet: await makeFieldSet(schema, numbers.values) } : {}),
      });
      id = sealed.id;
      if (tooLargeToSave(sealed)) {
        forgetKeys(id);
        setError(t('app.sealed.tooLarge'));
        setBusy(false);
        return;
      }
      // Chosen here, once: the record is made with the mark, and no save ever sends it.
      const record = createRecord(DEVICE_ONLY_RECORDS_ENABLED && deviceOnly ? { ...sealed, deviceOnly: true } : sealed);
      created = true;
      if (record.deviceOnly) {
        setSealedLocal(record.id);
        setBusy(false);
        return;
      }
      void navigate(`/record/${record.id}`);
    } catch (e) {
      if (id && !created) forgetKeys(id);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  if (sealedLocal)
    return (
      <Box data-device-only-backup-step="">
        <AppHeader />
        <FlowFrame section="log">
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            {t('app.doc.local.backupNow')}
          </Alert>
          <BackupStep
            title={t('app.backup.title')}
            finishLabel={t('app.doc.local.toRecord')}
            onDone={() => void navigate(`/record/${sealedLocal}`)}
          />
        </FlowFrame>
      </Box>
    );

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }} data-document-new="">
      <AppHeader />
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        {t('app.doc.new.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('app.doc.new.intro')}
      </Typography>
      {DOCUMENT_CHAIN_ENABLED && (
        <Paper sx={{ p: { xs: 2.5, md: 3 }, mb: 2.5 }} data-chain-start={kind || 'plain'}>
          <Typography variant="subtitle1" component="h2">
            {t('app.doc.chain.start.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('app.doc.chain.start.text')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {DOCUMENT_KINDS.map((k) => (
              <Button
                key={k}
                variant={kind === k ? 'contained' : 'outlined'}
                aria-pressed={kind === k}
                onClick={() => startAs(k)}
                disabled={busy}
                sx={{ minHeight: 44 }}
                data-chain-start-kind={k}
              >
                {t(`app.doc.chain.kind.${k}`)}
              </Button>
            ))}
            <Button
              variant={kind === '' ? 'contained' : 'outlined'}
              aria-pressed={kind === ''}
              onClick={() => startAs('')}
              disabled={busy}
              sx={{ minHeight: 44 }}
              data-chain-start-kind="plain"
            >
              {t('app.doc.chain.start.plain')}
            </Button>
          </Stack>
        </Paper>
      )}
      <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" sx={{ display: 'block' }}>
              {t('app.doc.f.files')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('app.doc.f.filesHelp', { max: String(DOCUMENT_FILES_MAX) })}
            </Typography>
            <Stack spacing={0.75} sx={{ mb: 1 }}>
              {files.map((f) => (
                <Chip
                  key={f.sha256}
                  label={`${f.name} · ${t('app.doc.fileSize', { size: f.size.toLocaleString(tr.locale) })}`}
                  onDelete={() => setFiles(files.filter((x) => x.sha256 !== f.sha256))}
                  deleteIcon={undefined}
                  aria-label={t('app.doc.f.remove', { name: f.name })}
                  sx={{ justifyContent: 'space-between', maxWidth: '100%' }}
                  data-picked-file=""
                />
              ))}
            </Stack>
            <Button
              variant={files.length ? 'text' : 'contained'}
              component="label"
              htmlFor={inputId}
              disabled={!!reading || files.length >= DOCUMENT_FILES_MAX}
              sx={{ minHeight: 44 }}
            >
              {files.length ? t('app.doc.f.addMore') : t('app.doc.f.add')}
              <input
                id={inputId}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </Button>
            {reading && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">{t('app.doc.f.reading', { name: reading })}</Typography>
              </Stack>
            )}
            {fileProblem && (
              <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
                {fileProblem}
              </Alert>
            )}
            {kind && (
              <Box sx={{ mt: 2 }} data-chain-sheet="">
                <Typography variant="subtitle2" component="h3">
                  {t('app.doc.chain.sheet.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('app.doc.chain.sheet.text')}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => void makeSheet()}
                  disabled={busy || !!reading || !line(reference) || !line(holder)}
                  sx={{ minHeight: 44 }}
                  data-chain-sheet-make=""
                >
                  {t('app.doc.chain.sheet.make')}
                </Button>
                {sheet && (
                  <Alert severity="info" variant="outlined" sx={{ mt: 1 }} data-chain-sheet-made="">
                    {t('app.doc.chain.sheet.made', { name: sheet })}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
          <TextField
            label={t('app.doc.f.title')}
            helperText={t(kind ? 'app.doc.chain.f.titleHelp' : 'app.doc.f.titleHelp')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          {!kind && (
            <TextField
              select
              label={t('app.doc.f.type')}
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              fullWidth
            >
              {DOCUMENT_TYPES.map((d) => (
                <MenuItem key={d} value={d}>
                  {typeWords(d, tr)}
                </MenuItem>
              ))}
            </TextField>
          )}
          {kind && (
            <Box data-chain-numbers="">
              <Typography variant="overline" sx={{ display: 'block' }}>
                {t('app.doc.chain.f.numbers')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('app.doc.chain.f.numbersHelp')}
              </Typography>
              <NumbersFields
                schema={schema}
                onSchema={() => undefined}
                typed={typed}
                onTyped={setTyped}
                bad={tried ? (numbers?.bad ?? []) : []}
                bare
                fixed
              />
            </Box>
          )}
          {!kind && (type === 'certificate-of-analysis' || type === 'lab-report' || schema) && (
            <NumbersFields
              schema={schema}
              onSchema={(id) => {
                setSchema(id);
                setTyped({});
              }}
              typed={typed}
              onTyped={setTyped}
              bad={tried ? (numbers?.bad ?? []) : []}
            />
          )}
          {!kind && (
            <TextField
              label={t('app.doc.f.issuer')}
              helperText={t('app.doc.f.issuerHelp')}
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t(kind ? `app.doc.chain.f.reference.${kind}` : 'app.doc.f.reference')}
              helperText={t(kind ? 'app.doc.chain.f.referenceHelp' : 'app.doc.f.referenceHelp')}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
            <TextField
              label={t('app.doc.f.issued')}
              type="date"
              value={issued}
              onChange={(e) => setIssued(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          {kind && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('app.doc.chain.f.site')}
                helperText={t('app.doc.chain.f.siteHelp')}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 200, 'data-chain-site': '' } }}
                fullWidth
              />
              <TextField
                label={t('app.doc.chain.f.variety')}
                helperText={t('app.doc.chain.f.varietyHelp')}
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 200, 'data-chain-variety': '' } }}
                fullWidth
              />
            </Stack>
          )}
          {aboutOptions.length > 0 && (
            <TextField
              select
              label={t('app.doc.f.about')}
              helperText={t(DOCUMENT_CHAIN_ENABLED ? 'app.doc.chain.aboutHelp' : 'app.doc.f.aboutHelp')}
              value={about}
              onChange={(e) => {
                const v = e.target.value as unknown as string[] | string;
                setAbout((typeof v === 'string' ? v.split(',') : v).slice(0, DOCUMENT_ABOUT_MAX));
              }}
              slotProps={{ select: { multiple: true } }}
              fullWidth
            >
              {aboutOptions.map((r) => (
                <MenuItem key={r.id} value={r.id} disabled={blocked(r)} data-about-option={blocked(r) ? 'blocked' : ''}>
                  {r.strainName || r.id}
                  {isDocument(r) ? ` · ${kindOrTypeWords(r, tr)}` : ''}
                  {isKeptOnDeviceOnly(r) ? ` · ${t('app.doc.local.homeLine')}` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          {anyBlocked && (
            <Typography variant="body2" color="text.secondary" data-about-local-only="">
              {t('app.doc.chain.aboutLocalOnly')}
            </Typography>
          )}
          <TextField
            label={t('app.doc.f.holder')}
            helperText={t('app.doc.f.holderHelp')}
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <TextField
            label={t('app.doc.f.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <Typography variant="body2" color="text.secondary">
            {t('app.doc.new.proves')}
          </Typography>
          {DEVICE_ONLY_RECORDS_ENABLED && (
            <Box data-device-only-choice="">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deviceOnly}
                    onChange={(e) => {
                      setDeviceOnly(e.target.checked);
                      // Unticked: a record kept on this device only can no longer be named.
                      if (!e.target.checked)
                        setAbout(about.filter((id) => !isKeptOnDeviceOnly(records.find((r) => r.id === id))));
                    }}
                    disabled={busy}
                    slotProps={{ input: { 'aria-describedby': `${inputId}-device-only` } }}
                  />
                }
                label={t('app.doc.local.choice')}
              />
              {/* The trade-offs, said before the choice is made, whether or not it is ticked. */}
              <Box id={`${inputId}-device-only`} sx={{ pl: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('app.doc.local.before')}
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
                  {(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const).map((k) => (
                    <Typography key={k} component="li" variant="body2">
                      {t(`app.doc.local.${k}`)}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
          {tried && missing && (
            <Alert severity="warning" variant="outlined" data-document-missing="">
              {missing}
            </Alert>
          )}
          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}
          <Box>
            <Button variant="contained" size="large" disabled={busy || !!reading} onClick={() => void seal()}>
              {busy ? t('app.doc.sealing') : t('app.doc.seal')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};
