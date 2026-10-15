// ACT 2-3, the answer, step by step: the car speaks in codes and they flip into Georgian; the OBD port under the dash, the
// adapter that clicks in, its calm link to the phone; the scanner and its result (the REAL app screens in the studio's whole
// 3D iPhone, regions banded and lifted out of the real capture); the sound diagnosis (the real screens, the phone at the
// wheel). The white world (C.surface) for the phone and the car, a dark cabin only under the dash. Everything that matters
// is whole and above the subtitle band.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {C, F, rgba} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {useShot} from './Act1';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, float, Lift, Phone3, project, ScreenLayer, TapRing, type Band, type Pose, type Rect, type Region} from './kit/phone3d';
import {ENGINE_D} from './kit/cluster';
import {GripBack, GripFront} from './kit/grip';
import {bodyBox} from './kit/phone3d';
import {silPal} from './kit/sil/sil';

const DAY_SKIN = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1}).lit;

// ---- the real screens' regions (capture fractions, measured on public/screens 1080 x 2346) --------------------------------
export const R = {
  hubScan: {x0: 0.1, y0: 0.3785, x1: 0.9, y1: 0.4348},
  hubBuy: {x0: 0.1, y0: 0.4473, x1: 0.9, y1: 0.4988},
  hubNote: {x0: 0.1, y0: 0.512, x1: 0.9, y1: 0.545},
  resVerdict: {x0: 0.0556, y0: 0.1556, x1: 0.946, y1: 0.2677},
  resCause: {x0: 0.088, y0: 0.2813, x1: 0.912, y1: 0.3431},
  resCode: {x0: 0.088, y0: 0.3602, x1: 0.574, y1: 0.3794},
  resLamp: {x0: 0.0556, y0: 0.7651, x1: 0.946, y1: 0.8448},
  potholes: {x0: 0.049, y0: 0.2634, x1: 0.485, y1: 0.3824},
  urgency: {x0: 0.048, y0: 0.228, x1: 0.954, y1: 0.304},
  causes: {x0: 0.04, y0: 0.345, x1: 0.955, y1: 0.656},
  quote: {x0: 0.069, y0: 0.9258, x1: 0.946, y1: 0.9804},
} satisfies Record<string, Region>;
export const bandOf = (r: Region, a: number): Band => ({x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0, a});
const mid = (r: Region) => ({x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2});

/** the standing phone of the white world: whole, its foot above the subtitle band, a slow push and the studio's float */
export const standPose = (t: number, len: number, o: {w0: number; w1: number; yaw0?: number; yaw1?: number; foot?: number; x?: number; pitch?: number}): Pose => {
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const p = atFoot({x: o.x ?? 540, w: lerp(o.w0, o.w1, k), yaw: lerp(o.yaw0 ?? 8, o.yaw1 ?? 3, k) + fl.roll, pitch: (o.pitch ?? 4) + fl.pitch, roll: fl.roll * 0.6}, o.foot ?? 1392);
  return {...p, y: p.y + fl.bob};
};

/** a new screen sliding up as a sheet over the old one (the app's own sheets), k 0..1 */
export const Sheet: React.FC<{pose: Pose; from: string; to: string; k: number}> = ({pose, from, to, k}) =>
  k > 0 && k < 1 ? (
    <ScreenLayer pose={pose}>
      <Img src={staticFile(`screens/${from}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 2346}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.18 * k}} />
      <Img src={staticFile(`screens/${to}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 2346, transform: `translateY(${(1 - E.inOut(k)) * 2346}px)`, boxShadow: '0 -24px 60px rgba(0,0,0,0.16)'}} />
    </ScreenLayer>
  ) : null;

/** a region lifted in place, toward the lens, `grow` times its size about its own centre (it always covers its source) */
export const inPlace = (pose: Pose, r: Region, grow: number, dy = 0): Rect => {
  const x = pose.x + (r.x0 - 0.5) * pose.w;
  const h = (r.y1 - r.y0) * (2346 / 1080) * pose.w;
  const y = pose.y + (r.y0 - 0.5) * (2346 / 1080) * pose.w;
  const w = (r.x1 - r.x0) * pose.w;
  return {x: x - (w * (grow - 1)) / 2, y: y - (h * (grow - 1)) / 2 + dy, w: w * grow, h: h * grow};
};

const White: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>{children}</div>;

// ---- 10 codes: the white studio, the cobalt car; its words come out as codes that rise in a calm column ----------------------
const CODES = ['P0300', 'P0420', 'P0171'];
const K_CAM0: CarCam = {pos: [8.4, 2.6, 13.2], target: [0.1, 0.62, 0.2], fov: 30};
const K_CAM1: CarCam = {pos: [7.8, 2.5, 13.5], target: [0.1, 0.62, 0.2], fov: 29.5};
export const CodeChip: React.FC<{text: string; k: number; size?: number}> = ({text, k, size = 54}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.32,
      padding: `${size * 0.32}px ${size * 0.55}px ${size * 0.34}px ${size * 0.42}px`,
      borderRadius: size * 0.5,
      background: C.surface,
      boxShadow: `0 ${size * 0.25}px ${size * 0.7}px ${rgba(C.shade, 0.14)}, 0 0 0 1.5px ${rgba(C.shade, 0.06)}`,
      fontFamily: F.mono,
      fontWeight: 600,
      fontSize: size,
      color: C.ink,
      letterSpacing: '0.04em',
      opacity: clamp(k * 1.6),
      transform: `translateY(${(1 - k) * 40}px) scale(${lerp(0.85, 1, clamp(k))})`,
    }}
  >
    <svg width={size * 0.95} height={size * 0.95} viewBox="0 0 24 24" style={{display: 'block'}}>
      <path d={ENGINE_D} fill="none" stroke="#E8940C" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
    {text}
  </div>
);

export const CodesShot: React.FC = () => {
  const {t, len, Ls} = useShot('codes');
  const at = Ls('codes');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [lerp(K_CAM0.pos[0], K_CAM1.pos[0], k), lerp(K_CAM0.pos[1], K_CAM1.pos[1], k), lerp(K_CAM0.pos[2], K_CAM1.pos[2], k)], target: K_CAM0.target, fov: lerp(K_CAM0.fov, K_CAM1.fov, k)};
  const src = projectCar(cam, [0, 1.15, 0.6]);
  const SLOTS = [
    {x: 330, y: 360},
    {x: 690, y: 520},
    {x: 380, y: 690},
  ];
  return (
    <White>
      <div style={{position: 'absolute', inset: 0, transform: 'translateY(150px)'}}>
        <Car3 cam={cam} night={0} shadow={1} lamp={0.4} />
      </div>
      {CODES.map((c, i) => {
        const q = sp(t, at[i] - 2, 110, 16);
        if (q <= 0.001) return null;
        const x = lerp(src.x, SLOTS[i].x, E.out(clamp(q)));
        const y = lerp(src.y + 150, SLOTS[i].y, E.out(clamp(q))) + 6 * Math.sin((t - at[i]) / 14 + i);
        return (
          <div key={c} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)'}}>
            <CodeChip text={c} k={clamp(q)} />
          </div>
        );
      })}
    </White>
  );
};

// ---- 11 flip: one code card, P0300, big; on „გითარგმნიდა" it flips over into Georgian -----------------------------------------
export const FlipShot: React.FC = () => {
  const {t, len, L} = useShot('flip');
  const fl = L('flip');
  const inK = sp(t, -4, 120, 18);
  const rot = 180 * E.inOut(prog(t, fl, 14));
  const k = E.inOut(prog(t, 0, len));
  const CW = 860;
  const CH = 520;
  const front = rot < 90;
  const face: React.CSSProperties = {position: 'absolute', inset: 0, borderRadius: 48, background: C.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden'};
  return (
    <White>
      <div style={{position: 'absolute', left: 540 - CW / 2, top: 760 - CH / 2, width: CW, height: CH, perspective: 2400, transform: `scale(${lerp(0.94, 1, clamp(inK)) * (1 + 0.03 * k)})`, opacity: clamp(inK * 1.5)}}>
        <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${rot}deg)`}}>
          <div style={{...face, boxShadow: `0 40px 90px ${rgba(C.shade, 0.14)}, 0 0 0 2px ${rgba(C.shade, 0.05)}`, opacity: front ? 1 : 0}}>
            <svg width={150} height={150} viewBox="0 0 24 24">
              <path d={ENGINE_D} fill="none" stroke="#E8940C" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{fontFamily: F.mono, fontWeight: 600, fontSize: 168, letterSpacing: '0.06em', color: C.ink, lineHeight: 1.1}}>P0300</div>
          </div>
          <div style={{...face, transform: 'rotateX(180deg)', boxShadow: `0 40px 90px ${rgba(C.shade, 0.14)}, 0 0 0 2px ${rgba(C.shade, 0.05)}`, opacity: front ? 0 : 1}}>
            <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 112, color: C.ink, lineHeight: 1.12, textAlign: 'center'}}>
              {mtav('ცილინდრი')}
              <br />
              {mtav('ტოვებს')}
            </div>
            <div style={{marginTop: 26, fontFamily: F.mono, fontSize: 40, color: C.ink2, letterSpacing: '0.06em'}}>P0300</div>
          </div>
        </div>
      </div>
    </White>
  );
};

// ---- the cabin under the dash (dark), the OBD port and the adapter ------------------------------------------------------------
const PORT = {x: 540, y: 900, w: 440, h: 210};
/** the 16-pin J1962 port seen face-on: a trapezoid recess in black plastic, two rows of eight pin slots; `glow` its rim light */
export const Port: React.FC<{cx: number; cy: number; s: number; glow: number; uid: string}> = ({cx, cy, s, glow, uid}) => {
  const w = PORT.w * s;
  const h = PORT.h * s;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const tz = `M${x0} ${y0 + h * 0.06}Q${x0} ${y0} ${x0 + w * 0.05} ${y0}L${x0 + w * 0.95} ${y0}Q${x0 + w} ${y0} ${x0 + w} ${y0 + h * 0.06}L${x0 + w * 0.9} ${y0 + h * 0.92}Q${x0 + w * 0.89} ${y0 + h} ${x0 + w * 0.84} ${y0 + h}L${x0 + w * 0.16} ${y0 + h}Q${x0 + w * 0.11} ${y0 + h} ${x0 + w * 0.1} ${y0 + h * 0.92}Z`;
  const pins: React.ReactNode[] = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 8; i++) {
      const px = cx + (i - 3.5) * w * (row === 0 ? 0.1 : 0.088);
      const py = y0 + h * (row === 0 ? 0.36 : 0.68);
      pins.push(<rect key={`${row}${i}`} x={px - w * 0.017} y={py - h * 0.075} width={w * 0.034} height={h * 0.15} rx={w * 0.008} fill={`url(#${uid}pin)`} />);
    }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={`${uid}pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9D7A8" />
          <stop offset="1" stopColor="#8E7A4C" />
        </linearGradient>
        <linearGradient id={`${uid}bez`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E3138" />
          <stop offset="1" stopColor="#15171B" />
        </linearGradient>
        <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8FB0FF" stopOpacity={0.55} />
          <stop offset="0.45" stopColor="#4F7BFF" stopOpacity={0.18} />
          <stop offset="1" stopColor="#4F7BFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={w * 1.1} ry={h * 1.5} fill={`url(#${uid}glow)`} opacity={glow} />
      {/* the bezel round the recess */}
      <path d={tz} fill={`url(#${uid}bez)`} transform={`translate(${cx} ${cy}) scale(1.14 1.22) translate(${-cx} ${-cy})`} />
      <path d={tz} fill="#07080A" />
      <path d={tz} fill="none" stroke="#9FB8FF" strokeWidth={3 * s} opacity={0.75 * glow} />
      {pins}
    </svg>
  );
};

/** the dark lower dash: the knee panel's soft surfaces and seam, the steering column's shroud coming down from the top */
const UnderDash: React.FC<{uid: string; dy: number}> = ({uid, dy}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#24262D" />
        <stop offset="0.5" stopColor="#1A1C21" />
        <stop offset="1" stopColor="#0E0F12" />
      </linearGradient>
      <linearGradient id={`${uid}col`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1B1D22" />
        <stop offset="0.45" stopColor="#3A3D46" />
        <stop offset="1" stopColor="#15161A" />
      </linearGradient>
      <radialGradient id={`${uid}spot`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#3C404B" stopOpacity={0.9} />
        <stop offset="1" stopColor="#3C404B" stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${uid}bg)`} />
    <g transform={`translate(0 ${dy})`}>
      {/* the steering column coming down toward the camera: a tapered shroud, its round end, the two stalks */}
      <path d="M455 -400L625 -400L652 380Q652 430 540 436Q428 430 428 380Z" fill={`url(#${uid}col)`} />
      <ellipse cx={540} cy={392} rx={112} ry={44} fill="#2A2D34" />
      <ellipse cx={540} cy={388} rx={90} ry={32} fill="#181A1F" />
      <path d="M440 300L240 360Q222 366 228 382L236 392Q244 402 262 394L452 342Z" fill="#23252B" />
      <path d="M640 300L840 360Q858 366 852 382L844 392Q836 402 818 394L628 342Z" fill="#23252B" />
      <path d="M440 300L240 360" stroke="#4A4E59" strokeWidth={2} opacity={0.6} />
      <path d="M640 300L840 360" stroke="#4A4E59" strokeWidth={2} opacity={0.6} />
      {/* the knee panel: a broad soft surface with a seam, the port's recess in its lower edge */}
      <path d="M-60 640Q540 560 1140 640L1140 1220Q540 1300 -60 1220Z" fill="#1E2026" />
      <path d="M-60 640Q540 560 1140 640" stroke="#3E424C" strokeWidth={4} fill="none" />
      <path d="M-60 1220Q540 1300 1140 1220" stroke="#2A2D34" strokeWidth={6} fill="none" />
      <ellipse cx={540} cy={900} rx={520} ry={300} fill={`url(#${uid}spot)`} opacity={0.6} />
      {/* a hood release lever's slot, far left: a small real detail */}
      <rect x={110} y={1030} width={120} height={46} rx={14} fill="#121317" />
    </g>
  </svg>
);

export const PortShot: React.FC = () => {
  const {t, len, L} = useShot('port');
  const glowAt = L('portGlow');
  const k = E.inOut(prog(t, 0, len * 0.8));
  const dy = lerp(520, 0, k);
  const s = lerp(0.9, 1.05, E.inOut(prog(t, 0, len)));
  const glow = E.out(prog(t, glowAt - 3, 10)) * (0.85 + 0.15 * Math.sin((t - glowAt) / 5));
  const chip = sp(t, glowAt + 2, 140, 16);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#14151A', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 900px'}}>
        <UnderDash uid="pd" dy={dy} />
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`}}>
          <Port cx={PORT.x} cy={PORT.y} s={1} glow={glow} uid="pp" />
        </div>
      </div>
      {chip > 0.01 ? (
        <div style={{position: 'absolute', left: 540, top: 640 + dy * 0.0, transform: `translate(-50%, ${(1 - clamp(chip)) * 20}px)`, opacity: clamp(chip * 1.5)}}>
          <div style={{padding: '14px 34px 16px', borderRadius: 999, background: '#F3F5FA', color: '#0B0B0B', fontFamily: F.mono, fontWeight: 600, fontSize: 46, letterSpacing: '0.12em'}}>OBD</div>
        </div>
      ) : null}
    </div>
  );
};

/** the adapter: a compact black ELM327-type body with the trapezoid plug on top and a small LED on its face */
export const Adapter: React.FC<{cx: number; top: number; s: number; led: number; uid: string}> = ({cx, top, s, led, uid}) => {
  const pw = PORT.w * 0.86 * s;
  const ph = 120 * s;
  const bw = 400 * s;
  const bh = 300 * s;
  const by = top + ph;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3D45" />
          <stop offset="0.4" stopColor="#1C1E23" />
          <stop offset="1" stopColor="#0C0D10" />
        </linearGradient>
        <radialGradient id={`${uid}led`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#BFD2FF" stopOpacity={1} />
          <stop offset="0.3" stopColor="#5B86FF" stopOpacity={0.6} />
          <stop offset="1" stopColor="#5B86FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* the plug (goes into the port) */}
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}L${cx + pw * 0.42} ${top + ph}L${cx - pw * 0.42} ${top + ph}Z`} fill="#16181C" />
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}`} stroke="#4A4E58" strokeWidth={3 * s} />
      {/* the body */}
      <rect x={cx - bw / 2} y={by} width={bw} height={bh} rx={46 * s} fill={`url(#${uid}b)`} />
      <rect x={cx - bw / 2 + 6 * s} y={by + 6 * s} width={bw - 12 * s} height={bh * 0.3} rx={40 * s} fill="#FFFFFF" opacity={0.05} />
      {/* its small LED */}
      <circle cx={cx + bw * 0.28} cy={by + bh * 0.62} r={110 * s} fill={`url(#${uid}led)`} opacity={led} />
      <circle cx={cx + bw * 0.28} cy={by + bh * 0.62} r={15 * s} fill={led > 0.3 ? '#E4ECFF' : '#2A2D35'} />
      <text x={cx - bw * 0.3} y={by + bh * 0.64} fontFamily="FiraGO" fontWeight={600} fontSize={40 * s} fill="#4C505B" letterSpacing={3 * s}>
        OBD
      </text>
    </svg>
  );
};

// ---- 13 plug: the adapter rises into the port and clicks home; its LED wakes ------------------------------------------------
export const PlugShot: React.FC = () => {
  const {t, len, L} = useShot('plug');
  const click = L('click');
  const ledAt = L('led');
  const k = E.inOut(prog(t, 0, len));
  const inK = E.out(prog(t, 0, click));
  const snap = t >= click ? 1 : 0;
  // the plug's top travels from below the frame's middle into the port's mouth
  const portTop = 780;
  const top = lerp(1150, portTop + 26, inK) - 22 * snap + 3 * Math.sin(Math.max(0, t - click) * 2.4) * Math.exp(-Math.max(0, t - click) / 3) * snap;
  const ledK = t < ledAt ? 0 : 0.65 + 0.35 * Math.sin((t - ledAt) / 2.2);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#14151A', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.05, 1.1, k)})`, transformOrigin: '540px 860px'}}>
        <UnderDash uid="pl" dy={0} />
        {/* the port seen a little from below: its mouth a dark slot in the panel's lower edge */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M${540 - 250} ${portTop - 40}L${540 + 250} ${portTop - 40}L${540 + 230} ${portTop + 60}L${540 - 230} ${portTop + 60}Z`} fill="#0A0B0D" />
          <path d={`M${540 - 250} ${portTop - 40}L${540 + 250} ${portTop - 40}`} stroke="#3A3E48" strokeWidth={5} />
        </svg>
        <Adapter cx={540} top={top} s={1} led={ledK} uid="ad" />
        {/* the panel's lip in front of the plug: the plug disappears into the port */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M-60 ${portTop + 60}L1140 ${portTop + 60}L1140 ${portTop - 300}Q540 ${portTop - 380} -60 ${portTop - 300}Z`} fill="#1E2026" />
          <path d={`M-60 ${portTop + 60}L1140 ${portTop + 60}`} stroke="#3E424C" strokeWidth={5} />
        </svg>
      </div>
    </div>
  );
};

// ---- 14 link: the adapter under the dash, the phone in the cabin; calm pulses travel from its LED to the phone, the scanner
// wakes; the honest note „iPhone: Wi-Fi ან BLE ადაპტერი" -------------------------------------------------------------------------
export const LinkShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('link');
  const pulses = Ls('pulses');
  const noteAt = L('note');
  const pose = standPose(t, len, {w0: 380, w1: 392, yaw0: -10, yaw1: -6, foot: 1330, x: 700});
  const led = {x: 248, y: 1170};
  const scr = project(pose, 0.2, 0.62);
  const note = sp(t, noteAt, 140, 18);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#14151A', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="lkSpot" cx="0.62" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#2A2E38" />
            <stop offset="1" stopColor="#101115" />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#lkSpot)" />
        <path d="M-60 980Q300 930 520 980L520 1060Q300 1010 -60 1060Z" fill="#1E2026" />
        <path d="M-60 980Q300 930 520 980" stroke="#3E424C" strokeWidth={4} fill="none" />
      </svg>
      <Adapter cx={248} top={1004} s={0.42} led={0.75 + 0.25 * Math.sin(t / 2.2)} uid="lka" />
      {/* the pulses: soft dots along an arc from the LED to the phone, each landing as a ring on its glass */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {pulses.map((p0, i) => {
          const q = (t - p0) / 16;
          if (q < 0 || q > 1.6) return null;
          const u = clamp(q);
          const cx = lerp(led.x + 50, scr.x, E.inOut(u));
          const cy = lerp(led.y, scr.y, E.inOut(u)) - 200 * Math.sin(Math.PI * u);
          const land = q > 1 ? (q - 1) / 0.6 : 0;
          return (
            <g key={i}>
              {q <= 1 ? <circle cx={cx} cy={cy} r={11} fill="#7FA2FF" opacity={0.9} /> : null}
              {q <= 1 ? <circle cx={cx} cy={cy} r={30} fill="#7FA2FF" opacity={0.18} /> : null}
              {land > 0 ? <circle cx={scr.x} cy={scr.y} r={20 + 70 * land} fill="none" stroke="#7FA2FF" strokeWidth={4} opacity={0.6 * (1 - land)} /> : null}
            </g>
          );
        })}
      </svg>
      <Phone3 src="21-obd-hub" pose={pose} look={0.35} rim={0.9} shadow={0} />
      {note > 0.01 ? (
        <div style={{position: 'absolute', left: 540, top: 300, transform: `translate(-50%, ${(1 - clamp(note)) * 18}px)`, opacity: clamp(note * 1.5)}}>
          <div style={{padding: '18px 36px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.16)', color: '#EEF2F8', fontFamily: F.sans, fontWeight: 500, fontSize: 40, whiteSpace: 'nowrap'}}>
            iPhone: Wi-Fi {mtav('ან')} BLE {mtav('ადაპტერი')}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---- 15 scan: the scanner big; the band on „სკანირება", the tap; the result slides up --------------------------------------
export const ScanShot: React.FC = () => {
  const {t, len, L} = useShot('scan');
  const bandAt = L('scanBand');
  const tapAt = L('scanTap');
  const inAt = L('resultIn');
  const pose = standPose(t, len, {w0: 500, w1: 520, yaw0: 9, yaw1: 4});
  const bandA = prog(t, bandAt - 4, 6) * (1 - prog(t, tapAt + 6, 4));
  const veil = 0.25 * prog(t, bandAt - 4, 8) * (1 - prog(t, tapAt + 4, 6));
  const sheetK = prog(t, inAt, 13);
  const src = t >= inAt + 13 ? '22-obd-result' : '21-obd-hub';
  const tap = mid(R.hubScan);
  return (
    <White>
      <Phone3 key={src} src={src} pose={pose} band={src === '21-obd-hub' ? bandOf(R.hubScan, bandA) : null} veil={src === '21-obd-hub' ? veil : 0} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
      <Sheet pose={pose} from="21-obd-hub" to="22-obd-result" k={sheetK} />
    </White>
  );
};

// ---- 16 result: „რა სჭირს," the band on the cause; „რამდენად სერიოზულია" the code row lifts out ------------------------------
export const ResultShot: React.FC = () => {
  const {t, len, L} = useShot('result');
  const causeAt = L('causeBand');
  const liftAt = L('codeLift');
  const pose = standPose(t, len, {w0: 520, w1: 536, yaw0: 4, yaw1: 1});
  const bandA = prog(t, causeAt - 3, 6) * (1 - prog(t, liftAt - 2, 5));
  const veil = 0.28 * prog(t, causeAt - 3, 8);
  const lk = sp(t, liftAt, 150, 19);
  const cw = 860;
  const to: Rect = {x: 540 - cw / 2, y: 900, w: cw, h: (cw * (R.resCode.y1 - R.resCode.y0) * 2346) / ((R.resCode.x1 - R.resCode.x0) * 1080)};
  return (
    <White>
      <Phone3 src="22-obd-result" pose={pose} band={bandOf(R.resCause, bandA)} veil={veil + 0.25 * clamp(lk)} />
      {t >= liftAt - 1 ? <Lift src="22-obd-result" r={R.resCode} pose={pose} to={to} k={lk} radius={24} /> : null}
    </White>
  );
};

// ---- 17 verdict: the verdict lifts out of the real screen, big: „იარე, მაგრამ მალე ხელოსანთან" --------------------------------
export const VerdictShot: React.FC = () => {
  const {t, len, L} = useShot('verdict');
  const at = L('verdict');
  const pose = standPose(t, len, {w0: 430, w1: 440, yaw0: 3, yaw1: 0, foot: 1392});
  const lk = sp(t, at, 140, 18);
  const to: Rect = {x: 70, y: 250, w: 940, h: (940 * (R.resVerdict.y1 - R.resVerdict.y0) * 2346) / ((R.resVerdict.x1 - R.resVerdict.x0) * 1080)};
  return (
    <White>
      <Phone3 src="22-obd-result" pose={pose} veil={0.35 * clamp(lk)} />
      <Lift src="22-obd-result" r={R.resVerdict} pose={pose} to={to} k={lk} radius={36} band={{...R.resVerdict, a: clamp(lk) * 0.0}} />
    </White>
  );
};

// ---- 19 hidden: the scanner: „ყიდვამდე შემოწმება" tapped, the result, its check-light row lifts: „ანთია · 1 კოდი" -----------------
export const HiddenShot: React.FC = () => {
  const {t, len, L} = useShot('hidden');
  const tapAt = L('buyTap');
  const rowAt = L('lampRow');
  const pose = standPose(t, len, {w0: 480, w1: 495, yaw0: -6, yaw1: -2});
  const bandA = prog(t, tapAt - 8, 5) * (1 - prog(t, tapAt + 6, 4));
  const sheetAt = tapAt + 3;
  const sheetK = prog(t, sheetAt, 10);
  const src = t >= sheetAt + 10 ? '22-obd-result' : '21-obd-hub';
  const lk = sp(t, rowAt, 160, 18);
  const to = inPlace(pose, R.resLamp, 1.3, -60);
  const tap = mid(R.hubBuy);
  return (
    <White>
      <Phone3 key={src} src={src} pose={pose} band={src === '21-obd-hub' ? bandOf(R.hubBuy, bandA) : null} veil={src === '21-obd-hub' ? 0.22 * bandA : 0.3 * clamp(lk)} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
      <Sheet pose={pose} from="21-obd-hub" to="22-obd-result" k={sheetK} />
      {t >= rowAt - 1 ? <Lift src="22-obd-result" r={R.resLamp} pose={pose} to={to} k={lk} radius={40} band={{...R.resLamp, a: clamp(lk)}} /> : null}
    </White>
  );
};

// ---- 20 ask: „ადაპტერი არ გაქვს?" the sound diagnosis' first question; the band on „ორმოებზე", the tap -----------------------
export const AskShot: React.FC = () => {
  const {t, len, L} = useShot('ask');
  const tapAt = L('potTap');
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const pose = atFoot({x: 520, w: lerp(470, 490, k), yaw: -10 + fl.roll, pitch: 6 + fl.pitch, roll: 4}, 1380);
  const b = bodyBox(pose);
  const bandA = prog(t, tapAt - 12, 6);
  const tap = mid(R.potholes);
  return (
    <White>
      <GripBack b={b} id="akb" skin={DAY_SKIN} />
      <Phone3 src="11-diagnostics-start" pose={pose} band={bandOf(R.potholes, bandA)} veil={0.22 * bandA} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
      <GripFront b={b} id="akf" skin={DAY_SKIN} />
    </White>
  );
};

// ---- 21 record: the phone held at the car's front wheel, recording; the knocks come off the wheel as soft rings and the
// waveform on the real screen comes alive -------------------------------------------------------------------------------------
const W_CAM: CarCam = {pos: [9.6, 1.5, 12.4], target: [0.4, 0.62, 0.4], fov: 36};
export const RecordShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('record');
  const recAt = L('rec');
  const knocks = Ls('knocks');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...W_CAM, pos: [lerp(9.6, 9.2, k), 1.5, lerp(12.4, 12.1, k)]};
  const wheel = projectCar(cam, [0.95, 0.36, 1.35]);
  const pw = 360;
  const fl = float(t);
  const pose = atFoot({x: 735, w: pw, yaw: -14 + fl.roll, pitch: 6 + fl.pitch, roll: -4}, 1330);
  const b = bodyBox(pose);
  const live = t >= recAt ? 1 : 0;
  // the waveform: 33 bars over the capture's own idle row (y 1161), alive with the knocks
  const bars = Array.from({length: 33}, (_, i) => {
    const d = Math.abs(i - 16) / 16;
    let a = 0.15 + 0.25 * (1 - d) * (0.6 + 0.4 * Math.sin(t / 2 + i * 1.3));
    for (const kn of knocks) {
      const q = (t - kn) / 9;
      if (q > 0 && q < 1) a += (1 - q) * (1 - d * 0.7) * (0.6 + 0.4 * Math.sin(i * 2.1 + kn));
    }
    return clamp(a) * live;
  });
  const micPulse = live ? 1 + 0.08 * Math.sin(t / 3) : 1;
  return (
    <White>
      <div style={{position: 'absolute', inset: 0, transform: 'translate(10px, -250px)'}}>
        <Car3 cam={cam} night={0} shadow={1} />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {knocks.map((kn, i) => {
          const q = (t - kn) / 22;
          if (q < 0 || q > 1) return null;
          return <ellipse key={i} cx={wheel.x + 10} cy={wheel.y - 250} rx={40 + 170 * E.out(q)} ry={(40 + 170 * E.out(q)) * 0.9} fill="none" stroke={C.accA} strokeWidth={4} opacity={0.45 * (1 - q)} />;
        })}
      </svg>
      <GripBack b={b} id="rgb" skin={DAY_SKIN} />
      <Phone3 src="12-diagnostics-sound" pose={pose} />
      <ScreenLayer pose={pose}>
        {live ? (
          <>
            <div style={{position: 'absolute', left: 117, top: 1105, width: 846, height: 112, background: '#FFFFFF'}} />
            {bars.map((a, i) => (
              <div key={i} style={{position: 'absolute', left: 117 + i * 26, top: 1161 - (8 + 96 * a) / 2, width: 12, height: 8 + 96 * a, borderRadius: 6, background: i % 2 ? '#0B0B0B' : '#2B2B2B', opacity: 0.85}} />
            ))}
            <div style={{position: 'absolute', left: 539 - 108 * micPulse, top: 827 - 108 * micPulse, width: 216 * micPulse, height: 216 * micPulse, borderRadius: 999, background: 'rgba(224,27,27,0.12)'}} />
            <div style={{position: 'absolute', left: 539 - 76, top: 827 - 76, width: 152, height: 152, borderRadius: 999, background: '#E01B1B', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{width: 46, height: 46, borderRadius: 8, background: '#FFFFFF'}} />
            </div>
          </>
        ) : null}
      </ScreenLayer>
      <GripFront b={b} id="rgf" skin={DAY_SKIN} />
    </White>
  );
};

// ---- 22 urgency: the diagnosis; its urgency card („ორ კვირაში") lifts a little ------------------------------------------------
export const UrgencyShot: React.FC = () => {
  const {t, len, L} = useShot('urgency');
  const at = L('urgent');
  const pose = standPose(t, len, {w0: 440, w1: 452, yaw0: -7, yaw1: -3});
  const lk = sp(t, at, 140, 18);
  const to: Rect = {x: 70, y: 262, w: 940, h: (940 * (R.urgency.y1 - R.urgency.y0) * 2346) / ((R.urgency.x1 - R.urgency.x0) * 1080)};
  return (
    <White>
      <Phone3 src="13-diagnosis" pose={pose} veil={0.32 * clamp(lk)} />
      {t >= at - 1 ? <Lift src="13-diagnosis" r={R.urgency} pose={pose} to={to} k={lk} radius={40} /> : null}
    </White>
  );
};

// ---- 23 tell: „რა შეიძლება იყოს" the band walks onto the likely causes -----------------------------------------------------------
export const TellShot: React.FC = () => {
  const {t, len, L} = useShot('tell');
  const at = L('causes');
  const pose = standPose(t, len, {w0: 515, w1: 528, yaw0: -3, yaw1: -1});
  const a = prog(t, at - 4, 6);
  return (
    <White>
      <Phone3 src="13-diagnosis" pose={pose} band={bandOf(R.causes, a)} veil={0.26 * a} />
    </White>
  );
};

// ---- 24 quote: „და ხელოსანს ზუსტად რა უთხრა." the mechanic's sentence lifts out big over the screen -----------------------------
export const QuoteShot: React.FC = () => {
  const {t, len, L} = useShot('quote');
  const at = L('quote');
  const pose = standPose(t, len, {w0: 528, w1: 536, yaw0: -1, yaw1: 1});
  const lk = sp(t, at, 140, 18);
  const to: Rect = {x: 60, y: 820, w: 960, h: (960 * (R.quote.y1 - R.quote.y0) * 2346) / ((R.quote.x1 - R.quote.x0) * 1080)};
  return (
    <White>
      <Phone3 src="13-diagnosis" pose={pose} veil={0.4 * clamp(lk)} />
      <Lift src="13-diagnosis" r={R.quote} pose={pose} to={to} k={lk} radius={34} />
    </White>
  );
};

export {TapRing};
