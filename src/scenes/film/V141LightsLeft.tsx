// src/scenes/film/V141LightsLeft.tsx: v141-lights-left, a night at the opera while the car outside burns its headlamps.
// One place (the opera house on a night street), one hero car (the accent coupe-SUV, its lamps on), one woman in a dress:
//   hall      the hall from the back rows: the violet curtain, the stage's warm light, rows of dark seats and heads
//   row       closer on her at the end of her row, the phone in her hand; a struck-out bell lands over it: silent
//   street    the opera's facade at night, the car at the kerb head-on with its lamps on, a passer-by walks up to its glass
//   battery   close on the car's nose, the beams sagging, a big battery whose cells go out one by one
//   interval  the same hall with the house lights up, the curtain closed, her in the aisle looking at her phone
//   run       the opera's steps: she hurries down to the car, the lamps go out, two blinks of the lock
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car} from '../illo/car';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {tone, acc, accRamp, lamp, accent} from '../illo/palette';
import {useShot, WHITE} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: string;
  shot?: 'hall' | 'row' | 'street' | 'battery' | 'interval' | 'run' | 'above';
  hitAt?: number | string;
  word?: string;
};

const ME = {is: 'me', gender: 'f', outfit: 'dress', hair: 'lowbun', extras: ['earrings']} as const;
const PASSER = {is: 'grandpa', outfit: 'overcoat', hat: 'flatCap'} as const;

const Punch: React.FC<{text?: string; at: number; y?: number}> = ({text, at, y = 430}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={86} color={WHITE} />
      </div>
    </Hud>
  ) : null;

/** the opera hall seen from the back: the stage, the curtain (open or closed), the house light, rows of seats with heads */
const Hall: React.FC<{t: number; opened: number; house: number; spot: number; heads?: number}> = ({t, opened, house, spot, heads = 1}) => {
  const rows = [0, 1, 2, 3, 4, 5];
  const wall = tone(6.7 - 1.6 * house);
  const cw = 360 * (1 - 0.75 * opened);
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={wall} />
          {/* the proscenium and the stage behind it */}
          <rect x={150} y={470} width={780} height={430} rx={6} fill={tone(7)} />
          <rect x={170} y={490} width={740} height={400} fill={tone(5.6 - 1.2 * spot)} />
          <polygon points={`${470 - 40 * spot},490 ${610 + 40 * spot},490 ${700 + 60 * spot},890 ${380 - 60 * spot},890`} fill={lamp('night')} opacity={0.18 + 0.45 * spot} />
          <rect x={170} y={860} width={740} height={30} fill={tone(4.2 - 1.5 * spot)} />
          {/* the curtain: two violet drapes in folds, a valance across the top */}
          {[0, 1].map((s) => {
            const x0 = s === 0 ? 170 : 910 - cw;
            const folds = 6;
            return (
              <g key={s}>
                {Array.from({length: folds}, (_, i) => (
                  <rect key={i} x={x0 + (cw / folds) * i} y={490} width={cw / folds + 1} height={400} fill={accRamp(acc('a'), i % 2 ? 4.6 : 3.6)} />
                ))}
              </g>
            );
          })}
          <rect x={160} y={480} width={760} height={56} fill={accRamp(acc('a'), 5.4)} />
          {/* the house lights on the side walls */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx={70} cy={560 + i * 130} r={14 + 6 * house} fill={lamp('night')} opacity={0.35 + 0.65 * house} />
              <circle cx={1010} cy={560 + i * 130} r={14 + 6 * house} fill={lamp('night')} opacity={0.35 + 0.65 * house} />
            </g>
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={930} width={1480} height={FOOT - 930} fill={tone(6.9 - 1.2 * house)} />
          {rows.map((r) => {
            const y = 960 + r * r * 9 + r * 52;
            const k = 0.62 + r * 0.12;
            const n = 11 - r;
            const w = 1000 / n;
            return (
              <g key={r}>
                {Array.from({length: n}, (_, i) => {
                  const x = 40 + w * i + (r % 2) * (w / 2) - w / 4;
                  const sway = Math.sin(t / 23 + i * 1.3 + r) * 2;
                  const hasHead = heads > 0 && (i * 7 + r * 3) % 5 !== 0;
                  return (
                    <g key={i}>
                      {hasHead ? <ellipse cx={x + w / 2 + sway} cy={y - 26 * k} rx={22 * k} ry={27 * k} fill={tone(7)} /> : null}
                      <rect x={x + 6} y={y - 6 * k} width={w - 12} height={70 * k} rx={16 * k} fill={accRamp(acc('a'), 6.2 - 0.6 * house)} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </Svg>
      </CameraLayer>
    </>
  );
};

const HallShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 20));
  const spot = prog(t, hit - 6, 18, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <Hall t={t} opened={1} house={0} spot={0.35 + 0.65 * spot} />
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 8)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

/** a bell with a slash: the phone is silent (drawn, 4 px strokes) */
const MuteBell: React.FC<{x: number; y: number; s: number; k: number}> = ({x, y, s, k}) => (
  <g className={OBJ} transform={`translate(${x} ${y}) scale(${(s * (0.7 + 0.3 * k)).toFixed(3)})`} opacity={k}>
    <circle cx={0} cy={0} r={64} fill={tone(0.6)} />
    <path d="M-26 18 C-26 -6 -22 -30 0 -32 C22 -30 26 -6 26 18 L34 26 L-34 26 Z" fill={tone(6.8)} />
    <circle cx={0} cy={34} r={8} fill={tone(6.8)} />
    <line x1={-40} y1={-40} x2={40} y2={40} stroke={accent('down')} strokeWidth={9} strokeLinecap="round" />
  </g>
);

const RowShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 24));
  const k = prog(t, hit, 12, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={tone(6.8)} />
          <polygon points="-200,380 1280,380 1280,700 -200,860" fill={accRamp(acc('a'), 5.8)} />
          <rect x={-200} y={1250} width={1480} height={FOOT - 1250} fill={tone(6.4)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-60 + i * 170} y={1000 - i * 18} width={150} height={250 + i * 18} rx={26} fill={accRamp(acc('a'), 5.2 + (i % 2) * 0.4)} />
          ))}
          <Figure uid={`${uid}me`} cast={ME} x={790} y={1260} size={600} frame={t} time="night" face="neutral" pose="phoneLook" turn={-0.55}
            acts={[{at: hit + 10, pose: 'stand', face: 'smile', turn: -0.4}]} />
          <MuteBell x={790} y={520} s={1} k={k} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} y={420} />
      <Sfx name="asmr-tap" at={hit} volume={0.25} />
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

/** the opera's facade at night: columns, lit arched windows, steps, the street */
const Facade: React.FC<{t: number}> = ({t}) => (
  <CameraLayer depth={0.6}>
    <Svg>
      <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={tone(6.9)} />
      <rect x={-120} y={420} width={1320} height={560} fill={tone(5.9)} />
      <polygon points="-120,420 540,300 1200,420" fill={tone(6.2)} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={-60 + i * 190} y={520} width={110} height={300} rx={55} fill={lamp('night')} opacity={0.55 + 0.1 * Math.sin(t / 17 + i)} />
          <rect x={-100 + i * 190} y={470} width={30} height={500} fill={tone(5.2)} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={-120 - i * 20} y={980 + i * 26} width={1320 + i * 40} height={26} fill={tone(5.4 + i * 0.4)} />
      ))}
      <rect x={-200} y={1058} width={1480} height={FOOT - 1058} fill={tone(6.6)} />
      <rect x={-200} y={1150} width={1480} height={10} fill={tone(5.6)} />
    </Svg>
  </CameraLayer>
);

const StreetShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 36));
  const walk = prog(t, 0, hit, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <Facade t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}car`} view="front" body="suv" paint="a" x={600} y={1280} len={760} frame={t} time="night" lights={{head: 1, beam: 0.8}} />
          <rect x={560} y={1010} width={46} height={36} rx={4} fill={tone(0.4)} opacity={0.9} />
          <Figure uid={`${uid}pb`} cast={PASSER} x={240 + 100 * walk} y={1270} size={430} frame={t} time="night" face="neutral" pose="walk" turn={0.7}
            acts={[{at: hit, pose: 'phoneLook', turn: 0.6}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-camera" at={hit + 6} volume={0.25} />
      <Haptic kind="light" at={hit + 6} volume={0.2} />
    </IlloBand>
  );
};

/** close on the nose: the beams sag as the battery's cells go out one by one */
const BatteryShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 40));
  const drain = prog(t, 0, Math.max(hit + 10, len - 6), E.inOut);
  const cells = 5;
  const left = Math.max(1, Math.ceil(cells * (1 - drain * 0.85)));
  const low = t >= hit;
  return (
    <IlloBand uid={uid} time="night">
      <Facade t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}car`} view="front" body="suv" paint="a" x={540} y={1300} len={1500} frame={t} time="night" lights={{head: 1 - 0.55 * drain, beam: 0.9 - 0.6 * drain}} />
        </Svg>
      </CameraLayer>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g className={OBJ}>
            <rect x={340} y={430} width={360} height={170} rx={30} fill={tone(0.5)} opacity={0.94} />
            <rect x={360} y={450} width={300} height={130} rx={18} fill="none" stroke={tone(6.6)} strokeWidth={10} />
            <rect x={664} y={490} width={20} height={50} rx={6} fill={tone(6.6)} />
            {Array.from({length: cells}, (_, i) => (
              <rect key={i} x={378 + i * 56} y={468} width={46} height={94} rx={8} fill={i < left ? (low && left <= 1 ? accent('down') : tone(6.6)) : tone(1.6)} />
            ))}
          </g>
        </svg>
      </Hud>
      <Punch text={p.word} at={hit} y={640} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.25} />
    </IlloBand>
  );
};

/** the car from above at the kerb in front of the opera: the pavement, the steps' edge, two long beams on the dark road */
const AboveShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 9));
  const flare = 0.55 + 0.45 * prog(t, hit - 4, 8, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={tone(6.8)} />
          <rect x={-200} y={TOP} width={330} height={FOOT - TOP} fill={tone(5.6)} />
          <rect x={-200} y={TOP} width={150} height={FOOT - TOP} fill={tone(5.1)} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={-60} y={TOP + 40 + i * 260} width={40} height={120} rx={8} fill={lamp('night')} opacity={0.5} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <rect key={i} x={900} y={TOP + 60 + i * 240} width={14} height={120} rx={4} fill={tone(5)} />
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {[0, 1].map((s) => (
            <polygon key={s} points={`${468 + s * 144},560 ${500 + s * 80},560 ${640 + s * 300},${TOP - 40} ${300 + s * 300},${TOP - 40}`} fill={lamp('night')} opacity={0.32 * flare} />
          ))}
          <Car uid={`${uid}car`} view="top" body="suv" paint="a" x={540} y={860} len={640} heading={0} frame={t} time="night" lights={{head: flare, beam: flare}} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 4)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

const IntervalShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 12));
  const house = 0.3 + 0.7 * prog(t, 0, hit + 8, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <Hall t={t} opened={0} house={house} spot={0} heads={0} />
      <CameraLayer depth={1.15}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={830} y={1290} size={520} frame={t} time="night" face="neutral" pose="walk" turn={-0.6}
            acts={[{at: hit, pose: 'phoneLook', face: 'worried', turn: -0.5}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-air-long" at={lead(ctx)} volume={0.18} />
    </IlloBand>
  );
};

const RunShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 30));
  const run = prog(t, 0, hit + 4, E.out);
  const lit = t < hit ? 1 : Math.max(0, 1 - (t - hit) / 6);
  const blink = t >= hit + 4 && t < hit + 28 ? (Math.floor((t - hit - 4) / 6) % 2 === 0 ? 1 : 0.1) : 0;
  return (
    <IlloBand uid={uid} time="night">
      <Facade t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}car`} view="side" body="suv" paint="a" dir={-1} x={640} y={1250} len={560} frame={t} time="night" lights={{head: lit, beam: 0.7 * lit, hazard: blink}} />
          <Figure uid={`${uid}me`} cast={ME} x={190 + 140 * run} y={1250} size={440} frame={t} time="night" face="worried" pose="walk" turn={0.75}
            acts={[{at: hit, pose: 'stand', face: 'smile', turn: 0.6}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-double-tap" at={hit + 4} volume={0.3} />
      <Haptic kind="light" at={hit + 4} volume={0.25} />
    </IlloBand>
  );
};

export const V141LightsLeft: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'row':
      return <RowShot p={p} ctx={ctx} />;
    case 'street':
      return <StreetShot p={p} ctx={ctx} />;
    case 'battery':
      return <BatteryShot p={p} ctx={ctx} />;
    case 'interval':
      return <IntervalShot p={p} ctx={ctx} />;
    case 'above':
      return <AboveShot p={p} ctx={ctx} />;
    case 'run':
      return <RunShot p={p} ctx={ctx} />;
    default:
      return <HallShot p={p} ctx={ctx} />;
  }
};
