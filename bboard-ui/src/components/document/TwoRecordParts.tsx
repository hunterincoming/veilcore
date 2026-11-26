// The parts of "Compare two of your records" that its check page shares (TwoRecordClaims.tsx,
// TwoClaimCheck.tsx): what neither claim shows, the status line, a claim and a refusal in words.
// Nothing here reads or keeps records, so the check page loads none of the record app.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  TWO_RECORD_FORMS,
  comparedOf,
  formSlots,
  twoRecordStatusKey,
  type TwoClaim,
  type TwoKind,
  type TwoRefusal,
} from '../../veilcore/two-record-claims';
import { TWO_RECORD_CLAIMS_RUN_ON_MAINNET } from '../../config/copy';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import { schemaWords, slotWords } from './NumbersFields';

/** The forms' names, in the page's language, as one list ("Cannabinoid potency, Seed quality, …"). */
const formsList = (tr: Translator): string => TWO_RECORD_FORMS.map((f) => schemaWords(f, tr)).join(', ');

/** A refusal in words. */
export const refusalWords = (r: TwoRefusal, tr: Translator): string =>
  tr.t(r.key, { ...(r.vars ?? {}), forms: formsList(tr) });

/** A slot's name, from its form ("Total THC"). */
export const slotName = (schema: string, slot: number, tr: Translator): string => {
  const s = formSlots(schema).find((x) => x.slot === slot);
  return s ? slotWords(s.path, tr) : String(slot);
};

/** A list of slots in words ("Total THC, Total CBD"). */
export const slotList = (schema: string, slots: readonly number[], tr: Translator): string =>
  slots.map((i) => slotName(schema, i, tr)).join(', ');

/** What neither claim shows, said wherever it is offered or checked. */
export const NOT_SHOWN: Record<TwoKind, readonly AppKey[]> = {
  distinct: [
    'app.tworec.not.examine',
    'app.tworec.not.which',
    'app.tworec.not.typed',
    'app.tworec.not.reference',
    'app.tworec.not.oneParty',
    'app.tworec.not.sealed',
  ],
  unchanged: [
    'app.tworec.not.correction',
    'app.tworec.not.ticked',
    'app.tworec.not.onlyNumbers',
    'app.tworec.not.typed',
    'app.tworec.not.oneParty',
    'app.tworec.not.sealed',
  ],
};

export const TwoRecordLimits: React.FC<{ kind: TwoKind }> = ({ kind }) => {
  const { t } = useT();
  return (
    <Box data-two-limits={kind}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
        {t('app.tworec.not.title')}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {NOT_SHOWN[kind].map((k) => (
          <Typography key={k} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t(k)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

/** The status line: built, not yet run on mainnet, until the reviewed flag says it has. */
export const TwoRecordStatus: React.FC<{ ranOnMainnet?: boolean }> = ({
  ranOnMainnet = TWO_RECORD_CLAIMS_RUN_ON_MAINNET,
}) => {
  const { t } = useT();
  const key = twoRecordStatusKey(ranOnMainnet);
  return (
    <Typography variant="body2" color="text.secondary" data-two-status={key.split('.').pop()}>
      {t(key)}
    </Typography>
  );
};

/** A claim about two records in words, with the records' names. */
export const twoClaimWords = (
  c: Pick<TwoClaim, 'kind' | 'schema' | 'mayChange'>,
  names: { a: string; b: string },
  tr: Translator,
): string => {
  if (c.kind === 'distinct') return tr.t('app.tworec.line.distinct', { ...names, k: String(comparedOf(c.schema).k) });
  const list = c.mayChange ?? [];
  return list.length === 0
    ? tr.t('app.tworec.line.unchangedNone', names)
    : tr.t('app.tworec.line.unchanged', { ...names, list: slotList(c.schema, list, tr) });
};
