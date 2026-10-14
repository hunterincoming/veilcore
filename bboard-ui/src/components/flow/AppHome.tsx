// The app's Home (/records): your plants and what each needs next, "Log a new plant", and
// one box for anything someone sent you. The first visit is one button.
//
// Replaced the records dashboard (13 Oct 2026): it led with export / import / start over
// and an agreement menu on every card; those are still here, under "More".
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Collapse, Divider, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import InboxIcon from '@mui/icons-material/MoveToInboxOutlined';
import BadgeIcon from '@mui/icons-material/VerifiedUserOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useRecords, exportRecords, importRecords, startOver, type StrainRecord } from '../../veilcore/records';
import { holderKeyIfAny, downloadHolderKey } from '../../veilcore/holder';
import { useLicenses, clearLoadedLicenses } from '../../veilcore/licenses';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { keysWithoutBackup, useRecordKeys, type RecordKeys } from '../../veilcore/record-keys';
import { useRole, isBreeder, isLab, requestRoleChange } from '../../veilcore/role';
import { loadAttester } from '../../veilcore/attester-keys';
import { RecordFinder, matchesQuery, sortRecords, type SortKey } from '../RecordFinder';
import { AppHeader } from '../AppHeader';
import { OPEN_RECEIVE_EVENT } from '../ClaimTransfer';
import { OPEN_SIGNING_KEY_EVENT } from '../AttesterSetup';
import { linkCard } from '../a11y';
import { PRACTICE_LABEL } from '../../config/copy';
import { SECTIONS } from './FlowFrame';
import { PasteBox } from './PasteBox';
import { TrustPanel } from '../TrustPanel';

const day = (ms: number) => new Date(ms).toLocaleDateString();

/** One line saying where a plant stands, worst news first. */
const statusLine = (r: StrainRecord, keys?: RecordKeys): { text: string; unfinished: boolean } => {
  if (REAL_CHAIN && keys && !keys.backedUpAt)
    return { text: 'Not finished · next: save your backup', unfinished: true };
  if (REAL_CHAIN && !r.receivedFrom && !keys?.anchor)
    return { text: 'Not finished · next: the date stamp', unfinished: true };
  const bits = [r.receivedFrom ? `Received from ${r.receivedFrom}` : `Sealed ${day(r.loggedAt)}`];
  if (r.dnaFingerprint) bits.push('lab report');
  if (r.attestation) bits.push(r.receivedFrom ? 'you confirmed it' : 'lab confirmed it');
  return { text: bits.join(' · '), unfinished: false };
};

export const AppHome: React.FC = () => {
  const records = useRecords();
  const keys = useRecordKeys();
  const licenses = useLicenses();
  const role = useRole();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [more, setMore] = useState(false);
  const [why, setWhy] = useState(false);
  const [toast, setToast] = useState<string>();
  const importRef = useRef<HTMLInputElement>(null);

  const unbacked = REAL_CHAIN ? keysWithoutBackup() : [];
  const labOnly = isLab(role) && !isBreeder(role);
  const visible = sortRecords(
    records.filter((r) => matchesQuery(r, query)),
    sort,
  );

  const onImport = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const { added, alreadyHere } = await importRecords(file);
      setToast(
        `Imported ${added} record${added === 1 ? '' : 's'}.` +
          (alreadyHere ? ` ${alreadyHere} already here ${alreadyHere === 1 ? 'was' : 'were'} left as they are.` : ''),
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  // Nothing is deleted anywhere: the records stay on VeilCore's registry under the current
  // key, which is downloaded first so they can be restored (attack round D).
  const onReset = () => {
    const key = holderKeyIfAny();
    const keysWarning =
      unbacked.length > 0
        ? `\n\n${unbacked.length} plant${unbacked.length === 1 ? ' has' : 's have'} keys with no checked backup. Save your backup first: clearing the browser later would lose them for good.`
        : '';
    if (
      window.confirm(
        'Start over in this browser with a new, empty set?\n\n' +
          'Nothing is deleted. Your current records stay on VeilCore’s registry under your current holder key, ' +
          'and you can get them back only with that key. It will be downloaded now — keep the file.' +
          keysWarning,
      )
    ) {
      if (key) downloadHolderKey(key);
      startOver();
      clearLoadedLicenses();
      setToast('Started over. Restore your old records any time from the holder key file.');
    }
  };

  const labPanel = (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, borderLeft: `6px solid ${SECTIONS.send.color}` }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Your lab&apos;s jobs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Confirm what arrives. Your confirmation is signed with your lab&apos;s own key, not by us.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          startIcon={<InboxIcon />}
          onClick={() => window.dispatchEvent(new Event(OPEN_RECEIVE_EVENT))}
          sx={{ minHeight: 48 }}
        >
          Confirm a delivery
        </Button>
        <Button
          variant="outlined"
          startIcon={<BadgeIcon />}
          onClick={() => window.dispatchEvent(new Event(OPEN_SIGNING_KEY_EVENT))}
          sx={{ minHeight: 48 }}
        >
          {loadAttester() ? "Your lab's signature" : "Set up your lab's signature"}
        </Button>
      </Stack>
    </Paper>
  );

  if (records.length === 0) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <AppHeader />
        <Stack spacing={2.5}>
          {labOnly ? (
            labPanel
          ) : (
            <Stack spacing={2} sx={{ textAlign: 'center', py: { xs: 2, md: 4 } }}>
              <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>
                Let&apos;s log your first plant
              </Typography>
              <Typography variant="body1" color="text.secondary">
                About 3 minutes. When you&apos;re done it has a public date stamp, and you hold the only key.
              </Typography>
              <Button
                component={RouterLink}
                to="/new"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<AddIcon />}
                sx={{ py: 1.7, fontSize: '1.1rem' }}
              >
                Start
              </Button>
            </Stack>
          )}
          <PasteBox />
          <Stack spacing={1} sx={{ alignItems: 'center', pt: 1 }}>
            <Button component={RouterLink} to="/restore" sx={{ minHeight: 44 }}>
              New phone? Get your plants back
            </Button>
            <Button onClick={requestRoleChange} color="inherit" sx={{ minHeight: 44 }}>
              {labOnly ? "I'm a breeder too" : "I'm a lab"}
            </Button>
            <Button
              onClick={() => setWhy(!why)}
              color="inherit"
              endIcon={why ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ minHeight: 44 }}
            >
              What stops someone logging my plant first?
            </Button>
          </Stack>
          <Collapse in={why}>
            <TrustPanel />
          </Collapse>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <AppHeader />
      <Stack spacing={2.5}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h4" component="h1">
            Your plants
          </Typography>
          <Button component={RouterLink} to="/new" variant="contained" startIcon={<AddIcon />} sx={{ minHeight: 48 }}>
            Log new
          </Button>
        </Stack>

        {unbacked.length > 0 && (
          <Alert
            severity="warning"
            variant="outlined"
            action={
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => void navigate('/backup')}
                sx={{ minHeight: 44 }}
              >
                Save it
              </Button>
            }
          >
            <b>Finish: save your backup.</b> {unbacked.length === 1 ? 'A plant has' : `${unbacked.length} plants have`}{' '}
            keys only on this device.
          </Alert>
        )}

        {isLab(role) && labPanel}

        {records.length >= 5 && (
          <RecordFinder
            query={query}
            onQuery={setQuery}
            sort={sort}
            onSort={setSort}
            showSearch={records.length >= 8}
            matched={visible.length}
            total={records.length}
          />
        )}

        <Stack spacing={1.25}>
          {visible.map((r) => {
            const s = statusLine(r, keys[r.id]);
            return (
              <Paper
                key={r.id}
                {...linkCard(() => void navigate(`/record/${r.id}`), `Open ${r.strainName}`)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderColor: s.unfinished ? 'warning.main' : undefined,
                  '&:hover, &:focus-visible': { borderColor: 'primary.main', outline: 'none' },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {r.strainName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: s.unfinished ? 'warning.main' : 'text.secondary',
                        fontWeight: s.unfinished ? 700 : 400,
                      }}
                    >
                      {s.text}
                    </Typography>
                  </Box>
                  <ChevronIcon sx={{ color: 'text.secondary' }} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <PasteBox />

        <Paper
          {...linkCard(() => void navigate('/licenses'), 'Open my agreements')}
          sx={{ p: 2, cursor: 'pointer', '&:hover, &:focus-visible': { borderColor: 'primary.main', outline: 'none' } }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <SECTIONS.license.Icon sx={{ color: SECTIONS.license.color }} />
            <Typography variant="body1" sx={{ flex: 1, fontWeight: 700 }}>
              My agreements ({licenses.length})
            </Typography>
            {PRACTICE_LABEL && (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, px: 1, py: 0.25, borderRadius: 5, background: '#FFF1D6', color: '#6B4100' }}
              >
                {PRACTICE_LABEL}
              </Typography>
            )}
            <ChevronIcon sx={{ color: 'text.secondary' }} />
          </Stack>
        </Paper>

        <Divider />
        <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button component={RouterLink} to="/restore" sx={{ minHeight: 44 }}>
            New phone? Get your plants back
          </Button>
          <Button
            color="inherit"
            onClick={() => setMore(!more)}
            endIcon={more ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ minHeight: 44 }}
          >
            More
          </Button>
          <Collapse in={more}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
              <Button variant="text" onClick={() => void navigate('/backup')}>
                Save a backup
              </Button>
              <Button variant="text" onClick={exportRecords}>
                Export all records
              </Button>
              <Button variant="text" onClick={() => importRef.current?.click()}>
                Import records
              </Button>
              <Button variant="text" color="inherit" onClick={onReset}>
                Start over
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  void onImport(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Stack>
          </Collapse>
        </Stack>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(undefined)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
