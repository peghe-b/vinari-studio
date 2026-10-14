import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setAccents, setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {QrPromo} from './QrPromo';
import {Lab} from './Lab';
import {QrCover} from './Cover';

// the white world's tokens: the light theme (the kit's greys), the cobalt pair (the hero car's paint, the figure's light)
setTheme('light');
setAccents(0, 'cobalt');

export const QrRoot: React.FC = () => (
  <>
    <Composition id="QrPromo" component={QrPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Composition id="QrCoverA" component={QrCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{look: {cy: 0.38, tilt: 46, rotZ: -12, card: 600}}} />
    <Composition id="QrCoverB" component={QrCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{look: {cy: 0.4, tilt: 55, rotZ: -8, card: 660, lift: 0.5}}} />
    <Composition id="QrCoverC" component={QrCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{headMax: 128, look: {cy: 0.38, tilt: 34, rotZ: -16, card: 560}}} />
    <Composition id="QrCoverC2" component={QrCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{headMax: 128, look: {cy: 0.3, tilt: 34, rotZ: -16, card: 640, fade: 120}}} />
    <Composition id="QrCoverC3" component={QrCover} durationInFrames={1} fps={FPS} width={W} height={H} defaultProps={{headMax: 128, look: {cy: 0.27, tilt: 34, rotZ: -16, card: 680, fade: 100}}} />
    <Composition id="QrLab" component={Lab} durationInFrames={600} fps={FPS} width={W} height={H} defaultProps={{what: 'car'}} />
  </>
);
