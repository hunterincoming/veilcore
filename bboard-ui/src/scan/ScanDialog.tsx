// The camera (or NFC) window a Scan button opens (docs/scan-and-labels.md). Fetched only when a
// Scan button is pressed, with the code reader it needs (decoder.ts).
//
// The camera is never required: every message here ends with "type it instead", and the button
// that closes the window is the first thing focused. The video stays in this tab; each frame is
// read and dropped. The camera is let go the moment a code is read or the window closes.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';
import { cameraPossible, openDecoder } from './decoder';
import { readOneTag } from './nfc';
import { cleanReading } from './scan-text';

type State = 'starting' | 'looking' | 'denied' | 'noCamera' | 'unsupported' | 'failed' | 'nfcEmpty' | 'nfcOff';

const MESSAGE: Record<Exclude<State, 'starting' | 'looking'>, AppKey> = {
  denied: 'app.scan.denied',
  noCamera: 'app.scan.noCamera',
  unsupported: 'app.scan.unsupported',
  failed: 'app.scan.failed',
  nfcEmpty: 'app.scan.nfcEmpty',
  nfcOff: 'app.scan.nfcOff',
};

/** A camera error, in the words the window uses. */
export const cameraProblem = (e: unknown): State => {
  const name = (e as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') return 'noCamera';
  return 'failed';
};

const ScanDialog: React.FC<{
  mode: 'camera' | 'nfc';
  /**
   * Only codes this says yes to end the scan (the /verify page takes VeilCore labels only); any
   * other code is said to be the wrong one, and the camera keeps looking.
   */
  accept?: (text: string) => boolean;
  onResult: (text: string) => void;
  onClose: () => void;
}> = ({ mode, accept, onResult, onClose }) => {
  const { t } = useT();
  const titleId = useId();
  const statusId = useId();
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>(mode === 'camera' && !cameraPossible() ? 'unsupported' : 'starting');
  const done = useRef(onResult);
  done.current = onResult;
  const ok = useRef(accept);
  ok.current = accept;
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (mode !== 'camera' || !cameraPossible()) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const stop = () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    void (async () => {
      try {
        const [s, decoder] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }),
          openDecoder().catch(() => undefined),
        ]);
        stream = s;
        if (stopped) return stop();
        if (!decoder) {
          setState('failed');
          return stop();
        }
        const v = video.current;
        if (!v) return stop();
        v.srcObject = s;
        await v.play().catch(() => undefined);
        setState('looking');
        const tick = async () => {
          if (stopped) return;
          let text: string | undefined;
          try {
            text = v.readyState >= 2 ? await decoder.read(v) : undefined;
          } catch {
            text = undefined;
          }
          const clean = text ? cleanReading(text) : '';
          if (stopped) return;
          if (clean && ok.current && !ok.current(clean)) {
            setWrong(true);
          } else if (clean) {
            stop();
            done.current(clean);
            return;
          }
          timer = window.setTimeout(() => void tick(), 120);
        };
        void tick();
      } catch (e) {
        if (!stopped) setState(cameraProblem(e));
        stop();
      }
    })();
    return stop;
  }, [mode]);

  useEffect(() => {
    if (mode !== 'nfc') return;
    const ctl = new AbortController();
    setState('looking');
    readOneTag(ctl.signal).then(
      (text) => done.current(text),
      (e: unknown) => {
        if (ctl.signal.aborted) return;
        setState((e as Error)?.message === 'empty' ? 'nfcEmpty' : 'nfcOff');
      },
    );
    return () => ctl.abort();
  }, [mode]);

  const problem = state !== 'starting' && state !== 'looking' ? MESSAGE[state] : undefined;

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={statusId}
      fullWidth
      maxWidth="xs"
      data-scan-dialog={mode}
    >
      <DialogTitle id={titleId}>{t(mode === 'nfc' ? 'app.scan.nfcTitle' : 'app.scan.title')}</DialogTitle>
      <DialogContent>
        {mode === 'camera' && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              bgcolor: 'grey.900',
              borderRadius: 1,
              overflow: 'hidden',
              display: problem ? 'none' : 'block',
            }}
          >
            <video
              ref={video}
              muted
              playsInline
              aria-label={t('app.scan.video')}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {state === 'starting' && (
              <CircularProgress
                size={32}
                sx={{ position: 'absolute', top: '50%', left: '50%', ml: -2, mt: -2, color: '#fff' }}
              />
            )}
            {/* Where to put the code: a square in the middle, as camera apps show. */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                inset: '18% 22%',
                border: '3px solid rgba(255,255,255,0.85)',
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            />
          </Box>
        )}
        <Box id={statusId} role="status" aria-live="polite" sx={{ mt: mode === 'camera' && !problem ? 1.5 : 0 }}>
          {problem ? (
            <Alert severity="info" variant="outlined" data-scan-problem={state}>
              {t(problem)}
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {mode === 'nfc'
                ? t('app.scan.nfcHold')
                : state === 'starting'
                  ? t('app.scan.starting')
                  : wrong
                    ? t('app.scan.notLabel')
                    : t('app.scan.point')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose} sx={{ minHeight: 44 }} data-scan-close="">
          {t('app.scan.typeInstead')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScanDialog;
