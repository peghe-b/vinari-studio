// The Instagram Story slides (the owner, 2026-10-19: a STORIES section on vinari.ge/studio for PHOTOS: Highlights explainers, 3 to
// 7 slides that explain step by step how a feature works and how to use it, plus a Highlight cover icon). The studio
// workflow's "slides" mode (.github/workflows/studio.yml input mode=slides): the brief is ci/slides.md, the cloud Claude writes
// specs/slides/<id>.json (and, when a slide wants its own graphic, src/scenes/film/<Name>.tsx), tools/slides.mjs renders the
// stills, this file lints a set and carries it through the workflow's gate, package and publish.
//
//   node tools/ci/slides.mjs --test                 the self-test: every layout inside the Story's safe zone, the lint's rules
//   node tools/ci/slides.mjs lint <id>              one set's lint (exit 1 on an ERROR)
//   node tools/ci/slides.mjs record <id> --idea "<the set's own idea, one English line>"   the cloud Claude's ledger line
//   node tools/ci/slides.mjs resolve                the request's set id (the workflow's gate and voice steps)
//   node tools/ci/slides.mjs package | publish      the workflow's tail (tools/ci/publish.mjs hands a slides run here)
//
// A set: {"id": "s<n>-<slug>", "kind": "slides", "category" (a story category: ci/categories.json "slides": true), "topic" (the
// Highlight's name, short), "theme": "light" (always: the owner, 2026-10-19), "slides": [3..7 of src/slides/Slides.tsx's
// layouts, the first a "cover"; every one shows the REAL app in the whole, big iPhone (cover, step, end), but a car-knowledge
// set's (PHONELESS: no app screen for a tip)], "highlight": {"icon": the category's own (HIGHLIGHT_ICONS: one icon a topic,
// so his Highlights read as one set)}, "post": {"description", "tags"}}. The artifacts the site lists: slide-1.png ..
// slide-7.png (1080 x 1920), highlight.png, post.json ({"kind": "slides", "slides": n, ...}) and thumb.jpg.
// The dice (no category and no topic): slidesDice, the app feature with the fewest sets so far (specs/.slides.json), on a tie
// the one used longest ago, never one waiting for its App Store release; tools/ci/prompt.mjs rolls it.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BODY, layoutSet, layoutSlide, PHONE, PHONE_LAYOUTS, phoneBox, POSE_MAX, SLIDE_LAYOUTS, splitLines, STORY} from '../../src/slides/zone.mjs';
import {isFreeWeekLine, loadFreeWeek} from './ending.mjs';
import {bannedHits, streetLoose} from './streetwords.mjs';
import {BANNED, CTA, MYAUTO, PUSHY} from './words.mjs';
import {filmName, FILM_NAME} from './visual.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ID_RE = /^s(\d+)-[a-z0-9]+(?:-[a-z0-9]+){0,3}$/;
export const SLIDES_MIN = 3;
export const SLIDES_MAX = 7;
export const PICTURE_KINDS = ['film', 'car', 'cockpit', 'icon'];
/** the owner, 2026-10-19: every slide shows the real app in the whole, big iPhone. Only a car-knowledge set (a category with a
 *  sourced fact bank: there is no app screen for a tip) may draw a picture or a fact instead; there the phone is optional */
export const phoneless = (cat) => Boolean(cat?.bank);
/** a lifted row is a WIDE one (at least this share of the screen's width): a small tile lifted big covers its neighbours'
 *  labels; tap a tile instead */
export const LIFT_MIN_W = 0.5;
/** the story categories (ci/categories.json "slides": true), in its order; web/api/studio.js SLIDE_CATEGORIES, the page's
 *  SLIDE_CATS and the mock's list are the same (the Vinari repo's scripts/studio-lock-words-test.mjs checks them) */
export const slideCategories = (cats) => (Array.isArray(cats) ? cats : []).filter((c) => c?.slides === true).map((c) => c.id);
/** The Highlight cover's icon of each topic (the app's own icon of the feature, ui/FeaturesPanel.kt and the tab bar; the owner,
 *  2026-10-19: "a white background and in the middle the icon of what the topic is about", one consistent set). A category
 *  not listed (general, carinfo, free, stories) picks the icon of what its set is about. */
export const HIGHLIGHT_ICONS = Object.freeze({
  qr: 'qr_code_2',
  parking: 'local_parking',
  nav: 'navigation_fill',
  obd: 'obd_port',
  engine: 'stethoscope',
  vin: 'crop_free',
  reminders: 'calendar_month',
  auction: 'sell_mirror',
  widgets: 'grid_view',
  docs: 'description',
  whatsnew: 'auto_awesome',
});
export const slidesNumber = (id) => Number(/^s(\d+)-/.exec(String(id ?? ''))?.[1] ?? 0);
export const slidesDir = (root = ROOT) => path.join(root, 'specs', 'slides');
export const ledgerFile = (root = ROOT) => path.resolve(root, process.env.STUDIO_SLIDES_LEDGER || 'specs/.slides.json');
const readJson = (f, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};

/** a set already committed on the branch (HEAD): an earlier run's */
export const onBranch = (root, id) => spawnSync('git', ['cat-file', '-e', `HEAD:./specs/slides/${id}.json`], {cwd: root, stdio: 'ignore'}).status === 0;

/** every set on disk: [{file, spec}] (a file that is not JSON: spec null) */
export const listSets = (root = ROOT) => {
  let files = [];
  try {
    files = fs.readdirSync(slidesDir(root)).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
  } catch {}
  return files.sort().map((f) => ({file: f, spec: readJson(path.join(slidesDir(root), f))}));
};
/** the next free set number, "s<n>-": past every set on disk and every ledger line */
export const nextSlides = (root = ROOT) => {
  const led = readJson(ledgerFile(root), {}) ?? {};
  const ids = [...listSets(root).map((x) => x.file.slice(0, -5)), ...Object.values(led).map((e) => e?.id)].filter(Boolean);
  return `s${Math.max(0, ...ids.map(slidesNumber)) + 1}-`;
};
/** The Story dice (no category and no topic): an app feature with a Highlight (a story category, "feature" and "dice" not
 *  false), the one with the fewest sets so far (`ledger`: specs/.slides.json); on a tie the one whose newest set is the oldest
 *  (never made counts as oldest), then the order of ci/categories.json. `cats` are TODAY's categories (tools/ci/prompt.mjs
 *  CATS: one waiting for its App Store release is not there). Never the films' rotation: a set is counted only here. */
export const slidesDice = (cats, ledger = {}) => {
  const ids = (Array.isArray(cats) ? cats : []).filter((c) => c?.slides === true && c.feature !== false && c.dice !== false).map((c) => c.id);
  if (!ids.length) return null;
  const stat = new Map(ids.map((id, i) => [id, {n: 0, last: '', i}]));
  for (const e of Object.values(ledger ?? {})) {
    const st = stat.get(e?.category);
    if (!st) continue;
    st.n += 1;
    if (String(e.at ?? '') > st.last) st.last = String(e.at ?? '');
  }
  return [...stat.entries()].sort(([, a], [, b]) => a.n - b.n || a.last.localeCompare(b.last) || a.i - b.i)[0][0];
};
/** the app's icon names (src/scenes/kit/symbols.ts, generated by tools/kit-symbols.py) */
let symCache = null;
export const symbolNames = (root = ROOT) => {
  if (symCache) return symCache;
  try {
    const t = fs.readFileSync(path.join(root, 'src/scenes/kit/symbols.ts'), 'utf8');
    const m = /export const SYMBOLS[^=]*=\s*(\{[\s\S]*\});\s*$/.exec(t);
    symCache = new Set(Object.keys(JSON.parse(m[1])));
  } catch {
    symCache = new Set();
  }
  return symCache;
};

const TAG = /^#[\p{L}\p{N}_]+$/u;
const TAG_EN = /^#(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]+$/;
const GEO = /[\u10A0-\u10FF]/;
const BRAND = /vinari|ვინარ|винари/iu;
const URL_RE = /https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(?:ge|com|app|io|net|org|me|ly)\b/iu;
const POST_MAX = 220;
const TEXT_KEYS = ['kicker', 'title', 'body', 'note', 'big', 'unit'];

/** The lint of one set: {errors, warns}. ctx: {root, file, request (out/ci/request.json in the cloud), others (other sets)} */
export const lintSet = (spec, {root = ROOT, file = null, request = null, others = null} = {}) => {
  const errors = [];
  const warns = [];
  const E = (m) => errors.push(m);
  const Wn = (m) => warns.push(m);
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return {errors: ['the set is not a JSON object'], warns};
  const id = String(spec.id ?? '');
  if (!ID_RE.test(id)) E(`"id" "${id.slice(0, 40)}" is not s<n>-<slug> (1 to 4 short lowercase English words)`);
  if (file && file !== `${id}.json`) E(`the file is ${file}, the id ${id}: name it specs/slides/${id}.json`);
  if (spec.kind !== undefined && spec.kind !== 'slides') E('"kind" is "slides"');
  const cats = readJson(path.join(root, 'ci/categories.json'), {})?.categories ?? [];
  const cat = cats.find((c) => c?.id === spec.category);
  if (!cat) E(`"category" "${String(spec.category ?? '')}" is not an id of ci/categories.json`);
  else if (cat.slides !== true) E(`"category" "${cat.id}" is not a story category (ci/categories.json "slides": true: ${slideCategories(cats).join(', ')})`);
  const noPhone = phoneless(cat);
  if (typeof spec.topic !== 'string' || !spec.topic.trim()) E('"topic": the Highlight\'s name, 1 to 3 words („QR ბარათი")');
  else if ([...spec.topic].length > 24) E(`"topic" is ${[...spec.topic].length} characters (24 at most: Instagram cuts a Highlight's name)`);
  if (spec.theme !== undefined && spec.theme !== 'light') E('"theme" is "light": the Story slides are ALWAYS white with black type (the owner)');
  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  if (slides.length < SLIDES_MIN || slides.length > SLIDES_MAX) E(`${slides.length} slides: ${SLIDES_MIN} to ${SLIDES_MAX}`);
  if (slides[0] && slides[0].layout !== 'cover') E('slides[0] is the "cover" (the topic, its headline, the phone)');
  const syms = symbolNames(root);
  const fw = loadFreeWeek(root);
  const screensUsed = new Map();
  const locked = new Set([...(request?.lockedScreens ?? []), ...(request?.oldScreens ?? [])]);
  let step = 0;
  const own = filmName(id);
  // the set's layout: the steps share one phone size (src/slides/zone.mjs layoutSet)
  const lays = layoutSet(slides);
  slides.forEach((s, i) => {
    const at = `slides[${i}]`;
    if (!s || typeof s !== 'object') return E(`${at} is not an object`);
    if (!SLIDE_LAYOUTS.includes(s.layout)) return E(`${at}.layout "${String(s.layout ?? '')}" is one of ${SLIDE_LAYOUTS.join(', ')}`);
    const need = (k, why) => (typeof s[k] === 'string' && s[k].trim() ? true : (E(`${at} (${s.layout}) needs "${k}"${why ? `: ${why}` : ''}`), false));
    if (s.layout === 'cover') {
      need('title', 'the big headline, 1 to 3 lines with "|"');
      need('screen', 'the real screen in the whole phone');
    } else if (s.layout === 'step') {
      step += 1;
      if (s.n !== step) E(`${at}.n is ${JSON.stringify(s.n)}: the steps count 1, 2, 3 in order (this one is ${step})`);
      need('title', 'one verb and its object („გახსენი მენიუ")');
      need('screen', 'the real screen of this step');
      if (s.row !== undefined) {
        const r = s.row;
        const ok = r && typeof r === 'object' && Number.isFinite(r.y) && Number.isFinite(r.h) && r.y >= 0 && r.h > 0.01 && r.y + r.h <= 1 && r.h <= 0.5 && (r.x === undefined || (r.x >= 0 && r.x < 1)) && (r.w === undefined || (r.w > 0 && (r.x ?? 0.03) + r.w <= 1.001));
        if (!ok) E(`${at}.row is {y, h} (and x, w) as fractions of the capture, measured on public/screens/<screen>.jpg (1080 x 2346)`);
        else if (s.lift && (r.w ?? 0.94) < LIFT_MIN_W) E(`${at}.lift: the row is ${Math.round((r.w ?? 0.94) * 100)} % of the screen wide: a small tile lifted big covers its neighbours' labels; "tap" it in its window instead (lift only a row ${LIFT_MIN_W * 100} % wide or more)`);
      } else if (s.tap || s.lift) E(`${at}: "tap" and "lift" need a "row" (the row they point at)`);
    } else if (s.layout === 'end') {
      need('title', 'one short closing line');
      need('screen', 'one more real screen in the whole phone (the home, the result): every slide shows the app');
      if (s.row !== undefined || s.tap || s.lift) E(`${at} (end): no "row", "tap" or "lift": the end shows the phone calm`);
      if (i !== slides.length - 1) E(`${at}: the "end" is the last slide`);
    } else if (!noPhone) {
      E(`${at}: a "${s.layout}" has no phone, and every slide shows the real app in the whole, big iPhone (the owner, 2026-10-19): a "step" or the "end" on a real screen (a picture or a fact only in a car-knowledge set)`);
    } else if (s.layout === 'picture') {
      need('title');
      const p = s.picture;
      if (!p || typeof p !== 'object' || !PICTURE_KINDS.includes(p.kind)) E(`${at}.picture {"kind": ${PICTURE_KINDS.map((k) => `"${k}"`).join(' | ')}, ...}`);
      else if (p.kind === 'film') {
        if (p.name !== own) E(`${at}.picture.name is "${own}" (src/scenes/film/${own}.tsx, the set's own graphic: one file a set)`);
        else if (!fs.existsSync(path.join(root, 'src/scenes/film', `${own}.tsx`))) E(`${at}: src/scenes/film/${own}.tsx is missing (start from src/scenes/film/_template.tsx; draw inside p.box)`);
      } else if (p.kind === 'icon' && !syms.has(String(p.name))) E(`${at}.picture.name "${String(p.name ?? '')}" is not one of the app's icons (src/scenes/kit/icons.tsx SYM_NAMES)`);
      else if (p.kind === 'car' && p.view !== undefined && !['three', 'front', 'side', 'rear'].includes(p.view)) E(`${at}.picture.view is three, front, side or rear`);
    } else if (s.layout === 'fact') {
      if (!(typeof s.big === 'string' || typeof s.big === 'number') || !String(s.big).trim()) E(`${at} (fact) needs "big": a number or a short value („15", „0 ₾")`);
      need('title');
      if (s.icon !== undefined && !syms.has(String(s.icon))) E(`${at}.icon "${String(s.icon)}" is not one of the app's icons`);
    }
    if (s.screen !== undefined) {
      const scr = String(s.screen);
      if (!/^[a-z0-9-]+$/.test(scr) || !fs.existsSync(path.join(root, 'public/screens', `${scr}.jpg`))) E(`${at}.screen "${scr.slice(0, 40)}" is not in public/screens (ls public/screens)`);
      else if (locked.has(scr)) E(`${at}.screen ${scr}: LOCKED (a feature waiting for its App Store release, or the app as it looked before): not on a slide`);
      else {
        screensUsed.set(scr, (screensUsed.get(scr) ?? 0) + 1);
        if (cat && Array.isArray(cat.screens) && cat.screens.length && !cat.screens.includes(scr) && !['23-home-104', '25-menu-104', '24-home-tip'].includes(scr)) Wn(`${at}.screen ${scr} is not one of ${cat.id}'s screens (${cat.screens.join(', ')}): show the feature's own`);
      }
    }
    if (s.hand !== undefined) E(`${at}.hand: no hand on a slide (the phone stands alone, whole and big)`);
    if (s.yaw !== undefined && !(Number.isFinite(s.yaw) && Math.abs(s.yaw) <= POSE_MAX.yaw)) E(`${at}.yaw is -${POSE_MAX.yaw} .. ${POSE_MAX.yaw} degrees (a calm turn: the screen reads)`);
    if (s.screen !== undefined && !PHONE_LAYOUTS.includes(s.layout)) E(`${at}: a "screen" goes on a cover, a step or the end (the phone, big); a ${s.layout} has none`);
    // the layout and the Story's safe zone (src/slides/zone.mjs): what does not fit is refused before any render
    for (const p of (lays[i] ?? layoutSlide(s)).problems) E(`${at}: ${p}`);
    // the words (black or white type, Mkhedruli in the spec: mtav() sets the Mtavruli at render)
    for (const k of TEXT_KEYS) {
      if (s[k] === undefined) continue;
      const v = String(s[k]);
      const w = `${at}.${k}`;
      if (/[\u1C90-\u1CBF]/.test(v)) E(`${w}: Mtavruli code points: write Mkhedruli (the render sets the capitals)`);
      if (v.includes('\u2014')) E(`${w}: an em dash: a comma, a colon or a full stop`);
      if (v.includes('!')) E(`${w}: "!": the slides say it calmly`);
      const fwOk = fw.lines.length > 0 && s.layout === 'end' && k === 'body' && isFreeWeekLine(v, fw) && (fw.on || onBranch(root, id));
      if (!fwOk) {
        const c = CTA.exec(v);
        if (c) E(`${w}: a call to action "${c[0]}"${fw.on ? ` (only the end slide's body may be a free-week line of ci/endings.json, word for word)` : ''}`);
        const p = PUSHY.exec(v);
        if (p) E(`${w}: "${p[0]}" pushes the viewer`);
      }
      const my = MYAUTO.exec(v);
      if (my) E(`${w}: never the listing site's name ("${my[0]}"): say "ბაზარი"`);
      for (const [re, plain] of BANNED) {
        const m = re.exec(v);
        if (m) E(`${w}: "${m[0]}" is banned (the owner); say ${plain}`);
      }
      for (const b of bannedHits(v)) E(`${w}: "${b.form}" is banned (ci/street-words.json)`);
      if (streetLoose(v).length) E(`${w}: no street words on a slide`);
      if (k !== 'unit' && k !== 'big' && GEO.test(v) === false && /[a-z]{4,}/i.test(v) && !/^[A-Z0-9 .+-]+$/.test(v)) Wn(`${w}: "${v.slice(0, 40)}" is not Georgian`);

    }
  });
  for (const [scr, n] of screensUsed) if (n > 2) E(`the screen ${scr} is on ${n} slides: twice at most (each step its own screen or row)`);
  // never the same picture twice in a set: one screen comes back only with another row
  const pics = new Map();
  slides.forEach((s, i) => {
    if (!s || typeof s !== 'object' || typeof s.screen !== 'string') return;
    const k = `${s.screen} ${s.row ? [s.row.x ?? '', s.row.y, s.row.w ?? '', s.row.h].map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',') : '-'}`;
    if (pics.has(k)) E(`slides[${i}] shows slides[${pics.get(k)}]'s picture again (${s.screen}, the same row): each slide a picture of its own`);
    else pics.set(k, i);
  });
  if (!slides.some((s) => s?.layout === 'step') && cat && !cat.bank && cat.id !== 'free') Wn('no "step" slide: a Highlights explainer shows HOW, step by step');
  // the Highlight cover
  // (the owner, 2026-10-19: a white field, the topic's ONE icon black in the middle, nothing else: the render draws it so)
  const hl = spec.highlight;
  const want = HIGHLIGHT_ICONS[spec.category];
  if (!hl || typeof hl !== 'object' || !syms.has(String(hl.icon))) E(`"highlight": {"icon": ${want ? `"${want}" (${spec.category}'s own)` : `one of the app's icons (src/scenes/kit/icons.tsx SYM_NAMES: ${[...syms].filter((n) => /car|qr|park|calendar|speed|obd|navig|wallet|notif|tire|gas/.test(n)).slice(0, 12).join(', ')} ...)`}}`);
  else if (want && hl.icon !== want) E(`"highlight.icon" is "${want}": ${spec.category}'s own icon (one icon a topic, so the Highlights read as one set)`);
  if (hl && typeof hl === 'object' && Object.keys(hl).some((k) => k !== 'icon')) E('"highlight" has only "icon" (the cover is always the white field and the black icon)');
  // the post that goes with the set
  const post = spec.post;
  if (!post || typeof post !== 'object') E('"post": {"description", "tags"}');
  else {
    const d = post.description;
    if (typeof d !== 'string' || !d.trim()) E('post.description: one or two short friendly lines');
    else {
      if ([...d].length > POST_MAX) E(`post.description is ${[...d].length} characters (${POST_MAX} at most)`);
      if (/\p{Extended_Pictographic}/u.test(d)) E('post.description: no emoji');
      if (d.includes('!')) E('post.description: no "!"');
      if (d.includes('\u2014')) E('post.description: no em dash');
      const c = CTA.exec(d);
      if (c) E(`post.description: a call to action "${c[0]}"`);
      if (BRAND.test(d)) E('post.description: no app name in the post');
      if (URL_RE.test(d)) E('post.description: no link');
    }
    const tags = post.tags;
    if (!Array.isArray(tags) || tags.length !== 3) E('post.tags: exactly 3 tags, 2 Georgian and 1 English');
    else {
      const ka = tags.filter((t) => typeof t === 'string' && TAG.test(t) && GEO.test(t)).length;
      const en = tags.filter((t) => typeof t === 'string' && TAG_EN.test(t)).length;
      if (ka !== 2 || en !== 1) E(`post.tags: ${ka} Georgian and ${en} English; exactly 2 and 1: ${tags.join(' ')}`);
    }
  }
  // never the same set again: another set of this category with the same cover headline
  const sets = others ?? listSets(root).filter((x) => x.spec && x.spec.id !== id).map((x) => x.spec);
  const key = (x) => splitLines(x?.slides?.[0]?.title).join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const twin = sets.find((x) => x?.category === spec.category && key(x) && key(x) === key(spec));
  if (twin) E(`the cover headline is ${twin.id}'s: a new set says its topic in its own words`);
  return {errors, warns};
};

// ---- the ledger: specs/.slides.json {"<req>": {"id", "topic", "at", "category", "idea", "slides", "icon"}} ----------------
const writeLedger = (led, file = ledgerFile()) => {
  const keys = Object.keys(led);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, keys.length ? `{\n${keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(led[k])}`).join(',\n')}\n}\n` : '{}\n');
  fs.renameSync(tmp, file);
};
const plain = (v, max) =>
  String(v ?? '')
    .normalize('NFKC')
    .replace(/[\p{Cf}\p{Co}\p{Cn}\p{Cc}<>`§{}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};
const requestOf = (root = ROOT) => readJson(path.join(root, 'out/ci/request.json'));

/** The request's set: {id, spec, entry}. The id must start with the request's own next number ("slidesNext") and not be a set
 *  already on the branch, so a run can never re-render or overwrite an earlier set. */
export const resolveSet = (root = ROOT, {req = process.env.STUDIO_REQ} = {}) => {
  if (!REQ.test(String(req ?? ''))) fail(`STUDIO_REQ "${req ?? ''}" is not a request id`);
  const request = requestOf(root);
  const inActions = process.env.GITHUB_ACTIONS === 'true';
  if (inActions && request?.req !== req) fail('out/ci/request.json is missing or names another request');
  const led = readJson(ledgerFile(root), {}) ?? {};
  let id = led[req]?.id;
  if (!id) {
    // no ledger line: the one set this request may have written
    const next = String(request?.slidesNext ?? '');
    const fresh = listSets(root).map((x) => x.file.slice(0, -5)).filter((x) => next && x.startsWith(next));
    if (fresh.length !== 1) fail(fresh.length ? `several sets start with ${next}: ${fresh.join(', ')}` : `the Claude step wrote no set (specs/slides/${next}<slug>.json)`);
    id = fresh[0];
    console.error(`::warning::no ledger line for ${req}: taking specs/slides/${id}.json`);
  }
  if (!ID_RE.test(String(id))) fail(`the set id "${String(id).slice(0, 40)}" is not s<n>-<slug>`);
  if (request?.slidesNext && !String(id).startsWith(request.slidesNext)) fail(`a new set's id starts with "${request.slidesNext}", not "${id}"`);
  if (inActions && onBranch(root, id)) fail(`specs/slides/${id}.json is an earlier set (already on the branch)`);
  const spec = readJson(path.join(slidesDir(root), `${id}.json`));
  if (!spec || spec.id !== id) fail(`specs/slides/${id}.json is missing, not JSON, or its "id" is not ${id}`);
  return {id, spec, entry: led[req] ?? {id, topic: process.env.STUDIO_TOPIC ?? '', at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}};
};

/** record the request's set (the cloud Claude, after its check): specs/.slides.json[req] */
export const recordSet = (root, id, {idea = ''} = {}) => {
  const request = requestOf(root);
  const req = request?.req ?? process.env.STUDIO_REQ;
  if (!REQ.test(String(req ?? ''))) fail('no request (out/ci/request.json): --record runs in the workflow');
  if (request?.slidesNext && !String(id).startsWith(request.slidesNext)) fail(`this request's set id starts with "${request.slidesNext}", not "${id}"`);
  const spec = readJson(path.join(slidesDir(root), `${id}.json`));
  if (!spec || spec.id !== id) fail(`specs/slides/${id}.json is missing or its "id" is not ${id}`);
  const {errors} = lintSet(spec, {root, file: `${id}.json`, request});
  if (errors.length) fail(`fix the set first (node tools/ci/slides.mjs lint ${id}):\n${errors.map((e) => `  ${e}`).join('\n')}`);
  if (!plain(idea, 160) || plain(idea, 160).length < 12) fail('--idea "<the set\'s graphic idea in one English line>" (12 to 160 characters)');
  const led = readJson(ledgerFile(root), {}) ?? {};
  led[req] = {
    id,
    topic: plain(request?.topic ?? '', 300),
    at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ...(/^[a-z]{2,16}$/.test(String(spec.category)) ? {category: spec.category} : {}),
    idea: plain(idea, 160),
    slides: spec.slides.length,
    icon: String(spec.highlight?.icon ?? '').slice(0, 40),
  };
  writeLedger(led, ledgerFile(root));
  console.log(`recorded ${id} for ${req}`);
};

// ---- the workflow's tail -------------------------------------------------------------------------------------------------
const outDir = () => path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'studio');
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') fail(`${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
/** slide-N.png, highlight.png, post.json and thumb.jpg in $RUNNER_TEMP/studio (the upload steps take them from there) */
export const packageSet = (root = ROOT) => {
  const {id, spec, entry} = resolveSet(root);
  const src = path.join(root, 'out', 'slides', id);
  const n = spec.slides.length;
  const dir = outDir();
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  for (let i = 1; i <= n; i++) {
    const f = path.join(src, `slide-${i}.png`);
    if (!fs.existsSync(f)) fail(`no out/slides/${id}/slide-${i}.png: the render step did not finish`);
    const [w, h] = pngSize(f);
    if (w !== STORY.w || h !== STORY.h) fail(`slide-${i}.png is ${w}x${h}, not ${STORY.w}x${STORY.h}`);
    fs.copyFileSync(f, path.join(dir, `slide-${i}.png`));
  }
  const hl = path.join(src, 'highlight.png');
  if (!fs.existsSync(hl)) fail(`no out/slides/${id}/highlight.png`);
  fs.copyFileSync(hl, path.join(dir, 'highlight.png'));
  const p = spec.post ?? {};
  const post = {
    req: process.env.STUDIO_REQ,
    kind: 'slides',
    id,
    slides: n,
    topic: String(entry.topic || process.env.STUDIO_TOPIC || spec.topic || ''),
    title: String(spec.topic ?? ''),
    category: /^[a-z]{2,16}$/.test(String(spec.category ?? '')) ? spec.category : null,
    description: typeof p.description === 'string' ? p.description.trim() : '',
    tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string').slice(0, 3) : [],
    theme: 'light',
    icon: String(spec.highlight?.icon ?? ''),
  };
  fs.writeFileSync(path.join(dir, 'post.json'), `${JSON.stringify(post, null, 1)}\n`);
  // thumb.jpg: the cover slide 360 px wide, for the site's grid
  const py = "import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert('RGB')\nim.thumbnail((360, 640), Image.LANCZOS)\nim.save(sys.argv[2], 'JPEG', quality=72, optimize=True, progressive=True)";
  const r = spawnSync('python3', ['-c', py, path.join(dir, 'slide-1.png'), path.join(dir, 'thumb.jpg')], {encoding: 'utf8'});
  if (r.status !== 0) console.error(`::warning::no thumb.jpg (${(r.stderr || '').trim().split('\n').pop()})`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dir=${dir}\nslides=${n}\n`);
  console.log(`package: ${dir}\n  ${n} slides, highlight.png, post.json ${JSON.stringify(post)}`);
};

/** the set, its own graphic and the ledger back to the branch (vinari-studio-bot), then the job summary */
export const publishSet = (root = ROOT, {dryRun = process.env.GITHUB_ACTIONS !== 'true'} = {}) => {
  const {id, spec, entry} = resolveSet(root);
  const req = process.env.STUDIO_REQ;
  const rel = `specs/slides/${id}.json`;
  const body = fs.readFileSync(path.join(root, rel));
  const own = filmName(id);
  const filmRel = `src/scenes/film/${own}.tsx`;
  const usesFilm = spec.slides.some((s) => s?.picture?.kind === 'film' && s.picture.name === own) && FILM_NAME.test(own);
  const filmBody = usesFilm && fs.existsSync(path.join(root, filmRel)) ? fs.readFileSync(path.join(root, filmRel)) : null;
  const line = {
    id,
    topic: plain(entry.topic ?? '', 300),
    at: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(String(entry.at ?? '')) ? entry.at : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ...(/^[a-z]{2,16}$/.test(String(spec.category ?? '')) ? {category: spec.category} : {}),
    ...(entry.idea ? {idea: plain(entry.idea, 160)} : {}),
    slides: spec.slides.length,
    icon: String(spec.highlight?.icon ?? '').slice(0, 40),
  };
  const files = [rel, 'specs/.slides.json', ...(filmBody ? [filmRel] : [])];
  const summary = (note) => {
    const lines = [`### Story set ${id}`, '', `${spec.slides.length} slides, ${spec.topic ?? ''} (${spec.category ?? ''}); ledger: ${note}`, '', 'Artifacts: `slide-1.png` .. , `highlight.png`, `post.json` (kept 2 days).', ''];
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
    else console.log(lines.join('\n'));
  };
  if (dryRun) {
    console.log(`publish: dry run, nothing is committed. It would commit ${files.join(', ')} with specs/.slides.json["${req}"] = ${JSON.stringify(line)}`);
    return summary('dry run');
  }
  const git = (...a) => execFileSync('git', a, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], {cwd: root, encoding: 'utf8'}).stdout?.trim();
  if (!top || fs.realpathSync(top) !== fs.realpathSync(root)) fail(`the studio root ${root} is not the top of its git checkout; nothing is committed`);
  const branch = process.env.STUDIO_BRANCH || process.env.GITHUB_REF_NAME || 'main';
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      git('fetch', '--no-tags', '--depth=1', 'origin', branch);
      git('reset', '-q', '--hard', 'FETCH_HEAD');
      fs.mkdirSync(path.join(root, 'specs/slides'), {recursive: true});
      fs.writeFileSync(path.join(root, rel), body);
      if (filmBody) fs.writeFileSync(path.join(root, filmRel), filmBody);
      writeLedger({...(readJson(path.join(root, 'specs/.slides.json'), {}) ?? {}), [req]: line}, path.join(root, 'specs/.slides.json'));
      git('add', '--', ...files);
      if (spawnSync('git', ['diff', '--cached', '--quiet'], {cwd: root}).status === 0) return summary('already on the branch');
      git('-c', 'user.name=vinari-studio-bot', '-c', 'user.email=vinari-studio-bot@users.noreply.github.com', 'commit', '-q', '-m', `studio ${req}: ${id}`);
      git('push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
      return summary(`\`${git('rev-parse', '--short', 'HEAD')}\` pushed`);
    } catch (e) {
      last = String(e.stderr || e.message).trim().split('\n').slice(-2).join(' ');
      console.error(`publish: try ${attempt} failed: ${last}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000 * attempt);
    }
  }
  console.error(`::warning::could not push the set and its ledger to ${branch} (${last}); the slides are delivered`);
  return summary(`not pushed: ${last}`);
};

// ---- the self-test --------------------------------------------------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  // Instagram's Story safe zone: x 65..1015, y 250..1580 (a picture's box is the drawing's field, full width: its pixels are
  // checked by tools/slides.mjs)
  ok(STORY.w === 1080 && STORY.h === 1920 && STORY.top === 250 && STORY.bottom === 1580 && STORY.edge === 65 && STORY.side >= STORY.edge, `the Story's safe zone is x ${STORY.edge}..${STORY.w - STORY.edge}, y ${STORY.top}..${STORY.bottom} of 1080 x 1920 (the text ${STORY.side} px in)`);
  const inside = (r) => Object.entries(r.boxes).every(([k, b]) => b.y >= STORY.top - 0.5 && b.y + b.h <= STORY.bottom + 0.5 && (k === 'picture' ? b.x >= -0.5 && b.x + b.w <= STORY.w + 0.5 : b.x >= STORY.edge - 0.5 && b.x + b.w <= STORY.w - STORY.edge + 0.5));
  // the phone's box is the 3D iPhone's own: zone.mjs BODY is src/scenes/kit/phone3d.tsx's body and lens
  const p3 = fs.readFileSync(path.join(ROOT, 'src/scenes/kit/phone3d.tsx'), 'utf8');
  const num = (re) => Number(re.exec(p3)?.[1]);
  const bez = num(/const BEZ = ([\d.]+);/);
  const depth = num(/const DEPTH = ([\d.]+);/);
  const sw = num(/export const SRC_W = (\d+);/);
  const sh = num(/export const SRC_H = (\d+);/);
  const fpx = num(/export const FPX = (\d+);/);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  ok(near(BODY.bw, 1 + 2 * bez) && near(BODY.bh, sh / sw + 2 * bez) && near(BODY.front, depth / 2) && BODY.fpx === fpx && /makeRotationFromEuler\(new THREE\.Euler\(-p\.pitch \* D2R, p\.yaw \* D2R, \(p\.roll \?\? 0\) \* D2R, 'YXZ'\)\)/.test(p3), `zone.mjs BODY is phone3d.tsx's body and lens (bezel ${bez}, depth ${depth}, ${sw} x ${sh}, focal ${fpx}, Euler YXZ)`);
  const flat = phoneBox(500, {yaw: 0, pitch: 0, roll: 0});
  ok(Math.abs(flat.x1 - flat.x0 - 500 * BODY.bw * (fpx / (fpx - 500 * BODY.front)) / 1) < 1 && Math.abs(flat.y1 - flat.y0 - 500 * BODY.bh * (fpx / (fpx - 500 * BODY.front))) < 1, `phoneBox: a flat phone 500 px wide is ${Math.round(flat.x1 - flat.x0)} x ${Math.round(flat.y1 - flat.y0)} (its front face, nearer the lens)`);
  const turned = phoneBox(500, {yaw: 8, pitch: 4, roll: 1.5});
  ok(turned.y1 - turned.y0 > flat.y1 - flat.y0 && turned.x1 - turned.x0 > flat.x1 - flat.x0, 'phoneBox: a turned phone takes more room than a flat one');
  // the safe zone: every layout, with its shortest and its longest allowed content, keeps every box between y 250 and 1580
  const long = 'ძალიან გრძელი სათაური, რომელიც ორ ხაზზე იშლება';
  const cases = [
    {layout: 'cover', title: 'QR ბარათი', screen: '08-qr-card'},
    {layout: 'cover', kicker: 'როგორ მუშაობს', title: 'QR ბარათი | ნომრის ნაცვლად', screen: '08-qr-card'},
    {layout: 'cover', title: 'ნომრის ნაცვლად | QR ბარათი', note: 'iPhone და Android', screen: '08-qr-card'},
    {layout: 'step', n: 1, title: 'გახსენი', screen: '25-menu-104'},
    {layout: 'step', n: 2, title: 'დააჭირე სკანირებას', body: 'ოთხ წამში ნახავ, რა სჭირს მანქანას.', note: 'iPhone და Android', screen: '21-obd-hub'},
    {layout: 'step', n: 3, title: 'დააჭირე | სკანირებას', body: 'ოთხ წამში ნახავ, რა სჭირს.', screen: '21-obd-hub'},
    {layout: 'step', n: 4, title: 'ნახე შედეგი', body: `${long}, და კიდევ ერთი`, screen: '22-obd-result'},
    {layout: 'end', title: 'ნომერი აღარ გჭირდება', note: 'iPhone და Android', screen: '23-home-104'},
    {layout: 'end', title: 'შენი მანქანის | ყველაფერი', body: 'ერთი კვირა უფასოდ სცადე, ჩამოტვირთე და ნახე.', screen: '23-home-104'},
    {layout: 'picture', title: 'რა არის OBD', picture: {kind: 'icon', name: 'speed'}},
    {layout: 'picture', title: 'რა არის | OBD ბუდე', body: long, note: 'საჭის ქვეშ', picture: {kind: 'car'}},
    {layout: 'fact', big: '15', title: 'წამი'},
    {layout: 'fact', icon: 'speed', big: '300 000', unit: '₾', title: 'ამდენი | დაგიჯდება', body: long, note: 'შენი ფასი'},
  ];
  for (const c of cases) {
    const r = layoutSlide(c);
    const name = `${c.layout} "${String(c.title).slice(0, 24)}"`;
    ok(inside(r), `${name}: every box inside the safe zone (${Object.entries(r.boxes).map(([k, b]) => `${k} ${Math.round(b.y)}-${Math.round(b.y + b.h)}`).join(', ')})`);
    ok(!r.problems.length, `${name}: fits (${r.problems.join('; ') || 'no problem'})`);
    // the owner, 2026-10-19: the phone BIG and WHOLE, inside the zone, never cut
    ok(Boolean(r.phone) === PHONE_LAYOUTS.includes(c.layout), `${name}: ${PHONE_LAYOUTS.includes(c.layout) ? 'shows the phone' : 'no phone (a car-knowledge set only)'}`);
    if (r.phone) {
      const b = r.boxes.phone;
      ok(r.phone.w >= PHONE.min && r.phone.w <= PHONE.max && b.y >= STORY.top && b.y + b.h <= STORY.bottom - 24 && b.x >= STORY.side && b.x + b.w <= STORY.w - STORY.side, `${name}: the phone big (${r.phone.w} px of display, its body ${Math.round(b.w)} x ${Math.round(b.h)}) and whole inside the zone (y ${Math.round(b.y)}..${Math.round(b.y + b.h)})`);
      const text = Object.entries(r.boxes).filter(([k]) => k !== 'phone').map(([, x]) => x.y + x.h);
      ok(text.every((y) => y <= b.y - 24), `${name}: the text ends above the phone (${Math.round(Math.max(...text))} < ${Math.round(b.y)})`);
    }
  }
  // a step: the body and the note hang under the title (one left edge), the chip on the title's first line
  const st = layoutSlide(cases[4]);
  ok(st.boxes.body.x === st.boxes.title.x && st.boxes.note.x === st.boxes.title.x && st.boxes.chip.x < st.boxes.title.x, 'a step: the chip at the left, the title, the body and the note on one left edge');
  // what cannot fit is a problem the lint refuses, never a box past the zone, never a small phone
  const over = layoutSlide({layout: 'step', n: 1, title: 'ა | ბ | გ | დ', body: `${long} ${long} ${long} ${long}`});
  ok(over.problems.length > 0, `too much text on a step is refused (${over.problems[0] ?? 'nothing'})`);
  ok(inside(over) && over.phone.w >= PHONE.min, 'and even then nothing is placed past the zone, and the phone stays big');
  const crowd = layoutSlide({layout: 'step', n: 1, title: 'დააჭირე | სკანირებას', body: `${long}, და კიდევ ერთი წინადადება`, note: 'iPhone: Wi-Fi ან BLE ადაპტერი'});
  ok(crowd.problems.some((p) => /phone|lines/.test(p)), `text that would shrink the phone is refused (${crowd.problems[0] ?? 'nothing'})`);
  const wide = layoutSlide({layout: 'cover', title: 'ერთიძალიანგრძელისიტყვაერთხაზზეარდაეტევა'});
  ok(wide.problems.some((p) => /too long for one line/.test(p)), 'a word too long for the line is refused');
  const short = layoutSlide({layout: 'cover', title: 'QR'});
  ok(short.phone.w >= 480 && short.boxes.phone.y + short.boxes.phone.h <= STORY.bottom - 24, `a short cover gets the biggest phone (${short.phone.w} px), whole above the reply bar`);
  // the steps of a set share one phone (size and place)
  const set3 = layoutSet([cases[0], cases[3], cases[4], cases[5], cases[6], cases[7]]);
  const ws = set3.filter((l) => l.layout === 'step').map((l) => l.phone.w);
  ok(new Set(ws).size === 1 && ws[0] >= PHONE.min && set3.every((l) => !l.problems.length), `the steps share one phone (${ws.join(', ')} px)`);
  // the lint
  const set = (o = {}) => ({
    id: 's1-qr-card',
    kind: 'slides',
    category: 'qr',
    topic: 'QR ბარათი',
    slides: [
      {layout: 'cover', kicker: 'როგორ მუშაობს', title: 'QR ბარათი | ნომრის ნაცვლად', screen: '08-qr-card'},
      {layout: 'step', n: 1, title: 'გახსენი ბარათი', screen: '08-qr-card', row: {y: 0.3, h: 0.08}, tap: true},
      {layout: 'step', n: 2, title: 'დაბეჭდე', screen: '15-qr-web'},
      {layout: 'end', title: 'ნომერი აღარ გჭირდება', screen: '23-home-104'},
    ],
    theme: 'light',
    highlight: {icon: 'qr_code_2'},
    post: {description: 'ნომერი მინაზე აღარ გჭირდება.', tags: ['#მანქანა', '#პარკინგი', '#carlife']},
    ...o,
  });
  const lint = (s) => lintSet(s, {root: ROOT, file: `${s.id}.json`, others: []});
  const sl = (i, o) => set().slides.map((x, j) => (j === i ? (o === null ? null : {...x, ...o}) : x)).filter(Boolean);
  ok(lint(set()).errors.length === 0, `a good set passes (${lint(set()).errors.join('; ') || 'ok'})`);
  ok(lint(set({slides: set().slides.slice(0, 2)})).errors.some((e) => /2 slides/.test(e)), 'too few slides');
  ok(lint(set({slides: [set().slides[1], set().slides[0], ...set().slides.slice(2)]})).errors.some((e) => /cover/.test(e)), 'the first slide is the cover');
  ok(lint(set({slides: sl(1, {title: 'ჩამოტვირთე აპი'})})).errors.some((e) => /call to action/.test(e)), 'a call to action is refused');
  ok(lint(set({slides: sl(3, {body: 'ჩამოტვირთე და ერთი კვირა უფასოდ სცადე.'})})).errors.length === (loadFreeWeek(ROOT).on ? 0 : 1), 'the free-week line on the end slide follows the switch');
  ok(lint(set({slides: sl(1, {title: 'ნომერი — ბარათზე'})})).errors.some((e) => /em dash/.test(e)), 'an em dash is refused');
  ok(lint(set({slides: sl(1, {n: 3})})).errors.some((e) => /count 1, 2, 3/.test(e)), 'the steps count in order');
  ok(lint(set({slides: sl(1, {screen: 'nope'})})).errors.some((e) => /not in public\/screens/.test(e)), 'a screen that is not there');
  ok(lint(set({highlight: {icon: 'not_an_icon'}})).errors.some((e) => /highlight/.test(e)), "the Highlight icon is one of the app's");
  ok(lint(set({highlight: {icon: 'local_parking'}})).errors.some((e) => /qr_code_2/.test(e)), "the Highlight icon is the category's own (one set)");
  ok(lint(set({highlight: {icon: 'qr_code_2', tone: 'dark'}})).errors.some((e) => /only "icon"/.test(e)), 'the Highlight cover takes no tone (always white, the icon black)');
  ok(lint(set({theme: 'dark'})).errors.some((e) => /ALWAYS white/.test(e)), 'a dark set is refused (always the white theme)');
  ok(lint(set({slides: sl(1, {hand: 'right'})})).errors.some((e) => /no hand/.test(e)), 'no hand on the phone');
  ok(lint(set({slides: sl(1, {yaw: 12})})).errors.some((e) => /yaw/.test(e)), 'a calm turn only');
  // the owner, 2026-10-19: every slide shows the phone
  ok(lint(set({slides: sl(3, {screen: undefined})})).errors.some((e) => /needs "screen"/.test(e)), 'the end shows the phone too (a screen)');
  ok(lint(set({slides: [...set().slides.slice(0, 3), {layout: 'fact', big: '15', title: 'წამი'}, set().slides[3]]})).errors.some((e) => /has no phone/.test(e)), 'a fact in a feature set is refused (every slide shows the phone)');
  ok(lint(set({slides: [set().slides[0], {layout: 'picture', title: 'მანქანა', picture: {kind: 'car'}}, ...set().slides.slice(1)]})).errors.some((e) => /has no phone/.test(e)), 'a picture in a feature set is refused');
  const tip = set({id: 's1-antifreeze', category: 'carinfo', topic: 'ანტიფრიზი', highlight: {icon: 'ac_unit'}, slides: [{layout: 'cover', title: 'ანტიფრიზი | ზამთრისთვის', screen: '24-home-tip'}, {layout: 'fact', big: '-45', unit: '°C', title: 'ნარევი იყინება'}, {layout: 'picture', title: 'სუფთა არა', picture: {kind: 'icon', name: 'ac_unit'}}, {layout: 'end', title: 'ზამთარს მზად დახვდი', screen: '23-home-104'}], post: {description: 'ზამთარი ახლოსაა. შენი ანტიფრიზი მზადაა?', tags: ['#მანქანა', '#ზამთარი', '#cartips']}});
  ok(!lint(tip).errors.some((e) => /has no phone/.test(e)), `a car-knowledge set may draw a fact and a picture (${lint(tip).errors.join('; ') || 'ok'})`);
  ok(lint(set({slides: sl(3, {row: {y: 0.3, h: 0.1}, tap: true})})).errors.some((e) => /end\): no "row"/.test(e)), 'the end shows the phone calm (no row, no tap)');
  ok(lint(set({slides: [set().slides[0], set().slides[3], ...set().slides.slice(1, 3)]})).errors.some((e) => /the last slide/.test(e)), 'the end is the last slide');
  ok(lint(set({slides: sl(1, {row: {x: 0.51, y: 0.67, w: 0.19, h: 0.09}, lift: true})})).errors.some((e) => /covers its neighbours/.test(e)), 'a small tile is never lifted (it covers its neighbours), only tapped');
  ok(lint(set({slides: sl(1, {row: {x: 0.51, y: 0.67, w: 0.19, h: 0.09}, tap: true})})).errors.length === 0, 'a small tile tapped in its window passes');
  ok(lint(set({category: 'stories'})).errors.some((e) => /not a story category/.test(e)), 'a category that is not a story one is refused');
  ok(lint(set({id: 'S1_x'})).errors.some((e) => /s<n>-<slug>/.test(e)), 'the id');
  ok(lintSet(set(), {root: ROOT, file: 's1-qr-card.json', request: {lockedScreens: ['15-qr-web']}, others: []}).errors.some((e) => /LOCKED/.test(e)), 'a locked screen is refused');
  ok(lintSet(set(), {root: ROOT, file: 's1-qr-card.json', others: [{...set(), id: 's0-old'}]}).errors.some((e) => /cover headline/.test(e)), 'the same cover headline as an earlier set');
  // the example the cloud Claude copies (ci/slides.md: "a good set: copy its shape") passes, and shows the phone on every slide
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'ci/slides-example.json'), 'utf8'));
  const exl = lintSet(ex, {root: ROOT, file: `${ex.id}.json`, others: []});
  ok(exl.errors.length === 0 && exl.warns.length === 0, `ci/slides-example.json passes the lint with no warning (${[...exl.errors, ...exl.warns].join('; ') || 'ok'})`);
  ok(ex.slides.every((x) => PHONE_LAYOUTS.includes(x.layout) && x.screen), 'and every slide of it shows the phone on a real screen');
  // the story categories and their icons
  const cats = readJson(path.join(ROOT, 'ci/categories.json'), {})?.categories ?? [];
  const sc = slideCategories(cats);
  ok(sc.length >= 10 && !sc.includes('stories') && !sc.includes('free') && Object.keys(HIGHLIGHT_ICONS).every((k) => sc.includes(k)), `the story categories (${sc.join(', ')}), each Highlight icon's topic one of them`);
  ok(Object.values(HIGHLIGHT_ICONS).every((n) => symbolNames(ROOT).has(n)) && new Set(Object.values(HIGHLIGHT_ICONS)).size === Object.keys(HIGHLIGHT_ICONS).length, "every topic's Highlight icon is one of the app's, each its own");
  // the dice: a feature, the fewest sets first, then the one used longest ago; never a locked one, never the films' rotation
  const feats = cats.filter((c) => c.slides === true && c.feature !== false && c.dice !== false).map((c) => c.id);
  ok(slidesDice(cats, {}) === feats[0], `the dice with no set yet: the first feature (${slidesDice(cats, {})})`);
  const led = Object.fromEntries(feats.map((c, i) => [`r-test${i}-aaaa`, {id: `s${i + 1}-x`, category: c, at: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z`}]));
  ok(slidesDice(cats, led) === feats[0], `every feature made once: the one used longest ago (${slidesDice(cats, led)})`);
  led['r-more1-aaaa'] = {id: 's99-x', category: feats[0], at: '2026-10-30T10:00:00Z'};
  ok(slidesDice(cats, led) === feats[1], `the first made twice: the next (${slidesDice(cats, led)})`);
  ok(slidesDice(cats.filter((c) => c.id !== feats[1]), led) === feats[2], 'a feature waiting for its release (not in today\'s categories) is never rolled');
  ok(!['carinfo', 'general', 'whatsnew'].includes(slidesDice(cats, {})), 'the dice rolls an app feature, never car knowledge, the whole app or an announcement');
  ok(nextSlides(ROOT).startsWith('s'), `the next set number (${nextSlides(ROOT)})`);
  ok(symbolNames(ROOT).has('qr_code_2') && symbolNames(ROOT).size > 200, `the app's icons (${symbolNames(ROOT).size})`);
  console.log(bad ? `slides: ${bad} failed` : 'slides: all ok');
  return bad ? 1 : 0;
};

// ---- CLI ------------------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === '--test') process.exit(selfTest());
  else if (cmd === 'lint') {
    const id = rest[0];
    if (!ID_RE.test(String(id ?? ''))) {
      console.error('usage: node tools/ci/slides.mjs lint <s<n>-slug>');
      process.exit(2);
    }
    const spec = readJson(path.join(slidesDir(), `${id}.json`));
    if (!spec) {
      console.log(`ERROR specs/slides/${id}.json is missing or not valid JSON`);
      process.exit(1);
    }
    const {errors, warns} = lintSet(spec, {file: `${id}.json`, request: requestOf()});
    errors.forEach((e) => console.log(`ERROR ${e}`));
    warns.forEach((w) => console.log(`warning ${w}`));
    console.log(errors.length ? `${id}: ${errors.length} error${errors.length === 1 ? '' : 's'}` : `${id}: lint ok${warns.length ? `, ${warns.length} warning${warns.length === 1 ? '' : 's'} (fix them too)` : ''}`);
    process.exit(errors.length ? 1 : 0);
  } else if (cmd === 'record') {
    const id = rest[0];
    const i = rest.indexOf('--idea');
    if (!ID_RE.test(String(id ?? '')) || i < 0) {
      console.error('usage: node tools/ci/slides.mjs record <id> --idea "<one English line>"');
      process.exit(2);
    }
    recordSet(ROOT, id, {idea: rest[i + 1] ?? ''});
  } else if (cmd === 'resolve') process.stdout.write(`${resolveSet().id}\n`);
  else if (cmd === 'package') packageSet();
  else if (cmd === 'publish') publishSet(ROOT, {dryRun: rest.includes('--dry-run') || process.env.GITHUB_ACTIONS !== 'true'});
  else {
    console.error('usage: node tools/ci/slides.mjs --test | lint <id> | record <id> --idea "..." | resolve | package | publish [--dry-run]');
    process.exit(2);
  }
}
