// The page a document check link opens (/check-document#d=…; docs/document-profile.md, and
// veilcore/document-link.ts for why the link carries the sealed fields). Nothing in the link is
// believed: the proof code is recomputed here from the fields, the date is looked up for that
// proof code (its inclusion proof, then the anchor on Midnight), and the file the checker picks
// is hashed here and compared byte for byte. Nothing after the # and no file is ever sent.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { readDocumentLink, type ReadLink } from '../../veilcore/document-link';
import { Wordmark } from '../Wordmark';
import { LanguageBar } from '../../i18n/LanguagePicker';
import { useT } from '../../i18n/app';
import { DocumentDate, DocumentFacts, Fact, FileCompare } from './DocumentParts';

export const DocumentCheck: React.FC = () => {
  const { t } = useT();
  const { hash } = useLocation();
  const [read, setRead] = useState<ReadLink>();
  useEffect(() => {
    let live = true;
    void readDocumentLink(hash).then((r) => live && setRead(r));
    return () => {
      live = false;
    };
  }, [hash]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} data-document-check="">
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        <LanguageBar />
        <Stack
          component={RouterLink}
          to="/"
          direction="row"
          sx={{
            justifyContent: 'center',
            mb: 2,
            mx: 'auto',
            width: 'fit-content',
            minHeight: 44,
            color: 'text.primary',
          }}
        >
          <Wordmark />
        </Stack>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.doc.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.doc.check.intro')}
        </Typography>
        {!read && <CircularProgress size={24} />}
        {read && !read.ok && (
          <Alert severity="error" variant="outlined" data-document-link={read.why}>
            {t(
              read.why === 'missing'
                ? 'app.doc.check.missing'
                : read.why === 'unreadable'
                  ? 'app.doc.check.unreadable'
                  : 'app.doc.check.notDoc',
            )}
          </Alert>
        )}
        {read?.ok && (
          <Stack spacing={2.5}>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={1.5}>
                <FileCompare files={read.fields.files} />
                <DocumentDate fingerprint={read.fingerprint} checker />
                <Fact label={t('app.doc.check.recomputed')} mono>
                  {read.fingerprint}
                </Fact>
              </Stack>
            </Paper>
            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                {t('app.doc.check.inLink')}
              </Typography>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                {read.fields.title}
              </Typography>
              <DocumentFacts fields={read.fields} checker />
            </Paper>
            <Typography variant="body2" color="text.secondary">
              {t('app.doc.check.what')}
            </Typography>
          </Stack>
        )}
      </Container>
    </Box>
  );
};
