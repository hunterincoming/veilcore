// The record's proof code as a QR code, beside the code itself, for a lab to scan into its result
// form (veilcore/proof-code-qr.ts, docs/scan-and-labels.md). Drawn on this device; it carries the
// proof code and a check, nothing else, and the proof code is public on the check page already.
// Black on white whatever the theme: a scanner reads dark modules on a light ground.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useT } from '../../i18n/app';
import { proofCodeQrText } from '../../veilcore/proof-code-qr';

export const ProofCodeQr: React.FC<{ code: string }> = ({ code }) => {
  const { t } = useT();
  let text: string;
  try {
    text = proofCodeQrText(code);
  } catch {
    return null;
  }
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }} data-proof-code-qr={text}>
      <Box component="span" sx={{ display: 'inline-flex', p: 1, background: '#fff', borderRadius: 1, flex: 'none' }}>
        <QRCodeSVG
          value={text}
          size={128}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={2}
          role="img"
          aria-label={t('app.plant.f.proofQrLabel')}
        />
      </Box>
      <Typography component="span" variant="caption" color="text.secondary">
        {t('app.plant.f.proofQrText')}
      </Typography>
    </Box>
  );
};
