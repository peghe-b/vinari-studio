// v59-one-tank: a fuel gauge whose dial is ringed by the twelve months. The needle sweeps from E to F and lights
// every month on its way, so one full tank reads as one whole year; then the year's price settles inside the dial.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  months?: string; // the mono line under the dial once the ring is full
  price?: string; // the value that settles inside the dial
  note?: string; // the small mono line under the price
  fillAt?: number | string; // chunk where the needle sweeps E -> F
  priceAt?: number | string; // chunk where the price lands
  tone?: Tone;
};

const CX = 540;
const CY = 830;
const R = 250; // the gauge arc
const RM = 330; // the month ring
const A0 = 210; // E, degrees (0 = right, counter-clockwise)
const SWEEP = 240; // E -> F over the top
const N = 12;

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const arc = (r: number, d0: number, d1: number) => {
  const [x0, y0] = pt(r, d0);
  const [x1, y1] = pt(r, d1);
  const large = Math.abs(d0 - d1) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};

/** One tank, one year: the fuel gauge's sweep lights the twelve months around it, then the year's price lands. */
export const V59OneTank: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const hot = toneBig(tone);
  const draw = prog(frame, e, 24, ease.drawOn);
  const go = Math.max(base + 10, cueFrame(ctx, p.fillAt ?? 1));
  const SW = 40;
  const t = prog(frame, go, SW, ease.camera);
  const full = go + SW;
  const fullLand = spr(frame, full, 'land');
  const pAt = Math.max(full + 8, cueFrame(ctx, p.priceAt ?? 3));
  const pLand = spr(frame, pAt, 'land');
  const needleDeg = A0 - SWEEP * t;
  // the camera: a slow push, and a small turn that settles when the tank is full
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));
  const turn = lerp(-3, 0, prog(frame, e, full - e + 10, ease.camera));
  const [nx, ny] = pt(R - 34, needleDeg);
  const [tx, ty] = pt(-34, needleDeg);
  const [ex, ey] = pt(R + 2, A0);
  const [fx, fy] = pt(R + 2, A0 - SWEEP);
  const [elx, ely] = pt(R - 62, A0 - 6);
  const [flx, fly] = pt(R - 62, A0 - SWEEP + 6);

  const months = mtav(p.months ?? '12 თვე');
  const price = p.price ?? '$49,99';
  const note = mtav(p.note ?? 'მთელი წელი');
  const priceSize = Math.min(96, Math.floor((96 * 250) / Math.max(1, textWidth(price, `600 96px ${F.sans}`))));

  const segs = [];
  const gap = 4;
  const step = SWEEP / N;
  for (let i = 0; i < N; i++) {
    const d0 = A0 - i * step - gap / 2;
    const d1 = A0 - (i + 1) * step + gap / 2;
    const lit = prog(frame, go + (SW * (i + 0.6)) / N, 6, ease.camera);
    const [mx, my] = pt(RM + 40, A0 - (i + 0.5) * step);
    segs.push(
      <g key={i} opacity={draw}>
        <path d={arc(RM, d0, d1)} fill="none" stroke={C.rule} strokeWidth={10} strokeLinecap="butt" />
        <path d={arc(RM, d0, d1)} fill="none" stroke={hot} strokeWidth={10} strokeLinecap="butt" opacity={lit} />
        <text className={TXT} x={mx} y={my + 9} textAnchor="middle" fontFamily={F.mono} fontSize={24} fill={lit > 0.5 ? C.ink : C.ink3}>
          {String(i + 1).padStart(2, '0')}
        </text>
      </g>,
    );
  }

  const ticks = [];
  for (let i = 0; i <= 8; i++) {
    const d = A0 - (SWEEP * i) / 8;
    const [ax, ay] = pt(R - 14, d);
    const [bx, by] = pt(R - (i % 4 === 0 ? 44 : 30), d);
    ticks.push(<line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={C.ink2} strokeWidth={i % 4 === 0 ? 3 : 2} opacity={draw} />);
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push}) rotate(${turn}deg)`, transformOrigin: `${CX}px ${CY}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the dial */}
          <path d={arc(R, A0, A0 - SWEEP)} fill="none" stroke={C.ink2} strokeWidth={2} strokeDasharray={1400} strokeDashoffset={1400 * (1 - draw)} />
          {/* the fuel level, filling behind the needle */}
          {t > 0.001 ? <path d={arc(R - 8, A0, needleDeg)} fill="none" stroke={rgba(hot, 0.85)} strokeWidth={14} /> : null}
          {ticks}
          {segs}
          {/* the needle */}
          <line x1={tx} y1={ty} x2={nx} y2={ny} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={draw} />
          <circle cx={CX} cy={CY} r={16} fill={C.bg} stroke={C.ink} strokeWidth={3} opacity={draw} />
          <circle cx={ex} cy={ey} r={4} fill={C.ink2} opacity={draw} />
          <circle cx={fx} cy={fy} r={4} fill={fullLand > 0.1 ? hot : C.ink2} opacity={draw} />
          {/* a small pump under the hub, gone when the price lands */}
          <g opacity={draw * (1 - pLand)} stroke={C.ink2} strokeWidth={2.2} fill="none" strokeLinejoin="round">
            <rect x={CX - 26} y={CY + 70} width={40} height={58} rx={5} />
            <line x1={CX - 18} y1={CY + 84} x2={CX + 6} y2={CY + 84} />
            <path d={`M ${CX + 14} ${CY + 80} L ${CX + 30} ${CY + 92} L ${CX + 30} ${CY + 118} L ${CX + 38} ${CY + 118}`} />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: elx - 30, top: ely - 22, width: 60, textAlign: 'center', fontFamily: F.mono, fontSize: 34, color: C.ink2, opacity: draw}}>E</div>
        <div className={TXT} style={{position: 'absolute', left: flx - 30, top: fly - 22, width: 60, textAlign: 'center', fontFamily: F.mono, fontSize: 34, color: fullLand > 0.1 ? hot : C.ink2, opacity: draw}}>F</div>
        {/* under the dial: twelve months, once the ring is full */}
        <div className={TXT} style={{position: 'absolute', left: 140, width: 800, top: CY + 300, textAlign: 'center', fontFamily: F.mono, fontSize: 40, letterSpacing: 2, color: C.ink, opacity: fullLand, transform: `translateY(${(1 - fullLand) * 16}px)`}}>
          {months}
        </div>
        {/* inside the dial: the year's price */}
        <div className={TXT} style={{position: 'absolute', left: CX - 220, width: 440, top: CY - 172, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: priceSize, color: C.ink, opacity: pLand, transform: `translateY(${(1 - pLand) * 20}px)`}}>
          {price}
        </div>
        <div className={TXT} style={{position: 'absolute', left: CX - 220, width: 440, top: CY - 168 + priceSize * 1.1, textAlign: 'center', fontFamily: F.mono, fontSize: 28, color: C.ink2, opacity: pLand}}>
          {note}
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-count-roll-long" at={go} volume={0.35} />
      <Sfx name="asmr-land" at={full} volume={0.45} />
      <Haptic kind="light" at={full} />
      <Land at={pAt} />
      <Sfx name="asmr-knock" at={pAt} volume={0.4} />
    </PictureBand>
  );
};
