// ACT 5, the payoff: the same woman, calm now, both hands on the wheel, the phone away; the CarPlay map glowing on her dash
// and Alice through the car („ახლა მარჯვნივ მოუხვიე."); the car's screen: „მოვედით"; outside, the restaurant's warm windows
// on the wet street, the pearl saloon parked, she walks to the door in her heels and the car locks behind her: „აი, ასე."
import React from 'react';
import {Img} from 'remotion';
import {clamp, E, lerp, prog} from './lib';
import {breath, personAt, useShot} from './kit/stage';
import {DRIVE, DriverSide, toBody, toStage} from './Act1';
import {cpSrc, Dash} from './CarPlay';
import {EX_CALM, Woman, womanPal, type WPose} from './kit/woman';
import {Street, viewOf} from './kit/street';
import {type CarCam} from './kit/car3d';
import {SKIN_NIGHT} from './Act1';

// ---- 21 calm: from the passenger seat, her profile calm and smiling, both hands on the wheel; in front of us, low, the car's
// screen with the CarPlay map, its light on her face; Alice: „ახლა მარჯვნივ მოუხვიე." ----------------------------------------
const Calm: React.FC = () => {
  const {t, len, L} = useShot('calm');
  const turnAt = L('calmTurn');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.6);
  const smile = E.inOut(prog(t, 4, 18));
  // both hands on the rim (the near one lower), the head level, a small smile; after Alice's line the hands ease the wheel right
  const steer = E.inOut(prog(t, turnAt, 16));
  const pose: WPose = {
    ...DRIVE.road,
    head: 2,
    neck: 1,
    near: {to: toBody([735 + 10 * steer, 1030 - 14 * steer]), bend: -1, hand: 'wheel', ha: 130},
    ex: {...EX_CALM, lid: lerp(0.66, 0.5, smile), smile: 0.6 * smile, curve: lerp(0.1, 1, smile), look: 0.15},
  };
  const cam = {s: lerp(1.3, 1.36, k), ox: 520, oy: 900, dx: b.x - 30, dy: b.y - 40};
  const [fx, fy] = toStage([60, -930]);
  void fx;
  void fy;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <DriverSide uid="clm" t={t + 520} pose={pose} cam={cam} glow={0.25} hills speed={6} />
      {/* the car's screen in front of us, low on the dash, turned toward her: the CarPlay guidance, its light on her */}
      <div style={{position: 'absolute', inset: 0, perspective: '1600px', perspectiveOrigin: '750px 1180px'}}>
        <div style={{position: 'absolute', left: 500, top: 1030, width: 500, height: 300, borderRadius: 24, background: '#050506', boxShadow: '0 0 120px rgba(127,178,200,0.35), 0 30px 60px rgba(0,0,0,0.6)', transform: 'rotateY(-24deg)', transformOrigin: '0% 50%'}}>
          <div style={{position: 'absolute', left: 12, top: 12, right: 12, bottom: 12, borderRadius: 16, overflow: 'hidden'}}>
            {/* v1.2: the real capture Alice's line belongs to (290 მ, მარჯვენა მხარე დაიჭირე) */}
            <Img src={cpSrc('f18-12-lanes-car')} style={{width: '100%', height: '100%'}} />
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 30% at 52% 36%, rgba(160,205,220,0.14) 0%, rgba(160,205,220,0) 100%)', mixBlendMode: 'screen'}} />
    </div>
  );
};

// ---- 22 arrived: the car's screen, closer and from the other side: „მოვედით"; Alice: „მოვედით." ---------------------------------
const Arrived: React.FC = () => {
  const {t, len} = useShot('arrived');
  const k = E.inOut(prog(t, 0, len));
  return <Dash uid="arr" t={t + 700} cam={{s: lerp(1.18, 1.24, k), ox: 542, oy: 1103, dx: 20, dy: -120}} screen={<Img src={cpSrc('f18-14-arrived-car')} style={{width: '100%', height: '100%'}} />} />;
};

// ---- 23 out: the street at night after the rain, from across the road: the pearl saloon parked at the kerb (three quarters
// from the front), the restaurant's warm windows, its awning and string lights; she walks from the car to the door in her heels;
// the car's lamps flash as it locks behind her: „აი, ასე." --------------------------------------------------------------------------
const Restaurant: React.FC<{cam: CarCam}> = ({cam}) => {
  const V = viewOf(cam);
  const X = -9.57;
  const z0 = -6.0;
  const z1 = 2.6;
  const quad = (x: number, a: number, b: number, y0: number, y1: number) => V.poly([[x, y0, a], [x, y0, b], [x, y1, b], [x, y1, a]]);
  const els: React.ReactNode[] = [];
  // the shop front's dark wood frame, then the warm windows with their mullions, the pendant lamps inside, the door
  const front = quad(X + 0.005, z0 - 0.2, z1 + 0.2, 0.14, 3.15);
  if (front) els.push(<path key="fr" d={front} fill="#1E1714" />);
  // v1.2: one long shop window from the door's side to the corner (her walk passes in front of warm glass all the way)
  const WINS: [number, number][] = [
    [-5.7, -4.1],
    [-1.95, 2.4],
  ];
  WINS.forEach(([a, b], i) => {
    const g = quad(X + 0.01, a, b, 0.55, 2.85);
    if (g) els.push(<path key={`w${i}`} d={g} fill="url(#rsWin)" />);
    // mullions: slim uprights and a transom
    const nm = b - a > 3 ? 4 : 3;
    for (let m = 1; m < nm; m++) {
      const zz = a + ((b - a) * m) / nm;
      const d = quad(X + 0.02, zz - 0.03, zz + 0.03, 0.55, 2.85);
      if (d) els.push(<path key={`m${i}${m}`} d={d} fill="#2A1F19" />);
    }
    const tr = quad(X + 0.02, a, b, 2.2, 2.26);
    if (tr) els.push(<path key={`t${i}`} d={tr} fill="#2A1F19" />);
    // the pendant lamps hanging inside (warm points with a glow) and the tables' dark line low in the glass
    for (let l = 0; l < 2; l++) {
      const zz = a + (b - a) * (0.3 + 0.4 * l);
      const p = V.pt([X - 0.6, 2.0, zz]);
      if (p) els.push(<circle key={`lg${i}${l}`} cx={p[0]} cy={p[1]} r={26} fill="#FFF1D6" opacity={0.35} />, <circle key={`l${i}${l}`} cx={p[0]} cy={p[1]} r={7} fill="#FFF6E6" />);
    }
    const tb = quad(X - 0.3, a + 0.15, b - 0.15, 0.75, 0.95);
    if (tb) els.push(<path key={`tb${i}`} d={tb} fill="#7A4A2A" opacity={0.55} />);
  });
  const door = quad(X + 0.012, -3.75, -2.55, 0.14, 2.6);
  if (door) els.push(<path key="door" d={door} fill="#FFE2B6" />);
  const dframe = quad(X + 0.02, -3.82, -2.48, 2.6, 2.7);
  if (dframe) els.push(<path key="df" d={dframe} fill="#2A1F19" />);
  // the awning over it all and the string of bulbs under its edge
  const awning = V.poly([[X, 3.35, z0 - 0.4], [X, 3.35, z1 + 0.4], [X + 1.6, 2.95, z1 + 0.4], [X + 1.6, 2.95, z0 - 0.4]]);
  if (awning) els.push(<path key="aw" d={awning} fill="#15100E" />);
  for (let i = 0; i <= 26; i++) {
    const z = z0 + ((z1 - z0) * i) / 26;
    const sag = 0.2 * Math.sin((Math.PI * ((i % 13) + 0.5)) / 13);
    const p = V.pt([X + 1.55, 2.9 - sag, z]);
    if (p) els.push(<circle key={`b${i}`} cx={p[0]} cy={p[1]} r={16} fill="#FFC27A" opacity={0.2} />, <circle key={`bb${i}`} cx={p[0]} cy={p[1]} r={4.5} fill="#FFE8C4" />);
  }
  // the warm light thrown on the wet pavement and the road
  const refl = V.poly([[X + 0.2, 0.004, z0], [X + 0.2, 0.004, z1], [X + 4.2, 0.004, z1], [X + 4.2, 0.004, z0]]);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="rsWin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7C27C" />
          <stop offset="0.7" stopColor="#E9A05A" />
          <stop offset="1" stopColor="#C77E3E" />
        </linearGradient>
        <linearGradient id="rsRefl" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#F0A95E" stopOpacity={0.0} />
          <stop offset="0.5" stopColor="#F0A95E" stopOpacity={0.22} />
          <stop offset="1" stopColor="#F0A95E" stopOpacity={0.4} />
        </linearGradient>
      </defs>
      {refl ? <path d={refl} fill="url(#rsRefl)" /> : null}
      {els}
    </svg>
  );
};

const Out: React.FC = () => {
  const {t, len, L} = useShot('out');
  const lock = L('lock');
  // v1.2 (the art director: she was 31 % of the frame and her black dress merged into a dark pillar): the camera close on the
  // road (5.6 m), its lens long, panning with her as she walks in front of the restaurant's lit windows to its door: she is
  // more than half the frame, a black silhouette with her warm rim on the glowing glass; her car locks behind her (its
  // amber lamps flash in from the left)
  const q = E.inOut(prog(t, 0, len - 2));
  const z = lerp(1.9, -2.15, q);
  const cz = lerp(1.55, -1.75, E.inOut(prog(t, 0, len)));
  const cam: CarCam = {pos: [-2.1, 1.08, cz], target: [-9.6, 1.18, cz - 0.15], fov: 29};
  // she walks on the far pavement (its top 0.14 m above the road)
  const VV = viewOf(cam);
  const f0 = VV.pt([-7.85, 0.14, z]);
  const h0 = VV.pt([-7.85, 0.14 + 1.74, z]);
  const at = f0 && h0 ? {x: f0[0], y: f0[1], size: f0[1] - h0[1]} : null;
  const phase = (t / 24) % 1;
  const walking = q > 0.02 && q < 0.98;
  const pose: WPose = {head: 3, neck: 1, chest: 0, shrug: 0, near: {to: 'hang', bend: 1, hand: 'relax', ha: 0}, far: {to: 'hang', bend: 1, hand: 'relax', ha: 0}, legs: walking ? phase : 'stand', stride: 120, ex: {...EX_CALM, lid: 0.55, smile: 0.5, curve: 0.9}, hold: null, bob: walking ? 4 * Math.abs(Math.sin(Math.PI * 2 * phase)) : 0};
  const flash = t >= lock && t < lock + 16 ? (Math.floor((t - lock) / 4) % 2 === 0 ? 1 : 0) : 0;
  const pal = womanPal(1.15, true, SKIN_NIGHT);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0F0D12', overflow: 'hidden'}}>
      <Street cam={cam} uid="out" look="night" wet={1} nearTree={false} farTrees={false} />
      <Restaurant cam={cam} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 30% at 0% 72%, rgba(255,166,60,0.6) 0%, rgba(255,166,60,0) 100%)', opacity: flash * 0.85, mixBlendMode: 'screen'}} />
      {at ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <ellipse cx={at.x + at.size * 0.02} cy={at.y + 2} rx={at.size * 0.16} ry={at.size * 0.025} fill="#000000" opacity={0.45} />
          <g opacity={0.2} transform={`translate(0 ${(2 * at.y).toFixed(1)}) scale(1 -1)`}>
            <Woman uid="outr" x={at.x} y={at.y} size={at.size} pose={pose} pal={pal} rim={0.5} />
          </g>
          <Woman uid="outw" x={at.x} y={at.y} size={at.size} pose={pose} pal={pal} rim={1} />
        </svg>
      ) : null}
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {calm: Calm, arrived: Arrived, out: Out};
void clamp;
void personAt;
