// V135MatchNight: after the night match by Dinamo Arena, the car is not where he left it. One real photo, greyscale, full
// bleed, with its hand mark: the spot taken by a stranger's car in the packed lot (from above). A slow push towards the marked car (1.04 at
// most: a car photo is never pushed past it), the punch word white over the dark photo. (The payoff, the car found, is the
// app's own map in a ScreenFocus.)
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {L, rgba} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {Ink, type InkMark} from '../kit/ink';
import type {SceneCtx} from '../../types';

type P = {shot?: 'taken'; hitAt?: number | string; line?: string};

const IMG = {position: 'absolute', top: 0, height: 1920, objectFit: 'cover', filter: 'grayscale(1) contrast(1.08)'} as const;

/** the packed lot from above (1199 x 1600 drawn at 1.2x, centred: 75 % of its width); the ring on the stranger's car in his spot */
const Taken: React.FC = () => <Img src={staticFile('photos/lot-new-cars-portrait.jpg')} style={{...IMG, left: -180, width: 1439}} />;

export const V135MatchNight: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.4s'));
  const push = 1 + 0.035 * ease.camera(prog(frame, e, ctx.dur));
  const aim = {x: 576, y: 948};
  // the ring round the stranger's car (centred on it, 576 x 948), clear of the punch word's plate above it
  const marks: InkMark[] = [{kind: 'circle', box: {x: 516, y: 893, w: 120, h: 110}, at: hit}];
  return (
    <PictureBand camera={false}>
      <AbsoluteFill style={{backgroundColor: '#000000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: `${aim.x}px ${aim.y}px`}}>
          <Taken />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 760, background: `linear-gradient(${rgba('#000000', 0.88)} 40%, ${rgba('#000000', 0)})`}} />
      </AbsoluteFill>
      <Ink marks={marks} end={ctx.dur} color="#FFFFFF" room={{x: 70, y: 400, w: 820, h: 960}} />
      {p.line ? (
        <Hud>
          {/* the punch word on its own dark plate: never white straight on the busy parking rows */}
          <div style={{position: 'absolute', left: L.camSafe.left - 28, top: 480, whiteSpace: 'nowrap', padding: '18px 32px 22px', borderRadius: 24, backgroundColor: rgba('#000000', 0.86)}}>
            <Words text={p.line} at={hit} fx="slam" size={96} color="#FFFFFF" />
          </div>
        </Hud>
      ) : null}
      <Sfx name="horn-chorus" at={Math.max(base, e)} volume={0.45} />
      <Haptic kind="light" at={hit} />
    </PictureBand>
  );
};
