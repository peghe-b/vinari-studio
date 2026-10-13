// v103-old-adapter: the old OBD adapter that lay forgotten in a drawer finds its job.
// staging "drawer": a desk drawer slides open on a tangle of junk (keys, a ticket, a wrench, a cable); on the hit the
//   junk sinks into the dark, the adapter lifts out of it, turns square to us and its small lamp wakes in the accent.
// staging "port": under the dashboard at knee height, the trapezoid OBD-II socket; the adapter rises from below and
//   seats on the hit, the camera kicks, its lamp blinks on.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx} from '../common';
import {C, L, accentsOn, halo, rgba, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, springIn} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Prop} from '../illo/props';
import {FOOT, IlloBand, Svg, TOP, osc} from '../illo/scene';
import {Solid, Shadow, poly, rr} from '../illo/solid';
import {acc, accRamp} from '../illo/palette';

type P = {
  look?: 'illustrated';
  part?: 'drawer' | 'port';
  hitAt?: number | string;
  line?: string;
  label?: string;
  tone?: Tone;
};

const CX = 540;

const lampColor = () => (accentsOn() ? acc('a') : C.ink);

/** The adapter, drawn around its centre, plug up. `led` 0..1 wakes its lamp. */
const Adapter: React.FC<{uid: string; x: number; y: number; s: number; rot: number; led: number}> = ({uid, x, y, s, rot, led}) => {
  const col = lampColor();
  const body = accentsOn() ? accRamp(acc('b'), 5) : undefined;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`}>
      {/* the plug: a trapezoid with its metal tongue */}
      <Solid uid={uid} d={poly([[-50, -84], [50, -84], [42, -128], [-42, -128]])} tone={2} rim />
      {Array.from({length: 8}, (_, i) => (
        <rect key={i} x={-34 + i * 9.4} y={-122} width={4} height={14} rx={1} fill={rgba(C.ink, 0.35)} />
      ))}
      {/* the body */}
      <Solid uid={uid} d={rr(-62, -90, 124, 168, 26)} tone={5} fill={body} rim outline />
      <path d="M -40 -50 H 40" stroke={rgba(C.ink, 0.18)} strokeWidth={3} strokeLinecap="round" />
      <path d="M -40 -38 H 40" stroke={rgba(C.ink, 0.12)} strokeWidth={3} strokeLinecap="round" />
      {/* the lamp */}
      <circle cx={0} cy={30} r={30} fill={halo(col, 0.5 * led)} />
      <circle cx={0} cy={30} r={9} fill={led > 0.05 ? col : rgba(C.ink, 0.25)} opacity={0.35 + 0.65 * led} />
    </g>
  );
};

/** A desk drawer slides open on old junk; on the hit the adapter rises out of it. */
const Drawer: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const clip = `v103clip${uid.replace(/[^A-Za-z0-9]/g, '')}`;
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const opened = spr(frame, e, 'enterXL');
  const lift = springIn(prog(frame, hit, 18, ease.enter));
  const dim = prog(frame, hit, 12, ease.enter);
  const led = frame < hit + 8 ? 0 : 0.6 + 0.4 * (0.5 + 0.5 * osc(frame, 26));
  // the drawer: the inside floor in perspective, its front panel below
  const front = 1060 + 90 * opened;
  const back = front - 520 * opened;
  const floor = poly([[230, back], [850, back], [960, front], [120, front]]);
  const ax = 610 + (CX - 610) * lift;
  const ay = back + 300 * opened + (720 - (back + 300 * opened)) * lift;
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il7} />
          {/* the desk top, edge to edge */}
          <Solid uid={uid} d={rr(-200, 560, 1480, FOOT - 560, 0)} tone={6} time="night" />
          <path d={`M -200 560 H 1280`} stroke={rgba(C.ink, 0.1)} strokeWidth={2} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <defs>
            <clipPath id={clip}>
              <path d={floor} />
            </clipPath>
          </defs>
          <Solid uid={uid} d={floor} tone={7} shade="flat" time="night" />
          {/* the drawer's inner walls */}
          <path d={`M 230 ${back} L 120 ${front} M 850 ${back} L 960 ${front}`} stroke={rgba(C.ink, 0.14)} strokeWidth={3} />
          <g clipPath={`url(#${clip})`}>
            {/* a tangled cable */}
            <path
              d={`M 160 ${front - 40} C 300 ${back + 120}, 420 ${front - 10}, 520 ${back + 200} S 760 ${front - 30}, 920 ${back + 140}`}
              fill="none"
              stroke={C.il4}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <Prop item="keys" x={300} y={back + 230 * opened} scale={26} frame={frame} time="night" rotate={-20} uid={uid} />
            <Prop item="ticket" x={790} y={back + 160 * opened} scale={24} frame={frame} time="night" rotate={14} uid={uid} />
            <Prop item="wrench" x={420} y={back + 420 * opened} scale={24} frame={frame} time="night" rotate={-60} uid={uid} />
            <rect x={-100} y={TOP} width={1280} height={FOOT - TOP} fill={rgba(C.bg, 0.55 * dim)} />
          </g>
          {/* the front panel and its handle */}
          <Solid uid={uid} d={rr(80, front, 920, 230, 18)} tone={5} rim time="night" />
          <Solid uid={uid} d={rr(400, front + 90, 280, 26, 13)} tone={2} rim time="night" />
          <Shadow uid={uid} cx={ax} cy={ay + 120 + 40 * lift} rx={90 * (1 - 0.5 * lift)} />
          <Adapter uid={uid} x={ax} y={ay} s={1 + 0.75 * lift} rot={-32 * (1 - lift)} led={led} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 450, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ნაპოვნია*'} at={hit} fx="slam" size={104} punchTone={p.tone ?? 'a'} />
        </div>
      </Hud>
      <Sfx name="asmr-paper" at={Math.max(base, e + 2)} volume={0.4} />
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

/** Under the dashboard: the adapter rises and seats in the socket. */
const Port: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  // the socket's mouth at SY; the adapter's plug top sits at its centre minus 128 * scale
  const SY = 760;
  const S = 1.9;
  const seatY = SY + 128 * S - 20;
  const approach = prog(frame, e, Math.max(1, hit - e), ease.drift);
  const seat = springIn(prog(frame, hit - 6, 8, ease.whipOut));
  const pre = 1500 + (seatY + 130 - 1500) * approach;
  const y = pre + (seatY - pre) * seat;
  const led = frame < hit + 6 ? 0 : 0.55 + 0.45 * (0.5 + 0.5 * osc(frame, 22));
  const col = lampColor();
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il7} />
          {/* the footwell's floor far below */}
          <Solid uid={uid} d={rr(-200, 1240, 1480, FOOT - 1240, 0)} tone={6} time="night" />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {/* the lower dash panel with its curved edge */}
          <Solid uid={uid} d={`M -200 ${TOP} H 1280 V 980 C 1000 1040, 760 1000, 540 1010 C 300 1020, 80 1060, -200 1000 Z`} tone={5} time="night" rim />
          {/* the steering column coming in from the top */}
          <Solid uid={uid} d={rr(330, TOP, 210, 520 - TOP, 60)} tone={4} time="night" rim />
          {/* the socket: a trapezoid with two rows of eight pins */}
          <Solid uid={uid} d={poly([[CX - 112, SY - 46], [CX + 112, SY - 46], [CX + 96, SY + 46], [CX - 96, SY + 46]])} tone={7} shade="flat" time="night" />
          <path d={poly([[CX - 112, SY - 46], [CX + 112, SY - 46], [CX + 96, SY + 46], [CX - 96, SY + 46]])} fill="none" stroke={rgba(C.ink, 0.4)} strokeWidth={2.5} />
          {Array.from({length: 16}, (_, i) => (
            <circle key={i} cx={CX - 77 + (i % 8) * 22} cy={SY - 16 + Math.floor(i / 8) * 30} r={5} fill={rgba(C.ink, 0.5)} />
          ))}
          <circle cx={CX} cy={SY} r={170} fill={halo(col, 0.25 * led)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Adapter uid={uid} x={CX} y={y} s={S} rot={0} led={led} />
        </Svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? 'OBD-II'} at={Math.max(base, e + 4)} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top}} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 520, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*დაჯდა*'} at={hit} fx="slam" size={104} punchTone={p.tone ?? 'a'} />
        </div>
      </Hud>
      <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.45} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </IlloBand>
  );
};

export const V103OldAdapter: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.part === 'port' ? <Port p={p} ctx={ctx} /> : <Drawer p={p} ctx={ctx} />);
