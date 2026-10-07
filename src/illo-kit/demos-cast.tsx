// src/illo-kit/demos-cast.tsx: the people's wardrobe on its own (tools/illo-gallery.mjs --kit --only cast): every role in
// one film, "me" and a friend across twelve films (a new person every film), every outfit on him and on her, the hair
// and the beards, the faces at bust size, the hands up close. Gallery only (the kit's own bundle), never in a film.
import React from 'react';
import {C} from '../tokens';
import {FACE_NAMES} from '../scenes/illo/faces';
import {castLook, Figure, lookLine, OUTFITS, PRESETS_LIST, type Cast, type Preset} from '../scenes/illo/figure';
import type {Pose} from '../scenes/illo/poses';
import type {Demo} from './demos';

const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);
const cap = (x: number, y: number, s: string, size = 18) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="VinariMono, monospace" fontSize={size} fill={C.ink2}>
    {s}
  </text>
);
const Cell: React.FC<{id: string; x: number; y: number; w: number; h: number; children: React.ReactNode}> = ({id, x, y, w, h, children}) => (
  <g>
    <clipPath id={id}>
      <rect x={x} y={y} width={w} height={h} />
    </clipPath>
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);
const FACES = ['smile', 'neutral', 'smirk', 'grin', 'neutral', 'smile', 'cool', 'meh'] as const;

const roles: Demo = {
  id: 'cast-roles',
  group: 'cast',
  row: 'roles (film 81)',
  frames: [0],
  band: true,
  render: (f, uid) => {
    const list = PRESETS_LIST.filter((x) => x !== 'crowd');
    return svg(
      <>
        {list.map((pr, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 160 + col * 250;
          const y = 615 + row * 252;
          return (
            <g key={pr}>
              <Figure uid={uid} cast={pr} film={81} x={x} y={y} size={236} frame={f} face={FACES[i % FACES.length]} turn={(col - 1.5) * 0.12} />
              {cap(x, y + 24, pr)}
            </g>
          );
        })}
      </>,
    );
  },
};

const films: Demo = {
  id: 'cast-films',
  group: 'cast',
  row: 'me + friend, films 72..83',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {Array.from({length: 12}, (_, i) => {
          const n = 72 + i;
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 140 + col * 255;
          const y = 680 + row * 340;
          return (
            <g key={n}>
              <Figure uid={uid} cast="friend" film={n} x={x + 50} y={y} size={276} frame={f} face="smile" turn={-0.35} />
              <Figure uid={uid} cast="me" film={n} x={x - 28} y={y + 6} size={290} frame={f} face={FACES[i % FACES.length]} turn={0.3} />
              {cap(x + 10, y + 30, `v${n}`)}
            </g>
          );
        })}
      </>,
    ),
};

const wardrobe = (gender: 'm' | 'f'): Demo => ({
  id: `cast-wardrobe-${gender}`,
  group: 'cast',
  row: `outfits (${gender})`,
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {OUTFITS.map((o, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const x = 125 + col * 207;
          const y = 615 + row * 262;
          const cast: Cast = {is: 'man', outfit: o, gender, look: i, hat: 'none'};
          return (
            <g key={o}>
              <Figure uid={uid} cast={cast} film={90 + i} x={x} y={y} size={232} frame={f} face={FACES[i % FACES.length]} turn={0.15} />
              {cap(x, y + 22, o, 16)}
            </g>
          );
        })}
      </>,
    ),
});

const HAIR_M = ['crop', 'side', 'quiff', 'slick', 'fade', 'buzz', 'curly', 'wavy', 'manbun', 'textured', 'receding', 'bald'];
const HAIR_F = ['long', 'waves', 'bob', 'lob', 'pixie', 'pony', 'bun', 'curls', 'lowbun'];
const BEARD = [null, 'stubble', 'short', 'full', 'tache', 'goatee', null, 'stubble', 'short', null, 'tache', 'full'] as const;
const hair = (gender: 'm' | 'f'): Demo => ({
  id: `cast-hair-${gender}`,
  group: 'cast',
  row: `hair (${gender})`,
  frames: [0],
  band: true,
  render: (f, uid) => {
    const list = gender === 'm' ? HAIR_M : HAIR_F;
    return svg(
      <>
        {list.map((h, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 200 + col * 340;
          const y = 400 + row * 230;
          const cast: Cast = {is: gender === 'm' ? 'man' : 'woman', hair: h, gender, hat: 'none', glasses: 'none', beard: gender === 'm' ? BEARD[i] ?? 'none' : undefined, age: h === 'receding' || h === 'bald' ? 'adult' : 'young', look: i, hairTone: [7, 6, 5, 7, 4, 6, 3, 7, 6, 5, 2, 6][i]};
          return (
            <g key={h}>
              <Cell id={`hc${gender}${i}`} x={x - 160} y={y} w={320} h={210}>
                <Figure uid={uid} cast={cast} film={60 + i} x={x} y={y + 110} size={760} crop="bust" frame={f} face={i % 3 === 0 ? 'smile' : i % 3 === 1 ? 'neutral' : 'smirk'} turn={((i % 3) - 1) * 0.3} idle={false} />
              </Cell>
              {cap(x, y + 228, `${h}${gender === 'm' && BEARD[i] ? ` + ${BEARD[i]}` : ''}`, 16)}
            </g>
          );
        })}
      </>,
    );
  },
});

const faces: Demo = {
  id: 'cast-faces',
  group: 'cast',
  row: 'faces (bust)',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {FACE_NAMES.map((face, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 200 + col * 340;
          const y = 390 + row * 245;
          const cast: Cast = i % 2 ? 'girl' : 'me';
          return (
            <g key={face}>
              <Cell id={`fc${i}`} x={x - 165} y={y} w={330} h={226}>
                <Figure uid={uid} cast={cast} film={81} x={x} y={y + 110} size={820} crop="bust" face={face} frame={f + 30} idle={false} turn={col === 0 ? 0.2 : col === 2 ? -0.2 : 0} />
              </Cell>
              {cap(x, y + 244, face, 16)}
            </g>
          );
        })}
      </>,
    ),
};

const bust: Demo = {
  id: 'cast-bust',
  group: 'cast',
  row: 'bust (Person solo size)',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Figure uid={uid} cast="me" film={81} x={300} y={760} size={1250} crop="bust" frame={f} face="smile" turn={0.25} pose="thumbsUp" />
        <Figure uid={uid} cast="girl" film={81} x={800} y={760} size={1180} crop="bust" frame={f} face="smirk" turn={-0.25} pose="wave" />
        {cap(540, 1360, `${lookLine(castLook('me', 81))}  |  ${lookLine(castLook('girl', 81))}`.slice(0, 110), 14)}
      </>,
    ),
};

const HANDS: [Pose, Preset, string][] = [
  ['point', 'me', 'point'],
  ['thumbsUp', 'friend', 'thumb'],
  ['wave', 'girl', 'palm'],
  ['pointYou', 'boss', 'pointYou'],
  ['hold', 'mechanic', 'grip'],
  ['stand', 'mom', 'relaxed'],
];
const hands: Demo = {
  id: 'cast-hands',
  group: 'cast',
  row: 'hands',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {HANDS.map(([pose, who, label], i) => {
          const col = i % 3;
          const r = Math.floor(i / 3);
          const x = 190 + col * 350;
          const y = 380 + r * 500;
          return (
            <g key={label}>
              <Cell id={`hh${i}`} x={x - 172} y={y} w={344} h={470}>
                <Figure uid={uid} cast={who} film={81} x={x - 30} y={y + 110} size={640} crop="bust" pose={pose} face="smile" frame={f} hold={pose === 'hold' ? 'keys' : undefined} idle={false} />
              </Cell>
              {cap(x, y + 492, label, 16)}
            </g>
          );
        })}
      </>,
    ),
};

// the art director's sheet: sixteen generated people, every role in a film of its own (films 84..99), on the whole frame
const SHEET_ROLES: Preset[] = ['me', 'friend', 'girl', 'ex', 'man', 'woman', 'mom', 'dad', 'grandpa', 'grandma', 'mechanic', 'seller', 'buyer', 'officer', 'boss', 'neighbour'];
const SHEET_POSES: Pose[] = ['stand', 'confident', 'stand', 'crossArms', 'stand', 'hold', 'stand', 'stand', 'stand', 'stand', 'hold', 'confident', 'phoneLook', 'stand', 'stand', 'wave'];
const sheet: Demo = {
  id: 'cast-sheet',
  group: 'cast',
  row: 'sixteen people, films 84..99',
  frames: [0],
  render: (f, uid) =>
    svg(
      <>
        {SHEET_ROLES.map((pr, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 140 + col * 266;
          const y = 470 + row * 462;
          const n = 84 + i;
          return (
            <g key={pr}>
              <Figure uid={uid} cast={pr} film={n} x={x} y={y} size={400} frame={f} face={FACES[i % FACES.length]} pose={SHEET_POSES[i]} hold={pr === 'mechanic' ? 'wrench' : pr === 'woman' ? 'coffee' : undefined} turn={((col % 2) * 2 - 1) * 0.18} />
              {cap(x, y + 24, `${pr} · v${n}`, 16)}
            </g>
          );
        })}
      </>,
    ),
};

export const CAST_DEMOS: Demo[] = [sheet, roles, films, wardrobe('m'), wardrobe('f'), hair('m'), hair('f'), faces, bust, hands];
