// The holder's plan on the records page (paid plans, billing.ts). Off unless PAID_PLANS_ENABLED.
// Free: how many records of the free number are used, and the plans to choose from (each opens
// Paddle's own page in a new tab). Paid: the plan's name. Either way, the line that every record
// already held keeps verifying.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { PAID_PLANS_ENABLED } from '../config/network';
import { PLANS, freeLeft, openCheckout, refreshPlan, usePlan, type PlanName } from '../veilcore/billing';
import { useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

export const PlanBox: React.FC<{ heldHere: number; compact?: boolean }> = ({ heldHere, compact = false }) => {
  const { t } = useT();
  const plan = usePlan();
  const [error, setError] = useState<AppKey | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (PAID_PLANS_ENABLED) void refreshPlan();
  }, []);
  if (!PAID_PLANS_ENABLED || !plan) return null;
  const left = freeLeft(plan, heldHere);
  // Compact (the start screen): only when the free number is used up.
  if (compact && left !== 0) return null;
  const choose = async (p: PlanName) => {
    setBusy(true);
    setError(await openCheckout(p));
    setBusy(false);
  };
  const held = Math.max(heldHere, plan.recordsHeld);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }} data-plan-box={plan.plan}>
      <Stack spacing={1.25}>
        {left === null ? (
          <Typography variant="subtitle2" component="h2">
            {t('app.plan.box.paid', { plan: t(`app.plan.name.${plan.plan}` as AppKey) })}
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PLANS.map((p) => (
                <Button
                  key={p}
                  variant={left === 0 && p === 'breeder' ? 'contained' : 'outlined'}
                  disabled={busy}
                  onClick={() => void choose(p)}
                  sx={{ minHeight: 44 }}
                  data-plan-choose={p}
                >
                  {t(`app.plan.buy.${p}`)}
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
