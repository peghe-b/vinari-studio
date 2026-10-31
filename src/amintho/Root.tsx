import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {AminthoPromo} from './Amintho';
import {AminthoCover} from './Covers';
import {Obd3dCover} from './Covers3d';

// the white world's tokens (the app's screens, the end card): the light theme; the cobalt pair (blue + the check lamp's amber)
setTheme('light');
setAccents(0, 'cobalt');

export const AminthoRoot: React.FC = () => (
  <>
    <Composition id="AminthoPromo" component={AminthoPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="CoverA" component={AminthoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'A' as const}} />
    <Composition id="CoverB" component={AminthoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'B' as const}} />
    <Composition id="CoverC" component={AminthoCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'C' as const}} />
    <Composition id="Obd3dCoverA" component={Obd3dCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'A' as const}} />
    <Composition id="Obd3dCoverB" component={Obd3dCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'B' as const}} />
    <Composition id="Obd3dCoverC" component={Obd3dCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{variant: 'C' as const}} />
  </>
);
