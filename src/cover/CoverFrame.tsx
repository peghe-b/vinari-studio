// The cover's fixed frame (2026-10-26, plan step 1.4), measured on the covers the owner approved (Marketing/19 the CarPlay
// cover, 21 and 23 the infographic cards, v118's polaroid): the paper #F3F3F3 ALWAYS (whatever the film's look: the owner,
// 19 Oct, every cover on the light paper), the mark and the wordmark at (72, 300), a „● VINARI+" pill on the right, a hairline,
// the headline in the film's condensed Mtavruli at weight 600, at most 112 px and only ever shrunk to fit (a short title is
// never blown up), then the stage for the ONE picture: x 70..1010, from 70 px under the headline down to y 1680. Everything
// that matters sits inside y 240..1680, the 3:4 Instagram's profile grid shows. No issue number, no topic tag.
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {fontsLoaded} from '../fonts';
import {capsLatin, mtav} from '../lib/format';
import {BrandMark} from '../scenes/common';
import {F} from '../tokens';

export const PAPER = '#F3F3F3';
export const INK = '#0B0B0B';
export const INK2 = '#6A6A6A';
export const GREY = '#9A9A9A'; // the caption, a struck number's label
export const PAD = 72;
export const TOP = 300; // the top row (the grid crop starts at 240)
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
export const HEAD_MAX = 112; // the approved covers' size; shrink-only
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;
export const HEAD_MIN = 96; // the floor (2026-10-27): a line too long for it fails COVER_TITLE_FIT before the voice
export const GRID_TOP = 240;
export const GRID_BOTTOM = 1680;
export const SIDE = 70; // the picture's side margin

export type Stage = {top: number; bottom: number; left: number; right: number};

export const CoverFrame: React.FC<{lines: string[]; size: number; pill?: string | null; children: React.ReactNode}> = ({lines: raw, size, pill, children}) => {
  const lines = raw.map(mtav);
  // the size is ./layout.mjs's (measured with the studio's font table, shrink-only from 112, never under 96 on a new film);
  // the fonts are in before the still is taken
  const [handle] = useState(() => delayRender('the cover fonts'));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        setReady(true);
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  const fs = size;
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {ready ? children : null}
      {/* the top row: the lockup left, the pill right */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <BrandMark kind="mark" height={40} style={{filter: 'brightness(0) invert(0.045)'}} />
        <BrandMark kind="wordmark" height={23} style={{filter: 'brightness(0) invert(0.045)'}} />
      </div>
      {pill === null ? null : (
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div
          style={{
            height: ROW_H - 2,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px 0 18px',
            borderRadius: ROW_H,
            border: '1.5px solid rgba(160,160,160,0.9)',
            fontFamily: F.mono,
            fontSize: 22,
            letterSpacing: '0.06em',
            color: INK2,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(capsLatin(pill || 'VINARI+'))}
        </div>
      </div>
      )}
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: 'rgba(160,160,160,0.55)'}} />
      {/* the headline */}
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: ready ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
