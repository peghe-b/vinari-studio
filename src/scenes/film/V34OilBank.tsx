// V34OilBank: the dashboard's oil lamp is a coin bank. It lights up (the car tells you), shows it is empty (it will
// not pay), then a week of days walks under it and one coin a day drops in; on the last day the can is full and the
// lamp turns from red to green.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, vary} from '../common';
import {C, F, L, halo, rgba, toneBig, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  lampAt?: number | string; // the lamp lights
  emptyAt?: number | string; // the slot opens, the empty can rattles
  weekAt?: number | string; // the week of days draws on under the can
  bellAt?: number | string; // the 09:00 bell on the first day
  saveAt?: number | string; // the coins start dropping, one a day
  fullAt?: number | string; // the can is full, the lamp turns green
  bell?: string; // the mono time on the first day
  label?: string; // the word under the full can
};

// the can in its own units (0..410 x 0..240), drawn at S around the stage centre
const S = 1.55;
const OX = 540 - (410 * S) / 2;
const OY = 470;
const BODY = {x: 60, y: 90, w: 230, h: 140};
const SPOUT = 'M 290 118 L 398 72 L 404 84 L 290 160';
const HANDLE = 'M 60 112 C 6 112 6 204 60 204';
const CAP = {x: 140, y: 62, w: 62, h: 28};
const SLOT = {x: 218, y: 83, w: 50, h: 8};
const DAYS = 7;
const ROW_Y = 1010; // the week of days, stage y
const ROW_W = 700;

export const V34OilBank: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 24, ease.drawOn);

  const lampAt = Math.max(base + 4, cueFrame(ctx, p.lampAt ?? 0) + 6);
  const emptyAt = Math.max(lampAt + 12, cueFrame(ctx, p.emptyAt ?? 1));
  const weekAt = Math.max(emptyAt + 12, cueFrame(ctx, p.weekAt ?? 2));
  const bellAt = Math.max(weekAt + 14, cueFrame(ctx, p.bellAt ?? 3));
  const saveAt = Math.max(bellAt + 10, cueFrame(ctx, p.saveAt ?? 4));
  const fullAt0 = Math.max(saveAt + 7 * 5, cueFrame(ctx, p.fullAt ?? 5));
  const step = Math.max(4, Math.floor((fullAt0 - saveAt - 8) / DAYS));
  const fullAt = saveAt + step * DAYS + 8;

  const lit = prog(frame, lampAt, 8, ease.camera);
  const slot = prog(frame, emptyAt, 10, ease.camera);
  const green = prog(frame, fullAt, 10, ease.camera);
  const land = spr(frame, fullAt, 'land');

  // the empty can rattles once when the slot opens
  const rt = frame - emptyAt;
  const rattle = rt >= 0 && rt < 26 ? Math.sin(rt * 1.3) * 3.2 * (1 - rt / 26) : 0;

  // coins: one per day, falling into the slot
  const coins: {y: number; ry: number; o: number}[] = [];
  let inCan = 0;
  for (let i = 0; i < DAYS; i++) {
    const t0 = saveAt + i * step;
    const t = prog(frame, t0, 7, ease.camera);
    if (frame >= t0 + 7) inCan = i + 1;
    if (frame >= t0 && frame < t0 + 7) coins.push({y: lerp(-10, SLOT.y + 4, t), ry: lerp(24, 4, t * t), o: 1 - Math.max(0, t - 0.85) / 0.15});
  }
  const level = lerp(0, 1, prog(frame, saveAt + 4, step * DAYS + 4, ease.camera)) * Math.min(1, inCan / DAYS + 0.2);

  const down = toneBig('down');
  const up = toneBig('up');
  const lamp = green > 0 ? up : down;
  const lampO = frame < fullAt ? lit : 1;
  const stroke = frame >= fullAt ? up : lit > 0 ? down : C.ink;

  // the week under the can
  const row = prog(frame, weekAt, 20, ease.drawOn);
  const cursorDay = frame < saveAt ? 0 : Math.min(DAYS, Math.floor((frame - saveAt) / step) + 1);
  const bell = spr(frame, bellAt, 'land');
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));

  const label = mtav(p.label ?? 'ზეთის დღე');
  const lsize = Math.min(52, Math.floor((52 * 600) / Math.max(1, textWidth(label, `600 52px ${F.sans}`))));
  const bellText = p.bell ?? '09:00';

  const cellW = ROW_W / DAYS;
  const cells = [];
  for (let i = 0; i < DAYS; i++) {
    const cx = 540 - ROW_W / 2 + cellW * (i + 0.5);
    const on = prog(frame, weekAt + i * 2, 12, ease.camera);
    const done = i < cursorDay;
    cells.push(
      <g key={i} opacity={on * row}>
        <rect x={cx - 38} y={ROW_Y - 38} width={76} height={76} rx={16} fill={done ? C.ink : C.surface} stroke={done ? C.ink : C.rule} strokeWidth={1.6} />
        {done ? <circle cx={cx} cy={ROW_Y} r={13} fill="none" stroke={C.bg} strokeWidth={2.4} /> : null}
      </g>,
    );
  }
  const nums = [];
  for (let i = 0; i < DAYS; i++) {
    const cx = 540 - ROW_W / 2 + cellW * (i + 0.5);
    const on = prog(frame, weekAt + i * 2, 12, ease.camera);
    const done = i < cursorDay;
    nums.push(
      <div key={i} className={TXT} style={{position: 'absolute', left: cx - 40, width: 80, top: ROW_Y + 50, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: done ? C.ink : C.ink2, opacity: on * row}}>
        {String(DAYS - i)}
      </div>,
    );
  }

  const bx = OX + BODY.x * S;
  const by = OY + BODY.y * S;
  const bw = BODY.w * S;
  const bh = BODY.h * S;
  const lh = (bh - 24) * level;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`rotate(${rattle} 540 ${OY + 230 * S})`}>
            {/* the lamp's glow behind the can */}
            <ellipse cx={540} cy={OY + 150 * S} rx={330} ry={210} fill={halo(lamp, 0.08 * lampO)} />
            {/* the level inside the body */}
            <rect x={bx + 12} y={by + bh - 12 - lh} width={bw - 24} height={lh} rx={8} fill={frame >= fullAt ? rgba(up, 0.28 + 0.2 * green) : rgba(C.ink, 0.14)} />
            <g fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1400} strokeDashoffset={1400 * (1 - draw)}>
              <rect x={bx} y={by} width={bw} height={bh} rx={20} fill={rgba(lamp, 0.06 * lampO)} />
              <rect x={OX + CAP.x * S} y={OY + CAP.y * S} width={CAP.w * S} height={CAP.h * S} rx={8} />
              <path d={SPOUT} transform={`translate(${OX} ${OY}) scale(${S})`} strokeWidth={2.4 / S} />
              <path d={HANDLE} transform={`translate(${OX} ${OY}) scale(${S})`} strokeWidth={2.4 / S} />
            </g>
            {/* the drip at the spout */}
            <path
              d={`M ${OX + 404 * S} ${OY + 100 * S} q -12 18 0 26 q 12 -8 0 -26 z`}
              fill={stroke}
              opacity={draw * (0.5 + 0.5 * lampO)}
            />
            {/* the coin slot */}
            <rect x={OX + SLOT.x * S} y={OY + SLOT.y * S} width={SLOT.w * S} height={SLOT.h * S} rx={5} fill={C.ink} opacity={slot} />
            {/* coins in flight */}
            {coins.map((c, i) => (
              <g key={i} opacity={c.o}>
                <ellipse cx={OX + (SLOT.x + SLOT.w / 2) * S} cy={OY + c.y * S - 24} rx={30} ry={c.ry * 1.25} fill={C.surface} stroke={C.ink} strokeWidth={2} />
                <ellipse cx={OX + (SLOT.x + SLOT.w / 2) * S} cy={OY + c.y * S - 24} rx={18} ry={c.ry * 0.75} fill="none" stroke={C.ink2} strokeWidth={1.4} />
              </g>
            ))}
            {/* the empty mark: a dashed floor line inside the can */}
            <line x1={bx + 30} x2={bx + bw - 30} y1={by + bh - 22} y2={by + bh - 22} stroke={C.ink2} strokeWidth={1.6} strokeDasharray="6 8" opacity={slot * (1 - Math.min(1, level * 4))} />
          </g>
          {/* the week */}
          <line x1={540 - ROW_W / 2} x2={540 - ROW_W / 2 + ROW_W * row} y1={ROW_Y + 104} y2={ROW_Y + 104} stroke={C.rule} strokeWidth={1.5} />
          {cells}
          {/* the bell ring on the first day */}
          <circle cx={540 - ROW_W / 2 + cellW / 2} cy={ROW_Y} r={46 + 30 * bell} fill="none" stroke={rgba(C.ink, 0.5)} strokeWidth={1.5} opacity={frame >= bellAt ? Math.max(0, 1 - bell) : 0} />
        </svg>
        {nums}
        <div className={TXT} style={{position: 'absolute', left: 540 - ROW_W / 2 + cellW / 2 - 90, width: 180, top: ROW_Y - 100, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: C.ink, opacity: frame >= bellAt ? Math.min(1, bell * 1.4) * (1 - prog(frame, saveAt, 8, ease.camera)) : 0, transform: `translateY(${(1 - bell) * 10}px)`}}>
          {bellText}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 120, width: 840, top: ROW_Y - 108, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: lsize, color: toneText('up'), opacity: frame >= fullAt ? land : 0, transform: `translateY(${(1 - land) * 14}px)`}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-screen" at={lampAt} volume={0.4} />
      <Haptic kind="light" at={lampAt} />
      <Sfx name="asmr-knock" at={emptyAt} volume={0.45} />
      <Sfx name="asmr-pencil" at={weekAt} volume={0.3} />
      <Sfx name="asmr-notif" at={bellAt} volume={0.4} />
      {Array.from({length: DAYS}, (_, i) => (
        <Sfx key={i} name="asmr-tick-fine" at={saveAt + i * step + 6} volume={0.4 * vary(i + 1)} />
      ))}
      <Land at={fullAt} />
      <Sfx name="asmr-check" at={fullAt + 2} volume={0.4} />
    </PictureBand>
  );
};
