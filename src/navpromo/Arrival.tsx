// ARRIVAL, the payoff of „You have arrived": a quiet village street with a house and a wooden gate on the RIGHT; the hero car
// glides in and stops; a pin drops on the right side of the road. The forest's crude bubble 'YOU HAVE ARRIVED.' pops over
// the car and a crude red line strikes it out; the crude lost man pops out of the driver's window and his cow appears at the
// gate; both do a three-frame GIF dance under a few ink confetti and one green fleck.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {boilOf, C1, CowHead, CrudeMan, Line, Shape} from './crude';
import {Car, carBox} from './kit/car';
import {IlloDefs} from './kit/solid';
import {clamp, E, ev, fr, GREEN, hash, INK, INK3, lerp, prog, shot, sp} from './lib';
import {F} from '../tokens';

const W = 1080;
const H = 1920;
const GROUND = 1250;

export const Arrival: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const b = boilOf(t);
  const base = fr(shot('arrival').from);
  const end = fr(shot('arrival').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const strike = L('strike');
  const pin = L('pin');
  const dance = L('dance');
  const glide = E.out(prog(t, -2, 22));
  const carX = lerp(-380, 470, glide);
  const len = 600;
  const box = carBox('side', 'suv', len);
  const pitch = t > 14 && t < 26 ? Math.sin(((t - 14) / 12) * Math.PI) * 1.6 : 0;
  const pinK = sp(t, pin, 260, 12);
  const pinY = lerp(GROUND - 420, GROUND - 6, E.in2(clamp((t - pin) / 6)));
  const bubbleK = sp(t, 0, 300, 14);
  const strikeK = clamp((t - strike - 3) / 5);
  const pop = sp(t, dance - 8, 240, 13);
  const beat = Math.floor((t - dance) / 3) % 2;
  const dancing = t >= dance;
  const winX = carX + box.w * 0.08;
  const winY = GROUND - box.h * 0.66;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <IlloDefs uid={uid} />
      <rect width={W} height={H} fill="#FFFFFF" />
      <g transform={`translate(540 1000) scale(${1 + 0.025 * clamp(t / end)}) translate(-540 -1000)`}>
        {/* the street: a house at the back, a garden wall, the road, the kerb */}
        <path d="M-40 1080 L-40 820 L120 700 L280 820 L280 1080 Z" fill="#EDEDED" />
        <rect x={60} y={890} width={70} height={90} fill="#DADADA" />
        <rect x={170} y={890} width={70} height={90} fill="#DADADA" />
        <path d="M330 1080 L330 760 L520 640 L710 760 L710 1080 Z" fill="#E6E6E6" />
        <rect x={380} y={830} width={80} height={110} fill="#D2D2D2" />
        <rect x={580} y={830} width={80} height={110} fill="#D2D2D2" />
        <rect x={-40} y={1060} width={1160} height={30} fill="#E0E0E0" />
        {/* the wooden gate on the right, its posts and planks */}
        <g>
          <rect x={760} y={880} width={26} height={340} fill="#BFA98A" />
          <rect x={1000} y={880} width={26} height={340} fill="#BFA98A" />
          {Array.from({length: 7}, (_, i) => (
            <rect key={i} x={792 + i * 30} y={920 + (i % 2) * 6} width={24} height={300 - (i % 2) * 6} fill="#D9C7A6" stroke="#B59A72" strokeWidth={1.5} />
          ))}
          <rect x={786} y={980} width={214} height={14} fill="#C9B28C" />
          <rect x={786} y={1150} width={214} height={14} fill="#C9B28C" />
        </g>
        <rect x={-40} y={1220} width={1160} height={14} fill="#CFCFCF" />
        <rect x={-40} y={1234} width={1160} height={240} fill="#E4E4E4" />
        <line x1={-40} y1={1356} x2={1120} y2={1356} stroke="#FFFFFF" strokeWidth={6} strokeDasharray="60 50" />
        {/* the cow at the gate */}
        {t >= dance - 6 ? (
          <g transform={`translate(905 1040) rotate(${dancing ? (beat ? 9 : -9) : 0}) scale(${pop * 0.62}) translate(-905 -1040)`}>
            <CowHead x={905} y={1040} boil={b} chew={t * 0.7} />
          </g>
        ) : null}
        <Car uid={uid} x={carX} y={GROUND} len={len} view="side" body="suv" paint="a" dir={1} frame={t} speed={t < 18 ? lerp(0.6, 0, clamp(t / 18)) : 0} pitch={pitch} lights={{tail: 0.4}} />
        {/* the crude man pops out of the driver's window and dances */}
        {t >= dance - 8 ? (
          <g transform={`translate(${winX} ${winY}) scale(${pop}) translate(${-winX} ${-winY})`}>
            <CrudeMan x={winX} y={winY + 70} h={230} facing={0} arms={dancing ? (beat ? 'danceA' : 'danceB') : 'wave'} boil={b} legs={false} sticker mouth={1} />
          </g>
        ) : null}
        {/* the pin on the right side of the road, and its little arrow */}
        {t >= pin ? (
          <g transform={`translate(880 ${pinY}) scale(${pinK})`}>
            <path d="M0 0 C-12 -26 -40 -44 -40 -78 A40 40 0 1 1 40 -78 C40 -44 12 -26 0 0 Z" fill={INK} />
            <circle cx={0} cy={-78} r={15} fill="#FFFFFF" />
            <path d="M58 -40 L96 -40 M84 -52 L96 -40 L84 -28" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
        {/* the forest's bubble, struck out */}
        <g transform={`translate(520 720) scale(${bubbleK}) translate(-520 -720)`}>
          <Shape pts={[[250, 640], [790, 630], [800, 780], [560, 790], [500, 860], [500, 792], [240, 795]]} fill={C1.white} boil={b} seed={401} sw={5} />
          <text x={520} y={735} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={50} fill={C1.black}>
            YOU HAVE ARRIVED.
          </text>
          {strikeK > 0 ? <Line pts={[[262, 716], [262 + 520 * strikeK, 706 - 10 * strikeK]]} stroke={C1.red} sw={13} boil={b} seed={402} /> : null}
        </g>
        {/* ink confetti and one green fleck */}
        {dancing
          ? Array.from({length: 22}, (_, i) => {
              const k = t - dance;
              const x = 160 + ((hash(i, 1) + 1) / 2) * 820 + Math.sin(k / 4 + i) * 12;
              const y = 520 + ((hash(i, 2) + 1) / 2) * 120 + k * (6 + (hash(i, 3) + 1) * 3);
              return <rect key={i} x={x} y={y} width={i === 7 ? 16 : 12} height={i === 7 ? 9 : 6} fill={i === 7 ? GREEN : i % 3 === 0 ? INK3 : INK} transform={`rotate(${k * 12 + i * 40} ${x} ${y})`} />;
            })
          : null}
      </g>
    </svg>
  );
};
