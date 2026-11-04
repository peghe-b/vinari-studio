import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {NavHook} from './Hook';

// the night world's tokens: the dark theme (the kit's car and greys on black), the cobalt pair (the city's one light)
setTheme('dark');
setAccents(0, 'cobalt');

export const HookRoot: React.FC = () => (
  <>
    <Composition id="NavHook" component={NavHook} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
  </>
);
