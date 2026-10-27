// Which cover a film gets (2026-10-27): its own "cover" when it lays out clean, else one built from the film's own data.
// NEVER the logo: the brand card (the bare VINARI mark in a white box, „3 წუთი გამარჯვებამდე და ტოიოტა ჩერდება") is gone.
//
//   resolveCover(spec, ctx) -> {cover, how, layout, tried}
//     how      "spec" (the spec's own cover), "mapped" (an older spec's card / CarPlay / polaroid, read as today's
//              composition), or "net:<what>" (built from the film: titlecard, bignumber, ledger, opening)
//     ctx      the layout's ctx (regions, photoInfo, credit, pose, polSign, slab, seed) and:
//              forceNet  skip the spec's own cover (covers.mjs after a cover broke its pixel guards; VS_COVER_FORCE_NET)
//              street    (text) => true when a line holds a street word (Node only: tools/ci/streetwords.mjs)
//   netCandidates(spec)  the net's covers, in order: the FilmTitleCard, a labelled BigNumber, a Ledger, the opening line
//
// Older specs: no "kind" (main's films before 2026-10-26) go straight to the net, and never again get an automatic tilted
// phone (the old lastScreen fallback is gone). An old "card" becomes stat, versus or bars; an old "screen" on a CarPlay
// capture stays "carplay", on a phone capture it goes to the net; an old "polaroid" keeps its photo.
import {fitLines} from '../lib/textfit.mjs';
import {CARPLAY_SCREENS, COMPS} from './comps.mjs';
import {coverLayout} from './layout.mjs';

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
const coverObj = (spec) => (spec && typeof spec.cover === 'object' && spec.cover ? spec.cover : {});
const marksOf = (m) => (m === undefined ? [] : Array.isArray(m) ? m : [m]);

/** every scene of the film, in order (a beat's scene, then its cuts') */
export const scenesOf = (spec) => {
  const out = [];
  for (const b of Array.isArray(spec?.beats) ? spec.beats : []) {
    if (b?.scene && typeof b.scene === 'object') out.push(b.scene);
    for (const c of Array.isArray(b?.cuts) ? b.cuts : []) if (c?.scene && typeof c.scene === 'object') out.push(c.scene);
  }
  return out;
};

/** the headline: the spec's cover title, else the film's first spoken line */
export const titleOf = (spec) => {
  const t = coverObj(spec).title;
  if (isStr(t)) return t;
  return String(spec?.beats?.[0]?.say ?? spec?.title ?? '').split('|').slice(0, 2).join('|');
};

/** "350000" -> "350 000" (Georgian groups thousands with a space) */
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** An older cover read as one of today's compositions, or null (no kind, an old phone "screen": the net). */
export const mapOld = (spec) => {
  const cv = coverObj(spec);
  const title = titleOf(spec);
  const k = cv.kind;
  // today's kinds as written (a polaroid of 2026-10-26 named its photo at the top: "photo", no "polaroid" object)
  if (COMPS.includes(k) && (k !== 'polaroid' || (cv.polaroid && typeof cv.polaroid === 'object'))) return {cover: {...cv, title}, how: 'spec'};
  if (k === 'card' && cv.card && Array.isArray(cv.card.rows) && cv.card.rows.length) {
    const rows = cv.card.rows;
    if (cv.card.type === 'bars') return {cover: {title, kind: 'bars', bars: {rows: rows.slice(0, 3).map((r) => ({icon: r.icon, label: r.label, value: r.value, mark: r.mark})), note: cv.note}}, how: 'mapped'};
    if (rows.length === 1 || rows.length > 2) {
      const r = rows.find((x) => marksOf(x.mark).includes('circle')) ?? rows[rows.length - 1];
      return {cover: {title, kind: 'stat', stat: {value: String(r.value), unit: r.unit, label: r.label, mark: 'circle'}}, how: 'mapped'};
    }
    const win = marksOf(rows[1].mark).includes('circle') || marksOf(rows[0].mark).includes('strike') ? 'b' : 'a';
    const side = (r) => ({label: r.label, value: String(r.value), ...(r.unit ? {unit: r.unit} : {})});
    return {cover: {title, kind: 'versus', versus: {a: side(rows[0]), b: side(rows[1]), win}}, how: 'mapped'};
  }
  if (k === 'screen' && CARPLAY_SCREENS.includes(cv.screen?.src)) return {cover: {title, kind: 'carplay', carplay: {src: cv.screen.src}}, how: 'mapped'};
  if (k === 'carplay' && CARPLAY_SCREENS.includes(cv.screen?.src)) return {cover: {title, kind: 'carplay', carplay: {src: cv.screen.src}}, how: 'mapped'};
  if (k === 'polaroid' || cv.polaroid === true) {
    const named = (Array.isArray(cv.photo) ? cv.photo : cv.photo ? [cv.photo] : []).filter(isStr);
    const story = scenesOf(spec)
      .flatMap((s) => (s.type === 'PhotoStory' ? [s.src] : s.type === 'Split' ? [s.a?.src, s.b?.src] : []))
      .filter((x) => isStr(x) && x.startsWith('story-'));
    const photo = named[0] ?? story[0];
    if (photo) return {cover: {title, kind: 'polaroid', polaroid: {photo, ...(typeof cv.zoom === 'number' && cv.zoom >= 1 ? {zoom: cv.zoom} : {})}}, how: 'mapped'};
  }
  return null;
};

/** A spoken line made safe for the cover: no bleep, no street word, as short as fits three lines at READ size. */
export const quoteFrom = (say, street) => {
  const chunks = String(say ?? '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => !/#@%|\{bleep/.test(c) && !(street && street(c)));
  const out = [];
  for (const c of chunks) {
    const t = [...out, c].join(' ').replace(/[„“”"]/g, '');
    if (!fitLines(`„${t}“`, 860, 3, 140, {weight: 700, min: 96}).fits) break;
    out.push(c);
  }
  if (!out.length && chunks.length) {
    // one chunk too long for three lines: its first words
    const words = chunks[0].split(/\s+/);
    while (words.length > 1 && !fitLines(`„${words.join(' ')}“`, 860, 3, 140, {weight: 700, min: 96}).fits) words.pop();
    out.push(words.join(' '));
  }
  return out.join(' ').replace(/[„“”"]/g, '').trim();
};

/** The net's covers, from the film's own data, in order. */
export const netCandidates = (spec, {street} = {}) => {
  const title = titleOf(spec);
  const out = [];
  const scenes = scenesOf(spec);
  // 1. the film's FilmTitleCard (phase 2: the film's one signature infographic)
  for (const p of scenes.filter((s) => s.type === 'FilmTitleCard')) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    if (p.kind === 'stat' && p.value !== undefined) out.push({how: 'net:titlecard', cover: {title, kind: 'stat', stat: {value: String(p.value), ...(p.unit ? {unit: String(p.unit)} : {}), label: String(p.label ?? p.title ?? ''), ...(p.source ? {source: String(p.source)} : {}), mark: 'circle'}}});
    if (p.kind === 'grid' && p.value !== undefined) out.push({how: 'net:titlecard', cover: {title, kind: 'stat', stat: {value: String(p.value), unit: '%', label: String(p.label ?? p.title ?? ''), ...(p.source ? {source: String(p.source)} : {}), mark: 'circle'}}});
    if (p.kind === 'receipt' && p.total) out.push({how: 'net:titlecard', cover: {title, kind: 'stat', stat: {value: String(p.total.value), label: String(p.total.label ?? p.title ?? ''), mark: 'circle'}}});
    if (p.kind === 'versus' && rows.length >= 2) {
      const hl = rows.findIndex((r) => r.hl);
      out.push({how: 'net:titlecard', cover: {title, kind: 'versus', versus: {a: {label: String(rows[0].label), value: String(rows[0].value)}, b: {label: String(rows[1].label), value: String(rows[1].value)}, win: hl === 0 ? 'a' : 'b'}}});
    }
    if (p.kind === 'bars' && rows.length >= 2) {
      const vals = rows.slice(0, 3).map((r) => Number(r.value) || 0);
      const max = Math.max(...vals, 1e-9);
      out.push({how: 'net:titlecard', cover: {title, kind: 'bars', bars: {rows: rows.slice(0, 3).map((r, i) => ({label: String(r.label), value: vals[i] / max, shown: String(r.value), ...(r.hl ? {mark: 'circle'} : {})}))}}});
    }
  }
  // 2. a BigNumber with a label (a bare year with no label says nothing on its own)
  for (const p of scenes.filter((s) => s.type === 'BigNumber' && isStr(s.label))) {
    const v = p.format === 'int' ? group(p.value) : String(p.value);
    out.push({how: 'net:bignumber', cover: {title, kind: 'stat', stat: {value: v, ...(isStr(p.unit) && p.unit.length <= 5 ? {unit: p.unit} : {}), label: p.label, ...(isStr(p.source) ? {source: p.source} : {}), mark: 'circle'}}});
  }
  // 3. a Ledger of 2 or 3 entries
  for (const p of scenes.filter((s) => s.type === 'Ledger' && Array.isArray(s.entries) && s.entries.length >= 2 && s.entries.length <= 3)) {
    out.push({how: 'net:ledger', cover: {title, kind: 'timeline', timeline: {stops: p.entries.map((e) => ({value: String(e.year ?? e.value ?? ''), label: String(e.text ?? e.label ?? '')}))}}});
  }
  // 4. the opening line as a quote, no speaker
  const text = quoteFrom(spec?.beats?.[0]?.say, street);
  if (text) out.push({how: 'net:opening', cover: {title, kind: 'quote', quote: {text, speaker: {kind: 'none'}}}});
  return out;
};

/** the problems that send a cover to the net: everything but the headline's (the net keeps the same headline) */
const blocking = (problems) => problems.filter((p) => !p.startsWith('COVER_TITLE_FIT'));

export const resolveCover = (spec, ctx = {}) => {
  const tried = [];
  if (!ctx.forceNet) {
    const m = mapOld(spec);
    if (m) {
      const layout = coverLayout(m.cover, ctx);
      if (!blocking(layout.problems).length) return {cover: m.cover, how: m.how, layout, tried};
      tried.push({how: m.how, kind: m.cover.kind, problems: layout.problems});
    }
  }
  let last = null;
  for (const c of netCandidates(spec, ctx)) {
    const layout = coverLayout(c.cover, ctx);
    last = {cover: c.cover, how: c.how, layout, tried};
    if (!blocking(layout.problems).length) return last;
    tried.push({how: c.how, kind: c.cover.kind, problems: layout.problems});
  }
  // nothing clean: the last candidate (the opening line), with its problems (covers.mjs then marks the cover failed)
  return last ?? {cover: {title: titleOf(spec), kind: 'quote', quote: {text: titleOf(spec).replace(/\|/g, ' '), speaker: {kind: 'none'}}}, how: 'net:title', layout: coverLayout({title: titleOf(spec), kind: 'quote', quote: {text: titleOf(spec).replace(/\|/g, ' ')}}, ctx), tried};
};
