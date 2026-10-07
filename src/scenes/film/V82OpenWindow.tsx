// src/scenes/film/V82OpenWindow.tsx: v82-open-window's own picture. A night street in the rain, close on a parked
// sedan whose side window was left half down: the rain runs straight into the cabin and onto the seat. On the key
// moment the downpour thickens, the camera kicks and the punch word lands; then a passer-by walks in under the rain,
// stops and points at the open window (the next shot is the card he scans).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Rain, FaceFx} from '../illo/fx';
import {tone} from '../illo/palette';
import {FOOT, IlloBand, Svg} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string; // the rain thickens, the punch word lands
  walkAt?: number | string; // the passer-by walks in
  line?: string;
  tone?: Tone;
  cast?: Cast;
  body?: CarBody;
};

const GROUND = 1200;
const CAR_X = 610;
const CAR_LEN = 900;
const WALK_FROM = -160;
const WALK_TO = 270;

/** The cabin seen through the side glass: the dark inside, a headrest, the glass lowered to half, rain falling in. */
const OpenGlass: React.FC<{box: {x: number; y: number; w: number; h: number}; frame: number; rain: number; wet: number}> = ({box, frame, rain, wet}) => {
  const edge = box.y + box.h * 0.58; // the lowered glass's top edge
  const head = {x: box.x + box.w * 0.62, y: box.y + box.h * 0.42};
  return (
    <g>
      {/* the cabin: open air above the glass, a shade darker than the glass */}
      <rect x={box.x - 20} y={box.y - 20} width={box.w + 40} height={box.h + 40} fill={C.bg} />
      {/* the seat's headrest and back, catching the street light, wetter as the water comes in */}
      <rect x={head.x - 50} y={head.y - 40} width={100} height={74} rx={28} fill={tone(3.2 + 0.8 * wet)} />
      <rect x={head.x - 70} y={head.y + 42} width={140} height={box.h} rx={32} fill={tone(3.6 + 0.8 * wet)} />
      <path d={`M${head.x - 30} ${head.y - 22} q 30 -14 60 0`} fill="none" stroke={rgba(C.il0, 0.4 + 0.4 * wet)} strokeWidth={2.6} strokeLinecap="round" />
      {/* the rain coming in through the gap */}
      <Rain frame={frame} seed={21} n={Math.round(24 + 30 * rain)} box={{x: box.x, y: box.y - 40, w: box.w, h: edge - box.y + 40}} ground={edge} slant={14} speed={0.9 + 0.5 * rain} time="night" color={C.il0} />
      {/* the lowered pane: a glass sheet with its top edge catching the light */}
      <rect x={box.x - 20} y={edge} width={box.w + 40} height={box.h} fill={rgba(C.il0, 0.32)} />
      <line x1={box.x - 20} y1={edge} x2={box.x + box.w + 20} y2={edge} stroke={rgba(C.il0, 0.9)} strokeWidth={4} />
      {/* water on the sill, running down the inside */}
      {[0.2, 0.44, 0.7].map((k, i) => {
        const len = 30 * wet * (0.6 + 0.4 * Math.sin(frame / 11 + i * 2));
        return <line key={i} x1={box.x + box.w * k} y1={edge + 4} x2={box.x + box.w * k} y2={edge + 6 + Math.max(0, len)} stroke={rgba(C.il0, 0.4)} strokeWidth={2.2} strokeLinecap="round" />;
      })}
    </g>
  );
};

export const V82OpenWindow: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const walk = Math.max(hit + 20, cueFrame(ctx, p.walkAt ?? 3));
  const time = 'night' as const;
  const rain = 0.35 + 0.65 * prog(frame, hit - 2, 14, ease.enter); // the downpour thickens on the hit
  const wet = prog(frame, e, Math.max(30, ctx.dur - e), (t: number) => t);
  const stride = prog(frame, walk, 34, ease.enter);
  const meX = WALK_FROM + (WALK_TO - WALK_FROM) * stride;
  const stopped = frame >= walk + 34;
  return (
    <IlloBand uid={uid} time={time}>
      {/* far: the night street, slower than the car */}
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND - 40} />
          <Rain frame={frame} seed={7} n={70} slant={10} speed={0.7} time={time} opacity={0.55} />
        </Svg>
      </CameraLayer>
      {/* subject: the wet street, its reflections and the car with the window down */}
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il7} />
          {/* streetlight puddles: soft wet strips on the asphalt, nothing that ends on a line */}
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={260 + i * 300} cy={GROUND + 120 + i * 70} rx={170 - i * 20} ry={10} fill={rgba(C.il0, 0.06 + 0.03 * Math.sin(frame / 9 + i))} />
          ))}
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={440} ry={22} />
          <Car
            uid={uid}
            x={CAR_X}
            y={GROUND}
            len={CAR_LEN}
            body={p.body ?? 'sedan'}
            paint={2}
            dir={1}
            frame={frame}
            time={time}
            lights={{}}
            cabin={(box) => <OpenGlass box={box} frame={frame} rain={rain} wet={wet} />}
          />
          <Rain frame={frame} seed={3} n={Math.round(60 + 70 * rain)} slant={12} speed={1 + 0.4 * rain} ground={GROUND + 6} time={time} />
        </Svg>
      </CameraLayer>
      {/* foreground: the passer-by walking in under the rain, then pointing at the window */}
      <CameraLayer depth={1.3}>
        <Svg>
          {frame >= walk - 1 ? (
            <>
              <Shadow uid={uid} cx={meX} cy={GROUND + 52} rx={100} />
              <Figure
                uid={uid}
                cast={p.cast ?? 'friend'}
                x={meX}
                y={GROUND + 50}
                size={600}
                frame={frame}
                time={time}
                acts={[
                  {at: walk, face: 'neutral', pose: 'walk', turn: 0.4},
                  {at: walk + 34, face: 'shock', pose: 'point', turn: 0.6},
                ]}
              />
              {stopped ? <FaceFx kind="shock" frame={frame} x={meX + 60} y={GROUND - 560} size={100} at={walk + 36} time={time} uid={uid} /> : null}
            </>
          ) : null}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 500, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ღიაა*'} at={hit} fx="slam" size={120} punchTone={p.tone ?? 'down'} />
        </div>
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
      <Sfx name="asmr-paper" at={walk + 2} volume={0.18} />
      <Haptic kind="light" at={walk + 34} volume={0.25} />
    </IlloBand>
  );
};
