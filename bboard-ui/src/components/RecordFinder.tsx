// Finding a record among many.
//
// Two different questions, and they are not the same control. The attention bar answers
// "what needs doing". This answers "where is the one I am looking for" - which for a lab
// with hundreds of intakes is search, and for a breeder with thirty is a sort.
//
// Both appear only when there is enough to warrant them. Offering search over four
// records is offering a solution to a problem nobody has.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import type { StrainRecord } from '../veilcore/records';
import { useT } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';

export type SortKey = 'recent' | 'oldest' | 'name' | 'breeder';

export const SORTS: { key: SortKey; label: AppKey }[] = [
  { key: 'recent', label: 'app.home.sort.recent' },
  { key: 'oldest', label: 'app.home.sort.oldest' },
  { key: 'name', label: 'app.home.sort.name' },
  { key: 'breeder', label: 'app.home.sort.breeder' },
];

/**
 * Search across the fields a person actually remembers.
 *
 * Plant name, breeder, the record identifier, any internal reference - because a lab
 * looking for a sample has its own accession number, not ours - and for a received
 * sample the lab code it came under and the breeder's note.
 */
export const matchesQuery = (r: StrainRecord, q: string): boolean => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    r.strainName,
    r.bredBy,
    r.id,
    r.refId,
    r.breedingMethod,
    r.labRef,
    r.transferId,
    r.deliveryNote,
    r.receivedFrom,
  ]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(needle));
};

export const sortRecords = (records: StrainRecord[], by: SortKey): StrainRecord[] => {
  const out = [...records];
  const name = (r: StrainRecord) => (r.strainName ?? '').toLowerCase();
  const breeder = (r: StrainRecord) => (r.bredBy ?? '').toLowerCase();
  switch (by) {
    case 'oldest':
      return out.sort((a, b) => a.loggedAt - b.loggedAt);
    case 'name':
      return out.sort((a, b) => name(a).localeCompare(name(b)));
    case 'breeder':
      return out.sort((a, b) => breeder(a).localeCompare(breeder(b)) || name(a).localeCompare(name(b)));
    default:
      return out.sort((a, b) => b.loggedAt - a.loggedAt);
  }
};

export const RecordFinder: React.FC<{
  query: string;
  onQuery: (q: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  showSearch: boolean;
  matched: number;
  total: number;
  /** A lab's list: the search names what a lab looks things up by. */
  lab?: boolean;
}> = ({ query, onQuery, sort, onSort, showSearch, matched, total, lab }) => {
  const { t } = useT();
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {showSearch && (
          <TextField
            size="small"
            placeholder={lab ? t('app.home.search.lab') : t('app.home.search.breeder')}
            slotProps={{
              htmlInput: { 'aria-label': t('app.home.search.aria') },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            fullWidth
          />
        )}
        <TextField
          select
          size="small"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          sx={{ minWidth: 170 }}
        >
          {SORTS.map((s) => (
            <MenuItem key={s.key} value={s.key}>
              {t(s.label)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {query.trim() && (
        <Box sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
          {matched === 0
            ? t('app.home.search.nothing', { q: query.trim() })
            : t('app.home.search.nOfTotal', { matched, total })}
        </Box>
      )}
    </Box>
  );
};
