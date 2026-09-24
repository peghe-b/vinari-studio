import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {videos} from './generated/videos';
import {Cover} from './Cover';
import {Promo, totalFrames} from './Promo';
import {FPS, H, W} from './tokens';
import type {VideoProps} from './types';
import {Wide, WIDE_H, WIDE_W} from './Wide';

// One composition per spec that has a voice timeline. tools/build-index.mjs regenerates
// src/generated/videos.ts from specs/*.json + public/vo/<id>/timeline.json.
export const Root: React.FC = () => (
  <>
    {videos.map((v: VideoProps) => (
      <Composition key={v.spec.id} id={v.spec.id} component={Promo} durationInFrames={totalFrames(v)} fps={FPS} width={W} height={H} defaultProps={v} />
    ))}
    {/* 16:9 of the same film (src/Wide.tsx): tools/formats.mjs <id> --wide */}
    {videos.map((v: VideoProps) => (
      <Composition key={`${v.spec.id}-wide`} id={`${v.spec.id}-wide`} component={Wide} durationInFrames={totalFrames(v)} fps={FPS} width={WIDE_W} height={WIDE_H} defaultProps={v} />
    ))}
    {/* the designed Reels cover (src/Cover.tsx): tools/covers.mjs <id>. Rendered at frame 0; it is as long as
        the film because a <Sequence> inside <Freeze> is clipped to the composition's length */}
    {videos.map((v: VideoProps) => (
      <Composition key={`${v.spec.id}-cover`} id={`${v.spec.id}-cover`} component={Cover} durationInFrames={totalFrames(v)} fps={FPS} width={W} height={H} defaultProps={v} />
    ))}
  </>
);
