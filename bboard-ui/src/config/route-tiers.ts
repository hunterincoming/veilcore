// Every page's tier: THE list of where each page belongs (docs/complexity-budget.md). A new
// <Route> in App.tsx fails route-tiers.test.ts until it is listed here, so a page can't appear
// without someone deciding where it goes.
//
//   core      on the path a first-time person walks, or a link they are sent: Home, making a
//             record, the record page, checking, getting records back.
//   role      for one kind of user, who opts in or arrives by a link meant for them: a lab,
//             licensing and royalties, collections and compliance.
//   advanced  everything else: reference pages, technical tools, the public site's back pages.
//
// The tier records the decision. It does not hide anything by itself: some role and advanced
// pages are still linked from default screens today, and the budget (complexity-budget.json)
// counts what those screens really show. A page moves up to core only with Hunter's OK, and the
// number of core pages is held in complexity-budget.json ("coreRoutes"), which only goes down.
// SPDX-License-Identifier: Apache-2.0

export type Tier = 'core' | 'role' | 'advanced';
export type Role = 'lab' | 'licensing' | 'collections';

export type RouteTier = { tier: 'core' | 'advanced' } | { tier: 'role'; role: Role };

/** Keyed by the exact `path` of each <Route> in App.tsx. */
export const ROUTE_TIERS: Record<string, RouteTier> = {
  // ---- core ----
  '/': { tier: 'core' },
  '/records': { tier: 'core' },
  '/new': { tier: 'core' },
  '/record/:id': { tier: 'core' },
  '/prove/:id': { tier: 'core' },
  '/verify': { tier: 'core' },
  '/verify/:id': { tier: 'core' },
  '/restore': { tier: 'core' },
  '/backup': { tier: 'core' },
  '/settings': { tier: 'core' },
  '/help': { tier: 'core' },

  // ---- role: a lab ----
  // A lab's way in from the site ("For labs"): the lab view and its signing key (lab/LabDoor.tsx).
  '/for-labs': { tier: 'role', role: 'lab' },
  '/lab/results': { tier: 'role', role: 'lab' },
  '/check-lab-result': { tier: 'role', role: 'lab' },

  // ---- role: licensing and royalties ----
  '/licenses': { tier: 'role', role: 'licensing' },
  '/record/:id/license': { tier: 'role', role: 'licensing' },
  '/license/:id': { tier: 'role', role: 'licensing' },
  '/license/:id/sign': { tier: 'role', role: 'licensing' },
  '/license-invite/:id': { tier: 'role', role: 'licensing' },
  '/prove-license/:id': { tier: 'role', role: 'licensing' },
  '/claim': { tier: 'role', role: 'licensing' },
  '/lender': { tier: 'role', role: 'licensing' },

  // ---- role: collections and compliance ----
  '/records/import': { tier: 'role', role: 'collections' },
  '/records/authority-pack': { tier: 'role', role: 'collections' },
  '/records/labels': { tier: 'role', role: 'collections' },
  '/intake': { tier: 'role', role: 'collections' },
  '/intake/send': { tier: 'role', role: 'collections' },

  // ---- advanced ----
  '/documents/new': { tier: 'advanced' },
  '/check-document': { tier: 'advanced' },
  '/check-claim': { tier: 'advanced' },
  '/verify/example': { tier: 'advanced' },
  '/ask/job/:id': { tier: 'advanced' },
  '/docs/:doc': { tier: 'advanced' },
  '/implementations': { tier: 'advanced' },
  '/how-it-works': { tier: 'advanced' },
  '/founders': { tier: 'advanced' },
  '/about': { tier: 'advanced' },
  '/privacy': { tier: 'advanced' },
  '/terms': { tier: 'advanced' },
  '/status': { tier: 'advanced' },
  '/faq': { tier: 'advanced' },
  '/contact': { tier: 'advanced' },
  '/check-this-site': { tier: 'advanced' },
  '/partners': { tier: 'advanced' },
  // The browser tests' own page; not in a real build (VITE_E2E_FIXTURES).
  '/e2e/royalty-pay': { tier: 'advanced' },
  // Anything else: the not-found page.
  '*': { tier: 'advanced' },
};
