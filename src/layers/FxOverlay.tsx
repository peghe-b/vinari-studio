import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, isLight} from '../tokens';

// The planned flashes of an fx film (tools/ci/fx.mjs: flash transitions, crash cuts, a Twist's hit), above the scenes and
// below the meta bar and the subtitle. White on the dark film; on paper an ink dip at three quarters. Each one ramps over
// at least two frames each side (tools/flicker.py sees a ramp, and its window is on its allowlist anyway), at most
// MOTION.flashMax a film, MOTION.flashGap frames apart: never a strobe.
// The aura drop's hit (`tone: "white"`, 2026-10-07: "a SAD opening and BOOM") is white on both looks: it comes out of the
// hurt's grey, dimmed picture, so on paper an ink dip would only fade the drop up from grey (the first demo read as a
// fade-in, not a hit); white is the brightest jump the frame can make.
export const FxOverlay: React.FC<{flashes: {at: number; curve: number[]; tone?: 'white'}[]}> = ({flashes}) => {
  const frame = useCurrentFrame();
  let a = 0;
  let w = 0;
  for (const f of flashes) {
    const i = frame - f.at;
    if (i < 0 || i >= f.curve.length) continue;
    if (f.tone === 'white') w = Math.max(w, f.curve[i]);
    else a = Math.max(a, f.curve[i]);
  }
  if (a <= 0.001 && w <= 0.001) return null;
  const light = isLight();
  return (
    <>
      {a > 0.001 ? <AbsoluteFill style={{backgroundColor: light ? C.ink : C.sheen, opacity: light ? a * 0.75 : a, pointerEvents: 'none'}} /> : null}
      {w > 0.001 ? <AbsoluteFill style={{backgroundColor: C.sheen, opacity: w, pointerEvents: 'none'}} /> : null}
    </>
  );
};
