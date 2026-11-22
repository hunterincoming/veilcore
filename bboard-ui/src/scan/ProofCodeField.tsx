// A box for a record's proof code that can be scanned (docs/scan-and-labels.md "Proof code QR"):
// the Scan button reads the record page's QR code, or a label's or certificate's, with the camera,
// only when tapped; a USB barcode scanner acting as a keyboard types into it; paste and typing work
// as before. Whatever comes in, the box ends up holding the plain 64-character code, which is what
// gets signed, and a reading that isn't a proof code says so at once.
//
// Once the box holds a whole proof code, its last 6 characters show large, with a line asking the
// technician to check them against the code the sender gave: a scan of the wrong tube's code would
// otherwise go unnoticed until the client checks the result (security review, 22 Nov).
//
// Nothing is sent anywhere by scanning: the code goes into this box, and from there only into the
// result the lab signs.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ScanTextField } from './ScanTextField';
import { readProofCode, PROOF_QR_PREFIX } from '../veilcore/proof-code-qr';
import { useT } from '../i18n/app';

type Problem = 'check' | 'notCode';

/** The plain code the box ends up holding once a reading is whole. */
const WHOLE = /^[0-9a-f]{64}$/;

export const ProofCodeField: React.FC<{
  label: string;
  helperText: string;
  value: string;
  onValue: (v: string) => void;
  /** The form's own refusal for this box (at signing). */
  error?: boolean;
  dataField: string;
}> = ({ label, helperText, value, onValue, error, dataField }) => {
  const { t } = useT();
  const [problem, setProblem] = useState<Problem>();
  const latest = useRef(value);
  latest.current = value;

  // A complete reading (the QR text, a link, a 64-character code) becomes the plain code.
  const take = (v: string, settled: boolean) => {
    const r = readProofCode(v);
    if (r.ok) {
      setProblem(undefined);
      onValue(r.code);
      return;
    }
    onValue(v.slice(0, 500));
    if (r.why === 'empty') setProblem(undefined);
    // The record page's QR text at its full length that fails its check: wrong at once, before
    // any Enter (a scanner may send none).
    else if (r.why === 'check' && v.replace(/\s+/g, '').length >= PROOF_QR_PREFIX.length + 68) setProblem('check');
    else if (settled) setProblem(r.why);
    else if (problem) setProblem(undefined);
  };

  const shown = problem;
  const end = !shown && WHOLE.test(value) ? value.slice(-6) : undefined;
  return (
    <Box>
      <ScanTextField
        label={label}
        value={value}
        onValue={(v) => take(v, false)}
        onScanned={(text) => take(text, true)}
        onEnter={() => take(latest.current, true)}
        onBlur={() => latest.current.trim() && take(latest.current, true)}
        error={!!shown || !!error}
        helperText={
          shown === 'check'
            ? t('app.lr.form.subjectBadCheck')
            : shown === 'notCode'
              ? t('app.lr.form.subjectNotCode')
              : helperText
        }
        fullWidth
        slotProps={{
          htmlInput: {
            maxLength: 500,
            'data-field': dataField,
            spellCheck: false,
            autoCapitalize: 'off',
            autoCorrect: 'off',
            autoComplete: 'off',
            'data-proof-code-problem': shown ?? '',
          },
          formHelperText: { role: shown ? 'alert' : undefined },
        }}
      />
      {end && (
        <Box
          role="status"
          data-proof-code-end={end}
          sx={{ mt: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('app.lr.form.subjectEnd')}
          </Typography>
          <Typography
            component="p"
            sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.2em', lineHeight: 1.3 }}
          >
            {end}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.form.subjectEndCheck')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
