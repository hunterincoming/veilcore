// What every browser test needs: a page that fails on any script error, no real network,
// and (when no real registry is given) a small stand-in registry in the test itself.
// SPDX-License-Identifier: Apache-2.0
import { expect, type Page, type Route } from '@playwright/test';

/** The registry the build was made for (e2e:build): a real one, or the stand-in address. */
export const API = (process.env.E2E_API_BASE ?? 'http://registry.e2e.invalid').replace(/\/$/, '');
export const REAL_REGISTRY = !!process.env.E2E_API_BASE;
const SITE = `http://127.0.0.1:${process.env.E2E_PORT ?? 4317}`;

/** Collect script errors; the test fails on any at the end (`expectNoErrors`). */
export const watch = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    // A refused request (the network is blocked on purpose) is logged by the browser
    // itself; the page's own handling of it is what the tests check.
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_|ERR_FAILED/.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });
  return errors;
};
export const expectNoErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([]);

export type Handler = (route: Route, url: URL, body: unknown) => Promise<void> | void;
export const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Nothing leaves the machine except to the site and (if given) the real registry. The
 * Midnight network, the sponsor and fonts are refused, so a test can never spend, send or
 * depend on anything outside. Registry calls go to `handlers` (path → handler) when no real
 * registry is given; anything unhandled answers 404.
 */
export const isolate = async (page: Page, handlers: Record<string, Handler> = {}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === SITE) return route.continue();
    if (url.origin === new URL(API).origin) {
      if (REAL_REGISTRY) return route.continue();
      const raw = route.request().postData();
      let body: unknown = undefined;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        body = raw;
      }
      const key = `${route.request().method()} ${url.pathname.replace(/\/PR-[0-9A-F]{32}/, '/:id').replace(/\/VEIL-[0-9A-F]+/, '/:record')}`;
      const h = handlers[key];
      if (h) return h(route, url, body);
      return json(route, 404, { error: 'not in the test registry' });
    }
    return route.abort();
  });
};
