// "Do it for me" on Home: each job by what it is ("Check: 3 Blue Dream clones", "Needs you: 3
// reports to send"), a record got ready to license ("Blue Dream: ready to license", or "ready
// tomorrow" while its stamp is held for tomorrow), and young saved without their IDs ("Bella's
// litter (6): add IDs", which opens a paste-a-column box: AddIds.tsx). The IDs line comes from the
// records themselves, not from a job, so it lasts until the IDs are added. One line and one button
// each, like Pick up where you left off (PickUp.tsx); nothing when there's nothing. A stamp still
// waiting is listed there already ("1 stamp waiting"), from the stamp queue.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/app';
import { useRecords } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { useAgreementsWaitForBackup } from '../../veilcore/licenses';
import { localDay } from '../../veilcore/royalty-terms';
import { listJobs, onJobsChange, type Job } from '../../ask-job/store';
import { JOB_STATE_KEY, jobTitle } from '../../ask-job/words';
import { AddIds, littersWithoutIds, type Litter } from './AddIds';

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
  const tr = useT();
  const { t, tp } = tr;
  const navigate = useNavigate();
  const jobs = useJobs();
  const records = useRecords();
  useRecordKeys();
  const waitsForBackup = useAgreementsWaitForBackup();
  const [litter, setLitter] = useState<Litter>();
  const lines: { key: string; text: string; go: () => void }[] = [];
  const openJob = (j: Job) => () => void navigate(`/ask/job/${j.id}`, { state: { [JOB_STATE_KEY]: j.id } });
  const name = (id?: string) => records.find((r) => r.id === id)?.strainName ?? '';
  for (const j of jobs) {
    const what = jobTitle(j, records, tr);
    if (j.state === 'ready') lines.push({ key: j.id, text: t('app.job.home.check', { what }), go: openJob(j) });
    else if (j.state === 'approved' || j.state === 'running')
      lines.push({
        key: j.id,
        text: j.steps.some((s) => s.state === 'needsYou')
          ? t('app.job.home.needs', { what })
          : t('app.job.home.running', { what }),
        go: openJob(j),
      });
    else if (j.state === 'stopped' && j.steps.some((s) => s.state === 'needsYou'))
      lines.push({ key: j.id, text: t('app.job.home.needs', { what }), go: openJob(j) });
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
  }
  const litters = littersWithoutIds(records, localDay());
  for (const l of litters.slice(0, 3))
    lines.push({
      key: `ids-${l.key}`,
      text: tp('app.job.home.ids', l.missing.length, { dam: l.dam }),
      go: () => setLitter(l),
    });
  if (!lines.length) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-home-jobs="">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('app.job.home.title')}
      </Typography>
      <Stack spacing={1.25}>
        {lines.map((l) => (
          <Stack
            key={l.key}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center' }}
            data-home-job=""
            data-home-ids={l.key.startsWith('ids-') ? '' : undefined}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              {l.text}
            </Typography>
            <Button variant="outlined" size="small" onClick={l.go} sx={{ minHeight: 40, flexShrink: 0 }}>
              {t('app.job.home.open')}
            </Button>
          </Stack>
        ))}
      </Stack>
      {litter && <AddIds litter={litter} onClose={() => setLitter(undefined)} />}
    </Paper>
  );
};
