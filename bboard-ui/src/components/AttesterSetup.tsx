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
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { createAttester, publishAttester, loadAttester, type AttesterProfile } from '../veilcore/attester-keys';
import { Link as RouterLink } from 'react-router-dom';
import { ACCENT } from '../config/theme';
import { rich, useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

const ROLE_LABEL: Record<string, AppKey> = {
  laboratory: 'app.lab.key.role.laboratory',
  inspector: 'app.lab.key.role.inspector',
  registry: 'app.lab.key.role.registry',
  breeder: 'app.lab.key.role.breeder',
  other: 'app.lab.key.role.other',
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
  const { t } = useT();

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
  };

  const backup = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veilcore-attester-key.json';
    a.click();
    URL.revokeObjectURL(url);
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
          {profile ? (
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
              <Box>
                <Typography variant="overline" sx={{ display: 'block', color: ACCENT }}>
                  {t('app.lab.key.publicKey')}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                  {profile.keypair.publicKey}
                </Typography>
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
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={backup}>
                {t('app.lab.key.downloadBackup')}
              </Button>
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
          <Button onClick={() => setOpen(false)}>{profile ? t('app.backup.done') : t('app.common.cancel')}</Button>
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
