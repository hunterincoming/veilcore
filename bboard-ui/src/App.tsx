// VeilCore — records, licenses and verification for plant and animal genetics. Routed app: public
// pages, records dashboard, guided wizard, per-cultivar detail, licensing, and public
// verification.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect } from 'react';
import { Home } from './components/site/Home';
import { Founders, VerifyLookup } from './components/site/Founders';
import { Privacy } from './components/site/Privacy';
import { NotFound } from './components/site/NotFound';
import { DocPage } from './components/DocPage';
import { Implementations } from './components/Implementations';
import { AppFooter } from './components/AppFooter';
import { RolePicker } from './components/RolePicker';
import { Box, Container, ThemeProvider } from '@mui/material';
import { lightTheme } from './config/theme';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AppHome } from './components/flow/AppHome';
import { RestorePage } from './components/flow/RestorePage';
import { BackupPage } from './components/flow/BackupPage';
import { LogFlow } from './components/flow/LogFlow';
import { RecordDetail } from './components/RecordDetail';
import { VerifyPage } from './pages/VerifyPage';
import { VerifyExample } from './components/verify/VerifyExample';
import { TermsBuilder } from './components/licensing/TermsBuilder';
import { LicenseDetail } from './components/licensing/LicenseDetail';
import { CounterSignPage } from './components/licensing/CounterSignPage';
import { LicensingHub } from './components/licensing/LicensingHub';
import { SaveProblemBar } from './components/SaveProblemBar';
import { startRecordSync } from './veilcore/records';
import { startLicenseSync } from './veilcore/licenses';
import { IS_MAINNET } from './config/network';

/** Pages where someone is using the app, as opposed to reading about it. */
const APP_PAGE = /^\/(new|records|record\/|licenses|license\/|restore|backup)/;

const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  // The role question belongs to the app: making records, holding them, licensing them.
  // The documents and the implementations list are read by people deciding whether to
  // look further (investors, labs, counsel); a dialog over them, in one language, before
  // they have read a line, is the wrong first thing. The public pages outside this
  // layout (/, /founders, /verify, /privacy) never ask either.
  const { pathname } = useLocation();
  const askRole = APP_PAGE.test(pathname);
  // The app pages load and follow the holder's records; the landing page, the public
  // verify page and the documents do not (attack round D). Without a holder key in this
  // browser nothing is requested at all.
  useEffect(() => {
    startRecordSync();
    startLicenseSync();
  }, []);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Asked once, on first use. Without it the app has to guess who is reading,
        which is how a lab was told to send its own sample to a lab. */}
      <RolePicker ask={askRole} />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
        <SaveProblemBar />
        {children}
      </Container>
      {/* Documents reachable from wherever someone happens to be, rather than only from
        the page they landed on. */}
      <AppFooter />
    </Box>
  );
};

/**
 * The app's pages, and the pages people are sent to (a record to check, an agreement to
 * sign), are light: dark text on a light ground reads better for longer and in daylight.
 * The public site keeps the dark brand (lightTheme, config/theme.ts).
 */
const Light: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ThemeProvider theme={lightTheme}>
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>{children}</Box>
  </ThemeProvider>
);

const withLayout = (el: React.ReactNode) => (
  <Light>
    <AppLayout>{el}</AppLayout>
  </Light>
);

/** The browser tab's title for each page; the home page keeps the one in index.html. */
const PAGE_TITLES: [RegExp, string][] = [
  [/^\/founders/, 'Founders'],
  [/^\/privacy/, IS_MAINNET ? 'Site privacy' : 'Demo privacy'],
  [/^\/verify\/example/, 'Example record'],
  [/^\/verify/, 'Check a record'],
  [/^\/records/, 'Your plants'],
  [/^\/restore/, 'Get your plants back'],
  [/^\/backup/, 'Save your backup'],
  [/^\/docs\/spec/, 'The record format'],
  [/^\/docs\/evidence/, 'Records in evidence'],
  [/^\/docs\/integrate/, 'Integrating VeilCore'],
  [/^\/implementations/, 'Implementations'],
  [/^\/new/, 'Log a plant'],
  [/^\/record\//, 'Record'],
  [/^\/licenses?(\/|$)/, 'Agreements'],
];
const HOME_TITLE = typeof document === 'undefined' ? '' : document.title;

const PageTitle: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = PAGE_TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = page ? `${page} · VeilCore` : HOME_TITLE;
  }, [pathname]);
  return null;
};

const App: React.FC = () => (
  <>
    <PageTitle />
    <Routes>
      {/* A stranger arriving from a specification or a government submission needs
        somewhere to understand what this is. The dashboard assumes you already do. */}
      <Route path="/" element={<Home />} />
      <Route path="/founders" element={<Founders />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/verify" element={<VerifyLookup />} />
      <Route path="/records" element={withLayout(<AppHome />)} />
      <Route path="/restore" element={withLayout(<RestorePage />)} />
      <Route path="/backup" element={withLayout(<BackupPage />)} />
      {/* Documents read here rather than in a code repository. */}
      <Route path="/docs/:doc" element={withLayout(<DocPage />)} />
      <Route path="/implementations" element={withLayout(<Implementations />)} />
      <Route path="/new" element={withLayout(<LogFlow />)} />
      <Route path="/record/:id" element={withLayout(<RecordDetail />)} />
      <Route path="/record/:id/license" element={withLayout(<TermsBuilder />)} />
      <Route path="/licenses" element={withLayout(<LicensingHub />)} />
      <Route path="/license/:id" element={withLayout(<LicenseDetail />)} />
      <Route
        path="/license/:id/sign"
        element={
          <Light>
            <CounterSignPage />
          </Light>
        }
      />
      {/* A made-up record, labelled as one, for a visitor with no record id yet. */}
      <Route
        path="/verify/example"
        element={
          <Light>
            <VerifyExample />
          </Light>
        }
      />
      <Route
        path="/verify/:id"
        element={
          <Light>
            <VerifyPage />
          </Light>
        }
      />
      {/* Anything else: say so, rather than render an empty page. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
