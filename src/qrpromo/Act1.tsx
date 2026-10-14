// ACT 1, the problem (v4): strangers heard FROM her phone (the speaker call, the voice message at the mirror), her groan
// (the bleep), the call she declines, the flood of banners. Her room is kit/room.tsx (v4's woman, kit/woman.tsx); the phone
// is the studio's real 3D iPhone (kit/phone3d.tsx) lying on the vanity's walnut, seen from above, its screen the iOS
// lock screen, call and banners drawn in capture px (kit/ios.tsx).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, E, ev, evs, fr, lerp, prog, shot} from './lib';
import {cam, PHONE_AT, Room} from './kit/room';
import {bodyBox, Phone3, project, ScreenLayer, type Pose} from './kit/phone3d';
import {ActiveCall, Banner, IncomingCall, LockScreen, Tap, VoiceNote, type Note} from './kit/ios';
import {mixW, POSES, type WPose} from './kit/woman';

const L = (id: string) => {
  const base = fr(shot(id).from);
  return (name: string) => fr(ev(name)) - base;
};

/** a phone's buzz: a small fast shake while `on` (frames); v4: a smooth ~10 Hz sine, never a frame-to-frame strobe */
const jitter = (t: number, on: [number, number][], amp = 2.6) => {
  for (const [a, b] of on) if (t >= a && t < b) return amp * Math.sin(t * 2.09) * (0.8 + 0.2 * Math.sin(t * 1.7));
  return 0;
};

/** a voice from the speaker: rings that leave the phone's foot while it talks, louder on the shout */
const SpeakerRings: React.FC<{x: number; y: number; t: number; on: [number, number]; loud: [number, number]; scale: number}> = ({x, y, t, on, loud, scale}) => {
  if (t < on[0] - 2 || t > on[1] + 14) return null;
  const rings = [];
  for (let n = 0; n < 4; n++) {
    const ph = (((t - on[0]) / 13 + n / 4) % 1 + 1) % 1;
    const born = t - ph * 13;
    if (born < on[0] - 2 || born > on[1]) continue;
    const hard = born >= loud[0] && born <= loud[1] ? 1 : 0;
    const r = (40 + 300 * E.out(ph)) * scale * (1 + 0.35 * hard);
    rings.push(<ellipse key={n} cx={x} cy={y} rx={r} ry={r * 0.62} fill="none" stroke="#FFFFFF" strokeWidth={(hard ? 7 : 4) * scale} opacity={(hard ? 0.55 : 0.32) * (1 - ph)} />);
  }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {rings}
    </svg>
  );
};

// ---- 1 speaker (the film's first frame): her phone on the walnut, a call on the loudspeaker from „უცნობი ნომერი";
// the stranger shouts „მანქანა ხელს მიშლის, ტოოოო!": rings leave the speaker, the phone rattles on the shout, the camera
// kicks in ---------------------------------------------------------------------------------------------------------------
export const Speaker: React.FC = () => {
  const t = useCurrentFrame();
  const l = L('speaker');
  const len = fr(shot('speaker').to) - fr(shot('speaker').from);
  const on = l('c1');
  const to = l('c1to');
  const end = l('c1end');
  const shout = clamp((t - to) / 3) * (1 - clamp((t - end) / 6));
  // the phone rattles on the wood with the shout (a smooth ~10 Hz shake, never a frame-to-frame strobe)
  const rattle = shout > 0 ? 2.2 * shout * Math.sin(t * 2.09) : 0;
  const push = E.inOut(prog(t, 0, len));
  const kick = clamp((t - to) / 2) * Math.exp(-Math.max(0, t - to) / 6);
  const pose: Pose = {x: 540 + rattle, y: 830, w: lerp(560, 600, push) * (1 + 0.04 * kick), yaw: 0, pitch: 0, roll: -5 + rattle * 0.25};
  const b = bodyBox(pose);
  const secs = 6 + Math.floor((t + 12) / 30);
  const foot = project(pose, 0.5, 0.985);
  return (
    <div style={{position: 'absolute', inset: 0, background: WOOD, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(1 + 0.05 * push + 0.03 * kick, 540, 900), transformOrigin: '0 0'}}>
        <Wood uid="sw" />
        <SpeakerRings x={foot.x} y={foot.y + 10} t={t} on={[on, end]} loud={[to, end]} scale={1} />
        <PhoneShadow pose={pose} />
        <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
        <ScreenLayer pose={pose}>
          <LockScreen wall="qrpromo/lock-night.jpg" time="21:44" date={DATE} clock={0} quick={0}>
            <ActiveCall name="უცნობი ნომერი" time={`00:${String(secs).padStart(2, '0')}`} speaker={1} />
          </LockScreen>
        </ScreenLayer>
        <div style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, opacity: 0}} />
      </div>
    </div>
  );
};

// ---- 2 mirror: the room; she does her lips at the mirror; on the vanity her phone plays a stranger's voice message
// („შენი გაცნობა, ლამაზო?"), its bubble floating over it; on „ლამაზო?" she stops and the lipstick comes down -------------
export const Mirror: React.FC = () => {
  const t = useCurrentFrame();
  const l = L('mirror');
  const len = fr(shot('mirror').to) - fr(shot('mirror').from);
  const vm = l('vm');
  const c2 = l('c2');
  const c2end = l('c2end');
  const frz = l('freeze');
  // her hand works the lipstick along her lips (small, slow), then she freezes and lowers it
  const work = 1 - clamp((t - frz) / 6);
  const base = POSES.lipstick;
  const dab: WPose = {...base, head: base.head + 1.2 * Math.sin(t / 9) * work, near: {...base.near, off: [-4 + 3 * Math.sin(t / 5) * work, 88 + 3 * Math.cos(t / 5) * work]}};
  const pose = mixW(dab, POSES.listen, E.inOut(prog(t, frz, 16)));
  const k = E.inOut(prog(t, 0, len));
  const play = clamp((t - c2) / Math.max(1, c2end - c2));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(lerp(1.3, 1.42, k), lerp(560, 520, k), lerp(820, 760, k)), transformOrigin: '0 0'}}>
        <Room uid="mir" frame={t + 200} pose={pose} ring={0.75} wave={t >= c2 - 2 && t <= c2end + 4 ? 1 : 0} />
        <VoiceNote x={PHONE_AT.x + 30} y={PHONE_AT.y - 210} w={330} k={prog(t, vm - 2, 8)} play={play} who="უცნობი" />
      </div>
    </div>
  );
};

// ---- 2b mirror2: a cut close onto her face and the mirror's: „ლამაზო?" she stops, her eyes open, the lipstick lowers ---
export const MirrorClose: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('mirror2').from);
  const len = fr(shot('mirror2').to) - base;
  const frz = fr(ev('freeze')) - base;
  const c2end = fr(ev('c2end')) - base;
  const pose = mixW(POSES.lipstick, POSES.listen, E.inOut(prog(t, frz, 14)));
  const k = E.inOut(prog(t, 0, len));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(lerp(2.95, 3.1, k), 480, 470), transformOrigin: '0 0'}}>
        <Room uid="mic" frame={t + 330} pose={pose} ring={0.75} wave={t <= c2end + 4 ? 1 : 0} />
      </div>
    </div>
  );
};

// ---- 3 groan: closer on her; „აუუუ," the head goes back on the neck, the shoulders rise with the breath, a hand to the
// forehead; „რა ტვინი მომი-" the sigh out, the shoulders drop; the bleep kicks the frame. The hips and feet stay put. -----
export const Groan: React.FC = () => {
  const t = useCurrentFrame();
  const l = L('groan');
  const len = fr(shot('groan').to) - fr(shot('groan').from);
  const g = l('groan');
  const tv = l('tvini');
  const bl = l('bleep');
  let pose = mixW(POSES.listen, POSES.groan, E.inOut(prog(t, g - 3, 13)));
  pose = mixW(pose, POSES.sigh, E.inOut(prog(t, tv - 2, 14)));
  // a breath under it all
  pose = {...pose, shrug: pose.shrug + 1.5 * Math.sin(t / 11)};
  const k = E.inOut(prog(t, 0, len));
  const kick = clamp((t - bl) / 2) * Math.exp(-Math.max(0, t - bl) / 5);
  const shakeX = t >= bl && t < bl + 10 ? 5 * (1 - (t - bl) / 10) * Math.sin((t - bl) * 2.09 + 1.2) : 0;
  // a hard punch-in on „რა ტვინი მომი-": the face and the hand, closer
  const punch = t >= tv - 2;
  const sc = punch ? lerp(2.2, 2.32, prog(t, tv - 2, len - tv)) : lerp(1.55, 1.68, k);
  const fy = punch ? 360 : lerp(450, 430, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(sc * (1 + 0.05 * kick), punch ? 420 : 440, fy, shakeX, 0), transformOrigin: '0 0'}}>
        <Room uid="gro" frame={t + 260} pose={pose} ring={0.35} />
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
  const away = E.in(prog(t, dec + 2, 5));
  const clockA = E.out(prog(t, dec + 5, 5));
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

// ---- 2 the flood: every banner lands on the lock screen, under the clock, and pushes the older ones down; the camera pushes
// in on the phone so they read. v4 fix (the art director: "banners hang over the bezel and beyond the frame's edges; real iOS
// banners stay inside the glass"): nothing leaves the screen; the phone grows instead (whole, never cut) ----------------------
const BH = 236; // a banner's slot on the screen (capture px)
const FLOOD_Y = 980; // the newest banner's slot (capture px), under the clock
export const Flood: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('flood').from);
  const bs = evs('banners').map((b) => fr(b) - base);
  const len = fr(shot('flood').to) - base;
  const j = jitter(t, bs.map((b) => [b, b + 9] as [number, number]), 3);
  // the camera: in from the call's framing to a phone big enough to read every banner (its foot stays in frame)
  const push = E.inOut(prog(t, 0, Math.min(len, bs[1] + 4)));
  const drift = E.inOut(prog(t, bs[1], len - bs[1]));
  const w = lerp(PHONE.w, 700, push) * (1 + 0.035 * drift);
  const pose: Pose = {...PHONE, x: PHONE.x + j, y: lerp(PHONE.y, 905, push), w, roll: (PHONE.roll ?? 0) + j * 0.15 - 1.5 * push};
  const slotOf = (i: number) => {
    let slot = 0;
    for (let m = i + 1; m < NOTES.length; m++) slot += E.out(prog(t, bs[m], 7));
    return slot;
  };
  return (
    <div style={{position: 'absolute', inset: 0, background: WOOD, overflow: 'hidden'}}>
      <Wood uid="fw" />
      <PhoneShadow pose={pose} />
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="21:47" date={DATE}>
          {NOTES.map((n, i) => {
            if (t < bs[i]) return null;
            const k = E.out(prog(t, bs[i], 7));
            // the newest one lands a touch bigger and settles (a small pop, inside the glass)
            const pop = 1 + 0.035 * Math.sin(Math.PI * clamp((t - bs[i]) / 8)) * (i === NOTES.length - 1 || t < (bs[i + 1] ?? 1e9) ? 1 : 0);
            return <Banner key={i} n={n} y={FLOOD_Y + slotOf(i) * BH} k={k} scale={pop} />;
          })}
        </LockScreen>
      </ScreenLayer>
    </div>
  );
};
