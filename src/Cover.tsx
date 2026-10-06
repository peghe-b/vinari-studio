import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Freeze, Img} from 'remotion';
import {fontsLoaded} from './fonts';
import {capsLatin, mtav} from './lib/format';
import {textWidth} from './lib/measure';
import {photoCredit, photoFile, photoInfo, photoKey, placePhoto} from './lib/photo';
import {Promo, themeOf} from './Promo';
import {BrandMark} from './scenes/common';
import {C, F, FPS, isLight, L, rgba, setAccentMode, setTheme, toFrame} from './tokens';
import type {CoverSpec, SceneSpec, VideoProps} from './types';

// The designed Reels cover (owner, 2026-09-24): its own layout, not a frame of the film.
//   top row     a small Vinari lockup (mark + wordmark) on the left, the issue number and a small
//               topic tag on the right, a hairline under them
//   headline    big, left-aligned, from spec cover.title ("|" breaks a line), else the first spoken
//               line; cover.sub is an optional quieter line under it
//   picture     the film itself, frozen at cover.frame (default: the hook scene, settled), without
//               its meta bar, subtitle and VHS (a still cover stays clean), rising out of the field
//               under the headline, scaled by cover.zoom (1.15 on a Wire3D car, else 1) and nudged by cover.y
// The theme is the film's: a black film gets a black cover, a white film a white one. The cover is
// black and white only (the owner, 2026-09-24: no green or red on it): ink type, the film's data
// colours drawn in ink (Promo mono), and anything else in the picture (an app screen) in grey.
// Everything that matters sits inside y 240..1680, the 3:4 part Instagram's profile grid shows.
// The type is the film's (the owner, 2026-09-25: the film's condensed Mtavruli "is very good", the cover
// must not be another font): every Georgian word through mtav(), so it is drawn from NotoGeo at width 75
// like the subtitle and the titles (FiraGO would draw the Mkhedruli), the headline at the Title scene's
// weight 600. The specs keep Mkhedruli; the conversion happens here, at render time.
// tools/cover.mjs renders it as out/<id>.cover.png (composition "<id>-cover", registered in Root.tsx).

const PAD = 72;
const TOP = 300; // the top row (the grid crop starts at 240)
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const HEAD_MAX = 156; // headline size before it is fitted to the width
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;
const GRID_BOTTOM = 1680;
// where the film's content sits in its own frame: the content box's centre in frame pixels (835: the box is
// frame 340..1330 since the subtitle moved down; 780 left the pictures 55 px low, and a stacked car or a
// chart's labels fell out of the profile grid's crop)
const FILM_CY = Math.round(toFrame(540, L.contentMid).y);
const SUB_FS = 46;

export const coverOf = (spec: VideoProps['spec']): CoverSpec => (typeof spec.cover === 'number' ? {frame: spec.cover} : (spec.cover ?? {}));

/** The film frame the cover shows: cover.frame, else 70% into the hook scene (settled, still the hook). */
export const coverFrameOf = ({spec, timeline}: VideoProps) => {
  const f = coverOf(spec).frame;
  if (typeof f === 'number') return f;
  const next = spec.beats.findIndex((b, i) => i > 0 && b.scene);
  const end = next > 0 ? timeline.beats[next].start * FPS : timeline.duration * FPS;
  return Math.max(0, Math.round(end * 0.7));
};

/** "a b|c d" -> lines. */
const parseTitle = (t: string) => t.split('|').map((line) => line.trim());

// ---- the photos on the cover frame (the polaroids) -------------------------------------------------------------------
// The owner, 2026-10-07: "I said put the photos in a polaroid on the cover for the stories". The polaroid holds the REAL
// photo file (public/photos/<src>.jpg), whole enough to recognise, never the film's frozen frame: a Split strip is a
// half-frame 540 px wide, so the frozen frame showed a bonnet and a cab door.
type CoverPhoto = {src: string; u: number; v: number};
type Shot = {scene?: SceneSpec; from: number; cues: number[]};
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
const str = (x: unknown) => (typeof x === 'string' && x ? x : '');

/** The shots of the film (a beat's scene or a mid-beat cut's, Promo's planScenes rule) with their chunk cues. */
const shotsOf = ({spec, timeline}: VideoProps): Shot[] => {
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
const photoAt = (src: string, center?: unknown): CoverPhoto => {
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
const layCards = (photos: CoverPhoto[], top: number, bottom: number, n: number, nudge: number): Card[] => {
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
  const EDGE = PAD; // the tilted cards' outer corners on the text column's edges
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
const CREDIT_FS = 17;
const creditFont = (fs: number) => `400 ${fs}px ${F.mono}`;
const creditOf = (src: string, maxW: number) => {
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

const Polaroid: React.FC<{card: Card; z: number; credit: string[]; fs: number}> = ({card, z, credit: lines, fs}) => {
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
        boxShadow: isLight() ? '0 22px 46px rgba(0,0,0,0.22), 0 3px 9px rgba(0,0,0,0.16)' : '0 22px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
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

export const Cover: React.FC<VideoProps> = (props) => {
  const {spec} = props;
  setTheme(themeOf(props));
  setAccentMode(spec.accent);

  const cv = coverOf(spec);
  const lines = parseTitle(cv.title ?? spec.beats[0].say).map(mtav);
  const tag = cv.tag ?? spec.beats.find((b) => b.meta?.[0])?.meta?.[0] ?? '';
  const issue = /^v(\d+)/.exec(spec.id)?.[1];
  // a wireframe car fills its box loosely and takes a push; a chart, a list or a calendar already
  // spans the content box and would cross the margins
  const frame = coverFrameOf(props);
  const at = props.timeline.beats.reduce((k, b, i) => (b.start * FPS <= frame && (spec.beats[i].scene || i === 0) ? i : k), 0);
  // (a stack of cars already spans the whole box: it takes no push, it steps back a little instead)
  const sc = spec.beats[at].scene;
  const stacked = sc?.type === 'Wire3D' && Array.isArray(sc.models) && sc.models.length > 1;
  const zoom = cv.zoom ?? (sc?.type === 'Wire3D' ? (stacked ? 0.9 : 1.15) : 1);

  // fit the headline: measure every line at HEAD_MAX once the fonts are in, scale to the widest
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const widest = Math.max(1, ...refs.current.map((r) => r?.offsetWidth ?? 0));
        setSize(Math.min(HEAD_MAX, Math.floor((HEAD_MAX * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);

  const fs = size ?? HEAD_MAX;
  const headBottom = HEAD_TOP + lines.length * fs * HEAD_LH;
  const subTop = headBottom + 22;
  const textBottom = cv.sub ? subTop + SUB_FS * 1.3 : headBottom;
  // the film rises under the headline: its content centred in the space left above the grid's edge
  const filmTop = textBottom + 24;
  const shift = Math.round(Math.max(200, Math.min(700, (filmTop + GRID_BOTTOM) / 2 + 20 - FILM_CY)) + (cv.y ?? 0));
  // no gradient behind the text (the owner, 2026-10-07: "the cover as before, only no gradient behind the text: a
  // full-screen picture just moves down so it does not run into the text"): the picture starts on a clean line under
  // the headline, nothing fades
  const clipTop = filmTop + 6;

  // a PERSON'S PHOTO goes on as a polaroid (the owner, 2026-10-07: "if a person's photo is on the cover, better in a
  // polaroid-like photo, slightly tilted so it looks real, and set low so it does not get in the text's way"; that
  // evening: "I said put the photos in a polaroid on the cover for the stories"). Default: the shot on the cover frame
  // shows a story photo (public/photos/story-*, people and their cars: PhotoStory, Split, Twist, a KineticHeadline or
  // rewind BigNumber bg, a Photo, a Callback of such a hook; a Timeline's thumbnails, its own or a Callback's, only when
  // asked); cover.polaroid forces it on or off. The cards hold the photo files themselves (two for a Split: overlapping,
  // tilted apart), whole enough to recognise, low on the grid's 3:4, each credit on its foot; forced on a frame with no
  // photo, one card holds the film's content cropped square (as on 2026-10-07 morning).
  const shown = coverPhotosOf(props, frame);
  const polaroid = cv.polaroid ?? (shown.type !== 'Timeline' && shown.photos.some((p) => photoKey(p.src).startsWith('story-')));
  const cards = polaroid && shown.photos.length ? layCards(shown.photos, filmTop + 30, GRID_BOTTOM - 24, Number(issue ?? 0), cv.y ?? 0) : [];
  // one credit size on every card (the smallest any of them needs)
  const credits = cards.map((c) => creditOf(c.src, c.creditW));
  const creditFs = Math.min(CREDIT_FS, ...credits.filter((c) => c.lines.length).map((c) => c.fs));
  const room = GRID_BOTTOM - 24 - (filmTop + 30);
  const S = Math.round(Math.max(420, Math.min(820 / 1.12, room / 1.26)));
  const side = Math.round(S * 0.06);
  const foot = Math.round(S * 0.2);
  const cardW = S + 2 * side;
  const cardH = S + side + foot;
  const cardTop = GRID_BOTTOM - 24 - cardH; // low: as far from the headline as the grid allows
  const cardLeft = Math.round((1080 - cardW) / 2);
  const tilt = issue ? ((Number(issue) % 4) - 1.5) * 1.6 : -2;
  const win = 900 / zoom; // the square window of the film around its content box (frame px)
  const k = S / win;
  const cy = FILM_CY - (cv.y ?? 0);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {cards.length ? (
        cards.map((card, i) => <Polaroid key={card.src} card={card} z={cv.zoom ?? 1} credit={credits[i].lines} fs={creditFs} />)
      ) : polaroid ? (
        <div style={{position: 'absolute', left: cardLeft, top: cardTop, width: cardW, height: cardH, background: '#FAFAFA', borderRadius: 6, transform: `rotate(${tilt}deg)`, boxShadow: '0 18px 42px rgba(0,0,0,0.28), 0 3px 8px rgba(0,0,0,0.18)'}}>
          <div style={{position: 'absolute', left: side, top: side, width: S, height: S, overflow: 'hidden', background: C.bg, filter: 'grayscale(1)'}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${S / 2 - 540 * k}px, ${S / 2 - cy * k}px) scale(${k})`}}>
              <Freeze frame={frame}>
                <Promo {...props} bare mono silent vhs={0} />
              </Freeze>
            </div>
          </div>
        </div>
      ) : (
        /* the picture: the film frozen on its cover frame, bare (no meta bar, no subtitle, no sound) */
        <AbsoluteFill style={{clipPath: `inset(${clipTop}px 0 0 0)`, filter: 'grayscale(1)'}}>
          <AbsoluteFill style={{transform: `translateY(${shift}px) scale(${zoom})`, transformOrigin: `540px ${FILM_CY}px`}}>
            <Freeze frame={frame}>
              <Promo {...props} bare mono silent vhs={0} />
            </Freeze>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* top row: the lockup left, the issue and the tag right */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <BrandMark kind="mark" height={40} />
        <BrandMark kind="wordmark" height={23} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 18}}>
        {issue ? <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: '0.08em', color: C.ink3}}>№{issue.padStart(2, '0')}</div> : null}
        {tag ? (
          <div
            style={{
              height: ROW_H - 2,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px 0 18px',
              borderRadius: ROW_H,
              border: `1.5px solid ${rgba(C.rule, 0.9)}`,
              fontFamily: F.mono,
              fontSize: 22,
              letterSpacing: '0.06em',
              color: C.ink2,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{width: 9, height: 9, borderRadius: 9, background: C.ink}} />
            {mtav(capsLatin(tag))}
          </div>
        ) : null}
      </div>
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: rgba(C.rule, 0.55)}} />

      {/* the headline */}
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: C.ink, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
      {cv.sub ? (
        <div style={{position: 'absolute', top: subTop, left: PAD, right: PAD, fontFamily: F.sans, fontWeight: 500, fontSize: SUB_FS, lineHeight: 1.3, color: C.ink2, whiteSpace: 'nowrap', opacity: size ? 1 : 0}}>
          {mtav(cv.sub)}
        </div>
      ) : null}
      {/* the measuring copy: every line at HEAD_MAX, invisible */}
      <div style={{position: 'absolute', top: 0, left: 0, visibility: 'hidden', fontFamily: F.sans, fontWeight: 600, fontSize: HEAD_MAX, letterSpacing: '-0.01em'}}>
        {lines.map((line, i) => (
          <div key={i} ref={(el) => {
              refs.current[i] = el;
            }} style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
