// V136LampTwo: one engine lamp, two signals (v136-lamp-two). A paper diagram that moves on from shot to shot: the lamp
// over a trace that runs flat while it is steady and spikes while it flashes; the spike runs into a cylinder where the
// fuel does not burn, the unburnt drops roll down the pipe into the catalyst's honeycomb and it heats red. Around it the
// "me" of the film as a silhouette: upright on the drop, calm on the payoff.
//   shot "drop"   the glow-up: me upright, the light lifting, the spec's word slammed on the cut (illustrated)
//   shot "steady" the lamp lit steady over a flat trace (diagram)
//   shot "flash"  the lamp blinking over a spiking trace (diagram)
//   shot "misfire" a cylinder in section: the piston runs, the drops go in, no burn, they leave (diagram)
//   shot "cat"    the pipe into the honeycomb: the drops arrive and the block heats red (diagram)
//   shot "calm"   me calm with the phone, the two lamps beside: one ticked, one stopped (illustrated)
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {OBJ} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';
import {FitText, S, tone} from '../kit/p2';
import {SilFigure} from '../kit/sil/sil';

type Shot = 'drop' | 'steady' | 'flash' | 'misfire' | 'cat' | 'calm' | 'cap' | 'hurt';
type P = {
  look?: 'illustrated' | 'diagram';
  shot?: Shot;
  hitAt?: number | string;
  word?: {text: string; at?: number | string};
  line?: string;
  label?: string;
};

// me: a young man in a charcoal bomber over a white tee, short curls, dark jeans, white sneakers
const ME_SEED = 36;
const LOOK = {
  role: 'me', fem: false, age: 0, skin: 2, build: 1.02, hair: 'curly', hairTone: 7, beard: 'stubble', outfit: 'bomber', tone: 6,
  inner: 'tee', innerTone: 0, tie: null, bottom: 'jeans', legs: 6, shoe: 'sneaker', shoeTone: 0, sole: null, glasses: null,
  hat: null, hatTone: 0, watch: true, chain: false, earrings: null, bag: false, scarf: null, sleeve: 'long', tucked: false,
} as const;

// the engine lamp, drawn on a 24 grid
const LAMP_D = 'M2 10V15M2 12.5H4.5M4.5 9H7L8.5 7.5H14L15.5 9H17.5V11H20V9H22V17H20V15H17.5V17.5L15.5 19H7.5L4.5 16Z M9 7.5V5.5H13V7.5';

const Lamp: React.FC<{x: number; y: number; size: number; on: number; color: string}> = ({x, y, size, on, color}) => {
  const s = size / 24;
  return (
    <g className={OBJ} transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      <circle cx={12} cy={12.5} r={15} fill={rgba(C.ink, 0.06)} />
      <path d={LAMP_D} fill="none" stroke={on > 0.5 ? color : C.ink2} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.35 + 0.65 * on} />
    </g>
  );
};

/** the trace under the lamp: flat (steady) or spiking (flash), drawn on from the left */
const tracePath = (x0: number, x1: number, y: number, k: number, spikes: boolean, frame: number) => {
  const n = 60;
  const pts: string[] = [];
  const end = x0 + (x1 - x0) * k;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    if (x > end) break;
    let dy = 0;
    if (spikes) {
      const ph = ((i + Math.floor(frame / 3)) % 12) / 12;
      dy = ph < 0.08 ? -150 : ph < 0.16 ? 90 : 0;
    }
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y + dy).toFixed(1)}`);
  }
  return pts.join(' ');
};

const SignalShot: React.FC<{p: P; ctx: SceneCtx; flash: boolean}> = ({p, ctx, flash}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const amber = tone('accent');
  const blink = flash ? (Math.floor(Math.max(0, frame - e) / 9) % 2 === 0 ? 1 : 0.15) : 1;
  const draw = prog(frame, e + 4, 40, ease.drawOn);
  const boxY = 980;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <rect className={OBJ} x={150} y={boxY - 200} width={780} height={400} rx={36} fill={C.surface} stroke={C.rule} strokeWidth={4} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={190} x2={890} y1={boxY - 150 + i * 100} y2={boxY - 150 + i * 100} stroke={rgba(C.ink, 0.08)} strokeWidth={3} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <Lamp x={540} y={600} size={250 + 14 * kick} on={blink} color={amber} />
          <path d={tracePath(190, 890, boxY, draw, flash && frame >= hit - 4, frame)} fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </CameraLayer>
      <Hud>
        {p.label ? <FitText text={p.label} x={S.left} y={420} w={500} size={64} min={40} maxLines={1} weight={700} at={e + 4} /> : null}
        <FitText text={p.line ?? ''} x={S.left} y={1230} w={760} size={92} min={56} maxLines={1} weight={700} at={hit} anim="slam" />
      </Hud>
      <Ink marks={[{kind: flash ? 'circle' : 'underline', box: flash ? {x: 380, y: 450, w: 320, h: 300} : {x: 200, y: boxY - 30, w: 680, h: 60}, at: hit + 6}]} end={ctx.dur} />
      <Sfx name={flash ? 'asmr-haptic-warning' : 'asmr-swell'} at={Math.max(base, hit - 6)} volume={0.28} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** a cylinder in section: the piston runs, the fuel drops go in, nothing burns, they leave by the pipe */
const MisfireShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(frame, e, 'enterXL');
  const t = Math.max(0, frame - e);
  const stroke = Math.sin(t / 7);
  const py = 900 + 120 * stroke;
  const out = prog(frame, hit, 30, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g className={OBJ}>
            <path d="M330 520V1160M690 520V1160M330 520H460M560 520H690" fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
            <rect x={350} y={py} width={320} height={140} rx={16} fill={C.ink} />
            <rect x={490} y={py + 140} width={40} height={180} rx={14} fill={C.ink2} />
            <path d="M690 600H820V1240" fill="none" stroke={C.ink} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const k = prog(frame, e + 6 + i * 5, 24, ease.enter);
            const leave = out * (1 + i * 0.12);
            const x = 420 + (i % 3) * 90 + 300 * Math.min(1, leave) * (leave > 0.5 ? 1 : 0.6);
            const y = 560 + k * (py - 600) * 0.5 + Math.max(0, leave - 0.6) * 600;
            return <circle key={i} cx={x} cy={y} r={20} fill={C.ink} opacity={k * (1 - Math.max(0, leave - 1.2))} />;
          })}
        </svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: S.left, top: 420}}>
          {p.line ? <Words text={p.line} at={e + 4} fx="slam" size={96} /> : null}
        </div>
      </Hud>
      <Ink marks={[{kind: 'strike', box: {x: S.left, y: 430, w: 220, h: 90}, at: hit}]} end={ctx.dur} />
      <Sfx name="real-sputter" at={Math.max(base, e + 2)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** the pipe into the honeycomb: the drops arrive and the block heats red */
const CatShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const heat = prog(frame, e + 10, Math.max(20, hit - e), ease.enter);
  const red = tone('red');
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      cells.push(<rect key={`${r}-${c}`} x={430 + c * 76} y={720 + r * 76} width={60} height={60} rx={8} fill={red} opacity={heat * (0.35 + 0.65 * ((r + c) % 3 === 0 ? 1 : 0.6))} />);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g className={OBJ}>
            <path d="M160 910H400" stroke={C.ink} strokeWidth={60} strokeLinecap="round" />
            <rect x={400} y={690} width={440} height={440} rx={40} fill={C.surface} stroke={C.ink} strokeWidth={10 + 4 * kick} />
            {cells}
          </g>
          {[0, 1, 2, 3].map((i) => {
            const k = ((frame - e) / 30 + i / 4) % 1;
            return <circle key={i} cx={170 + 230 * k} cy={910} r={14} fill={C.surface} opacity={appear * (1 - heat * 0.6)} />;
          })}
        </svg>
      </CameraLayer>
      <Hud>
        {p.label ? <FitText text={p.label} x={S.left} y={440} w={600} size={60} min={40} maxLines={1} weight={600} t="quiet" at={e + 4} /> : null}
        <FitText text={p.line ?? ''} x={S.left} y={1210} w={760} size={110} min={60} maxLines={1} weight={700} at={hit} anim="slam" />
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** me as a silhouette: upright with the word slammed (drop), or calm with the phone beside the two lamps (calm) */
const MeShot: React.FC<{p: P; ctx: SceneCtx; calm: boolean}> = ({p, ctx, calm}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const e = Math.max(0, entrance(ctx));
  const base = lead(ctx);
  const wordAt = p.word ? cueFrame(ctx, p.word.at ?? 0) : 0;
  const hit = calm ? Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1)) : wordAt;
  const kick = useKick();
  const amber = tone('accent');
  const lift = calm ? 0 : prog(frame, wordAt, 14, ease.enter);
  const fx = calm ? 360 : 540;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={-80} y={-80} width={1240} height={2080} fill={C.bg} />
          <rect x={-80} y={1330} width={1240} height={700} fill={rgba(C.ink, 0.05)} />
          {calm ? null : <circle cx={540} cy={840} r={300 + 60 * lift + 20 * kick} fill={amber} opacity={0.16 * lift} />}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <SilFigure uid={`${uid}me`} look={LOOK} seed={ME_SEED} x={fx} y={1330} size={calm ? 820 : 860} frame={frame} turn={calm ? 0.6 : 0.55} pose={calm ? 'phoneLook' : 'confident'} face={calm ? 'neutral' : 'cool'} hold={calm ? 'phone' : null} />
          {calm ? (
            <>
              <Lamp x={780} y={640} size={170} on={1} color={amber} />
              <Lamp x={780} y={940} size={170} on={Math.floor(Math.max(0, frame - e) / 9) % 2 === 0 ? 1 : 0.15} color={amber} />
            </>
          ) : null}
        </svg>
      </CameraLayer>
      <Hud>
        {p.word ? (
          <div style={{position: 'absolute', left: 0, width: 1080, top: 420, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={`*${p.word.text}*`} at={wordAt} fx="slam" size={150} />
          </div>
        ) : null}
      </Hud>
      {calm ? (
        <Ink
          marks={[
            {kind: 'tick', box: {x: 880, y: 600, w: 70, h: 70}, at: e + 10},
            {kind: 'strike', box: {x: 690, y: 900, w: 180, h: 80}, at: hit},
          ]}
          end={ctx.dur}
        />
      ) : null}
      <Land at={Math.max(base, hit)} />
      <Haptic kind="rigid" at={Math.max(base, hit + 2)} volume={0.3} />
    </PictureBand>
  );
};

/** the fuel cap seen from above: it turns a last quarter and clicks home, a tick lands */
const CapShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const turn = -70 + 70 * prog(frame, e + 4, Math.max(8, hit - e - 4), ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g className={OBJ} transform={`rotate(${turn.toFixed(2)} 540 860) translate(540 860) scale(${(1 + 0.04 * kick).toFixed(4)})`}>
            <circle r={300} fill={C.surface} stroke={C.ink} strokeWidth={14} />
            <circle r={230} fill="none" stroke={C.rule} strokeWidth={8} />
            <rect x={-170} y={-45} width={340} height={90} rx={45} fill={C.ink} />
          </g>
        </svg>
      </CameraLayer>
      <Ink marks={[{kind: 'tick', box: {x: 760, y: 520, w: 150, h: 130}, at: hit}]} end={ctx.dur} />
      <Sfx name="cc0-click-soft" at={Math.max(base, hit)} volume={0.4} />
      <Haptic kind="rigid" at={Math.max(base, hit)} volume={0.3} />
    </PictureBand>
  );
};

/** the hurt (the hook): me slumped at the left, a hand to the head, the big lamp blinking beside him; the claim already
 *  up at frame 0 */
const HurtShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const amber = tone('accent');
  const blink = Math.floor(frame / 8) % 2 === 0 ? 1 : 0.15;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={-80} y={-80} width={1240} height={2080} fill={C.bg} />
          <rect x={-80} y={1330} width={1240} height={700} fill={rgba(C.ink, 0.05)} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <SilFigure uid={`${uid}me`} look={LOOK} seed={ME_SEED} x={330} y={1330} size={700} frame={frame} turn={0.8} pose="facepalm" face="worried" />
          <Lamp x={770} y={930} size={260} on={blink} color={amber} />
        </svg>
      </CameraLayer>
      <Hud>
        <FitText text={p.line ?? ''} x={S.left} y={S.top} w={S.right - S.left} size={130} min={90} maxLines={2} weight={700} anim="none" />
      </Hud>
      <Haptic kind="light" at={8} volume={0.25} />
    </PictureBand>
  );
};

export const V136LampTwo: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const s = p.shot ?? 'steady';
  if (s === 'hurt') return <HurtShot p={p} ctx={ctx} />;
  if (s === 'cap') return <CapShot p={p} ctx={ctx} />;
  if (s === 'drop' || s === 'calm') return <MeShot p={p} ctx={ctx} calm={s === 'calm'} />;
  if (s === 'misfire') return <MisfireShot p={p} ctx={ctx} />;
  if (s === 'cat') return <CatShot p={p} ctx={ctx} />;
  return <SignalShot p={p} ctx={ctx} flash={s === 'flash'} />;
};
