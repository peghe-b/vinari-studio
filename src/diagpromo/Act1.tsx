// ACT 1, the problem: the warm garage at night, the mechanic who guesses, the bill, the morning when the check light comes
// back on, the owner's bleeped line, the mechanic's call, the money into the bin. The garage is kit/garage.tsx around the
// 3D car (kit/car3d.tsx, raised on the lift); the people are the Silhouette-light figures of kit/people.tsx; the cluster is
// kit/cluster.tsx. Everything that matters stays whole and above the subtitle band (y 1400).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, ev, evs, fr, lerp, prog, shot, sp} from './lib';
import {Car3, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {viewOf} from './kit/street';
import {Mechanic, Owner} from './kit/people';
import {CheckLamp, CHECK_AT, Cluster} from './kit/cluster';
import {Phone3, ScreenLayer, atFoot, float, project, type Pose} from './kit/phone3d';
import {ActiveCall, LockScreen} from './kit/ios';

export const useShot = (id: string) => {
  const t = useCurrentFrame();
  const base = fr(shot(id).from);
  const len = fr(shot(id).to) - base;
  const L = (name: string) => fr(ev(name)) - base;
  const Ls = (name: string) => evs(name).map((x) => fr(x) - base);
  return {t, len, L, Ls, base};
};

export const mixCam = (a: CarCam, b: CarCam, k: number): CarCam => ({
  pos: [lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k)],
  target: [lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k)],
  fov: lerp(a.fov, b.fov, k),
});

/** a person standing at (x, z) on the floor, `h` metres tall, seen by `cam` (frame px) */
export const personAt = (cam: CarCam, x: number, z: number, h: number) => {
  const V = viewOf(cam);
  const f = V.pt([x, 0, z]);
  const hd = V.pt([x, h, z]);
  return f && hd ? {x: f[0], y: f[1], size: f[1] - hd[1]} : null;
};

export const LIFT = 1.8;
// the garage's wide camera: low and nearly frontal, the car whole high on its lift, the posts and the pendants round it,
// the mechanic under its nose, the owner aside by the post (both whole, their feet above the subtitle band)
export const G_CAM0: CarCam = {pos: [1.6, 1.15, 10.8], target: [0.0, 1.34, 0.3], fov: 36};
export const G_CAM1: CarCam = {pos: [1.45, 1.15, 10.3], target: [0.0, 1.36, 0.3], fov: 36};
export const MECH_AT: [number, number] = [0.45, 1.3];
export const OWNER_AT: [number, number] = [-1.0, 2.25];
export const WORK_LAMP: [number, number, number] = [0.05, 1.66, 1.55];

// ---- 1 garage --------------------------------------------------------------------------------------------------------------
export const GarageShot: React.FC = () => {
  const {t, len, L} = useShot('garage');
  const cam = mixCam(G_CAM0, G_CAM1, E.inOut(prog(t, 0, len + 30)));
  const m = personAt(cam, MECH_AT[0], MECH_AT[1], 1.76);
  const o = personAt(cam, OWNER_AT[0], OWNER_AT[1], 1.8);
  const m0 = L('m0');
  return (
    <div style={{position: 'absolute', inset: 0, background: '#15110E', overflow: 'hidden'}}>
      <Garage cam={cam} uid="gw" look="night" lift={LIFT} />
      <Car3 cam={cam} night={1} street={0.75} lift={LIFT} shadow={1} />
      <Garage cam={cam} uid="gwf" look="night" layer="front" lift={LIFT} workLamp={WORK_LAMP} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {o ? <Owner uid="go" x={o.x} y={o.y} size={o.size} frame={t + 40} pose="crossArms" face="worried" turn={0.6} /> : null}
        {m ? <Mechanic uid="gm" x={m.x} y={m.y} size={m.size} frame={t} pose="stand" hold="wrench" face="meh" turn={-0.85} acts={[{at: m0 + 4, pose: 'offer'}]} /> : null}
      </svg>
    </div>
  );
};

// ---- 2 mech: at his bench under the pegboard of tools, he turns to the car (off the frame, right) and lists the parts with
// the wrench: on „სანთლებიც" it points, on „კოჭაც" again, lazier, then a shrug ------------------------------------------------
const M_CAM0: CarCam = {pos: [1.0, 1.3, 6.5], target: [-3.0, 0.75, 3.2], fov: 36};
const M_CAM1: CarCam = {pos: [0.7, 1.3, 6.2], target: [-3.0, 0.76, 3.25], fov: 36};
export const MechShot: React.FC = () => {
  const {t, len, L} = useShot('mech');
  const cam = mixCam(M_CAM0, M_CAM1, E.inOut(prog(t, 0, len)));
  const m = personAt(cam, -3.0, 3.4, 1.76);
  const m1 = L('m1');
  const m2 = L('m2');
  return (
    <div style={{position: 'absolute', inset: 0, background: '#15110E', overflow: 'hidden'}}>
      <Garage cam={cam} uid="mw" look="night" lift={LIFT} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {m ? (
          <Mechanic
            uid="mm"
            x={m.x}
            y={m.y}
            size={m.size}
            frame={t}
            pose="stand"
            hold="wrench"
            face="meh"
            turn={0.85}
            acts={[
              {at: m1 - 4, pose: 'offer'},
              {at: m2 - 6, pose: 'hold'},
              {at: m2 + 1, pose: 'offer'},
              {at: m2 + 16, pose: 'shrug', face: 'smirk'},
            ]}
          />
        ) : null}
      </svg>
    </div>
  );
};

// ---- 3 dash: „ესეც..." over the glowing check light; the camera drifts in on it --------------------------------------------
export const DashShot: React.FC = () => {
  const {t, len} = useShot('dash');
  const k = E.inOut(prog(t, 0, len));
  const glow = E.out(prog(t, 0, 6));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0C0907'}}>
      <Cluster uid="d" look="night" frame={t} check={0.25 + 0.75 * glow} rpm={0} speed={0} cam={{s: lerp(1.06, 1.1, k), cx: lerp(540, CHECK_AT.x, k), cy: lerp(930, CHECK_AT.y - 40, k)}} />
    </div>
  );
};

// ---- 4 receipt: on the counter's dark walnut, a receipt unrolls down from its little roll, line by line; the total lands -----
const RX = 180;
const RW = 720;
const RTOP = 330;
const ROWS: [string, string][] = [
  ['სანთლები', '120 ₾'],
  ['კოჭა', '180 ₾'],
  ['სენსორი', '240 ₾'],
  ['დიაგნოსტიკა', '50 ₾'],
];
export const ReceiptShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('receipt');
  const lines = Ls('rcptLines');
  const total = L('total');
  const ROWH = 118;
  const HEAD = 200;
  // the paper's length follows the last line out (the roll moves down as it unrolls)
  const shown = lines.reduce((n, at) => n + E.out(prog(t, at - 6, 7)), 0) + E.out(prog(t, total - 6, 7)) * 1.6;
  const paperH = HEAD + shown * ROWH + 60;
  const rollY = RTOP + paperH;
  const pop = sp(t, total, 220, 14);
  const k = E.inOut(prog(t, 0, len));
  const cam = 1 + 0.04 * k;
  const zig = Array.from({length: 32}, (_, i) => `${RX + (i * RW) / 31},${rollY + (i % 2 ? 10 : 0)}`).join(' ');
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1C1410', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="rcLamp" cx="0.55" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#6E4A30" />
            <stop offset="0.5" stopColor="#3A281C" />
            <stop offset="1" stopColor="#140E0B" />
          </radialGradient>
          <linearGradient id="rcPaper" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ECE7DC" />
            <stop offset="0.5" stopColor="#F7F3EA" />
            <stop offset="1" stopColor="#E6E0D3" />
          </linearGradient>
          <linearGradient id="rcRoll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFDF7" />
            <stop offset="0.5" stopColor="#E2DCCD" />
            <stop offset="1" stopColor="#B9B1A0" />
          </linearGradient>
          <filter id="rcSh" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={18} />
          </filter>
        </defs>
        <rect width={1080} height={1920} fill="url(#rcLamp)" />
        {/* the walnut's grain, very faint */}
        {Array.from({length: 22}, (_, i) => (
          <path key={i} d={`M${-40 + i * 52} -40C${-20 + i * 52} 600 ${-60 + i * 52} 1300 ${-30 + i * 52} 1980`} stroke={i % 2 ? '#2A1D15' : '#5A3E2B'} strokeWidth={i % 3 ? 1.4 : 2.4} fill="none" opacity={0.25} />
        ))}
        <g transform={`translate(540 ${960}) scale(${cam}) translate(-540 -960)`}>
          <rect x={RX + 24} y={RTOP + 30} width={RW} height={paperH} fill="#000" opacity={0.45} filter="url(#rcSh)" />
          <rect x={RX} y={RTOP} width={RW} height={paperH} fill="url(#rcPaper)" />
          <polygon points={`${RX},${rollY - 2} ${zig} ${RX + RW},${rollY - 2}`} fill="#F1ECE1" />
          {/* the roll at the paper's foot */}
          <rect x={RX - 14} y={rollY - 6} width={RW + 28} height={64} rx={32} fill="url(#rcRoll)" />
          <rect x={RX - 14} y={rollY + 22} width={RW + 28} height={8} fill="#000" opacity={0.08} />
        </g>
      </svg>
      <div style={{position: 'absolute', inset: 0, transform: `translate(540px, 960px) scale(${cam}) translate(-540px, -960px)`}}>
        <div style={{position: 'absolute', left: RX, top: RTOP + 54, width: RW, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 42, color: '#2A2622', letterSpacing: '0.08em'}}>{mtav('ავტოსერვისი')}</div>
        <div style={{position: 'absolute', left: RX, top: RTOP + 112, width: RW, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: '#7A736A'}}>15.10 · 21:40</div>
        {ROWS.map(([name, price], i) => {
          const a = E.out(prog(t, lines[i] - 6, 7));
          if (a <= 0) return null;
          return (
            <div key={name} style={{position: 'absolute', left: RX + 50, width: RW - 100, top: RTOP + HEAD + i * ROWH, display: 'flex', alignItems: 'baseline', fontFamily: F.sans, fontWeight: 500, fontSize: 50, color: '#2A2622', opacity: a}}>
              <span>{mtav(name)}</span>
              <span style={{flex: 1, margin: '0 12px', borderBottom: '3px dotted rgba(42,38,34,0.35)', transform: 'translateY(-10px)'}} />
              <span style={{fontFeatureSettings: '"tnum" 1'}}>{price}</span>
            </div>
          );
        })}
        {t >= total - 4 ? (
          <div
            style={{
              position: 'absolute',
              left: RX + 50,
              width: RW - 100,
              top: RTOP + HEAD + 4 * ROWH + 20,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              fontFamily: F.sans,
              fontWeight: 700,
              color: '#0B0B0B',
              opacity: clamp(pop * 2),
              transform: `scale(${lerp(1.25, 1, clamp(pop))})`,
              transformOrigin: '80% 50%',
            }}
          >
            <span style={{fontSize: 56}}>{mtav('სულ')}</span>
            <span style={{fontSize: 112, color: '#C8261B', fontFeatureSettings: '"tnum" 1'}}>590 ₾</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---- 5 morning: the cluster at dawn: the start, the lamps' self-test, the needles sweep, all go out; the check comes back --
export const MorningShot: React.FC = () => {
  const {t, len, L} = useShot('morning');
  const st = L('start');
  const test = L('test');
  const off = L('testOff');
  const back = L('checkBack');
  const on = E.out(prog(t, st, 8));
  const lamps = prog(t, test - 2, 3) * (1 - prog(t, off, 3));
  const sweep = t < test ? 0 : t < off ? E.inOut(prog(t, test, (off - test) * 0.55)) * (1 - E.inOut(prog(t, test + (off - test) * 0.55, (off - test) * 0.45))) : 0;
  const idle = 0.09 * E.out(prog(t, off, 10)) + 0.004 * Math.sin(t / 3);
  // the check light flickers back on (two short blinks, then steady)
  const fl = t - back;
  const check = fl < 0 ? 0 : fl < 2 ? 1 : fl < 4 ? 0.2 : fl < 6 ? 1 : fl < 7 ? 0.5 : 1;
  const k = E.inOut(prog(t, 0, len));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0D0E13'}}>
      <Cluster uid="mo" look="dawn" frame={t} check={check} test={lamps} on={on} rpm={Math.max(sweep, idle)} speed={sweep} cam={{s: lerp(1.02, 1.07, k), cx: 540, cy: lerp(960, 990, k)}} />
    </div>
  );
};

// ---- 6 rage: the owner in the driver's seat in the dawn, seen from the passenger side (his profile facing the windscreen);
// on „ხუთასი ლარი გამი-" his hands go to his head, the bleep kicks the frame -----------------------------------------------
export const RageShot: React.FC = () => {
  const {t, len, L} = useShot('rage');
  const o0 = L('o0');
  const bl = L('bleep');
  const kick = clamp((t - bl) / 2) * Math.exp(-Math.max(0, t - bl) / 5);
  const shakeX = t >= bl && t < bl + 10 ? 6 * (1 - (t - bl) / 10) * Math.sin((t - bl) * 2.1 + 1.2) : 0;
  const k = E.inOut(prog(t, 0, len));
  const s = lerp(1.0, 1.05, k) * (1 + 0.05 * kick);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#11131A', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shakeX}px, 0px) scale(${s})`, transformOrigin: '520px 820px'}}>
        <Cabin uid="rg" t={t} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Owner uid="ro" x={500} y={760} size={1650} crop="bust" frame={t} pose="stand" face="angry" turn={0.95} light="morning" acts={[{at: o0 - 2, pose: 'handsHead', face: 'angry'}]} />
        </svg>
        <CabinFront uid="rgf" />
      </div>
    </div>
  );
};

/** the car's cabin at dawn from the passenger seat: the driver's door window behind him with the cold morning street, the
 *  headrest behind his head, the A pillar and a slice of the windscreen on the right */
export const Cabin: React.FC<{uid: string; t: number}> = ({uid, t}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5D6B93" />
        <stop offset="0.6" stopColor="#A8A6BD" />
        <stop offset="1" stopColor="#D9C3B2" />
      </linearGradient>
      <linearGradient id={`${uid}in`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1A1D26" />
        <stop offset="1" stopColor="#0E1016" />
      </linearGradient>
      <linearGradient id={`${uid}seat`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#15171D" />
        <stop offset="0.65" stopColor="#262932" />
        <stop offset="1" stopColor="#15171D" />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${uid}in)`} />
    {/* the door window (left and middle) and the windscreen's slice (right), the morning street outside */}
    <path d="M20 560C60 470 170 420 330 410L800 400L800 1010L20 1010Z" fill={`url(#${uid}sky)`} />
    <path d="M900 380L1080 330L1080 1010L960 1010Z" fill={`url(#${uid}sky)`} />
    <g opacity={0.5}>
      <rect x={60} y={720} width={160} height={290} fill="#7C7F96" />
      <rect x={232} y={660} width={200} height={350} fill="#878BA3" />
      <rect x={448} y={700} width={150} height={310} fill="#777A90" />
      <rect x={612} y={640} width={190} height={370} fill="#8A8DA4" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={262 + i * 56} y={710} width={30} height={50} fill="#E6C49A" opacity={i === 1 ? 0.9 : 0.35} />
      ))}
      <circle cx={540} cy={610} r={8} fill="#FFE2B0" />
      <circle cx={540} cy={610} r={36} fill="#FFE2B0" opacity={0.25} />
    </g>
    {/* the frames: the roof line, the B pillar at the far left, the A pillar between the window and the windscreen */}
    <path d="M0 0L1080 0L1080 330L900 380L800 400L330 410C170 420 60 470 20 560L20 1010L0 1010Z" fill="#0D0F14" />
    <path d="M800 400L900 380L960 1010L800 1010Z" fill="#0D0F14" />
    <path d="M0 1000L1080 1000L1080 1920L0 1920Z" fill="#11131A" />
    <path d="M0 1000L1080 1000" stroke="#3E4458" strokeWidth={4} opacity={0.7} />
    {/* the headrest behind his head and the seat's shoulder */}
    <rect x={140} y={600} width={190} height={250} rx={66} fill={`url(#${uid}seat)`} />
    <rect x={210} y={840} width={14} height={50} fill="#08090C" />
    <rect x={250} y={840} width={14} height={50} fill="#08090C" />
    <path d="M60 900C90 870 150 860 250 860L420 860C500 860 540 900 550 960L590 1920L40 1920Z" fill={`url(#${uid}seat)`} />
    <rect width={1080} height={1920} fill="#0B0D14" opacity={0.06 + 0.02 * Math.sin(t / 30)} />
  </svg>
);

/** what is between the camera and him: the steering wheel's rim seen almost edge-on before his face (whole), the dash */
export const CabinFront: React.FC<{uid: string}> = ({uid}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id={`${uid}rim`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2A2D35" />
        <stop offset="0.5" stopColor="#454A56" />
        <stop offset="1" stopColor="#14161B" />
      </linearGradient>
    </defs>
    <path d="M820 1000C900 975 990 968 1080 966L1080 1920L860 1920Z" fill="#0F1117" />
    <ellipse cx={890} cy={1060} rx={58} ry={240} fill="none" stroke={`url(#${uid}rim)`} strokeWidth={36} />
    <ellipse cx={890} cy={1060} rx={58} ry={240} fill="none" stroke="#7A84A6" strokeWidth={3} opacity={0.35} transform="translate(-14 0)" />
    <rect x={900} y={1030} width={180} height={56} rx={20} fill="#191B22" />
  </svg>
);

// ---- 6b again: back on the lamp, big over the blurred cluster: „და ჩეკი ისევ ანთია!" ------------------------------------------
export const AgainShot: React.FC = () => {
  const {t, len, L} = useShot('again');
  const slap = L('slap');
  const k = E.inOut(prog(t, 0, len));
  const thump = clamp((t - slap) / 2) * Math.exp(-Math.max(0, t - slap) / 5);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0D0E13', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${1.6 + 0.08 * k})`, transformOrigin: `${CHECK_AT.x}px ${CHECK_AT.y}px`}}>
        <Cluster uid="ag" look="dawn" frame={t} check={1} blur={10} dimAll={0.25} cam={{s: 1, cx: 540, cy: 960}} />
      </div>
      <CheckLamp uid="agl" x={540} y={900} size={lerp(300, 330, k) * (1 + 0.04 * thump)} k={1} frame={t} />
    </div>
  );
};

// ---- 7 call: his phone in its vent mount, a call from „ხელოსანი" on the speaker; rings leave the speaker while he talks -------
export const CallShot: React.FC = () => {
  const {t, len, L} = useShot('call');
  const on = L('m4');
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const pose: Pose = atFoot({x: 540, w: lerp(470, 500, k), yaw: lerp(-8, -4, k) + fl.roll, pitch: 4 + fl.pitch, roll: 1.5}, 1330);
  const secs = 12 + Math.floor((t + 8) / 30);
  const foot = project(pose, 0.5, 0.99);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0D0E13', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: 'scale(1.35)', transformOrigin: '540px 900px'}}>
        <Cluster uid="cc" look="dawn" frame={t} check={1} blur={16} dimAll={0.35} cam={{s: 1, cx: 540, cy: 960}} />
      </div>
      <SpeakerRings x={foot.x} y={foot.y + 6} t={t} on={on} />
      {/* the vent mount's clamp under the phone */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <rect x={foot.x - 90} y={foot.y - 40} width={180} height={70} rx={20} fill="#16181E" />
        <rect x={foot.x - 22} y={foot.y + 26} width={44} height={70} rx={10} fill="#101217" />
      </svg>
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.25} rim={0.9} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="07:58" date="ხუთშაბათი, 16 ოქტომბერი" clock={0} quick={0}>
          <ActiveCall name="ხელოსანი" time={`00:${String(secs).padStart(2, '0')}`} speaker={1} clock="07:58" />
        </LockScreen>
      </ScreenLayer>
    </div>
  );
};

const SpeakerRings: React.FC<{x: number; y: number; t: number; on: number}> = ({x, y, t, on}) => {
  if (t < on - 2) return null;
  const rings = [];
  for (let n = 0; n < 3; n++) {
    const ph = ((((t - on) / 16 + n / 3) % 1) + 1) % 1;
    const r = 60 + 260 * E.out(ph);
    rings.push(<ellipse key={n} cx={x} cy={y} rx={r} ry={r * 0.36} fill="none" stroke="#FFFFFF" strokeWidth={3.5} opacity={0.3 * (1 - ph)} />);
  }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {rings}
    </svg>
  );
};

// ---- 8 bin: lari notes flutter down into a dark wire bin under a warm spot, the last one settles on the pile ----------------
const BIN = {x: 540, top: 980, w: 420, h: 400};
export const Note: React.FC<{w: number; v: string; tone: 'green' | 'ochre'}> = ({w, v, tone}) => {
  const h = w * 0.5;
  const base = tone === 'green' ? ['#7FA083', '#B9CDB4', '#4F6F55'] : ['#C59B55', '#E4CB98', '#8A6630'];
  return (
    <svg width={w} height={h} viewBox="0 0 200 100" style={{display: 'block'}}>
      <rect x={0} y={0} width={200} height={100} rx={4} fill={base[0]} />
      <rect x={4} y={4} width={192} height={92} rx={3} fill="none" stroke={base[1]} strokeWidth={1.4} opacity={0.8} />
      {/* the rosette: concentric ellipses, a clean engraving */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={58} cy={50} rx={30 - i * 4.2} ry={34 - i * 4.6} fill="none" stroke={base[1]} strokeWidth={1} opacity={0.7} />
      ))}
      <rect x={110} y={14} width={78} height={72} rx={3} fill={base[1]} opacity={0.35} />
      <text x={182} y={40} textAnchor="end" fontFamily="FiraGO" fontWeight={700} fontSize={26} fill={base[2]}>
        {v}
      </text>
      <text x={182} y={78} textAnchor="end" fontFamily="FiraGO" fontWeight={600} fontSize={30} fill={base[2]}>
        ₾
      </text>
    </svg>
  );
};

export const BinShot: React.FC = () => {
  const {t, len, Ls} = useShot('bin');
  const notes = Ls('notes');
  const k = E.inOut(prog(t, 0, len));
  const NOTES: {v: string; tone: 'green' | 'ochre'; x0: number; x1: number; r0: number; r1: number}[] = [
    {v: '100', tone: 'green', x0: 380, x1: 520, r0: -30, r1: 8},
    {v: '50', tone: 'ochre', x0: 700, x1: 570, r0: 40, r1: -12},
    {v: '100', tone: 'green', x0: 460, x1: 540, r0: 20, r1: 18},
    {v: '100', tone: 'green', x0: 640, x1: 500, r0: -50, r1: -6},
    {v: '50', tone: 'ochre', x0: 520, x1: 560, r0: 70, r1: 4},
  ];
  const FALL = 22;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#120E0B', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="bnSpot" cx="0.5" cy="0.6" r="0.6">
            <stop offset="0" stopColor="#5A3E2A" />
            <stop offset="0.6" stopColor="#24190F" />
            <stop offset="1" stopColor="#0E0A08" />
          </radialGradient>
          <linearGradient id="bnBin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#141210" />
            <stop offset="0.45" stopColor="#3A332D" />
            <stop offset="1" stopColor="#100E0C" />
          </linearGradient>
          <filter id="bnSh" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={16} />
          </filter>
        </defs>
        <rect width={1080} height={1920} fill="url(#bnSpot)" />
        <ellipse cx={BIN.x + 16} cy={BIN.top + BIN.h + 12} rx={BIN.w * 0.6} ry={40} fill="#000" opacity={0.55} filter="url(#bnSh)" />
        {/* the bin's back wall (inside) */}
        <ellipse cx={BIN.x} cy={BIN.top} rx={BIN.w / 2} ry={54} fill="#0C0A09" />
      </svg>
      {/* the notes: falling into the bin; behind the bin's front once inside */}
      {NOTES.map((n, i) => {
        const at = notes[i] ?? 0;
        const q = clamp((t - at) / FALL);
        if (t < at - 1) return null;
        const y = lerp(150, BIN.top + 40 - i * 6, E.in2(q) * 0.6 + q * 0.4);
        const x = lerp(n.x0, n.x1, E.inOut(q)) + 40 * Math.sin(q * Math.PI * 1.6 + i) * (1 - q);
        const rot = lerp(n.r0, n.r1, E.out(q)) + 14 * Math.sin(q * 9 + i) * (1 - q);
        const flip = Math.cos(q * Math.PI * 2.2 + i) * 0.5 + 0.5;
        const sy = lerp(0.35, 1, flip) * (q >= 1 ? 1 : 1);
        const w = 300;
        return (
          <div key={i} style={{position: 'absolute', left: x - w / 2, top: y - w * 0.25, width: w, transform: `rotate(${rot}deg) scaleY(${q >= 1 ? 0.42 : sy})`, filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.45))', zIndex: 1}}>
            <Note w={w} v={n.v} tone={n.tone} />
          </div>
        );
      })}
      {/* the bin's front: a dark wire mesh of slim ribs on a cylinder */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, zIndex: 2}}>
        <path d={`M${BIN.x - BIN.w / 2} ${BIN.top}L${BIN.x - BIN.w * 0.42} ${BIN.top + BIN.h}A${BIN.w * 0.42} 40 0 0 0 ${BIN.x + BIN.w * 0.42} ${BIN.top + BIN.h}L${BIN.x + BIN.w / 2} ${BIN.top}A${BIN.w / 2} 54 0 0 1 ${BIN.x - BIN.w / 2} ${BIN.top}Z`} fill="url(#bnBin)" opacity={0.93} />
        {Array.from({length: 13}, (_, i) => {
          const u = -1 + (2 * i) / 12;
          const xt = BIN.x + u * BIN.w * 0.5 * Math.cos((Math.asin(Math.max(-1, Math.min(1, u))) * 0) );
          const xb = BIN.x + u * BIN.w * 0.42;
          const yt = BIN.top + 54 * Math.sqrt(Math.max(0, 1 - u * u));
          const yb = BIN.top + BIN.h + 40 * Math.sqrt(Math.max(0, 1 - u * u));
          return <line key={i} x1={xt} y1={yt} x2={xb} y2={yb} stroke="#5A5048" strokeWidth={2.2} opacity={0.55} />;
        })}
        <path d={`M${BIN.x - BIN.w / 2} ${BIN.top}A${BIN.w / 2} 54 0 0 0 ${BIN.x + BIN.w / 2} ${BIN.top}`} fill="none" stroke="#8A7A6A" strokeWidth={8} />
        <path d={`M${BIN.x - BIN.w * 0.42} ${BIN.top + BIN.h}A${BIN.w * 0.42} 40 0 0 0 ${BIN.x + BIN.w * 0.42} ${BIN.top + BIN.h}`} fill="none" stroke="#4A4038" strokeWidth={6} />
      </svg>
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.0 * k}} />
    </div>
  );
};
