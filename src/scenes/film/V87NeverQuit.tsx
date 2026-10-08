// V87NeverQuit: two factories in elevation, drawn in thin ink on the clean field. On the first chunk a bomb falls on
// the left one and its lines break apart and drop; on the key moment (hitAt) the ground under the right one starts to
// shake, a seismograph trace along the ground spikes, and the second factory sways and collapses into a pile of lines.
// The punch word slams in over both. A diagram: the band cuts it on hard lines.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'illustrated' | 'diagram';
  bombAt?: number | string; // the first factory is hit (a chunk or "1.2s")
  hitAt?: number | string; // the earthquake takes the second one
  line?: string; // the punch, "*word*"
  years?: string[]; // the two labels under the factories
  tone?: Tone;
};

const GROUND = 1060;
const W = 300;
const H = 170;
const T = 70;
const LEFT_X = 170;
const RIGHT_X = 610;

// one factory as line segments, origin at its bottom left, y up is negative
const SEGS: number[][] = [
  [0, 0, 0, -H],
  [W, 0, W, -H],
  [0, -H, 0, -H - T],
  [0, -H - T, W / 3, -H],
  [W / 3, -H, W / 3, -H - T],
  [W / 3, -H - T, (2 * W) / 3, -H],
  [(2 * W) / 3, -H, (2 * W) / 3, -H - T],
  [(2 * W) / 3, -H - T, W, -H],
  [W * 0.8, -H - 20, W * 0.8, -H - 150],
  [W * 0.9, -H - 8, W * 0.9, -H - 150],
  [W * 0.8, -H - 150, W * 0.9, -H - 150],
  [30, -72, 100, -72],
  [122, -72, 192, -72],
  [214, -72, 270, -72],
  [30, -118, 100, -118],
  [122, -118, 192, -118],
  [214, -118, 270, -118],
  [124, 0, 124, -46],
  [176, 0, 176, -46],
  [124, -46, 176, -46],
];

const Factory: React.FC<{x: number; fall: number; shake: number; hot: number; seed: string; ink: string; hit: string}> = ({x, fall, shake, hot, seed, ink, hit}) => (
  <g transform={`translate(${(x + shake).toFixed(2)} ${GROUND})`}>
    {SEGS.map((s, i) => {
      const r1 = random(`${seed}-a-${i}`);
      const r2 = random(`${seed}-b-${i}`);
      const d = Math.min(1, Math.max(0, fall * 1.35 - r1 * 0.35));
      const mx = (s[0] + s[2]) / 2;
      const my = (s[1] + s[3]) / 2;
      const drop = (-my - 6 - r2 * 10) * d;
      const slide = (r2 - 0.5) * 120 * d;
      const rot = (r1 - 0.5) * 150 * d;
      const col = d > 0.02 ? hit : ink;
      return (
        <line
          key={i}
          x1={s[0]}
          y1={s[1]}
          x2={s[2]}
          y2={s[3]}
          transform={`translate(${slide.toFixed(2)} ${drop.toFixed(2)}) rotate(${rot.toFixed(2)} ${mx} ${my})`}
          stroke={col}
          strokeWidth={i > 10 ? 1.8 : 2.4}
          strokeLinecap="round"
          opacity={1 - 0.25 * d * (1 - 0.5 * hot)}
        />
      );
    })}
  </g>
);

export const V87NeverQuit: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  // the first scene is composed at frame 0 with the bomb already falling: it lands by 0.5 s
  const bomb = Math.max(14, base + 14, cueFrame(ctx, p.bombAt ?? 0) + 14);
  const hit = Math.max(bomb + 24, cueFrame(ctx, p.hitAt ?? 1) + 10);
  const kick = useKick();
  const tone = p.tone ?? 'down';
  const red = toneLine(tone);
  const appear = spr(frame, e, 'enterXL');
  const years = p.years ?? ['1944', '1945'];

  // the bomb: a small dark drop falling onto the left roof
  const fallT = prog(frame, bomb - 16, 16, ease.whipIn);
  const bombY = 420 + (GROUND - H - T - 420) * fallT;
  const leftFall = prog(frame, bomb, 22, ease.whipOut);
  const burst = prog(frame, bomb, 14, ease.whipOut);

  // the quake: the right factory sways, then falls on the hit
  const qStart = hit - 18;
  const q = frame >= qStart ? Math.exp(-Math.max(0, frame - hit) / 22) * Math.min(1, (frame - qStart) / 10) : 0;
  const shake = q * 14 * Math.sin(frame * 1.7);
  const rightFall = prog(frame, hit, 26, ease.whipOut);

  // the seismograph trace along the ground: calm, then spiking under the right factory
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const xx = 150 + (780 * i) / 120;
    const near = Math.exp(-Math.pow((xx - (RIGHT_X + W / 2)) / 170, 2));
    const amp = 2 + 46 * q * (0.35 + near) * Math.abs(Math.sin(i * 1.3 + frame * 0.9));
    const yy = GROUND + 58 + (i % 2 === 0 ? -amp : amp) * 0.5;
    pts.push(`${xx.toFixed(1)},${yy.toFixed(1)}`);
  }

  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <line x1={120} y1={GROUND} x2={960} y2={GROUND} stroke={C.rule} strokeWidth={1.5} />
          <polyline points={pts.join(' ')} fill="none" stroke={q > 0.05 ? red : C.rule} strokeWidth={1.6} strokeLinejoin="round" opacity={0.9} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.95 + 0.05 * appear).toFixed(4)})`, transformOrigin: `540px ${GROUND}px`}}>
          <Factory x={LEFT_X} fall={leftFall} shake={0} hot={burst} seed="l" ink={C.ink} hit={red} />
          <Factory x={RIGHT_X} fall={rightFall} shake={shake} hot={0} seed="r" ink={C.ink} hit={red} />
          {frame < bomb ? <ellipse cx={LEFT_X + W / 2} cy={bombY} rx={9} ry={20} fill={C.ink} opacity={fallT > 0 ? 1 : 0} /> : null}
          {burst > 0 && burst < 1
            ? Array.from({length: 12}, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                const r0 = 20 + 90 * burst;
                const r1 = r0 + 40 * (1 - burst);
                const cx = LEFT_X + W / 2;
                const cy = GROUND - H - 20;
                return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={red} strokeWidth={2.2} strokeLinecap="round" opacity={1 - burst} />;
              })
            : null}
        </svg>
      </CameraLayer>
      <Hud>
        {years.map((y, i) => (
          <div
            key={i}
            className={TXT}
            style={{position: 'absolute', left: (i === 0 ? LEFT_X : RIGHT_X) + W / 2 - 100, width: 200, top: GROUND + 96, textAlign: 'center', font: `500 34px ${F.mono}`, letterSpacing: 2, color: (i === 0 ? leftFall : rightFall) > 0.1 ? red : C.ink2, opacity: appear}}
          >
            {y}
          </div>
        ))}
        <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ორივე*'} at={hit + 8} fx="slam" size={112} punchTone={tone} />
        </div>
        <div style={{position: 'absolute', inset: 0, backgroundColor: rgba(C.ink, 0.04 * kick)}} />
      </Hud>
      <Sfx name="asmr-air" at={Math.max(base, bomb - 14)} volume={0.2} />
      <Sfx name="asmr-land" at={bomb} volume={0.5} />
      <Haptic kind="rigid" at={bomb + 1} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, qStart)} volume={0.26} />
      <Land at={hit + 8} />
      <Haptic kind="rigid" at={hit + 10} volume={0.3} />
    </PictureBand>
  );
};
