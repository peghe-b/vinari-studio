// src/scenes/film/NavPromoLost.tsx: the navigator promo's opening, told in SHOTS that change every couple of seconds (the
// owner, 2026-10-12: "a scene that tells the story, changing within seconds, like the first video: the man, then it zooms
// out and shows the forest from above"; no cartoon face, refined).
//
//   1  from above: a dark forest at night, one winding road, a tiny car with its lights on; the foreign navigator's route
//      loops round and round; the camera sinks toward the car while the English voice talks (before the first line)
//   2  on the road: the stopped sports coupe from behind, hazards blinking, the man beside it as a dark silhouette in a long
//      coat, his phone lit in his hand; the camera dollies in ("რაით?")
//   3  over his shoulder: the phone fills the frame; the English arrow flips to left ("ლეფთ?"), then spins, recalculating
//   4  the outburst (hitAt): a low angle on him, arms thrown up, crows burst out of the pines, the frame shakes
//   5  the camera flies up and away: from above again, the car one small light in a huge black forest; the night swallows it
//      (the black beat before the reveal)
// Props: talkAt, flipAt, spinAt, hitAt, wideAt (chunk indexes: his first line, the arrow flips / spins, the outburst, the
// fly-away), body.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, F, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import {capsLatin} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Car, type CarBody} from '../illo/car';
import {Figure} from '../illo/figure';
import {FOOT, IlloBand, TOP} from '../illo/scene';

type P = {flipAt?: number | string; spinAt?: number | string; hitAt?: number | string; wideAt?: number | string; talkAt?: number | string; body?: CarBody};

const jit = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const pine = (x: number, b: number, h: number, w: number) => {
  let d = '';
  for (let t = 0; t < 5; t++) {
    const ty = b - h + (h * t) / 5.6;
    const bot = ty + h * 0.34;
    const half = (w * (0.42 + (0.58 * t) / 4)) / 2;
    d += `M${x} ${ty}L${x + half} ${bot}Q${x} ${bot - h * 0.04} ${x - half} ${bot}Z`;
  }
  return d + `M${x - w * 0.035} ${b - h * 0.08}H${x + w * 0.035}V${b}H${x - w * 0.035}Z`;
};
const row = (seed: number, b: number, h: number, w: number, n: number, gap: [number, number]) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = -60 + (1200 * (i + jit(i, seed) * 0.6)) / n;
    if (x > gap[0] && x < gap[1]) continue;
    d += pine(x, b + jit(i, seed + 1) * 24, h * (0.75 + jit(i, seed + 2) * 0.5), w * (0.8 + jit(i, seed + 3) * 0.4));
  }
  return d;
};
const ARROW = 'M30 104V58C30 38 42 26 62 26H80V8L112 38L80 68V50H62C56 50 54 54 54 60V104Z';

export const NavPromoLost: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  const talk = Math.max(base + 10, cueFrame(ctx, p.talkAt ?? 0));
  const flip = Math.max(talk + 8, cueFrame(ctx, p.flipAt ?? 2));
  const spin = Math.max(flip + 6, cueFrame(ctx, p.spinAt ?? 3));
  const hit = Math.max(spin + 8, cueFrame(ctx, p.hitAt ?? 4));
  const wide = Math.max(hit + 10, cueFrame(ctx, p.wideAt ?? 5));
  const end = ctx.dur;
  // the shots: 1 aerial, 2 road, 3 phone, 4 outburst, 5 fly-away
  const shot = frame < talk - 4 ? 1 : frame < flip - 2 ? 2 : frame < hit - 2 ? 3 : frame < wide ? 4 : 5;
  const cuts = [0, e, talk - 4, flip - 2, hit - 2, wide];
  const local = frame - cuts[shot];
  // a short punch on every cut: the new shot lands from 6 % bigger
  const punch = 1 + 0.06 * (1 - prog(local, 0, 10, ease.enter));
  const fade = prog(frame, Math.max(wide + 20, end - 84), 30, ease.enter);
  const hazard = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.15;
  const shake = shot === 4 ? Math.sin(frame * 2.9) * 10 * (1 - prog(local, 0, 24)) : 0;

  const defs = (
    <defs>
      <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.ilNight} />
        <stop offset="0.6" stopColor={C.il7} />
        <stop offset="1" stopColor={C.il6} />
      </linearGradient>
      <linearGradient id={`${uid}fog`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.il5} stopOpacity="0" />
        <stop offset="0.5" stopColor={C.il5} stopOpacity="0.36" />
        <stop offset="1" stopColor={C.il5} stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${uid}glow`}>
        <stop offset="0" stopColor={C.il0} stopOpacity="0.9" />
        <stop offset="0.35" stopColor={C.il1} stopOpacity="0.35" />
        <stop offset="1" stopColor={C.il1} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}beam`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={C.il0} stopOpacity="0.7" />
        <stop offset="1" stopColor={C.il0} stopOpacity="0" />
      </linearGradient>
    </defs>
  );

  // ---- 1 and 5: the forest from above -------------------------------------------------------------------------------
  const aerial = (zoom: number, rot: number, loop: number) => {
    const crowns: React.ReactNode[] = [];
    for (let i = 0; i < 230; i++) {
      const x = -260 + jit(i, 1) * 1600;
      const y = -100 + jit(i, 2) * 2150;
      if (Math.abs(x - (540 + 180 * Math.sin(y / 300))) < 70) continue;
      const r = 34 + jit(i, 3) * 46;
      // a pine from above: a jagged star of branches, a lighter tip where the moon catches it
      let star = '';
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2 + jit(i, 4);
        const rk = k % 2 === 0 ? r : r * 0.62;
        star += `${k ? 'L' : 'M'}${(x + Math.cos(a) * rk).toFixed(1)} ${(y + Math.sin(a) * rk).toFixed(1)}`;
      }
      crowns.push(
        <g key={i}>
          <path d={star + 'Z'} fill={C.il7} />
          <circle cx={x - r * 0.18} cy={y - r * 0.18} r={r * 0.32} fill={C.il6} opacity={0.6} />
        </g>,
      );
    }
    let way = '';
    for (let y = -120; y <= 2060; y += 40) way += `${y === -120 ? 'M' : 'L'}${(540 + 180 * Math.sin(y / 300)).toFixed(1)} ${y}`;
    const carY = 980;
    const carX = 540 + 180 * Math.sin(carY / 300);
    let route = '';
    for (let k = 0; k <= 60; k++) {
      const a = (k / 60) * Math.PI * 4 + frame / 30;
      const rr = 120 + 40 * Math.sin(k / 5);
      route += `${k ? 'L' : 'M'}${(carX + Math.cos(a) * rr).toFixed(1)} ${(carY + Math.sin(a) * rr * 0.8).toFixed(1)}`;
    }
    return (
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {defs}
        <rect x={-200} y={TOP - 100} width={1480} height={FOOT - TOP + 200} fill={C.ilNight} />
        <g transform={`translate(${carX} ${carY}) rotate(${rot}) scale(${zoom}) translate(${-carX} ${-carY})`}>
          <path d={way} fill="none" stroke={C.il6} strokeWidth={70} strokeLinecap="round" />
          <path d={way} fill="none" stroke={C.il5} strokeWidth={2} strokeDasharray="18 26" opacity={0.6} />
          {crowns}
          <path d={route} fill="none" stroke={C.accA} strokeWidth={4} strokeDasharray="10 12" opacity={0.85 * loop} strokeLinecap="round" />
          <polygon points={`${carX - 10},${carY - 20} ${carX + 10},${carY - 20} ${carX + 70},${carY - 230} ${carX - 70},${carY - 230}`} fill={`url(#${uid}beam)`} />
          <rect x={carX - 15} y={carY - 26} width={30} height={52} rx={9} fill={C.accA} />
          <rect x={carX - 11} y={carY - 12} width={22} height={18} rx={4} fill={C.ilGlass} />
          <circle cx={carX - 11} cy={carY + 24} r={4} fill={C.il0} opacity={hazard} />
          <circle cx={carX + 11} cy={carY + 24} r={4} fill={C.il0} opacity={hazard} />
          <circle cx={carX} cy={carY} r={160} fill={`url(#${uid}glow)`} opacity={0.18} />
        </g>
        <rect x={-200} y={TOP - 100} width={1480} height={FOOT - TOP + 200} fill={`url(#${uid}fog)`} opacity={0.35} />
      </svg>
    );
  };

  // ---- 2 and 4: on the road ---------------------------------------------------------------------------------------------
  const road = (zoom: number, pose: number, birds: number) => {
    const flock: React.ReactNode[] = [];
    for (let i = 0; i < 16 && birds > 0; i++) {
      const t = birds * (0.6 + jit(i, 9) * 0.6);
      const bx = 200 + jit(i, 7) * 700 + (jit(i, 8) - 0.5) * 500 * t;
      const by = 900 - 700 * t - jit(i, 6) * 120;
      const s = 0.6 + jit(i, 5) * 0.8;
      const flap = Math.sin(frame * 0.9 + i) * 6 * s;
      flock.push(<path key={i} d={`M${bx - 14 * s} ${by + flap}Q${bx - 6 * s} ${by - 8 * s} ${bx} ${by}Q${bx + 6 * s} ${by - 8 * s} ${bx + 14 * s} ${by + flap}`} fill="none" stroke={C.ilNight} strokeWidth={3} strokeLinecap="round" />);
    }
    return (
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})`, transformOrigin: '700px 1050px'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {defs}
          <rect x={-200} y={TOP - 100} width={1480} height={1300} fill={`url(#${uid}sky)`} />
          <circle cx={800} cy={470} r={210} fill={`url(#${uid}glow)`} opacity={0.5} />
          <circle cx={800} cy={470} r={44} fill={C.il1} opacity={0.92} />
          <path d={row(3, 1050, 260, 120, 22, [520, 600])} fill={C.il6} opacity={0.9} />
          <rect x={-200 + ((frame * 0.4) % 240)} y={850} width={1500} height={260} fill={`url(#${uid}fog)`} />
          <path d={row(11, 1140, 430, 190, 13, [410, 710])} fill={C.il7} />
          {flock}
          <rect x={-200} y={1110} width={1480} height={FOOT - 1010} fill={C.ilNight} />
          <path d={`M-80 ${FOOT}C200 1500 420 1180 542 1016L578 1016C700 1180 980 1500 1160 ${FOOT}Z`} fill={C.il7} />
          <ellipse cx={360} cy={1334} rx={330} ry={20} fill={C.ilNight} opacity={0.8} />
          <Car uid={uid} x={360} y={1330} len={620} view="side" dir={1} body={p.body ?? 'coupe'} paint="a" frame={frame} time="night" lights={{head: 1, tail: 1, hazard, left: hazard, right: hazard, beam: 1}} />
          <g transform={`translate(${shake} 0)`}>
            <Figure uid={uid} cast={{is: 'man', outfit: 'overcoat', gender: 'm', age: 'adult'}} x={720} y={1372} size={560} frame={frame} time="night" pose={pose > 0.5 ? 'armsUp' : 'phoneLook'} turn={-0.4} />
          </g>
          <path d={pine(-40, FOOT, 1500, 520)} fill={C.ilNight} />
          <path d={pine(1130, FOOT, 1350, 460)} fill={C.ilNight} />
        </svg>
      </div>
    );
  };

  // ---- 3: over his shoulder, the phone ---------------------------------------------------------------------------------
  const flipK = spr(frame, flip, 'land');
  const spinA = frame >= spin ? (frame - spin) * 14 : 0;
  const word = frame < spin ? 'Turn left' : 'Recalculating';
  const phone = () => {
    const hand = Math.sin(frame / 7) * 6;
    return (
      <div style={{position: 'absolute', inset: 0}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {defs}
          <rect x={-200} y={TOP - 100} width={1480} height={FOOT - TOP + 200} fill={`url(#${uid}sky)`} />
          <path d={row(5, 1400, 900, 300, 9, [0, 0])} fill={C.il7} opacity={0.6} />
          <circle cx={540} cy={900} r={620} fill={`url(#${uid}glow)`} opacity={0.22} />
          <g transform={`translate(${540 + hand} ${980 + hand * 0.6}) rotate(${-6 + hand * 0.3})`}>
            {/* the hand behind the phone: the palm and the wrist, lit only on its rim by the screen */}
            <path d="M-286 960C-300 700 -292 420 -238 330C-200 280 200 280 238 330C292 420 300 700 286 960Z" fill={C.ilNight} stroke={C.il6} strokeWidth={2} strokeOpacity={0.5} />
            <rect x={-250} y={-500} width={500} height={1000} rx={74} fill={C.ilGlass} stroke={C.il5} strokeWidth={3} />
            <rect x={-232} y={-482} width={464} height={964} rx={60} fill={C.il7} />
            <rect x={-60} y={-466} width={120} height={30} rx={15} fill={C.ilNight} />
            {/* the fingers round the edges: the thumb on the left, three fingertips on the right */}
            <rect x={-300} y={150} width={78} height={250} rx={39} transform="rotate(14 -261 275)" fill={C.ilNight} stroke={C.il4} strokeWidth={2.5} strokeOpacity={0.55} />
            {[90, 190, 290].map((fy) => (
              <rect key={fy} x={214} y={fy} width={74} height={82} rx={36} fill={C.ilNight} stroke={C.il4} strokeWidth={2.5} strokeOpacity={0.55} />
            ))}
          </g>
        </svg>
        <div style={{position: 'absolute', left: 540 - 200 + hand, top: 640 + hand * 0.6, width: 400, height: 420, borderRadius: 40, backgroundColor: rgba(C.ilNight, 0.7), transform: `rotate(${(-6 + hand * 0.3).toFixed(2)}deg)`}}>
          <svg width={260} height={260} viewBox="0 0 120 120" style={{position: 'absolute', left: 70, top: 30, overflow: 'visible'}}>
            <g transform={`translate(60 60) rotate(${spinA.toFixed(1)}) scale(${(1 - 2 * flipK).toFixed(3)} 1) translate(-60 -60)`}>
              <path d={ARROW} fill={C.il0} />
            </g>
            {frame >= spin ? <circle cx={60} cy={60} r={58} fill="none" stroke={C.il2} strokeWidth={3} strokeDasharray="60 300" transform={`rotate(${(frame - spin) * 20} 60 60)`} /> : null}
          </svg>
          <div className={TXT} style={{position: 'absolute', left: 0, width: 400, top: 320, textAlign: 'center', font: `600 34px ${F.mono}`, color: C.il1, letterSpacing: 2}}>
            {capsLatin(word)}
          </div>
        </div>
      </div>
    );
  };

  let picture: React.ReactNode;
  if (shot === 1) picture = aerial(1.05 + 1.3 * prog(local, 0, Math.max(30, talk - 4), ease.camera), -10 * (1 - prog(local, 0, 80, ease.camera)), 1);
  else if (shot === 2) picture = road(1 + 0.22 * prog(local, 0, 80, ease.camera), 0, 0);
  else if (shot === 3) picture = phone();
  else if (shot === 4) picture = road(1.3 + 0.12 * spr(local, 0, 'land'), spr(local, 0, 'land'), prog(local, 2, 60, ease.camera));
  else picture = aerial(2.2 - 1.6 * prog(local, 0, 90, ease.camera), 6 * prog(local, 0, 90), 0);

  return (
    <IlloBand uid={uid} time="night">
      <div style={{position: 'absolute', inset: 0, transform: `scale(${punch.toFixed(4)}) translateX(${shake.toFixed(1)}px)`, transformOrigin: '540px 960px'}}>{picture}</div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <rect x={-120} y={TOP} width={1320} height={FOOT - TOP} fill={C.ilNight} opacity={fade} />
      </svg>
      <Sfx name="asmr-whoomp" at={Math.max(base, talk - 4)} volume={0.22} />
      <Sfx name="asmr-ui-tick" at={flip} volume={0.35} />
      <Haptic kind="light" at={flip} />
      <Sfx name="asmr-haptic-error" at={spin} volume={0.3} />
      <Sfx name="asmr-air-long" at={hit - 2} volume={0.3} />
      <Haptic kind="heavy" at={hit} />
      <Sfx name="asmr-swell" at={wide} volume={0.18} />
      <Sfx name="asmr-sub" at={Math.max(wide + 20, end - 40)} volume={0.3} />
    </IlloBand>
  );
};
