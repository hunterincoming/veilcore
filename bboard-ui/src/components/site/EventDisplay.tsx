// The hero's event display (Mako's design, 18 November 2026): rings, and a burst of tracks drawn
// from the 32 bytes of the proof code in the box below it, like a detector's picture of one
// event. Type something else and the old picture fades as the new one draws.
//
// The same drawing also sits behind a few sections as quiet background (his "ambient" displays):
// drawn from a fixed code, centred in its own box, and in night ink on the gold sections (his
// dark tone). Each display is turned by a random angle, as his are, so no two look alike.
//
// Ported from his canvas script with the costs taken out: it draws for about a second after the
// code changes and then stops (no loop while nothing changes); never while off screen or in a
// hidden tab; at no more than 1.5 device pixels per CSS pixel; and with reduced motion it draws
// the finished picture at once. Decoration: hidden from screen readers (the proof code itself is
// in the box below, as text).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef } from 'react';

const LIGHT = { ring: '#5A7BA6', rule: '#1A2331', yellow: '#A67C00', cyan: '#5FD3DF', ink: '#C9D2DE', dot: '#fff' };
/** His dark tone: everything in the night's ink, for a display on gold. */
const DARK = {
  ring: '#0B0E14',
  rule: 'rgba(11,14,20,.3)',
  yellow: '#0B0E14',
  cyan: '#0B0E14',
  ink: '#0B0E14',
  dot: '#fff',
};
export type Tone = 'light' | 'dark';
const DURATION = 1100;
const MAX_DPR = 1.5;

export const hexBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

const ease = (x: number) => 1 - (1 - x) ** 3;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const nibbles = (b: Uint8Array) => {
  const out: number[] = [];
  for (const x of b) out.push(x >> 4, x & 15);
  return out;
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Display = { set: (bytes: Uint8Array) => void; stop: () => void };

const makeDisplay = (canvas: HTMLCanvasElement, hero: boolean, tone: Tone): Display => {
  const ctx = canvas.getContext('2d');
  const fig = canvas.parentElement;
  const COLOURS = tone === 'dark' ? DARK : LIGHT;
  const rot = Math.random() * 6;
  if (!ctx || !fig) return { set: () => undefined, stop: () => undefined };
  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let cur: Uint8Array | null = null;
  let prev: Uint8Array | null = null;
  let t0 = 0;
  let onScreen = true;
  let raf = 0;
  const duration = reducedMotion() ? 0 : DURATION;

  const rings = (r: number) => {
    ctx.lineWidth = 1;
    [0.12, 0.24, 0.38, 0.52].forEach((f, i) => {
      ctx.beginPath();
      ctx.arc(0, 0, r * f, 0, Math.PI * 2);
      ctx.strokeStyle = COLOURS.ring;
      ctx.globalAlpha = 0.12 + i * 0.04;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLOURS.rule;
    [0.64, 0.8, 0.92].forEach((f) => {
      ctx.beginPath();
      ctx.arc(0, 0, r * f, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const tracks = (bytes: Uint8Array, progress: number, alpha: number, r: number) => {
    const nib = nibbles(bytes);
    const outer = ease(clamp((progress - 0.45) / 0.55));
    if (outer > 0) {
      ctx.lineCap = 'butt';
      for (let i = 0; i < 72; i++) {
        const v = bytes[i % 32] ^ bytes[(i * 7) % 32];
        const len = (r * 0.015 + (v / 255) * r * 0.12) * outer;
        const a = (i / 72) * Math.PI * 2 + rot;
        const from = r * 0.66;
        ctx.lineWidth = 2;
        ctx.strokeStyle = v > 200 ? COLOURS.yellow : COLOURS.ring;
        ctx.globalAlpha = alpha * (v > 200 ? 0.9 : 0.25 + (v / 255) * 0.45);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * from, Math.sin(a) * from);
        ctx.lineTo(Math.cos(a) * (from + len), Math.sin(a) * (from + len));
        ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const n = nib[i];
      const straight = n >= 14;
      const dir = i % 2 ? 1 : -1;
      const curl = straight ? dir * 0.06 : dir * (0.3 + ((15 - n) / 15) * 1.7);
      const reach = straight ? r * (1.2 + (nib[(i + 5) % 64] / 15) * 0.6) : r * (0.32 + (n / 15) * 0.32);
      const angle = (i / 64) * Math.PI * 2 + rot + (nib[(i + 17) % 64] / 15) * 0.12;
      const grown = ease(clamp(progress * 1.3 - (i / 64) * 0.3));
      if (grown <= 0) continue;
      const gold = n % 4 === 0;
      ctx.strokeStyle = straight ? COLOURS.cyan : gold ? COLOURS.yellow : COLOURS.ink;
      ctx.globalAlpha = alpha * (straight ? 0.85 : gold ? 0.9 : 0.42);
      ctx.lineWidth = straight ? 1.6 : gold ? 1.3 : 0.9;
      ctx.beginPath();
      for (let s = 0; s <= 28; s++) {
        const f = (s / 28) * grown;
        const d = reach * f;
        const a = angle + curl * f;
        if (s) ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        else ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const frame = (now: number) => {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const r = radius * 0.97;
    ctx.save();
    ctx.translate(cx, cy);
    rings(r);
    const p = duration ? clamp((now - t0) / duration) : 1;
    if (prev && p < 1) tracks(prev, 1, 1 - ease(p), r);
    if (cur) tracks(cur, p, 1, r);
    ctx.fillStyle = COLOURS.dot;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOURS.yellow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const loop = (now: number) => {
    raf = 0;
    frame(now);
    if (duration && now - t0 < duration && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const f = fig.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = box.width;
    h = box.height;
    if (hero) {
      // The hero's canvas runs past its figure; the picture is centred on the figure.
      cx = f.left - box.left + f.width / 2;
      cy = f.top - box.top + f.height / 2;
      radius = Math.min(f.width, f.height) / 2;
    } else {
      cx = w / 2;
      cy = h / 2;
      radius = (Math.min(w, h) / 2) * 0.92;
    }
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Drawn at the end state: a resize mid-animation never restarts the burst.
    frame(t0 + duration);
  };
  const sized = new ResizeObserver(resize);
  sized.observe(canvas);
  const seen = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) kick();
  });
  seen.observe(canvas);
  const shown = () => {
    if (!document.hidden) kick();
  };
  document.addEventListener('visibilitychange', shown);

  return {
    set(bytes) {
      prev = cur;
      cur = bytes;
      t0 = performance.now();
      if (duration) kick();
      else frame(t0);
    },
    stop() {
      sized.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', shown);
      cancelAnimationFrame(raf);
    },
  };
};

/** The figure: square, beside the hero's headline; the canvas runs past it on every side. */
const useDisplay = (hex: string, hero: boolean, tone: Tone) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const display = useRef<Display | null>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const d = makeDisplay(c, hero, tone);
    display.current = d;
    return () => {
      d.stop();
      display.current = null;
    };
  }, [hero, tone]);
  useEffect(() => {
    if (hex.length === 64) display.current?.set(hexBytes(hex));
  }, [hex]);
  return canvas;
};

export const EventDisplay: React.FC<{ hex: string }> = ({ hex }) => {
  const canvas = useDisplay(hex, true, 'light');
  return (
    <figure className="k-event" aria-hidden="true">
      <canvas ref={canvas} />
    </figure>
  );
};

/**
 * Mako's codes for the background displays: SHA-256 of "veilcore:" and the name, as his script
 * works them out on each load (worked out once here instead).
 */
export const AMBIENT = {
  close: '541a427d04c49e1d7649009396c87a35fd08be85de810f2f79a1748d6253c2de',
  make: '1217d3c1331e6d132cda41ebc13fcc2da2a3b45ad39d5a584f92507a11bd145f',
  verify: '47c2c2d53e1651ccd67a4242b93d6ef6d28c45f8aaec1cc897f1ef8f4e3a8816',
  about: 'ee957f01884738f483955af9c633ce6973a1114dd93aab481944007afdb39877',
  contact: '46d9b1fab815144a16d427c230097c25b66de1fc7eca109018a7882b7dbcd38a',
} as const;

/** A display behind a section (his "ambient"): decoration, filling the box it is placed in. */
export const Ambient: React.FC<{ seed: keyof typeof AMBIENT; tone?: Tone; faint?: boolean }> = ({
  seed,
  tone = 'light',
  faint,
}) => {
  const canvas = useDisplay(AMBIENT[seed], false, tone);
  return (
    <div className={`k-ambient${faint ? ' faint' : ''}`} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
};
