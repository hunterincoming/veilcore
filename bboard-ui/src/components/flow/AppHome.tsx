// The app's Home (/records): your plants and what each needs next, "Log a new plant", and
// one box for anything someone sent you. The first visit is one button.
//
// Replaced the records dashboard (13 Oct 2026): it led with export / import / start over
// and an agreement menu on every card; those are still here, under "More".
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Collapse, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ChevronIcon from '@mui/icons-material/ChevronRight';
import InboxIcon from '@mui/icons-material/MoveToInboxOutlined';
import BadgeIcon from '@mui/icons-material/VerifiedUserOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useRecords, exportRecords, importRecords, startOver } from '../../veilcore/records';
import { holderKeyIfAny, downloadHolderKey } from '../../veilcore/holder';
import { useLicenses, clearLoadedLicenses } from '../../veilcore/licenses';
import { REAL_CHAIN } from '../../veilcore/chain/config';
import { keysWithoutBackup, useRecordKeys } from '../../veilcore/record-keys';
import { importedRecordIds } from '../../veilcore/bulk-import-ledger';
import { useRole, isBreeder, isLab, requestRoleChange } from '../../veilcore/role';
import { loadAttester } from '../../veilcore/attester-keys';
import { RecordFinder, matchesQuery, sortRecords, type SortKey } from '../RecordFinder';
import { AppHeader } from '../AppHeader';
import { OPEN_RECEIVE_EVENT } from '../ClaimTransfer';
import { OPEN_SIGNING_KEY_EVENT } from '../AttesterSetup';
import { linkCard } from '../a11y';
import { ACCENT, GROUND, WASH } from '../../config/theme';
import { useT, useRecordT, rich } from '../../i18n/app';
import { isAnimal, recordTitle } from '../../veilcore/animal-profile';
import { SECTIONS, focusScreenHeading } from './FlowFrame';
import { PasteBox } from './PasteBox';
import { labCardLine, useLabCardFacts, useWaitingByRecord } from './LabResults';
import { quantityPhrase } from '../../veilcore/transfers';
import { TrustPanel } from '../TrustPanel';
import { LockedRecords, LoadNoticeBar } from '../LockedRecords';
import { useVaultNeedsBackup } from '../../veilcore/vault';
import { RegistryExportButton } from '../RegistryExportButton';
import { draftHeading, loadDraft } from './log-flow-state';
import { homeStatusLine } from './plant-status-words';
import { datingCardLine, datingHomeStatus, homeList, isLabReportRecord, keysOnlyHereLine } from '../stage/record-kinds';
import { useDnaTie, useSavedReports } from './useDnaTie';
import { dnaTieSentence } from '../../veilcore/dna-tie';
import type { StrainRecord } from '../../veilcore/records';
import type { SavedReport } from '../../veilcore/saved-report';

/**
 * A plant's card line: "Tied to the plant: DNA report signed by …, not dated yet." or "Not
 * tied to the plant yet: add a DNA report." Nothing while a saved report is being checked.
 */
const TieLine: React.FC<{ record: StrainRecord; saved?: SavedReport }> = ({ record, saved }) => {
  const tr = useRecordT(record);
  const { tie, date } = useDnaTie(record, saved, tr);
  if (!tie) return null;
  return (
    <Typography variant="body2" color="text.secondary" data-home-tie={tie.state}>
      {dnaTieSentence(tie, date, 'holder', tr)}
    </Typography>
  );
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
  const tr = useT();
  const { t, tp } = tr;
  // A plant half-logged in this browser: Home offers to finish it, not to start another.
  const [draft] = useState(() => (records.length === 0 ? loadDraft() : undefined));

  const unbacked = REAL_CHAIN ? keysWithoutBackup() : [];
  // Records are sealed with a key only this browser has until a backup holding it is checked.
  const vaultUnbacked = useVaultNeedsBackup();
  const labOnly = isLab(role) && !isBreeder(role);
  const lab = isLab(role);
  // Plants as cards; a record that dates a lab report shows under its plant, not as a plant.
  const { cards, datingsOf } = homeList(records);
  const visible = sortRecords(
    cards.filter((r) => matchesQuery(r, query)),
    sort,
  );
  const unbackedIds = unbacked.map((k) => k.recordId);
  // A breeder's plants with a lab report waiting; a lab's received samples at a glance.
  const waiting = useWaitingByRecord(isBreeder(role) && records.some((r) => !r.receivedFrom));
  // Plants a collection import made: their key stamps are queued (/records/import), a few a day.
  const imported = useMemo(() => new Set(REAL_CHAIN ? importedRecordIds() : []), [records]);
  const labFacts = useLabCardFacts(visible, lab);
  // Where each plant's saved DNA report stands: a lab may have replaced or withdrawn it.
  const savedReports = useSavedReports(visible, !labOnly);

  const onImport = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const { added, alreadyHere } = await importRecords(file);
      setToast(tp('app.home.imported', added) + (alreadyHere ? tp('app.home.alreadyHere', alreadyHere) : ''));
    } catch (e) {
      setToast(e instanceof Error ? e.message : t('app.home.importFailed'));
    }
  };

  // Nothing is deleted anywhere: the records stay on VeilCore's registry under the current
  // key, which is downloaded first so they can be restored (attack round D).
  const onReset = () => {
    const key = holderKeyIfAny();
    const keysWarning = unbacked.length > 0 ? `\n\n${keysOnlyHereLine(unbackedIds, records, 'reset', tr)}` : '';
    if (window.confirm(t('app.home.resetConfirm') + keysWarning)) {
      if (key) downloadHolderKey(key);
      startOver();
      clearLoadedLicenses();
      setToast(t('app.home.startedOver'));
      // The menu that held "Start over" goes with the old set: focus the page's heading (round 6).
      focusScreenHeading();
    }
  };

  // The lab's panel is the page's heading when nothing has arrived yet (a real h1), and a
  // section under "Samples received" after.
  const labPanel = (heading: 'h1' | 'h2') => (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography
        variant={heading === 'h1' ? 'h4' : 'subtitle1'}
        component={heading}
        sx={{ fontWeight: 700, mb: heading === 'h1' ? 0.5 : 0 }}
      >
        {t('app.home.labJobs')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('app.home.labJobsText')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          startIcon={<InboxIcon />}
          onClick={() => window.dispatchEvent(new Event(OPEN_RECEIVE_EVENT))}
          sx={{ minHeight: 48 }}
        >
          {t('app.home.confirmDelivery')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<BadgeIcon />}
          onClick={() => window.dispatchEvent(new Event(OPEN_SIGNING_KEY_EVENT))}
          sx={{ minHeight: 48 }}
        >
          {loadAttester() ? t('app.home.labSignature') : t('app.home.setUpLabSignature')}
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
            labPanel('h1')
          ) : (
            <Stack spacing={2} sx={{ textAlign: 'center', py: { xs: 2, md: 4 } }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, overflowWrap: 'anywhere' }}
              >
                {draftHeading(draft, tr)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {draft ? t('app.home.draftKept') : t('app.home.aboutThreeMinutes')}
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
                {draft ? t('app.home.continue') : t('app.home.start')}
              </Button>
            </Stack>
          )}
          <LoadNoticeBar />
          <LockedRecords />
          <PasteBox />
          <Stack spacing={1} sx={{ alignItems: 'center', pt: 1 }}>
            <Button component={RouterLink} to="/records/import" sx={{ minHeight: 44 }}>
              {t('app.home.spreadsheet')}
            </Button>
            <Button component={RouterLink} to="/restore" sx={{ minHeight: 44 }}>
              {t('app.home.newPhone')}
            </Button>
            <Button onClick={requestRoleChange} color="inherit" sx={{ minHeight: 44 }}>
              {labOnly ? t('app.home.breederToo') : t('app.home.imALab')}
            </Button>
            <Button
              onClick={() => setWhy(!why)}
              color="inherit"
              endIcon={why ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ minHeight: 44 }}
            >
              {t('app.home.whatStops')}
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
            {labOnly
              ? t('app.home.samplesReceived')
              : records.some((r) => isAnimal(r))
                ? t('app.animal.home.yourRecords')
                : t('app.home.yourPlants')}
          </Typography>
          {!labOnly && (
            <Button component={RouterLink} to="/new" variant="contained" startIcon={<AddIcon />} sx={{ minHeight: 48 }}>
              {t('app.home.logNew')}
            </Button>
          )}
        </Stack>

        <LoadNoticeBar />

        {vaultUnbacked && unbacked.length === 0 && (
          <Alert
            severity="warning"
            variant="outlined"
            data-vault-backup=""
            action={
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => void navigate('/backup')}
                sx={{ minHeight: 44 }}
              >
                {t('app.home.saveIt')}
              </Button>
            }
          >
            {rich(t('app.sealed.backupNeeded'), { b: (c) => <b>{c}</b> })}
          </Alert>
        )}

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
                {t('app.home.saveIt')}
              </Button>
            }
          >
            {rich(
              t('app.home.finishBackupLine'),
              { b: (c) => <b>{c}</b> },
              { line: keysOnlyHereLine(unbackedIds, records, 'alert', tr) },
            )}
          </Alert>
        )}

        <LockedRecords />

        {isLab(role) && labPanel('h2')}

        {/* A lab looks samples up by its own number or the breeder: search from 3. */}
        {cards.length >= (lab ? 3 : 5) && (
          <RecordFinder
            query={query}
            onQuery={setQuery}
            sort={sort}
            onSort={setSort}
            showSearch={cards.length >= (lab ? 3 : 8)}
            matched={visible.length}
            total={cards.length}
            lab={lab}
          />
        )}

        <Stack spacing={1.25}>
          {visible.map((r) => {
            const own = isLabReportRecord(r);
            const s = own
              ? (() => {
                  const d = datingHomeStatus(r, keys[r.id], REAL_CHAIN, tr);
                  return { text: `${datingCardLine(r, tr)} · ${d.text}`, unfinished: d.unfinished };
                })()
              : lab && r.receivedFrom
                ? { text: labCardLine(r, labFacts[r.id], tr), unfinished: false }
                : homeStatusLine(r, keys[r.id], { realChain: REAL_CHAIN, queued: imported.has(r.id) }, tr);
            const datings = (datingsOf.get(r.id) ?? []).map((d) => ({
              id: d.id,
              ...datingHomeStatus(d, keys[d.id], REAL_CHAIN, tr),
            }));
            const unfinished = s.unfinished || datings.some((d) => d.unfinished);
            const reportWaiting = (waiting[r.id]?.length ?? 0) > 0;
            return (
              // Each plant is drawn as a plant tag, the object on the landing page: a cut
              // end and an eyelet. The eyelet's ring is amber while something is left to do
              // (the line under the name says what), Wash when nothing is.
              <Paper
                key={r.id}
                {...linkCard(() => void navigate(`/record/${r.id}`), t('app.home.openPlant', { name: recordTitle(r) }))}
                data-unfinished={unfinished ? 'yes' : undefined}
                sx={{
                  p: 2,
                  pl: { xs: 5.5, sm: 6.5 },
                  cursor: 'pointer',
                  position: 'relative',
                  borderRadius: 0,
                  clipPath: 'polygon(18px 0, 100% 0, 100% 100%, 18px 100%, 0 calc(100% - 18px), 0 18px)',
                  '&:hover': { bgcolor: WASH },
                  // The cut corners would clip an outline: the focus ring is drawn inside.
                  '&:focus-visible': { outline: 'none', bgcolor: WASH, boxShadow: `inset 0 0 0 2px ${ACCENT}` },
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    left: { xs: 16, sm: 20 },
                    top: '50%',
                    width: 16,
                    height: 16,
                    mt: '-8px',
                    borderRadius: '50%',
                    bgcolor: GROUND,
                    border: '4px solid',
                    borderColor: unfinished ? 'warning.main' : WASH,
                    boxSizing: 'border-box',
                  }}
                />
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {recordTitle(r)}
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
                    {/* The breeder's own plant: whether a DNA report ties the record to it. */}
                    {!own && !r.receivedFrom && <TieLine record={r} saved={savedReports[r.id]} />}
                    {datings.map((d) => (
                      <Typography
                        key={d.id}
                        variant="body2"
                        data-home-dated={d.id}
                        sx={{
                          color: d.unfinished ? 'warning.main' : 'text.secondary',
                          fontWeight: d.unfinished ? 700 : 400,
                        }}
                      >
                        {d.text}
                      </Typography>
                    ))}
                    {lab && r.receivedFrom && (r.quantity || r.deliveryNote) && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {[quantityPhrase(r.quantity), r.deliveryNote && t('app.home.quoted', { v: r.deliveryNote })]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    )}
                  </Box>
                  {reportWaiting && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        px: 1,
                        py: 0.25,
                        borderRadius: 5,
                        // A report has come in: news, in the info blue, not a date.
                        background: '#E6EEF5',
                        color: '#174C78',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('app.home.labReportWaiting')}
                    </Typography>
                  )}
                  <ChevronIcon sx={{ color: 'text.secondary' }} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <PasteBox />

        {!labOnly && (
          <Paper
            {...linkCard(() => void navigate('/licenses'), t('app.home.openAgreements'))}
            sx={{
              p: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: WASH },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <SECTIONS.license.Icon sx={{ color: SECTIONS.license.color }} />
              <Typography variant="body1" sx={{ flex: 1, fontWeight: 700 }}>
                {t('app.home.myAgreements', { n: licenses.length })}
              </Typography>
              {t('app.copy.practiceLabel') && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, px: 1, py: 0.25, borderRadius: 5, background: '#FFF1D6', color: '#6B4100' }}
                >
                  {t('app.copy.practiceLabel')}
                </Typography>
              )}
              <ChevronIcon sx={{ color: 'text.secondary' }} />
            </Stack>
          </Paper>
        )}

        <Stack spacing={0.5} sx={{ alignItems: 'center', pt: 2 }}>
          <Button component={RouterLink} to="/records/import" sx={{ minHeight: 44 }}>
            {t('app.home.spreadsheet')}
          </Button>
          <Button component={RouterLink} to="/restore" sx={{ minHeight: 44 }}>
            {t('app.home.newPhone')}
          </Button>
          <Button
            color="inherit"
            onClick={() => setMore(!more)}
            endIcon={more ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ minHeight: 44 }}
          >
            {t('app.home.more')}
          </Button>
          <Collapse in={more}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
              <Button variant="text" onClick={() => void navigate('/backup')}>
                {t('app.home.saveABackup')}
              </Button>
              <Button variant="text" onClick={exportRecords}>
                {t('app.home.exportAll')}
              </Button>
              <Button variant="text" onClick={() => importRef.current?.click()}>
                {t('app.home.importRecords')}
              </Button>
              <Button variant="text" color="inherit" onClick={onReset}>
                {t('app.log.startOver')}
              </Button>
              <RegistryExportButton />
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
