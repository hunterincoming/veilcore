// A text field for an ID that can be scanned (docs/scan-and-labels.md): an ordinary MUI text
// field, plus the Scan button (and NFC where the browser has it) at its end, and a stick reader's
// Enter or Tab after a number handled (scan-text.ts readerKeyDown): trimmed, and Enter never
// submits anything. `onEnter` lets a list of boxes move on to the next one, so a reader can fill
// them one tag after another.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { ScanAdornment } from './ScanButton';
import { cleanReading, readerKeyDown } from './scan-text';

export const ScanTextField: React.FC<
  Omit<TextFieldProps, 'value' | 'onChange' | 'label'> & {
    label: string;
    value: string;
    onValue: (v: string) => void;
    /** After a reader's Enter: e.g. the next box in a list. */
    onEnter?: () => void;
  }
> = ({ label, value, onValue, onEnter, slotProps, disabled, ...rest }) => {
  const input = useRef<HTMLInputElement>(null);
  const given = (slotProps ?? {}) as Record<string, object | undefined>;
  return (
    <TextField
      {...rest}
      label={label}
      value={value}
      disabled={disabled}
      inputRef={input}
      onChange={(e) => onValue(e.target.value)}
      onKeyDown={(e) => {
        if (readerKeyDown(e, value, onValue) && e.key === 'Enter') onEnter?.();
      }}
      slotProps={{
        ...given,
        input: {
          ...given.input,
          endAdornment: (
            <ScanAdornment
              field={label}
              disabled={disabled}
              inputRef={input}
              onScan={(text) => onValue(cleanReading(text))}
            />
          ),
        },
      }}
    />
  );
};
