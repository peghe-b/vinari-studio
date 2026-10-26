import React from 'react';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {useCurrentFrame} from 'remotion';
import {ease, rand, spr} from '../lib/anim';
import {C, isLight} from '../tokens';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  from: string;
  to: string;
  /** a short fact on the route: „12 კმ", „18 წუთი" (shown under the map) */
  note?: string;
  /** the route's shape seed (a different town, a different road) */
  seed?: number;
  /** the chunk the route starts drawing on */
  at?: number;
};

// RouteTrace (phase 2): a paper map in a white card (light-grey roads, white dashes on the main road), the route draws
// itself in ink on BEZ.data and a dot rides along it to the end pin. Never a real map tile: the shapes are drawn.
export const RouteTrace: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(0, base) + 12;
  const seed = p.seed ?? 7;
  const cw = S.right - S.left;
  const ch = 820;
  const cx0 = S.left;
  const cy0 = S.top + 20;
  // the roads: a seeded grid of gentle curves
  const roads: string[] = [];
  for (let i = 0; i < 7; i++) {
    const y = 60 + i * 120 + (rand(seed + i) - 0.5) * 40;
    roads.push(`M -20 ${y} C ${cw * 0.3} ${y + (rand(seed + i * 3) - 0.5) * 90}, ${cw * 0.7} ${y + (rand(seed + i * 5) - 0.5) * 90}, ${cw + 20} ${y + (rand(seed + i * 7) - 0.5) * 60}`);
  }
  for (let i = 0; i < 6; i++) {
    const x = 70 + i * 150 + (rand(seed + 40 + i) - 0.5) * 50;
    roads.push(`M ${x} -20 C ${x + (rand(seed + i * 9) - 0.5) * 80} ${ch * 0.35}, ${x + (rand(seed + i * 11) - 0.5) * 80} ${ch * 0.65}, ${x + (rand(seed + i * 13) - 0.5) * 60} ${ch + 20}`);
  }
  const ax = 120;
  const ay = ch - 140;
  const bx = cw - 130;
  const by = 150;
  const route = `M ${ax} ${ay} C ${ax + 40} ${ay - 260}, ${cw * 0.42} ${ay - 120}, ${cw * 0.5} ${ch * 0.5} S ${bx - 60} ${by + 260}, ${bx} ${by}`;
  const u = ease.data(Math.min(1, Math.max(0, (frame - at) / 40)));
  const ev = evolvePath(u, route);
  // the dot rides the route's drawn end
  const dot = getPointAtLength(route, getLength(route) * u);
  const pinA = spr(frame, base + 4, 'punch');
  const pinB = spr(frame, at + 40, 'punch');
  const road = isLight() ? '#E2E2E2' : '#2A2A2A';
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: cy0 + ch / 2})}}>
      <Card x={cx0} y={cy0} w={cw} h={ch} r={36}>
        <svg width={cw} height={ch} style={{position: 'absolute', left: 0, top: 0}}>
          {roads.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={road} strokeWidth={i === 3 ? 30 : 16} strokeLinecap="round" />
          ))}
          <path d={roads[3]} fill="none" stroke={isLight() ? '#FFFFFF' : '#141414'} strokeWidth={3} strokeDasharray="18 16" />
          <path d={route} fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
          {dot && u > 0 && u < 1 ? <circle cx={dot.x} cy={dot.y} r={16} fill={C.ink} stroke={C.surface} strokeWidth={6} /> : null}
          <circle cx={ax} cy={ay} r={18 * pinA} fill={C.surface} stroke={C.ink} strokeWidth={7} />
          <circle cx={bx} cy={by} r={22 * pinB} fill={C.ink} />
          <circle cx={bx} cy={by} r={44 * pinB} fill="none" stroke={C.ink} strokeWidth={4} opacity={0.3} />
        </svg>
      </Card>
      <FitText text={p.from} x={cx0 + ax - 40} y={cy0 + ay + 40} w={380} size={46} min={34} maxLines={1} weight={700} at={base + 6} />
      <FitText text={p.to} x={cx0 + bx + 40} y={cy0 + by + 46} w={380} size={46} min={34} maxLines={1} weight={700} align="right" at={at + 42} />
      {p.note ? <FitText text={p.note} x={S.left} y={cy0 + ch + 40} w={cw} size={72} min={44} maxLines={1} weight={700} at={at + 44} /> : null}
      <Sfx name="asmr-swell" at={at} volume={0.26} /* event: the route starts drawing */ />
      <Sfx name="app-landed" at={at + 40} volume={0.34} /* event: the route reaches its pin */ />
    </div>
  );
};
