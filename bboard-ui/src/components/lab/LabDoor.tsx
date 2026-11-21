// /for-labs: a lab's way in from the site ("For labs" in the header, the home page's lab slide, How it
// works). The co-founder was asked how a lab sets up its signing key and couldn't find it (21 Nov):
// the site had no way for labs, and in the app the lab view hid behind a footer link.
//
// Opening it gives the lab view (role.ts labDoorStep) and lands on the lab's home (/records), with
// the signing key screen open when this browser has no key yet. A breeder with records of their
// own is asked once, plainly, before the lab's tools are added beside them; "Not now" leaves the
// view as it was. Nothing about any record changes either way.
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
    // A registry that hasn't answered in time, for a browser that has been used here: asked, as
    // for a breeder, rather than quietly putting a breeder's records behind the lab view.
    const own = loaded ? records.some((r) => !r.receivedFrom) : holderKeyIfAny() !== null;
    const step = labDoorStep(getRole(), own);
    if (step === 'ask') {
      setAsking(true);
      return;
    }
    if (step === 'lab') setRole('lab');
    toLabHome();
  }, [loaded, waited]);

  return (
    <Dialog open={asking} maxWidth="xs" fullWidth aria-labelledby="lab-door-title" data-lab-door="">
      <DialogTitle id="lab-door-title">{t('app.home.labDoor.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body1">{t('app.home.labDoor.text')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void navigate('/records', { replace: true })} sx={{ minHeight: 44 }}>
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
