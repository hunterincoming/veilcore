// A box for a record's proof code that can be scanned (docs/scan-and-labels.md "Proof code QR"):
// the Scan button reads the record page's QR code, or a label's or certificate's, with the camera,
// only when tapped; a USB barcode scanner acting as a keyboard types into it; paste and typing work
// as before. Whatever comes in, the box ends up holding the plain 64-character code, which is what
// gets signed, and a reading that isn't a proof code says so at once.
//
// Nothing is sent anywhere by scanning: the code goes into this box, and from there only into the
// result the lab signs.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { ScanTextField } from './ScanTextField';
import { readProofCode, PROOF_QR_PREFIX } from '../veilcore/proof-code-qr';
import { useT } from '../i18n/app';

type Problem = 'check' | 'notCode';

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
  return (
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
  );
};
