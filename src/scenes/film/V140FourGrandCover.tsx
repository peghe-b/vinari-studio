// v140-four-grand's cover (cover.art): ONE premium object. A long workshop receipt in a studio light, its paper turned
// a little, printed with the engine's noise as a big sound wave at the topY, line after line of charges under it, the
// total in bold, and the paper curling up at its foot (it runs on and on). Paper with real shading, a soft shadow on
// the field; black and white only.
import React, {useId} from 'react';
import {C} from '../../tokens';
import {CoverArt, Spot, type CoverP} from '../kit/cover';

export const V140FourGrandCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  const w = 470;
  const x0 = 540 - w / 2;
  const topY = 26;
  const curlY = H - 70; // where the paper starts to curl back up
  // the torn top: small even teeth
  const teeth = 16;
  let torn = `M${x0} ${topY + 10}`;
  for (let i = 1; i <= teeth; i++) torn += ` L${(x0 + (w * (i - 0.5)) / teeth).toFixed(1)} ${topY} L${(x0 + (w * i) / teeth).toFixed(1)} ${topY + 10}`;
  const sheet = `${torn} L${x0 + w} ${curlY} L${x0} ${curlY} Z`;
  // the noise: a burst between two quiet stretches, printed as solid rounded bars
  const bars = Array.from({length: 46}, (_, i) => {
    const t = Math.abs(i - 23) / 23;
    const a = (1 - t) ** 1.4 * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.9 + 0.7))) * 62 + 4;
    return {x: x0 + 48 + i * ((w - 96) / 45), a};
  });
  const rows = [0, 1, 2, 3, 4, 5, 6];
  const rowY = (i: number) => topY + 250 + i * 54;
  return (
    <CoverArt p={p}>
      <defs>
        <linearGradient id={`pa${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2F2F2" />
          <stop offset="0.12" stopColor="#FFFFFF" />
          <stop offset="0.85" stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#E9E9E9" />
        </linearGradient>
        <linearGradient id={`cu${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D6D6D6" />
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E2E2E2" />
        </linearGradient>
        <filter id={`sh${uid}`} x="-30%" y="-10%" width="160%" height="130%">
          <feGaussianBlur stdDeviation={22} />
        </filter>
      </defs>
      <Spot cx={540} cy={H * 0.48} r={520} />
      <g transform={`rotate(-5 540 ${H / 2})`}>
        {/* the soft shadow the long sheet throws on the field */}
        <path d={sheet} fill="rgba(0,0,0,0.20)" transform="translate(26 30)" filter={`url(#sh${uid})`} />
        <path d={sheet} fill={`url(#pa${uid})`} />
        {/* the print: a header line, the noise, the charges, a dashed rule, the total */}
        <rect x={x0 + 48} y={topY + 46} width={150} height={14} rx={7} fill={C.ink} />
        <rect x={x0 + w - 48 - 90} y={topY + 46} width={90} height={14} rx={7} fill="rgba(11,11,11,0.35)" />
        {bars.map((b, i) => (
          <rect key={i} x={b.x - 3.5} y={topY + 160 - b.a} width={7} height={b.a * 2} rx={3.5} fill={C.ink} />
        ))}
        {rows.map((i) => (
          <g key={i}>
            <rect x={x0 + 48} y={rowY(i)} width={150 + ((i * 53) % 110)} height={12} rx={6} fill="rgba(11,11,11,0.28)" />
            <rect x={x0 + w - 48 - 74} y={rowY(i)} width={74} height={12} rx={6} fill="rgba(11,11,11,0.45)" />
          </g>
        ))}
        <path d={`M${x0 + 48} ${rowY(7) + 6} L${x0 + w - 48} ${rowY(7) + 6}`} stroke="rgba(11,11,11,0.4)" strokeWidth={4} strokeDasharray="10 10" strokeLinecap="round" />
        <rect x={x0 + 48} y={rowY(7) + 40} width={130} height={22} rx={11} fill={C.ink} />
        <rect x={x0 + w - 48 - 170} y={rowY(7) + 34} width={170} height={34} rx={17} fill={C.ink} />
        {/* the foot: the paper curls back up toward the viewer */}
        <path d={`M${x0} ${curlY} L${x0 + w} ${curlY} C ${x0 + w} ${curlY + 70}, ${x0 + w - 10} ${curlY + 120}, ${x0 + w - 60} ${curlY + 118} L${x0 + 60} ${curlY + 118} C ${x0 + 10} ${curlY + 120}, ${x0} ${curlY + 70}, ${x0} ${curlY} Z`} fill={`url(#cu${uid})`} />
        <path d={`M${x0 + 60} ${curlY + 118} C ${x0 + 30} ${curlY + 116}, ${x0 + 30} ${curlY + 84}, ${x0 + 70} ${curlY + 80} L${x0 + w - 70} ${curlY + 80} C ${x0 + w - 30} ${curlY + 84}, ${x0 + w - 30} ${curlY + 116}, ${x0 + w - 60} ${curlY + 118} Z`} fill="#C9C9C9" />
      </g>
    </CoverArt>
  );
};
