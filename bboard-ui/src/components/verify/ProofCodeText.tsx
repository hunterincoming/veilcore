// A proof code on the check page with its last 6 characters in bold monospace: the same 6 a
// printed label shows large (veilcore/proof-end.ts), so a person can match the two by eye.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import { PROOF_END_FONT, splitProofEnd } from '../../veilcore/proof-end';

/** One proof code as shown (whole, or shortened by shortFingerprint), its end emphasised. */
export const ProofCode: React.FC<{ shown: string }> = ({ shown }) => {
  const { head, end } = splitProofEnd(shown);
  return (
    <Box component="span" data-proof-code="">
      {head}
      {end && (
        <Box
          component="strong"
          data-proof-end=""
          sx={{ fontFamily: PROOF_END_FONT, fontWeight: 700, fontSize: '1.15em', letterSpacing: '0.04em' }}
        >
          {end}
        </Box>
      )}
    </Box>
  );
};

// A character no translation contains, standing in for the code while the sentence is translated.
const SLOT = '\u0000';

/**
 * A translated sentence with the proof code in it, the code drawn by ProofCode. `say` is called
 * with the stand-in in the code's place; the words around it are kept exactly as translated.
 */
export const withProofCode = (say: (fp: string) => string, shown: string): React.ReactNode => {
  const parts = say(SLOT).split(SLOT);
  if (parts.length === 1) return parts[0];
  return parts.map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 && <ProofCode shown={shown} />}
      {p}
    </React.Fragment>
  ));
};
