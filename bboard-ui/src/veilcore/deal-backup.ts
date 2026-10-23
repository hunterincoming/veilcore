// The private messages of each license deal this browser is part of, for the backup file
// (backup.ts dealRecords): the terms, every royalty statement, reply, payment and confirmation,
// each as its sender signed it. They live encrypted on VeilCore's registry; with a copy in the
// backup, the royalty history survives the registry. Same format as "Download the signed
// record of this deal" (deal-client.ts dealRecordOf), so anyone can check each signature.
//
// Only deals whose channel is open (the issuer sent the terms) are read: reading never opens a
// channel. Best effort: a deal the registry doesn't answer for now is left out, and the next
// backup has it.
// SPDX-License-Identifier: Apache-2.0

import { allLicenses } from './licenses';
import { heldLicenses } from './held-licenses';
import { publicOf } from './deal';
import { dealRecordOf, readAll, type DealParty } from './deal-client';

/** Every deal this browser can read: as licensor (its licenses) and as licensee (held). */
export const dealPartiesHere = (): { party: DealParty; mine: string }[] => {
  const out: { party: DealParty; mine: string }[] = [];
  for (const l of allLicenses()) {
    const oc = l.onChain;
    if (!oc?.partySecret || !oc.licenseeNonce || !oc.commitment || !oc.issuerRecord || !oc.termsSentAt) continue;
    out.push({
      party: {
        side: 'issuer',
        mySecret: oc.partySecret,
        theirPublic: oc.licenseeNonce,
        commitment: oc.commitment,
        issuerRecord: oc.issuerRecord,
        invite: { id: oc.inviteId, token: oc.issuerToken },
      },
      mine: publicOf(oc.partySecret),
    });
  }
  for (const h of heldLicenses()) {
    if (!h.partySecret || !h.issuerNonce) continue;
    out.push({
      party: {
        side: 'licensee',
        mySecret: h.partySecret,
        theirPublic: h.issuerNonce,
        commitment: h.commitment,
        issuerRecord: h.issuerRecord,
      },
      mine: publicOf(h.partySecret),
    });
  }
  return out;
};

/** The signed record of each deal here, read now; a deal that can't be read now is left out. */
export const dealRecordsForBackup = async (): Promise<ReturnType<typeof dealRecordOf>[]> => {
  const got = await Promise.allSettled(
    dealPartiesHere().map(async ({ party, mine }) => {
      const entries = await readAll(party);
      return entries.length ? dealRecordOf(party, mine, entries) : undefined;
    }),
  );
  return got.flatMap((g) => (g.status === 'fulfilled' && g.value ? [g.value] : []));
};
