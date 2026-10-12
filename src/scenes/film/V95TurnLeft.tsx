// src/scenes/film/V95TurnLeft.tsx: v95's own picture. A crossroads seen straight from above, the city blocks and their
// trees around it; an electric crossover in the film's accent drives up the right lane with its right indicator blinking,
// the turn arrow painted on the asphalt lights up as the voice says the turn, and the car takes the corner on the hit.
// In the HUD the voice's name and a small live waveform: the navigator talking.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, F, L, accentsOn, rgba, toneLine} from '../../tokens';
import {prog, ease} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Car, type CarBody} from '../illo/car';
import {FOOT, IlloBand, Svg, TOP} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated';
  hitAt?: number | string; // the turn: the arrow lights, the car turns in
  voice?: string; // the HUD's name of the voice
  body?: CarBody;
};

// the crossroads (stage units): a road up the middle, a road across
const VX0 = 440;
const VX1 = 700;
const HY0 = 870;
const HY1 = 1130;
const LANE_X = 630; // the northbound right lane
const LANE_Y = 1060; // the eastbound right lane
const R = 140; // the corner's radius
const TURN_Y = LANE_Y + R; // where the turn starts
const ARC = (Math.PI / 2) * R;

// the blocks around the crossroads: [x, y, w, h, shade]
const BLOCKS: [number, number, number, number, number][] = [
  [-120, -200, 500, 380, 2],
  [-120, 230, 250, 560, 3],
  [180, 230, 210, 260, 2],
  [180, 540, 210, 270, 3],
  [760, -200, 440, 300, 3],
  [760, 160, 200, 300, 2],
  [1010, 160, 200, 640, 2],
  [760, 520, 200, 280, 3],
  [-120, 1190, 300, 360, 2],
  [230, 1190, 160, 520, 3],
  [-120, 1600, 300, 500, 3],
  [760, 1190, 230, 330, 2],
  [760, 1580, 450, 520, 3],
  [1040, 1190, 200, 340, 3],
];
// trees along the pavements: [x, y, r]
const TREES: [number, number, number][] = [
  [410, 120, 22],
  [410, 380, 24],
  [410, 640, 20],
  [730, 300, 22],
  [730, 700, 24],
  [410, 1260, 22],
  [410, 1560, 24],
  [730, 1300, 20],
  [730, 1640, 24],
  [180, 840, 20],
  [900, 840, 22],
  [960, 1160, 20],
];

/** Where the car is, s px along its way relative to the turn's start: [x, y, heading in degrees]. */
const along = (s: number): [number, number, number] => {
  if (s <= 0) return [LANE_X, TURN_Y - s, 0];
  if (s <= ARC) {
    const t = s / R;
    return [LANE_X + R - R * Math.cos(t), TURN_Y - R * Math.sin(t), (t * 180) / Math.PI];
  }
  return [LANE_X + R + (s - ARC), LANE_Y, 90];
};

export const V95TurnLeft: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const kick = useKick();
  // the car: steady up the lane, a little slower through the corner, out along the cross street
  const v = 7.2;
  const s = frame < hit ? v * (frame - hit) : v * (frame - hit) * (0.85 + 0.15 * prog(frame, hit + 20, 20, ease.enter));
  const [cx, cy, hd] = along(s);
  const lit = prog(frame, hit - 4, 8, ease.enter); // the arrow lights on the voice's turn
  const arrowCol = accentsOn() ? toneLine('a') : C.ink;
  const asphalt = C.il5;
  const kerb = C.il1;
  const markCol = rgba(C.il0, 0.9);
  // the waveform in the HUD: alive while the voice talks
  const talking = ctx.speech.some((sp) => frame >= sp[0] && frame <= sp[1]) ? 1 : 0.25;
  const bars = Array.from({length: 9}, (_, i) => 10 + 34 * talking * Math.abs(Math.sin(frame / (3 + (i % 3)) + i * 1.7)));
  return (
    <IlloBand uid={uid} time="day">
      {/* the ground and the blocks, depth 0.6 */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il2} />
          {BLOCKS.map((b, i) => (
            <g key={i}>
              <rect x={b[0] + 14} y={b[1] + 18} width={b[2]} height={b[3]} rx={18} fill={rgba(C.il7, 0.18)} />
              <rect x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={18} fill={b[4] === 2 ? C.il1 : C.il3} stroke={C.il4} strokeWidth={1.5} />
              <rect x={b[0] + 24} y={b[1] + 24} width={Math.max(0, b[2] - 48)} height={Math.max(0, b[3] - 48)} rx={10} fill="none" stroke={rgba(C.il4, 0.6)} strokeWidth={1.2} />
            </g>
          ))}
        </Svg>
      </CameraLayer>
      {/* the roads, the arrow and the car, depth 1 */}
      <CameraLayer depth={1}>
        <Svg>
          {/* pavements, then asphalt */}
          <rect x={VX0 - 36} y={TOP} width={VX1 - VX0 + 72} height={FOOT - TOP} fill={kerb} />
          <rect x={-200} y={HY0 - 36} width={1480} height={HY1 - HY0 + 72} fill={kerb} />
          <rect x={VX0} y={TOP} width={VX1 - VX0} height={FOOT - TOP} fill={asphalt} />
          <rect x={-200} y={HY0} width={1480} height={HY1 - HY0} fill={asphalt} />
          {/* the centre lines, stopping at the crossing */}
          {Array.from({length: 22}, (_, i) => TOP + i * 110)
            .filter((y) => y + 60 < HY0 - 40 || y > HY1 + 40)
            .map((y, i) => (
              <rect key={`v${i}`} x={(VX0 + VX1) / 2 - 4} y={y} width={8} height={60} rx={3} fill={markCol} />
            ))}
          {Array.from({length: 14}, (_, i) => -200 + i * 110)
            .filter((x) => x + 60 < VX0 - 40 || x > VX1 + 40)
            .map((x, i) => (
              <rect key={`h${i}`} x={x} y={(HY0 + HY1) / 2 - 4} width={60} height={8} rx={3} fill={markCol} />
            ))}
          {/* zebra crossings on the four sides */}
          {Array.from({length: 6}, (_, i) => (
            <g key={`z${i}`} fill={rgba(C.il0, 0.75)}>
              <rect x={VX0 + 14 + i * 42} y={HY1 + 10} width={24} height={50} rx={3} />
              <rect x={VX0 + 14 + i * 42} y={HY0 - 60} width={24} height={50} rx={3} />
              <rect x={VX0 - 60} y={HY0 + 14 + i * 42} width={50} height={24} rx={3} />
              <rect x={VX1 + 10} y={HY0 + 14 + i * 42} width={50} height={24} rx={3} />
            </g>
          ))}
          {/* the turn arrow painted in the right lane, lit on the hit */}
          <g transform={`translate(${LANE_X} 1330)`}>
            <path d="M-12 120 V10 Q-12 -30 28 -30 H40 V-58 L86 -14 L40 30 V2 H32 Q16 2 16 18 V120 Z" fill={rgba(C.il0, 0.85)} />
            <path
              d="M-12 120 V10 Q-12 -30 28 -30 H40 V-58 L86 -14 L40 30 V2 H32 Q16 2 16 18 V120 Z"
              fill={arrowCol}
              opacity={lit}
              transform={`scale(${(1 + 0.08 * kick).toFixed(3)})`}
            />
          </g>
          {/* the corner it takes, a faint guide that fills as it goes */}
          <path
            d={`M${LANE_X} ${TURN_Y + 160} V${TURN_Y} A${R} ${R} 0 0 1 ${LANE_X + R} ${LANE_Y} H${LANE_X + R + 420}`}
            fill="none"
            stroke={arrowCol}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="2 26"
            opacity={0.55 * lit}
          />
          {/* trees over the pavements */}
          {TREES.map((t, i) => (
            <g key={`t${i}`}>
              <circle cx={t[0] + 6} cy={t[1] + 8} r={t[2] * 1.3} fill={rgba(C.il7, 0.1)} />
              <circle cx={t[0]} cy={t[1]} r={t[2] * 1.3} fill={C.il3} />
              <circle cx={t[0] - t[2] * 0.3} cy={t[1] - t[2] * 0.3} r={t[2] * 0.7} fill={C.il2} />
            </g>
          ))}
          <Shadow uid={uid} cx={cx + 10} cy={cy + 12} rx={hd > 45 ? 150 : 70} ry={hd > 45 ? 60 : 140} k={0.8} />
          <Car uid={uid} x={cx} y={cy} len={300} view="top" body={p.body ?? 'ev'} paint="a" heading={hd} frame={frame} speed={0.3} lights={{right: frame < hit + 28 ? 1 : 0}} />
        </Svg>
      </CameraLayer>
      {/* the HUD: the voice's name and its live waveform */}
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: L.camSafe.left, top: 430, opacity: prog(frame, e, 10, ease.enter), display: 'flex', alignItems: 'center', gap: 18, padding: '14px 24px', borderRadius: 40, backgroundColor: C.surface, boxShadow: `0 6px 24px ${rgba(C.il7, 0.18)}`}}>
          <svg width={9 * 10} height={48}>
            {bars.map((h, i) => (
              <rect key={i} x={i * 10 + 2} y={24 - h / 2} width={5} height={h} rx={2.5} fill={C.ink} />
            ))}
          </svg>
          <span style={{fontWeight: 600, fontSize: 40, fontFamily: F.sans, color: C.ink, whiteSpace: 'nowrap'}}>{mtav(p.voice ?? 'ალისა')}</span>
        </div>
      </Hud>
      <Sfx name="asmr-pop" at={Math.max(base, hit)} volume={0.3} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </IlloBand>
  );
};
