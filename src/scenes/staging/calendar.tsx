// Calendar's other stagings (the default "month", a line-art month grid with a counting ring, lives in
// Calendar.tsx). Same props and the same timing: the countdown from `today` to `countdownTo` starts at `at` and steps
// one day every `step` frames, so a spec's beats land where they did.
//   tearoff  a tear-off day calendar, big and close: the month in mono on its binding, a huge day number and its
//            weekday; the pages tear away one by one (falling to the lower left, never over the meta bar) up to the target day, which lands in its mark's colour
//            with the mark's label under it
//   ruler    the month as one long ruler of days: a marker slides from today to the target, the days it passes
//            fill in the mark's colour towards the flags planted on the marked days; a big count of days above
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr, typeOn} from '../../lib/anim';
import {capsLatin, mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F, isLight, rgba, type Tone, toneBig, toneLine} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance, Haptic, lead, Sfx, toneHaptic, TypeSfx, vary} from '../common';

type Mark = {day: number; label?: string; tone?: string; at?: number | string};
type P = {month: string; days: number; startWeekday: number; marks: Mark[]; today?: number; countdownTo?: number; at?: number | string; staging?: string};
const toneOf = (t?: string): Tone => (t === 'up' || t === 'down' || t === 'accent' || t === 'neutral' ? t : 'up');
const WEEKDAY = ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი', 'კვირა'];

/** The countdown, as Calendar.tsx times it. */
const timing = (p: P, ctx: SceneCtx) => {
  const base = lead(ctx);
  const at = p.at !== undefined ? Math.max(base + 12, cueFrame(ctx, p.at)) : base + 18;
  const hasCount = p.today !== undefined && p.countdownTo !== undefined && p.countdownTo > p.today;
  const span = hasCount ? p.countdownTo! - p.today! : 0;
  const step = hasCount ? Math.max(2, Math.min(6, Math.round(40 / span))) : 0;
  const dayOn = (d: number) => at + (d - (p.today ?? 0)) * step;
  const countEnd = hasCount ? dayOn(p.countdownTo!) : at;
  const target = p.marks.find((m) => m.day === p.countdownTo) ?? p.marks[0];
  return {base, at, hasCount, span, step, dayOn, countEnd, target, tone: toneOf(target?.tone)};
};
const weekday = (p: P, d: number) => WEEKDAY[(((p.startWeekday + d - 1) % 7) + 7) % 7];

// ---- tearoff ---------------------------------------------------------------------------------------------------
const BX = 540;
const BW = 560;
const BTOP = 440;
const BH = 640;
export const Tearoff: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const t = timing(p, ctx);
  const first = t.hasCount ? p.today! : (t.target?.day ?? 1) - 1;
  const last = t.hasCount ? p.countdownTo! : t.target?.day ?? 1;
  const tearAt = (d: number) => (t.hasCount ? t.dayOn(d + 1) - t.step : t.at); // the page of day d leaves
  // the day showing: the last page not yet torn
  let shown = first;
  for (let d = first; d < last; d++) if (frame >= tearAt(d)) shown = d + 1;
  const landed = shown === last && frame >= tearAt(last - 1);
  const land = landed ? spr(frame, tearAt(last - 1) + 2, 'land') : 0;
  const blockIn = spr(frame, e, 'enterXL');
  const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
  const push = 1 + 0.05 * ease.camera(life);
  const numCol = landed ? toneBig(t.tone) : C.ink;
  const pageBg = isLight() ? '#FFFFFF' : C.surface;
  const flying = [];
  for (let d = first; d < last; d++) {
    const k = (frame - tearAt(d)) / 16;
    if (k >= 0 && k < 1) flying.push({d, k});
  }
  const Page: React.FC<{d: number; style?: React.CSSProperties; final?: boolean}> = ({d, style, final}) => (
    <div style={{position: 'absolute', left: 0, top: 70, width: BW, height: BH - 70, background: pageBg, borderRadius: '0 0 18px 18px', border: `1.5px solid ${rgba(C.ink, isLight() ? 0.16 : 0.3)}`, borderTop: 'none', ...style}}>
      <svg width={BW} height={10} style={{position: 'absolute', top: 0, left: 0}}>
        <line x1={0} x2={BW} y1={4} y2={4} stroke={C.ink} strokeWidth={1.2} strokeDasharray="3 7" opacity={0.3} />
      </svg>
      {/* print on a page that the next page covers as it tears: graphics, not the text layer */}
      <div style={{position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontWeight: 300, fontSize: 300, lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum" 1, "lnum" 1', color: final ? numCol : C.ink}}>
        {d}
      </div>
      <div style={{position: 'absolute', top: 370, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 44, color: final && landed ? C.ink : C.ink2}}>
        {mtav(weekday(p, d))}
      </div>
    </div>
  );
  const label = t.target?.label;
  const labelAt = tearAt(last - 1) + 8;
  return (
    <>
      <div style={{position: 'absolute', left: BX - BW / 2, top: BTOP, width: BW, height: BH, transform: `translateY(${(1 - blockIn) * 60}px) scale(${push})`, transformOrigin: '50% 60%', opacity: Math.min(1, blockIn * 1.4)}}>
        {/* the stack's edge under the pages */}
        {[3, 2, 1].map((k) => (
          <div key={k} style={{position: 'absolute', left: 6 * k, right: 6 * k, top: 70, height: BH - 70 + 7 * k, borderRadius: '0 0 18px 18px', border: `1.2px solid ${rgba(C.ink, 0.22)}`, background: pageBg}} />
        ))}
        <Page d={shown} final />
        {flying.map(({d, k}) => (
          <Page key={d} d={d} style={{transformOrigin: '0% 0%', transform: `translate(${-240 * k}px, ${300 * k * k}px) rotate(${-22 * k}deg)`, opacity: k < 0.6 ? 1 : (1 - k) / 0.4}} />
        ))}
        {/* the binding with the month */}
        <div style={{position: 'absolute', left: 0, top: 0, width: BW, height: 74, borderRadius: '18px 18px 0 0', background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className={TXT} style={{fontFamily: F.mono, fontSize: 30, letterSpacing: '0.08em', color: C.onInk}}>
            {mtav(capsLatin(p.month))}
          </div>
        </div>
        {[BW * 0.2, BW * 0.8].map((x) => (
          <div key={x} style={{position: 'absolute', left: x - 9, top: -16, width: 18, height: 40, borderRadius: 9, border: `2px solid ${C.ink}`, background: C.bg}} />
        ))}
      </div>
      {label ? (
        <div className={TXT} style={{position: 'absolute', top: BTOP + BH + 44, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 32, letterSpacing: '0.05em', color: C.ink, opacity: prog(frame, labelAt - 2, 6)}}>
          {typeOn(mtav(capsLatin(label)), frame, labelAt, 1.4)}
        </div>
      ) : null}
      {Array.from({length: last - first}, (_, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-paper-tear" at={tearAt(first + i)} volume={0.26 * vary(i, 0.25)} /* event: a page tears off */ />
          <Haptic kind="selection" at={tearAt(first + i)} volume={0.22} />
        </React.Fragment>
      ))}
      <Sfx name="asmr-land" at={tearAt(last - 1) + 2} volume={0.45} /* event: the target day lands in its colour */ />
      <Haptic kind={toneHaptic(t.tone)} at={tearAt(last - 1) + 2} />
      {label ? <TypeSfx text={capsLatin(label)} at={labelAt} cpf={1.4} volume={0.2} /* event: the label types on */ /> : null}
    </>
  );
};

// ---- ruler -----------------------------------------------------------------------------------------------------
const RX0 = 150;
const RX1 = 930;
const RY = 990;
export const Ruler: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const t = timing(p, ctx);
  const dx = (RX1 - RX0) / Math.max(1, p.days - 1);
  const xOf = (d: number) => RX0 + (d - 1) * dx;
  const draw = prog(frame, e, 22, ease.drawOn);
  const col = toneLine(t.tone);
  const today = p.today ?? t.target?.day ?? 1;
  const goal = t.hasCount ? p.countdownTo! : today;
  const run = t.hasCount ? prog(frame, t.at, t.countEnd - t.at, (x) => x) : 0;
  const mx = lerp(xOf(today), xOf(goal), run);
  const counted = t.hasCount ? Math.max(0, Math.min(t.span, Math.floor((frame - t.at) / t.step))) : 0;
  const numIn = t.hasCount ? prog(frame, t.at + t.step - 3, 6) : 0; // never reads "0 days"
  const landed = t.hasCount && frame >= t.countEnd;
  const land = landed ? spr(frame, t.countEnd, 'land') : 0;
  const markAt = p.marks.map((m, i) => (m.at !== undefined ? cueFrame(ctx, m.at) : e + 12 + i * 5)); // the flags stand from the start: the marker runs to them
  const weekend = (d: number) => (((p.startWeekday + d - 1) % 7) + 7) % 7 >= 5;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={RX0 - 20} x2={lerp(RX0 - 20, RX1 + 20, draw)} y1={RY} y2={RY} stroke={C.ink} strokeWidth={2} opacity={0.85} />
        {Array.from({length: p.days}, (_, i) => {
          const d = i + 1;
          const on = prog(frame, e + 4 + i * 0.6, 6);
          const passed = t.hasCount && d > today && d <= today + counted;
          return <line key={d} x1={xOf(d)} x2={xOf(d)} y1={RY} y2={RY + (d % 5 === 0 || d === 1 ? 34 : 20)} stroke={passed ? col : C.ink} strokeWidth={passed ? 3 : 1.6} opacity={on * (weekend(d) && !passed ? 0.45 : 0.85)} />;
        })}
        {/* the span the marker has passed, a bar over the ruler */}
        {t.hasCount ? <rect x={xOf(today)} y={RY - 12} width={Math.max(0, mx - xOf(today))} height={8} rx={4} fill={col} opacity={0.9} /> : null}
        {/* today: a hairline ring; the marker: a stem and a head sliding along */}
        <circle cx={xOf(today)} cy={RY} r={10} fill={C.bg} stroke={C.ink} strokeWidth={2} opacity={draw} />
        <g transform={`translate(${mx} ${RY})`} opacity={prog(frame, e + 6, 10)}>
          <line x1={0} x2={0} y1={-70} y2={0} stroke={C.ink} strokeWidth={2} />
          <path d="M -11 -86 L 11 -86 L 0 -68 Z" fill={C.ink} />
        </g>
        {/* flags on the marked days */}
        {p.marks.map((m, i) => {
          const s = spr(frame, markAt[i]);
          const c = toneLine(toneOf(m.tone));
          return (
            <g key={i} transform={`translate(${xOf(m.day)} ${RY})`} opacity={s}>
              <line x1={0} x2={0} y1={0} y2={-150 * s} stroke={c} strokeWidth={3} />
              <circle cx={0} cy={0} r={9} fill={c} />
              <circle cx={0} cy={-150 * s} r={6} fill={c} />
            </g>
          );
        })}
      </svg>
      {/* day numbers under the ruler: the first, every fifth, today and the marks */}
      {Array.from({length: p.days}, (_, i) => i + 1)
        .filter((d) => d === 1 || d % 5 === 0 || d === today || p.marks.some((m) => m.day === d))
        .filter((d, _, all) => !(d % 5 === 0 && all.some((o) => o !== d && Math.abs(o - d) <= 1 && (o === today || p.marks.some((m) => m.day === o)))))
        .map((d) => (
          <div key={d} className={TXT} style={{position: 'absolute', left: xOf(d) - 40, width: 80, top: RY + 44, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: d === today || p.marks.some((m) => m.day === d) ? C.ink : C.ink3, opacity: prog(frame, e + 8, 10)}}>
            {d}
          </div>
        ))}
      {/* the month, and the mark labels on their flags */}
      <div className={TXT} style={{position: 'absolute', left: RX0 - 20, top: RY + 110, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, opacity: prog(frame, e + 4, 10)}}>
        {mtav(capsLatin(p.month))}
      </div>
      {p.marks.map((m, i) =>
        m.label ? (
          <div key={i} className={TXT} style={{position: 'absolute', left: Math.min(xOf(m.day) - 16, 960 - 12 - 300), width: 300, top: RY - 150 - 60, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.04em', color: C.ink, textAlign: xOf(m.day) - 16 > 960 - 312 ? 'right' : 'left', whiteSpace: 'nowrap', opacity: prog(frame, markAt[i] + 4, 6)}}>
            {typeOn(mtav(capsLatin(m.label)), frame, markAt[i] + 4, 1.4)}
          </div>
        ) : null,
      )}
      {/* the count: big, over the ruler's left half */}
      {t.hasCount ? (
        <div className={TXT} style={{position: 'absolute', left: RX0 - 20, top: 520, display: 'flex', alignItems: 'baseline', gap: 22, opacity: numIn, transform: `scale(${1 + 0.04 * Math.sin(Math.min(1, land) * Math.PI)})`, transformOrigin: '0% 100%'}}>
          <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 240, lineHeight: 1, fontFeatureSettings: '"tnum" 1, "lnum" 1', color: landed ? toneBig(t.tone) : C.ink}}>{counted}</div>
          <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 64, color: C.ink2}}>{mtav('დღე')}</div>
        </div>
      ) : null}
      <Sfx name="asmr-pencil" at={Math.max(0, t.base)} volume={0.2} /* event: the ruler draws on */ />
      {t.hasCount
        ? Array.from({length: t.span}, (_, i) => <Sfx key={i} name="asmr-tick-fine" at={t.at + (i + 1) * t.step} volume={0.26 * vary(i, 0.2)} /* event: the marker passes a day */ />)
        : null}
      {t.hasCount ? <Sfx name="asmr-land" at={t.countEnd} volume={0.45} /* event: the count lands */ /> : null}
      {t.hasCount ? <Haptic kind={toneHaptic(t.tone)} at={t.countEnd} /> : null}
      {p.marks.map((m, i) => (m.label ? <TypeSfx key={i} text={capsLatin(m.label)} at={markAt[i] + 4} cpf={1.4} volume={0.2} /* event: a flag's label types on */ /> : null))}
    </>
  );
};
