// The words for a key's identity level (attesters.ts labIdentity; docs/lab-identity-levels.md):
// a title that names the level, and the sentences after it. LabIdentityBadge lays them out with
// the website and the listing as links; labIdentityText gives the same words as one line, for a
// test or anywhere a page has only text.
//
// The level is said in words, never by colour or an icon alone, and every level says what was
// seen and by whom. Nothing here says anything about the quality of a lab's work.
// SPDX-License-Identifier: Apache-2.0

import type { LabIdentity, LabIdentityLevel } from './attesters';
import type { AppKey } from '../i18n/app/en';
import { enT, type Translator } from '../i18n/translate';

/** How a level looks: caution and withdrawn are never drawn like a verified level. */
export type LabIdentityTone = 'caution' | 'website' | 'listing' | 'withdrawn';

export const labIdentityTone = (level: LabIdentityLevel): LabIdentityTone =>
  level === 'listing'
    ? 'listing'
    : level === 'website'
      ? 'website'
      : level === 'website-withdrawn' || level === 'listing-withdrawn'
        ? 'withdrawn'
        : 'caution';

/** An Alert around a signature takes the level's colour: never green for a key nobody verified. */
export const labIdentitySeverity = (level: LabIdentityLevel): 'success' | 'info' | 'warning' | 'error' => {
  const tone = labIdentityTone(level);
  return tone === 'listing' ? 'success' : tone === 'website' ? 'info' : tone === 'withdrawn' ? 'error' : 'warning';
};

/** One sentence: its key and its values. `domain` and `listing` are drawn as links. */
export type Part = { key: AppKey; vars?: Record<string, string> };

export type LabIdentityWords = { tone: LabIdentityTone; title: Part; body: Part[] };

const TITLE: Record<LabIdentityLevel, AppKey> = {
  none: 'app.labid.none.title',
  expired: 'app.labid.none.title',
  'listing-withdrawn': 'app.labid.listingWithdrawn.title',
  website: 'app.labid.website.title',
  'website-withdrawn': 'app.labid.websiteWithdrawn.title',
  listing: 'app.labid.listing.title',
};

export const labIdentityWords = (id: LabIdentity, tr: Translator = enT): LabIdentityWords => {
  const tone = labIdentityTone(id.level);
  const calls: Part = id.name ? { key: 'app.labid.calls', vars: { name: id.name } } : { key: 'app.labid.callsNone' };
  switch (id.level) {
    case 'none':
      return { tone, title: { key: TITLE.none }, body: [calls, { key: 'app.labid.none.body' }] };
    case 'expired':
      return { tone, title: { key: TITLE.expired }, body: [calls, { key: 'app.labid.expired.body' }] };
    case 'listing-withdrawn':
      return { tone, title: { key: TITLE[id.level] }, body: [calls, { key: 'app.labid.listingWithdrawn.body' }] };
    case 'website':
      return {
        tone,
        title: { key: TITLE.website },
        body: [
          { key: 'app.labid.website.body', vars: { domain: id.domain, date: id.date } },
          ...(id.listingWithdrawn ? [{ key: 'app.labid.website.unmarked' as AppKey }] : []),
          { key: 'app.signer.disclaimer' },
        ],
      };
    case 'website-withdrawn':
      return {
        tone,
        title: { key: TITLE[id.level] },
        body: [{ key: 'app.labid.websiteWithdrawn.body', vars: { domain: id.domain, date: id.date } }],
      };
    case 'listing': {
      const number = id.licenceNo
        ? tr.t(id.source === 'accreditation' ? 'app.signer.certificateNo' : 'app.signer.licenseNo', {
            no: id.licenceNo,
          })
        : '';
      return {
        tone,
        title: { key: TITLE.listing, vars: { listing: id.listing } },
        body: [
          { key: 'app.labid.listing.body', vars: { name: id.name ?? '', number, date: id.date, until: id.until } },
          ...(id.website
            ? [
                {
                  key: 'app.labid.listing.website' as AppKey,
                  vars: { domain: id.website.domain, date: id.website.date },
                },
              ]
            : []),
          { key: 'app.signer.disclaimer' },
        ],
      };
    }
  }
};

/** The level as one line of text: "Not verified — this key calls itself “Acme Labs”. …". */
export const labIdentityText = (id: LabIdentity, tr: Translator = enT): string => {
  const w = labIdentityWords(id, tr);
  return (
    tr.t(w.title.key, w.title.vars) +
    tr.t('app.labid.dash') +
    w.body.map((p) => tr.t(p.key, p.vars)).join(tr.t('app.signer.sep'))
  );
};

/** What a lab does next to reach the level above its own (its key screen). */
export type NextStep = { text: Part; action: 'website' | 'listing' | null };

export const labIdentityNext = (id: LabIdentity): NextStep => {
  switch (id.level) {
    case 'none':
      return { text: { key: 'app.labid.own.next.none' }, action: 'website' };
    case 'listing-withdrawn':
      return { text: { key: 'app.labid.own.next.listingWithdrawn' }, action: 'website' };
    case 'website':
      return { text: { key: 'app.labid.own.next.website' }, action: 'listing' };
    case 'expired':
      return { text: { key: 'app.labid.own.next.expired' }, action: 'listing' };
    case 'listing':
      return { text: { key: 'app.labid.own.next.listing', vars: { date: id.until } }, action: null };
    case 'website-withdrawn':
      return { text: { key: 'app.labid.own.next.websiteWithdrawn', vars: { domain: id.domain } }, action: null };
  }
};
