// Opened only when someone asks: "I'm a lab" on the home screen, or the footer's "change"
// link. It used to open on its own on first use; a newcomer then met two questions before
// doing anything, so it no longer does (30 Oct): everyone starts as a breeder.
//
// Without this the app has to guess from record fields, which is how a lab ended up
// being told to send its own sample to a lab. One question removes the guesswork and
// halves what most people ever see. A lab is taken to its own first screen (the records
// page shows a lab's actions, not "seal your first record").
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRole, setRole, CHANGE_ROLE_EVENT, isLab, isBreeder, type Role } from '../veilcore/role';
import { useT } from '../i18n/app';
import { LanguagePicker } from '../i18n/LanguagePicker';
import { FOCUS_RING, INK_COLOR } from '../config/theme';
import { focusScreenHeading } from './flow/FlowFrame';

/** `ask`: open on its own when no role is set (app pages). Elsewhere it opens only when asked to. */
export const RolePicker: React.FC<{ ask: boolean }> = ({ ask }) => {
  const [open, setOpen] = useState(ask && getRole() === null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = getRole();
  // After a choice, focus goes to the next screen's heading (round 5), not back to wherever
  // it was before the dialog opened, so a screen reader says where they've landed.
  const chosen = useRef(false);
  const { t } = useT();

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(CHANGE_ROLE_EVENT, reopen);
    return () => window.removeEventListener(CHANGE_ROLE_EVENT, reopen);
  }, []);

  const choose = (r: Role) => {
    setRole(r);
    chosen.current = true;
    setOpen(false);
    // A lab arriving at the record wizard would be asked to seal a cultivar; its own
    // first screen is the records page, which shows receiving and signing.
    if (isLab(r) && !isBreeder(r) && pathname === '/new') void navigate('/records');
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      // Closable only once there is an answer to fall back on.
      onClose={current ? () => setOpen(false) : undefined}
      aria-labelledby="role-title"
      // Read on the render that closes it: true only when a role was just chosen.
      disableRestoreFocus={chosen.current}
      slotProps={{
        transition: {
          onExited: () => {
            if (!chosen.current) return;
            chosen.current = false;
            focusScreenHeading();
          },
        },
      }}
    >
      {/* The first thing a new visitor sees on the app's pages, over the header: the language
          picker is here too, so they can read the question in their language. */}
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, pr: 2, pt: 2 }}>
        <DialogTitle id="role-title" sx={{ pt: 0, pr: 0, flex: 1, minWidth: 0 }}>
          {t('app.home.role.title')}
        </DialogTitle>
        <Box sx={{ flexShrink: 0 }}>
          <LanguagePicker />
        </Box>
      </Stack>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('app.home.role.intro')}
        </Typography>
        <Stack spacing={1.5} sx={{ pb: 1 }}>
          {(['breeder', 'lab', 'both'] as Role[]).map((r) => (
            <ButtonBase
              key={r}
              onClick={() => choose(r)}
              focusRipple
              sx={{
                display: 'block',
                textAlign: 'left',
                width: '100%',
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: r === current ? INK_COLOR : 'rgba(22,24,29,0.14)',
                '&:hover': { borderColor: INK_COLOR },
                '&.Mui-focusVisible': { ...FOCUS_RING, borderColor: INK_COLOR },
              }}
            >
              <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
                {t(`app.home.role.${r}.label`)}
              </Typography>
              <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block' }}>
                {t(`app.home.role.${r}.blurb`)}
              </Typography>
            </ButtonBase>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
