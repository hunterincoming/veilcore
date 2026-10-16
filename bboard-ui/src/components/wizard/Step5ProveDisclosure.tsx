// Wizard step 5 — Choose what a stranger sees. The holder picks which facts about this
// record anyone holding its id is shown; the genetics are never disclosable. A live
// preview shows what the verify page will show.
//
// The choice is saved to the registry as the record's disclosure grant BEFORE any link
// is shown or copied (attack round D). It used to live only in the link's ?show=, which
// the recipient could edit to read parent names and breeding method, and the "Proof
// sealed locally" token on screen was a hash that went nowhere. The grant applies to the
// record, so to everyone with its id — this link, the certificate QR code, anything
// forwarded — and the copy says that rather than "a recipient-specific proof".
//
// One thing to press: "Get the link" saves the choice and shows the link. On a phone the
// link can go straight to the share sheet.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockIcon from '@mui/icons-material/LockOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import ShareIcon from '@mui/icons-material/IosShareOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import { getRecord, integrityOf } from '../../veilcore/records';
import {
  fieldsFor,
  geneticsLabel,
  labelOf,
  defaultDisclosure,
  disclosureFrom,
  keysOn,
  loadGrant,
  saveGrant,
  sharedNowWords,
  type Disclosure,
} from '../../veilcore/disclosure';
import { canonicalUrl } from '../../config/network';
import { verifyPath } from '../../veilcore/verify-link';
import { useRecordKeys } from '../../veilcore/record-keys';
import { proveLinkParams } from '../../veilcore/prove-link';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { DisclosedFacts } from '../verify/DisclosedFacts';
import { useSavedReport } from '../flow/LabResults';
import { savedReportSentence, type SavedReport } from '../../veilcore/saved-report';
import { useRecordT } from '../../i18n/app';
import { isAnimal, recordTitle } from '../../veilcore/animal-profile';

export const Step5ProveDisclosure: React.FC<{
  recordId: string;
  /** Kept for callers; this screen ends with "Back to the plant". */
  onDone?: () => void;
  onBack: () => void;
  /** Where the saved lab report stands, when the page already knows (else loaded here). */
  saved?: SavedReport | null;
  /** The way back's words: "Back to the plant", or "Back to the record" for a record that isn't a plant. */
  backLabel?: string;
}> = ({ recordId, onBack, saved: given, backLabel }) => {
  const record = getRecord(recordId);
  const tr = useRecordT(record);
  const { t } = tr;
  const loadedSaved = useSavedReport(given === undefined ? record : undefined);
  const saved = given === undefined ? loadedSaved : given;
  const [disclosure, setDisclosure] = useState<Disclosure>(defaultDisclosure());
  // What the registry holds now, so the switches start from the truth rather than from
  // defaults that may not be what strangers currently see.
  const [stored, setStored] = useState<{ show: string[]; updatedAt: string | null } | 'loading' | 'unknown'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ absolute: string; relative: string }>();
  const [copied, setCopied] = useState(false);
  // A date-stamped plant's link can carry its on-chain identity, so whoever gets it can
  // check the date stamp and ask the holder to prove it. Only the people sent the link
  // can then match the holder's proofs to this plant (record-keys.ts keeps it off the record).
  // A record that names its key (key-binding.ts) also carries the key's salt (ks) and the
  // hash of its sealed fields (cd), so the check page can match the key to the fingerprint.
  const keys = useRecordKeys()[recordId];
  const [proveParams, setProveParams] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    setProveParams(null);
    if (!record) return;
    void proveLinkParams(record, keys)
      .then((p) => live && setProveParams(p))
      .catch(() => live && setProveParams(null));
    return () => {
      live = false;
    };
  }, [record, keys]);
  const canAskProof = REAL_CHAIN && !!proveParams;
  const [askable, setAskable] = useState(true);
  // The button that made the link goes away; focus goes to the link it made.
  const linkInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (result) linkInput.current?.focus();
  }, [result]);

  useEffect(() => {
    let live = true;
    void loadGrant(recordId).then((g) => {
      if (!live) return;
      if (g && !('error' in g)) {
        setStored(g);
        // A record with no grant yet starts from the defaults, which are not saved
        // until the holder presses the button.
        if (g.updatedAt !== null) setDisclosure(disclosureFrom(g.show));
      } else {
        setStored('unknown');
      }
    });
    return () => {
      live = false;
    };
  }, [recordId]);

  if (!record) return <Typography>{t('app.prove.share.notFound')}</Typography>;

  // Round 5: with "Whether a lab report is saved" shared, the link names the saved file's
  // SHA-256 (`rs`), so the check page can match it to a lab's signature, which names the
  // same SHA-256. Nothing new is published: a lab's signature already shows it.
  const savedSha = saved && saved.kind !== 'none' ? saved.sha : undefined;
  const reportParam: Record<string, string> = disclosure['attestation-status'] && savedSha ? { rs: savedSha } : {};

  const toggle = (key: keyof Disclosure) => {
    setDisclosure((p) => ({ ...p, [key]: !p[key] }));
    setResult(undefined); // selection changed — not saved until the button is pressed
    setError(null);
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setResult(undefined);
    try {
      // The grant carries the values it publishes, read from this record here (the
      // registry can't read it), and the fingerprint they were read from.
      const out = await saveGrant(record, disclosure);
      if ('error' in out) {
        // No link without a stored grant: a link shown now would show strangers
        // whatever the registry held before, not what is on screen.
        setError(t('app.prove.share.notSaved', { error: out.error }));
        return;
      }
      setStored(out);
      // The link names the record's fingerprint, so the page checks against the record
      // this holder means rather than whatever fingerprint the registry answers with.
      const relative = verifyPath(record.id, record.recordFingerprint, reportParam);
      setResult({ absolute: canonicalUrl(relative), relative });
    } finally {
      setBusy(false);
    }
  };

  const link = (() => {
    if (!result || !record) return undefined;
    const relative =
      canAskProof && askable && proveParams
        ? verifyPath(record.id, record.recordFingerprint, { ...proveParams, ...reportParam })
        : result.relative;
    return { relative, absolute: canonicalUrl(relative) };
  })();

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.absolute);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: `${recordTitle(record)} · VeilCore`, url: link.absolute });
    } catch {
      /* closed the share sheet: nothing to say */
    }
  };

  const unsaved =
    stored === 'loading' || stored === 'unknown' || stored.updatedAt === null
      ? true
      : stored.show.join(',') !== keysOn(disclosure).join(',');

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <VerifiedIcon sx={{ color: 'success.main' }} aria-hidden="true" />
          <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
            {t('app.prove.share.title')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t('app.prove.share.intro')}
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ alignItems: 'stretch' }}>
        {/* the choices */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('app.prove.share.shownOn')}
          </Typography>
          <Stack sx={{ mt: 0.5 }}>
            {/* A plant's choices, or an animal's: its individual ID instead of a breeding method. */}
            {fieldsFor(isAnimal(record) ? 'animal' : 'plant').map((f) => (
              <FormControlLabel
                key={f.key}
                control={<Switch checked={disclosure[f.key]} onChange={() => toggle(f.key)} />}
                label={<Typography variant="body2">{labelOf(f.key, tr)}</Typography>}
                sx={{ minHeight: 44, mr: 0 }}
              />
            ))}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1, opacity: 0.7 }}>
              <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled">
                {geneticsLabel(tr)}
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {sharedNowWords(stored, unsaved, tr)}
          </Typography>
        </Box>

        {/* live preview */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {t('app.prove.share.strangerSees')}
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 0.5, background: 'rgba(30,34,39,0.02)' }}>
            <DisclosedFacts record={record} disclosure={disclosure} saved={saved} />
          </Paper>
        </Box>
      </Stack>

      {saved && (saved.kind === 'replaced' || saved.kind === 'withdrawn') && (
        <Alert severity="warning" variant="outlined" data-saved-report={saved.kind}>
          {savedReportSentence(saved, tr)}
          {t('app.common.sentenceSep')}
          {disclosure['attestation-status'] ? t('app.prove.share.reportOn') : t('app.prove.share.reportOff')}
        </Alert>
      )}

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      {result && !unsaved ? (
        <Alert
          severity="success"
          variant="outlined"
          icon={<VerifiedIcon />}
          role="region"
          aria-label={t('app.prove.share.yourLink')}
        >
          <Typography variant="subtitle2" component="p">
            {t('app.prove.share.savedOn')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
            {t('app.prove.share.savedText')}
            {t('app.common.sentenceSep')}
            {t('app.copy.claimsWhere')}
          </Typography>
          {canAskProof && (
            <FormControlLabel
              control={<Switch checked={askable} onChange={() => setAskable((v) => !v)} />}
              label={<Typography variant="body2">{t('app.prove.share.letThemAsk')}</Typography>}
              sx={{ mb: 1, minHeight: 44, mr: 0 }}
            />
          )}
          <TextField
            value={link?.absolute ?? result.absolute}
            fullWidth
            size="small"
            inputRef={linkInput}
            slotProps={{ input: { readOnly: true }, htmlInput: { 'aria-label': t('app.prove.share.theLink') } }}
            sx={{ mb: 1 }}
          />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            {canShare && (
              <Button variant="contained" startIcon={<ShareIcon />} onClick={() => void share()} sx={{ minHeight: 44 }}>
                {t('app.lab.send.share')}
              </Button>
            )}
            <Button
              variant={canShare ? 'outlined' : 'contained'}
              startIcon={<ContentCopyIcon />}
              onClick={copy}
              sx={{ minHeight: 44 }}
            >
              {copied ? t('app.lab.send.copied') : t('app.prove.watch.copyLink')}
            </Button>
            <Button
              variant="text"
              startIcon={<VisibilityIcon />}
              component={RouterLink}
              to={link?.relative ?? result.relative}
              target="_blank"
              sx={{ minHeight: 44 }}
            >
              {t('app.prove.share.openTheirs')}
            </Button>
          </Stack>
        </Alert>
      ) : (
        <Box>
          {/* Nothing is published from a record that doesn't match its fingerprint. */}
          {integrityOf(record.id) === 'mismatch' && (
            <Alert severity="error" variant="outlined" sx={{ mb: 1.5 }} data-integrity="mismatch">
              {t('app.sealed.mismatch')}
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={busy || integrityOf(record.id) === 'mismatch'}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClick={() => void onSave()}
          >
            {busy ? t('app.prove.share.saving') : t('app.prove.share.getLink')}
          </Button>
        </Box>
      )}

      <Divider />
      <Box>
        <Button variant="text" onClick={onBack} sx={{ minHeight: 44, px: 0 }}>
          {backLabel ?? t('app.plant.backToPlant')}
        </Button>
      </Box>
    </Stack>
  );
};
