// V30CarTranslator: the car speaks in its own language (a knocking scribble in a speech bubble), Vinari listens (corner
// brackets catch a piece of it), and the piece drops into a second bubble in your language, where a pill runs over
// knock, squeal and hum and settles on one: a phrasebook between the car and you.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  listenAt?: number | string; // the brackets catch the sound (default chunk 1)
  translateAt?: number | string; // the piece drops into your bubble (default chunk 2)
  wordsAt?: number | string; // the three words and the pill (default chunk 3)
  words?: string[]; // default კაკუნი, ჭრიალი, გუგუნი
  pick?: number; // the word the pill settles on (default 0)
  carLabel?: string;
  youLabel?: string;
};

const X0 = 150;
const X1 = 930;
const TOP_Y0 = 420;
const TOP_Y1 = 700;
const LOW_Y0 = 890;
const LOW_Y1 = 1170;
const WAVE_X0 = 200;
const WAVE_X1 = 880;
const WAVE_Y = 580;
const BR_X0 = 380;
const BR_X1 = 700;
const N = 136;

const bubble = (y0: number, y1: number, tailLeft: boolean) => {
  const r = 40;
  const t0 = tailLeft ? 250 : 750;
  const t1 = tailLeft ? 330 : 830;
  const tip = tailLeft ? 220 : 870;
  const bottom = tailLeft
    ? `L ${t1} ${y1} L ${tip} ${y1 + 62} L ${t0} ${y1}`
    : `L ${t1} ${y1} L ${tip} ${y1 + 62} L ${t0} ${y1}`;
  return `M ${X0 + r} ${y0} L ${X1 - r} ${y0} Q ${X1} ${y0} ${X1} ${y0 + r} L ${X1} ${y1 - r} Q ${X1} ${y1} ${X1 - r} ${y1} ${bottom} L ${X0 + r} ${y1} Q ${X0} ${y1} ${X0} ${y1 - r} L ${X0} ${y0 + r} Q ${X0} ${y0} ${X0 + r} ${y0} Z`;
};

const waveY = (u: number, amp: number) => {
  const d = ((u % 17) + 17) % 17;
  const spike = Math.exp(-((d - 3) * (d - 3)) / 0.9) * (0.75 + 0.25 * Math.sin(u * 0.21));
  const side = Math.sin(u * 2.7) > 0 ? 1 : -1;
  const noise = 0.1 * Math.sin(u * 1.7) * Math.sin(u * 0.53 + 1);
  return WAVE_Y - 78 * amp * (spike * side + noise);
};

const corner = (x: number, y: number, sx: number, sy: number, len: number) => `M ${x + sx * len} ${y} L ${x} ${y} L ${x} ${y + sy * len}`;

export const V30CarTranslator: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const listen = Math.max(base + 10, cueFrame(ctx, p.listenAt ?? 1));
  const translate = Math.max(listen + 10, cueFrame(ctx, p.translateAt ?? 2));
  const wordsF = Math.max(translate + 12, cueFrame(ctx, p.wordsAt ?? 3));
  const words = (p.words && p.words.length === 3 ? p.words : ['კაკუნი', 'ჭრიალი', 'გუგუნი']).map((w) => mtav(w));
  const pick = Math.min(2, Math.max(0, p.pick ?? 0));

  // the camera: a slow push, then a small drift down towards your bubble once it speaks
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const drift = lerp(0, -30, prog(frame, translate, 40, ease.camera));

  // the car's bubble and its knocking line
  const drawTop = prog(frame, e, 24, ease.drawOn);
  const calm = prog(frame, translate, 30, ease.camera);
  const amp = lerp(1, 0.45, calm);
  const scroll = frame * 0.7;
  let pts = '';
  let inner = '';
  for (let i = 0; i <= N; i++) {
    const x = WAVE_X0 + (i * (WAVE_X1 - WAVE_X0)) / N;
    const y = waveY(i + scroll, amp);
    pts += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    if (x >= BR_X0 && x <= BR_X1) inner += `${inner === '' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  const waveLen = 2600;

  // Vinari listens: brackets close in on a piece of the line, the rest goes quiet
  const br = spr(frame, listen, 'land');
  const inset = lerp(40, 0, br);
  const dimOut = lerp(1, 0.28, prog(frame, listen, 14, ease.camera));

  // the piece travels down to your bubble
  const fall = prog(frame, translate, 18, ease.camera);
  const drawLow = prog(frame, translate + 6, 22, ease.drawOn);
  const dotY = lerp(TOP_Y1 + 8, LOW_Y0 - 8, fall);
  const dotOn = frame >= translate && frame < translate + 20 ? 1 : 0;

  // the words and the pill running over them with the voice, then settling
  const chipsF = translate + 16;
  const wordsIn = [0, 1, 2].map((i) => spr(frame, chipsF + i * 5, 'enter'));
  const span = Math.max(30, ctx.dur - wordsF);
  const s1 = wordsF + Math.round(span * 0.2);
  const s2 = wordsF + Math.round(span * 0.38);
  const s3 = wordsF + Math.round(span * 0.56);
  const pos = frame < s1 ? 0 : frame < s2 ? lerp(0, 1, spr(frame, s1, 'tap')) : frame < s3 ? lerp(1, 2, spr(frame, s2, 'tap')) : lerp(2, pick, spr(frame, s3, 'land'));
  const landed = spr(frame, s3 + 4, 'land');
  const pillOn = prog(frame, wordsF, 8, ease.camera);

  const size0 = 58;
  const gapW = 34;
  const padX = 28;
  const widths = words.map((w) => textWidth(w, `600 ${size0}px ${F.sans}`) + padX * 2);
  const total = widths[0] + widths[1] + widths[2] + gapW * 2;
  const k = Math.min(1, 700 / Math.max(1, total));
  const size = Math.floor(size0 * k);
  const ws = widths.map((w) => w * k);
  const rowW = ws[0] + ws[1] + ws[2] + gapW * 2 * k;
  const left0 = 540 - rowW / 2;
  const lefts = [left0, left0 + ws[0] + gapW * k, left0 + ws[0] + ws[1] + gapW * 2 * k];
  const pillL = pos <= 1 ? lerp(lefts[0], lefts[1], pos) : lerp(lefts[1], lefts[2], pos - 1);
  const pillW = pos <= 1 ? lerp(ws[0], ws[1], pos) : lerp(ws[1], ws[2], pos - 1);
  const rowY = (LOW_Y0 + LOW_Y1) / 2 + 20;
  const pillH = size * 1.5;
  const near = (i: number) => Math.max(0, 1 - Math.abs(pos - i));

  const carLabel = mtav(p.carLabel ?? 'მანქანა');
  const youLabel = mtav(p.youLabel ?? 'შენს ენაზე');
  const mono = `500 26px ${F.mono}`;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${drift}px) scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={bubble(TOP_Y0, TOP_Y1, true)} fill={C.surface} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" strokeDasharray={3200} strokeDashoffset={3200 * (1 - drawTop)} fillOpacity={drawTop} />
          <path d={pts} fill="none" stroke={rgba(C.ink, dimOut)} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={waveLen} strokeDashoffset={waveLen * (1 - drawTop)} />
          {frame >= listen ? <path d={inner} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {frame >= listen ? (
            <g stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" opacity={br}>
              <path d={corner(BR_X0 - 16 - inset, WAVE_Y - 96 - inset, 1, 1, 30)} />
              <path d={corner(BR_X1 + 16 + inset, WAVE_Y - 96 - inset, -1, 1, 30)} />
              <path d={corner(BR_X0 - 16 - inset, WAVE_Y + 96 + inset, 1, -1, 30)} />
              <path d={corner(BR_X1 + 16 + inset, WAVE_Y + 96 + inset, -1, -1, 30)} />
            </g>
          ) : null}
          <line x1={540} y1={TOP_Y1 + 14} x2={540} y2={LOW_Y0 - 14} stroke={C.rule} strokeWidth={2} strokeDasharray="4 10" strokeLinecap="round" opacity={prog(frame, listen, 12, ease.camera)} />
          {dotOn ? <circle cx={540} cy={dotY} r={10} fill={C.ink} /> : null}
          <path d={bubble(LOW_Y0, LOW_Y1, false)} fill={C.surface} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" strokeDasharray={3200} strokeDashoffset={3200 * (1 - drawLow)} fillOpacity={drawLow} />
          {frame >= wordsF ? <rect x={pillL} y={rowY - pillH / 2} width={pillW} height={pillH} rx={pillH / 2} fill={C.ink} opacity={pillOn} /> : null}
          {frame >= s3 + 4 ? <rect x={lefts[pick] - 10 * landed} y={rowY - pillH / 2 - 10 * landed} width={ws[pick] + 20 * landed} height={pillH + 20 * landed} rx={pillH / 2 + 10 * landed} fill="none" stroke={rgba(C.ink, 0.5 * (1 - landed))} strokeWidth={2} /> : null}
        </svg>
        <div className={TXT} style={{position: 'absolute', left: X0 + 40, top: TOP_Y0 + 26, font: mono, letterSpacing: 2, color: C.ink2, opacity: drawTop}}>
          {carLabel}
        </div>
        <div className={TXT} style={{position: 'absolute', left: X0 + 40, top: LOW_Y0 + 26, font: mono, letterSpacing: 2, color: C.ink2, opacity: drawLow}}>
          {youLabel}
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={TXT}
            style={{
              position: 'absolute',
              left: lefts[+i],
              width: ws[+i],
              top: rowY - pillH / 2,
              height: pillH,
              lineHeight: `${pillH}px`,
              textAlign: 'center',
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: size,
              color: frame < wordsF ? C.ink2 : near(i) > 0.5 && pillOn > 0.5 ? C.bg : C.ink3,
              opacity: frame >= chipsF ? wordsIn[+i] : 0,
              transform: `translateY(${(1 - wordsIn[+i]) * 16}px)`,
            }}
          >
            {words[+i]}
          </div>
        ))}
      </div>
      <Sfx name="asmr-pencil-short" at={base + 1} volume={0.35} />
      <Sfx name="asmr-knock" at={base + 6} volume={0.3} />
      <Sfx name="asmr-knock" at={base + 15} volume={0.26} />
      <Sfx name="asmr-camera" at={listen} volume={0.35} />
      <Haptic kind="light" at={listen} />
      <Sfx name="asmr-air" at={translate} volume={0.3} />
      <Sfx name="asmr-pencil-short" at={translate + 6} volume={0.3} />
      <Sfx name="asmr-knock" at={wordsF} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={s1} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={s2} volume={0.35} />
      <Land at={s3 + 4} />
      <Haptic kind="light" at={s3 + 4} />
    </PictureBand>
  );
};
