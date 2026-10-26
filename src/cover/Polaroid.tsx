// The cover's polaroids (moved here from src/Cover.tsx on 2026-10-26, unchanged in look): a story's REAL photo files
// (public/photos/<src>.jpg), never a frame of the film, as white instant-photo cards in grey, tilted, low under the headline,
// each CC BY credit printed small on its foot. One card, or two overlapping (a Split). The owner, 2026-10-07: "a person's photo
// in a polaroid, slightly tilted, low"; 2026-10-19: the stories always get the person's photo, black and white.
import React from 'react';
import {Img} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {photoCredit, photoFile, photoInfo, photoKey, placePhoto} from '../lib/photo';
import {F, FPS} from '../tokens';
import type {SceneSpec, VideoProps} from '../types';

// ---- the photos on the cover frame (the polaroids) -------------------------------------------------------------------
// The owner, 2026-10-07: "I said put the photos in a polaroid on the cover for the stories". The polaroid holds the REAL
// photo file (public/photos/<src>.jpg), whole enough to recognise, never the film's frozen frame: a Split strip is a
// half-frame 540 px wide, so the frozen frame showed a bonnet and a cab door.
export type CoverPhoto = {src: string; u: number; v: number};
type Shot = {scene?: SceneSpec; from: number; cues: number[]};
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
const str = (x: unknown) => (typeof x === 'string' && x ? x : '');

/** The shots of the film (a beat's scene or a mid-beat cut's, Promo's planScenes rule) with their chunk cues. */
export const shotsOf = ({spec, timeline}: VideoProps): Shot[] => {
  const shots: Shot[] = [];
  spec.beats.forEach((b, i) => {
    const tb = timeline.beats[i];
    if (!tb) return;
    const from = Math.round(tb.start * FPS);
    const chunks = tb.chunks ?? [];
    const cuts = (Array.isArray(b.cuts) ? b.cuts : []).filter((c) => c && c.scene && typeof c.scene.type === 'string' && Number.isInteger(c.chunk) && c.chunk >= 1 && c.chunk < chunks.length).sort((x, y) => x.chunk - y.chunk);
    let lo = 0;
    const add = (hi: number) => chunks.slice(lo, hi).forEach((c) => shots[shots.length - 1]?.cues.push(Math.round(c.start * FPS) - shots[shots.length - 1].from));
    if (b.scene || i === 0 || !shots.length) shots.push({scene: b.scene, from, cues: []});
    for (const c of cuts) {
      if (c.chunk <= lo) continue;
      add(c.chunk);
      shots.push({scene: c.scene, from: Math.round(chunks[c.chunk].start * FPS), cues: []});
      lo = c.chunk;
    }
    add(chunks.length);
  });
  return shots;
};

/** A photo and the point its framing centres on: the scene's own center, else the catalogue's subject outline, else
 *  the story scenes' default (0.5, 0.45). */
export const photoAt = (src: string, center?: unknown): CoverPhoto => {
  const c = (center ?? {}) as {x?: unknown; y?: unknown};
  const subject = photoInfo(src)?.subject;
  const sx = subject?.length ? subject.reduce((s, q) => s + q[0], 0) / subject.length : 0.5;
  const sy = subject?.length ? subject.reduce((s, q) => s + q[1], 0) / subject.length : 0.45;
  return {src, u: num(c.x, sx), v: num(c.y, sy)};
};

/** The photos a shot shows at frame `rel` of it (at most two): PhotoStory (and a print's first `more`), Split's a and
 *  b, Twist's setup or reveal photo (whichever is up), a KineticHeadline or rewind BigNumber `bg`, Photo, Timeline's
 *  thumbnails, a Callback's hook. */
const scenePhotos = (sc: SceneSpec | undefined, rel: number, cues: number[], hook?: Shot & {dur: number}): CoverPhoto[] => {
  if (!sc) return [];
  const p = sc as Record<string, any>;
  const out: CoverPhoto[] = [];
  const add = (src: unknown, center?: unknown) => {
    const s = str(src);
    if (s && photoInfo(s) && !out.some((o) => o.src === s)) out.push(photoAt(s, center));
  };
  // a chunk index or "1.2s" of the shot, in its frames (scenes/common.tsx cueFrame)
  const cue = (at: unknown, d: number) => (typeof at === 'number' ? (cues[Math.min(Math.max(0, at), cues.length - 1)] ?? d) : typeof at === 'string' && at.endsWith('s') ? Math.round(parseFloat(at) * FPS) : d);
  switch (sc.type) {
    case 'PhotoStory':
      add(p.src, p.center);
      // a print's first `more` once it has landed on it
      if (p.staging === 'print' && Array.isArray(p.more) && rel >= cue(p.more[0]?.at, 0)) add(p.more[0]?.src);
      break;
    case 'Photo':
      add(p.src, {x: num(p.center?.x, 0.5), y: num(p.center?.y, 0.5)});
      break;
    case 'Split':
      add(p.a?.src, p.a?.center);
      add(p.b?.src, p.b?.center);
      break;
    case 'Twist': {
      // the reveal lands on chunk `at` (default chunk 1, else 0.5 s); without a setup it is up at once
      const T = !p.setup ? 0 : cue(p.at, cues[1] ?? 15);
      const [first, then] = rel >= T ? [p.src, p.setup?.src] : [p.setup?.src, p.src];
      add(first);
      if (!out.length) add(then);
      break;
    }
    case 'KineticHeadline':
      add(p.bg?.src);
      break;
    case 'BigNumber':
      if (p.staging === 'rewind') add(p.bg?.src);
      break;
    case 'Timeline':
      for (const e of Array.isArray(p.events) ? p.events : []) if (out.length < 2) add(e?.src);
      break;
    case 'Callback':
      // the hook frozen where scenes/Callback.tsx freezes it: its own `frame`, else the cover's frame when that lies in
      // the hook (never here: the cover frame is on this Callback), else 70 % into the hook
      return hook && hook.scene?.type !== 'Callback' ? scenePhotos(hook.scene, typeof p.frame === 'number' ? p.frame : Math.round(hook.dur * 0.7), hook.cues) : [];
  }
  return out.slice(0, 2);
};

/** The photos on screen at film frame f, and the shot's scene type (a Callback's: its hook's, which it shows). */
export const coverPhotosOf = (props: VideoProps, f: number) => {
  const shots = shotsOf(props);
  const shot = shots.reduce<Shot | undefined>((k, s) => (s.from <= f ? s : k), shots[0]);
  const hook = shots[0] ? {...shots[0], dur: (shots[1]?.from ?? Math.ceil(props.timeline.duration * FPS)) - shots[0].from} : undefined;
  const type = shot?.scene?.type === 'Callback' ? (hook?.scene?.type ?? '') : (shot?.scene?.type ?? '');
  return {type, photos: shot ? scenePhotos(shot.scene, f - shot.from, shot.cues, hook) : []};
};

// ---- the polaroid: a white instant-photo card, the photo in grey, the credit printed small on its foot -----------------
const FOOT = 0.24; // the foot under the photo, of the card's base size (the classic instant photo's wide bottom)
const RIM = 0.06; // the rim on the other three sides
type Card = CoverPhoto & {W: number; H: number; side: number; foot: number; w: number; h: number; x: number; y: number; tilt: number; creditW: number};
/** A card for window aspect a (the photo's own, held between 4:5 and 3:2, so a landscape photo stays nearly whole) and
 *  base size b (the square root of the window's area: two cards of different shapes weigh the same). */
const cardOf = (ph: CoverPhoto, b: number) => {
  const info = photoInfo(ph.src);
  const a = Math.min(1.5, Math.max(0.8, info ? info.w / info.h : 1));
  const W = Math.round(b * Math.sqrt(a));
  const H = Math.round(b / Math.sqrt(a));
  const side = Math.round(RIM * b);
  const foot = Math.round(FOOT * b);
  return {W, H, side, foot, w: W + 2 * side, h: H + side + foot};
};
/** The axis-aligned box a card of w x h fills when tilted by t degrees. */
const tiltBox = (w: number, h: number, t: number) => {
  const r = (Math.abs(t) * Math.PI) / 180;
  return {bw: w * Math.cos(r) + h * Math.sin(r), bh: w * Math.sin(r) + h * Math.cos(r)};
};

/** Lay out one or two polaroids between `top` and `bottom` (page px). One: centred, as big as the space allows, low.
 *  Two: the first up left, the second down right and over it, tilted the other way; as big as they can be while the
 *  second covers at most a tenth of the first one's photo (it mostly lands on its foot). */
export const layCards = (photos: CoverPhoto[], top: number, bottom: number, n: number, nudge: number): Card[] => {
  const room = bottom - top;
  if (photos.length === 1) {
    const tilt = n ? ((n % 4) - 1.5) * 1.6 : -2;
    let b = 720;
    let d = cardOf(photos[0], b);
    for (; b > 300; b -= 4) {
      d = cardOf(photos[0], b);
      const {bw, bh} = tiltBox(d.w, d.h, tilt);
      if (bw <= 1080 - 2 * 84 && bh <= room) break;
    }
    const {bh} = tiltBox(d.w, d.h, tilt);
    // low (the owner: "set low so it does not get in the text's way"), a quarter of the spare room left under it
    const cy = Math.min(bottom - bh / 2, Math.max(top + bh / 2, top + (room - bh) * 0.75 + bh / 2 + nudge));
    return [{...photos[0], ...d, x: Math.round(540 - d.w / 2), y: Math.round(cy - d.h / 2), tilt, creditW: d.W}];
  }
  const [pa, pb] = photos;
  const tA = -(2.2 + (n % 3) * 0.6);
  const tB = 1.6 + (Math.floor(n / 3) % 3) * 0.6;
  const EDGE = 72; // the tilted cards' outer corners on the text column's edges
  const place = (b: number) => {
    const A = cardOf(pa, b);
    const B = cardOf(pb, b);
    const ba = tiltBox(A.w, A.h, tA);
    const bb = tiltBox(B.w, B.h, tB);
    // A's box at the top left, B's at the bottom right; each card centred in its box
    const ax = EDGE + (ba.bw - A.w) / 2;
    const ay = top + (ba.bh - A.h) / 2;
    const bx = 1080 - EDGE - bb.bw + (bb.bw - B.w) / 2;
    const by = bottom - bb.bh + (bb.bh - B.h) / 2;
    // how much of A's photo B covers (axis-aligned estimate)
    const ox = Math.max(0, Math.min(ax + A.side + A.W, bx + B.w) - Math.max(ax + A.side, bx));
    const oy = Math.max(0, Math.min(ay + A.side + A.H, by + B.h) - Math.max(ay + A.side, by));
    const fits = ba.bh <= room && bb.bh <= room && ba.bw <= 1080 - 2 * EDGE - 120 && bb.bw <= 1080 - 2 * EDGE - 120;
    return {A, B, ax, ay, bx, by, ok: fits && ox * oy <= 0.1 * A.W * A.H};
  };
  let b = 560;
  let k = place(b);
  for (; b > 260 && !k.ok; b -= 4) k = place(b);
  const {A, B} = k;
  // the vertical nudge moves both, inside the room
  const dy = Math.max(top - Math.min(k.ay, k.by), Math.min(nudge, bottom - Math.max(k.ay + A.h, k.by + B.h)));
  // A's credit stays where B leaves its foot uncovered
  const footHidden = k.bx < k.ax + A.w && k.by < k.ay + A.h;
  const creditA = footHidden ? Math.max(120, Math.min(A.W, k.bx - k.ax - A.side - 28)) : A.W;
  return [
    {...pa, ...A, x: Math.round(k.ax), y: Math.round(k.ay + dy), tilt: tA, creditW: creditA},
    {...pb, ...B, x: Math.round(k.bx), y: Math.round(k.by + dy), tilt: tB, creditW: B.W},
  ];
};

/** The credit a licence asks for (CC BY, CC BY-SA: photos.json "credit", the line the film shows while the photo is on
 *  screen and the post repeats), printed small on the card's foot like a lab's stamp: two lines broken at the " · "
 *  nearest the middle (the author and licence, then the archive), at most 17 px, shrunk to fit (never cut). Public
 *  domain, CC0 and Unsplash need none: the foot stays blank. */
export const CREDIT_FS = 17;
const creditFont = (fs: number) => `400 ${fs}px ${F.mono}`;
export const creditOf = (src: string, maxW: number) => {
  const t = mtav(photoCredit(src));
  if (!t) return {lines: [] as string[], fs: CREDIT_FS};
  const width = (l: string) => textWidth(l, creditFont(CREDIT_FS), 0.02 * CREDIT_FS);
  const parts = t.split(' · ');
  let lines = [t];
  let w = width(t);
  for (let i = 1; i < parts.length; i++) {
    const two = [parts.slice(0, i).join(' · '), parts.slice(i).join(' · ')];
    const tw = Math.max(...two.map(width));
    if (lines.length === 1 || tw < w) [lines, w] = [two, tw];
  }
  return {lines, fs: w <= maxW ? CREDIT_FS : Math.max(11, Math.floor((CREDIT_FS * maxW) / w))};
};

export const Polaroid: React.FC<{card: Card; z: number; credit: string[]; fs: number}> = ({card, z, credit: lines, fs}) => {
  const info = photoInfo(card.src) ?? {w: card.W, h: card.H};
  const r = placePhoto({x: 0, y: 0, w: card.W, h: card.H}, info, z, card.u, card.v);
  // a dark photo is lifted a little, a bright one held down: the print reads at phone size
  const lum = typeof (info as {lum?: number}).lum === 'number' ? (info as {lum: number}).lum : 0.45;
  const lift = Math.min(1.14, Math.max(0.94, 1 + (0.45 - lum) * 0.5));
  const lh = Math.round(fs * 1.35);
  return (
    <div
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        width: card.w,
        height: card.h,
        background: 'linear-gradient(180deg, #FCFCFC 0%, #F1F1F1 100%)', // neutral (rule 12: R = G = B)
        borderRadius: 5,
        transform: `rotate(${card.tilt.toFixed(2)}deg)`,
        boxShadow: '0 22px 46px rgba(0,0,0,0.22), 0 3px 9px rgba(0,0,0,0.16)', // the cover is always on the light paper
      }}
    >
      <div style={{position: 'absolute', left: card.side, top: card.side, width: card.W, height: card.H, overflow: 'hidden', background: '#1C1C1C'}}>
        <Img src={photoFile(card.src)} style={{position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, maxWidth: 'none', filter: `grayscale(1) contrast(1.08) brightness(${lift.toFixed(3)})`}} />
        {/* the print's edge: a hairline and a breath of shade where the photo meets the card */}
        <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14), inset 0 2px 8px rgba(0,0,0,0.22)'}} />
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: card.side + 2,
            top: card.h - Math.round(card.foot * 0.3) - lh * (lines.length - i) + Math.round(lh * 0.5),
            whiteSpace: 'nowrap',
            fontFamily: F.mono,
            fontSize: fs,
            lineHeight: `${lh}px`,
            letterSpacing: '0.02em',
            color: '#8E8E8E',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const isStoryPhoto = (ph: {src: string}[]) => ph.some((p) => photoKey(p.src).startsWith('story-'));

/** The photos the cover's polaroid shows when the spec names none: the film's PERSON photo first (photos.json "people", shot
 *  upright: nearly always a portrait; the owner wants the man's face, not the wreck), else the first shot that shows a story-
 *  photo (one card, or a Split's two), else (story: false) any photo the film shows. Timeline thumbnails are never taken. */
export const filmPhotos = (props: VideoProps, story = true): CoverPhoto[] => {
  const cands = shotsOf(props)
    .map((sh) => coverPhotosOf(props, sh.from + 12))
    .filter((x) => x.type !== 'Timeline' && x.photos.length && (!story || isStoryPhoto(x.photos)));
  const face = (src: string) => {
    const i = photoInfo(src) as {people?: boolean; w?: number; h?: number} | undefined;
    return Boolean(i?.people && i.w && i.h && i.h >= 0.9 * i.w);
  };
  const person = cands.find((x) => x.photos.some((p) => face(p.src)));
  if (person) return person.photos.filter((p) => face(p.src)).slice(0, 1);
  return cands[0]?.photos ?? [];
};

/** The polaroids between `top` and `bottom`: the cards laid out, one credit size on every card (the smallest any needs). */
export const Polaroids: React.FC<{photos: CoverPhoto[]; top: number; bottom: number; n: number; nudge?: number; zoom?: number}> = ({photos, top, bottom, n, nudge = 0, zoom = 1}) => {
  const cards = layCards(photos.slice(0, 2), top, bottom, n, nudge);
  const credits = cards.map((c) => creditOf(c.src, c.creditW));
  const fs = Math.min(CREDIT_FS, ...credits.filter((c) => c.lines.length).map((c) => c.fs));
  return (
    <>
      {cards.map((card, i) => (
        <Polaroid key={card.src} card={card} z={zoom} credit={credits[i].lines} fs={fs} />
      ))}
    </>
  );
};
