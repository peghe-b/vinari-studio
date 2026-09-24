import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Promo, themeOf} from './Promo';
import {C, H, L, setTheme, T, W} from './tokens';
import type {VideoProps} from './types';

// 16:9 (YouTube, LinkedIn, a laptop screen) from the same spec: the whole 9:16 Promo, untouched,
// centred on a stage of the film's own field colour (pure black, or the light theme's paper), so there
// is no seam and nothing to continue at the sides). There is no platform UI in 16:9, so the subtitle line centres
// on the content instead of on the Reels safe block, and sits closer under the picture (Promo ui="none").
// Registered in Root.tsx as "<id>-wide"; `node tools/formats.mjs <id> --wide` renders it.
//
//   fit "band" (default): the band that carries the film (meta bar .. subtitle line, plus air)
//                         fills the 1080 px height, vertically centred. Only the empty platform
//                         zones above and below it leave.
//   fit "frame":          the full 9:16 frame is exactly 1080 tall. Nothing is cut, but the empty
//                         zones stay, so the film sits small. Render with --props='{"fit":"frame"}'.
//
// Everything is laid out in the 9:16 film's own pixels (1 unit = 1 px of the 1080x1920 frame)
// and the whole stage is scaled once.

export const WIDE_W = 1920;
export const WIDE_H = 1080;
const AIR = 100;
const FEATHER = 60; // anything full-bleed (a map, a reflection) dissolves over the film's side edges
const BAND_TOP = L.metaY - 12 - AIR; // the meta bar with air above
// the subtitle line with air below: with no platform UI the line sits closer to the picture
// (L.subtitleYWide, Promo ui "none") than in the 9:16 film, where it dodges Instagram's username row
const BAND_BOTTOM = Math.ceil(L.subtitleYWide + 0.6 * T.subtitle + 12) + AIR;

export type WideProps = VideoProps & {fit?: 'frame' | 'band'};

const geometry = (fit: 'frame' | 'band') => {
  const top = fit === 'band' ? BAND_TOP : 0;
  const s = WIDE_H / (fit === 'band' ? BAND_BOTTOM - BAND_TOP : H);
  const stageW = WIDE_W / s;
  const panelX = (stageW - W) / 2;
  return {s, top, stageW, panelX};
};

const feather = `linear-gradient(90deg, transparent 0px, #000 ${FEATHER}px, #000 ${W - FEATHER}px, transparent ${W}px)`;

export const Wide: React.FC<WideProps> = ({fit = 'band', ...video}) => {
  const g = geometry(fit);
  setTheme(themeOf(video)); // the side bands take the film's field colour
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: g.stageW, height: H, transform: `scale(${g.s}) translateY(${-g.top}px)`, transformOrigin: '0 0'}}>
        <div style={{position: 'absolute', left: g.panelX, top: 0, width: W, height: H, overflow: 'hidden', WebkitMaskImage: feather, maskImage: feather}}>
          <Promo {...video} ui="none" />
        </div>
      </div>
    </AbsoluteFill>
  );
};
