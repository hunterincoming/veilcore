// veilcore-mcp (../src): the protocol by hand, the three tools, what each answer leaves out, and
// the built server spoken to over stdio as an assistant would.
// Run: npx vitest run mcp/test/mcp.test.ts (from partner-kit)
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the stand-ins replace fetch */
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSIONS, handle, handleLine, type Response } from '../src/server';
import { DOCUMENT_PROFILE, MAX_BATCH, TOOLS, draftLink } from '../src/tools';

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

  it('says yes or no, and nothing else', async () => {
    const yes = resultOf(await call('check_document', { link: doc, path: sealedFile }));
    expect(yes.structuredContent).toEqual({ match: true });
    const no = resultOf(await call('check_document', { link: doc, path: otherFile }));
    expect(no.structuredContent).toEqual({ match: false });
    // The answer carries no hash, name or size.
    expect(yes.content[0].text).toBe('{"match":true}');
  });

  it('refuses a link that is not a document’s, and a path that is not a file', async () => {
    expect(
      resultOf(await call('check_document', { link: 'https://veilcore.org/verify/VEIL-1', path: sealedFile })).isError,
    ).toBe(true);
    expect(
      resultOf(await call('check_document', { link: link({ profile: 'x', files: [] }), path: sealedFile })).isError,
    ).toBe(true);
    expect(resultOf(await call('check_document', { link: doc, path: dir })).isError).toBe(true);
    expect(resultOf(await call('check_document', { link: doc, path: path.join(dir, 'missing') })).isError).toBe(true);
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
    expect(r.structuredContent).toMatchObject({ acceptable: false, check: { recordId: ID, recordExists: false } });
    expect(asked.length).toBeGreaterThan(0);
    for (const u of asked) expect(u.startsWith('https://registry.test/')).toBe(true);
  });

  it('a registry it can’t reach, or a link that names no record, is a tool error', async () => {
    const down = (async () => Promise.reject(new TypeError('fetch failed'))) as typeof globalThis.fetch;
    const r = resultOf(await call('check_record', { link: `https://veilcore.org/verify/${ID}` }, { fetch: down }));
    expect(r.isError).toBe(true);
    expect(resultOf(await call('check_record', { link: 'hello' })).isError).toBe(true);
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
