// The Instagram Story slides (the owner, 2026-10-19: a STORIES section on vinari.ge/studio, "mainly Highlights explainers": for a
// feature, 3 to 7 slides that explain step by step how it works and how to use it, simply, with strong graphics and the REAL
// app screens; black or white text, our fonts; plus one Highlight cover icon a topic). The same day, hard: "ALWAYS the white
// theme; the Highlight cover a white field with the topic's icon in the middle". That evening, on the tilted 3D phones: "I
// don't want this tilted, bent mockup. It must be BIG; some phones coming up from the bottom, big. The headline BIG,
// LEFT-aligned, like on the covers. More graphics: lines, teaching graphics." Three directions followed; his verdict on them:
// "all three are good", and one complaint for all: the box round an element must follow its shape (CONCENTRIC: a pill gets a
// pill, an even gap, never touching it). So one system, three looks a slide picks, so a set varies.
// A set is specs/slides/<id>.json (tools/ci/slides.mjs lints it; ci/slides.md is the cloud's brief). Composition
// "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT): tools/slides.mjs renders the still of slide i at
// i * SLOT + SETTLED; "<id>-highlight" is the Highlight cover. Every element is placed from src/slides/zone.mjs (the boxes the
// lint and the safe-zone test use), inside x 65..1015, y 250..1580 (Instagram's Story safe zone); the white field runs to the
// edges, and only a phone's lower body runs below 1580.
//
// The look of the page: a premium product manual. The headline is the Reels covers' (the condensed Mtavruli at weight 600,
// huge, LEFT-aligned at x 72; a cover's stays one line while it can), a small label over it ("ნაბიჯი 2 / 3" on a step). The
// iPhone is FLAT and straight (a black body, a thin titanium rim, the real screen; no turn, no perspective, no shadow). The
// graphics are black on white, thin, with a white halo where they cross the screen; every outline, band joint and loupe
// frame CONCENTRIC with its element (src/slides/probe.mjs measures the element's box and corner radius on the capture). No
// hand, no pen strokes, no glitch, no gradient, no shadow, no veil over the screen.
//
// Layouts (the spec's "layout") and their looks (the spec's "look"; zone.mjs LOOKS_OF):
//   cover    `kicker` (a small label, „როგორ მუშაობს"), the huge headline (one line when it fits; "|" breaks), the phone RISING
//            on the feature's main screen. look "plain" (the default: the phone alone, 86 % wide; a `row` gets its outline,
//            no line), "rail" (a `row` and a `label`: a dot, the label, a line down the rail into the element's outline) or
//            "band" (a `row` and a `body`: a line across the row past both edges of the phone, down from the body, its dots
//            on the outline)
//   step     "ნაბიჯი n / N" (automatic), the step's title (one verb and its object, ONE line when it fits), the phone on the
//            step's screen, and one look:
//              "callouts" (the default) the phone at the right edge, as big as its lowest point lets it (whole, or rising off
//                       the frame), right of 1 to 3 numbered `callouts` [{text, x, y}] (x, y: the point on the capture each
//                       leader's dot sits on; a point inside the `row` lands on its outline) and the `body` in the column;
//                       `row` the element in its outline; with no callouts the phone stands centred and a `body` is one line
//                       under the title
//              "rail"   the phone RISING (82 %), a dot and a `label` (2 to 4 words) under the title, a line down the rail into
//                       the `row`'s outline; for an element HIGH on its screen (zone.mjs: the rising phone shows about its top
//                       half inside the zone; the lint says when the row is lower)
//              "band"   the phone RISING (82 %), the `body` under the title, a line from it across the `row` past both edges
//                       of the phone; for a full-width row high on its screen
//              "loupe"  the WHOLE phone at one side, the `row` enlarged in a loupe in the free column (its lines tangent to the
//                       outline and the loupe, laid where they cross the fewest words), the `body` its caption; for a SMALL
//                       element (a toggle, a tile, a button) near the screen's edge
//            `tap` is an old field: it draws nothing (the outline marks the element)
// `row` {y, h[, x, w][, r]}: capture fractions; r the element's corner radius in capture px or "pill" when the measured one
// is off (the probe finds it; the check prints what it found). A cover or the end may set "phone": "whole" (plain look).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, Sequence, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {BleedCtx} from '../lib/bleed';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {TXT} from '../lib/layer';
import {Film} from '../scenes/Film';
import {Car3, type CarCam} from '../scenes/kit/car3d';
import {Cockpit, CP} from '../scenes/kit/cockpit';
import {hasSym, Sym} from '../scenes/kit/icons';
import {SYMBOLS} from '../scenes/kit/symbols';
import {KitScale} from '../scenes/kit/scale';
import {C, F, setAccentMode, setAccents, setFilmNo, setTheme} from '../tokens';
import type {SceneCtx} from '../types';
import {makeProbe, type Probe} from './probe.mjs';
import {BADGE, BUTTONS, CHIP, FLAT, layoutSet, RECAP, roundRect, SCREEN_MASKS, SETTLED, SLOT, STORY, STROKE, TYPE, type Box, type Layout, type Pt, type TypeSpec} from './zone.mjs';

export {SETTLED, SLOT};

export type SlideSpec = {
  layout?: string;
  look?: 'plain' | 'rail' | 'band' | 'callouts' | 'loupe';
  kicker?: string;
  title?: string;
  body?: string;
  note?: string;
  label?: string;
  n?: number;
  screen?: string;
  phone?: 'whole' | 'rise';
  row?: {x?: number; y: number; w?: number; h: number; r?: number | 'pill'};
  tap?: boolean | {x: number; y: number};
  loupe?: boolean;
  /** the old name of `loupe` (sets made before the flat phones) */
  lift?: boolean;
  recap?: boolean;
  callouts?: {text: string; x: number; y: number}[];
  picture?: {kind?: string; name?: string; [k: string]: unknown};
  icon?: string;
  big?: string;
  unit?: string;
};
export type SlideSetSpec = {
  id: string;
  kind?: 'slides';
  category?: string;
  topic?: string;
  theme?: 'light';
  accent?: string;
  slides: SlideSpec[];
  highlight?: {icon?: string};
  post?: {description?: string; tags?: string[]};
};

const useFonts = () => {
  const [h] = useState(() => delayRender('slides: fonts'));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        setReady(true);
        continueRender(h);
      });
    return () => {
      live = false;
    };
  }, [h]);
  return ready;
};

const cap = (src: string) => staticFile(`screens/${src}.jpg`);

/** the set's captures read into probes (./probe.mjs): the elements' real shapes, the words to keep the dots and lines off.
 *  The lint reads the same pixels through PIL, so the render and the lint lay a slide out alike */
const useProbes = (names: string[]) => {
  const key = names.join('|');
  const [h] = useState(() => delayRender('slides: the captures'));
  const [probes, setProbes] = useState<Record<string, Probe> | null>(null);
  useLayoutEffect(() => {
    let live = true;
    const list = key ? key.split('|') : [];
    Promise.all(
      list.map(
        (n) =>
          new Promise<[string, HTMLImageElement | null]>((res) => {
            const img = new Image();
            img.onload = () => res([n, img]);
            img.onerror = () => res([n, null]);
            img.src = cap(n);
          }),
      ),
    ).then((got) => {
      const out: Record<string, Probe> = {};
      for (const [n, img] of got) {
        if (!img) continue;
        const cv = document.createElement('canvas');
        cv.width = 1080;
        cv.height = 2346;
        const ctx = cv.getContext('2d', {willReadFrequently: true});
        if (!ctx) continue;
        ctx.drawImage(img, 0, 0, 1080, 2346);
        const d = ctx.getImageData(0, 0, 1080, 2346);
        out[n] = makeProbe({data: d.data, width: 1080, height: 2346, channels: 4});
      }
      if (!live) return;
      setProbes(out);
      continueRender(h);
    });
    return () => {
      live = false;
    };
  }, [h, key]);
  return probes;
};

/** the slides' look: ALWAYS the white theme (the owner, 2026-10-19), black type */
const tokens = (set: SlideSetSpec) => {
  setTheme('light');
  setAccents(NaN, typeof set.accent === 'string' ? set.accent : 'none');
  setFilmNo(NaN);
  setAccentMode(undefined);
};
export const FIELD = '#FFFFFF';
export const INK = '#0B0B0B';
const BODY_INK = '#2C2C2E';
const GREY = '#6A6A6A';

/** the size at which every line fits w in the browser (never bigger than the layout's: smaller only when the browser's own
 *  measure finds a line wider than the font tables did) */
const fitTo = (lines: string[], size: number, weight: number, caps: boolean, w: number, track = 0) => {
  const widest = Math.max(1, ...lines.map((l) => textWidth(caps ? mtav(l) : l, `${weight} ${size}px ${F.sans}`, track * size)));
  return widest > w ? Math.floor((size * w) / widest) : size;
};

/** text lines in a box: the condensed Mtavruli (caps), or the plain letters as written (a body, a note, a label, a callout) */
const Lines: React.FC<{lines: string[]; box: Box; size: number; weight: number; lh: number; caps?: boolean; color?: string; track?: number}> = ({lines, box, size, weight, lh, caps = true, color, track = 0}) => {
  const sz = fitTo(lines, size, weight, caps, box.w + 2, track);
  return (
    <div className={TXT} style={{position: 'absolute', left: box.x, top: box.y, width: box.w + 40, textAlign: 'left', fontFamily: F.sans, fontWeight: weight, fontSize: sz, lineHeight: `${size * lh}px`, letterSpacing: `${track}em`, color: color ?? INK}}>
      {lines.map((l, i) => (
        <div key={i} style={{whiteSpace: 'nowrap'}}>
          {caps ? mtav(l) : l}
        </div>
      ))}
    </div>
  );
};
const Plain: React.FC<{lines?: string[]; box?: Box; t: TypeSpec; color: string}> = ({lines, box, t, color}) => (lines && box ? <Lines lines={lines} box={box} size={t.size as number} weight={t.weight} lh={t.lh} caps={false} color={color} /> : null);

/** a ctx for a set's own graphic: its moments at 0, 20, 40 ... frames, all settled by SETTLED */
const PIC_CTX: SceneCtx = {dur: SLOT, index: 1, count: 1, cues: [0, 20, 40, 60, 80, 100, 120], beats: [0], speech: []};

const CAMS: Record<string, CarCam> = {
  three: {pos: [7.4, 2.1, 9.6], target: [0.15, 0.72, 0.1], fov: 27},
  front: {pos: [0.6, 1.5, 11.5], target: [0, 0.75, 0], fov: 25},
  side: {pos: [11.5, 1.4, 0.3], target: [0, 0.72, 0], fov: 28},
  rear: {pos: [-6.8, 2.0, -9.4], target: [0, 0.75, 0], fov: 27},
};

const Picture: React.FC<{p: NonNullable<SlideSpec['picture']>; box: Box}> = ({p, box}) => {
  const kind = String(p.kind ?? 'film');
  // the set's own graphic draws inside its box: no film band (PictureBand cuts nothing on a slide)
  if (kind === 'film' && typeof p.name === 'string')
    return (
      <BleedCtx.Provider value>
        <Film p={{...p, type: 'Film', box}} ctx={PIC_CTX} />
      </BleedCtx.Provider>
    );
  if (kind === 'car') {
    const cam = CAMS[String(p.view ?? 'three')] ?? CAMS.three;
    return <Car3 cam={cam} w={box.w} h={box.h} design={p.design === 'sedan' ? 'sedan' : 'suv'} night={Number(p.night ?? 0)} lamp={Number(p.lamp ?? 0.4)} shadow={1} style={{left: box.x, top: box.y}} />;
  }
  if (kind === 'cockpit') {
    const s = Math.min((STORY.w - 2 * STORY.side) / CP.w, box.h / CP.h);
    return (
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${540 - (CP.w * s) / 2} ${box.y + box.h / 2 - (CP.h * s) / 2}) scale(${s})`}>
          <Cockpit uid="sl" frame={SETTLED} check={Number(p.check ?? 1)} night={Number(p.night ?? 1)} />
        </g>
      </svg>
    );
  }
  if (kind === 'icon' && typeof p.name === 'string') {
    const size = Math.min(box.h * 0.62, 520);
    return <Sym name={p.name} size={size} color={C.ink} x={540} y={box.y + box.h / 2} />;
  }
  return null;
};

// ---- the flat iPhone ------------------------------------------------------------------------------------------------------
const RIM = '#6B6B70'; // the titanium frame, a thin line round the black body
const BTN = '#55555A';

/** The iPhone, flat and straight (the owner: no tilt, no perspective): the black body with its titanium rim, the side buttons,
 *  the real capture in the rounded screen (the captures carry the Dynamic Island). No shadow: it stands on the white field. */
export const FlatPhone: React.FC<{lay: NonNullable<Layout['phone']>; src: string}> = ({lay, src}) => {
  const {x, y, w, h, d} = lay;
  const bez = FLAT.bez * d;
  const rs = FLAT.r * d;
  const rim = Math.max(2.5, d * 0.0062);
  const bw = Math.max(4, d * FLAT.btn);
  const btn = (left: boolean, at: number, len: number) => (
    <div style={{position: 'absolute', left: left ? x - bw + 1 : x + w - 1, top: y + at * h, width: bw, height: len * h, borderRadius: left ? `${bw}px 0 0 ${bw}px` : `0 ${bw}px ${bw}px 0`, background: BTN}} />
  );
  // a capture's scroll glitch (zone.mjs SCREEN_MASKS: half-hidden lines between floating bars), painted over flat
  const k = d / 1080;
  const masks = SCREEN_MASKS[src] ?? [];
  return (
    <>
      {BUTTONS.map((b, i) => (
        <React.Fragment key={i}>{btn(b.left, b.at, b.len)}</React.Fragment>
      ))}
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: rs + bez, background: '#0A0A0B', boxShadow: `inset 0 0 0 ${rim}px ${RIM}, inset 0 0 0 ${rim + 1.2}px #1B1B1D`}} />
      <div style={{position: 'absolute', left: x + bez, top: y + bez, width: d, height: d * FLAT.sh, borderRadius: rs, overflow: 'hidden', background: '#000'}}>
        <Img src={cap(src)} style={{position: 'absolute', left: 0, top: 0, width: d, height: d * FLAT.sh}} />
        {masks.map(([x0, y0, x1, y1, row], i) => (
          // the clean row `row` of the capture, stretched down the strip
          <div key={i} style={{position: 'absolute', left: x0 * k, top: y0 * k, width: (x1 - x0) * k, height: (y1 - y0) * k, overflow: 'hidden'}}>
            <Img src={cap(src)} style={{position: 'absolute', left: -x0 * k, top: 0, width: d, height: d * FLAT.sh, maxWidth: 'none', transformOrigin: '0 0', transform: `scaleY(${y1 - y0}) translateY(${-row * k}px)`}} />
          </div>
        ))}
      </div>
    </>
  );
};

// ---- the teaching graphics: black lines on the white field, a thin white halo where they cross the screen ------------------
const HALO = STROKE.halo;
const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
const Line: React.FC<{pts: Pt[]; w?: number}> = ({pts, w = STROKE.line}) => (
  <>
    <path d={pathOf(pts)} fill="none" stroke={FIELD} strokeWidth={w + 2 * HALO} strokeLinecap="round" strokeLinejoin="round" />
    <path d={pathOf(pts)} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const Dot: React.FC<{p: Pt; r?: number}> = ({p, r = STROKE.dot}) => <circle cx={p.x} cy={p.y} r={r} fill={INK} stroke={FIELD} strokeWidth={3} />;
/** a rounded outline (stroke centred on the box's edge), its white halo concentric with it: on both sides, or (out false: a
 *  neighbour close by, the reviewer's "the white gap fill paints over the app's gutters") on the inside only */
const Round: React.FC<{b: Box; r: number; out?: boolean}> = ({b, r, out = true}) => {
  const inset = STROKE.outline / 2 + HALO / 2;
  const inner = {x: b.x + inset, y: b.y + inset, w: b.w - 2 * inset, h: b.h - 2 * inset};
  return (
    <>
      {out ? <path d={roundRect(b, r)} fill="none" stroke={FIELD} strokeWidth={STROKE.outline + 2 * HALO} /> : <path d={roundRect(inner, Math.max(0, r - inset))} fill="none" stroke={FIELD} strokeWidth={HALO} />}
      <path d={roundRect(b, r)} fill="none" stroke={INK} strokeWidth={STROKE.outline} />
    </>
  );
};

/** the end's recap: the steps' numbers on a line, ending on a check */
const Recap: React.FC<{box: Box; n: number}> = ({box, n}) => {
  const r = RECAP.r;
  const y = box.y + r;
  const xs = Array.from({length: n + 1}, (_, i) => box.x + r + i * RECAP.step);
  const last = xs[n];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <line x1={xs[0]} y1={y} x2={last} y2={y} stroke={INK} strokeWidth={STROKE.line} />
      {xs.slice(0, n).map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r + 6} fill={FIELD} />
          <circle cx={x} cy={y} r={r} fill={FIELD} stroke={INK} strokeWidth={STROKE.line} />
          <text x={x} y={y + 1.5} textAnchor="middle" dominantBaseline="central" fontFamily={F.sans} fontWeight={600} fontSize={r * 1.1} fill={INK}>
            {i + 1}
          </text>
        </g>
      ))}
      <circle cx={last} cy={y} r={r + 6} fill={FIELD} />
      <circle cx={last} cy={y} r={r} fill={INK} />
      <path d={`M ${last - r * 0.4} ${y + 1} L ${last - r * 0.08} ${y + r * 0.32} L ${last + r * 0.44} ${y - r * 0.3}`} fill="none" stroke={FIELD} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** a number in a black disc (a callout's, a rail's chip) */
const Badge: React.FC<{b: Box; n: number | null; font: number}> = ({b, n, font}) =>
  n === null ? (
    <div style={{position: 'absolute', left: b.x + b.w / 2 - 11, top: b.y + b.h / 2 - 11, width: 22, height: 22, borderRadius: 11, background: INK}} />
  ) : (
    <div className={TXT} style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.w / 2, background: INK, color: FIELD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: font, lineHeight: 1}}>
      <span style={{marginTop: 2}}>{n}</span>
    </div>
  );

const Graphics: React.FC<{lay: Layout; src: string}> = ({lay, src}) => {
  const o = lay.outline;
  const lp = lay.loupe;
  const tc = TYPE.call;
  const svg: React.ReactNode[] = [];
  // the lines first, the outline over their ends, the dots on top
  if (lay.rail) svg.push(<Line key="rl" pts={lay.rail.path} />);
  if (lay.band) {
    svg.push(<Line key="bl" pts={lay.band.left} />);
    svg.push(<Line key="br" pts={lay.band.right} />);
  }
  lay.callouts.forEach((c, i) => svg.push(<Line key={`c${i}`} pts={c.path} />));
  if (lp) lp.lines.forEach(([a, b], i) => svg.push(<Line key={`l${i}`} pts={[a, b]} w={2.5} />));
  // the outline is the mark: no tap ring on it (zone.mjs: a ring broke a pill's round end and nested a third shape in a tile)
  if (o) svg.push(<Round key="o" b={o} r={o.r} out={o.haloOut !== false} />);
  if (lay.rail) svg.push(<Dot key="rd" p={lay.rail.dot} r={7} />);
  if (lay.band) lay.band.dots.forEach((p, i) => svg.push(<Dot key={`bd${i}`} p={p} />));
  lay.callouts.forEach((c, i) => svg.push(<Dot key={`d${i}`} p={c.dot} />));
  return (
    <>
      <svg width={STORY.w} height={STORY.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {svg}
      </svg>
      {lp ? (
        <>
          <div style={{position: 'absolute', left: lp.box.x, top: lp.box.y, width: lp.box.w, height: lp.box.h, borderRadius: lp.r, overflow: 'hidden', background: lp.ground}}>
            {lp.cut ? (
              // the element alone on the colour round it, its own corners (the pad shows no neighbour's edge)
              <div style={{position: 'absolute', left: lp.cut.x, top: lp.cut.y, width: lp.cut.w, height: lp.cut.h, borderRadius: lp.cut.r, overflow: 'hidden'}}>
                <Img src={cap(src)} style={{position: 'absolute', left: -lp.crop.x0 * lp.k - lp.cut.x, top: -lp.crop.y0 * lp.k - lp.cut.y, width: 1080 * lp.k, height: 2346 * lp.k, maxWidth: 'none'}} />
              </div>
            ) : (
              <Img src={cap(src)} style={{position: 'absolute', left: -lp.crop.x0 * lp.k, top: -lp.crop.y0 * lp.k, width: 1080 * lp.k, height: 2346 * lp.k, maxWidth: 'none'}} />
            )}
          </div>
          <svg width={STORY.w} height={STORY.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <Round b={lp.box} r={lp.r} />
          </svg>
        </>
      ) : null}
      {lay.rail ? <Badge b={lay.rail.chip} n={lay.rail.n} font={30} /> : null}
      {lay.callouts.map((c, i) => (
        <React.Fragment key={i}>
          <Badge b={c.badge} n={c.n} font={28} />
          <Lines lines={c.lines} box={c.box} size={lay.sizes.call ?? (tc.size as number)} weight={tc.weight} lh={tc.lh} caps={false} />
        </React.Fragment>
      ))}
    </>
  );
};

export const Slide: React.FC<{s: SlideSpec; lay: Layout}> = ({s, lay}) => {
  const B = lay.boxes;
  const layout = lay.layout;
  const S = lay.sizes;
  const out: React.ReactNode[] = [];
  if (B.kicker && S.kicker) out.push(<Lines key="k" lines={[S.kicker]} box={B.kicker} size={TYPE.kicker.size as number} weight={TYPE.kicker.weight} lh={TYPE.kicker.lh} track={TYPE.kicker.track} color={GREY} />);
  const hk = layout === 'step' ? 'title' : 'head';
  const hb = B[hk];
  const hl = (S as Record<string, unknown>)[`${hk}Lines`] as string[] | undefined;
  if (hb && hl?.length) {
    const tp = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.end : layout === 'step' ? TYPE.title : TYPE.ptitle;
    const size = ((S as Record<string, unknown>)[hk] as number | undefined) ?? (tp.max as number);
    out.push(<Lines key="h" lines={hl} box={hb} size={size} weight={tp.weight} lh={tp.lh} track={tp.track} />);
  }
  if (lay.recap) out.push(<Recap key="rc" box={lay.recap.box} n={lay.recap.n} />);
  out.push(<Plain key="b" lines={S.bodyLines} box={B.body} t={TYPE.body} color={BODY_INK} />);
  out.push(<Plain key="n" lines={S.noteLines} box={B.note} t={TYPE.note} color={GREY} />);
  if (B.label && S.labelLines) out.push(<Lines key="lb" lines={S.labelLines} box={B.label} size={TYPE.label.size as number} weight={TYPE.label.weight} lh={TYPE.label.lh} caps={false} />);
  if (B.icon && s.icon) out.push(<Sym key="i" name={s.icon} size={B.icon.w} color={C.ink} x={B.icon.x + B.icon.w / 2} y={B.icon.y + B.icon.h / 2} />);
  if (B.big && s.big !== undefined) out.push(<Lines key="g" lines={[`${s.big}${s.unit ? ` ${s.unit}` : ''}`]} box={B.big} size={S.big ?? 200} weight={700} lh={1} />);
  if (B.picture && s.picture) out.push(<Picture key="p" p={s.picture} box={B.picture} />);
  if (lay.phone && s.screen) {
    out.push(<FlatPhone key="ph" lay={lay.phone} src={s.screen} />);
    out.push(<Graphics key="gx" lay={lay} src={s.screen} />);
  }
  out.push(<Plain key="cap" lines={S.capLines} box={B.cap} t={TYPE.cap} color={INK} />);
  return <>{out}</>;
};

/** "<id>-slides": slide i in its own SLOT of frames, on the white field; the set laid out once (the steps counted, the
 *  captures probed) */
export const SlideSet: React.FC<{set: SlideSetSpec}> = ({set}) => {
  tokens(set);
  const ready = useFonts();
  const names = [...new Set(set.slides.map((s) => s.screen).filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]+$/.test(x)))];
  const probes = useProbes(names);
  const lays = ready && probes ? layoutSet(set.slides, {probeOf: (n: string) => probes[n] ?? null}) : null;
  return (
    <AbsoluteFill style={{background: FIELD, overflow: 'hidden'}}>
      <KitScale.Provider value={1}>
        {lays
          ? set.slides.map((s, i) => (
              <Sequence key={i} from={i * SLOT} durationInFrames={SLOT} name={`slide ${i + 1} ${s.layout ?? 'step'}`}>
                <Slide s={s} lay={lays[i]} />
              </Sequence>
            ))
          : null}
      </KitScale.Provider>
    </AbsoluteFill>
  );
};

/** the Highlight cover's icon: the longest side of its INK in px. Every icon is measured and scaled to this one ink size and
 *  centred on its ink (not on its glyph box), so the topics' covers read as one consistent set. Instagram's circle crop is a
 *  centred circle the frame's width: at 460 the icon reads clearly in the small profile circle (about 43 % of it) and its
 *  corners stay well inside (tools/slides.mjs HIGHLIGHT: within 400 px of the centre). */
export const HIGHLIGHT_INK = 460;

/** "<id>-highlight": the Highlight cover (the owner, 2026-10-19): a white field and the topic's ONE icon, black, in the middle;
 *  nothing else. Every set's cover is drawn the same way, so his Highlights read as one set. */
export const HighlightCover: React.FC<{set: SlideSetSpec}> = ({set}) => {
  tokens(set);
  const name = set.highlight?.icon && hasSym(set.highlight.icon) ? set.highlight.icon : 'directions_car';
  const sym = SYMBOLS[name];
  const g = useRef<SVGGElement>(null);
  const [handle] = useState(() => delayRender('highlight: the icon'));
  const [fit, setFit] = useState<string | null>(null);
  useLayoutEffect(() => {
    let t = '';
    const el = g.current;
    if (el) {
      // the ink's own box (a stroked part reaches half its line past its path)
      const b = el.getBBox();
      const sw = Math.max(0, ...sym.p.map((p) => (p.w ? p.w / 2 : 0)));
      const x = b.x - sw;
      const y = b.y - sw;
      const w = b.width + 2 * sw;
      const h = b.height + 2 * sw;
      const k = HIGHLIGHT_INK / Math.max(w, h, 1e-6);
      t = `translate(${(540 - (x + w / 2) * k).toFixed(3)} ${(960 - (y + h / 2) * k).toFixed(3)}) scale(${k.toFixed(5)})`;
    }
    setFit(t);
    continueRender(handle);
  }, [handle, sym]);
  return (
    <AbsoluteFill style={{background: FIELD}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <g ref={g} transform={fit || undefined} opacity={fit ? 1 : 0}>
          {sym.p.map((p, i) =>
            p.w ? (
              <path key={i} d={p.d} fill="none" stroke={INK} strokeWidth={p.w} strokeLinecap={(p.cap as 'round') ?? 'butt'} strokeLinejoin={(p.join as 'round') ?? 'miter'} />
            ) : (
              <path key={i} d={p.d} fill={INK} />
            ),
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
