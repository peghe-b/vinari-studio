// V57ThreeClicks: a combination padlock with three drums, one per question. While you stammer the drums only
// shiver on their question marks; each answer rolls one drum onto a check, and the third one springs the shackle.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  jitterAt?: number | string; // chunk where the drums shiver (the stammer)
  dials?: (number | string)[]; // three chunks: each one lands a drum on its check
  labels?: string[]; // the three questions under the drums
  pushAt?: number | string; // chunk of the camera's step in
  askAt?: number | string; // chunk where the questions appear under the drums
  tone?: Tone;
};

const CX = 540;
const BODY_T = 740;
const BODY_B = 1090;
const WIN_T = 830;
const WIN_H = 140;
const WIN_W = 100;
const DRUMS = [420, 540, 660];
const ITEMS = 7; // six question marks, then the check
const QMARK = 'M -15 -26 C -15 -46 15 -46 15 -26 C 15 -12 0 -10 0 6';
const CHECK = 'M -22 0 L -7 16 L 23 -20';

export const V57ThreeClicks: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = Math.max(0, lead(ctx));
  const tone = p.tone ?? 'up';
  const green = toneBig(tone);
  const show = prog(frame, e, 16);
  const jit = Math.max(base + 2, cueFrame(ctx, p.jitterAt ?? 1));
  const dialAt = [0, 1, 2].map((k) => Math.max(base + 6 + k * 8, cueFrame(ctx, (p.dials ?? [3, 4, 5])[+k] ?? 3 + k)));
  const lands = dialAt.map((f) => f + 14);
  const openAt = lands[2] + 10;
  const lift = spr(frame, openAt, 'land');
  const ring = prog(frame, openAt, 30, ease.exit);
  // the camera: a slow drift, and one step in when Vinari is named (chunk pushAt)
  const pushF = Math.max(base + 4, cueFrame(ctx, p.pushAt ?? 2));
  const push = lerp(1, 1.02, prog(frame, e, ctx.dur, ease.camera)) + 0.03 * prog(frame, pushF, 24, ease.camera);
  // the three questions rise under the drums on chunk askAt
  const askF = Math.max(base + 6, cueFrame(ctx, p.askAt ?? 3));
  const labels = p.labels ?? ['როდის?', 'რა ხმა?', 'საიდან?'];

  // the stammer: a shiver that dies out over 26 frames
  const shiver = (k: number) => {
    const t = frame - jit;
    if (t < 0 || t > 26) return 0;
    return Math.sin(t * 1.9 + k * 2.1) * 14 * (1 - t / 26);
  };
  const drumPos = (k: number) => {
    const roll = prog(frame, dialAt[+k], 14, ease.enter);
    const settle = spr(frame, lands[+k], 'land');
    return lerp(0, ITEMS - 1, roll) * WIN_H + (frame >= lands[+k] ? (1 - settle) * 10 : 0) - shiver(k);
  };

  const legsY = BODY_T + 20;
  const shY = -45 * lift;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, opacity: show, transform: `scale(${push})`, transformOrigin: `${CX}px ${L.contentMid}px`}}>
       <div style={{position: 'absolute', inset: 0, transform: `translateY(50px) scale(1.18)`, transformOrigin: `${CX}px 780px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            {DRUMS.map((x, k) => (
              <clipPath key={k} id={`v57-win-${k}`}>
                <rect x={x - WIN_W / 2} y={WIN_T} width={WIN_W} height={WIN_H} rx={14} />
              </clipPath>
            ))}
          </defs>
          {/* the opening ring, behind everything */}
          <circle cx={CX} cy={900} r={250 + 120 * ring} fill="none" stroke={green} strokeWidth={2} opacity={frame >= openAt ? (1 - ring) * 0.8 : 0} />
          {/* the shackle: two concentric U lines, lifted on the third check */}
          <g transform={`translate(0 ${shY})`}>
            <path d={`M 410 ${legsY} L 410 600 A 130 130 0 0 1 670 600 L 670 ${legsY}`} fill="none" stroke={C.ink} strokeWidth={2.5} />
            <path d={`M 450 ${legsY} L 450 600 A 90 90 0 0 1 630 600 L 630 ${legsY}`} fill="none" stroke={C.ink} strokeWidth={2} />
            <path d={`M 410 ${legsY} L 450 ${legsY}`} stroke={C.ink} strokeWidth={2} opacity={lift > 0.05 ? 1 : 0} />
          </g>
          {/* the body */}
          <rect x={320} y={BODY_T} width={440} height={BODY_B - BODY_T} rx={36} fill={C.surface} stroke={frame >= openAt ? green : C.ink} strokeWidth={2.5} />
          <rect x={340} y={BODY_T + 20} width={400} height={BODY_B - BODY_T - 40} rx={24} fill="none" stroke={C.rule} strokeWidth={1.2} />
          {/* the drums */}
          {DRUMS.map((x, k) => {
            const pos = drumPos(k);
            const done = frame >= lands[+k];
            const items = [];
            for (let i = 0; i < ITEMS; i++) {
              const y = WIN_T + WIN_H / 2 + i * WIN_H - pos;
              if (y < WIN_T - WIN_H || y > WIN_T + 2 * WIN_H) continue;
              items.push(
                i === ITEMS - 1 ? (
                  <path key={i} d={CHECK} transform={`translate(${x} ${y})`} fill="none" stroke={green} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <g key={i} transform={`translate(${x} ${y})`}>
                    <path d={QMARK} fill="none" stroke={C.ink2} strokeWidth={4} strokeLinecap="round" />
                    <circle cx={0} cy={26} r={4} fill={C.ink2} />
                  </g>
                ),
              );
            }
            return (
              <g key={k}>
                <rect x={x - WIN_W / 2} y={WIN_T} width={WIN_W} height={WIN_H} rx={14} fill={C.screen} stroke={done ? green : C.rule} strokeWidth={done ? 2.2 : 1.5} />
                <g clipPath={`url(#v57-win-${k})`}>{items}</g>
                <line x1={x - WIN_W / 2 + 10} x2={x - WIN_W / 2 + 22} y1={WIN_T + WIN_H / 2} y2={WIN_T + WIN_H / 2} stroke={C.rule} strokeWidth={1.5} />
                <line x1={x + WIN_W / 2 - 22} x2={x + WIN_W / 2 - 10} y1={WIN_T + WIN_H / 2} y2={WIN_T + WIN_H / 2} stroke={C.rule} strokeWidth={1.5} />
              </g>
            );
          })}
          {/* the keyhole */}
          <circle cx={CX} cy={1040} r={9} fill="none" stroke={C.ink2} strokeWidth={1.8} />
          <path d={`M ${CX} 1049 L ${CX} 1064`} stroke={C.ink2} strokeWidth={1.8} strokeLinecap="round" />
        </svg>
        {DRUMS.map((x, k) => {
          const s = mtav(labels[+k] ?? '');
          const size = Math.min(28, Math.floor((28 * 116) / Math.max(1, textWidth(s, `600 28px ${F.sans}`))));
          const done = frame >= lands[+k];
          const rise = spr(frame, askF + k * 5, 'enter');
          return (
            <div key={k} className={TXT} style={{position: 'absolute', left: x - 64, width: 128, top: WIN_T + WIN_H + 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: done ? C.ink : rgba(C.ink, 0.62), opacity: rise, transform: `translateY(${(1 - rise) * 14}px)`}}>
              {s}
            </div>
          );
        })}
       </div>
      </div>
      {[0, 1, 2].map((k) => (
        <Sfx key={`a${k}`} name="asmr-knock" at={askF + k * 5} volume={0.3} />
      ))}
      {[0, 6, 12, 18].map((d) => (
        <Sfx key={d} name="asmr-tick-fine" at={jit + d} volume={0.35 - d * 0.01} />
      ))}
      {dialAt.map((f, k) => (
        <Sfx key={`r${k}`} name="asmr-flap-roll" at={f} volume={0.28} />
      ))}
      {lands.map((f, k) => (
        <Sfx key={`c${k}`} name="asmr-check" at={f} volume={0.45} />
      ))}
      {lands.map((f, k) => (
        <Haptic key={`h${k}`} kind="success" at={f} />
      ))}
      <Sfx name="asmr-knock" at={openAt} volume={0.5} />
      <Sfx name="asmr-swell" at={openAt + 2} volume={0.28} />
      <Haptic kind="medium" at={openAt} />
    </PictureBand>
  );
};
