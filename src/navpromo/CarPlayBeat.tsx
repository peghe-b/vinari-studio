// CARPLAY, A PROMISE: a self-contained segment (the shot's `live` in timeline.json). A refined 2020s cabin from the passenger
// side: the wheel at the left edge, a wide floating centre screen, a daytime street ahead, the phone in a dash holder (how it
// works TODAY). First Nelson's real „ახლა მარჯვნივ მოუხვიე." plays through the car's own speaker (present tense, true today:
// the voice already plays over Bluetooth or CarPlay) while the centre screen sleeps. Then, on „მალე", the screen wakes into a
// CarPlay-STYLE layout drawn by us (a plain rail of three blank squares: no Apple icons, logo or trade dress) with OUR white
// map, a black route and a Georgian manoeuvre banner, and a „მალე" chip that stays the whole beat, so it never reads as
// today. THE SWAP, the day Apple grants the entitlement: live = true plays the real CarPlay recording
// (public/navpromo/carplay-live.mp4) in the screen and drops the chip; the narrator line becomes „ახლა ქარფლეიზეც ნახავ."
// (the whole narrator take is voiced again: one request); the segment keeps its length.
import React, {useId} from 'react';
import {OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {Car} from './kit/car';
import {IlloDefs} from './kit/solid';
import {clamp, E, ev, fr, GREEN, INK, lerp, prog, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const SCR = {x: 300, y: 770, w: 560, h: 350};

const DrawnCarPlay: React.FC<{t: number; wake: number}> = ({t, wake}) => {
  const k = clamp((t - wake) / 8);
  const rail = 68;
  const mx = SCR.x + rail;
  const mw = SCR.w - rail;
  return (
    <g opacity={k}>
      <rect x={SCR.x} y={SCR.y} width={rail} height={SCR.h} fill="#1A1A1A" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={SCR.x + 14} y={SCR.y + 40 + i * 74} width={40} height={40} rx={10} fill="#3A3A3A" />
      ))}
      <rect x={mx} y={SCR.y} width={mw} height={SCR.h} fill="#F6F6F6" />
      <g clipPath="url(#np-cp-clip)">
        {/* our white map: quiet grey streets */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`h${i}`} x1={mx} y1={SCR.y + 30 + i * 62} x2={mx + mw} y2={SCR.y + 6 + i * 62} stroke="#DCDCDC" strokeWidth={i === 3 ? 12 : 6} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`v${i}`} x1={mx + 30 + i * 74} y1={SCR.y} x2={mx + 10 + i * 74} y2={SCR.y + SCR.h} stroke="#DCDCDC" strokeWidth={i === 4 ? 12 : 6} />
        ))}
        <path d={`M${mx - 10} ${SCR.y + SCR.h - 40} Q${mx + 200} ${SCR.y + SCR.h - 120} ${mx + mw + 20} ${SCR.y + 90}`} stroke="#CFDCE6" strokeWidth={22} fill="none" />
        {/* the route: up the avenue, then left */}
        <path d={`M${mx + 306} ${SCR.y + SCR.h + 10} L${mx + 300} ${SCR.y + 200} L${mx + 290} ${SCR.y + 150} L${mx + 120} ${SCR.y + 170}`} stroke="#0B0B0B" strokeWidth={9} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M${mx + 304} ${SCR.y + 262} l-16 30 l16 -8 l16 8 Z`} fill="#0B0B0B" />
        {/* the manoeuvre banner, the app's own style */}
        <rect x={mx + 14} y={SCR.y + 14} width={300} height={76} rx={16} fill="#111111" />
        <path d={`M${mx + 60} ${SCR.y + 74} L${mx + 60} ${SCR.y + 48} Q${mx + 60} ${SCR.y + 38} ${mx + 50} ${SCR.y + 38} L${mx + 40} ${SCR.y + 38}`} stroke="#FFFFFF" strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d={`M${mx + 42} ${SCR.y + 28} L${mx + 30} ${SCR.y + 38} L${mx + 42} ${SCR.y + 48}`} stroke="#FFFFFF" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={mx + 86} y={SCR.y + 50} fontFamily={F.sans} fontWeight={600} fontSize={26} fill="#FFFFFF">
          400 მ
        </text>
        <text x={mx + 86} y={SCR.y + 78} fontFamily={F.sans} fontWeight={400} fontSize={19} fill="#E6E6E6">
          მარცხნივ მოუხვიე
        </text>
      </g>
    </g>
  );
};

export const CarPlayBeat: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const s = shot('carplay');
  const live = Boolean(s.live);
  const base = fr(s.from);
  const end = fr(s.to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const now = L('now');
  const wake = L('wake');
  const chip = L('chip');
  const push = E.inOut(prog(t, wake + 12, end - wake - 12));
  const zoom = 1 + 0.015 * clamp(t / wake) + 0.13 * push;
  const glint = t >= wake && t < wake + 18 ? (t - wake) / 18 : -1;
  const rings = t >= now && t < now + 44 ? [0, 1, 2].map((i) => ((t - now + i * 7) % 21) / 21) : [];
  const chipK = sp(t, chip, 230, 13);
  // the street ahead slides by a little
  const road = (t * 3) % 60;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', overflow: 'hidden'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <IlloDefs uid={uid} />
        <defs>
          <clipPath id="np-cp-clip">
            <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} rx={24} />
          </clipPath>
          <linearGradient id="np-cp-dash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DADADA" />
            <stop offset="1" stopColor="#C4C4C4" />
          </linearGradient>
        </defs>
        <g transform={`translate(580 945) scale(${zoom}) translate(-580 -945)`}>
          {/* outside: a daytime street, unnamed */}
          <rect x={-100} y={-100} width={1300} height={900} fill="#FFFFFF" />
          <path d="M-100 620 L140 560 L140 330 L230 330 L230 520 L330 500 L330 250 L470 250 L470 470 L560 470" fill="#E9E9E9" />
          <path d="M600 470 L700 470 L700 290 L820 290 L820 500 L900 520 L900 360 L1010 360 L1010 560 L1200 620 L1200 800 L-100 800 Z" fill="#E9E9E9" />
          <path d="M-100 800 L520 560 L640 560 L1200 800 Z" fill="#D9D9D9" />
          {[0, 1, 2, 3].map((i) => {
            const z = 1 + i * 0.9 + road / 60;
            const y1 = 560 + 240 / z;
            const y2 = 560 + 240 / (z + 0.4);
            return <line key={i} x1={580} y1={y1} x2={580} y2={y2} stroke="#FFFFFF" strokeWidth={Math.max(2, 10 / z)} />;
          })}
          <Car uid={uid} x={600} y={640} len={170} view="rear" body="suv" paint={3} frame={t} speed={0.3} />
          {/* the windshield's frame: the roof liner and the A-pillars */}
          <path d="M-100 -100 L1200 -100 L1200 110 Q560 70 -100 120 Z" fill="#BDBDBD" />
          <path d="M1200 60 L1060 60 L880 760 L1200 760 Z" fill="#9A9A9A" />
          <path d="M-100 80 L40 80 L170 760 L-100 760 Z" fill="#9A9A9A" />
          {/* the dashboard */}
          <path d="M-100 700 Q560 620 1200 700 L1200 2100 L-100 2100 Z" fill="url(#np-cp-dash)" />
          <path d="M-100 700 Q560 620 1200 700" fill="none" stroke="#A8A8A8" strokeWidth={3} />
          <path d="M-100 1180 Q560 1130 1200 1180 L1200 2100 L-100 2100 Z" fill="#D2D2D2" />
          <path d="M360 1240 L800 1240 L860 2100 L300 2100 Z" fill="#C8C8C8" />
          <rect x={450} y={1300} width={260} height={90} rx={18} fill="#BDBDBD" />
          {/* the door's speaker at the lower left */}
          <g>
            <circle cx={170} cy={1330} r={92} fill="#BFBFBF" stroke="#A3A3A3" strokeWidth={3} />
            {Array.from({length: 61}, (_, i) => {
              const a = i * 2.39996;
              const r = 78 * Math.sqrt(i / 61);
              return <circle key={i} cx={170 + Math.cos(a) * r} cy={1330 + Math.sin(a) * r} r={3.2} fill="#8E8E8E" />;
            })}
            {rings.map((k, i) => (
              <circle key={i} cx={170} cy={1330} r={100 + k * 110} fill="none" stroke={INK} strokeWidth={2.2} opacity={(1 - k) * 0.55} />
            ))}
          </g>
          {/* the steering wheel at the left edge */}
          <g>
            <circle cx={-20} cy={1010} r={330} fill="none" stroke="#3F3F3F" strokeWidth={50} />
            <path d="M-20 1010 L280 960 M-20 1010 L240 1170" stroke="#4A4A4A" strokeWidth={46} strokeLinecap="round" />
            <circle cx={-20} cy={1010} r={110} fill="#4A4A4A" />
          </g>
          {/* the floating centre screen: its stand, its shadow, the glass */}
          <path d={`M${SCR.x + 200} ${SCR.y + SCR.h} L${SCR.x + 230} ${SCR.y + SCR.h + 70} L${SCR.x + 330} ${SCR.y + SCR.h + 70} L${SCR.x + 360} ${SCR.y + SCR.h}`} fill="#8E8E8E" />
          <rect x={SCR.x - 8} y={SCR.y - 8} width={SCR.w + 16} height={SCR.h + 16} rx={30} fill="#0E0E0E" />
          <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} rx={24} fill="#070707" />
          {live ? null : <DrawnCarPlay t={t} wake={wake} />}
          {glint >= 0 ? (
            <g clipPath="url(#np-cp-clip)">
              <rect x={lerp(SCR.x - 300, SCR.x + SCR.w + 100, glint)} y={SCR.y - 50} width={140} height={SCR.h + 100} fill="#FFFFFF" opacity={0.35} transform={`skewX(-20)`} />
            </g>
          ) : null}
          {/* the phone in its dash holder, right of the screen: how it works today */}
          <g>
            <rect x={902} y={872} width={60} height={34} rx={6} fill="#5A5A5A" />
            <rect x={884} y={790} width={96} height={196} rx={18} fill="#111111" />
            <rect x={890} y={796} width={84} height={184} rx={14} fill="#F2F2F2" />
            <path d="M932 960 L930 880 L912 850" stroke={GREEN} strokeWidth={5} fill="none" strokeLinecap="round" />
            <rect x={898} y={804} width={68} height={26} rx={6} fill="#111111" />
          </g>
        </g>
      </svg>
      {live ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(580px, 945px) scale(${zoom}) translate(-580px, -945px)`, transformOrigin: '0 0'}}>
          <div style={{position: 'absolute', left: SCR.x, top: SCR.y, width: SCR.w, height: SCR.h, borderRadius: 24, overflow: 'hidden'}}>
            <OffthreadVideo src={staticFile('navpromo/carplay-live.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover'}} muted />
          </div>
        </div>
      ) : null}
      {/* the „მალე" chip on the screen's upper right corner: it stays all beat */}
      {!live && t >= chip ? (
        <div
          style={{
            position: 'absolute',
            left: 580 + (SCR.x + SCR.w - 18 - 580) * zoom - 150,
            top: 945 + (SCR.y - 22 - 945) * zoom,
            width: 150,
            display: 'flex',
            justifyContent: 'flex-end',
            transform: `scale(${chipK})`,
            transformOrigin: '100% 50%',
          }}
        >
          <div style={{background: INK, color: '#FFFFFF', borderRadius: 40, padding: '10px 24px 12px', fontFamily: F.sans, fontWeight: 600, fontSize: 44, lineHeight: 1, whiteSpace: 'nowrap', boxShadow: '0 8px 22px rgba(0,0,0,0.25)'}}>{mtav('მალე')}</div>
        </div>
      ) : null}
    </div>
  );
};
