// v137-sky-horse: the horse's years on ONE tear-off calendar block (phase 2, paper and ink). The block is the object the
// story is carried on: it arrives from the 1918 number, its leaf tears off to 1923 (the race at Savio, Ravenna: a
// chequered strip slides under the year, a hand circle rings it), and in the payoff it tears again to 1932, where two
// swatches, the black of the horse and Modena's yellow (the film's one data accent), slide in and join into one plate.
//   "scene": {"type": "Film", "name": "V137SkyHorse", "look": "diagram", "shot": "leaf" | "colors", "from": "1918",
//             "to": "1923", "place": "სავიო · რავენა", "a": "შავი", "b": "მოდენა", "hitAt": "0.3s"}
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer} from '../../lib/camera';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Card, FitText, drift, tone} from '../kit/p2';
import {Ink} from '../kit/ink';

type P = {
  look?: 'diagram';
  shot?: 'leaf' | 'colors';
  from?: string; // the year on the leaf at frame 0 (the shot before carries it)
  to?: string; // the year under it, once the leaf tears
  place?: string; // a quiet line under the strip (leaf)
  a?: string; // the black swatch's label (colors)
  b?: string; // the yellow swatch's label (colors)
  hitAt?: number | string; // the tear
};

// the block: a white card on the paper, whole inside the P2 stage (y 400..1370)
const BX = 250;
const BW = 580;
const BY = 430;
const RING = [BW * 0.3, BW * 0.7];

/** One leaf of the block: the binding, the year big, centred. */
const Leaf: React.FC<{year: string; h: number; style?: React.CSSProperties}> = ({year, h, style}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: BW, height: h, ...style}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: BW, height: 64, backgroundColor: C.ink}} />
    {RING.map((x, i) => (
      <div key={i} style={{position: 'absolute', left: x - 16, top: 18, width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg}} />
    ))}
    <FitText text={year} x={BW / 2} y={120} w={BW - 80} size={230} min={140} maxLines={1} align="center" anim="none" />
  </div>
);

/** The tear: the old leaf swings off its top-left corner and drops out fast (12 frames), the new one is under it. */
const Torn: React.FC<{year: string; h: number; tear: number}> = ({year, h, tear}) => {
  const frame = useCurrentFrame();
  const u = prog(frame, tear, 12, ease.exit);
  if (u >= 1) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: BW, height: h, backgroundColor: C.surface, transformOrigin: '0px 64px', transform: `translateY(${(u * 240).toFixed(1)}px) rotate(${(-16 * u).toFixed(2)}deg)`, opacity: 1 - u}}>
      <Leaf year={year} h={h} />
    </div>
  );
};

/** The finish strip: two rows of squares, wiped in from the left. */
const Chequer: React.FC<{y: number; at: number}> = ({y, at}) => {
  const frame = useCurrentFrame();
  const u = prog(frame, at, 14, ease.enter);
  const n = 12;
  const sq = (BW - 80) / n;
  return (
    <div style={{position: 'absolute', left: 40, top: y, width: BW - 80, height: sq * 2, clipPath: `inset(0 ${((1 - u) * 100).toFixed(2)}% 0 0)`}}>
      {Array.from({length: n * 2}, (_, i) => {
        const col = i % n;
        const row = Math.floor(i / n);
        return <div key={i} style={{position: 'absolute', left: col * sq, top: row * sq, width: sq, height: sq, backgroundColor: (col + row) % 2 ? C.surface : C.ink}} />;
      })}
    </div>
  );
};

const LeafShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tear = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.3s'));
  const c1 = Math.max(tear + 16, cueFrame(ctx, 1));
  const c2 = Math.max(c1 + 16, cueFrame(ctx, 2));
  const h = 640;
  const sq = (BW - 80) / 12;
  const lift = spr(frame, e, 'enter');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: 540, y: BY + 300})}}>
          <Card x={BX} y={BY} w={BW} h={h} r={22} style={{transform: `translateY(${((1 - lift) * 30).toFixed(1)}px)`}}>
            <Leaf year={p.to ?? '1923'} h={h} />
            <Chequer y={400} at={tear + 10} />
            <FitText text={p.place ?? 'სავიო · რავენა'} x={BW / 2} y={400 + sq * 2 + 40} w={BW - 80} size={56} min={40} maxLines={1} weight={600} align="center" t="quiet" at={tear + 18} />
            <Torn year={p.from ?? '1918'} h={h} tear={tear} />
          </Card>
        </div>
      </CameraLayer>
      <Ink marks={[{kind: 'circle', box: {x: BX + 70, y: BY + 125, w: BW - 140, h: 225}, at: c1}, {kind: 'underline', box: {x: BX + 90, y: BY + 400 + sq * 2 + 104, w: BW - 180, h: 24}, at: c2}]} end={ctx.dur} />
      <Sfx name="asmr-paper-tear" at={tear} volume={0.4} />
      <Sfx name="asmr-slide" at={tear + 10} volume={0.25} />
      <Land at={tear + 4} />
      <Haptic kind="light" at={tear + 2} volume={0.3} />
    </PictureBand>
  );
};

/** Two swatches under the block: the horse's black and Modena's yellow; on chunk 2 the black slides onto the yellow. */
const ColorsShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  // a cut-in shot (one chunk): the swatches slide in on the cut, the black joins the yellow on hitAt
  const tear = Math.max(base + 2, e + 2);
  const c1 = Math.max(e + 4, base);
  const c2 = Math.max(c1 + 18, cueFrame(ctx, p.hitAt ?? '1s'));
  const h = 520;
  const lift = spr(frame, e, 'enter');
  const sin = spr(frame, c1, 'enter');
  const join = spr(frame, c2, 'land');
  // the swatches: y 1000..1190, the labels under them (inside the stage's foot, 1370)
  const SY = 1000;
  const SW = 270;
  const SH = 190;
  // the two swatches close the gap and overlap a little: the black over the yellow's left edge
  const ax = 250 + 70 * join;
  const as = 1;
  const yx = 560 - 70 * join;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: 540, y: 800})}}>
          <Card x={BX} y={BY} w={BW} h={h} r={22} style={{transform: `translateY(${((1 - lift) * 30).toFixed(1)}px)`}}>
            <Leaf year={p.to ?? '1932'} h={h} />
            {p.from && p.from !== p.to ? <Torn year={p.from} h={h} tear={tear} /> : null}
          </Card>
          <div className={OBJ} style={{position: 'absolute', left: yx, top: SY + (1 - sin) * 40, width: SW, height: SH, borderRadius: 18, backgroundColor: tone('accent'), opacity: Math.min(1, sin * 1.4)}} />
          <div className={OBJ} style={{position: 'absolute', left: ax, top: SY + (1 - sin) * 40 + (SH - SH * as) / 2, width: SW * as, height: SH * as, borderRadius: 16, backgroundColor: C.ink, opacity: Math.min(1, sin * 1.4), boxShadow: `0 6px 18px ${rgba(C.ink, 0.18)}`}} />
          <FitText text={p.a ?? 'შავი'} x={ax + SW / 2} y={SY + SH + 26} w={SW} size={52} min={36} maxLines={1} weight={600} align="center" t="quiet" at={c1 + 6} />
          <FitText text={p.b ?? 'მოდენა'} x={yx + SW / 2} y={SY + SH + 26} w={SW} size={52} min={36} maxLines={1} weight={600} align="center" t="quiet" at={c1 + 10} />
        </div>
      </CameraLayer>
      <Ink marks={[{kind: 'circle', box: {x: 300, y: SY - 30, w: 480, h: SH + 60}, at: c2 + 10}]} end={ctx.dur} />
      {p.from && p.from !== p.to ? <Sfx name="asmr-paper-tear" at={tear} volume={0.4} /> : null}
      <Sfx name="asmr-slide" at={c1} volume={0.25} />
      <Land at={c2 + 4} />
      <Haptic kind="rigid" at={c2 + 4} volume={0.3} />
    </PictureBand>
  );
};

export const V137SkyHorse: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'colors' ? <ColorsShot p={p} ctx={ctx} /> : <LeafShot p={p} ctx={ctx} />);
