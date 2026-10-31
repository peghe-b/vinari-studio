// „კიდევ ამინთო", act 1 (2026-10-31): the night road in the studio's illustrated night (the viral navigator promo's look: the
// kit's people and cars, the cobalt light on the skin, the check lamp the one warm thing). Every shot changes within a couple of
// seconds (the owner: "a scene that tells the story, changing in seconds"):
//   dash     the digital cockpit at night; the amber CHECK lamp comes on with the chime
//   head     the driver's face, big, yelling „კიდევ ამინთო?!" (two punch-ins, a shake)
//   road     outside: he stands on the empty road by the crossover (hazards), throws his arms up at the sky, the swear starts
//   aerial   ON THE BLEEP the camera is suddenly far up: a long road through black fields, one blinking car, a dot of a man,
//            birds lifting; the bleep comes back small and muffled from the hills (the owner's own idea)
//   mech1-3  three mechanics, three guesses, three prices slapped on; the spend counter climbs 80 -> 200 -> 1 100 ₾
//   dash2-3  between them the lamp lights again, tighter each time
//   curb     he sits on the curb by the car, the lamp glowing through the windscreen
//   black    black; the amber lamp alone (the cut into VINARI's white world)
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../tokens';
import {mtav} from '../lib/format';
import {Backdrop} from '../scenes/illo/backdrop';
import {Car} from '../scenes/illo/car';
import {Figure} from '../scenes/illo/figure';
import {ground} from '../scenes/illo/palette';
import {DefsSvg} from '../scenes/illo/solid';
import {clamp, E, lerp, prog, shake, sp} from './lib';
import {Cockpit, CP, CP_LAMP} from './kit/cockpit';
import {PartIcon, type PartName} from './kit/parts';
import {AMBER, EngineIcon, useShot} from './kit/stage';

const W = 1080;
const H = 1920;
const NIGHT = () => ground('night');

/** the people: the driver and the three mechanics (the kit's cast picks; never a cartoon face) */
export const DRIVER = {is: 'man', seed: 21, gender: 'm', age: 'adult', hair: 'crop', outfit: 'bomber', beard: 'short', tone: 5, bottom: 'jeans', shoe: 'sneaker'} as never;
const MECHS = [
  {is: 'mechanic', seed: 101, gender: 'm', age: 'adult', hair: 'fade', outfit: 'coverall', beard: 'stubble', tone: 4, hat: 'cap'},
  {is: 'mechanic', seed: 202, gender: 'm', age: 'elder', hair: 'bald', outfit: 'coverall', beard: 'moustache', tone: 6, glasses: 'round'},
  {is: 'mechanic', seed: 303, gender: 'm', age: 'adult', hair: 'buzz', outfit: 'tee', beard: 'full', tone: 7},
] as never[];

const Night: React.FC<{uid: string; children: React.ReactNode}> = ({uid, children}) => (
  <AbsoluteFill style={{background: NIGHT(), overflow: 'hidden'}}>
    <DefsSvg uid={uid} />
    {children}
  </AbsoluteFill>
);
const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);
/** a camera on a whole layer: scale about a point, a small drift, a shake */
const cam = (s: number, ox: number, oy: number, dx = 0, dy = 0, rot = 0): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`,
  transformOrigin: `${ox}px ${oy}px`,
});
const blinkK = (t: number, phase = 0) => ((t + phase) % 15 < 8 ? 1 : 0.12);

// ---- dash: the cockpit, the lamp comes on ----------------------------------------------------------------------------------
const CockpitShot: React.FC<{id: string; on: number; zoom: number; drift: number; speed: number}> = ({id, on, zoom, drift, speed}) => {
  const {t, len} = useShot(id);
  const k = E.out(prog(t, on, 3));
  const s = zoom * (1 + drift * E.out(prog(t, 0, Math.max(1, len))));
  const hit = shake(t, on, 7, 9);
  const lx = 540 + (CP_LAMP.x - CP.w / 2) * 1.0;
  const ly = 900 + (CP_LAMP.y - CP.h / 2) * 1.0;
  return (
    <Night uid={id}>
      <div style={cam(s, lx, ly, hit, 0)}>
        {/* the dashboard's dark curve and the cockpit glass */}
        <Svg>
          <defs>
            <radialGradient id={`${id}amb`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={AMBER} stopOpacity={0.32} />
              <stop offset="1" stopColor={AMBER} stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d="M-200 1180C200 1040 880 1040 1280 1180V2200H-200Z" fill="#0A0B0E" />
          <path d="M-200 700C220 600 860 600 1280 700V720C860 630 220 630 -200 720Z" fill="#16181D" />
          <circle cx={lx} cy={ly} r={520} fill={`url(#${id}amb)`} opacity={k} />
        </Svg>
        <svg width={CP.w} height={CP.h} viewBox={`0 0 ${CP.w} ${CP.h}`} style={{position: 'absolute', left: 540 - CP.w / 2, top: 900 - CP.h / 2, overflow: 'visible'}}>
          <Cockpit uid={id} frame={t} check={k} speed={speed} night={1} />
        </svg>
      </div>
    </Night>
  );
};
export const Dash: React.FC = () => {
  const {L} = useShot('dash');
  return <CockpitShot id="dash" on={L('lampOn')} zoom={1.42} drift={0.06} speed={62} />;
};
const Again: React.FC<{id: string; n: number}> = ({id, n}) => {
  const {L} = useShot(id);
  return <CockpitShot id={id} on={L(`again${n}`)} zoom={1.55 + 0.3 * n} drift={0.05} speed={n === 1 ? 54 : 71} />;
};
export const Dash2: React.FC = () => <Again id="dash2" n={1} />;
export const Dash3: React.FC = () => <Again id="dash3" n={2} />;

// ---- head: his face, yelling ------------------------------------------------------------------------------------------------
export const Head: React.FC = () => {
  const {t, L} = useShot('head');
  const yell = L('yell1') + 2;
  const p1 = 1 + 0.07 * E.out(prog(t, 0, 5));
  const p2 = t >= yell ? 0.08 * E.out(prog(t, yell, 4)) : 0;
  const hit = shake(t, yell, 12, 12);
  return (
    <Night uid="head">
      {/* the car's inside, dark; the amber of the lamp from below, the cobalt night through the window */}
      <Svg>
        <defs>
          <radialGradient id="hdAmb" cx="0.5" cy="1" r="0.8">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.26} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="#0C0D11" />
        <path d="M-40 260L640 160L1120 300V900L-40 1000Z" fill="#121A2E" opacity={0.85} />
        <rect x={0} y={1000} width={W} height={920} fill="url(#hdAmb)" />
      </Svg>
      <div style={cam(p1 + p2, 560, 900, hit, hit * 0.4)}>
        <Svg>
          <Figure uid="head" cast={DRIVER} x={560} y={880} size={4600} crop="head" frame={t} time="night" face={t >= yell - 2 ? 'shock' : 'angry'} pose="stand" turn={-0.15} />
        </Svg>
      </div>
    </Night>
  );
};

// ---- road: out on the empty road, arms up -------------------------------------------------------------------------------
export const Road: React.FC = () => {
  const {t, len, L} = useShot('road');
  const up = L('armsUp');
  const s = 1.0 + 0.16 * E.inOut(prog(t, 0, len + 6));
  const hz = blinkK(t);
  return (
    <Night uid="road">
      <div style={cam(s, 760, 1150)}>
        <Svg>
          <Backdrop kind="highway" uid="road" frame={t} time="night" />
          <Car uid="road" x={330} y={1320} len={640} view="side" dir={1} body="suv" paint="a" frame={t} time="night" lights={{head: 1, tail: 1, hazard: hz, left: hz, right: hz}} />
          <Figure uid="road" cast={DRIVER} x={790} y={1380} size={760} frame={t} time="night" pose={t >= up ? 'armsUp' : 'stand'} face="angry" turn={-0.3} />
        </Svg>
      </div>
    </Night>
  );
};

// ---- aerial: suddenly far up ------------------------------------------------------------------------------------------------
const jit = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const Aerial: React.FC = () => {
  const {t, len, L} = useShot('aerial');
  const birds = L('birds');
  // the camera keeps rising: from a hard jump in to a slow climb
  const s = lerp(1.18, 0.86, E.out(prog(t, 0, len)));
  const rot = lerp(-3, 2, E.inOut(prog(t, 0, len)));
  const hz = blinkK(t, 4);
  const fields: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const y = -400 + row * 230 + jit(i, 2) * 40;
    const w = 380 + jit(i, 3) * 260;
    const x = side < 0 ? 470 - w - 30 - jit(i, 4) * 60 : 610 + 30 + jit(i, 4) * 60;
    const tone = ['#1A1F28', '#151A22', '#1E2430', '#181D26'][Math.floor(jit(i, 5) * 4)];
    fields.push(<rect key={i} x={x} y={y} width={w} height={190 + jit(i, 6) * 50} rx={6} fill={tone} transform={`rotate(${(jit(i, 7) - 0.5) * 4} ${x + w / 2} ${y + 100})`} />);
    // furrows: faint lines in a field
    for (let k = 1; k < 6; k++) fields.push(<line key={`${i}-${k}`} x1={x + 8} x2={x + w - 8} y1={y + k * 34} y2={y + k * 34 + (jit(i, 8) - 0.5) * 6} stroke="#252B36" strokeWidth={2} opacity={0.7} />);
  }
  const flock: React.ReactNode[] = [];
  for (let i = 0; i < 18; i++) {
    const k = t - birds - jit(i, 1) * 6;
    if (k < 0) continue;
    const a = jit(i, 2) * Math.PI * 2;
    const r = k * (5 + jit(i, 3) * 4);
    const bx = 660 + Math.cos(a) * r + jit(i, 4) * 60;
    const by = 1010 + Math.sin(a) * r - k * 1.5;
    const fl = Math.sin(t * 1.3 + i) * 5;
    flock.push(<path key={i} d={`M${bx - 16} ${by + fl}Q${bx - 7} ${by - 9} ${bx} ${by}Q${bx + 7} ${by - 9} ${bx + 16} ${by + fl}`} fill="none" stroke="#DDE2EA" strokeWidth={3.6} strokeLinecap="round" opacity={clamp(1 - k / 70)} />);
  }
  const lamps = [-260, 20, 300, 580, 860, 1140, 1420, 1700, 1980];
  return (
    <Night uid="aerial">
      <div style={cam(s, 560, 1000, 0, 0, rot)}>
        <Svg>
          <rect x={-600} y={-600} width={2280} height={3120} fill="#0B0D11" />
          {fields}
          {/* the road: dark asphalt, the shoulders, the centre dashes */}
          <rect x={470} y={-700} width={140} height={3400} fill="#1B1E25" />
          <rect x={466} y={-700} width={4} height={3400} fill="#2C313B" />
          <rect x={610} y={-700} width={4} height={3400} fill="#2C313B" />
          {Array.from({length: 40}, (_, i) => (
            <rect key={i} x={538} y={-700 + i * 90} width={4} height={44} fill="#5A606B" opacity={0.8} />
          ))}
          {lamps.map((y, i) => (
            <g key={i}>
              <circle cx={i % 2 ? 640 : 440} cy={y} r={46} fill="#E9E4D2" opacity={0.07} />
              <circle cx={i % 2 ? 640 : 440} cy={y} r={5} fill="#F3EEDD" opacity={0.85} />
            </g>
          ))}
          {/* the car, from above, on the shoulder, hazards; the man a dot beside it */}
          <g transform="translate(640 1000)">
            <Car uid="aerial" x={0} y={0} len={124} view="top" body="suv" paint="a" frame={t} time="night" heading={90} lights={{head: 1, hazard: hz}} />
          </g>
          <circle cx={592} cy={1014} r={10} fill="#0A0A0A" opacity={0.6} />
          <circle cx={590} cy={1010} r={9} fill="#DADFE8" />
          {flock}
        </Svg>
      </div>
      {/* the night haze over it all, a little vignette */}
      <Svg>
        <defs>
          <radialGradient id="aeV" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#aeV)" />
      </Svg>
    </Night>
  );
};

// ---- the mechanics ------------------------------------------------------------------------------------------------------------
const fmt = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, '0')}` : String(n));
const TOTALS = [80, 200, 1100];
const PRICES = [80, 120, 900];
const PARTS: PartName[] = ['o2', 'plug', 'cat'];

/** the spend so far, top centre: a dark glass pill, the number rolling up on the price's word */
const Spend: React.FC<{i: number; t: number; at: number}> = ({i, t, at}) => {
  const from = i === 0 ? 0 : TOTALS[i - 1];
  const k = E.out(prog(t, at, 12));
  if (i === 0 && t < at - 2) return null;
  const v = Math.round(lerp(from, TOTALS[i], k));
  const pop = 1 + 0.12 * Math.sin(Math.PI * clamp((t - at) / 10));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 236, display: 'flex', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18, padding: '18px 40px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', boxShadow: `inset 0 0 0 2px ${i === 2 && k > 0.5 ? AMBER : 'rgba(255,255,255,0.14)'}`, transform: `scale(${pop.toFixed(4)})`}}>
        <span style={{fontFamily: F.sans, fontWeight: 400, fontSize: 40, color: 'rgba(255,255,255,0.72)'}}>{mtav('დახარჯული')}</span>
        <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 64, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums'}}>{fmt(v)} ₾</span>
      </div>
    </div>
  );
};

/** the price tag slapped on by the mechanic: a white card, the price big in ink */
const Tag: React.FC<{i: number; t: number; at: number}> = ({i, t, at}) => {
  const k = sp(t, at - 1, 260, 14);
  if (k <= 0) return null;
  const s = lerp(1.6, 1, clamp(k));
  const rot = [-7, 5, -4][i];
  return (
    <div style={{position: 'absolute', left: 120, top: 560, width: 420, height: 230, borderRadius: 26, background: '#FFFFFF', boxShadow: '0 30px 60px rgba(0,0,0,0.45)', transform: `rotate(${rot}deg) scale(${s.toFixed(4)})`, opacity: clamp(k * 3), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 132, color: '#0B0B0B', letterSpacing: -2}}>{PRICES[i]} ₾</span>
    </div>
  );
};

const Mech: React.FC<{i: number}> = ({i}) => {
  const id = `mech${i + 1}`;
  const {t, len, L} = useShot(id);
  const part = L(`part${i + 1}`);
  const price = L(`price${i + 1}`);
  const s = 1.0 + 0.08 * E.inOut(prog(t, 0, len));
  const poses = [['confident', 'pointYou'], ['crossArms', 'crossArms'], ['shrug', 'handsHead']] as const;
  const faces = [['smirk', 'grin'], ['meh', 'meh'], ['worried', 'meh']] as const;
  const after = t >= price;
  const pk = sp(t, part - 2, 170, 15);
  return (
    <Night uid={id}>
      <div style={cam(s, 620, 1200)}>
        <Svg>
          <Backdrop kind="garage" uid={id} frame={t} time="night" />
          <Figure uid={id} cast={MECHS[i]} x={700} y={1400} size={900} frame={t} time="night" pose={poses[i][after ? 1 : 0]} face={faces[i][after ? 1 : 0]} hold={i === 0 ? 'wrench' : i === 2 ? 'clipboard' : null} turn={-0.25} />
          {/* the part he blames, as a clean pictogram in a dark round card */}
          <g opacity={clamp(pk * 2)} transform={`translate(330 1010) scale(${lerp(0.7, 1, clamp(pk)).toFixed(3)})`}>
            <circle cx={0} cy={0} r={150} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.22)" strokeWidth={3} />
            <PartIcon name={PARTS[i]} x={-96} y={-96} size={192} color="#FFFFFF" width={2.2} />
          </g>
        </Svg>
      </div>
      <Tag i={i} t={t} at={price} />
      <Spend i={i} t={t} at={price} />
    </Night>
  );
};
export const Mech1: React.FC = () => <Mech i={0} />;
export const Mech2: React.FC = () => <Mech i={1} />;
export const Mech3: React.FC = () => <Mech i={2} />;

// ---- curb: he sits by the car, the lamp glowing through the glass ---------------------------------------------------------
export const Curb: React.FC = () => {
  const {t, len} = useShot('curb');
  const s = 1.0 + 0.1 * E.inOut(prog(t, 0, len));
  const hz = blinkK(t, 2);
  const glow = 0.75 + 0.25 * Math.sin(t / 9);
  return (
    <Night uid="curb">
      <div style={cam(s, 560, 1240)}>
        <Svg>
          <Backdrop kind="highway" uid="curb" frame={t} time="night" seed={3} />
          <Car uid="curb" x={430} y={1290} len={700} view="side" dir={-1} body="suv" paint="a" frame={t} time="night" lights={{tail: 1, hazard: hz, left: hz, right: hz}} />
          {/* the amber of the lamp, through the windscreen */}
          <circle cx={600} cy={1090} r={120} fill={AMBER} opacity={0.12 * glow} />
          <circle cx={600} cy={1090} r={22} fill={AMBER} opacity={0.5 * glow} />
          <rect x={-200} y={1360} width={1480} height={14} fill="#2A2E36" />
          <Figure uid="curb" cast={DRIVER} x={790} y={1400} size={560} frame={t} time="night" pose="crouch" face="sad" turn={-0.5} />
        </Svg>
      </div>
      <Spend i={2} t={t + 999} at={0} />
    </Night>
  );
};

// ---- black: the lamp alone ------------------------------------------------------------------------------------------------------
export const Black: React.FC = () => {
  const {t, L} = useShot('black');
  const k = E.out(prog(t, L('icon'), 6));
  const s = 1 + 0.06 * E.out(prog(t, 0, 24));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Svg>
        <g transform={`translate(540 900) scale(${s}) translate(-540 -900)`}>
          <EngineIcon x={540} y={900} size={260} k={k} uid="blk" glow={1.4} stroke={1.6} />
        </g>
      </Svg>
    </AbsoluteFill>
  );
};

export const SHOTS: Record<string, React.FC> = {
  dash: Dash,
  head: Head,
  road: Road,
  aerial: Aerial,
  mech1: Mech1,
  dash2: Dash2,
  mech2: Mech2,
  dash3: Dash3,
  mech3: Mech3,
  curb: Curb,
  black: Black,
};
