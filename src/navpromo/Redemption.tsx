// REDEMPTION AND THE ROAD AHEAD: a match cut to frame 0's composition, redrawn in clean ink line art on white: the stamped
// pines become refined outlines in natural variety, pale mist, the refined cobalt car ON the track, headlights on, the phone
// in its holder; a green route leads out of the trees („აწი აღარ დაიკარგები."). Then the camera rises above: from the top the
// route runs on across the white and off the right edge, past three empty '+' chips that light up one after another
// („ეს მხოლოდ დასაწყისია.": more to come, no invented feature names).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {Car} from './kit/car';
import {IlloDefs} from './kit/solid';
import {alongPoly, clamp, E, ev, evs, fr, GREEN, hash, INK, INK3, lerp, prog, sampleSmooth, shot, smoothPath, sp, type Pt} from './lib';

const W = 1080;
const H = 1920;

const PINES: [number, number, number, number][] = [
  // x, ground y, height, width factor: natural variety (the forest's seven, refined, and a few more)
  [560, 1090, 300, 0.78],
  [430, 1110, 340, 0.7],
  [700, 1120, 320, 0.82],
  [250, 1140, 420, 0.66],
  [880, 1160, 460, 0.74],
  [90, 1185, 520, 0.7],
  [1010, 1195, 560, 0.68],
  [350, 1125, 260, 0.9],
  [790, 1130, 240, 0.86],
  [160, 1150, 300, 0.8],
];
const pinePath = (x: number, y: number, h: number, k: number, seed: number) => {
  const w = h * 0.42 * k;
  const pts: Pt[] = [[x, y - h]];
  const tiers = 5;
  for (let i = 1; i <= tiers; i++) {
    const yy = y - h + (h * 0.92 * i) / tiers;
    const ww = (w * i) / tiers;
    pts.push([x + ww + hash(i, seed) * 4, yy]);
    if (i < tiers) pts.push([x + ww * 0.55, yy - 4]);
  }
  const left: Pt[] = [];
  for (let i = tiers; i >= 1; i--) {
    const yy = y - h + (h * 0.92 * i) / tiers;
    const ww = (w * i) / tiers;
    if (i < tiers) left.push([x - ww * 0.55, yy - 4]);
    left.push([x - ww + hash(i, seed + 9) * 4, yy]);
  }
  return `M${[...pts, ...left].map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z M${x} ${y - h * 0.08} L${x} ${y}`;
};

const ROUTE_TOP: Pt[] = sampleSmooth(
  [
    [430, 1250],
    [520, 1110],
    [660, 1010],
    [800, 870],
    [880, 700],
    [990, 560],
    [1200, 430],
  ],
  12,
);

export const Redemption: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const base = fr(shot('redeem').from);
  const end = fr(shot('redeem').to) - base;
  const rise = fr(ev('rise')) - base;
  const chips = evs('chips').map((s) => fr(s) - base);
  const k = E.inOut(prog(t, rise, 12));
  const push = 1 + 0.05 * E.sine(clamp(t / Math.max(1, rise)));
  const routeOut = E.out(prog(t, 2, 24));
  const routeTop = E.out(prog(t, rise + 4, end - rise - 4));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <IlloDefs uid={uid} />
      <rect width={W} height={H} fill="#FFFFFF" />
      {/* ---- the side: frame 0, redrawn clean ---- */}
      <g opacity={1 - k} transform={`translate(0 ${k * 260}) translate(420 1180) scale(${push}) translate(-420 -1180)`}>
        <circle cx={245} cy={415} r={85} fill="none" stroke={INK3} strokeWidth={2} />
        <path d="M-40 1000 Q300 960 560 1000 T1120 990 L1120 1060 Q600 1030 -40 1070 Z" fill="#F3F3F3" />
        {PINES.map(([x, y, h, kk], i) => (
          <path key={i} d={pinePath(x, y, h, kk, i + 1)} fill="#FFFFFF" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        ))}
        <path d="M-40 1150 Q500 1110 1120 1170 L1120 1200 Q520 1150 -40 1190 Z" fill="#F0F0F0" />
        <line x1={-40} y1={1235} x2={1120} y2={1235} stroke={INK} strokeWidth={2} />
        {/* the track the car is on */}
        <path d="M-40 1420 Q520 1360 1120 1395" fill="none" stroke={INK3} strokeWidth={2} />
        <path d="M-40 1460 Q520 1400 1120 1440" fill="none" stroke={INK3} strokeWidth={2} />
        {/* the green route, out of the trees to the right */}
        <path d="M900 1405 Q1000 1400 1130 1395" fill="none" stroke={GREEN} strokeWidth={9} strokeLinecap="round" strokeDasharray="400" strokeDashoffset={400 * (1 - routeOut)} />
        <Car uid={uid} x={650} y={1430} len={520} view="side" body="ev" paint="a" dir={1} frame={t} speed={0.25} lights={{head: 1}} />
        {/* the phone in its holder behind the windshield */}
        <rect x={734} y={1272} width={16} height={26} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={1.5} />
      </g>
      {/* ---- from above: the route runs on, past three empty '+' chips ---- */}
      <g opacity={k} transform={`translate(0 ${(1 - k) * -260})`}>
        {/* the forest from above, refined: a band of crowns */}
        {Array.from({length: 26}, (_, i) => {
          const x = 30 + ((i * 97) % 1060) + hash(i, 4) * 10;
          const y = 1150 + ((i * 53) % 200) + hash(i, 5) * 8;
          const r = 42 + ((hash(i, 6) + 1) / 2) * 20;
          if (Math.hypot(x - 440, y - 1260) < 95) return null;
          // a pine from above: a star of soft spikes round a small trunk dot (a circle with a cross read as a '+' chip)
          const n = 9;
          const rot = hash(i, 7) * Math.PI;
          const star = Array.from({length: n * 2}, (_, j) => {
            const a = rot + (j * Math.PI) / n;
            const rr = j % 2 === 0 ? r : r * 0.7;
            return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
          });
          return (
            <g key={i}>
              <path d={`M${star.join(' L')} Z`} fill="#FFFFFF" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
              <circle cx={x} cy={y} r={3.5} fill={INK3} />
            </g>
          );
        })}
        <path d={smoothPath(ROUTE_TOP)} fill="none" stroke="#E6E6E6" strokeWidth={30} strokeLinecap="round" />
        {(() => {
          const pts: Pt[] = [];
          for (let i = 0; i <= 60; i++) pts.push(alongPoly(ROUTE_TOP, (i / 60) * routeTop).p);
          return <path d={`M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}`} fill="none" stroke={GREEN} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />;
        })()}
        <Car uid={uid} x={lerp(410, 455, routeTop)} y={lerp(1290, 1230, routeTop)} len={190} view="top" body="ev" paint="a" heading={32} frame={t} speed={0.3} />
        {[0.32, 0.56, 0.78].map((f, i) => {
          const p = alongPoly(ROUTE_TOP, f).p;
          const on = sp(t, chips[i], 220, 14);
          const shown = t >= chips[i] - 6 ? clamp((t - chips[i] + 6) / 6) : 0;
          if (shown <= 0) return null;
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${lerp(0.85, 1, on)})`} opacity={shown}>
              <rect x={-58} y={-34} width={116} height={68} rx={34} fill={on > 0.5 ? INK : '#FFFFFF'} stroke={INK} strokeWidth={3} />
              <path d="M-14 0 L14 0 M0 -14 L0 14" stroke={on > 0.5 ? '#FFFFFF' : INK} strokeWidth={5} strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
