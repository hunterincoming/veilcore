// /for-labs: a lab's way in from the site ("For labs" in the header, the home page's lab slide, How it
// works). The co-founder was asked how a lab sets up its signing key and couldn't find it (21 Nov):
// the site had no way for labs, and in the app the lab view hid behind a footer link.
//
// Opening it gives the lab view (role.ts labDoorStep) and lands on the lab's home (/records), with
// the signing key screen open when this browser has no key yet. A browser that holds records or
// has been used before is asked once, plainly, before the lab's tools are added beside what is
// there; "Not now" (or Escape) leaves the view as it was. Nothing about any record changes either way.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { OPEN_SIGNING_KEY_STATE, getRole, labDoorStep, setRole } from '../../veilcore/role';
import { useRecords, useRecordsLoaded } from '../../veilcore/records';
import { holderKeyIfAny } from '../../veilcore/holder';
import { useT } from '../../i18n/app';

/** How long to wait for the registry before deciding on what this browser has. */
const WAIT_MS = 5000;

export const LabDoor: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const records = useRecords();
  const loaded = useRecordsLoaded();
  const [waited, setWaited] = useState(false);
  const [asking, setAsking] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setWaited(true), WAIT_MS);
    return () => window.clearTimeout(id);
  }, []);

  /** The lab's home, with the key screen asked for (AttesterSetup opens it if there's no key). */
  const toLabHome = () => void navigate('/records', { replace: true, state: { [OPEN_SIGNING_KEY_STATE]: true } });

  useEffect(() => {
    if (decided.current || (!loaded && !waited)) return;
    decided.current = true;
    // Anything kept here, or a browser that has been used here at all (it holds a holder key),
    // counts as a breeder's: asked, never quietly switched. A registry that failed or is slow
    // shows few or no records, and a breeder who received cuttings is still a breeder
    // (independent review, 21 Nov). Only a browser with nothing in it goes straight to the lab view.
    const used = records.length > 0 || holderKeyIfAny() !== null;
    const step = labDoorStep(getRole(), used);
    if (step === 'ask') {
      setAsking(true);
      return;
    }
    if (step === 'lab') setRole('lab');
    toLabHome();
  }, [loaded, waited]);

  const notNow = () => void navigate('/records', { replace: true });
  return (
    // Escape and a tap outside are "Not now".
    <Dialog open={asking} onClose={notNow} maxWidth="xs" fullWidth aria-labelledby="lab-door-title" data-lab-door="">
      <DialogTitle id="lab-door-title">{t('app.home.labDoor.title')}</DialogTitle>
      <DialogContent>
        {/* What changes, then what doesn't (review, 21 Nov). */}
        <Typography variant="body1" sx={{ mb: 1 }}>
          {t('app.home.labDoor.what')}
        </Typography>
        <Typography variant="body1">{t('app.home.labDoor.text')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={notNow} sx={{ minHeight: 44 }}>
          {t('app.home.labDoor.notNow')}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setRole('both');
            toLabHome();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('app.home.labDoor.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
