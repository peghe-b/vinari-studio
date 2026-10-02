// V61GoodMorning: the morning show on a TV. A line-art city wakes behind the glass (hills, rooftops, a small sun
// climbing), the corner clock ticks 08:59 -> 09:00, then a news ticker slides in under the picture: a car, and three
// day pips that light one by one (three days left to the inspection).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  sunAt?: number | string; // chunk: the sun clears the hills
  clockAt?: number | string; // chunk: the clock ticks to 09:00
  tickerAt?: number | string; // chunk: the ticker slides in
  pipsAt?: number | string; // chunk: the three day pips light
  ticker?: string; // the ticker's label
  tone?: Tone;
};

// the TV, in stage units
const TX0 = 150;
const TX1 = 930;
const TY0 = 450;
const TY1 = 1060;
const HORIZON = 900;
// hills and rooftops: one line across the screen
const SKY = 'M 170 900 C 230 860 280 850 330 870 L 360 870 L 360 830 L 400 830 L 400 870 L 430 870 L 430 815 L 450 800 L 470 815 L 470 870 C 520 840 580 835 620 855 L 650 855 L 650 820 L 690 820 L 690 855 C 740 830 800 820 840 845 C 870 860 890 870 910 880';
const SKY_LEN = 1100;
// the TV tower on the far hill
const TOWER = 'M 760 828 L 772 700 L 784 828 M 765 780 L 779 780 M 768 740 L 776 740 M 772 700 L 772 670';
const TOWER_LEN = 420;

export const V61GoodMorning: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const first = ctx.index === 0;
  const draw = first ? 1 : prog(frame, e, 26, ease.drawOn);
  const tone = p.tone ?? 'down';

  const sunF = Math.max(base + 4, cueFrame(ctx, p.sunAt ?? 1));
  const clockF = Math.max(sunF + 8, cueFrame(ctx, p.clockAt ?? 2));
  const tickF = Math.max(clockF + 8, cueFrame(ctx, p.tickerAt ?? 3));
  const pipsF = Math.max(tickF + 10, cueFrame(ctx, p.pipsAt ?? 4));

  // the sun: low behind the hills at frame 0, it climbs from sunF and keeps drifting up
  const rise = spr(frame, sunF, 'enterXL');
  const sunY = lerp(905, 760, rise) - 12 * prog(frame, sunF + 20, ctx.dur, ease.camera);
  const rays = prog(frame, sunF + 6, 22, ease.enter);

  // the clock: 08:59 until clockF, a flip of the last digits
  const flip = prog(frame, clockF, 8, ease.enter);
  const after = frame >= clockF + 4;
  const clockPop = spr(frame, clockF, 'land');

  // the ticker slides in from the left on a hard edge (inside the TV glass)
  const tick = spr(frame, tickF, 'enter');
  const tickX = lerp(-(TX1 - TX0), 0, tick);
  const label = mtav(p.ticker ?? 'დღის მთავარი ამბავი');
  const lSize = Math.min(30, Math.floor((30 * 360) / Math.max(1, textWidth(label, `600 30px ${F.sans}`))));

  // a slow camera push into the TV over the whole scene
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const live = 0.55 + 0.45 * Math.cos(frame / 9);

  const pips = [0, 1, 2].map((i) => spr(frame, pipsF + i * 6, 'land'));
  const hot = toneBig(tone);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(52px) scale(${push * 1.08})`, transformOrigin: '540px 778px'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <clipPath id="v61-glass">
              <rect x={TX0 + 10} y={TY0 + 10} width={TX1 - TX0 - 20} height={TY1 - TY0 - 20} rx={22} />
            </clipPath>
            <clipPath id="v61-sky">
              <rect x={TX0 + 10} y={TY0 + 10} width={TX1 - TX0 - 20} height={HORIZON - TY0 - 6} />
            </clipPath>
          </defs>
          {/* the set: the TV body, its glass, its little stand */}
          <rect x={TX0} y={TY0} width={TX1 - TX0} height={TY1 - TY0} rx={30} fill={C.surface} stroke={C.ink} strokeWidth={2.2} opacity={draw} />
          <rect x={TX0 + 10} y={TY0 + 10} width={TX1 - TX0 - 20} height={TY1 - TY0 - 20} rx={22} fill={C.screen} stroke={C.rule} strokeWidth={1.5} opacity={draw} />
          <path d={`M 470 ${TY1} L 450 ${TY1 + 46} M 610 ${TY1} L 630 ${TY1 + 46} M 410 ${TY1 + 46} L 670 ${TY1 + 46}`} stroke={C.ink2} strokeWidth={2} fill="none" strokeLinecap="round" opacity={draw} />
          <g clipPath="url(#v61-glass)">
            {/* the sun, behind the hills */}
            <g clipPath="url(#v61-sky)">
              <circle cx={600} cy={sunY} r={58} fill="none" stroke={C.ink} strokeWidth={2.2} />
              <circle cx={600} cy={sunY} r={58} fill={rgba(C.ink, 0.06)} />
              {Array.from({length: 12}, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                const r0 = 74;
                const r1 = 74 + 26 * rays;
                return (
                  <line key={i} x1={600 + Math.cos(a) * r0} y1={sunY + Math.sin(a) * r0} x2={600 + Math.cos(a) * r1} y2={sunY + Math.sin(a) * r1} stroke={C.ink2} strokeWidth={2} strokeLinecap="round" opacity={rays} />
                );
              })}
            </g>
            {/* the city line */}
            <path d={SKY} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray={SKY_LEN} strokeDashoffset={SKY_LEN * (1 - draw)} />
            <path d={TOWER} fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeDasharray={TOWER_LEN} strokeDashoffset={TOWER_LEN * (1 - draw)} />
            <line x1={TX0 + 10} y1={HORIZON + 30} x2={TX1 - 10} y2={HORIZON + 30} stroke={C.rule} strokeWidth={1.5} opacity={draw} />
            {/* the ticker */}
            <g transform={`translate(${tickX} 0)`}>
              <rect x={TX0 + 10} y={952} width={TX1 - TX0 - 20} height={88} fill={C.ink} />
              <rect x={TX0 + 10} y={952} width={170} height={88} fill={hot} />
              {/* a car glyph on the red tag */}
              <g transform="translate(205 996)" stroke={C.onInk} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M -46 10 L -46 -4 L -30 -8 L -18 -22 L 16 -22 L 30 -8 L 46 -4 L 46 10 Z" />
                <circle cx={-26} cy={12} r={7} />
                <circle cx={26} cy={12} r={7} />
              </g>
              {/* three day pips */}
              {pips.map((s, i) => (
                <g key={i}>
                  <circle cx={760 + i * 48} cy={996} r={14} fill="none" stroke={rgba(C.bg, 0.6)} strokeWidth={2} />
                  <circle cx={760 + i * 48} cy={996} r={14 * s} fill={hot} />
                </g>
              ))}
            </g>
          </g>
        </svg>
        {/* the corner bug: a live dot and the clock */}
        <div className={TXT} style={{position: 'absolute', left: TX1 - 236, top: TY0 + 34, width: 196, height: 60, borderRadius: 14, backgroundColor: rgba(C.bg, 0.92), border: `1.5px solid ${C.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: draw, transform: `scale(${1 + 0.06 * clockPop * (1 - clockPop)})`}}>
          <div style={{width: 12, height: 12, borderRadius: 6, backgroundColor: hot, opacity: live}} />
          <div style={{fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink, letterSpacing: 1}}>
            0{after ? '9' : '8'}:<span style={{opacity:Math.abs(flip - 0.5) * 2}}>{after ? '00' : '59'}</span>
          </div>
        </div>
        {/* the ticker's label, riding with it */}
        <div className={TXT} style={{position: 'absolute', left: TX0 + 200 + tickX, top: 952, height: 88, width: 380, display: 'flex', alignItems: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: lSize, color: C.onInk, opacity: tick > 0.02 ? 1 : 0, clipPath: `inset(0 0 0 ${Math.max(0, -tickX - 200)}px)`}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-swell" at={sunF} volume={0.3} />
      <Sfx name="asmr-flap" at={clockF} volume={0.45} />
      <Land at={clockF + 4} />
      <Sfx name="asmr-slide" at={tickF} volume={0.4} />
      <Haptic kind="light" at={tickF + 6} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="asmr-pop" at={pipsF + i * 6} volume={0.4} />
      ))}
    </PictureBand>
  );
};
