// ACT 3, what the navigator does (the white world): the voices (Nelson and Alice, the turn card lifted out of the real drive
// screen, Nelson's own clip), the roundabout counted exit by exit, the real lane screen with its lane arrows lifted, the
// turnaround through the median with Alice's own clip, the camera / bump / rail crossing standing up on the road ahead, and
// the mountains where the signal runs out and the route keeps going. Every picture its own: the app's real screens in whole
// phones that move, clean diagrams in the app's own black route and puck, kinetic icons; text black on the white.
import React from 'react';
import {mtav} from '../lib/format';
import {C, F} from '../tokens';
import {atFoot, bodyBox, cardRect, float, flatRect, Lift, Phone3, type Pose, type Region} from './kit/phone3d';
import {alongPoly, clamp, E, lerp, prog, rnd, sampleSmooth, smoothPath, sp, type Pt} from './lib';
import {breath, INK, useShot} from './kit/stage';

const PAPER = '#FFFFFF';
const NAV = '17-nav-drive';
const LANES = 'screens/carplay/nav-lanes-phone.png';
// the drive screen's black turn card (600 მ, მარჯვნივ მოუხვიე, გენერალ კვინიტაძის ქუჩა), measured on the 1080 x 2346 capture
const TURN: Region = {x0: 26 / 1080, y0: 162 / 2346, x1: 1052 / 1080, y1: 462 / 2346};
// the lane screen's card (230 მ, მარჯვენა მხარე დაიჭირე, the three lane arrows), measured on its 1170 x 2532 capture
const LANECARD: Region = {x0: 40 / 1170, y0: 153 / 2532, x1: 1130 / 1170, y1: 652 / 2532};

/** a voice's chip: a black disc with a sound glyph, the name, a row of bars that move while the voice speaks */
const VoiceCard: React.FC<{x: number; y: number; name: string; k: number; play: number; t: number; seed: number; w?: number}> = ({x, y, name, k, play, t, seed, w = 420}) => {
  const r = rnd(seed);
  const bars = Array.from({length: 18}).map(() => 0.25 + 0.75 * r());
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: 168,
        borderRadius: 40,
        background: PAPER,
        boxShadow: '0 26px 64px rgba(0,0,0,0.13), 0 4px 14px rgba(0,0,0,0.06)',
        opacity: clamp(k * 1.6),
        transform: `translateY(${((1 - clamp(k)) * 30).toFixed(1)}px) scale(${lerp(0.9, 1, clamp(k)).toFixed(4)})`,
        transformOrigin: '20% 50%',
      }}
    >
      <div style={{position: 'absolute', left: 28, top: 30, width: 108, height: 108, borderRadius: 54, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg width={56} height={56} viewBox="0 0 24 24">
          <path d="M3 9h4l5-4v14l-5-4H3z" fill="#FFFFFF" />
          <path d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 162, top: 28, fontFamily: F.sans, fontWeight: 700, fontSize: 50, lineHeight: 1.1, color: INK, whiteSpace: 'nowrap'}}>{mtav(name)}</div>
      <svg width={w - 190} height={44} style={{position: 'absolute', left: 164, top: 98}}>
        {bars.map((b, i) => {
          const live = play > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(t / 2.3 + i * 1.7 + seed)) : 1;
          const h = 8 + 34 * b * (play > 0 ? live : 0.45);
          return <rect key={i} x={i * 12.5} y={22 - h / 2} width={7} height={h} rx={3.5} fill={play > 0 ? INK : '#BDBDBD'} />;
        })}
      </svg>
    </div>
  );
};

const phonePose = (t: number, x: number, foot: number, w: number, yaw: number): Pose => {
  const fl = float(t);
  return atFoot({x, w, yaw: yaw + fl.roll, pitch: 3 + fl.pitch, roll: 0.5 + fl.roll * 0.4}, foot + fl.bob);
};

// ---- 10 voices (v1.2, the art director: the drive screen ran for 18 s; the real Nelson / Alice choice exists): the app's own
// voice offer (19-nav-streets-offer) in a whole phone on the white; on „ნელსონი" and „ალისა" their own rows lift out of the
// screen, big and readable above it ------------------------------------------------------------------------------------------
const OFFER = '19-nav-streets-offer';
const ROW_NEL: Region = {x0: 50 / 1080, y0: 1243 / 2346, x1: 1030 / 1080, y1: 1401 / 2346};
const ROW_ALI: Region = {x0: 50 / 1080, y0: 1418 / 2346, x1: 1030 / 1080, y1: 1577 / 2346};
const Voices: React.FC = () => {
  const {t, len, L} = useShot('voices');
  const k = E.inOut(prog(t, 0, len));
  const enter = sp(t + 6, 0, 120, 18);
  const pose = phonePose(t, 540, 1372 + 30 * (1 - enter), lerp(430, 452, k) * lerp(0.94, 1, enter), lerp(-10, -5, enter));
  const kn = sp(t, L('nelson') - 3, 120, 16);
  const ka = sp(t, L('alisa') - 3, 120, 16);
  const toN = cardRect(ROW_NEL, 900, 90, 120);
  const toA = cardRect(ROW_ALI, 900, 90, 120 + toN.h + 34);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <Phone3 src={OFFER} pose={pose} shadow={1} bar="patch" veil={0.2 * clamp(Math.max(kn, ka))} />
      <Lift src={OFFER} r={ROW_NEL} pose={pose} to={toN} k={kn} radius={40} />
      <Lift src={OFFER} r={ROW_ALI} pose={pose} to={toA} k={ka} radius={40} />
    </div>
  );
};

// ---- 10b nelson: the turn card lifts out of the screen, big; Nelson's chip under it plays his real clip --------------------------
const Nelson: React.FC = () => {
  const {t, len, L} = useShot('nelson');
  const says = L('nelsonSays');
  const ends = L('nelsonEnd');
  const k = E.inOut(prog(t, 0, len));
  // the phone steps aside (down and right, smaller, always whole) while its turn card comes up big
  const go = E.inOut(prog(t, 0, 16));
  const pose = phonePose(t + 200, lerp(350, 790, go), lerp(1340, 1370, go), lerp(450, 300, go) * lerp(1, 1.02, k), lerp(13, -12, go));
  const lift = sp(t, 0, 110, 16);
  const to = cardRect(TURN, 960, 60, 300);
  const play = t >= says - 2 && t <= ends + 3 ? 1 : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <Phone3 src={NAV} pose={pose} shadow={1} bar="patch" veil={0.25 * clamp(lift)} />
      <Lift src={NAV} r={TURN} pose={pose} to={to} k={lift} radius={64} />
      <VoiceCard x={60} y={to.y + to.h + 70} name="ნელსონი" k={sp(t, 6, 150, 16)} play={play} t={t} seed={3} w={470} />
    </div>
  );
};

// ---- the map world of the diagrams: a white city from above (pale blocks, white streets with grey edges), the app's black route
// and its black puck, tilted back like the app's own 3D map ---------------------------------------------------------------------
const Blocks: React.FC<{seed: number; avoid: (x: number, y: number) => boolean}> = ({seed, avoid}) => {
  const r = rnd(seed);
  const out: React.ReactNode[] = [];
  for (let gx = -2; gx < 9; gx++)
    for (let gy = -3; gy < 12; gy++) {
      const x = gx * 150 + 10 + r() * 20;
      const y = gy * 150 + 10 + r() * 20;
      const w = 90 + r() * 40;
      const h = 90 + r() * 40;
      if (avoid(x + w / 2, y + h / 2)) continue;
      const park = r() < 0.15;
      const tall = park ? 0 : 6 + r() * 16;
      // a block's height: its darker side under it (the tilted map reads it as a low building, like the app's 3D map)
      if (tall > 0) out.push(<rect key={`${gx}-${gy}s`} x={x} y={y + tall} width={w} height={h} rx={10} fill="#DCDCDC" />);
      out.push(<rect key={`${gx}-${gy}`} x={x} y={y} width={w} height={h} rx={10} fill={park ? '#E7EDE6' : '#EFEFEF'} />);
    }
  return <g>{out}</g>;
};

const Puck: React.FC<{x: number; y: number; a: number; s?: number}> = ({x, y, a, s = 1}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((a * 180) / Math.PI + 90).toFixed(2)}) scale(${s})`}>
    <circle r={44} fill={INK} opacity={0.08} />
    <path d="M0 -34L26 30L0 16L-26 30Z" fill={INK} stroke={PAPER} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

const Chip: React.FC<{x: number; y: number; k: number; children: React.ReactNode; dark?: boolean; size?: number}> = ({x, y, k, children, dark = true, size = 96}) => (
  <div
    style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      background: dark ? INK : PAPER,
      color: dark ? PAPER : INK,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F.sans,
      fontWeight: 700,
      fontSize: size * 0.52,
      boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
      opacity: clamp(k * 1.8),
      transform: `scale(${lerp(0.5, 1, E.outBack(clamp(k))).toFixed(4)})`,
    }}
  >
    {children}
  </div>
);

/** a diagram on the tilted map: the plane (1080 x 1700 map px) seen from above at `tilt` degrees, the camera following `focus` */
const Tilted: React.FC<{tilt: number; focus: Pt; zoom: number; children: React.ReactNode; rot?: number}> = ({tilt, focus, zoom, children, rot = 0}) => (
  <div style={{position: 'absolute', inset: 0, perspective: '1700px', perspectiveOrigin: '540px 700px'}}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1080,
        height: 1700,
        transformOrigin: `${focus[0]}px ${focus[1]}px`,
        transform: `translate(${(540 - focus[0]).toFixed(1)}px, ${(820 - focus[1]).toFixed(1)}px) rotateX(${tilt}deg) rotateZ(${rot}deg) scale(${zoom})`,
      }}
    >
      {children}
    </div>
  </div>
);

// ---- 11 round: the roundabout from above; the puck enters from the south, goes round to the right and out at the second exit;
// the exits are counted as it passes them: 1, 2 -------------------------------------------------------------------------------
const RC: Pt = [540, 760];
const RR = 175;
const ringPt = (deg: number): Pt => [RC[0] + RR * Math.cos((deg * Math.PI) / 180), RC[1] + RR * Math.sin((deg * Math.PI) / 180)];
const ROUTE_R: Pt[] = (() => {
  const pts: Pt[] = [[580, 1640], [580, 1300], [586, 1080], ringPt(70)];
  for (let d = 60; d >= -80; d -= 10) pts.push(ringPt(d));
  pts.push([574, 420], [570, 120], [570, -200]);
  return sampleSmooth(pts, 8);
})();
/** the fraction of the route nearest to a point (where the puck passes an exit) */
const fracNear = (pts: Pt[], p: Pt) => {
  let best = 0;
  let bd = 1e9;
  for (let i = 0; i <= 200; i++) {
    const q = alongPoly(pts, i / 200).p;
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bd) {
      bd = d;
      best = i / 200;
    }
  }
  return best;
};
const A_EAST = fracNear(ROUTE_R, ringPt(0));
const A_NORTH = fracNear(ROUTE_R, ringPt(-80));
const Round: React.FC = () => {
  const {t, len, Ls} = useShot('round');
  const ex = Ls('exits');
  // v1.2 (the art director: the exit badges sat on building blocks): the puck passes the first exit on „1" and takes the
  // second on Nelson's „მეორე"; the badges stand on the exits' own roads
  const along =
    t < ex[0]
      ? lerp(0.1, A_EAST, E.out2(prog(t, 0, ex[0])))
      : t < ex[1]
        ? lerp(A_EAST, A_NORTH, E.inOut(prog(t, ex[0], ex[1] - ex[0])))
        : lerp(A_NORTH, 0.9, E.in2(prog(t, ex[1], len - ex[1])) * 0.6 + prog(t, ex[1], len - ex[1]) * 0.4);
  const q = E.inOut(prog(t, 0, len + 8));
  const {p, a} = alongPoly(ROUTE_R, along);
  const focus: Pt = [lerp(560, 556, q), lerp(1000, 600, q)];
  const roads = '#FFFFFF';
  const edge = '#D9D9D9';
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <Tilted tilt={34} focus={focus} zoom={1.12}>
        <svg width={1080} height={2300} viewBox="0 -300 1080 2300" style={{position: 'absolute', left: 0, top: -300, overflow: 'visible'}}>
          <rect x={-600} y={-1200} width={2400} height={4000} fill="#F4F4F4" />
          <Blocks seed={4} avoid={(x, y) => Math.hypot(x - RC[0], y - RC[1]) < 330 || Math.abs(x - 560) < 120 || Math.abs(y - RC[1]) < 110} />
          {/* the four arms and the ring, their grey edges first */}
          {[0, 1].map((pass) => (
            <g key={pass} stroke={pass ? roads : edge} fill="none" strokeLinecap="butt">
              <path d={`M560 2000V${RC[1]}`} strokeWidth={pass ? 150 : 162} />
              <path d={`M560 ${RC[1]}V-1200`} strokeWidth={pass ? 150 : 162} />
              <path d={`M-600 ${RC[1]}H1700`} strokeWidth={pass ? 140 : 152} />
              <circle cx={RC[0]} cy={RC[1]} r={RR} strokeWidth={pass ? 120 : 132} />
            </g>
          ))}
          <circle cx={RC[0]} cy={RC[1]} r={RR - 70} fill="#E3EAE1" />
          <circle cx={RC[0]} cy={RC[1]} r={RR - 70} fill="none" stroke="#D2D2D2" strokeWidth={4} />
          <circle cx={RC[0]} cy={RC[1]} r={RR} fill="none" stroke="#E3E3E3" strokeWidth={4} strokeDasharray="22 22" />
          {/* the route in the app's black and the puck */}
          {/* the route still ahead of the puck only (like the app: the road behind is not drawn), so no line ever runs under
              the subtitle */}
          <path d={smoothPath(ROUTE_R)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={-along} stroke={INK} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
          <Puck x={p[0]} y={p[1]} a={a} />
        </svg>
        <Chip x={RC[0] + RR + 150} y={RC[1]} k={sp(t, ex[0] - 2, 180, 14)}>1</Chip>
        <Chip x={560 + 150} y={RC[1] - RR - 120} k={sp(t, ex[1] - 2, 180, 14)}>2</Chip>
      </Tilted>
    </div>
  );
};

// ---- 12 lane: the real lane screen (230 მ, მარჯვენა მხარე დაიჭირე) in a whole phone; its card lifts out big with the three
// lane arrows ----------------------------------------------------------------------------------------------------------------
const Lane: React.FC = () => {
  const {t, len} = useShot('lane');
  const k = E.inOut(prog(t, 0, len));
  const enter = sp(t + 10, 0, 140, 18);
  const pose = phonePose(t + 400, 720, 1362 + 50 * (1 - enter), 330, lerp(-20, -14, enter));
  const lift = sp(t, 4, 120, 16);
  const to = cardRect(LANECARD, 940, 70, 300 + 8 * k);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <Phone3 src={LANES} pose={pose} shadow={1} bar="patch" veil={0.25 * clamp(lift)} />
      <Lift src={LANES} r={LANECARD} pose={pose} to={to} k={lift} radius={70} />
    </div>
  );
};

// ---- 13 turn: a wide avenue from above with a gap in its median: the puck moves to the left side, turns round through the gap
// and runs back the other way, while Alice says it --------------------------------------------------------------------------------
const ROUTE_U: Pt[] = sampleSmooth(
  [
    [655, 1420],
    [652, 1250],
    [640, 1120],
    [592, 1000],
    [588, 860],
    [585, 760],
    [560, 690],
    [520, 670],
    [480, 690],
    [462, 760],
    [470, 900],
    [490, 1040],
  ],
  10,
);
const Turn: React.FC = () => {
  const {t, len, L} = useShot('turn');
  const says = L('aliceSays');
  const uAt = L('uturn');
  const k = E.inOut(prog(t, 0, len));
  // the puck reaches the gap as Alice says „დატრიალდი"
  const q = t < says ? lerp(0.0, 0.5, E.inOut(prog(t, 0, says))) : lerp(0.5, 0.97, E.inOut(prog(t, says, len - says)));
  const {p, a} = alongPoly(ROUTE_U, q);
  // the camera follows the puck (a little ahead of it), so the route never reaches the subtitle band
  const focus: Pt = [lerp(590, 545, k), clamp(p[1] - 140, 700, 1120)];
  const uChip = sp(t, uAt, 170, 14);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <Tilted tilt={30} focus={focus} zoom={1.15}>
        <svg width={1080} height={2300} viewBox="0 -300 1080 2300" style={{position: 'absolute', left: 0, top: -300, overflow: 'visible'}}>
          <rect x={-600} y={-1200} width={2400} height={4000} fill="#F4F4F4" />
          <Blocks seed={9} avoid={(x) => Math.abs(x - 560) < 300} />
          {/* the avenue: two lanes each way, the planted median with its gap */}
          <rect x={340} y={-1200} width={440} height={3400} fill="#D9D9D9" />
          <rect x={346} y={-1200} width={428} height={3400} fill="#FFFFFF" />
          <rect x={548} y={-1200} width={24} height={1840} fill="#E3EAE1" />
          <rect x={548} y={740} width={24} height={1460} fill="#E3EAE1" />
          <path d="M452 -1200V2200M668 -1200V2200" stroke="#E2E2E2" strokeWidth={5} strokeDasharray="34 30" />
          {/* lane arrows painted on the asphalt */}
          {/* v1.2 (the art director: the puck drove down the left carriageway against arrows pointing up): traffic keeps right,
              so the arrows on the right carriageway point up the avenue and those on the left one point down it */}
          {[[399, 1180, -1], [500, 1180, -1], [620, 1250, 1], [721, 1250, 1], [399, 380, -1], [500, 380, -1], [620, 420, 1], [721, 420, 1]].map(([x, y, d], i) => (
            <path key={i} d={`M${x} ${y}V${y - 90 * d}M${x - 18} ${y - 64 * d}L${x} ${y - 92 * d}L${x + 18} ${y - 64 * d}`} stroke="#E0E0E0" strokeWidth={8} fill="none" />
          ))}
          <path d={smoothPath(ROUTE_U)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={-q} stroke={INK} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
          <Puck x={p[0]} y={p[1]} a={a} />
        </svg>
        <Chip x={760} y={640} k={uChip} size={120}>
          <svg width={64} height={64} viewBox="0 0 24 24">
            <path d="M8 20V9a4 4 0 0 1 8 0v6M12.5 12l3.5 3.5 3.5-3.5" stroke={PAPER} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Chip>
      </Tilted>
    </div>
  );
};

// ---- 14 alerts (v1.2, the art director: a flat road, three pins, nothing moving for 3 s, a camcorder for a camera, a tiny
// rail icon): the camera drives on along the white road (its dashes rushing under us), the three badges stand up on posts at
// the road's side as they are named and come closer as we drive; on Nelson's „სამას მეტრში სიჩქარის კამერაა" the speed
// camera's badge (a road camera: its housing, the big lens, the flash) is near and pulses, its distance chip under it ----------
const ICONS = {
  camera: (
    <svg width={96} height={96} viewBox="0 0 24 24">
      <rect x={3.2} y={7.6} width={17.6} height={11} rx={2.2} fill={INK} />
      <rect x={6.4} y={5} width={5.6} height={3.4} rx={1} fill={INK} />
      <circle cx={12} cy={13.1} r={3.9} fill={PAPER} />
      <circle cx={12} cy={13.1} r={2.3} fill={INK} />
      <rect x={15.6} y={9.2} width={3} height={1.8} rx={0.6} fill={PAPER} />
    </svg>
  ),
  bump: (
    <svg width={96} height={96} viewBox="0 0 24 24">
      <path d="M1.6 17.2H6.4Q9.2 8.6 12 8.6T17.6 17.2H22.4" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.6 20H22.4" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  rail: (
    <svg width={96} height={96} viewBox="0 0 24 24">
      <rect x={6} y={3} width={12} height={14.6} rx={3.4} fill={INK} />
      <rect x={8} y={5.2} width={8} height={5} rx={1.2} fill={PAPER} />
      <circle cx={9} cy={13.8} r={1.2} fill={PAPER} />
      <circle cx={15} cy={13.8} r={1.2} fill={PAPER} />
      <path d="M8.6 17.6L6.4 21M15.4 17.6L17.6 21M4 19.8H20" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  ),
};
const Alerts: React.FC = () => {
  const {t, len, Ls, L} = useShot('alerts');
  const badges = Ls('badges');
  const says = L('cameraSays');
  const ends = L('cameraEnd');
  // the road in perspective: the camera 1.4 m up, the horizon at y 640; world x across (m), z ahead (m)
  const HZ = 640;
  const FOC = 1500;
  const CAMH = 1.4;
  const travel = 26 * E.inOut(prog(t, 0, len)) + 6 * prog(t, 0, len);
  const P = (x: number, z: number, y = 0): [number, number] => {
    const zz = Math.max(0.5, z - travel);
    return [540 + (FOC * x) / zz, HZ + (FOC * (CAMH - y)) / zz];
  };
  const dash = Array.from({length: 18}).map((_, i) => {
    const z0 = i * 6 - (travel % 6) + 2;
    const a = P(-0.08, z0 + travel);
    const b2 = P(0.08, z0 + travel);
    const c = P(0.08, z0 + 3 + travel);
    const d = P(-0.08, z0 + 3 + travel);
    return a[1] > HZ && a[1] < 2100 ? <path key={i} d={`M${a[0]} ${a[1]}L${b2[0]} ${b2[1]}L${c[0]} ${c[1]}L${d[0]} ${d[1]}Z`} fill="#FFFFFF" /> : null;
  });
  // the badges' places (world m): the camera nearest on the right, the bump on the left further, the rail crossing far right
  const SPOTS: [keyof typeof ICONS, number, number][] = [
    ['camera', 4.2, 40],
    ['bump', -4.6, 58],
    ['rail', 2.3, 104],
  ];
  const near = clamp(prog(t, says - 10, 20));
  const pulse = t >= says && t <= ends + 6 ? 0.5 - 0.5 * Math.cos(((t - says) / 16) * 2 * Math.PI) : 0;
  const L0 = P(-3.6, 400);
  const R0 = P(3.6, 400);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="alSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F1F1F1" />
          </linearGradient>
          <linearGradient id="alRoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E4E4E4" />
            <stop offset="1" stopColor="#D0D0D0" />
          </linearGradient>
        </defs>
        <rect width={1080} height={HZ} fill="url(#alSky)" />
        <path d={`M-200 ${HZ}Q200 ${HZ - 70} 420 ${HZ - 30}Q620 ${HZ - 90} 820 ${HZ - 40}Q1000 ${HZ - 70} 1300 ${HZ}Z`} fill="#ECECEC" />
        <rect y={HZ} width={1080} height={1920 - HZ} fill="#F6F6F6" />
        <path d={`M${L0[0]} ${HZ}L${R0[0]} ${HZ}L${540 + FOC * 3.6 / 0.9} 2100L${540 - FOC * 3.6 / 0.9} 2100Z`} fill="url(#alRoad)" />
        <path d={`M${L0[0]} ${HZ}L${540 - FOC * 3.6 / 0.9} 2100M${R0[0]} ${HZ}L${540 + FOC * 3.6 / 0.9} 2100`} stroke="#FFFFFF" strokeWidth={10} />
        {dash}
      </svg>
      {SPOTS.map(([kind, x, z], i) => {
        const kk = sp(t, badges[i] - 3, 170, 14);
        const foot = P(x, z);
        const zz = Math.max(0.5, z - travel);
        const s = Math.min(2.0, 56 / zz);
        const D = 170 * s;
        const postH = 110 * s;
        // the camera's badge is held back from the lens's edge as it nears (never leaves the frame), the others pass on
        const hold = kind === 'camera' ? Math.min(0, 1080 - 70 - (foot[0] + D / 2)) : 0;
        const live = kind === 'camera' ? pulse : 0;
        return (
          <div key={kind} style={{position: 'absolute', left: foot[0] - D / 2 + hold, top: foot[1] - postH - D, width: D, height: D + postH, opacity: clamp(kk * 1.8), transform: `translateY(${((1 - clamp(kk)) * 40).toFixed(1)}px)`}}>
            <div style={{position: 'absolute', left: D / 2 - 5 * s, top: D - 10 * s, width: 10 * s, height: postH, background: '#9A9A9A', borderRadius: 5 * s}} />
            <div style={{position: 'absolute', left: 0, top: 0, width: D, height: D, borderRadius: D / 2, background: PAPER, boxShadow: `0 18px 40px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08), 0 0 0 ${(18 * s * live).toFixed(1)}px rgba(11,11,11,${(0.12 * live).toFixed(3)})`, border: `${8 * s}px solid ${INK}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${(lerp(0.6, 1, E.outBack(clamp(kk))) * (1 + 0.06 * live)).toFixed(4)})`}}>
              <div style={{transform: `scale(${(1.05 * s).toFixed(3)})`}}>{ICONS[kind]}</div>
            </div>
          </div>
        );
      })}
      {near > 0.001 ? (() => {
        const foot = P(4.2, 40);
        const zz = Math.max(0.5, 40 - travel);
        const s = Math.min(2.0, 56 / zz);
        const D = 170 * s;
        const hold = Math.min(0, 1080 - 70 - (foot[0] + D / 2));
        const cx = foot[0] + hold;
        const top = foot[1] - 110 * s - D - 120;
        const kk = sp(t, says - 4, 160, 15);
        return (
          <div style={{position: 'absolute', left: cx - 130, top, width: 260, height: 92, borderRadius: 46, background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 52, opacity: clamp(kk * 1.6), transform: `translateY(${((1 - clamp(kk)) * 20).toFixed(1)}px)`, boxShadow: '0 16px 36px rgba(0,0,0,0.2)'}}>
            300 {mtav('მ')}
          </div>
        );
      })() : null}
    </div>
  );
};

// ---- 15 offline: the mountains in the white world, a road winding up; the phone with the drive screen big in front; the
// signal's four bars go out one by one and cross out, the route keeps moving; a map and a voice glyph settle into the phone -----
const Ridge: React.FC<{seed: number; y: number; amp: number; fill: string; snow?: boolean; dx: number}> = ({seed, y, amp, fill, snow, dx}) => {
  const r = rnd(seed);
  const pts: Pt[] = [];
  for (let x = -300; x <= 1500; x += 120) pts.push([x, y - amp * (0.3 + 0.7 * r())]);
  const d = `M-300 2000L${pts.map((p) => `${p[0]} ${p[1].toFixed(1)}`).join('L')}L1500 2000Z`;
  return (
    <g transform={`translate(${dx.toFixed(1)} 0)`}>
      <path d={d} fill={fill} />
      {snow
        ? pts.map((p, i) =>
            i > 0 && i < pts.length - 1 && p[1] < pts[i - 1][1] && p[1] < pts[i + 1][1] ? (
              <path key={i} d={`M${p[0] - 46} ${p[1] + 40}L${p[0]} ${p[1]}L${p[0] + 46} ${p[1] + 44}L${p[0] + 20} ${p[1] + 34}L${p[0]} ${p[1] + 46}L${p[0] - 18} ${p[1] + 34}Z`} fill="#FFFFFF" />
            ) : null,
          )
        : null}
    </g>
  );
};
const Offline: React.FC = () => {
  const {t, len, Ls} = useShot('offline');
  const bars = Ls('bars');
  const inPh = Ls('inPhone');
  const k = E.inOut(prog(t, 0, len));
  // v1.2 (the art director: the phone's own bar showed full signal and Wi-Fi under the crossed-out bars, and a city map on
  // the mountain road): the river road's drive screen, its status bar with no signal at all
  const pose = phonePose(t + 600, 560, 1390, lerp(380, 400, k), -8);
  const box = bodyBox(pose);
  const lost = bars.map((b) => E.out(prog(t, b, 6)));
  const cross = E.out(prog(t, bars[3] + 4, 8));
  const icon = (i: number) => sp(t, inPh[i] - 2, 150, 15);
  const fly = (i: number) => E.inOut(prog(t, inPh[i] + 8, 14));
  const scr = flatRect(pose, {x0: 0.5, y0: 0.5, x1: 0.5, y1: 0.5});
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <Ridge seed={3} y={720} amp={320} fill="#E6E6E6" snow dx={-30 * k} />
        <Ridge seed={7} y={980} amp={260} fill="#D6D6D6" snow dx={-60 * k} />
        <Ridge seed={11} y={1260} amp={220} fill="#C4C4C4" dx={-110 * k} />
        <path d={`M${120 - 160 * k} 1920Q${300 - 160 * k} 1500 ${520 - 120 * k} 1400Q${760 - 100 * k} 1300 ${600 - 80 * k} 1180Q${430 - 60 * k} 1080 ${620 - 50 * k} 980`} stroke="#FFFFFF" strokeWidth={34} fill="none" strokeLinecap="round" />
      </svg>
      <Phone3 src={LANES} pose={pose} shadow={1} bar="offline" />
      {/* the signal: four bars that go out one by one, then crossed out (a pill above the phone) */}
      <div style={{position: 'absolute', left: box.x + box.w / 2 - 120, top: box.y - 170, width: 240, height: 120, borderRadius: 60, background: PAPER, boxShadow: '0 20px 50px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp(t / 8)}}>
        <svg width={120} height={84} viewBox="0 0 60 42">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={4 + i * 13} y={34 - (i + 1) * 8} width={9} height={(i + 1) * 8} rx={2} fill={INK} opacity={lerp(1, 0.14, lost[i])} />
          ))}
          <path d={`M8 6L52 38`} stroke={INK} strokeWidth={4.5} strokeLinecap="round" strokeDasharray="60" strokeDashoffset={60 * (1 - cross)} />
        </svg>
      </div>
      {/* the map and the voice settle into the phone: the offline map of Georgia and the voices live on it */}
      {[0, 1].map((i) => {
        const kk = icon(i);
        const f = fly(i);
        if (kk <= 0.001 || f >= 0.999) return null;
        const sx = i === 0 ? 170 : 910;
        const sy = 760;
        const x = lerp(sx, scr.x, f);
        const y = lerp(sy, scr.y, f);
        const sc = lerp(1, 0.35, f);
        return (
          <div key={i} style={{position: 'absolute', left: x - 80, top: y - 80, width: 160, height: 160, borderRadius: 80, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp(kk * 1.6) * (1 - E.in(f)), transform: `scale(${(sc * lerp(0.6, 1, E.outBack(clamp(kk)))).toFixed(4)})`, boxShadow: '0 18px 40px rgba(0,0,0,0.2)'}}>
            {i === 0 ? (
              <svg width={84} height={84} viewBox="0 0 24 24">
                <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14M15 6v14" fill="none" stroke={PAPER} strokeWidth={1.8} strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width={84} height={84} viewBox="0 0 24 24">
                <path d="M3 9h4l5-4v14l-5-4H3z" fill={PAPER} />
                <path d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4" stroke={PAPER} strokeWidth={2} fill="none" strokeLinecap="round" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {voices: Voices, nelson: Nelson, round: Round, lane: Lane, turn: Turn, alerts: Alerts, offline: Offline};
void C;
void breath;
