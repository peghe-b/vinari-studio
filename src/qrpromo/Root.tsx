import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {QrPromo} from './QrPromo';
import {Lab} from './Lab';

// the white world's tokens: the light theme (the kit's greys), the cobalt pair (the hero car's paint, the figure's light)
setTheme('light');
setAccents(0, 'cobalt');

export const QrRoot: React.FC = () => (
  <>
    <Composition id="QrPromo" component={QrPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="QrLab" component={Lab} durationInFrames={600} fps={FPS} width={W} height={H} defaultProps={{what: 'car'}} />
  </>
);
