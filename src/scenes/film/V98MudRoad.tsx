// V98MudRoad: v98-mud-road's own picture. A low sedan bouncing down a muddy village track in the mountains (mode
// "mud"); then ONE switch flips the world (mode "switch": a big toggle slams on and its edge wipes the mud away, the
// same car glides on smooth asphalt); and the car's own screen waking with the navigator on it, tagged as a promise
// (mode "dash").
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, accentsOn} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {F} from '../../tokens';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Cabin} from '../illo/road';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'mud' | 'switch' | 'dash';
  hitAt?: number | string;
  splashAt?: number | string;
  line?: string;
  tag?: string;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1150;
const CAR_X = 540;
const STONES = 14;
const SPAN = 1400;

/** the muddy track: ruts, puddles and stones scrolling under the car */
const Mud: React.FC<{frame: number; uid: string; time: 'day' | 'night' | 'dusk'; splash: number}> = ({frame, uid, time, splash}) => {
  const shift = (frame * 9) % SPAN;
  const bob = 5 * Math.sin(frame / 3.1) + 3 * Math.sin(frame / 1.7);
  const pitch = 1.4 * Math.sin(frame / 4.3);
  const stones = [];
  for (let i = 0; i < STONES; i++) {
    const x = ((i * 173 + 60 - shift) % SPAN + SPAN) % SPAN - 160;
    const y = GROUND + 24 + ((i * 97) % 110);
    const r = 10 + ((i * 37) % 22);
    stones.push(<ellipse key={i} cx={x} cy={y} rx={r * 1.4} ry={r * 0.7} fill={i % 2 ? C.il5 : C.il3} />);
  }
  const puddles = [];
  for (let i = 0; i < 4; i++) {
    const x = ((i * 390 + 200 - shift) % SPAN + SPAN) % SPAN - 160;
    const y = GROUND + 60 + ((i * 131) % 70);
    puddles.push(
      <g key={i}>
        <ellipse cx={x} cy={y} rx={150} ry={26} fill={C.il6} />
        <ellipse cx={x - 30} cy={y - 6} rx={70} ry={6} fill={C.il1} opacity={0.5} />
      </g>,
    );
  }
  // the splash: mud flung back from the rear wheel, on parabolas
  const drops = [];
  const t = frame - splash;
  if (t >= 0 && t < 26) {
    for (let i = 0; i < 12; i++) {
      const vx = -(6 + ((i * 7) % 9));
      const vy = -(9 + ((i * 5) % 8));
      const x = CAR_X - 230 + vx * t;
      const y = GROUND - 20 + vy * t + 0.9 * t * t;
      drops.push(<circle key={i} cx={x} cy={y} r={5 + (i % 4) * 3} fill={C.il6} opacity={1 - t / 26} />);
    }
  }
  return (
    <g>
      <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il4} />
      <path d={`M-200 ${GROUND + 70}H1280`} stroke={C.il5} strokeWidth={14} opacity={0.6} />
      <path d={`M-200 ${GROUND + 150}H1280`} stroke={C.il5} strokeWidth={18} opacity={0.5} />
      {puddles}
      {stones}
      <Car uid={uid} x={CAR_X} y={GROUND} len={780} body="sedan" paint="a" frame={frame} time={time} speed={0.35} bob={bob} pitch={pitch} dirt={0.8} />
      {drops}
    </g>
  );
};

/** the same car on smooth asphalt: a calm glide, the lane line streaming */
const Asphalt: React.FC<{frame: number; uid: string; time: 'day' | 'night' | 'dusk'}> = ({frame, uid, time}) => {
  const shift = (frame * 16) % 240;
  const dashes = [];
  for (let i = -1; i < 7; i++) dashes.push(<rect key={i} x={i * 240 - shift} y={GROUND + 150} width={130} height={12} rx={6} fill={C.il0} />);
  return (
    <g>
      <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il2} />
      <rect x={-200} y={GROUND + 10} width={1480} height={300} fill={C.il6} />
      <rect x={-200} y={GROUND + 10} width={1480} height={6} fill={C.il4} />
      {dashes}
      <Car uid={uid} x={CAR_X} y={GROUND} len={780} body="sedan" paint="a" frame={frame} time={time} speed={0.6} />
    </g>
  );
};

const Road: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const time = timeOf(p);
  const base = lead(ctx);
  const sw = p.mode === 'switch';
  const hit = sw ? Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1)) : 1e9;
  const splash = p.splashAt !== undefined ? cueFrame(ctx, p.splashAt) : 1e9;
  const knob = spr(frame, hit - 4, 'land');
  const wipe = prog(frame, hit, 18, ease.enter);
  const wx = -60 + 1200 * wipe;
  const kick = useKick();
  const onCol = accentsOn() ? C.accA : C.il7;
  return (
    <IlloBand uid={uid} time={time}>
      <defs>
        <clipPath id={`${uid}-l`}>
          <rect x={-300} y={-300} width={wx + 300} height={2600} />
        </clipPath>
        <clipPath id={`${uid}-r`}>
          <rect x={wx} y={-300} width={1700} height={2600} />
        </clipPath>
      </defs>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {sw ? (
            <>
              <g clipPath={`url(#${uid}-r)`}>
                <Mud frame={frame} uid={uid} time={time} splash={splash} />
              </g>
              <g clipPath={`url(#${uid}-l)`}>
                <Asphalt frame={frame} uid={uid} time={time} />
              </g>
              {wipe > 0 && wipe < 1 ? <rect x={wx - 3} y={GROUND - 40} width={6} height={FOOT - GROUND + 40} fill={onCol} /> : null}
            </>
          ) : (
            <Mud frame={frame} uid={uid} time={time} splash={splash} />
          )}
        </Svg>
      </CameraLayer>
      {sw ? (
        <Hud>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <rect x={400} y={500} width={280} height={150} rx={75} fill={knob > 0.5 ? onCol : C.il3} opacity={0.95} />
            <circle cx={475 + 130 * knob} cy={575} r={60 + 6 * kick} fill={C.il0} />
            <circle cx={475 + 130 * knob} cy={575} r={60 + 6 * kick} fill="none" stroke={rgba(C.ink, 0.12)} strokeWidth={2} />
          </svg>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 700, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line ?? 'მუცელი *გადარჩა*'} at={hit + 6} fx="slam" size={92} punchTone="up" />
          </div>
          <Sfx name="asmr-tap" at={Math.max(base, hit - 4)} volume={0.5} />
          <Sfx name="asmr-air-long" at={Math.max(base, hit)} volume={0.3} />
          <Land at={hit + 6} />
          <Haptic kind="rigid" at={hit} volume={0.3} />
        </Hud>
      ) : (
        <>
          {splash < 1e9 ? <Sfx name="asmr-knock" at={Math.max(base, splash)} volume={0.4} /> : null}
          {splash < 1e9 ? <Haptic kind="light" at={Math.max(base, splash)} volume={0.25} /> : null}
        </>
      )}
    </IlloBand>
  );
};

/** the car's own screen waking with the navigator, a small tag on it: a promise, not today */
const Dash: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const time = timeOf(p);
  const base = lead(ctx);
  const e = entrance(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const wake = spr(frame, Math.max(e, base + 2), 'enterXL');
  const tagIn = spr(frame, hit, 'land');
  const kick = useKick();
  const route = prog(frame, base + 4, 30, ease.enter);
  const acc = accentsOn() ? C.accA : C.il7;
  const SX = 270;
  const SY = 790;
  const SW = 540;
  const SH = 330;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={1080} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Cabin uid={uid} time={time} frame={frame} wheel={false} hands={false} />
          <rect x={SX + SW / 2 - 40} y={SY + SH - 10} width={80} height={60} rx={10} fill={C.il6} />
          <rect x={SX - 12} y={SY - 12} width={SW + 24} height={SH + 24} rx={30} fill={C.il7} />
          <g opacity={0.25 + 0.75 * wake}>
            <rect x={SX} y={SY} width={SW} height={SH} rx={20} fill={C.il1} />
            <path d={`M${SX + 40} ${SY + 250}L${SX + 200} ${SY + 210}L${SX + 330} ${SY + 260}L${SX + 500} ${SY + 120}`} fill="none" stroke={C.il3} strokeWidth={10} strokeLinecap="round" />
            <path d={`M${SX + 60} ${SY + 300}L${SX + 180} ${SY + 180}L${SX + 300} ${SY + 160}L${SX + 470} ${SY + 70}`} fill="none" stroke={acc} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={760} strokeDashoffset={760 * (1 - route)} />
            <rect x={SX + 24} y={SY + 24} width={150} height={96} rx={16} fill={C.il7} />
            <path d={`M${SX + 70} ${SY + 100}V${SY + 64}Q${SX + 70} ${SY + 50} ${SX + 84} ${SY + 50}H${SX + 120}`} fill="none" stroke={C.il0} strokeWidth={10} strokeLinecap="round" />
            <path d={`M${SX + 112} ${SY + 36}L${SX + 134} ${SY + 50}L${SX + 112} ${SY + 64}Z`} fill={C.il0} />
            <circle cx={SX + 60} cy={SY + 300} r={14} fill={C.il0} stroke={acc} strokeWidth={5} />
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: SX + SW - 190,
            top: SY - 44,
            padding: '14px 30px',
            borderRadius: 40,
            backgroundColor: C.ink,
            color: C.bg,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 48,
            opacity: tagIn,
            transform: `scale(${(0.6 + 0.4 * tagIn + 0.05 * kick).toFixed(4)}) rotate(-4deg)`,
            whiteSpace: 'nowrap',
          }}
        >
          {mtav(p.tag ?? 'მალე')}
        </div>
      </Hud>
      <Sfx name="asmr-screen" at={Math.max(base, e + 2)} volume={0.35} />
      <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

export const V98MudRoad: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.mode === 'dash' ? <Dash p={p} ctx={ctx} /> : <Road p={p} ctx={ctx} />);
