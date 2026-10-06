// The motion plan of a film (2026-10-06, the owner: "the graphics are the same trails, not animated, motion is missing,
// camera movement; the openings and endings more creative and powerful"). Pure ESM, no React: it reads the spec, the
// voice timeline (or an estimate) and the film's own scene files AS TEXT, and fixes everything that moves BEFORE the
// render, deterministically (seeded by the id), so the cloud, the Mac and every Chrome tab agree:
//   - whether the film has the motion layer at all (`on`: spec "fx", env VS_FX=0, else ci/fx.json from/categories)
//   - its opening (the first 1.5 s) and its ending (the last seconds), checked against scene 0 and the end card
//   - every cut's transition (src/lib/fx.ts), its overlap, its sound, under the variety rules and the budgets
//   - every shot's camera (src/lib/camera.tsx): its class, its move, its settle, the spec's own kicks
//   - the lens glitches, the flashes, the whips' blur, and tools/flicker.py's allowlist windows
//   - the photo credits the film shows (public/photos/photos.json "credit")
// tools/build-index.mjs embeds the plan in src/generated/videos.ts (Promo reads it) and writes out/<id>.fx.json; check.mjs
// prints it; visual.mjs keeps the openings, endings and first transitions of a category apart.
//   node tools/ci/fx.mjs <id>   prints a film's plan (with its timeline, else an estimate)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const FPS = 30;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- the knobs (src/tokens.ts MOTION keeps the same numbers) ---------------------------------------------------------
export const MOTION = {kickGap: 20, flashMax: 3, flashGap: 60, heavyMax: 60, tailMax: 8, overlapShare: 0.12, glitchMax: 2, crashMax: 1};
const LEAD = -45; // a classic scene 0's lead (scenes/common.tsx lead)
const CUT_IN = 10;

/** ci/fx.json: {"from": <first film number>, "categories": "all" | [ids], "stories": [ids]}. */
export const loadFxConfig = (dir = root) => {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(dir, 'ci', 'fx.json'), 'utf8'));
    return {from: Number.isFinite(c.from) ? c.from : Infinity, categories: c.categories ?? 'all', stories: Array.isArray(c.stories) ? c.stories : []};
  } catch {
    return {from: Infinity, categories: 'all', stories: []};
  }
};

export const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id))?.[1] ?? 0);
/** FNV-1a: a stable 32-bit hash of the id. */
const hash = (s) => {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};
/** mulberry32: a well-mixed seeded random in [0, 1) (neighbouring seeds give unrelated numbers). */
const mulberry = (a) => {
  let t = (a + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** The render's own seeded random (src/lib/anim.ts rand). */
const rand = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Is the motion layer on for this spec? */
export const fxOn = (spec, cfg, env = process.env) => {
  if (env.VS_FX === '0') return false;
  if (env.VS_FX === '1') return true; // a rehearsal: every film with the motion layer
  if (spec?.fx === true) return true;
  if (spec?.fx === false) return false;
  if (String(spec?.id ?? '').startsWith('demo-')) return false;
  const n = vNumber(spec?.id);
  if (!n || n < cfg.from) return false;
  return cfg.categories === 'all' || (Array.isArray(cfg.categories) && cfg.categories.includes(spec.category));
};

// ---- the shots (src/Promo.tsx planScenes: the same rule) ------------------------------------------------------------------
export const planShots = (spec, timeline) => {
  const plans = [];
  spec.beats.forEach((b, i) => {
    const from = Math.round(timeline.beats[i].start * FPS);
    if (b.scene || i === 0) plans.push({spec: b.scene ?? {type: 'Title', lines: []}, from, to: 0, beats: [i], c0: 0, cEnd: null});
    else plans[plans.length - 1].beats.push(i);
    const chunks = timeline.beats[i].chunks;
    const cuts = (Array.isArray(b.cuts) ? b.cuts : []).filter((c) => c && c.scene && typeof c.scene.type === 'string' && Number.isInteger(c.chunk) && c.chunk >= 1 && c.chunk < chunks.length).sort((x, y) => x.chunk - y.chunk);
    let last = 0;
    for (const c of cuts) {
      if (c.chunk <= last) continue;
      plans[plans.length - 1].cEnd = c.chunk;
      plans.push({spec: c.scene, from: Math.round(chunks[c.chunk].start * FPS), to: 0, beats: [i], c0: c.chunk, cEnd: null});
      last = c.chunk;
    }
  });
  const total = Math.ceil(timeline.duration * FPS);
  plans.forEach((p, k) => (p.to = k + 1 < plans.length ? plans[k + 1].from : total));
  return plans;
};
const cuesOf = (plan, timeline) =>
  plan.beats.flatMap((bi, j) => {
    const ch = timeline.beats[bi].chunks;
    const lo = j === 0 ? plan.c0 : 0;
    const hi = j === plan.beats.length - 1 && plan.cEnd !== null ? plan.cEnd : ch.length;
    return ch.slice(lo, hi).map((c) => Math.round(c.start * FPS) - plan.from);
  });

/** A rough voice timeline from the letters (about 11.5 a second), for a film whose voice is not here (an earlier film in
 *  the cloud, a demo): good enough for the variety rules, never for a render of a voiced film. */
export const estimateTimeline = (spec) => {
  const lead = Number.isFinite(spec.leadIn) ? spec.leadIn : 0.1;
  const gap = Number.isFinite(spec.gap) ? spec.gap : 0.22;
  const sg = Number.isFinite(spec.sentenceGap) ? spec.sentenceGap : 0.3;
  let t = 0;
  const beats = spec.beats.map((b, i) => {
    const start = t;
    let c = start + (i === 0 ? lead : 0) + 0.1;
    const speechStart = c;
    const parts = String(b.say ?? '').split('|');
    const shown = String(b.show ?? b.say ?? '').split('|');
    const chunks = parts.map((s, k) => {
      const letters = (s.match(/\p{L}|\p{N}/gu) ?? []).length;
      const d = Math.max(0.45, letters / 11.5);
      const ch = {text: (shown[k] ?? s).trim(), start: +c.toFixed(3), end: +(c + d).toFixed(3)};
      c += d + (/[.?!:]\s*$/.test(s) ? sg : 0.08);
      return ch;
    });
    const speechEnd = chunks[chunks.length - 1].end;
    const end = speechEnd + gap + 0.25 + (Number.isFinite(b.hold) ? b.hold : 0) + (i === spec.beats.length - 1 ? (Number.isFinite(spec.tail) ? spec.tail : 0.35) : 0);
    t = end;
    return {i, start: +start.toFixed(3), end: +end.toFixed(3), speechStart: +speechStart.toFixed(3), speechEnd: +speechEnd.toFixed(3), chunks};
  });
  return {id: spec.id, voice: 'estimate', duration: +t.toFixed(3), beats};
};

// ---- scene facts ----------------------------------------------------------------------------------------------------------
const BAND = new Set(['Film', 'PhotoStory', 'Split', 'Timeline', 'Twist', 'Callback']);
const FREE = new Set(['Title', 'Stat', 'List', 'Compare', 'Grid', 'Squares', 'SplitFlap', 'KineticHeadline', 'BigNumber']);
export const sceneClass = (type) => (BAND.has(type) ? 'band' : FREE.has(type) ? 'free' : 'self');
const PHOTO_TYPES = new Set(['PhotoStory', 'Split', 'Timeline', 'Twist']);
/** A Film scene that pushes its own camera over the whole scene (the old template's lerp(1, 1.0x)): the rig leaves it. */
export const ownPush = (code) => /lerp\(\s*1\s*,\s*1\.0\d+/.test(code ?? '');
const webglOf = (sc, filmCode) => sc.type === 'Wire3D' || (sc.type === 'Film' && /from\s+['"]\.\.\/Wire3D['"]/.test(filmCode(sc.name) ?? ''));

const leadOf = (k, open) => (k === 0 ? (open?.lead ?? LEAD) : 0);
const entranceOf = (k, open) => (k === 0 ? leadOf(0, open) : -CUT_IN);
const cueFrame = (cues, k, open, at, fallback = 0) => {
  if (typeof at === 'number') {
    const f = cues[Math.min(Math.max(0, at), cues.length - 1)] ?? fallback;
    return k === 0 && at === 0 ? Math.min(f, leadOf(0, open)) : f;
  }
  if (typeof at === 'string' && at.endsWith('s')) return Math.round(parseFloat(at) * 30);
  return fallback;
};

// ---- openings and endings -------------------------------------------------------------------------------------------------
const lineTexts = (lines) => (Array.isArray(lines) ? lines.map((l) => (typeof l === 'string' ? l : l?.text ?? '')).filter(Boolean) : []);
export const OPENINGS = {
  'cold-punch': {lead: -12, fits: (sc) => (sc.type === 'KineticHeadline' && ['mask', 'slam', undefined].includes(sc.staging)) || (sc.type === 'PhotoStory' && lineTexts(sc.lines).length > 0), settle: {ds: 0.1, frames: 20}},
  rewind: {lead: -4, fits: (sc) => sc.type === 'BigNumber' && sc.staging === 'rewind', camera: {move: 'push', amount: 0.01}},
  'photo-slam': {lead: -10, fits: (sc) => sc.type === 'PhotoStory' && ['bleed', 'print', undefined].includes(sc.staging), settle: {ds: 0.08, frames: 10}},
  'mark-subject': {lead: -45, fits: (sc) => sc.type === 'PhotoStory' && ['bleed', 'depth', undefined].includes(sc.staging) && sc.ring && typeof sc.ring === 'object', camera: {move: 'push', amount: 0.04}},
  'question-slam': {lead: -8, fits: (sc) => sc.type === 'KineticHeadline' && sc.staging === 'slam' && /\?\s*\**\s*$/.test(lineTexts(sc.lines).slice(-1)[0] ?? ''), settle: {ds: 0.06, frames: 16}},
  classic: {lead: LEAD, fits: () => true},
};
export const ENDINGS = ['card', 'stamp', 'loop', 'callback'];
const LOOP_OPENINGS = new Set(['cold-punch', 'photo-slam', 'rewind']);

/** The transition table (src/lib/fx.ts draws them): overlap frames and the sounds that replace the cut's air. */
const T = {
  cut: {pre: 0, post: 0, sfx: (c) => [{name: 'asmr-air', at: c - 3, volume: 0.16}]},
  glitch: {pre: 0, post: 0, sfx: (c) => [{name: 'asmr-air', at: c - 3, volume: 0.16}]},
  whip: {pre: 4, post: 4, sfx: (c) => [{name: 'asmr-air-long', at: c - 4, volume: 0.3, len: 14}]},
  push: {pre: 3, post: 5, sfx: (c) => [{name: 'asmr-whoomp', at: c - 3, volume: 0.35}]},
  match: {pre: 3, post: 5, sfx: (c) => [{name: 'asmr-whoomp', at: c - 3, volume: 0.35}]},
  pull: {pre: 3, post: 5, sfx: (c) => [{name: 'asmr-air-long', at: c - 3, volume: 0.26, len: 12}]},
  stack: {pre: 0, post: 9, sfx: (c) => [{name: 'cc0-card-slide', at: c, volume: 0.4}]},
  wipe: {pre: 0, post: 8, sfx: (c) => [{name: 'asmr-slide', at: c, volume: 0.35}]},
  flash: {pre: 0, post: 0, sfx: (c) => [{name: 'asmr-swell', at: c - 8, volume: 0.3}]},
  crash: {pre: 0, post: 6, sfx: (c) => [{name: 'asmr-whoomp', at: c - 1, volume: 0.45}, {name: 'asmr-land', at: c + 4, volume: 0.5}, {name: 'asmr-haptic-medium', at: c + 4, volume: 0.46}, {name: 'asmr-haptic-rigid', at: c, volume: 0.38}]},
  dip: {pre: 4, post: 4, sfx: () => []},
  stamp: {pre: 0, post: 0, sfx: () => []},
};
export const TRANSITIONS = Object.keys(T);
const FLASH = [0.3, 0.8, 0.65, 0.3, 0.1];
const CRASH_FLASH = [0.85, 0.5, 0.22, 0.08];
const HOOK = {whip: 3, push: 2, match: 2, flash: 1};
const MIDDLE = {cut: 2, wipe: 1, stack: 1, pull: 1, glitch: 1, whip: 1};

const focusOf = (sc) => {
  // a stage point a match cut can pivot on: a photo's centre (band 20..1060 x 370..1380), a Film's own `focus`
  const c = sc?.center && typeof sc.center === 'object' ? sc.center : null;
  if (c && Number.isFinite(c.x) && Number.isFinite(c.y) && ['Photo', 'PhotoStory'].includes(sc.type)) return {x: Math.round(20 + c.x * 1040), y: Math.round(370 + c.y * 1010)};
  const f = sc?.focus;
  if (sc?.type === 'Film' && f && typeof f === 'object' && !Array.isArray(f) && Number.isFinite(f.x) && Number.isFinite(f.y)) return {x: f.x, y: f.y};
  return null;
};

/** The photos a film shows (story scenes and backgrounds), for the credits. */
export const photosOf = (spec) => {
  const out = [];
  const walk = (sc) => {
    if (!sc || typeof sc !== 'object') return;
    const add = (s) => typeof s === 'string' && s && out.push(s);
    if (sc.type === 'PhotoStory') {
      add(sc.src);
      for (const m of sc.more ?? []) add(m?.src);
    }
    if (sc.type === 'Split') {
      add(sc.a?.src);
      add(sc.b?.src);
    }
    if (sc.type === 'Timeline') for (const e of sc.events ?? []) add(e?.src);
    if (sc.type === 'Twist') {
      add(sc.src);
      add(sc.setup?.src);
    }
    if ((sc.type === 'KineticHeadline' || sc.type === 'BigNumber') && sc.bg) add(sc.bg.src);
  };
  for (const b of spec.beats ?? []) {
    walk(b.scene);
    for (const c of b.cuts ?? []) walk(c?.scene);
  }
  return [...new Set(out)];
};
export const loadPhotos = (dir = root) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'public', 'photos', 'photos.json'), 'utf8'));
  } catch {
    return {};
  }
};
/** A licence that asks for attribution (CC BY, CC BY-SA): its credit must be shown and posted. */
export const needsCredit = (license) => /\bCC[\s-]*BY\b/i.test(String(license ?? ''));

/** The plan. `prev`: the category's previous fx film's {opening, ending, first} (its first two transitions); `recentOpenings`:
 *  the openings of its last 2; `follow`: the film ends on the follow reminder (ci/endings.json); `filmCode(name)`: a Film
 *  scene's source text or null; `env`: process.env (VS_FX). */
export const planFx = ({spec, timeline, cfg = loadFxConfig(), category = spec.category, filmCode = () => null, prev = null, recentOpenings = [], follow = false, photos = loadPhotos(), env = process.env}) => {
  const id = String(spec.id);
  const seed = hash(id);
  const R = (k) => mulberry((seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0);
  const shots = planShots(spec, timeline);
  const total = Math.ceil(timeline.duration * FPS);
  const scenes = shots.map((p) => ({from: p.from, to: p.to}));
  const notes = [];
  const credits = [...new Set(photosOf(spec).map((s) => photos[String(s).replace(/^photos\//, '').replace(/\.jpe?g$/i, '')]?.credit).filter((c) => typeof c === 'string' && c.trim()))];
  const off = {v: 1, seed: id, on: false, opening: 'classic', ending: 'card', scenes, cuts: shots.map(() => null), cameras: shots.map((p) => ({cls: 'legacy', kicks: []})), glitches: [], flashes: [], whips: [], windows: [], heavy: 0, overlap: 0, credits, notes};
  if (!fxOn(spec, cfg, env)) return off;
  const stories = cfg.stories.includes(category);
  const sc0 = shots[0].spec;
  const n = shots.length;
  const last = shots[n - 1];
  const hasEnd = last.spec.type === 'EndCard' && n > 1;
  const webgl = shots.map((p) => webglOf(p.spec, filmCode));

  // ---- the opening ----
  let opening = typeof spec.opening === 'string' ? spec.opening : null;
  if (opening && (!OPENINGS[opening] || !OPENINGS[opening].fits(sc0))) {
    notes.push(`opening "${opening}" does not fit scene 0 (${sc0.type}${sc0.staging ? `:${sc0.staging}` : ''}): classic`);
    opening = 'classic';
  }
  if (!opening) {
    const fits = Object.keys(OPENINGS).filter((o) => o !== 'classic' && OPENINGS[o].fits(sc0));
    const fresh = fits.filter((o) => !recentOpenings.includes(o));
    const pool = fresh.length ? fresh : fits;
    opening = pool.length ? pool[Math.floor(R(1) * pool.length)] : 'classic';
  }
  const open = {id: opening, lead: OPENINGS[opening].lead};

  // ---- the ending ----
  const prevBeforeEnd = hasEnd ? n - 2 : -1;
  const stampable = hasEnd && prevBeforeEnd >= 0 && !webgl[prevBeforeEnd];
  const loopable = stampable && !webgl[0] && LOOP_OPENINGS.has(opening) && !follow;
  const hasCallback = shots.some((p) => p.spec.type === 'Callback');
  const okEnding = (e) => (e === 'card' ? hasEnd : e === 'stamp' ? stampable : e === 'loop' ? loopable : e === 'callback' ? hasCallback && stampable : false);
  let ending = typeof spec.ending === 'string' ? spec.ending : null;
  if (ending && !okEnding(ending)) {
    notes.push(`ending "${ending}" is not possible here (${!hasEnd ? 'no end card' : ending === 'loop' ? 'loop needs a cold-punch, photo-slam or rewind opening, no 3D hook, and no follow reminder' : 'the shot before the card is 3D'}): ${stampable && stories ? 'stamp' : 'card'}`);
    ending = null;
  }
  if (!ending) {
    if (!hasEnd) ending = 'none';
    else if (hasCallback && stampable) ending = 'callback';
    else if (stories) {
      const pool = [['stamp', 3], ['loop', 2], ['card', 1]].filter(([e]) => okEnding(e) && e !== prev?.ending);
      const sum = pool.reduce((s, [, w]) => s + w, 0);
      let r = R(2) * sum;
      ending = pool.length ? pool.find(([, w]) => (r -= w) < 0)?.[0] ?? pool[0][0] : 'card';
    } else ending = 'card';
  }
  const endMode = ending === 'stamp' || ending === 'loop' || ending === 'callback';

  // ---- the transitions ----
  const cuts = shots.map(() => null);
  const glitches = [];
  const flashes = [];
  const whips = [];
  const typeOf = (k) => cuts[k]?.type ?? null;
  let nGlitch = 0;
  let nCrash = 0;
  const flashOk = (at) => flashes.length < MOTION.flashMax && flashes.every((f) => Math.abs(f.at - at) >= MOTION.flashGap);
  // a Twist that brings its own hit (a setup): its flash and glitch are planned first, they count toward the caps
  const twists = [];
  shots.forEach((p, k) => {
    if (p.spec.type !== 'Twist') return;
    const cues = cuesOf(p, timeline);
    const e = entranceOf(k, open);
    const st = p.spec.staging ?? 'crash';
    let Tf;
    if (!p.spec.setup) Tf = Math.max(2, e + 4);
    else if (p.spec.at !== undefined) Tf = Math.max(e + 16, cueFrame(cues, k, open, p.spec.at));
    else Tf = Math.max(e + 16, cues.length > 1 ? cueFrame(cues, k, open, 1) : 15);
    twists.push({k, at: p.from + Tf, st, setup: Boolean(p.spec.setup)});
  });
  for (const tw of twists) {
    if (!tw.setup) continue; // the crash cut INTO the scene is the hit (below)
    if (tw.st === 'crash' && nCrash < MOTION.crashMax) {
      nCrash++;
      if (flashOk(tw.at)) flashes.push({at: tw.at, curve: CRASH_FLASH});
      glitches.push({at: tw.at, len: 4, k: 1.6});
    } else if (tw.st === 'glitch') glitches.push({at: tw.at, len: 5, k: 2});
    else if (tw.st === 'whip') whips.push({at: tw.at - 4, len: 8});
  }
  const durOf = (k) => shots[k].to - shots[k].from;
  let overlap = 0;
  let heavy = 0;
  for (let k = 1; k < n; k++) {
    const sc = shots[k].spec;
    const at = shots[k].from;
    const zoneHook = at < 6 * FPS;
    const prevType = typeOf(k - 1);
    const want = sc.transition;
    let type = null;
    let dir = undefined;
    const allowed = (t) => {
      if (!T[t] || t === 'stamp') return false;
      if (t === prevType) return false;
      if (sc.type === 'Phone' && !['cut', 'glitch', 'flash'].includes(t)) return false;
      if (sc.type === 'EndCard' && !['cut', 'dip'].includes(t)) return false;
      if (t === 'glitch' && nGlitch >= MOTION.glitchMax) return false;
      if (t === 'flash' && !flashOk(at - 2)) return false;
      if (t === 'crash' && (nCrash >= MOTION.crashMax || !(sc.type === 'Twist' || spec.beats[shots[k].beats[0]]?.twist) || !flashOk(at))) return false;
      if (t === 'match' && !(focusOf(shots[k - 1].spec) && focusOf(sc))) return false;
      if (t === 'whip' && heavy + 8 > MOTION.heavyMax) return false;
      const tr = T[t];
      const pre = webgl[k] ? 0 : tr.pre;
      if (overlap + pre + tr.post > MOTION.overlapShare * total) return false;
      // the windows of one shot never overlap: its incoming post and its outgoing pre fit in its length
      if (pre > Math.floor(durOf(k - 1) / 3) || tr.post > Math.floor(durOf(k) / 3)) return false;
      if (pre + (cuts[k - 1]?.post ?? 0) > durOf(k - 1)) return false;
      return true;
    };
    if (sc.type === 'EndCard' && endMode) type = 'stamp';
    else if (want && want !== 'auto') {
      const t = typeof want === 'object' ? want.type : want;
      if (allowed(t)) {
        type = t;
        if (typeof want === 'object' && (want.dir === 1 || want.dir === -1)) dir = want.dir;
      } else notes.push(`beat cut ${k}: transition "${t}" refused here (variety rules or budgets): the planner picks`);
    }
    if (!type && ((sc.type === 'Twist' && !sc.setup) || spec.beats[shots[k].beats[0]]?.twist) && allowed('crash')) type = 'crash';
    // into the end card: a dip, or a clean cut (no glitch on the end card's cut, as always)
    if (!type && sc.type === 'EndCard') type = allowed('dip') && (prevType === 'cut' || R(40 + k) < 0.5) ? 'dip' : 'cut';
    if (!type) {
      const table = zoneHook ? HOOK : MIDDLE;
      // the category's previous film's first two transitions are not repeated as a pair
      const banned = k === 2 && prev?.first?.length === 2 && cuts[1]?.type === prev.first[0] ? prev.first[1] : null;
      const recent = cuts.slice(Math.max(1, k - 3), k).map((c) => c?.type);
      for (let tries = 0; tries < 8 && !type; tries++) {
        // the first tries also keep away from the last three cuts' types (the hard rule is only the one before)
        const pool = Object.entries(table).filter(([t]) => t !== banned && (tries >= 4 || !recent.includes(t)));
        if (!pool.length) continue;
        const sum = pool.reduce((s, [, w]) => s + w, 0);
        let r = R(100 + k * 13 + tries * 7) * sum;
        const pick = pool.find(([, w]) => (r -= w) < 0)?.[0] ?? pool[0][0];
        if (allowed(pick)) type = pick;
      }
      if (!type) type = allowed('cut') ? 'cut' : prevType === 'cut' && allowed('glitch') ? 'glitch' : 'cut';
    }
    const tr = T[type];
    let pre = webgl[k] ? 0 : tr.pre;
    const post = tr.post;
    if (type === 'whip') {
      const lastWhip = cuts.slice(0, k).reverse().find((c) => c?.type === 'whip');
      dir = dir ?? (lastWhip ? -lastWhip.dir : R(60 + k) < 0.5 ? 1 : -1);
      heavy += pre + post;
      whips.push({at: at - pre, len: pre + post});
    }
    if (type === 'flash') flashes.push({at: at - 2, curve: FLASH});
    if (type === 'glitch') {
      nGlitch++;
      glitches.push({at: at - 1, len: 3 + Math.floor(rand(at * 2.11 + 0.7) * 3), k: 1});
    }
    if (type === 'crash') {
      nCrash++;
      flashes.push({at, curve: CRASH_FLASH});
      glitches.push({at, len: 4, k: 1.6});
    }
    if (type === 'stamp') pre = 0;
    overlap += pre + post;
    const into = sc.type === 'Phone';
    const sfx = spec.cutSfx === null || into ? [] : tr.sfx(at).filter((c) => c.at >= 0);
    const cut = {at, type, pre, post, order: type === 'push' || type === 'match' ? 'out-over' : 'in-over', sfx};
    if (dir) cut.dir = dir;
    if (type === 'match') {
      cut.from = focusOf(shots[k - 1].spec);
      cut.to = focusOf(sc);
    }
    cuts[k] = cut;
  }
  // at least one plain cut in a film of four cuts or more (pace needs a hard cut too)
  const real = cuts.map((c, k) => (c && !['stamp', 'crash'].includes(c.type) && !shots[k].spec.transition ? k : -1)).filter((k) => k > 0);
  if (real.length >= 4 && !cuts.some((c) => c?.type === 'cut')) {
    const k = real.find((j) => cuts[j - 1]?.type !== 'cut' && cuts[j + 1]?.type !== 'cut' && shots[j].from >= 6 * FPS && shots[j].spec.type !== 'EndCard') ?? null;
    if (k !== null) {
      const c = cuts[k];
      overlap -= c.pre + c.post;
      if (c.type === 'whip') {
        heavy -= c.pre + c.post;
        const wi = whips.findIndex((w) => w.at === c.at - c.pre);
        if (wi >= 0) whips.splice(wi, 1);
      }
      if (c.type === 'flash') flashes.splice(flashes.findIndex((f) => f.at === c.at - 2), 1);
      if (c.type === 'glitch') {
        glitches.splice(glitches.findIndex((g) => g.at === c.at - 1), 1);
        nGlitch--;
      }
      cuts[k] = {at: c.at, type: 'cut', pre: 0, post: 0, order: 'in-over', sfx: shots[k].spec.type === 'Phone' || spec.cutSfx === null ? [] : T.cut.sfx(c.at)};
    }
  }

  // ---- a BigNumber rewind's tape glitch at its midpoint ----
  shots.forEach((p, k) => {
    if (p.spec.type !== 'BigNumber' || p.spec.staging !== 'rewind') return;
    const cues = cuesOf(p, timeline);
    const e = entranceOf(k, open);
    const a = p.spec.at !== undefined ? Math.max(e + 2, cueFrame(cues, k, open, p.spec.at)) : e + 4;
    const land = Math.max(a + 12, p.spec.landAt !== undefined ? cueFrame(cues, k, open, p.spec.landAt) : a + 30);
    if (nGlitch < MOTION.glitchMax + 1) glitches.push({at: p.from + Math.round((a + land) / 2), len: 3, k: 1.2});
  });
  // nothing in the first 8 frames (the cover, the loop point) nor on the end card
  const quiet = hasEnd ? last.from : total;
  const gl = glitches.filter((g) => g.at >= 8 && g.at < quiet).sort((a, b) => a.at - b.at);
  const fl = flashes.filter((f) => f.at >= 2 && f.at < quiet).sort((a, b) => a.at - b.at);

  // ---- the cameras ----
  const POOL = {band: ['push', 'pull', 'drift-l', 'drift-r', 'rise', 'arc-l', 'arc-r'], free: ['push', 'drift-l', 'drift-r', 'still']};
  const dirOf = (m) => (/-l$/.test(m ?? '') ? -1 : /-r$/.test(m ?? '') ? 1 : 0);
  const cameras = [];
  let prevMove = null;
  shots.forEach((p, k) => {
    const sc = p.spec;
    let cls = sceneClass(sc.type);
    if (sc.type === 'Film') {
      const legacyFilm = (vNumber(id) && vNumber(id) < cfg.from && spec.fx !== true) || ownPush(filmCode(sc.name));
      if (legacyFilm) cls = 'legacy';
    }
    const own = sc.camera && typeof sc.camera === 'object' ? sc.camera : {};
    const cam = {cls, kicks: []};
    if (cls === 'band' || cls === 'free') {
      let move = typeof own.move === 'string' ? own.move : null;
      if (!move) {
        // the hook never stands still (the opening's camera is already moving on frame 0)
        const pool = POOL[cls].filter((m) => m !== prevMove && !(dirOf(m) && dirOf(m) === dirOf(prevMove)) && !(k === 0 && m === 'still'));
        move = pool[Math.floor(R(200 + k) * pool.length)] ?? 'push';
      }
      if (k === 0 && OPENINGS[opening].camera) Object.assign(cam, OPENINGS[opening].camera);
      else cam.move = move;
      for (const key of ['amount', 'travel', 'roll', 'shake', 'origin']) if (own[key] !== undefined) cam[key] = own[key];
      if (stories && sc.type === 'PhotoStory' && cam.shake === undefined) cam.shake = 0.3;
      if (cls === 'free') delete cam.shake;
      // the velocity carried in: an opening's settle on shot 0, a whip's or a push's after a cut
      const c = cuts[k];
      if (k === 0 && OPENINGS[opening].settle) cam.settle = {...OPENINGS[opening].settle, ds: cls === 'free' ? Math.min(0.06, OPENINGS[opening].settle.ds) : OPENINGS[opening].settle.ds};
      else if (c?.type === 'whip') cam.settle = {dx: (c.dir ?? 1) * 36, dy: 0, ds: 0, frames: 10};
      else if (c?.type === 'push' || c?.type === 'match') cam.settle = {dx: 0, dy: 0, ds: 0.04, frames: 12};
      const cues = cuesOf(p, timeline);
      cam.kicks = (Array.isArray(own.kicks) ? own.kicks : []).map((a) => cueFrame(cues, k, open, a, -1)).filter((f) => f >= 0);
      prevMove = cam.move ?? prevMove;
    }
    cameras.push(cam);
  });

  const windows = [...fl.map((f) => [f.at - 2, f.at + f.curve.length + 2]), ...gl.map((g) => [g.at - 2, g.at + g.len + 2])].sort((a, b) => a[0] - b[0]);
  return {v: 1, seed: id, on: true, opening, ending, openLead: open.lead, scenes, cuts, cameras, glitches: gl, flashes: fl, whips, windows, heavy, overlap, credits, notes};
};

/** A planner over a set of specs (build-index, check.mjs): planOf(spec) plans a film after planning its category's
 *  earlier fx films (memoised), so the openings, the ending and the first transitions it must avoid are the ones
 *  those films really got. `specs`: [[file, spec]]; `timelineOf(spec)`: its voice timeline or null (an estimate is used);
 *  `followOf(spec)`: it ends on the follow reminder. */
export const makePlanner = ({specs, cfg = loadFxConfig(), photos = loadPhotos(), filmCode = () => null, timelineOf = () => null, followOf = () => false, env = process.env}) => {
  const memo = new Map();
  const family = (id) => String(id).replace(/-r\d+$/, '');
  const isBase = (f) => !f.startsWith('demo-') && !/--h\d+\.json$/.test(f) && !/\.(en|ru)\.json$/.test(f);
  const earlierOf = (spec) => {
    const n = vNumber(spec.id);
    if (!n || !spec.category) return [];
    const fams = new Map();
    for (const [f, s] of specs)
      if (s && isBase(f) && (s.lang ?? 'ka') === 'ka' && s.category === spec.category && vNumber(s.id) && vNumber(s.id) < n && Array.isArray(s.beats) && fxOn(s, cfg, env)) fams.set(family(s.id), s);
    return [...fams.values()].sort((a, b) => vNumber(a.id) - vNumber(b.id));
  };
  const planOf = (spec, timeline) => {
    if (memo.has(spec.id) && !timeline) return memo.get(spec.id);
    memo.set(spec.id, null); // no loops
    const earlier = earlierOf(spec).slice(-2).map((s) => planOf(s)).filter(Boolean);
    const p = earlier[earlier.length - 1];
    const plan = planFx({
      spec,
      timeline: timeline ?? timelineOf(spec) ?? estimateTimeline(spec),
      cfg,
      filmCode,
      photos,
      env,
      follow: followOf(spec),
      prev: p ? {opening: p.opening, ending: p.ending, first: p.cuts.filter(Boolean).slice(0, 2).map((c) => c.type)} : null,
      recentOpenings: earlier.map((x) => x.opening),
    });
    memo.set(spec.id, plan);
    return plan;
  };
  /** The category's earlier fx films' plans, oldest first (the last `n`). */
  const earlierPlans = (spec, n = 3) => earlierOf(spec).slice(-n).map((s) => ({id: s.id, plan: planOf(s)})).filter((x) => x.plan);
  return {planOf, earlierPlans, earlierOf};
};

/** The plan's motion signature (tools/ci/visual.mjs keeps a category's films apart by it). */
export const motionOf = (plan) =>
  plan?.on
    ? {opening: plan.opening, ending: plan.ending, transitions: plan.cuts.filter(Boolean).map((c) => c.type), cameras: plan.cameras.map((c) => c.move ?? c.cls)}
    : null;

/** The budget lint: FX_BUDGET lines (the planner already clamps; this catches a hand-made plan or a bug). */
export const budgetProblems = (plan, total) => {
  if (!plan?.on) return [];
  const out = [];
  if (plan.heavy > MOTION.heavyMax) out.push(`FX_BUDGET ${plan.heavy} frames of whip blur (at most ${MOTION.heavyMax})`);
  if (plan.overlap > MOTION.overlapShare * total) out.push(`FX_BUDGET ${plan.overlap} overlap frames (at most ${Math.round(MOTION.overlapShare * 100)} % of ${total})`);
  if (plan.flashes.length > MOTION.flashMax) out.push(`FX_BUDGET ${plan.flashes.length} flashes (at most ${MOTION.flashMax})`);
  for (let i = 1; i < plan.flashes.length; i++) if (plan.flashes[i].at - plan.flashes[i - 1].at < MOTION.flashGap) out.push(`FX_BUDGET two flashes ${plan.flashes[i].at - plan.flashes[i - 1].at} frames apart (at least ${MOTION.flashGap})`);
  return out;
};

// ---- the CLI ----------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: node tools/ci/fx.mjs <id>');
    process.exit(2);
  }
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
  let timeline;
  try {
    timeline = JSON.parse(fs.readFileSync(path.join(root, 'public', 'vo', id, 'timeline.json'), 'utf8'));
  } catch {
    timeline = estimateTimeline(spec);
  }
  const filmCode = (name) => {
    try {
      return fs.readFileSync(path.join(root, 'src', 'scenes', 'film', `${name}.tsx`), 'utf8');
    } catch {
      return null;
    }
  };
  const plan = planFx({spec, timeline, filmCode});
  console.log(JSON.stringify({...plan, scenes: undefined}, null, 1));
}
