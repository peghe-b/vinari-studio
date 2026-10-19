// src/scenes/film/V110MissedTurn.tsx: v110-missed-turn's own picture. The road not taken: the car rolls left along a
// dusk street seen from the side; the side street it should have taken slides under it, and a translucent ghost of the
// same car (the route it was told) peels off into that street, shrinking away from us in rear view, while the real car
// goes straight on. In "reroute" the ghost comes back ahead of the car, glowing in the accent, and leads the new way.
//   "scene": {"type": "Film", "name": "V110MissedTurn", "look": "illustrated", "mode": "miss" | "reroute", "time": "dusk",
//             "hitAt": 1, "line": "*მარჯვნივ*?"}
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, halo, rgba} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, carBox, type CarBody} from '../illo/car';
import {Backdrop, type BackdropKind} from '../illo/backdrop';
import {SpeedLines} from '../illo/fx';
import {acc, dark, lamp} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'miss' | 'reroute';
  hitAt?: number | string;
  line?: string;
  body?: CarBody;
  where?: BackdropKind;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1180; // where the car's wheels stand (stage y)
const FAR = GROUND - 78; // the road's far curb: where the side street joins
const CAR_X = 600;
const CAR_LEN = 760;
const S = 20; // stage px the world passes a frame
const DEEP = 250; // how far up the side street runs into the city

/** The side street: a wedge of asphalt running from the far curb into the city, its centre dashes, and the sign. */
const SideStreet: React.FC<{x: number; asphalt: string; line: string; lit: number}> = ({x, asphalt, line, lit}) => {
  const topY = FAR - DEEP;
  const sx = x + 200;
  const a = acc('a');
  return (
    <g>
      <polygon points={`${x - 190},${FAR + 2} ${x + 190},${FAR + 2} ${x + 58},${topY} ${x - 58},${topY}`} fill={asphalt} />
      {[0, 1, 2, 3].map((i) => {
        const t0 = i / 4;
        const t1 = t0 + 0.12;
        const y0 = FAR - DEEP * t0;
        const y1 = FAR - DEEP * t1;
        return <line key={i} x1={x} y1={y0} x2={x} y2={y1} stroke={line} strokeWidth={6 - i * 1.2} strokeLinecap="round" opacity={0.7} />;
      })}
      {/* the sign: a post and a plate with the turn arrow, the arrow lit in the accent until the turn is gone */}
      <rect x={sx - 4} y={FAR - 230} width={8} height={232} rx={3} fill={line} opacity={0.8} />
      <rect x={sx - 62} y={FAR - 330} width={124} height={110} rx={18} fill={rgba(C.il7, 0.92)} stroke={lit > 0 ? a : line} strokeWidth={4} />
      <path
        d={`M${sx - 22} ${FAR - 240} V${FAR - 285} Q${sx - 22} ${FAR - 300} ${sx - 6} ${FAR - 300} H${sx + 18} M${sx + 6} ${FAR - 314} L${sx + 24} ${FAR - 300} L${sx + 6} ${FAR - 286}`}
        fill="none"
        stroke={lit > 0 ? a : line}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5 + 0.5 * lit}
      />
    </g>
  );
};

export const V110MissedTurn: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const time = timeOf(p);
  const night = dark(time);
  const body = p.body ?? 'ev';
  const reroute = p.mode === 'reroute';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const asphalt = night ? C.il6 : C.il3;
  const ground = night ? C.il7 : C.il2;
  const line = lamp(time);
  const scroll = -frame * S;
  // miss: the side street reaches the car on the hit; it comes from ahead (the left) and slides off to the right
  const streetX = CAR_X - S * (hit - frame);
  // the ghost: from the car, up the side street, shrinking and fading (rear view: it turns away from us)
  const peel = prog(frame, hit - 6, 26, ease.inOut);
  const gLen = CAR_LEN * (1 - 0.62 * peel);
  const gY = FAR + 30 - (DEEP - 40) * peel;
  const gX = streetX;
  const lit = reroute ? 1 : frame < hit + 18 ? 1 : 1 - prog(frame, hit + 18, 10);
  // reroute: the ghost rises ahead of the car and leads, glowing
  const lead2 = prog(frame, e + 4, 22, ease.inOut);
  const glow = prog(frame, hit, 14, ease.inOut);
  const ghostX = CAR_X - 420 * lead2;
  const lights = {head: night ? 1 : 0.4, tail: night ? 1 : 0.3, beam: night ? 0.6 : 0};
  const box = carBox('side', body, CAR_LEN);
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind={p.where ?? 'highway'} uid={uid} frame={frame} time={time} scroll={scroll * 0.5} base={FAR} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={FAR} width={1480} height={FOOT - FAR} fill={asphalt} />
          <rect x={-200} y={GROUND + 150} width={1480} height={FOOT - GROUND - 150} fill={ground} />
          <rect x={-200} y={GROUND + 146} width={1480} height={6} fill={line} opacity={0.35} />
          {/* lane dashes, passing */}
          {Array.from({length: 9}, (_, i) => {
            const x = ((((i * 240 - scroll) % 2160) + 2160) % 2160) - 300;
            return <rect key={i} x={x} y={GROUND + 58} width={120} height={8} rx={4} fill={line} opacity={0.55} />;
          })}
          {!reroute && streetX > -500 && streetX < 1600 ? <SideStreet x={streetX} asphalt={asphalt} line={line} lit={lit} /> : null}
          {!reroute && peel > 0 && peel < 1 ? (
            <g opacity={0.55 * (1 - peel)}>
              <Car uid={uid} x={gX} y={gY} len={gLen} view="rear" body={body} paint="a" frame={frame} time={time} lights={{tail: 1}} shadow={false} />
            </g>
          ) : null}
          {reroute ? (
            <g opacity={0.5 * lead2}>
              <ellipse cx={ghostX} cy={GROUND + 4} rx={box.w * 0.55} ry={34} fill={halo(acc('a'), 0.28 + 0.3 * glow)} />
              <Car uid={uid} x={ghostX} y={GROUND} len={CAR_LEN} body={body} paint="a" dir={-1} frame={frame} speed={0.7} time={time} lights={{head: 1, left: glow}} shadow={false} />
            </g>
          ) : null}
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 4} rx={box.w * 0.52} ry={20} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={CAR_LEN} body={body} paint="a" dir={-1} frame={frame} speed={0.7} time={time} lights={lights} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <SpeedLines frame={frame} dir={1} speed={0.8} time={time} opacity={0.45} box={{x: 0, y: GROUND + 170, w: 1080, h: 200}} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 500, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*მარჯვნივ*'} at={hit} fx="slam" size={104} punchTone="neutral" />
        </div>
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 14)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
