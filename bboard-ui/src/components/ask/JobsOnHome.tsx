// "Do it for me" on Home: a job waiting to be checked, one being done or needing the person, a
// record got ready to license ("Blue Dream: ready to license", or "ready tomorrow" while its
// stamp waits), and young saved without their IDs ("Add 6 IDs"). One line and one button each,
// like Pick up where you left off (PickUp.tsx); nothing when there's nothing. A stamp still
// waiting is listed there already ("1 stamp waiting"), from the stamp queue.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/app';
import { useRecords } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { useAgreementsWaitForBackup } from '../../veilcore/licenses';
import { loadLedger } from '../../veilcore/bulk-import';
import { listJobs, onJobsChange, type Job } from '../../ask-job/store';
import { JOB_STATE_KEY } from '../../ask-job/words';

const useJobs = (): Job[] => {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listJobs().then((j) => live && setJobs(j));
    load();
    const off = onJobsChange(load);
    return () => {
      live = false;
      off();
    };
  }, []);
  return jobs;
};

export const JobsOnHome: React.FC = () => {
  const { t, tp } = useT();
  const navigate = useNavigate();
  const jobs = useJobs();
  const records = useRecords();
  useRecordKeys();
  const waitsForBackup = useAgreementsWaitForBackup();
  const lines: { key: string; text: string; go: () => void }[] = [];
  const openJob = (j: Job) => () => void navigate(`/ask/job/${j.id}`, { state: { [JOB_STATE_KEY]: j.id } });
  const name = (id?: string) => records.find((r) => r.id === id)?.strainName ?? '';
  for (const j of jobs) {
    if (j.state === 'ready') lines.push({ key: j.id, text: t('app.job.home.check'), go: openJob(j) });
    else if (j.state === 'approved' || j.state === 'running')
      lines.push({
        key: j.id,
        text: j.steps.some((s) => s.state === 'needsYou') ? t('app.job.home.needs') : t('app.job.home.running'),
        go: openJob(j),
      });
    if (
      j.kind === 'ready' &&
      j.refs.recordId &&
      (j.state === 'done' || j.state === 'running' || j.state === 'approved')
    ) {
      const id = j.refs.recordId;
      const stamped = j.steps.every((s) => s.state === 'done');
      // Held for tomorrow (today's free stamps look used up). A stamp waiting for any other
      // reason is on Pick up where you left off already ("1 stamp waiting").
      const tomorrow = j.steps.some((s) => s.kind === 'stamp' && s.state === 'waiting' && s.why === 'tomorrow');
      if (stamped && !waitsForBackup)
        lines.push({
          key: `${j.id}-ready`,
          text: t('app.job.home.ready', { name: name(id) }),
          go: () => void navigate(`/record/${id}`),
        });
      else if (tomorrow)
        lines.push({
          key: `${j.id}-ready`,
          text: t('app.job.home.tomorrow', { name: name(id) }),
          go: () => void navigate(`/record/${id}`),
        });
    }
    if (j.kind === 'batch' && j.spec?.preset === 'offspring' && j.state === 'done') {
      const rows = loadLedger().rows;
      const ids = (j.refs.rowHashes ?? []).flatMap((h) => (rows[h] ? [rows[h].recordId] : []));
      const missing = ids.filter((id) => {
        const r = records.find((x) => x.id === id);
        return r && !r.refId;
      });
      if (missing.length)
        lines.push({
          key: `${j.id}-ids`,
          text: tp('app.job.home.ids', missing.length),
          go: () => void navigate(`/record/${missing[0]}`),
        });
    }
  }
  if (!lines.length) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-home-jobs="">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('app.job.home.title')}
      </Typography>
      <Stack spacing={1.25}>
        {lines.map((l) => (
          <Stack key={l.key} direction="row" spacing={1.5} sx={{ alignItems: 'center' }} data-home-job="">
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              {l.text}
            </Typography>
            <Button variant="outlined" size="small" onClick={l.go} sx={{ minHeight: 40, flexShrink: 0 }}>
              {t('app.job.home.open')}
            </Button>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};
