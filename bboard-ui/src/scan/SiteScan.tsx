// The check page's "Scan a label's QR code" (/verify, components/site/Founders.tsx VerifyLookup):
// fetched only when pressed, so the public page's first download stays as it was
// (load-split.test.ts). A VeilCore check link opens its check page on this site (only its path:
// scan-text.ts checkPathOf); anything else goes into the record ID box as it reads.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ScanDialog from './ScanDialog';
import { checkPathOf, cleanReading, isRecordId } from './scan-text';

const SiteScan: React.FC<{ onText: (text: string) => void; onClose: () => void }> = ({ onText, onClose }) => {
  const navigate = useNavigate();
  return (
    <ScanDialog
      mode="camera"
      accept={(text) => !!checkPathOf(text) || isRecordId(text)}
      onClose={onClose}
      onResult={(text) => {
        onClose();
        const path = checkPathOf(text);
        if (path) void navigate(path);
        else onText(cleanReading(text));
      }}
    />
  );
};

export default SiteScan;
