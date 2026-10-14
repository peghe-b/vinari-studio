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
    <Composition id="NavCoverPhone" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'phone' as const}} />
    <Composition id="NavCoverMap" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'map' as const}} />
    <Composition id="NavCoverMapA" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'map' as const, look: {cy: 0.34, ay: 1250}}} />
    <Composition id="NavCoverMapB" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'map' as const, look: {cy: 0.4, tilt: 38, ay: 1200, arrow: 1.35, rotZ: -10}}} />
    <Composition id="NavCoverMapC" component={NavCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'map' as const, headMax: 112, look: {cy: 0.4, tilt: 44, ay: 1230, arrow: 1.2}}} />
  </>
);
