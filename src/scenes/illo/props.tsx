// src/scenes/illo/props.tsx: the things a character holds (the Figure draws one at its holding hand, upright, under the
// gripping fingers). Built like the figure itself (rig.tsx): figure units (u), one matrix, filled parts with a shade
// crescent, the rim on a dark ground and the ink outline on paper. Grey ramp only; generic objects, no brand, no text.
//
//   phone      a slim current phone (`side` back: the dark back and the camera; front: a lit screen)
//   flowers    a bouquet: five rounded blooms il0..il2, leaves, stems in a paper cone
//   keys       a key fob (a modern smart key) and a key on a ring, hanging under the hand
//   wrench     an open-end wrench;  ticket: a paper slip with a perforation;  clipboard: board, clip, a page of lines
//   coffee     a takeaway cup (lid, sleeve) with a breath of steam;  trophy: a cup on a base
//   money      two banknotes fanned (generic: an oval, no real note);  ringBox: an open box with a ring;  plan: a roll
//
// (0, 0) is the middle of the gripping hand; the item stands upright in the figure's space.
//
//   <Prop item x y scale uid frame time rotate side lit/>   one item on its own (a phone on a table, a trophy on a
//                                                           shelf): (x, y) is where a hand would hold it, scale = px per u
import React, {useId} from 'react';
import {C, isLight} from '../../tokens';
import {dark, deepFreeze, ground, step, tone, type Time} from './palette';
import {E, P, S, chain, piece, rot, toD, toLine, tr, type Ink, type Mx} from './rig';
import {gid} from './solid';

export type Item = 'phone' | 'flowers' | 'keys' | 'wrench' | 'ticket' | 'clipboard' | 'coffee' | 'trophy' | 'money' | 'ringBox' | 'plan';
export const ITEMS: readonly Item[] = deepFreeze(['phone', 'flowers', 'keys', 'wrench', 'ticket', 'clipboard', 'coffee', 'trophy', 'money', 'ringBox', 'plan'] as Item[]);
export const isItem = (v: unknown): v is Item => typeof v === 'string' && (ITEMS as readonly string[]).includes(v);

type ItemO = {frame: number; side?: 'back' | 'front'; lit?: number};

const rrP = (x: number, y: number, w: number, h: number, r: number) => {
  const q = Math.min(r, w / 2, h / 2);
  const k = q * 0.45;
  return (
    `M${x + q} ${y}L${x + w - q} ${y}C${x + w - k} ${y} ${x + w} ${y + k} ${x + w} ${y + q}L${x + w} ${y + h - q}` +
    `C${x + w} ${y + h - k} ${x + w - k} ${y + h} ${x + w - q} ${y + h}L${x + q} ${y + h}C${x + k} ${y + h} ${x} ${y + h - k} ${x} ${y + h - q}` +
    `L${x} ${y + q}C${x} ${y + k} ${x + k} ${y} ${x + q} ${y}Z`
  );
};

/** The held item, drawn in matrix m (its origin is the grip). Returns the parts in paint order. */
export const drawItem = (ink: Ink, m: Mx, item: Item, o: ItemO): React.ReactNode => {
  const key = (s: string) => `it-${item}-${s}`;
  const sw = (px: number) => px / ink.k;
  switch (item) {
    case 'phone': {
      // 5.2 x 10.6 u (aspect 2.05), the grip on its lower third
      const body = toD(P(m, rrP(-2.6, -7.4, 5.2, 10.6, 0.85)));
      if (o.side === 'front') {
        const lit = o.lit ?? 1;
        return (
          <g key={key('g')}>
            {piece(ink, key('body'), body, {fill: tone(7), cut: true, rim: true})}
            <path d={toD(P(m, rrP(-2.25, -7.05, 4.5, 9.9, 0.6)))} fill={C.ilGlass} />
            <path d={toD(P(m, rrP(-2.05, -6.85, 4.1, 9.5, 0.5)))} fill={step(1, 1 - lit)} opacity={0.35 + 0.65 * lit} />
            <path d={toD(P(m, rrP(-0.7, -6.6, 1.4, 0.45, 0.22)))} fill={tone(7)} />
          </g>
        );
      }
      return (
        <g key={key('g')}>
          {piece(ink, key('body'), body, {fill: tone(6), shade: tone(7), off: 0.5, cut: true, rim: true})}
          {piece(ink, key('cam'), toD(P(m, rrP(-1.9, -6.7, 2.3, 3.1, 0.7))), {fill: tone(7), edge: false})}
          <path d={toD(E(m, -0.75, -5.95, 0.55), E(m, -0.75, -4.45, 0.55))} fill={tone(4)} />
          <path d={toLine(S(m, [[1.7, -6.9], [2.1, -4.5], [2.15, -1]], false))} stroke={C.il0} strokeOpacity={0.22} strokeWidth={sw(2)} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    case 'flowers': {
      const blooms: [number, number, number, number][] = [
        [-3.2, -9.6, 2.3, 1],
        [3.1, -9.8, 2.2, 2],
        [0, -11.2, 2.4, 0],
        [-1.7, -13.9, 2.1, 2],
        [1.9, -13.7, 2.2, 1],
      ];
      const sway = Math.sin(o.frame / 22) * 0.25;
      return (
        <g key={key('g')}>
          {piece(ink, key('leafL'), toD(S(m, [[-1, -6], [-5.6, -9.4], [-6.2, -7], [-3.4, -5.4]])), {fill: tone(4), shade: tone(5), off: 0.4, cut: true})}
          {piece(ink, key('leafR'), toD(S(m, [[1, -6], [5.8, -8.4], [6.4, -6.2], [3.4, -5]])), {fill: tone(4), shade: tone(5), off: 0.4, cut: true})}
          {blooms.map(([x, y, r, t], i) => {
            const bx = x + sway * (1 + i * 0.3);
            const pet = Array.from({length: 7}, (_, j) => {
              const a = (j / 7) * Math.PI * 2 + i;
              return [bx + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02] as [number, number];
            });
            return (
              <g key={key(`b${i}`)}>
                {piece(ink, key(`bl${i}`), toD(S(m, pet, true, 1.6)), {fill: tone(t), cut: true, rim: true})}
                <path d={toD(E(m, bx + 0.15, y + 0.1, r * 0.34))} fill={tone(t + 2.2)} />
              </g>
            );
          })}
          {piece(ink, key('cone'), toD(P(m, 'M-1.5 3.6L-5.6 -7.8C-2.4 -6.6 2.4 -6.6 5.6 -7.8L1.5 3.6Z')), {fill: tone(1), shade: tone(2.2), off: 0.6, cut: true, rim: true})}
          <path d={toLine(P(m, 'M0.2 3.4L-1.6 -6.9'))} stroke={tone(3)} strokeWidth={sw(1.4)} fill="none" />
        </g>
      );
    }
    case 'keys':
      return (
        <g key={key('g')}>
          <path d={toD(E(m, 0, 1.6, 1.25))} fill="none" stroke={tone(2)} strokeWidth={sw(2.2)} />
          {piece(ink, key('blade'), toD(P(m, 'M1 2.2L4.2 6.6L3.2 7.4L2.6 6.8L2.2 7.3L1.6 6.6L0 3Z')), {fill: tone(2), shade: tone(3.4), off: 0.4, cut: true})}
          {piece(ink, key('fob'), toD(P(m, rrP(-2.6, 2.6, 3.4, 5.4, 1.4))), {fill: tone(6), shade: tone(7), off: 0.5, cut: true, rim: true})}
          <path d={toD(E(m, -0.9, 4.6, 0.7), E(m, -0.9, 6.5, 0.55))} fill={tone(4)} />
        </g>
      );
    case 'wrench':
      return (
        <g key={key('g')}>
          {piece(ink, key('shaft'), toD(P(m, rrP(-0.8, -9.5, 1.6, 17, 0.8))), {fill: tone(2), shade: tone(3.5), off: 0.5, cut: true, rim: true})}
          {piece(ink, key('head'), toD(P(m, 'M-2.5 -9.4C-2.9 -12.4 -1.2 -13.8 0.3 -13.4L-0.5 -11.4L1.1 -10.3L2.5 -11.5C2.9 -9.4 1.8 -7.7 0 -7.6C-1.2 -7.6 -2.3 -8.2 -2.5 -9.4Z')), {
            fill: tone(2),
            shade: tone(3.5),
            off: 0.5,
            cut: true,
            rim: true,
          })}
          {piece(ink, key('ring'), toD(E(m, 0, 8.2, 1.9)), {fill: tone(2), shade: tone(3.5), off: 0.5, cut: true, rim: true})}
          <path d={toD(E(m, 0, 8.2, 0.85))} fill={ink.cut} />
        </g>
      );
    case 'ticket': {
      const mm = chain(m, rot(-8));
      return (
        <g key={key('g')}>
          {piece(ink, key('paper'), toD(P(mm, 'M-1.6 -2.4L7.4 -2.4L7.4 -0.9C6.7 -0.9 6.7 0.9 7.4 0.9L7.4 2.4L-1.6 2.4Z')), {fill: tone(0), shade: tone(1.4), off: 0.4, cut: true, rim: true})}
          <path d={toLine(P(mm, 'M5.2 -2.2L5.2 2.2'))} stroke={tone(3)} strokeWidth={sw(1.4)} strokeDasharray={`${sw(3)} ${sw(3)}`} fill="none" />
          <path d={toD(P(mm, rrP(1.2, -1.3, 3.2, 0.7, 0.3)), P(mm, rrP(1.2, 0.2, 2.2, 0.6, 0.3)))} fill={tone(3)} />
        </g>
      );
    }
    case 'clipboard':
      return (
        <g key={key('g')}>
          {piece(ink, key('board'), toD(P(m, rrP(-4.6, -13.4, 9.2, 13.2, 0.9))), {fill: tone(4), shade: tone(5), off: 0.5, cut: true, rim: true})}
          {piece(ink, key('page'), toD(P(m, rrP(-3.8, -12, 7.6, 10.8, 0.3))), {fill: tone(0), shade: tone(1.2), off: 0.3, edge: false})}
          <path d={toD(P(m, rrP(-2.6, -9.4, 5, 0.6, 0.3)), P(m, rrP(-2.6, -7.6, 4, 0.6, 0.3)), P(m, rrP(-2.6, -5.8, 4.6, 0.6, 0.3)), P(m, rrP(-2.6, -4, 3.2, 0.6, 0.3)))} fill={tone(3)} />
          {piece(ink, key('clip'), toD(P(m, rrP(-1.9, -14.4, 3.8, 2.3, 0.6))), {fill: tone(2), shade: tone(3.4), off: 0.4, cut: true, rim: true})}
        </g>
      );
    case 'coffee': {
      const t = o.frame;
      const steam = (dx: number, ph: number) => {
        const c = ((t + ph) % 48) / 48;
        const pts: [number, number][] = [0, 1, 2, 3].map((i) => [dx + Math.sin(i * 1.4 + t / 9 + ph) * 0.7, -8.4 - i * 1.4 - c * 2.4]);
        return <path key={key(`st${ph}`)} d={toLine(S(m, pts, false))} stroke={tone(1)} strokeOpacity={0.5 * Math.sin(Math.PI * c)} strokeWidth={sw(2.2)} fill="none" strokeLinecap="round" />;
      };
      return (
        <g key={key('g')}>
          {steam(-0.8, 0)}
          {steam(0.9, 24)}
          {piece(ink, key('cup'), toD(P(m, 'M-2.5 -6.4L2.5 -6.4L2 2L-2 2Z')), {fill: tone(1), shade: tone(2.3), off: 0.5, cut: true, rim: true})}
          {piece(ink, key('sleeve'), toD(P(m, 'M-2.32 -3.6L2.32 -3.6L2.12 -0.6L-2.12 -0.6Z')), {fill: tone(4), shade: tone(5), off: 0.4, edge: false})}
          {piece(ink, key('lid'), toD(P(m, 'M-2.9 -6.2C-2.9 -6.9 -2.6 -7.3 -2 -7.4L-1.4 -8.1L1.4 -8.1L2 -7.4C2.6 -7.3 2.9 -6.9 2.9 -6.2Z')), {fill: tone(0), shade: tone(1.3), off: 0.4, cut: true, rim: true})}
        </g>
      );
    }
    case 'trophy':
      return (
        <g key={key('g')}>
          <path d={toLine(P(m, 'M-3.2 -11.4C-6 -11.6 -6 -7.4 -2.4 -7.2'))} stroke={tone(2)} strokeWidth={sw(4)} fill="none" strokeLinecap="round" />
          <path d={toLine(P(m, 'M3.2 -11.4C6 -11.6 6 -7.4 2.4 -7.2'))} stroke={tone(2)} strokeWidth={sw(4)} fill="none" strokeLinecap="round" />
          {piece(ink, key('cup'), toD(P(m, 'M-3.6 -12.6L3.6 -12.6C3.6 -8.6 2.2 -6.6 0.9 -6L0.9 -3.6L-0.9 -3.6L-0.9 -6C-2.2 -6.6 -3.6 -8.6 -3.6 -12.6Z')), {
            fill: tone(1),
            shade: tone(2.6),
            off: 0.6,
            cut: true,
            rim: true,
          })}
          {piece(ink, key('base1'), toD(P(m, rrP(-2.2, -3.8, 4.4, 1.6, 0.4))), {fill: tone(3), shade: tone(4), off: 0.3, cut: true})}
          {piece(ink, key('base2'), toD(P(m, rrP(-3, -2.4, 6, 3.2, 0.5))), {fill: tone(5), shade: tone(6), off: 0.4, cut: true, rim: true})}
          <path d={toLine(P(m, 'M-2.4 -11.6C-2.3 -9.6 -1.6 -8.2 -0.8 -7.6'))} stroke={C.il0} strokeOpacity={0.7} strokeWidth={sw(2.4)} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'money': {
      const note = (mm: Mx, k: string, t: number) => (
        <g key={key(k)}>
          {piece(ink, key(`${k}n`), toD(P(mm, rrP(-5.2, -7.2, 10.4, 5.4, 0.4))), {fill: tone(t), shade: tone(t + 0.9), off: 0.35, cut: true, rim: true})}
          <path d={toD(P(mm, rrP(-4.5, -6.5, 9, 4, 0.3)))} fill="none" stroke={tone(t + 1.2)} strokeWidth={sw(1.2)} />
          <path d={toD(E(mm, 0, -4.5, 1.5, 1.4))} fill={tone(t + 0.8)} />
          <path d={toD(E(mm, -3.3, -4.5, 0.5), E(mm, 3.3, -4.5, 0.5))} fill={tone(t + 1.2)} />
        </g>
      );
      return (
        <g key={key('g')}>
          {note(chain(m, rot(-16, 0, 0)), 'a', 2)}
          {note(chain(m, rot(6, 0, 0), tr(0.6, 0.4)), 'b', 1)}
        </g>
      );
    }
    case 'ringBox':
      return (
        <g key={key('g')}>
          {piece(ink, key('lid'), toD(P(m, rrP(-2.8, -6.4, 5.6, 3.2, 0.7))), {fill: tone(7), shade: tone(7), cut: true, rim: true})}
          {piece(ink, key('box'), toD(P(m, rrP(-2.8, -3.4, 5.6, 3.4, 0.7))), {fill: tone(6), shade: tone(7), off: 0.4, cut: true, rim: true})}
          <path d={toD(P(m, rrP(-2.2, -3.4, 4.4, 1.1, 0.5)))} fill={tone(5)} />
          <path d={toD(E(m, 0, -3.9, 1.05))} fill="none" stroke={tone(0)} strokeWidth={sw(2.6)} />
          <path d={toD(P(m, 'M0 -6.2L0.8 -5.3L0 -4.8L-0.8 -5.3Z'))} fill={tone(0)} />
        </g>
      );
    case 'plan':
      return (
        <g key={key('g')}>
          {piece(ink, key('roll'), toD(P(m, rrP(-7.2, -1.5, 14.4, 3, 1.5))), {fill: tone(0), shade: tone(1.5), off: 0.5, cut: true, rim: true})}
          {piece(ink, key('end'), toD(E(m, 6.1, 0, 0.95, 1.5)), {fill: tone(1), edge: false})}
          <path d={toLine(P(m, 'M6.1 -0.9C6.7 -0.6 6.6 0.5 6.1 0.5C5.7 0.5 5.7 -0.3 6.1 -0.3'))} stroke={tone(3)} strokeWidth={sw(1.2)} fill="none" />
          <path d={toLine(P(m, 'M-6 -0.5L4 -0.5'))} stroke={tone(2)} strokeWidth={sw(1.2)} fill="none" />
        </g>
      );
    default:
      return null;
  }
};

/** One item on its own, outside a hand: (x, y) is its grip point in stage px, `scale` stage px per u (a phone is 10.6 u
 *  tall: scale 30 draws it 318 px tall). */
export const Prop: React.FC<{
  item: Item;
  x: number;
  y: number;
  scale: number;
  uid?: string;
  frame: number;
  time?: Time;
  rotate?: number;
  side?: 'back' | 'front';
  lit?: number;
  lod?: 'hi' | 'lo';
}> = ({item, x, y, scale, uid, frame, time = 'day', rotate = 0, side, lit, lod}) => {
  const id = gid(useId(), 'pr');
  const ink: Ink = {id, uid, k: Math.max(1e-3, scale), hi: lod !== 'lo', onDark: dark(time), cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.2, ly: 1.6};
  return <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`}>{drawItem(ink, rot(rotate), item, {frame, side, lit})}</g>;
};
