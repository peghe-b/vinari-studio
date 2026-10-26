// ONE status bar on every capture (2026-10-26, plan step 1.2; the mockup audit: the captures read 9:41, 4:31, 3:36, 1:29 and
// 1:30, some with the simulator's green charging battery, some with no signal). Every phone of the studio (the flat Phone and
// its stagings, the 3D phone, the promo kit's Phone3, the Story slides, the cover's tilted device) shows the capture with
// its own bar painted out and the same real iOS bar drawn on it: 9:41, full signal, Wi-Fi, a full battery. The capture FILE
// is never edited (CLAUDE.md Content rules): this happens at render time, on a canvas, once per capture and tab.
//
// The bar itself is public/screens/_bar/statusbar.png (tools/screens/statusbar-mask.py: the glyphs of two real captures, black,
// the alpha is the ink), 1080 x 120, its parts at PARTS. Each capture that needs it has a FIX, measured on the file:
//   zones   [x0, x1, y0, y1) boxes of the capture's own glyphs, painted out with the paper above and below them
//           (erase "ink": only the glyph pixels and 2 px round them, so a map or a sky under the bar keeps its texture;
//           "all": the whole box, for flat paper)
//   parts   which parts of the bar to draw and where: [dx, dy] from the bar's own place (the 09-24 captures'); "right" is
//           signal + Wi-Fi + battery together (an iPhone 17 Pro capture sits 7 px right and 8 px lower)
//   white   white ink (a dark screen: the result card's black page, the lock screen)
// A capture not listed is drawn as it is (19 and 20: already 9:41, a full battery, a map label where the signal would be).
// A new capture (Phase 3: simctl status_bar at 9:41) needs no entry.
import {useEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

export const BAR_W = 1080;
export const BAR_H = 120;
type Box = readonly [number, number, number, number];
const PARTS = {time: [156, 246, 56, 102], signal: [762, 823, 56, 102], wifi: [834, 889, 56, 102], battery: [898, 990, 56, 102]} as const;
type Part = keyof typeof PARTS;
type Fix = {zones: Box[]; parts: Partial<Record<Part | 'right', readonly [number, number]>>; white?: boolean; erase?: 'ink' | 'all'};

// the 09-24 set (iPhone 16 Pro simulator): 9:41 and full signal already, only the green charging battery goes
const BATTERY: Fix = {zones: [[898, 990, 52, 104]], parts: {battery: [0, 0]}, erase: 'all'};
// the iPhone 17 Pro captures (10-14 and 10-21): 7 px right, 8 px lower; their time and the dots of no signal go
const PRO17: Fix = {zones: [[146, 250, 64, 111], [768, 992, 62, 111]], parts: {time: [-6, 8], right: [7, 8]}, erase: 'all'};
const PRO17_RIGHT: Fix = {zones: [[768, 992, 62, 111]], parts: {right: [7, 8]}};

export const BAR_FIX: Readonly<Record<string, Fix>> = {
  '02-calendar': BATTERY,
  '04-wallet': BATTERY,
  '07-parking': BATTERY,
  '08-qr-card': BATTERY,
  '09-history': BATTERY,
  '11-diagnostics-start': BATTERY,
  '12-diagnostics-sound': BATTERY,
  '13-diagnosis-108': BATTERY,
  '14-vin-scanner': BATTERY,
  '15-qr-web': BATTERY,
  // the map under it: only the battery's own pixels go
  '17-nav-drive': {zones: [[898, 990, 52, 104]], parts: {battery: [0, 0]}},
  // the lock screen: no time in its bar (the big clock is the time); the dots, the Wi-Fi and the green battery, in white
  '18-nav-lock-screen': {zones: [[760, 992, 52, 104]], parts: {right: [0, 0]}, white: true},
  // a 588 px capture on a black page (3:36)
  '22-obd-result': {zones: [[140, 255, 56, 104], [768, 995, 56, 104]], parts: {time: [-3, 1], right: [9, 1]}, white: true, erase: 'all'},
  '23-home-104': PRO17_RIGHT,
  // the price scrolled under its bar: only the glyphs go
  '24-home-tip': PRO17_RIGHT,
  '25-menu-104': PRO17_RIGHT,
  // the App Store page (1:29, 28 %), a real iPhone's: the sky and the clouds under the bar stay
  '26-appstore-page': {zones: [[120, 230, 48, 96], [784, 1014, 46, 96]], parts: {time: [-27, -9], right: [25, -9]}},
  '27-home-bell': PRO17,
  '28-inbox': PRO17,
  // the navigator with the lane strip (an iPhone 14's, 1:55 and the location arrow, on the map): the signal kept clear of the
  // fuel pin left of it
  '17-nav-lanes': {zones: [[70, 222, 36, 100], [818, 1032, 40, 96]], parts: {time: [-81, -12], signal: [57, -12], wifi: [50, -12], battery: [43, -12]}},
};

export const needsBar = (src: string) => Object.prototype.hasOwnProperty.call(BAR_FIX, src);
export const screenFile = (src: string) => staticFile(`screens/${src}.jpg`);

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });

let mask: Promise<HTMLImageElement> | null = null;
/** the bar (public/screens/_bar/statusbar.png), loaded once a tab */
export const barMask = () => (mask ??= loadImage(staticFile('screens/_bar/statusbar.png')));

const lum = (d: Uint8ClampedArray, i: number) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

/** Paint the capture's own bar out and the studio's bar on, on a canvas that holds the capture at 1080 x 2346. */
export const paintBar = (g: CanvasRenderingContext2D, src: string, bar: HTMLImageElement) => {
  const fix = BAR_FIX[src];
  if (!fix) return;
  for (const [x0, x1, y0, y1] of fix.zones) {
    const w = x1 - x0;
    const h = y1 - y0;
    // the paper just above and just below the glyphs (4 rows each, averaged), blended down the box
    const above = g.getImageData(x0, y0 - 6, w, 4).data;
    const below = g.getImageData(x0, y1 + 2, w, 4).data;
    const avg = (d: Uint8ClampedArray, x: number, c: number) => (d[(x + 0) * 4 + c] + d[(w + x) * 4 + c] + d[(2 * w + x) * 4 + c] + d[(3 * w + x) * 4 + c]) / 4;
    const box = g.getImageData(x0, y0, w, h);
    const px = box.data;
    const paper = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) {
      const t = (y + 4) / (h + 8);
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) paper[(y * w + x) * 3 + c] = avg(above, x, c) * (1 - t) + avg(below, x, c) * t;
    }
    // which pixels go: all of them, or the glyphs' (darker than the paper by 28, or lighter for white ink) and 2 px round them
    let hit = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (fix.erase === 'all') {
        hit[i] = 1;
        continue;
      }
      const d = lum(px, i * 4) - (paper[i * 3] * 0.299 + paper[i * 3 + 1] * 0.587 + paper[i * 3 + 2] * 0.114);
      hit[i] = fix.white ? (d > 28 ? 1 : 0) : d < -28 ? 1 : 0;
    }
    for (let k = 0; k < 2; k++) {
      const grown = new Uint8Array(hit);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (hit[i]) continue;
          if ((x > 0 && hit[i - 1]) || (x < w - 1 && hit[i + 1]) || (y > 0 && hit[i - w]) || (y < h - 1 && hit[i + w])) grown[i] = 1;
        }
      hit = grown;
    }
    for (let i = 0; i < w * h; i++) {
      if (!hit[i]) continue;
      px[i * 4] = paper[i * 3];
      px[i * 4 + 1] = paper[i * 3 + 1];
      px[i * 4 + 2] = paper[i * 3 + 2];
    }
    g.putImageData(box, x0, y0);
  }
  // the bar in the capture's ink: black, or white on a dark screen
  const ink = document.createElement('canvas');
  ink.width = BAR_W;
  ink.height = BAR_H;
  const t = ink.getContext('2d');
  if (!t) return;
  t.drawImage(bar, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = fix.white ? '#FFFFFF' : '#000000';
  t.fillRect(0, 0, BAR_W, BAR_H);
  const groups: Record<Part | 'right', Part[]> = {time: ['time'], signal: ['signal'], wifi: ['wifi'], battery: ['battery'], right: ['signal', 'wifi', 'battery']};
  for (const [name, off] of Object.entries(fix.parts) as [Part | 'right', readonly [number, number]][])
    for (const part of groups[name]) {
      const [x0, x1, y0, y1] = PARTS[part];
      g.drawImage(ink, x0, y0, x1 - x0, y1 - y0, x0 + off[0], y0 + off[1], x1 - x0, y1 - y0);
    }
};

const cache = new Map<string, Promise<string>>();
/** The capture with the studio's bar (an object URL), or the file itself when it needs none. Never fails: a capture that
 *  cannot be patched is drawn as it is. */
export const screenUrl = (src: string): Promise<string> => {
  const file = screenFile(src);
  if (!needsBar(src)) return Promise.resolve(file);
  let p = cache.get(src);
  if (!p) {
    p = Promise.all([loadImage(file), barMask()])
      .then(
        ([img, bar]) =>
          new Promise<string>((resolve) => {
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth;
            cv.height = img.naturalHeight;
            const g = cv.getContext('2d', {willReadFrequently: true});
            if (!g) return resolve(file);
            g.drawImage(img, 0, 0);
            paintBar(g, src, bar);
            cv.toBlob((b) => resolve(b ? URL.createObjectURL(b) : file), 'image/png');
          }),
      )
      .catch(() => file);
    cache.set(src, p);
  }
  return p;
};

/** The URL to draw a capture from (with the studio's bar); null until it is ready, and the frame waits for it: the handle is
 *  released after the commit that mounts the image (its own <Img> holds the frame from then on, three.js's loader its own). */
export const useScreenUrl = (src: string): string | null => {
  const [state, setState] = useState<{src: string; url: string | null}>(() => ({src, url: needsBar(src) ? null : screenFile(src)}));
  const handle = useRef<number | null>(null);
  if (handle.current === null && needsBar(src) && !(state.src === src && state.url)) handle.current = delayRender(`status bar ${src}`);
  useEffect(() => {
    if (!needsBar(src)) {
      setState((s) => (s.src === src && s.url ? s : {src, url: screenFile(src)}));
      return undefined;
    }
    let live = true;
    screenUrl(src).then((u) => {
      if (live) setState({src, url: u});
    });
    return () => {
      live = false;
    };
  }, [src]);
  useEffect(() => {
    if (handle.current !== null && state.src === src && state.url) {
      continueRender(handle.current);
      handle.current = null;
    }
  }, [state, src]);
  useEffect(
    () => () => {
      if (handle.current !== null) continueRender(handle.current);
      handle.current = null;
    },
    [],
  );
  return state.src === src ? state.url : null;
};
