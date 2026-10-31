// Style tests for the next promo (the owner, 31 Oct: from OPUSCAR 98 he likes 4 French Connection, 5 Rocky, 11 One Battle After
// Another; „მანახე სატესტო კადრები ჩვენ იდეაზე მორგებული"). One still each, our crossover (the diagpromo Car3), no mascot:
//   A  French Connection: a night street under an elevated road, the parked crossover, its amber check lamp the one saturated
//      thing; pushed-16mm grade (low saturation, high contrast, cyan shadows, warm-brown mids), clumpy grain, a low wide lens
//   B  Rocky: sunrise on a hill road above the city, the crossover lit warm from the side, long shadow, cool sky, pink clouds
//   C  One Battle After Another: the long-lens dip road in the bleached steppe, the faded seafoam crossover topping a crest
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {viewOf} from './kit/street';

const Grain: React.FC<{amount: number; seed: number; size?: number}> = ({amount, seed, size = 0.75}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: amount}}>
    <filter id={`gr${seed}`}>
      <feTurbulence type="fractalNoise" baseFrequency={size} numOctaves={2} seed={seed} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={1080} height={1920} filter={`url(#gr${seed})`} />
  </svg>
);
const Vignette: React.FC<{k: number}> = ({k}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${k}) 100%)`}} />
);

// ---- A: French Connection ------------------------------------------------------------------------------------------------
const TestA: React.FC = () => {
  const cam: CarCam = {pos: [3.4, 0.75, 8.6], target: [-1.6, 1.5, -1.5], fov: 62, roll: -2.5};
  const V = viewOf(cam);
  const lamp = projectCar(cam, [-0.6 - 0.35, 1.05, 0.55]);
  const deck: React.ReactNode[] = [];
  // the elevated road over the street: its deck's underside, its girders, the pillars on the far kerb
  deck.push(<path key="deck" d={V.poly([[-14, 7.2, -70], [-14, 7.2, 60], [9, 7.2, 60], [9, 7.2, -70]])} fill="#0E0D0E" />);
  for (let z = -70; z < 60; z += 2.2) deck.push(<path key={`g${z}`} d={V.poly([[-14, 7.19, z], [9, 7.19, z], [9, 6.75, z + 0.25], [-14, 6.75, z + 0.25]])} fill="#191716" />);
  for (let z = -60; z < 60; z += 9) {
    deck.push(<path key={`p${z}`} d={V.poly([[-6.6, 0, z], [-6.6, 7.2, z], [-6.0, 7.2, z], [-6.0, 0, z]])} fill="#141211" />);
    deck.push(<path key={`q${z}`} d={V.poly([[-6.0, 0, z], [-6.0, 7.2, z], [-6.0, 7.2, z + 0.6], [-6.0, 0, z + 0.6]])} fill="#1D1A18" />);
  }
  // the sodium light between the girders falls on the road in hard stripes
  const stripes: React.ReactNode[] = [];
  for (let z = -40; z < 30; z += 2.2) stripes.push(<path key={`s${z}`} d={V.poly([[-6, 0.003, z + 0.6], [1.2, 0.003, z + 0.9], [1.2, 0.003, z + 1.5], [-6, 0.003, z + 1.2]])} fill="#B98A55" opacity={0.18} />);
  return (
    <AbsoluteFill style={{background: '#121011', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: 'saturate(0.45) contrast(1.3) brightness(0.92)'}}>
        <Street cam={cam} uid="ta" look="night" nearTree={false} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {stripes}
          {deck}
        </svg>
        <Car3 cam={cam} night={1} street={0.85} lamp={0.9} shadow={1} at={[-0.6, 0]} yaw={-8} cool={0.08} coolFrom={[6, 4, 8]} />
      </div>
      {/* the grade: cyan in the shadows, warm brown in the mids */}
      <div style={{position: 'absolute', inset: 0, background: '#1E2A2C', mixBlendMode: 'soft-light', opacity: 0.75}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(110,74,52,0) 40%, rgba(110,74,52,0.35) 100%)', mixBlendMode: 'soft-light'}} />
      {/* the hero: the amber check lamp through the windscreen, the one saturated thing */}
      <div style={{position: 'absolute', left: lamp.x - 70, top: lamp.y - 70, width: 140, height: 140, borderRadius: 140, background: 'radial-gradient(circle, rgba(255,170,40,0.95) 0%, rgba(255,140,20,0.45) 30%, rgba(255,120,0,0) 70%)', mixBlendMode: 'screen'}} />
      <Grain amount={0.32} seed={7} size={0.68} />
      <Vignette k={0.6} />
    </AbsoluteFill>
  );
};

// ---- B: Rocky sunrise ---------------------------------------------------------------------------------------------------------
const TestB: React.FC = () => {
  const cam: CarCam = {pos: [4.2, 0.55, 7.2], target: [-0.8, 1.15, -1.2], fov: 40};
  const hz = 1010; // the horizon
  return (
    <AbsoluteFill style={{background: '#7FA3CF', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="tbSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6E95C6" />
            <stop offset="0.55" stopColor="#A9BFD9" />
            <stop offset="0.86" stopColor="#F2C79A" />
            <stop offset="1" stopColor="#F5B27A" />
          </linearGradient>
          <radialGradient id="tbSun" cx="0.08" cy="0.52" r="0.55">
            <stop offset="0" stopColor="#FFE2B0" stopOpacity={1} />
            <stop offset="0.25" stopColor="#F7B877" stopOpacity={0.6} />
            <stop offset="1" stopColor="#F0A060" stopOpacity={0} />
          </radialGradient>
          <filter id="tbBlur"><feGaussianBlur stdDeviation={18} /></filter>
        </defs>
        <rect width={1080} height={hz + 40} fill="url(#tbSky)" />
        <rect width={1080} height={1920} fill="url(#tbSun)" />
        {/* pink undersides of the clouds */}
        <g filter="url(#tbBlur)" opacity={0.85}>
          <ellipse cx={720} cy={430} rx={380} ry={34} fill="#E6B2AE" />
          <ellipse cx={300} cy={560} rx={300} ry={26} fill="#E9BBB0" />
          <ellipse cx={860} cy={650} rx={260} ry={22} fill="#EBC2B4" />
        </g>
        {/* the city far below in the haze, layered hills behind it */}
        <path d={`M0 ${hz - 120}C200 ${hz - 190} 420 ${hz - 160} 600 ${hz - 210}C780 ${hz - 250} 960 ${hz - 170} 1080 ${hz - 200}V${hz + 60}H0Z`} fill="#B79DA2" opacity={0.55} />
        <path d={`M0 ${hz - 50}C260 ${hz - 110} 520 ${hz - 70} 760 ${hz - 120}C900 ${hz - 150} 1000 ${hz - 110} 1080 ${hz - 120}V${hz + 80}H0Z`} fill="#9C7F84" opacity={0.6} />
        {Array.from({length: 46}, (_, i) => {
          const x = (i * 23.7) % 1080;
          const hgt = 18 + ((i * 37) % 60);
          return <rect key={i} x={x} y={hz - hgt + 20} width={18 + (i % 4) * 6} height={hgt} fill="#8A6F70" opacity={0.55} />;
        })}
        {/* the hill road: warm asphalt rising toward us, its kerb, the lit crest */}
        <path d={`M-200 1920L410 ${hz + 60}L700 ${hz + 60}L1280 1920Z`} fill="#4A3B36" />
        <path d={`M-200 1920L410 ${hz + 60}L455 ${hz + 60}L-60 1920Z`} fill="#6A5149" />
        <path d={`M560 ${hz + 70}L548 ${hz + 160}M541 ${hz + 260}L524 ${hz + 420}M512 ${hz + 560}L480 ${hz + 820}`} stroke="#E8C79C" strokeWidth={9} opacity={0.7} />
        {/* the long morning shadow of the car, thrown away from the sun across the road */}
        <path d="M600 1330L1200 1460L1240 1560L620 1470Z" fill="#241A18" opacity={0.55} filter="url(#tbBlur)" />
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: 'sepia(0.35) saturate(1.35) hue-rotate(-8deg) brightness(1.04) contrast(1.06)'}}>
        <Car3 cam={cam} night={0} lamp={0.4} shadow={0.6} at={[-0.6, 0]} yaw={22} paint="#3C3A38" />
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(240,160,96,0.42) 0%, rgba(240,160,96,0) 55%)', mixBlendMode: 'soft-light'}} />
      <Grain amount={0.12} seed={3} size={0.9} />
      <Vignette k={0.35} />
    </AbsoluteFill>
  );
};

// ---- C: One Battle After Another: the dip road -----------------------------------------------------------------------------
const TestC: React.FC = () => {
  // the long lens stacks the dips into waves: each crest a band of road, each further one a little higher and narrower
  const crests = [
    {y: 1720, w: 760, h: 260},
    {y: 1410, w: 560, h: 150},
    {y: 1215, w: 430, h: 95},
    {y: 1090, w: 345, h: 62},
    {y: 1010, w: 290, h: 42},
    {y: 955, w: 250, h: 28},
  ];
  const cam: CarCam = {pos: [0.2, 2.2, 95], target: [0, 1.0, 0], fov: 4.2};
  return (
    <AbsoluteFill style={{background: '#D2AE80', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="tcSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7FB0E0" />
            <stop offset="1" stopColor="#ECE4D2" />
          </linearGradient>
          <filter id="tcHeat"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves={2} seed={4} /><feDisplacementMap in="SourceGraphic" scale={9} /></filter>
        </defs>
        {/* the sky: a thin band at most */}
        <rect width={1080} height={930} fill="url(#tcSky)" />
        <rect y={880} width={1080} height={70} fill="#ECE4D2" />
        {/* the sand, the scrub */}
        <rect y={930} width={1080} height={990} fill="#D2AE80" />
        {Array.from({length: 160}, (_, i) => {
          const y = 940 + ((i * 97) % 960);
          const depth = (y - 930) / 990;
          const x = ((i * 211) % 1080);
          const r = 4 + depth * 26;
          return <ellipse key={i} cx={x} cy={y} rx={r * 1.6} ry={r * 0.7} fill={i % 3 ? '#4E6B3A' : '#3E5A30'} opacity={0.9} />;
        })}
        {/* the road over the dips, far to near (the near ones drawn last) */}
        <g filter="url(#tcHeat)">
          {[...crests].reverse().map((c, i) => (
            <g key={i}>
              <path d={`M${540 - c.w / 2} ${c.y + c.h * 0.15}C${540 - c.w / 2} ${c.y - c.h * 0.45} ${540 + c.w / 2} ${c.y - c.h * 0.45} ${540 + c.w / 2} ${c.y + c.h * 0.15}L${540 + c.w * 0.62} ${c.y + c.h}L${540 - c.w * 0.62} ${c.y + c.h}Z`} fill="#2E2C2A" />
              <path d={`M${540 - c.w * 0.012} ${c.y - c.h * 0.2}L${540 - c.w * 0.016} ${c.y + c.h}M${540 + c.w * 0.012} ${c.y - c.h * 0.2}L${540 + c.w * 0.016} ${c.y + c.h}`} stroke="#E8C24A" strokeWidth={Math.max(1.5, c.w / 120)} />
              <path d={`M${540 - c.w * 0.47} ${c.y}L${540 - c.w * 0.58} ${c.y + c.h}M${540 + c.w * 0.47} ${c.y}L${540 + c.w * 0.58} ${c.y + c.h}`} stroke="#EDE6D8" strokeWidth={Math.max(1.2, c.w / 200)} opacity={0.85} />
              {/* the roadside posts */}
              <rect x={540 + c.w * 0.68} y={c.y - c.h * 0.25} width={Math.max(2, c.w / 90)} height={c.h * 0.5} fill="#F2F2EE" />
              <rect x={540 - c.w * 0.7} y={c.y - c.h * 0.25} width={Math.max(2, c.w / 90)} height={c.h * 0.5} fill="#F2F2EE" />
            </g>
          ))}
        </g>
      </svg>
      {/* the faded seafoam crossover topping the second crest, a little dust behind it */}
      <div style={{position: 'absolute', inset: 0, transform: 'translate(0px, 182px)'}}>
        <Car3 cam={cam} night={0} lamp={0.6} shadow={0.7} at={[0, 0]} yaw={180} paint="#86B5AD" />
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(255,240,216,0.08)', mixBlendMode: 'screen'}} />
      <Grain amount={0.08} seed={11} size={0.95} />
    </AbsoluteFill>
  );
};

export const StyleTest: React.FC<{v?: 'A' | 'B' | 'C'}> = ({v = 'A'}) => (v === 'A' ? <TestA /> : v === 'B' ? <TestB /> : <TestC />);
