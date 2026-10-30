import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {ObdPromo} from './ObdPromo';
import {ObdPromoCover} from './Covers';

// the white world's tokens (the app's screens, the end card): the light theme, the cobalt pair (accents never reach text)
setTheme('light');
setAccents(0, 'cobalt');

export const ObdRoot: React.FC = () => (
  <>
    <Composition id="ObdPromo" component={ObdPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="ObdPromoCoverA" component={ObdPromoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'A' as const}} />
    <Composition id="ObdPromoCoverB" component={ObdPromoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'B' as const}} />
    <Composition id="ObdPromoCoverC" component={ObdPromoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'C' as const}} />
  </>
);
