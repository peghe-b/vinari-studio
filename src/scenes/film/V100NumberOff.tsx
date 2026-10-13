// v100-number-off: the neighbour's view. Night, my electric crossover parked head-on, a small white card glowing low on
// its windshield; in the foreground the neighbour's hand raises a phone, its viewfinder already magnifying the card. The
// brackets close on the code, lock in the accent on the key moment (the camera kicks), and the screen turns into the
// page of three plain rows, the first one tapped. No number anywhere: the card carries only the code.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, L, rgba, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Handset, HandGrip} from '../illo/handset';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';
import {MODULES, QN} from '../staging/qrParts';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1240;
const CAR_X = 420;
const CAR_LEN = 1350;
// the card on the glass, in the car's own units (front view, ev): low on the windshield, left of centre
const CARD = {x0: -118, x1: -52, y0: -296, y1: -268};
// the neighbour's phone, foreground
const PH = {x: 735, y: 900, w: 250, tilt: -6};

/** The tiny code on a card: a QN x QN module grid scaled into a square. */
const Code: React.FC<{x: number; y: number; s: number; fill: string}> = ({x, y, s, fill}) => {
  const m = s / QN;
  let d = '';
  for (const [r, c] of MODULES) {
    d +=`M${(x + c * m).toFixed(2)} ${(y + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h${(-m).toFixed(2)}Z`;
  }
  return <path d={d} fill={fill} />;
};

export const V100NumberOff: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const time = timeOf(p);
  const tone = p.tone ?? 'a';
  const accent = toneLine(tone);
  const s = CAR_LEN / 1000;
  const cx0 = CAR_X + CARD.x0 * s;
  const cx1 = CAR_X + CARD.x1 * s;
  const cy0 = GROUND + CARD.y0 * s;
  const cy1 = GROUND + CARD.y1 * s;
  // the phone rises a little into place, then holds steady
  const rise = spr(frame, e, 'enter');
  const phY = PH.y + 70 * (1 - rise);
  // the brackets close on the code up to the hit, then lock
  const close = prog(frame, e, Math.max(8, hit - e), ease.inOut);
  const locked = frame >= hit ? 1 : 0;
  const page = prog(frame, hit + 10, 8, ease.enter);
  const tap = prog(frame, hit + 24, 6, ease.enter);
  const glow = 0.35 + 0.25 * Math.sin(frame / 7) + 0.6 * kick;
  const screen = (sw: number, sh: number) => {
    // the viewfinder: the card magnified, the brackets closing, a soft scan line
    const cw = sw * 0.78;
    const ch = cw * 0.45;
    const x0 = (sw - cw) / 2;
    const y0 = sh * 0.42 - ch / 2;
    const pad = 4 + 70 * (1 - close);
    const bl = 26;
    const bx0 = x0 - pad;
    const by0 = y0 - pad;
    const bx1 = x0 + cw + pad;
    const by1 = y0 + ch + pad;
    const bc = locked ? accent : C.il0;
    const scanY = y0 + ch * (0.5 + 0.5 * Math.sin(frame / 6));
    const rows = [0, 1, 2];
    return (
      <g>
        <rect x={0} y={0} width={sw} height={sh} fill={C.ilFeature} />
        <rect x={x0 - 30} y={y0 - 40} width={cw + 60} height={ch + 80} fill={rgba(C.il0, 0.06)} />
        <rect x={x0} y={y0} width={cw} height={ch} rx={6} fill={C.il0} />
        <Code x={x0 + ch * 0.12} y={y0 + ch * 0.12} s={ch * 0.76} fill={C.ilFeature} />
        <rect x={x0 + ch + 10} y={y0 + ch * 0.22} width={cw - ch - 30} height={7} rx={3} fill={rgba(C.ilFeature, 0.5)} />
        <rect x={x0 + ch + 10} y={y0 + ch * 0.42} width={(cw - ch - 30) * 0.7} height={6} rx={3} fill={rgba(C.ilFeature, 0.3)} />
        {!locked ? <line x1={x0} x2={x0 + cw} y1={scanY} y2={scanY} stroke={rgba(C.il0, 0.55)} strokeWidth={2} /> : null}
        <path
          d={`M${bx0} ${by0 + bl}V${by0}H${bx0 + bl}M${bx1 - bl} ${by0}H${bx1}V${by0 + bl}M${bx1} ${by1 - bl}V${by1}H${bx1 - bl}M${bx0 + bl} ${by1}H${bx0}V${by1 - bl}`}
          fill="none"
          stroke={bc}
          strokeWidth={locked ? 5 : 3}
          strokeLinecap="round"
        />
        {/* the page: three plain rows, the first one tapped */}
        <g opacity={page}>
          <rect x={0} y={0} width={sw} height={sh} fill={C.il0} />
          <rect x={sw * 0.1} y={sh * 0.16} width={sw * 0.5} height={14} rx={7} fill={rgba(C.ilFeature, 0.85)} />
          <rect x={sw * 0.1} y={sh * 0.22} width={sw * 0.7} height={8} rx={4} fill={rgba(C.ilFeature, 0.25)} />
          {rows.map((i) => {
            const ry = sh * 0.32 + i * sh * 0.15;
            const on = i === 0 ? tap : 0;
            return (
              <g key={i} transform={`translate(0 ${(8 * (1 - page) * (i + 1)).toFixed(1)})`}>
                <rect x={sw * 0.08} y={ry} width={sw * 0.84} height={sh * 0.12} rx={14} fill={rgba(C.ilFeature, 0.05)} stroke={on > 0 ? accent : rgba(C.ilFeature, 0.35)} strokeWidth={on > 0 ? 4 : 2} strokeDasharray={on > 0 ? undefined : '7 6'} />
                {on > 0 ? <rect x={sw * 0.08} y={ry} width={sw * 0.84} height={sh * 0.12} rx={14} fill={accent} opacity={0.22 * on} /> : null}
                <circle cx={sw * 0.2} cy={ry + sh * 0.06} r={9} fill={rgba(C.ilFeature, 0.55)} />
                <rect x={sw * 0.3} y={ry + sh * 0.045} width={sw * (0.5 - 0.08 * i)} height={10} rx={5} fill={rgba(C.ilFeature, 0.7)} />
              </g>
            );
          })}
        </g>
      </g>
    );
  };
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={GROUND} width={1320} height={FOOT - GROUND} fill={time === 'day' ? C.il2 : C.il7} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 4} rx={380} ry={26} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={CAR_LEN} view="front" body="ev" paint="a" frame={frame} time={time} />
          {/* the card on the glass: a soft glow, the paper, the code */}
          <ellipse cx={(cx0 + cx1) / 2} cy={(cy0 + cy1) / 2} rx={90} ry={50} fill={rgba(C.il0, 0.12 * glow)} />
          <rect x={cx0} y={cy0} width={cx1 - cx0} height={cy1 - cy0} rx={3} fill={C.il0} opacity={0.94} />
          <Code x={cx0 + 4} y={cy0 + 4} s={cy1 - cy0 - 8} fill={C.ilFeature} />
          <rect x={cx0 - 3} y={cy0 - 3} width={cx1 - cx0 + 6} height={cy1 - cy0 + 6} rx={5} fill="none" stroke={accent} strokeWidth={3} opacity={locked * (1 - prog(frame, hit + 4, 18, ease.enter)) + 0.0} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <HandGrip uid={uid} part="back" x={PH.x} y={phY} w={PH.w} tilt={PH.tilt} frame={frame} time={time} />
          <Handset uid={uid} x={PH.x} y={phY} w={PH.w} tilt={PH.tilt} frame={frame} time={time} lit={prog(frame, e, 6, ease.enter)} screen={screen} />
          <HandGrip uid={uid} part="front" x={PH.x} y={phY} w={PH.w} tilt={PH.tilt} frame={frame} time={time} thumb={tap} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ბიპ*'} at={hit} fx="slam" size={110} punchTone={tone} />
        </div>
      </Hud>
      <Sfx name="asmr-camera" at={Math.max(base, hit)} volume={0.45} />
      <Sfx name="asmr-tap" at={Math.max(base, hit + 24)} volume={0.4} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
