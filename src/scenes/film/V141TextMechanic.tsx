// src/scenes/film/V141TextMechanic.tsx: v141-text-mechanic, "you can't describe a yellow light to your mechanic".
// One driver, one hero sedan, one mechanic (Gocha in his workshop), told shot by shot:
//   cabin   the driver's view on a morning street: the digital cockpit under the windshield, the amber check lamp on
//   laugh   Gocha in his workshop, the phone at his ear, laughing at "it goes buk-buk"
//   code    closer on Gocha: he points, and an empty code card waits for the letters he asked for
//   port    a diagram: the dash's underside at knee height, the socket, the adapter rising into it, its LED waking
//   send    two phones apart: the code and the verdict leave the driver's phone as one white card and land on Gocha's
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Backdrop} from '../illo/backdrop';
import {Handset} from '../illo/handset';
import {Car} from '../illo/car';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, accRamp} from '../illo/palette';
import {Cockpit, CP, CP_LAMP} from '../kit/cockpit';
import {Glow} from '../kit/glow';
import {EngineIcon, useShot, AMBER} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: string;
  shot?: 'cabin' | 'laugh' | 'code' | 'port' | 'send' | 'curb' | 'shake' | 'reply' | 'bay' | 'lift';
  hitAt?: number | string;
  word?: string;
  code?: string;
  verdict?: string;
};

const MECH = {is: 'mechanic', hair: 'buzz', beard: 'tache', outfit: 'coverall'} as const;
const GROUND = 1310;

const Punch: React.FC<{text?: string; at: number; y?: number}> = ({text, at, y = 440}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={84} />
      </div>
    </Hud>
  ) : null;

/** the driver's view: the street through the glass, the dash, the cockpit glass with the amber lamp */
const CabinShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 24));
  const kick = useKick();
  const pulse = 0.82 + 0.18 * Math.sin(t / 5);
  const s = 0.84;
  const cx = 540 - (CP.w * s) / 2;
  const cy = 720;
  const lx = cx + CP_LAMP.x * s;
  const ly = cy + CP_LAMP.y * s;
  const DASH = 660;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={DASH - TOP + 40} fill={C.il1} />
          <Backdrop kind="city" uid={`${uid}b`} frame={t} time="day" base={DASH + 20} drift={0.2} seed={141} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {/* the dash: a soft slab under the glass, the hood over the cockpit */}
          <path d={`M-200 ${DASH}Q540 ${DASH - 60} 1280 ${DASH}L1280 ${FOOT}L-200 ${FOOT}Z`} fill={C.il6} />
          <path d={`M${cx - 30} ${cy + 10}Q540 ${cy - 70} ${cx + CP.w * s + 30} ${cy + 10}`} fill="none" stroke={C.il7} strokeWidth={26} strokeLinecap="round" />
          <g transform={`translate(${cx} ${cy}) scale(${s})`}>
            <Cockpit uid={`${uid}c`} frame={t} check={pulse} speed={42} />
          </g>
          <rect x={-200} y={1120} width={1480} height={FOOT - 1120} fill={C.il7} opacity={0.5} />
        </Svg>
      </CameraLayer>
      <Glow x={lx} y={ly} r={170 + 30 * kick} color={AMBER} k={0.5 * pulse} />
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-pop" at={lead(ctx)} volume={0.25} />
      <Land at={hit} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** Gocha in his workshop: laughing at the phone (laugh), then pointing at the empty code card (code) */
const GarageShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const close = p.shot === 'code';
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, close ? 10 : 24));
  const card = spr(t, hit, 'enterXL');
  const slots = (p.code ?? 'P0').split('');
  const acts = close
    ? [{at: hit - 4, pose: 'point' as const, face: 'smirk' as const, turn: 0.55}]
    : [{at: hit, pose: 'phoneEar' as const, face: 'laugh' as const, turn: 0.4}];
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={C.il2} />
          <Backdrop kind="garage" uid={`${uid}b`} frame={t} time="day" base={GROUND} drift={0.12} seed={close ? 7 : 141} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il3} />
          <Figure uid={`${uid}g`} cast={MECH} x={close ? 330 : 440} y={close ? 1360 : GROUND} size={close ? 880 : 650} frame={t} time="day" face="smile" pose="phoneEar" turn={close ? 0.5 : 0.3} acts={acts} />
        </Svg>
      </CameraLayer>
      {close ? (
        <Hud>
          <div className={OBJ} style={{position: 'absolute', left: 560, top: 420, width: 380, height: 170, borderRadius: 34, backgroundColor: C.surface, boxShadow: `0 24px 60px ${rgba(C.shade, 0.18)}`, opacity: card, transform: `translateY(${(1 - card) * 30}px) scale(${0.94 + 0.06 * card})`}}>
            <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: F.mono, fontSize: 64, fontWeight: 700, color: C.ink}}>
              {slots.map((ch, i) => (
                <span key={i}>{ch}</span>
              ))}
              {[0, 1, 2].map((i) => (
                <span key={`s${i}`} style={{display: 'inline-block', width: 34, height: 6, borderRadius: 3, marginTop: 44, backgroundColor: acc('a'), opacity: 0.5 + 0.5 * Math.abs(Math.sin((t - i * 6) / 8))}} />
              ))}
            </div>
          </div>
        </Hud>
      ) : (
        <Punch text={p.word} at={hit} />
      )}
      <Sfx name={close ? 'asmr-knock' : 'asmr-pop'} at={Math.max(lead(ctx), hit)} volume={0.26} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const toneA = () => accRamp(acc('a'), 3);

/** the diagram: the dash's underside, the steering column, the socket; the adapter rises in and its LED wakes */
const PortShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, at(p.hitAt, 30));
  const kick = useKick();
  const rise = E.out(prog(t, base, Math.max(14, hit - base)));
  const sx = 540;
  const sy = 760;
  const ay = 1150 - (1150 - sy) * rise;
  const led = t >= hit ? 0.35 + 0.65 * Math.abs(Math.sin((t - hit) / 5)) : 0.12;
  const pins = (row: number) =>
    Array.from({length: 8}, (_, i) => <rect key={`${row}${i}`} x={sx - 150 + i * 40} y={sy - 80 + row * 40} width={22} height={26} rx={6} fill={C.ink2} />);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the steering column coming down from the left */}
          <path d="M140 430L470 560L430 640L120 520Z" fill={rgba(C.ink, 0.1)} stroke={C.ink2} strokeWidth={5} strokeLinejoin="round" />
          {/* the underside of the dash */}
          <path d={`M130 ${sy - 160}H950V${sy - 110}Q540 ${sy - 80} 130 ${sy - 110}Z`} fill={rgba(C.ink, 0.12)} stroke={C.ink2} strokeWidth={5} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the socket, its opening facing down */}
          <path d={`M${sx - 200} ${sy - 110}H${sx + 200}L${sx + 170} ${sy + 20}H${sx - 170}Z`} fill={C.surface} stroke={toneA()} strokeWidth={8} strokeLinejoin="round" />
          {pins(0)}
          {pins(1)}
          {/* the adapter rising into it */}
          <g transform={`translate(0 ${(ay - sy).toFixed(1)})`}>
            <path d={`M${sx - 150} ${sy + 24}H${sx + 150}L${sx + 130} ${sy - 30}H${sx - 130}Z`} fill={C.ink2} />
            <rect x={sx - 190} y={sy + 24} width={380} height={220} rx={40} fill={C.ink} />
            <circle cx={sx + 120} cy={sy + 84} r={40} fill={acc('a')} opacity={0.18 * led} />
            <circle cx={sx + 120} cy={sy + 84} r={18 + 4 * kick} fill={acc('a')} opacity={led} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: L.camSafe.left, top: 1130, fontFamily: F.mono, fontSize: 64, fontWeight: 700, color: C.ink, opacity: prog(t, hit, 8)}}>
          OBD
        </div>
      </Hud>
      <Sfx name="asmr-knock" at={hit} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** two phones apart: the code and the verdict leave the driver's phone as one card and land on Gocha's */
const SendShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 18, at(p.hitAt, 30));
  const go = E.inOut(prog(t, hit - 16, 16));
  const land = spr(t, hit, 'land');
  const PW = 290;
  const AX = 290;
  const BX = 790;
  const PY = 880;
  const cw = 250;
  const ch = 190;
  const x = AX + (BX - AX) * go - cw / 2;
  const y = PY - 40 - 150 * Math.sin(Math.PI * go) - ch / 2;
  const screen = (w: number, h: number) => <rect x={0} y={0} width={w} height={h} fill={C.surface} />;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il1} />
          <rect x={-200} y={1240} width={1480} height={FOOT - 1240} fill={C.il2} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Handset uid={`${uid}a`} x={AX} y={PY} w={PW} tilt={-4} frame={t} lit={1} time="day" screen={screen} />
          <Handset uid={`${uid}b`} x={BX} y={PY} w={PW} tilt={4} frame={t} lit={1} time="day" screen={screen} ring={t >= hit ? {from: hit, until: hit + 12} : null} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div className={OBJ} style={{position: 'absolute', left: x, top: y, width: cw, height: ch, borderRadius: 28, backgroundColor: C.surface, boxShadow: `0 20px 50px ${rgba(C.shade, 0.22)}`, transform: `scale(${(0.96 + 0.04 * land).toFixed(3)})`, opacity: prog(t, base, 8)}}>
          <svg width={cw} height={ch} style={{position: 'absolute', inset: 0}}>
            <EngineIcon uid={`${uid}e`} x={46} y={50} size={52} k={1} glow={0.5} />
          </svg>
          <div className={TXT} style={{position: 'absolute', left: 84, top: 22, fontFamily: F.mono, fontSize: 46, fontWeight: 700, color: C.ink}}>
            {p.code ?? 'P0300'}
          </div>
          <div className={TXT} style={{position: 'absolute', left: 22, right: 18, top: 100, fontFamily: F.sans, fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: C.ink}}>
            {mtav(p.verdict ?? 'მალე ხელოსანთან')}
          </div>
        </div>
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 16)} volume={0.22} />
      <Sfx name="asmr-notif" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

const ME = {is: 'me', outfit: 'shirt', hair: 'side', beard: 'short', extras: ['watch']} as const;

/** the curb: the hero sedan parked, him beside it on the phone, shrugging at what to say (curb); the sedan head-on,
 *  shivering at idle (shake) */
const StreetShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 20));
  const shake = p.shot === 'shake';
  const jx = shake ? 5 * Math.sin(t * 2.3) * (0.6 + 0.4 * Math.abs(Math.sin(t / 7))) : 0;
  const jy = shake ? 2 * Math.sin(t * 3.1) : 0;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={C.il1} />
          <Backdrop kind="city" uid={`${uid}b`} frame={t} time="day" base={GROUND} drift={0.12} seed={shake ? 41 : 141} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il3} />
          {shake ? (
            <g transform={`translate(${jx.toFixed(1)} ${jy.toFixed(1)})`}>
              <Car uid={`${uid}c`} x={540} y={1250} len={640} view="front" body="sedan" paint="a" frame={t} time="day" lights={{head: 0.5}} />
            </g>
          ) : (
            <>
              <Car uid={`${uid}c`} x={660} y={GROUND} len={580} view="side" body="sedan" paint="a" frame={t} time="day" />
              <Figure uid={`${uid}m`} cast={ME} x={250} y={GROUND} size={600} frame={t} time="day" face="worried" pose="phoneEar" turn={0.5} acts={[{at: hit, pose: 'shrug', face: 'worried', turn: 0.7}]} />
            </>
          )}
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-knock" at={Math.max(lead(ctx), hit)} volume={0.22} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** the workshop again: Gocha reads the text and gives a thumbs up (reply); the hero sedan in the bay next morning,
 *  Gocha beside it, arms crossed: his call (bay) */
const ShopShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 16));
  const bay = p.shot === 'bay';
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={C.il2} />
          <Backdrop kind="garage" uid={`${uid}b`} frame={t} time="day" base={GROUND} drift={0.12} seed={bay ? 23 : 59} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il3} />
          {bay ? (
            <>
              <Car uid={`${uid}c`} x={640} y={GROUND} len={600} view="side" body="sedan" paint="a" frame={t} time="day" />
              <Figure uid={`${uid}g`} cast={MECH} x={230} y={GROUND} size={600} frame={t} time="day" face="neutral" pose="point" turn={0.6} acts={[{at: hit, pose: 'crossArms', face: 'smile', turn: 0.4}]} />
            </>
          ) : (
            <Figure uid={`${uid}g`} cast={MECH} x={700} y={1360} size={900} frame={t} time="day" face="neutral" pose="phoneLook" turn={-0.5} acts={[{at: hit, pose: 'thumbsUp', face: 'smile', turn: -0.5}]} />
          )}
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-pop" at={Math.max(lead(ctx), hit)} volume={0.22} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** the adapter he kept in the car, lifted into the light over the street: it turns a little, its LED waits */
const LiftShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 20));
  const up = spr(t, Math.max(0, base - 6), 'enterXL');
  const kick = useKick();
  const cx = 540;
  const cy = 840 + 260 * (1 - up);
  const rot = -10 + 8 * up + 2 * Math.sin(t / 18);
  const led = t >= hit ? 0.4 + 0.6 * Math.abs(Math.sin((t - hit) / 6)) : 0.15;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={C.il1} />
          <Backdrop kind="city" uid={`${uid}b`} frame={t} time="day" base={GROUND} drift={0.1} seed={77} opacity={0.55} />
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il3} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.1}>
        <Svg>
          <g className={OBJ} transform={`translate(${cx} ${cy}) rotate(${rot.toFixed(2)}) scale(${(1 + 0.04 * kick).toFixed(3)})`}>
            <ellipse cx={0} cy={250} rx={220} ry={26} fill={rgba(C.shade, 0.12)} />
            <path d="M-170 -150H170L150 -60H-150Z" fill={C.ink2} />
            {Array.from({length: 8}, (_, i) => (
              <rect key={i} x={-130 + i * 34} y={-130} width={18} height={40} rx={5} fill={C.il4} />
            ))}
            <rect x={-210} y={-60} width={420} height={260} rx={46} fill={C.ink} />
            <rect x={-170} y={-30} width={200} height={10} rx={5} fill={rgba(C.surface, 0.18)} />
            <circle cx={140} cy={10} r={44} fill={acc('a')} opacity={0.2 * led} />
            <circle cx={140} cy={10} r={20} fill={acc('a')} opacity={led} />
          </g>
        </Svg>
      </CameraLayer>
      <Punch text={p.word} at={hit} />
      <Sfx name="asmr-air-long" at={base} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

export const V141TextMechanic: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const shot = p.shot ?? 'cabin';
  if (shot === 'lift') return <LiftShot p={p} ctx={ctx} />;
  if (shot === 'curb' || shot === 'shake') return <StreetShot p={p} ctx={ctx} />;
  if (shot === 'reply' || shot === 'bay') return <ShopShot p={p} ctx={ctx} />;
  if (shot === 'port') return <PortShot p={p} ctx={ctx} />;
  if (shot === 'send') return <SendShot p={p} ctx={ctx} />;
  if (shot === 'laugh' || shot === 'code') return <GarageShot p={p} ctx={ctx} />;
  return <CabinShot p={p} ctx={ctx} />;
};
