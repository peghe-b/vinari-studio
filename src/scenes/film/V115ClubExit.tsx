// V115ClubExit: a Tbilisi club at 02:17. Outside, a coupe parked across the exit and three friends who cannot leave;
// inside, the owner dancing until the push lands; the DJ's mock folk song with everyone frozen; the owner on the phone on
// his way out; the meeting at the car; and the whole street dancing in one circle at the end. One place (the club and the
// street in front of it), one hero car (the coupe in the film's accent), the same people in every shot.
//   shot   exit | meet | circle (outside) · dance | song (inside) · run (the street on the way out)
//   act    a variation of the shot: exit "block" (closer on the car), dance "read" (the phone), song "sing", run "yell"
//   hitAt  the key moment (the camera kicks, the punch word lands);  line  the punch ("*word*")
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {IlloBand, Svg, TOP, FOOT, osc} from '../illo/scene';
import {acc, ground, lamp, near} from '../illo/palette';
import {useShot, WHITE} from '../kit/stage';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'exit' | 'meet' | 'circle' | 'dance' | 'song' | 'run';
  act?: string;
  hitAt?: number | string;
  line?: string;
};

const OWNER: Cast = {is: 'man', outfit: 'blazer', hair: 'quiff', beard: 'stubble'};
const PAL: Cast = {is: 'friend', gender: 'm', outfit: 'shirt', hair: 'curly', beard: 'none'};
const G1: Cast = {is: 'girl', outfit: 'dress', hair: 'long', extras: ['hoops']};
const G2: Cast = {is: 'woman', age: 'young', outfit: 'trench', hair: 'bob'};
const G3: Cast = {is: 'girl', look: 2, outfit: 'blouse', hair: 'pony'};
const GUARD: Cast = {is: 'man', outfit: 'suit', hair: 'buzz', glasses: 'none'};
const FLOOR = 1300; // every foot stands here, over the subtitle band

/** The punch word over the picture (white: every shot is night). */
const Punch: React.FC<{line?: string; hit: number; y?: number}> = ({line, hit, y = 430}) =>
  line ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y, whiteSpace: 'nowrap'}}>
        <Words text={line} at={hit} fx="slam" size={86} color={WHITE} />
      </div>
    </Hud>
  ) : null;

/** The club's front: a dark wall, the lit doorway and its canopy, the light spilling onto the street. */
const Club: React.FC<{t: number; x?: number}> = ({t, x = 60}) => {
  const warm = lamp('night');
  const pulse = 0.55 + 0.12 * osc(t, 17) + 0.06 * osc(t, 7);
  return (
    <g>
      <rect x={x - 400} y={TOP} width={880} height={1180 - TOP} fill={near('night')} />
      <rect x={x + 90} y={820} width={200} height={360} rx={6} fill={warm} opacity={pulse} />
      <rect x={x + 90} y={820} width={200} height={360} rx={6} fill="none" stroke={rgba(C.il0, 0.5)} strokeWidth={6} />
      <rect x={x + 50} y={780} width={280} height={26} rx={8} fill={acc('a')} opacity={0.85} />
      <rect x={x + 60} y={806} width={260} height={8} fill={acc('a')} opacity={0.35} />
      <ellipse cx={x + 190} cy={1230} rx={330} ry={60} fill={warm} opacity={0.16 * pulse} />
    </g>
  );
};

const Street: React.FC<{uid: string; t: number; scroll?: number}> = ({uid, t, scroll = 0}) => (
  <>
    <CameraLayer depth={0.6}>
      <Svg>
        <Backdrop kind="city" uid={`${uid}b`} frame={t} time="night" base={1180} scroll={scroll} />
      </Svg>
    </CameraLayer>
    <CameraLayer depth={1}>
      <Svg>
        <rect x={-200} y={1180} width={1480} height={FOOT - 1180} fill={ground('night')} />
        <rect x={-200} y={1176} width={1480} height={8} fill={rgba(C.il0, 0.18)} />
      </Svg>
    </CameraLayer>
  </>
);

/** Outside the club: the exit, the meeting at the car, the circle dance. */
const Outside: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const shot = p.shot ?? 'exit';
  const close = p.act === 'block' || p.act === 'close';
  const hz = shot === 'exit' ? 0.5 + 0.5 * Math.sin(t / 4) : 0;
  const people: {c: Cast; x: number; pose: string; face?: string; turn: number; hit?: string; hold?: string; s?: number; y?: number}[] =
    shot === 'exit'
      ? [
          {c: G1, x: close ? 360 : 380, pose: 'walk', turn: 0.6, hit: 'point', face: 'angry'},
          {c: G2, x: close ? 240 : 260, pose: 'stand', turn: 0.5, hit: 'crossArms'},
          {c: G3, x: close ? 130 : 150, pose: 'walk', turn: 0.5, hit: 'shrug'},
        ]
      : shot === 'meet'
        ? [
            {c: G1, x: 230, pose: 'crossArms', turn: 0.5, face: 'smirk', hit: 'pointYou'},
            {c: G2, x: 140, pose: 'stand', turn: 0.5, face: 'smile'},
            {c: OWNER, x: 900, pose: 'walk', turn: -0.6, hit: 'shrug', face: 'grin'},
          ]
        : [
            {c: G2, x: 200, pose: 'armsUp', turn: 0.4, y: 1240, s: 330},
            {c: GUARD, x: 380, pose: 'armsUp', turn: 0.4, y: 1240, s: 350},
            {c: OWNER, x: 560, pose: 'armsUp', turn: -0.4, y: 1240, s: 345},
            {c: G3, x: 760, pose: 'armsUp', turn: -0.5, y: 1240, s: 325},
            {c: PAL, x: 650, pose: 'offer', turn: -0.4, hold: 'phone', hit: 'armsUp'},
            {c: G1, x: 330, pose: 'wave', turn: 0.5, hit: 'pointYou', face: 'smile'},
          ];
  const sway = shot === 'circle' ? 14 * osc(t, 22) : 0;
  const carX = close ? 690 : 720;
  const carLen = close ? 560 : 480;
  return (
    <IlloBand uid={uid} time="night">
      <Street uid={uid} t={t} />
      <CameraLayer depth={1}>
        <Svg>
          <Club t={t} x={close ? -120 : 60} />
          {shot !== 'circle' ? (
            <Car uid={`${uid}c`} x={carX} y={1250} len={carLen} view="side" body="coupe" paint="a" caliper="b" dir={-1} frame={t} time="night" lights={{hazard: hz, tail: 0.4}} />
          ) : null}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.05}>
        <Svg>
          {people.map((m, i) => (
            <Figure
              key={i}
              uid={`${uid}f${i}`}
              cast={m.c}
              x={m.x + (i % 2 ? sway : -sway) + (shot === 'meet' && i === 2 ? -320 * prog(t, 0, 40) : 0)}
              y={m.y ?? FLOOR}
              size={m.s ?? (close ? 540 : 470)}
              pose={m.pose as never}
              face={(m.face ?? 'neutral') as never}
              turn={m.turn}
              hold={(m.hold ?? null) as never}
              frame={t + i * 13}
              time="night"
              acts={m.hit ? [{at: hit - 4 + i * 3, pose: m.hit as never}] : []}
            />
          ))}
        </Svg>
      </CameraLayer>
      <Punch line={p.line} hit={hit} />
      <Sfx name="asmr-knock" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </IlloBand>
  );
};

/** Inside: the dance floor under moving beams; the song freezes it all under one warm light. */
const Inside: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const song = p.shot === 'song';
  const frozen = song ? prog(t, Math.min(hit, 12) - 8, 8) : 0;
  const read = p.act === 'read';
  const beams = [0, 1, 2, 3, 4];
  const warm = lamp('night');
  const crowd: Cast[] = [G3, {is: 'crowd'}, GUARD, {is: 'crowd', look: 2}];
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={ground('night')} />
          {beams.map((i) => {
            const sw = song ? 0 : 160 * Math.sin(t / (14 + i * 3) + i * 1.7);
            const x0 = 120 + i * 210;
            return (
              <polygon
                key={i}
                points={`${x0 - 14},${TOP + 200} ${x0 + 14},${TOP + 200} ${x0 + sw + 120},1200 ${x0 + sw - 120},1200`}
                fill={i % 2 ? acc('b') : acc('a')}
                opacity={(0.16 + 0.08 * osc(t, 9, i)) * (1 - frozen)}
              />
            );
          })}
          <ellipse cx={540} cy={1240} rx={360} ry={70} fill={warm} opacity={0.08 + 0.22 * frozen} />
          <polygon points={`500,${TOP + 200} 580,${TOP + 200} 760,1250 320,1250`} fill={warm} opacity={0.2 * frozen} />
          <rect x={-200} y={1200} width={1480} height={FOOT - 1200} fill={rgba(C.il0, 0.05)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={0.85}>
        <Svg>
          {crowd.map((c, i) => (
            <Figure key={i} uid={`${uid}c${i}`} cast={c} x={190 + i * 240} y={1190} size={300} dim={1} pose={(song && p.act !== 'chorus' ? 'stand' : 'armsUp') as never} turn={i % 2 ? -0.5 : 0.5} frame={song ? 0 : t + i * 9} idle={!song} time="night" />
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.1}>
        <Svg>
          {song ? (
            <>
              <Figure uid={`${uid}p`} cast={PAL} x={540} y={FLOOR} size={460} pose={(p.act === 'sing' || p.act === 'chorus' ? 'armsUp' : 'stand') as never} turn={0.3} frame={t} time="night" acts={[{at: hit, pose: 'armsUp' as never}]} />
              <Figure uid={`${uid}o`} cast={OWNER} x={250} y={FLOOR} size={440} pose={'stand' as never} turn={0.5} frame={0} idle={false} time="night" />
            </>
          ) : (
            <>
              <Figure uid={`${uid}o`} cast={OWNER} x={read ? 540 : 470} y={FLOOR} size={read ? 500 : 450} pose={(read ? 'phoneLook' : 'armsUp') as never} hold={(read ? 'phone' : null) as never} face={(read ? 'shock' : 'grin') as never} turn={0.4} frame={t} time="night" acts={read ? [] : [{at: hit, pose: 'phoneLook' as never, hold: 'phone' as never}]} />
              {read ? null : <Figure uid={`${uid}p`} cast={PAL} x={760} y={FLOOR} size={430} pose={'armsUp' as never} turn={-0.5} frame={t + 20} time="night" />}
            </>
          )}
        </Svg>
      </CameraLayer>
      <Punch line={p.line} hit={hit} />
      <Sfx name={song ? 'asmr-sub' : 'asmr-pop'} at={hit} volume={0.3} />
      <Land at={hit} />
    </IlloBand>
  );
};

/** On the street, walking fast with the phone at his ear; on the hit he stops and stares at it. */
const Run: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const yell = p.act === 'yell';
  const stop = prog(t, hit - 4, 10);
  const scroll = t * 5 * (1 - 0.8 * stop);
  return (
    <IlloBand uid={uid} time="night">
      <Street uid={uid} t={t} scroll={scroll} />
      <CameraLayer depth={1.1}>
        <Svg>
          <Figure uid={`${uid}o`} cast={OWNER} x={yell ? 520 : 470} y={FLOOR} size={yell ? 520 : 470} pose={(yell ? 'phoneLook' : 'phoneEar') as never} hold={'phone' as never} face={(yell ? 'angry' : 'worried') as never} turn={0.55} frame={t} time="night" acts={yell ? [{at: hit, pose: 'phoneLook' as never, face: 'angry' as never}] : [{at: hit, pose: 'walk' as never}]} />
        </Svg>
      </CameraLayer>
      <Punch line={p.line} hit={hit} />
      <Sfx name="asmr-land" at={hit} volume={0.3} />
    </IlloBand>
  );
};

export const V115ClubExit: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'run' ? <Run p={p} ctx={ctx} /> : p.shot === 'dance' || p.shot === 'song' ? <Inside p={p} ctx={ctx} /> : <Outside p={p} ctx={ctx} />;
