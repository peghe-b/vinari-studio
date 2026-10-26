// src/scenes/film/V134RainyDerby.tsx: v134-rainy-derby's own pictures. A dad and his son after a lost match, in the rain, on
// the wet side streets round the stadium at dusk: the kerb where a stranger's white hatch now stands, the key fob nobody
// answers, a dark row of parked cars, the floodlights clicking off one by one into black (the turn), the phone rising out of
// the dark (the reveal: V134RainyDerbyReveal.tsx), and next time the graphite crossover blinking back through the rain; last, the streets from above,
// the stadium's glow dying while one saved spot after another stays lit, warm.
//   {"type": "Film", "name": "V134RainyDerby", "look": "illustrated", "shot": "kerb" | "wrong" | "fob" | "row" | "lights" |
//    "found" | "grid", "hitAt": 1}
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Hand} from '../illo/figure';
import {Car} from '../illo/car';
import {Drops, Rain} from '../illo/fx';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, accRamp, far, ground, lamp, lit} from '../illo/palette';
import {Glow} from '../kit/glow';
import {Sym} from '../kit/icons';
import {useShot} from '../kit/stage';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'kerb' | 'wrong' | 'fob' | 'row' | 'lights' | 'found' | 'grid';
  hitAt?: number | string;
};

const TIME = 'dusk' as const;
const KERB = 1300; // the pavement's edge: feet and tyres stand here, over the subtitle band
// the people of this film (the same dad and son in every shot, and in the library beats)
const DAD = {is: 'dad', outfit: 'bomber', hair: 'receding', beard: 'short', extras: ['scarf']} as const;
const SON = {is: 'friend', age: 'young', gender: 'm', outfit: 'puffer', hair: 'curly', beard: 'none'} as const;
// the houses across the street: [x, width, top]
const HOUSES = [
  [-40, 250, 760],
  [210, 210, 690],
  [420, 260, 800],
  [680, 190, 720],
  [870, 260, 770],
] as const;
// the floodlight masts over the roofs: [x, top]
const MASTS = [
  [150, 470],
  [400, 430],
  [680, 430],
  [930, 470],
] as const;

/** the street at dusk in the rain: the sky with the stadium's light over the roofs, the houses with a few lit windows, the
 *  wet pavement and the road down to the frame's foot (full bleed). `flood` 0..1 the floodlights, `masts` each mast's light. */
const StreetBack: React.FC<{flood: number; masts?: readonly number[]; t: number}> = ({flood, masts, t}) => {
  const sky = ground(TIME);
  const wall = far(0.15, TIME);
  const win = lamp(TIME);
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={1300} fill={sky} />
          {MASTS.map(([x, ty], i) => {
            const k = masts ? masts[+i] : flood;
            return (
              <g key={i}>
                <rect x={x - 4} y={ty} width={8} height={760 - ty} fill={far(0.5, TIME)} />
                <rect x={x - 44} y={ty - 30} width={88} height={34} rx={6} fill={k > 0.05 ? win : far(0.4, TIME)} opacity={0.4 + 0.6 * k} />
              </g>
            );
          })}
          {HOUSES.map(([x, w, ty], i) => (
            <g key={i}>
              <rect x={x} y={ty} width={w} height={KERB - ty + 10} fill={wall} />
              {[0, 1, 2].map((r) =>
                [0, 1].map((c) => {
                  const on = (i * 3 + r * 2 + c) % 4 === 0;
                  return <rect key={`${r}-${c}`} x={x + 34 + c * (w / 2)} y={ty + 50 + r * 130} width={w / 2 - 68} height={80} rx={4} fill={on ? win : far(0.35, TIME)} opacity={on ? 0.55 : 0.6} />;
                }),
              )}
            </g>
          ))}
        </Svg>
        {MASTS.map(([x, ty], i) => (
          <Glow key={i} x={x} y={ty - 14} r={130} color={C.il0} k={(masts ? masts[+i] : flood) *(0.85 + 0.05 * Math.sin(t / 7 + i))} />
        ))}
        <Glow x={540} y={520} r={360} color={C.il0} k={0.3 * flood} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={KERB - 40} width={1480} height={44} fill={far(0.05, TIME)} />
          <rect x={-200} y={KERB + 4} width={1480} height={FOOT - KERB} fill={far(0, TIME)} />
          {/* the wet road: the lamps and the lit windows mirrored in long soft streaks */}
          {MASTS.map(([x], i) => (
            <rect key={i} x={x - 18} y={KERB + 30} width={36} height={360} rx={18} fill={win} opacity={0.12 * (masts ? masts[+i] : flood) + 0.03} />
          ))}
        </Svg>
      </CameraLayer>
    </>
  );
};

/** the rain over everything, nearest plane */
const RainFront: React.FC<{t: number; n?: number; seed?: number}> = ({t, n = 120, seed = 4}) => (
  <CameraLayer depth={1.3}>
    <Svg>
      <Rain frame={t} seed={seed} n={n} slant={10} speed={1.15} time={TIME} />
    </Svg>
  </CameraLayer>
);

/** HOOK: the dad stops at the kerb, the son beside him, arms up at the spot where he parked: a stranger's white hatch. */
const Kerb: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 36));
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={1} t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}c`} x={735} y={KERB} len={500} view="side" body="hatch" paint={1} dir={-1} frame={t} time={TIME} />
          <Figure uid={`${uid}d`} cast={DAD} x={250} y={KERB} size={560} frame={t} time={TIME} pose="armsUp" face="angry" turn={0.5} acts={[{at: hit, pose: 'handsHead', face: 'worried', turn: 0.6}]} />
          <Figure uid={`${uid}s`} cast={SON} x={385} y={KERB} size={410} frame={t} time={TIME} pose="slumped" face="sad" turn={0.4} />
        </Svg>
      </CameraLayer>
      <RainFront t={t} n={130} />
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </IlloBand>
  );
};

/** the stranger's white hatch at the kerb, from behind, big and wet: not his car */
const Wrong: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 4, at(p.hitAt, 10));
  const kick = useKick();
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={1} t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <ellipse cx={540} cy={1262} rx={360} ry={26} fill={rgba(C.il0, 0.08)} />
          <Car uid={`${uid}c`} x={540} y={1250} len={1350} view="rear" body="hatch" paint={1} frame={t} time={TIME} lights={{tail: 0.15 + 0.1 * kick}} />
        </Svg>
      </CameraLayer>
      <RainFront t={t} n={140} seed={7} />
      <CameraLayer depth={1.3}>
        <Svg>
          <Drops frame={t} seed={9} n={30} color={lit(TIME)} opacity={0.5} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-whoomp" at={hit} volume={0.22} />
      <Haptic kind="light" at={hit} volume={0.3} />
    </IlloBand>
  );
};

/** his hand with the key fob raised into the rain, the row of cars soft behind: he presses, a pulse goes out, nothing answers */
const Fob: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 4, at(p.hitAt, 15));
  const press = prog(t, hit, 5) - prog(t, hit + 6, 6);
  const pulse = prog(t, hit, 26);
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={1} t={t} />
      <CameraLayer depth={0.8}>
        <Svg style={{filter: 'blur(5px)'}}>
          {[180, 540, 900].map((x, i) => (
            <Car key={i} uid={`${uid}r${i}`} x={x} y={1180} len={330} view="rear" body={i === 1 ? 'sedan' : 'suv'} paint={i === 1 ? 5 : 4} frame={t} time={TIME} scenery />
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {pulse > 0 && pulse < 1 ? <circle cx={540} cy={760} r={60 + 520 * pulse} fill="none" stroke={lamp(TIME)} strokeWidth={5} opacity={0.5 * (1 - pulse)} /> : null}
          <g transform={`translate(0 ${(8 * press).toFixed(1)})`}>
            <Hand uid={`${uid}h`} x={560} y={1040} angle={180} scale={46} side="r" hold="keys" frame={t} time={TIME} />
          </g>
        </Svg>
      </CameraLayer>
      <RainFront t={t} n={110} seed={11} />
      <Sfx name="cc0-click" at={hit} volume={0.35} />
      <Haptic kind="light" at={hit} volume={0.3} />
    </IlloBand>
  );
};

/** the row of parked cars along the kerb in the rain, all dark: none of them blinks */
const Row: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 4, at(p.hitAt, 8));
  const sweep = prog(t, hit, 34);
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={1} t={t} />
      <CameraLayer depth={1}>
        <Svg>
          {[205, 540, 875].map((x, i) => (
            <Car key={i} uid={`${uid}c${i}`} x={x} y={KERB} len={310} view="side" body={i === 0 ? 'suv' : i === 1 ? 'sedan' : 'ev'} paint={i === 0 ? 5 : i === 1 ? 3 : 4} frame={t} time={TIME} scenery={i !== 1} />
          ))}
          {/* the searching light: a soft band sweeps along the row and finds nothing */}
          <rect x={-200 + 1500 * sweep} y={KERB - 260} width={140} height={300} rx={70} fill={lamp(TIME)} opacity={sweep > 0 && sweep < 1 ? 0.08 : 0} />
        </Svg>
      </CameraLayer>
      <RainFront t={t} n={140} seed={13} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** THE TURN: over the roofs the floodlight masts click off one by one, then black and only the rain */
const Lights: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 4, at(p.hitAt, 6));
  const offs = [0, 7, 14, 22].map((d) => hit + d);
  const masts = offs.map((f) => 1 - prog(t, f, 3));
  // the dark after the last click: the street stays faintly there under the rain (never a bare frame)
  const black = 0.62 * prog(t, hit + 26, 14);
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={masts[3]} masts={masts} t={t} />
      <RainFront t={t} n={120} seed={17} />
      <Hud>
        <div style={{position: 'absolute', left: -80, top: -80, width: 1240, height: 2080, backgroundColor: C.il7, opacity: black}} />
      </Hud>
      {offs.map((f, i) => (
        <Sfx key={i} name="cc0-click" at={f} volume={0.4} />
      ))}
      <Haptic kind="rigid" at={offs[3]} volume={0.3} />
    </IlloBand>
  );
};

/** THE PAYOFF: next time, the same dad and son walk up the wet pavement and the graphite crossover blinks back */
const Found: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 30));
  const walk = prog(t, 0, len);
  const blink = t >= hit && t < hit + 30 ? (Math.floor((t - hit) / 7) % 2 === 0 ? 1 : 0) : 0;
  return (
    <IlloBand uid={uid} time={TIME}>
      <StreetBack flood={0.8} t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}c`} x={700} y={KERB} len={540} view="side" body="ev" paint={4} dir={-1} frame={t} time={TIME} lights={{hazard: blink, head: 0.3 * blink}} />
          <Figure uid={`${uid}d`} cast={DAD} x={170 + 90 * walk} y={KERB} size={540} frame={t} time={TIME} pose="walk" face="smile" turn={0.6} acts={[{at: hit + 8, pose: 'confident', face: 'smile', turn: 0.5}]} />
          <Figure uid={`${uid}s`} cast={SON} x={290 + 90 * walk} y={KERB} size={400} frame={t + 11} time={TIME} pose="walk" face="smile" turn={0.6} />
        </Svg>
      </CameraLayer>
      <RainFront t={t} n={110} seed={19} />
      <Sfx name="real-fob-lock" at={hit} volume={0.4} />
      <Haptic kind="light" at={hit} volume={0.3} />
    </IlloBand>
  );
};

// the street grid from above: blocks [x, y, w, h] and the saved spots [x, y] that light one by one
const BLOCKS = [
  [130, 430, 250, 230],
  [430, 430, 220, 230],
  [700, 430, 250, 230],
  [130, 720, 250, 260],
  [700, 720, 250, 260],
  [130, 1040, 250, 240],
  [430, 1040, 220, 240],
  [700, 1040, 250, 240],
] as const;
const SPOTS = [
  [405, 560],
  [675, 1000],
  [405, 1180],
  [865, 695],
  [215, 1010],
] as const;

/** THE SIGNATURE: the streets round the stadium from above in the rain; the stadium's glow dies, and one saved spot after
 *  another stays lit, warm (as many as you like, every day) */
const Grid: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 4, at(p.hitAt, 18));
  const kick = useKick();
  const glowK = 1 - prog(t, 0, hit + 10);
  const pin = acc('a');
  return (
    <IlloBand uid={uid} time={TIME}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={ground(TIME)} />
          {BLOCKS.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={26} fill={far(0.1, TIME)} />
          ))}
          {/* the stadium in the middle block: its oval and pitch */}
          <ellipse cx={540} cy={850} rx={110} ry={130} fill={far(0.3, TIME)} stroke={lamp(TIME)} strokeWidth={6} opacity={0.5 + 0.5 * glowK} />
          <rect x={495} y={790} width={90} height={120} rx={10} fill={lamp(TIME)} opacity={0.15 + 0.35 * glowK} />
        </Svg>
        <Glow x={540} y={850} r={260} color={C.il0} k={0.6 * glowK} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {SPOTS.map(([x, y], i) => {
            const k = prog(t, hit + i * 4, 7);
            if (k <= 0) return null;
            const r = 46 * (0.6 + 0.4 * k) * (1 + 0.04 * kick);
            return (
              <g key={i} className={OBJ}>
                <circle cx={x} cy={y} r={r + 16} fill={accRamp(pin, 1)} opacity={0.35 * k} />
                <circle cx={x} cy={y} r={r} fill={accRamp(pin, 3)} opacity={k} />
              </g>
            );
          })}
        </Svg>
        {SPOTS.map(([x, y], i) => {
          const k = prog(t, hit + i * 4, 7);
          return k > 0 ? <Glow key={`g${i}`} x={x} y={y} r={110} color={pin} k={0.5 * k} /> : null;
        })}
        {SPOTS.map(([x, y], i) => {
          const k = prog(t, hit + i * 4, 7);
          return k > 0 ? <Sym key={`s${i}`} name="local_parking" size={56} color={C.il0} x={x} y={y} opacity={k} /> : null;
        })}
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Drops frame={t} seed={23} n={40} color={lit(TIME)} opacity={0.4} />
        </Svg>
      </CameraLayer>
      <Haptic kind="light" at={hit} volume={0.22} />
      <Haptic kind="light" at={hit + 8} volume={0.2} />
      <Haptic kind="light" at={hit + 16} volume={0.2} />
      <Land at={hit} />
    </IlloBand>
  );
};

export const V134RainyDerby: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'wrong':
      return <Wrong p={p} ctx={ctx} />;
    case 'fob':
      return <Fob p={p} ctx={ctx} />;
    case 'row':
      return <Row p={p} ctx={ctx} />;
    case 'lights':
      return <Lights p={p} ctx={ctx} />;
    case 'found':
      return <Found p={p} ctx={ctx} />;
    case 'grid':
      return <Grid p={p} ctx={ctx} />;
    default:
      return <Kerb p={p} ctx={ctx} />;
  }
};
