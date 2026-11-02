import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {NavCover} from './Cover';
import {FPS, H, TOTAL, W} from './lib';
import {NavPromo} from './NavPromo';

// the white world's tokens: the light theme (the kit's car and greys), the cobalt pair (the hero car's paint)
setTheme('light');
setAccents(0, 'cobalt');

export const NavRoot: React.FC = () => (
  <>
    <Composition id="NavPromo" component={NavPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="NavCover" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{}} />
  </>
);
