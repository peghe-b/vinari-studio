// The Instagram Story slides (the owner, 2026-10-19: a STORIES section on vinari.ge/studio, "mainly Highlights explainers": for a
// feature, 3 to 7 slides that explain step by step how it works and how to use it, simply, with strong graphics and the REAL
// app screens; black or white text, our fonts; plus one Highlight cover icon a topic). The same day, hard: "ALWAYS the white
// theme; the Highlight cover a white field with the topic's icon in the middle". And that evening, on the tilted 3D phones:
// "I don't want this tilted, bent mockup. It must be BIG; some phones coming up from the bottom, big. The headline BIG,
// LEFT-aligned, like on the covers. More graphics: lines, teaching graphics."
// A set is specs/slides/<id>.json (tools/ci/slides.mjs lints it; ci/slides.md is the cloud's brief). Composition
// "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT): tools/slides.mjs renders the still of slide i at
// i * SLOT + SETTLED; "<id>-highlight" is the Highlight cover. Every element is placed from src/slides/zone.mjs (the boxes the
// lint and the safe-zone test use), inside x 65..1015, y 250..1580 (Instagram's Story safe zone); the white field runs to the
// edges, and only a rising phone's lower body runs below 1580.
//
// The look: a page of a premium product manual. The headline is the Reels covers' (the condensed Mtavruli at weight 600, huge,
// LEFT-aligned at x 72, one or two short lines), a small label over it ("ნაბიჯი 2 / 3" on a step). The iPhone is FLAT and
// straight (a black body, a thin titanium rim, the real screen; no turn, no perspective, no shadow), either WHOLE and big
// ("phone": "whole", a step's default; right of centre when callouts take the left column) or RISING from the bottom edge, 85 %
// of the frame wide, its lower body running off the frame ("phone": "rise", the cover's and the end's default). The graphics
// are black on white: a thin outline box round the element that matters, the tap on it, numbered callouts with thin leader
// lines and a dot on their element, a loupe that enlarges a small element beside the phone (or inside a rising phone's screen)
// joined to its outline by two thin lines. No hand, no pen strokes, no glitch, no gradient, no shadow.
//
// Layouts (the spec's "layout"):
//   cover    `kicker` (a small label), the huge headline (1 or 2 lines, "|" breaks), an optional `body` or `note`, the phone
//            on the feature's main screen (rising by default); `row`, `tap` and ONE callout may point at what it is
//   step     "ნაბიჯი n / N" (automatic), the step's title (one verb and its object, 1 or 2 lines), the phone on the step's
//            screen (whole by default): `row` (capture fractions {y, h[, x, w]}) the element in an outline box, `tap` the
//            tap on it, `callouts` 1 to 3 numbered labels [{text, x, y}] (x, y: the point on the capture each leader ends
//            on), `loupe` the row enlarged beside the phone (a small element: a tile, a toggle, a button). A step with a
//            `row` and a `body` but no callouts shows its body as callout 1 on its row. The steps' whole phones share one size
//   end      the closing line (1 or 2 lines), a `body` (the free-week line, ci/endings.json) or a quiet `note`, the phone on
//            one more real screen (rising by default), calm: no row, no tap, no callout
//   picture  (a car-knowledge set only) a title, a body, and a picture: {kind: "film", name, ...props} (the set's own graphic,
//            src/scenes/film/<Name>.tsx, drawn inside p.box), {kind: "car", design, night, view}, {kind: "cockpit", check},
//            {kind: "icon", name}
//   fact     (a car-knowledge set only) an icon, a big number with its unit, a title, a body
// Any phone slide may set "phone": "whole" | "rise". On a rising phone everything that matters (the row, the callout's point,
// the loupe) must sit in the part of the screen inside the zone (zone.mjs `vis`, about its top 40 %: the lint says so).
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
import {BADGE, FLAT, layoutSet, SETTLED, SLOT, STORY, TYPE, type Box, type Layout, type Pt, type TypeSpec} from './zone.mjs';

export {SETTLED, SLOT};

export type SlideSpec = {
  layout?: string;
  kicker?: string;
  title?: string;
  body?: string;
  note?: string;
  n?: number;
  screen?: string;
  phone?: 'whole' | 'rise';
  row?: {x?: number; y: number; w?: number; h: number};
  tap?: boolean;
  loupe?: boolean;
  /** the old name of `loupe` (sets made before the flat phones) */
  lift?: boolean;
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

/** the text's width: the condensed Mtavruli (caps) or the plain letters of a body, a note or a callout */
const measure = (text: string, size: number, weight = 700, caps = true) => textWidth(caps ? mtav(text) : text, `${weight} ${size}px ${F.sans}`);

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
const BODY_INK = '#2C2C2E';
const GREY = '#6A6A6A';

/** text lines in a box: the condensed Mtavruli (caps), or the plain letters as written (a body, a note, a callout) */
const Lines: React.FC<{lines: string[]; box: Box; size: number; weight: number; lh: number; caps?: boolean; color?: string; tracking?: string}> = ({lines, box, size, weight, lh, caps = true, color, tracking}) => (
  <div className={TXT} style={{position: 'absolute', left: box.x, top: box.y, width: box.w, textAlign: 'left', fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: tracking, color: color ?? INK}}>
    {lines.map((l, i) => (
      <div key={i} style={{whiteSpace: 'nowrap'}}>
        {caps ? mtav(l) : l}
      </div>
    ))}
  </div>
);
const Plain: React.FC<{lines: string[]; box: Box; t: TypeSpec; color: string}> = ({lines, box, t, color}) => <Lines lines={lines} box={box} size={t.size as number} weight={t.weight} lh={t.lh} caps={false} color={color} />;

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
const cap = (src: string) => staticFile(`screens/${src}.jpg`);
const RIM = '#6B6B70'; // the titanium frame, a thin line round the black body
const BTN = '#55555A';

/** The iPhone, flat and straight (the owner: no tilt, no perspective): the black body with its titanium rim, the side buttons,
 *  the real capture in the rounded screen (the captures carry the Dynamic Island). No shadow: it stands on the white field. */
export const FlatPhone: React.FC<{lay: NonNullable<Layout['phone']>; src: string}> = ({lay, src}) => {
  const {x, y, w, h, d} = lay;
  const bez = FLAT.bez * d;
  const rs = FLAT.r * d;
  const rim = Math.max(2.5, d * 0.0062);
  const bw = Math.max(4, d * 0.0085);
  const btn = (left: boolean, at: number, len: number) => (
    <div style={{position: 'absolute', left: left ? x - bw + 1 : x + w - 1, top: y + at * h, width: bw, height: len * h, borderRadius: left ? `${bw}px 0 0 ${bw}px` : `0 ${bw}px ${bw}px 0`, background: BTN}} />
  );
  return (
    <>
      {btn(true, 0.148, 0.04)}
      {btn(true, 0.215, 0.068)}
      {btn(true, 0.298, 0.068)}
      {btn(false, 0.24, 0.1)}
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: rs + bez, background: '#0A0A0B', boxShadow: `inset 0 0 0 ${rim}px ${RIM}, inset 0 0 0 ${rim + 1.2}px #1B1B1D`}} />
      <div style={{position: 'absolute', left: x + bez, top: y + bez, width: d, height: d * FLAT.sh, borderRadius: rs, overflow: 'hidden', background: '#000'}}>
        <Img src={cap(src)} style={{position: 'absolute', left: 0, top: 0, width: d, height: d * FLAT.sh}} />
      </div>
    </>
  );
};

// ---- the teaching graphics: black lines on the white field, a white halo where they cross the screen ------------------------
const LINE = 3;
const HALO = 9;
const TAP_R = 30;
const Path: React.FC<{pts: Pt[]; w?: number; halo?: number}> = ({pts, w = LINE, halo = HALO - LINE}) => {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <>
      <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={w + halo} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
};
const Dot: React.FC<{p: Pt; r?: number}> = ({p, r = 9}) => <circle cx={p.x} cy={p.y} r={r} fill={INK} stroke="#FFFFFF" strokeWidth={4} />;

/** the loupe's two lines: from the outline's near corners to the loupe's (beside it, under it or over it) */
const loupeLines = (o: Box, l: Box): [Pt, Pt][] => {
  if (l.x + l.w <= o.x)
    return [
      [{x: o.x, y: o.y}, {x: l.x + l.w, y: l.y}],
      [{x: o.x, y: o.y + o.h}, {x: l.x + l.w, y: l.y + l.h}],
    ];
  if (l.y >= o.y + o.h)
    return [
      [{x: o.x, y: o.y + o.h}, {x: l.x, y: l.y}],
      [{x: o.x + o.w, y: o.y + o.h}, {x: l.x + l.w, y: l.y}],
    ];
  return [
    [{x: o.x, y: o.y}, {x: l.x, y: l.y + l.h}],
    [{x: o.x + o.w, y: o.y}, {x: l.x + l.w, y: l.y + l.h}],
  ];
};

const Graphics: React.FC<{lay: Layout; src: string}> = ({lay, src}) => {
  const o = lay.outline;
  const lp = lay.loupe;
  const t = TYPE.call;
  return (
    <>
      <svg width={STORY.w} height={STORY.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {o ? (
          <>
            <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={Math.min(24, o.h / 2)} fill="none" stroke="#FFFFFF" strokeWidth={10} />
            <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={Math.min(24, o.h / 2)} fill="none" stroke={INK} strokeWidth={4} />
          </>
        ) : null}
        {o && lp ? loupeLines(o, lp.box).map(([a, b], i) => <Path key={i} pts={[a, b]} w={2.2} halo={3} />) : null}
        {lay.callouts.map((c, i) => (
          <Path key={i} pts={[c.from, c.knee, c.target].filter((p, k, a) => !k || Math.hypot(p.x - a[k - 1].x, p.y - a[k - 1].y) > 0.5)} />
        ))}
        {lay.tap ? (
          // the touch: a see-through disc (the element reads through it) in a black ring with a white edge
          <>
            <circle cx={lay.tap.x} cy={lay.tap.y} r={TAP_R} fill={INK} fillOpacity={0.16} stroke="#FFFFFF" strokeWidth={9} />
            <circle cx={lay.tap.x} cy={lay.tap.y} r={TAP_R} fill="none" stroke={INK} strokeWidth={3.5} />
          </>
        ) : null}
        {lay.callouts.map((c, i) => (
          <Dot key={i} p={c.target} />
        ))}
      </svg>
      {lp ? (
        <div style={{position: 'absolute', left: lp.box.x, top: lp.box.y, width: lp.box.w, height: lp.box.h, borderRadius: 22, overflow: 'hidden', background: '#FFFFFF', boxShadow: `0 0 0 4px ${INK}, 0 0 0 10px #FFFFFF`}}>
          <Img src={cap(src)} style={{position: 'absolute', left: -lp.crop.x0 * 1080 * lp.k, top: -lp.crop.y0 * 2346 * lp.k, width: 1080 * lp.k, height: 2346 * lp.k, maxWidth: 'none'}} />
        </div>
      ) : null}
      {lay.callouts.map((c, i) => (
        <React.Fragment key={i}>
          <div
            className={TXT}
            style={{position: 'absolute', left: c.badge.x, top: c.badge.y, width: BADGE.size, height: BADGE.size, borderRadius: BADGE.size / 2, background: INK, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 28, lineHeight: 1}}
          >
            <span style={{marginTop: 2}}>{c.n}</span>
          </div>
          <Lines lines={c.lines} box={c.box} size={t.size as number} weight={t.weight} lh={t.lh} caps={false} />
        </React.Fragment>
      ))}
    </>
  );
};

export const Slide: React.FC<{s: SlideSpec; lay: Layout}> = ({s, lay}) => {
  const B = lay.boxes;
  const layout = lay.layout;
  const out: React.ReactNode[] = [];
  if (B.kicker && lay.sizes.kicker) out.push(<Lines key="k" lines={[lay.sizes.kicker]} box={B.kicker} size={TYPE.kicker.size as number} weight={TYPE.kicker.weight} lh={TYPE.kicker.lh} tracking="0.05em" />);
  const head = String(s.title ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 2);
  const hb = B.head ?? B.title;
  if (hb && head.length) {
    const tp = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.end : layout === 'step' ? TYPE.title : TYPE.ptitle;
    const size = (layout === 'step' ? lay.sizes.title : lay.sizes.head) ?? (tp.max as number);
    out.push(<Lines key="h" lines={head} box={hb} size={size} weight={tp.weight} lh={tp.lh} tracking="-0.01em" />);
  }
  if (B.body && lay.sizes.bodyLines) out.push(<Plain key="b" lines={lay.sizes.bodyLines} box={B.body} t={TYPE.body} color={BODY_INK} />);
  if (B.note && lay.sizes.noteLines) out.push(<Plain key="n" lines={lay.sizes.noteLines} box={B.note} t={TYPE.note} color={GREY} />);
  if (B.icon && s.icon) out.push(<Sym key="i" name={s.icon} size={B.icon.w} color={C.ink} x={B.icon.x + B.icon.w / 2} y={B.icon.y + B.icon.h / 2} />);
  if (B.big && s.big !== undefined) out.push(<Lines key="g" lines={[`${s.big}${s.unit ? ` ${s.unit}` : ''}`]} box={B.big} size={lay.sizes.big ?? 200} weight={700} lh={1} />);
  if (B.picture && s.picture) out.push(<Picture key="p" p={s.picture} box={B.picture} />);
  if (lay.phone && s.screen) {
    out.push(<FlatPhone key="ph" lay={lay.phone} src={s.screen} />);
    out.push(<Graphics key="gx" lay={lay} src={s.screen} />);
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
