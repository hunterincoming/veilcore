// SPDX-License-Identifier: Apache-2.0
/**
 * Indexer sockets to Blockfrost offer the plain graphql-transport-ws protocol only.
 *
 * Wallet SDK 2 (wallet-sdk-indexer-client) and midnight-js 5 (indexer-public-data-provider)
 * offer the indexer's compressed subprotocol first: ['graphql-transport-ws+deflate',
 * 'graphql-transport-ws']. Since the Ledger 9 fork (6 Nov 2026) Blockfrost's proxy closes
 * such a socket 1011 "unexpected response" before any subscribe; graphql-ws treats 1011 as
 * fatal and never redials with another offer. Offered only the plain protocol, Blockfrost
 * serves text frames, which both libraries' deflate wrappers pass through unchanged.
 *
 * The same rule as the sponsor's (sponsor/src/ws-diagnostics.ts, which also logs closes);
 * the sponsor builds on its own (rootDir src), so it keeps its copy.
 *
 * Two ways in, because the two libraries find their WebSocket differently:
 *  - the wallet SDK reads the global `WebSocket` each time it dials: usePlainForBlockfrost()
 *    puts the wrapped class there (no other seam is public);
 *  - midnight-js takes the class as indexerPublicDataProvider's third argument, and in Node
 *    otherwise uses the `ws` package directly, never the global: pass indexerWebSocket(…).
 *
 * Every other host gets exactly what the library offers.
 */

/** The indexer's compressed subprotocol, which wallet SDK 2 and midnight-js 5 offer first. */
export const DEFLATE_PROTOCOL = 'graphql-transport-ws+deflate';
const PLAIN_PROTOCOL = 'graphql-transport-ws';

/** True for blockfrost.io and its subdomains (not evilblockfrost.io). */
export const isBlockfrost = (url: string | URL): boolean => {
  try {
    const host = new URL(String(url)).hostname.toLowerCase();
    return host === 'blockfrost.io' || host.endsWith('.blockfrost.io');
  } catch {
    return false;
  }
};

/** The subprotocols to offer `url`: to Blockfrost, without the compressed one. */
export const offeredProtocols = (url: string | URL, protocols?: string | string[]): string | string[] | undefined => {
  if (protocols === undefined || !isBlockfrost(url)) return protocols;
  const list = Array.isArray(protocols) ? protocols : [protocols];
  if (!list.includes(DEFLATE_PROTOCOL)) return protocols;
  const plain = list.filter((p) => p !== DEFLATE_PROTOCOL);
  return plain.length > 0 ? plain : [PLAIN_PROTOCOL];
};

type WsClass = new (url: string | URL, protocols?: string | string[]) => object;

const WRAPPED = Symbol.for('veilcore.plainForBlockfrost');
const wrappedOf = new WeakMap<object, WsClass>();

/**
 * `Base`, offering Blockfrost the plain protocol only. Otherwise it is `Base`.
 *
 * The event-handler accessors (onmessage and the rest) are copied onto the subclass's own
 * prototype: midnight-js's DeflateWebSocket reads `onmessage` from its base's OWN prototype
 * only, and with a plain subclass it finds nothing and silently drops every message.
 */
export const plainForBlockfrost = <B extends WsClass>(Base: B): B => {
  if ((Base as unknown as Record<symbol, unknown>)[WRAPPED] === true) return Base;
  const known = wrappedOf.get(Base);
  if (known) return known as B;
  class PlainForBlockfrost extends (Base as WsClass) {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, offeredProtocols(url, protocols));
    }
  }
  for (const name of ['onopen', 'onmessage', 'onclose', 'onerror']) {
    for (let p: object | null = Base.prototype as object; p !== null; p = Object.getPrototypeOf(p) as object | null) {
      const d = Object.getOwnPropertyDescriptor(p, name);
      if (d) {
        Object.defineProperty(PlainForBlockfrost.prototype, name, d);
        break;
      }
    }
  }
  Object.defineProperty(PlainForBlockfrost, WRAPPED, { value: true });
  wrappedOf.set(Base, PlainForBlockfrost);
  return PlainForBlockfrost as unknown as B;
};

/**
 * The WebSocket class to give midnight-js's indexerPublicDataProvider for `url`: `Base`
 * wrapped when `url` is Blockfrost's, else undefined (the library's own default, unchanged).
 */
export const indexerWebSocket = (url: string, Base: unknown): WsClass | undefined =>
  isBlockfrost(url) && typeof Base === 'function' ? plainForBlockfrost(Base as WsClass) : undefined;

/**
 * Put the wrapped class in place of the global WebSocket, for the wallet SDK, which reads
 * the global each time it dials. Does nothing without a global WebSocket; wraps only once.
 */
export const usePlainForBlockfrost = (): void => {
  const g = globalThis as { WebSocket?: unknown };
  if (typeof g.WebSocket !== 'function') return;
  g.WebSocket = plainForBlockfrost(g.WebSocket as WsClass);
};
