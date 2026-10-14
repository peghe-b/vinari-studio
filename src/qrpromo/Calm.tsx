// 9 calm (a hard cut on the wood's tap, no grey dissolve): the mirror again; the same woman, relaxed, smiling into the lamp's light; the phone lies face down and silent.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {E, ev, fr, lerp, prog, shot} from './lib';
import {cam, Room} from './kit/room';

export const Calm: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('calm').from);
  const len = fr(shot('calm').to) - base;
  const w4 = fr(ev('w4')) - base;
  const k = E.inOut(prog(t, 0, len));
  // the whole room at once (her phone lies face down on the vanity, dark), then a slow push toward her face
  const sc = lerp(1.02, 1.12, k);
  const fx = lerp(560, 420, k);
  const fy = lerp(960, 640, k);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#1E1714', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(sc, fx, fy), transformOrigin: '0 0'}}>
        <Room uid="calm" frame={t + 400} pose="stand" face="smile" acts={[{at: w4 + 400 - 4, pose: 'stand', face: 'smile'}]} faceDown calm={1} />
      </div>
    </div>
  );
};
