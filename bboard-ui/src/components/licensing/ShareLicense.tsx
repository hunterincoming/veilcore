// Sharing a licence with someone who needs to see it.
//
// The public face travels always — this licence exists, its state, what it was issued
// against, whether it binds descendants. That is what a buyer downstream needs, and it
// reveals nothing commercially sensitive.
//
// Everything else is opt-in. Ungranted terms are absent from the file rather than
// hidden in it, so a recipient cannot open it in a text editor and read what they were
// not given.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/IosShareOutlined';
import { exportCertificate, type LicenseGrant } from '../../veilcore/license-certificate';
import type { License } from '../../veilcore/licenses';
import { useT } from '../../i18n/app';

/** Named after what the recipient learns, not the field revealed (app.lic.share.g.<key>, .why). */
const GRANTS: LicenseGrant[] = ['scope', 'territory', 'term', 'royalty', 'offspring', 'parties'];

export const ShareLicense: React.FC<{ license: License }> = ({ license }) => {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<Set<LicenseGrant>>(new Set(['offspring']));

  const toggle = (k: LicenseGrant) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const share = async () => {
    setBusy(true);
    await exportCertificate(license, ['existence', ...chosen]);
    setBusy(false);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => setOpen(true)}>
        {tr.t('app.lic.share.button')}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{tr.t('app.lic.share.title', { id: license.id })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="overline" sx={{ display: 'block' }}>
                {tr.t('app.lic.share.always')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.lic.share.alwaysText', { site: tr.t('app.copy.thisSite') })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                {tr.t('app.lic.share.choose')}
              </Typography>
              <Stack>
                {GRANTS.map((g) => (
                  <FormControlLabel
                    key={g}
                    control={<Checkbox checked={chosen.has(g)} onChange={() => toggle(g)} />}
                    label={
                      <Box>
                        <Typography variant="body2">{tr.t(`app.lic.share.g.${g}` as never)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tr.t(`app.lic.share.g.${g}.why` as never)}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>

            <Alert severity="info" variant="outlined">
              {tr.t('app.lic.share.absent')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{tr.t('app.lic.share.cancel')}</Button>
          <Button variant="contained" onClick={share} disabled={busy}>
            {tr.t('app.lic.share.download')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
