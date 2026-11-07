// A record's parents and offspring on Midnight (docs/agreements-live.md, 7).
//
// Parentage on chain takes both holders: the child's holder names a parent, and the parent's
// holder confirms it (contract proposeParent / confirmParent). The chain itself is the
// mailbox: this page reads the proposals waiting for this record to confirm. A confirmed
// link is what carries a parent's obligations (an offspring royalty) to its descendants
// when anyone checks the line (verify.ts, rules 2 to 4).
//
// When both records are held in this browser (a breeder's own cross or selection), one tap
// sends both steps.
//
// Every sentence is in the five languages, and in an animal's or a strain's words for those
// records (i18n/app/<lang>/chain.ts app.family.*; panel review). It says plainly that a
// confirmed link is public and permanent, and that obligations the parent's holder takes on
// later reach the child's line too.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { hexBytes, useRecordKeys } from '../../veilcore/record-keys';
import { allRecords, type StrainRecord } from '../../veilcore/records';
import { chainNotReady } from '../../veilcore/chain/config';
import { useChainCall } from './useChainCall';
import { ChainStatusLine } from './ChainStatusLine';
import { DisclosureReceipt } from './DisclosureReceipt';
import { useRecordT } from '../../i18n/app';

const HEX64 = /^[0-9a-f]{64}$/;
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

type Family = {
  parents: string[];
  pendingParent?: string;
  waiting: string[];
  children: string[];
  hasOffspring: boolean;
};

/** What the chain says about this identity's family now. */
const readFamily = async (me: string, local: readonly string[]): Promise<Family> => {
  const { latestLedger } = await import('../../veilcore/license-invites');
  const l = await latestLedger();
  const m = hexBytes(me);
  const parents = l.parentsOf.member(m) ? [...l.parentsOf.lookup(m)].map(hex) : [];
  const pendingParent = l.pendingParentOf.member(m) ? hex(l.pendingParentOf.lookup(m)) : undefined;
  const waiting: string[] = [];
  for (const [child, parent] of l.pendingParentOf) if (hex(parent) === me) waiting.push(hex(child));
  // The chain can't list a parent's children without reading every record, so this names the
  // ones held in this browser; offspring held elsewhere show on their own pages.
  const children = local.filter((c) => {
    const b = hexBytes(c);
    return l.parentsOf.member(b) && l.parentsOf.lookup(b).member(m);
  });
  return { parents, pendingParent, waiting, children, hasOffspring: l.hasOffspring.member(m) };
};

/** A key from what someone pasted: the key itself, or a check link carrying it (#chain=…). */
export const keyFromPaste = (text: string): string | undefined => {
  const t = text.trim().toLowerCase();
  if (HEX64.test(t)) return t;
  const m = /[#&?]chain=([0-9a-f]{64})/.exec(t);
  return m?.[1];
};

export const FamilyOnChain: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const allKeys = useRecordKeys();
  const keys = allKeys[record.id];
  const me = keys?.anchor?.identity;
  const [family, setFamily] = useState<Family>();
  const [error, setError] = useState<string>();
  const [paste, setPaste] = useState('');
  const call = useChainCall<unknown>();
  const tr = useRecordT(record);

  const nameOf = useCallback(
    (identity: string): string | undefined => {
      const k = Object.values(allKeys).find((x) => x.anchor?.identity === identity);
      return k ? allRecords().find((r) => r.id === k.recordId)?.strainName : undefined;
    },
    [allKeys],
  );
  const secretOf = (identity: string): string | undefined =>
    Object.values(allKeys).find((x) => x.anchor?.identity === identity)?.recordSecret;

  const refresh = useCallback(() => {
    if (!me) return;
    const local = Object.values(allKeys)
      .map((k) => k.anchor?.identity)
      .filter((x): x is string => !!x && x !== me);
    readFamily(me, local)
      .then((f) => {
        setFamily(f);
        setError(undefined);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [me, allKeys]);
  useEffect(refresh, [refresh]);

  if (chainNotReady() || !keys || !me) return null;

  // Parents named on this record that this browser also holds, anchored, not yet on chain.
  const localParents = (record.parents ?? [])
    .map((p) => (p.recordId ? allKeys[p.recordId]?.anchor?.identity : undefined))
    .filter((id): id is string => !!id && id !== me && !family?.parents.includes(id));

  const run = (what: (progress: (m: string) => void) => Promise<unknown>) =>
    call.run(async (progress) => {
      const out = await what(progress);
      refresh();
      return out;
    });

  const linkOwn = (parent: string) =>
    run(async (progress) => {
      const a = await import('../../veilcore/chain/actions');
      const parentSecret = secretOf(parent);
      if (!parentSecret) throw new Error(tr.t('app.family.noParentHere'));
      if (family?.pendingParent !== parent) {
        progress(tr.t('app.family.step1'));
        await a.proposeParentOnChain(hexBytes(keys.recordSecret), parent, { progress });
      }
      progress(tr.t('app.family.step2'));
      return a.confirmParentOnChain(hexBytes(parentSecret), me, { progress });
    });

  const proposeOther = (parent: string) =>
    run(async (progress) => {
      const { proposeParentOnChain } = await import('../../veilcore/chain/actions');
      return proposeParentOnChain(hexBytes(keys.recordSecret), parent, { progress });
    });

  const withdraw = () =>
    run(async (progress) => {
      const { withdrawParentOnChain } = await import('../../veilcore/chain/actions');
      return withdrawParentOnChain(hexBytes(keys.recordSecret), { progress });
    });

  const confirm = (child: string) =>
    run(async (progress) => {
      const who = nameOf(child)
        ? tr.t('app.family.named', { name: nameOf(child)!, key: child })
        : tr.t('app.family.namedKey', { key: child });
      const fixes = family?.hasOffspring ? '' : tr.t('app.family.confirmFixes');
      if (!window.confirm(tr.t('app.family.confirmQ', { who, fixes })))
        throw new Error(tr.t('app.family.notConfirmed'));
      const { confirmParentOnChain } = await import('../../veilcore/chain/actions');
      return confirmParentOnChain(hexBytes(keys.recordSecret), child, { progress });
    });

  const pasted = keyFromPaste(paste);
  const full = (family?.parents.length ?? 0) >= 2;

  return (
    <Stack spacing={1.5} data-family-on-chain="">
      <Box>
        <Typography variant="overline" sx={{ display: 'block' }}>
          {tr.t('app.family.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" data-family-intro="">
          {tr.t('app.family.intro')}
        </Typography>
      </Box>

      {!family && !error && (
        <Typography variant="body2" color="text.secondary">
          {tr.t('app.family.reading')}
        </Typography>
      )}

      {family && (
        <>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2">{tr.t('app.family.parents')}</Typography>
            {family.parents.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.family.noneConfirmed')}
              </Typography>
            )}
            {family.parents.map((p) => (
              <Chip key={p} size="small" color="success" variant="outlined" label={nameOf(p) ?? short(p)} />
            ))}
          </Stack>
          {family.children.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2">{tr.t('app.family.offspring')}</Typography>
              {family.children.map((c) => (
                <Chip key={c} size="small" variant="outlined" label={nameOf(c) ?? short(c)} />
              ))}
            </Stack>
          )}

          <DisclosureReceipt circuits={['proposeParent', 'confirmParent', 'withdrawParent']} />
          {family.pendingParent && (
            <Alert
              severity="info"
              variant="outlined"
              action={
                <Button color="inherit" disabled={call.busy} onClick={() => void withdraw()}>
                  {tr.t('app.family.takeBack')}
                </Button>
              }
            >
              {tr.t('app.family.waitingParent', {
                name:
                  nameOf(family.pendingParent) ?? tr.t('app.family.theRecord', { key: short(family.pendingParent) }),
              })}
            </Alert>
          )}

          {!full &&
            localParents.map((p) => (
              <Button
                key={p}
                variant="outlined"
                disabled={call.busy || (!!family.pendingParent && family.pendingParent !== p)}
                onClick={() => void linkOwn(p)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {tr.t('app.family.putOnChain', { name: nameOf(p) ?? short(p) })}
              </Button>
            ))}

          {!full && !family.pendingParent && !family.hasOffspring && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label={tr.t('app.family.pasteLabel')}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                error={paste.trim() !== '' && (!pasted || pasted === me)}
              />
              <Button
                variant="outlined"
                disabled={call.busy || !pasted || pasted === me}
                onClick={() => pasted && void proposeOther(pasted)}
              >
                {tr.t('app.family.nameIt')}
              </Button>
            </Stack>
          )}

          {family.waiting.map((c) => (
            <Alert
              key={c}
              severity="warning"
              variant="outlined"
              action={
                <Button color="inherit" disabled={call.busy} onClick={() => void confirm(c)}>
                  {tr.t('app.family.confirm')}
                </Button>
              }
              data-family-waiting=""
            >
              {tr.t('app.family.namesParent', {
                who: nameOf(c) ? `“${nameOf(c)}”` : tr.t('app.family.theRecord', { key: short(c) }),
              })}
            </Alert>
          ))}
        </>
      )}

      {error && (
        <Alert severity="warning" variant="outlined">
          {tr.t('app.family.readError', { error })}
        </Alert>
      )}
      <ChainStatusLine busy={call.busy} progress={call.progress} error={call.error} step="agreement" />
    </Stack>
  );
};
