import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Freeze} from 'remotion';
import {fontsLoaded} from './fonts';
import {capsLatin} from './lib/format';
import {Promo, themeOf} from './Promo';
import {BrandMark} from './scenes/common';
import {C, F, FPS, rgba, setAccentMode, setTheme} from './tokens';
import type {CoverSpec, VideoProps} from './types';

// The designed Reels cover (owner, 2026-09-24): its own layout, not a frame of the film.
//   top row     a small Vinari lockup (mark + wordmark) on the left, the issue number and a small
//               topic tag on the right, a hairline under them
//   headline    big, left-aligned, from spec cover.title ("|" breaks a line), else the first spoken
//               line; cover.sub is an optional quieter line under it
//   picture     the film itself, frozen at cover.frame (default: the hook scene, settled), without
//               its meta bar, subtitle and VHS (a still cover stays clean), rising out of the field
//               under the headline, scaled by cover.zoom (1.15 on a Wire3D car, else 1) and nudged by cover.y
// The theme is the film's: a black film gets a black cover, a white film a white one. The cover is
// black and white only (the owner, 2026-09-24: no green or red on it): ink type, the film's data
// colours drawn in ink (Promo mono), and anything else in the picture (an app screen) in grey.
// Everything that matters sits inside y 240..1680, the 3:4 part Instagram's profile grid shows.
// tools/cover.mjs renders it as out/<id>.cover.png (composition "<id>-cover", registered in Root.tsx).

const PAD = 72;
const TOP = 300; // the top row (the grid crop starts at 240)
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const HEAD_MAX = 156; // headline size before it is fitted to the width
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;
const GRID_BOTTOM = 1680;
const FILM_CY = 780; // where the film's content sits in its own frame (stage centre, frame pixels)
const SUB_FS = 46;

export const coverOf = (spec: VideoProps['spec']): CoverSpec => (typeof spec.cover === 'number' ? {frame: spec.cover} : (spec.cover ?? {}));

/** The film frame the cover shows: cover.frame, else 70% into the hook scene (settled, still the hook). */
export const coverFrameOf = ({spec, timeline}: VideoProps) => {
  const f = coverOf(spec).frame;
  if (typeof f === 'number') return f;
  const next = spec.beats.findIndex((b, i) => i > 0 && b.scene);
  const end = next > 0 ? timeline.beats[next].start * FPS : timeline.duration * FPS;
  return Math.max(0, Math.round(end * 0.7));
};

/** "a b|c d" -> lines. */
const parseTitle = (t: string) => t.split('|').map((line) => line.trim());

export const Cover: React.FC<VideoProps> = (props) => {
  const {spec} = props;
  setTheme(themeOf(props));
  setAccentMode(spec.accent);

  const cv = coverOf(spec);
  const lines = parseTitle(cv.title ?? spec.beats[0].say);
  const tag = cv.tag ?? spec.beats.find((b) => b.meta?.[0])?.meta?.[0] ?? '';
  const issue = /^v(\d+)/.exec(spec.id)?.[1];
  // a wireframe car fills its box loosely and takes a push; a chart, a list or a calendar already
  // spans the content box and would cross the margins
  const frame = coverFrameOf(props);
  const at = props.timeline.beats.reduce((k, b, i) => (b.start * FPS <= frame && (spec.beats[i].scene || i === 0) ? i : k), 0);
  const zoom = cv.zoom ?? (spec.beats[at].scene?.type === 'Wire3D' ? 1.15 : 1);

  // fit the headline: measure every line at HEAD_MAX once the fonts are in, scale to the widest
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const widest = Math.max(1, ...refs.current.map((r) => r?.offsetWidth ?? 0));
        setSize(Math.min(HEAD_MAX, Math.floor((HEAD_MAX * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);

  const fs = size ?? HEAD_MAX;
  const headBottom = HEAD_TOP + lines.length * fs * HEAD_LH;
  const subTop = headBottom + 22;
  const textBottom = cv.sub ? subTop + SUB_FS * 1.3 : headBottom;
  // the film rises under the headline: its content centred in the space left above the grid's edge
  const filmTop = textBottom + 24;
  const shift = Math.round(Math.max(200, Math.min(700, (filmTop + GRID_BOTTOM) / 2 + 20 - FILM_CY)) + (cv.y ?? 0));
  const fadeFrom = filmTop - 10;
  const fadeTo = filmTop + 190;
  const mask = `linear-gradient(to bottom, transparent 0px, transparent ${fadeFrom}px, #000 ${fadeTo}px, #000 100%)`;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {/* the picture: the film frozen on its cover frame, bare (no meta bar, no subtitle, no sound) */}
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask, filter: 'grayscale(1)'}}>
        <AbsoluteFill style={{transform: `translateY(${shift}px) scale(${zoom})`, transformOrigin: `540px ${FILM_CY}px`}}>
          <Freeze frame={frame}>
            <Promo {...props} bare mono silent vhs={0} />
          </Freeze>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* top row: the lockup left, the issue and the tag right */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <BrandMark kind="mark" height={40} />
        <BrandMark kind="wordmark" height={23} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 18}}>
        {issue ? <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: '0.08em', color: C.ink3}}>№{issue.padStart(2, '0')}</div> : null}
        {tag ? (
          <div
            style={{
              height: ROW_H - 2,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px 0 18px',
              borderRadius: ROW_H,
              border: `1.5px solid ${rgba(C.rule, 0.9)}`,
              fontFamily: F.mono,
              fontSize: 22,
              letterSpacing: '0.06em',
              color: C.ink2,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{width: 9, height: 9, borderRadius: 9, background: C.ink}} />
            {capsLatin(tag)}
          </div>
        ) : null}
      </div>
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: rgba(C.rule, 0.55)}} />

      {/* the headline */}
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 700, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.015em', color: C.ink, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
      {cv.sub ? (
        <div style={{position: 'absolute', top: subTop, left: PAD, right: PAD, fontFamily: F.sans, fontWeight: 500, fontSize: SUB_FS, lineHeight: 1.3, color: C.ink2, whiteSpace: 'nowrap', opacity: size ? 1 : 0}}>
          {cv.sub}
        </div>
      ) : null}
      {/* the measuring copy: every line at HEAD_MAX, invisible */}
      <div style={{position: 'absolute', top: 0, left: 0, visibility: 'hidden', fontFamily: F.sans, fontWeight: 700, fontSize: HEAD_MAX, letterSpacing: '-0.015em'}}>
        {lines.map((line, i) => (
          <div key={i} ref={(el) => {
              refs.current[i] = el;
            }} style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
