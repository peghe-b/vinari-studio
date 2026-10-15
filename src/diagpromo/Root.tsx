import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {Lab} from './Lab';
import {DiagPromo} from './DiagPromo';
import {DiagCover} from './Cover';

// the white world's tokens (the reveal, the app's screens, the end card): the light theme, the cobalt pair
setTheme('light');
setAccents(0, 'cobalt');

export const DiagRoot: React.FC = () => (
  <>
    <Composition id="DiagPromo" component={DiagPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="DiagCover" component={DiagCover} durationInFrames={1} fps={FPS} width={W} height={H} />
    <Composition id="DiagCover45" component={DiagCover} durationInFrames={1} fps={FPS} width={W} height={1350} defaultProps={{tall: false}} />
    <Composition id="DiagLab" component={Lab} durationInFrames={600} fps={FPS} width={W} height={H} defaultProps={{what: 'garage'}} />
  </>
);
