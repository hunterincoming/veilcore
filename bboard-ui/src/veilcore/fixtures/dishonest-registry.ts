// A registry that lies about one record (docs/device-only-records.md): for a record kept on this
// device only, the registry should hold a proof code and nothing else. These are the other
// answers a server could give for that id when the holder's rows are read. Used over the
// in-memory registry (fake-registry.ts), whose writes are still carried out and kept in `sent`.
// SPDX-License-Identifier: Apache-2.0

import type { FakeRegistry } from './fake-registry';

export const LIES = ['purged', 'sealed', 'plain', 'wrong-proof-code', 'claim-stub', 'gone'] as const;
export type Lie = (typeof LIES)[number];

type About = { readonly id: string; readonly recordFingerprint?: string; readonly profile?: string };

/** What the registry answers for the record under each lie. */
export const lieRows = (lie: Lie, r: About): Record<string, unknown>[] => {
  switch (lie) {
    // The purge's emptied row: only the public fields, and `contentsRemoved`.
    case 'purged':
      return [{ id: r.id, recordFingerprint: r.recordFingerprint, contentsRemoved: true }];
    // A locked box this browser has no key for.
    case 'sealed':
      return [
        {
          id: r.id,
          recordFingerprint: r.recordFingerprint,
          rev: 3,
          sealed: {
            v: 1,
            alg: 'A256GCM',
            kid: '00ff00ff00ff00ff',
            iv: 'AAAAAAAAAAAAAAAA',
            ct: 'AAAAAAAAAAAAAAAAAAAAAAAA',
          },
        },
      ];
    // A row in plain text, as before sealing, with the server's own words and the mark.
    case 'plain':
      return [
        {
          id: r.id,
          profile: r.profile,
          recordFingerprint: r.recordFingerprint,
          nonce: '11'.repeat(32),
          strainName: 'What the server says it is',
          bredBy: 'the server',
          dateCreated: '2020-01-01',
          notes: 'the server wrote this',
          loggedAt: 1,
          deviceOnly: true,
        },
      ];
    // The dating row, with another proof code.
    case 'wrong-proof-code':
      return [{ id: r.id, recordFingerprint: 'ef'.repeat(32), bodyPending: true }];
    // A claim's stub, as left for a recipient.
    case 'claim-stub':
      return [{ id: r.id, transferId: 'TR-0000BEEF', receivedFrom: 'someone', receivedAt: 1_700_000_000_000 }];
    // Nothing under that id at all.
    case 'gone':
      return [];
  }
};

/** From now on, every read of the holder's records is answered with the lie. */
export const lieAbout = (reg: FakeRegistry, lie: Lie, r: About): void => {
  reg.misbehave.fault = (method, path) =>
    method === 'GET' && path === '/api/records'
      ? new Response(JSON.stringify(lieRows(lie, r)), { status: 200, headers: { 'content-type': 'application/json' } })
      : undefined;
};

// ---- every route lies, and anything unexpected is refused -------------------------------------

export type Seen = { readonly method: string; readonly path: string; readonly body: string };

/**
 * Put the registry wholly in a liar's hands: every route the app is expected to call for a
 * holder with a document kept on this device only answers with a lie about that record, and
 * any other request is refused and counted (`denied`). Every request made is kept in `seen`,
 * answered or not, so a test can read back exactly what left the browser.
 *
 *   GET  /api/records           the chosen lie (lieRows)
 *   PUT  /api/records/dating    "refused", so the browser thinks the proof code never arrived
 *   GET  /proof/:code           an inclusion proof for another proof code
 *   GET  /api/licenses          an agreement, in plain text, naming the record
 *   GET  /api/disclosures       a sharing choice nobody made, for the record
 *   GET  /api/records/:id/disclosure   the same, asked for the one record
 *   GET  /transfers/sent        a delivery nobody made, from the record
 *   GET  /records/:id/evidence  evidence for another proof code
 */
export const lieEverywhere = (reg: FakeRegistry, lie: Lie, r: About): { seen: Seen[]; denied: Seen[] } => {
  const seen: Seen[] = [];
  const denied: Seen[] = [];
  const answer = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
  const other = 'cd'.repeat(32);
  reg.misbehave.fault = (method, path, body) => {
    seen.push({ method, path, body });
    if (method === 'GET' && path === '/api/records') return answer(lieRows(lie, r));
    if (method === 'PUT' && path === '/api/records/dating')
      return answer({
        ok: false,
        dated: [],
        rejected: [{ id: r.id, reason: 'this registry says no' }],
        notWritten: [],
      });
    if (method === 'GET' && path.startsWith('/proof/'))
      return answer({
        commitment: other,
        batchId: 'B-20261015-0BAD',
        root: other,
        index: 0,
        path: [],
        anchor: { txHash: other },
      });
    if (method === 'GET' && path === '/api/licenses')
      return answer([
        { id: 'LIC-LIE', recordId: r.id, recordFingerprint: r.recordFingerprint, type: 'license', state: 'sent' },
      ]);
    if (method === 'GET' && path === '/api/disclosures')
      return answer([{ recordId: r.id, show: ['existence', 'dna', 'lineage'], updatedAt: '2026-01-01T00:00:00.000Z' }]);
    if (method === 'GET' && /^\/api\/records\/[^/]+\/disclosure$/.test(path))
      return answer({ show: ['existence', 'dna', 'lineage'], updatedAt: '2026-01-01T00:00:00.000Z' });
    if (method === 'GET' && path === '/transfers/sent')
      return answer({ transfers: [{ id: 'TR-LIE', source_record: r.id, sourceRecord: r.id, created_at: 1 }] });
    if (method === 'GET' && /^\/records\/[^/]+\/evidence$/.test(path))
      return answer({
        format: 'veilcore-record-evidence/v1',
        recordId: r.id,
        record: { id: r.id },
        proof: { commitment: other },
      });
    denied.push({ method, path, body });
    return answer({ error: 'not a route this test expects' }, 404);
  };
  return { seen, denied };
};
