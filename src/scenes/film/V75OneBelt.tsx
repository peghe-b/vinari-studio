// V75OneBelt: the front of an engine as a clean diagram. One ribbed belt wraps the crank pulley and the four it
// drives; four numbered tags pop (one belt, four jobs), each turns into its job's icon (the battery, the steering
// wheel, the coolant drop, the snowflake), then the belt snaps on the left run: it turns red, a gap opens, it sags,
// the pulleys spin down and the tags go quiet, the steering tag last in red.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneLine} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  tagsAt?: number | string; // the four numbered tags pop
  iconsAt?: number[]; // chunk where each tag turns into its icon: [alternator, steering, water, ac]
  snapAt?: number | string; // the belt breaks
  heavyAt?: number | string; // the steering tag turns red
  source?: string;
};

// pulleys in stage units, clockwise on screen: alternator, steering pump, tensioner, water pump, crank, AC compressor
const PL = [
  {x: 300, y: 560, r: 62, job: 0},
  {x: 752, y: 528, r: 70, job: 1},
  {x: 896, y: 704, r: 32, job: -1},
  {x: 806, y: 884, r: 62, job: 2},
  {x: 560, y: 1088, r: 112, job: -1},
  {x: 262, y: 930, r: 80, job: 3},
];
const CX = 563; // the arrangement's centre, for the outward side of every tangent
const CY = 790;
const BREAK = 0.93; // where on the loop (0..1 from the alternator) the belt snaps: the left run

const Icon: React.FC<{k: number; color: string}> = ({k, color}) => {
  if (k === 0)
    return (
      <g fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-14} y={-8} width={28} height={19} rx={3} />
        <path d="M -9 -8 V -12 H -4 V -8 M 4 -8 V -12 H 9 V -8 M -9 2 H -3 M 3 2 H 9 M 6 -1 V 5" />
      </g>
    );
  if (k === 1)
    return (
      <g fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <circle r={14} />
        <circle r={4} />
        <path d="M -4 1 L -13 4 M 4 1 L 13 4 M 0 4 V 14" />
      </g>
    );
  if (k === 2)
    return <path d="M 0 -14 C 7 -5 10 0 10 4 A 10 10 0 0 1 -10 4 C -10 0 -7 -5 0 -14 Z" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />;
  return (
    <g fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M 0 -14 V 14 M -12 -7 L 12 7 M -12 7 L 12 -7" />
      <path d="M -4 -12 L 0 -8 L 4 -12 M -4 12 L 0 8 L 4 12" />
    </g>
  );
};

export const V75OneBelt: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tagsAt = Math.max(base + 14, cueFrame(ctx, p.tagsAt ?? 1));
  const icons = p.iconsAt ?? [2, 2, 3, 4];
  const snap = Math.max(base + 30, cueFrame(ctx, p.snapAt ?? 5));
  const heavy = Math.max(snap + 10, cueFrame(ctx, p.heavyAt ?? 6));
  const n = PL.length;
  // when each tag turns into its icon (two on one chunk: the second a beat later)
  const iconF: number[] = [];
  for (let k = 0; k < 4; k++) {
    const c = icons[+k] ?? 2;
    const pk = k - 1;
    const twin = k > 0 && icons[+pk] === c ? 9 : 0;
    iconF.push(Math.max(tagsAt + k * 5 + 8, cueFrame(ctx, c) + twin));
  }

  // the belt: outer tangents between neighbours, arcs around each pulley (clockwise on screen)
  const outP: number[][] = [];
  const inP: number[][] = [];
  for (let i = 0; i < n; i++) {
    const A = PL[+i];
    const j = (i + 1) % n;
    const B = PL[+j];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dd = Math.hypot(dx, dy);
    const ux = dx / dd;
    const uy = dy / dd;
    const a = (A.r - B.r) / dd;
    const b = Math.sqrt(Math.max(0, 1 - a * a));
    // two candidates; keep the one that points away from the centre
    let mx = a * ux - b * uy;
    let my = a * uy + b * ux;
    const midX = (A.x + B.x) / 2 - CX;
    const midY = (A.y + B.y) / 2 - CY;
    if (mx * midX + my * midY < 0) {
      mx = a * ux + b * uy;
      my = a * uy - b * ux;
    }
    outP.push([A.x + A.r * mx, A.y + A.r * my]);
    inP.push([B.x + B.r * mx, B.y + B.r * my]);
  }
  let d = `M ${outP[0][0].toFixed(1)} ${outP[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const B = PL[+j];
    const s = inP[+i];
    const t = outP[+j];
    d += ` L ${s[0].toFixed(1)} ${s[1].toFixed(1)}`;
    const a0 = Math.atan2(s[1] - B.y, s[0] - B.x);
    const a1 = Math.atan2(t[1] - B.y, t[0] - B.x);
    let sweep = a1 - a0;
    while (sweep < 0) sweep += Math.PI * 2;
    d += ` A ${B.r} ${B.r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${t[0].toFixed(1)} ${t[1].toFixed(1)}`;
  }
  d += ' Z';

  // motion: the belt runs until the snap, then everything spins down
  const run = frame < snap ? frame - base : snap - base + 9 * (1 - Math.exp(-(frame - snap) / 9));
  const draw = prog(frame, e, 30, ease.drawOn);
  const broke = frame >= snap;
  const gap = broke ? lerp(0, 0.05, prog(frame, snap, 8, ease.enter)) : 0;
  const sag = broke ? spr(frame, snap + 2, 'land') : 0;
  const shake = broke && frame < snap + 6 ? Math.sin((frame - snap) * 2.2) * 4 * (1 - (frame - snap) / 6) : 0;
  const push = lerp(1, 1.05, prog(frame, e, Math.max(60, ctx.dur), ease.camera));
  const red = toneLine('down');
  const beltColor = broke ? red : C.ink;
  const dash = broke ? `${1 - gap} ${gap}` : `${draw} ${1 - draw + 0.001}`;
  const dashOff = broke ? -(BREAK + gap / 2) : 0;
  const tear = PL[5];
  const alt = PL[0];

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${shake}px) scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* pulleys */}
          {PL.map((q, i) => {
            const pop = spr(frame, e + i * 3, 'enter');
            const rot = (run * 9 * 112) / q.r;
            const hub = Math.max(7, q.r * 0.22);
            return (
              <g key={i} transform={`translate(${q.x} ${q.y}) scale(${0.85 + 0.15 * pop})`} opacity={pop}>
                <circle r={q.r} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
                <circle r={q.r - 9} fill="none" stroke={C.rule} strokeWidth={1.4} />
                <circle r={hub} fill="none" stroke={C.ink} strokeWidth={2} />
                <g transform={`rotate(${rot})`}>
                  {[0, 120, 240].map((deg) => (
                    <line key={deg} x1={0} y1={-hub} x2={0} y2={-(q.r - 14)} stroke={q.job === -1 ? C.ink2 : C.ink} strokeWidth={2} strokeLinecap="round" transform={`rotate(${deg})`} />
                  ))}
                </g>
              </g>
            );
          })}
          {/* the belt: a hollow ribbon with running ribs */}
          <g transform={`translate(0 ${sag * 26})`}>
            <path d={d} pathLength={1} fill="none" stroke={beltColor} strokeWidth={13} strokeLinejoin="round" strokeDasharray={dash} strokeDashoffset={dashOff} />
            <path d={d} pathLength={1} fill="none" stroke={C.bg} strokeWidth={8} strokeLinejoin="round" strokeDasharray={dash} strokeDashoffset={dashOff} />
            {frame >= e + 30 ? (
              <path
                d={d}
                fill="none"
                stroke={rgba(beltColor, 0.75)}
                strokeWidth={8}
                strokeDasharray="2 16"
                strokeDashoffset={-run * 9}
                opacity={broke ? 1 - prog(frame, snap, 10) : prog(frame, e + 26, 8)}
              />
            ) : null}
          </g>
          {/* the four jobs: a number first, then the icon */}
          {PL.map((q, i) => {
            const k = q.job;
            if (k < 0) return null;
            const ox = q.x - CX;
            const oy = q.y - CY;
            const len = Math.hypot(ox, oy);
            const tx = q.x + (ox / len) * (q.r + 44);
            const ty = q.y + (oy / len) * (q.r + 44);
            const at = tagsAt + k * 5;
            const pop = spr(frame, at, 'land');
            const ic = spr(frame, iconF[+k], 'land');
            const quiet = broke ? prog(frame, snap + 4 + k * 3, 10) : 0;
            const hv = k === 1 ? prog(frame, heavy, 10) : 0;
            const lit = ic > 0.5 && hv === 0;
            if (frame < at) return null;
            return (
              <g key={i} transform={`translate(${tx} ${ty}) scale(${0.6 + 0.4 * pop})`} opacity={1 - 0.6 * quiet + 0.6 * quiet * hv}>
                <line x1={(-ox / len) * 33} y1={(-oy / len) * 33} x2={(-ox / len) * 44 + (ox / len) * 0} y2={(-oy / len) * 44} stroke={C.ink2} strokeWidth={1.5} />
                <circle r={33} fill={lit ? C.ink : C.surface} stroke={hv > 0 ? red : C.ink} strokeWidth={2.4} />
                {ic < 0.5 ? (
                  <text className={TXT} x={0} y={11} textAnchor="middle" fontFamily={F.mono} fontSize={30} fill={C.ink} opacity={1 - ic * 2}>
                    {k + 1}
                  </text>
                ) : (
                  <g transform={`scale(${0.7 + 0.3 * ic})`}>
                    <Icon k={k} color={hv > 0 ? red : C.bg} />
                  </g>
                )}
              </g>
            );
          })}
          {/* the snap: a ring where the belt broke */}
          {broke ? (
            <circle cx={tear.x - tear.r} cy={(alt.y + tear.y) / 2 + sag * 26} r={30 + 50 * prog(frame, snap, 14)} fill="none" stroke={rgba(red, 0.6)} strokeWidth={1.6} opacity={1 - prog(frame, snap, 14)} />
          ) : null}
        </svg>
      </div>
      <SourceLine text={p.source} at={e + 20} />
      <Sfx name="asmr-pencil" at={base + 2} volume={0.35} />
      {[0, 1, 2, 3].map((k) => (
        <Sfx key={`p${k}`} name="asmr-pop" at={tagsAt + k * 5} volume={0.4} />
      ))}
      {iconF.map((f, k) => (
        <Sfx key={`i${k}`} name="asmr-tick-fine" at={f} volume={0.35} />
      ))}
      <Sfx name="asmr-paper-tear" at={snap} volume={0.5} />
      <Land at={snap + 3} volume={0.45} />
      <Haptic kind="light" at={heavy} />
    </PictureBand>
  );
};
