// ACT 1, the problem (the owner, 2026-10-21: a new story, a different woman, glamorous, a bit sexy, tasteful): night
// Tbilisi just after the rain. She drives to a dinner in a fitted black satin dress, bare shoulders, drop earrings, red
// lips and nails; a cheap foreign GPS on the phone low in her lap talks FEET and cannot say „ჭავჭავაძე". She misses the
// turn, the phone slips under the seat, it asks for a U-turn from the floor, she sighs into her hair. Every beat its own
// picture: the hook (her hand and the phone, „In five hundred feet,"), her face close as she SCREAMS at the phone (v1.3, the
// owner: the film opens on her curse, bleeped), the phone close in her hand, the sign sliding past through the windscreen,
// the car outside on the wet street, the slip, the footwell from above, the wide sigh against the city. Text only white (the
// dark) or black.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {F} from '../tokens';
import {clamp, E, evs, lerp, prog, rnd} from './lib';
import {breath, cssCam, useShot} from './kit/stage';
import {Bokeh, cityLights, Drops} from './kit/cabin';
import {EX_CALM, mixW, Woman, womanPal, type WPose} from './kit/woman';

/** her skin at night: the street's warm sodium on her (the phone adds its cold glow from below), never a cartoon blue */
export const SKIN_NIGHT = '#D3A288';
import {bodyBox, Phone3, ScreenLayer, project, type Pose} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {Street} from './kit/street';
import {Car3, projectCar, type CarCam} from './kit/car3d';
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

// ---- 0 hook (v1.2, the art director: "open tight on the red-nailed hand with the phone's light on her face, cut sooner"):
// frame 0 is tight on her hand and the glowing phone in her lap (the foreign GPS's banner readable); the camera tilts up the
// phone's cold light to her face, then cuts to the medium profile ------------------------------------------------------------
const Hook: React.FC = () => {
  const {t, len} = useShot('hook');
  const k = E.inOut(prog(t, 0, len + 4));
  const b = breath(t, 0.5);
  const s = lerp(3.0, 1.9, k);
  const F: Pt = [lerp(588, 528, k), lerp(1110, 955, k)];
  const cam = {s, ox: F[0], oy: F[1], dx: 540 - F[0] + b.x, dy: lerp(900, 860, k) - F[1] + b.y};
  const pose = mixW(DRIVE.phone, DRIVE.road, 0.2 * E.inOut(prog(t, len * 0.55, len * 0.45)));
  const p = camPt(cam, [LAP[0] + 22, LAP[1] - 34]);
  const ph: Pose = {x: p[0], y: p[1], w: 112 * cam.s, yaw: -30, pitch: 46, roll: -26};
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <DriverSide uid="hk" t={t + 10} pose={pose} cam={cam} glow={1.15} />
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
  // v1.2 (the art director: the subtitle sat on the edge of her palm): the phone a step smaller and higher, her hand and wrist
  // end above the subtitle band
  const pose: Pose = {x: 548 + b.x, y: lerp(720, 736, k) + b.y, w: lerp(418, 452, k), yaw: lerp(-15, -11, k), pitch: 7, roll: -6 + b.r};
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

// ---- 2 scream (v1.3, the owner, 2026-10-21: "at the very start I want her to curse, aggressively, screaming"): her profile
// close, the phone's cold light from below. On the cut she turns on the phone in her lap: the head drops toward it, the brows
// crush down and in, the eyes narrow on it, the corners of the mouth pull down and her red lips open with her own voice (the
// take's level, frame by frame: plan.py's „mouth"); the frame punches in on her first word and kicks with a short shake on
// the bleep and again on „მეტრებით ილაპარაკე!" ------------------------------------------------------------------------------
const FACE_X = 330;
const FACE_Y = 650;
const Scream: React.FC = () => {
  const {t, len, L} = useShot('scream');
  const s1 = L('scream');
  const bl = L('bleep');
  const s2 = L('scream2');
  const mouth = evs('mouth');
  const m = mouth[Math.max(0, Math.min(mouth.length - 1, t))] ?? 0;
  const k = E.inOut(prog(t, 0, len));
  // the anger lands with the first word, eases a touch between the halves and comes back harder
  const q = E.out(prog(t, s1 - 4, 5)) * (1 - 0.15 * Math.sin(Math.PI * prog(t, bl + 12, s2 - bl - 10)));
  // the eyes wide on the phone under crushed brows; past 1 the mouth's opening drops her jaw (kit/sil/silhead.tsx, v1.3)
  const ex = {
    lid: lerp(0.62, 0.8, q),
    smile: 0,
    brow: lerp(0, -2.2, q),
    browTilt: lerp(0, -18, q),
    curve: lerp(0.06, -0.7, q),
    open: q * (0.3 + 1.6 * m),
    look: lerp(0.2, -0.9, q),
  };
  // the head jabs toward the phone on each half's first word
  const jab = (at: number) => Math.sin(Math.PI * clamp((t - at + 1) / 7)) * (t >= at - 1 ? 1 : 0);
  const j = jab(s1) + 0.8 * jab(s2);
  const pose: WPose = {...DRIVE.road, head: lerp(1, -7, q) - 3 * j, neck: lerp(0, -2, q) - 1.5 * j, chest: -1 * q, ex};
  const b = breath(t, 0.6);
  const [hx, hy] = toStage([30, -930]);
  // the punch-in on her first word (3 frames), then a slow creep; a 4 % kick on the bleep and on the second half
  const kick = (at: number) => clamp((t - at) / 2) * Math.exp(-Math.max(0, t - at) / 6);
  const sc = lerp(3.8, 3.9, k) + 0.3 * E.out(prog(t, s1 - 1, 3));
  const s = sc * (1 + 0.04 * kick(bl) + 0.035 * kick(s2));
  // a smooth decaying shake (a 5-frame swing, never a frame-to-frame jitter: that would read as a glitch)
  const wob = (at: number, amp: number, ph: number) => (t < at ? 0 : amp * Math.exp(-(t - at) / 5) * Math.sin((t - at) * 1.25 + ph));
  const sx = wob(bl, 10, 0.4) + wob(s2, 8, 1.1) + wob(s1, 5, 0.2);
  const sy = 0.6 * (wob(bl, 8, 2.0) + wob(s2, 6, 2.6));
  // her face big, left of centre, looking into the room in front of her; the lower third falls off into the cabin's dark (the
  // phone's light does not reach her chest), so the long white scream lines read over it
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <DriverSide uid="scm" t={t + 260} pose={pose} cam={{s, ox: hx, oy: hy + 30, dx: FACE_X - hx + b.x + sx, dy: FACE_Y - hy + b.y + sy}} glow={1.15} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,5,8,0) 56%, rgba(4,5,8,0.6) 71%, rgba(4,5,8,0.72) 100%)'}} />
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
  // gone once it is beside the lens (a corner near the camera's plane would project huge for a frame: a one-frame flash)
  if (V.depth([x0, y0, z]) < 2.2) return null;
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

const SIGN_Z = -30;
/** the side street she should have taken (the left, world z from .. to): its mouth between two lit blocks */
const SIDE: [number, number] = [SIGN_Z + 1.4, SIGN_Z + 10];
/** a block of houses on the near side (x 7.5, facing the avenue): the wall, its lit shop windows below, a few lit windows */
const NearBlock: React.FC<{V: ReturnType<typeof viewOfCam>; z0: number; z1: number; seed: number}> = ({V, z0, z1, seed}) => {
  const X = 7.5;
  const quad = (x: number, a: number, b: number, y0: number, y1: number) => V.poly([[x, y0, a], [x, y0, b], [x, y1, b], [x, y1, a]]);
  const wall = quad(X, z0, z1, 0, 12.5);
  const els: React.ReactNode[] = [];
  if (wall) els.push(<path key="w" d={wall} fill="#2C2522" />);
  const r = rnd(seed);
  const n = Math.max(2, Math.round((z1 - z0) / 4));
  const bw = (z1 - z0) / n;
  for (let j = 0; j < n; j++) {
    const a = z0 + j * bw + 0.5;
    const b2 = z0 + (j + 1) * bw - 0.5;
    const shop = quad(X - 0.02, a, b2, 0.3, 2.7);
    if (shop) els.push(<path key={`s${j}`} d={shop} fill="#F0A85C" opacity={0.55 + 0.35 * r()} />);
    for (let f = 1; f < 4; f++) {
      const on = r() < 0.4;
      const wd = quad(X - 0.03, a + bw * 0.2, b2 - bw * 0.2, f * 3.3 + 0.7, f * 3.3 + 2.6);
      if (wd) els.push(<path key={`w${j}${f}`} d={wd} fill={on ? '#F2B676' : '#2B3442'} opacity={on ? 0.9 : 1} />);
    }
    // the shop's warm light on the wet pavement and the road's edge
    const refl = V.poly([[X - 0.1, 0.15, a], [X - 0.1, 0.15, b2], [1.0, 0.004, b2], [1.0, 0.004, a]]);
    if (refl) els.push(<path key={`r${j}`} d={refl} fill="url(#sgRefl)" opacity={0.5} />);
  }
  return <>{els}</>;
};

const Sign: React.FC = () => {
  const {t, len} = useShot('sign');
  const k = t / Math.max(1, len);
  // v1.2 (the art director: murky, the sign on screen only 1.3 s, nothing after it, the missed turn never shown): the avenue
  // brighter, the sign far ahead from the first frame and passing at about 60 %, then the lit mouth of the side street she
  // should have turned into slides past on the left, its corner lamp and warm shop fronts on the wet asphalt
  const z = lerp(-58, -16, k);
  const cam: CarCam = {pos: [-3.6, 1.22, z], target: [-0.9, 1.12, z + 22], fov: 60};
  const b = breath(t, 0.5);
  const blink = Math.floor((t + 6) / 11) % 2 === 0 ? 1 : 0.15;
  const V = viewOfCam(cam);
  const side = V.poly([[1.22, 0.004, SIDE[0]], [24, 0.004, SIDE[0]], [24, 0.004, SIDE[1]], [1.22, 0.004, SIDE[1]]]);
  const sideLamp = V.depth([2.2, 5, SIDE[0] + 0.6]) > 2.5 ? V.pt([2.2, 5.1, SIDE[0] + 0.6]) : null;
  const sideGlow = V.poly([[1.22, 0.006, SIDE[0] + 0.5], [14, 0.006, SIDE[0] + 0.5], [14, 0.006, SIDE[1] - 0.5], [1.22, 0.006, SIDE[1] - 0.5]]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0B0A0E', overflow: 'hidden'}}>
      <div style={{...cssCam(1.02, 540, 900, b.x, b.y), filter: 'brightness(1.32) contrast(1.04)'}}>
        <Street cam={cam} uid="sg" look="night" wet={1} nearTree={false} farTrees lit={1.35} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="sgRefl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F0A85C" stopOpacity={0} />
              <stop offset="1" stopColor="#F0A85C" stopOpacity={0.6} />
            </linearGradient>
            <radialGradient id="sgSide" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFC985" stopOpacity={0.55} />
              <stop offset="1" stopColor="#FFC985" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="sgLamp" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFE2B0" stopOpacity={0.8} />
              <stop offset="0.3" stopColor="#FFC27A" stopOpacity={0.25} />
              <stop offset="1" stopColor="#E89A52" stopOpacity={0} />
            </radialGradient>
          </defs>
          {side ? <path d={side} fill="#221D1E" /> : null}
          {sideGlow ? <path d={sideGlow} fill="#F0A85C" opacity={0.12} /> : null}
          <NearBlock V={V} z0={SIGN_Z - 34} z1={SIDE[0]} seed={3} />
          <NearBlock V={V} z0={SIDE[1]} z1={SIDE[1] + 30} seed={8} />
          {sideLamp ? (
            <g>
              <circle cx={sideLamp[0]} cy={sideLamp[1]} r={150} fill="url(#sgLamp)" />
              <circle cx={sideLamp[0]} cy={sideLamp[1]} r={9} fill="#FFF3DC" />
            </g>
          ) : null}
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
      {/* her windscreen: the roof's edge and the mirror, the A pillars, raindrops on the glass; the dash with the slim driver's
          display and the wheel's leather rim above it (v1.2: a real rim with its light, fading into the dash's shadow before
          the subtitle band; never the old black stroke) */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="sgDash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#17181C" />
            <stop offset="0.3" stopColor="#0C0D0F" />
            <stop offset="1" stopColor="#060607" />
          </linearGradient>
          <radialGradient id="sgCl" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#A9C4FF" stopOpacity={0.3} />
            <stop offset="1" stopColor="#A9C4FF" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="sgRim" gradientUnits="userSpaceOnUse" x1="0" y1="1150" x2="0" y2="1385">
            <stop offset="0" stopColor="#24252B" stopOpacity={1} />
            <stop offset="0.55" stopColor="#141518" stopOpacity={1} />
            <stop offset="1" stopColor="#0A0A0C" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sgRimHi" gradientUnits="userSpaceOnUse" x1="0" y1="1150" x2="0" y2="1360">
            <stop offset="0" stopColor="#8E97AA" stopOpacity={0.7} />
            <stop offset="1" stopColor="#8E97AA" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sgDisp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0E1420" />
            <stop offset="1" stopColor="#070A10" />
          </linearGradient>
        </defs>
        <Drops seed={9} x={0} y={160} w={1080} h={980} t={t} n={60} a={0.7} />
        <path d="M-20 -20H1100V150Q540 110 -20 150Z" fill="#08090B" />
        <rect x={430} y={118} width={220} height={64} rx={30} fill="#0E0F12" />
        <path d="M-20 140L120 150L-20 1200Z" fill="#0A0B0D" />
        <path d="M1100 140L960 150L1100 1200Z" fill="#0A0B0D" />
        <path d="M-20 1150Q540 1090 1100 1150L1100 1940L-20 1940Z" fill="url(#sgDash)" />
        <path d="M-20 1150Q540 1090 1100 1150" stroke="#2E3036" strokeWidth={3} fill="none" />
        {/* the driver's display behind the wheel: the speed and the left indicator, still blinking for the turn she missed */}
        <rect x={250} y={1168} width={330} height={96} rx={22} fill="url(#sgDisp)" stroke="#1F2430" strokeWidth={2} />
        <ellipse cx={415} cy={1215} rx={250} ry={70} fill="url(#sgCl)" />
        <text x={430} y={1236} fontFamily={F.sans} fontWeight={600} fontSize={48} fill="#DCE6F5" opacity={0.85} textAnchor="middle">47</text>
        <path d="M300 1214L324 1196V1206H350V1222H324V1232Z" fill="#46D27A" opacity={blink} />
        {/* the wheel's rim: a thick leather ring seen from behind, only its top arc in the light */}
        <path d="M60 1385C70 1250 210 1170 400 1160C590 1150 730 1230 760 1385" stroke="url(#sgRim)" strokeWidth={52} fill="none" strokeLinecap="butt" />
        <path d="M84 1330C110 1235 230 1176 400 1170C560 1164 680 1220 726 1316" stroke="url(#sgRimHi)" strokeWidth={3} fill="none" />
      </svg>
    </div>
  );
};

// ---- 6 missed: outside, low at the kerb: the pearl saloon slides along the wet avenue past the corner, its lamps in the
// puddles, the warm windows across the road; the camera tracks with it ----------------------------------------------------------
export const PEARL = '#ECEAE4';
const Missed: React.FC = () => {
  const {t, len} = useShot('missed');
  const k = t / Math.max(1, len);
  // v1.2 (the art director: taupe not pearl, a matte street, the car barely moves): a whiter pearl in a cool light, the car
  // driving on and closing in on the camera that pans with it (it grows, the street slides), its body and lamps mirrored on
  // the wet asphalt
  const z = lerp(-7, 6, k);
  const cz = lerp(-7 + 11.2, 6 + 8.6, E.inOut(k) * 0.35 + k * 0.65);
  const cam: CarCam = {pos: [3.6, 1.0, cz], target: [-3.6, 0.82, z + 0.2], fov: 40};
  const ground = projectCar(cam, [-3.9, 0, z]);
  const lampL = projectCar(cam, [-3.9 - 0.72, 0, z + 2.3]);
  const lampR = projectCar(cam, [-3.9 + 0.72, 0, z + 2.3]);
  const lampL2 = projectCar(cam, [-3.9 - 0.72, -1.6, z + 2.3]);
  const len2 = Math.max(40, lampL2.y - lampL.y);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0F0D12', overflow: 'hidden'}}>
      <Street cam={cam} uid="ms" look="night" wet={1} nearTree={false} farTrees={false} lit={1.2} />
      {/* the car's mirror on the wet road: the same car flipped about its contact line, soft and dim, fading down */}
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(2 * ground.y).toFixed(1)}px) scaleY(-1)`, transformOrigin: '0 0', opacity: 0.2, filter: 'blur(5px)', WebkitMaskImage: `linear-gradient(to top, rgba(0,0,0,1) ${(1920 - ground.y).toFixed(0)}px, rgba(0,0,0,0) ${(1920 - ground.y + 260).toFixed(0)}px)`}}>
        <Car3 cam={cam} night={1} street={0.9} lamp={1} shadow={0} at={[-3.9, z]} paint={PEARL} design="sedan" cool={0.8} coolFrom={[6, 5, 10]} />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="msLamp" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#F4F8FF" stopOpacity={0.55} />
            <stop offset="0.5" stopColor="#DCE6F5" stopOpacity={0.16} />
            <stop offset="1" stopColor="#DCE6F5" stopOpacity={0} />
          </radialGradient>
        </defs>
        {[lampL, lampR].map((q, i) => (
          <ellipse key={i} cx={q.x} cy={q.y + len2 * 0.5} rx={Math.max(10, len2 * 0.09)} ry={len2 * 0.55} fill="url(#msLamp)" />
        ))}
      </svg>
      <Car3 cam={cam} night={1} street={0.9} lamp={1} shadow={0.9} at={[-3.9, z]} paint={PEARL} design="sedan" cool={0.8} coolFrom={[6, 5, 10]} style={{filter: 'saturate(0.6) brightness(1.14)'}} />
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

// ---- 8 floor (v1.2, the art director: "her pumps from above read as two black pods; nearly still for 4.3 s; a reach event
// and no hand"): low in the dark footwell from the passenger side: her bare shin and the black stiletto pump on the
// accelerator (her own rig, in profile), the black satin of her skirt over the knee at the top; the phone lies face up on
// the carpet in front of us, still lit and asking for a U-turn, its cold light on her ankle and the carpet; the camera
// creeps along the floor toward it; on „სად დავტრიალდე, აქ?!" her hand (red nails) reaches down from above, stretching,
// short of it, and draws back ---------------------------------------------------------------------------------------------
const FW = {x: -260, y: 1810, size: 2700};
const Floor: React.FC = () => {
  const {t, len, L} = useShot('floor');
  const reach = L('reach');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.45);
  const skinPal = womanPal(1.0, true, SKIN_NIGHT);
  // the reach: the near arm from her lap down toward the floor, straight, then back (body units, before the chest's lean)
  const rk = E.inOut(prog(t, reach - 14, 16)) * (1 - E.inOut(prog(t, reach + 34, 18)));
  const stretch = Math.sin(Math.PI * clamp((t - reach) / 26)) * (t > reach ? 1 : 0);
  const pose: WPose = {
    ...DRIVE.road,
    head: -12,
    near: {to: [lerp(170, 196 + 8 * stretch, rk), lerp(-600, -455 + 6 * stretch, rk)], bend: -1, hand: rk > 0.4 ? 'palm' : 'hold', ha: lerp(72, 22, rk)},
    ex: {...EX_DOWN, brow: 1.4},
  };
  const cs = lerp(1.0, 1.07, k);
  const cx = lerp(0, -26, k) + b.x;
  const cy = b.y;
  const ph: Pose = {x: 300 + (300 - 540) * (cs - 1) + cx, y: 1150 + (1150 - 960) * (cs - 1) + cy, w: 360 * cs, yaw: -14, pitch: 60, roll: 10};
  const pulse = 0.5 + 0.5 * Math.sin(Math.PI * clamp((t - reach) / 10));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#050506', overflow: 'hidden'}}>
      <div style={cssCam(cs, 540, 960, cx, cy)}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id="flBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B0B0E" />
              <stop offset="1" stopColor="#060607" />
            </linearGradient>
            <pattern id="flWeave" width="12" height="7" patternUnits="userSpaceOnUse">
              <rect width="12" height="7" fill="#111114" />
              <path d="M0 3.5H12" stroke="#18181C" strokeWidth={2} />
            </pattern>
            <radialGradient id="flGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#B9CCFF" stopOpacity={0.42} />
              <stop offset="0.5" stopColor="#B9CCFF" stopOpacity={0.12} />
              <stop offset="1" stopColor="#B9CCFF" stopOpacity={0} />
            </radialGradient>
            <linearGradient id="flPedal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1A1B1F" />
              <stop offset="0.5" stopColor="#3A3D44" />
              <stop offset="1" stopColor="#141518" />
            </linearGradient>
            <radialGradient id="flVig" cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.5" stopColor="#000000" stopOpacity={0} />
              <stop offset="1" stopColor="#000000" stopOpacity={0.75} />
            </radialGradient>
          </defs>
          <rect x={-200} y={-200} width={1500} height={2400} fill="url(#flBack)" />
          {/* the carpet: the footwell's floor running away from us, the phone's light pooled on it */}
          <path d="M-200 1000L1300 900L1300 2200L-200 2200Z" fill="url(#flWeave)" />
          <path d="M-200 1000L1300 900" stroke="#1E1E23" strokeWidth={3} />
          <ellipse cx={330} cy={1150} rx={520} ry={260} fill="url(#flGlow)" />
          {/* the phone's light on the firewall behind her feet: the black pumps stand out against it */}
          <ellipse cx={640} cy={860} rx={460} ry={330} fill="url(#flGlow)" opacity={0.9} />
          <ellipse cx={640} cy={880} rx={300} ry={220} fill="#8FA6D8" opacity={0.1} />
          {/* the accelerator: a slim dark pedal hung from above, its rubber face catching the light */}
          <path d="M792 300L812 300L846 760L826 760Z" fill="#141518" />
          <path d="M760 740L878 720L912 1030L812 1052Z" fill="url(#flPedal)" />
          <path d="M770 750L872 732" stroke="#5A5F68" strokeWidth={2} opacity={0.6} />
        </svg>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Woman uid="flw" x={FW.x} y={FW.y} size={FW.size} pose={pose} pal={skinPal} rim={0.9} />
          {/* the phone's cold light on her ankle and instep */}
          <ellipse cx={600} cy={960} rx={260} ry={200} fill="url(#flGlow)" style={{mixBlendMode: 'screen'}} />
          <rect x={-200} y={-200} width={1500} height={2400} fill="url(#flVig)" />
        </svg>
      </div>
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
  // v1.2 (the art director: the hand snapped in 2-3 frames, the palm flat over her cheek and mouth, then the elbow out behind
  // her head): it is her FAR hand that leaves the wheel and goes up behind her head into her hair (the near arm would cross her
  // face in profile); its path keeps the wrist well away from the shoulder (one bend, the elbow rising forward without a flip,
  // checked frame by frame), the head and the hair drawn over it; 26 frames on a sine ease
  const lift = E.sine(prog(t, hairAt, 26));
  const hair: WPose = {...DRIVE.road, head: 7, neck: 3, chest: 1, shrug: 4, near: {...DRIVE.road.near, hand: 'relax'}, ex: {lid: 0.08, smile: 0, brow: 0.6, browTilt: 8, curve: -0.25, open: 0.15, look: 0}};
  const WAY: Pt[] = [toBody(RIM), [170, -850], [80, -940], [0, -960], [-24, -948]];
  const HA = [150, 175, 195, 205, 210];
  const pathAt = (q: number): {p: Pt; a: number} => {
    const u = clamp(q) * (WAY.length - 1);
    const i = Math.min(WAY.length - 2, Math.floor(u));
    const f = u - i;
    const P0 = WAY[Math.max(0, i - 1)];
    const P1 = WAY[i];
    const P2 = WAY[i + 1];
    const P3 = WAY[Math.min(WAY.length - 1, i + 2)];
    const cr = (a: number, b2: number, c: number, d: number) => 0.5 * (2 * b2 + (-a + c) * f + (2 * a - 5 * b2 + 4 * c - d) * f * f + (-a + 3 * b2 - 3 * c + d) * f * f * f);
    return {p: [cr(P0[0], P1[0], P2[0], P3[0]), cr(P0[1], P1[1], P2[1], P3[1])], a: lerp(HA[i], HA[i + 1], f)};
  };
  const base = mixW(DRIVE.road, hair, lift);
  const w = pathAt(lift);
  const pose: WPose = lift <= 0 ? DRIVE.road : {...base, near: DRIVE.road.near, far: {to: w.p, bend: -1, hand: lift < 0.4 ? 'wheel' : 'hair', ha: w.a}};
  const b = breath(t, 0.7);
  return <DriverSide uid="sgh" t={t + 420} pose={pose} cam={{s: lerp(1.12, 1.2, k), ox: 520, oy: 900, dx: b.x - 20, dy: b.y - 60}} glow={0.35} hills speed={7} />;
};

const Black: React.FC = () => <div style={{position: 'absolute', inset: 0, background: '#000'}} />;

export const SHOTS: Record<string, React.FC> = {hook: Hook, scream: Scream, screen: ScreenShot, sign: Sign, missed: Missed, drop: Drop, floor: Floor, sigh: Sigh, black: Black};
void project;
void silPal;
