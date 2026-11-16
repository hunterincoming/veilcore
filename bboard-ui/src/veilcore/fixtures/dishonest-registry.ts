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
