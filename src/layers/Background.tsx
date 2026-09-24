import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../tokens';

// The field is pure black (owner, 2026-09-24): no gradient, no grid, no vignette. Texture now comes
// only from the VHS layer (layers/VHS.tsx), and none of it lifts the black.
export const Background: React.FC = () => <AbsoluteFill style={{backgroundColor: C.bg}} />;
