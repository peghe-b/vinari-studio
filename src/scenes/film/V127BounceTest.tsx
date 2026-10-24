// V127BounceTest: one suspension corner in section (the shell above, the coil spring round the damper, the tyre on the
// road) that moves on step by step: a bump lifts the tyre and squeezes the spring, the bare spring swings on and on, the
// damper takes the swing and warms, a press on the corner lets go, and a height trace beside it counts the rebounds (one and
// still against three, six). Then the damper's skin: a thin wet film (fine) or a heavy drip onto the road.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, SourceLine, Sfx} from '../common';
import {C, F, L, accentsOn, halo, rgba, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'diagram';
  shot?: string; // the shot's name; 'compare' draws the two traces alone
  close?: 'spring' | 'damper'; // push in on one part
  labels?: string[]; // shell, spring, damper, tyre
  labelsAt?: number | string;
  bumpAt?: number | string; // a bump passes under the tyre
  pressAt?: number | string; // a push presses the corner down, then lets go
  bounces?: number; // how many rebounds before it is still (1 = a healthy damper)
  damper?: boolean; // false: the bare spring, the damper ghosted
  heatAt?: number | string; // the damper warms
  trace?: boolean; // the height trace beside the corner
  count?: boolean; // number the rebounds on the trace
  tone?: Tone;
  leak?: 'thin' | 'heavy';
  leakAt?: number | string;
  verdict?: 'up' | 'down';
  verdictAt?: number | string;
  tag?: string;
  word?: string;
  hitAt?: number | string;
  source?: string;
};

const PERIOD = 20; // frames of one rebound
const CX = 540;
const SHELL_Y = 470; // the shell panel's foot (at rest)
const HUB_Y = 900; // the hub's centre (at rest)
const R = 150; // the tyre
const ROAD_Y = HUB_Y + R;

// the corner's height after a jolt at f0 of size a: a damped swing that dies within `n` rebounds
const swing = (f: number, f0: number, a: number, n: number) => {
  if (f < f0) return 0;
  const t = f - f0;
  const decay = Math.pow(0.04, 1 / Math.max(0.6, n));
  const amp = a * Math.pow(decay, t / PERIOD);
  return amp * Math.cos((t / PERIOD) * Math.PI * 2);
};

// a bump's height under the tyre: a smooth hump that rolls through in `len` frames
const hump = (f: number, f0: number, len: number) => {
  if (f < f0 || f > f0 + len) return 0;
  return Math.sin(((f - f0) / len) * Math.PI);
};

const coil = (topY: number, botY: number, w: number, turns: number) => {
  const pts: string[] = [];
  const steps = turns * 2;
  for (let i = 0; i <= steps; i++) {
    const y = topY + ((botY - topY) * i) / steps;
    const x = CX + (i % 2 === 0 ? -w / 2 : w / 2);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

export const V127BounceTest: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const at = (v: unknown, fb: number) => (v === undefined || v === null ? fb : Math.max(base, cueFrame(ctx, v, fb)));
  const n = p.bounces ?? 1;
  const damperOn = p.damper !== false;
  const compare = p.shot === 'compare';
  const showTrace = !!p.trace || compare;

  // the motion of the corner
  const bumpF = p.bumpAt !== undefined ? at(p.bumpAt, 6) : -1;
  const pressF = p.pressAt !== undefined ? at(p.pressAt, 6) : -1;
  const PRESS = 14; // frames the push lasts
  const BUMP = 16;
  const shellAt = (f: number) => {
    let b = 0;
    if (bumpF >= 0) b += 70 * 0.45 * hump(f, bumpF, BUMP) + swing(f, bumpF + BUMP, 46, n);
    if (pressF >= 0) {
      const down = f < pressF ? 0 : f < pressF + PRESS ? ease.enter((f - pressF) / PRESS) : 1;
      b += f < pressF + PRESS ? -60 * down : swing(f, pressF + PRESS, -60, n);
    }
    return b; // up positive
  };
  const tyreAt = (f: number) => (bumpF >= 0 ? 70 * hump(f, bumpF, BUMP) : 0);
  const b = shellAt(frame);
  const w = tyreAt(frame);
  const shellY = SHELL_Y - b;
  const hubY = HUB_Y - w;

  const heat = p.heatAt !== undefined ? prog(frame, at(p.heatAt, 20), 26, ease.enter) : 0;
  const accent = accentsOn() ? C.accA : toneLine('down');
  const hot = halo(accent, 0.55 * heat);
  const leakK = p.leak ? prog(frame, at(p.leakAt, 8), 20, ease.enter) : 0;
  const verdictF = p.verdict ? at(p.verdictAt, 20) : -1;
  const verdictK = verdictF >= 0 ? spr(frame, verdictF, 'land') : 0;
  const hit = p.hitAt !== undefined ? at(p.hitAt, 12) : pressF >= 0 ? pressF + PRESS : bumpF >= 0 ? bumpF : -1;

  // damper geometry: the cylinder sits on the hub, the rod hangs from the shell
  const cylTop = HUB_Y - 250 - w;
  const cylBot = hubY - 40;
  const rodTop = shellY + 30;
  const pistonY = Math.min(cylBot - 20, Math.max(cylTop + 20, rodTop + 230));
  const springTop = shellY + 40;
  const springBot = cylTop + 70;

  // the trace: the corner's height over time
  const traceStart = pressF >= 0 ? pressF : bumpF >= 0 ? bumpF : e;
  const TW = 760;
  const TX = CX - TW / 2;
  const TY = compare ? 760 : 1150; // its zero line
  const TH = compare ? 150 : 90;
  const span = 6 * PERIOD + PRESS;
  const tracePath = (f: number, nn: number, y0: number) => {
    const pts: string[] = [];
    const end = Math.min(f, traceStart + span);
    for (let t = traceStart; t <= end; t += 1) {
      let v: number;
      if (pressF >= 0 || compare) {
        const pf = traceStart;
        v = t < pf + PRESS ? -60 * ease.enter((t - pf) / PRESS) : swing(t, pf + PRESS, -60, nn);
      } else v = shellAt(t);
      const x = TX + ((t - traceStart) / span) * TW;
      pts.push(`${pts.length ? 'L' : 'M'}${x.toFixed(1)} ${(y0 - (v / 60) * TH).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const peaks = (nn: number) => {
    const out: {x: number; f: number; i: number}[] = [];
    for (let i = 0; i < Math.min(6, Math.ceil(nn)); i++) {
      const f = traceStart + PRESS + PERIOD * (i + 0.5);
      out.push({x: TX + ((f - traceStart) / span) * TW, f, i});
    }
    return out;
  };
  const tone: Tone = p.tone ?? (n <= 1 ? 'up' : 'down');

  // the corner scales up into the band when there is no trace, and steps up when the trace needs the room
  // a close shot ("close": the spring or the damper) pushes in on that part, still whole inside the band
  const close = p.close === 'spring' || p.close === 'damper';
  const s = showTrace ? 0.72 : close ? 1.2 : 1;
  const fy = close ? (p.close === 'spring' ? 690 : 780) : SHELL_Y - 30;
  const oy = showTrace ? 400 : close ? 860 : 440;
  const corner = `translate(${CX}px, ${oy}px) scale(${s}) translate(${-CX}px, ${-fy}px)`;
  const labels = p.labels ?? [];
  const labelsF = at(p.labelsAt, 4);
  const lab = (i: number, x: number, y: number, tx: number, ty: number) => {
    if (!labels[+i]) return null;
    const k = prog(frame, labelsF + i * 8, 12, ease.enter);
    return (
      <g key={i} opacity={k}>
        <line x1={x} y1={y} x2={tx} y2={ty} stroke={C.ink2} strokeWidth={3} />
        <circle cx={x} cy={y} r={7} fill={C.ink} />
      </g>
    );
  };
  const labText = (i: number, tx: number, ty: number, right: boolean) => {
    if (!labels[+i]) return null;
    const k = prog(frame, labelsF + i * 8, 12, ease.enter);
    return (
      <div key={i} className={TXT} style={{position: 'absolute', left: right ? tx + 14 : undefined, right: right ? undefined : 1080 - tx + 14, top: ty - 24, opacity: k, font: `600 40px ${F.sans}`, color: C.ink, whiteSpace: 'nowrap'}}>
        {mtav(labels[+i])}
      </div>
    );
  };
  // label anchors (in corner units, mapped to the stage for the text)
  const map = (x: number, y: number) => ({x: CX + (x - CX) * s, y: oy + (y - fy) * s});
  const L0 = map(780, shellY - 30);
  const L1 = map(CX + 75, (springTop + springBot) / 2);
  const L2 = map(CX - 32, (cylTop + cylBot) / 2);
  const L3 = map(CX + R * 0.9, hubY + R * 0.4);

  const drops = p.leak === 'heavy' ? [0, 1, 2, 3] : [];

  if (compare) {
    const k = prog(frame, e, 12, ease.enter);
    return (
      <PictureBand camera={false}>
        <CameraLayer depth={1}>
          <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
            {[0, 1].map((r) => {
              const y0 = r === 0 ? 640 : 1040;
              const nn = r === 0 ? 1 : 6;
              return (
                <g key={r}>
                  <line x1={TX} y1={y0} x2={TX + TW} y2={y0} stroke={C.rule} strokeWidth={4} strokeDasharray="10 12" />
                  <path d={tracePath(frame, nn, y0)} fill="none" stroke={toneLine(r === 0 ? 'up' : 'down')} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={k} />
                </g>
              );
            })}
          </svg>
        </CameraLayer>
        <Hud>
          <div className={TXT} style={{position: 'absolute', left: TX, top: 470, font: `700 64px ${F.sans}`, color: C.ink, opacity: k}}>1</div>
          <div className={TXT} style={{position: 'absolute', left: TX, top: 870, font: `700 64px ${F.sans}`, color: C.ink, opacity: k}}>6</div>
          {p.word ? (
            <div style={{position: 'absolute', left: L.camSafe.left, top: 1220, whiteSpace: 'nowrap'}}>
              <Words text={p.word} at={Math.max(base, hit)} fx="slam" size={72} />
            </div>
          ) : null}
        </Hud>
        <Sfx name="asmr-swell" at={Math.max(base, e + 4)} volume={0.22} />
      </PictureBand>
    );
  }

  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <g style={{transform: corner}}>
            {/* the road, and the bump rolling through */}
            <path
              d={`M120 ${ROAD_Y} L${CX - 160} ${ROAD_Y} Q${CX} ${ROAD_Y - 2 * (w > 0 ? w : 0)} ${CX + 160} ${ROAD_Y} L960 ${ROAD_Y}`}
              fill="none"
              stroke={C.rule}
              strokeWidth={6}
              strokeLinecap="round"
            />
          </g>
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g style={{transform: corner}}>
            {/* the tyre and rim */}
            <circle cx={CX} cy={hubY} r={R} fill={C.surface} stroke={C.ink} strokeWidth={34} />
            <circle cx={CX} cy={hubY} r={R - 52} fill="none" stroke={C.ink2} strokeWidth={6} />
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2 + frame / 18;
              return <line key={i} x1={CX + Math.cos(a) * 30} y1={hubY + Math.sin(a) * 30} x2={CX + Math.cos(a) * (R - 56)} y2={hubY + Math.sin(a) * (R - 56)} stroke={C.ink2} strokeWidth={8} strokeLinecap="round" />;
            })}
            <circle cx={CX} cy={hubY} r={26} fill={C.ink} />
            {/* the damper: the cylinder on the hub, the rod from the shell, the piston inside */}
            <g opacity={damperOn ? 1 : 0.22}>
              {heat > 0 ? <rect x={CX - 60} y={cylTop - 20} width={120} height={cylBot - cylTop + 40} rx={40} fill={hot} /> : null}
              <rect x={CX - 9} y={rodTop} width={18} height={Math.max(0, pistonY - rodTop)} fill={C.ink} />
              <rect x={CX - 34} y={cylTop} width={68} height={cylBot - cylTop} rx={14} fill={heat > 0 ? rgba(accent, 0.25 + 0.5 * heat) : C.surface} stroke={C.ink} strokeWidth={6} />
              <rect x={CX - 26} y={pistonY - 6} width={52} height={12} rx={4} fill={C.ink} />
              {p.leak ? (
                <rect x={CX + 18} y={cylTop + 30} width={p.leak === 'heavy' ? 16 : 8} height={(cylBot - cylTop - 40) * leakK} rx={4} fill={rgba(C.ink2, p.leak === 'heavy' ? 0.9 : 0.45)} />
              ) : null}
            </g>
            <line x1={CX} y1={hubY} x2={CX} y2={cylBot} stroke={C.ink} strokeWidth={14} />
            {/* the spring round it */}
            <path d={coil(springTop, springBot, 150, 6)} fill="none" stroke={C.ink} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
            <rect x={CX - 95} y={springTop - 10} width={190} height={12} rx={6} fill={C.ink} />
            <rect x={CX - 95} y={springBot} width={190} height={12} rx={6} fill={C.ink} />
            {/* the shell's corner, a wing over the arch */}
            <path
              d={`M250 ${shellY - 60} L830 ${shellY - 60} Q860 ${shellY - 60} 860 ${shellY - 30} L860 ${shellY + 80} L${CX + R + 50} ${shellY + 80} Q${CX + R + 40} ${shellY + 10} ${CX} ${shellY + 10} Q${CX - R - 40} ${shellY + 10} ${CX - R - 50} ${shellY + 80} L220 ${shellY + 80} L220 ${shellY - 30} Q220 ${shellY - 60} 250 ${shellY - 60} Z`}
              fill={C.ink}
            />
            {/* a press on the corner: a bold arrow down */}
            {pressF >= 0 ? (
              <g opacity={prog(frame, pressF - 8, 8) * (1 - prog(frame, pressF + PRESS + 4, 8))}>
                <path d={`M720 ${shellY - 230} L720 ${shellY - 110}`} stroke={accent} strokeWidth={16} strokeLinecap="round" />
                <path d={`M680 ${shellY - 140} L720 ${shellY - 90} L760 ${shellY - 140}`} fill="none" stroke={accent} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : null}
            {/* heavy drops falling to a puddle */}
            {drops.map((i) => {
              const f = (frame - at(p.leakAt, 8) - i * 9) % 36;
              if (f < 0 || leakK < 0.6) return null;
              const y = cylBot - 10 + (ROAD_Y - cylBot) * Math.min(1, f / 24);
              return <ellipse key={i} cx={CX + 26} cy={y} rx={9} ry={13} fill={C.ink2} opacity={f > 26 ? 0 : 1} />;
            })}
            {p.leak === 'heavy' ? <ellipse cx={CX + 40} cy={ROAD_Y + 4} rx={30 + 90 * leakK} ry={10 + 6 * leakK} fill={rgba(C.ink2, 0.6)} /> : null}
          </g>
          {/* label leaders */}
          {lab(0, L0.x, L0.y, L0.x + 30, L0.y - 60)}
          {lab(1, L1.x, L1.y, L1.x + 110, L1.y)}
          {lab(2, L2.x, L2.y, L2.x - 110, L2.y)}
          {lab(3, L3.x, L3.y, L3.x + 90, L3.y + 40)}
          {/* the trace */}
          {showTrace ? (
            <g>
              <line x1={TX} y1={TY} x2={TX + TW} y2={TY} stroke={C.rule} strokeWidth={4} strokeDasharray="10 12" />
              <path d={tracePath(frame, n, TY)} fill="none" stroke={toneLine(tone)} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
              {p.count
                ? peaks(n).map((q) => (frame >= q.f ? <circle key={q.i} cx={q.x} cy={TY - (q.i % 2 === 0 ? 1 : -1) * 6} r={10 * spr(frame, q.f, 'tap')} fill={C.ink} /> : null))
                : null}
            </g>
          ) : null}
          {/* the verdict ring round the damper */}
          {verdictK > 0 ? (
            <circle cx={map(CX, 0).x} cy={map(0, (cylTop + cylBot) / 2).y} r={(170 + 20 * (1 - verdictK)) * s} fill="none" stroke={toneLine(p.verdict)} strokeWidth={8} opacity={verdictK} />
          ) : null}
        </svg>
        {labText(0, L0.x + 30, L0.y - 60, true)}
        {labText(1, L1.x + 110, L1.y, true)}
        {labText(2, L2.x - 110, L2.y, false)}
        {labText(3, L3.x + 90, L3.y + 40, true)}
        {verdictK > 0 ? (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <g transform={`translate(${map(CX + 230, 0).x} ${map(0, (cylTop + cylBot) / 2).y}) scale(${0.8 + 0.2 * verdictK + 0.06 * kick})`} opacity={verdictK}>
              {p.verdict === 'up' ? (
                <path d="M-34 0 L-8 26 L38 -28" fill="none" stroke={toneLine('up')} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M-30 -30 L30 30 M30 -30 L-30 30" fill="none" stroke={toneLine('down')} strokeWidth={14} strokeLinecap="round" />
              )}
            </g>
          </svg>
        ) : null}
      </CameraLayer>
      <Hud>
        {p.count && showTrace
          ? peaks(n).map((q) =>
              frame >= q.f ? (
                <div key={q.i} className={TXT} style={{position: 'absolute', left: q.x - 20, top: TY + 22, width: 40, textAlign: 'center', font: `700 44px ${F.sans}`, color: C.ink, opacity: spr(frame, q.f, 'tap')}}>
                  {q.i + 1}
                </div>
              ) : null,
            )
          : null}
        {p.tag ? <MonoLabel text={p.tag} at={Math.max(base, e + 6)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top}} /> : null}
        {p.word ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: showTrace ? 1255 : 1150, whiteSpace: 'nowrap'}}>
            <Words text={p.word} at={Math.max(base, hit)} fx="slam" size={72} />
          </div>
        ) : null}
      </Hud>
      {p.source ? <SourceLine text={p.source} at={Math.max(base, e + 10)} y={1300} /> : null}
      {bumpF >= 0 ? <Sfx name="asmr-land" at={Math.max(base, bumpF + 6)} volume={0.4} /> : null}
      {pressF >= 0 ? <Sfx name="asmr-knock" at={Math.max(base, pressF)} volume={0.35} /> : null}
      {pressF >= 0 ? <Haptic kind="rigid" at={Math.max(base, pressF + PRESS)} volume={0.3} /> : null}
      {heat > 0 || p.heatAt !== undefined ? <Sfx name="asmr-swell" at={at(p.heatAt, 20)} volume={0.22} /> : null}
      {verdictF >= 0 ? <Land at={verdictF} /> : null}
      {p.leak === 'heavy' ? <Sfx name="asmr-tick-fine" at={Math.max(base, at(p.leakAt, 8) + 24)} volume={0.3} /> : null}
    </PictureBand>
  );
};
