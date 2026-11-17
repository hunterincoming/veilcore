// The holder's plan on the records page (paid plans, billing.ts). Off unless PAID_PLANS_ENABLED.
// Free: how many of the free number of dated records are used, and the plans to choose from (each opens
// Paddle's own page in a new tab). Paid: the plan's name. Either way, the line that every record
// already held keeps verifying.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { PAID_PLANS_ENABLED } from '../config/network';
import { KNOWN_PLANS, freeLeft, openCheckout, refreshPlan, usePlan, watchPlanOnReturn } from '../veilcore/billing';
import { useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

const known = (p: string): p is (typeof KNOWN_PLANS)[number] => (KNOWN_PLANS as readonly string[]).includes(p);

/** `waiting`: records here that VeilCore hasn't stored yet and that will count (records.ts waitingHere). */
export const PlanBox: React.FC<{ waiting: number; compact?: boolean }> = ({ waiting, compact = false }) => {
  const { t } = useT();
  const plan = usePlan();
  const [error, setError] = useState<AppKey | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!PAID_PLANS_ENABLED) return undefined;
    void refreshPlan();
    // Back from Paddle's tab: read again, so a plan just bought shows at once.
    return watchPlanOnReturn();
  }, []);
  if (!PAID_PLANS_ENABLED || !plan) return null;
  const left = freeLeft(plan, waiting);
  // Compact (the start screen): only when the free number is used up.
  if (compact && left !== 0) return null;
  // Not async before openCheckout: the tab must open in the click itself.
  const choose = (p: string) => {
    setBusy(true);
    void openCheckout(p).then((e) => {
      setError(e);
      setBusy(false);
    });
  };
  const nameOf = (p: string) => (known(p) ? t(`app.plan.name.${p}`) : p);
  const buyLabel = (p: string) => (known(p) ? t(`app.plan.buy.${p}`) : t('app.plan.buy.other', { plan: p }));
  // Received records not sealed yet hold their slot too (the registry's recordsReserved).
  const held = plan.recordsCounted + plan.recordsReserved + waiting;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }} data-plan-box={plan.plan}>
      <Stack spacing={1.25}>
        {left === null ? (
          <Typography variant="subtitle2" component="h2">
            {t('app.plan.box.paid', { plan: nameOf(plan.plan) })}
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle2" component="h2">
              {t('app.plan.box.free', { held: String(Math.min(held, plan.recordCap)), cap: String(plan.recordCap) })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={plan.recordCap ? Math.min(100, (held / plan.recordCap) * 100) : 100}
              aria-label={t('app.plan.box.left', { n: String(left) })}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="body2" color={left === 0 ? 'error' : 'text.secondary'} data-plan-left={left}>
              {left === 0 ? t('app.plan.box.full') : t('app.plan.box.left', { n: String(left) })}
            </Typography>
            <Typography variant="body2" color="text.secondary" data-plan-counts-deleted="">
              {t('app.plan.box.countsDeleted')} {t('app.plan.box.rules')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {plan.plans.map((p, i) => (
                <Button
                  key={p}
                  variant={left === 0 && i === 0 ? 'contained' : 'outlined'}
                  disabled={busy}
                  onClick={() => choose(p)}
                  sx={{ minHeight: 44 }}
                  data-plan-choose={p}
                >
                  {buyLabel(p)}
                </Button>
              ))}
              <Button color="inherit" disabled={busy} onClick={() => void refreshPlan()} sx={{ minHeight: 44 }}>
                {t('app.plan.recheck')}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t('app.plan.opens')}
            </Typography>
          </>
        )}
        {left !== null && left > 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('app.plan.keep')}
          </Typography>
        )}
        {error && (
          <Alert severity="warning" variant="outlined">
            {t(error)}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
};
