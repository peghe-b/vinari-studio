// 15 calm (a hard cut on the wood's tap): the mirror again; the same woman, at ease, a hand in her hair, her chin up into
// the lamp's light, a small smile; her phone lies face down and silent. A slow push toward her face.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {E, ev, fr, lerp, prog, shot} from './lib';
import {cam, Room} from './kit/room';
import {mixW, POSES} from './kit/woman';

export const Calm: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('calm').from);
  const len = fr(shot('calm').to) - base;
  const w4 = fr(ev('w4')) - base;
  const k = E.inOut(prog(t, 0, len));
  const pose = mixW(POSES.stand, POSES.calm, E.inOut(prog(t, w4 - 10, 18)));
  const sc = lerp(1.18, 1.36, k);
  const fx = lerp(520, 470, k);
  const fy = lerp(860, 700, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(sc, fx, fy), transformOrigin: '0 0'}}>
        <Room uid="calm" frame={t + 400} pose={pose} faceDown calm={1} />
      </div>
    </div>
  );
};
