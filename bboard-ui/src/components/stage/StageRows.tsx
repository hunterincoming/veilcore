// The plant page's rows for a breeding history (RecordDetail.tsx, "More you can do"):
// "Add the next generation or selection" on the breeder's own plants, and "Date this lab
// report" beside a saved lab report (product-ideas.md items 1 and 3).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { StrainRecord } from '../../veilcore/records';
import type { SavedReport } from '../../veilcore/saved-report';
import { ActionRow } from '../flow/PlantParts';
import { DateLabReport } from './DateLabReport';
import { canAddNextStage, nextStagePath } from './stage-notes';
import { useRecordT } from '../../i18n/app';
import { isAnimal } from '../../veilcore/animal-profile';

export const StageRows: React.FC<{
  record: StrainRecord;
  labOnly: boolean;
  /** Where the lab report saved to this plant stands (useSavedReport); null while loading. */
  saved: SavedReport | null | undefined;
}> = ({ record, labOnly, saved }) => {
  const navigate = useNavigate();
  const { t } = useRecordT(record);
  return (
    <>
      {/* An animal has no next stage: its offspring is an animal logged with it as sire or dam. */}
      {canAddNextStage(record, labOnly) && !isAnimal(record) && (
        <ActionRow
          section="log"
          label={t('app.plant.action.nextStage')}
          hint={t('app.plant.action.nextStageHint')}
          onClick={() => navigate(nextStagePath(record.id))}
        />
      )}
      {!labOnly && <DateLabReport record={record} saved={saved} variant="row" />}
    </>
  );
};
