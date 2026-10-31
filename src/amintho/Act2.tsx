// „კიდევ ამინთო", act 2 (2026-10-31): VINARI. The white world for the app (real captures on the flat phone, never WebGL), the
// night again for the driver at his car:
//   ask      the order of things: the lamp, then (1) the car and the phone, then (2) the mechanic, dimmer
//   plug     the 16-pin port under the dash; the small adapter rises into it, clicks, its LED wakes
//   scan     the phone: the scan at 4/5, then the result (the lamp card, the one code P0457)
//   result   the code's own page: „ავზის თავსახური მოშვებულია ან აკლია (EVAP)" lifted with a band
//   cap      night: he looks at the fuel door, the cap sitting loose
//   twist    the cap turned home, three clicks
//   dashoff  the cockpit: the lamp goes out; the 1 100 ₾ above it gets its line through
//   smile    he starts the old swear, then laughs, phone in hand
// The captures carry the app's „ნიმუში" badge on the sample path: every view starts below it (never painted over).
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {F} from '../tokens';
import {mtav} from '../lib/format';
import {Backdrop} from '../scenes/illo/backdrop';
import {Car} from '../scenes/illo/car';
import {Figure} from '../scenes/illo/figure';
import {ground} from '../scenes/illo/palette';
import {DefsSvg} from '../scenes/illo/solid';
import {clamp, E, lerp, prog, shake, sp} from './lib';
import {DRIVER} from './Act1';
import {AdapterBody, PortFace} from './kit/bits';
import {Cockpit, CP, CP_LAMP} from './kit/cockpit';
import {Iphone} from './kit/iphone';
import {AMBER, EngineIcon, INK, StepChip, useShot} from './kit/stage';

const W = 1080;
const H = 1920;
const PAPER = '#F3F3F5';

const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);
const cam = (s: number, ox: number, oy: number, dx = 0, dy = 0): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`,
  transformOrigin: `${ox}px ${oy}px`,
});
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: `radial-gradient(120% 80% at 50% 38%, #FFFFFF 0%, ${PAPER} 70%)`, overflow: 'hidden'}}>{children}</AbsoluteFill>
);
const Night: React.FC<{uid: string; children: React.ReactNode}> = ({uid, children}) => (
  <AbsoluteFill style={{background: ground('night'), overflow: 'hidden'}}>
    <DefsSvg uid={uid} />
    {children}
  </AbsoluteFill>
);
/** the phone's slow entrance from below (the owner: "the mockup must rise slowly and gently") */

// ---- ask: the order of things -------------------------------------------------------------------------------------------------
const WRENCH = 'M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1z';
export const Ask: React.FC = () => {
  const {t, L} = useShot('ask');
  const a = L('askA');
  const b = L('askB');
  const lampK = sp(t, 0, 150, 16);
  const k1 = sp(t, a - 2, 150, 16);
  const k2 = sp(t, b - 2, 150, 16);
  const link = E.inOut(prog(t, a + 6, 16));
  const ROW1 = 790;
  const ROW2 = 1160;
  return (
    <Paper>
      <DefsSvg uid="ask" />
      {/* the lamp: a white disc, the amber icon lit */}
      <div style={{position: 'absolute', left: 540 - 150, top: 380 - 150 + (1 - lampK) * 40, width: 300, height: 300, borderRadius: 150, background: '#FFFFFF', boxShadow: '0 30px 70px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)', opacity: clamp(lampK * 2)}} />
      <Svg style={{opacity: clamp(lampK * 2)}}>
        <EngineIcon x={540} y={380} size={180} k={1} uid="ask" glow={0.8} />
      </Svg>
      {/* 1: the car and the phone, an amber dotted link between them */}
      <StepChip n={1} x={96} y={ROW1} k={k1} size={88} />
      <div style={{position: 'absolute', inset: 0, opacity: clamp(k1 * 2), transform: `translateY(${((1 - clamp(k1)) * 40).toFixed(1)}px)`}}>
        <Svg>
          <Car uid="ask" x={430} y={ROW1 + 120} len={500} view="side" dir={1} body="suv" paint="a" frame={t} time="day" />
          <path d={`M670 ${ROW1 - 30}Q770 ${ROW1 - 140} 850 ${ROW1 - 60}`} fill="none" stroke={AMBER} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - link} />
        </Svg>
        <Iphone cx={900} cy={ROW1 + 30} w={200} src="obd-p0457-detail" view={{x: 0.5, y: 0.3, zoom: 1.0}} shadow={0.6} />
      </div>
      {/* 2: the mechanic, after; quieter */}
      <StepChip n={2} x={96} y={ROW2} k={k2} size={88} />
      <div style={{position: 'absolute', inset: 0, opacity: clamp(k2 * 2) * 0.6, transform: `translateY(${((1 - clamp(k2)) * 40).toFixed(1)}px)`}}>
        <Svg>
          <circle cx={540} cy={ROW2} r={130} fill="#FFFFFF" stroke="#DCDCE0" strokeWidth={3} />
          <g transform={`translate(${540 - 78} ${ROW2 - 78}) scale(6.5)`}>
            <path d={WRENCH} fill="none" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        </Svg>
      </div>
    </Paper>
  );
};

// ---- plug: the adapter into the port ------------------------------------------------------------------------------------------
export const Plug: React.FC = () => {
  const {t, len, L} = useShot('plug');
  const go = L('adapter');
  const click = L('click');
  const r = E.out(clamp((t - go) / Math.max(1, click - go)));
  const seat = t >= click ? 1 : 0;
  const bump = t >= click ? shake(t, click, 5, 8) : 0;
  const led = t >= click + 4 ? (Math.floor((t - click) / 8) % 2 === 0 ? 1 : 0.35) : 0;
  const s = 1.0 + 0.06 * E.inOut(prog(t, 0, len));
  const PORT = {x: 540, y: 690};
  const top = lerp(1500, PORT.y - 52, r) + bump;
  const ring = prog(t, click, 14);
  return (
    <Paper>
      <DefsSvg uid="plug" />
      <div style={cam(s, 540, 760)}>
        <Svg>
          {/* the dash's underside: a soft dark lip above the port */}
          <path d="M-100 420C200 470 880 470 1180 420V560C880 610 200 610 -100 560Z" fill="#1C1E23" />
          <path d="M-100 560C200 610 880 610 1180 560V580C880 630 200 630 -100 580Z" fill="#2B2E35" />
          <PortFace cx={PORT.x} cy={PORT.y} s={1.15} uid="plug" glow={seat} />
          <AdapterBody cx={PORT.x} top={top} s={1.05} led={led} uid="plugA" />
          {ring > 0 && ring < 1 ? <circle cx={PORT.x} cy={PORT.y} r={lerp(150, 330, E.out(ring))} fill="none" stroke={AMBER} strokeWidth={6} opacity={1 - ring} /> : null}
        </Svg>
      </div>
    </Paper>
  );
};

// ---- scan: the phone reads the car ------------------------------------------------------------------------------------------------
// The capture's own cards lifted out big (a crop of the real screen, never redrawn): the scan's ring and its five rows, then the
// result's lamp card and the one code. The sample badge (capture y 400..460) is never inside a crop.
type Box = [number, number, number, number]; // capture px: x0, y0, x1, y1
export const CropCard: React.FC<{src: string; r: Box; cx: number; cy: number; w: number; k: number; mark?: number}> = ({src, r, cx, cy, w, k, mark = 0}) => {
  const sc = w / (r[2] - r[0]);
  const h = (r[3] - r[1]) * sc;
  if (k <= 0) return null;
  return (
    <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2 + (1 - clamp(k)) * 70, width: w, height: h, borderRadius: 40, overflow: 'hidden', background: '#FFFFFF', opacity: clamp(k * 1.8), boxShadow: '0 30px 70px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)'}}>
      <Img src={staticFile(`screens/${src}.jpg`)} style={{position: 'absolute', left: -r[0] * sc, top: -r[1] * sc, width: 1080 * sc, height: 2346 * sc}} />
      {mark > 0 ? <div style={{position: 'absolute', inset: 0, borderRadius: 40, boxShadow: `inset 0 0 0 ${(7 * mark).toFixed(1)}px ${AMBER}`}} /> : null}
    </div>
  );
};
export const Scan: React.FC = () => {
  const {t, len, L} = useShot('scan');
  const tell = L('tell');
  const out = E.inOut(prog(t, tell - 6, 8));
  const inn = E.inOut(prog(t, tell - 2, 10));
  const s = 1 + 0.04 * E.inOut(prog(t, 0, len));
  const k1 = sp(t, 0, 120, 16);
  const k2 = sp(t, 5, 120, 16);
  const r1 = sp(t, tell - 2, 120, 16);
  const r2 = sp(t, tell + 4, 120, 16);
  return (
    <Paper>
      <div style={cam(s, 540, 760)}>
        <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
          <CropCard src="obd-p0457-scan" r={[24, 500, 1056, 730]} cx={540} cy={420} w={960} k={k1} />
          <CropCard src="obd-p0457-scan" r={[24, 770, 1056, 1430]} cx={540} cy={890} w={960} k={k2} />
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: inn}}>
          <CropCard src="obd-p0457-result" r={[24, 1450, 1056, 1712]} cx={540} cy={470} w={960} k={r1} />
          <CropCard src="obd-p0457-result" r={[24, 1890, 1056, 2150]} cx={540} cy={860} w={960} k={r2} mark={E.out(prog(t, tell + 16, 10))} />
        </div>
      </div>
    </Paper>
  );
};

// ---- result: the code's own page ------------------------------------------------------------------------------------------------
export const Result: React.FC = () => {
  const {t, len, L} = useShot('result');
  const code = L('code');
  const s = 1 + 0.05 * E.inOut(prog(t, 0, len));
  const band = prog(t, code + 2, 10);
  return (
    <Paper>
      <div style={cam(s, 540, 700)}>
        <Iphone cx={540} cy={730} w={560} src="obd-p0457-detail" view={{x: 0.5, y: 0.47, zoom: 1.04}} band={{y: 655 / 2346, h: 160 / 2346, a: band}} fog={0.4} />
      </div>
    </Paper>
  );
};

// ---- cap: the fuel door at night ---------------------------------------------------------------------------------------------------
const PUMP = 'M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M3.5 20H15.5M6.5 7.5h6M14 10h1.6a1.4 1.4 0 0 1 1.4 1.4v4.1a1.2 1.2 0 0 0 2.4 0V8.2L17 5.8';
export const CapDoor: React.FC<{x: number; y: number; r: number; turn: number; loose: number; uid: string}> = ({x, y, r, turn, loose, uid}) => (
  <g>
    <defs>
      <radialGradient id={`${uid}well`} cx="0.5" cy="0.4" r="0.65">
        <stop offset="0" stopColor="#15171C" />
        <stop offset="1" stopColor="#060708" />
      </radialGradient>
      <linearGradient id={`${uid}cap`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3A3D44" />
        <stop offset="1" stopColor="#141518" />
      </linearGradient>
      <linearGradient id={`${uid}bar`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5B5F68" />
        <stop offset="1" stopColor="#25272C" />
      </linearGradient>
    </defs>
    {/* the flap swung open to the left, its inner face lighter, the pump mark on it */}
    <ellipse cx={x - r * 1.95} cy={y} rx={r * 0.42} ry={r * 1.12} fill="#2F4C93" stroke="#4B6BC0" strokeWidth={3} />
    <g transform={`translate(${x - r * 1.95 - r * 0.22} ${y - r * 0.24}) scale(${(r * 0.44) / 24})`}>
      <path d={PUMP} fill="none" stroke="#9FB4E8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <path d={`M${x - r * 1.12} ${y - r * 0.5}L${x - r * 1.62} ${y - r * 0.32}M${x - r * 1.12} ${y + r * 0.5}L${x - r * 1.62} ${y + r * 0.32}`} stroke="#4B6BC0" strokeWidth={8} strokeLinecap="round" />
    {/* the recess in the body */}
    <circle cx={x} cy={y} r={r * 1.12} fill={`url(#${uid}well)`} stroke="#3E5FA8" strokeWidth={5} />
    {/* when loose: the white gap between the cap and its seat */}
    {loose > 0 ? <circle cx={x} cy={y} r={r * 0.9} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeDasharray="10 14" opacity={0.7 * loose} /> : null}
    {/* the cap: a black disc, a raised grip bar across it, a tether at its edge */}
    <g transform={`rotate(${turn} ${x} ${y}) translate(${(loose * r * 0.06).toFixed(1)} ${(-loose * r * 0.04).toFixed(1)})`}>
      <circle cx={x} cy={y} r={r * 0.82} fill={`url(#${uid}cap)`} stroke="#4A4E57" strokeWidth={4} />
      <circle cx={x} cy={y} r={r * 0.66} fill="none" stroke="#2A2C31" strokeWidth={3} />
      <rect x={x - r * 0.62} y={y - r * 0.15} width={r * 1.24} height={r * 0.3} rx={r * 0.15} fill={`url(#${uid}bar)`} stroke="#6A6F79" strokeWidth={3} />
      <circle cx={x + r * 0.7} cy={y + r * 0.42} r={r * 0.06} fill="#4A4E57" />
    </g>
  </g>
);
export const Cap: React.FC = () => {
  const {t, len} = useShot('cap');
  const s = 1.0 + 0.1 * E.inOut(prog(t, 0, len));
  return (
    <Night uid="cap">
      <div style={cam(s, 700, 820)}>
        <Svg>
          {/* the car's flank, close: the cobalt paint in the night, the fuel door open */}
          <path d="M380 300C620 280 1000 290 1200 330V1340C1000 1380 620 1390 380 1360Z" fill="#1E3266" />
          <path d="M380 300C620 280 1000 290 1200 330V420C1000 380 620 372 380 390Z" fill="#2A4385" />
          <path d="M380 1240C620 1260 1000 1252 1200 1230V1340C1000 1380 620 1390 380 1360Z" fill="#162650" />
          <CapDoor x={830} y={760} r={150} turn={-26} loose={1} uid="cap" />
          <Figure uid="cap" cast={DRIVER} x={240} y={780} size={2300} crop="bust" frame={t} time="night" pose="stand" face="worried" turn={0.35} gaze={[0.5, 0.05]} />
        </Svg>
      </div>
    </Night>
  );
};

// ---- twist: the cap turned home ---------------------------------------------------------------------------------------------------
export const Twist: React.FC = () => {
  const {t, len, Ls} = useShot('twist');
  const ticks = Ls('twist');
  let turn = -26;
  ticks.forEach((k) => {
    turn += 30 * E.out(prog(t, k - 5, 6));
  });
  const s = 1.0 + 0.05 * E.inOut(prog(t, 0, len));
  return (
    <Night uid="twist">
      <div style={cam(s, 540, 800)}>
        <Svg>
          <rect x={0} y={0} width={W} height={H} fill="#1E3266" />
          <rect x={0} y={0} width={W} height={180} fill="#2A4385" opacity={0.6} />
          <CapDoor x={640} y={800} r={300} turn={turn} loose={1 - E.out(prog(t, ticks[2] - 5, 8))} uid="tw" />
          {ticks.map((k, i) => {
            const q = prog(t, k, 10);
            if (q <= 0 || q >= 1) return null;
            const a0 = -40 + i * 30;
            const rr = 400 + 40 * q;
            const p0 = [600 + Math.cos((a0 * Math.PI) / 180) * rr, 800 + Math.sin((a0 * Math.PI) / 180) * rr];
            const p1 = [600 + Math.cos(((a0 + 22) * Math.PI) / 180) * rr, 800 + Math.sin(((a0 + 22) * Math.PI) / 180) * rr];
            return <path key={i} d={`M${p0[0]} ${p0[1]}A${rr} ${rr} 0 0 1 ${p1[0]} ${p1[1]}`} fill="none" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" opacity={1 - q} />;
          })}
        </Svg>
      </div>
    </Night>
  );
};

// ---- dashoff: the lamp goes out ------------------------------------------------------------------------------------------------
export const DashOff: React.FC = () => {
  const {t, len, L} = useShot('dashoff');
  const off = L('off');
  const k = 1 - E.out(prog(t, off, 6));
  const s = 1.32 * (1 + 0.04 * E.out(prog(t, 0, len)));
  const lx = 540 + (CP_LAMP.x - CP.w / 2);
  const ly = 1000 + (CP_LAMP.y - CP.h / 2);
  const strike = E.inOut(prog(t, off + 6, 10));
  return (
    <Night uid="dashoff">
      <div style={cam(s, lx, ly)}>
        <Svg>
          <defs>
            <radialGradient id="doAmb" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={AMBER} stopOpacity={0.3} />
              <stop offset="1" stopColor={AMBER} stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d="M-200 1280C200 1140 880 1140 1280 1280V2200H-200Z" fill="#0A0B0E" />
          <circle cx={lx} cy={ly} r={480} fill="url(#doAmb)" opacity={k} />
        </Svg>
        <svg width={CP.w} height={CP.h} viewBox={`0 0 ${CP.w} ${CP.h}`} style={{position: 'absolute', left: 540 - CP.w / 2, top: 1000 - CP.h / 2, overflow: 'visible'}}>
          <Cockpit uid="dashoff" frame={t} check={k} speed={48} night={1} />
        </svg>
      </div>
      {/* the 1 100 ₾ of act 1, struck through as the lamp goes out */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative', display: 'flex', alignItems: 'baseline', gap: 18, padding: '18px 40px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.14)'}}>
          <span style={{fontFamily: F.sans, fontWeight: 400, fontSize: 40, color: 'rgba(255,255,255,0.72)'}}>{mtav('დახარჯული')}</span>
          <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 64, color: '#FFFFFF'}}>1 100 ₾</span>
          <div style={{position: 'absolute', left: 24, top: '52%', height: 6, borderRadius: 3, background: '#FFFFFF', width: `calc(${(strike * 100).toFixed(1)}% - ${(strike * 48).toFixed(1)}px)`}} />
        </div>
      </div>
    </Night>
  );
};

// ---- smile: the old swear, then a laugh ------------------------------------------------------------------------------------------
export const Smile: React.FC = () => {
  const {t, len, L} = useShot('smile');
  const laugh = L('laugh');
  const s = 1.0 + 0.08 * E.inOut(prog(t, 0, len));
  const lit = t >= laugh;
  return (
    <Night uid="smile">
      <div style={cam(s, 540, 900)}>
        <Svg>
          <Backdrop kind="highway" uid="smile" frame={t} time="night" seed={5} />
          <g opacity={0.9}>
            <Car uid="smile" x={250} y={1250} len={760} view="side" dir={1} body="suv" paint="a" frame={t} time="night" lights={{head: 1, tail: 1}} />
          </g>
          <Figure uid="smile" cast={DRIVER} x={640} y={780} size={2200} crop="bust" frame={t} time="night" pose={lit ? 'thumbsUp' : 'phoneLook'} face={lit ? 'laugh' : 'angry'} hold="phone" turn={-0.2} />
        </Svg>
      </div>
    </Night>
  );
};

export const SHOTS: Record<string, React.FC> = {ask: Ask, plug: Plug, scan: Scan, result: Result, cap: Cap, twist: Twist, dashoff: DashOff, smile: Smile};
