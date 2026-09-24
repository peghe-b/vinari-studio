import React from 'react';
import {AbsoluteFill} from 'remotion';
import {STAGE} from '../tokens';

// Every scene draws in the original 1080x1920 design space (content box x 120..960, y 380..1100).
// The stage scales that space once, STAGE.s about the content box, into the Instagram Reels safe
// zone (tokens.ts SAFE / STAGE). One flat 2D transform: text and SVG re-rasterise at the final size,
// so they stay crisp; Wire3D renders its canvas at dpr STAGE.s for the same reason.
export const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{transform: `translate(${STAGE.x}px, ${STAGE.y}px) scale(${STAGE.s})`, transformOrigin: '0 0'}}>{children}</AbsoluteFill>
);
