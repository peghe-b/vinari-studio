// The Instagram Story slides (the owner, 2026-10-19: a STORIES section on vinari.ge/studio, "mainly Highlights explainers": for a
// feature, 3 to 7 slides that explain step by step how it works and how to use it, simply, with strong graphics and the REAL
// app screens in WHOLE phones; black or white text, our fonts; plus one Highlight cover icon a topic). The same day, hard:
// "the slides are ALWAYS the white theme; the iPhone mockup BIG, never cut at the top or the bottom; refined every time; the
// Highlight cover a white field with the topic's icon in the middle".
// A set is specs/slides/<id>.json (tools/ci/slides.mjs lints it; ci/slides.md is the cloud's brief). Composition
// "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT): tools/slides.mjs renders the still of slide i at
// i * SLOT + SETTLED, every motion long settled; "<id>-highlight" is the Highlight cover. Every element is placed from
// src/slides/zone.mjs (the boxes the lint and the safe-zone test use), inside x 65..1015, y 250..1580 (Instagram's Story safe
// zone); the white field runs to the edges.
//
// Layouts (the spec's "layout"): every slide shows the REAL app in the whole, big iPhone (the owner, 2026-10-19), but a car-
// knowledge set's (tools/ci/slides.mjs PHONELESS: there is no app screen for a tip):
//   cover    kicker, the big condensed Mtavruli headline (1 or 2 lines, "|" breaks), the whole 3D iPhone BIG on a real screen
//   step     the step's number chip and its title beside it (one verb and its object), a short body line under the title, the
//            whole phone BIG on the step's screen: the row that matters in a clear window (`row`: capture fractions
//            {y, h[, x, w]}), the tap on it (`tap`), a WIDE row (half the screen's width or more) lifted (`lift`: inside the screen, never past the phone's edges);
//            the steps of a set share one phone size and place
//   end      the closing line (1 or 2 lines), a body (the free-week line, ci/endings.json) or a quiet note, the whole phone on
//            one more real screen (the home, the feature's result)
//   picture  (a car-knowledge set only) a title, a body, and a picture: {kind: "film", name, ...props} (the set's own graphic,
//            src/scenes/film/<Name>.tsx, drawn inside p.box), {kind: "car", design, night, view}, {kind: "cockpit", check},
//            {kind: "icon", name}
//   fact     (a car-knowledge set only) an icon, a big number with its unit, a title, a body
// The headlines, a step's title and the kicker are set in the condensed Mtavruli; a body and a note in FiraGO's own letters,
// as written. Any slide may take "note" (one quiet grey line, e.g. "iPhone და Android"). No hand on the phone: it stands
// alone, whole.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Sequence} from 'remotion';
import {fontsLoaded} from '../fonts';
import {BleedCtx} from '../lib/bleed';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {TXT} from '../lib/layer';
import {Film} from '../scenes/Film';
import {Car3, type CarCam} from '../scenes/kit/car3d';
import {Cockpit, CP} from '../scenes/kit/cockpit';
import {bandOf, inPlace, mid, pad, regionOf} from '../scenes/kit/explain';
import {hasSym, Sym} from '../scenes/kit/icons';
import {SYMBOLS} from '../scenes/kit/symbols';
import {atFoot, Lift, Phone3, project, type Rect} from '../scenes/kit/phone3d';
import {KitScale} from '../scenes/kit/scale';
import {StepChip} from '../scenes/kit/stage';
import {C, F, setAccentMode, setAccents, setFilmNo, setTheme} from '../tokens';
import type {SceneCtx} from '../types';
import {layoutSet, SETTLED, SLOT, splitLines, STORY, TYPE, type Box, type Layout, type TypeSpec} from './zone.mjs';

export {SETTLED, SLOT};

export type SlideSpec = {
  layout?: string;
  kicker?: string;
  title?: string;
  body?: string;
  note?: string;
  n?: number;
  screen?: string;
  row?: {x?: number; y: number; w?: number; h: number};
  tap?: boolean;
  lift?: boolean;
  yaw?: number;
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

/** the text's width: the condensed Mtavruli (caps) or the plain letters of a body or a note */
const measure = (text: string, size: number, weight = 700, caps = true) => textWidth(caps ? mtav(text) : text, `${weight} ${size}px ${F.sans}`);
/** the size at which every line fits w (never wider: shrink past the type's min rather than overflow) */
const fitTo = (lines: string[], size: number, weight: number, w: number) => {
  const widest = Math.max(1, ...lines.map((l) => measure(l, size, weight)));
  return widest > w ? Math.floor((size * w) / widest) : size;
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

/** the slides' look: ALWAYS the white theme (the owner, 2026-10-19), black type */
const tokens = (set: SlideSetSpec) => {
  setTheme('light');
  setAccents(NaN, typeof set.accent === 'string' ? set.accent : 'none');
  setFilmNo(NaN);
  setAccentMode(undefined);
};
export const FIELD = '#FFFFFF';
export const INK = '#0B0B0B';

/** text lines in a box: the condensed Mtavruli (caps), or the plain letters as written (a body, a note) */
const Lines: React.FC<{lines: string[]; box: Box; size: number; weight: number; lh: number; caps?: boolean; align?: 'left' | 'center'; color?: string; tracking?: string}> = ({lines, box, size, weight, lh, caps = true, align = 'left', color, tracking}) => (
  <div className={TXT} style={{position: 'absolute', left: box.x, top: box.y, width: box.w, textAlign: align, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: tracking, color: color ?? C.ink}}>
    {lines.map((l, i) => (
      <div key={i} style={{whiteSpace: 'nowrap'}}>
        {caps ? mtav(l) : l}
      </div>
    ))}
  </div>
);
/** a body or a note: FiraGO's own letters, a touch softer than the ink */
const Plain: React.FC<{lines: string[]; box: Box; t: TypeSpec; align: 'left' | 'center'; color: string}> = ({lines, box, t, align, color}) => (
  <Lines lines={lines} box={box} size={t.size as number} weight={t.weight} lh={t.lh} caps={false} align={align} color={color} />
);
const BODY_INK = '#2C2C2E';

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

/** the lifted row: in place over its row, a little bigger (up to 1.42 times, at least LIFT_MIN px wide when that fits), and
 *  ALWAYS inside the phone's screen (the reviewer, 2026-10-19: a lifted card wider than the phone ran across its edges like a
 *  black band; the owner: nothing ever slices the phone). The screen's inner box is the projected display less LIFT_INSET a
 *  side, measured where the turned screen is narrowest (its near and far edges), so a yawed phone keeps the card inside too. */
const LIFT_MIN = 320;
const LIFT_INSET = 10;
export const screenInner = (pose: Parameters<typeof inPlace>[0]): Rect => {
  const tl = project(pose, 0, 0);
  const tr = project(pose, 1, 0);
  const bl = project(pose, 0, 1);
  const br = project(pose, 1, 1);
  const x0 = Math.max(tl.x, bl.x) + LIFT_INSET;
  const x1 = Math.min(tr.x, br.x) - LIFT_INSET;
  const y0 = Math.max(tl.y, tr.y) + LIFT_INSET;
  const y1 = Math.min(bl.y, br.y) - LIFT_INSET;
  return {x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0)};
};
export const liftTo = (pose: Parameters<typeof inPlace>[0], r: ReturnType<typeof regionOf>): Rect => {
  const scr = screenInner(pose);
  const w0 = Math.max(1, (r.x1 - r.x0) * pose.w);
  const h0 = Math.max(1, (r.y1 - r.y0) * (2346 / 1080) * pose.w);
  const grow = Math.max(1, Math.min(Math.max(1.42, LIFT_MIN / w0), scr.w / w0, scr.h / h0));
  const to = inPlace(pose, r, grow);
  const x = Math.max(scr.x, Math.min(scr.x + scr.w - to.w, to.x));
  const y = Math.max(scr.y, Math.min(scr.y + scr.h - to.h, to.y));
  return {...to, x, y};
};

export const Slide: React.FC<{s: SlideSpec; lay: Layout}> = ({s, lay}) => {
  const B = lay.boxes;
  const layout = lay.layout;
  const head = splitLines(s.title);
  const out: React.ReactNode[] = [];
  if (B.kicker && s.kicker)
    out.push(<Lines key="k" lines={[s.kicker]} box={B.kicker} size={TYPE.kicker.size as number} weight={TYPE.kicker.weight} lh={TYPE.kicker.lh} align="center" tracking="0.04em" color={C.ink2} />);
  if (B.head && head.length) {
    const tp = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.end : TYPE.ptitle;
    const size = Math.min(lay.sizes.head ?? 96, fitTo(head, lay.sizes.head ?? 96, tp.weight, B.head.w));
    out.push(<Lines key="h" lines={head} box={B.head} size={size} weight={tp.weight} lh={tp.lh} align={layout === 'picture' ? 'left' : 'center'} />);
  }
  if (B.chip) out.push(<StepChip key="c" n={Number(s.n ?? 1)} x={B.chip.x + B.chip.w / 2} y={B.chip.y + B.chip.h / 2} k={1} size={B.chip.w} />);
  if (B.title && head.length) {
    const size = Math.min(lay.sizes.title ?? 80, fitTo(head, lay.sizes.title ?? 80, TYPE.title.weight, B.title.w));
    const box = {...B.title, y: B.title.y + (B.title.h - head.length * size * TYPE.title.lh) / 2};
    out.push(<Lines key="t" lines={head} box={box} size={size} weight={TYPE.title.weight} lh={TYPE.title.lh} />);
  }
  const align = layout === 'step' || layout === 'picture' ? 'left' : 'center';
  if (B.body && lay.sizes.bodyLines) out.push(<Plain key="b" lines={lay.sizes.bodyLines} box={B.body} t={TYPE.body} align={align} color={BODY_INK} />);
  if (B.note && lay.sizes.noteLines) out.push(<Plain key="n" lines={lay.sizes.noteLines} box={B.note} t={TYPE.note} align={align} color={C.ink2} />);
  if (B.icon && s.icon) out.push(<Sym key="i" name={s.icon} size={B.icon.w} color={C.ink} x={B.icon.x + B.icon.w / 2} y={B.icon.y + B.icon.h / 2} />);
  if (B.big && s.big !== undefined) {
    const txt = `${s.big}${s.unit ? ` ${s.unit}` : ''}`;
    const size = Math.min(lay.sizes.big ?? 200, fitTo([txt], lay.sizes.big ?? 200, 700, B.big.w));
    out.push(<Lines key="g" lines={[txt]} box={B.big} size={size} weight={700} lh={1} align="center" />);
  }
  if (B.picture && s.picture) out.push(<Picture key="p" p={s.picture} box={B.picture} />);
  if (lay.phone && s.screen) {
    // the phone: alone (no hand), whole, BIG, its lowest point on the zone's foot (src/slides/zone.mjs)
    const ph = lay.phone;
    const pose = atFoot({x: ph.x, w: ph.w, yaw: ph.yaw, pitch: ph.pitch, roll: ph.roll}, ph.foot);
    const r = s.row ? regionOf(s.row) : null;
    const c = r ? mid(r) : null;
    out.push(
      <Phone3
        key="ph"
        src={s.screen}
        pose={pose}
        shadow={0.8}
        band={r ? bandOf(pad(r, 14), 1) : null}
        veil={r ? 0.26 : 0}
        taps={r && c && s.tap ? [{x: c.x, y: c.y, k: 0.42}] : []}
      />,
    );
    if (r && s.lift) out.push(<Lift key="lift" src={s.screen} r={r} pose={pose} to={liftTo(pose, r)} k={1} radius={30} />);
  }
  return <>{out}</>;
};

/** "<id>-slides": slide i in its own SLOT of frames, on the white field; the set laid out once (the steps' phones one size) */
export const SlideSet: React.FC<{set: SlideSetSpec}> = ({set}) => {
  tokens(set);
  const ready = useFonts();
  const lays = ready ? layoutSet(set.slides, {measure}) : null;
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
