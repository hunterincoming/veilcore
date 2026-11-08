// A lab's way in, at phone size (360px), against a stand-in registry: a breeder makes a lab
// code in one browser; a lab with a fresh browser lands on /, finds "Got a lab code or a link
// from someone?" in the hero, pastes the code and reaches the receive screen. It then
// receives the sample (saving its backup first, in the same dialog), gets the lab view, sets
// up its signing key from the plant's next step (the key screen puts "Continue" first and
// folds the optional name matching and the raw key away) and is shown "Sign that it arrived"
// at once.
//
// The stand-in keeps one registry for both browsers, as far as these screens need it: each
// holder's sealed rows, a delivery with its sealed offer and sample details, a claim that
// leaves a stub in the lab's set, and the lab's key listing.
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from 'node:crypto';
import { expect, test, type BrowserContext, type Route } from '@playwright/test';
import {
  API,
  REAL_REGISTRY,
  expectNoErrors,
  json,
  plainRowRefusal,
  saveAndCheckBackup,
  startPlant,
  watch,
} from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');
test.use({ viewport: { width: 360, height: 780 } });

const SITE = `http://127.0.0.1:${process.env.E2E_PORT ?? 4317}`;
const PROFILE = 'veilcore/profile/plant-variety/v1';

type Row = Record<string, unknown> & { id: string };
type Delivery = {
  id: string;
  claimCode: string;
  from: string;
  sourceRecord: string;
  toHandle: string;
  sealedOffer: unknown;
  sample?: unknown;
  arrival?: unknown;
  createdAt: number;
  claimedBy?: string;
  receivedRecord?: string;
};

/** One registry for every browser in the test: rows by holder key, deliveries by id. */
const registry = () => {
  const rows = new Map<string, Row[]>();
  const deliveries = new Map<string, Delivery>();
  const setOf = (holder: string) => rows.get(holder) ?? [];
  const put = (holder: string, sent: Row[]) => {
    const ids = new Set(sent.map((r) => r.id));
    rows.set(holder, [...sent, ...setOf(holder).filter((r) => !ids.has(r.id))]);
  };
  const hex = (n: number) => randomBytes(n).toString('hex');

  const handle = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const holder = req.headers()['x-holder-key'] ?? '';
    const body: unknown = (() => {
      try {
        return JSON.parse(req.postData() ?? 'null');
      } catch {
        return null;
      }
    })();
    const at = `${req.method()} ${url.pathname}`;
    let m: RegExpExecArray | null;
    if (at === 'GET /api/records') return json(route, 200, setOf(holder));
    if (at === 'PUT /api/records') {
      const refusal = plainRowRefusal(body);
      if (refusal) return json(route, 400, { error: refusal });
      put(holder, body as Row[]);
      return json(route, 200, { ok: true, count: (body as Row[]).length });
    }
    if (at === 'PUT /api/records/dating') {
      const sent = body as Row[];
      for (const r of sent) if (!setOf(holder).some((x) => x.id === r.id)) put(holder, [{ ...r, bodyPending: true }]);
      return json(route, 200, { ok: true, dated: sent.map((r) => r.id) });
    }
    if (at === 'GET /api/licenses') return json(route, 200, []);
    if (at === 'PUT /api/licenses') return json(route, 200, { ok: true });
    if (at === 'GET /api/disclosures') return json(route, 200, []);
    if (/^GET \/attestations\/subject\//.test(at)) return json(route, 200, { attestations: [] });
    if (at === 'POST /attesters') return json(route, 200, { attesterId: `ATT-${hex(8)}` });
    if (at === 'GET /transfers/sent') {
      const sent = [...deliveries.values()]
        .filter((d) => d.from === holder)
        .map((d) => ({
          id: d.id,
          source_record: d.sourceRecord,
          to_handle: d.toHandle,
          created_at: d.createdAt,
          claimed_at: d.claimedBy ? Date.now() : null,
          received_record: d.receivedRecord ?? null,
          receipt_attestation_id: null,
          sample_custody: d.sample ?? null,
        }));
      return json(route, 200, { transfers: sent, total: sent.length, limit: 500, offset: 0 });
    }
    if (at === 'POST /transfers') {
      const b = body as { sourceRecord: string; toHandle: string; sealedOffer: unknown };
      const d: Delivery = {
        id: `TR-${hex(4).toUpperCase()}`,
        claimCode: hex(16),
        from: holder,
        sourceRecord: b.sourceRecord,
        toHandle: b.toHandle,
        sealedOffer: b.sealedOffer,
        createdAt: Date.now(),
      };
      deliveries.set(d.id, d);
      return json(route, 200, {
        transferId: d.id,
        sourceRecord: d.sourceRecord,
        toHandle: d.toHandle,
        claimCode: d.claimCode,
      });
    }
    if ((m = /^(GET|POST) \/transfers\/(TR-[0-9A-F]{8})\/custody$/.exec(at))) {
      const d = deliveries.get(m[2]);
      if (!d || (holder !== d.from && holder !== d.claimedBy)) return json(route, 404, { error: 'not found' });
      if (m[1] === 'POST') {
        const b = body as { sample?: unknown; arrival?: unknown };
        if (b.sample) d.sample = b.sample;
        if (b.arrival) d.arrival = b.arrival;
      }
      return json(route, 200, {
        transferId: d.id,
        ...(d.sample ? { sample: d.sample } : {}),
        ...(d.arrival ? { arrival: d.arrival } : {}),
      });
    }
    if ((m = /^POST \/transfers\/(TR-[0-9A-F]{8})\/claim$/.exec(at))) {
      const d = deliveries.get(m[1]);
      if (!d || (body as { claimCode?: string })?.claimCode !== d.claimCode)
        return json(route, 400, { error: 'claim code does not match' });
      if (d.claimedBy) return json(route, 409, { error: 'this transfer has already been claimed' });
      const source = setOf(d.from).find((r) => r.id === d.sourceRecord);
      const parentCommitment = String(source?.recordFingerprint ?? '');
      const recordId = `VEIL-${hex(16).toUpperCase()}`;
      d.claimedBy = holder;
      d.receivedRecord = recordId;
      put(holder, [
        {
          id: recordId,
          profile: PROFILE,
          receivedFrom: d.sourceRecord,
          receivedFromCommitment: parentCommitment,
          receivedAt: Date.now(),
          transferId: d.id,
        },
      ]);
      return json(route, 200, {
        recordId,
        descendedFrom: d.sourceRecord,
        parentCommitment,
        needsSealing: true,
        offerSealed: d.sealedOffer,
        ...(d.sample ? { sample: d.sample } : {}),
      });
    }
    if ((m = /^GET \/transfers\/(TR-[0-9A-F]{8})\/offer$/.exec(at))) {
      const d = deliveries.get(m[1]);
      if (!d || d.claimedBy !== holder) return json(route, 404, { error: 'not found' });
      return json(route, 200, { transferId: d.id, offerSealed: d.sealedOffer });
    }
    return json(route, 404, { error: 'not in the test registry' });
  };

  /** Nothing leaves the machine: the site, and the registry above; everything else refused. */
  const attach = (ctx: BrowserContext) =>
    ctx.route('**/*', (route) => {
      const origin = new URL(route.request().url()).origin;
      if (origin === SITE) return route.continue();
      if (origin === new URL(API).origin) return handle(route);
      return route.abort();
    });
  return { attach, rows: setOf };
};

test('a fresh browser lands on /, finds the lab path, pastes a lab code and receives the sample', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const reg = registry();

  // The breeder, in its own browser: log a plant, save the backup, make a code for a lab.
  const breederCtx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await reg.attach(breederCtx);
  const breeder = await breederCtx.newPage();
  const breederErrors = watch(breeder);
  await breeder.goto('/records');
  await breeder.getByText('Start', { exact: true }).click();
  await startPlant(breeder);
  await breeder.getByLabel(/Plant or line name/).fill(`Lab entry ${Date.now()}`);
  await breeder.getByLabel(/Bred by/).fill('E2E');
  await breeder.getByRole('button', { name: /Next: check it/ }).click();
  await breeder.getByRole('button', { name: /Seal it/ }).click();
  await breeder.getByRole('button', { name: /Do the date stamp later/ }).click({ timeout: 90_000 });
  const recordId = await breeder.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}') as object)[0],
  );
  await breeder.getByRole('button', { name: /No report yet: skip/ }).click();
  await saveAndCheckBackup(breeder);
  const breederKey = await breeder.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');
  await expect
    .poll(() => reg.rows(breederKey).some((r) => r.id === recordId && !!r.sealed && !r.bodyPending), {
      timeout: 30_000,
    })
    .toBe(true);
  await breeder.goto(`/record/${recordId}`);
  await breeder.getByText('Send it to a lab or breeder').click();
  await breeder.getByLabel(/Who are you sending it to/).fill('lab@e2e');
  await breeder.getByRole('button', { name: /Make a code for the lab/ }).click();
  const codeEl = breeder.getByText(/^TR-[0-9A-F]{8}\./);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  expect(code).toMatch(/^TR-[0-9A-F]{8}\.[0-9a-f]{32}\.age1[0-9a-z]{58}\.o1[A-Za-z0-9_-]{43}$/);

  // The lab: a fresh browser on the landing page. The way in is in the hero, on screen at 360px.
  const labCtx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await reg.attach(labCtx);
  const lab = await labCtx.newPage();
  const labErrors = watch(lab);
  await lab.goto('/');
  const entry = lab.locator('[data-paste-entry="hero"]');
  await expect(entry).toHaveText('Paste it here →');
  await expect(lab.getByText('Got a lab code or a link from someone?')).toBeVisible();
  await expect(entry).toBeInViewport();
  // The bottom section offers it too, beside "Make a record" and "Verify a record".
  await expect(lab.locator('[data-paste-entry="demo"]')).toContainText('Got a code or link?');
  await entry.click();

  // Home leads with the paste box, as the page's heading, with the field focused.
  await expect(lab).toHaveURL(/\/records\?paste$/);
  await expect(lab.getByRole('heading', { level: 1, name: 'Someone sent you a code or link?' })).toBeVisible();
  const box = lab.getByLabel('Someone sent you a code or link?');
  await expect(box).toBeFocused();
  await expect(box).toBeInViewport();
  await expect(lab.getByRole('link', { name: /Nothing to paste\? Make a record/ })).toBeVisible();
  await box.fill(code);
  await lab.getByRole('button', { name: /^Go$/ }).click();

  // The receive screen, with the code already in it.
  const dialog = lab.getByRole('dialog', { name: 'Receive material' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Lab code')).toHaveValue(code);

  // A first visit: the backup comes first, in the same dialog, then back to the same code.
  await dialog.getByRole('button', { name: /Receive it/ }).click();
  await expect(dialog.locator('[data-backup-first]')).toBeVisible();
  await dialog.getByRole('button', { name: /Save my backup/ }).click();
  await saveAndCheckBackup(lab);
  await dialog.getByRole('button', { name: /Back to the code/ }).click();
  await expect(dialog.getByLabel('Lab code')).toHaveValue(code);
  await dialog.getByRole('button', { name: /Receive it/ }).click();

  // Received: the plant's page, the lab view from now on, and the next step is the lab's key.
  await expect(lab).toHaveURL(/\/record\/VEIL-/, { timeout: 30_000 });
  expect(await lab.evaluate(() => localStorage.getItem('veilcore.role.v1'))).toBe('lab');
  await expect(lab.getByRole('heading', { name: 'Set up your lab’s signature' })).toBeVisible();
  await lab.getByRole('button', { name: 'Set it up' }).first().click();
  const keyDialog = lab.getByRole('dialog', { name: /signing key/ });
  await keyDialog.getByLabel(/^Name/).fill('E2E Lab');
  await keyDialog.getByRole('button', { name: /Create my key/ }).click();

  // The key screen: ready, "Continue" first; the name matching and the raw key folded away.
  await expect(keyDialog.locator('[data-lab-key-ready]')).toBeVisible();
  await expect(keyDialog.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(keyDialog.getByText(/We match the name; we don't vouch for your work\./)).toBeHidden();
  await expect(keyDialog.getByText(/\/\.well-known\/veilcore-lab\.json/)).toBeHidden();
  await expect(keyDialog.getByText(/_veilcore-lab\./)).toBeHidden();
  const pub = await lab.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('veilcore.attester.v1') ?? '{}') as { keypair?: { publicKey?: string } }).keypair
        ?.publicKey ?? '',
  );
  expect(pub).toMatch(/^[0-9a-f]{40,}$/);
  await expect(keyDialog.getByText(pub, { exact: true })).toBeHidden();
  await keyDialog.getByRole('button', { name: /optional, do it once/ }).click();
  await expect(keyDialog.getByText(/We match the name; we don't vouch for your work\./)).toBeVisible();
  await expect(keyDialog.getByText(/\/\.well-known\/veilcore-lab\.json/)).toBeVisible();
  await expect(keyDialog.getByText(/_veilcore-lab\./)).toBeHidden();
  await keyDialog.getByRole('button', { name: 'Other ways' }).click();
  await expect(keyDialog.getByText(/_veilcore-lab\./)).toBeVisible();
  await keyDialog.getByRole('button', { name: 'Show key' }).click();
  await expect(keyDialog.getByText(pub, { exact: true })).toBeVisible();
  await expect(keyDialog.getByRole('button', { name: 'Copy key' })).toBeVisible();
  await keyDialog.getByRole('button', { name: 'Continue' }).click();

  // Straight back to the plant, whose next step is now signing that the sample arrived.
  await expect(lab.getByRole('heading', { name: 'Sign that it arrived' })).toBeVisible();
  await lab.goto('/records');
  await expect(lab.getByRole('heading', { level: 1, name: 'Samples received' })).toBeVisible();

  expectNoErrors(breederErrors);
  expectNoErrors(labErrors);
  await breederCtx.close();
  await labCtx.close();
});
