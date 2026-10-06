// src/illo-kit/demos-figure.tsx: the kit's characters on their own (tools/illo-gallery.mjs --kit --only figure): the ten
// casts, the twelve faces, the 21 poses, the walk cycle, acting over time, hands and held items, the turn, LOD and a crowd,
// and the night look. Gallery only (the kit's own bundle), never in a film.
import React from 'react';
import {C} from '../tokens';
import {Plate} from '../scenes/illo/backdrop';
import {FACE_NAMES, type Face} from '../scenes/illo/faces';
import {Figure, PRESETS_LIST, type Cast, type Preset} from '../scenes/illo/figure';
import {POSE_NAMES, type Pose} from '../scenes/illo/poses';
import {ITEMS, Prop, type Item} from '../scenes/illo/props';
import type {Demo} from './demos';

const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);
const cap = (x: number, y: number, s: string, anchor: 'start' | 'middle' = 'middle', size = 20) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily="VinariMono, monospace" fontSize={size} fill={C.ink2}>
    {s}
  </text>
);
/** A cell clipped to its rectangle (grids of busts must not overlap). */
const Cell: React.FC<{id: string; x: number; y: number; w: number; h: number; children: React.ReactNode}> = ({id, x, y, w, h, children}) => (
  <g>
    <clipPath id={id}>
      <rect x={x} y={y} width={w} height={h} />
    </clipPath>
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);

const cast: Demo = {
  id: 'figure-cast',
  group: 'figure',
  row: 'cast',
  frames: [0, 70],
  band: true,
  render: (f, uid) => {
    const list = PRESETS_LIST.filter((x) => x !== 'crowd');
    const faces: Face[] = ['smile', 'neutral', 'smile', 'worried', 'smile', 'meh', 'smirk', 'neutral', 'smirk'];
    return svg(
      <>
        {list.map((pr, i) => {
          const row = i < 5 ? 0 : 1;
          const col = row ? i - 5 : i;
          const x = row ? 210 + col * 220 : 140 + col * 200;
          const y = row ? 1330 : 850;
          return (
            <g key={pr}>
              <Figure uid={uid} cast={pr} x={x} y={y} size={430} frame={f} face={faces[i]} />
              {cap(x, y + 30, pr)}
            </g>
          );
        })}
      </>,
    );
  },
};

const faceGrid = (preset: Preset, id: string): Demo => ({
  id,
  group: 'figure',
  row: `faces ${preset}`,
  frames: [0, 40],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {FACE_NAMES.map((face, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 200 + col * 340;
          const y = 380 + row * 250;
          return (
            <g key={face}>
              <Cell id={`${id}c${i}`} x={x - 165} y={y} w={330} h={226}>
                <Figure uid={uid} cast={{is: preset, seed: 3 + i}} x={x} y={y + 108} size={640} crop="bust" face={face} frame={f + 30} idle={false} />
              </Cell>
              {cap(x, y + 244, face)}
            </g>
          );
        })}
      </>,
    ),
});

const POSE_ITEM: Partial<Record<Pose, Item>> = {phoneEar: 'phone', phoneLook: 'phone', hold: 'coffee', offer: 'flowers'};
const POSE_FACE: Partial<Record<Pose, Face>> = {
  wave: 'smile', point: 'neutral', pointYou: 'grin', phoneEar: 'neutral', phoneLook: 'meh', shrug: 'smirk', facepalm: 'sad', handsHead: 'shock',
  thumbsUp: 'grin', armsUp: 'laugh', crossArms: 'angry', hold: 'smile', offer: 'smile', reject: 'angry', confident: 'cool', slumped: 'sad', crouch: 'worried',
  sitDrive: 'neutral', walk: 'smile', jump: 'laugh',
};
const poseGrid = (poses: Pose[], id: string, row: string, preset: Preset = 'me'): Demo => ({
  id,
  group: 'figure',
  row,
  frames: [0, 40],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {poses.map((pose, i) => {
          const col = i % 4;
          const r = Math.floor(i / 4);
          const x = 150 + col * 260;
          const y = 700 + r * 325;
          const jump = pose === 'jump';
          return (
            <g key={pose}>
              <Figure
                uid={uid}
                cast={preset}
                x={x}
                y={y}
                size={290}
                frame={f}
                pose={jump ? 'stand' : pose}
                acts={jump ? [{at: 30, pose: 'jump'}] : undefined}
                face={POSE_FACE[pose] ?? 'neutral'}
                hold={POSE_ITEM[pose]}
              />
              {cap(x, y + 26, pose)}
            </g>
          );
        })}
      </>,
    ),
});

const walk: Demo = {
  id: 'figure-walk',
  group: 'figure',
  row: 'walk',
  frames: [0, 6, 12, 18],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {cap(120, 410, 'walk: one cycle in six phases (24 frames)', 'start')}
        {[0, 4, 8, 12, 16, 20].map((o, i) => (
          <Figure key={i} uid={uid} cast="me" x={130 + i * 165} y={760} size={320} pose="walk" frame={f + o} face="smile" />
        ))}
        {cap(120, 810, 'walking across, flipped (girl), and in (officer)', 'start')}
        <Figure uid={uid} cast="girl" x={900 - ((f * 6) % 700)} y={1100} size={280} pose="walk" flip frame={f} face="neutral" />
        <Figure uid={uid} cast="officer" x={140 + ((f * 5) % 500)} y={1340} size={300} pose="walk" frame={f} face="meh" />
        <Figure uid={uid} cast="friend" x={820} y={1340} size={300} pose="walk" frame={f + 9} face="grin" turn={0.8} />
      </>,
    ),
};

const acting: Demo = {
  id: 'figure-acting',
  group: 'figure',
  row: 'acting',
  frames: [10, 26, 40, 66, 100, 118, 150, 175],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Figure
          uid={uid}
          cast="me"
          x={540}
          y={720}
          size={1450}
          crop="bust"
          frame={f}
          acts={[
            {at: 20, face: 'shock', pose: 'handsHead'},
            {at: 60, face: 'smirk', pose: 'shrug'},
            {at: 95, face: 'laugh', pose: 'stand'},
            {at: 140, face: 'cool', pose: 'crossArms'},
          ]}
        />
        {cap(540, 1360, 'acts: shock + handsHead @20, smirk + shrug @60, laugh @95, cool + crossArms @140')}
      </>,
    ),
};

const actingPair: Demo = {
  id: 'figure-pair',
  group: 'figure',
  row: 'pair',
  frames: [10, 50, 90, 130],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Figure uid={uid} cast="me" x={330} y={1380} size={1050} turn={0.45} frame={f} acts={[{at: 30, pose: 'offer', face: 'smile', hold: 'flowers'}, {at: 80, face: 'sad', pose: 'slumped', hold: null}, {at: 120, face: 'smirk', pose: 'shrug'}]} />
        <Figure uid={uid} cast="girl" x={770} y={1380} size={1000} turn={-0.45} frame={f} acts={[{at: 40, face: 'meh'}, {at: 70, pose: 'reject', face: 'angry'}, {at: 110, pose: 'crossArms'}]} />
      </>,
    ),
};

const ITEM_POSE: Partial<Record<Item, Pose>> = {phone: 'phoneEar', flowers: 'offer', trophy: 'hold'};
const items: Demo = {
  id: 'figure-items',
  group: 'figure',
  row: 'items',
  frames: [0, 40],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {ITEMS.map((it, i) => {
          const col = i % 4;
          const r = Math.floor(i / 4);
          const x = 150 + col * 260;
          const y = 700 + r * 325;
          const pr: Preset = (['me', 'friend', 'girl', 'mechanic', 'officer', 'boss', 'mom', 'seller', 'grandpa', 'girl', 'boss'] as Preset[])[i];
          return (
            <g key={it}>
              <Figure uid={uid} cast={pr} x={x} y={y} size={290} frame={f} pose={ITEM_POSE[it] ?? 'hold'} hold={it} face="smile" />
              {cap(x, y + 26, it)}
            </g>
          );
        })}
      </>,
    ),
};

const hands: Demo = {
  id: 'figure-hands',
  group: 'figure',
  row: 'hands',
  frames: [0, 30],
  band: true,
  render: (f, uid) => {
    const cells: [Pose, Face, string][] = [
      ['point', 'neutral', 'point'],
      ['thumbsUp', 'grin', 'thumb'],
      ['wave', 'smile', 'palm'],
      ['pointYou', 'smirk', 'pointYou'],
      ['hold', 'smile', 'grip'],
      ['stand', 'neutral', 'mitten'],
    ];
    return svg(
      <>
        {cells.map(([pose, face, label], i) => {
          const col = i % 3;
          const r = Math.floor(i / 3);
          const x = 190 + col * 350;
          const y = 380 + r * 500;
          return (
            <g key={label}>
              <Cell id={`hc${i}`} x={x - 172} y={y} w={344} h={470}>
                <Figure uid={uid} cast={(['me', 'friend', 'girl', 'boss', 'mechanic', 'mom'] as Preset[])[i]} x={x - 20} y={y + 160} size={760} crop="bust" pose={pose} face={face} frame={f} hold={pose === 'hold' ? 'keys' : undefined} />
              </Cell>
              {cap(x, y + 492, label)}
            </g>
          );
        })}
      </>,
    );
  },
};

const turns: Demo = {
  id: 'figure-turn',
  group: 'figure',
  row: 'turn',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {[-1, -0.5, 0, 0.5, 1].map((t, i) => (
          <g key={t}>
            <Cell id={`tc${i}`} x={30 + i * 206} y={380} w={200} h={300}>
              <Figure uid={uid} cast="girl" x={130 + i * 206} y={520} size={760} crop="bust" turn={t} face="smile" frame={f} idle={false} />
            </Cell>
            {cap(130 + i * 206, 704, `turn ${t}`)}
          </g>
        ))}
        {[-0.8, 0, 0.8].map((t, i) => (
          <g key={`b${t}`}>
            <Figure uid={uid} cast={(['mechanic', 'me', 'seller'] as Preset[])[i]} x={200 + i * 340} y={1180} size={420} turn={t} face="neutral" frame={f} idle={false} />
            {cap(200 + i * 340, 1210, `turn ${t}`)}
          </g>
        ))}
        <Figure uid={uid} cast="boss" x={960} y={1350} size={150} turn={0.3} face="smile" frame={f} flip />
        {cap(960, 1375, 'flip, 150 px')}
      </>,
    ),
};

const crowd: Demo = {
  id: 'figure-crowd',
  group: 'figure',
  row: 'crowd + LOD',
  frames: [0, 50],
  band: true,
  render: (f, uid) => {
    const back = [11, 12, 13, 14, 15, 16];
    const front = [21, 22, 23, 24, 25];
    const faces: Face[] = ['shock', 'laugh', 'smile', 'worried', 'grin', 'shock'];
    return svg(
      <>
        {cap(120, 410, 'crowd: back row LOD lo (0.85, one step darker), front row hi', 'start')}
        {back.map((s, i) => (
          <Figure key={`b${s}`} uid={uid} cast={{is: 'crowd', seed: s}} x={110 + i * 172} y={860} size={340} lod="lo" dim={0.6} frame={f} face={faces[i % 6]} turn={(i - 2.5) * -0.1} />
        ))}
        {front.map((s, i) => (
          <Figure key={`f${s}`} uid={uid} cast={{is: 'crowd', seed: s}} x={190 + i * 175} y={1010} size={400} frame={f} face={faces[(i + 2) % 6]} turn={(i - 2) * -0.12} pose={i === 1 ? 'armsUp' : i === 3 ? 'phoneLook' : 'stand'} hold={i === 3 ? 'phone' : undefined} />
        ))}
        {cap(120, 1080, 'LOD hi vs lo at 400 px and at 170 px', 'start')}
        <Figure uid={uid} cast="me" x={200} y={1350} size={250} lod="hi" frame={f} face="smile" />
        <Figure uid={uid} cast="me" x={420} y={1350} size={250} lod="lo" frame={f} face="smile" />
        <Figure uid={uid} cast="mom" x={640} y={1350} size={170} lod="hi" frame={f} face="smile" />
        <Figure uid={uid} cast="mom" x={800} y={1350} size={170} frame={f} face="smile" />
        {cap(200, 1376, 'hi')}
        {cap(420, 1376, 'lo')}
        {cap(640, 1376, 'hi 170')}
        {cap(800, 1376, 'auto 170')}
      </>,
    );
  },
};

const night: Demo = {
  id: 'figure-night',
  group: 'figure',
  row: 'night',
  frames: [0, 60],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Plate time="night" />
        <Figure uid={uid} cast="mom" x={300} y={1300} size={820} time="night" pose="phoneEar" hold="phone" face="worried" frame={f} turn={0.25} />
        <Figure uid={uid} cast="me" x={780} y={1300} size={780} time="night" pose="phoneLook" hold="phone" face="shock" frame={f} turn={-0.3} acts={[{at: 30, face: 'grin'}]} />
      </>,
    ),
};


const jump: Demo = {
  id: 'figure-jump',
  group: 'figure',
  row: 'jump',
  frames: [0, 40],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {cap(120, 410, 'jump: anticipation, the arc (18 frames), the 0.94 squash on landing', 'start')}
        {[-3, 2, 6, 9, 13, 17, 21].map((t, i) => (
          <g key={t}>
            <Figure uid={uid} cast="me" x={95 + i * 148} y={900} size={300} frame={100 + t} acts={[{at: 100, pose: 'jump', face: 'laugh'}]} />
            {cap(95 + i * 148, 926, `t ${t}`)}
          </g>
        ))}
        {cap(120, 990, 'crouch, slumped, sitDrive', 'start')}
        <Figure uid={uid} cast="mechanic" x={230} y={1340} size={330} frame={f} pose="crouch" face="worried" hold="wrench" />
        <Figure uid={uid} cast="me" x={540} y={1340} size={330} frame={f} pose="slumped" face="sad" fx={[{kind: 'zzz', at: 0}]} />
        <Figure uid={uid} cast="boss" x={850} y={1340} size={330} frame={f} pose="sitDrive" face="smirk" />
      </>,
    ),
};

const props: Demo = {
  id: 'figure-props',
  group: 'figure',
  row: 'props',
  frames: [0, 30],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {ITEMS.map((it, i) => {
          const col = i % 4;
          const r = Math.floor(i / 4);
          const x = 150 + col * 260;
          const y = 640 + r * 300;
          return (
            <g key={it}>
              <Prop uid={uid} item={it} x={x} y={y} scale={13} frame={f} side={i === 0 ? 'front' : undefined} />
              {cap(x, y + 120, it)}
            </g>
          );
        })}
        <Prop uid={uid} item="phone" x={930} y={1240} scale={13} frame={f} />
        {cap(930, 1360, 'phone back')}
      </>,
    ),
};

const hero: Demo = {
  id: 'figure-hero',
  group: 'figure',
  row: 'hero',
  frames: [0, 50],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Figure uid={uid} cast="me" x={300} y={1370} size={960} frame={f} face="smile" turn={0.2} />
        <Figure uid={uid} cast="officer" x={780} y={1370} size={980} frame={f} face="neutral" turn={-0.25} pose="hold" hold="ticket" />
      </>,
    ),
};

const firstHalf = POSE_NAMES.slice(0, 12) as Pose[];
const secondHalf = POSE_NAMES.slice(12) as Pose[];
export const FIGURE_DEMOS: Demo[] = [
  hero,
  cast,
  faceGrid('me', 'figure-faces-me'),
  faceGrid('girl', 'figure-faces-girl'),
  poseGrid(firstHalf, 'figure-poses-a', 'poses 1..12'),
  poseGrid(secondHalf, 'figure-poses-b', 'poses 13..21'),
  walk,
  jump,
  acting,
  actingPair,
  items,
  props,
  hands,
  turns,
  crowd,
  night,
];
export type {Cast};
