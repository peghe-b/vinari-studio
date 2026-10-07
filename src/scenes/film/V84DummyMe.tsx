// src/scenes/film/V84DummyMe.tsx: v84-dummy-me's own visual. An underground car park, the parked car seen from behind,
// and "me"'s hand holding a phone in the foreground. On the key moment the thumb presses the one round button: the
// button fills green with a check, and a viewfinder's four corners snap in from wide around the car and lock on it,
// as if the phone had just bookmarked the car itself. The punch words land in the HUD.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, carBox, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Handset, HandGrip} from '../illo/handset';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  body?: CarBody;
  paint?: number;
  time?: 'day' | 'night' | 'dusk';
  sleeve?: number;
};

const GROUND = 1060;
const CAR_X = 320;
const CAR_LEN = 980;
const PH_X = 730;
const PH_Y = 800;
const PH_W = 300;

/** Four corner brackets around a box, `open` 0..1 pushes them out from the box. */
const Corners: React.FC<{x: number; y: number; w: number; h: number; spread: number; color: string; width: number; arm: number}> = ({x, y, w, h, spread, color, width, arm}) => {
  const d = spread * 120;
  const pts = [
    [x - d, y - d, 1, 1],
    [x + w + d, y - d, -1, 1],
    [x - d, y + h + d, 1, -1],
    [x + w + d, y + h + d, -1, -1],
  ];
  return (
    <g>
      {pts.map(([px, py, sx, sy], i) => (
        <path key={i} d={`M${px} ${py + sy * arm}L${px} ${py}L${px + sx * arm} ${py}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

export const V84DummyMe: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const tone = p.tone ?? 'up';
  const body = p.body ?? 'hatch';
  const box = carBox('rear', body, CAR_LEN);
  // the thumb reaches down just before the hit, presses, and lifts again
  const reach = prog(frame, hit - 8, 8, ease.enter);
  const lift = prog(frame, hit + 6, 10, ease.enter);
  const thumb = Math.max(0, reach - 0.7 * lift);
  const press = spr(frame, hit, 'tap');
  const saved = frame >= hit ? 1 : 0;
  // the viewfinder: shown wide from the entrance, snaps onto the car on the hit
  const show = prog(frame, e + 4, 12, ease.enter);
  const snap = spr(frame, hit, 'land');
  const spread = 1 - Math.min(1, snap);
  const lock = saved ? 1 : 0;
  const cornerColor = lock ? toneBig(tone) : rgba(C.ink, 0.55);
  // the car's tail lights answer the lock with one short double flash
  const flash = frame >= hit + 3 && frame < hit + 21 ? ((frame - hit - 3) % 9 < 5 ? 1 : 0) : 0;
  const carTop = GROUND - box.h;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="garage" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={GROUND} width={1320} height={FOOT - GROUND} fill={C.il2} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={box.w * 0.6} ry={22} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={CAR_LEN} view="rear" body={body} paint={p.paint ?? 2} frame={frame} time={time} lights={{tail: 0.25 + 0.75 * flash}} />
          <g opacity={show}>
            <Corners x={CAR_X - box.w / 2 - 24} y={carTop - 24} w={box.w + 48} h={box.h + 48} spread={spread} color={cornerColor} width={lock ? 7 : 5} arm={56} />
          </g>
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <HandGrip uid={uid} part="back" x={PH_X} y={PH_Y} w={PH_W} tilt={-8} frame={frame} time={time} sleeve={p.sleeve ?? 6} />
          <Handset
            uid={uid}
            x={PH_X}
            y={PH_Y}
            w={PH_W}
            tilt={-8}
            frame={frame}
            time={time}
            lit={prog(frame, e, 8)}
            screen={(w, h) => {
              const cx = w / 2;
              const cy = h * 0.52;
              const r = w * 0.27 * (1 - 0.08 * press * (1 - lift));
              return (
                <g>
                  <rect x={0} y={0} width={w} height={h} fill={C.screen} />
                  <circle cx={cx} cy={cy} r={w * 0.36} fill="none" stroke={rgba(C.ink, 0.12)} strokeWidth={3} />
                  <circle cx={cx} cy={cy} r={r} fill={saved ? toneBig(tone) : C.ink} />
                  {saved ? (
                    <path d={`M${cx - r * 0.38} ${cy + r * 0.02}L${cx - r * 0.1} ${cy + r * 0.3}L${cx + r * 0.42} ${cy - r * 0.3}`} fill="none" stroke={C.screen} strokeWidth={w * 0.04} strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d={`M${cx - r * 0.2} ${cy + r * 0.42}V${cy - r * 0.42}H${cx + r * 0.08}A${r * 0.22} ${r * 0.22} 0 0 1 ${cx + r * 0.08} ${cy}H${cx - r * 0.2}`} fill="none" stroke={C.screen} strokeWidth={w * 0.035} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </g>
              );
            }}
          />
          <HandGrip uid={uid} part="front" x={PH_X} y={PH_Y} w={PH_W} tilt={-8} frame={frame} time={time} sleeve={p.sleeve ?? 6} thumb={thumb} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'აქ *დგას*'} at={hit + 2} fx="slam" size={92} punchTone={tone} />
        </div>
      </Hud>
      <Sfx name="asmr-tap" at={Math.max(base, hit)} volume={0.5} />
      <Sfx name="asmr-camera" at={Math.max(base, hit + 3)} volume={0.35} />
      <Land at={hit + 2} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
