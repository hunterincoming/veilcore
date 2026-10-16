// What happened to this record, in order.
//
// A dispute is a question about sequence: what was held, when, who confirmed it, what
// changed and when. The app has all of that spread across separate panels, which means
// the one view a dispute actually needs does not exist.
//
// Nothing here is new information. It is the same facts, ordered.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { attestationsFor, strengthLabel } from '../veilcore/attesters';
import { useRecordDate } from './verify/useAnchorCheck';
import { anchorHistoryEvent } from './verify/anchor-words';
import type { StrainRecord } from '../veilcore/records';
import { ACCENT } from '../config/theme';
import { utcStamp } from '../veilcore/time';
import { useT } from '../i18n/app';

type Event = { at: number; title: string; detail: string; strong?: boolean };

export const RecordHistory: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const [events, setEvents] = useState<Event[] | null>(null);
  // The batch's date stamp: the same proof and Midnight look-up as the status card and the
  // "Date on Midnight" section (useAnchorCheck.ts), so History never says something else.
  const { proof, anchor } = useRecordDate(record.recordFingerprint);
  const tr = useT();
  const { t } = tr;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out: Event[] = [];

      out.push({
        at: record.loggedAt,
        title: t('app.plant.chain.sealed'),
        detail: record.supersedes
          ? t('app.plant.history.correctionOf', { id: record.supersedes.recordId, reason: record.supersedes.reason })
          : t('app.plant.history.sealed'),
      });

      if (record.receivedAt && record.receivedFrom) {
        out.push({
          at: record.receivedAt,
          title: t('app.plant.history.received'),
          detail: record.quantity
            ? t('app.plant.history.arrivedQty', { from: record.receivedFrom, qty: record.quantity })
            : t('app.plant.history.arrived', { from: record.receivedFrom }),
        });
      }

      const atts = await attestationsFor(record.recordFingerprint);
      for (const a of atts) {
        const s = strengthLabel(a, tr);
        out.push({ at: new Date(a.issuedAt).getTime(), title: s.label, detail: s.why, strong: s.ok });
        if (a.retraction) {
          out.push({
            at: new Date(a.retraction.retractedAt).getTime(),
            title: t('app.plant.history.retracted'),
            detail: t('app.plant.history.retractedDetail', { reason: a.retraction.reason }),
          });
        }
      }

      if (record.supersededBy) {
        out.push({
          at: Date.now(),
          title: t('app.plant.history.corrected'),
          detail: t('app.plant.history.correctedDetail'),
        });
      }

      if (!cancelled) setEvents(out.sort((a, b) => a.at - b.at));
    })();
    return () => {
      cancelled = true;
    };
  }, [record, tr]);

  const all = useMemo(() => {
    if (!events) return null;
    // Only a proof checked here (bound to this record, path folding to its root) is listed.
    if (proof === 'checking' || proof.status !== 'anchor-reported') return events;
    const p = proof.proof;
    const e = anchorHistoryEvent(
      anchor,
      {
        network: p.anchor?.network ?? '',
        txHash: p.anchor?.txHash,
        anchoredAt: p.anchor?.anchoredAt,
        batchId: p.batchId,
      },
      tr,
    );
    if (e.at === undefined) return events;
    return [...events, { at: e.at, title: e.title, detail: e.detail, strong: e.strong }].sort((a, b) => a.at - b.at);
  }, [events, proof, anchor, tr]);

  if (!all || all.length <= 1) return null;

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={0}>
        <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
          {t('app.plant.history.title')}
        </Typography>
        {all.map((e, i) => (
          <Box
            key={i}
            sx={{
              position: 'relative',
              pl: 2.5,
              ml: 0.5,
              pb: i === all.length - 1 ? 0 : 2.5,
              borderLeft: i === all.length - 1 ? 'none' : '1px solid rgba(22,32,27,0.12)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: -4.5,
                top: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: e.strong ? ACCENT : 'rgba(22,32,27,0.3)',
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {e.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {utcStamp(e.at)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {e.detail}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};
