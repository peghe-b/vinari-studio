// The render's side of src/lib/outline.mjs (the highlight follows the element's own shape, the owner 2026-10-19): a capture's
// pixels, read once a tab, and its highlights' concentric rings, measured once a highlight.
//
//   useRings(url, hls)   the rings (capture px: the outline's INNER edge, its radius the element's own plus the gap) of the
//                        highlights `hls` on the capture at `url`; url null (a film made before the rule): every entry null
//                        and nothing is read, so the scene draws exactly as it did. The frame waits for the pixels.
//   toFrac(ring)         a ring as capture fractions {x0, y0, x1, y1} (the kit's Region), its radius kept in capture px
import {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {ringOf, type OutlineHl, type Px, type Ring} from './outline.mjs';

const SRC_W = 1080;
const SRC_H = 2346;

const pixels = new Map<string, Px>();
const loads = new Map<string, Promise<Px>>();
const rings = new Map<string, Ring>();

/** the capture at `url` as RGBA at 1080 x 2346 (the size every scene draws it at) */
const load = (url: string): Promise<Px> => {
  const had = loads.get(url);
  if (had) return had;
  const p = (async () => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = SRC_W;
    cv.height = SRC_H;
    const g = cv.getContext('2d', {willReadFrequently: true});
    if (!g) throw new Error('outline: no 2d context');
    g.drawImage(img, 0, 0, SRC_W, SRC_H);
    const d = g.getImageData(0, 0, SRC_W, SRC_H);
    const px: Px = {data: d.data, width: SRC_W, height: SRC_H};
    pixels.set(url, px);
    return px;
  })();
  loads.set(url, p);
  return p;
};

const keyOf = (h: OutlineHl) => [h.x ?? 0.03, h.y, h.w ?? 0.94, h.h, h.r ?? '', h.snap === false ? 0 : 1, h.gap ?? ''].join(',');

export const useRings = (url: string | null, hls: readonly OutlineHl[]): (Ring | null)[] => {
  const want = url !== null && hls.length > 0;
  const [ready, setReady] = useState(() => !want || pixels.has(url as string));
  const [handle] = useState(() => (ready ? null : delayRender(`outline: the pixels of ${url}`)));
  useEffect(() => {
    if (ready || !want) return undefined;
    let dead = false;
    load(url as string).then(
      () => {
        if (!dead) setReady(true);
      },
      (e) => cancelRender(e),
    );
    return () => {
      dead = true;
    };
  }, [ready, want, url]);
  useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  const key = want ? `${url}|${hls.map(keyOf).join(';')}` : '';
  return useMemo(() => {
    if (!want) return hls.map(() => null);
    const px = pixels.get(url as string);
    if (!px) return hls.map(() => null);
    return hls.map((h) => {
      const k = `${url}|${keyOf(h)}`;
      let g = rings.get(k);
      if (!g) {
        g = ringOf(h, px, SRC_W, SRC_H);
        rings.set(k, g);
      }
      return g;
    });
    // the key holds the url and every highlight's numbers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
};

export const toFrac = (g: {x0: number; y0: number; x1: number; y1: number}) => ({x0: g.x0 / SRC_W, y0: g.y0 / SRC_H, x1: g.x1 / SRC_W, y1: g.y1 / SRC_H});
