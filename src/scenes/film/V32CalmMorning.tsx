// V32CalmMorning: the morning's tangled thread. A scribbled knot of worries (with three small questions around it)
// pulls tighter, then draws out into one calm horizon line; a thin sun rises over it and the questions settle on the
// line as plain words.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  words?: string[]; // three worries, each shown with a "?" in the knot, then plain on the line
  tightAt?: number | string; // chunk: the knot pulls tighter
  calmAt?: number | string; // chunk: the thread draws out into the horizon
  sunAt?: number | string; // chunk: the sun rises
};

const N = 280; // points on the thread
const X0 = 160;
const X1 = 920;
const KNOT_Y = 800;
const HORIZON = 960;
const SUN_R = 150;
const TAU = Math.PI * 2;

export const V32CalmMorning: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 32, ease.drawOn);
  const tightF = Math.max(base + 8, cueFrame(ctx, p.tightAt ?? 1));
  const calmF = Math.max(tightF + 12, cueFrame(ctx, p.calmAt ?? 2));
  const sunF = Math.max(calmF + 14, cueFrame(ctx, p.sunAt ?? 3));
  const q = spr(frame, tightF, 'land') * (1 - prog(frame, calmF, 10, ease.camera));
  const u = prog(frame, calmF, 30, ease.camera);
  const s = spr(frame, sunF, 'enterXL');
  const rays = prog(frame, sunF + 8, 24, ease.drawOn);
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const breathe = Math.sin(frame / 18) * 0.04 * (1 - u);

  // the thread: a straight line plus loops that fade to nothing at both ends
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const env = Math.pow(Math.sin(Math.PI * t), 0.8) * (1 - u);
    const squeeze = 1 - 0.3 * q;
    const bx = 540 + (X0 + (X1 - X0) * t - 540) * lerp(0.62, 1, u) * squeeze;
    const by = lerp(KNOT_Y, HORIZON, u);
    const amp = (1 + breathe) * (1 - 0.25 * q);
    const x = bx + 170 * amp * Math.sin(TAU * 5 * t + 0.3) * env + 50 * Math.cos(TAU * 11 * t) * env;
    const y = by + 180 * amp * Math.sin(TAU * 4 * t + 0.9) * env + 70 * Math.cos(TAU * 8 * t + 0.4) * env;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const d = pts.join(' ');
  const LEN = 12000;

  const sunY = lerp(HORIZON + SUN_R + 10, HORIZON - 40, s);
  const words = (p.words ?? ['ვადა', 'საბუთები', 'სად დგას']).slice(0, 3);
  const from = [
    [240, 540],
    [830, 560],
    [260, 1110],
  ];
  const to = [250, 540, 830];
  const size = 40;
  const font = `500 ${size}px ${F.sans}`;
  const settle = spr(frame, calmF + 10, 'land');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={540} cy={sunY} r={SUN_R} fill={rgba(C.ink, 0.05)} stroke={C.ink} strokeWidth={2} opacity={s > 0.001 ? 1 : 0} />
          {[-60, -30, 0, 30, 60].map((a, i) => {
            const r = (a * Math.PI) / 180;
            const r0 = SUN_R + 30;
            const r1 = r0 + 60 * rays;
            return (
              <line
                key={i}
                x1={540 + r0 * Math.sin(r)}
                y1={sunY - r0 * Math.cos(r)}
                x2={540 + r1 * Math.sin(r)}
                y2={sunY - r1 * Math.cos(r)}
                stroke={C.ink}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={rays > 0.01 ? 1 : 0}
              />
            );
          })}
          <rect x={0} y={HORIZON} width={1080} height={L.graphicsBottom - HORIZON + 60} fill={C.bg} />
          <path
            d={d}
            fill="none"
            stroke={C.ink}
            strokeWidth={lerp(2.2, 2.6, u)}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={LEN}
            strokeDashoffset={LEN * (1 - draw)}
          />
          <circle cx={540 + (X0 - 540)} cy={HORIZON} r={6} fill={C.ink} opacity={u} />
          <circle cx={540 + (X1 - 540)} cy={HORIZON} r={6} fill={C.ink} opacity={u} />
        </svg>
        {words.map((w, i) => {
          const f = from[+i];
          const txt = mtav(w);
          const wd = textWidth(txt, font);
          const cx = lerp(f[0], to[+i], settle);
          const cy = lerp(f[1], HORIZON + 70, settle);
          const wob = Math.sin(frame / 14 + i * 2) * 6 * (1 - settle);
          const qm = 1 - settle;
          return (
            <div
              key={i}
              className={TXT}
              style={{
                position: 'absolute',
                left: cx - wd / 2 - 20,
                top: cy - size / 2 + wob,
                fontFamily: F.sans,
                fontWeight: 500,
                fontSize: size,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                color: settle > 0.5 ? C.ink : C.ink2,
                opacity: draw,
                transform: `rotate(${(1 - settle) * (i === 1 ? 5 : -6)}deg)`,
              }}
            >
              {txt}
              <span style={{opacity: qm}}>?</span>
            </div>
          );
        })}
      </div>
      <Sfx name="asmr-pencil-long" at={base + 2} volume={0.3} />
      <Sfx name="asmr-paper" at={tightF} volume={0.4} />
      <Haptic kind="light" at={tightF} />
      <Sfx name="asmr-air-long" at={calmF} volume={0.35} />
      <Sfx name="asmr-knock" at={calmF + 16} volume={0.35} />
      <Sfx name="asmr-swell" at={sunF} volume={0.35} />
      <Haptic kind="success" at={sunF + 10} />
    </PictureBand>
  );
};
