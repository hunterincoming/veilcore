// Logging a strain or line (veilcore/strain-profile.ts, docs/strain-profile.md): its form and
// its "Is this right?" lines. The steps after it (seal and date stamp, the DNA report, the
// backup) are the plant's, in a strain's words (i18n forKind 'strain').
//
// What is asked first is only what the profile needs: a name or the holder's designation, what
// kind it is, the species, and who made or isolated it. Deposit numbers sit next to them
// because a culture collection number is how this world names a strain. The rest (how it was
// made, generation or passage, parents, date, notes) is behind "+ Add".
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useState } from 'react';
import { Autocomplete, Box, Button, Collapse, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ScreenHeading, focusScreenHeading, softDisabled } from './FlowFrame';
import { useT, type Translator } from '../../i18n/app';
import { STRAIN_GROUPS, type StrainGroup } from '../../veilcore/strain-profile';
import { depositsOf, strainMissing, strainSealInputOf, type StrainDraft, type StrainParentDraft } from './strain-draft';
import { draftSizeShare, sizeWords } from '../../veilcore/records';
import type { AppKey } from '../../i18n/app/en';

export type StrainParentOption = { recordId: string; name: string; deposit: string };

/** The kind, in words: "Yeast", "Cell line". */
export const strainGroupWords = (g: StrainGroup | undefined, tr: Translator): string =>
  tr.t(`app.strain.g.${g ?? 'other'}` as AppKey);

/** A parent strain in one line: "Name (NBRC 3301)", or whichever of the two it has. */
export const strainParentWords = (p: { name: string; individualId?: string; deposit?: string }): string => {
  const name = p.name.trim();
  const dep = (p.deposit ?? p.individualId ?? '').trim();
  return name && dep ? `${name} (${dep})` : name || dep;
};

const METHODS = [
  'app.strain.m.wild',
  'app.strain.m.neutron',
  'app.strain.m.heavyIon',
  'app.strain.m.uv',
  'app.strain.m.chemical',
  'app.strain.m.evolution',
  'app.strain.m.cross',
  'app.strain.m.fusion',
  'app.strain.m.editing',
  'app.strain.m.subculture',
] as const;

const ParentFields: React.FC<{
  which: 1 | 2;
  value: StrainParentDraft;
  options: StrainParentOption[];
  onChange: (p: StrainParentDraft) => void;
}> = ({ which, value, options, onChange }) => {
  const { t } = useT();
  const linked = value.recordId ? options.find((o) => o.recordId === value.recordId) : undefined;
  return (
    <Stack spacing={1.5} data-strain-parent={which}>
      <Autocomplete<StrainParentOption | string, false, false, true>
        freeSolo
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : strainParentWords(o) || o.recordId)}
        inputValue={value.name}
        value={linked ?? null}
        onInputChange={(_, v, reason) => {
          if (reason === 'input') onChange({ name: v, deposit: value.recordId ? '' : value.deposit });
          if (reason === 'clear') onChange({ name: '', deposit: '' });
        }}
        onChange={(_, v) => {
          if (v && typeof v !== 'string') onChange({ name: v.name, deposit: v.deposit, recordId: v.recordId });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t(which === 1 ? 'app.strain.parent1' : 'app.strain.parent2')}
            helperText={options.length ? t('app.strain.parentHelp') : t('app.strain.parentHelpNone')}
          />
        )}
      />
      <TextField
        label={t('app.strain.parentDeposit')}
        value={value.deposit}
        disabled={!!value.recordId}
        helperText={value.recordId ? t('app.strain.linkedDeposit') : undefined}
        onChange={(e) => onChange({ ...value, deposit: e.target.value })}
        fullWidth
      />
    </Stack>
  );
};

export const StrainForm: React.FC<{
  step: string;
  choice?: React.ReactNode;
  draft: StrainDraft;
  setDraft: (d: StrainDraft) => void;
  restored: boolean;
  onStartOver: () => void;
  parentOptions: StrainParentOption[];
  onNext: () => void;
}> = ({ step, choice, draft, setDraft, restored, onStartOver, parentOptions, onNext }) => {
  const tr = useT();
  const { t } = tr;
  const share = draftSizeShare({ ...strainSealInputOf(draft) });
  const set = <K extends keyof StrainDraft>(k: K, v: StrainDraft[K]) => setDraft({ ...draft, [k]: v });
  const hasMore = Boolean(
    draft.method ||
    draft.generation ||
    draft.madeOn ||
    draft.parent1.name ||
    draft.parent1.deposit ||
    draft.parent2.name ||
    draft.parent2.deposit ||
    draft.notes,
  );
  const [more, setMore] = useState(hasMore);
  const missing = strainMissing(draft);
  const ready = !missing && share <= 1;
  const moreId = useId();
  const hintId = useId();
  const depositCount = depositsOf(draft.deposits).length;

  return (
    <Stack spacing={2.5} data-strain-form="">
      <Box>
        <ScreenHeading step={step}>{t('app.strain.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.log.fillIn')}
        </Typography>
      </Box>
      {choice}
      {restored && (
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('app.log.keptLastTime')}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              onStartOver();
              focusScreenHeading();
            }}
            sx={{ minHeight: 44 }}
          >
            {t('app.log.startOver')}
          </Button>
        </Stack>
      )}
      <TextField
        label={t('app.strain.nameField')}
        placeholder={t('app.strain.namePlaceholder')}
        helperText={t('app.log.nameHelp')}
        value={draft.name}
        onChange={(e) => set('name', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.strain.designation')}
        value={draft.designation}
        onChange={(e) => set('designation', e.target.value)}
        helperText={t('app.strain.designationHelp')}
        fullWidth
      />
      <TextField
        select
        label={t('app.strain.group')}
        value={draft.group}
        onChange={(e) => set('group', e.target.value as StrainGroup)}
        fullWidth
      >
        {STRAIN_GROUPS.map((g) => (
          <MenuItem key={g} value={g}>
            {strainGroupWords(g, tr)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('app.strain.species')}
        required
        placeholder={t('app.strain.speciesPlaceholder')}
        value={draft.species}
        onChange={(e) => set('species', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.strain.maker')}
        required
        placeholder={t('app.strain.makerPlaceholder')}
        value={draft.maker}
        onChange={(e) => set('maker', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.strain.deposits')}
        value={draft.deposits}
        onChange={(e) => set('deposits', e.target.value)}
        helperText={t('app.strain.depositsHelp')}
        error={missing === 'deposits' || depositCount > 8}
        multiline
        minRows={1}
        fullWidth
      />

      <Box>
        <Button
          variant="text"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          aria-controls={moreId}
          sx={{ px: 0, minHeight: 44 }}
        >
          {more ? t('app.log.fewer') : t('app.strain.more')}
        </Button>
        <Collapse in={more} id={moreId}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <Autocomplete<string, false, false, true>
              freeSolo
              options={METHODS.map((k) => t(k))}
              inputValue={draft.method}
              onInputChange={(_, v) => set('method', v)}
              renderInput={(params) => (
                <TextField {...params} label={t('app.strain.method')} helperText={t('app.strain.methodHelp')} />
              )}
            />
            <TextField
              label={t('app.strain.generation')}
              value={draft.generation}
              onChange={(e) => set('generation', e.target.value)}
              helperText={t('app.strain.generationHelp')}
              fullWidth
            />
            <TextField
              label={t('app.strain.madeOn')}
              type="date"
              value={draft.madeOn}
              onChange={(e) => set('madeOn', e.target.value)}
              helperText={t('app.strain.madeOnHelp')}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <ParentFields which={1} value={draft.parent1} options={parentOptions} onChange={(p) => set('parent1', p)} />
            <ParentFields which={2} value={draft.parent2} options={parentOptions} onChange={(p) => set('parent2', p)} />
            <TextField
              label={t('app.log.notes')}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              multiline
              minRows={2}
              fullWidth
              helperText={sizeWords(share, tr)}
              error={share > 1}
            />
          </Stack>
        </Collapse>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!ready, hintId)}
        onClick={() => ready && onNext()}
        sx={{ py: 1.6 }}
      >
        {t('app.log.nextCheck')}
      </Button>
      {!ready && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {missing === 'species'
            ? t('app.strain.need.species')
            : missing === 'maker'
              ? t('app.strain.need.maker')
              : missing === 'deposits'
                ? t('app.strain.need.deposits')
                : missing === 'nameOrDesignation'
                  ? t('app.strain.need.nameOrDesignation')
                  : sizeWords(share, tr)}
        </Typography>
      )}
    </Stack>
  );
};

const Line: React.FC<{ k: string; v: string; empty?: boolean; onChange: () => void; action: string }> = ({
  k,
  v,
  empty,
  onChange,
  action,
}) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ alignItems: 'center', py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {k}
      </Typography>
      <Typography
        variant="body1"
        sx={{ fontWeight: 700, color: empty ? 'text.secondary' : undefined, wordBreak: 'break-word' }}
      >
        {v}
      </Typography>
    </Box>
    <Button variant="text" onClick={onChange}>
      {action}
    </Button>
  </Stack>
);

/** "Is this right?" for a strain: what will be sealed, line by line, as it will be sealed. */
export const StrainReviewLines: React.FC<{ draft: StrainDraft; onChange: () => void }> = ({ draft, onChange }) => {
  const tr = useT();
  const { t } = tr;
  const s = strainSealInputOf(draft);
  const change = t('app.common.change');
  const notStated = t('app.strain.notStated');
  const parents = s.parents.map((p) => strainParentWords(p)).filter(Boolean);
  const extras = [
    s.method ? t('app.strain.x.method', { v: s.method }) : '',
    s.generation ? t('app.strain.x.generation', { v: s.generation }) : '',
    parents.length ? t('app.strain.x.parents', { v: parents.join(' × ') }) : '',
    s.notes ? t('app.log.x.notes') : '',
  ].filter(Boolean);
  return (
    <Box data-strain-review="">
      <Line k={t('app.strain.k.strain')} v={s.name || notStated} empty={!s.name} onChange={onChange} action={change} />
      <Line
        k={t('app.strain.designation')}
        v={s.designation || notStated}
        empty={!s.designation}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.strain.k.kindSpecies')}
        v={`${strainGroupWords(s.group, tr)} · ${s.species}`}
        onChange={onChange}
        action={change}
      />
      <Line k={t('app.strain.maker')} v={s.maker} onChange={onChange} action={change} />
      <Line
        k={t('app.strain.k.deposits')}
        v={s.deposits.length ? s.deposits.join(' · ') : notStated}
        empty={!s.deposits.length}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.strain.k.made')}
        v={s.madeOn || notStated}
        empty={!s.madeOn}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.log.k.more')}
        v={extras.length ? extras.join(' · ') : t('app.log.noneAdded')}
        empty={!extras.length}
        onChange={onChange}
        action={extras.length ? change : t('app.common.add')}
      />
    </Box>
  );
};
