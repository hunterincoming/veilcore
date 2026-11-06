// Seal a document (/documents/new; docs/document-profile.md). The files are hashed here, in
// the browser, and only their SHA-256, name and size are sealed: the bytes never leave the
// device. One page, not the plant flow's steps: a document has no parents, photos or DNA.
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { createRecord, tooLargeToSave, useRecords } from '../../veilcore/records';
import { forgetKeys } from '../../veilcore/record-keys';
import { isLabReportRecord } from '../stage/lab-report-notes';
import { DOCUMENT_RECORDS_ENABLED } from '../../config/network';
import { AppHeader } from '../AppHeader';
import { useT } from '../../i18n/app';
import { typeWords } from './DocumentParts';
import { NumbersFields } from './NumbersFields';
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
  // The numbers on it (field-set.ts): a published schema and what was typed into its slots.
  const [schema, setSchema] = useState('');
  const [typed, setTyped] = useState<TypedNumbers>({});
  const [issuer, setIssuer] = useState('');
  const [reference, setReference] = useState('');
  const [issued, setIssued] = useState('');
  const [about, setAbout] = useState<string[]>([]);
  const [holder, setHolder] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [tried, setTried] = useState(false);

  if (!DOCUMENT_RECORDS_ENABLED) return <Navigate to="/new" replace />;

  // What it can be about: the holder's genetic records, never another document or a record
  // that dates a lab report.
  const aboutOptions = records.filter((r) => !isDocument(r) && !isLabReportRecord(r) && !r.supersededBy);

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
    if (!title && next[0]) setTitle(line(next[0].name.replace(/\.[^.]{1,8}$/, '')));
  };

  const numbers = schema ? numbersOf(schema, typed) : undefined;
  const missing = !files.length
    ? t('app.doc.need.file')
    : !line(title)
      ? t('app.doc.need.title')
      : !line(holder)
        ? t('app.doc.need.holder')
        : numbers?.bad.length
          ? t('app.doc.need.numbers')
          : schema && !numbers?.any
            ? t('app.doc.need.aNumber')
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
        title: line(title),
        type,
        issuer: line(issuer),
        reference: line(reference),
        issued,
        files,
        about: about
          .map((rid) => records.find((r) => r.id === rid))
          .filter((r): r is NonNullable<typeof r> => !!r)
          .map((r) => ({ recordId: r.id, name: line(r.strainName) || r.id })),
        holder: line(holder),
        notes: notes.trim(),
        ...(numbers?.any ? { fieldSet: await makeFieldSet(schema, numbers.values) } : {}),
      });
      id = sealed.id;
      if (tooLargeToSave(sealed)) {
        forgetKeys(id);
        setError(t('app.sealed.tooLarge'));
        setBusy(false);
        return;
      }
      const record = createRecord(sealed);
      created = true;
      void navigate(`/record/${record.id}`);
    } catch (e) {
      if (id && !created) forgetKeys(id);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }} data-document-new="">
      <AppHeader />
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        {t('app.doc.new.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('app.doc.new.intro')}
      </Typography>
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
          </Box>
          <TextField
            label={t('app.doc.f.title')}
            helperText={t('app.doc.f.titleHelp')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
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
          {(type === 'certificate-of-analysis' || type === 'lab-report' || schema) && (
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
          <TextField
            label={t('app.doc.f.issuer')}
            helperText={t('app.doc.f.issuerHelp')}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('app.doc.f.reference')}
              helperText={t('app.doc.f.referenceHelp')}
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
          {aboutOptions.length > 0 && (
            <TextField
              select
              label={t('app.doc.f.about')}
              helperText={t('app.doc.f.aboutHelp')}
              value={about}
              onChange={(e) => {
                const v = e.target.value as unknown as string[] | string;
                setAbout((typeof v === 'string' ? v.split(',') : v).slice(0, DOCUMENT_ABOUT_MAX));
              }}
              slotProps={{ select: { multiple: true } }}
              fullWidth
            >
              {aboutOptions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.strainName || r.id}
                </MenuItem>
              ))}
            </TextField>
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
