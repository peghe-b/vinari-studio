// The Instagram Story slides (the owner, 2026-10-19: a STORIES section on vinari.ge/studio, "mainly Highlights explainers": for a
// feature, 3 to 7 slides that explain step by step how it works and how to use it, simply, with strong graphics and the REAL
// app screens in WHOLE phones; black or white text, our fonts; plus one Highlight cover icon a topic). The same day, hard:
// "the slides are ALWAYS the white theme; the iPhone mockup BIG, never cut at the top or the bottom; refined every time; the
// Highlight cover a white field with the topic's icon in the middle".
// A set is specs/slides/<id>.json (tools/ci/slides.mjs lints it; ci/slides.md is the cloud's brief). Composition
// "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT): tools/slides.mjs renders the still of slide i at
// i * SLOT + SETTLED, every motion long settled; "<id>-highlight" is the Highlight cover. Every element is placed from
// src/slides/zone.mjs (the boxes the lint and the safe-zone test use), inside y 250..1580; the white field runs to the edges.
//
// Layouts (the spec's "layout"):
//   cover    kicker, the big condensed Mtavruli headline (1 or 2 lines, "|" breaks), the whole 3D iPhone BIG on a real screen
//   step     the step's number chip and verb, a short body line, the whole phone BIG on the step's screen: the row that matters
//            in a clear window (`row`: capture fractions {y, h[, x, w]}), the tap on it (`tap`), the row lifted out big (`lift`);
//            the steps of a set share one phone size and place
//   picture  a title, a body, and a picture: `picture` {kind: "film", name, ...props} (the set's own graphic,
//            src/scenes/film/<Name>.tsx, drawn inside p.box), {kind: "car", design, night, view}, {kind: "cockpit",
//            check}, {kind: "icon", name}
//   fact     an icon, a big number with its unit, a title, a body
//   end      the VINARI mark and wordmark, one line, a quiet body
// Any slide may take "note" (one quiet grey line, e.g. "iPhone და Android"). No hand on the phone: it stands alone, whole.
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, Sequence, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {TXT} from '../lib/layer';
import {Film} from '../scenes/Film';
import {Car3, type CarCam} from '../scenes/kit/car3d';
import {Cockpit, CP} from '../scenes/kit/cockpit';
import {bandOf, inPlace, mid, pad, regionOf} from '../scenes/kit/explain';
import {Sym} from '../scenes/kit/icons';
import {atFoot, Lift, Phone3, type Rect} from '../scenes/kit/phone3d';
import {KitScale} from '../scenes/kit/scale';
import {StepChip} from '../scenes/kit/stage';
import {C, F, setAccentMode, setAccents, setFilmNo, setTheme} from '../tokens';
import type {SceneCtx} from '../types';
import {layoutSet, SETTLED, SLOT, splitLines, STORY, TYPE, type Box, type Layout} from './zone.mjs';

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

const measure = (text: string, size: number, weight = 700) => textWidth(mtav(text), `${weight} ${size}px ${F.sans}`);
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

const Lines: React.FC<{lines: string[]; box: Box; size: number; weight: number; lh: number; align?: 'left' | 'center'; color?: string; tracking?: string}> = ({lines, box, size, weight, lh, align = 'left', color, tracking}) => (
  <div className={TXT} style={{position: 'absolute', left: box.x, top: box.y, width: box.w, textAlign: align, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: tracking, color: color ?? C.ink}}>
    {lines.map((l, i) => (
      <div key={i} style={{whiteSpace: 'nowrap'}}>
        {mtav(l)}
      </div>
    ))}
  </div>
);

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
  if (kind === 'film' && typeof p.name === 'string') return <Film p={{...p, type: 'Film', box}} ctx={PIC_CTX} />;
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

/** the lifted row: in place over its row and BIG enough to read on a phone (at least LIFT_MIN px wide, 1.42 times a wide row),
 *  never wider than the zone's text width nor past the frame's sides */
const LIFT_MIN = 320;
const liftTo = (pose: Parameters<typeof inPlace>[0], r: ReturnType<typeof regionOf>): Rect => {
  const w0 = Math.max(1, (r.x1 - r.x0) * pose.w);
  const grow = Math.min(Math.max(1.42, LIFT_MIN / w0), (STORY.w - 2 * STORY.side) / w0);
  const to = inPlace(pose, r, grow);
  return {...to, x: Math.max(STORY.side, Math.min(STORY.w - STORY.side - to.w, to.x))};
};

export const Slide: React.FC<{s: SlideSpec; lay: Layout}> = ({s, lay}) => {
  const B = lay.boxes;
  const layout = lay.layout;
  const head = splitLines(s.title);
  const out: React.ReactNode[] = [];
  if (B.kicker && s.kicker)
    out.push(<Lines key="k" lines={[s.kicker]} box={B.kicker} size={TYPE.kicker.size as number} weight={TYPE.kicker.weight} lh={TYPE.kicker.lh} align="center" tracking="0.04em" color={C.ink2} />);
  if (B.head && head.length) {
    const tp = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.title : TYPE.ptitle;
    const size = Math.min(lay.sizes.head ?? 96, fitTo(head, lay.sizes.head ?? 96, tp.weight, B.head.w));
    out.push(<Lines key="h" lines={head} box={B.head} size={size} weight={tp.weight} lh={tp.lh} align={layout === 'picture' ? 'left' : 'center'} />);
  }
  if (B.chip) out.push(<StepChip key="c" n={Number(s.n ?? 1)} x={B.chip.x + B.chip.w / 2} y={B.chip.y + B.chip.h / 2} k={1} size={B.chip.w} />);
  if (B.title && head.length) {
    const size = Math.min(lay.sizes.title ?? 80, fitTo(head, lay.sizes.title ?? 80, TYPE.title.weight, B.title.w));
    const box = {...B.title, y: B.title.y + (B.title.h - head.length * size * TYPE.title.lh) / 2};
    out.push(<Lines key="t" lines={head} box={box} size={size} weight={TYPE.title.weight} lh={TYPE.title.lh} />);
  }
  const left = layout === 'step' || layout === 'picture';
  if (B.body && lay.sizes.bodyLines) out.push(<Lines key="b" lines={lay.sizes.bodyLines} box={B.body} size={TYPE.body.size as number} weight={TYPE.body.weight} lh={TYPE.body.lh} align={left ? 'left' : 'center'} />);
  if (B.note && lay.sizes.noteLines) out.push(<Lines key="n" lines={lay.sizes.noteLines} box={B.note} size={TYPE.note.size as number} weight={TYPE.note.weight} lh={TYPE.note.lh} align={left ? 'left' : 'center'} color={C.ink2} />);
  if (B.icon && s.icon) out.push(<Sym key="i" name={s.icon} size={B.icon.w} color={C.ink} x={B.icon.x + B.icon.w / 2} y={B.icon.y + B.icon.h / 2} />);
  if (B.big && s.big !== undefined) {
    const txt = `${s.big}${s.unit ? ` ${s.unit}` : ''}`;
    const size = Math.min(lay.sizes.big ?? 200, fitTo([txt], lay.sizes.big ?? 200, 700, B.big.w));
    out.push(<Lines key="g" lines={[txt]} box={B.big} size={size} weight={700} lh={1} align="center" />);
  }
  if (B.mark) {
    const ink = 'brightness(0) invert(0.045)';
    out.push(<Img key="m" src={staticFile('brand/mark.svg')} style={{position: 'absolute', left: B.mark.x, top: B.mark.y, width: B.mark.w, height: B.mark.h, filter: ink}} />);
    if (B.word) out.push(<Img key="w" src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: B.word.x, top: B.word.y, width: B.word.w, height: B.word.h, filter: ink}} />);
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

/** the Highlight cover's icon: its size in px, centred on the frame (Instagram's circle crop is a centred circle the frame's
 *  width: the icon sits well inside it) */
export const HIGHLIGHT_ICON = 440;

/** "<id>-highlight": the Highlight cover (the owner, 2026-10-19): a white field and the topic's ONE icon, black, in the middle;
 *  nothing else. Every set's cover is drawn the same way, so his Highlights read as one set. */
export const HighlightCover: React.FC<{set: SlideSetSpec}> = ({set}) => {
  tokens(set);
  return (
    <AbsoluteFill style={{background: FIELD}}>
      <Sym name={set.highlight?.icon ?? 'directions_car'} size={HIGHLIGHT_ICON} color={INK} x={540} y={960} />
    </AbsoluteFill>
  );
};
