// The public pages' language picker and draft banner (LanguagePicker.tsx), loaded only when
// there is something to show. A site with one published language shows neither, and the
// picker is MUI's select (text field, menu, popover): about 30 KB a phone would download on
// every public page for nothing. With more than one language, or on a draft, they come
// straight after the page, in a space kept for the picker so the header does not move.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy } from 'react';
import { useI18n } from './index';

const Picker = lazy(() => import('./LanguagePicker').then((m) => ({ default: m.LanguagePicker })));
const Banner = lazy(() => import('./LanguagePicker').then((m) => ({ default: m.DraftBanner })));

/** The picker's own size (LanguagePicker: a small select, minWidth 92). */
const PICKER_SPACE: React.CSSProperties = { display: 'inline-block', minWidth: 92, height: 40 };

export const LanguagePicker: React.FC = () => {
  const { choices } = useI18n();
  if (choices.length < 2) return null;
  return (
    <Suspense fallback={<span style={PICKER_SPACE} aria-hidden="true" />}>
      <Picker />
    </Suspense>
  );
};

export const DraftBanner: React.FC = () => {
  const { isDraft } = useI18n();
  if (!isDraft) return null;
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
};
