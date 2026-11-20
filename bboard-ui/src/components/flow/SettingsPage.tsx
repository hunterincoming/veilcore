// /settings: records saved with VeilCore (veilcore/account-copy.ts) and the downloaded copy.
//
// The backup file moved here as "Download a copy" (the founder's decision): it still works as it
// did (/backup), it's just not the first thing anyone is asked for. What this page shows of the
// saved copy is read from the list sealed inside it (security review S4, S5): the ways in, and
// any the registry has that this person didn't add; the devices and when each last saved (S17).
// "Saved with VeilCore" says plainly that it depends on VeilCore's server (S14). The recovery sheet
// (step 3) is made, made again and checked here, and a device brought back with it adds Face ID.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { AppHeader } from '../AppHeader';
import { FlowFrame, ScreenHeading } from './FlowFrame';
import { useT } from '../../i18n/app';
import { deleteAccountCopy, forgetDevice, useAccountState } from '../../veilcore/account-copy';
import { backupMessageWords } from './backup-words';
import { deviceWords, openKeepSafe, useUnlockWord } from './KeepSafe';
import { openRecoverySheet } from './RecoverySheet';
import type { AppKey } from '../../i18n/app/en';
import { hydrate } from '../../veilcore/records';

export const SettingsPage: React.FC = () => {
  const tr = useT();
  const { t, tp } = tr;
  const navigate = useNavigate();
  const s = useAccountState();
  const word = useUnlockWord();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [stopped, setStopped] = useState(false);

  const stop = async () => {
    if (!window.confirm(t('app.settings.stopConfirm'))) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await deleteAccountCopy();
      await hydrate().catch(() => undefined);
      setStopped(true);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log">
        <Stack spacing={2.5}>
          <ScreenHeading>{t('app.settings.title')}</ScreenHeading>

          {s.kind !== 'off' && (
            <Paper variant="outlined" sx={{ p: 2 }} data-settings-account={s.kind}>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                {t('app.settings.account.title')}
              </Typography>
              {s.kind === 'saved' ? (
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    {s.counted && <DoneIcon color="success" fontSize="small" aria-hidden="true" sx={{ mt: 0.25 }} />}
                    <Typography variant="body1">
                      {s.counted
                        ? t('app.settings.account.on', { date: tr.date(s.savedAt) })
                        : t('app.settings.account.bound', { date: tr.date(s.savedAt) })}
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle2" component="h3" sx={{ pt: 0.5 }}>
                    {t('app.settings.ways.title')}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {s.slots.map((w) => (
                      <li key={w.slotId} data-settings-way={w.kind}>
                        <Typography variant="body2">
                          {w.kind === 'recovery'
                            ? t('app.settings.ways.sheet', { date: tr.date(w.createdAt) })
                            : t(w.synced ? 'app.settings.ways.synced' : 'app.settings.ways.bound', {
                                date: tr.date(w.createdAt),
                              })}
                        </Typography>
                        {w.kind === 'recovery' && (
                          <Typography variant="body2" color="text.secondary">
                            {w.verifiedAt
                              ? t('app.settings.ways.sheetChecked', { date: tr.date(w.verifiedAt) })
                              : t('app.settings.ways.sheetUnchecked')}
                          </Typography>
                        )}
                        {w.tag && (
                          <Typography variant="body2" color="text.secondary" data-settings-tag={w.tag}>
                            {t('app.settings.ways.tag', { tag: w.tag })}
                          </Typography>
                        )}
                      </li>
                    ))}
                  </Box>
                  <Box data-settings-sheet={s.sheet ? (s.sheet.checked ? 'checked' : 'unchecked') : 'none'}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('app.settings.sheet.why')}
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {s.faceIdHere ? (
                        <Button
                          variant={s.sheet?.checked ? 'outlined' : 'contained'}
                          onClick={() => openRecoverySheet('make')}
                          sx={{ minHeight: 44 }}
                          data-settings-make-sheet=""
                        >
                          {t(s.sheet ? 'app.settings.sheet.makeNew' : 'app.settings.sheet.make')}
                        </Button>
                      ) : (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {t('app.settings.faceId.here')}
                          </Typography>
                          <Button
                            variant="contained"
                            onClick={openKeepSafe}
                            sx={{ minHeight: 44 }}
                            data-settings-add-face-id=""
                          >
                            {t(`app.account.use.${word}` as AppKey)}
                          </Button>
                        </Box>
                      )}
                      {s.sheet && (
                        <Button
                          color="inherit"
                          variant="outlined"
                          onClick={() => openRecoverySheet('check')}
                          sx={{ minHeight: 44 }}
                          data-settings-check-sheet=""
                        >
                          {t('app.settings.sheet.check')}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                  {s.unknownSlots.length > 0 && (
                    <Alert severity="warning" variant="outlined" data-settings-unknown-slot="">
                      {tp('app.settings.ways.unknown', s.unknownSlots.length)}
                    </Alert>
                  )}
                  {s.devices.length > 0 && (
                    <>
                      <Typography variant="subtitle2" component="h3" sx={{ pt: 0.5 }}>
                        {t('app.settings.devices.title')}
                      </Typography>
                      <Stack spacing={0.5}>
                        {s.devices.map((d) => (
                          <Stack key={d.id} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="body2">
                              {t(d.here ? 'app.settings.devices.here' : 'app.settings.devices.line', {
                                device: deviceWords(d.kind, tr),
                                date: tr.date(d.at),
                              })}
                            </Typography>
                            {!d.here && s.staleDevices.some((x) => x.id === d.id) && (
                              <Button
                                size="small"
                                color="inherit"
                                variant="outlined"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      t('app.settings.devices.removeConfirm', { device: deviceWords(d.kind, tr) }),
                                    )
                                  )
                                    forgetDevice(d.id);
                                }}
                                sx={{ minHeight: 36 }}
                              >
                                {t('app.account.line.gone')}
                              </Button>
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    </>
                  )}
                  <Typography variant="body2" color="text.secondary" data-settings-why="">
                    {t('app.settings.account.why')}
                  </Typography>
                  <Box>
                    <Button
                      color="inherit"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => void stop()}
                      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                      sx={{ minHeight: 44 }}
                    >
                      {t('app.settings.stop')}
                    </Button>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.25}>
                  {stopped && (
                    <Typography variant="body2" role="status">
                      {t('app.settings.stopped')}
                    </Typography>
                  )}
                  <Typography variant="body1">{t('app.settings.account.off')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('app.settings.account.why')}
                  </Typography>
                  <Box>
                    <Button variant="contained" onClick={openKeepSafe} sx={{ minHeight: 48 }} data-settings-set-up="">
                      {t(s.kind === 'older' ? 'app.account.line.continue' : 'app.account.sheet.title')}
                    </Button>
                  </Box>
                </Stack>
              )}
              {problem && (
                <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }}>
                  {backupMessageWords(problem, tr)}
                </Alert>
              )}
            </Paper>
          )}

          <Divider />

          <Paper variant="outlined" sx={{ p: 2 }} data-settings-file="">
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t('app.settings.file.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {t('app.settings.file.text')}
            </Typography>
            <Button variant="outlined" onClick={() => void navigate('/backup')} sx={{ minHeight: 48 }}>
              {t('app.settings.file.button')}
            </Button>
          </Paper>
        </Stack>
      </FlowFrame>
    </Box>
  );
};
