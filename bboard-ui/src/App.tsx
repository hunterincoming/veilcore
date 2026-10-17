// VeilCore — records, licenses and verification for plant and animal genetics. Routed app: public
// pages, records dashboard, guided wizard, per-cultivar detail, licensing, and public
// verification.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Home } from './components/site/Home';
import { Founders, VerifyLookup } from './components/site/Founders';
import { Privacy } from './components/site/Privacy';
import { NotFound } from './components/site/NotFound';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { Box, Container, GlobalStyles, ThemeProvider } from '@mui/material';
import { MotionConfig } from 'framer-motion';
import { FONT, lightFocusStyles, lightTheme } from './config/theme';
import { focusScreenHeading } from './components/flow/FlowFrame';
import { Routes, Route, createRoutesFromChildren, matchRoutes, useLocation } from 'react-router-dom';
import { IS_MAINNET } from './config/network';
import { useI18n } from './i18n';
import type { StringKey } from './i18n/en';

// Loading. The public pages above come with the first file; every other page is its own
// file, fetched when it is opened, so a visitor reading the landing page on a phone does
// not download the record app, the documents or the checking code.
//
// Midnight's WebAssembly for the `commit` circuit (about 1.4 MB, veilcore/commitment.ts)
// never comes with the landing page or the documents. `circuit` says how a page gets it:
//   'wait'   the page computes a fingerprint as it draws (a saved lab report matched to
//            its plant, a record's identity): its files and the circuit, then the page;
//   'after'  the page makes one when asked (a lab report dropped in, an agreement's
//            certificate): the page draws first and the circuit is fetched straight after,
//            so the fingerprint is as quick as before;
//   none     the page does not draw with one; if it makes one after all, fingerprintText
//            and fingerprintFile fetch the circuit then. The check page fetches it only for
//            a record that has a saved lab report to match (pages/VerifyPage.tsx) or a date
//            stamp to read on Midnight (veilcore/chain/anchor-decode.ts).
// load-split.test.ts follows each page's imports and fails if a page without 'wait' loads
// a file that calls the circuit synchronously.
//
// One Suspense boundary around the routes: on a link from one page to another the router
// keeps the current page on screen until the next one has loaded (a transition), so no
// page goes blank in between, and focus moves only once the new page is there.
type Preloadable = { preload: () => Promise<unknown> };
const loadCircuit = () => import('./veilcore/commitment').then((m) => m.loadFingerprintCircuit());
const page = <P extends object = object>(
  load: () => Promise<Record<string, unknown>>,
  name: string,
  circuit?: 'wait' | 'after',
) => {
  let files: Promise<{ default: React.ComponentType<P> }> | undefined;
  const preload = () => {
    files ??= Promise.all([load(), circuit === 'wait' ? loadCircuit() : undefined]).then(
      ([mod]) => {
        // Not awaited: a failure here is met again, and reported, where a fingerprint is made.
        if (circuit === 'after') loadCircuit().catch(() => undefined);
        return { default: mod[name] as React.ComponentType<P> };
      },
      (e: unknown) => {
        files = undefined;
        throw e;
      },
    );
    return files;
  };
  return Object.assign(lazy(preload), { preload });
};
const AppHome = page(() => import('./components/flow/AppHome'), 'AppHome', 'wait');
const RecordDetail = page(() => import('./components/RecordDetail'), 'RecordDetail', 'wait');
const LogFlow = page(() => import('./components/flow/LogFlow'), 'LogFlow', 'after');
const BulkImportPage = page(() => import('./components/lab-import/BulkImportPage'), 'BulkImportPage');
const RestorePage = page(() => import('./components/flow/RestorePage'), 'RestorePage');
const BackupPage = page(() => import('./components/flow/BackupPage'), 'BackupPage');
const ProvePage = page(() => import('./components/flow/ProvePage'), 'ProvePage');
const PartnersPage = page(() => import('./components/partners/PartnersPage'), 'PartnersPage');
const TermsBuilder = page(() => import('./components/licensing/TermsBuilder'), 'TermsBuilder');
const LicenseDetail = page(() => import('./components/licensing/LicenseDetail'), 'LicenseDetail', 'after');
const CounterSignPage = page(() => import('./components/licensing/CounterSignPage'), 'CounterSignPage');
const LicensingHub = page(() => import('./components/licensing/LicensingHub'), 'LicensingHub');
const DocPage = page(() => import('./components/DocPage'), 'DocPage');
const Implementations = page(() => import('./components/Implementations'), 'Implementations');
const VerifyPage = page(() => import('./pages/VerifyPage'), 'VerifyPage');
const VerifyExample = page(() => import('./components/verify/VerifyExample'), 'VerifyExample');
// Round 5 (CONTRACT.md #31): this site's files against its release's published list.
const CheckThisSite = page(() => import('./components/site/CheckThisSite'), 'CheckThisSite');
// The app frame's parts: one file, so the frame arrives in one request.
const layoutParts = () => import('./app-layout-parts');
const RolePicker = page<{ ask: boolean }>(layoutParts, 'RolePicker');
const SaveProblemBar = page(layoutParts, 'SaveProblemBar');
const AppFooter = page(layoutParts, 'AppFooter');

/** Pages where someone is using the app, as opposed to reading about it. */
const APP_PAGE = /^\/(new|records(?!\/import)|record\/|licenses|license\/|restore|backup)/;

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
  // Not on a prove page (round 6, CONTRACT.md #36): the sync sends the holder key, which there
  // would tie the holder to the on-chain key the request names. It starts on the next app page.
  useEffect(() => {
    void import('./veilcore/records').then((m) => m.startRecordSync());
    void import('./veilcore/licenses').then((m) => m.startLicenseSync());
  }, [pathname]);
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
      {/* The one main landmark: the header, the page and its notices. The footer stays outside. */}
      <Container component="main" maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
        <SaveProblemBar />
        {/* A page that fails to draw says so plainly, not with a blank screen (round 3, L5). */}
        <PageErrorBoundary>{children}</PageErrorBoundary>
      </Container>
      {/* Documents reachable from wherever someone happens to be, rather than only from
        the page they landed on. */}
      <AppFooter />
    </Box>
  );
};

/** The frame's own files, fetched with the page's (preloadPage). */
const layoutPreload: Preloadable = {
  preload: () => Promise.all([RolePicker.preload(), SaveProblemBar.preload(), AppFooter.preload()]),
};

/**
 * The app's pages, and the pages people are sent to (a record to check, an agreement to
 * sign), are light: dark text on a light ground reads better for longer and in daylight.
 * The public site keeps the dark brand (lightTheme, config/theme.ts).
 */
/**
 * Japanese on the app's pages, as on the public ones (site.css): headings, buttons, labels
 * and chips break between phrases, not inside a word (word-break: auto-phrase, Chromium 119
 * and later); elsewhere keep-all, breaking a run only when it would not fit otherwise. Body
 * text keeps the ordinary Japanese rules. <html lang> is the chosen language (i18n/index.tsx).
 * `vc-short` marks any other short label that should break the same way (a plant page's actions).
 */
const JA_SHORT_LINES =
  ':lang(ja) :is(h1, h2, h3, h4, h5, h6, label, legend, .MuiButton-root, .MuiChip-label, .MuiTab-root, .MuiAlertTitle-root, .MuiFormLabel-root, .MuiMenuItem-root, .vc-short)';
const japaneseLineBreaks = {
  [JA_SHORT_LINES]: { lineBreak: 'strict', wordBreak: 'auto-phrase' },
  '@supports not (word-break: auto-phrase)': {
    [JA_SHORT_LINES]: { wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  },
} as const;

/**
 * Long codes (record ids, proof codes, transaction hashes) are unbroken strings: on a phone a
 * 64-character hash in a line of text made a page 543-575px wide (persona review, 17 Oct). Text
 * may break inside a word only where nothing else fits, so no page scrolls sideways.
 */
const longCodes = {
  '.MuiTypography-root, .MuiAlert-message, .MuiFormHelperText-root, .MuiFormControlLabel-label': {
    overflowWrap: 'anywhere',
  },
} as const;

/** Caslon has no Japanese: Japanese headings use the body face, at its own spacing. */
const japaneseHeadings = {
  ':lang(ja) :is(.MuiTypography-h1, .MuiTypography-h2, .MuiTypography-h3, .MuiTypography-h4, .MuiTypography-h5, .MuiDialogTitle-root)':
    {
      fontFamily: FONT,
      letterSpacing: 0,
    },
} as const;

const Light: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ThemeProvider theme={lightTheme}>
    <GlobalStyles styles={lightFocusStyles} />
    <GlobalStyles styles={japaneseLineBreaks} />
    <GlobalStyles styles={japaneseHeadings} />
    <GlobalStyles styles={longCodes} />
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <PageErrorBoundary>{children}</PageErrorBoundary>
    </Box>
  </ThemeProvider>
);

const LayoutFrame = Object.assign(AppLayout, layoutPreload);
const withLayout = (el: React.ReactNode) => (
  <Light>
    <LayoutFrame>{el}</LayoutFrame>
  </Light>
);

/** The browser tab's title for each page; the home page keeps the one in index.html. */
const PAGE_TITLES: [RegExp, string][] = [
  [/^\/founders/, 'Founders'],
  [/^\/check-this-site/, 'Check this site'],
  [/^\/privacy/, IS_MAINNET ? 'Site privacy' : 'Demo privacy'],
  [/^\/verify\/example/, 'Example record'],
  [/^\/verify/, 'Check a record'],
  [/^\/records\/import/, 'Date your collection'],
  [/^\/records/, 'Your records'],
  [/^\/restore/, 'Get your records back'],
  [/^\/backup/, 'Save your backup'],
  [/^\/docs\/spec/, 'The record format'],
  [/^\/docs\/evidence/, 'Records in evidence'],
  [/^\/docs\/integrate/, 'Integrating VeilCore'],
  [/^\/implementations/, 'Implementations'],
  [/^\/new/, 'Log a plant or animal'],
  [/^\/record\//, 'Record'],
  [/^\/licenses?(\/|$)/, 'Agreements'],
];
const HOME_TITLE = typeof document === 'undefined' ? '' : document.title;

/** Each title above in the visitor's language (i18n/en.ts title.*). */
const TITLE_KEYS: Record<string, StringKey> = {
  Founders: 'title.founders',
  'Check this site': 'title.checkSite',
  'Site privacy': 'title.privacyMainnet',
  'Demo privacy': 'title.privacy',
  'Example record': 'title.example',
  'Check a record': 'title.verify',
  'Date your collection': 'title.import',
  'Your records': 'title.records',
  'Get your records back': 'title.restore',
  'Save your backup': 'title.backup',
  'The record format': 'title.spec',
  'Records in evidence': 'title.evidence',
  'Integrating VeilCore': 'title.integrate',
  Implementations: 'title.implementations',
  'Log a plant or animal': 'title.new',
  Record: 'title.record',
  Agreements: 'title.agreements',
};

const PageTitle: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    const page = PAGE_TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = page ? `${TITLE_KEYS[page] ? t(TITLE_KEYS[page]) : page} · VeilCore` : HOME_TITLE;
  }, [pathname, t]);
  return null;
};

/**
 * A new page starts at the top, with focus on its heading, so a screen reader announces it
 * and the next Tab starts from it. Not on the first load (the browser does that), and not
 * for a link to a section of a page (/#about scrolls there itself).
 */
const NewPageFocus: React.FC = () => {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (hash) return;
    return focusScreenHeading();
  }, [pathname]);
  return null;
};

const routes = (
  <>
    {/* A stranger arriving from a specification or a government submission needs
    somewhere to understand what this is. The dashboard assumes you already do. */}
    <Route path="/" element={<Home />} />
    <Route path="/founders" element={<Founders />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/check-this-site" element={<CheckThisSite />} />
    <Route path="/partners" element={<PartnersPage />} />
    <Route path="/verify" element={<VerifyLookup />} />
    <Route path="/records" element={withLayout(<AppHome />)} />
    <Route path="/records/import" element={withLayout(<BulkImportPage />)} />
    <Route path="/restore" element={withLayout(<RestorePage />)} />
    <Route path="/backup" element={withLayout(<BackupPage />)} />
    {/* Documents read here rather than in a code repository. */}
    <Route path="/docs/:doc" element={withLayout(<DocPage />)} />
    <Route path="/implementations" element={withLayout(<Implementations />)} />
    <Route path="/new" element={withLayout(<LogFlow />)} />
    <Route path="/prove/:id" element={withLayout(<ProvePage />)} />
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
  </>
);

/**
 * Fetch the files the page at `pathname` needs (its own, the app frame's, and the
 * fingerprint circuit for the record app), so main.tsx can draw it in one go once they are
 * here, as when everything came in one file. Found from the routes themselves: every lazy
 * part in the matched route's elements has a `preload`.
 */
export const preloadPage = (pathname: string): Promise<unknown> => {
  const wanted: Promise<unknown>[] = [];
  const walk = (node: React.ReactNode): void =>
    React.Children.forEach(node, (n) => {
      if (!React.isValidElement(n)) return;
      const pre = (n.type as Partial<Preloadable>).preload;
      if (pre) wanted.push(pre());
      walk((n.props as { children?: React.ReactNode }).children);
    });
  for (const m of matchRoutes(createRoutesFromChildren(routes), pathname) ?? []) walk(m.route.element);
  return Promise.all(wanted);
};

const App: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <PageTitle />
    <NewPageFocus />
    <Suspense fallback={null}>
      <Routes>{routes}</Routes>
    </Suspense>
  </MotionConfig>
);

export default App;
