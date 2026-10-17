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
  disclosureFrom,
  keepSealedGrant,
  keysOn,
  loadGrant,
  saveGrant,
  sealedGrantOf,
  shareScreenStart,
  sharedNowWords,
  type Disclosure,
  type DisclosureKey,
} from '../../veilcore/disclosure';
import { canonicalUrl } from '../../config/network';
import { nameParam, verifyPath } from '../../veilcore/verify-link';
import { dnaLinkParams } from '../../veilcore/dna-link';
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
  // The switches start from the holder's own choice, kept in the record's sealed copy
  // (round 3, P3): they used to start from the registry's answer, so one press of the button
  // published whatever the registry had switched on. A record with no choice yet starts from
  // the defaults, which are not saved until the holder presses the button.
  const sealedChoice = record ? sealedGrantOf(record) : null;
  const [disclosure, setDisclosure] = useState<Disclosure>(() => shareScreenStart(record));
  // What the registry holds now: said beside the switches, and when it differs from the
  // holder's choice, both are shown and the holder chooses.
  const [stored, setStored] = useState<{ show: string[]; updatedAt: string | null } | 'loading' | 'unknown'>('loading');
  const [keeping, setKeeping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ absolute: string; relative: string }>();
  const [copied, setCopied] = useState(false);
  // Whether the link carries the record's name after the # (round 5): on unless the holder
  // turns it off. Only the people the link is sent to see it; VeilCore never receives it.
  const [includeName, setIncludeName] = useState(true);
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
        // What strangers see now is the registry's copy; the switches stay the holder's own.
        setStored({ show: g.serverShow ?? g.show, updatedAt: g.updatedAt });
      } else {
        setStored('unknown');
      }
    });
    return () => {
      live = false;
    };
  }, [recordId]);

  if (!record) return <Typography>{t('app.prove.share.notFound')}</Typography>;

  // Round 5 of sealing (CONTRACT.md #28, #29): the link carries, after the # (never sent to
  // any server), the record's name, unless the holder leaves it out, and with "Whether a DNA
  // report is saved" shared, the record's pairing salt (`ds`), so whoever
  // gets the link and the report file can check the file is the one saved. It used to carry
  // the file's plain SHA-256 (`rs`).
  const reportParam: Record<string, string> = {
    ...(includeName ? nameParam(record.strainName) : {}),
    ...(disclosure['attestation-status'] ? dnaLinkParams(record) : {}),
  };

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
      setResult({ absolute: '', relative: '' });
    } finally {
      setBusy(false);
    }
  };

  const link = (() => {
    if (!result || !record) return undefined;
    const relative = verifyPath(
      record.id,
      record.recordFingerprint,
      canAskProof && askable && proveParams ? { ...proveParams, ...reportParam } : reportParam,
    );
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

  // The registry shows something else than the holder's own choice (another tab, an older
  // version of the site, or the server itself): both are said, and the holder chooses.
  const serverShows =
    stored !== 'loading' && stored !== 'unknown' && stored.updatedAt !== null ? stored.show : undefined;
  const differs =
    serverShows !== undefined &&
    (sealedChoice !== null || serverShows.length > 0) &&
    serverShows.join(',') !== (sealedChoice ?? []).join(',');
  const listOf = (keys: readonly string[]) =>
    keys.length
      ? keys.map((k) => labelOf(k as DisclosureKey, tr)).join(t('app.prove.share.semicolon'))
      : t('app.prove.share.onlyBasics');
  const keepMine = async () => {
    setKeeping(true);
    setError(null);
    const ok = await keepSealedGrant(record);
    setKeeping(false);
    if (!ok) return setError(t('app.prove.share.notSaved', { error: t('app.prove.share.differs.failed') }));
    setStored({ show: sealedChoice ?? [], updatedAt: new Date().toISOString() });
  };
  const useServers = () => {
    setDisclosure(disclosureFrom(serverShows ?? []));
    setResult(undefined);
  };

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
              <React.Fragment key={f.key}>
                <FormControlLabel
                  control={<Switch checked={disclosure[f.key]} onChange={() => toggle(f.key)} />}
                  label={<Typography variant="body2">{labelOf(f.key, tr)}</Typography>}
                  sx={{ minHeight: 44, mr: 0 }}
                />
                {/* The name is sealed (round 5): shown to strangers only on purpose, and said so. */}
                {f.key === 'name' && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: -0.5, mb: 0.5 }}
                    data-name-warning=""
                  >
                    {t('app.prove.share.nameWarning')}
                  </Typography>
                )}
              </React.Fragment>
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

      {differs && (
        <Alert severity="warning" variant="outlined" data-grant-differs="">
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('app.prove.share.differs.text', { server: listOf(serverShows ?? []), mine: listOf(sealedChoice ?? []) })}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" disabled={keeping} onClick={() => void keepMine()} sx={{ minHeight: 44 }}>
              {t('app.prove.share.differs.keepMine')}
            </Button>
            <Button variant="text" disabled={keeping} onClick={useServers} sx={{ minHeight: 44 }}>
              {t('app.prove.share.differs.useServers')}
            </Button>
          </Stack>
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
          <FormControlLabel
            control={
              <Switch
                checked={includeName}
                onChange={() => setIncludeName((v) => !v)}
                slotProps={{ input: { 'aria-describedby': 'name-in-link-help' } }}
              />
            }
            label={<Typography variant="body2">{t('app.prove.share.nameInLink')}</Typography>}
            sx={{ minHeight: 44, mr: 0 }}
            data-name-in-link={includeName ? 'yes' : 'no'}
          />
          <Typography id="name-in-link-help" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('app.prove.share.nameInLinkHelp')}
          </Typography>
          <TextField
            value={link?.absolute ?? ''}
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
              to={link?.relative ?? ''}
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
