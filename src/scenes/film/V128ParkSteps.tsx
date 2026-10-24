// src/scenes/film/V128ParkSteps.tsx: v128-park-steps, an underground car park after a long day, told shot by shot.
// One place (a dark concrete deck under the mall), one hero car (the accent coupe-SUV), one man in a dark overcoat:
//   deck     the lane between the parked rows, strip lights running away; he stands in it, looks left, right, then grips his head
//   pillars  the row of identical grey pillars from the side; a sweep of light passes them one by one, every one the same
//   lift     the lift's steel doors, a lit panel of three levels; his finger hovers between two of them
//   pillar   the hero car parked by its own pillar (its level painted on it); the fob, the lock blink
//   step     a step of the how-to on the REAL parking screen (StepShot: the whole phone in a hand, the window, the tap, the lift)
//   levels   the car park in section under the street: the satellite's arcs fade floor by floor, the car's ring widens
//   found    the lane again, the hero car from behind blinking hello as he walks straight to it
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car} from '../illo/car';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {tone, acc, accRamp, lamp} from '../illo/palette';
import {StepShot} from '../kit/explain';
import {useShot, WHITE} from '../kit/stage';
import {E} from '../kit/lib';

type Row = {x?: number; y: number; w?: number; h: number};
type P = {
  look?: string;
  shot?: 'deck' | 'rows' | 'pillars' | 'lift' | 'ear' | 'pillar' | 'open' | 'save' | 'mark' | 'levels' | 'found';
  hitAt?: number | string;
  liftAt?: number | string;
  word?: string;
  level?: string;
  src?: string;
  row?: Row;
};

const VX = 540;
const VY = 800;
const FL = 520;
const ME = {is: 'me', outfit: 'overcoat', hair: 'side', beard: 'stubble', extras: ['watch']} as const;
const px = (x: number, z: number) => VX + (x * FL) / z;
const py = (y: number, z: number) => VY + (y * FL) / z;
const FLOOR = 1.45;
const CEIL = -1.4;

/** the deck in perspective: ceiling, floor, the back wall, the strip lights, the pillars and the parked rows */
const Deck: React.FC<{uid: string; t: number; side?: number; sweep?: number; cars?: boolean}> = ({uid, t, side = 0, sweep = -1, cars = true}) => {
  const zs = [2.2, 3.4, 5, 7.2, 10.4, 15];
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={VY - TOP} fill={tone(6.6)} />
          <rect x={-200} y={VY} width={1480} height={FOOT - VY} fill={tone(6.1)} />
          <rect x={px(-4.2, 18)} y={py(CEIL, 18)} width={(8.4 * FL) / 18} height={((FLOOR - CEIL) * FL) / 18} fill={tone(5)} />
          {zs.map((z, i) => {
            const on = 0.75 + 0.25 * Math.sin(t / 7 + i * 1.7) * (i === 3 ? 1 : 0.15);
            return <rect key={i} x={px(-0.9, z)} y={py(CEIL, z) - 4} width={(1.8 * FL) / z} height={Math.max(6, 60 / z)} rx={4} fill={lamp('night')} opacity={on} />;
          })}
          {/* the lane's centre line and the bays' lines on the floor */}
          <polygon points={`${px(-0.06, 1.2)},${py(FLOOR, 1.2)} ${px(0.06, 1.2)},${py(FLOOR, 1.2)} ${px(0.03, 18)},${py(FLOOR, 18)} ${px(-0.03, 18)},${py(FLOOR, 18)}`} fill={tone(4.4)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {zs
            .slice()
            .reverse()
            .map((z, j) => {
              const i = zs.length - 1 - j;
              const lit = sweep >= 0 ? Math.max(0, 1 - Math.abs(sweep - i) * 1.2) : 0;
              return (
                <g key={z}>
                  {[-1, 1].map((s) => {
                    const x0 = px(s * 3.3 + side, z);
                    const w = (0.55 * FL) / z;
                    return (
                      <g key={s}>
                        <rect x={x0 - w / 2} y={py(CEIL, z)} width={w} height={((FLOOR - CEIL) * FL) / z} fill={tone(4.6 - lit * 2.5)} />
                        <rect x={x0 - w / 2} y={py(0.1, z)} width={w} height={(0.22 * FL) / z} fill={tone(2.6 - lit)} />
                      </g>
                    );
                  })}
                  {cars && z > 2.5
                    ? [-1, 1].map((s) => <Car key={s} uid={`${uid}c${i}${s}`} scenery view="front" body={i % 2 ? 'sedan' : 'hatch'} paint={2 + ((i + s + 2) % 3)} x={px(s * 2.1 + side, z + 0.9)} y={py(FLOOR, z + 0.9)} len={(1.4 * FL) / (z + 0.9)} frame={t} time="night" />)
                    : null}
                </g>
              );
            })}
        </Svg>
      </CameraLayer>
    </>
  );
};

const Punch: React.FC<{text?: string; at: number; y?: number}> = ({text, at, y = 430}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={86} color={WHITE} />
      </div>
    </Hud>
  ) : null;

const DeckShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  return (
    <IlloBand uid={uid} time="night">
      <Deck uid={uid} t={t} />
      <CameraLayer depth={1.1}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={500} y={1240} size={470} frame={t} time="night" face="worried" pose="stand" turn={0.6}
            acts={[{at: 14, turn: -0.6, pose: 'stand'}, {at: hit, pose: 'handsHead', face: 'sad', turn: 0.4}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-air-long" at={lead(ctx)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const PillarsShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const sweep = prog(t, 0, len) * 6.5 - 0.5;
  return (
    <IlloBand uid={uid} time="night">
      <Deck uid={uid} t={t} side={-1.6} sweep={sweep} cars={false} />
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={760} y={1250} size={420} frame={t} time="night" face="worried" pose="walk" turn={-0.8}
            acts={[{at: hit, pose: 'stand', turn: -0.5, face: 'sad'}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-air" at={hit} volume={0.2} />
    </IlloBand>
  );
};

/** close on him in the lane, the phone at his ear, the head dropping while she talks */
const EarShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 16));
  return (
    <IlloBand uid={uid} time="night">
      <Deck uid={uid} t={t} side={-0.4} cars={false} />
      <CameraLayer depth={1.15}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={560} y={1340} size={820} frame={t} time="night" face="worried" pose="phoneEar" turn={-0.55}
            acts={[{at: hit, face: 'sad', pose: 'phoneEar', turn: -0.7}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
    </IlloBand>
  );
};

/** the parked rows with nobody in them: a pale sweep runs along the identical fronts, none of them his */
const RowsShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 20));
  const sweep = 5.5 - prog(t, 0, len) * 6;
  return (
    <IlloBand uid={uid} time="night">
      <Deck uid={uid} t={t} side={1.3} sweep={sweep} />
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-air-long" at={lead(ctx)} volume={0.18} />
    </IlloBand>
  );
};

const LiftShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const levels = ['-1', '-2', '-3'];
  const hover = Math.sin(t / 9) > 0 ? 1 : 2;
  const pick = t < hit ? hover : 2;
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={tone(6.4)} />
          <rect x={-200} y={1250} width={1480} height={FOOT - 1250} fill={tone(6)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={250} y={430} width={460} height={820} fill={tone(5.2)} />
          <rect x={268} y={448} width={210} height={802} fill={tone(4.2)} />
          <rect x={482} y={448} width={210} height={802} fill={tone(4.4)} />
          <rect x={268} y={448} width={424} height={10} fill={tone(2.5)} />
          <rect x={760} y={640} width={120} height={300} rx={18} fill={tone(5.6)} />
          {levels.map((s, i) => (
            <circle key={s} cx={820} cy={700 + i * 90} r={34} fill={i === pick ? acc('a') : tone(4.8)} />
          ))}
          <Figure uid={`${uid}me`} cast={ME} x={600} y={1270} size={470} frame={t} time="night" face="worried" pose="point" turn={0.7}
            acts={[{at: hit, pose: 'shrug', turn: -0.5, face: 'meh'}]} />
        </Svg>
      </CameraLayer>
      <Hud>
        {levels.map((s, i) => (
          <div key={s} className={TXT} style={{position: 'absolute', left: 786, top: 678 + i * 90, width: 68, textAlign: 'center', fontFamily: 'FiraGO', fontWeight: 700, fontSize: 36, color: i === pick ? WHITE : rgba(C.ink, 0.8)}}>
            {s}
          </div>
        ))}
      </Hud>
      <Sfx name="asmr-tap" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const PillarShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 24));
  const on = t >= hit && t < hit + 22 ? (Math.floor((t - hit) / 6) % 2 === 0 ? 1 : 0.2) : 0;
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={1180 - TOP} fill={tone(6.5)} />
          <rect x={-200} y={1180} width={1480} height={FOOT - 1180} fill={tone(6)} />
          <rect x={-200} y={460} width={1480} height={14} fill={lamp('night')} opacity={0.8} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={150} y={TOP} width={150} height={1180 - TOP} fill={tone(4.6)} />
          <rect x={150} y={760} width={150} height={60} fill={accRamp(acc('a'), 3.4)} />
          <Car uid={`${uid}car`} view="side" body="suv" paint="a" x={640} y={1180} len={600} frame={t} time="night" lights={{hazard: on, tail: 0.4}} />
          <Figure uid={`${uid}me`} cast={ME} x={930} y={1250} size={430} frame={t} time="night" face="neutral" pose="hold" hold="keys" turn={-0.7} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: 150, top: 600, width: 150, textAlign: 'center', fontFamily: 'FiraGO', fontWeight: 700, fontSize: 64, color: WHITE}}>
          {p.level ?? 'P2'}
        </div>
      </Hud>
      <Sfx name="asmr-double-tap" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const LevelsShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const ring = prog(t, hit, 24, E.out);
  const floors = [760, 960, 1160];
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={560 - TOP} fill={tone(6.8)} />
          <rect x={-200} y={560} width={1480} height={FOOT - 560} fill={tone(5.8)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {[0, 1, 2, 3].map((i) => {
            const k = (t / 40 + i / 4) % 1;
            const r = 80 + k * 520;
            const depthFade = Math.max(0, 1 - (430 + r - 560) / 520);
            return <circle key={i} cx={540} cy={430} r={r} fill="none" stroke={lamp('night')} strokeWidth={4} opacity={(1 - k) * 0.7 * Math.min(1, depthFade + 0.15)} />;
          })}
          <circle cx={540} cy={430} r={26} fill={lamp('night')} />
          <rect x={120} y={548} width={840} height={16} fill={tone(3.6)} />
          {floors.map((y, i) => (
            <g key={y}>
              <rect x={120} y={y} width={840} height={22} fill={tone(4.4 - i * 0.3)} />
              <rect x={120} y={y - 190} width={22} height={190} fill={tone(4.8)} />
              <rect x={938} y={y - 190} width={22} height={190} fill={tone(4.8)} />
            </g>
          ))}
          <Car uid={`${uid}car`} view="side" body="suv" paint="a" x={540} y={960} len={330} frame={t} time="night" />
          <ellipse cx={540} cy={920} rx={170 + 150 * ring} ry={60 + 40 * ring} fill="none" stroke={acc('a')} strokeWidth={5} strokeDasharray="18 14" opacity={0.3 + 0.7 * ring} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} y={1230} />
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 8)} volume={0.22} />
      <Land at={hit} />
    </IlloBand>
  );
};

const FoundShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 24));
  const on = t >= hit && t < hit + 22 ? (Math.floor((t - hit) / 6) % 2 === 0 ? 1 : 0.2) : 0;
  const walk = prog(t, 0, hit + 20, E.out);
  return (
    <IlloBand uid={uid} time="night">
      <Deck uid={uid} t={t} side={0.6} />
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}car`} view="rear" body="suv" paint="a" x={620} y={1150} len={560} frame={t} time="night" lights={{hazard: on, tail: 0.6}} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.2}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={300 + 90 * walk} y={1280} size={460} frame={t} time="night" face="smile" pose="walk" turn={0.6}
            acts={[{at: hit + 20, pose: 'stand', face: 'smile', turn: 0.5}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-double-tap" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const StepPicture: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {at} = useShot(ctx);
  return (
    <PictureBand camera={false}>
      <StepShot ctx={ctx} src={p.src ?? '07-parking'} row={p.row} tapAt={p.hitAt ?? 1} liftAt={p.liftAt ?? p.hitAt ?? 1} hold w={400} foot={1340} />
      <Sfx name="asmr-tap" at={Math.max(lead(ctx), at(p.hitAt ?? 1, 20))} volume={0.3} />
    </PictureBand>
  );
};

export const V128ParkSteps: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'rows':
      return <RowsShot p={p} ctx={ctx} />;
    case 'pillars':
      return <PillarsShot p={p} ctx={ctx} />;
    case 'lift':
      return <LiftShot p={p} ctx={ctx} />;
    case 'pillar':
      return <PillarShot p={p} ctx={ctx} />;
    case 'ear':
      return <EarShot p={p} ctx={ctx} />;
    case 'open':
    case 'save':
    case 'mark':
      return <StepPicture p={p} ctx={ctx} />;
    case 'levels':
      return <LevelsShot p={p} ctx={ctx} />;
    case 'found':
      return <FoundShot p={p} ctx={ctx} />;
    default:
      return <DeckShot p={p} ctx={ctx} />;
  }
};
