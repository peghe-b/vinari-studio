import React from 'react';
import {AbsoluteFill} from 'remotion';
import REGIONS from '../public/screens/regions.json';
import {setAccentMode, setTheme} from './tokens';
import type {CoverSpec, VideoProps, VideoSpec} from './types';
import {NO_APP_PILL} from './cover/comps.mjs';
import {CoverFrame, GRID_BOTTOM, SIDE} from './cover/CoverFrame';
import {Draw, type Prim} from './cover/Draw';
import {coverLayout} from './cover/layout.mjs';
import {resolveCover} from './cover/pick.mjs';
import {photoCredit, photoInfo} from './lib/photo';

// The designed Reels cover (the owner, 2026-09-24; purpose-built since 2026-10-26; one layout since 2026-10-27, after the
// owner's „ეს ტელეფონის ქავერი მოქაფში ერთდაიგივეებია, არც ჩანს წესიერად": 6 of 11 new covers were the same tilted phone,
// unreadable in the 300 px gallery tile, and one was the bare logo). Black and white on the paper, in the frame the owner
// approved (./cover/CoverFrame.tsx), then ONE picture: one of ten compositions (./cover/comps.mjs), every position and size
// set by ./cover/layout.mjs against the 300 px tile and painted by ./cover/Draw.tsx. Never a film frame, never the logo:
// ./cover/pick.mjs reads an older spec as today's composition or builds the cover from the film's own data (its
// FilmTitleCard, a labelled number, its Ledger, its opening line).
//
// Props beyond the film's (tools/covers.mjs passes them as input props; Node decides, the browser draws):
//   coverResolved  the cover to draw, already resolved in Node (the street-word filter of the net lives there)
//   coverCtx       what the page's ledger hands this cover: {pose, polSign, slab} (tools/ci/coverlog.mjs)
//   coverNet       true: skip the spec's own cover and draw the net (after it broke its pixel guards)
// Rendered by tools/covers.mjs as out/<id>.cover.png (composition "<id>-cover", Root.tsx, or "cover-preview" for a spec alone).

export const coverOf = (spec: VideoProps['spec']): CoverSpec => (typeof spec.cover === 'number' ? {} : (spec.cover ?? {}));

/** a stable number from the film's id (FNV-1a), so one film always gets the same marker strokes */
const seedOf = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export type CoverProps = {
  spec: VideoSpec;
  coverResolved?: Record<string, unknown> | null;
  coverCtx?: {pose?: string; polSign?: number; slab?: boolean} | null;
  coverNet?: boolean;
};

export const coverCtxOf = (spec: VideoSpec, extra?: CoverProps['coverCtx']) => ({
  regions: REGIONS as unknown as Record<string, Record<string, unknown>>,
  photoInfo: (s: string) => photoInfo(s),
  credit: (s: string) => photoCredit(s),
  seed: seedOf(String(spec.id ?? '')) % 100000,
  ...(extra ?? {}),
});

export const Cover: React.FC<CoverProps & Partial<VideoProps>> = (props) => {
  const spec = props.spec as VideoSpec;
  // always the light paper and ink (the owner, 2026-10-19: every cover on #F3F3F3, whatever the film's look)
  setTheme('light');
  setAccentMode(spec.accent);
  const ctx = coverCtxOf(spec, props.coverCtx);
  const cv = coverOf(spec);
  const resolved = props.coverResolved
    ? {cover: props.coverResolved, layout: coverLayout(props.coverResolved, ctx)}
    : resolveCover(spec, {...ctx, forceNet: Boolean(props.coverNet)});
  const L = resolved.layout;
  const pill = NO_APP_PILL.includes(String(spec.category ?? '')) ? null : (cv.pill ?? undefined);
  // EVERY cover is drawn through grayscale(1): black and white, always (the owner); COVER_COLOUR stays as the net
  return (
    <AbsoluteFill style={{filter: 'grayscale(1)'}}>
      <CoverFrame lines={L.head.lines} size={L.head.size} pill={pill}>
        <Draw draw={L.draw as Prim[]} stage={{top: L.ST, bottom: GRID_BOTTOM, left: SIDE, right: 1080 - SIDE}} />
      </CoverFrame>
    </AbsoluteFill>
  );
};

/** "cover-preview": a cover from a spec alone (no voice timeline), for tools/covers.mjs --spec */
export const CoverPreview: React.FC<CoverProps> = (props) => <Cover {...props} />;
