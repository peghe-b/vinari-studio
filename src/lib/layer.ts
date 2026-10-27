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
/** From film POLISH_FROM on (src/lib/guard.mjs) a figure must stay whole too: the "obj" pass draws the FIG things as well,
 *  except those marked BLEED as well, a library staging's DELIBERATE full-bleed part (the cabin's wheel and hands, the
 *  dashboard's rim, a hand whose forearm leaves the frame): they keep out of the subtitle band ("fig" pass) and may run
 *  past the frame. A Film never marks BLEED (filmlint): its full-bleed background stays unmarked, its things whole. */
export const BLEED = 'vn-bleed';
/** "bare" (phase 2's TEXT_CLASH, tools/ci/p2pixels.py): the picture WITHOUT its words (the lens layer's own pass: every TXT
 *  hidden, the layout kept), so the guards see what each word stands on in the film, where the text layer is always on top:
 *  a head, a hand mark's stroke, another word's photo or white paper under a white headline. */
export type Probe = 'obj' | 'fig' | 'pic' | 'txt' | 'bare';
export const PROBE_CLASS = {obj: 'vn-probe-obj', fig: 'vn-probe-fig', txt: 'vn-probe-txt', bare: 'vn-probe-bare'} as const;
/** Phase 2's text pass (tools/p2-stills.mjs, tools/ci/p2pixels.py TEXT_EDGE, TEXT_HIT): only the words (TXT), in their own
 *  colour, on the key-green field; the scene's pictures, cards and marks stay hidden. */
export const PROBE_CSS_TXT = `.${PROBE_CLASS.txt}{visibility:hidden}.${PROBE_CLASS.txt} .${TXT}{visibility:visible}.${PROBE_CLASS.txt} .${TXT} *{visibility:visible}`;
/** The probe's CSS from POLISH_FROM on: as PROBE_CSS, and the "obj" pass also draws every FIG thing not marked BLEED (an OBJ
 *  inside a BLEED part still shows; a FIG inside one stays hidden). */
export const PROBE_CSS_POLISH = `.${PROBE_CLASS.obj},.${PROBE_CLASS.fig}{visibility:hidden}.${PROBE_CLASS.obj} .${OBJ},.${PROBE_CLASS.obj} .${FIG}{visibility:visible}.${PROBE_CLASS.fig} .${FIG}{visibility:visible}.${PROBE_CLASS.fig} .${FIG} .${OBJ}{visibility:inherit}.${PROBE_CLASS.obj} .${BLEED}{visibility:hidden}.${PROBE_CLASS.obj} .${BLEED} .${FIG}{visibility:inherit}.${PROBE_CLASS.obj} .${BLEED} .${OBJ}{visibility:visible}.${PROBE_CLASS.obj} clipPath *,.${PROBE_CLASS.obj} mask *,.${PROBE_CLASS.fig} clipPath *,.${PROBE_CLASS.fig} mask *{visibility:visible}`;
export const PROBE_CSS = `.${PROBE_CLASS.obj},.${PROBE_CLASS.fig}{visibility:hidden}.${PROBE_CLASS.obj} .${OBJ}{visibility:visible}.${PROBE_CLASS.fig} .${FIG}{visibility:visible}.${PROBE_CLASS.obj} .${OBJ} .${FIG},.${PROBE_CLASS.fig} .${FIG} .${OBJ}{visibility:inherit}.${PROBE_CLASS.obj} clipPath *,.${PROBE_CLASS.obj} mask *,.${PROBE_CLASS.fig} clipPath *,.${PROBE_CLASS.fig} mask *{visibility:visible}`;
