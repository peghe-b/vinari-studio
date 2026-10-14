// V105RikotiNazuki: the Rikoti road to grandma's. Shot "dream": the car climbs away from us on the mountain road, a
// thought bubble over it holds a warm nazuki loaf; on the hit the loaf bursts and the engine light takes its place in
// the same ochre, the brake lights flare. Shot "home": the loaf is real, on a little roadside counter, the driver and
// his grandma on either side, the steam rising.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Burst, Smoke} from '../illo/fx';
import {Icon} from '../illo/icons';
import {acc, accRamp, ground} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'dream' | 'home';
  hitAt?: number | string;
  line?: string;
  body?: CarBody;
  time?: 'day' | 'night' | 'dusk';
  me?: Cast;
  gran?: Cast;
};

const GROUND = 1060;

/** A nazuki loaf: a domed oval in the ochre ramp, a darker crust line and three scored cuts. */
const Loaf: React.FC<{x: number; y: number; s: number; k?: 'a' | 'b'}> = ({x, y, s, k = 'b'}) => {
  const col = acc(k);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={10} rx={96} ry={22} fill={accRamp(col, 5)} opacity={0.35} />
      <path d="M-96 8 C-96 -46 -48 -64 0 -64 C48 -64 96 -46 96 8 C96 22 60 26 0 26 C-60 26 -96 22 -96 8 Z" fill={accRamp(col, 3)} />
      <path d="M-80 -6 C-74 -40 -40 -54 0 -54 C40 -54 70 -42 78 -18" fill="none" stroke={accRamp(col, 1.6)} strokeWidth={10} strokeLinecap="round" opacity={0.7} />
      <path d="M-96 8 C-96 22 -60 26 0 26 C60 26 96 22 96 8" fill="none" stroke={accRamp(col, 5)} strokeWidth={5} />
      {[-40, 0, 40].map((cx, i) => (
        <path key={i} d={`M${cx - 14} -40 Q${cx} -30 ${cx + 14} -42`} fill="none" stroke={accRamp(col, 4.6)} strokeWidth={5} strokeLinecap="round" />
      ))}
    </g>
  );
};

const Dream: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 2));
  const time = timeOf(p);
  const kick = useKick();
  const on = frame >= hit;
  const bub = spr(frame, e + 4, 'enter');
  const pop = prog(frame, hit, 10, ease.whipOut);
  const icon = spr(frame, hit, 'land');
  const BX = 540;
  const BY = 600;
  const bob = Math.sin(frame / 14) * 6;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={GROUND} drift={0.4} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={ground(time)} />
          {/* the road climbing away, a dashed centre line streaming toward us */}
          <polygon points={`470,${GROUND} 610,${GROUND} 1180,${FOOT} -100,${FOOT}`} fill={C.il5} />
          {Array.from({length: 7}, (_, i) => {
            const t = ((i + frame / 18) % 7) / 7;
            const y0 = GROUND + (FOOT - GROUND) * t * t;
            const y1 = GROUND + (FOOT - GROUND) * Math.min(1, (t + 0.06) * (t + 0.06));
            const w = 3 + 16 * t;
            return <polygon key={i} points={`${540 - w / 4},${y0} ${540 + w / 4},${y0} ${540 + w / 2},${y1} ${540 - w / 2},${y1}`} fill={C.il1} opacity={0.9} />;
          })}
          <Shadow uid={uid} cx={540} cy={1302} rx={300} ry={18} />
          <Car uid={uid} x={540} y={1300} len={740} view="rear" body={p.body ?? 'ev'} paint="a" frame={frame} time={time} lights={{tail: 0.4, brake: on ? 1 : 0}} />
          {/* the thought trail: three small dots up to the bubble */}
          {[
            [600, 1000, 12],
            [620, 930, 18],
            [600, 850, 26],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y + bob * 0.5} r={r * Math.min(1, spr(frame, e + 2 * i, 'enter'))} fill={C.surface} stroke={C.il4} strokeWidth={2} />
          ))}
          <g transform={`translate(${BX} ${BY + bob}) scale(${(bub * (1 - 0.15 * pop)).toFixed(4)})`}>
            <ellipse cx={0} cy={0} rx={250} ry={190} fill={C.surface} stroke={C.il4} strokeWidth={2.5} />
          </g>
          {!on && <Loaf x={BX} y={BY + 30 + bob} s={1.55 * Math.min(bub, spr(frame, base + 6, 'land'))} />}
          {!on && <Smoke frame={frame} x={BX} y={BY - 40 + bob} at={cueFrame(ctx, 1)} n={6} size={0.9} time={time} uid={uid} />}
          {on && <Burst frame={frame} x={BX} y={BY + bob} r={230} at={hit} uid={uid} time={time} />}
          {on && <Icon name="engine" x={BX} y={BY + bob} size={210 * icon * (1 + 0.08 * kick)} color={acc('b')} />}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, width: 1080, top: 360, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit + 4} fx="slam" size={96} punchTone="a" /> : null}
        </div>
      </Hud>
      <Sfx name="asmr-pop" at={Math.max(base, e + 6)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

const Home: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const G = 1300;
  const slide = spr(frame, e, 'enter');
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={G - 120} drift={0.15} seed={3} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={G - 120} width={1480} height={FOOT - G + 120} fill={ground(time)} />
          {/* a small wooden counter between them, the loaves on it */}
          <Shadow uid={uid} cx={540} cy={G + 2} rx={190} ry={14} />
          <rect x={400} y={G - 230} width={280} height={230} rx={10} fill={C.il4} />
          <rect x={386} y={G - 246} width={308} height={22} rx={8} fill={C.il5} />
          <g transform={`translate(0 ${((1 - slide) * 40).toFixed(1)})`} opacity={slide}>
            <Loaf x={480} y={G - 262} s={0.62} />
            <Loaf x={600} y={G - 262} s={0.62} />
            <Loaf x={540} y={G - 300} s={0.7} />
          </g>
          <Smoke frame={frame} x={540} y={G - 330} at={e} time={time} uid={uid} size={0.8} />
          <Shadow uid={uid} cx={250} cy={G + 2} rx={100} />
          <Figure
            uid={uid}
            cast={p.me ?? {is: 'me'}}
            x={250}
            y={G}
            size={660}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'smile', pose: 'offer', turn: 0.5},
              {at: hit, face: 'laugh', pose: 'thumbsUp', turn: 0.4},
            ]}
          />
          <Shadow uid={uid} cx={830} cy={G + 2} rx={100} />
          <Figure
            uid={uid}
            cast={p.gran ?? {is: 'grandma'}}
            x={830}
            y={G}
            size={600}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'smile', pose: 'stand', turn: -0.5},
              {at: hit, face: 'smile', pose: 'wave', turn: -0.45},
            ]}
          />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-paper" at={Math.max(base, e + 2)} volume={0.28} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </IlloBand>
  );
};

export const V105RikotiNazuki: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'home' ? <Home p={p} ctx={ctx} /> : <Dream p={p} ctx={ctx} />);
