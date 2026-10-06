// src/illo-kit/Kit.tsx: one kit demo in the film's frame: the theme swap, the Stage (the same scale as a film), the
// scene's defs and, for a demo with `band`, the picture band's hard cut. A small mono caption names it (gallery only).
import React, {useId} from 'react';
import {AbsoluteFill, Composition, getInputProps, useCurrentFrame} from 'remotion';
import '../fonts';
import {Stage} from '../layers/Stage';
import {PictureBand} from '../scenes/common';
import {DefsSvg} from '../scenes/illo/solid';
import {C, F, FPS, H, L, setTheme, W} from '../tokens';
import {DEMOS} from './demos';

type KitProps = {demo: string; group: string; row: string; frames: number[]; theme?: 'dark' | 'light'};

const themeOf = (p: KitProps) => {
  let t: unknown = p.theme;
  if (t === undefined) {
    try {
      t = (getInputProps() as Record<string, unknown>).theme;
    } catch {
      t = undefined;
    }
  }
  return t === 'light' ? 'light' : 'dark';
};

export const Kit: React.FC<KitProps> = (p) => {
  const look = themeOf(p);
  setTheme(look);
  const f = useCurrentFrame();
  const uid = useId();
  const d = DEMOS.find((x) => x.id === p.demo);
  if (!d) throw new Error(`no kit demo "${p.demo}"`);
  const body = d.render(f, uid);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Stage>
        <DefsSvg uid={uid} />
        {d.band ? <PictureBand>{body}</PictureBand> : body}
      </Stage>
      <div style={{position: 'absolute', top: L.metaY, left: L.metaLeft, fontFamily: F.mono, fontSize: 26, letterSpacing: '0.06em', color: C.ink2, whiteSpace: 'nowrap'}}>
        ILLO KIT · {d.group} · {d.row} · {look} · f{f}
      </div>
    </AbsoluteFill>
  );
};

export const KitRoot: React.FC = () => (
  <>
    {DEMOS.map((d) => (
      <Composition
        key={d.id}
        id={`kit-${d.id}`}
        component={Kit}
        durationInFrames={Math.max(150, ...d.frames.map((x) => x + 1))}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{demo: d.id, group: d.group, row: d.row, frames: d.frames}}
      />
    ))}
  </>
);
