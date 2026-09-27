// v27-homebody: the tech passport is a homebody. A line-art phone holds the document's photo; dotted roads lead
// out of it to the corners. On the chunk `at` the roads pull back into the phone, the photo settles into its place
// and a roof draws on over the phone: the phone is the document's home, and it stays there.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, halo, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // chunk (or "1.2s") where the roads pull back and the roof lands
  doc?: string; // the title printed on the document card
  label?: string; // a quiet mono word under the house once the roof is on
  tone?: Tone;
};

// the phone, in stage units
const PX = 370;
const PY = 560;
const PW = 340;
const PH = 660;
// the roads out of the phone: from a point on its edge to far outside, a gentle curve each
const ROADS = [
  'M 370 700 C 280 660 200 560 150 470',
  'M 710 700 C 800 660 880 560 930 470',
  'M 370 1060 C 270 1090 200 1150 150 1230',
  'M 710 1060 C 810 1090 880 1150 930 1230',
  'M 540 560 C 540 500 540 460 540 410',
];
const RLEN = 300;

export const V27Homebody: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = Math.max(0, lead(ctx));
  const tone = p.tone ?? 'up';
  const go = Math.max(base + 10, cueFrame(ctx, p.at ?? 1));

  // the phone and the card are there on the cut frame, drawing their last bit
  const draw = prog(frame, e, 30, ease.drawOn);
  const card = spr(frame, e, 'enter');
  // on `at`: the roads retract, the card settles, the roof draws on
  const back = prog(frame, go, 20, ease.camera);
  const settle = spr(frame, go + 4, 'land');
  const roof = prog(frame, go + 10, 22, ease.drawOn);
  const roofLand = go + 32;
  const glow = spr(frame, roofLand, 'land');
  const push = lerp(1, 1.06, prog(frame, e, ctx.dur, ease.camera));

  // the card floats a little before, then sits
  const bob = Math.sin((frame - e) / 9) * 6 * (1 - settle);
  const cy = 880 + lerp(-26, 0, settle) + bob;
  const rot = lerp(-4, 0, settle);

  const docTitle = mtav(p.doc ?? 'ტექპასპორტი');
  const tSize = Math.min(30, Math.floor((30 * 220) / Math.max(1, textWidth(docTitle, `600 30px ${F.sans}`))));
  const label = p.label ? mtav(p.label) : '';
  const lineCol = C.ink;
  const green = toneBig(tone);

  // the roof: eaves just outside the phone's top corners, apex above
  const apexY = 420;
  const roofLen = 260;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the roads out: dotted, each with a small arrow, pulled back into the phone on `at` */}
          {ROADS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={rgba(C.ink, 0.55)} strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round"
              pathLength={RLEN} style={{strokeDashoffset: 0}} opacity={draw * (1 - back)} />
          ))}
          {ROADS.map((d, i) => {
            const end = [[150, 470], [930, 470], [150, 1230], [930, 1230], [540, 410]][+i];
            const from = [[370, 700], [710, 700], [370, 1060], [710, 1060], [540, 560]][+i];
            const k = 1 - back;
            const x = lerp(from[0], end[0], k);
            const y = lerp(from[1], end[1], k);
            return <circle key={`e${i}`} cx={x} cy={y} r={6} fill="none" stroke={rgba(C.ink, 0.7)} strokeWidth={1.8} opacity={draw * (1 - back)} />;
          })}
          {/* the phone */}
          <rect x={PX} y={PY} width={PW} height={PH} rx={54} fill={C.bg} stroke={lineCol} strokeWidth={2.4}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <rect x={PX + 130} y={PY + 20} width={80} height={22} rx={11} fill="none" stroke={rgba(C.ink, 0.6)} strokeWidth={1.6} opacity={draw} />
          {/* the roof: two lines from beyond the phone's top corners to the apex, a chimney */}
          <path d={`M ${PX - 50} ${PY + 30} L 540 ${apexY} L ${PX + PW + 50} ${PY + 30}`} fill="none" stroke={green} strokeWidth={2.6}
            strokeLinecap="round" strokeLinejoin="round" pathLength={roofLen} strokeDasharray={roofLen} strokeDashoffset={roofLen * (1 - roof)} />
          <path d={`M 640 ${apexY + 53} L 640 ${apexY + 10} L 672 ${apexY + 10} L 672 ${apexY + 75}`} fill="none" stroke={green} strokeWidth={2.2}
            strokeLinejoin="round" opacity={prog(frame, go + 26, 8)} />
          {/* the window light behind the card once home */}
          <rect x={PX + 24} y={PY + 70} width={PW - 48} height={PH - 140} rx={30} fill={halo(green, 0.10)} opacity={glow} />
        </svg>
        {/* the document card */}
        <div style={{position: 'absolute', left: 540 - 140, top: cy - 90, width: 280, height: 180, borderRadius: 16,
          border: `2px solid ${C.ink}`, backgroundColor: C.bg, transform: `rotate(${rot}deg) scale(${lerp(0.94, 1, card)})`, opacity: card}}>
          <div style={{position: 'absolute', left: 18, top: 56, width: 70, height: 88, borderRadius: 8, border: `1.6px solid ${rgba(C.ink, 0.7)}`}} />
          <svg width={280} height={180} style={{position: 'absolute', inset: 0}}>
            <circle cx={53} cy={88} r={14} fill="none" stroke={rgba(C.ink, 0.7)} strokeWidth={1.6} />
            <path d="M 30 136 C 36 112 70 112 76 136" fill="none" stroke={rgba(C.ink, 0.7)} strokeWidth={1.6} />
            {[70, 92, 114, 136].map((y, i) => (
              <line key={i} x1={108} x2={i === 3 ? 200 : 256} y1={y} y2={y} stroke={rgba(C.ink, 0.55)} strokeWidth={2} strokeLinecap="round" />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
              <line key={`b${i}`} x1={108 + i * 8 + (i % 3)} x2={108 + i * 8 + (i % 3)} y1={152} y2={166} stroke={rgba(C.ink, 0.45)} strokeWidth={i % 2 ? 1.5 : 3} />
            ))}
          </svg>
          <div className={TXT} style={{position: 'absolute', left: 18, top: 12, width: 244, fontFamily: F.sans, fontWeight: 600, fontSize: tSize, color: C.ink, whiteSpace: 'nowrap'}}>
            {docTitle}
          </div>
        </div>
        {label ? (
          <div className={TXT} style={{position: 'absolute', left: 120, width: 840, top: PY + PH + 34, textAlign: 'center', fontFamily: F.mono, fontSize: 30,
            letterSpacing: 4, color: C.ink2, opacity: glow, transform: `translateY(${(1 - glow) * 12}px)`}}>
            {label}
          </div>
        ) : null}
      </div>
      <Sfx name="asmr-air-long" at={go} volume={0.3} />
      <Sfx name="asmr-paper" at={go + 6} volume={0.4} />
      <Sfx name="asmr-pencil-short" at={go + 10} volume={0.4} />
      <Sfx name="asmr-knock" at={roofLand} volume={0.45} />
      <Haptic kind="light" at={go + 6} />
      <Haptic kind="light" at={roofLand} />
    </PictureBand>
  );
};
