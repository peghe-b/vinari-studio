// V78HalfPoint: the 1976 title as a precise balance. Two pans, two names, the same stack of discs; the beam breathes
// level, then on the key moment one more disc drops onto the rival's pan, the beam tips and settles, and the punch
// number lands on the empty side. A diagram on the clean field: thin lines, solid discs, the band's hard cut.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {capsLatin} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string; // the disc drops, the beam tips
  left?: string; // the heavier side's name (Latin)
  right?: string; // the lighter side's name (Latin)
  line?: string; // the punch on the light side, "*-1*"
  label?: string; // the HUD readout (a year)
  tone?: Tone;
};

const PX = 540; // the pivot
const PY = 600;
const REACH = 300; // half the beam
const HANG = 250; // the strings
const DISCS = 6; // the stack on each pan
const DH = 26; // a disc's height
const DW = 156;
const BASE = 1250; // the stand's foot

export const V78HalfPoint: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const tone = p.tone ?? 'down';
  const appear = spr(frame, e, 'enterXL');
  // the falling disc: from above the left pan, lands on the hit
  const fall = prog(frame, hit - 9, 9, ease.whipIn);
  // the beam: a small breath while level, then it tips (a spring that overshoots and settles)
  const tip = spr(frame, hit, 'land');
  const breath = (1 - Math.min(1, tip)) * 0.6 * Math.sin(frame / 11);
  const deg = breath + 9 * tip;
  const th = (deg * Math.PI) / 180;
  const lx = PX - REACH * Math.cos(th);
  const ly = PY + REACH * Math.sin(th);
  const rx = PX + REACH * Math.cos(th);
  const ry = PY - REACH * Math.sin(th);
  const lPan = ly + HANG;
  const rPan = ry + HANG;
  const stack = (x: number, y: number, n: number, key: string) =>
    Array.from({length: n}, (_, i) => (
      <rect
        key={`${key}${i}`}
        x={x - DW / 2}
        y={y - 8 - (i + 1) * DH}
        width={DW}
        height={DH - 4}
        rx={10}
        fill={C.surface}
        stroke={C.ink}
        strokeWidth={2}
      />
    ));
  const pan = (x: number, y: number, ex: number, ey: number) => (
    <g>
      <line x1={ex} y1={ey} x2={x - 120} y2={y} stroke={C.ink2} strokeWidth={1.5} />
      <line x1={ex} y1={ey} x2={x + 120} y2={y} stroke={C.ink2} strokeWidth={1.5} />
      <path d={`M ${x - 130} ${y} Q ${x} ${y + 46} ${x + 130} ${y} Z`} fill={rgba(C.ink, 0.06)} stroke={C.ink} strokeWidth={2.5} />
    </g>
  );
  const dropY = lPan - 8 - (DISCS + 1) * DH - (1 - fall) * 420;
  const name = (t: string | undefined, x: number, y: number) => (
    <div
      className={TXT}
      style={{position: 'absolute', left: x - 160, top: y + 50, width: 320, textAlign: 'center', font: `600 44px ${F.sans}`, letterSpacing: '0.08em', color: C.ink, opacity: appear}}
    >
      {capsLatin(t ?? '')}
    </div>
  );
  return (
    <PictureBand camera={false}>
      {/* far plane: a quiet arc of degrees behind the beam */}
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          {Array.from({length: 13}, (_, i) => {
            const a = ((-24 + 4 * i) * Math.PI) / 180;
            const r1 = 420;
            const r2 = i % 3 === 0 ? 452 : 438;
            return <line key={i} x1={PX + Math.sin(a) * r1} y1={PY - 60 + Math.cos(a) * r1} x2={PX + Math.sin(a) * r2} y2={PY - 60 + Math.cos(a) * r2} stroke={C.rule} strokeWidth={1.5} />;
          })}
        </svg>
      </CameraLayer>
      {/* the subject: the stand, the beam, the pans and their stacks */}
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <line x1={PX} y1={PY} x2={PX} y2={BASE} stroke={C.ink} strokeWidth={3} />
          <rect x={PX - 150} y={BASE} width={300} height={14} rx={7} fill={C.ink} />
          <path d={`M ${PX - 22} ${PY - 34} L ${PX} ${PY - 4} L ${PX + 22} ${PY - 34} Z`} fill={C.ink} />
          {/* the needle: shows the tip against the stand */}
          <line x1={PX} y1={PY} x2={PX + Math.sin(-th) * 120} y2={PY - Math.cos(th) * 120} stroke={toneBig(tone)} strokeWidth={2.5} opacity={0.35 + 0.65 * tip} />
          <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
          <circle cx={PX} cy={PY} r={13 + 5 * kick} fill={C.ink} />
          <circle cx={lx} cy={ly} r={7} fill={C.ink} />
          <circle cx={rx} cy={ry} r={7} fill={C.ink} />
          {pan(lx, lPan, lx, ly)}
          {pan(rx, rPan, rx, ry)}
          {stack(lx, lPan, DISCS, 'l')}
          {stack(rx, rPan, DISCS, 'r')}
          {/* the one disc */}
          <rect
            x={lx - DW / 2}
            y={dropY}
            width={DW}
            height={DH - 4}
            rx={10}
            fill={C.ink}
            opacity={frame < hit - 9 ? 0 : 1}
          />
        </svg>
        {name(p.left, lx, lPan)}
        {name(p.right, rx, rPan)}
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? '1976'} at={Math.max(base, e + 4)} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top}} />
        <div style={{position: 'absolute', left: 640, top: 380, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*-1*'} at={hit + 4} fx="slam" size={150} punchTone={tone} />
        </div>
      </Hud>
      <Sfx name="asmr-air" at={Math.max(base, hit - 9)} volume={0.3} />
      <Sfx name="asmr-knock" at={hit} volume={0.5} />
      <Land at={hit + 4} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
