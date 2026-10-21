// ACT 4, CarPlay (the owner, 2026-10-21: "what you asked for is here: VINARI is on CarPlay, and how to connect it"): a
// 2020s cabin at night from the passenger seat, looking at the dash: the wide centre screen floating on it, the wheel and its
// slim display at the left, the windscreen and the city beyond, the console with the wireless pad below. The screen shows the
// REAL CarPlay captures (public/screens/carplay, 800 x 480), WHOLE and sharp, never cropped: the home with the VINARI icon,
// „სად?" with home and work, the route's preview with „წავედით", the guidance, „მოვედით". Her hand (red nails) taps them.
// Text only white (the dark) or black.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {F} from '../tokens';
import {clamp, E, lerp, prog, smoothPath, sp} from './lib';
import {breath, cssCam, useShot} from './kit/stage';
import {Bokeh, cityLights} from './kit/cabin';
import {Phone3, type Pose} from './kit/phone3d';
import {RED_NAIL, womanPal} from './kit/woman';
import {SKIN_NIGHT} from './Act1';

type Pt = [number, number];
export const CP_W = 800;
export const CP_H = 480;
export const cpSrc = (name: string) => staticFile(`screens/carplay/${name}.png`);

/** the centre screen on the dash (stage px): its glass's rect (the capture at 0.98) and its gentle turn toward the driver */
export const SCR = {x: 150, y: 868, w: 784, h: 470.4, yaw: 9};
/** a capture point (800 x 480 px) on the stage (the turn is small: the flat rect is close enough for a finger's aim) */
export const onScr = (u: number, v: number): Pt => [SCR.x + (u / CP_W) * SCR.w, SCR.y + (v / CP_H) * SCR.h];
// the captures' targets (capture px)
export const ICON_BIG: Pt = [196, 286];
export const ROW_HOME: Pt = [450, 200];
export const BTN_GO: Pt = [248, 410];

/** the screen's content: a cross-fade between captures (`from` under, `to` over at k), the VINARI icon's pulse */
const ScreenContent: React.FC<{from: string | null; to: string; k: number; pulse?: number; on?: number}> = ({from, to, k, pulse = 0, on = 1}) => (
  <div style={{position: 'absolute', inset: 0, background: '#000'}}>
    {from ? <Img src={cpSrc(from)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} /> : null}
    <Img src={cpSrc(to)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: clamp(k)}} />
    {pulse > 0 && pulse < 1 ? (
      <div
        style={{
          position: 'absolute',
          left: `${((ICON_BIG[0] - 60) / CP_W) * 100}%`,
          top: `${((ICON_BIG[1] - 60) / CP_H) * 100}%`,
          width: `${(120 / CP_W) * 100}%`,
          height: `${(120 / CP_H) * 100}%`,
          borderRadius: '24%',
          boxShadow: `0 0 0 ${(4 + 22 * pulse).toFixed(1)}px rgba(255,255,255,${(0.55 * (1 - pulse)).toFixed(3)})`,
        }}
      />
    ) : null}
    <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 1 - clamp(on)}} />
  </div>
);

/** the how-to's step: a white disc with the black numeral at the frame's top left (no words: the subtitle says the step) */
export const Step: React.FC<{n: number; k: number}> = ({n, k}) => (
  <div
    style={{
      position: 'absolute',
      left: 84,
      top: 230,
      width: 104,
      height: 104,
      borderRadius: 52,
      background: '#FFFFFF',
      color: '#0B0B0B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F.sans,
      fontWeight: 700,
      fontSize: 58,
      boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
      opacity: clamp(k * 1.8),
      transform: `scale(${lerp(0.6, 1, E.outBack(clamp(k))).toFixed(4)})`,
    }}
  >
    <span style={{marginTop: 4}}>{n}</span>
  </div>
);

/** a finger's tap ring on the screen (stage px) */
const Ring: React.FC<{p: Pt; k: number}> = ({p, k}) =>
  k > 0 && k < 1 ? <circle cx={p[0]} cy={p[1]} r={20 + 40 * k} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.8 * (1 - k)} /> : null;

/** her right hand reaching across from the driver's side (the left), the index out, the other fingers curled, the thumb
 *  along them, a thin gold bangle, the red nail on the index and the thumb; `tip` the fingertip (stage px), `press` 0..1 (the
 *  finger presses: the hand drops a few px). Drawn in the hand's own frame (u toward the tip, v down) and turned up-right. */
export const Hand: React.FC<{tip: Pt; press?: number; id: string; ang?: number}> = ({tip, press = 0, id, ang = -24}) => {
  const [deep, shadow, half, hi] = womanPal(1.05, true, SKIN_NIGHT).lit;
  const a = (ang * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const X = (u: number, v: number): Pt => [tip[0] + u * c - v * sn, tip[1] + 6 * press + u * sn + v * c];
  const path = (pts: [number, number][], close = true) => smoothPath(pts.map(([u, v]) => X(u, v)), close);
  const arm = path([[-230, -26], [-520, -40], [-1000, -60], [-1000, 110], [-520, 82], [-232, 56]]);
  const hand = path([
    [-232, -22], [-170, -24], [-122, -13], [-60, -11], [-20, -10], [-4, -6], [1, 1], [-4, 8], [-22, 10], [-80, 12],
    [-66, 26], [-64, 44], [-80, 58], [-92, 70], [-112, 80], [-134, 84], [-162, 76], [-196, 64], [-232, 56],
  ]);
  const thumb = path([[-178, 22], [-140, 24], [-104, 30], [-86, 38], [-84, 46], [-96, 50], [-128, 46], [-170, 44]]);
  const nail = (u: number, v: number, w: number, h: number, rot = 0) => {
    const [x, y] = X(u, v);
    return <ellipse cx={x} cy={y} rx={w} ry={h} fill={RED_NAIL} transform={`rotate(${ang + rot} ${x} ${y})`} />;
  };
  const [b0, b1] = [X(-226, -27), X(-226, 58)];
  const [g0, g1] = [X(0, -60), X(0, 90)];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`${id}a`} gradientUnits="userSpaceOnUse" x1={g0[0]} y1={g0[1]} x2={g1[0]} y2={g1[1]}>
          <stop offset="0" stopColor={hi} />
          <stop offset="0.45" stopColor={half} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${id}t`} gradientUnits="userSpaceOnUse" x1={g0[0]} y1={g0[1]} x2={g1[0]} y2={g1[1]}>
          <stop offset="0" stopColor={hi} />
          <stop offset="0.6" stopColor={half} />
          <stop offset="1" stopColor={shadow} />
        </linearGradient>
      </defs>
      <path d={arm} fill={`url(#${id}a)`} />
      <path d={hand} fill={`url(#${id}a)`} />
      <path d={path([[-66, 26], [-64, 44], [-80, 58]], false)} stroke={deep} strokeWidth={2} fill="none" opacity={0.4} />
      <path d={path([[-92, 70], [-112, 80], [-134, 84]], false)} stroke={deep} strokeWidth={2} fill="none" opacity={0.35} />
      <path d={thumb} fill={`url(#${id}t)`} />
      {nail(-9, -3, 11, 7)}
      {nail(-92, 42, 8, 5.5, 10)}
      <path d={path([[-160, -22], [-110, -12], [-40, -10], [-12, -8]], false)} stroke={hi} strokeWidth={2.2} fill="none" opacity={0.55} />
      <line x1={b0[0]} y1={b0[1]} x2={b1[0]} y2={b1[1]} stroke="#D9B477" strokeWidth={6} strokeLinecap="round" opacity={0.9} />
    </svg>
  );
};

/** the dash at night from the passenger seat (stage px); `children` are drawn on the screen's glass (capture px, 800 x 480) */
export const Dash: React.FC<{
  uid: string;
  t: number;
  cam: {s: number; ox: number; oy: number; dx?: number; dy?: number};
  screen: React.ReactNode;
  glow?: number; // the screen's light on the dash (0..1)
  phone?: boolean; // the iPhone on the console's pad (drawn by the shot over the stage)
  speakers?: number; // the dash speakers' rings (0..1 loud)
  over?: React.ReactNode; // drawn over everything in stage px (her hand)
  step?: React.ReactNode; // drawn over the frame (frame px)
}> = ({uid, t, cam, screen, glow = 1, speakers = 0, over, step}) => {
  const lights = React.useMemo(() => cityLights(57, 50, 2600), []);
  const travel = t * 1.4;
  const rings = [];
  if (speakers > 0) {
    for (let n = 0; n < 3; n++) {
      const ph = ((t / 16 + n / 3) % 1 + 1) % 1;
      rings.push(<ellipse key={`l${n}`} cx={540} cy={846} rx={60 + 260 * ph} ry={14 + 70 * ph} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.35 * (1 - ph) * speakers} />);
      rings.push(<circle key={`r${n}`} cx={1000} cy={812} r={30 + 120 * ph} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.35 * (1 - ph) * speakers} />);
    }
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: '#07080B', overflow: 'hidden'}}>
      <div style={cssCam(cam.s, cam.ox, cam.oy, cam.dx ?? 0, cam.dy ?? 0)}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#090C16" />
              <stop offset="0.7" stopColor="#161A26" />
              <stop offset="1" stopColor="#2A2228" />
            </linearGradient>
            <linearGradient id={`${uid}dash`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#202127" />
              <stop offset="0.12" stopColor="#141519" />
              <stop offset="1" stopColor="#09090B" />
            </linearGradient>
            <linearGradient id={`${uid}con`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#17181C" />
              <stop offset="1" stopColor="#060607" />
            </linearGradient>
            <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#7FB2C8" stopOpacity={0.35} />
              <stop offset="0.6" stopColor="#7FB2C8" stopOpacity={0.08} />
              <stop offset="1" stopColor="#7FB2C8" stopOpacity={0} />
            </radialGradient>
            <linearGradient id={`${uid}trim`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3A3631" />
              <stop offset="0.5" stopColor="#6E665C" />
              <stop offset="1" stopColor="#3A3631" />
            </linearGradient>
            <clipPath id={`${uid}ws`}>
              <path d="M-80 120Q540 60 1160 120L1160 860L-80 860Z" />
            </clipPath>
          </defs>
          <rect x={-200} y={-200} width={1500} height={2400} fill="#07080B" />
          {/* the windscreen: the night avenue ahead, its lights drifting closer */}
          <g clipPath={`url(#${uid}ws)`}>
            <rect x={-100} y={80} width={1300} height={800} fill={`url(#${uid}sky)`} />
            <rect x={-100} y={600} width={1300} height={260} fill="#1E1A1F" opacity={0.6} />
            <Bokeh uid={`${uid}b`} lights={lights} travel={travel} len={2600} x0={-120} w={1320} dim={0.75} />
          </g>
          {/* the roof's edge and the A pillars */}
          <path d="M-100 -100H1200V130Q540 70 -100 130Z" fill="#060709" />
          <path d="M-100 120L60 128L-100 900Z" fill="#0A0B0E" />
          <path d="M1200 120L1040 128L1200 900Z" fill="#0A0B0E" />
          {/* the dash: its soft top, the centre speaker's slim grille, the trim line, the ambient strip, the tweeter on the right */}
          <path d="M-100 820Q540 770 1200 820L1200 1500L-100 1500Z" fill={`url(#${uid}dash)`} />
          <path d="M-100 820Q540 770 1200 820" stroke="#34363D" strokeWidth={3} />
          <rect x={360} y={836} width={360} height={16} rx={8} fill="#0D0E11" />
          {Array.from({length: 40}).map((_, i) => (
            <circle key={i} cx={372 + i * 8.8} cy={844} r={2} fill="#2A2C32" />
          ))}
          <circle cx={1000} cy={812} r={26} fill="#0D0E11" stroke="#4A4C52" strokeWidth={3} />
          <circle cx={1000} cy={812} r={14} fill="#1C1D22" />
          {rings}
          <path d="M-100 1372Q540 1350 1200 1372" stroke={`url(#${uid}trim)`} strokeWidth={10} />
          <path d="M-100 1392Q540 1370 1200 1392" stroke="#E9C59A" strokeWidth={3} opacity={0.55} />
          <path d="M-100 1392Q540 1370 1200 1392" stroke="#E9C59A" strokeWidth={12} opacity={0.08} />
          {/* the passenger's slim vent on the right */}
          <rect x={968} y={1000} width={180} height={34} rx={17} fill="#0B0C0F" />
          <path d="M984 1017H1140" stroke="#2C2E35" strokeWidth={3} />
          {/* the wheel's right half at the left edge and the driver's slim display behind it */}
          <path d="M-60 760Q140 900 90 1180Q40 1380 -120 1480" stroke="#0A0A0C" strokeWidth={46} fill="none" strokeLinecap="round" />
          <path d="M-56 772Q136 906 88 1170" stroke="#3A3F4B" strokeWidth={3} fill="none" opacity={0.55} />
          {/* the console below: the climate row, the drive selector, the wireless pad, the armrest */}
          <path d="M120 1500Q540 1460 960 1500L1060 2000L20 2000Z" fill={`url(#${uid}con)`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={254 + i * 98} y={1416} width={58} height={8} rx={4} fill="#3A3D44" opacity={0.85} />
          ))}
          <rect x={420} y={1540} width={240} height={330} rx={34} fill="#0C0D10" stroke="#24262C" strokeWidth={3} />
          <circle cx={850} cy={1640} r={44} fill="#121317" stroke="#3E4047" strokeWidth={4} />
          <circle cx={850} cy={1640} r={20} fill="#1D1E23" />
          {/* the screen's light on the dash around it */}
          <ellipse cx={SCR.x + SCR.w / 2} cy={SCR.y + SCR.h / 2} rx={SCR.w * 0.8} ry={SCR.h * 0.95} fill={`url(#${uid}glow)`} opacity={glow} />
        </svg>
        {/* the screen: a black glass slab with a thin bezel, the capture on it (HTML: crisp), a faint reflection over it */}
        <div style={{position: 'absolute', inset: 0, perspective: '1800px', perspectiveOrigin: `${SCR.x + SCR.w / 2}px ${SCR.y + SCR.h / 2}px`}}>
          <div
            style={{
              position: 'absolute',
              left: SCR.x - 14,
              top: SCR.y - 14,
              width: SCR.w + 28,
              height: SCR.h + 28,
              borderRadius: 30,
              background: '#050506',
              boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 2px #2A2C32',
              transform: `rotateY(${SCR.yaw}deg)`,
            }}
          >
            <div style={{position: 'absolute', left: 14, top: 14, width: SCR.w, height: SCR.h, borderRadius: 18, overflow: 'hidden'}}>
              {screen}
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%)'}} />
            </div>
          </div>
        </div>
        {over}
      </div>
      {step}
    </div>
  );
};

// ---- 16 cpwake: the cabin wide, the screen asleep; on „და რასაც ითხოვდით" it wakes on CarPlay's home; on „ვინარი" the VINARI
// icon breathes; the camera pushes toward the screen ---------------------------------------------------------------------------
const CpWake: React.FC = () => {
  const {t, len, L} = useShot('cpwake');
  const wake = L('wake');
  const icon = L('icon');
  const k = E.inOut(prog(t, 0, len));
  const on = E.out(prog(t, wake, 12));
  const pulse = ((t - icon) % 28) / 28;
  const b = breath(t, 0.6);
  return (
    <Dash
      uid="cpw"
      t={t}
      cam={{s: lerp(1.0, 1.12, k), ox: 540, oy: 1100, dx: b.x, dy: b.y - 40}}
      glow={on}
      screen={<ScreenContent from={null} to="f18-03-home-car" k={1} on={on} pulse={t >= icon ? pulse : 0} />}
    />
  );
};

// ---- the console from above (the plug and the hands-free shots): the recessed rubber tray of the wireless pad with its coil's
// faint ring, the two USB-C ports at its front lip, the cup holders and the drive selector beside it, the screen's cold glow
// spilling down from the top edge; the iPhone lies in the tray ---------------------------------------------------------------
const TRAY = {x: 300, y: 250, w: 520, h: 1060};
const PORT: Pt = [560, 1344];
const ConsoleTop: React.FC<{t: number}> = ({t}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="ctTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1B1C21" />
        <stop offset="1" stopColor="#0C0D0F" />
      </linearGradient>
      <radialGradient id="ctTray" cx="0.5" cy="0.45" r="0.65">
        <stop offset="0" stopColor="#131418" />
        <stop offset="1" stopColor="#08090A" />
      </radialGradient>
      <linearGradient id="ctGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7FB2C8" stopOpacity={0.3} />
        <stop offset="1" stopColor="#7FB2C8" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="ctTrim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3A3631" />
        <stop offset="0.5" stopColor="#7A7164" />
        <stop offset="1" stopColor="#3A3631" />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#ctTop)" />
    <rect width={1080} height={420} fill="url(#ctGlow)" />
    {/* the trim strips along the console's sides */}
    <rect x={210} y={-20} width={10} height={1960} fill="url(#ctTrim)" opacity={0.8} />
    <rect x={900} y={-20} width={10} height={1960} fill="url(#ctTrim)" opacity={0.8} />
    {/* the tray: a soft recess (its inner shadow), the coil's ring */}
    <rect x={TRAY.x - 8} y={TRAY.y - 8} width={TRAY.w + 16} height={TRAY.h + 16} rx={64} fill="#050506" />
    <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={58} fill="url(#ctTray)" />
    <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} rx={58} fill="none" stroke="#000000" strokeWidth={16} opacity={0.35} />
    <circle cx={560} cy={780} r={150} fill="none" stroke="#1C1D22" strokeWidth={6} />
    {/* the ports at the tray's front lip */}
    <rect x={PORT[0] - 92} y={PORT[1] - 13} width={70} height={26} rx={13} fill="#030304" stroke="#3E4047" strokeWidth={3} />
    <rect x={PORT[0] + 22} y={PORT[1] - 13} width={70} height={26} rx={13} fill="#030304" stroke="#3E4047" strokeWidth={3} />
    {/* the drive selector and the cup holders below the tray */}
    <circle cx={560} cy={1640} r={70} fill="#101114" stroke="#3E4047" strokeWidth={4} />
    <circle cx={560} cy={1640} r={36} fill="#1B1C21" />
    <circle cx={380} cy={1820} r={80} fill="#060607" stroke="#24262C" strokeWidth={4} />
    <circle cx={740} cy={1820} r={80} fill="#060607" stroke="#24262C" strokeWidth={4} />
    <path d="M120 1530Q560 1510 1000 1530" stroke="#E9C59A" strokeWidth={3} opacity={0.4 + 0.05 * Math.sin(t / 30)} />
  </svg>
);

const Plug: React.FC = () => {
  const {t, len, L} = useShot('plug');
  const plugAt = L('plugIn');
  const wl = L('wireless');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.5);
  const pose: Pose = {x: 560 + b.x * 0.3, y: 780 + b.y * 0.3, w: 400, yaw: 0, pitch: 0, roll: 0};
  // the phone's foot (its port) and the cable's plug sliding from the console's port up into it
  const footY = 780 + (400 * (2346 / 1080) + 2 * 0.034 * 400) / 2;
  const ins = E.inOut(prog(t, plugAt - 16, 16));
  const gone = E.inOut(prog(t, wl - 2, 10));
  const plugY = lerp(footY + 150, footY - 4, ins);
  const arcs = sp(t, wl, 120, 16);
  const cam = lerp(1.0, 1.04, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#08090B', overflow: 'hidden'}}>
      <div style={cssCam(cam, 560, 900)}>
        <ConsoleTop t={t} />
        {ins > 0.01 ? (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - gone}}>
            <path d={`M${PORT[0] + 57} ${PORT[1]}C${PORT[0] + 57} ${PORT[1] - 60} ${560 + 40} ${plugY + 120} 560 ${plugY + 52}`} stroke="#E6E6E6" strokeWidth={16} fill="none" strokeLinecap="round" />
            <rect x={560 - 18} y={plugY} width={36} height={62} rx={10} fill="#F2F2F2" />
            <rect x={560 - 10} y={plugY - 8} width={20} height={12} rx={3} fill="#B8BCC4" />
          </svg>
        ) : null}
      </div>
      <Phone3 src="screens/carplay/phone-home.png" pose={{...pose, x: 560 + (pose.x - 560) * cam, y: 900 + (pose.y - 900) * cam, w: pose.w * cam}} look={0.15} rim={0.8} shadow={0} />
      {arcs > 0.01 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {[0, 1, 2].map((i) => {
            const ph = (((t - wl) / 18 + i / 3) % 1 + 1) % 1;
            const r = 70 + 180 * ph;
            return <path key={i} d={`M${560 - r} ${250 - r * 0.15}A${r} ${r} 0 0 1 ${560 + r} ${250 - r * 0.15}`} stroke="#FFFFFF" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.75 * (1 - ph) * clamp(arcs)} />;
          })}
        </svg>
      ) : null}
      <Step n={1} k={sp(t, 2, 160, 14)} />
    </div>
  );
};

// ---- 18 tapicon: the screen close: her hand reaches in from the driver's side and taps the VINARI icon; the screen goes to
// „სად?" -------------------------------------------------------------------------------------------------------------------
const TapIcon: React.FC = () => {
  const {t, len, L} = useShot('tapicon');
  const tap = L('tapIcon');
  const k = E.inOut(prog(t, 0, len));
  const target = onScr(...ICON_BIG);
  const reach = E.inOut(prog(t, tap - 22, 20));
  const press = Math.sin(Math.PI * clamp((t - tap + 2) / 8));
  const back = E.inOut(prog(t, tap + 8, 14));
  const tip: Pt = [lerp(target[0] - 520, target[0], reach) - 300 * back, lerp(target[1] + 260, target[1], reach) + 160 * back];
  const sw = E.out(prog(t, tap + 1, 5));
  return (
    <Dash
      uid="cpt"
      t={t + 200}
      cam={{s: lerp(1.26, 1.3, k), ox: 542, oy: 1103, dx: 0, dy: -150}}
      screen={<ScreenContent from="f18-03-home-car" to="f18-06-list-car" k={sw} />}
      over={
        <>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <Ring p={target} k={prog(t, tap, 14)} />
          </svg>
          {reach > 0.01 && back < 0.99 ? <Hand tip={tip} press={press} id="hti" /> : null}
        </>
      }
      step={<Step n={2} k={sp(t, 2, 160, 14)} />}
    />
  );
};

// ---- 19 where: „სად?": the finger on „სახლი", the route's preview with „წავედით", the tap, the guidance ---------------------
const Where: React.FC = () => {
  const {t, len, L} = useShot('where');
  const tapHome = L('tapHome');
  const prev = L('preview');
  const tapGo = L('tapGo');
  const guide = L('guide');
  const k = E.inOut(prog(t, 0, len));
  const home = onScr(...ROW_HOME);
  const go = onScr(...BTN_GO);
  // the hand: rests at the home row, presses, moves to „წავედით", presses, leaves
  const m = E.inOut(prog(t, tapHome + 8, Math.max(6, tapGo - tapHome - 12)));
  const leave = E.inOut(prog(t, tapGo + 8, 14));
  const appear = E.inOut(prog(t, 0, 10));
  const tip: Pt = [lerp(home[0], go[0], m) - 340 * leave - 300 * (1 - appear), lerp(home[1], go[1], m) + 200 * leave + 160 * (1 - appear)];
  const press = Math.max(Math.sin(Math.PI * clamp((t - tapHome + 2) / 8)), Math.sin(Math.PI * clamp((t - tapGo + 2) / 8)));
  let from = 'f18-06-list-car';
  let to = 'f18-06-list-car';
  let kk = 1;
  if (t >= guide) {
    from = 'f18-07-preview-car';
    to = 'f18-10-guid1-car';
    kk = E.out(prog(t, guide, 8));
  } else if (t >= prev) {
    from = 'f18-06-list-car';
    to = 'f18-07-preview-car';
    kk = E.out(prog(t, prev, 6));
  }
  return (
    <Dash
      uid="cpr"
      t={t + 300}
      cam={{s: lerp(1.3, 1.31, k), ox: 542, oy: 1103, dx: 0, dy: -150}}
      screen={<ScreenContent from={from} to={to} k={kk} />}
      over={
        <>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <Ring p={home} k={prog(t, tapHome, 14)} />
            <Ring p={go} k={prog(t, tapGo, 14)} />
          </svg>
          {leave < 0.99 ? <Hand tip={tip} press={press} id="hwh" /> : null}
        </>
      }
      step={<Step n={3} k={sp(t, 2, 160, 14)} />}
    />
  );
};

// ---- 20 hands: the console again: the phone asleep in its tray, the cable in it, nobody's hand near it; the screen's map
// light moves over the trim from above --------------------------------------------------------------------------------------
const Hands: React.FC = () => {
  const {t, len} = useShot('hands');
  const k = E.inOut(prog(t, 0, len));
  const cam = lerp(1.08, 1.0, k);
  const footY = 780 + (400 * (2346 / 1080) + 2 * 0.034 * 400) / 2;
  const pose: Pose = {x: 560, y: 900 + (780 - 900) * cam, w: 400 * cam, yaw: 0, pitch: 0, roll: 0};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#08090B', overflow: 'hidden'}}>
      <div style={cssCam(cam, 560, 900)}>
        <ConsoleTop t={t + 300} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M${PORT[0] + 57} ${PORT[1]}C${PORT[0] + 57} ${PORT[1] - 60} ${560 + 40} ${footY + 116} 560 ${footY + 48}`} stroke="#E6E6E6" strokeWidth={16} fill="none" strokeLinecap="round" />
          <rect x={560 - 18} y={footY - 4} width={36} height={62} rx={10} fill="#F2F2F2" />
        </svg>
      </div>
      <Phone3 src="screens/carplay/phone-home.png" pose={pose} on={0.08} look={0.1} rim={0.75} shadow={0} />
    </div>
  );
};

// ---- 20b speakers: the screen's map closer and to the left, the dash's centre grille and the right tweeter breathing with
// the voice ---------------------------------------------------------------------------------------------------------------------
const Speakers: React.FC = () => {
  const {t, len, L} = useShot('speakers');
  const spk = L('speakers');
  const k = E.inOut(prog(t, 0, len));
  const loud = E.out(prog(t, spk, 10));
  return <Dash uid="cps" t={t + 500} cam={{s: lerp(1.08, 1.13, k), ox: 590, oy: 1000, dx: -40, dy: 30}} screen={<ScreenContent from={null} to="f18-10-guid1-car" k={1} />} speakers={loud} />;
};

export const SHOTS: Record<string, React.FC> = {cpwake: CpWake, plug: Plug, tapicon: TapIcon, where: Where, hands: Hands, speakers: Speakers};
