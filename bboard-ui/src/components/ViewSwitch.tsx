// The view, in the header of every app page: "Breeder view ▾", and Breeder, Lab or Both one tap
// away. The co-founder looked for a lab's tools and didn't find them (21 Nov): the only way was a
// small "· change" link at the foot of the page (RoleChangeLink.tsx, still there), or "I'm a lab"
// on an empty Home. Switching here changes only what is put in front of someone (role.ts); no
// record changes.
//
// Drawn by the one header (SiteHeader.tsx) on the app's pages only, where the role matters, so
// the public pages and the check pages a stranger opens stay as they are.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ArrowDownIcon from '@mui/icons-material/ArrowDropDown';
import { useLocation, useNavigate } from 'react-router-dom';
import { pageAfterRole, setRole, useRole, type Role } from '../veilcore/role';
import { useT } from '../i18n/app';
import { color } from '../config/tokens';

const VIEWS: Role[] = ['breeder', 'lab', 'both'];

export const ViewSwitch: React.FC = () => {
  const { t } = useT();
  const role = useRole();
  // Nobody has said: the app shows the breeder's things (role.ts isBreeder), so it says so.
  const shown: Role = role ?? 'breeder';
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const choose = (r: Role) => {
    setOpen(false);
    setRole(r);
    const next = pageAfterRole(r, pathname);
    if (next) void navigate(next);
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        ref={button}
        id="view-switch"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'view-menu' : undefined}
        onClick={() => setOpen(!open)}
        data-view-switch={shown}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 44,
          pl: 1.25,
          pr: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          background: 'transparent',
          color: color.text,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 15,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
        }}
      >
        {t(`app.home.roleView.${shown}`)}
        <ArrowDownIcon aria-hidden="true" sx={{ fontSize: 22 }} />
      </Box>
      <Menu
        id="view-menu"
        anchorEl={button.current}
        open={open}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ list: { 'aria-labelledby': 'view-switch' } }}
      >
        {VIEWS.map((r) => (
          <MenuItem
            key={r}
            role="menuitemradio"
            aria-checked={r === shown}
            selected={r === shown}
            onClick={() => choose(r)}
            sx={{ minHeight: 44 }}
            data-view-choice={r}
          >
            <ListItemIcon>{r === shown && <CheckIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{t(`app.home.roleView.${r}`)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
