// The plant page's rows for a breeding history (RecordDetail.tsx, "More you can do"):
// "Add the next generation or selection" on the breeder's own plants, and "Date this lab
// report" beside a saved lab report (product-ideas.md items 1 and 3). On a plant, the next
// generation and cutting clones are one row since 22 Nov, "Next generation or clones", which asks
// which of the two; an animal keeps its one row for offspring.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { StrainRecord } from '../../veilcore/records';
import type { SavedReport } from '../../veilcore/saved-report';
import { ActionRow } from '../flow/PlantParts';
import { DateLabReport } from './DateLabReport';
import { canAddNextStage, nextStagePath } from './stage-notes';
import { useRecordT } from '../../i18n/app';
import { isAnimal } from '../../veilcore/animal-profile';
import { isStrain } from '../../veilcore/strain-profile';
import { HANDOFF_STATE_KEY } from '../../ask/handoff';

export const StageRows: React.FC<{
  record: StrainRecord;
  labOnly: boolean;
  /** Where the lab report saved to this plant stands (useSavedReport); null while loading. */
  saved: SavedReport | null | undefined;
}> = ({ record, labOnly, saved }) => {
  const navigate = useNavigate();
  const { t } = useRecordT(record);
  const [choosing, setChoosing] = useState(false);
  const can = canAddNextStage(record, labOnly) && !isStrain(record);
  const plant = can && !isAnimal(record);
  const nextStage = () => navigate(nextStagePath(record.id));
  // A batch from this record (ask/batch.ts): clones of a plant, offspring of an animal. The
  // record goes as the parent in this tab's router state, never in the address.
  const batch = () =>
    navigate('/new', {
      state: {
        [HANDOFF_STATE_KEY]: {
          v: 1,
          source: 'record',
          kind: isAnimal(record) ? 'animal' : 'plant',
          preset: isAnimal(record) ? 'offspring' : 'clones',
          count: isAnimal(record) ? 1 : 6,
          parents: [record.id],
        },
      },
    });
  return (
    <>
      {plant && (
        <>
          <ActionRow
            section="log"
            label={t('app.plant.action.nextOrClones')}
            hint={t('app.plant.action.nextOrClonesHint')}
            onClick={() => setChoosing(true)}
          />
          <Dialog
            open={choosing}
            onClose={() => setChoosing(false)}
            aria-labelledby="next-or-clones"
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle id="next-or-clones">{t('app.plant.action.nextOrClones')}</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={nextStage}
                  sx={{ minHeight: 48, justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <span>
                    {t('app.plant.action.nextStage')}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('app.plant.action.nextStageHint')}
                    </Typography>
                  </span>
                </Button>
                <Button
                  variant="outlined"
                  onClick={batch}
                  sx={{ minHeight: 48, justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <span>
                    {t('app.ask.batch.cutClones')}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('app.ask.batch.cutClonesHint')}
                    </Typography>
                  </span>
                </Button>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setChoosing(false)} sx={{ minHeight: 44 }}>
                {t('app.common.cancel')}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
      {/* An animal has no next stage: its offspring is an animal logged with it as sire or dam. */}
      {can && isAnimal(record) && (
        <ActionRow
          section="log"
          label={t('app.ask.batch.recordOffspring')}
          hint={t('app.ask.batch.recordOffspringHint')}
          onClick={batch}
        />
      )}
      {!labOnly && <DateLabReport record={record} saved={saved} variant="row" />}
    </>
  );
};
