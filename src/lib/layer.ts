import React from 'react';

// The lens (layers/VHS.tsx) works on GRAPHICS only, never on text (the owner, 2026-09-24: a clean line of
// text, the lens fringe on cars, charts, phones, maps and cards). Promo therefore renders the scenes
// twice, in two layers of the same size and the same transforms:
//   "gfx"   under the lens filter: everything except the text (text is there, but visibility: hidden)
//   "text"  above it, unfiltered: only the text (everything else visibility: hidden)
// "all" (the default) is one plain layer: no lens (the cover, vhs 0).
// A scene marks its text with className={TXT} on the element that draws it (a div, a span, an SVG
// <text>); everything inside a TXT element belongs to the text layer, box and all (a chip, a price tag
// on its knockout). visibility keeps the layout, so the two layers line up to the pixel. A text drawn
// UNDER a graphic that covers it (a card's print behind the passer-by's phone) must stay graphic: the
// text layer is always on top.
// Side effects run once: Sfx (and so Haptic, Land, TypeSfx) plays only outside the text layer, Wire3D
// mounts its WebGL canvas only there too, Phone and Photo skip their <Img> in the text layer.
export type Layer = 'all' | 'gfx' | 'text';
export const LayerCtx = React.createContext<Layer>('all');
export const useLayer = () => React.useContext(LayerCtx);

/** className of an element that draws text: the text layer shows it, the lens layer hides it. */
export const TXT = 'vn-t';
export const GFX_CLASS = 'vn-gfx';
export const TEXT_CLASS = 'vn-txt';
export const LAYER_CSS = `.${GFX_CLASS} .${TXT}{visibility:hidden!important}.${TEXT_CLASS}{visibility:hidden}.${TEXT_CLASS} .${TXT}{visibility:visible}`;
