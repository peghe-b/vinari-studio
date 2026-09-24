import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, rand, spr} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, isLight, L, rgba} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, Haptic, inSpeech, lead, Sfx, vary} from './common';

type P = {
  labels?: string[]; // the sound categories, default ["კაკუნი","ჭრიალი","გუგუნი"]
  pick?: number; // index that lights up (optional; without it the meters keep weighing)
  at?: number; // chunk where the pick lights up
  caption?: string; // mono line under the chips, e.g. "ნაწილს არ ვასახელებთ"
  sound?: boolean; // false = the recording stays silent (default: it sounds like its kind, see recordingSounds)
};

// Never a duration on screen and never a car part: only the character of the sound.
const MIC = {x: 540, y: 516, r: 82};
const WAVE_Y = 774;
const WAVE_H = 180;
const HEAD_X = 812;
const X0 = L.side;
const STEP = 12;
const SPEED = 0.5; // samples per frame
const CHIP_Y = 944;
const KNOCK = 11; // a knock recording spikes every 11 samples
const FIRST = 96; // the sample at the playhead on the scene's first frame
const quiet = 12; // frames before the pick with no sound of the recording: the pick's own knock follows

/** Frame (relative to the scene) at which sample s reaches the playhead and is fully drawn. */
const arrives = (s: number, base: number) => base + Math.ceil((s - FIRST) / SPEED) + 1;

/** The sounds of the recording itself, one per event of its shape, until just before the pick:
 *  knock = asmr-knock on every spike, squeal = a fine tick on every crest, hum = a soft swell on
 *  every rise. Softer while the voice speaks. Frames before 0 (a first scene's lead) stay silent. */
const recordingSounds = (kind: number, base: number, until: number) => {
  const out: {name: string; at: number; volume: number}[] = [];
  const s0 = FIRST + Math.max(0, -base) * SPEED; // the first sample that arrives on screen
  const s1 = FIRST + (until - base) * SPEED;
  if (kind === 0) {
    for (let s = Math.ceil(s0 / KNOCK) * KNOCK, i = 0; s <= s1; s += KNOCK, i++) out.push({name: 'asmr-knock', at: arrives(s, base), volume: 0.36 * vary(i, 0.1)});
  } else if (kind === 1) {
    // crests of 0.34 + 0.14 sin(1.9 s): every 2 pi / 1.9 samples
    for (let n = Math.ceil((s0 * 1.9 - Math.PI / 2) / (2 * Math.PI)), i = 0; ; n++, i++) {
      const s = (Math.PI / 2 + 2 * Math.PI * n) / 1.9;
      if (s > s1) break;
      out.push({name: 'asmr-tick-fine', at: arrives(s, base), volume: 0.2 * vary(i, 0.3)});
    }
  } else {
    // troughs of sin(0.19 s): the swell rises from each one for half a period (about 1.1 s)
    for (let n = Math.ceil((s0 * 0.19 - 1.5 * Math.PI) / (2 * Math.PI)), i = 0; ; n++, i++) {
      const s = (1.5 * Math.PI + 2 * Math.PI * n) / 0.19;
      if (s > s1) break;
      out.push({name: 'asmr-swell', at: arrives(s, base), volume: 0.3 * vary(i, 0.15)});
    }
  }
  return out.filter((c) => c.at >= 0 && c.at <= until);
};

/** 0..1 level of recorded sample s. The shape follows the category that will be picked:
 *  knock = periodic impulses, squeal = dense narrow tone, hum = slow smooth swell. */
const amp = (s: number, kind: number) => {
  const n = rand(s * 1.7 + 0.3);
  if (kind === 1) return Math.min(1, (0.34 + 0.14 * Math.sin(s * 1.9) + 0.2 * n) * (0.75 + 0.25 * Math.sin(s * 0.07)));
  if (kind === 2) return 0.14 + 0.5 * (0.5 + 0.5 * Math.sin(s * 0.19)) * (0.55 + 0.45 * Math.sin(s * 0.043 + 1)) + 0.05 * n;
  const ph = ((s % 11) + 11) % 11;
  return 0.1 + 0.1 * n + 0.8 * Math.exp(-ph / 1.25) * (0.72 + 0.28 * rand(s * 3.1));
};

// A line-art microphone listening (rings leave it every 0.8 s), a live waveform scrolling
// into a playhead like a voice memo, and three outlined chips whose thin meters keep
// weighing the sound. At `at` the recording stops, the waveform settles bright from left to
// right, and the picked chip fills with ink while the other two step back.
export const Wave: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const labels = p.labels ?? ['კაკუნი', 'ჭრიალი', 'გუგუნი'];
  const hasPick = p.pick !== undefined && p.pick >= 0 && p.pick < labels.length;
  const kind = hasPick ? Math.min(2, p.pick as number) : 0;
  const pickAt = hasPick ? Math.max(base + 30, p.at !== undefined ? cueFrame(ctx, p.at) : base + 50) : Infinity;
  const listening = frame < pickAt;

  const circle = prog(frame, base, 18, ease.drawOn);
  const micIn = spr(frame, base + 4);
  const waveIn = prog(frame, base + 2, 14);
  const settled = hasPick ? prog(frame, pickAt, 20, ease.enter) : 0;

  // waveform: bar j = j samples behind the playhead; frozen once the pick lands
  const tRec = Math.min(frame, pickAt) - base;
  const scroll = 96 + tRec * SPEED;
  const sN = Math.floor(scroll);
  const frac = scroll - sN;
  // after the pick: a slow read-head glides over the frozen recording every 1.4 s
  const scanT = hasPick && frame > pickAt + 20 ? ((frame - pickAt - 20) % 42) / 42 : -1;
  const scanX = X0 + scanT * (HEAD_X - X0);
  const bars: React.ReactNode[] = [];
  for (let j = 0; j < 80; j++) {
    const x = HEAD_X - (j + (listening ? frac : 0)) * STEP;
    if (x < X0) break;
    const s = sN - j;
    const grow = j === 0 && listening ? frac : 1;
    const h = Math.max(6, amp(s, kind) * WAVE_H * grow);
    const age = (x - X0) / (HEAD_X - X0);
    const fade = 0.18 + 0.82 * Math.pow(age, 0.9);
    // after the pick a bright front crosses the recording left to right
    const front = settled > 0 ? Math.max(0, Math.min(1, (settled * 1.3 - (1 - age) * 0.3) * 1.2)) : 0;
    const wipe = Math.max(0, Math.min(1, (x - X0) / (HEAD_X - X0) - (1 - waveIn) * 1.2 + 0.2));
    const near = scanT >= 0 ? Math.max(0, 1 - Math.abs(x - scanX) / 70) * Math.sin(scanT * Math.PI) : 0;
    // once picked, the bars that make the pattern stay bright, the rest step back
    const a = amp(s, kind);
    const rest = a >= 0.5 ? 0.95 : 0.4;
    const op = Math.min(1, (fade + (rest - fade) * front) * Math.min(1, wipe * 3) + 0.3 * near);
    bars.push(<line key={j} x1={x} x2={x} y1={WAVE_Y - h / 2} y2={WAVE_Y + h / 2} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={op} />);
  }

  // listening rings
  const rings: number[] = [];
  for (let k = 0; k < 60; k++) {
    const t = base + k * 24;
    if (t > frame || t > pickAt) break;
    if (frame - t < 38) rings.push(t);
  }

  // meters under the chips: deterministic jitter while listening, then the pick fills
  const meter = (i: number) => {
    const live = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / (7 + i * 2.3) + i * 2.1)) + 0.15 * rand(Math.floor(frame / 3) * 7 + i);
    const bias = i === kind && hasPick ? 0.12 : 0;
    const target = hasPick ? (i === p.pick ? 1 : 0) : live;
    return live + bias + (target - live - bias) * settled;
  };

  const chipsIn = base + 6;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* microphone in a hairline circle */}
        {rings.map((t) => {
          const q = (frame - t) / 38;
          return <circle key={t} cx={MIC.x} cy={MIC.y} r={MIC.r + 6 + q * 96} fill="none" stroke={C.ink} strokeWidth={1.5} opacity={0.42 * Math.pow(1 - q, 1.4)} />;
        })}
        {/* live level: an inner hairline that swells with the newest sample */}
        <circle cx={MIC.x} cy={MIC.y} r={MIC.r - 14 + (listening ? amp(sN, kind) * 12 : 0)} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={0.28 * circle} />
        <circle
          cx={MIC.x}
          cy={MIC.y}
          r={MIC.r}
          fill="none"
          stroke={C.ink}
          strokeOpacity={0.85}
          strokeWidth={2}
          strokeDasharray={2 * Math.PI * MIC.r}
          strokeDashoffset={2 * Math.PI * MIC.r * (1 - circle)}
          transform={`rotate(-90 ${MIC.x} ${MIC.y})`}
        />
        <g opacity={micIn} transform={`translate(${MIC.x} ${MIC.y + (1 - micIn) * 10}) scale(${1 + 0.03 * (listening ? Math.sin(frame / 6) : 0)})`} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round">
          <rect x={-19} y={-44} width={38} height={60} rx={19} />
          <line x1={-6} x2={6} y1={-26} y2={-26} strokeWidth={1.6} opacity={0.6} />
          <line x1={-6} x2={6} y1={-16} y2={-16} strokeWidth={1.6} opacity={0.6} />
          <line x1={-6} x2={6} y1={-6} y2={-6} strokeWidth={1.6} opacity={0.6} />
          <path d="M -32 -2 A 32 32 0 0 0 32 -2" />
          <line x1={0} x2={0} y1={30} y2={44} />
          <line x1={-16} x2={16} y1={44} y2={44} />
        </g>

        {/* waveform, centre hairline, playhead */}
        <line x1={X0} x2={1080 - L.side} y1={WAVE_Y} y2={WAVE_Y} stroke={C.rule} strokeWidth={1} opacity={0.5 * waveIn} />
        <line x1={HEAD_X + 16} x2={1080 - L.side} y1={WAVE_Y} y2={WAVE_Y} stroke={C.ink2} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" opacity={waveIn * (1 - settled)} />
        {bars}
        {scanT >= 0 ? (
          <line x1={scanX} x2={scanX} y1={WAVE_Y - WAVE_H / 2 - 22} y2={WAVE_Y + WAVE_H / 2 + 22} stroke={C.ink} strokeWidth={1.2} opacity={0.32 * Math.sin(scanT * Math.PI)} />
        ) : null}
        <g opacity={waveIn * (1 - 0.7 * settled)}>
          <line x1={HEAD_X} x2={HEAD_X} y1={WAVE_Y - WAVE_H / 2 - 26} y2={WAVE_Y + WAVE_H / 2 + 14} stroke={C.ink} strokeWidth={2} />
          <circle cx={HEAD_X} cy={WAVE_Y - WAVE_H / 2 - 30} r={7} fill={C.ink} />
          {listening ? <circle cx={HEAD_X} cy={WAVE_Y - WAVE_H / 2 - 30} r={7 + 8 * ((frame % 30) / 30)} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={0.5 * (1 - (frame % 30) / 30)} /> : null}
        </g>
      </svg>

      {/* category chips with meters */}
      <div style={{position: 'absolute', top: CHIP_Y, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22}}>
        {labels.map((lab, i) => {
          const s = spr(frame, chipsIn + i * 3);
          const isPick = hasPick && i === p.pick;
          const lit = isPick ? spr(frame, pickAt, 'land') : 0;
          const back = hasPick && !isPick ? settled : 0;
          const m = Math.max(0, Math.min(1, meter(i)));
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                opacity: s * (1 - 0.55 * back),
                transform: `translateY(${(1 - s) * 18}px) scale(${1 + 0.05 * Math.sin(Math.min(1, lit) * Math.PI)})`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  fontFamily: F.sans,
                  fontWeight: 500,
                  fontSize: 40,
                  lineHeight: 1,
                  padding: '18px 30px 22px',
                  borderRadius: 999,
                  border: `2px solid ${isPick && lit > 0.02 ? C.ink : C.rule}`,
                  color: lit > 0.5 ? C.onInk : C.ink,
                  background: rgba(C.ink, 0.94 * Math.min(1, lit)),
                  boxShadow: lit > 0.02 && !isLight() ? `0 0 ${36 * Math.min(1, lit)}px ${rgba(C.ink, 0.28)}` : undefined,
                  whiteSpace: 'nowrap',
                }}
              >
                {lab}
              </div>
              {/* meter: a hairline under the chip that keeps weighing the sound */}
              <div style={{position: 'absolute', left: 24, right: 24, top: '100%', marginTop: 16, height: 2, background: rgba(C.rule, 0.35)}}>
                <div style={{width: `${m * 100}%`, height: 2, background: C.ink, opacity: 0.85}} />
              </div>
            </div>
          );
        })}
      </div>
      {p.caption ? (
        <div style={{position: 'absolute', top: CHIP_Y + 122, left: L.side, right: L.side, textAlign: 'center', fontFamily: F.mono, fontSize: 26, letterSpacing: '0.05em', color: C.ink3, opacity: prog(frame, (hasPick ? pickAt : base + 20) + 12, 12)}}>
          {capsLatin(p.caption)}
        </div>
      ) : null}

      <Sfx name="asmr-tap" at={base + 4} volume={0.36} /* event: the microphone opens */ />
      <Haptic kind="light" at={base + 4} volume={0.36} /* event: the finger on the record button */ />
      {p.sound === false
        ? null
        : recordingSounds(kind, base, Math.min(pickAt, ctx.dur) - quiet).map((c, i) => (
            <Sfx key={`rec${i}`} name={c.name} at={c.at} volume={c.volume * (inSpeech(ctx, c.at) ? 0.6 : 1)} /* event: the recording's own sound reaches the playhead */ />
          ))}
      {hasPick ? <Sfx name="asmr-knock" at={pickAt} volume={0.5} /* event: recording stops, the picked category fills with ink */ /> : null}
      {hasPick ? <Haptic kind="light" at={pickAt} volume={0.42} /* event: the chip is picked */ /> : null}
    </>
  );
};
