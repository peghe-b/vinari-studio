// The OBD promo's street shots (the used-car story, 2026-10-30): a quiet Tbilisi street in the day (kit/street.tsx), the
// graphite crossover parked at the kerb (kit/car3d.tsx, a modern 2020s shape, never a brand), the seller and the buyer as the
// studio's silhouette people (no cartoon faces). Every beat its own framing: the hook's slap at the front corner, the bleeped
// jab from low by the open door, the two-shot across the bonnet, the seller's eager „აკუმულატორი", the buyer walking off,
// the seller whistling at the sky, the buyer leaving toward us while the seller greets the next one, and the callback on a long
// lens. The people's feet stay above the subtitle band (the light pavement under the line).
import React from 'react';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {Buyer, Mechanic, NextBuyer, Seller} from './kit/people';
import {Garage} from './kit/garage';
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

/** the lot's bunting (v2, the reviewers: the story needed more places): strings of small pennants over the lot, swaying a little */
export const Bunting: React.FC<{t: number; rows: {a: [number, number]; b: [number, number]; sag: number; n: number; s?: number}[]; uid: string}> = ({t, rows, uid}) => {
  const COL = ['#FFFFFF', '#3A3C41', '#C9C9C9', '#FFFFFF', '#8E9096'];
  return (
    <g>
      {rows.map((r, ri) => {
        const s = r.s ?? 1;
        const at = (u: number): [number, number] => {
          const x = lerp(r.a[0], r.b[0], u);
          const y = lerp(r.a[1], r.b[1], u) + r.sag * 4 * u * (1 - u);
          return [x, y];
        };
        const d = Array.from({length: 33}, (_, i) => at(i / 32)).map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('');
        return (
          <g key={ri}>
            <path d={d} stroke="#4A4C50" strokeWidth={2.4 * s} fill="none" />
            {Array.from({length: r.n}, (_, i) => {
              const u = (i + 0.5) / r.n;
              const [x, y] = at(u);
              const sw = 5 * Math.sin(t / 9 + i * 1.7 + ri);
              return (
                <path
                  key={i}
                  d={`M${-20 * s} 0L${20 * s} 0L0 ${46 * s}Z`}
                  transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${sw.toFixed(2)})`}
                  fill={COL[(i + ri * 2) % COL.length]}
                  stroke="#9A9CA0"
                  strokeWidth={0.8}
                  style={{filter: `drop-shadow(0 ${4 * s}px ${5 * s}px rgba(0,0,0,0.12))`}}
                  data-uid={uid}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

/** the hook's headline: the seller's own words, big condensed Mtavruli in ink in the top third, whole on frame 0, landing on the
 *  slap with a small kick (the headline is the line: no subtitle under it) */
const HookHead: React.FC<{t: number; text: string}> = ({t, text}) => {
  const kick = punch(t, 2, 0.06, 0.5);
  const fs = Math.min(150, Math.floor((150 * 960) / textWidth(mtav(text), `700 150px ${F.sans}`)));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 236, display: 'flex', justifyContent: 'center', transform: `scale(${kick})`, transformOrigin: '540px 330px'}}>
      <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: fs, lineHeight: 1, color: INK, whiteSpace: 'nowrap'}}>{mtav(text)}</div>
    </div>
  );
};

// ---- hook v2 (the reviewers, 31 Oct: the first frame was a calm, pale establishing shot): the seller big and close in the
// foreground, mid-pitch with his hand out to the crossover, which stands whole behind him on the lot under the bunting, in a
// warm late-afternoon grade; his words „ქალს ჰყავდა." are the big headline in the top third from frame 0; a quick push-in and a
// kick on the slap. Cut at 0.9 s to the lot wide. -------------------------------------------------------------------------------
const HK0: CarCam = {pos: [6.0, 1.5, 13.6], target: [0.0, 1.15, 0.4], fov: 34};
const HK1: CarCam = {pos: [5.85, 1.5, 13.25], target: [0.0, 1.15, 0.4], fov: 34};
const WARM = 'sepia(0.16) saturate(1.25) contrast(1.06) brightness(0.98)';
export const HookShot: React.FC = () => {
  const {t, len} = useShot('hook');
  const k = E.out(prog(t, 0, len));
  const cam = mixCam(HK0, HK1, k);
  const s = punch(t, 2, 0.04, 0.5) * lerp(1, 1.03, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E1DA', overflow: 'hidden'}}>
      <div style={{...cssCam(s, 600, 900, jolt(t, 2, 5, 7), 0, 0), filter: WARM}}>
        <div style={{position: 'absolute', inset: 0, filter: 'blur(2.5px)'}}>
          <Street cam={cam} uid="hk" look="day" nearTree={false} />
          <Car3 cam={cam} night={0} shadow={1} lamp={0.2} />
        </div>
        <Svg>
          <Bunting t={t} uid="hkb" rows={[{a: [-40, 560], b: [1120, 640], sag: 70, n: 13}, {a: [-40, 700], b: [1120, 760], sag: 50, n: 11, s: 0.8}]} />
          <Seller uid="hks" x={840} y={2090} size={1480} frame={t} pose="offer" face="grin" turn={-0.55} light="day" />
        </Svg>
      </div>
      <HookHead t={t} text="ქალს ჰყავდა." />
    </div>
  );
};

// ---- hook2: the lot wide: the crossover whole at 3/4 under the bunting, the seller at its front corner brings his hand down on
// the bonnet (the slap) and goes on: „მარტო სამსახურში დადიოდა."; a slow push; his feet above the subtitle -----------------------
const H20: CarCam = {pos: [7.2, 1.4, 11.2], target: [0.4, 1.05, 0.6], fov: 38};
const H21: CarCam = {pos: [6.95, 1.4, 10.85], target: [0.4, 1.05, 0.6], fov: 38};
export const Hook2Shot: React.FC = () => {
  const {t, len, L} = useShot('hook2');
  const s2 = L('slap2');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(H20, H21, k);
  const sel = P(cam, 2.2, 3.3);
  const s = punch(t, s2, 0.03, 0.4);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E1DA', overflow: 'hidden'}}>
      <div style={{...cssCam(s, sel.x, sel.y - sel.size * 0.5, jolt(t, s2, 4, 7), 0, 0), filter: WARM}}>
        <DayWorld cam={cam} uid="h2" />
        <Svg>
          <Bunting t={t} uid="h2b" rows={[{a: [-40, 470], b: [1120, 560], sag: 60, n: 14, s: 0.9}, {a: [-40, 620], b: [1120, 600], sag: 40, n: 12, s: 0.75}]} />
          <Seller uid="h2s" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="confident" face="smile" turn={-0.55} light="day" acts={[{at: s2 + 14, pose: 'offer', face: 'grin'}]} />
        </Svg>
      </div>
    </div>
  );
};

// ---- bleep v2 (the reviewers: his trousers ran under the line and ate the „#@%"): low and level, the seller big at the right,
// whole, his feet on the pavement ABOVE the subtitle: he leans in, arms wide in mock offence, then the jab on the bleep; a jolt
// and a punch-in that never carries his feet into the line -------------------------------------------------------------------------
const BL: CarCam = {pos: [7.5, 0.66, 12.5], target: [-1.5, 1.1, 0.0], fov: 42};
export const BleepShot: React.FC = () => {
  const {t, len, L} = useShot('bleep');
  const bl = L('bleep');
  const k = E.inOut(prog(t, 0, len));
  const s = punch(t, bl, 0.05, 0.7) * lerp(1, 1.025, k);
  const b = breath(t, 1.2);
  const sel = {x: 790, y: 1290, size: 960};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x, sel.y - 40, b.x + jolt(t, bl, 6, 10, 1.2), b.y * 0.5, b.r)}>
        <DayWorld cam={BL} uid="bl" blur={7} car={false} />
        <Svg>
          <ellipse cx={sel.x} cy={sel.y} rx={210} ry={18} fill="#000" opacity={0.1} />
          <Seller uid="bls" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="reject" face="angry" turn={-0.35} light="day" bend={6} acts={[{at: bl - 3, pose: 'pointYou', face: 'angry'}, {at: bl + 18, pose: 'reject', face: 'smirk'}]} />
        </Svg>
      </div>
    </div>
  );
};

// ---- honest v2 (the reviewers: the front-on crossover looked broken): the two-shot at 3/4 across the crossover, whole between
// them: the buyer (left, near, his phone low) and the seller (right, by the front wheel); a slow arc; a question tag pops over the
// buyer on „გამყიდველს ჰკითხე"; both men's feet above the subtitle ------------------------------------------------------------------
const HO0: CarCam = {pos: [7.4, 1.75, 13.2], target: [0.3, 1.0, 0.6], fov: 36};
const HO1: CarCam = {pos: [7.75, 1.75, 12.75], target: [0.3, 1.0, 0.6], fov: 36};
export const HonestShot: React.FC = () => {
  const {t, len, L} = useShot('honest');
  const q = L('q');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(HO0, HO1, k);
  const buy = {x: 200, y: 1330, size: 560};
  const sel = {x: 880, y: 1236, size: 452};
  const qk = sp(t, q, 170, 14);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="ho" />
      <Svg>
        <ellipse cx={buy.x} cy={buy.y} rx={130} ry={12} fill="#000" opacity={0.08} />
        <Seller uid="hos" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="crossArms" face="smile" turn={-0.5} light="day" acts={[{at: q + 6, pose: 'confident', face: 'worried'}]} />
        <Buyer uid="hob" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="phoneLook" hold="phone" face="neutral" turn={0.45} light="day" acts={[{at: q - 6, pose: 'hold', hold: 'phone', face: 'smile'}]} />
        {qk > 0.01 ? (
          <g transform={`translate(${buy.x + buy.size * 0.12} ${buy.y - buy.size * 1.16}) scale(${lerp(0.5, 1, E.outBack(clamp(qk)))})`} opacity={clamp(qk * 2)}>
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

// ---- battery v2 (the reviewers: the raised fist read as a rude gesture, and the close-up repeated the bleep's picture): over the
// crossover's bonnet, the car soft and whole behind, the seller at the LEFT, whole, his open hand pointing up at a battery
// pictogram that pops at the right on „აკუმულატორი", a snap zoom for the comic timing; his feet above the subtitle -------------------
const BA: CarCam = {pos: [-6.4, 1.6, 9.6], target: [0.6, 1.0, 0.4], fov: 40};
export const BatteryShot: React.FC = () => {
  const {t, len, L} = useShot('battery');
  const bat = L('battery');
  const cam = {...BA, pos: [lerp(-6.4, -6.1, prog(t, 0, len)), 1.6, 9.6] as [number, number, number]};
  const sel = {x: 330, y: 1300, size: 900};
  const s = punch(t, bat - 10, 0.08, 0.85);
  const bk = sp(t, bat, 200, 11);
  const wob = Math.sin((t - bat) / 2.4) * 8 * Math.exp(-Math.max(0, t - bat) / 14);
  const hx = 760;
  const hy = 520;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={cssCam(s, sel.x + 120, sel.y - 380, 0, 0, 0)}>
        <DayWorld cam={cam} uid="ba" blur={6} />
        <Svg>
          <ellipse cx={sel.x} cy={sel.y} rx={200} ry={17} fill="#000" opacity={0.09} />
          <Seller uid="bas" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="confident" face="worried" turn={0.35} light="day" acts={[{at: bat - 12, pose: 'point', face: 'grin'}]} />
          {bk > 0.01 ? (
            <g transform={`translate(${hx} ${hy}) rotate(${wob}) scale(${lerp(0.4, 1, E.outBack(clamp(bk)))})`} opacity={clamp(bk * 2)}>
              <circle r={104} fill={WHITE} style={{filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.16))'}} />
              <PartIcon name="battery" x={0} y={0} size={124} color={INK} width={2.2} />
            </g>
          ) : null}
        </Svg>
      </div>
    </div>
  );
};

// ---- walk: wide and calm: the buyer walks off along the pavement, unhurried; the seller by the whole crossover folds his arms; a
// slow crane up opens the street's houses -----------------------------------------------------------------------------------------------
const WA0: CarCam = {pos: [8.6, 2.4, 12.29], target: [-0.41, 1.0, 0.29], fov: 36};
const WA1: CarCam = {pos: [8.75, 2.75, 12.55], target: [-0.41, 1.12, 0.29], fov: 36};
export const WalkShot: React.FC = () => {
  const {t, len} = useShot('walk');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(WA0, WA1, k);
  const bz = lerp(3.4, 2.3, prog(t, 0, len));
  const buy = P(cam, 3.0, bz, 1.82);
  const sel = P(cam, 1.8, 2.9);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <DayWorld cam={cam} uid="wa" />
      <Svg>
        <Seller uid="was" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="crossArms" face="meh" turn={0.4} light="day" />
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

// ---- leave v2 (the reviewers: a second man stood right behind the walker, and the walker crossed the line): „ფული ჯიბეში
// გრჩება." the buyer alone on the pavement down the street (no car: he did not buy it), the notes still in his hand; on the tick
// he puts them back in his pocket and smiles; a slow push; whole, his feet above the subtitle ------------------------------------------
const LE: CarCam = {pos: [10.2, 1.5, 15.2], target: [0.6, 1.2, 0.8], fov: 30};
export const LeaveShot: React.FC = () => {
  const {t, len, L} = useShot('leave');
  const tick = L('tick');
  const k = E.inOut(prog(t, 0, len));
  const buy = {x: 720, y: 1300, size: 800};
  const s = lerp(1, 1.04, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E1DA', overflow: 'hidden'}}>
      <div style={{...cssCam(s, 600, 900, 0, 0, 0), filter: WARM}}>
        <div style={{position: 'absolute', inset: 0, filter: 'blur(5px)'}}>
          <DayWorld cam={LE} uid="le" />
          <Svg>
            <Bunting t={t} uid="leb2" rows={[{a: [-40, 600], b: [1120, 560], sag: 40, n: 16, s: 0.6}]} />
          </Svg>
        </div>
        <Svg>
          <ellipse cx={buy.x} cy={buy.y} rx={180} ry={15} fill="#000" opacity={0.09} />
          <Buyer uid="leb" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="hold" hold="money" face="smile" turn={-0.3} light="day" acts={[{at: tick - 8, pose: 'confident', hold: null, face: 'smile'}]} />
          <MarkTick x={buy.x - 250} y={buy.y - buy.size * 0.98} s={110} k={prog(t, tick, 10)} />
        </Svg>
      </div>
    </div>
  );
};

// ---- bay (v2, a new place: the reviewers asked for a mechanic's bay): „და თუ მაინც გინდა, ხელოსანთან უკვე იცი, რა აჩვენო."
// the workshop in the day, its roll-up door open; the crossover whole at 3/4 with its bonnet up; the mechanic at its nose leans in
// to read the buyer's phone; on „ხელოსანთან" the two codes pop over the phone as a small paper chip (never a phone screen) ---------------
const BY0: CarCam = {pos: [7.4, 1.9, 11.6], target: [-0.3, 1.0, 0.6], fov: 37};
const BY1: CarCam = {pos: [7.1, 1.85, 11.2], target: [-0.3, 1.0, 0.6], fov: 37};
export const BayShot: React.FC = () => {
  const {t, len, L} = useShot('bay');
  const show = L('show');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(BY0, BY1, k);
  const mech = P(cam, 0.6, 3.3, 1.78);
  const buy = P(cam, 2.0, 3.2, 1.82);
  const ck = sp(t, show, 160, 15);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E3E3E3', overflow: 'hidden'}}>
      <Garage cam={cam} uid="by" look="day" lift={0} />
      <Car3 cam={cam} night={0} shadow={1} lift={0} hood={1} bayLamp={1} lamp={0.2} />
      <Garage cam={cam} uid="byf" look="day" layer="front" lift={0} />
      <Svg>
        <Mechanic uid="bym" x={mech.x} y={mech.y} size={mech.size} frame={t} pose="stand" face="neutral" turn={0.55} light="day" bend={4} cig={0.3} acts={[{at: show - 4, pose: 'stand', face: 'worried'}]} />
        <Buyer uid="byb" x={buy.x} y={buy.y} size={buy.size} frame={t} pose="hold" hold="phone" face="neutral" turn={-0.5} light="day" acts={[{at: show - 10, pose: 'offer', hold: 'phone', face: 'smile'}]} />
      </Svg>
      {ck > 0.01 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 520, display: 'flex', justifyContent: 'center', opacity: clamp(ck * 1.6), transform: `translateY(${(1 - clamp(ck)) * 16}px)`}}>
          <div style={{padding: '18px 40px 20px', borderRadius: 999, background: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 46, color: INK, whiteSpace: 'nowrap', boxShadow: '0 16px 40px rgba(0,0,0,0.14)'}}>P0420 · P0171</div>
        </div>
      ) : null}
    </div>
  );
};

// ---- callback: a long lens on the pair at the crossover on the lot (its bunting): the seller's hand comes down on the bonnet
// again („ქალს ჰყავდა..."), the next buyer folds his arms; the frame holds for the laugh ------------------------------------------------
const CB: CarCam = {pos: [10.28, 1.5, -12.26], target: [-0.11, 1.0, -0.1], fov: 32};
export const CallbackShot: React.FC = () => {
  const {t, len} = useShot('callback');
  const cam = {...CB, fov: lerp(32, 30.5, E.inOut(prog(t, 0, len)))};
  const sel = P(cam, 1.75, -2.6);
  const nb = P(cam, 2.7, -1.3, 1.8);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E1DA', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: WARM}}>
        <DayWorld cam={cam} uid="cb" />
        <Svg>
          <Bunting t={t} uid="cbb" rows={[{a: [-40, 520], b: [1120, 450], sag: 60, n: 14, s: 0.85}, {a: [-40, 650], b: [1120, 640], sag: 36, n: 12, s: 0.7}]} />
          <NextBuyer uid="cbn" x={nb.x} y={nb.y} size={nb.size} frame={t} pose="stand" face="neutral" turn={-0.55} light="day" acts={[{at: 14, pose: 'crossArms', face: 'meh'}]} />
          <Seller uid="cbs" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="offer" face="grin" turn={0.15} light="day" />
        </Svg>
      </div>
    </div>
  );
};

void projectCar;
void mtav;
export const SHOTS: Record<string, React.FC> = {
  hook: HookShot,
  hook2: Hook2Shot,
  bleep: BleepShot,
  honest: HonestShot,
  battery: BatteryShot,
  walk: WalkShot,
  work: WorkShot,
  leave: LeaveShot,
  bay: BayShot,
  callback: CallbackShot,
};
