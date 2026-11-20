// "Scan" beside an ID box (docs/scan-and-labels.md): the camera reads a QR code or barcode into
// the box, on this device. On Chrome for Android a second button reads an NFC tag. Typing always
// works: the buttons only fill the box, which stays as editable as before, and after a scan the
// focus goes back to it with a spoken "Scanned into …, check it".
//
// What is scanned goes only where the box already goes. In a record's form that is the sealed,
// locked record; nothing about a scan is sent anywhere, and there is no look-up by tag number.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useState } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScannerOutlined';
import NfcIcon from '@mui/icons-material/NfcOutlined';
import { useT } from '../i18n/app';
import { visuallyHidden } from '../components/flow/FlowFrame';
import { nfcAvailable } from './nfc';

const ScanDialog = lazy(() => import('./ScanDialog'));

export const ScanButtons: React.FC<{
  /** The box's label, for the button's name and the window. */
  field: string;
  onScan: (text: string) => void;
  /** The box, to give it the focus back after a scan. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}> = ({ field, onScan, inputRef, disabled }) => {
  const { t } = useT();
  const [open, setOpen] = useState<'camera' | 'nfc'>();
  const [said, setSaid] = useState('');
  const nfc = nfcAvailable();
  // Closing without a code ("Type it instead", Escape): back to the box, to type.
  const close = () => {
    setOpen(undefined);
    window.setTimeout(() => inputRef?.current?.focus(), 0);
  };
  return (
    <>
      <IconButton
        aria-label={t('app.scan.buttonLabel')}
        onClick={() => {
          setSaid('');
          setOpen('camera');
        }}
        disabled={disabled}
        edge="end"
        sx={{ minWidth: 44, minHeight: 44 }}
        data-scan-button=""
      >
        <QrCodeScannerIcon />
      </IconButton>
      {nfc && (
        <IconButton
          aria-label={t('app.scan.nfcLabel')}
          onClick={() => {
            setSaid('');
            setOpen('nfc');
          }}
          disabled={disabled}
          sx={{ minWidth: 44, minHeight: 44 }}
          data-nfc-button=""
        >
          <NfcIcon />
        </IconButton>
      )}
      <span role="status" style={visuallyHidden}>
        {said}
      </span>
      {open && (
        <Suspense fallback={null}>
          <ScanDialog
            mode={open}
            onClose={close}
            onResult={(text) => {
              close();
              onScan(text);
              setSaid(t('app.scan.done', { field }));
              window.setTimeout(() => inputRef?.current?.focus(), 0);
            }}
          />
        </Suspense>
      )}
    </>
  );
};

/** The buttons as a text field's end adornment: `slotProps={{ input: { endAdornment: <ScanAdornment … /> } }}`. */
export const ScanAdornment: React.FC<React.ComponentProps<typeof ScanButtons>> = (p) => (
  <InputAdornment position="end">
    <ScanButtons {...p} />
  </InputAdornment>
);
