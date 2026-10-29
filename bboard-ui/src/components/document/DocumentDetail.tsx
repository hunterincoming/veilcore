// A document record's own page (docs/document-profile.md): what was sealed, its date, the
// check link to send with the file, and "is this the same file?". No licensing, DNA report,
// lab codes or family tree: those are about genetics, and a document only points at them.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import type { StrainRecord } from '../../veilcore/records';
import {
  documentFieldsOf,
  type DocumentFile,
  type DocumentRecordLike,
  type DocumentType,
} from '../../veilcore/document-profile';
import { documentCheckLink } from '../../veilcore/document-link';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { AnchorOnChainPanel } from '../chain/AnchorOnChainPanel';
import { AppHeader } from '../AppHeader';
import { useT } from '../../i18n/app';
import { DocumentDate, DocumentFacts, Fact, FileCompare } from './DocumentParts';

export const DocumentDetail: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const tr = useT();
  const { t } = tr;
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState<string>();
  const d = record.document;
  const files: readonly DocumentFile[] = d?.files ?? [];

  const copyLink = async () => {
    setLinkError(undefined);
    try {
      const link = documentCheckLink(record as DocumentRecordLike, window.location.origin);
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
    about: { name: string }[];
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
          <Chip label={t('app.doc.kind')} size="small" sx={{ mb: 1 }} />
          <Typography variant="h4" component="h1" tabIndex={-1} sx={{ wordBreak: 'break-word' }}>
            {record.strainName}
          </Typography>
        </Box>
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={1.5}>
            <DocumentDate fingerprint={record.recordFingerprint} />
            <Fact label={t('app.doc.k.sealed')}>{tr.date(record.loggedAt)}</Fact>
            <Fact label={t('app.doc.k.proofCode')} mono>
              {record.recordFingerprint}
            </Fact>
          </Stack>
        </Paper>
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <DocumentFacts fields={f} />
        </Paper>
        <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-document-share="">
          <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
            {t('app.doc.share.title')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('app.doc.share.text')}
          </Typography>
          <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
            {t('app.doc.share.warn')}
          </Alert>
          <Button variant="contained" onClick={() => void copyLink()} sx={{ minHeight: 44 }}>
            {t('app.doc.share.copy')}
          </Button>
          {copied && (
            <Typography variant="body2" role="status" sx={{ mt: 1 }}>
              {t('app.doc.share.copied')}
            </Typography>
          )}
          {linkError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
              {linkError}
            </Alert>
          )}
        </Paper>
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <FileCompare files={files} title={t('app.doc.compare.title')} text={t('app.doc.compare.text')} />
        </Paper>
        {REAL_CHAIN && (
          <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
            <AnchorOnChainPanel recordId={record.id} />
          </Paper>
        )}
      </Stack>
    </Box>
  );
};
