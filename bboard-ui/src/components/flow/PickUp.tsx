// Home's "Pick up where you left off" (pickup-items.ts works out what is open). A calm list: one line
// and one button each, a progress bar for each record on its way to its date, and nothing at all
// when nothing is open.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { inOutbox, outboxRecords } from '../../veilcore/outbox';
import { proofCodeSent, unsavedReason, type StrainRecord } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { proofFor } from '../../veilcore/proofs';
import { effectiveState, useLicenses } from '../../veilcore/licenses';
import { sentByMe, type SentTransfer } from '../../veilcore/transfers';
import { recordTitle } from '../../veilcore/animal-profile';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { retryStampNow, stampInProgress } from '../../veilcore/chain/key-stamp';
import { stampRetryTick } from '../../veilcore/chain/stamp-background';
import { useStampRetries } from '../chain/useKeyStamp';
import { useT, type Translator } from '../../i18n/app';
import { localStamp } from '../../veilcore/time';
import { useAnchorCadence } from './dating-words';
import { DATING_STEPS, datingStep, pickUpItems, type DatingStage, type PickUpItem } from './pickup-items';
import { keysOnlyHere } from './keys-only-here';

/** How often Home looks again while it is open, so a record's progress moves on its own. */
const REFRESH_MS = 60_000;

/** Each own record's date stage, looked up for the newest few not yet dated. */
const useDatingStages = (own: readonly StrainRecord[]): Record<string, DatingStage | undefined> => {
  const [stages, setStages] = useState<Record<string, DatingStage | undefined>>({});
  const [tick, setTick] = useState(0);
  const key = own
    .slice(0, 20)
    .map((r) => `${r.id}:${r.recordFingerprint}:${proofCodeSent(r.id) ? 1 : 0}`)
    .join(',');
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    let live = true;
    void (async () => {
      const next: Record<string, DatingStage | undefined> = {};
      for (const r of own.slice(0, 20)) {
        if (stages[r.id] === 'dated') {
          next[r.id] = 'dated';
          continue;
        }
        const p = await proofFor(r.recordFingerprint);
        next[r.id] =
          p.status === 'anchor-reported'
            ? 'dated'
            : p.status === 'pending'
              ? 'batched'
              : proofCodeSent(r.id) || !inOutbox(r.id)
                ? 'next-batch'
                : 'not-sent';
      }
      if (live) setStages(next);
    })();
    return () => {
      live = false;
    };
  }, [key, tick]);
  return stages;
};

const useSent = (): SentTransfer[] | null => {
  const [sent, setSent] = useState<SentTransfer[] | null>(null);
  useEffect(() => {
    let live = true;
    void sentByMe().then((t) => live && setSent(t));
    return () => {
      live = false;
    };
  }, []);
  return sent;
};

export const PickUp: React.FC<{
  records: readonly StrainRecord[];
  /** Lab reports waiting to be opened, by plant (AppHome's useWaitingByRecord). */
  waiting: Readonly<Record<string, readonly unknown[]>>;
  /** A lab's received samples whose receipt isn't signed yet. */
  labUnsigned: readonly string[];
}> = ({ records, waiting, labUnsigned }) => {
  const tr = useT();
  const { t } = tr;
  const navigate = useNavigate();
  const keys = useRecordKeys();
  const retries = useStampRetries();
  const licenses = useLicenses();
  const cadence = useAnchorCadence();
  const own = useMemo(
    () => records.filter((r) => !r.receivedFrom).sort((a, b) => (b.loggedAt ?? 0) - (a.loggedAt ?? 0)),
    [records],
  );
  const dating = useDatingStages(own);
  const sent = useSent();
  const [, setNow] = useState(0);
  // The "trying now" line follows the background's own try.
  useEffect(() => {
    if (!Object.keys(retries).length) return;
    const t = window.setInterval(() => setNow((n) => n + 1), 2000);
    return () => window.clearInterval(t);
  }, [retries]);

  const stamps = Object.fromEntries(
    Object.entries(retries).filter(
      ([id]) => REAL_CHAIN && keys[id] && !keys[id].anchor && records.some((r) => r.id === id),
    ),
  );
  const { items, moreDating } = pickUpItems({
    own: own.map((r) => ({ id: r.id, name: recordTitle(r), loggedAt: r.loggedAt })),
    dating,
    stamps,
    stampingNow: stampInProgress(),
    waitingForBackup: Object.keys(outboxRecords()).filter((id) => unsavedReason(id) === 'backup'),
    keysOnlyHere: REAL_CHAIN ? keysOnlyHere(records) : [],
    sent,
    resultsWaiting: Object.fromEntries(Object.entries(waiting).map(([id, list]) => [id, list.length])),
    labUnsigned,
    agreementsWaiting: licenses.filter((l) => effectiveState(l) === 'sent').length,
  });
  if (items.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} data-pickup="">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('app.pickup.title')}
      </Typography>
      <Stack spacing={1.5} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {items.map((item) => (
          <Box component="li" key={itemKey(item)} data-pickup-item={item.kind}>
            <ItemRow item={item} tr={tr} cadence={cadence} go={(to) => void navigate(to)} />
          </Box>
        ))}
        {moreDating > 0 && (
          <Typography component="li" variant="body2" color="text.secondary">
            {tr.tp('app.pickup.more', moreDating)}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

const itemKey = (i: PickUpItem): string => ('recordId' in i && i.recordId ? `${i.kind}:${i.recordId}` : i.kind);

const ItemRow: React.FC<{ item: PickUpItem; tr: Translator; cadence?: number; go: (to: string) => void }> = ({
  item,
  tr,
  cadence,
  go,
}) => {
  const { t, tp } = tr;
  const line = (text: string, action: string, onClick: () => void, extra?: React.ReactNode) => (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          {text}
        </Typography>
        {extra}
      </Box>
      <Button variant="outlined" size="small" onClick={onClick} sx={{ minHeight: 40, flexShrink: 0 }}>
        {action}
      </Button>
    </Stack>
  );
  const open = (id?: string) => () => go(id ? `/record/${id}` : '/records');
  switch (item.kind) {
    case 'dating': {
      const step = datingStep(item.stage);
      const words =
        item.stage === 'not-sent'
          ? t('app.pickup.dating.notSent', { name: item.name })
          : item.stage === 'batched'
            ? t('app.pickup.dating.batched', { name: item.name })
            : cadence !== undefined
              ? tp('app.pickup.dating.nextEvery', cadence, { name: item.name })
              : t('app.pickup.dating.next', { name: item.name });
      return line(
        words,
        t('app.pickup.open'),
        open(item.recordId),
        <LinearProgress
          variant="determinate"
          value={(step / DATING_STEPS) * 100}
          aria-label={t('app.pickup.dating.progress', { n: String(step), total: String(DATING_STEPS) })}
          sx={{ mt: 0.75, height: 6, borderRadius: 3 }}
        />,
      );
    }
    case 'stamp': {
      const words =
        item.state === 'now'
          ? t('app.pickup.stamp.now', { name: item.name })
          : item.state === 'sent'
            ? t('app.pickup.stamp.sent', { name: item.name })
            : item.state === 'cannot'
              ? t('app.pickup.stamp.cannot', { name: item.name })
              : item.state === 'paused'
                ? t('app.pickup.stamp.paused', { name: item.name })
                : t('app.pickup.stamp.retrying', {
                    name: item.name,
                    when: item.nextAt ? localStamp(item.nextAt, tr.locale) : '',
                  });
      if (item.state === 'retrying' || item.state === 'paused')
        return line(words, t('app.pickup.tryNow'), () => {
          retryStampNow(item.recordId);
          void stampRetryTick();
        });
      return line(words, t('app.pickup.open'), open(item.recordId));
    }
    case 'locked-copies':
      return line(tp('app.pickup.lockedCopies', item.count), t('app.pickup.saveBackup'), () => go('/backup'));
    case 'fresh-backup':
      return line(tp('app.pickup.freshBackup', item.count), t('app.pickup.freshBackupButton'), () => go('/backup'));
    case 'deliveries-sent':
      return line(tp('app.pickup.deliveriesSent', item.count), t('app.pickup.open'), open(item.recordId));
    case 'deliveries-unsigned':
      return line(tp('app.pickup.deliveriesUnsigned', item.count), t('app.pickup.open'), open(item.recordId));
    case 'lab-unsigned':
      return line(tp('app.pickup.labUnsigned', item.count), t('app.pickup.open'), open(item.recordId));
    case 'results':
      return line(tp('app.pickup.results', item.count), t('app.pickup.open'), open(item.recordId));
    case 'agreements':
      return line(tp('app.pickup.agreements', item.count), t('app.pickup.openAgreements'), () => go('/licenses'));
  }
};
