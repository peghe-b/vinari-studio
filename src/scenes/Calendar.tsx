import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr, typeOn} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, halo, L, THEME, Tone, toneBig, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, Sfx, TypeSfx, vary} from './common';

type Mark = {day: number; label?: string; tone?: string; at?: number | string}; // at: chunk or "1.2s" where this mark lands
type P = {
  month: string; // "ოქტომბერი 2026"
  days: number; // days in the month
  startWeekday: number; // weekday of day 1, 0 = Monday
  marks: Mark[]; // highlighted days; tone "up" (default), "down", "accent" or "neutral"
  today?: number; // outlined in ink
  countdownTo?: number; // with today: the days in between light up one by one and a ring counts them
  at?: number | string; // chunk (or "0.9s") where the marks and the countdown start
};

// A line-art month: hairline rows, quiet numbers, weekends a step dimmer. At `at` the days
// from today to the target light up one by one while a ring in the corner counts them, then
// the marked days land in their data colour and keep breathing.

const WEEK = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
const X0 = L.side;
const COL = (1080 - 2 * L.side) / 7;
const toneOf = (t?: string): Tone => (t === 'up' || t === 'down' || t === 'accent' || t === 'neutral' ? t : 'up');

export const Calendar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  // the frame of the month (title, hairlines, weekdays, the numbers, today's ring, the empty counting
  // ring) is already standing on a later scene's cut frame (entrance before the cut), so the cut lands
  // on a calendar, never on black; the countdown and every sound stay on base (the cut is the event)
  const e = entrance(ctx);
  const start = ((p.startWeekday % 7) + 7) % 7;
  const rows = Math.ceil((start + p.days) / 7);
  // taller rows since the content box grew to stage 1280; the grid still ends above stage 1080 (the
  // like column starts there under its right-hand days), the legend runs on below it on the left
  const rowH = rows > 5 ? 80 : 94;
  const gridTop = 590;
  const gridBottom = gridTop + rows * rowH;
  const cell = (d: number) => {
    const k = start + d - 1;
    return {x: X0 + (k % 7) * COL + COL / 2, y: gridTop + Math.floor(k / 7) * rowH + rowH / 2, r: Math.floor(k / 7), c: k % 7};
  };

  const at = p.at !== undefined ? Math.max(base + 12, cueFrame(ctx, p.at)) : base + 18;
  const hasCount = p.today !== undefined && p.countdownTo !== undefined && p.countdownTo > p.today;
  const span = hasCount ? p.countdownTo! - p.today! : 0;
  const step = hasCount ? Math.max(2, Math.min(6, Math.round(40 / span))) : 0;
  const dayOn = (d: number) => at + (d - p.today!) * step; // countdown reaches day d
  const countEnd = hasCount ? dayOn(p.countdownTo!) : at;
  const counted = hasCount ? Math.max(0, Math.min(span, Math.floor((frame - at) / step))) : 0;
  const markTone = toneOf(p.marks.find((m) => m.day === p.countdownTo)?.tone ?? p.marks[0]?.tone);
  const trailCol = toneLine(markTone);

  // when each mark lands: on the countdown trail it lands as the trail reaches it; a mark off the
  // trail waits until the count has landed (it must not pull the eye away from the count), unless
  // it has its own `at`
  const onTrail = (m: Mark) => hasCount && m.day > p.today! && m.day <= p.countdownTo!;
  const offTrail = p.marks.filter((m) => !onTrail(m));
  const markAt = p.marks.map((m, i) =>
    m.at !== undefined ? cueFrame(ctx, m.at) : onTrail(m) ? dayOn(m.day) : hasCount ? countEnd + 10 + offTrail.indexOf(m) * 7 : at + 4 + i * 7,
  );
  const titleS = spr(frame, e);
  const legend = p.marks.map((m, i) => ({...m, i, at: markAt[i]})).filter((m) => m.label);
  const ringR = 54;
  const ringX = 1080 - L.side - ringR;
  const ringY = 432;
  const ringIn = hasCount ? prog(frame, e + 6, 12) : 0;
  // the count and its unit appear only when the count starts: frame 0 is the cover, and an empty
  // ring must not read as "0 days"
  const numIn = hasCount ? ringIn * prog(frame, at - 3, 6) : 0;
  const arc = hasCount ? prog(frame, at, countEnd - at, (x) => x) : 0;
  const ringDone = hasCount ? spr(frame, countEnd, 'land') : 0;

  return (
    <>
      <div className={TXT} style={{position: 'absolute', top: 398, left: L.side, fontFamily: F.sans, fontWeight: 600, fontSize: 60, lineHeight: 1.1, color: C.ink, opacity: titleS, transform: `translateY(${(1 - titleS) * 18}px)`, whiteSpace: 'nowrap'}}>
        {mtav(p.month)}
      </div>

      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <filter id="cal-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={9} />
          </filter>
        </defs>
        {/* hairline rows drawing left to right, a beat apart */}
        {Array.from({length: rows + 1}, (_, r) => {
          const d = prog(frame, e + r * 1.5, 12, ease.drawOn);
          return <line key={r} x1={X0} x2={X0 + (1080 - 2 * L.side) * d} y1={gridTop + r * rowH} y2={gridTop + r * rowH} stroke={C.rule} strokeWidth={r === 0 ? 2 : 1.2} opacity={r === 0 ? 0.9 : 0.5} />;
        })}

        {/* countdown trail: a thin track runs under the days from today to the target, row by
            row, its head a bright dot; each day it passes turns the data colour */}
        {hasCount
          ? Array.from({length: span}, (_, k) => {
              const d0 = p.today! + k;
              const d1 = d0 + 1;
              const a = cell(d0);
              const b = cell(d1);
              const on = prog(frame, dayOn(d0), step, (x) => x);
              if (on <= 0) return null;
              const y = a.y + 30;
              // leave the today and target rings clear; a new row starts at its left edge
              const ringGap = Math.min(COL, rowH) * 0.42 + 8;
              const x0 = b.r === a.r ? a.x + (d0 === p.today ? ringGap : 0) : b.x - COL / 2 + 14;
              // the last day of a row carries the track on to the row's right edge
              const rowEnd = b.c === 6 && d1 !== p.countdownTo && b.r === a.r;
              const xEnd = b.x - (d1 === p.countdownTo ? ringGap : 0) + (rowEnd ? COL / 2 - 14 : 0);
              const x1 = x0 + (xEnd - x0) * on;
              return (
                <g key={d0}>
                  <line x1={x0} x2={x1} y1={b.r === a.r ? y : b.y + 30} y2={b.r === a.r ? y : b.y + 30} stroke={trailCol} strokeWidth={3} strokeLinecap="round" opacity={0.85} style={{filter: `drop-shadow(0 0 6px ${halo(trailCol, 1)})`}} />
                  {on < 1 ? <circle cx={x1} cy={b.r === a.r ? y : b.y + 30} r={5} fill={trailCol} style={{filter: `drop-shadow(0 0 8px ${halo(trailCol, 1)})`}} /> : null}
                </g>
              );
            })
          : null}

        {/* marks: a soft disc, a ring in the data colour, a slow breath once landed */}
        {p.marks.map((m, i) => {
          if (m.day < 1 || m.day > p.days) return null;
          const c = cell(m.day);
          const tone = toneOf(m.tone);
          const col = toneLine(tone);
          const s = spr(frame, markAt[i], 'land');
          if (frame < markAt[i] || m.day === p.today) return null;
          const breath = 0.5 + 0.5 * Math.sin(((frame - markAt[i]) / 30) * Math.PI * 0.9);
          const pulseT = ((frame - markAt[i]) % 48) / 30;
          const r = Math.min(COL, rowH) * 0.42;
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={r * 1.1} fill={col} opacity={(0.18 + 0.1 * breath) * s * THEME.glow} filter="url(#cal-glow)" />
              <circle cx={c.x} cy={c.y} r={r} fill={col} opacity={0.12 * s} />
              <circle cx={c.x} cy={c.y} r={r * (0.6 + 0.4 * s)} fill="none" stroke={col} strokeWidth={3} opacity={s} />
              {pulseT <= 1 && m.day === p.countdownTo ? <circle cx={c.x} cy={c.y} r={r * (1 + 0.7 * ease.enter(pulseT))} fill="none" stroke={col} strokeWidth={2} opacity={0.5 * (1 - pulseT)} /> : null}
            </g>
          );
        })}

        {/* today: an ink ring, drawn on */}
        {p.today !== undefined ? (
          (() => {
            const c = cell(p.today);
            const r = Math.min(COL, rowH) * 0.42;
            const d = prog(frame, e + 8, 14, ease.drawOn);
            const per = 2 * Math.PI * r;
            return <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={C.ink} strokeWidth={2.5} strokeDasharray={per} strokeDashoffset={per * (1 - d)} transform={`rotate(-90 ${c.x} ${c.y})`} />;
          })()
        ) : null}

        {/* the counting ring */}
        {hasCount ? (
          <g opacity={ringIn}>
            <circle cx={ringX} cy={ringY} r={ringR} fill="none" stroke={C.rule} strokeWidth={2} opacity={0.7} />
            <circle
              cx={ringX}
              cy={ringY}
              r={ringR}
              fill="none"
              stroke={trailCol}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * ringR}
              strokeDashoffset={2 * Math.PI * ringR * (1 - arc)}
              transform={`rotate(-90 ${ringX} ${ringY})`}
              style={{filter: arc > 0 ? `drop-shadow(0 0 ${6 + 6 * ringDone}px ${halo(trailCol, 0.67)})` : undefined}}
            />
            {arc > 0 && arc < 1 ? (
              <circle cx={ringX + ringR * Math.sin(arc * 2 * Math.PI)} cy={ringY - ringR * Math.cos(arc * 2 * Math.PI)} r={6} fill={trailCol} />
            ) : null}
          </g>
        ) : null}
      </svg>

      {hasCount ? (
        <>
          <div className={TXT} style={{position: 'absolute', left: ringX - ringR, width: ringR * 2, top: ringY - 40, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 54, lineHeight: 1, color: counted > 0 ? toneBig(markTone) : C.ink, opacity: numIn, fontFeatureSettings: '"tnum" 1', transform: `scale(${1 + 0.06 * Math.sin(Math.min(1, ringDone) * Math.PI)})`}}>
            {counted}
          </div>
          <div className={TXT} style={{position: 'absolute', left: ringX - ringR, width: ringR * 2, top: ringY + 18, textAlign: 'center', fontFamily: F.mono, fontSize: 20, letterSpacing: '0.05em', color: C.ink2, opacity: numIn}}>
            {mtav('დღე')}
          </div>
        </>
      ) : null}

      {/* weekday initials and the day numbers */}
      {WEEK.map((w, i) => (
        <div key={w} className={TXT} style={{position: 'absolute', top: gridTop - 44, left: X0 + i * COL, width: COL, textAlign: 'center', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.04em', color: i >= 5 ? C.ink3 : C.ink2, opacity: prog(frame, e + 2 + i * 0.7, 8)}}>
          {mtav(w)}
        </div>
      ))}
      {Array.from({length: p.days}, (_, k) => {
        const d = k + 1;
        const c = cell(d);
        const o = prog(frame, e + 3 + (c.r + c.c) * 0.5, 8);
        const mi = p.marks.findIndex((m) => m.day === d);
        const marked = mi >= 0 && frame >= markAt[mi];
        const trail = hasCount && d > p.today! && d < p.countdownTo! && frame >= dayOn(d);
        const color = marked ? toneText(toneOf(p.marks[mi].tone)) : d === p.today ? C.ink : trail ? toneText(markTone) : c.c >= 5 ? C.ink3 : C.ink2;
        return (
          <div
            key={d}
            className={TXT}
            style={{
              position: 'absolute',
              left: c.x - COL / 2,
              width: COL,
              top: c.y - 20,
              textAlign: 'center',
              fontFamily: F.sans,
              fontWeight: marked || d === p.today ? 600 : 400,
              fontSize: 34,
              lineHeight: '40px',
              fontFeatureSettings: '"tnum" 1',
              color,
              opacity: o,
              transform: `translateY(${(1 - o) * 8}px)`,
            }}
          >
            {d}
          </div>
        );
      })}

      {/* legend: day and label for every labelled mark */}
      {legend.map((m, j) => {
        const tone = toneOf(m.tone);
        const s = spr(frame, m.at + 3);
        return (
          <div key={j} style={{position: 'absolute', top: gridBottom + 36 + j * 50, left: L.side, display: 'flex', alignItems: 'center', gap: 16, opacity: s, transform: `translateY(${(1 - s) * 10}px)`, whiteSpace: 'nowrap'}}>
            <div style={{width: 12, height: 12, borderRadius: 6, background: toneLine(tone), boxShadow: `0 0 12px ${halo(toneLine(tone), 1)}`}} />
            <div className={TXT} style={{fontFamily: F.mono, fontSize: 28, letterSpacing: '0.04em', color: toneText(tone), fontFeatureSettings: '"tnum" 1', width: 48}}>{String(m.day).padStart(2, '0')}</div>
            <div className={TXT} style={{fontFamily: F.mono, fontSize: 28, letterSpacing: '0.04em', color: tone === 'neutral' ? C.ink2 : C.ink}}>{typeOn(mtav(capsLatin(m.label!)), frame, m.at + 3, 1.4)}</div>
          </div>
        );
      })}

      {/* event: the hairline rows finish and today's ring draws on (a later scene: frames 0..12 after the cut; the first scene: base..base+22) */}
      <Sfx name="asmr-pencil" at={base} volume={0.3} len={ctx.index === 0 ? 24 : 16} fade={6} />
      {/* event: the countdown lights one more day: a dry picker tick and a selection haptic, like a wheel turning */}
      {hasCount
        ? Array.from({length: span - 1}, (_, k) => (
            <React.Fragment key={k}>
              <Sfx name="asmr-ui-tick" at={dayOn(p.today! + 1 + k)} volume={0.4 * vary(k, 0.2)} />
              <Haptic kind="selection" at={dayOn(p.today! + 1 + k)} volume={0.3 * vary(k + 40, 0.2)} />
            </React.Fragment>
          ))
        : null}
      {/* event: a marked day lands; the countdown's target is the number landing (the ring's count) */}
      {p.marks.map((m, i) =>
        m.day === p.countdownTo ? (
          <Land key={`m${i}`} at={markAt[i]} volume={0.58} />
        ) : (
          <React.Fragment key={`m${i}`}>
            <Sfx name="asmr-pop" at={markAt[i]} volume={0.38} />
            <Haptic kind="light" at={markAt[i]} />
          </React.Fragment>
        ),
      )}
      {legend.map((m, j) => <TypeSfx key={`l${j}`} text={capsLatin(m.label!)} at={m.at + 3} cpf={1.4} volume={0.2} /* event: a legend label types on */ />)}
    </>
  );
};
