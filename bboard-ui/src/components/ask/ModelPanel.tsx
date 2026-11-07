// The download screen for Ask's optional on-device language model (docs/ask-veilcore.md, v2.1):
// what it is and why someone might want it, its real size, who sees the download (Hugging Face:
// IP, time, which model, the Origin veilcore.org), that starting it needs a connection to this
// site, a storage check before it starts, cancel and resume, and delete.
// Only in a build with the model (VITE_ASK_MODEL, pinned), and only on a computer that can run
// it. On a phone or tablet nothing is shown; on a computer that can't, one line says why.
// Shown in full the first time Ask is opened, then folded to one line.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Link,
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
import { MODEL_BUILT, type PinnedModel } from '../../ask-local/manifest';
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
  // A phone or tablet: nothing. It isn't for them, and a line about it is only noise.
  touch: undefined,
  narrow: 'app.ask.model.notHere.narrow',
  'no-webgpu': 'app.ask.model.notHere.noWebgpu',
  'no-f16': 'app.ask.model.notHere.noF16',
  memory: 'app.ask.model.notHere.memory',
};

export default function ModelPanel({ onChange, folded = false }: { onChange: () => void; folded?: boolean }) {
  const tr = useT();
  const { t } = tr;
  const models = offeredModels();
  const [device, setDevice] = useState<DeviceCheck | undefined>();
  const [pick, setPick] = useState(models[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [open, setOpen] = useState(!folded);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
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
  // Keyboard focus follows the one button there is: Cancel while downloading, then Download/Resume.
  // Only when a download starts or ends, never when the panel first shows.
  const downloading = phase.k === 'downloading';
  const was = useRef(downloading);
  useEffect(() => {
    if (was.current === downloading) return;
    was.current = downloading;
    (downloading ? cancelRef : downloadRef).current?.focus();
  }, [downloading]);

  if (!MODEL_BUILT || !device || !chosen) return null;
  if (!device.ok) {
    const key = NOT_HERE[device.reason];
    return key ? (
      <Typography variant="caption" color="text.secondary" data-ask-model-panel="not-here">
        {t(key)}
      </Typography>
    ) : null;
  }
  if (!open)
    return (
      <Link
        component="button"
        type="button"
        variant="body2"
        onClick={() => setOpen(true)}
        sx={{ alignSelf: 'flex-start', minHeight: 44, textAlign: 'left' }}
        data-ask-model-panel="folded"
      >
        {t('app.ask.model.folded')}
      </Link>
    );

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

  // Announced in steps of a tenth, not on every chunk.
  const tenth = phase.k === 'downloading' && phase.total ? Math.floor((10 * phase.done) / phase.total) * 10 : 0;

  return (
    <Box
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, flexShrink: 0 }}
      data-ask-model-panel={phase.k}
    >
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
            <Typography variant="caption" color="text.secondary">
              {t('app.ask.model.needsConnection')}
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => void remove()}
              sx={{ alignSelf: 'flex-start', minHeight: 44 }}
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
                    control={<Radio />}
                    disabled={downloading}
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
              {t('app.ask.model.check')} {t('app.ask.model.needsConnection')}
            </Typography>
            {phase.k === 'downloading' ? (
              <>
                <LinearProgress
                  variant="determinate"
                  value={phase.total ? (100 * phase.done) / phase.total : 0}
                  aria-label={t('app.ask.model.title')}
                  aria-valuetext={t('app.ask.model.progress', { done: size(phase.done), total: size(phase.total) })}
                />
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ flex: 1 }} aria-hidden="true">
                    {t('app.ask.model.progress', { done: size(phase.done), total: size(phase.total) })}
                  </Typography>
                  <Button ref={cancelRef} onClick={cancelDownload} sx={{ minHeight: 44 }}>
                    {t('app.ask.model.cancel')}
                  </Button>
                </Stack>
                <Box role="status" aria-live="polite" sx={visuallyHidden}>
                  {`${tr.num(tenth)} %`}
                </Box>
              </>
            ) : (
              <>
                {phase.k === 'message' && (
                  <Alert severity="info" variant="outlined" data-ask-model-message={phase.key} role="status">
                    {t(phase.key, phase.vars)}
                  </Alert>
                )}
                <Button
                  ref={downloadRef}
                  variant="outlined"
                  onClick={() => void download()}
                  sx={{ alignSelf: 'flex-start', minHeight: 44 }}
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

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
