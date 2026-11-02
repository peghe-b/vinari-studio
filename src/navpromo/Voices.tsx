// TWO VOICES: two white instant-photo cards on the white field, tilted apart; the years only (the clips say the names).
// No archival photo of Alice Ramsey was licence-checked for this film, so BOTH cards are typographic (symmetric): a big year
// and a tiny coast-to-coast route on the card's foot (both crossed America by car). While a voice speaks, its card lifts
// with sound rings. The jokes: the crude lost man pops in as a sticker with heart eyes for Alice, and his crude English phone
// tumbles into a refined bin whose lid clacks shut.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {boilOf, CrudeMan, CrudePhone, Shape} from './crude';
import {clamp, E, ev, fr, INK, INK3, lerp, prog, shot, sp} from './lib';
import {F} from '../tokens';

const Card: React.FC<{x: number; y: number; w: number; h: number; rot: number; year: string; lift: number; land: number}> = ({x, y, w, h, rot, year, lift, land}) => {
  const pad = 22;
  const picH = h - pad - 150;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y - 20 * lift + (1 - land) * -70,
        width: w,
        height: h,
        transform: `rotate(${rot}deg) scale(${lerp(1.06, 1, land)})`,
        opacity: clamp(land * 2),
        background: '#FFFFFF',
        borderRadius: 6,
        boxShadow: `0 ${10 + 18 * lift}px ${28 + 26 * lift}px rgba(0,0,0,${0.1 + 0.06 * lift}), 0 0 0 1px rgba(0,0,0,0.06)`,
      }}
    >
      {/* the print: a dark, neutral old photograph's tone with the year in white (a pale grey print read as a missing photo) */}
      <div style={{position: 'absolute', left: pad, top: pad, width: w - 2 * pad, height: picH, background: 'linear-gradient(160deg, #2A2A2A 0%, #151515 55%, #0C0C0C 100%)', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: picH / 2 - 70, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 128, lineHeight: 1, color: '#FFFFFF', fontFeatureSettings: '"tnum" 1', letterSpacing: '-0.01em'}}>{year}</div>
      </div>
      {/* the foot: a tiny route, one coast to the other */}
      <svg style={{position: 'absolute', left: pad, top: pad + picH + 30, width: w - 2 * pad, height: 90}} viewBox={`0 0 ${w - 2 * pad} 90`}>
        <path d={`M30 60 C ${w * 0.25} 10, ${w * 0.45} 80, ${w * 0.6} 36 S ${w - 90} 30, ${w - 2 * pad - 30} 44`} fill="none" stroke={INK3} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
        <circle cx={30} cy={60} r={7} fill={INK} />
        <circle cx={w - 2 * pad - 30} cy={44} r={7} fill="none" stroke={INK} strokeWidth={3} />
      </svg>
    </div>
  );
};

const Rings: React.FC<{cx: number; cy: number; t: number; on: boolean}> = ({cx, cy, t, on}) =>
  on ? (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {[0, 1, 2].map((i) => {
        const k = ((t + i * 10) % 30) / 30;
        return <circle key={i} cx={cx} cy={cy} r={230 + k * 120} fill="none" stroke={INK} strokeWidth={2} opacity={(1 - k) * 0.35} />;
      })}
    </svg>
  ) : null;

export const Voices: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const base = fr(shot('voices').from);
  const L = (name: string) => fr(ev(name)) - base;
  const nel = L('nelsonIntro');
  const ali = L('aliceIntro');
  const sticker = L('sticker');
  const bin = L('bin');
  const landL = sp(t, 0, 150, 16);
  const landR = sp(t, 3, 150, 16);
  const liftL = sp(t, nel, 160, 20) * (1 - sp(t, ali - 2, 160, 20));
  const liftR = sp(t, ali - 2, 160, 20);
  // the sticker
  const st = sp(t, sticker, 260, 14);
  // the phone tumbling into the bin, on twos
  const tb = Math.floor((t - bin) / 2) * 2;
  const fall = clamp(tb / 12);
  const phX = lerp(900, 850, fall);
  const phY = lerp(-220, 1290, E.in2(fall));
  const phR = tb * 22;
  const lidOpen = t >= bin ? clamp((t - bin) / 4) * (1 - clamp((t - bin - 13) / 2)) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF'}}>
      <Rings cx={310} cy={870} t={t} on={t >= nel && t < ali - 3} />
      <Rings cx={770} cy={870} t={t} on={t >= ali && t < ali + 62} />
      <Card x={110} y={560} w={400} h={620} rot={-3} year="1903" lift={liftL} land={landL} />
      <Card x={570} y={560} w={400} h={620} rot={4} year="1909" lift={liftR} land={landR} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* the bin: refined line art */}
        <g fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
          <path d="M780 1250 L800 1400 L900 1400 L920 1250" fill="#FFFFFF" />
          <path d="M818 1272 L828 1380 M850 1272 L850 1380 M882 1272 L872 1380" strokeWidth={2} />
          <g transform={`rotate(${-lidOpen * 38} 772 1246)`}>
            <path d="M770 1236 L930 1236 L930 1250 L770 1250 Z" fill="#FFFFFF" />
            <path d="M835 1236 L838 1224 L862 1224 L865 1236" />
          </g>
        </g>
        {t >= bin && t < bin + 14 ? (
          <g transform={`translate(${phX} ${phY}) rotate(${phR}) scale(0.28) translate(-540 -870)`}>
            <CrudePhone x={540} y={870} w={430} boil={b} arrow={0} hand={false} />
          </g>
        ) : null}
        {t >= sticker ? (
          <g transform={`translate(225 1405) scale(${st}) translate(-225 -1405)`}>
            <CrudeMan x={225} y={1405} h={235} facing={1} arms="down" boil={b} eyes="hearts" sticker legs />
            {[0, 1, 2].map((i) => {
              const k = ((t - sticker + i * 8) % 24) / 24;
              const hx = 200 + i * 30 + Math.sin((t + i * 7) / 3) * 6;
              const hy = 1160 - k * 90;
              return (
                <Shape
                  key={i}
                  pts={[
                    [hx, hy + 14],
                    [hx - 14, hy],
                    [hx - 13, hy - 9],
                    [hx - 5, hy - 12],
                    [hx, hy - 6],
                    [hx + 5, hy - 12],
                    [hx + 13, hy - 9],
                    [hx + 14, hy],
                  ]}
                  fill="#FF5C9A"
                  boil={b}
                  seed={300 + i}
                  sw={3}
                  amp={0.8}
                  opacity={1 - k}
                />
              );
            })}
          </g>
        ) : null}
      </svg>
    </div>
  );
};
