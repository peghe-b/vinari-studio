// v60-squint-reply: a comment under a post ("who will use a scanner, they can hardly see the code") sits on the
// field; on the chunk `markAt` a marker sweeps under its second line, then a reply from Vinari threads in below and
// starts typing (three dots), the answer the next beats give.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {BrandMark, cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  lines?: string[]; // the comment, one string per line
  label?: string; // the small mono label over it
  markAt?: number | string; // chunk (or "1.2s") where the marker sweeps under the last line
};

const CARD_X = 130;
const CARD_W = 820;
const CARD_Y = 590;
const CARD_H = 290;
const AV_X = 222;
const AV_Y = 700;
const TEXT_X = 296;
const TEXT_W = 560;
const REPLY_X = 310;
const REPLY_Y = 980;
const REPLY_W = 360;
const REPLY_H = 130;

export const V60SquintReply: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const card = spr(frame, e, 'enter');
  const mark = Math.max(base + 10, cueFrame(ctx, p.markAt ?? 1));
  const sweep = prog(frame, mark, 16, ease.drawOn);
  const replyAt = mark + 14;
  const thread = prog(frame, replyAt - 6, 14, ease.drawOn);
  const reply = spr(frame, replyAt, 'land');
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));

  const lines = (p.lines ?? ['ვინ გამოიყენებს?', 'კოდს ისედაც ძლივს ხედავენ']).map((s) => mtav(s));
  let size = 54;
  let last = '';
  for (const s of lines) {
    const w = textWidth(s, `500 54px ${F.sans}`);
    size = Math.min(size, Math.floor((54 * TEXT_W) / Math.max(1, w)));
    last = s;
  }
  const lineH = Math.round(size * 1.3);
  const textTop = AV_Y - 8;
  const lastIdx = lines.length - 1;
  const lastW = textWidth(last, `500 ${size}px ${F.sans}`);
  const markY = textTop + lastIdx * lineH + size * 0.62;

  const dots = [0, 1, 2].map((i) => {
    const t = frame - replyAt - 8 - i * 4;
    return t > 0 ? Math.max(0, Math.sin(t / 4.2)) : 0;
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g opacity={card} transform={`translate(0 ${(1 - card) * 24})`}>
            <rect x={CARD_X} y={CARD_Y} width={CARD_W} height={CARD_H} rx={30} fill={C.surface} stroke={C.rule} strokeWidth={1.5} />
            <circle cx={AV_X} cy={AV_Y} r={38} fill="none" stroke={C.ink2} strokeWidth={2} />
            <circle cx={AV_X} cy={AV_Y - 9} r={12} fill="none" stroke={C.ink2} strokeWidth={2} />
            <path d={`M ${AV_X - 22} ${AV_Y + 27} Q ${AV_X} ${AV_Y + 2} ${AV_X + 22} ${AV_Y + 27}`} fill="none" stroke={C.ink2} strokeWidth={2} />
            <rect x={TEXT_X - 6} y={markY - 2} width={(lastW + 12) * sweep} height={size * 0.42} rx={6} fill={rgba(C.ink, 0.13)} />
            <path d={`M ${CARD_X + CARD_W - 74} ${CARD_Y + CARD_H - 62} c -10 -12 -30 -4 -22 12 l 22 20 l 22 -20 c 8 -16 -12 -24 -22 -12 z`} fill="none" stroke={C.ink3} strokeWidth={1.8} />
          </g>
          <path
            d={`M ${AV_X} ${CARD_Y + CARD_H} L ${AV_X} ${REPLY_Y + REPLY_H / 2 - 30} Q ${AV_X} ${REPLY_Y + REPLY_H / 2} ${AV_X + 30} ${REPLY_Y + REPLY_H / 2} L ${REPLY_X} ${REPLY_Y + REPLY_H / 2}`}
            fill="none"
            stroke={C.rule}
            strokeWidth={2}
            strokeDasharray={420}
            strokeDashoffset={420 * (1 - thread)}
          />
          <g opacity={Math.min(1, reply * 1.4)} transform={`translate(${REPLY_X} ${REPLY_Y + (1 - reply) * 30})`}>
            <rect x={0} y={0} width={REPLY_W} height={REPLY_H} rx={REPLY_H / 2} fill={C.surface} stroke={C.ink} strokeWidth={2} />
            {dots.map((d, i) => (
              <circle key={i} cx={150 + i * 50} cy={REPLY_H / 2 - d * 10} r={11} fill={C.ink} opacity={0.35 + 0.65 * d} />
            ))}
          </g>
        </svg>
        <div style={{position: 'absolute', left: REPLY_X + 34, top: REPLY_Y + (1 - reply) * 30 + 38, opacity: Math.min(1, reply * 1.4)}}>
          <BrandMark kind="mark" height={44} />
        </div>
        <div className={TXT} style={{position: 'absolute', left: TEXT_X, top: CARD_Y + 34 + (1 - card) * 24, opacity: card, fontFamily: F.mono, fontSize: 26, letterSpacing: 2, color: C.ink2}}>
          {mtav(p.label ?? 'კომენტარი')}
        </div>
        <div className={TXT} style={{position: 'absolute', left: TEXT_X, top: textTop - size * 0.35 + (1 - card) * 24, opacity: card, fontFamily: F.sans, fontWeight: 500, fontSize: size, lineHeight: `${lineH}px`, color: C.ink, whiteSpace: 'nowrap'}}>
          {lines.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      </div>
      <Sfx name="asmr-knock" at={base + 1} volume={0.35} />
      <Sfx name="asmr-pencil-short" at={mark} volume={0.4} />
      <Sfx name="asmr-pop" at={replyAt} volume={0.45} />
      <Haptic kind="light" at={mark} />
      <Haptic kind="light" at={replyAt} />
    </PictureBand>
  );
};
