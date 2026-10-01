// v53-no-number: the glass that gossips. A number note on a line-art windshield sends the number out in rings and
// echoes (everyone reads it); the note peels away, a QR card lands in its place, and a thread runs from a passer-by's
// phone through the card to yours, past a struck-out "number" tag: you are reached with no number at all.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  number?: string; // the masked number on the note
  gossipAt?: number | string; // chunk: the glass starts telling everyone
  swapAt?: number | string; // chunk: the note peels off, the card lands
  linkAt?: number | string; // chunk: the thread runs phone -> card -> phone
  tag?: string; // the struck tag on the thread
  left?: string; // label under the passer-by's phone
  right?: string; // label under your phone
};

const CX = 540;
const CY = 610; // the note / card centre
const GLASS = 'M 300 450 L 780 450 Q 812 450 818 482 L 872 772 Q 878 800 850 800 L 230 800 Q 202 800 208 772 L 262 482 Q 268 450 300 450 Z';
const PH_L = 300;
const PH_R = 780;
const PH_Y = 970; // the phones' top
const PH_W = 120;
const PH_H = 210;
const PATH_L = `M ${PH_L} ${PH_Y} C ${PH_L} 820 ${CX - 60} 760 ${CX} 700`;
const PATH_R = `M ${CX} 700 C ${CX + 60} 760 ${PH_R} 820 ${PH_R} ${PH_Y}`;
const SEG = 420; // about each half's length
const QN = 9; // modules a side

// a fixed module pattern (deterministic, finder corners kept)
const mod = (i: number, j: number) => {
  const corner = (a: number, b: number) => a < 3 && b < 3;
  if (corner(i, j) || corner(QN - 1 - i, j) || corner(i, QN - 1 - j)) {
    const a = i < 3 ? i : QN - 1 - i;
    const b = j < 3 ? j : QN - 1 - j;
    return !(a === 1 && b === 1);
  }
  return ((i * 7 + j * 13 + i * j * 5) % 11) % 3 === 0;
};

const bez = (a: number, b: number, c: number, d: number, u: number) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;

const Handset: React.FC<{x: number; on: number; lit: number; tone: string}> = ({x, on, lit, tone}) => (
  <g opacity={on} transform={`translate(0 ${(1 - on) * 24})`}>
    <rect x={x - PH_W / 2} y={PH_Y} width={PH_W} height={PH_H} rx={22} fill={C.screen} stroke={C.ink} strokeWidth={2} />
    <rect x={x - 18} y={PH_Y + 10} width={36} height={9} rx={4.5} fill={C.ink} opacity={0.8} />
    <rect x={x - PH_W / 2 + 12} y={PH_Y + 40} width={PH_W - 24} height={34} rx={9} fill="none" stroke={tone} strokeWidth={2} opacity={lit} />
    <circle cx={x - PH_W / 2 + 26} cy={PH_Y + 57} r={6} fill={tone} opacity={lit} />
    <line x1={x - PH_W / 2 + 40} y1={PH_Y + 52} x2={x + PH_W / 2 - 22} y2={PH_Y + 52} stroke={C.ink2} strokeWidth={2} opacity={lit} />
    <line x1={x - PH_W / 2 + 40} y1={PH_Y + 62} x2={x + 10} y2={PH_Y + 62} stroke={C.ink2} strokeWidth={2} opacity={lit} />
  </g>
);

export const V53NoNumber: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const gossip = Math.max(base + 6, cueFrame(ctx, p.gossipAt ?? 1));
  const swap = Math.max(gossip + 20, cueFrame(ctx, p.swapAt ?? 2));
  const link = Math.max(swap + 18, cueFrame(ctx, p.linkAt ?? 3));
  const red = toneBig('down');
  const green = toneBig('up');

  const draw = prog(frame, e, 24, ease.drawOn);
  const noteIn = spr(frame, e + 4, 'enter');
  // the note peels off its top-left corner and drops away, whole, before the band's edge
  const peel = prog(frame, swap, 22, ease.camera);
  const cardIn = spr(frame, swap + 10, 'land');
  // the gossip: rings and echoes while the note is up
  const talking = frame >= gossip && frame < swap + 6;
  const talkFade = 1 - prog(frame, swap - 4, 10, ease.camera);
  // the thread
  const t1 = prog(frame, link, 18, ease.camera);
  const t2 = prog(frame, link + 16, 18, ease.camera);
  const phones = spr(frame, link - 8, 'enter');
  const litR = spr(frame, link + 34, 'land');
  const strike = prog(frame, link + 18, 10, ease.camera);
  // the camera: a slow push on the note, then it eases back to take in the phones
  const push = lerp(1.06, 1, prog(frame, e, swap - e, ease.camera)) * lerp(1, 0.97, prog(frame, link - 8, 30, ease.camera));
  const lift = lerp(60, 0, prog(frame, link - 10, 28, ease.camera));

  const num = p.number ?? '5•• •• •• ••';
  const tag = mtav(p.tag ?? 'ნომერი');
  const left = mtav(p.left ?? 'გამვლელი');
  const right = mtav(p.right ?? 'შენ');
  const tagW = textWidth(tag, `600 30px ${F.sans}`) + 40;

  const rings = [0, 1, 2, 3];
  const echoes = [
    {dx: -300, dy: -110},
    {dx: 300, dy: -90},
    {dx: -270, dy: 150},
    {dx: 280, dy: 170},
  ];
  // the dot on the thread
  const onL = frame >= link && t1 < 1;
  const onR = t1 >= 1 && t2 < 1;
  const dx = onL ? bez(PH_L, PH_L, CX - 60, CX, t1) : bez(CX, CX + 60, PH_R, PH_R, t2);
  const dy = onL ? bez(PH_Y, 820, 760, 700, t1) : bez(700, 760, 820, PH_Y, t2);

  const cells: React.ReactNode[] = [];
  const S = 150;
  const m = S / (QN + 2);
  for (let i = 0; i < QN; i++) {
    for (let j = 0; j < QN; j++) {
      if (mod(i, j)) cells.push(<rect key={i * QN + j} x={CX - S / 2 + m * (j + 1)} y={CY - S / 2 + m * (i + 1)} width={m + 0.4} height={m + 0.4} fill={C.ink} />);
    }
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${lift}px) scale(${push})`, transformOrigin: `540px ${CY}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the windshield */}
          <path d={GLASS} fill="none" stroke={C.ink} strokeWidth={2.2} strokeDasharray={2200} strokeDashoffset={2200 * (1 - draw)} strokeLinejoin="round" />
          <path d="M 470 476 L 610 476" stroke={C.ink2} strokeWidth={2} opacity={draw} strokeLinecap="round" />
          <path d="M 300 770 L 340 530" stroke={rgba(C.ink, 0.18)} strokeWidth={10} opacity={draw} strokeLinecap="round" />
          {/* the gossip: rings out of the note */}
          {talking
            ? rings.map((k) => {
                const u = ((frame - gossip) / 30 + k / rings.length) % 1;
                return <ellipse key={k} cx={CX} cy={CY} rx={170 + u * 330} ry={70 + u * 200} fill="none" stroke={red} strokeWidth={2} opacity={(1 - u) * 0.7 * talkFade * prog(frame, gossip, 8, ease.camera)} />;
              })
            : null}
          {/* the card lands where the note was */}
          <g opacity={cardIn} transform={`translate(${CX} ${CY}) scale(${lerp(1.25, 1, cardIn)}) translate(${-CX} ${-CY})`}>
            <rect x={CX - S / 2 - 10} y={CY - S / 2 - 10} width={S + 20} height={S + 20} rx={10} fill={C.surface} stroke={C.ink} strokeWidth={2} />
            {cells}
          </g>
          {/* the thread: passer-by -> card -> you */}
          <path d={PATH_L} fill="none" stroke={green} strokeWidth={2.4} strokeDasharray={SEG} strokeDashoffset={SEG * (1 - t1)} strokeLinecap="round" />
          <path d={PATH_R} fill="none" stroke={green} strokeWidth={2.4} strokeDasharray={SEG} strokeDashoffset={SEG * (1 - t2)} strokeLinecap="round" />
          {onL || onR ? <circle cx={dx} cy={dy} r={9} fill={green} /> : null}
          <Handset x={PH_L} on={phones} lit={prog(frame, link - 4, 8, ease.camera)} tone={green} />
          <Handset x={PH_R} on={phones} lit={litR} tone={green} />
          {litR > 0.02 ? <circle cx={PH_R} cy={PH_Y + 57} r={20 + 40 * litR} fill="none" stroke={green} strokeWidth={1.5} opacity={(1 - litR) * 0.8} /> : null}
        </svg>
        {/* the note with the number: on the glass, then peeled away */}
        {peel < 1 ? (
          <div
            className={TXT}
            style={{
              position: 'absolute',
              left: CX - 190,
              top: CY - 64,
              width: 380,
              height: 128,
              borderRadius: 8,
              backgroundColor: C.surface,
              border: `2px solid ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F.mono,
              fontSize: 40,
              whiteSpace: 'nowrap',
              color: C.ink,
              opacity: noteIn * (1 - peel),
              transformOrigin: '20px 20px',
              transform: `translate(${peel * -60}px, ${peel * 220}px) rotate(${peel * -24}deg) scale(${lerp(0.94, 1, noteIn)})`,
            }}
          >
            {num}
          </div>
        ) : null}
        {/* the echoes: the number told to everyone around */}
        {talking
          ? echoes.map((o, k) => {
              const u = prog(frame, gossip + k * 5, 26, ease.camera);
              return (
                <div
                  key={k}
                  className={TXT}
                  style={{position: 'absolute', left: CX - 150 + o.dx * u, top: CY - 22 + o.dy * u, width: 300, textAlign: 'center', fontFamily: F.mono, fontSize: 34, color: toneText('down'), opacity: u * talkFade * 0.9}}
                >
                  {num}
                </div>
              );
            })
          : null}
        {/* the struck tag on the thread: no number travels */}
        <div
          className={TXT}
          style={{position: 'absolute', left: CX - tagW / 2, top: 828, width: tagW, height: 52, borderRadius: 26, border: `2px solid ${C.ink2}`, backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.ink2, opacity: spr(frame, link + 10, 'enter')}}
        >
          {tag}
          <div style={{position: 'absolute', left: 14, right: 14, top: 25, height: 2.5, backgroundColor: C.ink, transformOrigin: 'left center', transform: `scaleX(${strike})`}} />
        </div>
        {/* who is who */}
        <div className={TXT} style={{position: 'absolute', left: PH_L - 120, width: 240, top: PH_Y + PH_H + 14, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 32, color: C.ink2, opacity: phones}}>
          {left}
        </div>
        <div className={TXT} style={{position: 'absolute', left: PH_R - 120, width: 240, top: PH_Y + PH_H + 14, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 32, color: C.ink, opacity: phones}}>
          {right}
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-swell" at={gossip} volume={0.3} />
      <Haptic kind="light" at={gossip} />
      <Sfx name="asmr-paper-tear" at={swap} volume={0.4} />
      <Sfx name="asmr-knock" at={swap + 12} volume={0.45} />
      <Haptic kind="light" at={swap + 12} />
      <Sfx name="asmr-pencil-short" at={link} volume={0.35} />
      <Sfx name="asmr-strike" at={link + 18} volume={0.35} />
      <Sfx name="asmr-pop" at={link + 34} volume={0.45} />
      <Haptic kind="light" at={link + 34} />
    </PictureBand>
  );
};
