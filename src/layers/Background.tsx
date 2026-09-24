import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../tokens';

// The field is pure black (owner, 2026-09-24): no gradient, no grid, no vignette, no grain. The lens
// (layers/VHS.tsx) only moves the graphics' red and blue a pixel or two and never lifts the black.
export const Background: React.FC = () => <AbsoluteFill style={{backgroundColor: C.bg}} />;
