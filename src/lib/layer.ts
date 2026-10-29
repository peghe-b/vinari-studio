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
// An SVG clipPath or mask whose shapes inherit visibility:hidden clips everything away (a hidden child does not contribute
// to the clip): in the text layer a phone's name inside its clipped screen vanished. Their shapes are never drawn
// themselves, so they stay visible in both layers.
export const LAYER_CSS = `.${GFX_CLASS} .${TXT}{visibility:hidden!important}.${TEXT_CLASS}{visibility:hidden}.${TEXT_CLASS} .${TXT}{visibility:visible}.${TEXT_CLASS} clipPath *,.${TEXT_CLASS} mask *{visibility:visible}`;

// The frame guards' probe (src/lib/guard.mjs, tools/ci/guards.mjs; input prop "guardProbe"): the film drawn with only its
// marked things visible on a key-green field, so check.mjs can measure where they are. OBJ marks a thing that must stay WHOLE
// inside the frame and out of the subtitle band (a phone, a car, a card, a diagram); FIG one that only keeps out of the band
// (a person, a hand, a steering wheel: a figure may be cropped by the frame). A scene puts the class on the element that
// draws the thing (a div, an SVG <g>); a Film marks its own things the same way. Like the text layer, visibility keeps the
// layout, so the probe's things sit exactly where the film draws them.
export const OBJ = 'vn-obj';
export const FIG = 'vn-fig';
export type Probe = 'obj' | 'fig' | 'pic';
export const PROBE_CLASS = {obj: 'vn-probe-obj', fig: 'vn-probe-fig'} as const;
export const PROBE_CSS = `.${PROBE_CLASS.obj},.${PROBE_CLASS.fig}{visibility:hidden}.${PROBE_CLASS.obj} .${OBJ}{visibility:visible}.${PROBE_CLASS.fig} .${FIG}{visibility:visible}.${PROBE_CLASS.obj} .${OBJ} .${FIG},.${PROBE_CLASS.fig} .${FIG} .${OBJ}{visibility:inherit}.${PROBE_CLASS.obj} clipPath *,.${PROBE_CLASS.obj} mask *,.${PROBE_CLASS.fig} clipPath *,.${PROBE_CLASS.fig} mask *{visibility:visible}`;
