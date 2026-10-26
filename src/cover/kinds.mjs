// The cover's kinds (2026-10-26, plan step 1.4: "the cover is no longer a film frame"). Shared by the render (src/Cover.tsx,
// src/cover/*.tsx) and the lint (tools/build-index.mjs, tools/check.mjs, tools/ci/cover.mjs). Plain JS, typed by kinds.d.mts.
//
// Every cover is PURPOSE-BUILT and black and white on the paper #F3F3F3, in the layout the owner approved (Marketing/19 the
// CarPlay cover, Marketing/21 and 23 the infographic cards, the polaroid of v118): the lockup and the „VINARI+" pill, a
// hairline, a two-line headline, then ONE picture:
//   card      a white card built from the spec's data: "bars" (up to 3 rows, an app icon, a label, a bar) or "numbers" (up to
//             3 rows, a label and a big number), with a hand-drawn marker on the row that matters
//   screen    a REAL current app capture (public/screens/<src>.jpg) in a whole iPhone, tilted, a marker on the row that matters
//   carplay   a REAL CarPlay capture (public/screens/carplay/<src>.png) in the car's display, tilted
//   polaroid  the story's real photo(s) as tilted instant photos (public/photos, a person's face first)
// Never a frame of the film: a drawn gauge or a drawn roundabout on the cover (v119, v122) is impossible by construction.

export const COVER_KINDS = Object.freeze(['card', 'screen', 'carplay', 'polaroid']);
export const CARD_TYPES = Object.freeze(['bars', 'numbers']);
export const MARKS = Object.freeze(['circle', 'underline', 'strike', 'arrow', 'tick']);
export const TILTS = Object.freeze(['left', 'right', 'flat']);
export const CARPLAY_SCREENS = Object.freeze(['f18-03-home-car', 'f18-06-list-car', 'f18-07-preview-car', 'f18-10-guid1-car', 'f18-12-lanes-car', 'f18-14-arrived-car']);
export const CARD_ROWS = 3;
export const LABEL_MAX = 18; // letters of a card row's label
export const VALUE_MAX = 9; // characters of a number ("186 000")
export const NOTE_MAX = 34; // letters of the caption line
export const PILL = 'VINARI+';

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
const letters = (s) => String(s ?? '').replace(/\s+/g, '').length;
const frac = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const marksOf = (m) => (m === undefined ? [] : Array.isArray(m) ? m : [m]);

/** The kind a cover asks for (spec.cover.kind), or null (an older spec: src/Cover.tsx then picks one, never a frame). */
export const coverKind = (cover) => (cover && typeof cover === 'object' && COVER_KINDS.includes(cover.kind) ? cover.kind : null);

/**
 * What is wrong with spec.cover, as one-line problems ("COVER_..."). ctx (all optional):
 *   screens   a Set of the current captures' names (public/screens/*.jpg)
 *   retired   a Set of the retired ones (public/screens/_retired)
 *   photo     (src) => true when public/photos has it
 *   syms      a Set of the app's icon names (src/scenes/kit/symbols.ts)
 *   needKind  true: a cover without "kind" is a problem (the cloud, new films)
 */
export const coverProblems = (cover, ctx = {}) => {
  const out = [];
  if (!cover || typeof cover !== 'object') return ['COVER no "cover" {title, kind, ...}'];
  if (!isStr(cover.title)) out.push('COVER_TEXT no "title": two short lines, "|" breaks them');
  else {
    const lines = cover.title.split('|');
    if (lines.length > 2) out.push(`COVER_TEXT "title" has ${lines.length} lines: two at most ("|" once)`);
    if (cover.title.includes('—')) out.push('COVER_TEXT an em dash (—) in the title');
  }
  if ('frame' in cover || 'hook' in cover) out.push('COVER_FRAME "frame"/"hook" are gone: the cover is never a film frame; name its "kind" and its data instead');
  const kind = cover.kind;
  if (kind === undefined) {
    if (ctx.needKind) out.push(`COVER_KIND no "kind": one of ${COVER_KINDS.join(', ')} (SKILL.md Cover)`);
    return out;
  }
  if (!COVER_KINDS.includes(kind)) return [...out, `COVER_KIND "kind" is "${kind}": one of ${COVER_KINDS.join(', ')}`];
  if (cover.note !== undefined && (!isStr(cover.note) || letters(cover.note) > NOTE_MAX || cover.note.includes('—'))) out.push(`COVER_TEXT "note" is one short line (${NOTE_MAX} letters at most, no em dash)`);
  const markOk = (m, where) => {
    for (const k of marksOf(m)) if (!MARKS.includes(k)) out.push(`COVER_MARK ${where} "${k}": one of ${MARKS.join(', ')}`);
  };
  if (kind === 'card') {
    const card = cover.card;
    if (!card || typeof card !== 'object') return [...out, 'COVER_CARD a "card" cover needs "card": {"type": "bars" | "numbers", "rows": [...]}'];
    if (!CARD_TYPES.includes(card.type)) out.push(`COVER_CARD "card.type" is "${card.type}": one of ${CARD_TYPES.join(', ')}`);
    const rows = Array.isArray(card.rows) ? card.rows : [];
    if (rows.length < 1 || rows.length > CARD_ROWS) out.push(`COVER_CARD "card.rows": 1 to ${CARD_ROWS} rows`);
    let marked = 0;
    rows.forEach((r, i) => {
      const at = `card.rows[${i}]`;
      if (!r || typeof r !== 'object') return out.push(`COVER_CARD ${at} is {label, value, ...}`);
      if (!isStr(r.label) || letters(r.label) > LABEL_MAX) out.push(`COVER_CARD ${at}.label: a few words, ${LABEL_MAX} letters at most`);
      if (card.type === 'bars') {
        if (!frac(r.value)) out.push(`COVER_CARD ${at}.value: the bar's fill, a number 0..1`);
        if (r.icon !== undefined && (!isStr(r.icon) || (ctx.syms && !ctx.syms.has(r.icon)))) out.push(`COVER_CARD ${at}.icon "${r.icon}" is not one of the app's icons (src/scenes/kit/icons.tsx SYM_NAMES)`);
      }
      if (card.type === 'numbers') {
        if (!isStr(String(r.value ?? '')) || String(r.value).length > VALUE_MAX || !/\d/.test(String(r.value))) out.push(`COVER_CARD ${at}.value: the number as shown ("186 000"), ${VALUE_MAX} characters at most`);
        if (r.unit !== undefined && (!isStr(r.unit) || r.unit.length > 6)) out.push(`COVER_CARD ${at}.unit: a short unit ("კმ", "₾", "%")`);
      }
      markOk(r.mark, `${at}.mark`);
      if (marksOf(r.mark).length) marked++;
    });
    if (marked > 2) out.push('COVER_MARK more than two marked rows: one mark says "look here", three say nothing');
    if (card.note !== undefined) out.push('COVER_CARD the caption is "cover.note", not "card.note"');
  }
  if (kind === 'screen' || kind === 'carplay') {
    const sc = cover.screen;
    const src = sc && typeof sc === 'object' ? sc.src : undefined;
    if (!isStr(src)) out.push(`COVER_SCREEN a "${kind}" cover needs "screen": {"src": ...}`);
    else if (kind === 'carplay') {
      if (!CARPLAY_SCREENS.includes(src)) out.push(`COVER_SCREEN "${src}" is not a CarPlay capture: one of ${CARPLAY_SCREENS.join(', ')}`);
    } else if (ctx.retired?.has(src)) out.push(`COVER_OLD_SCREEN "${src}" is retired (public/screens/_retired): the app no longer looks like it`);
    else if (ctx.screens && !ctx.screens.has(src)) out.push(`COVER_SCREEN "${src}" is not a current capture of public/screens`);
    if (sc && typeof sc === 'object') {
      if (sc.tilt !== undefined && !TILTS.includes(sc.tilt)) out.push(`COVER_SCREEN "screen.tilt" is "${sc.tilt}": one of ${TILTS.join(', ')}`);
      if (sc.mark !== undefined) {
        const m = sc.mark;
        if (!m || typeof m !== 'object' || ![m.x, m.y, m.w, m.h].every(frac)) out.push('COVER_MARK "screen.mark" is {x, y, w, h} (fractions of the capture, measured on it) and "kind"');
        else markOk(m.kind ?? 'circle', 'screen.mark.kind');
      }
    }
  }
  if (kind === 'polaroid') {
    const ph = cover.photo === undefined ? [] : Array.isArray(cover.photo) ? cover.photo : [cover.photo];
    if (ph.length > 2) out.push('COVER_PHOTO "photo": one photo, or two (a Split)');
    for (const p of ph) if (!isStr(p) || (ctx.photo && !ctx.photo(p))) out.push(`COVER_PHOTO "${p}" is not in public/photos`);
  }
  return out;
};
