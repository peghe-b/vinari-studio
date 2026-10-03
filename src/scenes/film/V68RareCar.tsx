// V68RareCar: a rare car in side profile. Guessed price tags ("?") swing down on strings (everyone invents a price),
// the strings snap and the tags fall away, a rail of empty slots counts the same cars on the market and only a few
// slide in, and where the price would sit an empty dashed plaque lands with the honest note.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, vary} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  tagsAt?: number | string; // the guessed tags swing down
  countAt?: number | string; // the strings snap, the rail of slots draws
  carsAt?: number | string; // the few same cars slide into their slots
  fewAt?: number | string; // the empty slots settle: that is all there is
  plaqueAt?: number | string; // the empty price plaque lands
  label?: string; // the plaque's note
  few?: number; // how many slots fill (schematic, never a count read aloud)
  slots?: number;
};

const BODY =
  'M 232 858 L 228 818 Q 232 790 272 782 L 380 770 Q 424 765 450 750 L 522 702 Q 544 690 574 688 L 686 688 Q 718 690 742 704 L 800 750 Q 814 760 834 764 L 850 770 Q 864 778 862 804 L 860 858 L 790 858 A 52 52 0 0 0 686 858 L 384 858 A 52 52 0 0 0 280 858 Z';
const WIN_F = 'M 466 754 L 530 712 Q 544 704 562 704 L 600 704 L 600 754 Z';
const WIN_R = 'M 616 704 L 682 704 Q 704 706 718 716 L 762 754 L 616 754 Z';
const DETAIL = 'M 608 760 L 608 848 M 276 792 L 300 794 M 840 776 L 852 778 M 470 792 L 500 792 M 640 792 L 668 792';
const TAGS = [
  {x: 330, len: 120, rot: 7},
  {x: 540, len: 70, rot: -6},
  {x: 750, len: 140, rot: 5},
];

const miniCar = (x: number, y: number, s: number) =>
  `M ${x - 30 * s} ${y + 10 * s} L ${x - 30 * s} ${y - 2 * s} Q ${x - 28 * s} ${y - 8 * s} ${x - 18 * s} ${y - 9 * s} L ${x - 8 * s} ${y - 20 * s} L ${x + 12 * s} ${y - 20 * s} L ${x + 22 * s} ${y - 9 * s} Q ${x + 30 * s} ${y - 7 * s} ${x + 30 * s} ${y + 2 * s} L ${x + 30 * s} ${y + 10 * s} Z`;

/** Guessed tags on a rare car are cut down; Vinari counts the same cars, finds few, and leaves the price empty. */
export const V68RareCar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tagsAt = Math.max(base + 8, cueFrame(ctx, p.tagsAt ?? 1));
  const countAt = Math.max(tagsAt + 20, cueFrame(ctx, p.countAt ?? 2));
  const carsAt = Math.max(countAt + 12, cueFrame(ctx, p.carsAt ?? 3));
  const fewAt = Math.max(carsAt + 16, cueFrame(ctx, p.fewAt ?? 4));
  const plaqueAt = Math.max(fewAt + 10, cueFrame(ctx, p.plaqueAt ?? 5));
  const slots = Math.max(4, Math.min(10, p.slots ?? 9));
  const few = Math.max(1, Math.min(slots - 2, p.few ?? 2));

  const draw = prog(frame, e, 30, ease.drawOn);
  const push = lerp(1.1, 1.15, prog(frame, e, ctx.dur, ease.camera));
  // the car eases down a little once the tags are gone, making room for the plaque above it
  const settle = prog(frame, countAt, 26, ease.camera);
  const carY = lerp(0, 40, settle);

  // the rail of slots under the car
  const railY = 1010;
  const step = 84;
  const x0 = 540 - ((slots - 1) * step) / 2;
  const railDraw = prog(frame, countAt + 4, 20, ease.drawOn);
  const fewMark = spr(frame, fewAt, 'land');

  // the plaque
  const pl = spr(frame, plaqueAt, 'land');
  const label = mtav(p.label ?? 'ცოტა განცხადებაა');
  const lsize = Math.min(50, Math.floor((50 * 480) / Math.max(1, textWidth(label, `600 50px ${F.sans}`))));

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(0 ${carY})`}>
            <line x1={150} y1={906} x2={930} y2={906} stroke={C.rule} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <path d={BODY} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <path d={WIN_F} fill="none" stroke={C.ink2} strokeWidth={1.8} strokeLinejoin="round" opacity={prog(frame, e + 12, 14)} />
            <path d={WIN_R} fill="none" stroke={C.ink2} strokeWidth={1.8} strokeLinejoin="round" opacity={prog(frame, e + 14, 14)} />
            <path d={DETAIL} fill="none" stroke={C.ink2} strokeWidth={1.6} strokeLinecap="round" opacity={prog(frame, e + 18, 14)} />
            {[332, 738].map((cx, i) => (
              <g key={i} opacity={prog(frame, e + 8 + i * 4, 14)}>
                <circle cx={cx} cy={858} r={44} fill="none" stroke={C.ink} strokeWidth={2.4} />
                <circle cx={cx} cy={858} r={24} fill="none" stroke={C.ink2} strokeWidth={1.6} />
                <circle cx={cx} cy={858} r={4} fill={C.ink2} />
              </g>
            ))}
          </g>
          {/* the rail: empty dashed slots, a few filled with the same car */}
          {Array.from({length: slots}).map((_, i) => {
            const cx = x0 + i * step;
            const filled = i < few;
            const inT = spr(frame, carsAt + i * 7, 'enter');
            const dim = !filled ? lerp(1, 0.45, fewMark) : 1;
            return (
              <g key={i} opacity={railDraw}>
                <rect x={cx - 36} y={railY - 26} width={72} height={52} rx={10} fill="none" stroke={C.rule} strokeWidth={1.5} strokeDasharray="5 5" opacity={dim} />
                {filled && frame >= carsAt + i * 7 ? (
                  <path d={miniCar(cx + (1 - inT) * 220, railY + 2, 0.95)} fill={C.ink} opacity={inT} />
                ) : null}
              </g>
            );
          })}
          {/* the end of the count: a hairline after the last filled slot */}
          <line x1={x0 + (few - 0.5) * step} y1={railY - 40} x2={x0 + (few - 0.5) * step} y2={railY - 40 + 80 * fewMark} stroke={C.ink} strokeWidth={2} opacity={fewMark} />
        </svg>

        {/* the guessed tags, swinging on their strings from the band's top edge */}
        {TAGS.map((t, i) => {
          const at = tagsAt + i * 6;
          if (frame < at) return null;
          const k = frame - at;
          const drop = spr(frame, at, 'enter');
          const swing = t.rot * Math.exp(-k / 26) * Math.sin(k / 5 + i) + t.rot * 0.25;
          const fallT = prog(frame, countAt + i * 3, 18, ease.camera);
          const fallY = fallT * fallT * 700;
          const op = 1 - fallT;
          const len = t.len * drop;
          return (
            <div key={i} style={{position: 'absolute', left: t.x - 70, top: L.graphicsTop, width: 140, height: len + 170, transformOrigin: '70px 0px', transform: `translateY(${fallY}px) rotate(${swing + fallT * (i - 1) * 20}deg)`, opacity: op}}>
              <div style={{position: 'absolute', left: 69, top: 0, width: 2, height: len + 14, backgroundColor: fallT > 0 ? 'transparent' : C.ink2}} />
              <div style={{position: 'absolute', left: 10, top: len + 10, width: 120, height: 150, borderRadius: 14, backgroundColor: C.surface, border: `2px solid ${C.ink}`, boxShadow: `0 10px 26px ${rgba(C.shade, 0.16)}`}}>
                <div style={{position: 'absolute', left: 52, top: 12, width: 16, height: 16, borderRadius: 8, border: `2px solid ${C.ink2}`}} />
                <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 36, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 88, lineHeight: '100px', color: C.ink}}>
                  ?
                </div>
              </div>
            </div>
          );
        })}

        {/* the empty price plaque: where a price would sit, nothing is drawn */}
        {frame >= plaqueAt ? (
          <div style={{position: 'absolute', left: 540 - 300, top: 450, width: 600, height: 190, opacity: pl, transform: `translateY(${(1 - pl) * 24}px) scale(${lerp(0.94, 1, pl)})`}}>
            <svg width={600} height={190} style={{position: 'absolute', inset: 0}}>
              <rect x={2} y={2} width={596} height={186} rx={22} fill={C.surface} stroke={C.ink} strokeWidth={2} strokeDasharray="10 8" />
              {[0, 1, 2, 3].map((j) => (
                <line key={j} x1={150 + j * 80} y1={74} x2={200 + j * 80} y2={74} stroke={C.rule} strokeWidth={4} strokeLinecap="round" />
              ))}
            </svg>
            <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 104, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: lsize, lineHeight: `${lsize + 8}px`, color: C.ink}}>
              {label}
            </div>
          </div>
        ) : null}
      </div>

      <Sfx name="asmr-pencil" at={base + 2} volume={0.4} />
      {TAGS.map((_, i) => (
        <Sfx key={i} name="asmr-paper" at={tagsAt + i * 6} volume={0.32 * vary(i + 1)} />
      ))}
      <Sfx name="asmr-paper-tear" at={countAt} volume={0.3} />
      {Array.from({length: few}).map((_, i) => (
        <Sfx key={i} name="asmr-tick-fine" at={carsAt + i * 7 + 4} volume={0.4 * vary(i + 3)} />
      ))}
      <Sfx name="asmr-knock" at={fewAt} volume={0.36} />
      <Haptic kind="light" at={fewAt} />
      <Land at={plaqueAt} />
    </PictureBand>
  );
};
