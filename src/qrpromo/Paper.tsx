// 3 the paper: from her lit window high on an old Tbilisi house (a carved wooden balcony), the camera flies down the facade
// to the street, where her car stands under the street lamp, front three-quarter (the real 3D saloon, kit/car3d.tsx, in
// the evening light). Under the wiper: a paper with her number. A loupe opens over it: „5•• •• •• ••". Then the picture
// dims to black (the reveal's pause).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SilPalCtx} from './kit/sil/sil';
import {Her} from './kit/her';
import {clamp, E, ev, fr, lerp, prog, shot} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {warmPal} from './kit/room';

const CAM: CarCam = {pos: [Math.sin(0.55) * 15, 3.4, Math.cos(0.55) * 15], target: [0, 0.6, 0.2], fov: 30};
const CAR_DY = 175; // the car canvas sits this much lower in the frame
const NOTE: [number, number, number] = [0.3, 1.035, 0.7];
const LOUPE = {x: 770, y: 545, r: 205};

const Window: React.FC<{x: number; y: number; w: number; h: number; lit: number; uid: string; arch?: boolean}> = ({x, y, w, h, lit, uid, arch = true}) => {
  const d = arch ? `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    <g>
      <path d={d} fill="none" stroke="#2A2320" strokeWidth={22} />
      <path d={d} fill={lit > 0 ? `url(#${uid}lit)` : `url(#${uid}dark)`} />
      {lit > 0 ? <path d={`M${x + 8} ${y + h}V${y + w / 2 + 20}Q${x + w * 0.22} ${y + h * 0.5} ${x + w * 0.16} ${y + h}Z`} fill="#F8D9A8" opacity={0.55} /> : null}
      <path d={`M${x + w / 2} ${y + 6}V${y + h}M${x} ${y + h * 0.62}H${x + w}`} stroke="#2A2320" strokeWidth={7} />
      <path d={d} fill="none" stroke="#7A6656" strokeWidth={3} opacity={0.6} />
    </g>
  );
};

const Balcony: React.FC<{x: number; y: number; w: number}> = ({x, y, w}) => (
  <g>
    {/* the floor board, the carved valance under it, the balusters, the rail */}
    <rect x={x - 10} y={y + 150} width={w + 20} height={18} fill="#3A4542" />
    <path
      d={Array.from({length: Math.floor(w / 40)}, (_, i) => `M${x + i * 40} ${y + 168}q20 34 40 0`).join('')}
      fill="#33403C"
      stroke="#56635F"
      strokeWidth={2}
    />
    {Array.from({length: Math.floor(w / 26) + 1}, (_, i) => (
      <rect key={i} x={x + i * 26 - 3} y={y + 8} width={6} height={142} rx={3} fill="#4E5B57" />
    ))}
    <rect x={x - 14} y={y} width={w + 28} height={16} rx={4} fill="#5E6C68" />
    <rect x={x - 14} y={y} width={w + 28} height={3} rx={1.5} fill="#F2C890" opacity={0.5} />
    <rect x={x - 14} y={y + 66} width={w + 28} height={8} fill="#4A5753" />
  </g>
);

export const Paper: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('paper').from);
  const len = fr(shot('paper').to) - base;
  const landed = fr(ev('landed')) - base;
  const loupeAt = fr(ev('loupe')) - base;
  const dim = fr(ev('dim')) - base;
  const fly = E.inOut(prog(t, 2, landed - 2));
  const oy = lerp(-1650, 0, fly); // the world's y at the frame's top
  const s = lerp(1.06, 1, fly) * (1 + 0.035 * E.inOut(prog(t, landed, len - landed)));
  const lk = E.outBack(prog(t, loupeAt, 12));
  const dimK = E.sine(prog(t, dim, len - dim));
  const uid = 'pp';
  const note = projectCar(CAM, NOTE);
  const nx = 540 + (note.x - 540) * s;
  const ny = 960 + (note.y + CAR_DY - oy - 960) * s;
  const lamp = {x: 196, y: 395};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#121012', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(540px, 960px) scale(${s.toFixed(4)}) translate(-540px, -960px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id={`${uid}fac`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2E2826" />
              <stop offset="1" stopColor="#5C4D43" />
            </linearGradient>
            <linearGradient id={`${uid}lit`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFDCA6" />
              <stop offset="1" stopColor="#E3964E" />
            </linearGradient>
            <linearGradient id={`${uid}dark`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2B3442" />
              <stop offset="1" stopColor="#151A22" />
            </linearGradient>
            <radialGradient id={`${uid}lampglow`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFE2B0" stopOpacity={0.95} />
              <stop offset="0.12" stopColor="#FFC27A" stopOpacity={0.5} />
              <stop offset="0.5" stopColor="#E89A52" stopOpacity={0.12} />
              <stop offset="1" stopColor="#E89A52" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}pool`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#E9B27A" stopOpacity={0.42} />
              <stop offset="0.6" stopColor="#B07A4E" stopOpacity={0.12} />
              <stop offset="1" stopColor="#B07A4E" stopOpacity={0} />
            </radialGradient>
            <linearGradient id={`${uid}road`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1E1B1C" />
              <stop offset="1" stopColor="#141215" />
            </linearGradient>
            <radialGradient id={`${uid}wet`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFC27A" stopOpacity={0.22} />
              <stop offset="1" stopColor="#FFC27A" stopOpacity={0} />
            </radialGradient>
          </defs>
          <g transform={`translate(0 ${(-oy).toFixed(2)})`}>
            {/* the house */}
            <rect x={-40} y={-2300} width={1160} height={3290} fill={`url(#${uid}fac)`} />
            {[-1820, -1380, -520, -60].map((y) => (
              <g key={y}>
                <rect x={-40} y={y} width={1160} height={22} fill="#3E3531" />
                <rect x={-40} y={y} width={1160} height={3} fill="#8A7464" opacity={0.35} />
              </g>
            ))}
            {/* the top floor */}
            <Window uid={uid} x={90} y={-2240} w={210} h={380} lit={0} />
            <Window uid={uid} x={435} y={-2240} w={210} h={380} lit={1} />
            <Window uid={uid} x={780} y={-2240} w={210} h={380} lit={0} />
            {/* her floor: her window lit, her silhouette in it, the carved balcony */}
            <Window uid={uid} x={90} y={-1340} w={210} h={420} lit={0} />
            <Window uid={uid} x={780} y={-1340} w={210} h={420} lit={1} />
            <g>
              <clipPath id={`${uid}her`}>
                <path d={`M425 -900V-1205A115 115 0 0 1 655 -1205V-900Z`} />
              </clipPath>
              <Window uid={uid} x={425} y={-1320} w={230} h={420} lit={1} />
              <g clipPath={`url(#${uid}her)`}>
                <SilPalCtx.Provider value={warmPal(1.1)}>
                  <Her uid={uid} x={556} y={-1092} size={760} crop="bust" frame={t + 600} pose="stand" face="worried" turn={0.55} time="night" />
                </SilPalCtx.Provider>
              </g>
            </g>
            <Balcony x={350} y={-1010} w={380} />
            {/* the floor below */}
            <Window uid={uid} x={90} y={-460} w={210} h={380} lit={1} />
            <Window uid={uid} x={435} y={-460} w={210} h={380} lit={0} />
            <Window uid={uid} x={780} y={-460} w={210} h={380} lit={0} />
            {/* the ground floor: an arched door, a lit shop window */}
            <rect x={-40} y={970} width={1160} height={30} fill="#2A2422" />
            <path d="M650 990V430A170 170 0 0 1 990 430V990Z" fill="#231C19" stroke="#3A302B" strokeWidth={18} />
            <path d="M672 990V440A148 148 0 0 1 968 440V990Z" fill="#3A2A20" />
            <path d="M820 300V990" stroke="#231C19" strokeWidth={8} />
            <circle cx={800} cy={700} r={8} fill="#C9A46A" />
            <circle cx={840} cy={700} r={8} fill="#C9A46A" />
            <Window uid={uid} x={170} y={400} w={330} h={470} lit={1} arch={false} />
            {/* the lamp's light on the wall */}
            <ellipse cx={lamp.x} cy={lamp.y + 160} rx={520} ry={600} fill={`url(#${uid}pool)`} />
            {/* the pavement, the kerb, the road (wet, the lamp in it) */}
            <rect x={-40} y={1000} width={1160} height={70} fill="#4A413C" />
            <rect x={-40} y={1000} width={1160} height={3} fill="#9A8370" opacity={0.5} />
            <rect x={-40} y={1066} width={1160} height={14} fill="#6A5B50" />
            <rect x={-40} y={1080} width={1160} height={900} fill={`url(#${uid}road)`} />
            <ellipse cx={560} cy={1290} rx={620} ry={230} fill={`url(#${uid}pool)`} opacity={0.9} />
            {/* the lamp's long reflection on the wet road, the lane line, the car's dark reflection */}
            <ellipse cx={200} cy={1150} rx={70} ry={44} fill={`url(#${uid}wet)`} opacity={0.75} />
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M${-60 + i * 330} ${1612 + i * 6}L${140 + i * 330} ${1606 + i * 6}L${146 + i * 330} ${1622 + i * 6}L${-56 + i * 330} ${1628 + i * 6}Z`} fill="#CFC6B8" opacity={0.18} />
            ))}
            <ellipse cx={560} cy={1395 + CAR_DY - 175} rx={430} ry={46} fill="#0A1230" opacity={0.35} />
            {/* the street lamp */}
            <rect x={60} y={420} width={16} height={660} rx={6} fill="#1C1A1B" />
            <path d="M68 430Q70 370 150 372H200" fill="none" stroke="#1C1A1B" strokeWidth={10} strokeLinecap="round" />
            <path d={`M${lamp.x - 34} ${lamp.y - 26}H${lamp.x + 34}L${lamp.x + 22} ${lamp.y + 8}H${lamp.x - 22}Z`} fill="#1C1A1B" />
            <ellipse cx={lamp.x} cy={lamp.y + 10} rx={22} ry={8} fill="#FFF0D0" />
            <circle cx={lamp.x} cy={lamp.y + 10} r={300} fill={`url(#${uid}lampglow)`} />
          </g>
        </svg>
        {/* her car (3D), under the lamp */}
        <div style={{position: 'absolute', left: 0, top: -oy + CAR_DY, width: 1080, height: 1920}}>
          <Car3 cam={CAM} night={1} note={1} lamp={0.5} street={1} shadow={1.2} />
        </div>
      </div>
      {/* the loupe on her paper */}
      {lk > 0.001 ? (
        <div style={{position: 'absolute', inset: 0, opacity: clamp(lk * 1.5)}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <line x1={nx} y1={ny} x2={lerp(nx, LOUPE.x, clamp(lk))} y2={lerp(ny, LOUPE.y + LOUPE.r * 0.92, clamp(lk))} stroke="#FFFFFF" strokeWidth={3} opacity={0.85} />
            <circle cx={nx} cy={ny} r={10} fill="none" stroke="#FFFFFF" strokeWidth={3} />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: LOUPE.x - LOUPE.r,
              top: LOUPE.y - LOUPE.r,
              width: LOUPE.r * 2,
              height: LOUPE.r * 2,
              borderRadius: LOUPE.r,
              overflow: 'hidden',
              transform: `scale(${Math.max(0.01, lk)})`,
              transformOrigin: `${nx - (LOUPE.x - LOUPE.r)}px ${ny - (LOUPE.y - LOUPE.r)}px`,
              boxShadow: '0 0 0 6px #FFFFFF, 0 18px 50px rgba(0,0,0,0.55)',
              background: '#15110F',
            }}
          >
            <Car3
              w={LOUPE.r * 2}
              h={LOUPE.r * 2}
              cam={(() => {
                const dx = CAM.pos[0] - NOTE[0];
                const dy = CAM.pos[1] - NOTE[1];
                const dz = CAM.pos[2] - NOTE[2];
                const n = Math.hypot(dx, dy, dz);
                const d = 0.62 - 0.06 * E.inOut(prog(t, loupeAt, len - loupeAt));
                return {pos: [NOTE[0] + (dx / n) * d, NOTE[1] + (dy / n) * d, NOTE[2] + (dz / n) * d], target: NOTE, fov: 24};
              })()}
              night={1}
              note={1}
              lamp={0.5}
              street={1}
            />
          </div>
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dimK}} />
    </div>
  );
};
