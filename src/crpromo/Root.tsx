import React from 'react';
import {Composition} from 'remotion';
import '../fonts';
import {setTheme} from '../tokens';
import {FPS, H, TOTAL, W} from './lib';
import {CrPromo} from './CrPromo';

setTheme('light');

export const CrRoot: React.FC = () => (
  <>
    <Composition id="CrPromo" component={CrPromo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
  </>
);
