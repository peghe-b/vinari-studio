// V47CarAlarm: a mall car park from above, every car the same outline. You stand in the aisle and cannot tell
// which one is yours; you press the alarm, one car blinks and rings out, and every passer-by turns to look at you.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  searchAt?: number | string; // the gaze sweeps the rows
  alarmAt?: number | string; // the alarm: one car blinks and rings
  lookAt?: number | string; // everyone turns to you
  shyAt?: number | string; // you shrink a little
  tone?: Tone;
};

const COLS = [230, 354, 478, 602, 726, 850];
const ROWS = [540, 800, 1060];
const CW = 76;
const CH = 132;
const TARGET_COL = 4;
const TARGET_ROW = 0;
const YOU_X = 540;
const YOU_Y = 930;
// passers-by in the aisles: x, y, first heading (degrees, 0 = up)
const PEOPLE = [
  [180, 670, 90],
  [410, 660, 200],
  [660, 680, 20],
  [900, 670, 250],
  [270, 935, 300],
  [800, 925, 60],
  [920, 1200, 330],
  [150, 1200, 140],
];

/** One car from above: body, windscreen, rear window, mirrors. */
const Car: React.FC<{x: number; y: number; draw: number; stroke: string; w: number}> = ({x, y, draw, stroke, w}) => {
  const per = 2 * (CW + CH);
  return (
    <g transform={`translate(${x - CW / 2} ${y - CH / 2})`} opacity={Math.min(1, draw * 2)}>
      <rect x={0} y={0} width={CW} height={CH} rx={22} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
      <path d={`M 10 ${CH * 0.3} Q ${CW / 2} ${CH * 0.22} ${CW - 10} ${CH * 0.3}`} fill="none" stroke={stroke} strokeWidth={w * 0.8} opacity={draw} />
      <path d={`M 12 ${CH * 0.8} Q ${CW / 2} ${CH * 0.86} ${CW - 12} ${CH * 0.8}`} fill="none" stroke={stroke} strokeWidth={w * 0.8} opacity={draw} />
      <line x1={-5} y1={CH * 0.33} x2={0} y2={CH * 0.33} stroke={stroke} strokeWidth={w} opacity={draw} />
      <line x1={CW} y1={CH * 0.33} x2={CW + 5} y2={CH * 0.33} stroke={stroke} strokeWidth={w} opacity={draw} />
    </g>
  );
};

export const V47CarAlarm: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'accent';
  const hot = toneBig(tone);

  const draw = prog(frame, e, 30, ease.drawOn);
  const search = Math.max(base + 6, cueFrame(ctx, p.searchAt ?? 1));
  const alarm = Math.max(search + 12, cueFrame(ctx, p.alarmAt ?? 2));
  const look = Math.max(alarm + 12, cueFrame(ctx, p.lookAt ?? 3));
  const shy = Math.max(look + 10, cueFrame(ctx, p.shyAt ?? 4));

  // the gaze: a soft cone from you sweeping left and right, until the alarm
  const sweepT = (frame - search) / 30;
  const sweepOn = prog(frame, search, 10) * (1 - prog(frame, alarm, 8));
  const sweep = Math.sin(sweepT * 2.2) * 62;

  // the alarm: lights blink, three rings go out
  const tx = COLS[TARGET_COL];
  const ty = ROWS[TARGET_ROW];
  const since = frame - alarm;
  const blink = frame >= alarm ? (Math.floor(since / 6) % 2 === 0 ? 1 : 0.25) : 0;
  const rings = [0, 12, 24].map((d) => {
    const t = prog(frame, alarm + d, 34, ease.camera);
    return {r: 50 + 330 * t, o: frame >= alarm + d ? (1 - t) * 0.8 : 0};
  });
  const carTone = frame >= alarm ? interpolateMix(prog(frame, alarm, 8)) : 0;

  // everyone turns to you
  const turn = spr(frame, look, 'land');
  const lines = prog(frame, look + 4, 20, ease.drawOn);
  const shrink = spr(frame, shy, 'land');
  const youR = lerp(20, 13, shrink);

  // the camera: a slow drift, then a push towards you once they look
  const drift = lerp(1, 1.04, prog(frame, e, ctx.dur, ease.camera));
  const push = lerp(1, 1.14, prog(frame, look, 40, ease.camera));
  const ox = lerp(540, YOU_X, prog(frame, look, 40, ease.camera));
  const oy = lerp(L.contentMid, YOU_Y, prog(frame, look, 40, ease.camera));

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${drift * push})`, transformOrigin: `${ox}px ${oy}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* bay lines */}
          {ROWS.map((ry, r) =>
            [0, 1, 2, 3, 4, 5, 6].map((k) => {
              const x = COLS[0] - 62 + k * 124;
              return <line key={`b${r}-${k}`} x1={x} y1={ry - 80} x2={x} y2={ry + 80} stroke={C.rule} strokeWidth={1.5} opacity={draw * 0.8} />;
            }),
          )}
          {/* the gaze */}
          {sweepOn > 0 ? (
            <g transform={`translate(${YOU_X} ${YOU_Y}) rotate(${sweep})`} opacity={sweepOn}>
              <path d="M 0 0 L -120 -330 A 350 350 0 0 1 120 -330 Z" fill={rgba(C.ink, 0.07)} stroke={rgba(C.ink, 0.25)} strokeWidth={1.2} />
            </g>
          ) : null}
          {/* the cars */}
          {ROWS.map((ry, r) =>
            COLS.map((cx, c) => {
              const isT = r === TARGET_ROW && c === TARGET_COL;
              const d = prog(frame, e + (r * 6 + c) * 1.2, 22, ease.drawOn);
              return <Car key={`c${r}-${c}`} x={cx} y={ry} draw={d} stroke={isT && carTone > 0 ? hot : C.ink2} w={isT && carTone > 0 ? 2.4 : 1.8} />;
            }),
          )}
          {/* the alarm */}
          {rings.map((g, i) => (
            <circle key={`r${i}`} cx={tx} cy={ty} r={g.r} fill="none" stroke={hot} strokeWidth={2} opacity={g.o} />
          ))}
          {[[-26, -58], [26, -58], [-26, 58], [26, 58]].map(([dx, dy], i) => (
            <circle key={`l${i}`} cx={tx + dx} cy={ty + dy} r={9} fill={hot} opacity={blink} />
          ))}
          {/* sightlines */}
          {PEOPLE.map(([x, y], i) => {
            const len = Math.hypot(YOU_X - x, YOU_Y - y) - 34;
            return (
              <line key={`s${i}`} x1={x} y1={y} x2={YOU_X} y2={YOU_Y} stroke={rgba(C.ink, 0.35)} strokeWidth={1.4} strokeDasharray={`${len * lines} 2000`} />
            );
          })}
          {/* passers-by */}
          {PEOPLE.map(([x, y, h], i) => {
            const toYou = (Math.atan2(YOU_X - x, -(YOU_Y - y)) * 180) / Math.PI;
            let delta = toYou - h;
            while (delta > 180) delta -= 360;
            while (delta < -180) delta += 360;
            const a = h + delta * turn;
            const pop = prog(frame, e + 8 + i * 2, 14, ease.camera);
            return (
              <g key={`p${i}`} transform={`translate(${x} ${y}) rotate(${a})`} opacity={pop}>
                <circle cx={0} cy={0} r={14} fill={C.bg} stroke={C.ink} strokeWidth={2} />
                <path d="M -6 -12 L 0 -24 L 6 -12" fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
              </g>
            );
          })}
          {/* you */}
          <circle cx={YOU_X} cy={YOU_Y} r={youR + 16} fill="none" stroke={rgba(C.ink, 0.5)} strokeWidth={1.5} opacity={draw} />
          <circle cx={YOU_X} cy={YOU_Y} r={youR} fill={C.ink} opacity={draw} />
        </svg>
      </div>
      <Sfx name="asmr-pencil" at={base + 1} volume={0.35} />
      <Sfx name="asmr-air-long" at={search} volume={0.3} />
      <Sfx name="asmr-swell" at={alarm} volume={0.45} />
      <Sfx name="asmr-pop" at={alarm + 1} volume={0.45} />
      <Sfx name="asmr-pop" at={alarm + 13} volume={0.35} />
      <Sfx name="asmr-pop" at={alarm + 25} volume={0.3} />
      <Haptic kind="light" at={alarm} />
      <Sfx name="asmr-knock" at={look} volume={0.4} />
      <Haptic kind="light" at={look} />
      <Sfx name="asmr-tick-fine" at={shy} volume={0.35} />
    </PictureBand>
  );
};

/** 0..1 → the car's switch to the alarm colour (a step once it has started). */
const interpolateMix = (t: number) => (t > 0 ? 1 : 0);
