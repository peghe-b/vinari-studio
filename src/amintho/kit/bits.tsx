// The OBD promo's shared pieces, copied from the diagnostics promo's shots (src/diagpromo Explain, Sound, Finale): the day skin,
// the screen-region helpers, the hands holding a phone from the left or the right, the driver's footwell with the 16-pin port,
// the ELM327 adapter, the store pills.
import React from 'react';
import {mtav} from '../../lib/format';
import {F} from '../../tokens';
import {clamp, E, lerp} from '../lib';
import {bodyBox, type Band, type Pose, type Rect, type Region} from './phone3d';
import {GripBack, GripFront} from './grip';
import {silPal} from './sil/sil';
import {INK, Svg, WHITE} from './stage';

export const DAY_SKIN = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1}).lit;


export const bandOf = (r: Region, a: number): Band => ({x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0, a});
export const pad = (r: Region, px: number): Region => ({x0: r.x0 - px / 1080, y0: r.y0 - px / 2346, x1: r.x1 + px / 1080, y1: r.y1 + px / 2346});
export const mid = (r: Region) => ({x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2});
/** a region lifted in place, toward the lens, `grow` times its size about its own centre */
export const inPlace = (pose: Pose, r: Region, grow: number, dy = 0): Rect => {
  const x = pose.x + (r.x0 - 0.5) * pose.w;
  const h = (r.y1 - r.y0) * (2346 / 1080) * pose.w;
  const y = pose.y + (r.y0 - 0.5) * (2346 / 1080) * pose.w;
  const w = (r.x1 - r.x0) * pose.w;
  return {x: x - (w * (grow - 1)) / 2, y: y - (h * (grow - 1)) / 2 + dy, w: w * grow, h: h * grow};
};


/** a hand holding the phone from the LEFT (the grip mirrored about the phone): the arm leaves by the frame's left side */
export const HeldLeft: React.FC<{pose: Pose; uid: string; children: React.ReactNode}> = ({pose, uid, children}) => {
  const m = {...pose, x: 1080 - pose.x, yaw: -pose.yaw, roll: -(pose.roll ?? 0)};
  const b = bodyBox(m);
  const flip: React.CSSProperties = {position: 'absolute', inset: 0, transform: 'scaleX(-1)', transformOrigin: '540px 0'};
  return (
    <>
      <div style={flip}>
        <GripBack b={b} id={`${uid}b`} skin={DAY_SKIN} />
      </div>
      {children}
      <div style={flip}>
        <GripFront b={b} id={`${uid}f`} skin={DAY_SKIN} />
      </div>
    </>
  );
};


/** the 16-pin J1962 port seen face-on (a trapezoid recess, two rows of eight), centred at (cx, cy), `s` its scale */
export const PortFace: React.FC<{cx: number; cy: number; s: number; uid: string; glow?: number}> = ({cx, cy, s, uid, glow = 0}) => {
  const w = 440 * s;
  const h = 210 * s;
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
    <g>
      <defs>
        <linearGradient id={`${uid}pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1E2B8" />
          <stop offset="1" stopColor="#9A8656" />
        </linearGradient>
        <linearGradient id={`${uid}bez`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3D44" />
          <stop offset="1" stopColor="#1C1E22" />
        </linearGradient>
        <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.7} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow > 0 ? <ellipse cx={cx} cy={cy} rx={w * 1.2} ry={h * 1.6} fill={`url(#${uid}glow)`} opacity={glow} /> : null}
      <path d={tz} fill={`url(#${uid}bez)`} transform={`translate(${cx} ${cy}) scale(1.14 1.22) translate(${-cx} ${-cy})`} />
      <path d={tz} fill="#08090B" />
      {pins}
    </g>
  );
};
export const FootwellDay: React.FC = () => {
  const W = {x: 640, y: 330, rx: 330, ry: 300};
  return (
    <Svg>
      <defs>
        <linearGradient id="fdBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4C5058" />
          <stop offset="1" stopColor="#2A2C31" />
        </linearGradient>
        <linearGradient id="fdPanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A5E66" />
          <stop offset="1" stopColor="#3C3F46" />
        </linearGradient>
        <linearGradient id="fdRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3D44" />
          <stop offset="0.5" stopColor="#1E2025" />
          <stop offset="1" stopColor="#141519" />
        </linearGradient>
        <linearGradient id="fdCol" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#25272C" />
          <stop offset="0.5" stopColor="#3C3F46" />
          <stop offset="1" stopColor="#202226" />
        </linearGradient>
        <radialGradient id="fdSun" cx="0.0" cy="0.45" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#fdBg)" />
      {/* the dash's face above, the knee panel's broad soft surface under it */}
      <path d="M-60 250Q540 200 1140 250L1140 760Q540 720 -60 760Z" fill="#33363C" />
      <path d="M-60 760Q540 720 1140 760L1140 1230Q540 1290 -60 1230Z" fill="url(#fdPanel)" />
      <path d="M-60 760Q540 720 1140 760" stroke="#7C818B" strokeWidth={5} fill="none" opacity={0.55} />
      <path d="M-60 1230Q540 1290 1140 1230" stroke="#24262A" strokeWidth={12} fill="none" />
      {/* the steering column's shroud going up into the wheel's hub */}
      <path d={`M${W.x - 80} ${W.y + 120}L${W.x + 80} ${W.y + 120}L${W.x + 110} ${W.y + 470}Q${W.x} ${W.y + 500} ${W.x - 110} ${W.y + 470}Z`} fill="url(#fdCol)" />
      {/* the wheel: a thick leather ring (its lower half in the frame), the lower spoke, the hub */}
      <ellipse cx={W.x} cy={W.y} rx={W.rx} ry={W.ry} fill="none" stroke="#0E0F12" strokeWidth={78} />
      <ellipse cx={W.x} cy={W.y} rx={W.rx} ry={W.ry} fill="none" stroke="url(#fdRim)" strokeWidth={66} />
      <path d={`M${W.x - 36} ${W.y + 80}L${W.x + 36} ${W.y + 80}L${W.x + 50} ${W.y + W.ry - 30}L${W.x - 50} ${W.y + W.ry - 30}Z`} fill="#24262B" />
      <rect x={W.x - 130} y={W.y - 60} width={260} height={150} rx={70} fill="#2B2D33" />
      {/* the pedals, the floor */}
      <path d="M-60 1230L1140 1230L1140 1920L-60 1920Z" fill="#1C1E22" />
      <rect x={560} y={1580} width={120} height={190} rx={22} fill="#26282D" />
      <rect x={760} y={1600} width={170} height={130} rx={22} fill="#26282D" />
      {/* the open door's daylight from the left */}
      <rect width={1080} height={1920} fill="url(#fdSun)" />
    </Svg>
  );
};

export const AdapterBody: React.FC<{cx: number; top: number; s: number; led: number; uid: string; tilt?: number}> = ({cx, top, s, led, uid, tilt = 0}) => {
  const pw = 380 * s;
  const ph = 120 * s;
  const bw = 400 * s;
  const bh = 330 * s;
  const by = top + ph;
  return (
    <g transform={`rotate(${tilt} ${cx} ${top + ph + bh / 2})`}>
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3D45" />
          <stop offset="0.4" stopColor="#1C1E23" />
          <stop offset="1" stopColor="#0C0D10" />
        </linearGradient>
        <radialGradient id={`${uid}led`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <stop offset="0.3" stopColor="#DDEBFF" stopOpacity={0.5} />
          <stop offset="1" stopColor="#DDEBFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}L${cx + pw * 0.42} ${top + ph}L${cx - pw * 0.42} ${top + ph}Z`} fill="#16181C" />
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}`} stroke="#4A4E58" strokeWidth={3 * s} />
      <rect x={cx - bw / 2} y={by} width={bw} height={bh} rx={52 * s} fill={`url(#${uid}b)`} />
      <rect x={cx - bw / 2 + 8 * s} y={by + 8 * s} width={bw - 16 * s} height={bh * 0.28} rx={44 * s} fill="#FFFFFF" opacity={0.05} />
      {/* the printed label */}
      <text x={cx - bw * 0.36} y={by + bh * 0.5} fontFamily="FiraGO" fontWeight={700} fontSize={50 * s} fill="#E9E9E9" letterSpacing={2 * s}>
        ELM327
      </text>
      <text x={cx - bw * 0.36} y={by + bh * 0.68} fontFamily="FiraGO" fontWeight={500} fontSize={30 * s} fill="#8C9099" letterSpacing={3 * s}>
        OBD-II
      </text>
      <circle cx={cx + bw * 0.3} cy={by + bh * 0.62} r={120 * s} fill={`url(#${uid}led)`} opacity={led} />
      <circle cx={cx + bw * 0.3} cy={by + bh * 0.62} r={15 * s} fill={led > 0.3 ? '#FFFFFF' : '#2A2D35'} />
    </g>
  );
};

/** a phone in his RIGHT hand, the arm leaving by the frame's right side (the grip as built, not mirrored) */
export const HeldRight: React.FC<{pose: Pose; uid: string; children: React.ReactNode}> = ({pose, uid, children}) => {
  const b = bodyBox(pose);
  return (
    <>
      <GripBack b={b} id={`${uid}b`} skin={DAY_SKIN} />
      {children}
      <GripFront b={b} id={`${uid}f`} skin={DAY_SKIN} />
    </>
  );
};


export const STORES = ['App Store', 'Google Play'];
export const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];
export const Pill: React.FC<{i: number; k: number; big?: boolean}> = ({i, k, big}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: big ? '18px 40px 20px 32px' : '15px 34px 17px 28px',
      borderRadius: 999,
      background: INK,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: big ? 42 : 36,
      lineHeight: 1.1,
      color: WHITE,
      whiteSpace: 'nowrap',
      opacity: clamp(k * 2),
      transform: `translateY(${((1 - k) * 46).toFixed(2)}px) scale(${lerp(0.78, 1, k).toFixed(4)})`,
    }}
  >
    <svg width={big ? 40 : 34} height={big ? 40 : 34} viewBox="0 0 24 24" style={{display: 'block', flex: 'none', marginTop: i === 0 ? -4 : 0}}>
      <path d={GLYPH[i]} fill={WHITE} />
    </svg>
    {STORES[i]}
  </div>
);
