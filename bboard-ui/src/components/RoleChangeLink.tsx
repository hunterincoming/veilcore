// The footer's "change view" link, on the app's pages only (App.tsx AppLayout), where the role
// picker it opens is mounted. Kept out of AppFooter.tsx, which the public pages load too.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from '@mui/material';
import { requestRoleChange, useRole } from '../veilcore/role';
import { useT } from '../i18n/app';
import { ON_DARK, ON_DARK_MUTED, linkBox } from './AppFooter';

export const RoleChangeLink: React.FC = () => {
  const tr = useT();
  const role = useRole();
  return (
    <Link
      component="button"
      type="button"
      onClick={requestRoleChange}
      underline="hover"
      sx={{
        color: ON_DARK_MUTED,
        fontWeight: 400,
        '&:hover': { color: ON_DARK, backgroundColor: 'transparent' },
        ...linkBox,
        fontSize: 15,
        textAlign: 'left',
      }}
    >
      {role ? tr.t('app.home.roleChange', { view: tr.t(`app.home.roleView.${role}`) }) : tr.t('app.home.chooseView')}
    </Link>
  );
};
