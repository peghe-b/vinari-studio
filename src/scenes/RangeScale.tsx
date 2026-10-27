import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {decimalsOf, fmtReading, RANGE_X, rangeTicks, zoneLabelSize, zoneOf} from '../lib/r3.mjs';
import {fitLines, sizeFor, textW} from '../lib/textfit.mjs';
import {mtav} from '../lib/format';
import {C, F, isLight} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {drift, FitText, Quiet, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Zone = {
  /** where this zone ends (the last one ends at `max`) */
  to: number;
  /** what a reading here means (2 words at most: „დამუხტულია", „სუსტია"; it must fit its zone: RANGE_ZONES) */
  label: string;
  /** a zone the viewer should worry about: hatched */
  bad?: boolean;
};
type P = {
  /** what is measured (4 words at most: „აკუმულატორის ძაბვა") */
  title?: string;
  /** the unit after a reading („V", „მმ", „ბარი") */
  unit: string;
  min: number;
  max: number;
  /** 2 to 4 zones from `min` up (tools/ci/p2lint.mjs RANGE_ZONES) */
  zones: Zone[];
  /** where the reading lands */
  value: number;
  /** the reading as printed („12,2"); default the value with its decimals, a decimal comma */
  shown?: string;
  /** an earlier reading: a dashed ghost marker stays there („ახალი" 12,7 -> now 12,2) */
  from?: number;
  /** its quiet label (2 words) */
  fromLabel?: string;
  /** the step between numbered ticks (default: about 5 numbers on the scale) */
  step?: number;
  /** whose figure the zones are: REQUIRED (RANGE_SOURCE) */
  source: string;
  /** the chunk the marker slides on */
  at?: number | string;
  /** the reading's colour: red (default in a bad zone), ink elsewhere, or the film's data accent */
  t?: P2Tone;
};

const [BAR_X0, BAR_X1] = RANGE_X; // the scale's numbers end left of TikTok's action column (stage x 894)
const BAR_Y = 830;
const BAR_H = 34;

// RangeScale (r3; car knowledge's readings: a battery's volts, a tyre's tread, a pressure): a reading set on its TRUE scale
// with the zones that say what it means, never a lone number. The ruler draws on (BEZ.data, axis first), the numbered ticks
// and the zone labels rise, then the marker slides from its start (or the earlier reading, left as a dashed ghost) to the
// value on BEZ.data while the big reading above counts with it (each frame a real reading on the scale), lands on
// SPRING.land with a detent, and the zone it landed in darkens and is underlined. Bad zones are hatched ink: black and white,
// the only colour the reading itself when it lands in a bad zone. The scale ends at stage x 840, left of TikTok's column.
export const RangeScale: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const min = Number(p.min);
  const max = Number(p.max) > min ? Number(p.max) : min + 1;
  const X = (v: number) => BAR_X0 + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (BAR_X1 - BAR_X0);
  const zones = (p.zones ?? []).slice(0, 4);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(base + 30, 22);
  const start = Number.isFinite(p.from) ? Number(p.from) : min;
  const u = ease.data(Math.min(1, Math.max(0, (frame - at) / 22)));
  const v = start + (p.value - start) * u;
  const dec = decimalsOf(p.shown ?? p.value);
  const landed = frame >= at + 22;
  const zi = zoneOf(zones, p.value, min);
  const bad = Boolean(zones[zi]?.bad);
  const t: P2Tone = p.t ?? (bad ? 'red' : 'ink');
  const reading = `${landed && p.shown ? p.shown : fmtReading(v, dec)}`;
  const unit = p.unit ? ` ${p.unit}` : '';
  const numSize = sizeFor(`${p.shown ?? fmtReading(max, dec)}${unit}`, S.right - S.left, 180, {weight: 700});
  const numY = S.top + (p.title ? 90 : 30);
  const axis = prog(frame, base + 4, 14, ease.data);
  const ticks = rangeTicks(min, max, p.step);
  const land = landed ? spr(frame, at + 22, 'land') : 0;
  const markX = X(v);
  const markOn = prog(frame, at - 8, 8);
  const zx = (i: number) => [X(i === 0 ? min : Number(zones[i - 1]?.to)), X(i === zones.length - 1 ? max : Number(zones[i]?.to))] as const;
  // the zone labels: ONE size (the smallest that fits every zone, src/lib/r3.mjs zoneLabelSize) on one top line, well clear
  // of the tick numbers (the review of 08a2624: three sizes, two baselines, tight under the ticks); the landed zone only
  // darkens and is underlined
  const zoneY = BAR_Y + BAR_H + 104;
  const zpx = zoneLabelSize(zones, min, max);
  const zoneFit = zones.map((z, i) => fitLines(z?.label ?? '', Math.max(120, zx(i)[1] - zx(i)[0] - 12), 2, zpx, {weight: 700, mtav: true, min: zpx}));
  const zoneRowH = Math.max(1, ...zoneFit.map((f) => f.lines.length)) * Math.round(zpx * 1.08);
  const hatch = isLight() ? 'rgba(11,11,11,0.55)' : 'rgba(245,245,245,0.6)';
  const plain = isLight() ? '#D9D9D9' : '#3A3A3A';
  const underlineAt = at + 30;
  const uw = zi >= 0 ? Math.min(zx(zi)[1] - zx(zi)[0] - 20, Math.max(...zoneFit[zi].lines.map((l) => textW(l, zpx, {weight: 700, mtav: true}))) + 16) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: BAR_Y})}}>
      {p.title ? <FitText text={p.title} x={S.left} y={S.top + 10} w={S.right - S.left} size={64} min={40} maxLines={1} weight={700} at={base + 2} /> : null}
      <div className={TXT} style={{position: 'absolute', left: S.left, top: numY, fontFamily: F.sans, fontWeight: 700, fontSize: numSize, lineHeight: `${Math.round(numSize * 1.06)}px`, color: frame >= at ? tone(landed ? t : 'ink') : C.ink2, whiteSpace: 'pre', fontFeatureSettings: '"tnum" 1, "lnum" 1', letterSpacing: '-0.02em', transform: `scale(${(1.05 - 0.05 * Math.min(1, landed ? land : 1)).toFixed(4)})`, transformOrigin: 'left center', opacity: prog(frame, base + 2, 8)}}>
        {`${reading}${unit}`}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <defs>
          <pattern id={`rs-hatch-${ctx.index}`} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={14} height={14} fill={plain} />
            <line x1={0} y1={0} x2={0} y2={14} stroke={hatch} strokeWidth={6} />
          </pattern>
          <clipPath id={`rs-axis-${ctx.index}`}>
            <rect x={BAR_X0 - 4} y={BAR_Y - 40} width={(BAR_X1 - BAR_X0 + 8) * axis} height={BAR_H + 80} />
          </clipPath>
        </defs>
        <g clipPath={`url(#rs-axis-${ctx.index})`}>
          {zones.map((z, i) => {
            const [a, b] = zx(i);
            const hit = i === zi && landed;
            return <rect key={i} x={a + (i ? 3 : 0)} y={BAR_Y} width={Math.max(0, b - a - (i ? 3 : 0))} height={BAR_H} rx={i === 0 || i === zones.length - 1 ? 0 : 0} fill={z.bad ? `url(#rs-hatch-${ctx.index})` : hit ? C.ink2 : plain} opacity={hit ? 1 : 0.95} />;
          })}
          {ticks.map((tv, i) => (
            <line key={i} x1={X(tv)} y1={BAR_Y + BAR_H} x2={X(tv)} y2={BAR_Y + BAR_H + 16} stroke={C.ink} strokeWidth={3} />
          ))}
        </g>
        {/* the earlier reading: a dashed ghost */}
        {Number.isFinite(p.from) ? <line x1={X(start)} y1={BAR_Y - 70} x2={X(start)} y2={BAR_Y + BAR_H + 6} stroke={C.ink2} strokeWidth={4} strokeDasharray="8 8" opacity={prog(frame, at + 10, 8)} /> : null}
        {/* the marker: a needle with a head, over the scale */}
        <g opacity={markOn} transform={`translate(${markX.toFixed(2)} 0)`}>
          <line x1={0} y1={BAR_Y - 64} x2={0} y2={BAR_Y + BAR_H + 8} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          <polygon points={`-20,${BAR_Y - 92} 20,${BAR_Y - 92} 0,${BAR_Y - 60}`} fill={tone(landed ? t : 'ink')} transform={`translate(0 ${BAR_Y - 76}) scale(${(0.9 + 0.1 * Math.min(1.1, land || 1)).toFixed(3)}) translate(0 ${-(BAR_Y - 76)})`} />
        </g>
      </svg>
      {/* the numbered ticks and the zone labels */}
      {ticks.map((tv, i) => (
        <div key={i} className={TXT} style={{position: 'absolute', left: X(tv) - 60, width: 120, top: BAR_Y + BAR_H + 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 34, lineHeight: '40px', color: C.ink2, opacity: prog(frame, base + 8 + i * 2, 8), fontFeatureSettings: '"tnum" 1'}}>
          {fmtReading(tv, decimalsOf(p.step ?? tv))}
        </div>
      ))}
      {zones.map((z, i) => {
        const [a, b] = zx(i);
        const hit = i === zi && landed;
        return (
          <React.Fragment key={i}>
            {zoneFit[i].lines.map((ln, j) => (
              <div key={j} className={TXT} style={{position: 'absolute', left: (a + b) / 2 - Math.max(120, b - a - 12) / 2, width: Math.max(120, b - a - 12), top: zoneY + j * Math.round(zpx * 1.08), textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: zpx, lineHeight: `${Math.round(zpx * 1.08)}px`, color: hit ? C.ink : C.ink2, whiteSpace: 'nowrap', opacity: prog(frame, base + 14 + i * 3 + j * 3, 9), transform: `translateY(${((1 - prog(frame, base + 14 + i * 3 + j * 3, 9, ease.whipOut)) * zpx * 0.32).toFixed(2)}px)`}}>
                {mtav(ln)}
              </div>
            ))}
          </React.Fragment>
        );
      })}
      {Number.isFinite(p.from) && p.fromLabel ? <FitText text={p.fromLabel} x={X(start)} y={BAR_Y - 132} w={220} size={36} min={34} maxLines={1} weight={500} align="center" t="quiet" at={at + 10} anim="none" /> : null}
      {zi >= 0 ? (
        <Ink
          marks={[{kind: 'underline', box: {x: (zx(zi)[0] + zx(zi)[1]) / 2 - uw / 2, y: zoneY, w: uw, h: zoneFit[zi].lines.length * Math.round(zpx * 1.08)}, at: underlineAt}]}
          end={ctx.dur}
        />
      ) : null}
      <Quiet text={p.source} x={S.left} y={Math.min(S.bottom - 50, zoneY + zoneRowH + 90)} w={S.right - S.left} at={base + 20} />
      <Sfx name="asmr-detent-roll" at={at} volume={0.3} /* event: the marker starts sliding */ />
      <Sfx name="asmr-detent" at={at + 22} volume={0.36} /* event: the marker lands */ />
    </div>
  );
};
