import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, rand, spr, typeOn} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, halo, L, THEME} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, Haptic, lead, Sfx, TypeSfx} from './common';

type P = {
  label?: string; // mono callout beside the pin, e.g. "აქ დატოვე"
  caption?: string; // line under the map, e.g. "ინტერნეტის გარეშე"
  at?: number; // chunk where the pin drops
};

// A made-up line-art city seen from above, tilted like a map app in 3D, turning slowly
// around the parked car. The lines are bright enough to read at phone size on frame 0 (the cover). A pin drops onto the car, lands, and the ground keeps pulsing.
// No real map data, no street names: the city is generated from a fixed seed.

// (the content box grew to stage 1280: the car sits lower and the city shows more of itself)
const PX = 540; // where the car sits on screen
const PY = 830;
const HALF = 1300; // map extent from the car, in map px

type Block = {x: number; y: number; w: number; h: number; park: boolean; lots: {x: number; y: number; w: number; h: number}[]};

const buildCity = () => {
  // street centre lines, irregular like an old town
  const lines = (seed: number, first: {c: number; w: number}) => {
    const out = [first];
    let c = first.c;
    for (let k = 1; c < HALF; k++) {
      c += 190 + rand(seed + k) * 120;
      out.push({c, w: k % 3 === 0 ? 46 : 26});
    }
    c = first.c;
    for (let k = 1; c > -HALF; k++) {
      c -= 190 + rand(seed - k * 1.7) * 120;
      out.unshift({c, w: k % 3 === 0 ? 46 : 26});
    }
    return out;
  };
  // the car's street: wide, with a parking lane on its left side; the car sits at (0, 0)
  const vx = lines(11, {c: 70, w: 190});
  // the car sits mid-block along its street
  const raw = lines(37, {c: 0, w: 26});
  const i0 = raw.findIndex((l) => l.c === 0);
  const mid = (raw[i0].c + raw[i0 - 1].c) / 2;
  const hy = raw.map((l) => ({...l, c: l.c - mid}));
  const bayY = [hy[i0 - 1].c + hy[i0 - 1].w / 2 + 16, hy[i0].c - hy[i0].w / 2 - 16] as const;
  const blocks: Block[] = [];
  for (let i = 0; i < vx.length - 1; i++) {
    for (let j = 0; j < hy.length - 1; j++) {
      const x = vx[i].c + vx[i].w / 2;
      const y = hy[j].c + hy[j].w / 2;
      const w = vx[i + 1].c - vx[i + 1].w / 2 - x;
      const h = hy[j + 1].c - hy[j + 1].w / 2 - y;
      if (w < 40 || h < 40) continue;
      const seed = i * 31.7 + j * 7.3;
      const park = rand(seed) < 0.08 && Math.abs(x) > 200;
      const lots: Block['lots'] = [];
      if (!park) {
        // building footprints along the block edges, a courtyard in the middle
        const n = 2 + Math.floor(rand(seed + 1) * 3);
        for (let k = 0; k < n; k++) {
          const fw = w / n;
          const inset = 10;
          const depth = Math.min(h * 0.42, 60 + rand(seed + k) * 40);
          const back = depth * (0.7 + rand(seed + k + 9) * 0.3);
          lots.push({x: x + k * fw + inset / 2, y: y + inset, w: fw - inset, h: depth});
          lots.push({x: x + k * fw + inset / 2, y: y + h - inset - back, w: fw - inset, h: back});
        }
      }
      blocks.push({x, y, w, h, park, lots});
    }
  }
  return {vx, hy, blocks, bayY};
};

export const MapPin: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const city = useMemo(buildCity, []);
  const life = Math.min(1, frame / Math.max(1, ctx.dur));
  const cam = ease.camera(life);
  const heading = -14 + 22 * cam; // degrees; the camera turns around the car
  const tilt = 52 - 6 * cam;
  const zoom = 1.08 - 0.08 * prog(frame, base, 22, ease.enter) + 0.05 * cam;
  const mapIn = prog(frame, base, 16);

  const dropAt = p.at !== undefined ? Math.max(base + 10, cueFrame(ctx, p.at)) : base + 14;
  const fall = spr(frame, dropAt, 'enterXL');
  const landAt = dropAt + 11;
  const landed = frame >= landAt;
  const squash = landed ? spr(frame, landAt, 'land') : 0;
  const pinY = -(1 - fall) * 420;
  const pinO = prog(frame, dropAt, 5);
  const since = frame - landAt;
  const labelAt = landAt + 10;

  const green = C.upLine;
  const rings = landed ? [0, 1].map((k) => ((since + k * 30) % 60) / 60) : [];

  return (
    <>
      {/* the map plane, masked to a soft oval so the city fades into the dark, and kept clear
          of the meta bar above the content zone */}
      <div style={{position: 'absolute', inset: 0, WebkitMaskImage: `linear-gradient(180deg, transparent 390px, #000 560px, #000 ${p.caption ? 1010 : 1100}px, transparent ${p.caption ? 1150 : 1270}px)`, maskImage: `linear-gradient(180deg, transparent 390px, #000 560px, #000 ${p.caption ? 1010 : 1100}px, transparent ${p.caption ? 1150 : 1270}px)`}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: mapIn,
          WebkitMaskImage: `radial-gradient(ellipse 64% 34% at 50% ${(PY / 1920) * 100 - 3}%, #000 45%, transparent 100%)`,
          maskImage: `radial-gradient(ellipse 64% 34% at 50% ${(PY / 1920) * 100 - 3}%, #000 45%, transparent 100%)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: `${PX}px ${PY}px`,
            transform: `perspective(1500px) rotateX(${tilt}deg) rotateZ(${heading}deg) scale(${zoom})`,
          }}
        >
          <svg width={HALF * 2} height={HALF * 2} viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} style={{position: 'absolute', left: PX - HALF, top: PY - HALF, overflow: 'visible'}}>
            {city.blocks.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="none" stroke={C.ink} strokeWidth={2} opacity={0.4} />
                {b.park
                  ? Array.from({length: Math.floor((b.w * b.h) / 5200)}, (_, k) => (
                      <circle key={k} cx={b.x + 18 + rand(i * 9 + k) * (b.w - 36)} cy={b.y + 18 + rand(i * 5 + k * 3.1) * (b.h - 36)} r={7 + rand(k + i) * 6} fill="none" stroke={C.ink} strokeWidth={1.5} opacity={0.26} />
                    ))
                  : b.lots.map((l, k) => <rect key={k} x={l.x} y={l.y} width={l.w} height={l.h} rx={3} fill={C.ink} fillOpacity={0.025} stroke={C.ink} strokeWidth={1.2} opacity={0.22} />)}
              </g>
            ))}
            {/* centre dashes on the wide streets */}
            {city.vx.filter((l) => l.w > 30).map((l, i) => (
              <line key={`v${i}`} x1={l.c} x2={l.c} y1={-HALF} y2={HALF} stroke={C.ink} strokeWidth={2} strokeDasharray="18 22" opacity={0.2} />
            ))}
            {city.hy.filter((l) => l.w > 30).map((l, i) => (
              <line key={`h${i}`} x1={-HALF} x2={HALF} y1={l.c} y2={l.c} stroke={C.ink} strokeWidth={2} strokeDasharray="18 22" opacity={0.2} />
            ))}
            {/* parking lane along the car's street: bay lines 58 px apart, the car in one bay */}
            {Array.from({length: 13}, (_, k) => 29 + (k - 6) * 58)
              .filter((y) => y > city.bayY[0] && y < city.bayY[1])
              .map((y) => (
                <line key={`p${y}`} x1={-26} x2={26} y1={y} y2={y} stroke={C.ink} strokeWidth={2} opacity={0.42} />
              ))}
            <line x1={26} x2={26} y1={city.bayY[0]} y2={city.bayY[1]} stroke={C.ink} strokeWidth={2} opacity={0.42} />
            {rings.map((t, k) => (
              <circle key={k} cx={0} cy={0} r={24 + 150 * ease.enter(t)} fill="none" stroke={green} strokeWidth={3} opacity={0.55 * (1 - t) * prog(frame, landAt, 4)} />
            ))}
            {landed ? <circle cx={0} cy={0} r={62} fill={green} opacity={0.08 * (0.6 + 0.4 * Math.sin(since / 9))} /> : null}
            <CarTop x={0} y={0} />
          </svg>
        </div>
      </div>
      </div>

      {/* pin: screen space, always upright */}
      <Pin frame={frame} y={pinY} opacity={pinO} squash={landed ? 1 - 0.1 * Math.sin(Math.min(1, squash) * Math.PI) : 1} glow={landed} color={green} />
      {/* pin shadow on the ground grows as it falls */}
      <div style={{position: 'absolute', left: PX - 30, top: PY - 8, width: 60, height: 16, borderRadius: '50%', background: C.shade, opacity: 0.7 * fall * pinO * THEME.shadowK ** 0.5, filter: 'blur(4px)'}} />

      {p.label ? (
        <>
          <div style={{position: 'absolute', left: PX + 52, top: PY - 118, width: 70 * prog(frame, labelAt - 4, 8, ease.drawOn), height: 2, background: C.ink2}} />
          <div className={TXT} style={{position: 'absolute', left: PX + 136, top: PY - 138, fontFamily: F.mono, fontSize: 30, letterSpacing: '0.05em', color: C.ink, whiteSpace: 'nowrap'}}>{typeOn(mtav(capsLatin(p.label)), frame, labelAt, 1.2)}</div>
        </>
      ) : null}
      {p.caption ? (
        <div className={TXT} style={{position: 'absolute', top: 1170, left: 1080 - L.lowRight, right: 1080 - L.lowRight, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 500, fontSize: 42, color: C.ink2, opacity: spr(frame, labelAt + 8), transform: `translateY(${(1 - spr(frame, labelAt + 8)) * 12}px)`}}>
          {mtav(p.caption)}
        </div>
      ) : null}
      <Compass heading={heading} opacity={prog(frame, base + 6, 12)} />

      <Sfx name="asmr-air" at={dropAt - 1} volume={0.12} /* event: the pin starts to fall (peaks 3 frames in) */ />
      <Sfx name="asmr-pop" at={landAt} volume={0.55} /* event: the pin lands on the car */ />
      <Haptic kind="medium" at={landAt} volume={0.48} /* event: the landing's weight under the pop (a phone speaker keeps its click; the old sub thump it replaces was lost there) */ />
      {p.label ? <Sfx name="asmr-pencil-short" at={labelAt - 4} volume={0.26} len={10} /* event: the leader line draws (8 frames) */ /> : null}
      {p.label ? <TypeSfx text={mtav(capsLatin(p.label))} at={labelAt} cpf={1.2} volume={0.22} /* event: the label types on */ /> : null}
    </>
  );
};

// the parked car from above: body, windscreen, rear window, mirrors
const CarTop: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" opacity={0.95}>
    <rect x={-20} y={-44} width={40} height={88} rx={13} fill={C.bgCenter} />
    <path d="M -15 -17 Q 0 -23 15 -17 L 13 -3 L -13 -3 Z" />
    <path d="M -13 23 L 13 23 L 15 32 Q 0 36 -15 32 Z" />
    <line x1={-20} y1={-12} x2={-25} y2={-14} />
    <line x1={20} y1={-12} x2={25} y2={-14} />
  </g>
);

const Pin: React.FC<{frame: number; y: number; opacity: number; squash: number; glow: boolean; color: string}> = ({y, opacity, squash, glow, color}) => (
  <svg width={140} height={180} viewBox="-70 -170 140 180" style={{position: 'absolute', left: PX - 70, top: PY - 170 + y, opacity, overflow: 'visible', transform: `scaleY(${squash})`, transformOrigin: '50% 94%'}}>
    <path d="M 0 0 C -10 -28 -40 -52 -40 -92 A 40 40 0 1 1 40 -92 C 40 -52 10 -28 0 0 Z" fill={C.bgCenter} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    <circle cx={0} cy={-92} r={14} fill={color} style={{filter: glow ? `drop-shadow(0 0 10px ${halo(color, 1)}) drop-shadow(0 0 22px ${halo(color, 0.53)})` : undefined}} />
  </svg>
);

const Compass: React.FC<{heading: number; opacity: number}> = ({heading, opacity}) => (
  <svg width={80} height={80} viewBox="-40 -40 80 80" style={{position: 'absolute', left: 1080 - L.side - 80, top: 410, opacity}}>
    <circle r={30} fill="none" stroke={C.rule} strokeWidth={1.5} />
    <g transform={`rotate(${heading})`}>
      <path d="M 0 -24 L 6 0 L 0 -4 L -6 0 Z" fill={C.ink} />
      <path d="M 0 24 L 6 0 L 0 4 L -6 0 Z" fill="none" stroke={C.ink3} strokeWidth={1.2} />
      <text className={TXT} x={0} y={-30} textAnchor="middle" fontFamily={F.mono} fontSize={14} fill={C.ink2} transform="translate(0 -4)">
        N
      </text>
    </g>
  </svg>
);
