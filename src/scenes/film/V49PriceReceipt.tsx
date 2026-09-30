// V49PriceReceipt: the price as a printed receipt. A slim printer sits low in the frame; a paper strip rises out of it
// row by row, one row per live listing (a small car and a grey price bar, sorted from cheap to dear, a tick when it is
// counted). Then a dashed line, the total as tally strokes (no digits: the real count is live) and the clock with
// "today". On the last chunk the middle row lights up as the middle price and the strip is torn off, lifting a little.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  header?: string; // the receipt's first line
  total?: string; // the word before the tally
  when?: string; // the word beside the clock
  median?: string; // the label of the middle row
  rowsAt?: number | string; // chunk where the listing rows print
  footAt?: number | string; // chunk where the total and the time print
  tearAt?: number | string; // chunk where the middle row lights and the strip tears off
  tone?: Tone;
};

// stage units
const PX = 270; // the paper's left edge
const PW = 540; // the paper's width
const SLOT = 1236; // the printer's slot: the paper rises out of it
const PH = 806; // the paper's full length
const N = 9; // listing rows
const ROW0 = 118; // the first row, from the paper's top
const STEP = 54;
const MID = 4;
const BARS = [0.34, 0.41, 0.47, 0.52, 0.58, 0.63, 0.7, 0.81, 1];
const SEP = ROW0 + N * STEP + 14; // the dashed line
const FOOT1 = SEP + 34; // the tally row
const FOOT2 = FOOT1 + 66; // the clock row

export const V49PriceReceipt: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const rowsAt = Math.max(base + 8, cueFrame(ctx, p.rowsAt ?? 1));
  const footAt = Math.max(rowsAt + 20, cueFrame(ctx, p.footAt ?? 2));
  const tearAt = Math.max(footAt + 20, cueFrame(ctx, p.tearAt ?? 3));
  // the header prints on the entrance, the first rows under the first words, the rest on chunk rowsAt
  const headAt = e + 2;
  const rowAt = (i: number) => (i < 2 ? base + 6 + i * 9 : rowsAt + Math.round(((i - 2) * (footAt - rowsAt - 6)) / (N - 2)));
  const tallyAt = footAt;
  const clockAt = footAt + 12;
  // how much paper is out: a step per printed line, each a short eased feed
  const feed = (at: number, to: number, from: number) => lerp(0, to - from, prog(frame, at, 7, ease.camera));
  let out = feed(headAt, ROW0 - 6, 0);
  for (let i = 0; i < N; i++) out += feed(rowAt(i), ROW0 + (i + 1) * STEP, ROW0 + i * STEP);
  out += feed(tallyAt, FOOT1 + 50, ROW0 + N * STEP);
  out += feed(clockAt, PH, FOOT1 + 50);
  out = Math.max(40, out);
  // the tear: the strip leaves the slot and lifts a little
  const tear = spr(frame, tearAt + 6, 'land');
  const lit = spr(frame, tearAt, 'enter');
  const topY = SLOT - out - tear * 26;
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const line = toneBig(tone);

  const hdr = mtav(p.header ?? 'ბაზარი');
  const total = mtav(p.total ?? 'სულ');
  const when = mtav(p.when ?? 'დღეს');
  const med = mtav(p.median ?? 'შუა ფასი');
  const medSize = Math.min(30, Math.floor((30 * 150) / Math.max(1, textWidth(med, `600 30px ${F.sans}`))));

  // the zigzag the tear leaves at the paper's foot
  const zig = (() => {
    let d = `M 0 ${PH - 8}`;
    for (let k = 0; k <= 27; k++) d += ` L ${(k * PW) / 27} ${PH - 8 + (k % 2 === 0 ? 0 : 10) * tear}`;
    return d + ` L ${PW} 0 L 0 0 Z`;
  })();

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '540px 900px'}}>
        {/* the paper, cut at the slot on a hard line */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SLOT, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: PX, top: topY, width: PW, height: PH, transform: `rotate(${-1.2 * tear}deg)`, transformOrigin: `${PW / 2}px ${PH}px`}}>
            <svg width={PW} height={PH + 12} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              <path d={zig} fill={C.surface} stroke={C.rule} strokeWidth={1.5} strokeLinejoin="round" />
              <line x1={34} x2={PW - 34} y1={ROW0 - 22} y2={ROW0 - 22} stroke={C.rule} strokeWidth={1.5} />
              {BARS.map((b, i) => {
                const y = ROW0 + i * STEP + STEP / 2;
                const on = prog(frame, rowAt(i), 8, ease.camera);
                const tick = prog(frame, rowAt(i) + 6, 8, ease.drawOn);
                const isMid = i === MID;
                const hot = isMid ? lit : 0;
                return (
                  <g key={i} opacity={on}>
                    {isMid ? <rect x={14} y={y - STEP / 2 + 5} width={PW - 28} height={STEP - 10} rx={10} fill={rgba(line, 0.14 * hot)} stroke={rgba(line, 0.8 * hot)} strokeWidth={1.5} /> : null}
                    {/* a small car in profile */}
                    <g transform={`translate(40 ${y - 12})`} stroke={isMid && hot > 0.5 ? line : C.ink2} strokeWidth={1.8} fill="none" strokeLinejoin="round">
                      <path d="M 2 16 L 2 10 Q 3 7 8 7 L 14 1 L 30 1 L 38 7 Q 44 8 44 12 L 44 16" />
                      <circle cx={12} cy={18} r={4} />
                      <circle cx={35} cy={18} r={4} />
                    </g>
                    <rect x={108} y={y - 7} width={lerp(0, 250 * b, on)} height={14} rx={7} fill={isMid ? interpolateTone(C.ink2, line, hot) : C.ink2} />
                    {!isMid || hot < 0.05 ? <path d={`M ${PW - 64} ${y} l 8 8 l 16 -16`} fill="none" stroke={C.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - tick)} opacity={1 - hot} /> : null}
                  </g>
                );
              })}
              <line x1={34} x2={PW - 34} y1={SEP} y2={SEP} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="6 7" opacity={prog(frame, tallyAt - 4, 6)} />
              {/* the total as tally strokes: one per counted row */}
              {BARS.map((_, i) => {
                const g = Math.floor(i / 5);
                const k = i % 5;
                const x0 = 230 + g * 96;
                const d = prog(frame, tallyAt + 4 + i * 2, 5, ease.drawOn);
                const y = FOOT1;
                return k < 4 ? (
                  <line key={i} x1={x0 + k * 16} x2={x0 + k * 16} y1={y + 6} y2={y + 6 + 40 * d} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
                ) : (
                  <line key={i} x1={x0 - 8} x2={x0 - 8 + 64 * d} y1={y + 40} y2={y + 40 - 28 * d} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
                );
              })}
              {/* the clock */}
              <g transform={`translate(${PW / 2 - 80} ${FOOT2 + 26})`} opacity={prog(frame, clockAt, 8)} stroke={C.ink} strokeWidth={2} fill="none" strokeLinecap="round">
                <circle r={17} />
                <line x1={0} y1={0} x2={0} y2={-10} />
                <line x1={0} y1={0} x2={lerp(0, 8, prog(frame, clockAt + 2, 14, ease.camera))} y2={lerp(-6, 4, prog(frame, clockAt + 2, 14, ease.camera))} />
              </g>
            </svg>
            <div className={TXT} style={{position: 'absolute', left: 0, width: PW, top: 34, textAlign: 'center', fontFamily: F.mono, fontSize: 30, letterSpacing: 3, color: C.ink2, opacity: prog(frame, headAt, 8)}}>
              {hdr}
            </div>
            <div className={TXT} style={{position: 'absolute', left: 40, top: FOOT1 + 4, fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: C.ink, opacity: prog(frame, tallyAt, 8)}}>
              {total}
            </div>
            <div className={TXT} style={{position: 'absolute', left: PW / 2 - 48, top: FOOT2 + 6, fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: C.ink, opacity: prog(frame, clockAt, 8)}}>
              {when}
            </div>
            <div className={TXT} style={{position: 'absolute', left: 372, width: 150, top: ROW0 + MID * STEP + STEP / 2 - medSize * 0.62, fontFamily: F.sans, fontWeight: 600, fontSize: medSize, color: toneText(tone), opacity: lit, whiteSpace: 'nowrap'}}>
              {med}
            </div>
          </div>
        </div>
        {/* the printer: a slim body with its slot */}
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <rect x={240} y={SLOT + 4} width={600} height={78} rx={22} fill={C.surface} stroke={C.ink2} strokeWidth={2} />
          <line x1={PX - 12} x2={PX + PW + 12} y1={SLOT} y2={SLOT} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
          <circle cx={790} cy={SLOT + 36} r={6} fill={frame >= tearAt ? line : C.ink2} />
        </svg>
      </div>
      <Sfx name="asmr-paper" at={Math.max(base, headAt)} volume={0.35} />
      {BARS.map((_, i) => (
        <Sfx key={i} name="asmr-tick-fine" at={rowAt(i)} volume={0.28 + (i % 3) * 0.04} />
      ))}
      <Sfx name="asmr-pencil-short" at={tallyAt + 4} volume={0.35} />
      <Haptic kind="light" at={clockAt} />
      <Land at={tearAt} />
      <Sfx name="asmr-paper-tear" at={tearAt + 6} volume={0.4} />
    </PictureBand>
  );
};

// the middle bar's colour: from the rule grey to the tone as it lights (a hard switch past half, no mixed hue)
const interpolateTone = (a: string, b: string, t: number) => (t > 0.5 ? b : a);
