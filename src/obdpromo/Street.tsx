// The OBD promo's street shots (the used-car story, 2026-10-30): a quiet Tbilisi street in the day (kit/street.tsx), the
// graphite crossover parked at the kerb (kit/car3d.tsx, a modern 2020s shape, never a brand), the seller and the buyer as the
// studio's silhouette people (no cartoon faces). Every beat its own framing: the hook's slap at the front corner, the bleeped
// jab from low by the open door, the two-shot across the bonnet, the seller's eager „აკუმულატორი", the buyer walking off,
// the seller whistling at the sky, the buyer leaving toward us while the seller greets the next one, and the callback on a long
// lens. The people's feet stay above the subtitle band (the light pavement under the line).
import React from 'react';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {Buyer, NextBuyer, Seller} from './kit/people';
import {PartIcon} from './kit/parts';
import {MarkTick} from './kit/marks';
import {breath, cssCam, INK, jolt, mixCam, personAt, punch, Svg, useShot, WHITE} from './kit/stage';

/** the day street with the parked crossover, seen by `cam`; `blur` softens the world (a backdrop) */
const DayWorld: React.FC<{cam: CarCam; uid: string; blur?: number; car?: boolean; children?: React.ReactNode}> = ({cam, uid, blur = 0, car = true, children}) => (
  <div style={{position: 'absolute', inset: 0, filter: blur ? `blur(${blur}px)` : undefined}}>
    <Street cam={cam} uid={uid} look="day" nearTree={false} />
    {car ? <Car3 cam={cam} night={0} shadow={1} lamp={0.2} /> : null}
    {children}
  </div>
);

const P = (cam: CarCam, x: number, z: number, h = 1.8) => personAt(cam, x, z, h) ?? {x: 540, y: 1300, size: 800};

// ---- hook: at the crossover's front corner, the seller mid-slap on the bonnet, all smiles: „ქალს ჰყავდა." (the subtitle is up
// whole on frame 0); a quick push-in, a punch on the slap, then the slow breath of a hand-held camera ----------------------------
const HK0: CarCam = {pos: [5.2, 1.45, 12.85], target: [-0.32, 1.0, 0.13], fov: 34};
const HK1: CarCam = {pos: [4.83, 1.45, 11.96], target: [-0.32, 1.0, 0.13], fov: 34};
export const HookShot: React.FC = () => {
  const {t, len, L} = useShot('hook');
  const s2 = L('slap2');
  const k = E.out(prog(t, 0, 16)) * 0.6 + 0.4 * E.inOut(prog(t, 16, len - 16));
  const cam = mixCam(HK0, HK1, k);
  const s = punch(t, 2, 0.05, 0.5) * punch(t, s2, 0.03, 0.4);
  const b = breath(t, 1);
  const sel = P(cam, 2.3, 4.4);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x, sel.y - sel.size * 0.5, b.x + jolt(t, 2, 5, 7), b.y, b.r)}>
        <DayWorld cam={cam} uid="hk" />
        <Svg>
          <Seller uid="hks" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="offer" face="grin" turn={-0.55} light="day" acts={[{at: s2 - 2, pose: 'confident', face: 'smile'}]} />
        </Svg>
      </div>
    </div>
  );
};

// ---- bleep: low, looking up at the seller big at the right (the street soft behind him, the sky over the houses): he leans in,
// arms wide in mock offence, then the jab on the bleep („რას ეძებ მანდ, შე #@%?"); a jolt and a punch-in ---------------------------
const BL: CarCam = {pos: [7.5, 0.6, 12.5], target: [-1.5, 2.6, 0.0], fov: 42};
export const BleepShot: React.FC = () => {
  const {t, len, L} = useShot('bleep');
  const bl = L('bleep');
  const k = E.inOut(prog(t, 0, len));
  const s = punch(t, bl, 0.08, 0.7) * lerp(1, 1.03, k);
  const b = breath(t, 1.2);
  const sel = {x: 770, y: 1640, size: 1220};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x, sel.y - sel.size * 0.75, b.x + jolt(t, bl, 6, 10, 1.2), b.y, b.r)}>
        <DayWorld cam={BL} uid="bl" blur={7} car={false} />
        <Svg>
          <Seller uid="bls" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="shrug" face="angry" turn={-0.35} light="day" bend={6} acts={[{at: bl - 3, pose: 'pointYou', face: 'angry'}, {at: bl + 18, pose: 'reject', face: 'smirk'}]} />
        </Svg>
      </div>
    </div>
  );
};

// ---- honest: the two-shot across the bonnet, the crossover front-on and whole between them: the buyer (left, his phone low)
// and the seller (right); a slow arc; a question mark tag pops over the buyer on „გამყიდველს ჰკითხე" ------------------------------
const HO0: CarCam = {pos: [-0.3, 1.6, 15.0], target: [0.0, 1.0, 0.0], fov: 34};
const HO1: CarCam = {pos: [0.55, 1.6, 15.0], target: [0.0, 1.0, 0.0], fov: 34};
export const HonestShot: React.FC = () => {
  const {t, len, L} = useShot('honest');
  const q = L('q');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(HO0, HO1, k);
  const buy = P(cam, -1.45, 3.4, 1.82);
  const sel = P(cam, 1.6, 3.2);
  const qk = sp(t, q, 170, 14);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="ho" />
      <Svg>
        <Buyer uid="hob" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="phoneLook" hold="phone" face="neutral" turn={0.45} light="day" acts={[{at: q - 6, pose: 'offer', hold: 'phone', face: 'smile'}]} />
        <Seller uid="hos" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="crossArms" face="smile" turn={-0.5} light="day" acts={[{at: q + 6, pose: 'shrug', face: 'worried'}]} />
        {qk > 0.01 ? (
          <g transform={`translate(${buy.x + buy.size * 0.06} ${buy.y - buy.size * 1.14}) scale(${lerp(0.5, 1, E.outBack(clamp(qk)))})`} opacity={clamp(qk * 2)}>
            <path d="M-56 -50H56Q76 -50 76 -30V22Q76 42 56 42H6L-14 64L-12 42H-56Q-76 42 -76 22V-30Q-76 -50 -56 -50Z" fill={WHITE} style={{filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.14))'}} />
            <text x={0} y={22} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={76} fill={INK}>
              ?
            </text>
          </g>
        ) : null}
      </Svg>
    </div>
  );
};

// ---- battery: the seller close, nodding too eagerly, one hand up as if swearing it: „აკუმულატორი? ჰო!" a battery pictogram
// pops by his head with a punch and wobbles; a snap zoom for the comic timing -----------------------------------------------------
const BA: CarCam = {pos: [6.5, 1.5, 10.0], target: [-2.0, 1.7, 0.0], fov: 40};
export const BatteryShot: React.FC = () => {
  const {t, len, L} = useShot('battery');
  const bat = L('battery');
  const cam = {...BA, pos: [lerp(6.5, 6.2, prog(t, 0, len)), 1.5, 10.0] as [number, number, number]};
  const sel = {x: 760, y: 1360, size: 960};
  const s = punch(t, bat - 10, 0.12, 0.85);
  const bk = sp(t, bat, 200, 11);
  const wob = Math.sin((t - bat) / 2.4) * 8 * Math.exp(-Math.max(0, t - bat) / 14);
  const hx = sel.x - sel.size * 0.42;
  const hy = sel.y - sel.size * 0.92;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x, sel.y - sel.size * 0.75, 0, 0, 0)}>
        <DayWorld cam={cam} uid="ba" blur={8} car={false} />
        <Svg>
          <Seller uid="bas" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="shrug" face="worried" turn={-0.3} light="day" acts={[{at: bat - 12, pose: 'thumbsUp', face: 'grin'}]} />
          {bk > 0.01 ? (
            <g transform={`translate(${hx} ${hy}) rotate(${wob}) scale(${lerp(0.4, 1, E.outBack(clamp(bk)))})`} opacity={clamp(bk * 2)}>
              <circle r={92} fill={WHITE} style={{filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.16))'}} />
              <PartIcon name="battery" x={0} y={0} size={110} color={INK} width={2.2} />
            </g>
          ) : null}
        </Svg>
      </div>
    </div>
  );
};

// ---- walk: wide and calm: the buyer walks off along the pavement, unhurried; the seller by the whole crossover shrugs; a slow
// crane up opens the street's houses -----------------------------------------------------------------------------------------------
const WA0: CarCam = {pos: [8.6, 2.4, 12.29], target: [-0.41, 1.0, 0.29], fov: 36};
const WA1: CarCam = {pos: [8.75, 2.75, 12.55], target: [-0.41, 1.12, 0.29], fov: 36};
export const WalkShot: React.FC = () => {
  const {t, len} = useShot('walk');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(WA0, WA1, k);
  const bz = lerp(3.4, 1.9, prog(t, 0, len));
  const buy = P(cam, 3.0, bz, 1.82);
  const sel = P(cam, 1.8, 2.9);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="wa" />
      <Svg>
        <Seller uid="was" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="shrug" face="meh" turn={0.4} light="day" />
        <Buyer uid="wab" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="walk" face="neutral" turn={-0.75} light="day" />
      </Svg>
    </div>
  );
};

// ---- work: „სამსახურში, ალბათ." the seller alone by the crossover, looking off and whistling (a few small notes rise), the car
// whole beside him; a 4-frame punch-in -------------------------------------------------------------------------------------------------
const WO: CarCam = {pos: [7.5, 1.45, -12.99], target: [-0.26, 1.0, -0.15], fov: 34};
export const WorkShot: React.FC = () => {
  const {t, L} = useShot('work');
  const w0 = L('whistle');
  const sel = P(WO, 2.3, -3.8);
  const s = punch(t, w0 + 8, 0.06, 0.9);
  const notes = [0, 1, 2].map((i) => {
    const q = clamp((t - w0 - i * 9) / 26);
    return {q, x: sel.x - sel.size * 0.12 + i * 26 + 40 * q, y: sel.y - sel.size * 0.98 - 120 * q};
  });
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x, sel.y - sel.size * 0.8, 0, 0, 0)}>
        <DayWorld cam={WO} uid="wo" />
        <Svg>
          <Seller uid="wos" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="confident" face="cool" turn={-0.15} light="day" />
          {notes.map((n, i) =>
            n.q > 0 && n.q < 1 ? (
              <text key={i} x={n.x} y={n.y} fontFamily={F.sans} fontSize={54} fill={INK} opacity={Math.sin(Math.PI * n.q)} textAnchor="middle">
                {i % 2 ? '♫' : '♪'}
              </text>
            ) : null,
          )}
        </Svg>
      </div>
    </div>
  );
};

// ---- leave: the buyer walks toward us out of the street, putting his phone away; a tick draws over his shoulder; far behind,
// the seller is already greeting the next buyer by the crossover; a slow dolly back -------------------------------------------------
const LE0: CarCam = {pos: [2.37, 1.6, 16.83], target: [0.59, 1.0, -0.08], fov: 30};
const LE1: CarCam = {pos: [2.45, 1.6, 17.6], target: [0.59, 1.0, -0.08], fov: 30};
export const LeaveShot: React.FC = () => {
  const {t, len, L} = useShot('leave');
  const tick = L('tick');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(LE0, LE1, k);
  const bz = lerp(8.4, 9.6, prog(t, 0, len));
  const buy = P(cam, 2.35, bz, 1.82);
  const sel = P(cam, 1.7, 2.7);
  const nb = P(cam, 2.6, 2.0, 1.8);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="le" />
      <Svg>
        <Seller uid="les" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="wave" face="grin" turn={0.5} light="day" />
        <NextBuyer uid="len" x={nb.x} y={nb.y} size={nb.size} frame={t} pose="stand" face="neutral" turn={-0.6} light="day" />
        <Buyer uid="leb" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="walk" hold="phone" face="smile" turn={0.05} light="day" acts={[{at: tick - 10, pose: 'walk', hold: null, face: 'smile'}]} />
        <MarkTick x={buy.x + buy.size * 0.34} y={buy.y - buy.size * 0.98} s={110} k={prog(t, tick, 10)} />
      </Svg>
    </div>
  );
};

// ---- callback: a long lens on the pair at the crossover: the seller's hand comes down on the bonnet again („ქალს ჰყავდა..."),
// the next buyer folds his arms; the frame holds for the laugh ----------------------------------------------------------------------
const CB: CarCam = {pos: [10.28, 1.5, -12.26], target: [-0.11, 1.0, -0.1], fov: 32};
export const CallbackShot: React.FC = () => {
  const {t, len} = useShot('callback');
  const cam = {...CB, fov: lerp(32, 30.5, E.inOut(prog(t, 0, len)))};
  const sel = P(cam, 1.75, -2.6);
  const nb = P(cam, 2.7, -1.3, 1.8);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="cb" />
      <Svg>
        <NextBuyer uid="cbn" x={nb.x} y={nb.y} size={nb.size} frame={t} pose="stand" face="neutral" turn={-0.55} light="day" acts={[{at: 14, pose: 'crossArms', face: 'meh'}]} />
        <Seller uid="cbs" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="offer" face="grin" turn={0.15} light="day" />
      </Svg>
    </div>
  );
};

void projectCar;
void mtav;
export const SHOTS: Record<string, React.FC> = {
  hook: HookShot,
  bleep: BleepShot,
  honest: HonestShot,
  battery: BatteryShot,
  walk: WalkShot,
  work: WorkShot,
  leave: LeaveShot,
  callback: CallbackShot,
};
