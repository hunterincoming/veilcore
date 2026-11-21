// The record app's frame (App.tsx AppLayout): loaded with the app's pages, not with the
// public site. One file, so the frame arrives in one request.
// SPDX-License-Identifier: Apache-2.0
export { RolePicker } from './components/RolePicker';
export { SaveProblemBar } from './components/SaveProblemBar';
// Ask VeilCore's button (the sheet is fetched when it is pressed).
export { AskLauncher } from './components/ask/AskLauncher';
// The network badge the one header (SiteHeader.tsx) carries on the app's pages, and the
// footer's "change view".
export { NetworkBadge } from './components/veilcore/WalletBadge';
export { RoleChangeLink } from './components/RoleChangeLink';
// The view in the header (Breeder, Lab or Both), on every app page.
export { ViewSwitch } from './components/ViewSwitch';
// Records saved with VeilCore: saved by themselves, and the first-run sheet (easy mode step 2).
export { AccountKeeper } from './components/flow/KeepSafe';
// No signal, or a newer version ready (docs/offline.md).
export { OfflineBar } from './components/offline/OfflineBar';
