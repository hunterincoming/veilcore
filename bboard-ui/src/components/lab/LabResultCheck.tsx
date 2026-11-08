// The page that checks a lab result file (/check-lab-result; veilcore/lab-result.ts). Everything is
// checked in this browser: the statement's form, its binding into the record the lab signed, the
// call in the field set, and the signature the claims contract would accept. Nothing is sent
// unless the checker asks: "Find the lab's name" sends the result's code (in the file) to the
// registry for the lab's own binding naming its key (claims-key.ts findBinding), printed in the
// wording every page uses for signers; "Find the record…" reads the checker's own records, which
// sends their holder key. Test network only, like lab signing.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Wordmark } from '../Wordmark';
import { LanguageBar } from '../../i18n/LanguagePicker';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import {
  openingMatches,
  readMarkOpening,
  readResultsText,
  replacedBy,
  resultCode,
  type LabResultBundle,
  type MarkResult,
  type ProblemCode,
} from '../../veilcore/lab-result';
import type { LabSigner } from '../../veilcore/claim-link';
import { signerLabel, type ResolvedAttestation } from '../../veilcore/attesters';
import { createRecord, useRecords, useRecordsLoaded } from '../../veilcore/records';
import { keyShort } from '../../veilcore/lab-key-text';
import { ResultFacts } from './ResultFacts';
import { withdrawnWords } from './signer-words';
import { LAB_SIGNING_ENABLED } from '../../config/network';

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

type Read = { ok: true; bundle: LabResultBundle } | { ok: false; code: ProblemCode; message: string };

/** Whose key signed it, from the lab's own binding at the registry, checked here. */
/**
 * Whose key signed it, from the lab's own binding at the registry, checked here. Looked up only
 * when the checker asks: the lookup sends the result's code to the registry.
 */
const useSigner = (b: LabResultBundle, asked: boolean): LabSigner | undefined => {
  const [s, setS] = useState<LabSigner>();
  useEffect(() => {
    let live = true;
    setS(undefined);
    if (!asked) return;
    void (async () => {
      try {
        const [{ attestationsFor }, { findBinding }, { keyFromHex }] = await Promise.all([
          import('../../veilcore/attesters'),
          import('../../veilcore/claims-key'),
          import('../../veilcore/lab-attest'),
        ]);
        const key = keyFromHex(b.signature.key);
        const list = await attestationsFor(b.signature.record, { claimsKeyBindings: true });
        if (live) setS(key ? findBinding(list, b.signature.record, key, b.statement.subject, []) : { kind: 'none' });
      } catch {
        if (live) setS({ kind: 'none' });
      }
    })();
    return () => {
      live = false;
    };
  }, [b, asked]);
  return s;
};

const Dispute: React.FC<{ seal: string }> = ({ seal }) => {
  const { t } = useT();
  const pick = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState<'yes' | 'no' | 'bad'>();
  const [n, setN] = useState(0);
  return (
    <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 1.5 }} data-mark-dispute="">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('app.lr.check.disputeTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('app.lr.check.disputeText')}
      </Typography>
      <Button size="small" variant="outlined" onClick={() => pick.current?.click()} sx={{ minHeight: 40 }}>
        {t('app.lr.check.disputeChoose')}
      </Button>
      <input
        ref={pick}
        type="file"
        hidden
        data-opening-input=""
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          void f.text().then((text) => {
            const o = readMarkOpening(text);
            if (!o) return setAnswer('bad');
            setN(o.sequence.length);
            setAnswer(openingMatches(o, seal) ? 'yes' : 'no');
          });
        }}
      />
      {answer && (
        <Alert
          severity={answer === 'yes' ? 'success' : 'error'}
          variant="outlined"
          sx={{ mt: 1 }}
          data-mark-answer={answer}
        >
          {answer === 'yes'
            ? t('app.lr.check.disputeYes', { n: String(n) })
            : answer === 'no'
              ? t('app.lr.check.disputeNo')
              : t('app.lr.check.disputeBad')}
        </Alert>
      )}
    </Box>
  );
};

const OneChecked: React.FC<{
  bundle: LabResultBundle;
  replaced?: { by: string; reason: string };
  inFile: Set<string>;
}> = ({ bundle: b, replaced, inFile }) => {
  const tr = useT();
  const { t } = tr;
  const [lookUp, setLookUp] = useState(false);
  const signer = useSigner(b, lookUp);
  const all = useRecords();
  const code = resultCode(b);
  const loaded = useRecordsLoaded();
  const [asked, setAsked] = useState(false);
  const have = all.find((r) => r.labSignature?.record === code);
  const mineSubject = all.find((r) => r.recordFingerprint === b.statement.subject && !r.labResult);
  const [busy, setBusy] = useState(false);
  // This page doesn't read the person's records by itself: that sends the holder key, which
  // here would tie the holder to the result being checked. It does when they ask to add it.
  const find = async () => {
    setAsked(true);
    const { startRecordSync } = await import('../../veilcore/records');
    startRecordSync();
  };
  const who = !lookUp
    ? ''
    : signer === undefined
      ? t('app.lr.check.looking')
      : signer.kind === 'bound'
        ? signerLabel(signer.attestation as ResolvedAttestation, 'Signed by', Date.now(), tr).text
        : signer.kind === 'retracted'
          ? withdrawnWords(signer, true, tr)
          : signer.kind === 'conflict'
            ? t('app.claim.check.labConflict')
            : t('app.claim.check.labUnidentified');
  const rep = b.statement.replaces;
  const add = async () => {
    setBusy(true);
    try {
      const { recordInputFor } = await import('../../veilcore/lab-result-sign');
      createRecord(await recordInputFor(b));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Paper
      sx={{ p: { xs: 2, md: 3 } }}
      data-lab-result-checked=""
      data-signer={signer?.kind ?? (lookUp ? 'checking' : 'not-asked')}
    >
      <Alert
        severity={signer?.kind === 'bound' ? 'success' : signer?.kind === 'retracted' ? 'warning' : 'info'}
        variant="outlined"
        sx={{ mb: 2 }}
        data-lab-name={signer?.kind ?? (lookUp ? 'looking' : 'not-asked')}
      >
        {who ? `${who} ` : ''}
        {t('app.attest.signedBy', { key: keyShort(b.signature.key) })}
        {!lookUp && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('app.lr.check.nameText')}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setLookUp(true)}
              sx={{ minHeight: 40 }}
              data-lab-name-find=""
            >
              {t('app.lr.check.nameFind')}
            </Button>
          </Box>
        )}
      </Alert>
      {replaced && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }} data-replaced-by="">
          {t('app.lr.check.replacedBy', {
            code: short(replaced.by),
            reason: t(`app.lr.reason.${replaced.reason}` as AppKey),
          })}
        </Alert>
      )}
      {rep && !inFile.has(rep.result) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('app.lr.check.namesOther', { code: short(rep.result) })}
        </Typography>
      )}
      <ResultFacts statement={b.statement} code={code} />
      {b.statement.kind === 'dna-mark' && (
        <Box sx={{ mt: 2 }}>
          <Dispute seal={(b.statement.result as MarkResult).seal} />
        </Box>
      )}
      {have ? (
        <Box sx={{ mt: 2 }}>
          {have.labResult?.bindingId && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {t('app.lr.check.yours')}
            </Typography>
          )}
          <Button component={RouterLink} to={`/record/${have.id}`} sx={{ minHeight: 44 }}>
            {t('app.lr.check.open')}
          </Button>
        </Box>
      ) : mineSubject ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.check.addText')}
          </Typography>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void add()}
            sx={{ mt: 1, minHeight: 44 }}
            data-lab-result-add=""
          >
            {t('app.lr.check.add')}
          </Button>
        </Box>
      ) : !loaded ? (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            disabled={asked}
            onClick={() => void find()}
            sx={{ minHeight: 44 }}
            data-lab-result-find=""
          >
            {asked ? t('app.lr.check.finding') : t('app.lr.check.find')}
          </Button>
        </Box>
      ) : (
        asked && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} data-lab-result-not-yours="">
            {t('app.lr.check.notYours')}
          </Typography>
        )
      )}
    </Paper>
  );
};

export const LabResultCheck: React.FC = () => {
  const { t } = useT();
  const pick = useRef<HTMLInputElement>(null);
  const [read, setRead] = useState<readonly Read[]>();
  const ok = (read ?? []).filter((r): r is Extract<Read, { ok: true }> => r.ok).map((r) => r.bundle);
  const replaced = replacedBy(ok);
  const inFile = new Set(ok.map(resultCode));
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} data-lab-result-check="">
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
          {t('app.lr.check.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('app.lr.check.intro')}
        </Typography>
        {!LAB_SIGNING_ENABLED ? (
          <Alert severity="info" variant="outlined" data-lab-results-off="">
            {t('app.lr.tools.testOnly')}
          </Alert>
        ) : (
          <>
            <Button
              variant="contained"
              size="large"
              onClick={() => pick.current?.click()}
              sx={{ mb: 3, minHeight: 48 }}
            >
              {t('app.lr.check.choose')}
            </Button>
            <input
              ref={pick}
              type="file"
              hidden
              data-result-input=""
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                setRead(undefined);
                if (f) void f.text().then(readResultsText).then(setRead);
              }}
            />
            <Stack spacing={2.5}>
              {(read ?? []).map((r, i) =>
                r.ok ? (
                  <OneChecked
                    key={resultCode(r.bundle)}
                    bundle={r.bundle}
                    replaced={replaced.get(resultCode(r.bundle))}
                    inFile={inFile}
                  />
                ) : (
                  <Alert key={`bad${i}`} severity="error" variant="outlined" data-lab-result-bad={r.code}>
                    {t('app.lr.check.bad', { problem: t(`app.lr.problem.${r.code}` as AppKey) })}
                  </Alert>
                ),
              )}
            </Stack>
          </>
        )}
      </Container>
    </Box>
  );
};
