// ACT 1 v2, the problem, every beat its own picture (the owner, 2026-10-15: "do NOT reuse the same shots"): the cold open's
// fight in the night garage (a real shout, the bleep), the mechanic's retort at his bench, a clean rewind to a week before,
// the evening drive (the street at night), the amber lamp popping on in the new digital cockpit, the mechanic bent deep into
// the detailed engine bay (the owner beside the car the whole shot), the coils close from above under the work lamp, the
// 1 200 ₾ on the payment terminal, the start button pressed the next morning (the amber back in the soft cockpit behind it),
// „ისევ?!" through the windscreen from outside, the call on the speaker face up on the passenger seat, the mechanic leaning on
// his tool chest in the day with the phone at his ear. Text only white (the dark) or black.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, GRAPHITE, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {Street, viewOf} from './kit/street';
import {Mechanic, Owner} from './kit/people';
import {SilHand, silPal, SilPalCtx} from './kit/sil/sil';
import {Cockpit, CP, CP_LAMP} from './kit/cockpit';
import {Phone3, ScreenLayer, atFoot, float, project} from './kit/phone3d';
import {ActiveCall, LockScreen} from './kit/ios';
import {AMBER, breath, cssCam, jolt, mixCam, personAt, punch, Svg, useShot, WHITE} from './kit/stage';

export {useShot, mixCam, personAt};

const NIGHT_SKIN = silPal({light: false, hue: '#EBA468', b: '#8A6A55', time: 'night', level: 1});

/** the warm glow of the bonnet's work lamp in the air (the 3D lamp is a slim emissive tube) */
const LampGlow: React.FC<{cam: CarCam; r: number; k: number; uid: string}> = ({cam, r, k, uid}) => {
  const V = viewOf(cam);
  const a = V.pt([0.05, 1.45, 1.55]);
  if (!a) return null;
  return (
    <Svg>
      <defs>
        <radialGradient id={`lg${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE3B8" stopOpacity={0.5} />
          <stop offset="0.25" stopColor="#FFC27A" stopOpacity={0.17} />
          <stop offset="1" stopColor="#E89A52" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={a[0]} cy={a[1]} r={r} fill={`url(#lg${uid})`} opacity={k} />
    </Svg>
  );
};

// ---- 1 fight: the cold open. The night garage from the car's front left at eye level, the bonnet up under the work lamp;
// the owner strides in from the right and throws his arms wide on „რა [BLEEP]", the mechanic at the nose backs off a step with
// the wrench up; the camera punches in on the bleep and shakes once --------------------------------------------------------------
// v2.1 (the AD: "the hook is weak": frame 0 showed only the calm mechanic, small, in a dim wide shot): a TIGHT two-shot from
// frame 0, both men over half the frame's height: the owner (left) already mid-shout, arms flung wide, stepping in; the
// mechanic (right) recoiling with the wrench up, leaning back; behind them, soft, the night garage and the car's lit bay
// between them. A hard punch-in on the bleep (and a jab), then the cut to the retort. Frame 0 is the thumbnail: the conflict.
const FI_BG: CarCam = {pos: [-0.9, 1.45, 8.6], target: [0.0, 1.0, 1.4], fov: 40};
export const FightShot: React.FC = () => {
  const {t, len, L} = useShot('fight');
  const bl = L('bleep');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(FI_BG, {...FI_BG, pos: [-0.8, 1.44, 8.3]}, k);
  // the owner: a step in on the first words, a lunge with the jab on the bleep
  const step = E.inOut(prog(t, 0, 18));
  const lunge = E.out(prog(t, bl - 5, 7));
  const ox = lerp(336, 366, step) + 30 * lunge;
  // the mechanic: already backing off, and back again on the bleep (weight onto his back foot)
  const recoil = E.out(prog(t, bl - 3, 9));
  const mx = lerp(836, 852, E.out(prog(t, 0, 20))) + 24 * recoil;
  const FEET = 1590;
  const s = punch(t, bl, 0.16, 0.85);
  const jx = jolt(t, bl + 1, 12, 10, 1.3);
  const b = breath(t, 1.4);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#120E0B', overflow: 'hidden'}}>
      <div style={cssCam(s, 700, 640, jx + b.x, b.y, b.r)}>
        {/* the garage behind them, out of focus: the lift, the car's nose, its bay lit by the work lamp */}
        <div style={{position: 'absolute', inset: 0, filter: 'blur(7px) brightness(0.9)', transform: 'scale(1.04)', transformOrigin: '540px 900px'}}>
          <Garage cam={cam} uid="fw" look="night" lift={0} />
          <Car3 cam={cam} night={1} street={0.55} lift={0} shadow={1} hood={1} bayLamp={1} lamp={0.45} cool={0.15} style={{filter: 'saturate(0.55)'}} />
          <Garage cam={cam} uid="fwf" look="night" layer="front" lift={0} />
          <LampGlow cam={cam} r={420} k={0.9} uid="fi" />
        </div>
        {/* the floor under them, a warm pool from the bay */}
        <Svg>
          <defs>
            <radialGradient id="fiPool" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#E9A562" stopOpacity={0.2} />
              <stop offset="1" stopColor="#E9A562" stopOpacity={0} />
            </radialGradient>
          </defs>
          <ellipse cx={560} cy={FEET + 10} rx={620} ry={120} fill="url(#fiPool)" />
          <ellipse cx={ox} cy={FEET + 4} rx={170} ry={22} fill="#000" opacity={0.35} />
          <ellipse cx={mx} cy={FEET + 4} rx={160} ry={20} fill="#000" opacity={0.35} />
        </Svg>
        <Svg>
          <Mechanic
            uid="fm"
            x={mx}
            y={FEET}
            size={1060}
            frame={t}
            pose="hold"
            hold="wrench"
            face="worried"
            turn={-0.6}
            bend={lerp(-8, -15, recoil)}
            cig={0.55}
          />
          <Owner
            uid="fo"
            x={ox}
            y={FEET}
            size={1130}
            frame={t}
            pose="shrug"
            face="angry"
            turn={0.58}
            bend={lerp(2, 7, lunge)}
            acts={[
              {at: bl - 4, pose: 'pointYou', face: 'angry'},
              {at: bl + 14, pose: 'shrug', face: 'angry'},
            ]}
          />
        </Svg>
      </div>
    </div>
  );
};

// ---- 2 retort: across the room at his bench (the pegboard of tools behind him, the car out of the frame): he backs into the
// bench with the wrench, shrugs „მე რა ვიცი, ძმაო," and on „მანქანაა!" flings a hand toward the car; a punch-in ---------------
const RE_CAM0: CarCam = {pos: [0.9, 1.42, 4.6], target: [-4.6, 1.2, 3.2], fov: 35};
const RE_CAM1: CarCam = {pos: [0.7, 1.4, 4.55], target: [-4.6, 1.2, 3.25], fov: 34};
export const RetortShot: React.FC = () => {
  const {t, len, L} = useShot('retort');
  const r1 = L('r1');
  const cam = mixCam(RE_CAM0, RE_CAM1, E.inOut(prog(t, 0, len)));
  const back = E.out(prog(t, 0, 22));
  const m = personAt(cam, lerp(-2.65, -3.05, back), lerp(4.15, 4.0, back), 1.74);
  const s = punch(t, r1, 0.06, 0.7);
  const b = breath(t, 1.1);
  const head = m ? {x: m.x - m.size * 0.08, y: m.y - m.size * 0.8} : {x: 540, y: 800};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#15110E', overflow: 'hidden'}}>
      <div style={cssCam(s, head.x, head.y, b.x, b.y, b.r)}>
        <Garage cam={cam} uid="rw" look="night" lift={0} />
        <Svg>
          <defs>
            <radialGradient id="reLamp" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFC98E" stopOpacity={0.3} />
              <stop offset="1" stopColor="#FFC98E" stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* the work lamp's warm spill from the car (off to the right) */}
          <ellipse cx={1180} cy={820} rx={640} ry={900} fill="url(#reLamp)" />
          {m ? (
            <Mechanic
              uid="rm"
              x={m.x}
              y={m.y}
              size={m.size}
              frame={t}
              pose="reject"
              hold="wrench"
              face="worried"
              turn={0.52}
              bend={lerp(-8, -3, E.inOut(prog(t, 10, 20)))}
              acts={[
                {at: 12, pose: 'shrug', face: 'meh'},
                {at: r1 - 3, pose: 'point', face: 'angry'},
              ]}
            />
          ) : null}
        </Svg>
      </div>
    </div>
  );
};

// ---- 3 rewind: a clean rewind to how it started: on the black, a clock's hand spins back and the small white kicker ---------
export const RewindShot: React.FC = () => {
  const {t, len} = useShot('rewind');
  const spin = E.out(prog(t, 0, len));
  const ang = -720 * spin;
  const k = E.out(prog(t, 2, 8)) * (1 - E.in2(prog(t, len - 6, 6)));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#000'}}>
      <Svg>
        <g opacity={k}>
          <circle cx={540} cy={820} r={118} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={6} />
          {Array.from({length: 12}, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={540 + Math.sin(a) * 92} cy={820 - Math.cos(a) * 92} r={i % 3 === 0 ? 6 : 3.5} fill={WHITE} opacity={0.55} />;
          })}
          <g transform={`rotate(${ang} 540 820)`}>
            <rect x={536} y={738} width={8} height={88} rx={4} fill={WHITE} />
          </g>
          <g transform={`rotate(${ang / 12} 540 820)`}>
            <rect x={535} y={770} width={10} height={56} rx={5} fill={WHITE} />
          </g>
          <circle cx={540} cy={820} r={11} fill={WHITE} />
          {/* the rewind sign under it */}
          <path d="M520 1000L478 1028L520 1056ZM566 1000L524 1028L566 1056Z" fill={WHITE} opacity={0.85} transform="translate(17 0)" />
        </g>
      </Svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1110, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 58, letterSpacing: '0.04em', color: WHITE, opacity: k}}>{mtav('ერთი კვირით ადრე')}</div>
    </div>
  );
};

// ---- 4 drive: the evening avenue, the graphite crossover gliding along under the lamps, its lights on; the camera tracks it
// low from the kerb's side as the houses and lamps slide past -----------------------------------------------------------------
export const DriveShot: React.FC = () => {
  const {t, len} = useShot('drive');
  const z = lerp(-6, 6, t / Math.max(1, len));
  const cam: CarCam = {pos: [5.6, 1.35, z + 10.2], target: [-0.7, 0.8, z + 0.2], fov: 38};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0F0D12', overflow: 'hidden'}}>
      <Street cam={cam} uid="dr" look="night" nearTree={false} />
      {/* v2.1 (the AD: the body read navy at night): no cool fill, the street's warm sodium light keeps it charcoal */}
      <Car3 cam={cam} night={1} street={0.75} lamp={1} shadow={0.9} at={[-0.6, z]} cool={0.1} coolFrom={[6, 4, 8]} style={{filter: 'saturate(0.42) sepia(0.1)'}} />
    </div>
  );
};

// ---- 5 pop: inside, close on the new digital cockpit at an angle (its far end soft), the road's dark beyond the glass; the
// amber CHECK lamp pops on in a bloom; „ეს რაღა აინთო ახლა?" ----------------------------------------------------------------
export const PopShot: React.FC = () => {
  const {t, len, L} = useShot('pop');
  const pop = L('pop');
  const fl = t - pop;
  const check = fl < 0 ? 0 : fl < 2 ? 1 : fl < 4 ? 0.35 : 1;
  const bloom = fl < 0 ? 0 : Math.exp(-fl / 7) * clamp(fl / 2);
  const k = E.inOut(prog(t, 0, len));
  // the whole cockpit, turned away to the right, drifting in a little (it never leaves the frame)
  const s = lerp(0.9, 0.97, k);
  const cx = 540;
  const cy = 930;
  const lamp = {x: cx + (CP_LAMP.x - CP.w / 2) * s * 0.93, y: cy + (CP_LAMP.y - CP.h / 2) * s};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#08080A', overflow: 'hidden'}}>
      {/* the windscreen's dark road above, a few far lights drifting */}
      <Svg>
        <defs>
          <linearGradient id="poSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1C1F2B" />
            <stop offset="1" stopColor="#0B0B0E" />
          </linearGradient>
        </defs>
        <rect width={1080} height={760} fill="url(#poSky)" />
        {[120, 300, 520, 760, 930].map((x, i) => (
          <circle key={x} cx={x + 40 * Math.sin(t / 26 + i) - t * 1.5} cy={470 + (i % 2) * 60} r={20 + (i % 3) * 9} fill={i % 2 ? '#FFC27A' : '#FFE2B0'} opacity={0.2} style={{filter: 'blur(6px)'}} />
        ))}
        <path d="M-40 700Q540 620 1120 700L1120 1920L-40 1920Z" fill="#111114" />
        <path d="M-40 700Q540 620 1120 700" stroke="#26272C" strokeWidth={4} fill="none" />
      </Svg>
      <div style={{position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: `${cx}px ${cy}px`}}>
        <div style={{position: 'absolute', left: cx - (CP.w * s) / 2, top: cy - (CP.h * s) / 2, width: CP.w * s, height: CP.h * s, transform: `rotateY(${lerp(-20, -16, k)}deg) rotateX(7deg)`}}>
          <svg width={CP.w * s} height={(CP.h + 80) * s} viewBox={`0 -80 ${CP.w} ${CP.h + 80}`} style={{position: 'absolute', left: 0, top: -80 * s, overflow: 'visible'}}>
            <Cockpit uid="po" frame={t} check={check} speed={62 + Math.round(2 * Math.sin(t / 20))} />
          </svg>
        </div>
      </div>
      {bloom > 0.01 ? <div style={{position: 'absolute', left: lamp.x - 420, top: lamp.y - 420, width: 840, height: 840, borderRadius: 420, background: `radial-gradient(circle, rgba(255,165,31,${0.42 * bloom}) 0%, rgba(255,165,31,${0.12 * bloom}) 35%, rgba(255,165,31,0) 70%)`}} /> : null}
      {/* the steering wheel's rim soft in the foreground, low */}
      <Svg style={{filter: 'blur(12px)'}}>
        <path d="M-160 1760Q220 1180 760 1250Q1000 1290 1180 1500" stroke="#050506" strokeWidth={130} fill="none" strokeLinecap="round" />
      </Svg>
    </div>
  );
};

// ---- 7 bay: v2.1 (the AD: never the wide lift set again): a deep two-shot. The owner big in the foreground at the left, dark
// against the work lamp, arms crossed, turned to the car; behind him (sharp) the whole car at three quarters with the bonnet
// up and the mechanic bent deep into its bay under the lamp; the room beyond soft and dark ------------------------------------
const BA_CAM0: CarCam = {pos: [2.0, 1.75, 9.4], target: [-0.45, 0.85, 0.4], fov: 34};
const BA_CAM1: CarCam = {pos: [1.9, 1.72, 9.1], target: [-0.45, 0.86, 0.42], fov: 34};
export const BayShot: React.FC = () => {
  const {t, len, L} = useShot('bay');
  const m0 = L('m0');
  const m1 = L('m1');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(BA_CAM0, BA_CAM1, k);
  const m = personAt(cam, 1.1, 1.55, 1.74);
  const dig = 4 * Math.sin(Math.PI * clamp((t - m0) / 20));
  const bend = lerp(44 + dig, 30, E.inOut(prog(t, m1 - 6, 12)));
  const lean = 4 * E.inOut(prog(t, 6, 26));
  const b = breath(t, 0.7);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#120E0B', overflow: 'hidden'}}>
      <div style={cssCam(1, 540, 960, b.x, b.y, b.r)}>
        <div style={{position: 'absolute', inset: 0, filter: 'blur(9px) brightness(0.8)'}}>
          <Garage cam={cam} uid="bw" look="night" lift={0} />
        </div>
        <Car3 cam={cam} night={1} street={0.5} lift={0} shadow={1} hood={1} bayLamp={1} lamp={0.3} bayDim={1.25} cool={0.12} style={{filter: 'saturate(0.55)'}} />
        <LampGlow cam={cam} r={300} k={0.75} uid="ba" />
        <Svg>{m ? <Mechanic uid="bm" x={m.x} y={m.y} size={m.size} frame={t} pose="hold" hold="wrench" face="meh" turn={-0.9} bend={bend} acts={[{at: m1 - 4, pose: 'point'}]} /> : null}</Svg>
        {/* the owner in the foreground, a little soft (the lens is on the car), rim-lit by the lamp */}
        <Svg style={{filter: 'blur(1.5px)'}}>
          <Owner uid="bo" x={lerp(205, 216, k)} y={2120} size={1700} frame={t + 40} pose="crossArms" face="worried" turn={0.55} bend={lean} acts={[{at: m1 + 4, pose: 'slumped', face: 'sad'}]} />
        </Svg>
      </div>
    </div>
  );
};

// ---- 8 coils: the engine from straight above under the work lamp: the ribbed cover, the row of four ignition coils with their
// connectors, a hose; the wrench taps along the coils („კოჭაც,"), then waves vaguely at a hose („ესეც..."); a flake of ash
// drifts down from his cigarette ------------------------------------------------------------------------------------------------
export const CoilsShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('coils');
  const taps = Ls('taps');
  const m3 = L('m3');
  const k = E.inOut(prog(t, 0, len));
  const s = lerp(1.0, 1.06, k);
  // the wrench's tip: along the coils on the taps, then off to the hose and a lazy wave
  const coilX = [300, 470, 640, 810];
  const tipAt = (): [number, number] => {
    if (t < taps[0] - 6) return [lerp(200, 300, E.out(clamp(t / (taps[0] - 6)))), 560];
    for (let i = 0; i < 3; i++) {
      const a = taps[i];
      const b = i < 2 ? taps[i + 1] : m3;
      if (t < b) {
        const q = clamp((t - a) / Math.max(1, b - a));
        const hop = Math.sin(Math.PI * q) * 40;
        const x = lerp(coilX[i], coilX[Math.min(3, i + 1)], E.inOut(q));
        return [i < 2 ? x : lerp(coilX[2], 820, E.inOut(q)), 560 - hop - (i === 2 ? 120 * E.inOut(q) : 0)];
      }
    }
    const w = t - m3;
    return [820 + 40 * Math.sin(w / 4), 440 + 60 * Math.sin(w / 6 + 1)];
  };
  const [tx, ty] = tipAt();
  const tapK = Math.max(...taps.map((a) => Math.exp(-Math.max(0, t - a) / 3) * (t >= a ? 1 : 0)));
  const ash = clamp((t - (m3 - 4)) / 26);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0E0B09', overflow: 'hidden'}}>
      <div style={cssCam(s, 540, 760)}>
        <Svg>
          <defs>
            <radialGradient id="coLamp" cx="0.5" cy="0.38" r="0.62">
              <stop offset="0" stopColor="#2E2A27" />
              <stop offset="0.55" stopColor="#181614" />
              <stop offset="1" stopColor="#0B0A09" />
            </radialGradient>
            <linearGradient id="coCover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6E7076" />
              <stop offset="0.45" stopColor="#45474C" />
              <stop offset="1" stopColor="#26272B" />
            </linearGradient>
            <linearGradient id="coCoil" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#17181B" />
              <stop offset="0.45" stopColor="#4A4C52" />
              <stop offset="1" stopColor="#141518" />
            </linearGradient>
            <linearGradient id="coHose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3A3836" />
              <stop offset="0.5" stopColor="#161616" />
              <stop offset="1" stopColor="#0A0A0A" />
            </linearGradient>
            <radialGradient id="coWarm" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFC98E" stopOpacity={0.26} />
              <stop offset="1" stopColor="#FFC98E" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#coLamp)" />
          {/* the cam cover under everything: a long ribbed casting */}
          <rect x={150} y={470} width={800} height={190} rx={40} fill="#2A2B2F" />
          {Array.from({length: 18}, (_, i) => (
            <rect key={i} x={186 + i * 41} y={482} width={12} height={166} rx={6} fill="#3B3D42" opacity={0.85} />
          ))}
          {/* the four coils: a black body, a lighter collar, the connector with its clip and the wire going back */}
          {coilX.map((x, i) => {
            const hit = taps[i] !== undefined ? Math.exp(-Math.max(0, t - taps[i]) / 3) * (t >= taps[i] ? 1 : 0) : 0;
            return (
              <g key={x} transform={`translate(0 ${hit * 4})`}>
                <rect x={x - 56} y={496} width={112} height={142} rx={22} fill="url(#coCoil)" />
                <rect x={x - 46} y={506} width={92} height={22} rx={8} fill="#8A8D94" opacity={0.55} />
                <rect x={x - 30} y={440} width={60} height={74} rx={12} fill="#5C5F66" />
                <rect x={x - 18} y={448} width={36} height={14} rx={5} fill="#A3A6AD" />
                <path d={`M${x} 440C${x} 400 ${x + 30} 380 ${x + 60} 370`} stroke="#111" strokeWidth={14} fill="none" strokeLinecap="round" />
                <circle cx={x} cy={600} r={9} fill="#0D0D0D" />
              </g>
            );
          })}
          {/* v2.1 (the AD: the engine cover read as a grey slab with an amber coin): the intake manifold. Four cast runners
              sweep down from under the coils into the plenum across the front, its bolts and ribs; the throttle body at its left
              end with the ribbed rubber air duct leaving the frame low left; the black oil filler cap on the cam cover's end */}
          <defs>
            <linearGradient id="coRun" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2B2C30" />
              <stop offset="0.4" stopColor="#6A6C72" />
              <stop offset="0.7" stopColor="#4A4C51" />
              <stop offset="1" stopColor="#24252A" />
            </linearGradient>
            <linearGradient id="coPlen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#77797F" />
              <stop offset="0.35" stopColor="#4D4F55" />
              <stop offset="1" stopColor="#222327" />
            </linearGradient>
            <linearGradient id="coDuct" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2A2A2C" />
              <stop offset="1" stopColor="#0E0E10" />
            </linearGradient>
          </defs>
          {coilX.map((x, i) => (
            <path key={`run${i}`} d={`M${x - 40} 630C${x - 46} 700 ${x - 30} 750 ${x - 22} 800L${x + 30} 800C${x + 36} 750 ${x + 48} 700 ${x + 40} 630Z`} fill="url(#coRun)" />
          ))}
          <rect x={196} y={780} width={700} height={190} rx={80} fill="url(#coPlen)" />
          <rect x={232} y={794} width={630} height={18} rx={9} fill="#A4A7AD" opacity={0.3} />
          {Array.from({length: 9}, (_, i) => (
            <path key={`rib${i}`} d={`M${270 + i * 70} 836Q${276 + i * 70} 896 ${270 + i * 70} 950`} stroke="#2A2B2F" strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.55} />
          ))}
          {[250, 846].map((x) => (
            <g key={`bo${x}`}>
              <circle cx={x} cy={876} r={17} fill="#8E9198" />
              <circle cx={x} cy={876} r={8} fill="#3A3B40" />
            </g>
          ))}
          {/* the throttle body and its ribbed air duct */}
          <path d="M150 880C80 930 40 1060 -40 1180" stroke="url(#coDuct)" strokeWidth={128} fill="none" strokeLinecap="round" />
          {Array.from({length: 6}, (_, i) => {
            const u = 0.18 + i * 0.13;
            const x = 150 - u * 190;
            const y = 880 + u * 300;
            return <path key={`dr${i}`} d={`M${x - 52} ${y - 26}L${x + 52} ${y + 26}`} stroke="#3A3A3D" strokeWidth={10} strokeLinecap="round" opacity={0.7} />;
          })}
          <circle cx={182} cy={874} r={86} fill="#5A5C62" />
          <circle cx={182} cy={874} r={64} fill="#1A1B1E" />
          <ellipse cx={182} cy={874} rx={56} ry={14} fill="#3F4146" transform="rotate(-24 182 874)" />
          {/* the oil filler cap on the cam cover's left end: black, knurled, the oil-can mark moulded in */}
          <circle cx={122} cy={560} r={50} fill="#121214" />
          {Array.from({length: 16}, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <circle key={`kn${i}`} cx={122 + Math.cos(a) * 46} cy={560 + Math.sin(a) * 46} r={6} fill="#26262A" />;
          })}
          <circle cx={122} cy={560} r={34} fill="#1C1C1F" />
          <path d="M100 568H138L146 556H152M104 568V556H134L138 568M113 556V550H124V556" stroke="#4A4A50" strokeWidth={3.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {/* the wiring loom along the cam cover's foot, clipped every so often */}
          <path d="M210 668C380 690 700 690 900 664" stroke="#0C0C0D" strokeWidth={18} fill="none" strokeLinecap="round" />
          {[300, 470, 640, 810].map((x) => (
            <rect key={`cl${x}`} x={x - 10} y={668} width={20} height={26} rx={5} fill="#2E2F33" />
          ))}
          {/* the hose arching over the side */}
          <path d="M880 1180C990 1000 1000 760 900 600C860 540 860 470 900 420" stroke="url(#coHose)" strokeWidth={70} fill="none" strokeLinecap="round" />
          <path d="M880 1180C990 1000 1000 760 900 600C860 540 860 470 900 420" stroke="#5A5652" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.35} transform="translate(-14 -6)" />
          {/* the lamp's warm pool over it all */}
          <ellipse cx={540} cy={640} rx={620} ry={520} fill="url(#coWarm)" />
          {/* the ash flake drifting down */}
          {ash > 0 && ash < 1 ? <ellipse cx={lerp(640, 600, ash) + 18 * Math.sin(ash * 9)} cy={lerp(240, 600, E.in2(ash))} rx={10} ry={6} fill="#9A948C" opacity={0.85} transform={`rotate(${ash * 160} ${lerp(640, 600, ash)} ${lerp(240, 600, E.in2(ash))})`} /> : null}
          {/* the tap's small flash at the tip */}
          {tapK > 0.05 ? <circle cx={tx} cy={ty} r={26 + 30 * (1 - tapK)} fill="#FFE6C2" opacity={0.35 * tapK} /> : null}
        </Svg>
        {/* the mechanic's hand and the wrench from the top right: the wrist at the frame's top edge region */}
        <SilPalCtx.Provider value={() => NIGHT_SKIN}>
          <Svg>
            <Wrench x0={tx + 300} y0={ty - 360} x1={tx} y1={ty} />
            <SilHand kind="grip" x={tx + 300} y={ty - 360} angle={lerp(225, 235, k)} scale={13} side="r" arm={24} sleeve={7} time="night" />
          </Svg>
        </SilPalCtx.Provider>
      </div>
    </div>
  );
};

/** a combination wrench from (x0, y0) (the grip end) to (x1, y1) (the open jaw), satin steel */
const Wrench: React.FC<{x0: number; y0: number; x1: number; y1: number}> = ({x0, y0, x1, y1}) => {
  const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const len = Math.hypot(x1 - x0, y1 - y0);
  return (
    <g transform={`translate(${x0} ${y0}) rotate(${a})`}>
      <defs>
        <linearGradient id="wrSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9E4DC" />
          <stop offset="0.5" stopColor="#A8A29A" />
          <stop offset="1" stopColor="#6D6862" />
        </linearGradient>
      </defs>
      <rect x={-20} y={-15} width={len - 30} height={30} rx={15} fill="url(#wrSteel)" />
      <path d={`M${len - 60} -36C${len - 20} -46 ${len + 14} -28 ${len + 10} 0L${len - 8} 0L${len - 8} -12L${len - 34} -12L${len - 34} 12L${len - 8} 12L${len - 8} 0L${len + 10} 0C${len + 14} 28 ${len - 20} 46 ${len - 60} 36Z`} fill="url(#wrSteel)" />
      <circle cx={-12} cy={0} r={34} fill="url(#wrSteel)" />
      <circle cx={-12} cy={0} r={16} fill="#2A2420" />
    </g>
  );
};

// ---- 9 bill: the payment terminal on the counter's dark walnut: the lines tick in on its screen, the total rolls up to
// 1 200 ₾, his card taps above it (the contactless waves), „გადახდილია" --------------------------------------------------------
const ITEMS: [string, number][] = [
  ['სანთლები', 160],
  ['კოჭები', 380],
  ['სენსორი', 420],
  ['ხელობა', 240],
];
export const BillShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('bill');
  const lines = Ls('bill');
  const tot = L('total');
  const tap = L('cardTap');
  const paid = L('paid');
  const k = E.inOut(prog(t, 0, len));
  const roll = E.out(prog(t, tot - 2, 10));
  const total = Math.round((1200 * roll) / 10) * 10;
  const card = E.inOut(prog(t, tap - 14, 12)) * (1 - E.inOut(prog(t, paid + 4, 10)));
  const ok = sp(t, paid, 180, 16);
  const SX = 230;
  const SY = 520;
  const SW = 620;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#120D0A', overflow: 'hidden'}}>
      <div style={cssCam(lerp(1, 1.05, k), 540, 900)}>
        <Svg>
          <defs>
            <radialGradient id="biLamp" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#5C3E28" />
              <stop offset="0.6" stopColor="#25190F" />
              <stop offset="1" stopColor="#0E0A07" />
            </radialGradient>
            <linearGradient id="biBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2E3036" />
              <stop offset="0.5" stopColor="#1A1B1F" />
              <stop offset="1" stopColor="#0E0F12" />
            </linearGradient>
            <filter id="biSh" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={22} />
            </filter>
          </defs>
          <rect width={1080} height={1920} fill="url(#biLamp)" />
          {Array.from({length: 20}, (_, i) => (
            <path key={i} d={`M${-60 + i * 62} 1920C${-20 + i * 62} 1400 ${-80 + i * 62} 900 ${-40 + i * 62} 300`} stroke={i % 2 ? '#2A1D15' : '#4A3324'} strokeWidth={i % 3 ? 1.4 : 2.4} fill="none" opacity={0.25} />
          ))}
          {/* the terminal: a slim body tilted toward us, its screen, a keypad row under it */}
          <rect x={196} y={470} width={688} height={980} rx={70} fill="#000" opacity={0.5} filter="url(#biSh)" transform="translate(30 40)" />
          <rect x={180} y={440} width={720} height={1000} rx={70} fill="url(#biBody)" />
          <rect x={SX - 8} y={SY - 8} width={SW + 16} height={740} rx={30} fill="#050506" />
          {Array.from({length: 9}, (_, i) => (
            <rect key={i} x={262 + (i % 3) * 196} y={1268 + Math.floor(i / 3) * 52} width={160} height={38} rx={18} fill="#2B2D33" opacity={0.6} />
          ))}
        </Svg>
        {/* the screen's content: white and grey only */}
        <div style={{position: 'absolute', left: SX + 40, top: SY + 40, width: SW - 80, fontFamily: F.sans, color: WHITE}}>
          <div style={{fontSize: 32, fontWeight: 500, letterSpacing: '0.06em', color: WHITE}}>{mtav('ავტოსერვისი')}</div>
          {ITEMS.map(([n, v], i) => {
            const a = E.out(prog(t, lines[i] - 5, 6));
            return (
              <div key={n} style={{display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 500, marginTop: i ? 14 : 30, opacity: a, transform: `translateY(${(1 - a) * 12}px)`, fontFeatureSettings: '"tnum" 1'}}>
                <span>{mtav(n)}</span>
                <span>{v} ₾</span>
              </div>
            );
          })}
          <div style={{height: 3, background: 'rgba(255,255,255,0)', marginTop: 26}} />
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, opacity: clamp(roll * 3)}}>
            <span style={{fontSize: 38, fontWeight: 500, color: WHITE}}>{mtav('სულ')}</span>
            <span style={{fontSize: 104, fontWeight: 700, fontFeatureSettings: '"tnum" 1'}}>{total.toLocaleString('en-US').replace(',', ' ')} ₾</span>
          </div>
        </div>
        {/* the card above the screen, tapping; the contactless waves */}
        {card > 0.01 ? (
          <div style={{position: 'absolute', left: 300, top: lerp(60, 170, card), width: 480, height: 300, borderRadius: 28, background: 'linear-gradient(135deg, #3A3D44 0%, #17181C 70%)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', transform: `rotate(${lerp(-12, -4, card)}deg)`, opacity: clamp(card * 2)}}>
            <div style={{position: 'absolute', left: 40, top: 70, width: 70, height: 54, borderRadius: 10, background: 'linear-gradient(135deg, #D8C08A, #9C8550)'}} />
            <div style={{position: 'absolute', left: 40, bottom: 44, fontFamily: F.mono, fontSize: 30, letterSpacing: '0.12em', color: WHITE}}>•••• 4071</div>
          </div>
        ) : null}
        {ok > 0.01 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: SY + 640, display: 'flex', justifyContent: 'center', opacity: clamp(ok * 1.6), transform: `scale(${lerp(0.85, 1, clamp(ok))})`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.sans, fontSize: 40, fontWeight: 600, color: WHITE}}>
              <svg width={44} height={44} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={11} fill={WHITE} />
                <path d="M7 12.4L10.4 15.6L17.2 8.8" fill="none" stroke="#0B0B0B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {mtav('გადახდილია')}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---- 10 morning: the next morning, close on the START STOP button in the cold light; his thumb presses it, its ring lights
// white; behind it (soft, out of focus) the cockpit wakes and the amber lamp comes back on, two blinks then steady ------------------
export const MorningShot: React.FC = () => {
  const {t, len, L} = useShot('morning');
  const press = L('press');
  const back = L('checkBack');
  const k = E.inOut(prog(t, 0, len));
  const down = E.inOut(prog(t, press - 5, 5)) * (1 - E.inOut(prog(t, press + 3, 6)));
  const ring = E.out(prog(t, press + 2, 6));
  const fl = t - back;
  const check = fl < 0 ? 0 : fl < 2 ? 1 : fl < 4 ? 0.2 : fl < 6 ? 1 : fl < 7 ? 0.5 : 1;
  const test = clamp(prog(t, press + 6, 3)) * (1 - prog(t, press + 18, 4));
  const on = E.out(prog(t, press + 4, 8));
  // the thumb comes in from the lower right, presses, lifts a little
  const thumb = E.out(prog(t, 0, press - 4));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#14161C', overflow: 'hidden'}}>
      {/* the cockpit far behind, very soft */}
      <div style={{position: 'absolute', inset: 0, filter: 'blur(16px)', transform: `scale(${lerp(1.05, 1.08, k)})`, transformOrigin: '540px 600px'}}>
        <Svg>
          <defs>
            <linearGradient id="moSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7B8AA8" />
              <stop offset="0.5" stopColor="#3A4152" />
              <stop offset="1" stopColor="#14161C" />
            </linearGradient>
          </defs>
          <rect width={1080} height={900} fill="url(#moSky)" />
          <g transform="translate(40 470) scale(1.0)">
            <Cockpit uid="mo" frame={t} check={check} test={test} on={on} speed={0} night={0} />
          </g>
          <path d="M-40 900Q540 860 1120 900L1120 1920L-40 1920Z" fill="#191B21" />
        </Svg>
      </div>
      {/* the console in front: the button in its bezel */}
      <Svg>
        <defs>
          <radialGradient id="moBtn" cx="0.42" cy="0.36" r="0.7">
            <stop offset="0" stopColor="#4C5058" />
            <stop offset="0.6" stopColor="#24262B" />
            <stop offset="1" stopColor="#141519" />
          </radialGradient>
          <linearGradient id="moBez" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C9CDD4" />
            <stop offset="0.5" stopColor="#6B7078" />
            <stop offset="1" stopColor="#2A2D32" />
          </linearGradient>
        </defs>
        <path d="M-60 980Q540 930 1140 980L1140 1920L-60 1920Z" fill="#1D1F25" />
        <path d="M-60 980Q540 930 1140 980" stroke="#3C4049" strokeWidth={5} fill="none" />
        <circle cx={520} cy={1170} r={208} fill="url(#moBez)" />
        <circle cx={520} cy={1170} r={186} fill="#0E0F12" />
        <circle cx={520} cy={1170} r={176} fill="none" stroke={WHITE} strokeWidth={6} opacity={0.12 + 0.75 * ring} />
        <circle cx={520} cy={1170} r={176} fill="none" stroke={WHITE} strokeWidth={22} opacity={0.12 * ring} />
        <g transform={`translate(520 1170) scale(${1 - 0.035 * down}) translate(-520 -1170)`}>
          <circle cx={520} cy={1170} r={160} fill="url(#moBtn)" />
          <text x={520} y={1150} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={40} fill={WHITE} opacity={0.88} letterSpacing={3}>
            ENGINE
          </text>
          <text x={520} y={1206} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={30} fill={WHITE} opacity={0.62} letterSpacing={2}>
            START STOP
          </text>
        </g>
      </Svg>
    </div>
  );
};

// ---- 11 again: outside the car in the morning, the driver's door and its window: inside, in profile, he sits at the wheel;
// the sky's reflection drifts over the glass; on „ისევ?!" his forehead sinks into his hand ------------------------------------------
export const AgainShot: React.FC = () => {
  const {t, len, L} = useShot('again');
  const isev = L('isev');
  const k = E.inOut(prog(t, 0, len));
  const WIN = 'M120 560L760 520Q900 520 980 700L1010 1060L120 1060Z';
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2A2F38', overflow: 'hidden'}}>
      <div style={cssCam(lerp(1, 1.035, k), 560, 860)}>
        <Svg>
          <defs>
            <linearGradient id="agSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9DA9C2" />
              <stop offset="1" stopColor="#D8CFC6" />
            </linearGradient>
            <linearGradient id="agIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#262A33" />
              <stop offset="1" stopColor="#12141A" />
            </linearGradient>
            <linearGradient id="agRefl" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E6ECF6" stopOpacity={0.3} />
              <stop offset="0.45" stopColor="#E6ECF6" stopOpacity={0.05} />
              <stop offset="1" stopColor="#E6ECF6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="agBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8A9099" />
              <stop offset="0.12" stopColor={GRAPHITE} />
              <stop offset="1" stopColor="#2A2D32" />
            </linearGradient>
            <clipPath id="agGlass">
              <path d={WIN} />
            </clipPath>
          </defs>
          {/* the morning street behind the car (soft), the car's roof and pillars round the window */}
          <rect width={1080} height={1920} fill="url(#agSky)" />
          <rect x={-40} y={380} width={1160} height={1600} fill="#3B3F47" />
          <path d={WIN} fill="url(#agIn)" />
          {/* through the glass: the far window's light, the headrest */}
          <g clipPath="url(#agGlass)">
            {/* the far side's window: the bright morning beyond, so he reads against it */}
            <path d="M180 600L760 570Q860 575 920 700L940 900L180 900Z" fill="#D9DCE3" opacity={0.55} />
          </g>
        </Svg>
        {/* v2.1 (the AD: he floated in front of the seat): the driver's seat behind him, its backrest raked back behind his
            shoulders, its side bolster, the headrest on its two posts behind his head; he sits in it */}
        <Svg>
          <defs>
            <linearGradient id="agSeat" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#15171C" />
              <stop offset="0.7" stopColor="#262A32" />
              <stop offset="1" stopColor="#1B1E24" />
            </linearGradient>
          </defs>
          <g clipPath="url(#agGlass)">
            <path d="M196 1080L232 742Q240 704 282 700L356 700Q392 704 396 742L404 1080Z" fill="url(#agSeat)" />
            <path d="M218 1080L250 760Q256 734 284 732" stroke="#3A3F48" strokeWidth={6} fill="none" opacity={0.7} />
            <rect x={274} y={652} width={9} height={60} rx={4} fill="#7C828C" />
            <rect x={322} y={652} width={9} height={60} rx={4} fill="#7C828C" />
            <path d="M236 600Q240 548 294 544L330 544Q380 548 382 600L380 640Q376 668 340 670L282 670Q240 668 238 640Z" fill="url(#agSeat)" />
          </g>
        </Svg>
        <Svg>
          <g clipPath="url(#agGlass)">
            <Owner uid="ao" x={390} y={1650} size={1120} frame={t + 30} pose="sitDrive" face="worried" turn={0.92} light="day" acts={[{at: isev - 3, pose: 'facepalm', face: 'sad'}]} />
          </g>
        </Svg>
        <Svg>
          <g clipPath="url(#agGlass)">
            {/* the wheel's rim in front of him, nearly edge on */}
            <ellipse cx={800} cy={930} rx={52} ry={190} fill="none" stroke="#0C0D11" strokeWidth={34} transform="rotate(-10 800 930)" />
            {/* the sky's reflection sliding over the glass */}
            <rect x={-300 + 160 * k} y={380} width={760} height={900} fill="url(#agRefl)" transform="rotate(-16 540 800)" />
          </g>
          {/* the door below the window: its belt line's chrome, the handle, the mirror at the front */}
          <path d="M-40 1060H1120V1920H-40Z" fill="url(#agBody)" />
          <path d="M-40 1060H1120" stroke="#C9CED6" strokeWidth={6} opacity={0.7} />
          <rect x={300} y={1210} width={190} height={34} rx={17} fill="#2A2D33" />
          <path d="M930 860Q1060 840 1100 900L1100 1010Q1020 1030 940 990Z" fill="#30343B" />
        </Svg>
      </div>
    </div>
  );
};

// ---- 12 seat: from straight above, his phone face up on the passenger seat's leather, the call on the speaker („ხელოსანი").
// v2.1 (the AD: rings ran through the subtitle; the seat was a plain rounded slab): no rings at all; the phone smaller and higher
// (its lowest corner well above the subtitle); a real seat: the raised side bolsters, the perforated centre insert between its
// stitched channels, the buckle at its edge, the console beside it with a cupholder ----------------------------------------------
export const SeatShot: React.FC = () => {
  const {t, len} = useShot('seat');
  const k = E.inOut(prog(t, 0, len));
  const pose = {x: 530, y: 800, w: lerp(400, 412, k), yaw: 0, pitch: 0, roll: lerp(-8, -6.5, k)};
  const secs = 3 + Math.floor((t + 4) / 30);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0E0F12', overflow: 'hidden'}}>
      <Svg>
        <defs>
          <linearGradient id="seBol" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#121317" />
            <stop offset="0.45" stopColor="#2E3036" />
            <stop offset="1" stopColor="#1A1B1F" />
          </linearGradient>
          <linearGradient id="seBolR" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#121317" />
            <stop offset="0.45" stopColor="#2B2D33" />
            <stop offset="1" stopColor="#1A1B1F" />
          </linearGradient>
          <linearGradient id="seIns" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#25262B" />
            <stop offset="1" stopColor="#1B1C20" />
          </linearGradient>
          <linearGradient id="seCon" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1B1C20" />
            <stop offset="0.5" stopColor="#2A2C31" />
            <stop offset="1" stopColor="#141519" />
          </linearGradient>
          <radialGradient id="seSun" cx="0.25" cy="0.15" r="0.8">
            <stop offset="0" stopColor="#DCE3F0" stopOpacity={0.16} />
            <stop offset="1" stopColor="#DCE3F0" stopOpacity={0} />
          </radialGradient>
          <pattern id="sePerf" x={0} y={0} width={26} height={26} patternUnits="userSpaceOnUse">
            <circle cx={13} cy={13} r={2.6} fill="#121316" />
          </pattern>
        </defs>
        {/* the console at the right with its cupholder, the door's dark at the left */}
        <path d="M930 -40H1120V1960H950Q900 1960 900 1900V40Q900 -40 930 -40Z" fill="url(#seCon)" />
        <circle cx={1010} cy={420} r={70} fill="#0B0C0E" />
        <circle cx={1010} cy={420} r={56} fill="#16171A" />
        <circle cx={1010} cy={640} r={70} fill="#0B0C0E" />
        <circle cx={1010} cy={640} r={56} fill="#16171A" />
        {/* the cushion: wider at the back (top), the two bolsters raised along its sides */}
        <path d="M110 40Q100 -20 170 -30H800Q870 -20 862 40L840 1640Q834 1720 760 1730H210Q138 1720 132 1640Z" fill="#17181C" />
        <path d="M120 40Q112 -10 170 -18H262Q280 -10 278 40L268 1630Q264 1700 214 1706Q150 1700 144 1630Z" fill="url(#seBol)" />
        <path d="M852 40Q860 -10 802 -18H710Q692 -10 694 40L704 1630Q708 1700 758 1706Q822 1700 828 1630Z" fill="url(#seBolR)" />
        {/* the centre insert: perforated, stitched channels across */}
        <path d="M300 10H672L684 1640Q684 1690 640 1694H332Q288 1690 288 1640Z" fill="url(#seIns)" />
        <path d="M300 10H672L684 1640Q684 1690 640 1694H332Q288 1690 288 1640Z" fill="url(#sePerf)" opacity={0.85} />
        {Array.from({length: 6}, (_, i) => (
          <path key={i} d={`M292 ${250 + i * 250}H682`} stroke="#0F1013" strokeWidth={8} />
        ))}
        {Array.from({length: 6}, (_, i) => (
          <path key={`h${i}`} d={`M292 ${256 + i * 250}H682`} stroke="#34363C" strokeWidth={2} opacity={0.6} />
        ))}
        <path d="M288 0V1650M684 0V1650" stroke="#3A3C43" strokeWidth={3} strokeDasharray="9 11" opacity={0.6} />
        {/* the seatbelt's buckle at the cushion's edge by the console */}
        <rect x={858} y={1180} width={56} height={150} rx={18} fill="#2C2E33" />
        <rect x={870} y={1196} width={32} height={40} rx={6} fill="#B9BDC4" opacity={0.75} />
        <rect width={1080} height={1920} fill="url(#seSun)" />
      </Svg>
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.4} rim={0.85} shadow={0.6} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="08:04" date="პარასკევი, 16 ოქტომბერი" clock={0} quick={0}>
          <ActiveCall name="ხელოსანი" time={`00:${String(secs).padStart(2, '0')}`} speaker={1} clock="08:04" />
        </LockScreen>
      </ScreenLayer>
    </div>
  );
};

// ---- 13 lounge: his garage in the day: the roll-up door up on the bright street (soft), his red tool chest, a tyre stack,
// the pegboard's tools; the mechanic leans back on the chest, the phone at his EAR (v2.1, the AD: it sat over his face), smoke
// curling: „აბა ახლა სხვა ნაწილი ვნახოთ," then a cut closer for „მოიყვანე." and his smirk. His cap always under y 250 -----------
/** a tool's silhouette in frame px (the pegboards drawn flat): a combination wrench, a claw hammer, pliers, a screwdriver,
 *  hung from its top at (x, y), `len` long */
export const Tool2D: React.FC<{kind: 'wrench' | 'hammer' | 'pliers' | 'driver'; x: number; y: number; len: number; fill: string}> = ({kind, x, y, len, fill}) => {
  if (kind === 'wrench') {
    const r = 12 + len * 0.07;
    const w = 6 + len * 0.025;
    const d = `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0ZM${x - r * 0.5} ${y}a${r * 0.5} ${r * 0.5} 0 1 1 ${r} 0a${r * 0.5} ${r * 0.5} 0 1 1 ${-r} 0Z`;
    const shank = `M${x - w} ${y + r * 0.6}L${x + w} ${y + r * 0.6}L${x + w * 0.8} ${y + len - r}L${x - w * 0.8} ${y + len - r}Z`;
    const jaw = `M${x - r * 1.05} ${y + len - r * 0.4}Q${x - r * 1.15} ${y + len + r * 0.9} ${x - r * 0.35} ${y + len + r * 1.0}L${x - r * 0.3} ${y + len + r * 0.25}L${x + r * 0.3} ${y + len + r * 0.25}L${x + r * 0.35} ${y + len + r * 1.0}Q${x + r * 1.15} ${y + len + r * 0.9} ${x + r * 1.05} ${y + len - r * 0.4}Q${x} ${y + len - r * 1.3} ${x - r * 1.05} ${y + len - r * 0.4}Z`;
    return <path d={`${d}${shank}${jaw}`} fill={fill} fillRule="evenodd" />;
  }
  if (kind === 'hammer')
    return <path d={`M${x - 7} ${y + 14}L${x + 7} ${y + 14}L${x + 9} ${y + len}L${x - 9} ${y + len}ZM${x - 40} ${y - 14}L${x + 22} ${y - 14}L${x + 30} ${y - 8}L${x + 54} ${y - 22}L${x + 50} ${y + 4}L${x + 26} ${y + 14}L${x - 40} ${y + 14}L${x - 44} ${y}Z`} fill={fill} />;
  if (kind === 'pliers')
    return <path d={`M${x - 5} ${y - 30}L${x + 2} ${y - 30}L${x + 6} ${y}L${x - 16} ${y + len}L${x - 26} ${y + len - 4}L${x - 8} ${y}ZM${x + 5} ${y - 30}L${x - 2} ${y - 30}L${x - 6} ${y}L${x + 16} ${y + len}L${x + 26} ${y + len - 4}L${x + 8} ${y}ZM${x - 9} ${y}a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z`} fill={fill} />;
  return <path d={`M${x - 3} ${y}L${x + 3} ${y}L${x + 2} ${y + len * 0.55}L${x - 2} ${y + len * 0.55}ZM${x - 10} ${y - len * 0.45}L${x + 10} ${y - len * 0.45}L${x + 12} ${y - 4}L${x - 12} ${y - 4}Z`} fill={fill} />;
};
const BOARD: {kind: 'wrench' | 'hammer' | 'pliers' | 'driver'; x: number; y: number; len: number}[] = [
  {kind: 'wrench', x: 520, y: 420, len: 120},
  {kind: 'wrench', x: 562, y: 420, len: 140},
  {kind: 'wrench', x: 604, y: 420, len: 160},
  {kind: 'wrench', x: 646, y: 420, len: 180},
  {kind: 'hammer', x: 730, y: 430, len: 170},
  {kind: 'pliers', x: 820, y: 450, len: 120},
  {kind: 'pliers', x: 870, y: 450, len: 110},
  {kind: 'driver', x: 930, y: 480, len: 140},
  {kind: 'driver', x: 962, y: 480, len: 120},
  {kind: 'driver', x: 994, y: 480, len: 130},
];
export const LoungeShot: React.FC = () => {
  const {t, len, L} = useShot('lounge');
  const c7 = L('c7');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.8);
  const close = t >= c7 - 5;
  // the close: chest up, so the line under it sits on his light tee (never on his dark trousers)
  const s = close ? lerp(2.5, 2.58, E.inOut(prog(t, c7 - 5, len - c7 + 5))) : lerp(1, 1.04, k);
  const ox = close ? 545 : 560;
  const oy = close ? 560 : 1300;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#D6D2CC', overflow: 'hidden'}}>
      <div style={cssCam(s, ox, oy, b.x, b.y, b.r)}>
        <Svg>
          <defs>
            <linearGradient id="loWall" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#CFC9C1" />
              <stop offset="1" stopColor="#B9B2A9" />
            </linearGradient>
            <linearGradient id="loFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#A9A39B" />
              <stop offset="1" stopColor="#8C867E" />
            </linearGradient>
            <linearGradient id="loChest" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#9C3B2E" />
              <stop offset="0.6" stopColor="#7E2C22" />
              <stop offset="1" stopColor="#5C1F18" />
            </linearGradient>
            <linearGradient id="loStreet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F7F8FA" />
              <stop offset="1" stopColor="#ECEDEF" />
            </linearGradient>
            <radialGradient id="loSun" cx="0.1" cy="0.55" r="0.75">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#loWall)" />
        </Svg>
        {/* the open roll-up door: the bright street beyond, out of focus: a house across with its windows and balcony, a plane
            tree's trunk and crown, the kerb and a parked car's roof */}
        <Svg style={{filter: 'blur(7px)'}}>
          <rect x={-40} y={300} width={430} height={1100} fill="url(#loStreet)" />
          <rect x={-40} y={420} width={430} height={720} fill="#E2E1DD" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={-10 + c * 100} y={470 + r * 200} width={58} height={120} rx={4} fill="#C9CBCE" />),
          )}
          <rect x={-40} y={600} width={430} height={14} fill="#CFCFCF" />
          <rect x={250} y={640} width={34} height={560} fill="#9C958B" />
          {[
            [200, 560, 120],
            [300, 520, 130],
            [250, 460, 110],
            [150, 480, 90],
            [340, 610, 90],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#C3C8BD' : '#B7BDB0'} />
          ))}
          <rect x={-40} y={1180} width={430} height={30} fill="#D6D6D6" />
          <path d="M20 1200Q60 1150 160 1146Q260 1146 300 1200Z" fill="#9EA2A8" />
        </Svg>
        <Svg>
          {/* the door's rolled-up drum and its rails */}
          <rect x={-40} y={280} width={430} height={40} fill="#7A746D" />
          {Array.from({length: 5}, (_, i) => (
            <rect key={i} x={-40} y={210 + i * 16} width={430} height={8} fill="#8B857D" />
          ))}
          <rect x={386} y={280} width={26} height={1140} fill="#6E6861" />
          {/* the pegboard and its tools */}
          <rect x={470} y={360} width={560} height={420} rx={6} fill="#A7A097" />
          {Array.from({length: 7 * 13}, (_, i) => (
            <circle key={i} cx={492 + (i % 13) * 42} cy={382 + Math.floor(i / 13) * 60} r={3.5} fill="#8E877E" />
          ))}
          {BOARD.map((b2, i) => (
            <Tool2D key={i} {...b2} fill="#3A3633" />
          ))}
          {/* the floor with its oil stains, the daylight spilling in */}
          <path d="M-40 1400L1120 1380L1120 1920L-40 1920Z" fill="url(#loFloor)" />
          <ellipse cx={720} cy={1560} rx={160} ry={34} fill="#5E5852" opacity={0.35} />
          <ellipse cx={330} cy={1700} rx={110} ry={24} fill="#5E5852" opacity={0.3} />
          <rect width={1080} height={1920} fill="url(#loSun)" />
          {/* the tyre stack at the back right: treads, sidewalls */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={880} y={1200 - i * 92} width={220} height={88} rx={34} fill="#2A2725" />
              {Array.from({length: 9}, (_, j) => (
                <rect key={j} x={896 + j * 22} y={1206 - i * 92} width={10} height={76} rx={4} fill="#1C1A19" />
              ))}
              <rect x={900} y={1214 - i * 92} width={180} height={10} rx={5} fill="#3E3A37" />
            </g>
          ))}
          {/* the tool chest he leans on */}
          <rect x={560} y={930} width={300} height={470} rx={14} fill="url(#loChest)" />
          {Array.from({length: 6}, (_, i) => (
            <g key={i}>
              <rect x={572} y={950 + i * 74} width={276} height={62} rx={6} fill="#8E3428" />
              <rect x={660} y={972 + i * 74} width={100} height={12} rx={6} fill="#C9C2B8" opacity={0.85} />
            </g>
          ))}
          <rect x={548} y={910} width={324} height={30} rx={8} fill="#5A1D16" />
          {/* a mug and a rag on its top */}
          <rect x={790} y={860} width={44} height={54} rx={8} fill="#EDEAE4" />
          <path d="M834 874Q852 876 852 890Q852 904 834 904" stroke="#EDEAE4" strokeWidth={7} fill="none" />
          <path d="M600 910Q630 880 680 900Q700 912 690 912Z" fill="#6C665F" />
        </Svg>
        <Svg>
          <Mechanic
            uid="lm"
            x={520}
            y={1400}
            size={900}
            frame={t}
            pose="phoneEar"
            hold="phone"
            face="smirk"
            turn={0.8}
            bend={-9}
            light="day"
            cig={0.45}
            smoke={0.9}
            acts={[{at: c7 - 4, face: 'smile'}]}
          />
        </Svg>
      </div>
    </div>
  );
};

/** a still of the call's screen for the cover sheet etc. */
export const CallStill: React.FC = () => <Img src={staticFile('qrpromo/lock-night.jpg')} />;
void float;
void atFoot;
void AMBER;
