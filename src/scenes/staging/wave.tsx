// Wave's other pictures of the recording (the default "mic", a microphone and a voice-memo waveform, lives in
// Wave.tsx). The chips, their meters, the caption and every sound stay Wave's own; the recording's shape is the
// same amp(sample, kind) and the same timing, so the pick lands on the same frame.
//   radial  the sound around a ring: the newest sample at the top, the older ones turning away clockwise, the
//           ring breathing with the level; at the pick the pattern's spikes stay bright and the ring turns slowly
//   seismo  a pen writing the sound on a strip of paper that runs to the left (ruled lines, time ticks); at the
//           pick the pen lifts and the strokes that make the pattern stay dark
import React from 'react';
import {lerp} from '../../lib/anim';
import {C} from '../../tokens';
import {amp} from '../Wave';

type St = {frame: number; base: number; kind: number; scroll: number; listening: boolean; settled: number; waveIn: number; hasPick: boolean; pickAt: number};

// ---- radial ----------------------------------------------------------------------------------------------------
const RC = {x: 540, y: 650};
const R0 = 150;
const RL = 128; // the longest spike
const N = 96; // spikes around the ring (the last 96 samples)
export const Radial: React.FC<St> = ({frame, base, kind, scroll, listening, settled, waveIn}) => {
  const sN = Math.floor(scroll);
  const turn = settled > 0 ? (frame % 900) * 0.12 * settled : 0;
  const draw = Math.min(1, (frame - base + 8) / 18);
  const spikes: React.ReactNode[] = [];
  for (let j = 0; j < N; j++) {
    const s = sN - j;
    const a = amp(s, kind);
    const ang = ((-90 + (j / N) * 360 + turn) * Math.PI) / 180;
    const len = Math.max(5, a * RL) * Math.min(1, waveIn * 1.4);
    const age = 1 - j / N;
    const keep = a >= 0.5 ? 1 : 0.32;
    const op = (0.2 + 0.8 * Math.pow(age, 0.8)) * (1 - settled) + keep * settled;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    spikes.push(<line key={j} x1={RC.x + c * (R0 + 10)} y1={RC.y + sn * (R0 + 10)} x2={RC.x + c * (R0 + 10 + len)} y2={RC.y + sn * (R0 + 10 + len)} stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" opacity={op * Math.min(1, j === 0 && listening ? (scroll % 1) + 0.3 : 1)} />);
  }
  const level = listening ? amp(sN, kind) : 0;
  const per = 2 * Math.PI * R0;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <circle cx={RC.x} cy={RC.y} r={R0} fill="none" stroke={C.ink} strokeOpacity={0.85} strokeWidth={2} strokeDasharray={per} strokeDashoffset={per * (1 - Math.max(0, draw))} transform={`rotate(-90 ${RC.x} ${RC.y})`} />
      <circle cx={RC.x} cy={RC.y} r={R0 - 22 + level * 16} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={0.3} />
      {/* the playhead: a tick at the top where the newest sample enters */}
      <line x1={RC.x} x2={RC.x} y1={RC.y - R0 - 8} y2={RC.y - R0 - 10 - RL - 18} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="2 8" opacity={waveIn * (1 - settled)} />
      {spikes}
      {/* the microphone in the centre */}
      <g transform={`translate(${RC.x} ${RC.y + 6}) scale(1.25)`} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" opacity={Math.max(0, draw)}>
        <rect x={-19} y={-44} width={38} height={60} rx={19} />
        <path d="M -32 -2 A 32 32 0 0 0 32 -2" />
        <line x1={0} x2={0} y1={30} y2={44} />
        <line x1={-16} x2={16} y1={44} y2={44} />
      </g>
      {listening ? <circle cx={RC.x} cy={RC.y} r={R0 + 10 + (frame % 24) * 5} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={0.3 * (1 - (frame % 24) / 24)} /> : null}
    </svg>
  );
};

// ---- seismo ----------------------------------------------------------------------------------------------------
const TOP = 520;
const BOT = 900;
const MID = (TOP + BOT) / 2;
const PEN = 770; // the pen's x
const STEP = 5; // px per sample on the paper
const AMPL = 150;
/** The trace: a squiggle whose envelope is the recording's level. */
const trace = (s: number, kind: number) => amp(s, kind) * AMPL * Math.sin(s * 2.1 + Math.sin(s * 0.37) * 2);
export const Seismo: React.FC<St> = ({frame, base, kind, scroll, listening, settled, waveIn}) => {
  const lift = settled; // the pen lifts off the paper at the pick
  const pts: string[] = [];
  const dark: React.ReactNode[] = [];
  const n = Math.ceil(PEN / STEP) + 2;
  for (let j = 0; j < n; j++) {
    const x = PEN - (j + (scroll % 1)) * STEP;
    const s = Math.floor(scroll) - j;
    const y = MID + trace(s, kind);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    if (settled > 0 && amp(s, kind) >= 0.5 && j > 0) {
      const x2 = x + STEP;
      const y2 = MID + trace(s + 1, kind);
      dark.push(<line key={j} x1={x} y1={y} x2={x2} y2={y2} stroke={C.ink} strokeWidth={3.2} strokeLinecap="round" opacity={settled} />);
    }
  }
  const penY = MID + trace(Math.floor(scroll), kind) * (1 - lift);
  const off = (scroll * STEP) % 60; // the paper's time ticks run with it
  const reveal = Math.min(1, waveIn * 1.3);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {/* the strip of paper: its edges, ruled lines, time ticks */}
      <line x1={0} x2={1080} y1={TOP} y2={TOP} stroke={C.ink} strokeWidth={2} opacity={0.8 * reveal} />
      <line x1={0} x2={1080} y1={BOT} y2={BOT} stroke={C.ink} strokeWidth={2} opacity={0.8 * reveal} />
      {[1, 2, 3, 4, 5].map((k) => (
        <line key={k} x1={0} x2={1080} y1={TOP + (k * (BOT - TOP)) / 6} y2={TOP + (k * (BOT - TOP)) / 6} stroke={C.rule} strokeWidth={1} opacity={(k === 3 ? 0.7 : 0.35) * reveal} />
      ))}
      {Array.from({length: 20}, (_, i) => {
        const x = 1080 + 60 - off - i * 60;
        const big = (Math.floor((scroll * STEP) / 60) - i) % 5 === 0;
        return <line key={i} x1={x} x2={x} y1={BOT - (big ? 26 : 12)} y2={BOT} stroke={C.ink} strokeWidth={1.2} opacity={0.5 * reveal} />;
      })}
      {/* the trace: faint while it records, the pattern's strokes dark once picked */}
      <g>
        <polyline points={pts.join(' ')} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" opacity={lerp(0.9, 0.4, settled) * reveal} />
        {dark}
      </g>
      {/* the pen: a rail across the paper, the carriage, the nib on the trace */}
      <line x1={PEN} x2={PEN} y1={TOP - 40} y2={BOT + 40} stroke={C.ink2} strokeWidth={1.5} opacity={reveal} />
      <g transform={`translate(${PEN} ${penY})`} opacity={reveal}>
        <rect x={-16} y={-30 - 18 * lift} width={32} height={22} rx={6} fill={C.bg} stroke={C.ink} strokeWidth={2.2} />
        <path d={`M -7 ${-8 - 18 * lift} L 0 ${6 - 18 * lift} L 7 ${-8 - 18 * lift}`} fill={C.ink} />
        {listening ? <circle r={9 + (frame % 12)} fill="none" stroke={C.ink} strokeWidth={1} opacity={0.35 * (1 - (frame % 12) / 12)} /> : null}
      </g>
    </svg>
  );
};
