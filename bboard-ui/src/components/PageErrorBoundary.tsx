// A page that throws while it draws shows a plain message, not a blank screen (round 3, L5:
// one agreement the registry's purge had emptied blanked the whole Agreements page, with no
// way to tell why or to reach anything else). The rest of the app stays where it was: the
// header, the footer, and every other page. Going to another page tries again.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';

/** What a page that failed to draw shows instead. */
export const PageErrorFallback: React.FC = () => {
  const { t } = useI18n();
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', py: 2 }} data-page-error="">
      <Alert severity="error" variant="outlined">
        <Typography variant="h6" component="h1" sx={{ mb: 0.5 }} tabIndex={-1} data-screen-heading="">
          {t('error.page.title')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t('error.page.text')}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" onClick={() => window.location.reload()} sx={{ minHeight: 44 }}>
            {t('error.page.reload')}
          </Button>
          <Button href="/records" sx={{ minHeight: 44 }}>
            {t('error.page.home')}
          </Button>
        </Stack>
      </Alert>
    </Box>
  );
};

export class Boundary extends React.Component<React.PropsWithChildren<{ resetKey: string }>, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidUpdate(prev: Readonly<{ resetKey: string }>): void {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  componentDidCatch(error: unknown): void {
    // Kept in the console for whoever is looking; nothing is sent anywhere.
    console.error('A page failed to draw:', error);
  }

  render(): React.ReactNode {
    return this.state.failed ? <PageErrorFallback /> : this.props.children;
  }
}

/** Around a page: its own failure shows a plain message; another page tries again. */
export const PageErrorBoundary: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
};
