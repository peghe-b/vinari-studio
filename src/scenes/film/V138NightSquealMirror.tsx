// v138-night-squeal, the cab's own 2D shots (no WebGL), the same graphite crossover's cab, Gela at the wheel:
//   mirror  the signature: the rear-view mirror at night, a passenger's face rising in its glass on the squeal, the radio's
//           level bars climbing under it
//   couple  the same mirror, a couple swapping a look
//   dark    the turn: the engine off, only the indicator's amber blinking on Gela's profile
//   face    the same dark cab, the phone's white light coming up on Gela's face
//   dawn    the same mirror at dawn: the last passenger, calm daylight in the glass
import React, {useId} from 'react';
import {Haptic, lead, PictureBand, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {OBJ} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Glow} from '../kit/glow';
import {Figure} from '../illo/figure';
import {jolt, Svg, useShot, WHITE} from '../kit/stage';
import {E} from '../kit/lib';

type P = {shot?: 'mirror' | 'couple' | 'dark' | 'face' | 'dawn'; hitAt?: number | string; line?: string};

const GELA = {is: 'me', gender: 'm', age: 'old', outfit: 'polo', hair: 'receding', beard: 'short', glasses: 'rect', hairTone: 1} as const;
const FARE = {is: 'man', gender: 'm', age: 'adult', outfit: 'overcoat', hair: 'slick', beard: 'none'} as const;
const HER = {is: 'woman', gender: 'f', age: 'adult', outfit: 'trench', hair: 'lob', extras: ['earrings']} as const;
const HIM = {is: 'friend', gender: 'm', age: 'adult', outfit: 'bomber', hair: 'fade', beard: 'stubble'} as const;
const LAST = {is: 'buyer', gender: 'f', age: 'adult', outfit: 'blazer', hair: 'pony'} as const;

const SODIUM = '#FFB25C';
const MX = 170;
const MY = 560;
const MW = 740;
const MH = 330;

const Punch: React.FC<{text?: string; at: number}> = ({text, at}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 400, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={96} color={WHITE} />
      </div>
    </Hud>
  ) : null;

/** The rear-view mirror inside the cab: the passengers in its glass, the radio's level under it. */
const Mirror: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const kind = p.shot ?? 'mirror';
  const day = kind === 'dawn';
  const push = 1 + 0.06 * E.inOut(prog(t, 0, len));
  const shake = day ? {x: 0, y: 0} : jolt(t, hit, 6, 10, 7);
  const rise = E.out(prog(t, 0, 24));
  const look = prog(t, hit, 12);
  const level = kind === 'couple' ? 9 : Math.round(3 + 7 * prog(t, hit - 6, 20));
  const glass = day ? '#C9CDD2' : '#4A4038';
  const seat = day ? '#9EA3AA' : '#2E2925';
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: day ? '#8D939B' : '#101114', overflow: 'hidden'}}>
        {day ? <Glow x={540} y={420} r={620} color="#FFE7C2" k={0.6} /> : <Glow x={250} y={420} r={300} color={SODIUM} k={0.45} />}
        {day ? null : <Glow x={860} y={360} r={240} color={SODIUM} k={0.35} />}
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push}) translate(${shake.x}px, ${shake.y}px)`, transformOrigin: '540px 720px'}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <rect x={520} y={380} width={40} height={190} rx={14} fill="#2A2C31" />
            <g className={OBJ}>
              <rect x={MX - 14} y={MY - 14} width={MW + 28} height={MH + 28} rx={64} fill="#1C1D21" />
              <rect x={MX} y={MY} width={MW} height={MH} rx={52} fill={glass} />
            </g>
            <defs>
              <clipPath id={`${uid}m`}>
                <rect x={MX} y={MY} width={MW} height={MH} rx={52} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${uid}m)`}>
              <rect x={MX} y={MY} width={MW} height={MH} fill={glass} />
              <rect x={MX} y={MY + MH * 0.55} width={MW} height={MH} fill={seat} />
              {kind === 'couple' ? (
                <>
                  <Figure uid={`${uid}a`} cast={HER} x={400} y={MY + MH + 520 - 60 * rise} size={720} crop="bust" frame={t} time="night" face="worried" turn={0.4 + 0.4 * look} />
                  <Figure uid={`${uid}b`} cast={HIM} x={680} y={MY + MH + 540 - 60 * rise} size={740} crop="bust" frame={t + 30} time="night" face="meh" turn={-0.4 - 0.4 * look} />
                </>
              ) : day ? (
                <Figure uid={`${uid}a`} cast={LAST} x={560} y={MY + MH + 540 - 50 * rise} size={740} crop="bust" frame={t} time="day" face="neutral" turn={-0.5} acts={[{at: hit, face: 'smile'}]} />
              ) : (
                <Figure uid={`${uid}a`} cast={FARE} x={560} y={MY + MH + 560 - 90 * rise - 40 * look} size={760} crop="bust" frame={t} time="night" face="neutral" turn={-0.5} acts={[{at: hit, face: 'shock'}]} />
              )}
              <rect x={MX - 200 + 300 * prog(t, 0, len)} y={MY - 40} width={90} height={MH + 80} fill="#FFFFFF" opacity={0.08} transform="skewX(-20)" />
            </g>
          </svg>
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g className={OBJ}>
            <rect x={340} y={1080} width={400} height={150} rx={30} fill="#1A1B1F" />
            {Array.from({length: 10}, (_, i) => (
              <rect key={i} x={372 + i * 35} y={1190 - 10 * i} width={22} height={18 + 10 * i} rx={6} fill={i < (day ? 2 : level) ? SODIUM : '#34363C'} />
            ))}
          </g>
        </svg>
      </div>
      <Punch text={p.line} at={hit + 6} />
      {day ? null : <Sfx name="real-belt-squeal" at={Math.max(lead(ctx), hit - 6)} volume={kind === 'couple' ? 0.55 : 0.4} />}
      <Haptic kind={day ? 'light' : 'rigid'} at={hit} volume={0.3} />
    </PictureBand>
  );
};

/** The dark cab: Gela's profile at the wheel, lit by the blinking indicator (dark) or the phone's white light (face). */
const Cab: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len} = useShot(ctx);
  const face = p.shot === 'face';
  const blink = Math.floor(t / 11) % 2 === 0 ? 1 : 0.15;
  const k = E.inOut(prog(t, 0, len));
  const phone = E.out(prog(t, 0, 30));
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: '#07080A', overflow: 'hidden'}}>
        {face ? <Glow x={760} y={900} r={520} color="#EEF3FF" k={0.75 * phone} /> : <Glow x={780} y={1000} r={460} color={SODIUM} k={0.55 * blink} />}
        <Glow x={300} y={620} r={360} color="#5A6A80" k={0.25} />
        <Svg>
          <Figure uid={`${uid}g`} cast={GELA} x={face ? 480 + 30 * k : 500 - 20 * k} y={1250} size={face ? 900 + 50 * k : 860 + 40 * k} crop="bust" frame={t} time="night" face={face ? 'neutral' : 'sad'} turn={0.85} />
        </Svg>
        {face ? null : (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <g className={OBJ} opacity={0.3 + 0.7 * blink}>
              <path d="M 790 1150 L 840 1110 L 840 1135 L 900 1135 L 900 1165 L 840 1165 L 840 1190 Z" fill={SODIUM} />
            </g>
          </svg>
        )}
      </div>
      {face ? <Sfx name="asmr-shimmer" at={lead(ctx)} volume={0.3} /> : <Sfx name="real-indicator-loop" at={lead(ctx)} volume={0.45} />}
      <Punch text={p.line} at={lead(ctx) + 10} />
    </PictureBand>
  );
};

export const V138NightSquealMirror: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'dark' || p.shot === 'face' ? <Cab p={p} ctx={ctx} /> : <Mirror p={p} ctx={ctx} />;
