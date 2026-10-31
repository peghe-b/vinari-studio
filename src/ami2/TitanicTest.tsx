// The Titanic-style test (OPUSCAR 98 no. 70, „Blueprint Developing into 3D Sunset"; the owner, 31 Oct: „რასაც შენ ფიქრობ, ის
// ააწყე, Titanic-იც სცადე"). Two stills of what would be one unbroken move:
//   T1  the opening: our crossover as a general-arrangement sheet, white edge lines on Prussian-blue paper (uneven exposure,
//       folds, hidden lines dashed, dimension lines, the title block), the OBD-II port and the fuel filler marked
//   T2  the signature look: the same crossover by the sea at the golden hour (a Black Sea promenade), low amber sun behind it,
//       warm shadows, glitter on the water, mist on the far towers, shallow focus, gentle bloom, fine grain
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../tokens';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {viewOf} from './kit/street';
import {Car, P, PORT, px, py} from '../amintho/CoverLineB';

const Grain: React.FC<{amount: number; seed: number; size?: number}> = ({amount, seed, size = 0.8}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: amount}}>
    <filter id={`tg${seed}`}>
      <feTurbulence type="fractalNoise" baseFrequency={size} numOctaves={2} seed={seed} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={1080} height={1920} filter={`url(#tg${seed})`} />
  </svg>
);

// ---- T1: the blueprint ----------------------------------------------------------------------------------------------------------
const WL = 'rgba(236,242,255,0.95)';
const WL2 = 'rgba(236,242,255,0.62)';
const Blueprint: React.FC = () => {
  const S = 0.84; // the car drawing (CoverLineB's coordinates) scaled into the sheet
  const tx = 60;
  const ty = -330;
  const X = (x: number) => tx + x * S;
  const Y = (y: number) => ty + y * S;
  const port = {x: X(px(PORT.x)), y: Y(py(PORT.y))};
  const fuel = {x: X(px(4190)), y: Y(py(1180))};
  const ground = Y(py(0));
  const front = X(px(0));
  const rear = X(px(4924));
  const roof = Y(py(1808));
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg, #12306B 0%, #1B3E7C 45%, #244D8F 100%)', overflow: 'hidden'}}>
      {/* uneven exposure, the paper's folds */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 30% 35%, rgba(70,110,180,0.35), rgba(0,0,0,0) 70%), radial-gradient(ellipse 50% 35% at 75% 75%, rgba(10,25,60,0.45), rgba(0,0,0,0) 70%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <path d="M540 0L540 1920" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
        <path d="M543 0L543 1920" stroke="rgba(0,0,20,0.18)" strokeWidth={4} />
        <path d="M0 960L1080 960" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <path d="M0 963L1080 963" stroke="rgba(0,0,20,0.16)" strokeWidth={4} />
        {/* the sheet's border */}
        <rect x={40} y={180} width={1000} height={1560} fill="none" stroke={WL2} strokeWidth={2} />
        <rect x={52} y={192} width={976} height={1536} fill="none" stroke={WL2} strokeWidth={1} />
        {/* the grid */}
        {Array.from({length: 13}, (_, i) => <path key={`v${i}`} d={`M${52 + i * 81.3} 192V1728`} stroke="rgba(236,242,255,0.07)" strokeWidth={1} />)}
        {Array.from({length: 19}, (_, i) => <path key={`h${i}`} d={`M52 ${192 + i * 85.3}H1028`} stroke="rgba(236,242,255,0.07)" strokeWidth={1} />)}
      </svg>
      {/* the car in white lines: the light drawing inverted and screened onto the blue */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, filter: 'invert(1)', mixBlendMode: 'screen'}}>
        <g transform={`translate(${tx} ${ty}) scale(${S})`}>
          <Car />
        </g>
      </svg>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}} fill="none" strokeLinecap="round">
        {/* hidden lines: the engine under the bonnet, the fuel tank under the rear seat, dashed */}
        <g stroke={WL2} strokeWidth={1.6} strokeDasharray="10 7">
          <path d={`M${X(px(330))} ${Y(py(560))}H${X(px(1450))}V${Y(py(1020))}H${X(px(330))}Z`} />
          <path d={`M${X(px(2900))} ${Y(py(330))}H${X(px(3700))}V${Y(py(620))}H${X(px(2900))}Z`} />
          <path d={`M${X(px(3700))} ${Y(py(520))}C${X(px(3900))} ${Y(py(700))} ${X(px(4100))} ${Y(py(1000))} ${fuel.x} ${fuel.y}`} />
        </g>
        {/* the ground, the dimension lines */}
        <path d={`M60 ${ground}H1020`} stroke={WL2} strokeWidth={1.4} />
        <g stroke={WL} strokeWidth={1.4}>
          <path d={`M${front} ${ground + 70}H${rear}M${front} ${ground + 50}V${ground + 90}M${rear} ${ground + 50}V${ground + 90}`} />
          <path d={`M${X(px(950))} ${ground + 140}H${X(px(3945))}M${X(px(950))} ${ground + 120}V${ground + 160}M${X(px(3945))} ${ground + 120}V${ground + 160}`} />
          <path d={`M${rear + 40} ${ground}V${roof}M${rear + 20} ${ground}H${rear + 60}M${rear + 20} ${roof}H${rear + 60}`} />
        </g>
        <g fill={WL} fontFamily={F.mono} fontSize={20} letterSpacing={2}>
          <text x={(front + rear) / 2} y={ground + 62} textAnchor="middle" fill={WL} stroke="none">4 924</text>
          <text x={(X(px(950)) + X(px(3945))) / 2} y={ground + 132} textAnchor="middle" stroke="none">2 995</text>
          <text x={rear + 30} y={(ground + roof) / 2} transform={`rotate(-90 ${rear + 30} ${(ground + roof) / 2})`} textAnchor="middle" stroke="none">1 772</text>
        </g>
        {/* the two marks that matter */}
        <circle cx={port.x} cy={port.y} r={13} stroke={WL} strokeWidth={2.2} />
        <path d={`M${port.x} ${port.y - 13}L${port.x - 40} ${port.y - 260}H${port.x - 120}`} stroke={WL} strokeWidth={1.4} />
        <text x={port.x - 128} y={port.y - 268} fontFamily={F.mono} fontSize={22} letterSpacing={2} fill={WL} stroke="none" textAnchor="end">OBD-II · J1962</text>
        <circle cx={fuel.x} cy={fuel.y} r={13} stroke={WL} strokeWidth={2.2} />
        <path d={`M${fuel.x} ${fuel.y - 13}L${fuel.x + 20} ${fuel.y - 300}H${fuel.x - 60}`} stroke={WL} strokeWidth={1.4} />
        <text x={fuel.x - 68} y={fuel.y - 308} fontFamily={F.mono} fontSize={22} letterSpacing={2} fill={WL} stroke="none" textAnchor="end">FUEL CAP · EVAP</text>
        {/* the title block */}
        <g stroke={WL2} strokeWidth={1.4}>
          <rect x={560} y={1520} width={468} height={208} />
          <path d="M560 1580H1028M560 1640H1028M800 1640V1728" />
        </g>
        <g fontFamily={F.mono} fill={WL} stroke="none" letterSpacing={2}>
          <text x={580} y={1561} fontSize={26}>VINARI</text>
          <text x={580} y={1621} fontSize={18} fill={WL2}>CROSSOVER · SIDE ELEVATION</text>
          <text x={580} y={1690} fontSize={16} fill={WL2}>SCALE 1:25</text>
          <text x={820} y={1690} fontSize={16} fill={WL2}>SHEET 1/1 · 31.10.26</text>
        </g>
      </svg>
      <Grain amount={0.14} seed={5} size={0.9} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 65% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,30,0.45) 100%)'}} />
    </AbsoluteFill>
  );
};

// ---- T2: the golden hour by the sea ------------------------------------------------------------------------------------------------
const Sunset: React.FC = () => {
  const cam: CarCam = {pos: [8.0, 1.9, 13.6], target: [-2.0, 1.2, -1.6], fov: 39};
  const V = viewOf(cam);
  const hz = projectCar(cam, [-400, 0, -2400]).y; // the sea's horizon behind the car
  const sun = projectCar(cam, [-1700, 70, -2600]);
  // glitter on the water: short bright strokes in a column under the sun
  const glitter: React.ReactNode[] = [];
  for (let i = 0; i < 140; i++) {
    const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const q = (Math.sin(i * 78.233) * 12543.123) % 1;
    const y = hz + 6 + Math.abs(q) * 220;
    const spread = 30 + (y - hz) * 0.9;
    const x = sun.x + (r * 2 - 1) * spread;
    const w = 6 + (y - hz) * 0.12;
    glitter.push(<rect key={i} x={x} y={y} width={w} height={1.6 + (y - hz) * 0.012} fill="#FFE2A6" opacity={0.35 + 0.65 * Math.abs(r)} />);
  }
  const towers: [number, number, number][] = [[600, 60, 30], [640, 92, 18], [664, 70, 26], [700, 128, 16], [722, 84, 34], [770, 150, 14], [790, 96, 24], [826, 70, 40], [880, 112, 18], [906, 64, 30], [950, 86, 22], [990, 58, 36]];
  return (
    <AbsoluteFill style={{background: '#2E3A6E', overflow: 'hidden'}}>
      {/* the far layer, out of focus: the sky, the sun, the sea, the towers in the mist */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, filter: 'blur(4px)'}}>
        <defs>
          <linearGradient id="t2sky" x1="0" y1="0" x2="0" y2={hz} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2C3A72" />
            <stop offset="0.45" stopColor="#6E5E8E" />
            <stop offset="0.78" stopColor="#E09868" />
            <stop offset="1" stopColor="#F6CF8E" />
          </linearGradient>
          <linearGradient id="t2sea" x1="0" y1={hz} x2="0" y2={hz + 600} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B88A6A" />
            <stop offset="0.15" stopColor="#4A4A5C" />
            <stop offset="1" stopColor="#1C2836" />
          </linearGradient>
          <radialGradient id="t2sun" cx={sun.x} cy={sun.y} r={520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF4D6" stopOpacity={1} />
            <stop offset="0.06" stopColor="#FFE1A0" stopOpacity={0.95} />
            <stop offset="0.3" stopColor="#F2B860" stopOpacity={0.45} />
            <stop offset="1" stopColor="#F2B860" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1080} height={hz} fill="url(#t2sky)" />
        <rect y={hz} width={1080} height={1920 - hz} fill="url(#t2sea)" />
        <rect width={1080} height={1920} fill="url(#t2sun)" />
        <circle cx={sun.x} cy={sun.y} r={38} fill="#FFF6E0" />
        {/* the far shore's towers in the mist, a few lights coming on */}
        {towers.map(([x, h, w], i) => (
          <g key={i}>
            <rect x={x} y={hz - h} width={w} height={h} rx={i % 4 === 1 ? w / 2 : 2} fill="#6A5468" opacity={0.55} />
            {i % 3 === 0 ? <rect x={x + w * 0.3} y={hz - h * 0.6} width={2} height={2} fill="#FFD08A" /> : null}
          </g>
        ))}
        <rect y={hz - 40} width={1080} height={60} fill="#E8B48A" opacity={0.35} />
        {glitter}
      </svg>
      {/* the promenade: the road, the sea wall's railing (sharp, near) */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <path d={V.poly([[-9, 0, -200], [-9, 0, 40], [30, 0, 40], [30, 0, -200]])} fill="#2E2226" />
        <path d={V.poly([[-5.2, 0.002, -200], [-5.2, 0.002, 40], [-5.0, 0.002, 40], [-5.0, 0.002, -200]])} fill="#D9B98E" opacity={0.6} />
        <path d={V.poly([[-9, 0, -200], [-9, 0, 40], [-9, 0.75, 40], [-9, 0.75, -200]])} fill="#3A2B2E" />
        {Array.from({length: 40}, (_, i) => -180 + i * 5).map((z) => (
          <path key={z} d={V.poly([[-9.05, 0.75, z], [-9.05, 1.8, z], [-9.05, 1.8, z + 0.12], [-9.05, 0.75, z + 0.12]])} fill="#20171A" />
        ))}
        <path d={V.poly([[-9.05, 1.75, -200], [-9.05, 1.82, -200], [-9.05, 1.82, 40], [-9.05, 1.75, 40]])} fill="#1A1215" />
        {/* the sun's sheen along the wet road toward us */}
        <path d={V.poly([[-6, 0.003, -120], [-3, 0.003, 30], [1, 0.003, 30], [-4, 0.003, -120]])} fill="#F2B860" opacity={0.16} />
      </svg>
      <Car3 cam={cam} sunset={1} night={0} lamp={0.85} shadow={1} at={[-0.6, 0]} yaw={-12} paint="#B9B3A8" far={400} />
      {/* bloom and the warm grade: amber highlights, warm shadows */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${sun.x}px ${sun.y}px, rgba(255,214,150,0.55) 0%, rgba(242,184,96,0.18) 22%, rgba(0,0,0,0) 48%)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(58,37,48,0.55) 0%, rgba(58,37,48,0) 45%)', mixBlendMode: 'multiply'}} />
      <Grain amount={0.07} seed={9} size={0.95} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0) 62%, rgba(20,10,20,0.45) 100%)'}} />
    </AbsoluteFill>
  );
};

export const TitanicTest: React.FC<{v?: 'T1' | 'T2'}> = ({v = 'T1'}) => (v === 'T1' ? <Blueprint /> : <Sunset />);
// keep P exported from CoverLineB referenced (the blueprint marks use px/py only)
void P;
