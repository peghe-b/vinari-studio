// src/illo-kit/sil-sheet.tsx: the "Silhouette light" people on one sheet (the kit's people from CHAR_FROM; sil.tsx).
// Three people (a man, a woman, an older man) in two outfits each, in the moments a film needs: standing in profile, in
// three quarters, walking, on the phone, behind the wheel of a modern car, worried, relieved, pointing; then three head
// close-ups. Rendered as a still from the kit's bundle (tools/lock.sh, one Chrome job at a time):
//   npx remotion still src/illo-kit/index.ts sil-sheet out/char-next/final-sheet.png
//   npx remotion still src/illo-kit/index.ts sil-sheet-dark out/char-next/final-sheet-dark.png
import React, {useId} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import '../fonts';
import {Car} from '../scenes/illo/car';
import {Figure, type Cast} from '../scenes/illo/figure';
import type {Pose} from '../scenes/illo/poses';
import type {Face} from '../scenes/illo/faces';
import {DefsSvg} from '../scenes/illo/solid';
import {C, F, setAccents, setTheme, type AccentName} from '../tokens';

export const SIL_SHEET = {w: 2700, h: 3360};

type Who = {a: Cast; b: Cast; label: string};
const PEOPLE: Who[] = [
  {label: 'man', a: {is: 'man', gender: 'm', age: 'young', outfit: 'suit', tone: 7, hair: 'side', beard: 'none', glasses: 'none', hat: 'none', extras: ['tie']}, b: {is: 'man', gender: 'm', age: 'young', outfit: 'overcoat', tone: 1, hair: 'quiff', beard: 'stubble', glasses: 'none', hat: 'none'}},
  {label: 'woman', a: {is: 'woman', gender: 'f', age: 'young', outfit: 'trench', tone: 1, hair: 'pony', glasses: 'none', hat: 'none', extras: ['earrings']}, b: {is: 'woman', gender: 'f', age: 'young', outfit: 'dress', tone: 7, hair: 'bun', glasses: 'none', hat: 'none', shoe: 'heel'}},
  {label: 'older man', a: {is: 'grandpa', gender: 'm', age: 'old', outfit: 'overcoat', tone: 7, hair: 'receding', beard: 'short', glasses: 'rect', hat: 'none'}, b: {is: 'grandpa', gender: 'm', age: 'old', outfit: 'knit', tone: 1, hair: 'receding', beard: 'short', glasses: 'none', hat: 'flatCap'}},
];
type Col = {label: string; w: number; pose: Pose; face: Face; turn: number; frame?: number; car?: boolean; b?: boolean};
const COLS: Col[] = [
  {label: 'profile', w: 300, pose: 'stand', face: 'neutral', turn: 1},
  {label: 'three quarters', w: 300, pose: 'stand', face: 'neutral', turn: 0},
  {label: 'walking', w: 300, pose: 'walk', face: 'neutral', turn: 1, frame: 7},
  {label: 'on the phone', w: 300, pose: 'phoneEar', face: 'neutral', turn: 0.9},
  {label: 'behind the wheel', w: 600, pose: 'sitDrive', face: 'neutral', turn: 0.95, car: true, b: true},
  {label: 'worried', w: 300, pose: 'facepalm', face: 'worried', turn: 1, b: true},
  {label: 'relieved', w: 300, pose: 'confident', face: 'smile', turn: 0.9, b: true},
  {label: 'pointing', w: 300, pose: 'point', face: 'neutral', turn: 0.8, b: true},
];

const ROW_H = 820;
const TOP = 150;
const SIZE = 640;

export const SilSheet: React.FC<{look: 'light' | 'dark'; pair: AccentName}> = ({look, pair}) => {
  setTheme(look);
  setAccents(0, pair);
  const f = useCurrentFrame();
  const uid = useId();
  const {w: W, h: H} = SIL_SHEET;
  const label = (x: number, y: number, s: string, size = 22, anchor: 'start' | 'middle' = 'middle') => (
    <text x={x} y={y} fontFamily={F.mono} fontSize={size} letterSpacing="0.06em" fill={C.ink2} textAnchor={anchor}>
      {s.toUpperCase()}
    </text>
  );
  const cells: React.ReactNode[] = [];
  PEOPLE.forEach((who, r) => {
    let x0 = 0;
    COLS.forEach((col, c) => {
      const cx = x0 + col.w / 2;
      const feet = TOP + r * ROW_H + ROW_H - 60;
      const cast = col.b ? who.b : who.a;
      const key = `${r}-${c}`;
      if (col.car) {
        // a modern sedan in side view, its driver in the glass (the head, the neck and the shoulders: crop head)
        const len = 980;
        cells.push(
          <g key={key} clipPath={`url(#${uid}c${r})`}>
            <Car
              uid={uid}
              x={x0 + col.w / 2 - 40}
              y={feet - 20}
              len={len}
              body={r === 1 ? 'ev' : r === 2 ? 'suv' : 'sedan'}
              paint="a"
              frame={f}
              cabin={(b) => <Figure uid={uid} cast={cast} film={94} x={b.x + b.w * 0.6} y={b.y + b.h * 0.56} size={b.h * 6.4} crop="head" turn={0.95} face="neutral" frame={f} />}
            />
          </g>,
        );
      } else
        cells.push(
          <Figure key={key} uid={uid} cast={cast} film={94} x={cx} y={feet} size={SIZE} frame={col.frame ?? f} face={col.face} pose={col.pose} turn={col.turn} idle={false} hold={col.pose === 'phoneEar' ? 'phone' : undefined} />,
        );
      if (r === 0) cells.push(<g key={`l${c}`}>{label(cx, TOP - 30, col.label)}</g>);
      x0 += col.w;
    });
    cells.push(<g key={`r${r}`}>{label(24, TOP + r * ROW_H + 40, `${who.label} · ${COLS.filter((c) => !c.b).length} + ${COLS.filter((c) => c.b).length}`, 22, 'start')}</g>);
  });
  // the close-ups: the head, the neck and the shoulders, big
  const cy0 = TOP + 3 * ROW_H + 40;
  const closeH = H - cy0 - 40;
  const closes: [Cast, number, Face][] = [
    [PEOPLE[0].a, 1, 'neutral'],
    [PEOPLE[1].a, 0.3, 'smile'],
    [PEOPLE[2].a, 1, 'neutral'],
  ];
  closes.forEach(([cast, turn, face], i) => {
    const x = i * 900;
    cells.push(
      <g key={`cu${i}`} clipPath={`url(#${uid}u${i})`}>
        <rect x={x + 20} y={cy0} width={860} height={closeH} fill={look === 'light' ? '#EBEBEB' : '#0C0C0C'} />
        <Figure uid={uid} cast={cast} film={94} x={x + 450} y={cy0 + closeH * 0.42} size={closeH * 2.6} crop="head" turn={turn} face={face} frame={f} idle={false} />
      </g>,
    );
  });
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <DefsSvg uid={uid} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {PEOPLE.map((_, r) => (
            <clipPath key={r} id={`${uid}c${r}`}>
              <rect x={1200} y={TOP + r * ROW_H} width={600} height={ROW_H} />
            </clipPath>
          ))}
          {[0, 1, 2].map((i) => (
            <clipPath key={i} id={`${uid}u${i}`}>
              <rect x={i * 900 + 20} y={cy0} width={860} height={closeH} />
            </clipPath>
          ))}
        </defs>
        {label(24, 60, `vinari studio · the people from film ${94} · silhouette light · ${look} · ${pair}`, 26, 'start')}
        {cells}
      </svg>
    </AbsoluteFill>
  );
};
