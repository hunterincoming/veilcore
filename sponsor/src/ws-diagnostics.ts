// Why the wallet's indexer WebSockets close: code, reason, and which wallet's subscription.
//
// Wallet SDK 2 (wallet-sdk-indexer-client WsSubscriptionClient) turns a socket that closes
// under a subscription into `new ServerError({ message: String(err) })`, so the log only says
// "Wallet.Sync: [object CloseEvent]": the close code and reason are dropped. On mainnet
// through Blockfrost those codes say what happened (4004/4005/4006 the upstream indexer
// dropped, 4429 too many subscribe messages from one address, 1013 send queue full).
//
// This wraps the process's WebSocket class (the one the wallet SDK and midnight-js open
// sockets with) to LOOK, and changes nothing it does: same constructor arguments, same
// events, same sends. For each socket it notes the GraphQL operations subscribed on it and
// how many subscribe messages were sent; when the socket closes other than normally, one log
// line gives the code, the reason, those operations, which wallet they belong to, how long the
// socket lived, and the host and path of the URL. The query string (where the Blockfrost
// project id is) is never logged.
// SPDX-License-Identifier: Apache-2.0

import { log as defaultLog, type Level } from './log.js';

/** Which part of the wallet a subscription belongs to, from its GraphQL operation name. */
export const walletOf = (operation: string): string => {
  if (/^Dust/.test(operation)) return 'dust';
  if (/^Zswap|^Shielded/.test(operation)) return 'shielded';
  if (/^Unshielded/.test(operation)) return 'unshielded';
  return 'other';
};

/** Host and path only: no query string, no credentials. */
export const safeUrl = (u: unknown): string => {
  try {
    const url = new URL(String(u));
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '(unparseable url)';
  }
};

/** The operation names in a graphql-ws subscribe message, or undefined for any other message. */
export const subscribedOperations = (data: unknown): string[] | undefined => {
  if (typeof data !== 'string') return undefined;
  let msg: { type?: unknown; payload?: { query?: unknown; operationName?: unknown } };
  try {
    msg = JSON.parse(data) as typeof msg;
  } catch {
    return undefined;
  }
  if (msg?.type !== 'subscribe') return undefined;
  const q = typeof msg.payload?.query === 'string' ? msg.payload.query : '';
  const names = [...q.matchAll(/\b(?:subscription|query)\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  if (names.length === 0 && typeof msg.payload?.operationName === 'string') names.push(msg.payload.operationName);
  return names.length > 0 ? names : ['(anonymous)'];
};

type Log = (level: Level, msg: string, extra?: Record<string, unknown>) => void;
type CloseLike = { code?: unknown; reason?: unknown; wasClean?: unknown };
type WsClass = new (url: string | URL, protocols?: string | string[]) => {
  addEventListener(type: string, listener: (e: unknown) => void): void;
  send(data: unknown): void;
};

/**
 * A WebSocket class that behaves as `Base` and logs why a socket closed. Exported for tests;
 * installWsDiagnostics puts it in place of the global one.
 */
export const diagnosingWebSocket = <B extends WsClass>(Base: B, log: Log = defaultLog, now = () => Date.now()): B => {
  class DiagnosingWebSocket extends (Base as WsClass) {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      const opened = now();
      const operations = new Set<string>();
      let subscribes = 0;
      const send = this.send.bind(this);
      this.send = (data: unknown) => {
        const ops = subscribedOperations(data);
        if (ops) {
          subscribes++;
          for (const o of ops) operations.add(o);
        }
        send(data);
      };
      this.addEventListener('close', (e: unknown) => {
        const c = (e ?? {}) as CloseLike;
        const code = typeof c.code === 'number' ? c.code : undefined;
        if (code === 1000) return; // a normal close: the client finished with it
        const ops = [...operations];
        log('warn', 'indexer websocket closed', {
          code,
          reason: typeof c.reason === 'string' && c.reason !== '' ? c.reason.slice(0, 200) : undefined,
          wasClean: typeof c.wasClean === 'boolean' ? c.wasClean : undefined,
          wallets: [...new Set(ops.map(walletOf))],
          operations: ops,
          subscribes,
          openForMs: now() - opened,
          url: safeUrl(url),
        });
      });
    }
  }
  return DiagnosingWebSocket as unknown as B;
};

/** Put the diagnosing WebSocket in place of the global one (before the wallet opens any socket). */
export const installWsDiagnostics = (log: Log = defaultLog): void => {
  const g = globalThis as { WebSocket?: WsClass };
  if (g.WebSocket === undefined) return;
  g.WebSocket = diagnosingWebSocket(g.WebSocket, log);
};
