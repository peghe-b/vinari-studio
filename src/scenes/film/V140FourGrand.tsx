// v140-four-grand: a friend's father went round workshop after workshop to learn what one noise was. The picture is a
// paper trail: every workshop leaves a receipt, the receipts stick to the same coupe-SUV (paint 'a') and pile on the
// counter's spike; at the end the same car rolls straight up to ONE open shutter and no slip is left. Four shots, each
// its own picture: "spike" (the counter, receipts dropping onto the spike), "crawl" (the street of shutters, the car
// stepping from one to the next, a slip pinned on each shutter it leaves), "stuck" (close on the car, slips flapping all
// over its glass and doors), "one" (the street again, one shutter lit and open, the car stops right there, clean).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {IlloBand, Svg, TOP, FOOT, osc} from '../illo/scene';
import {far, near, lit, ground, acc, accRamp} from '../illo/palette';

type P = {
  shot?: 'spike' | 'crawl' | 'stuck' | 'one';
  hitAt?: number | string;
  line?: string;
  slips?: number; // how many receipts this shot shows by its end
};

const GROUND_Y = 1300; // the street's kerb line (stage): the car stands on it, everything under it is plain road

/** One receipt: a white slip with a few printed lines and a torn foot, centred on (0, 0). */
const Slip: React.FC<{w?: number; h?: number; seed?: number}> = ({w = 120, h = 170, seed = 0}) => {
  const lines = [0.2, 0.32, 0.44, 0.56, 0.72];
  const teeth = 8;
  let foot = '';
  for (let i = 0; i <= teeth; i++) {
    const x = -w / 2 + (w * i) / teeth;
    foot += ` L${x.toFixed(1)} ${(h / 2 - (i % 2 === 0 ? 0 : 9)).toFixed(1)}`;
  }
  return (
    <g>
      <path d={`M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} L${w / 2} ${h / 2}${foot} Z`} fill={rgba(C.ink, 0.12)} transform="translate(6 8)" />
      <path d={`M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} L${w / 2} ${h / 2}${foot} Z`} fill={C.surface} stroke={rgba(C.ink, 0.35)} strokeWidth={3} />
      {lines.map((y, i) => (
        <rect key={i} x={-w / 2 + 16} y={-h / 2 + h * y} width={(w - 32) * (i === 4 ? 0.45 : 0.6 + 0.35 * (((seed + i) * 37) % 10) / 10)} height={i === 4 ? 10 : 6} rx={3} fill={i === 4 ? C.ink : rgba(C.ink, 0.45)} />
      ))}
      <rect x={w / 2 - 44} y={-h / 2 + h * 0.72} width={28} height={10} rx={3} fill={C.ink} />
    </g>
  );
};

/** The workshop wall: plaster from the top of the frame to the kerb, roll-up shutters with slats and a wrench sign. */
const Shutters: React.FC<{xs: readonly number[]; openAt?: number; openK?: number; uid: string}> = ({xs, openAt = -1, openK = 0}) => {
  const topY = 760;
  const h = GROUND_Y - topY - 20;
  const w = 190;
  return (
    <g>
      <rect x={-200} y={TOP} width={1480} height={GROUND_Y - TOP} fill={far(1)} />
      <rect x={-200} y={topY - 70} width={1480} height={16} fill={rgba(C.ink, 0.08)} />
      {xs.map((x, i) => {
        const isOpen = i === openAt;
        const rise = isOpen ? openK : 0;
        const slats = 9;
        return (
          <g key={i}>
            <rect x={x - w / 2 - 14} y={topY - 14} width={w + 28} height={h + 14} fill={rgba(C.ink, 0.16)} rx={6} />
            {isOpen ? <rect x={x - w / 2} y={topY} width={w} height={h} fill={near('night')} /> : null}
            {isOpen ? <rect x={x - w / 2} y={topY + h * 0.55} width={w} height={h * 0.45} fill={rgba(lit('night'), 0.25 * rise)} /> : null}
            <g transform={`translate(0 ${(-h * 0.82 * rise).toFixed(1)})`}>
              <rect x={x - w / 2} y={topY} width={w} height={h} fill={near('day')} stroke={rgba(C.ink, 0.3)} strokeWidth={3} />
              {Array.from({length: slats}, (_, k) => (
                <line key={k} x1={x - w / 2 + 6} x2={x + w / 2 - 6} y1={topY + ((k + 1) * h) / (slats + 1)} y2={topY + ((k + 1) * h) / (slats + 1)} stroke={rgba(C.ink, 0.22)} strokeWidth={3} />
              ))}
            </g>
            <rect x={x - w / 2 - 14} y={TOP} width={w + 28} height={topY - 14 - TOP} fill={far(1)} />
            <g transform={`translate(${x} ${topY - 120})`}>
              <circle r={42} fill={isOpen ? accRamp(acc('a'), 3) : lit('day')} stroke={rgba(C.ink, 0.4)} strokeWidth={3} />
              <path d="M-16 14 L10 -12 M6 -22 A12 12 0 1 0 22 -6" fill="none" stroke={isOpen ? lit('day') : C.ink} strokeWidth={6} strokeLinecap="round" />
            </g>
          </g>
        );
      })}
    </g>
  );
};

const Road: React.FC = () => (
  <g>
    <rect x={-200} y={GROUND_Y} width={1480} height={FOOT - GROUND_Y} fill={ground('day')} />
    <rect x={-200} y={GROUND_Y} width={1480} height={14} fill={rgba(C.ink, 0.14)} />
  </g>
);

const SHUTTER_X = [210, 430, 650, 870] as const;

/** spike: the counter close-up, receipts dropping one by one onto the spike. */
const SpikeShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const n = p.slips ?? 7;
  const every = 6; // a slip every 0.2 s from the first frames: the hook moves by 0.6 s and keeps landing to 1.5 s
  const counterY = 1180;
  const sx = 540;
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={counterY - TOP} fill={far(0)} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={140 + i * 300} y={520} width={200} height={300} rx={10} fill={rgba(C.ink, 0.05)} />
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={counterY} width={1480} height={FOOT - counterY} fill={near('day')} />
          <rect x={-200} y={counterY} width={1480} height={18} fill={rgba(C.ink, 0.16)} />
          <g className={OBJ}>
            <ellipse cx={sx} cy={counterY + 10} rx={110} ry={22} fill={rgba(C.ink, 0.18)} />
            <rect x={sx - 90} y={counterY - 26} width={180} height={34} rx={12} fill={C.ink} />
            <rect x={sx - 5} y={counterY - 430} width={10} height={410} rx={5} fill={C.ink} />
            {Array.from({length: n}, (_, i) => {
              const t0 = i < 2 ? -100 : e + (i - 2) * every;
              const k = i < 2 ? 1 : prog(f, t0, 9, ease.whipOut);
              if (k <= 0) return null;
              const restY = counterY - 60 - i * 26;
              const y = restY - (1 - k) * 700;
              const rot = ((i * 47) % 21) - 10 + (1 - k) * 25;
              return (
                <g key={i} transform={`translate(${sx + (((i * 29) % 11) - 5) * 3} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1.35 0.42)`}>
                  <Slip seed={i} />
                </g>
              );
            })}
            <circle cx={sx} cy={counterY - 432} r={7} fill={C.ink} />
          </g>
          {Array.from({length: n}, (_, i) => (i < 2 ? null : <Sfx key={i} name="asmr-paper" at={Math.max(base, e + (i - 2) * every)} volume={0.22} />))}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'ისევ *ქვითარი*'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

/** crawl / one: the street of shutters. crawl: the car steps from shutter to shutter and a slip is pinned on each one it
 *  leaves. one: one shutter lit, rolling up; the car drives straight to it and stops, no slip. */
const StreetShot: React.FC<{p: P; ctx: SceneCtx; one: boolean}> = ({p, ctx, one}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const dur = ctx.dur;
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const len = 470;
  // crawl: four stops, the car's centre in front of each shutter in turn (kept whole: 300..780)
  const stops = [300, 460, 620, 780];
  let carX: number;
  let slipsUp = 0;
  if (one) {
    carX = 300 + (620 - 300) * prog(f, e, Math.max(20, hit - e), ease.enter);
  } else {
    const seg = Math.max(12, (dur - e) / stops.length);
    const i = Math.min(stops.length - 1, Math.floor(Math.max(0, f - e) / seg));
    const local = prog(f, e + i * seg, seg * 0.55, ease.enter);
    const j = Math.max(0, i - 1);
    const from = stops[j | 0];
    carX = i === 0 ? stops[0] : from + (stops[i | 0] - from) * local;
    slipsUp = i;
  }
  const openK = one ? prog(f, hit - 6, 22, ease.enter) : 0;
  const rolling = one ? 1 - prog(f, hit - 4, 10) : 0.6;
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Shutters xs={SHUTTER_X} open={one ? 2 : -1} openK={openK} uid={uid} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Road />
          {one
            ? null
            : SHUTTER_X.slice(0, 3).map((x, i) => {
                const k = i < slipsUp ? spr(f, e + Math.round(((i + 1) * (dur - e)) / 4) - 4, 'land') : 0;
                if (k <= 0) return null;
                return (
                  <g key={i} className={OBJ} transform={`translate(${x} ${900 + osc(f, 40, i) * 3}) rotate(${(-6 + i * 5).toFixed(1)}) scale(${(0.6 + 0.4 * k).toFixed(3)})`} opacity={k}>
                    <Slip seed={i + 3} />
                    <circle cx={0} cy={-72} r={9} fill={C.ink} />
                  </g>
                );
              })}
          <Car uid={`${uid}c`} x={carX} y={GROUND_Y + 6} len={len} view="side" body="suv" paint="a" caliper="b" frame={f} speed={rolling} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? (one ? '*პირდაპირ*' : 'მერე *სხვასთან*')} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      {one ? <Sfx name="asmr-air-long" at={Math.max(base, hit - 6)} volume={0.26} /> : null}
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

/** stuck: close on the car, slips stuck all over its glass and doors, flapping. */
const StuckShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const len = 800;
  const cx = 540;
  // slip spots over the side of the car (relative to its ground point at cx, GROUND_Y)
  const spots = [
    [-230, -150, -8], [-60, -175, 6], [110, -160, -4], [250, -140, 9],
    [-300, -70, 5], [-140, -60, -7], [40, -75, 4], [200, -55, -9], [330, -80, 7],
  ] as const;
  const n = p.slips ?? spots.length;
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND_Y - TOP} fill={far(1)} />
          <rect x={60} y={700} width={420} height={GROUND_Y - 720} fill={rgba(C.ink, 0.07)} />
          <rect x={600} y={700} width={420} height={GROUND_Y - 720} fill={rgba(C.ink, 0.07)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Road />
          <Car uid={`${uid}c`} x={cx} y={GROUND_Y + 6} len={len} view="side" body="suv" paint="a" caliper="b" frame={f} />
          <g className={OBJ}>
            {spots.slice(0, n).map(([dx, dy, r], i) => {
              const t0 = e + 4 + i * 5;
              const k = i < 2 ? 1 : spr(f, t0, 'land');
              if (k <= 0) return null;
              const flap = osc(f, 23 + i * 3, i) * 4 * (1 - 0.5 * prog(f, hit, 10));
              return (
                <g key={i} transform={`translate(${cx + dx} ${GROUND_Y + dy * 1.6}) rotate(${(r + flap).toFixed(1)}) scale(${(0.55 * (0.5 + 0.5 * k)).toFixed(3)})`} opacity={k}>
                  <Slip seed={i} />
                </g>
              );
            })}
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'ისევ *სხვა*'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      {spots.slice(2, n).map((_, i) => (i % 2 === 0 ? <Sfx key={i} name="asmr-paper" at={Math.max(base, e + 4 + (i + 2) * 5)} volume={0.18} /> : null))}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

export const V140FourGrand: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'crawl' ? <StreetShot p={p} ctx={ctx} one={false} /> : p.shot === 'one' ? <StreetShot p={p} ctx={ctx} one /> : p.shot === 'stuck' ? <StuckShot p={p} ctx={ctx} /> : <SpikeShot p={p} ctx={ctx} />;
