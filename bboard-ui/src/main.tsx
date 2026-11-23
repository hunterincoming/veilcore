// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * VeilCore's website: public pages, the record app and the verify page.
 *
 * The site loads no wallet connector or logger from the Midnight template it started as.
 * A mainnet build sends no transactions. A test-network build with VITE_REAL_CHAIN=1 can
 * send three calls from the visitor's own device, paid by the sponsor service
 * (veilcore/chain/); it sets the network id there, when a call is made. It still runs the compiled `commit`
 * circuit in the browser for fingerprints (veilcore/commitment.ts), which is what pulls in
 * the on-chain runtime's WebAssembly.
 *
 * @packageDocumentation
 */
import './globals';
import { guardHolderRequests } from './veilcore/holder-guard';
import { startOffline } from './offline/register';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GlobalStyles, ThemeProvider } from '@mui/material';
import App, { preloadPage } from './App';
import { LanguageProvider, preloadLanguage, startingLanguage } from './i18n';
import CssBaseline from '@mui/material/CssBaseline';
import { paperColourStyles, theme } from './config/theme';
// Body text and forms, on the whole site and app: Atkinson Hyperlegible Next, drawn so that
// characters people mix up (I l 1, O 0, B 8) look different, for lab codes, record codes
// and fingerprints read off a phone. One variable file covers every weight (config/theme.ts).
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
// Headings, buttons and the wordmark in Archivo, codes in JetBrains Mono, both self-hosted (fonts.css).
import './fonts.css';

// Only the public pages come in this file (App.tsx). For any other page, fetch its files
// first and then draw it whole, as before the split: not a frame, then a page, then a
// dialog over it. A file that cannot be fetched now is asked for again as the page draws.
// The same for the words of a language other than English (i18n/index.tsx), and for the
// record app's words in it (i18n/app.tsx) on any page but the three that don't use them.
// The check and prove pages never send the holder key (round 6, CONTRACT.md #36).
guardHolderRequests(window);
// The offline worker (docs/offline.md): registered on every page, so the app opens with no
// signal. It never sends the holder key from a check or prove page: it sends nothing a page
// doesn't leave for it (offline/sw.js, Background Sync).
startOffline();
const startLang = startingLanguage();
const { pathname } = window.location;
await Promise.all([
  preloadPage(pathname).catch(() => undefined),
  preloadLanguage().catch(() => undefined),
  startLang !== 'en' && !/^\/(founders|privacy)?\/?$/.test(pathname)
    ? import('./i18n/app').then((m) => m.loadAppStrings(startLang)).catch(() => undefined)
    : undefined,
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* The colour variables the header and footer draw with, outside the app's pages (theme.ts). */}
      <GlobalStyles styles={paperColourStyles} />
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

// The code face (JetBrains Mono) isn't preloaded: most first screens show no code. Fetch it once
// the first screen is up, so it is there before a code is, and never swaps in under a tap.
const fetchCodeFace = () => void document.fonts?.load('1em "VeilCore Mono"').catch(() => undefined);
if ('requestIdleCallback' in window) window.requestIdleCallback(fetchCodeFace, { timeout: 3000 });
else setTimeout(fetchCodeFace, 1500);
