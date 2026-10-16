// HeritableRights — obligations that carry to declared descendants. Only descendants
// logged with this cultivar as a parent, with both holders confirming the link, carry
// the obligation; propagation nobody records is not detected.
//
// An obligation is never entered here. It is created by an agreement that carries an
// offspring royalty, and discharged when that agreement is revoked. Terms live in one
// place; this shows what they mean for anything descended from this cultivar.
//
// A buyer checking clean descent learns only accepted or rejected — never the
// ancestry, never the terms, never the genetics.
//
// A breeder's own selection chain (F1, then F2 sealed with F1 as its parent) must not read
// as royalties owed to themselves, and VeilCore must not decide that either way: the panel
// says, as facts, which records are their own, which agreement the royalty is in and whom it
// names, and that the registry records obligations without judging them
// (components/stage/self-chain.ts).
//
// In English in every language, like the agreements it comes from (components/licensing):
// a note in the page's language says so, and lang="en" lets a screen reader read it as English.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import GavelIcon from '@mui/icons-material/GavelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import { verifyDescent, lineageRoot, type DescentVerdict } from '../veilcore/lineage';
import { allLicenses, createsHeritableObligation } from '../veilcore/licenses';
import { allRecords, type StrainRecord } from '../veilcore/records';
import {
  RECORDS_NOT_JUDGES,
  ancestryVerdictText,
  ownOffspringNote,
  upstreamOwnRoyalties,
  upstreamOwnRoyaltyNote,
} from './stage/self-chain';
import { MUTED_COLOR } from '../config/theme';
import { InEnglishPage } from '../i18n/app';

export const HeritableRights: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const [root, setRoot] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<DescentVerdict | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    lineageRoot().then(setRoot);
  }, []);

  // Agreements on this record that put an obligation on its offspring.
  const heritable = allLicenses().filter(
    (l) => l.recordId === record.id && l.state === 'active' && createsHeritableObligation(l.type, l.terms),
  );

  const heritableOn = (recordId: string) =>
    allLicenses().filter(
      (l) => l.recordId === recordId && l.state === 'active' && createsHeritableObligation(l.type, l.terms),
    );
  const ownOffspring = ownOffspringNote(record, allRecords(), heritable);
  const upstreamOwn = upstreamOwnRoyaltyNote(record, allRecords(), heritableOn);
  // The breeder's own agreements on this line, for the ancestry check's words.
  const ownLine = [
    ...(heritable.length && !record.receivedFrom ? [{ name: record.strainName, agreements: heritable }] : []),
    ...upstreamOwnRoyalties(record, allRecords(), heritableOn).map((u) => ({
      name: u.record.strainName,
      agreements: u.agreements,
    })),
  ];

  const parentIds = (record.parents ?? []).map((p) => p.recordId).filter(Boolean) as string[];
  const parentFingerprints = allRecords()
    .filter((r) => parentIds.includes(r.id))
    .map((r) => r.recordFingerprint);

  const check = async () => {
    setBusy(true);
    setVerdict(await verifyDescent(record.recordFingerprint, parentFingerprints));
    setBusy(false);
  };

  return (
    <Stack spacing={2}>
      <InEnglishPage section />
      <Stack spacing={2} lang="en">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <GavelIcon sx={{ color: MUTED_COLOR, fontSize: 20 }} />
          <Typography variant="overline">Obligations on offspring</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          An agreement with an offspring royalty records an obligation on offspring declared from this cultivar: records
          sealed with it as a parent, with both holders confirming the link. While the agreement is active, an ancestry
          check on those offspring reports the obligation. {RECORDS_NOT_JUDGES} Propagation nobody declares isn&apos;t
          detected.
        </Typography>

        {heritable.length > 0 ? (
          <Stack spacing={1}>
            {heritable.map((l) => (
              <Stack key={l.id} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" variant="outlined" color="warning" label="Obligation recorded" />
                <Typography variant="body2">{l.terms.offspringRoyaltyPct}% of offspring revenue</Typography>
                <Button size="small" component={RouterLink} to={`/license/${l.id}`}>
                  {l.id}
                </Button>
              </Stack>
            ))}
            <Typography variant="caption" color="text.secondary">
              Ended by revoking the agreement. The terms are never sent, only their fingerprint.
            </Typography>
            {ownOffspring && (
              <Typography variant="body2" color="text.secondary" data-own-offspring="">
                {ownOffspring}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No obligation on this cultivar&apos;s offspring. An agreement with an offspring royalty creates one when it
            becomes active.
          </Typography>
        )}

        {upstreamOwn && (
          <Typography variant="body2" color="text.secondary" data-upstream-own="">
            {upstreamOwn}
          </Typography>
        )}

        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button size="small" variant="outlined" onClick={check} disabled={busy}>
              Check its ancestry
            </Button>
            <Typography variant="caption" color="text.secondary">
              {parentFingerprints.length > 0
                ? `${parentFingerprints.length} declared ancestor${parentFingerprints.length === 1 ? '' : 's'}`
                : 'no declared ancestors'}
            </Typography>
          </Stack>
        </Box>

        {verdict && (
          <Alert
            severity={verdict.ok ? ((verdict.generationsChecked ?? 0) > 0 ? 'success' : 'info') : 'warning'}
            icon={verdict.ok ? <CheckCircleIcon /> : <BlockIcon />}
            variant="outlined"
          >
            {ancestryVerdictText(verdict, parentFingerprints.length, ownLine)}
          </Alert>
        )}

        {root && (
          <Typography variant="caption" color="text.secondary">
            Fingerprint of every obligation the registry holds: {root.slice(0, 16)}…
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};
