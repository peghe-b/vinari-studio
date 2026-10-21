import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {NavCarPlay} from './NavCarPlay';

// the white world's tokens (the reveal, the app's screens, the end card): the light theme, the cobalt pair
setTheme('light');
setAccents(0, 'cobalt');

export const NavCpRoot: React.FC = () => (
  <>
    <Composition id="NavCarPlay" component={NavCarPlay} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
  </>
);
