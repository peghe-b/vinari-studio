// v73-tank-arrow: the fuel gauge's little arrow. A gauge sits close up, the needle near E; the small triangle next to
// the pump lights up; the camera pulls back, the gauge rises and a top-down car draws on under it; a dashed line runs
// from the arrow down the car's left side and the filler flap swings open there.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, toneBig, type Tone} from '../../tokens';
import {TXT} from '../../lib/layer';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  arrowAt?: number | string; // chunk where the little arrow lights up
  carAt?: number | string; // chunk where the camera pulls back and the car draws on
  flapAt?: number | string; // chunk where the line reaches the flap and it opens
  tone?: Tone;
  source?: string;
};

// the gauge, drawn around the pump icon at (540, 760); the needle's pivot at (540, 900)
const R = 250;
const CAR =
  'M 540 720 C 596 720 640 730 646 770 L 652 850 C 654 950 654 1080 650 1140 C 648 1188 610 1200 540 1200 ' +
  'C 470 1200 432 1188 430 1140 C 426 1080 426 950 428 850 L 434 770 C 440 730 484 720 540 720 Z';
const GLASS = [
  'M 440 890 Q 540 845 640 890',
  'M 440 890 L 446 1080',
  'M 640 890 L 634 1080',
  'M 446 1080 Q 540 1098 634 1080',
  'M 446 1080 L 452 1128',
  'M 634 1080 L 628 1128',
  'M 452 1128 Q 540 1142 628 1128',
];
const LIGHTS = ['M 446 752 Q 485 734 515 731', 'M 565 731 Q 595 734 634 752', 'M 438 1172 Q 480 1188 516 1192', 'M 564 1192 Q 600 1188 642 1172'];
const WHEELS = [
  [419, 790],
  [651, 790],
  [419, 1050],
  [651, 1050],
];
const FLAP_X = 428;
const FLAP_Y = 1010;
const FLAP_L = 36;

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [540 + r * Math.sin(a), 900 - r * Math.cos(a)];
};

/** The fuel gauge's arrow points to the side of the filler flap. */
export const V73TankArrow: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'accent';
  const hot = toneBig(tone);
  const arrowAt = Math.max(base + 10, cueFrame(ctx, p.arrowAt ?? 1));
  const carAt = Math.max(arrowAt + 20, cueFrame(ctx, p.carAt ?? 2));
  const flapAt = Math.max(carAt + 24, cueFrame(ctx, p.flapAt ?? 3));

  // the gauge: drawn on, the needle settles near E, a slow push in, then the pull back
  const draw = prog(frame, e, 24, ease.drawOn);
  const needle = lerp(-60, -47, spr(frame, e + 8, 'enterXL'));
  const push = prog(frame, e, Math.max(30, carAt - e), ease.camera);
  const back = spr(frame, carAt - 4, 'enterXL');
  const gs = lerp(lerp(1.0, 1.32, push), 0.7, back);
  const gy = lerp(790, 505, back);
  const lit = spr(frame, arrowAt, 'land');
  const ring = prog(frame, arrowAt, 26, ease.exit);

  // the car and the line to its flap
  const carDraw = prog(frame, carAt - 2, 22, ease.drawOn);
  const glass = prog(frame, carAt + 10, 16, ease.drawOn);
  const ax = 540 + (478 - 540) * gs;
  const ay = gy;
  const lineD = `M ${ax - 10} ${ay} L 250 ${ay} L 250 1028 L 372 1028`;
  const lineLen = ax - 10 - 250 + (1028 - ay) + 122;
  const line = prog(frame, flapAt - 12, 14, ease.drawOn);
  const swing = spr(frame, flapAt + 1, 'land');
  const capRing = prog(frame, flapAt + 1, 30, ease.exit);
  const fa = (swing * 72 * Math.PI) / 180;
  const fx = FLAP_X - FLAP_L * Math.sin(fa);
  const fy = FLAP_Y + FLAP_L * Math.cos(fa);
  const drift = lerp(0, -10, prog(frame, e, ctx.dur, ease.camera));

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const d = -60 + i * 12;
    const major = i === 0 || i === 5 || i === 10;
    const [x1, y1] = pt(d, R);
    const [x2, y2] = pt(d, R - (major ? 34 : 18));
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? C.ink : C.ink2} strokeWidth={major ? 4 : 2.4} strokeLinecap="round" opacity={draw} />);
  }
  const [ex, ey] = pt(-60, R - 70);
  const [fx2, fy2] = pt(60, R - 70);
  const [nx, ny] = pt(needle, R - 24);
  const [sx, sy] = pt(-60, R);
  const [tx, ty] = pt(60, R);
  const arrowScale = lerp(1, 1.5, lit) * lerp(1, 0.9, back);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${drift}px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(540 ${gy}) scale(${gs}) translate(-540 -760)`}>
            <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${tx} ${ty}`} fill="none" stroke={C.rule} strokeWidth={2.4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            {ticks}
            <text className={TXT} x={ex} y={ey + 14} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={40} fill={C.ink2} opacity={draw}>
              E
            </text>
            <text className={TXT} x={fx2} y={fy2 + 14} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={40} fill={C.ink2} opacity={draw}>
              F
            </text>
            {/* the pump icon */}
            <g opacity={draw} stroke={C.ink} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round">
              <rect x={520} y={734} width={32} height={52} rx={4} />
              <rect x={526} y={742} width={20} height={14} rx={2} fill={C.ink} stroke="none" />
              <path d="M 552 748 L 564 754 L 564 776 Q 564 784 571 784 Q 578 784 578 776 L 578 756 L 570 744" />
              <line x1={512} y1={790} x2={560} y2={790} />
            </g>
            {/* the little arrow: it points to the flap's side */}
            <g transform={`translate(488 760) scale(${arrowScale}) translate(-488 -760)`}>
              <circle cx={486} cy={760} r={14 + 30 * ring} fill="none" stroke={hot} strokeWidth={2} opacity={frame >= arrowAt ? (1 - ring) * 0.8 : 0} />
              <path d="M 476 760 L 496 748 L 496 772 Z" fill={frame >= arrowAt ? hot : C.ink} opacity={draw} />
            </g>
            {/* the needle */}
            <line x1={540} y1={900} x2={nx} y2={ny} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={draw} />
            <circle cx={540} cy={900} r={15} fill={C.bg} stroke={C.ink} strokeWidth={3} opacity={draw} />
          </g>

          {/* the car from above, nose up: its left is the screen's left */}
          {frame >= carAt - 2 ? (
            <g>
              {WHEELS.map(([x, y], i) => (
                <rect key={i} x={x} y={y} width={10} height={56} rx={4} fill={C.ink2} opacity={carDraw} />
              ))}
              <path d={CAR} fill={C.bg} stroke={C.ink} strokeWidth={2.4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - carDraw} strokeLinejoin="round" />
              {GLASS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={C.ink2} strokeWidth={1.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - glass} strokeLinecap="round" />
              ))}
              {LIGHTS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={C.ink} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - glass} strokeLinecap="round" />
              ))}
              <ellipse cx={424} cy={880} rx={11} ry={6} fill="none" stroke={C.ink2} strokeWidth={1.8} opacity={glass} />
              <ellipse cx={656} cy={880} rx={11} ry={6} fill="none" stroke={C.ink2} strokeWidth={1.8} opacity={glass} />
              {/* the filler flap and its cap */}
              <circle cx={FLAP_X} cy={FLAP_Y + FLAP_L / 2} r={12} fill={hot} opacity={swing} />
              <circle cx={FLAP_X} cy={FLAP_Y + FLAP_L / 2} r={12 + 34 * capRing} fill="none" stroke={hot} strokeWidth={2} opacity={frame > flapAt ? (1 - capRing) * 0.8 : 0} />
              <line x1={FLAP_X} y1={FLAP_Y} x2={fx} y2={fy} stroke={frame > flapAt ? hot : C.ink} strokeWidth={5} strokeLinecap="round" opacity={glass} />
            </g>
          ) : null}

          {/* the line from the arrow to the flap */}
          {frame >= flapAt - 16 ? (
            <g>
              <path d={lineD} fill="none" stroke={hot} strokeWidth={2.4} strokeDasharray={`${lineLen * line} ${lineLen}`} strokeLinejoin="round" strokeLinecap="round" />
              <path d="M 384 1028 L 370 1019 L 370 1037 Z" fill={hot} opacity={line >= 0.98 ? 1 : 0} />
            </g>
          ) : null}
        </svg>
      </div>
      <SourceLine text={p.source} at={carAt + 6} />
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-pop" at={arrowAt} volume={0.45} />
      <Haptic kind="light" at={arrowAt} />
      <Sfx name="asmr-air-long" at={carAt} volume={0.3} />
      <Sfx name="asmr-pencil" at={carAt + 2} volume={0.35} />
      <Sfx name="asmr-knock" at={flapAt + 1} volume={0.45} />
      <Land at={flapAt + 4} volume={0.4} />
    </PictureBand>
  );
};
