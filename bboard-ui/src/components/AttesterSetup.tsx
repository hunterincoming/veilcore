// Setting up as an attester.
//
// A lab confirming they received material is the single biggest step up in what a
// record is worth. This is how they get the key that makes their confirmation theirs
// rather than something we recorded on their behalf.
//
// The key is generated in this browser and never sent anywhere. Only the public half,
// the name, and any accreditation are published.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/VerifiedUserOutlined';
import CopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  createAttester,
  labFileFor,
  labTxtFor,
  lookAtLabDomain,
  publishAttester,
  loadAttester,
  type AttesterProfile,
} from '../veilcore/attester-keys';
import { prepareToReceive } from '../veilcore/receive';
import { labChanged } from '../veilcore/lab-results';
import { BackupStep } from './flow/BackupStep';
import { Link as RouterLink } from 'react-router-dom';
import { rich, useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

const ROLE_LABEL: Record<string, AppKey> = {
  laboratory: 'app.lab.key.role.laboratory',
  inspector: 'app.lab.key.role.inspector',
  registry: 'app.lab.key.role.registry',
  breeder: 'app.lab.key.role.breeder',
  other: 'app.lab.key.role.other',
};

/** A heading that opens and closes what is under it. */
const Fold: React.FC<{
  label: string;
  open: boolean;
  onToggle: () => void;
  data: string;
  children: React.ReactNode;
}> = ({ label, open, onToggle, data, children }) => {
  const id = `fold-${data}`;
  return (
    <Box data-fold={data}>
      <Button
        color="inherit"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{
          minHeight: 44,
          px: 0,
          textAlign: 'left',
          justifyContent: 'space-between',
          width: '100%',
          fontWeight: 700,
        }}
      >
        {label}
      </Button>
      <Collapse in={open} id={id}>
        <Box sx={{ pt: 1, pb: 0.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};

/** Opens the header's signing-key dialog from elsewhere on the page (a lab's first screen). */
export const OPEN_SIGNING_KEY_EVENT = 'veilcore:open-signing-key';

export const AttesterSetup: React.FC<{
  variant?: 'button' | 'text';
  /** Mounted for Home's lab panel only: no button of its own. */
  hideButton?: boolean;
}> = ({ variant = 'text', hideButton }) => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<AttesterProfile | null>(loadAttester());
  const [name, setName] = useState('');
  const [role, setRole] = useState<AttesterProfile['role']>('laboratory');
  const [scheme, setScheme] = useState('ISO/IEC 17025');
  const [accId, setAccId] = useState('');
  const [accreditor, setAccreditor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The backup, right after "Create my key" (persona review, 17 Oct): a lab's first code used
  // to stop at "Save a backup and check it first" with no way there.
  const [backingUp, setBackingUp] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const { t } = useT();
  // Folded until asked for (a lab tested it, 8 Nov): matching the name, other ways, the raw key.
  const [showMatch, setShowMatch] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard here (an insecure page, or refused): the key is on screen to copy by hand.
    }
  };
  // Publishing the key on the lab's own website (docs/lab-domain-keys.md).
  const [domain, setDomain] = useState('');
  const [looked, setLooked] = useState<{ severity: 'success' | 'warning'; text: string } | null>(null);
  const look = async (p: AttesterProfile) => {
    setLooked(null);
    setBusy(true);
    const out = await lookAtLabDomain(p, domain);
    setBusy(false);
    if ('error' in out)
      setLooked({ severity: 'warning', text: t('app.lab.key.domain.couldNot', { error: out.error }) });
    else if (out.listed)
      setLooked({ severity: 'success', text: t('app.lab.key.domain.found', { domain: domain.trim().toLowerCase() }) });
    else setLooked({ severity: 'warning', text: t('app.lab.key.domain.notFound', { why: out.why ?? '' }) });
  };
  const saveLabFile = (p: AttesterProfile) => {
    const url = URL.createObjectURL(new Blob([labFileFor(p)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veilcore-lab.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_SIGNING_KEY_EVENT, show);
    return () => window.removeEventListener(OPEN_SIGNING_KEY_EVENT, show);
  }, []);

  const setup = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const accreditation =
      accId.trim() && accreditor.trim()
        ? { scheme, identifier: accId.trim(), accreditor: accreditor.trim() }
        : undefined;
    let p: AttesterProfile;
    try {
      p = await createAttester(name.trim(), role, accreditation);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t('app.lab.key.couldNotCreate'));
      setProfile(loadAttester());
      return;
    }
    // Shown from here on whether or not publishing works, so a failure leaves the key
    // on screen with a way to publish it again, never a form that makes another.
    setProfile(p);
    labChanged();
    await publish(p);
  };

  const publish = async (p: AttesterProfile) => {
    setBusy(true);
    setError(null);
    const out = await publishAttester(p);
    setBusy(false);
    if (out.error) {
      setError(t('app.lab.key.notPublished', { error: out.error }));
      return;
    }
    setProfile(loadAttester() ?? { ...p, registeredAt: Date.now() });
    // Pages showing "Set up your lab's signature" read the key again (the plant page's next step).
    labChanged();
  };

  /** The one-file backup (it holds the lab's key), with this browser's records key made first. */
  const backup = async () => {
    setError(null);
    const ready = await prepareToReceive();
    // A browser that can't make the key now still saves the lab's key; the code asks again later.
    if ('words' in ready && ready.words !== 'app.sealed.recv.cantCheck') setError(t(ready.words));
    setBackingUp(true);
  };

  return (
    <>
      {!hideButton && (
        <Button
          variant={variant === 'button' ? 'outlined' : 'text'}
          startIcon={<BadgeIcon />}
          onClick={() => setOpen(true)}
        >
          {profile ? t('app.lab.key.yours') : t('app.lab.key.setUp')}
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{profile ? t('app.lab.key.yours') : t('app.lab.key.setUp')}</DialogTitle>
        <DialogContent>
          {profile && backingUp ? (
            <Box sx={{ pt: 1 }} data-lab-backup="">
              <BackupStep
                title={t('app.backup.title')}
                headingComponent="h2"
                finishLabel={t('app.backup.done')}
                onDone={() => {
                  setBackingUp(false);
                  setBackedUp(true);
                }}
              />
            </Box>
          ) : profile ? (
            // Once the key is made (a lab tested it, 8 Nov): what it can do now first, then the
            // backup, and the rest folded away. Showing the name as the lab's is optional and
            // never stands between a lab and receiving a sample or signing a result; the raw
            // key is shown only when asked for.
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity={profile.registeredAt ? 'success' : 'warning'} variant="outlined">
                {profile.displayName} ·{' '}
                {(profile.role && ROLE_LABEL[profile.role] && t(ROLE_LABEL[profile.role])) ??
                  profile.role ??
                  t('app.lab.key.role.other')}
                {profile.accreditation && ` · ${profile.accreditation.scheme} ${profile.accreditation.identifier}`}
                {profile.registeredAt ? '' : t('app.lab.key.notPublishedYet')}
              </Alert>
              {!profile.registeredAt && (
                <Button variant="contained" onClick={() => void publish(profile)} disabled={busy}>
                  {t('app.lab.key.publishAgain')}
                </Button>
              )}
              {error && (
                <Alert severity="warning" variant="outlined">
                  {error}
                </Alert>
              )}
              {profile.registeredAt && (
                <Typography variant="body1" data-lab-key-ready="">
                  {t('app.lab.key.ready')}
                </Typography>
              )}
              {backedUp ? (
                <Alert severity="success" variant="outlined" data-lab-backed-up="">
                  {t('app.lab.key.backedUp')}
                </Alert>
              ) : (
                <Stack spacing={1}>
                  <Typography variant="body2">{t('app.lab.key.backupNow')}</Typography>
                  <Button
                    variant="outlined"
                    onClick={() => void backup()}
                    sx={{ minHeight: 44, alignSelf: 'flex-start' }}
                  >
                    {t('app.lab.recv.saveBackup')}
                  </Button>
                </Stack>
              )}
              <Fold
                label={t('app.lab.key.optional.title')}
                open={showMatch}
                onToggle={() => setShowMatch(!showMatch)}
                data="lab-key-optional"
              >
                <Stack spacing={1.25} data-lab-key-optional-body="">
                  <Typography variant="body2" color="text.secondary">
                    {t('app.lab.key.optional.intro')}
                  </Typography>
                  <Box component="ol" sx={{ m: 0, pl: 3, '& > li': { mb: 1.5 } }}>
                    <li>
                      <Typography variant="body2">
                        {rich(t('app.lab.key.optional.step1'), {
                          mail: (c) => <Link href="mailto:hunter@veilcore.org">{c}</Link>,
                        })}
                      </Typography>
                    </li>
                    {profile.registeredAt && (
                      <li data-lab-domain-setup="">
                        <Stack spacing={1}>
                          <Typography variant="body2">{t('app.lab.key.optional.step2')}</Typography>
                          <Button
                            variant="outlined"
                            onClick={() => saveLabFile(profile)}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            {t('app.lab.key.domain.saveFile')}
                          </Button>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                              size="small"
                              label={t('app.lab.key.domain.field')}
                              placeholder="acme-labs.com"
                              value={domain}
                              onChange={(e) => setDomain(e.target.value)}
                              fullWidth
                            />
                            <Button
                              variant="outlined"
                              onClick={() => void look(profile)}
                              disabled={busy || !domain.trim()}
                            >
                              {t('app.lab.key.domain.look')}
                            </Button>
                          </Stack>
                          {looked && (
                            <Alert severity={looked.severity} variant="outlined" data-lab-domain-result="">
                              {looked.text}
                            </Alert>
                          )}
                        </Stack>
                      </li>
                    )}
                  </Box>
                  {profile.registeredAt && (
                    <Fold
                      label={t('app.lab.key.optional.otherWays')}
                      open={showOther}
                      onToggle={() => setShowOther(!showOther)}
                      data="lab-key-other-ways"
                    >
                      <Typography variant="body2" color="text.secondary">
                        {t('app.lab.key.domain.orTxt')}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', mt: 0.5 }}>
                        {labTxtFor(profile)}
                      </Typography>
                    </Fold>
                  )}
                </Stack>
              </Fold>
              <Box data-lab-public-key="">
                <Button
                  size="small"
                  color="inherit"
                  aria-expanded={showKey}
                  onClick={() => setShowKey(!showKey)}
                  endIcon={showKey ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ minHeight: 44, px: 0 }}
                >
                  {showKey ? t('app.lab.key.hideKey') : t('app.lab.key.showKey')}
                </Button>
                {showKey && (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.5 }}>
                      {t('app.lab.key.publicKey')}
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                      {profile.keypair.publicKey}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={() => void copyKey(profile.keypair.publicKey)}
                      sx={{ alignSelf: 'flex-start', minHeight: 40 }}
                    >
                      {copied ? t('app.lab.key.copied') : t('app.lab.key.copyKey')}
                    </Button>
                  </Stack>
                )}
              </Box>
              <Alert severity="warning" variant="outlined">
                {rich(t('app.lab.key.privateWarning'), {
                  link: (c) => (
                    <Link component={RouterLink} to="/docs/integrate">
                      {c}
                    </Link>
                  ),
                })}
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('app.lab.key.intro')}
              </Typography>
              <TextField
                label={t('app.lab.key.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                helperText={t('app.lab.key.nameHelp')}
              />
              <TextField
                select
                label={t('app.lab.key.role')}
                value={role}
                onChange={(e) => setRole(e.target.value as AttesterProfile['role'])}
                fullWidth
              >
                <MenuItem value="laboratory">{t('app.lab.key.role.laboratory')}</MenuItem>
                <MenuItem value="inspector">{t('app.lab.key.role.inspector')}</MenuItem>
                <MenuItem value="registry">{t('app.lab.key.role.registry')}</MenuItem>
                <MenuItem value="breeder">{t('app.lab.key.role.breeder')}</MenuItem>
                <MenuItem value="other">{t('app.lab.key.role.other')}</MenuItem>
              </TextField>

              <Typography variant="overline" sx={{ display: 'block' }}>
                {t('app.lab.key.accreditation')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                {t('app.lab.key.accreditationHelp')}
              </Typography>
              <TextField
                select
                label={t('app.lab.key.scheme')}
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                fullWidth
              >
                <MenuItem value="ISO/IEC 17025">ISO/IEC 17025</MenuItem>
                <MenuItem value="ISO 9001">ISO 9001</MenuItem>
                {/* The stored value stays "State licence", as profiles saved before the label changed hold it. */}
                <MenuItem value="State licence">{t('app.lab.key.stateLicense')}</MenuItem>
                <MenuItem value="Other">{t('app.lab.key.role.other')}</MenuItem>
              </TextField>
              <TextField
                label={t('app.lab.key.accNumber')}
                value={accId}
                onChange={(e) => setAccId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('app.lab.key.accreditor')}
                placeholder={t('app.lab.key.accreditorPlaceholder')}
                value={accreditor}
                onChange={(e) => setAccreditor(e.target.value)}
                fullWidth
              />

              {error && (
                <Alert severity="warning" variant="outlined">
                  {error}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {/* Once the key is made, the next real step is the page under the dialog (receive the
              sample, sign that it arrived): "Continue" is the one solid button. */}
          <Button
            variant={profile && !backingUp ? 'contained' : 'text'}
            onClick={() => {
              setOpen(false);
              setBackingUp(false);
            }}
            data-lab-key-continue={profile && !backingUp ? '' : undefined}
          >
            {profile && !backingUp ? t('app.lab.key.continue') : t('app.common.cancel')}
          </Button>
          {!profile && (
            <Button variant="contained" onClick={setup} disabled={busy || !name.trim()}>
              {t('app.lab.key.create')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
