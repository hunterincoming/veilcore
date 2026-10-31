// TermsBuilder (/record/:id/license) — standalone terms builder. On save, the agreement
// is hashed locally and attached to the record (a plant, an animal or a strain) + its report
// fingerprint, then created as a Draft the breeder can issue.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import { getRecord } from '../../veilcore/records';
import { isAnimal } from '../../veilcore/animal-profile';
import { isStrain } from '../../veilcore/strain-profile';
import { useT } from '../../i18n/app';
import { forKind, type RecordKind } from '../../i18n/translate';
import {
  sealAgreement,
  createLicense,
  renewLicense,
  getLicense,
  feeNote,
  hasVeilcoreFee,
  SHOW_VEILCORE_FEE,
  agreementLabel,
  agreementTagline,
  type AgreementType,
  type LicenseTerms,
  useAgreementsWaitForBackup,
} from '../../veilcore/licenses';
import { AgreementsBackupFirst } from './AgreementsBackupFirst';
import { AppHeader } from '../AppHeader';
import { AGREEMENTS_REAL } from '../../veilcore/agreements-real';
import { AgreementTermsFields, emptyTermsFor, type SetTerm } from './LicenseTermsFields';
import { AgreementTypeChip } from './AgreementTypeChip';

const isType = (v: string | null): v is AgreementType =>
  v === 'license' || v === 'lab-transfer' || v === 'breeder-share';

export const TermsBuilder: React.FC = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const supersedeId = params.get('supersede') ?? undefined;
  const navigate = useNavigate();
  const record = getRecord(id);
  const prior = supersedeId ? getLicense(supersedeId) : undefined;

  // When renewing, keep the prior agreement's type; otherwise take it from ?type= (the
  // action the user clicked), defaulting to a commercial license.
  const typeParam = params.get('type');
  const type: AgreementType = prior?.type ?? (isType(typeParam) ? typeParam : 'license');

  // What the record is about decides the words and the options (licenses.ts RIGHTS_FOR): a
  // plant is cultivated and propagated, an animal bred and its semen or embryos collected, a
  // strain used, subcultured and the source of derived strains.
  const kind: RecordKind = isAnimal(record) ? 'animal' : isStrain(record) ? 'strain' : 'plant';
  const [t, setT] = useState<LicenseTerms>(prior?.terms ?? emptyTermsFor(type, kind));
  const [busy, setBusy] = useState(false);
  const set: SetTerm = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const tr = forKind(useT(), kind);
  const blocked = useAgreementsWaitForBackup();

  if (!record) {
    return (
      <Box>
        <AppHeader />
        <Typography sx={{ mb: 1 }}>{tr.t('app.lic.builder.notHere')}</Typography>
        <Button component={RouterLink} to="/records" startIcon={<ArrowBackIcon />}>
          {tr.t('app.lic.builder.records')}
        </Button>
      </Box>
    );
  }

  // A commercial license needs a royalty amount; the others just need a counterparty.
  const canSave =
    type === 'license' ? Boolean(t.licensee.trim() && t.royaltyAmount.trim()) : Boolean(t.licensee.trim());

  const onSave = async () => {
    if (!canSave || blocked) return;
    setBusy(true);
    try {
      const { agreementFingerprint, agreementSalt } = await sealAgreement(type, t, record.recordFingerprint);
      const lic = supersedeId
        ? renewLicense(supersedeId, t, agreementFingerprint, agreementSalt)
        : createLicense({
            type,
            recordId: record.id,
            recordFingerprint: record.recordFingerprint,
            dnaFingerprint: record.dnaFingerprint,
            terms: t,
            agreementFingerprint,
            agreementSalt,
          });
      if (lic) navigate(`/license/${lic.id}`);
    } finally {
      setBusy(false);
    }
  };

  const heading = supersedeId
    ? tr.t('app.lic.builder.renewHeading', { type: agreementLabel(type, tr) })
    : agreementLabel(type, tr);
  const saveLabel = tr.t(
    busy ? 'app.lic.builder.saving' : supersedeId ? 'app.lic.builder.saveAmended' : 'app.lic.builder.saveDraft',
  );

  return (
    <Box>
      <AppHeader />
      <AgreementsBackupFirst />
      <Button
        component={RouterLink}
        to={`/record/${record.id}`}
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        {tr.t('app.lic.builder.back', { name: record.strainName })}
      </Button>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="h4">{heading}</Typography>
        <AgreementTypeChip type={type} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {agreementTagline(type, tr)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {tr.t('app.lic.builder.intro', { name: record.strainName })}
        {!AGREEMENTS_REAL && ` ${tr.t('app.copy.agreementsSimulated')}`}
      </Typography>
      {type === 'license' && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: -2, mb: 3 }}
          data-evidence-note=""
        >
          {tr.t('app.lic.evidenceNote')}
        </Typography>
      )}

      <AgreementTermsFields type={type} terms={t} set={set} />

      {SHOW_VEILCORE_FEE && hasVeilcoreFee(type, t) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {feeNote(tr)}
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />
      <Box>
        <Button variant="contained" size="large" disabled={busy || !canSave || blocked} onClick={onSave}>
          {saveLabel}
        </Button>
      </Box>
    </Box>
  );
};
