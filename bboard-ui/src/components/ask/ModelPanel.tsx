// The download screen for Ask's optional on-device language model (docs/ask-veilcore.md, v2.1):
// what it is, its real size, who sees the download (Hugging Face: IP, time, which model, the
// Origin veilcore.org), a storage check before it starts, cancel and resume, and delete.
// Shown only in a build with the model (VITE_ASK_MODEL=on and pinned), and only on a computer
// that can run it; elsewhere a line says why Ask uses Shortcuts.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import {
  cancelDownload,
  checkDevice,
  deleteModel,
  modelBytes,
  offeredModels,
  startDownload,
  storageRoom,
  storedModel,
  type DeviceCheck,
} from '../../ask-local/client';
import type { PinnedModel } from '../../ask-local/manifest';
import { modelName } from './useAskEngine';

type Phase =
  | { readonly k: 'idle' }
  | { readonly k: 'downloading'; readonly done: number; readonly total: number }
  | { readonly k: 'stored'; readonly model: PinnedModel }
  | {
      readonly k: 'message';
      readonly key: AppKey;
      readonly vars?: Record<string, string>;
      readonly resumable?: boolean;
    };

const NOT_HERE: Record<Exclude<DeviceCheck, { ok: true }>['reason'], AppKey | undefined> = {
  'not-built': undefined,
  phone: 'app.ask.model.notHere.phone',
  'no-webgpu': 'app.ask.model.notHere.noWebgpu',
  'no-f16': 'app.ask.model.notHere.noF16',
  memory: 'app.ask.model.notHere.memory',
};

export default function ModelPanel({ onChange }: { onChange: () => void }) {
  const tr = useT();
  const { t } = tr;
  const models = offeredModels();
  const [device, setDevice] = useState<DeviceCheck | undefined>();
  const [pick, setPick] = useState(models[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const chosen = models.find((m) => m.id === pick) ?? models[0];

  /** Bytes the way people read them: "1.1 GB", "380 MB". */
  const size = (b: number) =>
    b >= 1e9 ? `${tr.num(Math.round(b / 1e8) / 10)} GB` : `${tr.num(Math.max(1, Math.round(b / 1e6)))} MB`;

  useEffect(() => {
    let live = true;
    void checkDevice().then((d) => live && setDevice(d));
    void storedModel().then((m) => live && m && setPhase({ k: 'stored', model: m }));
    return () => {
      live = false;
    };
  }, []);

  if (!device || !chosen) return null;
  if (!device.ok) {
    const key = NOT_HERE[device.reason];
    return key ? (
      <Typography variant="caption" color="text.secondary" data-ask-model-panel="not-here">
        {t(key)}
      </Typography>
    ) : null;
  }

  const download = async () => {
    const bytes = modelBytes(chosen);
    const room = await storageRoom(bytes);
    if (!room.enough) {
      setPhase({ k: 'message', key: 'app.ask.model.noRoom', vars: { free: size(room.free ?? 0), size: size(bytes) } });
      return;
    }
    setPhase({ k: 'downloading', done: 0, total: bytes });
    startDownload(chosen, {
      progress: (done, total) => setPhase({ k: 'downloading', done, total }),
      end: (out) => {
        if (out.type === 'done') {
          setPhase({ k: 'stored', model: chosen });
          onChange();
        } else if (out.type === 'cancelled')
          setPhase({ k: 'message', key: 'app.ask.model.cancelled', resumable: true });
        else
          setPhase({
            k: 'message',
            key:
              out.reason === 'mismatch'
                ? 'app.ask.model.failed.mismatch'
                : out.reason === 'storage'
                  ? 'app.ask.model.failed.storage'
                  : out.reason === 'policy'
                    ? 'app.ask.model.failed.policy'
                    : 'app.ask.model.failed.network',
            resumable: out.reason === 'network',
          });
      },
    });
  };

  const remove = async () => {
    await deleteModel();
    setPhase({ k: 'message', key: 'app.ask.model.deleted' });
    onChange();
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }} data-ask-model-panel={phase.k}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h3">
          {t('app.ask.model.title')}
        </Typography>
        <Typography variant="body2">{t('app.ask.model.what')}</Typography>
        {phase.k === 'stored' ? (
          <>
            <Typography variant="body2" data-ask-model-stored={phase.model.id}>
              {t('app.ask.model.stored', { name: modelName(phase.model.id) })}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => void remove()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('app.ask.model.delete')}
            </Button>
          </>
        ) : (
          <>
            {models.length > 1 && (
              <RadioGroup
                value={chosen.id}
                onChange={(e) => setPick(e.target.value)}
                aria-label={t('app.ask.model.pick')}
              >
                {models.map((m) => (
                  <FormControlLabel
                    key={m.id}
                    value={m.id}
                    control={<Radio size="small" />}
                    disabled={phase.k === 'downloading'}
                    label={t('app.ask.model.option', { name: modelName(m.id), size: size(modelBytes(m)) })}
                  />
                ))}
              </RadioGroup>
            )}
            <Typography variant="body2">{t('app.ask.model.size', { size: size(modelBytes(chosen)) })}</Typography>
            <Typography variant="body2" data-ask-model-hf="">
              {t('app.ask.model.hf')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('app.ask.model.check')}
            </Typography>
            {phase.k === 'downloading' ? (
              <>
                <LinearProgress variant="determinate" value={phase.total ? (100 * phase.done) / phase.total : 0} />
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {t('app.ask.model.progress', { done: size(phase.done), total: size(phase.total) })}
                  </Typography>
                  <Button size="small" onClick={cancelDownload}>
                    {t('app.ask.model.cancel')}
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                {phase.k === 'message' && (
                  <Alert severity="info" variant="outlined" data-ask-model-message={phase.key}>
                    {t(phase.key, phase.vars)}
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  onClick={() => void download()}
                  sx={{ alignSelf: 'flex-start' }}
                  data-ask-model-download=""
                >
                  {phase.k === 'message' && phase.resumable
                    ? t('app.ask.model.resume')
                    : t('app.ask.model.download', { size: size(modelBytes(chosen)) })}
                </Button>
              </>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
