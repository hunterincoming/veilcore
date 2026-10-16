// The record app in English: its network-dependent phrases. The English is config/copy.ts
// itself, so the app reads exactly as before; translations give each build's version
// (IS_MAINNET) in their own words.
// SPDX-License-Identifier: Apache-2.0
import {
  AGREEMENTS_SIMULATED,
  AGREEMENT_RECORDED,
  CLAIMS_WHERE,
  DATED_ON,
  LICENSE_PROOF_NOTE,
  OUR_SERVER,
  PRACTICE_LABEL,
  SIMULATED_TAG,
  THIS_SITE,
} from '../../../config/copy';

export const copy = {
  'app.copy.thisSite': THIS_SITE,
  'app.copy.simulatedTag': SIMULATED_TAG,
  'app.copy.agreementRecorded': AGREEMENT_RECORDED,
  'app.copy.ourServer': OUR_SERVER,
  'app.copy.datedOn': DATED_ON,
  'app.copy.claimsWhere': CLAIMS_WHERE,
  'app.copy.licenseProofNote': LICENSE_PROOF_NOTE,
  'app.copy.agreementsSimulated': AGREEMENTS_SIMULATED,
  'app.copy.practiceLabel': PRACTICE_LABEL,
};
