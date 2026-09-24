import React from 'react';
import {useCurrentFrame} from 'remotion';
import {typeOn} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, L, T} from '../tokens';

export type MetaEntry = {from: number; left: string; right: string};

// Persistent mono label bar just inside the top of the Reels safe zone (frame pixels, outside the
// stage), its ends on the content box's edges. Each change types on at 1.4 chars/frame.
export const MetaBar: React.FC<{entries: MetaEntry[]}> = ({entries}) => {
  const frame = useCurrentFrame();
  const idx = entries.map((e) => frame >= e.from).lastIndexOf(true);
  const cur = entries[idx];
  if (!cur || !cur.left) return null;
  // only a changed label types on again; an unchanged one stays put across cuts
  let startLeft = cur.from;
  for (let i = idx; i >= 0 && entries[i].left === cur.left; i--) startLeft = entries[i].from;
  const left = typeOn(capsLatin(cur.left), frame, startLeft, 1.4);
  const right = typeOn(capsLatin(cur.right), frame, cur.from + 4, 1);
  const style: React.CSSProperties = {
    position: 'absolute',
    top: L.metaY,
    fontFamily: F.mono,
    fontSize: T.meta,
    letterSpacing: '0.06em',
    color: C.ink2,
    whiteSpace: 'nowrap',
  };
  return (
    <>
      <div style={{...style, left: L.metaLeft}}>
        {/* a square bullet: a drawn rule reads as an em dash */}
        <span style={{display: 'inline-block', width: 8, height: 8, background: C.rule, verticalAlign: 'middle', marginRight: 16, marginTop: -4}} />
        {left}
      </div>
      <div style={{...style, right: 1080 - L.metaRight}}>{right}</div>
    </>
  );
};
