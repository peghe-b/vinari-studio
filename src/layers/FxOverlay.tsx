import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, isLight} from '../tokens';

// The planned flashes of an fx film (tools/ci/fx.mjs: flash transitions, crash cuts, a Twist's hit), above the scenes and
// below the meta bar and the subtitle. White on the dark film; on paper an ink dip at three quarters. Each one ramps over
// at least two frames each side (tools/flicker.py sees a ramp, and its window is on its allowlist anyway), at most
// MOTION.flashMax a film, MOTION.flashGap frames apart: never a strobe.
export const FxOverlay: React.FC<{flashes: {at: number; curve: number[]}[]}> = ({flashes}) => {
  const frame = useCurrentFrame();
  let a = 0;
  for (const f of flashes) {
    const i = frame - f.at;
    if (i >= 0 && i < f.curve.length) a = Math.max(a, f.curve[i]);
  }
  if (a <= 0.001) return null;
  const light = isLight();
  return <AbsoluteFill style={{backgroundColor: light ? C.ink : C.sheen, opacity: light ? a * 0.75 : a, pointerEvents: 'none'}} />;
};
