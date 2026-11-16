// What /status says for a reading of the fee service's public status (sponsor GET
// /sponsor/status: synced, and the anchoring job's last run and alert). Pure, so the test
// covers every case without a server.
// SPDX-License-Identifier: Apache-2.0

export type StatusReading = {
  readonly synced?: unknown;
  readonly anchorer?: { readonly enabled?: unknown; readonly lastRunAt?: unknown; readonly alert?: unknown };
};

export type StatusLine = 'running' | 'behind' | 'failing';

/** Failing batches come first: a service in step with Midnight whose batches fail is not fine. */
export const statusLine = (s: StatusReading): StatusLine =>
  s.anchorer?.alert === true ? 'failing' : s.synced === true ? 'running' : 'behind';

/** The last run's time, if the service gave a date this browser can read. */
export const lastRun = (s: StatusReading): Date | undefined => {
  const v = s.anchorer?.lastRunAt;
  if (typeof v !== 'string') return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
