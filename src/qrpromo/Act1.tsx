// ACT 1, the problem (her voice): the mirror, the call she declines, the flood of banners, the groan (the bleep).
// Her room is kit/room.tsx; the phone is the studio's real 3D iPhone (kit/phone3d.tsx) lying on the vanity's walnut,
// seen from above, its screen the iOS lock screen and call drawn in capture px (kit/ios.tsx).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, E, ev, evs, fr, lerp, prog, shot} from './lib';
import {cam, Room} from './kit/room';
import {bodyBox, Phone3, project, ScreenLayer, type Pose} from './kit/phone3d';
import {Banner, IncomingCall, LockScreen, Tap, type Note} from './kit/ios';

const L = (id: string) => {
  const base = fr(shot(id).from);
  return (name: string) => fr(ev(name)) - base;
};

/** a phone's buzz: a small fast jitter while `on` (frames) */
const jitter = (t: number, on: [number, number][], amp = 2.6) => {
  for (const [a, b] of on) if (t >= a && t < b) return amp * (t % 2 === 0 ? 1 : -1) * (0.7 + 0.3 * Math.sin(t * 1.7));
  return 0;
};

// ---- 1 the mirror (the film's opening): she primps, the phone on the vanity already buzzing; „აუუუ," her head goes
// back; „რა ტვინი მომი-" her palm to her face, the camera pushed in close; the bleep kicks the frame -----------------------
export const Mirror: React.FC = () => {
  const t = useCurrentFrame();
  const l = L('mirror');
  const len = fr(shot('mirror').to) - fr(shot('mirror').from);
  const g = l('groan');
  const tv = l('tvini');
  const bl = l('bleep');
  const buzzes: [number, number][] = [
    [0, 28],
    [39, 63],
  ];
  // her head thrown back on „აუუუ", then forward, a palm to her face, on „რა ტვინი მომი-"
  const back = E.inOut(prog(t, g - 2, 12)) * (1 - E.inOut(prog(t, tv - 4, 8)));
  const fwd = E.out(prog(t, tv - 4, 8));
  const lean = 2.5 * (1 - E.inOut(prog(t, g - 2, 10))) - 9 * back + 3 * fwd;
  // the camera: the wide room, then pushed in on her through the groan; a kick and a shake on the bleep
  const k = E.inOut(prog(t, g - 2, tv - g + 8));
  const drift = E.inOut(prog(t, tv, len - tv));
  const kick = clamp((t - bl) / 2) * Math.exp(-Math.max(0, t - bl) / 5);
  const s = lerp(1.0, 1.32, k) * (1 + 0.04 * drift) * (1 + 0.05 * kick);
  const shakeX = t >= bl && t < bl + 10 ? 6 * (1 - (t - bl) / 10) * (t % 2 ? 1 : -1) : 0;
  const lit = 0.65 + 0.35 * (jitter(t, buzzes, 1) !== 0 ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(s, lerp(640, 420, k), lerp(1000, 700, k), shakeX, 0), transformOrigin: '0 0'}}>
        <Room
          uid="mir"
          frame={t + 200}
          pose="stand"
          face="neutral"
          acts={[
            {at: g + 200 - 2, pose: 'stand', face: 'worried'},
            {at: tv + 200 - 3, pose: 'facepalm', face: 'angry'},
          ]}
          lean={lean}
          ring={lit}
          buzz={jitter(t, buzzes)}
        />
      </div>
    </div>
  );
};

// ---- the phone on the wood (the call and the flood) ---------------------------------------------------------------------
const WOOD = '#6E4A32';
export const Wood: React.FC<{uid: string; light?: number}> = ({uid, light = 1}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id={`${uid}w`} x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stopColor="#5A3A26" />
        <stop offset="0.5" stopColor={WOOD} />
        <stop offset="1" stopColor="#7C5438" />
      </linearGradient>
      <radialGradient id={`${uid}pool`} cx="0.85" cy="0.12" r="0.9">
        <stop offset="0" stopColor="#FFC98A" stopOpacity={0.5 * light} />
        <stop offset="0.45" stopColor="#F0A060" stopOpacity={0.16 * light} />
        <stop offset="1" stopColor="#F0A060" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${uid}vig`} cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.55} />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${uid}w)`} />
    {/* the planks and their grain */}
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x={-40 + i * 290} y={-20} width={3} height={1960} fill="#2E1D12" opacity={0.45} transform={`rotate(-4 540 960)`} />
    ))}
    {Array.from({length: 34}, (_, i) => {
      const x = -60 + i * 36 + (i % 3) * 7;
      const w = 6 + (i % 5) * 4;
      return <path key={i} d={`M${x} -40C${x + w} 500 ${x - w} 1100 ${x + w * 0.6} 1980`} fill="none" stroke={i % 2 ? '#3E281A' : '#8B6244'} strokeWidth={i % 4 === 0 ? 2.2 : 1.2} opacity={0.22} transform="rotate(-4 540 960)" />;
    })}
    <rect width={1080} height={1920} fill={`url(#${uid}pool)`} />
    {/* her lipstick, lying on the wood */}
    <g transform="translate(150 1560) rotate(-28)">
      <ellipse cx={8} cy={30} rx={110} ry={16} fill="#000" opacity={0.3} />
      <rect x={-100} y={-22} width={120} height={44} rx={8} fill="#B88A4E" />
      <rect x={-100} y={-22} width={120} height={10} rx={5} fill="#E8C88E" opacity={0.8} />
      <rect x={20} y={-20} width={70} height={40} rx={6} fill="#141012" />
      <rect x={20} y={-20} width={70} height={8} rx={4} fill="#3A3436" />
    </g>
    {/* a small brass ring dish */}
    <g transform="translate(905 260)">
      <ellipse cx={8} cy={14} rx={92} ry={88} fill="#000" opacity={0.25} />
      <circle r={88} fill="#B08A52" />
      <circle r={70} fill="#8E6A3A" />
      <circle r={66} fill="#A47C46" />
      <circle cx={-14} cy={6} r={20} fill="none" stroke="#F1D8A4" strokeWidth={7} />
    </g>
    <rect width={1080} height={1920} fill={`url(#${uid}vig)`} />
  </svg>
);

const PHONE: Pose = {x: 540, y: 820, w: 500, yaw: 0, pitch: 0, roll: -4};
export const PhoneShadow: React.FC<{pose: Pose; a?: number}> = ({pose, a = 0.55}) => {
  const b = bodyBox(pose);
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x + 22,
        top: b.y + 34,
        width: b.w,
        height: b.h,
        borderRadius: b.w * 0.17,
        background: '#000',
        opacity: a,
        filter: 'blur(26px)',
        transform: `rotate(${-(pose.roll ?? 0)}deg)`,
      }}
    />
  );
};

const NOTES: Note[] = [
  {icon: 'msg', app: 'შეტყობინებები', title: 'უცნობი', body: 'ლამაზო, გავიცნოთ?', when: 'ახლა'},
  {icon: 'phone', app: 'ტელეფონი', title: 'უცნობი ნომერი', body: 'ხმოვანი: „საბურავებს ხომ არ ყიდი?“', when: 'ახლა'},
  {icon: 'msg', app: 'შეტყობინებები', title: '+995 5•• ••• •••', body: 'სესხი 0%-ით', when: 'ახლა'},
  {icon: 'phone', app: 'ტელეფონი', title: 'უცნობი ნომერი (4)', body: 'გამოტოვებული ზარი', when: 'ახლა'},
];
const DATE = 'ოთხშაბათი, 14 ოქტომბერი';

// ---- 1b the call ----------------------------------------------------------------------------------------------------------
export const Call: React.FC = () => {
  const t = useCurrentFrame();
  const l = L('call');
  const dec = l('decline');
  const settle = E.out(prog(t, 0, 12));
  const buzzOn: [number, number][] = [
    [-2, 30],
    [dec - 30, dec],
  ];
  const j = jitter(t, buzzOn);
  const pose: Pose = {...PHONE, w: lerp(600, PHONE.w, settle), x: PHONE.x + j, roll: (PHONE.roll ?? 0) + j * 0.12};
  const press = clamp((t - dec + 2) / 3) * (1 - clamp((t - dec - 4) / 4));
  // the decline: the call's UI leaves fast (up and away, a little smaller); only then the clock comes back
  const away = E.in(prog(t, dec + 3, 6));
  const clockA = E.out(prog(t, dec + 8, 6));
  return (
    <div style={{position: 'absolute', inset: 0, background: WOOD, overflow: 'hidden'}}>
      <Wood uid="cw" />
      <PhoneShadow pose={pose} />
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="21:47" date={DATE} dim={0.25 * (1 - clockA)} clock={clockA} quick={clockA} />
        {away < 1 ? (
          <div style={{position: 'absolute', inset: 0, opacity: 1 - away, transform: `translateY(${-260 * away}px) scale(${1 - 0.08 * away})`, transformOrigin: '50% 30%'}}>
            <IncomingCall name="უცნობი ნომერი" sub="მობილური" press={press} />
          </div>
        ) : null}
        <Tap x={270} y={2025} k={(t - dec) / 14} light />
      </ScreenLayer>
    </div>
  );
};

// ---- 2 the flood: every banner lands on the lock screen, lifts out big enough to read, then drops into the stack ----------
const BIG_W = 900;
const BIG_Y = 300;
const BH = 236; // a banner's slot on the screen (capture px)
export const Flood: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('flood').from);
  const bs = evs('banners').map((b) => fr(b) - base);
  const len = fr(shot('flood').to) - base;
  const j = jitter(t, bs.map((b) => [b, b + 9] as [number, number]), 3);
  const push = E.inOut(prog(t, 0, len));
  const pose: Pose = {...PHONE, x: PHONE.x + j, w: PHONE.w * (1 + 0.04 * push), roll: (PHONE.roll ?? 0) + j * 0.15 - 1.5 * push};
  // each banner's lift: up from its place a few frames after it lands, back into the stack as the next one arrives
  const liftOf = (i: number) => {
    const up = E.outBack(prog(t, bs[i] + 2, 7));
    const down = i < bs.length - 1 ? E.inOut(prog(t, bs[i + 1] - 4, 6)) : 0;
    return up * (1 - down);
  };
  const slotOf = (i: number) => {
    let slot = 0;
    for (let m = i + 1; m < NOTES.length; m++) slot += E.out(prog(t, bs[m], 7));
    return slot;
  };
  const focus = Math.max(0, ...NOTES.map((_, i) => (t >= bs[i] ? clamp(liftOf(i)) : 0)));
  return (
    <div style={{position: 'absolute', inset: 0, background: WOOD, overflow: 'hidden'}}>
      <Wood uid="fw" />
      <PhoneShadow pose={pose} />
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="21:47" date={DATE}>
          {NOTES.map((n, i) => {
            if (t < bs[i] || liftOf(i) > 0.03) return null;
            const k = E.out(prog(t, bs[i], 7));
            return <Banner key={i} n={n} y={980 + slotOf(i) * BH} k={k} />;
          })}
        </LockScreen>
      </ScreenLayer>
      {/* the room dims a little while a banner is out (the eye goes to it) */}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.28 * focus}} />
      {NOTES.map((n, i) => {
        if (t < bs[i]) return null;
        const lk = liftOf(i);
        if (lk <= 0.03) return null;
        const y = 980 + slotOf(i) * BH;
        const tl = project(pose, 40 / 1080, y / 2346);
        const tr = project(pose, 1040 / 1080, y / 2346);
        const onW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const ang = (Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180) / Math.PI;
        const sc = lerp(onW / 1000, BIG_W / 1000, lk);
        const x = lerp(tl.x, 540 - BIG_W / 2, lk);
        const yy = lerp(tl.y, BIG_Y, lk);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: yy,
              width: 1000,
              transform: `rotate(${lerp(ang, 0, clamp(lk))}deg) scale(${sc})`,
              transformOrigin: '0 0',
              filter: `drop-shadow(0 ${40 * clamp(lk)}px ${60 * clamp(lk)}px rgba(0,0,0,${0.45 * clamp(lk)}))`,
            }}
          >
            <div style={{position: 'relative', width: 1080, height: 260, marginLeft: -40}}>
              <Banner n={n} y={0} k={1} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
