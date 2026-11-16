// The page a document check link opens (/check-document#d=…; docs/document-profile.md, and
// veilcore/document-link.ts for why the link carries the sealed fields). Nothing in the link is
// believed: the proof code is recomputed here from the fields, the date is looked up for that
// proof code (its inclusion proof, then the anchor on Midnight), and the file the checker picks
// is hashed here and compared byte for byte. Nothing after the # and no file is ever sent.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { aboutTarget, readDocumentLink, type ReadLink } from '../../veilcore/document-link';
import { verifyPath } from '../../veilcore/verify-link';
import { DOCUMENT_CHAIN_ENABLED } from '../../config/network';
import { useT } from '../../i18n/app';
import { DocumentDate, DocumentFacts, Fact, FileCompare, seen } from './DocumentParts';

export const DocumentCheck: React.FC = () => {
  const { t } = useT();
  const { hash } = useLocation();
  const [read, setRead] = useState<ReadLink>();
  useEffect(() => {
    let live = true;
    // A new link starts blank: the last link's document must never show under this one's.
    setRead(undefined);
    void readDocumentLink(hash).then((r) => live && setRead(r));
    return () => {
      live = false;
    };
  }, [hash]);

  return (
    <Box sx={{ bgcolor: 'background.default' }} data-document-check="">
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
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
          // Keyed by the record: following a link to another record starts its page blank, so
          // one record's "same file" answer never shows under another.
          <Stack spacing={2.5} key={read.fingerprint}>
            {/* Opened from another record's page (docs/document-chain.md): said, with what it rests on. */}
            {DOCUMENT_CHAIN_ENABLED && read.namedAs && (
              <Alert severity="info" variant="outlined" data-document-named-as={read.namedAs}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t('app.doc.chain.namedAs', { id: read.namedAs })}
                </Typography>
                <Link component={RouterLink} to={verifyPath(read.namedAs, read.fingerprint)} data-ask-registry="">
                  {t('app.doc.chain.askRegistry', { id: read.namedAs })}
                </Link>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('app.doc.chain.askRegistrySends')}
                </Typography>
              </Alert>
            )}
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
                {seen(read.fields.title)}
              </Typography>
              <DocumentFacts
                fields={read.fields}
                checker
                aboutTarget={DOCUMENT_CHAIN_ENABLED ? (id) => aboutTarget(id, read.chain) : undefined}
              />
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
