// veilcore-mcp: a Model Context Protocol server over stdio, written by hand (JSON-RPC 2.0, one
// message per line), so it needs no SDK and adds no dependency. It answers initialize, ping,
// tools/list and tools/call; anything else is "method not found". Notifications get no answer.
// SPDX-License-Identifier: Apache-2.0

import { RegistryError } from '../../record-check/src/check.js';
import { LinkError } from '../../record-check/src/link.js';
import { TOOLS, ToolInputError, callTool, type ToolContext } from './tools.js';

export const SERVER_NAME = 'veilcore-mcp';
export const SERVER_VERSION = '0.1.0';
/** Protocol versions this server speaks, newest first; a client's own is used when it is one of these. */
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;

const INSTRUCTIONS =
  'VeilCore dates records of plant and animal genetics on Midnight. These tools check a record or a document from a link someone shared, and make a link that opens the logging screen. They never save, sign or send anything, and never read a record’s private contents. A record shows prior possession by a date.';

type Id = string | number | null;
type Message = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
export type Response = { jsonrpc: '2.0'; id: Id; result?: unknown; error?: { code: number; message: string } };

const ok = (id: Id, result: unknown): Response => ({ jsonrpc: '2.0', id, result });
const fail = (id: Id, code: number, message: string): Response => ({ jsonrpc: '2.0', id, error: { code, message } });

const isId = (v: unknown): v is string | number =>
  typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));

/** One message in, at most one answer out (undefined for a notification). */
export const handle = async (raw: unknown, ctx: ToolContext = {}): Promise<Response | undefined> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(null, -32600, 'Invalid request');
  const m = raw as Message;
  const notification = !('id' in m);
  const id: Id = isId(m.id) ? m.id : null;
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string')
    return notification ? undefined : fail(id, -32600, 'Invalid request');
  if (notification) return undefined; // notifications/initialized, cancelled: nothing to answer
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>;
  switch (m.method) {
    case 'initialize': {
      const asked = params.protocolVersion;
      const version = (PROTOCOL_VERSIONS as readonly unknown[]).includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params.name;
      if (typeof name !== 'string' || !TOOLS.some((t) => t.name === name)) return fail(id, -32602, 'Unknown tool');
      const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<
        string,
        unknown
      >;
      try {
        const result = await callTool(name, args, ctx);
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        });
      } catch (e) {
        // A tool's own failure goes back as a tool result, so the model can read it and tell the person.
        const known = e instanceof ToolInputError || e instanceof LinkError || e instanceof RegistryError;
        const text = known ? e.message : 'Something went wrong running that tool.';
        return ok(id, { content: [{ type: 'text', text }], isError: true });
      }
    }
    default:
      return fail(id, -32601, 'Method not found');
  }
};

/** A line from stdin: parsed, answered, the answer as one line (or undefined). */
export const handleLine = async (line: string, ctx: ToolContext = {}): Promise<string | undefined> => {
  if (!line.trim()) return undefined;
  let msg: unknown;
  try {
    msg = JSON.parse(line);
  } catch {
    return JSON.stringify(fail(null, -32700, 'Parse error'));
  }
  // A batch (an array) is not part of current MCP: refused as one invalid request.
  const res = await handle(msg, ctx);
  return res ? JSON.stringify(res) : undefined;
};
