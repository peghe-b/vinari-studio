// src/scenes/kit/scale.ts: how big the kit's 1080 x 1920 box is shown. A film scene draws on the STAGE, which Promo scales by
// STAGE.s once (src/tokens.ts), so a kit WebGL canvas inside a film renders at that many device pixels per px (never a CSS
// upscale of its pixels: the screen's text and the car's edges stay sharp). The Instagram Story slides (src/slides/) draw in
// frame px and provide 1.
import React from 'react';
import {STAGE} from '../../tokens';

export const KitScale = React.createContext<number>(STAGE.s);
export const useKitDpr = () => React.useContext(KitScale) * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
