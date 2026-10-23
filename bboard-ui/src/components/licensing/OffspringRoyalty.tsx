// An offspring royalty on chain (docs/agreements-live.md, 6).
//
// A license whose terms carry a royalty on offspring becomes an obligation on Midnight
// against the licensee's own record of the plant: the licensee names that record over the
// deal's channel, the breeder proposes the obligation, the licensee accepts it, and only the
// breeder can release it. From then on every record both holders confirm as its descendant
// shows it when anyone checks the line (verify.ts, rule 3).
//
// The obligation is the agreement's fingerprint: it names nothing, and only the two parties
// can say which agreement it is.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { allRecords } from '../../veilcore/records';
import { say, type DealEntry, type DealParty } from '../../veilcore/deal-client';
import { useChainCall } from '../chain/useChainCall';
import { ChainStatusLine } from '../chain/ChainStatusLine';
import { ConfirmInline } from './DealSteps';

type Status = 'none' | 'proposed' | 'in-force';

const statusOf = async (record: string, obligation: string, beneficiary: string): Promise<Status> => {
  const { latestLedger } = await import('../../veilcore/license-invites');
  const { obligationKeyOf } = await import('../../veilcore/chain/actions');
  const l = await latestLedger();
  const k = hexBytes(obligationKeyOf(record, obligation, beneficiary));
  return l.openObligations.member(k) ? 'in-force' : l.pendingObligations.member(k) ? 'proposed' : 'none';
};

export const OffspringRoyalty: React.FC<{
  side: 'issuer' | 'licensee';
  party: DealParty;
  entries: readonly DealEntry[] | undefined;
  refresh: () => void;
  pct: string;
  /** The agreement's fingerprint: the obligation itself. */
  obligation: string;
  /** The breeder's record identity: the beneficiary. */
  beneficiary: string;
  /** The breeder's record secret (issuer side only). */
  issuerSecret?: string;
}> = ({ side, party, entries, refresh, pct, obligation, beneficiary, issuerSecret }) => {
  const allKeys = useRecordKeys();
  const plant = [...(entries ?? [])].reverse().find((e) => e.type === 'plant-record' && e.from === 'licensee') as
    | Extract<DealEntry, { type: 'plant-record' }>
    | undefined;
  const [status, setStatus] = useState<Status>();
  const [pick, setPick] = useState('');
  const call = useChainCall<unknown>();

  const check = useCallback(() => {
    if (!plant) return;
    void statusOf(plant.recordIdentity, obligation, beneficiary)
      .then(setStatus)
      .catch(() => undefined);
  }, [plant, obligation, beneficiary]);
  useEffect(() => {
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [check]);

  // The licensee's own anchored records held here: what it can name.
  const mine = Object.values(allKeys)
    .filter((k) => k.anchor)
    .map((k) => ({
      identity: k.anchor!.identity,
      name: allRecords().find((r) => r.id === k.recordId)?.strainName ?? k.recordId,
      secret: k.recordSecret,
    }));
  const myPlant = plant ? mine.find((m) => m.identity === plant.recordIdentity) : undefined;

  const after = async <T,>(p: Promise<T>) => {
    const out = await p;
    check();
    return out;
  };

  return (
    <Stack spacing={1.25} lang="en">
      <Box>
        <Typography variant="subtitle2">Royalty on offspring: {pct}%</Typography>
        <Typography variant="body2" color="text.secondary">
          On Midnight it sits on the licensee&apos;s own record of this plant, so every offspring both holders confirm
          shows it when anyone checks the line. The licensee accepts it; only the breeder can release it.
        </Typography>
      </Box>

      {!plant &&
        side === 'licensee' &&
        (mine.length === 0 ? (
          <Alert severity="info" variant="outlined">
            Date your plant of these genetics first, then name it here. <RouterLink to="/new">Date a plant</RouterLink>
          </Alert>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              select
              size="small"
              label="Your record of this plant"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              sx={{ minWidth: 240 }}
            >
              {mine.map((m) => (
                <MenuItem key={m.identity} value={m.identity}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              disabled={!pick || call.busy}
              onClick={() =>
                void call.run(async () => {
                  const m = mine.find((x) => x.identity === pick)!;
                  await say(party, { type: 'plant-record', recordIdentity: m.identity, name: m.name });
                  refresh();
                  return true;
                })
              }
            >
              Name it
            </Button>
          </Stack>
        ))}
      {!plant && side === 'issuer' && (
        <Typography variant="body2" color="text.secondary">
          Waiting for them to name their record of this plant.
        </Typography>
      )}

      {plant && (
        <Typography variant="body2">
          Their record: <b>{plant.name}</b>{' '}
          <span style={{ fontFamily: 'monospace' }}>{plant.recordIdentity.slice(0, 8)}…</span> ·{' '}
          {status === 'in-force'
            ? 'in force on Midnight'
            : status === 'proposed'
              ? 'proposed, waiting for the licensee to accept'
              : status === 'none'
                ? 'not on Midnight yet'
                : 'checking…'}
        </Typography>
      )}

      {plant && side === 'issuer' && issuerSecret && status === 'none' && (
        <Button
          variant="contained"
          disabled={call.busy}
          sx={{ alignSelf: 'flex-start' }}
          onClick={() =>
            void call.run(async (progress) => {
              const { proposeObligationOnChain } = await import('../../veilcore/chain/actions');
              return after(
                proposeObligationOnChain(hexBytes(issuerSecret), plant.recordIdentity, obligation, { progress }),
              );
            })
          }
        >
          Put it on their record
        </Button>
      )}
      {plant && side === 'issuer' && issuerSecret && status === 'proposed' && (
        <Button
          color="inherit"
          disabled={call.busy}
          sx={{ alignSelf: 'flex-start' }}
          onClick={() =>
            void call.run(async (progress) => {
              const { withdrawObligationOnChain } = await import('../../veilcore/chain/actions');
              return after(
                withdrawObligationOnChain(hexBytes(issuerSecret), plant.recordIdentity, obligation, { progress }),
              );
            })
          }
        >
          Take it back
        </Button>
      )}
      {plant && side === 'issuer' && issuerSecret && status === 'in-force' && (
        <ConfirmInline
          label="Release it"
          question="Release the offspring royalty? Their record and its offspring will no longer show it. This goes on Midnight."
          confirmLabel="Yes, release it"
          disabled={call.busy}
          onConfirm={() =>
            void call.run(async (progress) => {
              const { dischargeOnChain } = await import('../../veilcore/chain/actions');
              return after(dischargeOnChain(hexBytes(issuerSecret), plant.recordIdentity, obligation, { progress }));
            })
          }
        />
      )}

      {plant && side === 'licensee' && status === 'proposed' && myPlant && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button
            variant="contained"
            disabled={call.busy}
            onClick={() =>
              void call.run(async (progress) => {
                const { acceptObligationOnChain } = await import('../../veilcore/chain/actions');
                return after(acceptObligationOnChain(hexBytes(myPlant.secret), obligation, beneficiary, { progress }));
              })
            }
          >
            Accept it, as agreed
          </Button>
          <ConfirmInline
            label="Decline"
            question="Decline it? This goes against the terms you agreed to, and they will see it."
            confirmLabel="Yes, decline it"
            disabled={call.busy}
            onConfirm={() =>
              void call.run(async (progress) => {
                const { rejectObligationOnChain } = await import('../../veilcore/chain/actions');
                return after(rejectObligationOnChain(hexBytes(myPlant.secret), obligation, beneficiary, { progress }));
              })
            }
          />
        </Stack>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
