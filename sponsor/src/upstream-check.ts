// GET /alerts on the read-only relay (reliability audit, 19 Nov 2026, Tier 1 item 3a).
//
// The relay's /health always says ok: it is answered by the relay itself and says nothing
// about Blockfrost, the one Midnight data source behind it. A Blockfrost outage, an expired
// or over-quota project, or an indexer that stopped following the chain all left /health
// green while every check page said it couldn't reach Midnight. This asks the upstream
// indexer for its latest block and fails when it can't, or when that block is old.
//
// For an outside monitor (UptimeRobot), the same contract as the registry's /alerts and the
// sponsor's /sponsor/alerts: 200 { ok: true, problems: [] }, or 503 { ok: false, problems }.
// Short codes only. Never the upstream address (it carries the project id), its error text,
// the block height or its age: the answer is public.
//   upstream-unreachable  the indexer did not answer, answered an error, or not with a block
//   upstream-stale        its latest block is older than maxAgeMs (default 10 minutes;
//                         Midnight makes a block about every 6 seconds)
//
// The answer is kept for cacheMs (default 60 s) and one lookup at a time is made, so asking
// /alerts often cannot spend the Blockfrost project's quota.
// SPDX-License-Identifier: Apache-2.0

export type UpstreamProblem = "upstream-unreachable" | "upstream-stale";

export type UpstreamCheckConfig = {
  /** Upstream GraphQL over HTTP, key included (never shown). */
  readonly indexer: string;
  readonly maxAgeMs?: number;
  readonly cacheMs?: number;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
};

/** The latest block: height and time. Midnight's indexer serves `block` with no offset as the newest. */
export const LATEST_BLOCK_QUERY = "query { block { height timestamp } }";

/** A block time as milliseconds: the indexer gives milliseconds, an older one seconds. */
export const blockTimeMs = (t: unknown): number | undefined => {
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return undefined;
  return t < 1e12 ? t * 1000 : t;
};

export const createUpstreamCheck = (cfg: UpstreamCheckConfig): (() => Promise<UpstreamProblem[]>) => {
  const maxAgeMs = cfg.maxAgeMs ?? 10 * 60_000;
  const cacheMs = cfg.cacheMs ?? 60_000;
  const timeoutMs = cfg.timeoutMs ?? 10_000;
  const doFetch = cfg.fetch ?? fetch;
  const now = cfg.now ?? Date.now;
  let cached: { at: number; problems: UpstreamProblem[] } | undefined;
  let inFlight: Promise<UpstreamProblem[]> | undefined;

  const look = async (): Promise<UpstreamProblem[]> => {
    let time: number | undefined;
    try {
      const res = await doFetch(cfg.indexer, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query: LATEST_BLOCK_QUERY }),
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        return ["upstream-unreachable"];
      }
      const text = await res.text();
      if (text.length > 64 * 1024) return ["upstream-unreachable"];
      const body = JSON.parse(text) as { data?: { block?: { height?: unknown; timestamp?: unknown } | null } };
      const block = body?.data?.block;
      if (!block || typeof block.height !== "number") return ["upstream-unreachable"];
      time = blockTimeMs(block.timestamp);
    } catch {
      return ["upstream-unreachable"];
    }
    if (time === undefined) return ["upstream-unreachable"];
    return now() - time > maxAgeMs ? ["upstream-stale"] : [];
  };

  return () => {
    if (cached && now() - cached.at < cacheMs) return Promise.resolve(cached.problems);
    inFlight ??= look()
      .then((problems) => {
        cached = { at: now(), problems };
        return problems;
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };
};
