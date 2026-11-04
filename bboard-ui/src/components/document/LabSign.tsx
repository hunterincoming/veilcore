// /lab: a laboratory signs the numbers it measured (veilcore/lab-attest.ts;
// docs/lab-attested-similarity.md). Make or open the laboratory's key, open the holder's
// request, read every number and field against the laboratory's own report, sign, save the
// signature file. Nothing is sent anywhere: the key is held in this tab's memory only, and the
// request and signature are files the two people exchange themselves.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { LabKeyFile, LabRequest } from '../../veilcore/lab-attest';
import { SCHEMAS, shownNumber } from '../../veilcore/field-set';
import { keyShort } from '../../veilcore/lab-key-text';
import { Wordmark } from '../Wordmark';
import { LanguageBar } from '../../i18n/LanguagePicker';
import { useT } from '../../i18n/app';
import { Fact, seen, typeWords } from './DocumentParts';
import { schemaWords, slotWords } from './NumbersFields';

type Key = LabKeyFile & { readonly secretN: bigint };

const safeName = (s: string, what: string): string =>
  `${
    (s || 'laboratory')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'laboratory'
  }-${what}.json`;

/** What the laboratory reads before signing: every sealed field, then every number. */
const RequestView: React.FC<{ req: LabRequest }> = ({ req }) => {
  const tr = useT();
  const { t } = tr;
  const r = req.record;
  const schema = SCHEMAS[r.fieldSet.schema];
  // What someone else typed, with no invisible or direction characters, line by line: the
  // laboratory must read exactly what it signs (DocumentParts seen).
  const line = (label: string, v: string | undefined) =>
    v ? (
      <Fact label={label}>
        <span style={{ whiteSpace: 'pre-wrap' }}>{v.split('\n').map(seen).join('\n')}</span>
      </Fact>
    ) : null;
  return (
    <Stack spacing={1.25} data-lab-request-view="">
      {line(t('app.labsign.req.k.title'), r.strainName)}
      {line(t('app.labsign.req.k.type'), r.document?.type ? typeWords(r.document.type, tr) : undefined)}
      {line(t('app.labsign.req.k.issuer'), r.document?.issuer)}
      {line(t('app.labsign.req.k.reference'), r.refId)}
      {line(t('app.labsign.req.k.holder'), r.bredBy)}
      {line(t('app.labsign.req.k.issued'), r.dateCreated)}
      {line(t('app.labsign.req.k.notes'), r.notes)}
      {line(t('app.labsign.req.k.about'), (r.document?.about ?? []).map((a) => a.name).join('\n'))}
      {(r.document?.files ?? []).length > 0 &&
        line(t('app.labsign.req.k.files'), (r.document?.files ?? []).map((f) => `${f.name}  ${f.sha256}`).join('\n'))}
      {line(t('app.labsign.req.k.form'), schemaWords(r.fieldSet.schema, tr))}
      <Box component="dl" sx={{ m: 0 }}>
        {(schema?.slots ?? [])
          .filter((s) => s.type === 'uint' && r.fieldSet.values[s.slot] != null)
          .map((s) => (
            <Typography key={s.slot} variant="body1" data-lab-number={s.slot}>
              {slotWords(s.path, tr)}: <b>{shownNumber(r.fieldSet.values[s.slot] as string, s.scale ?? 1)}</b>{' '}
              {s.unit ?? ''}
            </Typography>
          ))}
      </Box>
    </Stack>
  );
};

export const LabSign: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const keyPick = useRef<HTMLInputElement>(null);
  const reqPick = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [key, setKey] = useState<Key>();
  const [made, setMade] = useState(false);
  const [copied, setCopied] = useState(false);
  const [req, setReq] = useState<LabRequest>();
  const [checked, setChecked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string>();

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  const makeKey = async () => {
    setError(undefined);
    try {
      const { newLabKeyFile, readLabKeyFile, saveFile } = await import('../../veilcore/lab-attest');
      const file = newLabKeyFile(name);
      const text = JSON.stringify(file, null, 2);
      saveFile(safeName(file.name, 'veilcore-lab-key'), text);
      setKey(readLabKeyFile(text));
      setMade(true);
    } catch (e) {
      fail(e);
    }
  };

  const openKey = async (f: File | undefined) => {
    if (!f) return;
    setError(undefined);
    try {
      const { readLabKeyFile } = await import('../../veilcore/lab-attest');
      setKey(readLabKeyFile(await f.text()));
      setMade(false);
    } catch (e) {
      fail(e);
    } finally {
      if (keyPick.current) keyPick.current.value = '';
    }
  };

  const openRequest = async (f: File | undefined) => {
    if (!f) return;
    setError(undefined);
    setReq(undefined);
    setChecked(false);
    setSigned(false);
    try {
      const { readLabRequest } = await import('../../veilcore/lab-attest');
      setReq(await readLabRequest(await f.text()));
    } catch (e) {
      fail(e);
    } finally {
      if (reqPick.current) reqPick.current.value = '';
    }
  };

  const sign = async () => {
    if (!key || !req || !checked) return;
    setError(undefined);
    try {
      const { signLabRequest, saveFile } = await import('../../veilcore/lab-attest');
      const sig = signLabRequest(key, req);
      saveFile(safeName(req.record.strainName, 'lab-signature'), JSON.stringify(sig, null, 2));
      setSigned(true);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} data-lab-sign="">
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
          {t('app.labsign.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {t('app.labsign.intro')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.labsign.private')}
        </Typography>
        <input
          ref={keyPick}
          type="file"
          accept="application/json,.json"
          hidden
          data-lab-key-file=""
          onChange={(e) => void openKey(e.target.files?.[0])}
        />
        <input
          ref={reqPick}
          type="file"
          accept="application/json,.json"
          hidden
          data-lab-request-file=""
          onChange={(e) => void openRequest(e.target.files?.[0])}
        />
        <Stack spacing={2.5}>
          <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-lab-key="">
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t('app.labsign.key.title')}
            </Typography>
            {!key ? (
              <Stack spacing={1.5}>
                <Typography variant="body2">{t('app.labsign.key.none')}</Typography>
                <Button variant="contained" onClick={() => keyPick.current?.click()} sx={{ minHeight: 44 }}>
                  {t('app.labsign.key.open')}
                </Button>
                <TextField
                  label={t('app.labsign.key.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                <Box>
                  <Button variant="outlined" onClick={() => void makeKey()} sx={{ minHeight: 44 }} data-lab-make-key="">
                    {t('app.labsign.key.make')}
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {made && (
                  <Alert severity="warning" variant="outlined" data-lab-key-made="">
                    {t('app.labsign.key.made')}
                  </Alert>
                )}
                {key.name && <Typography variant="body2">{t('app.labsign.key.using', { name: key.name })}</Typography>}
                <Fact label={t('app.labsign.key.public')} mono>
                  <span data-lab-public-key="">{key.key}</span>
                </Fact>
                <Typography variant="body2" color="text.secondary">
                  {keyShort(key.key)}
                </Typography>
                <Typography variant="body2">{t('app.labsign.key.publish')}</Typography>
                <Box>
                  <Button
                    size="small"
                    onClick={() => {
                      void navigator.clipboard.writeText(key.key).then(() => setCopied(true));
                    }}
                  >
                    {t('app.labsign.key.copy')}
                  </Button>
                  {copied && (
                    <Typography component="span" variant="body2" role="status" sx={{ ml: 1 }}>
                      {t('app.labsign.key.copied')}
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-lab-request-panel="">
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t('app.labsign.req.title')}
            </Typography>
            {!key ? (
              <Typography variant="body2" color="text.secondary">
                {t('app.labsign.req.needKey')}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                <Box>
                  <Button
                    variant={req ? 'text' : 'contained'}
                    onClick={() => reqPick.current?.click()}
                    sx={{ minHeight: 44 }}
                  >
                    {t('app.labsign.req.open')}
                  </Button>
                </Box>
                {req && (
                  <>
                    <Alert severity="info" variant="outlined">
                      {t('app.labsign.req.what')}
                    </Alert>
                    <RequestView req={req} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={(e) => setChecked(e.target.checked)}
                          slotProps={{ input: { 'data-lab-confirm': '' } as object }}
                        />
                      }
                      label={t('app.labsign.req.confirm')}
                    />
                    <Box>
                      <Button
                        variant="contained"
                        disabled={!checked}
                        onClick={() => void sign()}
                        sx={{ minHeight: 44 }}
                        data-lab-sign-button=""
                      >
                        {t('app.labsign.req.sign')}
                      </Button>
                    </Box>
                    {signed && (
                      <Alert severity="success" variant="outlined" data-lab-signed-done="">
                        {t('app.labsign.req.done')}
                      </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {t('app.labsign.req.keep')}
                    </Typography>
                  </>
                )}
              </Stack>
            )}
          </Paper>
          {error && (
            <Alert severity="error" variant="outlined" data-lab-error="">
              {error}
            </Alert>
          )}
        </Stack>
      </Container>
    </Box>
  );
};
