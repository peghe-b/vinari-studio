// V44PaperPlane: the document photo wants to fly. It sits on a line-art phone flapping two small paper wings, folds into
// a paper plane on chunk `at`, takes off and circles under the clouds (a dotted trail behind it), and on chunk `backAt`
// turns home, glides down and unfolds back into the photo on the phone screen, a soft ring settling around it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  doc?: string; // the name on the photo's header
  at?: number | string; // chunk where it folds and takes off
  backAt?: number | string; // chunk where it turns home
  tone?: Tone;
};

// stage units: the phone's screen centre (where the photo rests) and the loop in the sky
const X0 = 540;
const Y0 = 1000;
const CX = 640;
const CY = 550;
const R = 135;
const UP = 34; // take-off frames
const BACK = 32; // way home frames
const SPIN = 88; // frames per loop
const TAU = Math.PI * 2;

const bez = (a: number, b: number, c: number, d: number, u: number) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
const theta = (fr: number, g: number) => -((fr - g - UP) / SPIN) * TAU;

// where the plane is on frame fr (take-off at g, turn home at h)
const flight = (fr: number, g: number, h: number): [number, number] => {
  if (fr <= g) return [X0, Y0];
  if (fr < g + UP) {
    const u = prog(fr, g, UP, ease.camera);
    return [bez(X0, X0, CX + R, CX + R, u), bez(Y0, 830, 720, CY, u)];
  }
  if (fr < h) {
    const th = theta(fr, g);
    return [CX + R * Math.cos(th), CY + R * Math.sin(th)];
  }
  const th = theta(h, g);
  const qx = CX + R * Math.cos(th);
  const qy = CY + R * Math.sin(th);
  const tx = Math.sin(th);
  const ty = -Math.cos(th);
  const u = prog(fr, h, BACK, ease.camera);
  return [bez(qx, qx + tx * 130, X0, X0, u), bez(qy, qy + ty * 120, 760, Y0, u)];
};

const CLOUD = 'M -62 18 A 24 24 0 0 1 -40 -16 A 32 32 0 0 1 20 -24 A 24 24 0 0 1 58 4 A 16 16 0 0 1 54 18 Z';

/** The document photo tries to fly away as a paper plane, loops, and lands back on the phone. */
export const V44PaperPlane: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const g = Math.max(base + 6, cueFrame(ctx, p.at ?? 1));
  const h = Math.max(g + UP + 24, cueFrame(ctx, p.backAt ?? 2));
  const landF = h + BACK;
  const tone = p.tone ?? 'up';

  const fold = prog(frame, g, 10, ease.camera);
  const unfold = prog(frame, landF - 4, 12, ease.camera);
  const cardOp = frame < h ? 1 - fold : unfold;
  const planeOp = frame < h ? fold : 1 - unfold;

  const [px, py] = flight(frame, g, h);
  const [nx, ny] = flight(frame + 0.6, g, h);
  const moving = Math.hypot(nx - px, ny - py) > 0.02;
  const ang = moving ? (Math.atan2(ny - py, nx - px) * 180) / Math.PI : frame < h ? -90 : 90;

  // before take-off the photo hovers and flaps; after landing it lies still
  const waiting = frame < g;
  const flap = waiting ? 0.5 + 0.5 * Math.sin(frame * 0.55) : 0;
  const bob = waiting ? -7 * Math.abs(Math.sin(frame * 0.275)) : 0;
  const wings = waiting ? 1 : 0;
  const cardScale = 1.35 * (frame < h ? 1 - 0.5 * fold : 0.6 + 0.4 * unfold);

  const ring = prog(frame, landF, 26, ease.camera);
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const drift = lerp(0, 40, prog(frame, e, ctx.dur, ease.camera));

  const label = mtav(p.doc ?? 'ტექპასპორტი');
  const size = Math.min(22, Math.floor((22 * 160) / Math.max(1, textWidth(label, `600 22px ${F.sans}`))));

  const trail: React.ReactNode[] = [];
  for (let k = 1; k <= 22; k++) {
    const fr = frame - k * 2;
    if (fr > g + 4 && fr < landF - 2) {
      const [tx, ty] = flight(fr, g, h);
      trail.push(<circle key={k} cx={tx} cy={ty} r={3} fill={C.ink2} opacity={(1 - k / 23) * 0.85} />);
    }
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '540px 830px'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the sky: two paper clouds drifting */}
          <path d={CLOUD} transform={`translate(${240 + drift} 500) scale(1.3)`} fill={C.surface} stroke={C.rule} strokeWidth={1.6} />
          <path d={CLOUD} transform={`translate(${860 - drift * 0.6} 820) scale(1.1)`} fill={C.surface} stroke={C.rule} strokeWidth={1.6} />
          {/* the phone */}
          <rect x={370} y={700} width={340} height={620} rx={54} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
          <rect x={386} y={716} width={308} height={588} rx={40} fill="none" stroke={C.rule} strokeWidth={1.2} />
          <rect x={498} y={736} width={84} height={24} rx={12} fill={C.ink} />
          {/* the ring when it is home */}
          <circle cx={X0} cy={Y0} r={110 + 130 * ring} fill="none" stroke={toneLine(tone)} strokeWidth={2.2} opacity={frame >= landF ? 0.9 * (1 - ring) : 0} />
          {trail}
          {/* the photo */}
          <g transform={`translate(${X0} ${Y0 + bob}) scale(${cardScale})`} opacity={cardOp}>
            <g opacity={wings}>
              <path d={`M -100 -8 L -146 ${-34 - 16 * flap} L -100 20 Z`} fill={C.surface} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
              <path d={`M 100 -8 L 146 ${-34 - 16 * flap} L 100 20 Z`} fill={C.surface} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
            </g>
            <rect x={-100} y={-64} width={200} height={128} rx={12} fill={C.surface} stroke={C.ink} strokeWidth={2} />
            <line x1={-84} y1={-32} x2={84} y2={-32} stroke={C.rule} strokeWidth={1.4} />
            <rect x={-84} y={-20} width={42} height={52} rx={5} fill="none" stroke={C.ink} strokeWidth={1.6} />
            <circle cx={-63} cy={-3} r={8} fill="none" stroke={C.ink} strokeWidth={1.5} />
            <path d="M -77 28 Q -63 10 -49 28" fill="none" stroke={C.ink} strokeWidth={1.5} />
            <line x1={-28} y1={-12} x2={80} y2={-12} stroke={C.ink2} strokeWidth={3} strokeLinecap="round" />
            <line x1={-28} y1={6} x2={56} y2={6} stroke={C.ink2} strokeWidth={3} strokeLinecap="round" />
            <line x1={-28} y1={24} x2={70} y2={24} stroke={C.ink2} strokeWidth={3} strokeLinecap="round" />
          </g>
          {/* the paper plane */}
          <g transform={`translate(${px} ${py}) rotate(${ang}) scale(${0.9 + 0.7 * planeOp})`} opacity={planeOp}>
            <path d="M 40 0 L -30 -24 L -14 0 L -30 22 Z" fill={C.surface} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
            <path d="M 40 0 L -14 0 L -22 10" fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinejoin="round" />
          </g>
        </svg>
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: X0 - 90,
            width: 180,
            top: Y0 + bob - 48 * cardScale - (size * cardScale) / 2.2,
            textAlign: 'center',
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: size * (cardScale / 1.1),
            lineHeight: 1,
            color: rgba(C.ink, 1),
            opacity: cardOp,
          }}
        >
          {label}
        </div>
      </div>
      <Sfx name="asmr-paper" at={g} volume={0.4} />
      <Sfx name="asmr-air-long" at={g + 6} volume={0.32} />
      <Sfx name="asmr-air" at={h} volume={0.3} />
      <Sfx name="asmr-land" at={landF} volume={0.5} />
      <Haptic kind="light" at={g} />
      <Haptic kind="light" at={landF} />
    </PictureBand>
  );
};
