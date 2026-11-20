// Reading a code from the camera, on the device (docs/scan-and-labels.md).
//
// The browser's own BarcodeDetector where it has one that reads QR codes (Chrome on Android,
// macOS and ChromeOS). Elsewhere (iPhone and iPad, Firefox, Chrome on Windows and Linux) the
// bundled reader: zxing-wasm 3.1.6 (MIT; ZXing-C++ inside is Apache-2.0), its reader-only
// WebAssembly (~0.95 MB, ~0.4 MB as served gzipped), pinned in package.json and served from this
// site like any other file. It is fetched only when someone presses Scan on such a browser, never
// with a page. Its default of fetching the WebAssembly from a CDN is replaced below, and the
// site's Content-Security-Policy (connect-src 'self') would refuse that CDN anyway. No frame
// leaves the device: each is read in this tab and dropped.
// SPDX-License-Identifier: Apache-2.0

import { BUNDLED_FORMATS, NATIVE_FORMATS } from './scan-text';

export type Decoder = {
  readonly kind: 'native' | 'bundled';
  /** The text of the first code in this frame, or undefined when there is none. */
  read: (video: HTMLVideoElement) => Promise<string | undefined>;
};

type NativeDetector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = {
  new (o: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

/** The browser's own detector, when it reads QR codes; undefined otherwise. */
const nativeDecoder = async (): Promise<Decoder | undefined> => {
  const BD = (globalThis as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (!BD || typeof BD.getSupportedFormats !== 'function') return undefined;
  let supported: string[];
  try {
    supported = await BD.getSupportedFormats();
  } catch {
    return undefined;
  }
  if (!supported.includes('qr_code')) return undefined;
  const detector = new BD({ formats: NATIVE_FORMATS.filter((f) => supported.includes(f)) });
  return {
    kind: 'native',
    read: async (video) => {
      const found = await detector.detect(video);
      return found.find((c) => c.rawValue)?.rawValue;
    },
  };
};

let bundled: Promise<Decoder> | undefined;

/** The bundled reader, loaded once, the first time it is needed. */
const bundledDecoder = (): Promise<Decoder> => {
  bundled ??= (async () => {
    const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    // This site's own copy of the WebAssembly, never the package's default CDN.
    await prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
      fireImmediately: true,
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no canvas');
    return {
      kind: 'bundled' as const,
      read: async (video: HTMLVideoElement) => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return undefined;
        // At most 1280 px on the long side: enough for a label at arm's length, quick on a phone.
        const scale = Math.min(1, 1280 / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const results = await readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), {
          formats: [...BUNDLED_FORMATS],
          tryHarder: true,
          maxNumberOfSymbols: 1,
        });
        return results.find((r) => r.isValid && r.text)?.text;
      },
    };
  })();
  bundled.catch(() => (bundled = undefined));
  return bundled;
};

/** The reader for this browser: its own when it has one, the bundled one otherwise. */
export const openDecoder = async (): Promise<Decoder> => (await nativeDecoder()) ?? bundledDecoder();

/** Whether this browser can open a camera at all (a page served over https, or localhost). */
export const cameraPossible = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function';
