// The four-navigators hook (4 Nov 2026, ChatGPT's idea 01 „ოთხი შტურმანი, ერთი საჭე“, built in the 2D promos' language):
// a night drive through the city, four people in one car and three of them giving directions at once. Every beat its own
// picture: MOM in the front seat points right against the streaming window, GIO leans in between the headrests and points
// straight at us, LUKA at the back window points at the lit bridge, then the car from straight above at the fork with three
// arms out of it and three routes drawing on while the DRIVER asks if they turn by majority vote; a sudden pull to the sky
// (the whole city, the three of them heard from afar), back in close on the driver with both hands on his head: „ეს
// მანქანაა თუ პარლამენტი?!“; the tape stops, black, and on the white the navigator says the one calm line.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import '../fonts';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {Car} from '../navpromo/kit/car';
import {Iphone} from '../navpromo/Iphone';
import {clamp, E, fr, hash, lerp, prog, rnd, shake, shot, sp, TL, TOTAL} from './lib';
import {Driver, Gio, Luka, Mom} from './people';
import {Subs} from './Subs';

const COBALT = '#2D5BDB';
const COBALT_HI = '#7C9BFF';
const NIGHT = '#05070B';

/** the shot's own clock: t = frames since its cut, len its length, L(event) an event as a frame of this shot */
const useShot = (id: string) => {
  const t = useCurrentFrame(); // a Sequence's frame is already the shot's own
  const s = shot(id);
  const len = fr(s.to) - fr(s.from);
  const L = (name: string, i = 0) => {
    const v = TL.events[name];
    const sec = Array.isArray(v) ? v[i] : (v as number);
    return fr(sec) - fr(s.from);
  };
  return {t, len, L};
};
/** a punch-in on a hit: 1 + amount, easing home over `hold` s */
const punch = (t: number, at: number, amount = 0.07, hold = 0.5) => (t < at ? 1 : 1 + amount * (1 - E.out(clamp((t - at) / (hold * 30)))));
const cam = (s: number, ox: number, oy: number, dx = 0, dy = 0, rot = 0): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transformOrigin: `${ox}px ${oy}px`,
  transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${s})`,
});
const Svg: React.FC<{children: React.ReactNode; vb?: string}> = ({children, vb = '0 0 1080 1920'}) => (
  <svg viewBox={vb} width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);

// ---- the city through a car window at night ---------------------------------------------------------------------------
// The glass shows the street streaming by (two layers of blocks with lit windows, the street lamps passing fast, soft
// bokeh), the door's dark trim around it. `dir` 1: the world streams to the left (the car drives to the right).
const Window: React.FC<{t: number; uid: string; dir?: 1 | -1; speed?: number; glass: [number, number][]; bridge?: number; seed?: number}> = ({t, uid, dir = 1, speed = 1, glass, bridge = 0, seed = 1}) => {
  const id = (n: string) => `${uid}-${n}`;
  const d = glass.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z';
  const xs = glass.map((p) => p[0]);
  const ys = glass.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const r = rnd(seed);
  const far = Array.from({length: 14}, (_, i) => ({w: 120 + r() * 200, h: 260 + r() * 520, x: i * 260 + r() * 80, lit: r()}));
  const near = Array.from({length: 10}, (_, i) => ({w: 220 + r() * 260, h: 420 + r() * 380, x: i * 420 + r() * 120}));
  const lamps = Array.from({length: 8}, (_, i) => ({x: i * 560 + r() * 140, y: y0 + 140 + r() * 120}));
  const wrap = (x: number, span: number) => ((x % span) + span) % span;
  const ox1 = dir * t * 9 * speed;
  const ox2 = dir * t * 26 * speed;
  const ox3 = dir * t * 58 * speed;
  return (
    <g>
      <defs>
        <clipPath id={id('glass')}>
          <path d={d} />
        </clipPath>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1430" />
          <stop offset="0.6" stopColor="#101C3E" />
          <stop offset="1" stopColor="#1A2A55" />
        </linearGradient>
        <radialGradient id={id('lamp')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3DD" stopOpacity={0.95} />
          <stop offset="0.18" stopColor="#FFD7A0" stopOpacity={0.45} />
          <stop offset="1" stopColor="#FFC27A" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('bok')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={COBALT_HI} stopOpacity={0.55} />
          <stop offset="1" stopColor={COBALT_HI} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} />
          <stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0.02} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id('glass')})`}>
        <rect x={x0 - 10} y={y0 - 10} width={x1 - x0 + 20} height={y1 - y0 + 20} fill={`url(#${id('sky')})`} />
        {/* the far blocks, slow */}
        {far.map((b, i) => {
          const x = x0 - 300 + wrap(b.x - ox1, 3640);
          const top = y1 - b.h * 0.7;
          return (
            <g key={`f${i}`}>
              <rect x={x} y={top} width={b.w} height={b.h} fill="#0A1226" />
              {Array.from({length: Math.floor(b.h / 60)}, (_, k) =>
                Array.from({length: Math.floor(b.w / 46)}, (_, j) =>
                  hash(i, k, j) > 0.62 + 0.2 * b.lit ? (
                    <rect key={`${k}-${j}`} x={x + 14 + j * 46} y={top + 20 + k * 60} width={18} height={26} fill={hash(j, k, i) > 0.7 ? '#FFD9A0' : '#8EA6FF'} opacity={0.5} />
                  ) : null,
                ),
              )}
            </g>
          );
        })}
        {/* the bridge: a lit wave of a canopy over the river, far away (Luka's shot) */}
        {bridge > 0 && (
          <g opacity={bridge} transform={`translate(${-ox1 * 0.6} 0)`}>
            <path d={`M${x0 + 40} ${y1 - 260} C ${x0 + 260} ${y1 - 420}, ${x0 + 480} ${y1 - 180}, ${x0 + 700} ${y1 - 330} S ${x0 + 1000} ${y1 - 250}, ${x0 + 1100} ${y1 - 300}`} fill="none" stroke={COBALT_HI} strokeWidth={10} strokeLinecap="round" opacity={0.9} />
            <path d={`M${x0 + 40} ${y1 - 230} L ${x0 + 1100} ${y1 - 270}`} stroke="#DCE5FF" strokeWidth={5} opacity={0.75} />
            {Array.from({length: 22}, (_, i) => (
              <circle key={i} cx={x0 + 60 + i * 48} cy={y1 - 232 - i * 1.8} r={4} fill="#FFFFFF" opacity={0.5 + 0.5 * Math.sin(t / 6 + i)} />
            ))}
            <rect x={x0} y={y1 - 220} width={x1 - x0} height={220} fill="#0A1430" opacity={0.85} />
            {Array.from({length: 9}, (_, i) => (
              <rect key={`rf${i}`} x={x0 + 70 + i * 120 + Math.sin(t / 9 + i) * 10} y={y1 - 200 + (i % 3) * 30} width={60} height={4} fill={COBALT_HI} opacity={0.35} />
            ))}
          </g>
        )}
        {/* the near blocks, faster, darker */}
        {near.map((b, i) => {
          const x = x0 - 400 + wrap(b.x - ox2, 4200);
          return <rect key={`n${i}`} x={x} y={y1 - b.h * 0.42} width={b.w} height={b.h} fill="#060A16" />;
        })}
        {/* the street lamps passing, fast */}
        {lamps.map((l, i) => {
          const x = x0 - 300 + wrap(l.x - ox3, 4480);
          return <circle key={`l${i}`} cx={x} cy={l.y} r={170} fill={`url(#${id('lamp')})`} />;
        })}
        {Array.from({length: 7}, (_, i) => {
          const x = x0 - 200 + wrap(i * 340 - ox3 * 0.8, 2380);
          return <circle key={`b${i}`} cx={x} cy={y0 + 300 + (i % 3) * 140} r={60 + (i % 2) * 30} fill={`url(#${id('bok')})`} />;
        })}
        <rect x={x0 - 10} y={y0 - 10} width={x1 - x0 + 20} height={y1 - y0 + 20} fill={`url(#${id('sheen')})`} />
      </g>
      {/* the trim around the glass */}
      <path d={d} fill="none" stroke="#020305" strokeWidth={46} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#2A3246" strokeWidth={3} strokeLinejoin="round" opacity={0.8} />
    </g>
  );
};

/** the cabin's dark around a window: the door panel's soft highlight, a faint roof liner */
const CabinDark: React.FC<{uid: string}> = ({uid}) => (
  <>
    <defs>
      <linearGradient id={`${uid}-cab`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#07090E" />
        <stop offset="1" stopColor="#030406" />
      </linearGradient>
    </defs>
    <rect x={-200} y={-200} width={1480} height={2320} fill={`url(#${uid}-cab)`} />
  </>
);

/** the seat and the door in front of the person, near and dark: they sit, the line under them stays on a calm black */
const SeatBand: React.FC<{y: number; uid: string; side?: 1 | -1}> = ({y, uid, side = 1}) => (
  <g>
    <defs>
      <linearGradient id={`${uid}-seat`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0A0D14" />
        <stop offset="0.2" stopColor="#040509" />
        <stop offset="1" stopColor="#020305" />
      </linearGradient>
    </defs>
    <path d={`M-200 ${y + 40} C 200 ${y - 30}, 700 ${y - 10}, 1280 ${y + 60} L 1280 2200 L -200 2200 Z`} fill={`url(#${uid}-seat)`} />
    <path d={`M-200 ${y + 40} C 200 ${y - 30}, 700 ${y - 10}, 1280 ${y + 60}`} fill="none" stroke="#2A3350" strokeWidth={3} opacity={0.9} />
    {/* the door's armrest catching the city light */}
    <path d={side > 0 ? `M640 ${y + 150} C 820 ${y + 120}, 1000 ${y + 130}, 1180 ${y + 170}` : `M-100 ${y + 170} C 80 ${y + 130}, 260 ${y + 120}, 440 ${y + 150}`} fill="none" stroke="#3A4A80" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
  </g>
);

/** the windshield ahead at night: the avenue running away to its vanishing point, lane marks streaming at us, the tail
 *  lights of the cars ahead, the skyline on the horizon, street lamps flying past at the sides */
const Windshield: React.FC<{t: number; uid: string; vx: number; vy: number}> = ({t, uid, vx, vy}) => {
  const id = (n: string) => `${uid}-${n}`;
  const glass: [number, number][] = [[150, 360], [1000, 380], [1110, 1120], [-30, 1120]];
  const d = glass.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z';
  const r = rnd(9);
  const sky = Array.from({length: 16}, (_, i) => ({x: -80 + i * 80 + r() * 30, w: 50 + r() * 60, h: 40 + r() * 160}));
  const dash = (k: number) => {
    const z = ((k / 7 + t * 0.028) % 1);
    const p = z * z;
    return {y: vy + p * 520, h: 8 + p * 110, w: 2 + p * 16, x: vx + p * 140};
  };
  return (
    <g>
      <defs>
        <clipPath id={id('g')}>
          <path d={d} />
        </clipPath>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A1230" />
          <stop offset="1" stopColor="#1D2C5C" />
        </linearGradient>
        <radialGradient id={id('tl')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FF5A4F" stopOpacity={0.9} />
          <stop offset="1" stopColor="#FF5A4F" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('lp')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3DD" stopOpacity={0.9} />
          <stop offset="0.2" stopColor="#FFD7A0" stopOpacity={0.35} />
          <stop offset="1" stopColor="#FFC27A" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id('g')})`}>
        <rect x={-100} y={300} width={1300} height={900} fill={`url(#${id('sky')})`} />
        {sky.map((b, i) => (
          <rect key={i} x={b.x} y={vy - b.h} width={b.w} height={b.h + 4} fill="#0A1226" />
        ))}
        <path d={`M${vx - 14} ${vy} L ${vx + 14} ${vy} L 1300 1200 L -300 1200 Z`} fill="#0E121B" />
        {Array.from({length: 7}, (_, k) => {
          const q = dash(k);
          return <rect key={k} x={q.x - q.w / 2} y={q.y} width={q.w} height={q.h} fill="#D8DCE6" opacity={0.6} />;
        })}
        {[0, 1, 2].map((i) => (
          <g key={`c${i}`} opacity={0.9}>
            <circle cx={vx - 60 + i * 70 + Math.sin(t / 20 + i) * 6} cy={vy + 40 + i * 22} r={22 + i * 6} fill={`url(#${id('tl')})`} />
            <circle cx={vx - 20 + i * 70 + Math.sin(t / 20 + i) * 6} cy={vy + 40 + i * 22} r={22 + i * 6} fill={`url(#${id('tl')})`} />
          </g>
        ))}
        {[0, 1, 2, 3].map((k) => {
          const z = ((k / 4 + t * 0.03) % 1);
          const p = z * z;
          return (
            <g key={`l${k}`}>
              <circle cx={vx - 60 - p * 900} cy={vy - 60 - p * 340} r={40 + p * 220} fill={`url(#${id('lp')})`} />
              <circle cx={vx + 60 + p * 900} cy={vy - 60 - p * 340} r={40 + p * 220} fill={`url(#${id('lp')})`} />
            </g>
          );
        })}
      </g>
      <path d={d} fill="none" stroke="#020305" strokeWidth={60} strokeLinejoin="round" />
      {/* the rear-view mirror */}
      <rect x={vx + 140} y={392} width={250} height={74} rx={30} fill="#020305" />
      <rect x={vx + 140} y={392} width={250} height={74} rx={30} fill="none" stroke="#2A3350" strokeWidth={3} />
    </g>
  );
};

// ---- 1 mom: the front passenger in profile against her window, her arm shoots out to the right on „მარჯვნივ" -----------
const MomShot: React.FC = () => {
  const {t, len, L} = useShot('mom');
  const s = punch(t, L('mom'), 0.06, 0.6) * lerp(1.0, 1.05, E.inOut(prog(t, 0, len)));
  const jx = shake(t, L('mom') + 2, 7, 10, 1.1);
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden'}}>
      <div style={cam(s, 560, 800, jx)}>
        <Svg>
          <CabinDark uid="mo" />
          <Window t={t} uid="mo" dir={1} speed={1.1} glass={[[-60, 330], [1140, 400], [1140, 1180], [-60, 1180]]} seed={3} />
          <Mom uid="m1" x={400} y={720} size={1500} frame={t} pose="stand" face="angry" turn={0.8} acts={[{at: L('mom') - 2, pose: 'point', face: 'angry'}]} />
          <SeatBand y={1120} uid="mo" side={1} />
        </Svg>
      </div>
    </AbsoluteFill>
  );
};

// ---- 2 gio: leaning in from the back seat between the front headrests, pointing ahead down the avenue on „პირდაპირ" -------
const GioShot: React.FC = () => {
  const {t, len, L} = useShot('gio');
  const lean = E.out(prog(t, 0, 9));
  const s = punch(t, L('gio') + 6, 0.05, 0.6) * lerp(1.02, 1.07, E.inOut(prog(t, 0, len)));
  const jy = shake(t, L('gio') + 7, 6, 9, 2.1);
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden'}}>
      <div style={cam(s, 540, 820, 0, jy)}>
        <Svg>
          <CabinDark uid="gi" />
          <Windshield t={t} uid="gi" vx={300} vy={760} />
          <Gio uid="g1" x={lerp(800, 740, lean)} y={lerp(800, 760, lean)} size={1600} frame={t} pose="stand" face="smirk" turn={-0.55} acts={[{at: L('gio') + 2, pose: 'point', face: 'smirk'}]} />
          {/* the two front headrests framing him, near and dark */}
          <rect x={-120} y={1060} width={400} height={460} rx={120} fill="#020305" />
          <rect x={-120} y={1060} width={400} height={460} rx={120} fill="none" stroke="#2A3350" strokeWidth={4} />
          <rect x={860} y={1100} width={400} height={460} rx={120} fill="#020305" />
          <rect x={860} y={1100} width={400} height={460} rx={120} fill="none" stroke="#2A3350" strokeWidth={4} />
          <SeatBand y={1240} uid="gi" side={-1} />
        </Svg>
      </div>
    </AbsoluteFill>
  );
};

// ---- 3 luka: at the back window, turned to the glass, pointing at the lit bridge out there on „ხიდზე" --------------------
const LukaShot: React.FC = () => {
  const {t, len, L} = useShot('luka');
  const s = punch(t, L('luka'), 0.06, 0.6) * lerp(1.0, 1.05, E.inOut(prog(t, 0, len)));
  const jx = shake(t, L('luka') + 2, 8, 10, 0.4);
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden'}}>
      <div style={cam(s, 520, 800, jx)}>
        <Svg>
          <CabinDark uid="lu" />
          <Window t={t} uid="lu" dir={-1} speed={0.7} glass={[[-60, 380], [1140, 320], [1140, 1180], [-60, 1180]]} bridge={1} seed={11} />
          <Luka uid="l1" x={720} y={730} size={1520} frame={t} pose="stand" face="shock" turn={-0.82} acts={[{at: L('luka') - 2, pose: 'point', face: 'shock'}]} />
          <SeatBand y={1130} uid="lu" side={-1} />
        </Svg>
      </div>
    </AbsoluteFill>
  );
};

// ---- the city from above at night (the top shot, close, and the far shot, the whole city) --------------------------------
// World units: the fork's centre at (540, 760); the main road comes up from the south, the right street leaves east, the
// avenue runs on north, the ramp curves north-west onto the bridge over the river.
const ROAD = '#1A1E27';
const KERB = '#2A303C';
const ROOF = ['#0C0F15', '#10141C', '#0E1118', '#131823'];
const mainD = 'M540 2600 L540 760';
const rightD = 'M540 900 C 540 760, 640 700, 780 700 L 2400 700';
const straightD = 'M540 900 L540 -1600';
const leftD = 'M540 900 C 540 640, 420 520, 200 420 L -1200 -200';
const RIVER = 'M-2600 -700 C -1400 -260, -400 -60, 400 -360 S 1900 -900, 3200 -700 L 3200 -1180 C 1900 -1380, 1100 -900, 400 -800 S -1400 -760, -2600 -1180 Z';

const City: React.FC<{t: number; uid: string; detail: number}> = ({t, uid, detail}) => {
  const id = (n: string) => `${uid}-${n}`;
  const r = rnd(5);
  // blocks on a loose grid, kept off the roads near the fork and off the river
  const blocks: {x: number; y: number; w: number; h: number; c: string; lit: number}[] = [];
  for (let gx = -3200; gx < 4200; gx += 300)
    for (let gy = -3000; gy < 4600; gy += 300) {
      const x = gx + r() * 40;
      const y = gy + r() * 40;
      const w = 170 + r() * 90;
      const h = 170 + r() * 90;
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (Math.abs(cx - 540) < 380 && cy > -1700) continue; // the avenue
      if (Math.abs(cy - 700) < 330 && cx > 520) continue; // the right street
      if (cy > -400 && cy < 980 && cx < 700 && cx > -1400 && cy - 420 < -(cx - 200) * 0.45 + 200 && cy - 420 > -(cx - 200) * 0.45 - 420) continue; // the ramp
      if (cy < -260 && cy > -1300) continue; // the river band (roughly)
      blocks.push({x, y, w, h, c: ROOF[Math.floor(r() * 4)], lit: r()});
    }
  // the traffic: light dots along the big roads (headlights white one way, tail lights red the other)
  const flow = (d: number, n: number, sp: number, len: number) => Array.from({length: n}, (_, i) => ((i / n) * len + t * sp + hash(i, d) * 90) % len);
  return (
    <g>
      <defs>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity={0.32} />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('river')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0A1532" />
          <stop offset="1" stopColor="#0C1A3E" />
        </linearGradient>
      </defs>
      <rect x={-4000} y={-4000} width={9000} height={10000} fill="#07090D" />
      <path d={RIVER} fill={`url(#${id('river')})`} />
      {Array.from({length: 26}, (_, i) => (
        <rect key={`rv${i}`} x={-2400 + i * 220 + Math.sin(t / 14 + i) * 30} y={-760 + Math.sin(i * 1.7) * 160} width={90} height={5} fill={COBALT_HI} opacity={0.22} />
      ))}
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={b.c} />
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="none" stroke="#1E2430" strokeWidth={3} />
          {detail > 0.5 && b.lit > 0.55 && <rect x={b.x + b.w * 0.3} y={b.y + b.h * 0.3} width={b.w * 0.2} height={b.h * 0.14} fill="#FFD9A0" opacity={0.18} />}
        </g>
      ))}
      {/* the roads: kerbs, asphalt, lane marks */}
      {[mainD, rightD, straightD, leftD].map((d, i) => (
        <path key={`k${i}`} d={d} fill="none" stroke={KERB} strokeWidth={i === 0 || i === 2 ? 420 : 310} strokeLinecap="butt" strokeLinejoin="round" />
      ))}
      {[mainD, rightD, straightD, leftD].map((d, i) => (
        <path key={`r${i}`} d={d} fill="none" stroke={ROAD} strokeWidth={i === 0 || i === 2 ? 390 : 280} strokeLinejoin="round" />
      ))}
      {[mainD, rightD, straightD, leftD].map((d, i) => (
        <path key={`m${i}`} d={d} fill="none" stroke="#D8DCE6" strokeWidth={6} strokeDasharray="46 54" opacity={0.5} />
      ))}
      {/* the bridge: the ramp's road over the water, its lit edge */}
      <path d="M-300 120 L -1200 -200" stroke="#AFC2FF" strokeWidth={8} opacity={0.0} />
      <path d="M-480 60 C -700 -60, -900 -420, -1100 -900" fill="none" stroke={KERB} strokeWidth={250} />
      <path d="M-480 60 C -700 -60, -900 -420, -1100 -900" fill="none" stroke={ROAD} strokeWidth={220} />
      <path d="M-480 60 C -700 -60, -900 -420, -1100 -900" fill="none" stroke={COBALT_HI} strokeWidth={8} strokeDasharray="4 26" opacity={0.9} transform="translate(-116 0)" />
      <path d="M-480 60 C -700 -60, -900 -420, -1100 -900" fill="none" stroke={COBALT_HI} strokeWidth={8} strokeDasharray="4 26" opacity={0.9} transform="translate(116 0)" />
      {/* street lamps' pools along the roads */}
      {Array.from({length: 18}, (_, i) => (
        <circle key={`sl${i}`} cx={i % 2 ? 380 : 700} cy={2400 - i * 260} r={180} fill={`url(#${id('glow')})`} />
      ))}
      {/* the traffic far up the avenue and along the right street */}
      {flow(1, 14, 6, 3600).map((y, i) => (
        <circle key={`ta${i}`} cx={470} cy={-1500 + y} r={9} fill="#FFF1D8" opacity={0.85} />
      ))}
      {flow(2, 14, 7, 3600).map((y, i) => (
        <circle key={`tb${i}`} cx={610} cy={2100 - y} r={9} fill="#FF5A4F" opacity={0.8} />
      ))}
      {flow(3, 12, 6, 2400).map((x, i) => (
        <circle key={`tc${i}`} cx={800 + x} cy={660} r={8} fill="#FFF1D8" opacity={0.8} />
      ))}
    </g>
  );
};

/** the routes the three of them want, drawn from the car's nose to each exit (dashed cobalt, one after another) */
const Routes: React.FC<{k: [number, number, number]; from: [number, number]; flick?: number}> = ({k, from, flick = 1}) => {
  const [x, y] = from;
  const ds = [
    `M${x} ${y} C ${x} 760, 640 700, 900 700 L 1300 700`,
    `M${x} ${y} L ${x} -200`,
    `M${x} ${y} C ${x} 640, 420 520, 200 420 L -300 180`,
  ];
  return (
    <g>
      {ds.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={COBALT_HI} strokeWidth={14} strokeLinecap="round" strokeDasharray="1 34" pathLength={1000} strokeDashoffset={0} opacity={k[i] * flick} style={{strokeDasharray: `${(k[i] * 1000).toFixed(0)} 1000`}} />
      ))}
    </g>
  );
};

/** heads and shoulders seen from straight above through the panoramic roof (dark hair, the cool light on the crown) */
const HeadTop: React.FC<{x: number; y: number; s: number; rot?: number; hair?: string}> = ({x, y, s, rot = 0, hair = '#0A0B0E'}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <ellipse cx={0} cy={10} rx={46} ry={26} fill="#05060A" />
    <ellipse cx={0} cy={0} rx={21} ry={24} fill={hair} />
    <ellipse cx={-5} cy={-8} rx={9} ry={7} fill={COBALT_HI} opacity={0.18} />
  </g>
);
/** an arm out of the car from above: the sleeve, the cool-lit hand, the finger pointing */
const ArmTop: React.FC<{x: number; y: number; a: number; len: number; k: number}> = ({x, y, a, len, k}) => {
  if (k <= 0.01) return null;
  const L = len * k;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={`M0 -19 L ${L - 30} -15 L ${L - 30} 15 L 0 19 Z`} fill="#1C2130" />
      <path d={`M0 -19 L ${L - 30} -15`} stroke={COBALT_HI} strokeWidth={4} opacity={0.7} />
      <ellipse cx={L - 18} cy={0} rx={22} ry={16} fill="#A9BCF2" />
      <path d={`M${L - 4} -5 L ${L + 30} -4 L ${L + 30} 4 L ${L - 4} 6 Z`} fill="#A9BCF2" />
    </g>
  );
};
const Tag: React.FC<{x: number; y: number; text: string; arrow: 'r' | 'u' | 'l'; k: number}> = ({x, y, text, arrow, k}) => {
  if (k <= 0.01) return null;
  const s = E.outBack(clamp(k));
  const ar = arrow === 'r' ? 'M-20 0 H 18 M6 -12 L 18 0 L 6 12' : arrow === 'u' ? 'M0 20 V -18 M-12 -6 L 0 -18 L 12 -6' : 'M14 14 L -14 -14 M-14 2 V -14 H 2';
  const w = 110 + text.length * 31;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={clamp(k * 3)}>
      <rect x={-w / 2} y={-46} width={w} height={92} rx={46} fill="#FFFFFF" />
      <g transform={`translate(${-w / 2 + 52} 0)`}>
        <circle r={30} fill={COBALT} />
        <path d={ar} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" transform="scale(0.78)" />
      </g>
      <text x={-w / 2 + 96} y={15} fontFamily={F.sans} fontWeight={600} fontSize={44} fill="#0B0B0B">
        {mtav(text)}
      </text>
    </g>
  );
};

// ---- 4 top: the car from straight above, rolling up to the fork; three arms out of it and three routes; the driver's
// question. The car can't decide: its nose wavers, both indicators blink in turn -------------------------------------------
const TopShot: React.FC = () => {
  const {t, len, L} = useShot('top');
  const a = [L('arms', 0), L('arms', 1), L('arms', 2)];
  const ks = a.map((x) => sp(t, x, 170, 14)) as [number, number, number];
  const carY = lerp(1320, 1050, E.out2(prog(t, 0, len)));
  const head = Math.sin(t / 7) * 3 * clamp((t - a[2]) / 10);
  const z = lerp(1.0, 1.08, E.inOut(prog(t, 0, len))) * punch(t, L('drv'), 0.04, 0.6);
  const CL = 440;
  const q = CL / 560; // the cabin's people were placed for a 560 px car
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden'}}>
      <Svg>
        <g transform={`translate(540 1110) scale(${z}) translate(-540 ${-carY})`}>
          <City t={t} uid="tp" detail={1} />
          <Routes k={[E.out(prog(t, a[0], 16)), E.out(prog(t, a[1], 16)), E.out(prog(t, a[2], 16))]} from={[540, carY - CL / 2 - 10]} />
          <Car uid="tc" x={540} y={carY} len={CL} view="top" body="ev" paint={1} frame={t} heading={head} speed={0.15} time="night" lights={{head: 1, tail: 1, left: t > a[2] ? 1 : 0, right: t > a[0] ? 1 : 0}} />
          <g transform={`translate(540 ${carY}) rotate(${head}) scale(${q})`}>
            {/* through the glass roof: the driver (front left), mom (front right), Luka (back left), Gio leaning in (back middle) */}
            <HeadTop x={-46} y={-40} s={1} />
            <HeadTop x={48} y={-36} s={0.98} hair="#15171C" />
            <HeadTop x={-50} y={92} s={0.96} hair="#0B0C10" rot={-20} />
            <HeadTop x={14} y={56} s={0.98} rot={8} />
            <ArmTop x={74} y={-30} a={-8} len={190} k={ks[0]} />
            <ArmTop x={14} y={30} a={-90} len={150} k={ks[1]} />
            <ArmTop x={-76} y={82} a={-150} len={200} k={ks[2]} />
          </g>
          <Tag x={810} y={carY - 150} text="მარჯვნივ" arrow="r" k={ks[0]} />
          <Tag x={540} y={carY - 480} text="პირდაპირ" arrow="u" k={ks[1]} />
          <Tag x={250} y={carY - 110} text="ხიდზე" arrow="l" k={ks[2]} />
        </g>
      </Svg>
    </AbsoluteFill>
  );
};

// ---- 5 far: the sudden pull to the sky: the whole city at night, the river, the bridge, the traffic; the car a white dot at
// the fork, its three routes flickering, the three of them heard from up here ---------------------------------------------
const FarShot: React.FC = () => {
  const {t, len} = useShot('far');
  const z = lerp(0.3, 0.27, E.out(prog(t, 0, len))) * (1 + 0.12 * (1 - E.outExpo(clamp(t / 10))));
  const flick = 0.55 + 0.45 * Math.sin(t / 2.4);
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden'}}>
      <Svg>
        <g transform={`translate(540 880) scale(${z}) translate(-420 -560)`}>
          <City t={t + 40} uid="fa" detail={0} />
          <Routes k={[1, 1, 1]} from={[540, 890]} flick={flick} />
          <Car uid="fc" x={540} y={1160} len={560} view="top" body="ev" paint={1} frame={t} speed={0} time="night" lights={{head: 1, tail: 1, hazard: 1}} />
          <circle cx={540} cy={1160} r={520} fill="none" stroke="#FFFFFF" strokeWidth={10} opacity={0.35 * flick} />
        </g>
      </Svg>
    </AbsoluteFill>
  );
};

// ---- 6 drv2: back in close: the driver, both hands on his head, „ეს მანქანაა თუ პარლამენტი?!"; on the tape stop the frame
// freezes and drains to grey --------------------------------------------------------------------------------------------
const Drv2Shot: React.FC = () => {
  const {t, len, L} = useShot('drv2');
  const st = L('stop');
  const tf = Math.min(t, st);
  const drain = clamp((t - st) / 8);
  const s = punch(tf, L('drv2') + 18, 0.07, 0.5) * lerp(1.04, 1.0, E.out(prog(tf, 0, 12)));
  const jx = shake(tf, L('drv2') + 19, 10, 12, 0.7);
  return (
    <AbsoluteFill style={{background: NIGHT, overflow: 'hidden', filter: `saturate(${1 - drain}) brightness(${1 - 0.45 * drain})`}}>
      <div style={cam(s, 540, 760, jx)}>
        <Svg>
          <CabinDark uid="dr" />
          <Window t={tf} uid="dr" dir={-1} speed={1.2} glass={[[-60, 360], [1140, 300], [1140, 1300], [-60, 1300]]} seed={19} />
          <Driver uid="d1" x={560} y={760} size={1560} frame={tf} pose="handsHead" face="angry" turn={-0.5} acts={[{at: L('drv2') + 17, pose: 'shrug', face: 'angry'}]} />
          <SeatBand y={1170} uid="dr" side={1} />
          {/* the wheel's rim, near, at the foot of the frame */}
          <path d="M-120 1900 C 80 1560, 560 1480, 900 1640" fill="none" stroke="#020305" strokeWidth={96} strokeLinecap="round" />
          <path d="M-120 1900 C 80 1560, 560 1480, 900 1640" fill="none" stroke="#273049" strokeWidth={4} strokeLinecap="round" transform="translate(0 -46)" />
        </Svg>
      </div>
    </AbsoluteFill>
  );
};

// ---- 8 nav: on the white, the phone rises with the navigator on its screen; the one calm voice; mom's „ხომ გითხარი!" -------
const NavShot: React.FC = () => {
  const {t, L} = useShot('nav');
  const k = sp(t, 0, 120, 17);
  const cy = lerp(2500, 820, k);
  const s = punch(t, L('mom2'), 0.03, 0.6);
  return (
    <AbsoluteFill style={{background: '#FFFFFF', overflow: 'hidden'}}>
      <div style={cam(s, 540, 830)}>
        <Iphone cx={540} cy={cy + Math.sin(t / 28) * 4} w={560} src="17-nav-drive" view={{x: 0.5, y: 0.5, zoom: 1}} glint={clamp((t - 14) / 30)} shadow={1} />
      </div>
    </AbsoluteFill>
  );
};

const SHOTS: Record<string, React.FC> = {mom: MomShot, gio: GioShot, luka: LukaShot, top: TopShot, far: FarShot, drv2: Drv2Shot, black: () => <AbsoluteFill style={{background: '#000'}} />, nav: NavShot};

export const NavHook: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {TL.shots.map((s) => {
      const C = SHOTS[s.id];
      return (
        <Sequence key={s.id} from={fr(s.from)} durationInFrames={fr(s.to) - fr(s.from)} layout="none">
          <AbsoluteFill>
            <C />
          </AbsoluteFill>
        </Sequence>
      );
    })}
    <Subs cuts={TL.shots.map((s) => fr(s.from))} />
    {audio && <Audio src={staticFile('vo/navhook/mix.wav')} />}
  </AbsoluteFill>
);
export const HOOK_TOTAL = TOTAL;
