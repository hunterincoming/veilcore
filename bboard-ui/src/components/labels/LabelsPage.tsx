// Print QR labels (/records/labels, docs/scan-and-labels.md): for a record, for a batch just
// saved, or for a record and the records made from it. The records come in this tab's router
// state (LABELS_STATE), never in the address, so the web host's logs never see which records were
// printed together. The page draws the labels on this device; "Download PDF" saves them as a PDF
// at the sheet's own size, made in this tab (label-pdf.ts), and "Print" opens the browser's print
// window. Nothing is sent to make, save or print a label.
//
// By default a label shows the short record ID and "Scan to check", and its QR code carries only
// the record ID and proof code, both public on the check page. The name is added only if the
// holder ticks it (label-layouts.ts labelLink).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Link,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import { AppHeader } from '../AppHeader';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import { recordTitle } from '../../veilcore/animal-profile';
import { CODE_TEXT } from '../../config/theme';
import {
  LABEL_SIZES,
  LAYOUTS,
  defaultSize,
  labelFileName,
  labelReady,
  paginate,
  perPage,
  shortId,
  type LabelSize,
  type LabelsState,
} from './label-layouts';
import { LabelPages } from './LabelSheet';
import { labelsPdf } from './label-pdf';
import { drawQrCodes, drawWords, saveFile } from './label-download';

const SIZE_WORDS: Record<LabelSize, AppKey> = {
  thermal: 'app.labels.size.thermal',
  letter: 'app.labels.size.letter',
  a4: 'app.labels.size.a4',
};

/** In print: only the label pages, each on its own sheet of the chosen size, at 100%. */
const printStyles = (size: LabelSize): string => {
  const l = LAYOUTS[size];
  return `@page { size: ${l.pageCss}; margin: 0; }
@media print {
  html, body, #root, #root > div, main { background: #fff !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
  header[data-site-header], footer, [data-no-print], .MuiFab-root { display: none !important; }
  [data-labels-page], [data-label-print] { max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
  [data-label-print] .label-page { display: block; width: ${l.page.w}mm !important; height: ${l.page.h}mm !important; margin: 0 !important; box-shadow: none !important; }
  [data-label-print] .label-page:not(:last-child) { break-after: page; }
  [data-label-print] .label-outline { display: none; }
}`;
};

export const LabelsPage: React.FC = () => {
  const tr = useT();
  const { t, tp } = tr;
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as Partial<LabelsState>;
  const records = useRecords();
  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  // Offered: the records sent here (ticked) and any others offered with them; with nothing sent,
  // every record that can have a label, none ticked.
  const offered = useMemo(() => {
    const sent = [...(state.ids ?? []), ...(state.also ?? [])];
    const list = sent.length ? sent.map((id) => byId.get(id)).filter((r): r is StrainRecord => !!r) : records;
    return [...new Map(list.map((r) => [r.id, r])).values()];
  }, [state.ids, state.also, byId, records]);
  const ready = offered.filter(labelReady);
  const notReady = offered.length - ready.length;
  const [picked, setPicked] = useState<Set<string>>(() => new Set(state.ids ?? []));
  const [showName, setShowName] = useState(false);
  const [size, setSize] = useState<LabelSize>(() =>
    defaultSize(typeof navigator === 'undefined' ? 'en' : navigator.language || 'en'),
  );
  // As typed, so a box can be cleared and retyped with gloves on; read as a number below.
  const [skipText, setSkipText] = useState('0');
  const [copiesText, setCopiesText] = useState('1');
  const layout = LAYOUTS[size];
  const skip = Math.max(0, Math.min(perPage(layout) - 1, Math.floor(Number(skipText)) || 0));
  const copies = Math.max(1, Math.min(100, Math.floor(Number(copiesText)) || 1));
  const chosen = ready.filter((r) => picked.has(r.id));
  const pages = paginate(chosen, copies, skip, layout);
  const labels = chosen.length * Math.max(1, copies);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const back = state.back;
  // The PDF: saved in one tap. 'failed' if this browser couldn't make it; a link to the file if it
  // made it but would neither save nor open it (label-download.ts saveFile).
  // Kept only for the labels it was made from: change anything and it goes.
  const made = JSON.stringify([size, showName, skip, copies, chosen.map((r) => r.id)]);
  const [savedAs, setSaved] = useState<{ for: string; failed?: true; url?: string } | undefined>();
  const saved = savedAs?.for === made ? savedAs : undefined;
  const leftUrl = saved?.url;
  useEffect(() => (leftUrl ? () => URL.revokeObjectURL(leftUrl) : undefined), [leftUrl]);
  const download = () => {
    let bytes: Uint8Array;
    try {
      bytes = labelsPdf({
        pages,
        layout,
        showName,
        scanToCheck: t('app.labels.scanToCheck'),
        qr: drawQrCodes,
        text: drawWords,
      });
    } catch (e) {
      console.warn('labels: the PDF was not made', e);
      setSaved({ for: made, failed: true });
      return;
    }
    const done = saveFile(
      bytes,
      labelFileName(
        chosen.map((r) => r.id),
        size,
      ),
      'application/pdf',
    );
    setSaved(done.how === 'blocked' ? { for: made, url: done.url } : undefined);
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }} data-labels-page="">
      <style data-label-page-css="">{printStyles(size)}</style>
      <Box data-no-print="">
        <AppHeader />
        {back && (
          <Button
            onClick={() => void navigate(back)}
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 1.5, ml: -1.5, minHeight: 44, px: 1.5 }}
          >
            {t('app.labels.back')}
          </Button>
        )}
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {t('app.labels.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {t('app.labels.intro')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('app.labels.made')}
        </Typography>

        <Stack spacing={2.5}>
          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1 }} id="labels-which">
              {t('app.labels.which')}
            </Typography>
            {ready.length === 0 ? (
              <Alert severity="info" variant="outlined" data-labels-none="">
                {t('app.labels.noneHere')}
              </Alert>
            ) : (
              <>
                {ready.length > 1 && (
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setPicked(new Set(ready.map((r) => r.id)))}
                      sx={{ minHeight: 40 }}
                    >
                      {t('app.labels.all')}
                    </Button>
                    <Button size="small" onClick={() => setPicked(new Set())} sx={{ minHeight: 40 }}>
                      {t('app.labels.none')}
                    </Button>
                  </Stack>
                )}
                <FormGroup aria-labelledby="labels-which">
                  {ready.map((r) => (
                    <FormControlLabel
                      key={r.id}
                      control={<Checkbox checked={picked.has(r.id)} onChange={() => toggle(r.id)} />}
                      sx={{ minHeight: 44, overflowWrap: 'anywhere' }}
                      label={
                        <span>
                          {recordTitle(r)}{' '}
                          <Box component="span" sx={{ ...CODE_TEXT, color: 'text.secondary', fontSize: '0.85em' }}>
                            {shortId(r.id)}
                          </Box>
                        </span>
                      }
                    />
                  ))}
                </FormGroup>
              </>
            )}
            {notReady > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-labels-not-ready={notReady}>
                {tp('app.labels.notReady', notReady)}
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1 }} id="labels-what">
              {t('app.labels.what')}
            </Typography>
            <RadioGroup
              aria-labelledby="labels-what"
              value={showName ? 'name' : 'id'}
              onChange={(e) => setShowName(e.target.value === 'name')}
            >
              <FormControlLabel value="id" control={<Radio />} label={t('app.labels.showId')} sx={{ minHeight: 44 }} />
              <FormControlLabel
                value="name"
                control={<Radio />}
                label={t('app.labels.showName')}
                sx={{ minHeight: 44 }}
                data-labels-show-name=""
              />
            </RadioGroup>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
              data-labels-note={showName ? 'name' : 'id'}
            >
              {t(showName ? 'app.labels.nameNote' : 'app.labels.idNote')}
            </Typography>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={2}>
              <TextField
                select
                label={t('app.labels.size')}
                value={size}
                onChange={(e) => {
                  const next = e.target.value as LabelSize;
                  setSize(next);
                  setSkipText(String(Math.min(skip, perPage(LAYOUTS[next]) - 1)));
                }}
                fullWidth
                slotProps={{ htmlInput: { 'data-labels-size': '' } }}
              >
                {LABEL_SIZES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(SIZE_WORDS[s])}
                  </MenuItem>
                ))}
              </TextField>
              {perPage(layout) > 1 && (
                <TextField
                  type="number"
                  label={t('app.labels.skip')}
                  helperText={t('app.labels.skipHelp')}
                  value={skipText}
                  onChange={(e) => setSkipText(e.target.value)}
                  onBlur={() => setSkipText(String(skip))}
                  slotProps={{ htmlInput: { min: 0, max: perPage(layout) - 1, inputMode: 'numeric' } }}
                  fullWidth
                />
              )}
              <TextField
                type="number"
                label={t('app.labels.copies')}
                value={copiesText}
                onChange={(e) => setCopiesText(e.target.value)}
                onBlur={() => setCopiesText(String(copies))}
                slotProps={{ htmlInput: { min: 1, max: 100, inputMode: 'numeric' } }}
                fullWidth
              />
            </Stack>
          </Paper>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, alignItems: 'start' }}>
            <Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<DownloadIcon />}
                disabled={!labels}
                onClick={download}
                sx={{ minHeight: 48 }}
                data-labels-download=""
              >
                {t('app.labels.download')}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('app.labels.downloadHelp')}
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<PrintIcon />}
                disabled={!labels}
                onClick={() => window.print()}
                sx={{ minHeight: 48 }}
                data-labels-print=""
              >
                {t('app.labels.print')}
                {labels > 0 && ` · ${tp('app.labels.count', labels)}`}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('app.labels.printHelp')}
              </Typography>
            </Box>
          </Box>
          {saved?.failed && (
            <Alert severity="warning" variant="outlined" data-labels-download-failed="">
              {t('app.labels.downloadFailed')}
            </Alert>
          )}
          {leftUrl && (
            <Alert severity="info" variant="outlined">
              <Link href={leftUrl} target="_blank" rel="noopener" data-labels-download-open="">
                {t('app.labels.downloadOpen')}
              </Link>
            </Alert>
          )}

          {pages.length > 0 && (
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t('app.labels.preview')}
            </Typography>
          )}
        </Stack>
      </Box>

      {pages.length > 0 && (
        <Box
          data-label-print=""
          data-label-size={size}
          sx={{
            mt: 1.5,
            '& .label-page': {
              display: 'block',
              width: '100%',
              height: 'auto',
              mb: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              bgcolor: '#fff',
            },
          }}
        >
          <LabelPages
            pages={pages}
            layout={layout}
            showName={showName}
            scanToCheck={t('app.labels.scanToCheck')}
            pageName={(n, of) => t('app.labels.pageOf', { n, of })}
          />
        </Box>
      )}
      {!back && (
        <Box data-no-print="" sx={{ mt: 2 }}>
          <Button component={RouterLink} to="/records" sx={{ minHeight: 44 }}>
            {t('app.labels.back')}
          </Button>
        </Box>
      )}
    </Box>
  );
};
