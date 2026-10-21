// ACT 1, the problem (the owner, 2026-10-21: a new story, a different woman, glamorous, a bit sexy, tasteful): night
// Tbilisi just after the rain. She drives to a dinner in a fitted black satin dress, bare shoulders, drop earrings, red
// lips and nails; a cheap foreign GPS on the phone low in her lap talks FEET and cannot say „ჭავჭავაძე". She misses the
// turn, the phone slips under the seat, it asks for a U-turn from the floor, she sighs into her hair. Every beat its own
// picture: the lap (the hook), the phone close in her hand, her face, the kinetic „500 ft", the sign sliding past through
// the windscreen, the car outside on the wet street, the slip, the footwell from above, the wide sigh against the city.
// Text only white (the dark) or black.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, rnd, sp} from './lib';
import {breath, cssCam, useShot} from './kit/stage';
import {Bokeh, cityLights, Drops} from './kit/cabin';
import {EX_CALM, mixW, Woman, womanPal, type WPose} from './kit/woman';

/** her skin at night: the street's warm sodium on her (the phone adds its cold glow from below), never a cartoon blue */
export const SKIN_NIGHT = '#D3A288';
import {bodyBox, Phone3, ScreenLayer, project, type Pose} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {Street} from './kit/street';
import {Car3, type CarCam} from './kit/car3d';
import {RED_NAIL} from './kit/woman';
import {silPal} from './kit/sil/sil';
import {GpsScreen} from './kit/gps';

type Pt = [number, number];

// ---- her place in the cabin (stage px) -----------------------------------------------------------------------------------
const SIZE = 1500;
const HX = 330;
const HY = 2060;
export const toStage = (u: Pt): Pt => [HX + (u[0] * SIZE) / 1000, HY + (u[1] * SIZE) / 1000];
export const toBody = (p: Pt): Pt => [((p[0] - HX) * 1000) / SIZE, ((p[1] - HY) * 1000) / SIZE];
/** the wheel's rim (stage px): its centre, half height and half width as seen nearly edge on, its tilt */
export const WHEEL = {x: 745, y: 965, ry: 235, rx: 42, tilt: -18};
/** where her hands go (stage px): the lap (holding the phone), the wheel's top (far hand) */
const LAP: Pt = [585, 1160];
const RIM: Pt = [712, 905];

const EX_DOWN = {...EX_CALM, lid: 0.5, look: -0.9, curve: 0.05};
const EX_ROAD = {...EX_CALM, lid: 0.62, look: 0.2, curve: 0.08};
export const DRIVE: Record<string, WPose> = {
  phone: {head: -15, neck: -5, chest: -1, shrug: 0, near: {to: toBody(LAP), bend: -1, hand: 'hold', ha: 72}, far: {to: toBody(RIM), bend: -1, hand: 'wheel', ha: 150}, legs: 'sit', ex: EX_DOWN, hold: null},
  road: {head: 0, neck: 0, chest: 0, shrug: 0, near: {to: toBody(LAP), bend: -1, hand: 'hold', ha: 72}, far: {to: toBody(RIM), bend: -1, hand: 'wheel', ha: 150}, legs: 'sit', ex: EX_ROAD, hold: null},
};

/** the city on its hills far beyond the street (stage px, inside the window): the ridge, its scattered warm lights, the TV
 *  tower on the top with its red lights blinking; it slides very slowly (the far plane) */
const CityHills: React.FC<{uid: string; t: number}> = ({uid, t}) => {
  const dots = React.useMemo(() => {
    const r = rnd(77);
    const pts: [number, number, number, number][] = [];
    for (let i = 0; i < 260; i++) {
      const x = r() * 1800 - 300;
      const ridge = 560 + 70 * Math.sin(x / 260) + 40 * Math.sin(x / 97 + 1);
      pts.push([x, ridge + 20 + r() * (980 - ridge), 1.4 + r() * 2.8, 0.35 + 0.6 * r()]);
    }
    return pts;
  }, []);
  const dx = -t * 0.9;
  const ridge = Array.from({length: 46}).map((_, i) => {
    const x = -300 + i * 40;
    return `${x} ${(560 + 70 * Math.sin(x / 260) + 40 * Math.sin(x / 97 + 1)).toFixed(1)}`;
  });
  const blink = Math.floor(t / 18) % 2 === 0 ? 1 : 0.3;
  const tx = 620;
  const ty = 560 + 70 * Math.sin(tx / 260) + 40 * Math.sin(tx / 97 + 1);
  return (
    <g transform={`translate(${(dx % 1800).toFixed(1)} 0)`}>
      <defs>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A0E1A" />
          <stop offset="1" stopColor="#2C2430" />
        </linearGradient>
      </defs>
      <rect x={-400} y={300} width={2400} height={800} fill={`url(#${uid}sky)`} />
      <path d={`M${ridge.join('L')}L1540 1100L-300 1100Z`} fill="#101119" />
      {dots.map(([x, y, rr, a], i) => (
        <circle key={i} cx={x} cy={y} r={rr} fill={i % 7 === 0 ? '#F6EEDC' : '#FFC985'} opacity={a} />
      ))}
      <path d={`M${tx - 10} ${ty - 230}L${tx + 10} ${ty - 230}L${tx + 30} ${ty}L${tx - 30} ${ty}Z`} fill="#171820" />
      <path d={`M${tx - 18} ${ty - 120}H${tx + 18}M${tx - 24} ${ty - 60}H${tx + 24}`} stroke="#22242C" strokeWidth={4} />
      <circle cx={tx} cy={ty - 236} r={7} fill="#FF3B30" opacity={blink} />
      <circle cx={tx} cy={ty - 120} r={5} fill="#FF3B30" opacity={blink} />
    </g>
  );
};

/** the cabin, the city behind her and the woman, in stage px; `cam` frames it (scale about a stage point) */
export const DriverSide: React.FC<{
  uid: string;
  t: number;
  pose: WPose;
  cam: {s: number; ox: number; oy: number; dx?: number; dy?: number};
  speed?: number;
  glow?: number; // the phone's cold light on her (0..1)
  level?: number;
  children?: React.ReactNode; // drawn over her in stage px (the wheel's top, her thumb)
  hills?: boolean; // the city on its hills beyond the street (the TV tower's red lights): the wide shot
}> = ({uid, t, pose, cam, speed = 9, glow = 1, level = 1, children, hills = false}) => {
  const lights = React.useMemo(() => cityLights(11, 64), []);
  const ahead = React.useMemo(() => cityLights(23, 26, 2600), []);
  const pal = womanPal(level, true, SKIN_NIGHT);
  const travel = t * speed;
  // the driver's window (behind her), the windscreen (in front), the pillars between
  const WIN = 'M-60 360L760 330Q860 330 930 420L1010 760L1010 1060L-60 1060Z';
  const SCREEN = 'M960 300L1180 300L1180 1010L1020 1010Z';
  const [fx, fy] = toStage([60, -930]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#07080B', overflow: 'hidden'}}>
      <div style={cssCam(cam.s, cam.ox, cam.oy, cam.dx ?? 0, cam.dy ?? 0)}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id={`${uid}night`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B0F1A" />
              <stop offset="0.6" stopColor="#141A28" />
              <stop offset="1" stopColor="#1D1A1C" />
            </linearGradient>
            <linearGradient id={`${uid}tint`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.05} />
              <stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}door`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#17181C" />
              <stop offset="0.25" stopColor="#0F1013" />
              <stop offset="1" stopColor="#08090B" />
            </linearGradient>
            <linearGradient id={`${uid}seat`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0C0D10" />
              <stop offset="0.7" stopColor="#1A1C21" />
              <stop offset="1" stopColor="#111216" />
            </linearGradient>
            <linearGradient id={`${uid}dash`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1C1D22" />
              <stop offset="1" stopColor="#0A0A0C" />
            </linearGradient>
            <radialGradient id={`${uid}cl`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#9FC0FF" stopOpacity={0.5} />
              <stop offset="1" stopColor="#9FC0FF" stopOpacity={0} />
            </radialGradient>
            <clipPath id={`${uid}win`}>
              <path d={WIN} />
            </clipPath>
            <clipPath id={`${uid}scr`}>
              <path d={SCREEN} />
            </clipPath>
          </defs>
          {/* the roof liner and the cabin's dark */}
          <rect x={-200} y={-200} width={1500} height={2400} fill="#0A0B0E" />
          {/* through the driver's window: the night street sliding past, the glass's tint, the raindrops */}
          <g clipPath={`url(#${uid}win)`}>
            <rect x={-100} y={300} width={1200} height={800} fill={`url(#${uid}night)`} />
            {hills ? <CityHills uid={`${uid}h`} t={t} /> : null}
            <Bokeh uid={`${uid}k`} lights={lights} travel={travel} dim={hills ? 0.75 : 1} />
            <rect x={-100} y={300} width={1200} height={800} fill="#0A0E16" opacity={0.28} />
            <rect x={-100} y={300} width={1200} height={800} fill={`url(#${uid}tint)`} />
            <Drops seed={5} x={-60} y={340} w={1060} h={700} t={t} n={54} a={0.8} />
          </g>
          {/* through the windscreen: the road's lights ahead, nearly still */}
          <g clipPath={`url(#${uid}scr)`}>
            <rect x={900} y={280} width={300} height={760} fill={`url(#${uid}night)`} />
            <Bokeh uid={`${uid}a`} lights={ahead} travel={travel * 0.12} len={2600} x0={880} w={320} dim={0.8} />
          </g>
          {/* the window's rubber and the pillars: the B pillar behind her, the A pillar slanting down to the dash */}
          <path d={WIN} fill="none" stroke="#050506" strokeWidth={18} />
          <path d="M-60 330L-60 1100L40 1100L60 340Z" fill="#0B0C0F" />
          <path d="M930 300L1010 300L1060 1010L1010 1010Z" fill="#0C0D10" />
          <path d="M934 304L1004 302" stroke="#2A2D33" strokeWidth={3} opacity={0.8} />
          {/* the door under the window: its leather, the thin ambient strip, the pull */}
          <path d="M-100 1060L1100 1060L1100 2100L-100 2100Z" fill={`url(#${uid}door)`} />
          <path d="M-100 1062L1100 1062" stroke="#3A3E46" strokeWidth={3} opacity={0.7} />
          <path d="M-100 1150Q500 1140 1100 1150" stroke="#E9C59A" strokeWidth={3.2} opacity={0.55} />
          <path d="M-100 1150Q500 1140 1100 1150" stroke="#E9C59A" strokeWidth={14} opacity={0.08} />
          {/* the seat: the backrest raked behind her back, its bolster, the headrest on its posts */}
          <path d="M120 1560L170 900Q180 840 236 830L318 828Q356 836 360 900L380 1560Z" fill={`url(#${uid}seat)`} />
          <path d="M150 1540L196 908Q204 870 240 862" stroke="#2D3038" strokeWidth={5} fill="none" opacity={0.7} />
          <rect x={214} y={760} width={9} height={74} rx={4} fill="#5A5F68" />
          <rect x={262} y={760} width={9} height={74} rx={4} fill="#5A5F68" />
          <path d="M168 640Q172 560 246 554L292 554Q352 560 354 640L350 726Q344 772 290 774L232 774Q176 772 172 726Z" fill={`url(#${uid}seat)`} />
          <path d="M184 650Q190 590 246 584" stroke="#30333B" strokeWidth={4} fill="none" opacity={0.8} />
          {/* the dash beyond the wheel, the instrument display's cold glow on it */}
          <path d="M850 960Q960 930 1120 940L1120 1240L860 1240Z" fill={`url(#${uid}dash)`} />
          <ellipse cx={920} cy={940} rx={120} ry={46} fill={`url(#${uid}cl)`} opacity={0.6} />
        </svg>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Woman uid={`${uid}w`} x={HX} y={HY} size={SIZE} pose={pose} pal={pal} rim={0.9} />
          {/* the wheel's rim over her far hand, nearly edge on, its leather catching the city */}
          <g transform={`rotate(${WHEEL.tilt} ${WHEEL.x} ${WHEEL.y})`}>
            <ellipse cx={WHEEL.x} cy={WHEEL.y} rx={WHEEL.rx} ry={WHEEL.ry} fill="none" stroke="#08090B" strokeWidth={30} />
            <path d={`M${WHEEL.x - WHEEL.rx} ${WHEEL.y}A${WHEEL.rx} ${WHEEL.ry} 0 0 1 ${WHEEL.x} ${WHEEL.y - WHEEL.ry}`} fill="none" stroke="#5F6A80" strokeWidth={3} opacity={0.55} />
          </g>
          {/* the phone's cold light on her face and chest, from below */}
          <defs>
            <radialGradient id={`${uid}gl`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#CFE0FF" stopOpacity={0.4} />
              <stop offset="1" stopColor="#CFE0FF" stopOpacity={0} />
            </radialGradient>
          </defs>
          <ellipse cx={(fx + LAP[0]) / 2} cy={(fy + LAP[1]) / 2} rx={260} ry={420} fill={`url(#${uid}gl)`} opacity={glow} style={{mixBlendMode: 'screen'}} />
          {children}
          {/* the centre console between us and her, in the foreground: its leather top and stitching, the armrest's edge
              catching the door strip's light (it hides her shins: the frame is about her, the lap and the phone) */}
          <defs>
            <linearGradient id={`${uid}con`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1B1C21" />
              <stop offset="0.18" stopColor="#0E0F12" />
              <stop offset="1" stopColor="#060607" />
            </linearGradient>
          </defs>
          <path d="M-120 1268Q300 1232 700 1250Q900 1262 1200 1300L1200 2200L-120 2200Z" fill={`url(#${uid}con)`} />
          <path d="M-120 1268Q300 1232 700 1250Q900 1262 1200 1300" fill="none" stroke="#4A4740" strokeWidth={3} opacity={0.75} />
          <path d="M-120 1290Q300 1256 700 1273Q900 1284 1200 1322" fill="none" stroke="#2A2A2E" strokeWidth={2} strokeDasharray="10 9" opacity={0.7} />
        </svg>
      </div>
    </div>
  );
};

/** a stage point seen through the shot's camera (frame px) */
export const camPt = (cam: {s: number; ox: number; oy: number; dx?: number; dy?: number}, p: Pt): Pt => [cam.ox + (p[0] - cam.ox) * cam.s + (cam.dx ?? 0), cam.oy + (p[1] - cam.oy) * cam.s + (cam.dy ?? 0)];

// ---- 1 lap: the hook (frame 0 is the thumbnail): close from the passenger seat on her profile, lit cold from below by the
// phone in her lap; the city slides past behind her; a slow push; the foreign GPS talks feet -------------------------------------
const Lap: React.FC = () => {
  const {t, len} = useShot('lap');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.8);
  const cam = {s: lerp(1.66, 1.76, k), ox: 540, oy: 960, dx: b.x - 40, dy: b.y - 40};
  // her eyes go between the road and the phone
  const look = 0.5 + 0.5 * Math.sin(t / 22);
  const pose = mixW(DRIVE.phone, DRIVE.road, 0.25 * look);
  // the phone in her hand (frame px), the screen tilted up toward her face
  const p = camPt(cam, [LAP[0] + 22, LAP[1] - 34]);
  const ph: Pose = {x: p[0], y: p[1], w: 112 * cam.s, yaw: -30, pitch: 46, roll: -26};
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <DriverSide uid="lap" t={t + 40} pose={pose} cam={cam} />
      <Phone3 src="qrpromo/black.jpg" pose={ph} look={0} rim={0.7} shadow={0} />
      <ScreenLayer pose={ph}>
        <GpsScreen state="turn" t={t} />
      </ScreenLayer>
    </div>
  );
};


/** her skin as a lit ramp (deep, shadow, half, hi) for the hand kits */
const skinRamp = (level = 1) => womanPal(level, true, SKIN_NIGHT).lit;

// ---- 2 screen: the phone close in her hand: the cheap GPS's banner, „500 ft", the street name; the lap's satin behind, the city
// soft beyond; a slow push toward the banner while the voice stumbles on the name ----------------------------------------------
const ScreenShot: React.FC = () => {
  const {t, len, L} = useShot('screen');
  const stuck = L('stuck');
  const nameAt = L('name');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 1);
  const pose: Pose = {x: 560 + b.x, y: lerp(810, 830, k) + b.y, w: lerp(470, 515, k), yaw: lerp(-15, -11, k), pitch: 7, roll: -6 + b.r};
  const box = bodyBox(pose);
  const name = t >= stuck && t < nameAt ? 'Tchav...' : 'Tchavtchavadze Ave';
  return (
    <div style={{position: 'absolute', inset: 0, background: '#06070A', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: 'blur(9px)', transform: 'scale(1.06)'}}>
        <DriverSide uid="scr" t={t + 160} pose={DRIVE.phone} cam={{s: 2.2, ox: 560, oy: 1080, dx: -60, dy: -120}} glow={0.6} />
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)'}} />
      <GripBack b={box} id="scg" skin={skinRamp(1.05)} bare />
      <Phone3 src="qrpromo/black.jpg" pose={pose} look={0} rim={0.75} shadow={0} />
      <ScreenLayer pose={pose}>
        <GpsScreen state="turn" name={name} t={t + 140} />
      </ScreenLayer>
      <GripFront b={box} id="scf" skin={skinRamp(1.05)} nails={RED_NAIL} />
    </div>
  );
};

// ---- 3 face: her profile close, the phone's cold light from below: on „ფუტი?!" her eyes leave the road for the phone, a brow
// lifts, the chin draws back a touch ------------------------------------------------------------------------------------------
const Face: React.FC = () => {
  const {t, len} = useShot('face');
  const k = E.inOut(prog(t, 0, len));
  const q = E.out(prog(t, 2, 9));
  const ex = {lid: lerp(0.62, 0.86, q), smile: 0, brow: lerp(0, 2.4, q), browTilt: lerp(0, 6, q), curve: lerp(0.06, -0.1, q), open: 0.32 * Math.sin(Math.PI * prog(t, 4, 14)), look: lerp(0.2, -0.85, q)};
  const pose: WPose = {...DRIVE.road, head: lerp(1, -9, q), neck: lerp(0, -1, q) + 3 * q, ex};
  const b = breath(t, 0.6);
  const [hx, hy] = toStage([30, -930]);
  return <DriverSide uid="fac" t={t + 260} pose={pose} cam={{s: lerp(3.5, 3.62, k), ox: hx, oy: hy + 30, dx: 540 - hx + 30 + b.x, dy: 470 - hy + b.y}} glow={1.1} />;
};

// ---- 4 feet: the dark, the city soft; „500 ft" lands big and white; on „მეტრია" an equals sign and a question deal in under
// it: „= ? მ" -----------------------------------------------------------------------------------------------------------------
const Feet: React.FC = () => {
  const {t, L} = useShot('feet');
  const qAt = L('q');
  const lights = React.useMemo(() => cityLights(31, 40), []);
  const a = sp(t, 0, 160, 14);
  const bq = sp(t, qAt - 3, 170, 13);
  const wob = Math.sin(Math.PI * clamp((t - qAt) / 12)) * 4;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#07080C', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, filter: 'blur(14px)', opacity: 0.55}}>
        <Bokeh uid="ft" lights={lights} travel={t * 6 + 900} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 250, lineHeight: 1, color: '#FFFFFF', letterSpacing: '-0.02em', opacity: clamp(a * 1.5), transform: `scale(${lerp(1.25, 1, clamp(a)).toFixed(4)})`}}>
        500 ft
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 820, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 200, lineHeight: 1, color: '#FFFFFF', opacity: clamp(bq * 1.5), transform: `translateY(${((1 - clamp(bq)) * 40).toFixed(1)}px)`}}>
        = <span style={{display: 'inline-block', transform: `rotate(${wob.toFixed(2)}deg)`}}>?</span> {mtav('მ')}
      </div>
    </div>
  );
};

// ---- 5 sign: through her windscreen, the wet avenue at night; the street sign „ჭავჭავაძის გამზ." with its arrow to the left
// grows and slides past on the left; her indicator still ticking on the display; the GPS: „Recalculating." -------------------
const SignPlate: React.FC<{cam: CarCam; z: number; t: number}> = ({cam, z, t}) => {
  // the plate on its pole at the corner (world m): facing the traffic, 2.2 x 0.55 m, its foot 2.3 m up
  const V = viewOfCam(cam);
  const x0 = -0.4;
  const x1 = x0 + 3.4;
  const y0 = 2.7;
  const y1 = 3.55;
  const a = V.pt([x1, y1, z]);
  const c = V.pt([x0, y0, z]);
  const pole0 = V.pt([x1 - 0.2, 0.14, z + 0.05]);
  const pole1 = V.pt([x1 - 0.2, y1, z + 0.05]);
  if (!a || !c || !pole0 || !pole1) return null;
  const w = Math.abs(c[0] - a[0]);
  const h = Math.abs(c[1] - a[1]);
  const left = Math.min(a[0], c[0]);
  const top = Math.min(a[1], c[1]);
  void t;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={pole0[0]} y1={pole0[1]} x2={pole1[0]} y2={pole1[1]} stroke="#1A1B1E" strokeWidth={Math.max(2, w * 0.035)} />
      </svg>
      <div style={{position: 'absolute', left, top, width: w, height: h, borderRadius: h * 0.08, background: '#1D3F8C', border: `${Math.max(1, h * 0.05)}px solid #F2F2F2`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: h * 0.18, boxShadow: '0 0 30px rgba(0,0,0,0.4)'}}>
        <svg width={h * 0.55} height={h * 0.55} viewBox="0 0 24 24">
          <path d="M20 12H6M11 6L5 12 11 18" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: h * 0.4, color: '#FFFFFF', whiteSpace: 'nowrap'}}>ჭავჭავაძის გამზ.</span>
      </div>
    </>
  );
};
import {viewOf as viewOfCam} from './kit/street';

const SIGN_Z = -25;
const Sign: React.FC = () => {
  const {t, len} = useShot('sign');
  const k = t / Math.max(1, len);
  const z = lerp(-44, -24, k);
  const cam: CarCam = {pos: [-3.9, 1.22, z], target: [-1.2, 1.15, z + 22], fov: 62};
  const b = breath(t, 0.5);
  const blink = Math.floor((t + 6) / 11) % 2 === 0 ? 1 : 0.15;
  const V = viewOfCam(cam);
  // the side street she should have taken, on the left: its dark asphalt through the pavement, a lamp at its corner, a lit house
  const side = V.poly([[1.22, 0.004, SIGN_Z + 1.2], [16, 0.004, SIGN_Z + 1.2], [16, 0.004, SIGN_Z + 9.5], [1.22, 0.004, SIGN_Z + 9.5]]);
  const house = V.poly([[7.5, 0, SIGN_Z + 10.5], [7.5, 0, SIGN_Z + 26], [7.5, 11, SIGN_Z + 26], [7.5, 11, SIGN_Z + 10.5]]);
  const wins: string[] = [];
  for (let f = 0; f < 3; f++) for (let j = 0; j < 4; j++) wins.push(V.poly([[7.48, 1.2 + f * 3.3, SIGN_Z + 12 + j * 3.6], [7.48, 1.2 + f * 3.3, SIGN_Z + 13.6 + j * 3.6], [7.48, 3.1 + f * 3.3, SIGN_Z + 13.6 + j * 3.6], [7.48, 3.1 + f * 3.3, SIGN_Z + 12 + j * 3.6]]));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0B0A0E', overflow: 'hidden'}}>
      <div style={cssCam(1.02, 540, 900, b.x, b.y)}>
        <Street cam={cam} uid="sg" look="night" wet={1} nearTree farTrees lit={1.15} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {side ? <path d={side} fill="#1A171A" /> : null}
          {house ? <path d={house} fill="#2A2421" /> : null}
          {wins.map((d, i) => (d ? <path key={i} d={d} fill={(i * 5) % 3 === 0 ? '#F0B070' : '#2B3442'} opacity={(i * 5) % 3 === 0 ? 0.85 : 1} /> : null))}
        </svg>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {[
            [-4.3, z + 26 + 2 * k, '#FF3B30', 0.95],
            [-4.6, z + 48 - 6 * k, '#FF3B30', 0.75],
            [-0.9, z + 60 - 30 * k, '#FFF4DE', 0.9],
          ].map(([x, zz, col, a], i) => {
            const l = V.pt([(x as number) - 0.7, 0.75, zz as number]);
            const r = V.pt([(x as number) + 0.7, 0.75, zz as number]);
            if (!l || !r) return null;
            const rr = Math.max(2.5, Math.abs(r[0] - l[0]) * 0.11);
            return (
              <g key={i} opacity={a as number}>
                <circle cx={l[0]} cy={l[1]} r={rr * 4} fill={col as string} opacity={0.18} />
                <circle cx={r[0]} cy={r[1]} r={rr * 4} fill={col as string} opacity={0.18} />
                <ellipse cx={l[0]} cy={l[1]} rx={rr * 1.6} ry={rr} fill={col as string} />
                <ellipse cx={r[0]} cy={r[1]} rx={rr * 1.6} ry={rr} fill={col as string} />
                <ellipse cx={(l[0] + r[0]) / 2} cy={l[1] + rr * 9} rx={rr * 3} ry={rr * 8} fill={col as string} opacity={0.12} />
              </g>
            );
          })}
        </svg>
        <SignPlate cam={cam} z={SIGN_Z} t={t} />
      </div>
      {/* her windscreen: the roof's edge and the mirror, the A pillars, the dash and the wheel's top, raindrops on the glass */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="sgDash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#141519" />
            <stop offset="1" stopColor="#060607" />
          </linearGradient>
          <radialGradient id="sgCl" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#A9C4FF" stopOpacity={0.35} />
            <stop offset="1" stopColor="#A9C4FF" stopOpacity={0} />
          </radialGradient>
        </defs>
        <Drops seed={9} x={0} y={160} w={1080} h={1000} t={t} n={60} a={0.7} />
        <path d="M-20 -20H1100V150Q540 110 -20 150Z" fill="#08090B" />
        <rect x={430} y={118} width={220} height={64} rx={30} fill="#0E0F12" />
        <path d="M-20 140L120 150L-20 1240Z" fill="#0A0B0D" />
        <path d="M1100 140L960 150L1100 1240Z" fill="#0A0B0D" />
        <path d="M-20 1180Q540 1110 1100 1180L1100 1940L-20 1940Z" fill="url(#sgDash)" />
        <ellipse cx={420} cy={1260} rx={260} ry={60} fill="url(#sgCl)" />
        <path d="M120 1500Q380 1230 700 1330" stroke="#050506" strokeWidth={60} fill="none" strokeLinecap="round" />
        {/* the left indicator on the display: it still blinks for the turn she missed */}
        <path d="M380 1262L404 1244V1254H430V1270H404V1280Z" fill="#46D27A" opacity={blink} />
      </svg>
    </div>
  );
};

// ---- 6 missed: outside, low at the kerb: the pearl saloon slides along the wet avenue past the corner, its lamps in the
// puddles, the warm windows across the road; the camera tracks with it ----------------------------------------------------------
export const PEARL = '#D9D5CC';
const Missed: React.FC = () => {
  const {t, len} = useShot('missed');
  const k = t / Math.max(1, len);
  const z = lerp(-5, 7, k);
  const cam: CarCam = {pos: [3.4, 1.05, z + 9.8], target: [-3.6, 0.85, z + 0.4], fov: 40};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0F0D12', overflow: 'hidden'}}>
      <Street cam={cam} uid="ms" look="night" wet={1} nearTree={false} farTrees={false} />
      <Car3 cam={cam} night={1} street={0.9} lamp={1} shadow={0.9} at={[-3.9, z]} paint={PEARL} design="sedan" cool={0.45} coolFrom={[6, 5, 10]} style={{filter: 'saturate(0.75) brightness(1.08)'}} />
    </div>
  );
};

// ---- 7 drop: her lap close: the fingers open, the phone slips, turns and falls past the seat's edge into the dark ----------------
const Drop: React.FC = () => {
  const {t, L} = useShot('drop');
  const slip = L('slip');
  const g = Math.max(0, t - slip);
  const open = E.out(prog(t, slip - 2, 6));
  const cam = {s: 2.5, ox: 600, oy: 1150, dx: -60, dy: -220};
  const pose: WPose = {...DRIVE.phone, near: {...DRIVE.phone.near, hand: open > 0.5 ? 'relax' : 'hold', ha: lerp(72, 40, open)}, head: -12, ex: {...EX_DOWN, brow: 1.2 * open, lid: 0.7}};
  const p0 = camPt(cam, [LAP[0] + 22, LAP[1] - 34]);
  const fall = 0.5 * 2.2 * g * g;
  const ph: Pose = {x: p0[0] + g * 9, y: p0[1] + fall, w: 112 * cam.s, yaw: -30 + g * 3, pitch: 46 - g * 2, roll: -26 - g * 6.5};
  const consY = camPt(cam, [0, 1262])[1];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <DriverSide uid="drp" t={t + 330} pose={pose} cam={cam} glow={0.9} />
      <div style={{position: 'absolute', inset: 0, clipPath: `polygon(0 0, 1080px 0, 1080px ${(consY + 30).toFixed(0)}px, 0 ${(consY - 20).toFixed(0)}px)`}}>
        <Phone3 src="qrpromo/black.jpg" pose={ph} look={0} rim={0.7} shadow={0} />
        <ScreenLayer pose={ph}>
          <GpsScreen state="recalc" spin={t / 20} />
        </ScreenLayer>
      </div>
    </div>
  );
};

// ---- 8 floor: straight down into the footwell: the phone face up on the carpet between her black pumps, still lit and
// asking for a U-turn, its cold light on the patent leather and her insteps; the pedals' brushed metal above; the camera
// sinks slowly toward it; on „სად დავტრიალდე, აქ?!" the screen's arrow pulses ------------------------------------------------
/** a pump seen from above (shoe space: the heel's back at 0, the toe at +1 along y up the frame; `w` its width), patent black
 *  with a sweep of light, the foot's instep in the opening */
const PumpTop: React.FC<{x: number; y: number; len: number; rot: number; skin: readonly string[]; id: string}> = ({x, y, len, rot, skin, id}) => {
  const w = len * 0.34;
  const P = (u: number, v: number) => `${(u * w).toFixed(1)} ${(-v * len).toFixed(1)}`;
  const shoe = `M${P(0, -0.02)}C${P(0.42, -0.02)} ${P(0.5, 0.18)} ${P(0.48, 0.42)}C${P(0.46, 0.66)} ${P(0.3, 0.88)} ${P(0, 1.02)}C${P(-0.3, 0.88)} ${P(-0.46, 0.66)} ${P(-0.48, 0.42)}C${P(-0.5, 0.18)} ${P(-0.42, -0.02)} ${P(0, -0.02)}Z`;
  const open = `M${P(0, 0.06)}C${P(0.34, 0.06)} ${P(0.38, 0.3)} ${P(0.3, 0.5)}C${P(0.2, 0.6)} ${P(-0.2, 0.6)} ${P(-0.3, 0.5)}C${P(-0.38, 0.3)} ${P(-0.34, 0.06)} ${P(0, 0.06)}Z`;
  const ankle = `M${P(-0.26, 0.1)}C${P(-0.3, 0.3)} ${P(-0.16, 0.5)} ${P(0, 0.5)}C${P(0.16, 0.5)} ${P(0.3, 0.3)} ${P(0.26, 0.1)}C${P(0.18, -0.06)} ${P(-0.18, -0.06)} ${P(-0.26, 0.1)}Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#050506" />
          <stop offset="0.62" stopColor="#141418" />
          <stop offset="0.8" stopColor="#3A3D46" />
          <stop offset="1" stopColor="#0A0A0C" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor={skin[2]} />
          <stop offset="0.7" stopColor={skin[1]} />
          <stop offset="1" stopColor={skin[0]} />
        </radialGradient>
      </defs>
      <ellipse cx={w * 0.06} cy={-len * 0.45} rx={w * 0.62} ry={len * 0.58} fill="#000000" opacity={0.45} />
      <path d={shoe} fill={`url(#${id}p)`} />
      <path d={`M${P(0.3, 0.12)}C${P(0.42, 0.34)} ${P(0.38, 0.62)} ${P(0.18, 0.86)}`} stroke="#C9D4EA" strokeWidth={len * 0.012} fill="none" opacity={0.55} strokeLinecap="round" />
      <path d={open} fill={`url(#${id}s)`} />
      <path d={ankle} fill={skin[2]} opacity={0.9} />
      <path d={`M${P(-0.12, 0.2)}C${P(-0.04, 0.32)} ${P(0.06, 0.32)} ${P(0.12, 0.2)}`} stroke={skin[0]} strokeWidth={len * 0.008} fill="none" opacity={0.5} />
    </g>
  );
};

const Floor: React.FC = () => {
  const {t, len, L} = useShot('floor');
  const reach = L('reach');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.4);
  const skin = skinRamp(1.05);
  const s = lerp(1, 1.08, k);
  const ph: Pose = {x: 540 + b.x, y: 860 + b.y, w: 360 * s, yaw: 0, pitch: 0, roll: 13};
  const pulse = 0.5 + 0.5 * Math.sin(Math.PI * clamp((t - reach) / 10));
  const at = (x: number, y: number): [number, number] => [540 + (x - 540) * s, 860 + (y - 860) * s];
  const pL = at(255, 1170);
  const pR = at(820, 610);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#060607', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="flWeave" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform={`rotate(32) scale(${s})`}>
            <rect width="10" height="10" fill="#141416" />
            <path d="M0 5H10" stroke="#1B1B1F" strokeWidth={2.4} />
          </pattern>
          <radialGradient id="flGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#B9CCFF" stopOpacity={0.36} />
            <stop offset="0.55" stopColor="#B9CCFF" stopOpacity={0.1} />
            <stop offset="1" stopColor="#B9CCFF" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="flPedal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3A3D44" />
            <stop offset="0.5" stopColor="#9097A2" />
            <stop offset="1" stopColor="#3A3D44" />
          </linearGradient>
          <radialGradient id="flVig" cx="0.5" cy="0.45" r="0.7">
            <stop offset="0.55" stopColor="#000000" stopOpacity={0} />
            <stop offset="1" stopColor="#000000" stopOpacity={0.8} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#flWeave)" />
        <ellipse cx={540} cy={860} rx={620 * s} ry={700 * s} fill="url(#flGlow)" />
        {/* the pedals at the top: the wide brake, the tall accelerator */}
        <g transform={`translate(${at(390, 220)[0]} ${at(390, 220)[1]}) scale(${s})`}>
          <rect x={-130} y={-90} width={260} height={180} rx={26} fill="url(#flPedal)" />
          {[-50, -10, 30, 70].map((y) => (
            <rect key={y} x={-110} y={y - 34} width={220} height={14} rx={7} fill="#24262B" opacity={0.85} />
          ))}
        </g>
        <g transform={`translate(${at(820, 300)[0]} ${at(820, 300)[1]}) rotate(8) scale(${s})`}>
          <rect x={-70} y={-170} width={140} height={340} rx={24} fill="url(#flPedal)" />
          {[-120, -70, -20, 30, 80, 130].map((y) => (
            <rect key={y} x={-52} y={y - 8} width={104} height={12} rx={6} fill="#24262B" opacity={0.85} />
          ))}
        </g>
        {/* her pumps: the left one flat on the carpet, the right one on its way to the accelerator */}
        <PumpTop x={pL[0]} y={pL[1]} len={430 * s} rot={-8} skin={skin} id="pl" />
        <PumpTop x={pR[0]} y={pR[1]} len={420 * s} rot={10} skin={skin} id="pr" />
        <rect width={1080} height={1920} fill="url(#flVig)" />
      </svg>
      <Phone3 src="qrpromo/black.jpg" pose={ph} look={0} rim={0.65} shadow={0} />
      <ScreenLayer pose={ph}>
        <GpsScreen state="uturn" t={t} />
        <div style={{position: 'absolute', left: 40, top: 150, width: 1000, height: 330, borderRadius: 40, boxShadow: `0 0 0 ${(14 * pulse).toFixed(1)}px rgba(255,255,255,${(0.35 * pulse).toFixed(3)})`}} />
      </ScreenLayer>
    </div>
  );
};
const mix2 = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

// ---- 9 sigh: wide, the whole cabin side: behind her the city on its hills with the TV tower's red lights, the street's lights
// sliding past; her hand goes up into her hair, the head back a little, the eyes closed: „ამდენი წვალება ერთი ვახშმისთვის..."
const Sigh: React.FC = () => {
  const {t, len, L} = useShot('sigh');
  const hairAt = L('hair');
  const k = E.inOut(prog(t, 0, len));
  const lift = E.inOut(prog(t, hairAt, 16));
  const hair: WPose = {...DRIVE.road, head: 7, neck: 3, chest: 1, shrug: 4, near: {to: 'temple', off: [-10, 40], bend: -1, hand: 'hair', ha: 205}, ex: {lid: 0.08, smile: 0, brow: 0.6, browTilt: 8, curve: -0.25, open: 0.15, look: 0}};
  const pose = mixW(DRIVE.road, hair, lift);
  const b = breath(t, 0.7);
  return <DriverSide uid="sgh" t={t + 420} pose={pose} cam={{s: lerp(1.12, 1.2, k), ox: 520, oy: 900, dx: b.x - 20, dy: b.y - 60}} glow={0.35} hills speed={7} />;
};

const Black: React.FC = () => <div style={{position: 'absolute', inset: 0, background: '#000'}} />;

export const SHOTS: Record<string, React.FC> = {lap: Lap, screen: ScreenShot, face: Face, feet: Feet, sign: Sign, missed: Missed, drop: Drop, floor: Floor, sigh: Sigh, black: Black};
void project;
void silPal;
