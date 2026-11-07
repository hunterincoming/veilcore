// veilcore-mcp (../src): the protocol by hand, the three tools, what each answer leaves out, and
// the built server spoken to over stdio as an assistant would.
// Run: npx vitest run mcp/test/mcp.test.ts (from partner-kit)
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the stand-ins replace fetch */
import { createHash } from 'node:crypto';
import { buildBatch } from 'veilcore-records';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSIONS, handle, handleLine, type Response } from '../src/server';
import { DOCUMENT_PROFILE, MAX_BATCH, MAX_DOCUMENT_FILES, TOOLS, draftLink } from '../src/tools';

const here = path.dirname(fileURLToPath(import.meta.url));
const call = (name: string, args: Record<string, unknown>, ctx = {}) =>
  handle({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } }, ctx) as Promise<Response>;
const resultOf = (r: Response) =>
  r.result as { isError: boolean; structuredContent?: Record<string, unknown>; content: { text: string }[] };

describe('the protocol', () => {
  it('initialize names the server and the version both sides speak', async () => {
    const r = await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
    expect(r?.result).toMatchObject({
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'veilcore-mcp' },
    });
    const newer = await handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '2099-01-01' },
    });
    expect((newer?.result as { protocolVersion: string }).protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it('lists exactly the three tools, each read-only', async () => {
    const r = await handle({ jsonrpc: '2.0', id: 'a', method: 'tools/list' });
    const tools = (r?.result as { tools: { name: string; annotations: { readOnlyHint: boolean } }[] }).tools;
    expect(tools.map((t) => t.name)).toEqual(['check_record', 'check_document', 'draft_link']);
    for (const t of tools) expect(t.annotations.readOnlyHint).toBe(true);
    // Never "ownership": a record shows prior possession.
    expect(JSON.stringify(TOOLS)).not.toMatch(/\b(owns|owner|ownership)\b/i);
  });

  it('notifications get no answer; bad input gets JSON-RPC errors', async () => {
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined();
    expect(await handleLine('{not json')).toBe(
      '{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}',
    );
    expect((await handle({ jsonrpc: '2.0', id: 3, method: 'resources/list' }))?.error?.code).toBe(-32601);
    expect((await handle([{ jsonrpc: '2.0', id: 4, method: 'ping' }]))?.error?.code).toBe(-32600);
    expect((await handle({ jsonrpc: '2.0', id: 5, method: 'ping' }))?.result).toEqual({});
    expect((await call('hash_file', { path: '/etc/passwd' })).error?.code).toBe(-32602);
  });
});

describe('draft_link', () => {
  it('makes the link the site reads: kind, preset and count only', async () => {
    const r = resultOf(await call('draft_link', { kind: 'animal', preset: 'offspring', count: 3 }));
    // The same string the site's ask/handoff-batch.test.ts reads back.
    expect(r.structuredContent).toEqual({
      link: 'https://veilcore.org/new#draft=kind=animal&preset=offspring&count=3',
    });
    expect(draftLink('https://veilcore.org', 'plant', 'clones', 9999)).toBe(
      `https://veilcore.org/new#draft=kind=plant&preset=clones&count=${MAX_BATCH}`,
    );
    expect(draftLink('https://veilcore.org', 'plant', 'record', 5)).toBe(
      'https://veilcore.org/new#draft=kind=plant&preset=record',
    );
  });

  it('refuses what the site would not take, as a tool error the assistant can read', async () => {
    for (const args of [
      { kind: 'plant', preset: 'offspring' },
      { kind: 'animal', preset: 'clones' },
      { kind: 'document', preset: 'record' },
      { kind: 'plant', preset: 'clones', count: 2.5 },
    ]) {
      const r = resultOf(await call('draft_link', args));
      expect(r.isError, JSON.stringify(args)).toBe(true);
    }
  });
});

describe('check_document', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'veilcore-mcp-'));
  const sealedFile = path.join(dir, 'permit.pdf');
  const otherFile = path.join(dir, 'other.pdf');
  writeFileSync(sealedFile, 'a practice permit, test data');
  writeFileSync(otherFile, 'something else');
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');
  const link = (fields: Record<string, unknown>) =>
    `https://veilcore.org/check-document#d=${Buffer.from(JSON.stringify({ v: 1, fields })).toString('base64url')}`;
  const doc = link({
    profile: DOCUMENT_PROFILE,
    title: 'Practice permit',
    files: [{ name: 'permit.pdf', sha256: sha('a practice permit, test data'), size: 28 }],
  });

  // The folder the server may read: the test files' own folder (VEILCORE_MCP_ROOT would be it).
  const inDir = { root: dir };

  it('says yes or no, and nothing else', async () => {
    const yes = resultOf(await call('check_document', { link: doc, path: sealedFile }, inDir));
    expect(yes.structuredContent).toEqual({ match: true });
    const no = resultOf(await call('check_document', { link: doc, path: otherFile }, inDir));
    expect(no.structuredContent).toEqual({ match: false });
    // The answer carries no hash, name or size.
    expect(yes.content[0].text).toBe('{"match":true}');
  });

  it('with no folder set, reads only under the folder the server was started in (never anywhere)', async () => {
    // The test files sit in the system temp folder, outside the working directory.
    const outside = resultOf(await call('check_document', { link: doc, path: sealedFile }));
    expect(outside.isError).toBe(true);
    expect(outside.content[0].text).toMatch(/outside the folder/);
    const here = mkdtempSync(path.join(process.cwd(), '.mcp-test-'));
    try {
      const mine = path.join(here, 'permit.pdf');
      writeFileSync(mine, 'a practice permit, test data');
      expect(resultOf(await call('check_document', { link: doc, path: mine })).structuredContent).toEqual({
        match: true,
      });
      expect(
        resultOf(await call('check_document', { link: doc, path: path.relative(process.cwd(), mine) }))
          .structuredContent,
      ).toEqual({ match: true });
    } finally {
      rmSync(here, { recursive: true, force: true });
    }
  });

  it('refuses links to other files, system pseudo-files, and files outside the allowed folder', async () => {
    const link2 = path.join(dir, 'link.pdf');
    symlinkSync(sealedFile, link2);
    const viaLink = resultOf(await call('check_document', { link: doc, path: link2 }, inDir));
    expect(viaLink.isError).toBe(true);
    expect(viaLink.content[0].text).toMatch(/link to another file/);
    for (const p of ['/proc/self/status', '/proc/self/environ', '/dev/null', '/sys/kernel/mm'])
      for (const ctx of [inDir, { root: '/' }])
        expect(resultOf(await call('check_document', { link: doc, path: p }, ctx)).isError, p).toBe(true);
    const elsewhere = mkdtempSync(path.join(tmpdir(), 'veilcore-mcp-root-'));
    const outside = resultOf(await call('check_document', { link: doc, path: sealedFile }, { root: elsewhere }));
    expect(outside.isError).toBe(true);
    expect(outside.content[0].text).toMatch(/outside the folder/);
    const insideRoot = resultOf(await call('check_document', { link: doc, path: sealedFile }, inDir));
    expect(insideRoot.structuredContent).toEqual({ match: true });
    // Relative paths that climb out of the root are judged where they land.
    const climb = path.relative(process.cwd(), path.join(elsewhere, '..', path.basename(dir), 'permit.pdf'));
    expect(resultOf(await call('check_document', { link: doc, path: climb }, { root: elsewhere })).isError).toBe(true);
  });

  it('refuses a link that says where to look for the file (a planted link is not a file oracle)', async () => {
    const files = [{ name: 'permit.pdf', sha256: sha('a practice permit, test data'), size: 28 }];
    const planted = [
      link({ profile: DOCUMENT_PROFILE, files, path: '~/Documents/permit.pdf' }),
      link({ profile: DOCUMENT_PROFILE, files, folder: '/home/me' }),
      link({ profile: DOCUMENT_PROFILE, files: [{ ...files[0], path: '/etc/passwd' }] }),
      link({ profile: DOCUMENT_PROFILE, files: [{ ...files[0], name: '../../etc/passwd' }] }),
      link({ profile: DOCUMENT_PROFILE, files: [{ ...files[0], name: 'C:\\Users\\me\\permit.pdf' }] }),
      `${doc}&path=${encodeURIComponent(sealedFile)}`,
      doc.replace('#d=', `?file=${encodeURIComponent(sealedFile)}#d=`),
    ];
    for (const l of planted) {
      const r = resultOf(await call('check_document', { link: l, path: sealedFile }, inDir));
      expect(r.isError, l).toBe(true);
      expect(r.content[0].text, l).toMatch(/says where to look/);
    }
    // The link's own suggestion is never read: the answer for the honest link is unchanged.
    expect(resultOf(await call('check_document', { link: doc, path: sealedFile }, inDir)).structuredContent).toEqual({
      match: true,
    });
  });

  it('refuses a link listing more than a document has', async () => {
    const many = link({
      profile: DOCUMENT_PROFILE,
      files: Array.from({ length: MAX_DOCUMENT_FILES + 1 }, (_, i) => ({
        name: `f${i}`,
        sha256: sha(String(i)),
        size: 1,
      })),
    });
    const r = resultOf(await call('check_document', { link: many, path: sealedFile }, inDir));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/too many files/);
  });

  it('refuses a link that is not a document’s; a path with no plain file answers like a file that doesn’t match', async () => {
    expect(
      resultOf(await call('check_document', { link: 'https://veilcore.org/verify/VEIL-1', path: sealedFile }, inDir))
        .isError,
    ).toBe(true);
    expect(
      resultOf(await call('check_document', { link: link({ profile: 'x', files: [] }), path: sealedFile }, inDir))
        .isError,
    ).toBe(true);
    // Whether a path exists is never told apart from "no match" (S3).
    const no = resultOf(await call('check_document', { link: doc, path: otherFile }, inDir));
    for (const p of [dir, path.join(dir, 'missing')]) {
      const r = resultOf(await call('check_document', { link: doc, path: p }, inDir));
      expect(r.isError, p).toBe(false);
      expect(r.structuredContent, p).toEqual(no.structuredContent);
      expect(r.content[0].text, p).toBe(no.content[0].text);
    }
  });
});

describe('check_record', () => {
  const ID = `VEIL-${'A'.repeat(32)}`;
  it('asks only the registry, only the record’s public routes, and says what it found', async () => {
    const asked: string[] = [];
    const fetch = (async (url: string | URL) => {
      asked.push(String(url));
      return new Response(JSON.stringify({ found: false }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof globalThis.fetch;
    const r = resultOf(
      await call(
        'check_record',
        { link: `https://veilcore.org/verify/${ID}` },
        { registry: 'https://registry.test', fetch },
      ),
    );
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      acceptable: false,
      nothingContradicts: false,
      datedOnChain: false,
      check: { recordId: ID, recordExists: false },
    });
    expect(r.structuredContent?.missing).toContain('the registry does not have this record');
    expect(asked.length).toBeGreaterThan(0);
    for (const u of asked) expect(u.startsWith('https://registry.test/')).toBe(true);
  });

  it('acceptable only when nothing contradicts the record AND its date was checked on Midnight (S2)', async () => {
    // A record in a batch the registry says is dated on mainnet, as the registry serves it.
    const fp = createHash('sha256').update('a practice record').digest('hex');
    const batch = await buildBatch([fp, createHash('sha256').update('another').digest('hex')], 'B-20261101-MCP');
    const anchor = {
      chain: 'midnight',
      network: 'mainnet',
      contractAddress: 'a0'.repeat(32),
      txHash: 'c1'.repeat(32),
      blockHeight: 1000,
      anchoredAt: '2026-11-01T10:00:00.000Z',
      testNetwork: false,
    };
    const proof = { ...batch.proofs[fp], anchor };
    const registry = (inBatch: boolean) =>
      (async (url: string | URL) => {
        const u = new URL(String(url));
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
        if (u.pathname.startsWith('/verify/'))
          return json({ found: true, id: ID, recordFingerprint: fp, keyBound: true });
        if (u.pathname.startsWith('/proof/')) return inBatch ? json(proof) : json({ error: 'not in a batch' }, 404);
        if (u.pathname.startsWith('/attestations/subject/'))
          return json({ attestations: [], total: 0, limit: 100, offset: 0 });
        return json({ error: 'not found' }, 404);
      }) as typeof globalThis.fetch;
    const link = `https://veilcore.org/verify/${ID}?fp=${fp}`;
    const sc = async (inBatch: boolean, checkAnchor: unknown) =>
      resultOf(await call('check_record', { link }, { fetch: registry(inBatch), checkAnchor })).structuredContent!;
    const confirms = async () => ({ status: 'checked', blockHeight: 1000, blockTime: 1_761_991_200_000 });
    const cantReach = async () => ({ status: 'unreachable', reason: 'no indexer here' });
    const denies = async () => ({ status: 'not-confirmed', reason: 'that transaction wrote another root' });

    // Checked on Midnight, nothing contradicts it: the one answer that is acceptable.
    const ok = await sc(true, confirms);
    expect(ok).toMatchObject({ acceptable: true, nothingContradicts: true, datedOnChain: true, missing: [] });
    // Not in a batch: no date at all.
    const none = await sc(false, confirms);
    expect(none).toMatchObject({ acceptable: false, nothingContradicts: true, datedOnChain: false });
    expect(none.missing).toContain('not in a batch yet, so the record has no date');
    // The registry reports a date but the look-up can't be made: still not acceptable, and said.
    const unreached = await sc(true, cantReach);
    expect(unreached).toMatchObject({ acceptable: false, nothingContradicts: true, datedOnChain: false });
    expect(String(unreached.missing)).toMatch(/could not be looked up on Midnight: no indexer here/);
    // The chain denies the registry's report: contradicted.
    const denied = await sc(true, denies);
    expect(denied).toMatchObject({ acceptable: false, nothingContradicts: false, datedOnChain: false });
    expect(String(denied.missing)).toMatch(/not confirmed on Midnight/);
    // Never "acceptable" for a date only the registry reports (no look-up at all).
    const reported = resultOf(
      await call('check_record', { link }, { fetch: registry(true), checkAnchor: undefined, chain: undefined }),
    ).structuredContent!;
    expect(reported.acceptable).toBe(false);
    expect(reported.datedOnChain).toBe(false);
  });

  it('a registry it can’t reach, or a link that names no record, is a tool error', async () => {
    const down = (async () => Promise.reject(new TypeError('fetch failed'))) as typeof globalThis.fetch;
    const r = resultOf(await call('check_record', { link: `https://veilcore.org/verify/${ID}` }, { fetch: down }));
    expect(r.isError).toBe(true);
    // "hello" alone is a valid bare record id, so it would reach the registry: use text that
    // names no record, and a fetch that fails, so the test never touches the network.
    expect(resultOf(await call('check_record', { link: 'not a check link' }, { fetch: down })).isError).toBe(true);
    expect(resultOf(await call('check_record', { link: 'https://veilcore.org/about' }, { fetch: down })).isError).toBe(
      true,
    );
  });
});

describe('the built server, over stdio', () => {
  it('answers an assistant line by line', async () => {
    const out = path.join(here, '..', '.test-dist');
    execFileSync(process.execPath, [path.join(here, '..', 'scripts', 'build.mjs'), out]);
    const child = spawn(process.execPath, [path.join(out, 'veilcore-mcp.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const lines: string[] = [];
    let buf = '';
    child.stdout.on('data', (c: Buffer) => {
      buf += c.toString('utf8');
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      lines.push(...parts.filter(Boolean));
    });
    const send = (m: unknown) => child.stdin.write(`${JSON.stringify(m)}\n`);
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'draft_link', arguments: { kind: 'plant', preset: 'clones', count: 12 } },
    });
    const deadline = Date.now() + 20_000;
    while (lines.length < 3 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
    child.stdin.end();
    await new Promise((r) => child.on('exit', r));
    rmSync(out, { recursive: true, force: true });
    const answers = lines.map((l) => JSON.parse(l) as Response);
    expect(answers.map((a) => a.id)).toEqual([1, 2, 3]);
    expect((answers[0].result as { serverInfo: { name: string } }).serverInfo.name).toBe('veilcore-mcp');
    expect((answers[2].result as { structuredContent: { link: string } }).structuredContent.link).toBe(
      'https://veilcore.org/new#draft=kind=plant&preset=clones&count=12',
    );
  });
});
