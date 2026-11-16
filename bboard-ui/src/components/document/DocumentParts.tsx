// What a document record's page and its check page share (docs/document-profile.md): the
// document's facts as sealed, its date, and "is this the same file?", which hashes a picked
// file in the browser and compares it with the sealed fingerprints. Nothing is uploaded.
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { oneLine } from '../../veilcore/evidence/words';
import { Alert, Box, Button, Link, Stack, Typography } from '@mui/material';
import {
  MAX_DOCUMENT_BYTES,
  fingerprintFile,
  matchFile,
  type DocumentFile,
  type DocumentType,
} from '../../veilcore/document-profile';
import { documentKindOf, type DocumentKind } from '../../veilcore/document-kind';
import type { AboutTarget } from '../../veilcore/document-link';
import { DOCUMENT_CHAIN_ENABLED } from '../../config/network';
import { recordDateRow } from '../flow/plant-status-words';
import { useRecordDate } from '../verify/useAnchorCheck';
import { rich, useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

export const typeWords = (t: DocumentType | undefined, tr: Translator): string =>
  tr.t(`app.doc.type.${t ?? 'other'}` as AppKey);

/** A chain link's kind in words ("Grow batch"): read from the sealed schema id (document-kind.ts). */
export const kindWords = (k: DocumentKind, tr: Translator): string => tr.t(`app.doc.chain.kind.${k}` as AppKey);

/**
 * What a document is, in words: its kind when its sealed schema id says it is a link of a
 * production chain, its type otherwise. Such a record's sealed type is `other`; the kind is
 * not a field anyone typed.
 */
export const kindOrTypeWords = (
  r: { readonly fieldSchema?: string; readonly document?: { readonly type?: DocumentType } } | undefined,
  tr: Translator,
): string => {
  const kind = DOCUMENT_CHAIN_ENABLED ? documentKindOf(r) : undefined;
  return kind ? kindWords(kind, tr) : typeWords(r?.document?.type, tr);
};

const MB = Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024));

export const Fact: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => (
  <Box>
    <Typography variant="overline" sx={{ display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={mono ? { fontFamily: 'monospace', wordBreak: 'break-all' } : undefined}>
      {children}
    </Typography>
  </Box>
);

/**
 * What someone else typed, shown as typed but on one line and with no invisible characters:
 * a direction mark (U+202E) could make "invoice‮fdp.exe" read as "invoiceexe.pdf", and a
 * zero-width space could make two names look alike (the evidence bundle does the same, words.ts).
 */
export const seen = oneLine;
/** Notes keep their line breaks; only the invisible characters go. */
const seenNotes = (v: string) => v.replace(/[\p{Cf}\u2028\u2029]+/gu, ' ');

/** The document's facts as sealed. Empty ones are left out. */
export const DocumentFacts: React.FC<{
  /** Shown to a checker: "Issued by" is then the holder's statement, not "your" statement. */
  checker?: boolean;
  fields: {
    readonly title: string;
    readonly type: DocumentType;
    readonly issuer: string;
    readonly reference: string;
    readonly issued: string;
    readonly holder: string;
    readonly notes: string;
    readonly files: readonly DocumentFile[];
    readonly about: readonly { readonly name: string; readonly recordId?: string }[];
    readonly fieldSchema?: string;
  };
  /**
   * Where the link for a record an "About" entry names goes (document-link.ts aboutTarget, or
   * the holder's own answer). Without it, or for an entry that names no record, the name alone
   * is shown, as before.
   */
  aboutTarget?: (recordId: string) => AboutTarget | undefined;
}> = ({ fields: f, checker, aboutTarget }) => {
  const tr = useT();
  const { t } = tr;
  const kind = DOCUMENT_CHAIN_ENABLED ? documentKindOf(f) : undefined;
  const targets = f.about.map((a) => (a.recordId && aboutTarget ? aboutTarget(a.recordId) : undefined));
  const linked = targets.some(Boolean);
  return (
    <Stack spacing={1.5} data-document-facts="">
      <Fact label={t('app.doc.k.type')}>
        <span data-document-kind={kind ?? ''}>{kind ? kindWords(kind, tr) : typeWords(f.type, tr)}</span>
      </Fact>
      {f.issuer && <Fact label={t(checker ? 'app.doc.k.issuerHolder' : 'app.doc.k.issuer')}>{seen(f.issuer)}</Fact>}
      {f.reference && <Fact label={t('app.doc.k.reference')}>{seen(f.reference)}</Fact>}
      {f.issued && <Fact label={t('app.doc.k.issued')}>{f.issued}</Fact>}
      <Fact label={t('app.doc.k.files')}>
        {f.files.map((file) => (
          <Box component="span" key={file.sha256} sx={{ display: 'block', mb: 0.75 }} data-document-file="">
            <b>{seen(file.name)}</b> · {t('app.doc.fileSize', { size: file.size.toLocaleString(tr.locale) })}
            <Box component="span" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              SHA-256 {file.sha256}
            </Box>
          </Box>
        ))}
      </Fact>
      {f.about.length > 0 && !linked && (
        <Fact label={t('app.doc.k.about')}>{f.about.map((a) => seen(a.name)).join(' · ')}</Fact>
      )}
      {f.about.length > 0 && linked && (
        <Box data-document-about="">
          <Typography variant="overline" sx={{ display: 'block' }}>
            {t('app.doc.k.about')}
          </Typography>
          {f.about.map((a, i) => {
            const target = targets[i];
            const name = seen(a.name) || a.recordId || '';
            return (
              <Typography key={`${a.recordId ?? ''}:${i}`} variant="body2" sx={{ py: 0.5 }}>
                {target ? (
                  <Link component={RouterLink} to={target.to} data-about-link={target.kind} data-about-id={a.recordId}>
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </Typography>
            );
          })}
          {/* What a link is worth, said where the links are (docs/document-chain.md). */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }} data-about-note="">
            {t('app.doc.chain.aboutNote')}
            {checker && targets.some((x) => x?.kind === 'document' || x?.kind === 'record')
              ? ` ${t('app.doc.chain.carried')}`
              : ''}
            {checker && targets.some((x) => x?.kind === 'id-only') ? ` ${t('app.doc.chain.idOnly')}` : ''}
          </Typography>
        </Box>
      )}
      <Fact label={t('app.doc.k.holder')}>{seen(f.holder)}</Fact>
      {f.notes && (
        <Fact label={t('app.doc.k.notes')}>
          <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
            {seenNotes(f.notes)}
          </Box>
        </Fact>
      )}
    </Stack>
  );
};

/**
 * The record's date on Midnight, read by its proof code: the same answer every record page
 * gives. For a checker, anything short of a checked date comes with "don't rely on it".
 */
export const DocumentDate: React.FC<{ fingerprint: string; checker?: boolean }> = ({ fingerprint, checker }) => {
  const tr = useT();
  const { proof, anchor } = useRecordDate(fingerprint);
  const row = recordDateRow(proof, anchor, tr);
  return (
    <Box data-document-date={row.mark}>
      <Fact label={tr.t('app.doc.k.dated')}>{row.value}</Fact>
      {row.sub && (
        <Typography variant="caption" color="text.secondary">
          {row.sub}
        </Typography>
      )}
      {checker && row.mark !== 'done' && proof !== 'checking' && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-document-not-dated="">
          {tr.t('app.doc.check.notDated')}
        </Alert>
      )}
    </Box>
  );
};

type Compared =
  | { kind: 'reading' }
  | { kind: 'match'; name: string; sealed: string }
  | { kind: 'no-match'; name: string }
  | { kind: 'too-large' };

/** "Is this the same file?": the picked file is hashed here and never leaves the device. */
export const FileCompare: React.FC<{ files: readonly DocumentFile[]; title?: string; text?: string }> = ({
  files,
  title,
  text,
}) => {
  const { t } = useT();
  const inputId = useId();
  const [result, setResult] = useState<Compared>();
  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setResult({ kind: 'reading' });
    try {
      const f = await fingerprintFile(file);
      const m = matchFile(files, f.sha256);
      setResult(m ? { kind: 'match', name: f.name, sealed: m.name } : { kind: 'no-match', name: f.name });
    } catch {
      setResult({ kind: 'too-large' });
    }
  };
  return (
    <Box data-file-compare="">
      {title && (
        <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {text}
        </Typography>
      )}
      <Button variant="outlined" component="label" htmlFor={inputId} sx={{ minHeight: 44 }}>
        {t('app.doc.compare.pick')}
        <input
          id={inputId}
          type="file"
          hidden
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </Button>
      {result?.kind === 'match' && (
        <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }} data-compare="match">
          {/* File names go in as values, never as markup: a name can't add emphasis or tags. */}
          {rich(
            t('app.doc.compare.match'),
            { b: (c) => <b>{c}</b> },
            { name: seen(result.name), sealed: seen(result.sealed) },
          )}
        </Alert>
      )}
      {result?.kind === 'no-match' && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }} data-compare="no-match">
          {rich(t('app.doc.compare.noMatch'), { b: (c) => <b>{c}</b> }, { name: seen(result.name) })}
        </Alert>
      )}
      {result?.kind === 'too-large' && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }}>
          {t('app.doc.compare.tooLarge', { mb: String(MB) })}
        </Alert>
      )}
    </Box>
  );
};
