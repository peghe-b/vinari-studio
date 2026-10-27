import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {videos} from './generated/videos';
import {slideSets} from './generated/slides';
import {Cover, CoverPreview} from './Cover';
import {Promo, totalFrames} from './Promo';
import {HighlightCover, SlideSet, SLOT} from './slides/Slides';
import {FPS, H, W} from './tokens';
import type {VideoProps} from './types';
import {Wide, WIDE_H, WIDE_W} from './Wide';
import type {VideoSpec} from './types';

// the preview's default: a cover of the design's test set (the studio's preview shows it; covers.mjs passes the real spec)
const PREVIEW_SPEC = {
  id: 'cover-preview',
  category: 'reminders',
  beats: [{say: 'ყველა ვადას თავში ინახავ?'}],
  cover: {title: 'ყველა ვადას | თავში ინახავ?', kind: 'stat', stat: {value: '7', unit: 'დღე', label: 'ადრე შეგახსენებს', mark: 'circle'}},
} as unknown as VideoSpec;

// One composition per spec that has a voice timeline. tools/build-index.mjs regenerates
// src/generated/videos.ts from specs/*.json + public/vo/<id>/timeline.json, and src/generated/slides.ts from the Story sets
// (specs/slides/*.json) that pass tools/ci/slides.mjs.
export const Root: React.FC = () => (
  <>
    {videos.map((v: VideoProps) => (
      <Composition key={v.spec.id} id={v.spec.id} component={Promo} durationInFrames={totalFrames(v)} fps={FPS} width={W} height={H} defaultProps={v} />
    ))}
    {/* 16:9 of the same film (src/Wide.tsx): tools/formats.mjs <id> --wide */}
    {videos.map((v: VideoProps) => (
      <Composition key={`${v.spec.id}-wide`} id={`${v.spec.id}-wide`} component={Wide} durationInFrames={totalFrames(v)} fps={FPS} width={WIDE_W} height={WIDE_H} defaultProps={v} />
    ))}
    {/* the designed Reels cover (src/Cover.tsx): tools/covers.mjs <id>. Rendered at frame 0; it is as long as the film because a
        <Sequence> inside <Freeze> is clipped to the composition's length */}
    {videos.map((v: VideoProps) => (
      <Composition key={`${v.spec.id}-cover`} id={`${v.spec.id}-cover`} component={Cover} durationInFrames={totalFrames(v)} fps={FPS} width={W} height={H} defaultProps={v} />
    ))}
    {/* a cover from a spec alone, no voice timeline (tools/covers.mjs --spec <file>): input props {spec, coverResolved, coverCtx} */}
    <Composition id="cover-preview" component={CoverPreview} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{spec: PREVIEW_SPEC}} />
    {/* the Instagram Story slides (src/slides/Slides.tsx): slide i at frames i * SLOT .. ; tools/slides.mjs renders them */}
    {slideSets.map((s) => (
      <Composition key={`${s.id}-slides`} id={`${s.id}-slides`} component={SlideSet} durationInFrames={Math.max(1, s.slides.length) * SLOT} fps={FPS} width={W} height={H} defaultProps={{set: s}} />
    ))}
    {slideSets.map((s) => (
      <Composition key={`${s.id}-highlight`} id={`${s.id}-highlight`} component={HighlightCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{set: s}} />
    ))}
  </>
);
