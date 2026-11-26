// VeilCore — records, licenses and verification for plant and animal genetics. Routed app: public
// pages, records dashboard, guided wizard, per-cultivar detail, licensing, and public
// verification.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Home } from './components/site/Home';
import { Founders, VerifyLookup } from './components/site/Founders';
import { Curtain } from './components/site/Curtain';
import { Privacy } from './components/site/Privacy';
import { NotFound } from './components/site/NotFound';
import { HomeScreenStart } from './components/site/HomeScreenStart';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { SiteHeader } from './components/SiteHeader';
import { AppFooter } from './components/AppFooter';
import { Box, Container, GlobalStyles, ThemeProvider } from '@mui/material';
import { MotionConfig } from 'framer-motion';
import { FONT, appColourStyles, appTheme, lightFocusStyles } from './config/theme';
import { focusScreenHeading } from './components/flow/FlowFrame';
import { Navigate, Routes, Route, createRoutesFromChildren, matchRoutes, useLocation } from 'react-router-dom';
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
const DocumentNew = page(() => import('./components/document/DocumentNew'), 'DocumentNew', 'after');
const DocumentCheck = page(() => import('./components/document/DocumentCheck'), 'DocumentCheck', 'wait');
const ClaimCheck = page(() => import('./components/document/ClaimCheck'), 'ClaimCheck');
// A lab's way in from the site (/for-labs): the lab view, and its signing key (lab/LabDoor.tsx).
const LabDoor = page(() => import('./components/lab/LabDoor'), 'LabDoor');
const LabResultsPage = page(() => import('./components/lab/LabResultsPage'), 'LabResultsPage');
const LabResultCheck = page(() => import('./components/lab/LabResultCheck'), 'LabResultCheck');
const BulkImportPage = page(() => import('./components/lab-import/BulkImportPage'), 'BulkImportPage');
const AuthorityPackPage = page(() => import('./components/authority-pack/AuthorityPackPage'), 'AuthorityPackPage');
// QR labels that open a record's check page, drawn and printed on this device (docs/scan-and-labels.md).
const LabelsPage = page(() => import('./components/labels/LabelsPage'), 'LabelsPage');
const RestorePage = page(() => import('./components/flow/RestorePage'), 'RestorePage');
const BackupPage = page(() => import('./components/flow/BackupPage'), 'BackupPage');
// Records saved with VeilCore and the downloaded copy (easy mode step 2).
const SettingsPage = page(() => import('./components/flow/SettingsPage'), 'SettingsPage');
const IntakePage = page(() => import('./components/flow/IntakePage'), 'IntakePage');
const IntakeSendPage = page(() => import('./components/flow/IntakePage'), 'IntakeSendPage');
const ProvePage = page(() => import('./components/flow/ProvePage'), 'ProvePage');
const LicenseInvitePage = page(() => import('./components/licensing/LicenseInvitePage'), 'LicenseInvitePage');
const ClaimPage = page(() => import('./components/licensing/ClaimPage'), 'ClaimPage');
const LenderPage = page(() => import('./components/licensing/LenderPage'), 'LenderPage');
const ProveLicensePage = page(() => import('./components/licensing/LicenseProof'), 'ProveLicensePage');
const PartnersPage = page(() => import('./components/partners/PartnersPage'), 'PartnersPage');
const TermsBuilder = page(() => import('./components/licensing/TermsBuilder'), 'TermsBuilder');
const LicenseDetail = page(() => import('./components/licensing/LicenseDetail'), 'LicenseDetail', 'after');
const CounterSignPage = page(() => import('./components/licensing/CounterSignPage'), 'CounterSignPage');
const JobPage = page(() => import('./components/ask/JobPage'), 'JobPage');
const LicensingHub = page(() => import('./components/licensing/LicensingHub'), 'LicensingHub');
const DocPage = page(() => import('./components/DocPage'), 'DocPage');
const Implementations = page(() => import('./components/Implementations'), 'Implementations');
const VerifyPage = page(() => import('./pages/VerifyPage'), 'VerifyPage');
const VerifyExample = page(() => import('./components/verify/VerifyExample'), 'VerifyExample');
// Round 5 (CONTRACT.md #31): this site's files against its release's published list.
const CheckThisSite = page(() => import('./components/site/CheckThisSite'), 'CheckThisSite');
const Terms = page(() => import('./components/site/Terms'), 'Terms');
const Help = page(() => import('./components/site/Help'), 'Help');
// The How it works page (site design, 21 Nov 2026): the night design, fetched when opened.
const HowItWorks = page(() => import('./components/site/HowItWorks'), 'HowItWorks');
const Status = page(() => import('./components/site/Status'), 'Status');
// Only in the end-to-end build (package.json e2e:build sets VITE_E2E_FIXTURES=1): a stand-in for
// a live license's page around the real royalty ledger (e2e-fixtures/RoyaltyPayFixture.tsx). The
// condition is a constant in every other build, so the page and its route are left out of it.
const E2E_FIXTURES = import.meta.env.VITE_E2E_FIXTURES === '1';
const RoyaltyPayFixture = E2E_FIXTURES
  ? page(() => import('./e2e-fixtures/RoyaltyPayFixture'), 'RoyaltyPayFixture')
  : undefined;
// The backup restore drill's set, made with the app's own code (e2e-fixtures/RestoreDrillFixture.tsx).
const RestoreDrillFixture = E2E_FIXTURES
  ? page(() => import('./e2e-fixtures/RestoreDrillFixture'), 'RestoreDrillFixture')
  : undefined;
// The app frame's parts: one file, so the frame arrives in one request.
const layoutParts = () => import('./app-layout-parts');
const RolePicker = page<{ ask: boolean }>(layoutParts, 'RolePicker');
const SaveProblemBar = page(layoutParts, 'SaveProblemBar');
const RoleChangeLink = page(layoutParts, 'RoleChangeLink');
const ViewSwitch = page(layoutParts, 'ViewSwitch');
const AskLauncher = page(layoutParts, 'AskLauncher');
const NetworkBadge = page(layoutParts, 'NetworkBadge');
const AccountKeeper = page(layoutParts, 'AccountKeeper');
const OfflineBar = page(layoutParts, 'OfflineBar');

const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  // The role question belongs to the app: making records, holding them, licensing them.
  // The documents and the implementations list are read by people deciding whether to
  // look further (investors, labs, counsel); a dialog over them, in one language, before
  // they have read a line, is the wrong first thing. The public pages outside this
  // layout (/, /founders, /verify, /privacy) never ask either.
  const { pathname } = useLocation();
  // The app pages load and follow the holder's records; the landing page, the public
  // verify page and the documents do not (attack round D). Without a holder key in this
  // browser nothing is requested at all.
  // Not on a prove page (round 6, CONTRACT.md #36): the sync sends the holder key, which there
  // would tie the holder to the on-chain key the request names. It starts on the next app page.
  useEffect(() => {
    void import('./veilcore/records').then((m) => m.startRecordSync());
    void import('./veilcore/licenses').then((m) => m.startLicenseSync());
    // Key date stamps that didn't go through, tried again while the app is open (test builds
    // with the chain features only, which it checks itself; never on a check or prove page:
    // stamp-background.ts).
    void import('./veilcore/chain/stamp-background').then((m) => m.startStampRetries());
    // A read-only look at the network for the records this browser date stamped: has anything
    // changed that this browser didn't do? Sends nothing; at most one read per ten minutes
    // (record-watch.ts). Never on a check or prove page, the same rule as the stamps.
    void import('./veilcore/record-watch').then((m) => m.startRecordWatch());
    // Ask's approved "Do it for me" jobs, carried on while the app is open: never on a check or
    // prove page, the same rule as the stamps (ask-job/start.ts). Nothing runs that the person
    // hasn't approved.
    void import('./ask-job/start').then((m) => m.startJobRunner());
  }, [pathname]);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Never asked up front (Hunter, 30 Oct): a newcomer is a breeder unless they say
        otherwise, and the first question is what they want to prove (flow/StartChoice.tsx).
        A lab says so with "I'm a lab" on its home screen or the footer's "change" link,
        which open this, or picks Lab in the header's view menu (ViewSwitch.tsx), or opens /for-labs. */}
      <RolePicker ask={false} />
      {/* Records saved with VeilCore, kept up to date by themselves; the "Keep your records safe"
        sheet (flow/KeepSafe.tsx, veilcore/account-copy.ts). */}
      <AccountKeeper />
      {/* The one header, as on every page (fresh-eyes review, 12 Nov). */}
      {/* The network badge only where it warns: a test or demo build, whose records are practice
        data. veilcore.org says it runs on the main network on its landing page (What's live where);
        on every app page the chips were noise ("Web app", "Main network": easy-mode review, 19 Nov). */}
      {/* The view (Breeder, Lab or Both) in the header, one tap away on every app page: the footer's
        "change" alone was missed (21 Nov). */}
      <SiteHeader app badge={IS_MAINNET ? undefined : <NetworkBadge />} view={<ViewSwitch />} />
      {/* The one main landmark: the header, the page and its notices. The footer stays outside. */}
      <Container component="main" maxWidth="md" sx={{ pt: { xs: 2, md: 4 }, pb: { xs: 3, md: 6 } }}>
        {/* No signal: what still works and what waits (docs/offline.md). */}
        <OfflineBar />
        <SaveProblemBar />
        {/* A page that fails to draw says so plainly, not with a blank screen (round 3, L5). */}
        <PageErrorBoundary>{children}</PageErrorBoundary>
      </Container>
      {/* Documents reachable from wherever someone happens to be, rather than only from
        the page they landed on. */}
      {/* Ask VeilCore (docs/ask-veilcore.md): drafts on the app's pages, never on the public ones.
        Before the footer: its spacer keeps the page's last line clear of the button. */}
      <AskLauncher />
      <AppFooter>
        <RoleChangeLink />
      </AppFooter>
    </Box>
  );
};

/** The frame's own files, fetched with the page's (preloadPage). */
const layoutPreload: Preloadable = {
  preload: () =>
    Promise.all([
      RolePicker.preload(),
      SaveProblemBar.preload(),
      AskLauncher.preload(),
      RoleChangeLink.preload(),
      ViewSwitch.preload(),
      NetworkBadge.preload(),
      AccountKeeper.preload(),
    ]),
};

/**
 * The app's pages, and the pages people are sent to (a record to check, an agreement to
 * sign), follow the device's light or dark setting: Mako's night, or the same gold on paper
 * for daylight; printed, always ink on white (config/theme.ts appTheme, appColourStyles).
 * The public site is always the night (site.css).
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

/** Archivo has no Japanese: Japanese headings and buttons use the body face, at its own spacing. */
const japaneseHeadings = {
  ':lang(ja) :is(.MuiTypography-h1, .MuiTypography-h2, .MuiTypography-h3, .MuiTypography-h4, .MuiTypography-h5, .MuiTypography-h6, .MuiDialogTitle-root, .MuiButton-root)':
    {
      fontFamily: FONT,
      letterSpacing: 0,
    },
} as const;

const Light: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ThemeProvider theme={appTheme}>
    <GlobalStyles styles={appColourStyles} />
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

/**
 * The pages people are sent to (a record to check, an agreement to sign): the same header and
 * footer as everywhere else, without the app's own parts (fresh-eyes review, 12 Nov).
 */
const CheckChrome: React.FC<React.PropsWithChildren> = ({ children }) => (
  // One screen tall together, the page taking what the header and footer leave: a short page
  // ends with the footer at the bottom of the screen, a long one right after its content. The
  // pages themselves no longer ask for a full screen each, which put the footer below the fold
  // (review of ux-polish, 13 Nov).
  <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <SiteHeader />
    <Box sx={{ flex: 1 }}>{children}</Box>
    <AppFooter />
  </Box>
);
const CheckFrame = CheckChrome;
const withLayout = (el: React.ReactNode) => (
  <Light>
    <LayoutFrame>{el}</LayoutFrame>
  </Light>
);

/** The browser tab's title for each page; the home page keeps the one in index.html. */
const PAGE_TITLES: [RegExp, string][] = [
  [/^\/how-it-works/, 'How it works'],
  [/^\/founders/, 'About'],
  [/^\/for-labs/, 'For labs'],
  [/^\/settings/, 'Settings'],
  [/^\/lab\/results/, 'Sign lab results'],
  [/^\/terms/, 'Terms of use'],
  [/^\/help/, 'Help'],
  [/^\/status/, 'Service status'],
  [/^\/check-this-site/, 'Check this site'],
  [/^\/privacy/, IS_MAINNET ? 'Privacy policy' : 'Demo privacy'],
  [/^\/verify\/example/, 'Example record'],
  [/^\/verify/, 'Check a record'],
  [/^\/records\/import/, 'Date your collection'],
  [/^\/records\/labels/, 'Print QR labels'],
  [/^\/records\/authority-pack/, 'Pack for REPROCANN / SEDRONAR'],
  [/^\/records/, 'Your records'],
  [/^\/restore/, 'Get your records back'],
  [/^\/backup/, 'Save your backup'],
  [/^\/docs\/spec/, 'The record format'],
  [/^\/docs\/evidence/, 'Records in evidence'],
  [/^\/docs\/integrate/, 'Integrating VeilCore'],
  [/^\/implementations/, 'Implementations'],
  [/^\/partners/, 'Require a record'],
  [/^\/new/, 'Make a record'],
  [/^\/documents\/new/, 'Make a record'],
  [/^\/record\//, 'Record'],
  [/^\/licenses?(\/|$)/, 'Agreements'],
];
const HOME_TITLE = typeof document === 'undefined' ? '' : document.title;

/** Each title above in the visitor's language (i18n/en.ts title.*). */
const TITLE_KEYS: Record<string, StringKey> = {
  'How it works': 'title.how',
  About: 'title.founders',
  'For labs': 'title.forLabs',
  Settings: 'title.settings',
  'Sign lab results': 'title.labResults',
  'Print QR labels': 'title.labels',
  'Pack for REPROCANN / SEDRONAR': 'title.pack',
  'Terms of use': 'title.terms',
  Help: 'title.help',
  'Service status': 'title.status',
  'Check this site': 'title.checkSite',
  'Privacy policy': 'title.privacyMainnet',
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
  'Require a record': 'title.partners',
  'Make a record': 'title.new',
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

/** /about is /founders, with the section it was asked for. */
const AboutRedirect: React.FC = () => <Navigate to={`/founders${useLocation().hash}`} replace />;

const routes = (
  <>
    {/* A stranger arriving from a specification or a government submission needs
    somewhere to understand what this is. The dashboard assumes you already do. */}
    <Route path="/" element={<Home />} />
    <Route path="/how-it-works" element={<HowItWorks />} />
    <Route path="/founders" element={<Founders />} />
    {/* The design's name for the founders page; its sections' anchors (#contact) come along. */}
    <Route path="/about" element={<AboutRedirect />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/help" element={<Help />} />
    <Route path="/status" element={<Status />} />
    {/* The addresses people try first: both are sections of /help. */}
    <Route path="/faq" element={<Navigate to="/help" replace />} />
    <Route path="/contact" element={<Navigate to="/help#contact" replace />} />
    <Route path="/check-this-site" element={<CheckThisSite />} />
    <Route path="/partners" element={<PartnersPage />} />
    <Route path="/verify" element={<VerifyLookup />} />
    <Route path="/records" element={withLayout(<AppHome />)} />
    <Route path="/records/import" element={withLayout(<BulkImportPage />)} />
    <Route path="/records/authority-pack" element={withLayout(<AuthorityPackPage />)} />
    <Route path="/records/labels" element={withLayout(<LabelsPage />)} />
    <Route path="/restore" element={withLayout(<RestorePage />)} />
    <Route path="/backup" element={withLayout(<BackupPage />)} />
    <Route path="/settings" element={withLayout(<SettingsPage />)} />
    {/* Documents read here rather than in a code repository. */}
    <Route path="/docs/:doc" element={withLayout(<DocPage />)} />
    <Route path="/implementations" element={withLayout(<Implementations />)} />
    <Route path="/new" element={withLayout(<LogFlow />)} />
    <Route path="/documents/new" element={withLayout(<DocumentNew />)} />
    <Route
      path="/check-claim"
      element={
        <Light>
          <CheckFrame>
            <ClaimCheck />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/check-document"
      element={
        <Light>
          <CheckFrame>
            <DocumentCheck />
          </CheckFrame>
        </Light>
      }
    />
    {/* A page for a lab owner, in the public pages' frame: opening it changes nothing (lab/LabDoor.tsx). */}
    <Route
      path="/for-labs"
      element={
        <Light>
          <CheckFrame>
            <LabDoor />
          </CheckFrame>
        </Light>
      }
    />
    <Route path="/lab/results" element={withLayout(<LabResultsPage />)} />
    <Route
      path="/check-lab-result"
      element={
        <Light>
          <CheckFrame>
            <LabResultCheck />
          </CheckFrame>
        </Light>
      }
    />
    <Route path="/intake" element={withLayout(<IntakePage />)} />
    <Route path="/intake/send" element={withLayout(<IntakeSendPage />)} />
    <Route path="/prove/:id" element={withLayout(<ProvePage />)} />
    <Route path="/record/:id" element={withLayout(<RecordDetail />)} />
    <Route path="/record/:id/license" element={withLayout(<TermsBuilder />)} />
    <Route path="/licenses" element={withLayout(<LicensingHub />)} />
    {/* Ask's "Do it for me": one job's result to check, then its progress (components/ask/JobPage.tsx). */}
    <Route path="/ask/job/:id" element={withLayout(<JobPage />)} />
    <Route path="/license/:id" element={withLayout(<LicenseDetail />)} />
    <Route
      path="/prove-license/:id"
      element={
        <Light>
          <CheckFrame>
            <ProveLicensePage />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/license-invite/:id"
      element={
        <Light>
          <CheckFrame>
            <LicenseInvitePage />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/claim"
      element={
        <Light>
          <CheckFrame>
            <ClaimPage />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/lender"
      element={
        <Light>
          <CheckFrame>
            <LenderPage />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/license/:id/sign"
      element={
        <Light>
          <CheckFrame>
            <CounterSignPage />
          </CheckFrame>
        </Light>
      }
    />
    {/* A made-up record, labelled as one, for a visitor with no record id yet. */}
    <Route
      path="/verify/example"
      element={
        <Light>
          <CheckFrame>
            <VerifyExample />
          </CheckFrame>
        </Light>
      }
    />
    <Route
      path="/verify/:id"
      element={
        <Light>
          <CheckFrame>
            <VerifyPage />
          </CheckFrame>
        </Light>
      }
    />
    {RoyaltyPayFixture && (
      <Route
        path="/e2e/royalty-pay"
        element={
          <Light>
            <RoyaltyPayFixture />
          </Light>
        }
      />
    )}
    {RestoreDrillFixture && (
      <Route
        path="/e2e/restore-drill"
        element={
          <Light>
            <RestoreDrillFixture />
          </Light>
        }
      />
    )}
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
    <Curtain preload={preloadPage} />
    <Suspense fallback={null}>
      {/* An iPhone Home Screen launch with nothing in its own storage: says nothing is lost, first
        (site/home-screen.ts). Any other visit gets the page it asked for. */}
      <HomeScreenStart>
        <Routes>{routes}</Routes>
      </HomeScreenStart>
    </Suspense>
  </MotionConfig>
);

export default App;
