// V33WorstDay: a claw machine over the week. A red expiry tag hangs from a carriage on a rail, wanders over
// seven days of ordinary life, and drops on the worst one: the trip to the sea, then the wedding.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, halo, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  label?: string; // the word on the tag
  days?: string[]; // seven short day names
  wanderAt?: number; // chunk: the carriage starts to wander
  aimAt?: number; // chunk: it heads for the first target (the sea)
  dropAt?: number; // chunk: the first drop
  hopAt?: number; // chunk: it lifts and drops on the second target (the wedding)
};

const CARD_W = 104;
const GAP = 16;
const X0 = 128;
const CARD_TOP = 750;
const CARD_H = 320;
const RAIL_Y = 470;
const REST_Y = 610; // the tag's centre while it hangs
const LAND_Y = 764; // the tag's centre when it sits on a card's top
const FIRST = 5; // Saturday: the sea
const SECOND = 6; // Sunday: the wedding
const QUIET = 2; // Wednesday: where the carriage waits

const cx = (i: number) => X0 + i * (CARD_W + GAP) + CARD_W / 2;

// the icons, drawn around (0, 0) in a 60 px box
const Icon: React.FC<{i: number; color: string}> = ({i, color}) => {
  if (i === 0)
    return (
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-22} y={-12} width={44} height={30} rx={4} />
        <path d="M -8 -12 V -19 H 8 V -12 M -22 0 H 22" />
      </g>
    );
  if (i === 1)
    return (
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -16 -10 H 12 V 8 A 8 8 0 0 1 4 16 H -8 A 8 8 0 0 1 -16 8 Z M 12 -4 A 7 7 0 0 1 12 10" />
        <path d="M -8 -20 Q -5 -16 -8 -13 M 2 -20 Q 5 -16 2 -13" />
      </g>
    );
  if (i === 2) return <circle cx={0} cy={2} r={3} fill={color} />;
  if (i === 3)
    return (
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -24 -14 H -16 L -9 8 H 15 L 20 -8 H -13" />
        <circle cx={-5} cy={16} r={3} />
        <circle cx={12} cy={16} r={3} />
      </g>
    );
  if (i === 4)
    return (
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-17} y={-10} width={34} height={30} rx={4} />
        <path d="M -6 -10 V -17 H 6 V -10 M -7 -10 V 20 M 7 -10 V 20" />
      </g>
    );
  if (i === 5)
    return (
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={0} cy={-10} r={8} />
        <path d="M -24 8 q 6 -6 12 0 t 12 0 t 12 0 t 12 0 M -24 18 q 6 -6 12 0 t 12 0 t 12 0 t 12 0" />
      </g>
    );
  return (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={-7} cy={6} r={11} />
      <circle cx={7} cy={6} r={11} />
      <path d="M -7 -12 L -3 -8 L -7 -4 L -11 -8 Z" />
    </g>
  );
};

export const V33WorstDay: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = Math.max(0, lead(ctx));
  const draw = prog(frame, e, 26, ease.drawOn);

  const wander = Math.max(base + 6, cueFrame(ctx, p.wanderAt ?? 1));
  const aim = Math.max(wander + 10, cueFrame(ctx, p.aimAt ?? 2));
  const drop = Math.max(aim + 16, cueFrame(ctx, p.dropAt ?? 3));
  const hop = Math.max(drop + 16, cueFrame(ctx, p.hopAt ?? 4));

  // the carriage's x over time
  const wx = (f: number) => cx(QUIET) + 250 * Math.sin(Math.max(0, f - wander) * 0.085);
  const xAt = (f: number) => {
    if (f < aim) return wx(f);
    if (f < hop + 10) return lerp(wx(aim), cx(FIRST), prog(f, aim, 18, ease.camera));
    return lerp(cx(FIRST), cx(SECOND), prog(f, hop + 10, 14, ease.camera));
  };
  const x = xAt(frame);
  const v = x - xAt(frame - 1);
  const v2 = xAt(frame - 3) - xAt(frame - 4);
  // the tag sways against the motion, and settles
  const swing = Math.max(-16, Math.min(16, -(v * 0.9 + v2 * 0.5)));

  // the drops: down on `drop`, up on `hop`, down again after the slide
  const down1 = spr(frame, drop, 'land');
  const up = prog(frame, hop, 10, ease.camera);
  const down2 = spr(frame, hop + 26, 'land');
  const depth = frame < hop ? down1 : frame < hop + 26 ? 1 - up : down2;
  const tagY = lerp(REST_Y, LAND_Y, depth);
  const onFirst = frame >= drop && frame < hop;
  const onSecond = frame >= hop + 26;
  const hitF = onSecond ? hop + 26 : drop;
  const hit = frame >= hitF ? Math.max(0, 1 - (frame - hitF) / 14) : 0;
  const settled = frame >= drop + 4 && frame < hop ? 1 : frame >= hop + 30 ? 1 : 0;

  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const aimGlow = prog(frame, aim, 10);
  const days = p.days ?? ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];
  const red = toneBig('down');
  const label = mtav(p.label ?? 'ვადა');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the rail */}
          <line x1={X0} x2={X0 + (952 - X0) * draw} y1={RAIL_Y} y2={RAIL_Y} stroke={C.rule} strokeWidth={2} strokeLinecap="round" />
          <circle cx={X0} cy={RAIL_Y} r={5} fill={C.rule} opacity={draw} />
          <circle cx={952} cy={RAIL_Y} r={5} fill={C.rule} opacity={draw} />
          {/* the week */}
          {days.map((_, i) => {
            const target = (i === FIRST && (frame >= aim && frame < hop + 10)) || (i === SECOND && frame >= hop + 10);
            const struck = (i === FIRST && onFirst) || (i === SECOND && onSecond);
            const dip = struck ? hit * 10 : 0;
            const appear = prog(frame, e + i * 2, 16, ease.drawOn);
            const stroke = struck && settled ? red : target ? rgba(C.ink, 0.35 + 0.5 * aimGlow) : C.rule;
            return (
              <g key={i} transform={`translate(0 ${dip + (1 - appear) * 20})`} opacity={appear}>
                <rect x={cx(i) - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H} rx={16} fill={C.surface} stroke={stroke} strokeWidth={struck && settled ? 2.5 : 1.6} />
                <g transform={`translate(${cx(i)} ${CARD_TOP + 170}) scale(1.55)`}>
                  <Icon i={i} color={target || struck ? C.ink : C.ink2} />
                </g>
              </g>
            );
          })}
          {/* the string */}
          <line x1={x} y1={RAIL_Y + 10} x2={x + Math.sin((swing * Math.PI) / 180) * (tagY - 46 - RAIL_Y)} y2={tagY - 46} stroke={C.ink2} strokeWidth={1.6} opacity={draw} />
          {/* the carriage */}
          <rect x={x - 22} y={RAIL_Y - 10} width={44} height={20} rx={6} fill={C.bg} stroke={C.ink} strokeWidth={2} opacity={draw} />
          {/* the impact rings */}
          {hit > 0 ? (
            <ellipse cx={onSecond ? cx(SECOND) : cx(FIRST)} cy={CARD_TOP} rx={40 + (1 - hit) * 50} ry={8 + (1 - hit) * 10} fill="none" stroke={red} strokeWidth={1.6} opacity={hit * 0.8} />
          ) : null}
        </svg>
        {/* the tag, swaying on its string */}
        <div
          style={{
            position: 'absolute',
            left: x - 100,
            top: tagY - 48,
            width: 200,
            height: 96,
            transform: `rotate(${depth > 0.9 ? 0 : swing}deg)`,
            transformOrigin: `100px ${RAIL_Y - tagY + 48}px`,
            opacity: draw,
          }}
        >
          <svg width={200} height={96} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <rect x={4} y={4} width={192} height={88} rx={16} fill={red} style={{filter: `drop-shadow(0 0 18px ${halo(red, 0.35)})`}} />
            <circle cx={100} cy={4} r={6} fill={C.bg} stroke={C.ink2} strokeWidth={1.6} />
          </svg>
          <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 6, fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: C.bg, letterSpacing: 1}}>
            {label}
          </div>
        </div>
        {/* the day names */}
        {days.map((d, i) => {
          const struck = (i === FIRST && onFirst) || (i === SECOND && onSecond);
          const dip = struck ? hit * 10 : 0;
          const appear = prog(frame, e + i * 2, 16, ease.drawOn);
          return (
            <div
              key={i}
              className={TXT}
              style={{position: 'absolute', left: cx(i) - CARD_W / 2, width: CARD_W, top: CARD_TOP + CARD_H - 62 + dip + (1 - appear) * 20, textAlign: 'center', fontFamily: F.mono, fontSize: 28, color: struck && settled ? red : C.ink2, opacity: appear}}
            >
              {mtav(d)}
            </div>
          );
        })}
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-slide" at={wander} volume={0.3} />
      <Sfx name="asmr-air" at={aim} volume={0.3} />
      <Land at={drop + 4} />
      <Sfx name="asmr-knock" at={drop + 4} volume={0.45} />
      <Sfx name="asmr-slide" at={hop + 8} volume={0.25} />
      <Sfx name="asmr-knock" at={hop + 30} volume={0.4} />
      <Haptic kind="light" at={hop + 30} />
    </PictureBand>
  );
};
