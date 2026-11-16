// The page a document check link opens (/check-document#d=…; docs/document-profile.md, and
// veilcore/document-link.ts for why the link carries the sealed fields). Nothing in the link is
// believed: the proof code is recomputed here from the fields, the date is looked up for that
// proof code (its inclusion proof, then the anchor on Midnight), and the file the checker picks
// is hashed here and compared byte for byte. Nothing after the # and no file is ever sent.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Link, Paper, Stack, Typography } from '@mui/material';
import {
  aboutTarget,
  openedFrom,
  readDocumentLink,
  type AboutTarget,
  type ReadLink,
} from '../../veilcore/document-link';
import { verifyPath } from '../../veilcore/verify-link';
import { DOCUMENT_CHAIN_ENABLED } from '../../config/network';
import { useT } from '../../i18n/app';
import { DocumentDate, DocumentFacts, Fact, FileCompare, seen } from './DocumentParts';

export const DocumentCheck: React.FC = () => {
  const { t } = useT();
  const location = useLocation();
  const hash = location.hash;
  const state: unknown = location.state;
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

  // Opened from another record's page by the app's own navigation (never from the address, which
  // anyone can type): which record ID it was named by, and the rest of that link's chain.
  const opened = useMemo(() => (DOCUMENT_CHAIN_ENABLED ? openedFrom(state) : undefined), [state]);
  // Where each "About" entry's link goes, worked out once per link, not on every draw.
  const targets = useMemo(() => {
    const out = new Map<string, AboutTarget>();
    if (!read?.ok || !DOCUMENT_CHAIN_ENABLED) return out;
    const chain = read.chain.length ? read.chain : (opened?.chain ?? []);
    for (const a of read.fields.about)
      if (a.recordId && !out.has(a.recordId)) out.set(a.recordId, aboutTarget(a.recordId, chain, read.fingerprint));
    return out;
  }, [read, opened]);

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
                  : read.why === 'too-large'
                    ? 'app.doc.check.tooLarge'
                    : 'app.doc.check.notDoc',
            )}
          </Alert>
        )}
        {read?.ok && (
          // Keyed by the record: following a link to another record starts its page blank, so
          // one record's "same file" answer never shows under another.
          <Stack spacing={2.5} key={read.fingerprint}>
            {/* Opened from another record's page (docs/document-chain.md): said, with what it rests on. */}
            {opened && (
              <Alert severity="info" variant="outlined" data-document-named-as={opened.namedAs}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t('app.doc.chain.namedAs', { id: opened.namedAs })}
                </Typography>
                <Link component={RouterLink} to={verifyPath(opened.namedAs, read.fingerprint)} data-ask-registry="">
                  {t('app.doc.chain.askRegistry', { id: opened.namedAs })}
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
                aboutTarget={DOCUMENT_CHAIN_ENABLED ? (id) => targets.get(id) : undefined}
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
