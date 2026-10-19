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
// layouts, the first a "cover"; every one shows the REAL app in the big, FLAT iPhone, whole or rising from the bottom edge
// (cover, step, end), but a car-knowledge set's (PHONELESS: no app screen for a tip); a step teaches with an outline on its row,
// the tap, 1 to 3 numbered callouts and, for a small element, a loupe], "highlight": {"icon": the category's own (HIGHLIGHT_ICONS: one icon a topic,
// so his Highlights read as one set)}, "post": {"description", "tags"}}. The artifacts the site lists: slide-1.png ..
// slide-7.png (1080 x 1920), highlight.png, post.json ({"kind": "slides", "slides": n, ...}) and thumb.jpg.
// The dice (no category and no topic): slidesDice, the app feature with the fewest sets so far (specs/.slides.json), on a tie
// the one used longest ago, never one waiting for its App Store release; tools/ci/prompt.mjs rolls it.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeProbe} from '../../src/slides/probe.mjs';
import {bodyOf, CALLOUTS_MAX, CHIP, FLAT, headLines, KEY, layoutSet, layoutSlide, lookOf, LOOKS_OF, LOUPE, PHONE_LAYOUTS, placeOf, RISE, SLIDE_LAYOUTS, splitLines, STORY, STROKE, tangent, TYPE, WHOLE} from '../../src/slides/zone.mjs';
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
/** a callout's words: two or three words (the column beside the phone is narrow) */
export const CALLOUT_MAX_CHARS = 32;
/** Real screens that read badly in a WHOLE phone on a slide (the reviewer, 2026-10-19): the 1.0.4 home and menu were captured
 *  with the list scrolled under the floating bar, so their foot shows a half-hidden line of text that reads as a glitch. A
 *  set shows the feature's own screens; one of these only for the step that really happens there (a warning). */
export const SHY_SCREENS = Object.freeze({
  '23-home-104': 'its foot shows a half-hidden line under the floating bar',
  '25-menu-104': 'its foot shows a half-hidden line under the floating bar',
  '24-home-tip': 'its top shows the price scrolled under the status bar',
});
/** the story categories (ci/categories.json "slides": true), in its order; web/api/studio.js SLIDE_CATEGORIES, the page's
 *  SLIDE_CATS and the mock's list are the same (the Vinari repo's scripts/studio-lock-words-test.mjs checks them) */
export const slideCategories = (cats) => (Array.isArray(cats) ? cats : []).filter((c) => c?.slides === true).map((c) => c.id);
/** The Highlight cover's icon of each topic (the app's own icon of the feature, ui/FeaturesPanel.kt and the tab bar; the owner,
 *  2026-10-19: "a white background and in the middle the icon of what the topic is about", one consistent set). Every story
 *  category has its own, so a topic's covers match from set to set: the whole app (general) the car, car knowledge (carinfo)
 *  the bulb of a tip, the wallet the app's own „ჩემი საფულე" icon (android FeaturesPanel.kt). Never a set (free, stories):
 *  none. */
export const HIGHLIGHT_ICONS = Object.freeze({
  general: 'directions_car',
  carinfo: 'lightbulb',
  qr: 'qr_code_2',
  parking: 'local_parking',
  nav: 'navigation_fill',
  obd: 'obd_port',
  engine: 'stethoscope',
  vin: 'crop_free',
  reminders: 'calendar_month',
  auction: 'account_balance_wallet',
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

/** The capture probes (src/slides/probe.mjs): the render reads public/screens/<name>.jpg into a canvas, the lint and the check
 *  read the same pixels through PIL, so all three find the same element shapes and lay a slide out alike. null when the
 *  capture or python3 is missing (the layout then takes the spec's row as the element, its radius row.r or a default). */
const PROBES = new Map();
const PY_RGB = 'import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert("RGB")\nif im.size != (1080, 2346): im = im.resize((1080, 2346), Image.LANCZOS)\nsys.stdout.buffer.write(im.tobytes())';
export const captureProbe = (root, name) => {
  const key = `${root}|${name}`;
  if (PROBES.has(key)) return PROBES.get(key);
  let probe = null;
  const f = path.join(root, 'public/screens', `${name}.jpg`);
  if (/^[a-z0-9-]+$/.test(String(name)) && fs.existsSync(f)) {
    const r = spawnSync('python3', ['-c', PY_RGB, f], {maxBuffer: 32 << 20});
    if (r.status === 0 && r.stdout?.length === 1080 * 2346 * 3) probe = makeProbe({data: r.stdout, width: 1080, height: 2346, channels: 3});
  }
  PROBES.set(key, probe);
  return probe;
};
export const probesFor = (root = ROOT) => (name) => captureProbe(root, name);

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
const TEXT_KEYS = ['kicker', 'title', 'body', 'note', 'label', 'big', 'unit'];
/** a rail's label: one short line beside its chip */
export const LABEL_MAX_CHARS = 30;

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
  // the set's layout (src/slides/zone.mjs layoutSet), the elements measured on the captures (src/slides/probe.mjs)
  const lays = layoutSet(slides, {probeOf: probesFor(root)});
  slides.forEach((s, i) => {
    const at = `slides[${i}]`;
    if (!s || typeof s !== 'object') return E(`${at} is not an object`);
    if (!SLIDE_LAYOUTS.includes(s.layout)) return E(`${at}.layout "${String(s.layout ?? '')}" is one of ${SLIDE_LAYOUTS.join(', ')}`);
    const need = (k, why) => (typeof s[k] === 'string' && s[k].trim() ? true : (E(`${at} (${s.layout}) needs "${k}"${why ? `: ${why}` : ''}`), false));
    if (s.layout === 'cover') {
      need('title', 'the big headline, 1 or 2 short lines with "|"');
      need('screen', 'the real screen in the big phone');
    } else if (s.layout === 'step') {
      step += 1;
      if (s.n !== step) E(`${at}.n is ${JSON.stringify(s.n)}: the steps count 1, 2, 3 in order (this one is ${step})`);
      need('title', 'one verb and its object („გახსენი მენიუ")');
      need('screen', 'the real screen of this step');
      if (s.row === undefined && !(Array.isArray(s.callouts) && s.callouts.length)) Wn(`${at}: no "row" and no "callouts": a step teaches: the element in its outline ("row") and a look that points at it (callouts, rail, band or loupe)`);
    } else if (s.layout === 'end') {
      need('title', 'one short closing line');
      need('screen', 'one more real screen in the whole phone (the home, the result): every slide shows the app');
      if (s.row !== undefined || s.tap || s.lift || s.loupe || s.callouts !== undefined || s.label !== undefined) E(`${at} (end): no "row", "tap", "loupe", "label" or "callouts": the end shows the phone calm`);
      if (s.recap !== undefined && typeof s.recap !== 'boolean') E(`${at}.recap is true or false (the 1-2-3-check of the steps under the closing line; on by default)`);
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
        // a rising phone's foot runs off the frame: a capture glitched only at its foot reads well there
        if (SHY_SCREENS[scr] && !(PHONE_LAYOUTS.includes(s.layout) && placeOf(s) === 'rise' && /^its foot/.test(SHY_SCREENS[scr]))) Wn(`${at}.screen ${scr}: ${SHY_SCREENS[scr]} (a glitch in a whole phone): show the feature's own screen${s.layout === 'end' ? ' (its result)' : ''}; this one only for a step that really happens there`);
        if (cat && Array.isArray(cat.screens) && cat.screens.length && !cat.screens.includes(scr) && !['23-home-104', '25-menu-104', '24-home-tip'].includes(scr)) Wn(`${at}.screen ${scr} is not one of ${cat.id}'s screens (${cat.screens.join(', ')}): show the feature's own`);
      }
    }
    if (s.hand !== undefined) E(`${at}.hand: no hand on a slide (the phone stands alone, whole and big)`);
    if (s.yaw !== undefined || s.pitch !== undefined || s.roll !== undefined) E(`${at}: no "yaw", "pitch" or "roll": the phone stands FLAT and straight (the owner, 2026-10-19: never a tilted mockup)`);
    // the look (src/slides/zone.mjs LOOKS_OF) and the phone it implies
    const looks = LOOKS_OF[s.layout];
    if (s.look !== undefined && !(looks ?? []).includes(s.look)) E(`${at}.look "${String(s.look)}": a ${s.layout} takes ${looks ? looks.map((x) => `"${x}"`).join(', ') : 'no look (no phone)'}`);
    if (s.phone !== undefined) {
      if (!PHONE_LAYOUTS.includes(s.layout)) E(`${at}.phone: a ${s.layout} has no phone`);
      else if (s.layout === 'step') E(`${at}.phone: a step's look places its phone ("rail" and "band" rise from the bottom edge, "callouts" and "loupe" stand whole): drop "phone"`);
      else if (!['whole', 'rise'].includes(s.phone)) E(`${at}.phone is "rise" (the default, rising from the bottom edge) or "whole"`);
      else if (lookOf(s) !== 'plain') E(`${at}.phone: the ${lookOf(s)} look rises; "phone" only with the plain look`);
    }
    // the element that matters, the tap, the label, the loupe and the callouts (capture fractions, measured on
    // public/screens/<screen>.jpg)
    const lk = PHONE_LAYOUTS.includes(s.layout) ? lookOf(s) : null;
    if (PHONE_LAYOUTS.includes(s.layout) && s.layout !== 'end') {
      if (s.row !== undefined) {
        const r = s.row;
        const ok = r && typeof r === 'object' && Number.isFinite(r.y) && Number.isFinite(r.h) && r.y >= 0 && r.h > 0.01 && r.y + r.h <= 1 && r.h <= 0.5 && (r.x === undefined || (r.x >= 0 && r.x < 1)) && (r.w === undefined || (r.w > 0 && (r.x ?? 0.03) + r.w <= 1.001));
        if (!ok) E(`${at}.row is {y, h} (and x, w) as fractions of the capture, measured on public/screens/<screen>.jpg (1080 x 2346)`);
        if (r && typeof r === 'object' && r.r !== undefined && r.r !== 'pill' && !(Number.isFinite(r.r) && r.r >= 0 && r.r <= 400)) E(`${at}.row.r is the element's corner radius in capture px (0..400) or "pill"; leave it out and the render measures it`);
        if (r && typeof r === 'object' && Object.keys(r).some((k) => !['x', 'y', 'w', 'h', 'r'].includes(k))) E(`${at}.row has only "x", "y", "w", "h" and "r"`);
      } else if (s.tap || s.lift || s.loupe) E(`${at}: "tap" and "loupe" need a "row" (the element they point at)`);
      if (s.tap !== undefined && s.tap !== true && s.tap !== false && !(s.tap && typeof s.tap === 'object' && Number.isFinite(s.tap.x) && Number.isFinite(s.tap.y) && s.tap.x >= 0 && s.tap.x <= 1 && s.tap.y >= 0 && s.tap.y <= 1)) E(`${at}.tap is true (a ring on the row's empty part) or {"x", "y"} (its centre on the capture, fractions)`);
      if (s.lift !== undefined) Wn(`${at}.lift is the old name: write "look": "loupe"`);
      if (s.label !== undefined) {
        if (typeof s.label !== 'string' || !s.label.trim()) E(`${at}.label: 2 to 4 words beside the rail's chip`);
        else if ([...s.label].length > LABEL_MAX_CHARS) E(`${at}.label "${s.label.slice(0, 40)}" is ${[...s.label].length} characters (${LABEL_MAX_CHARS} at most: one short line)`);
      }
      if (s.callouts !== undefined) {
        const cs = s.callouts;
        if (lk !== 'callouts') E(`${at}.callouts: only the callouts look has callouts (this slide's look is ${lk})`);
        if (!Array.isArray(cs) || !cs.length) E(`${at}.callouts is a list of 1 to ${CALLOUTS_MAX} {"text", "x", "y"}`);
        else {
          if (cs.length > CALLOUTS_MAX) E(`${at}.callouts: ${cs.length} (${CALLOUTS_MAX} at most)`);
          cs.forEach((c, k) => {
            const w = `${at}.callouts[${k}]`;
            if (!c || typeof c !== 'object' || typeof c.text !== 'string' || !c.text.trim()) return E(`${w} is {"text", "x", "y"}: two or three words and the point its line ends on`);
            if (!(Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1)) E(`${w}: "x" and "y" are the element's point on the capture (fractions 0..1, measured on public/screens/<screen>.jpg)`);
            if ([...c.text].length > CALLOUT_MAX_CHARS) E(`${w}: "${c.text.slice(0, 40)}" is ${[...c.text].length} characters (${CALLOUT_MAX_CHARS} at most: two or three words)`);
            if (Object.keys(c).some((x) => !['text', 'x', 'y'].includes(x))) E(`${w} has only "text", "x" and "y" (the render numbers them 1, 2, 3 in order)`);
          });
          // the owner: phones BIG. Points all high on the screen read bigger on a rising phone
          if (s.layout === 'step' && cs.every((c) => Number(c?.y) <= 0.42) && (!s.row || Number(s.row.y) + Number(s.row.h) <= 0.42)) Wn(`${at}: every point sits in the top 42 % of the screen: "look": "rail" or "band" shows that part on a phone rising 82 % wide (bigger than a whole one)`);
        }
      }
    } else if ((s.callouts !== undefined || s.label !== undefined || s.look !== undefined) && s.layout !== 'end') E(`${at}: a ${s.layout} has no phone to point at (no "callouts", "label" or "look")`);
    if (s.screen !== undefined && !PHONE_LAYOUTS.includes(s.layout)) E(`${at}: a "screen" goes on a cover, a step or the end (the phone, big); a ${s.layout} has none`);
    // the layout and the Story's safe zone (src/slides/zone.mjs): what does not fit is refused before any render
    for (const p of (lays[i] ?? layoutSlide(s)).problems) E(`${at}: ${p}`);
    for (const n of lays[i]?.notes ?? []) Wn(`${at}: ${n}`);
    // the words (black or white type, Mkhedruli in the spec: mtav() sets the Mtavruli at render)
    const words = [...TEXT_KEYS.filter((k) => s[k] !== undefined).map((k) => [k, String(s[k])]), ...(Array.isArray(s.callouts) ? s.callouts : []).map((c, j) => [`callouts[${j}].text`, String(c?.text ?? '')])];
    for (const [k, v] of words) {
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
  // the owner: "all three are good": a set varies its looks (a rising phone, a whole one with callouts, a loupe)
  const stepLooks = slides.filter((s) => s?.layout === 'step').map((s) => lookOf(s));
  if (stepLooks.length >= 3 && new Set(stepLooks).size === 1) Wn(`every step takes the ${stepLooks[0]} look: vary them (a step whose element sits high rises: "rail" or "band"; a small element near the screen's edge: "loupe"; elements low or spread: "callouts")`);
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
const overlapsY = (a, b) => a.y < b.y + b.h && b.y < a.y + a.h;
const overlaps = (a, b) => overlapsY(a, b) && a.x < b.x + b.w && b.x < a.x + a.w;
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
  // Instagram's Story safe zone: x 65..1015, y 250..1580 (a picture's box is the drawing's field, full width: its pixels are
  // checked by tools/slides.mjs)
  ok(STORY.w === 1080 && STORY.h === 1920 && STORY.top === 250 && STORY.bottom === 1580 && STORY.edge === 65 && STORY.side >= STORY.edge && KEY < STORY.bottom, `the Story's safe zone is x ${STORY.edge}..${STORY.w - STORY.edge}, y ${STORY.top}..${STORY.bottom} of 1080 x 1920 (the text ${STORY.side} px in, every graphic's point above ${KEY})`);
  const inside = (r) => Object.entries(r.boxes).every(([k, b]) => k === 'phone' || k === 'outline' || (b.y >= STORY.top - 0.5 && b.y + b.h <= STORY.bottom + 0.5 && (k === 'picture' ? b.x >= -0.5 && b.x + b.w <= STORY.w + 0.5 : b.x >= STORY.edge - 0.5 && b.x + b.w <= STORY.w - STORY.edge + 0.5)));
  // the flat phone has the 3D iPhone's proportions: zone.mjs FLAT is src/scenes/kit/phone3d.tsx's bezel, screen corner, capture
  const p3 = fs.readFileSync(path.join(ROOT, 'src/scenes/kit/phone3d.tsx'), 'utf8');
  const num = (re) => Number(re.exec(p3)?.[1]);
  const bez = num(/const BEZ = ([\d.]+);/);
  const scrR = num(/const SCR_R = ([\d.]+);/);
  const sw = num(/export const SRC_W = (\d+);/);
  const sh = num(/export const SRC_H = (\d+);/);
  ok(near(FLAT.bez, bez) && near(FLAT.r, scrR) && near(FLAT.sh, sh / sw), `zone.mjs FLAT is phone3d.tsx's iPhone (bezel ${bez}, screen corner ${scrR}, ${sw} x ${sh})`);
  const b500 = bodyOf(500);
  ok(near(b500.w, 500 * (1 + 2 * bez)) && near(b500.h, 500 * (sh / sw + 2 * bez)), `bodyOf: a display 500 px wide is a body ${Math.round(b500.w)} x ${Math.round(b500.h)}`);
  // the render draws it flat (no 3D phone, no turn, no shadow: "no tilted, bent mockup"), no veil over the screen (A's veil
  // made the screens look disabled), every outline through the layout's own radius (no fixed corner: the owner's complaint)
  const tsx = fs.readFileSync(path.join(ROOT, 'src/slides/Slides.tsx'), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Phone3|atFoot|\byaw\b|perspective\(|rotate[XYZ3]?\(|drop-shadow|boxShadow: '0 /.test(tsx), 'Slides.tsx draws the phone flat (no Phone3, no yaw, no perspective, no rotation, no drop shadow)');
  ok(!/veil|fillOpacity|opacity=\{0\.|rgba\(255, ?255, ?255, ?0\.[1-9]/.test(tsx), 'no veil over the screen and no see-through fill on it (A\'s veil made the screens look disabled)');
  ok(!/\brx=\{/.test(tsx) && /roundRect\(b, r\)/.test(tsx) && /borderRadius: lp\.r/.test(tsx), 'every outline and the loupe frame take the layout\'s concentric radius (no fixed corner in Slides.tsx)');

  // ---- the concentric rule, on the real captures (src/slides/probe.mjs) --------------------------------------------------
  const probeOf = probesFor(ROOT);
  const pr = probeOf('19-nav-streets-offer');
  ok(Boolean(pr), 'the captures are read (python3 + PIL), so the outlines hug the real elements');
  const shapeOf = (scr, r) => probeOf(scr)?.shape({x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h});
  const SH = [
    ['19-nav-streets-offer', {x: 0.05, y: 0.814, w: 0.9, h: 0.062}, 'pill', '„ჩამოტვირთვა · ~97 MB" (the owner\'s example)'],
    ['08-qr-card', {x: 0.045, y: 0.648, w: 0.91, h: 0.054}, 'pill', '„ამობეჭდვა და გაზიარება"'],
    ['20-nav-streets-settings', {x: 0.79, y: 0.371, w: 0.13, h: 0.037}, 'pill', 'the street names toggle'],
    ['18-nav-lock-screen', {x: 0.036, y: 0.716, w: 0.928, h: 0.142}, [52, 66], 'the lock screen card (20 pt corners)'],
    ['15-qr-web', {x: 0.03, y: 0.336, w: 0.94, h: 0.092}, [38, 56], 'a dashed option box (its line, no fill of its own)'],
    ['25-menu-104', {x: 0.512, y: 0.672, w: 0.185, h: 0.067}, [44, 60], 'a menu tile'],
    ['17-nav-drive', {x: 0.03, y: 0.071, w: 0.94, h: 0.124}, [105, 130], "the navigator's banner"],
  ];
  for (const [scr, r, want, name] of SH) {
    const s = shapeOf(scr, r);
    const good = s && s.found && (want === 'pill' ? s.pill && near(s.r, Math.min(s.x1 - s.x0, s.y1 - s.y0) / 2, 0.6) : !s.pill && s.r >= want[0] && s.r <= want[1]);
    ok(good, `probe: ${name} is ${want === 'pill' ? 'a pill' : `corners r ${want[0]}..${want[1]}`} (found ${s ? `${s.pill ? 'a pill' : `r ${s.r}`}, x ${Math.round(s.x0)}..${Math.round(s.x1)}, y ${Math.round(s.y0)}..${Math.round(s.y1)}` : 'nothing'})`);
  }
  // the outline: an even gap, its radius the element's + the gap (a pill's outline a pill), never touching the element
  const conc = (lay) => {
    const E = lay.element;
    const o = lay.outline;
    if (!E || !o) return false;
    const g = o.gap + STROKE.outline / 2;
    const even = near(E.x - o.x, g, 0.01) && near(E.y - o.y, g, 0.01) && near(o.x + o.w - (E.x + E.w), g, 0.01) && near(o.y + o.h - (E.y + E.h), g, 0.01);
    return even && near(o.r, E.r + g, 0.01) && o.gap >= STROKE.gapMin && (!o.pill || near(o.r, o.h / 2, 0.6) || near(o.r, o.w / 2, 0.6));
  };
  const pill = layoutSlide({layout: 'step', n: 1, title: 'დაამატე ქუჩები', screen: '19-nav-streets-offer', row: {x: 0.05, y: 0.814, w: 0.9, h: 0.062}, tap: true, callouts: [{text: 'ერთხელ, ~97 MB', x: 0.3, y: 0.845}]}, {steps: 3, probe: pr});
  ok(conc(pill) && pill.outline.pill && near(pill.outline.r, pill.outline.h / 2, 0.6), `the pill „ჩამოტვირთვა · ~97 MB" gets a PILL outline, ${pill.outline?.gap} px all round (radius ${pill.outline?.r.toFixed(1)} = its height / 2)`);
  ok(Boolean(pill.tap) && pill.tap.x > pill.element.x + pill.element.w * 0.62 && pill.tap.x + pill.tap.r < pill.element.x + pill.element.w, "the tap ring sits on the pill's empty right part, inside it (its words stay readable)");
  const card = layoutSlide({layout: 'step', n: 3, title: 'ჩაკეტე ეკრანი', screen: '18-nav-lock-screen', row: {x: 0.036, y: 0.716, w: 0.928, h: 0.142}, callouts: [{text: 'ისარი და მანძილი', x: 0.1, y: 0.775}]}, {steps: 3, probe: probeOf('18-nav-lock-screen')});
  ok(conc(card) && !card.outline.pill && card.outline.r > card.outline.gap + 10, `a card's outline: its own corners + the gap (r ${card.element?.r.toFixed(1)} + ${(card.outline?.gap + STROKE.outline / 2).toFixed(1)} = ${card.outline?.r.toFixed(1)})`);
  const given = layoutSlide({layout: 'step', n: 1, title: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054, r: 'pill'}, callouts: [{text: 'დაბეჭდე', x: 0.3, y: 0.675}]}, {steps: 3});
  ok(conc(given) && given.outline.pill, 'without the capture, "r": "pill" in the spec still gives a pill outline');
  const blind = layoutSlide({layout: 'step', n: 1, title: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054, r: 24}, callouts: [{text: 'დაბეჭდე', x: 0.3, y: 0.675}]}, {steps: 3});
  ok(conc(blind) && near(blind.element.r, 24 * (blind.screen.w / 1080), 0.01), "a numeric row.r (capture px) is the element's radius, scaled with the phone");

  // the outline never cuts a label: a row that ends inside the tile's label under it is a warning, one that takes it in is not
  const cutsLabel = (h) => layoutSlide({layout: 'step', n: 1, title: 'გახსენი', screen: '25-menu-104', row: {x: 0.512, y: 0.672, w: 0.185, h}}, {steps: 3, probe: probeOf('25-menu-104')}).notes.some((n) => /runs through words/.test(n));
  ok(cutsLabel(0.067) && !cutsLabel(0.093), "an outline through the tile's label is a warning; the row that takes the label in is not");
  // the tap ring covers no word: on „ამობეჭდვა და გაზიარება" it finds the pill's empty end (a smaller ring there)
  const prn = layoutSlide({layout: 'step', n: 2, title: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054}, tap: true, callouts: [{text: 'დაბეჭდე', x: 0.3, y: 0.675}]}, {steps: 3, probe: probeOf('08-qr-card')});
  const kq = prn.screen.w / 1080;
  ok(Boolean(prn.tap) && probeOf('08-qr-card').clean((prn.tap.x - prn.screen.x) / kq, (prn.tap.y - prn.screen.y) / kq, (prn.tap.r + 5) / kq), `the tap ring on „ამობეჭდვა და გაზიარება" sits clear of its words (r ${prn.tap?.r})`);

  // ---- every look: inside the zone, the phone big and placed as the look says ---------------------------------------------
  const long = 'ძალიან გრძელი სათაური, რომელიც ორ ხაზზე იშლება';
  const cases = [
    {layout: 'cover', kicker: 'როგორ მუშაობს', title: 'QR ბარათი', screen: '08-qr-card'},
    {layout: 'cover', look: 'band', kicker: 'როგორ მუშაობს', title: 'QR ბარათი', body: 'მინაზე დადე, ნომრის ნაცვლად.', screen: '08-qr-card', row: {x: 0.126, y: 0.151, w: 0.748, h: 0.192}},
    {layout: 'cover', look: 'rail', kicker: 'როგორ მუშაობს', title: 'ქართული | ნავიგატორი', label: 'ხმით გეტყვის, სად მოუხვიო', screen: '17-nav-drive', row: {x: 0.03, y: 0.071, w: 0.94, h: 0.124}},
    {layout: 'cover', phone: 'whole', title: 'QR ბარათი', body: 'ნომრის ნაცვლად, მინაზე.', screen: '08-qr-card'},
    {layout: 'step', look: 'rail', n: 3, title: 'დაასკანერებენ', label: 'მიზეზს აირჩევენ', screen: '15-qr-web', row: {x: 0.03, y: 0.336, w: 0.94, h: 0.092}, tap: true},
    {layout: 'step', look: 'band', n: 2, title: 'მოარგე', body: 'ქუჩის სახელებსაც გეტყვის.', screen: '20-nav-streets-settings', row: {x: 0.03, y: 0.355, w: 0.94, h: 0.115}},
    {layout: 'step', n: 2, title: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054}, tap: true, callouts: [{text: 'შენი QR კოდი', x: 0.13, y: 0.247}, {text: 'დაბეჭდე ან გააზიარე', x: 0.3, y: 0.675}, {text: 'ან შეინახე ფოტოდ', x: 0.1, y: 0.74}]},
    {layout: 'step', n: 1, title: 'დაამატე ქუჩები', screen: '19-nav-streets-offer', row: {x: 0.05, y: 0.814, w: 0.9, h: 0.062}, tap: true, callouts: [{text: 'ჯერ მოუსმინე', x: 0.06, y: 0.49}, {text: 'აირჩიე ხმა', x: 0.06, y: 0.564}, {text: 'ერთხელ, ~97 MB', x: 0.3, y: 0.845}]},
    {layout: 'step', n: 3, title: 'დააჭირე | სკანირებას', body: 'ოთხ წამში ნახავ, რა სჭირს.', screen: '21-obd-hub', row: {y: 0.3, h: 0.08}, tap: true},
    {layout: 'step', look: 'loupe', n: 2, title: 'მოარგე ხმას', body: 'ქუჩის სახელებსაც გეტყვის.', screen: '20-nav-streets-settings', row: {x: 0.79, y: 0.371, w: 0.13, h: 0.037}},
    {layout: 'step', look: 'loupe', n: 1, title: 'გახსენი მენიუ', body: 'QR ბარათი მენიუშია.', screen: '25-menu-104', row: {x: 0.512, y: 0.672, w: 0.185, h: 0.067}},
    {layout: 'end', title: 'ნომერი აღარ | გჭირდება', note: 'iPhone და Android', screen: '23-home-104'},
    {layout: 'end', title: 'შენი მანქანის | ყველაფერი', body: 'ერთი კვირა უფასოდ სცადე, ჩამოტვირთე და ნახე.', screen: '23-home-104'},
    {layout: 'picture', title: 'რა არის OBD', picture: {kind: 'icon', name: 'speed'}},
    {layout: 'picture', title: 'რა არის | OBD ბუდე', body: long, note: 'საჭის ქვეშ', picture: {kind: 'car'}},
    {layout: 'fact', big: '15', title: 'წამი'},
    {layout: 'fact', icon: 'speed', big: '300 000', unit: '₾', title: 'ამდენი | დაგიჯდება', body: long, note: 'შენი ფასი'},
  ];
  const seen = new Set();
  for (const c of cases) {
    const r = layoutSlide(c, {steps: 3, probe: c.screen ? probeOf(c.screen) : null});
    const name = `${c.layout}${r.look ? ` (${r.look})` : ''} "${String(c.title).slice(0, 24)}"`;
    if (r.look) seen.add(r.look);
    ok(inside(r), `${name}: every box inside the safe zone (${Object.entries(r.boxes).filter(([k]) => k !== 'phone').map(([k, b]) => `${k} ${Math.round(b.y)}-${Math.round(b.y + b.h)}`).join(', ')})`);
    ok(!r.problems.length, `${name}: fits (${r.problems.join('; ') || 'no problem'})`);
    ok(Boolean(r.phone) === PHONE_LAYOUTS.includes(c.layout), `${name}: ${PHONE_LAYOUTS.includes(c.layout) ? 'shows the phone' : 'no phone (a car-knowledge set only)'}`);
    if (!r.phone) continue;
    const p = r.phone;
    const btn = FLAT.btn * p.d + 1;
    const sides = p.x - btn >= STORY.edge && p.x + p.w + btn <= STORY.w - STORY.edge && p.y >= STORY.top;
    if (r.mode === 'whole') {
      // the owner, 2026-10-19: BIG, its top and sides inside the zone, its foot never cut by the frame
      ok(sides && p.h >= WHOLE.minH && p.y + p.h <= WHOLE.footMax + 0.5, `${name}: the whole phone big (${Math.round(p.w)} x ${Math.round(p.h)}, ${Math.round((p.h / STORY.h) * 100)} % of the frame's height), its top and sides inside the zone, its foot at ${Math.round(p.y + p.h)} (never cut)`);
    } else {
      const share = p.w / STORY.w;
      const want = r.look === 'plain' ? RISE.plain : r.look === 'band' ? RISE.band : (RISE.right - RISE.railX - RISE.railGap) / STORY.w;
      ok(sides && near(share, want, 0.002) && p.y + p.h > STORY.h && r.vis >= RISE.minVis, `${name}: the phone rises from the bottom edge, ${Math.round(share * 100)} % of the frame wide, its top at y ${Math.round(p.y)}, ${Math.round(r.vis * 100)} % of its screen inside the zone`);
    }
    if (r.outline) ok(conc(r) && r.outline.y + r.outline.h + STROKE.outline <= KEY + 0.5, `${name}: the outline concentric with its element (${r.outline.pill ? 'a pill' : `r ${r.element.r.toFixed(1)} + ${(r.outline.gap + STROKE.outline / 2).toFixed(1)}`}), above the reply bar`);
    // the text above the phone (the look's own words beside it)
    const text = Object.entries(r.boxes).filter(([k]) => !['phone', 'outline', 'loupe', 'cap'].includes(k) && !/^call/.test(k));
    ok(text.every(([, x]) => x.y + x.h <= p.y - 20), `${name}: the text ends above the phone (${Math.round(Math.max(...text.map(([, x]) => x.y + x.h)))} < ${Math.round(p.y)})`);
    for (const c2 of r.callouts) {
      const onOutline = r.outline && (near(c2.dot.x, r.outline.x, 0.5) || near(c2.dot.y, r.outline.y, 0.5) || near(c2.dot.y, r.outline.y + r.outline.h, 0.5));
      const pc = {x: ((c2.dot.x - r.screen.x) / r.screen.w) * 1080, y: ((c2.dot.y - r.screen.y) / r.screen.h) * 2346};
      const clean = onOutline || probeOf(c.screen)?.clean(pc.x, pc.y, (STROKE.dot + 2) / (r.screen.w / 1080));
      ok(c2.box.x + c2.box.w <= p.x && c2.dot.y <= KEY && clean, `${name}: callout ${c2.n} in the column left of the phone, its dot ${onOutline ? 'on the outline' : 'on a clean spot'} (never on a word or a digit)`);
    }
    if (r.rail) ok(r.rail.path[0].y > r.rail.chip.y + CHIP && r.rail.path[1].x < p.x - 10 && (near(r.rail.dot.x, r.outline.x, 0.5) || near(r.rail.dot.y, r.outline.y, 0.5) || near(r.rail.dot.y, r.outline.y + r.outline.h, 0.5)), `${name}: the rail runs from the chip down the gutter left of the phone and ends on the outline`);
    if (r.band) ok(r.band.left[0].x < p.x - 4 && r.band.right[1].x > p.x + p.w + 4 && r.band.right[1].x + STROKE.dot <= STORY.w - STORY.edge && near(r.band.right[0].x, r.outline.x + r.outline.w, 0.5), `${name}: the band runs across the row past both edges of the phone, its ends inside the zone`);
    if (r.loupe) {
      const L2 = r.loupe;
      const pad = (L2.crop.x1 - L2.crop.x0 - (r.element.w / (r.screen.w / 1080))) / 2;
      const tangentOk = L2.lines.every(([a, b]) => Number.isFinite(a.x + a.y + b.x + b.y) && Math.hypot(b.x - a.x, b.y - a.y) > 10);
      ok(!overlaps(L2.box, {x: p.x - 10, y: p.y, w: p.w + 20, h: p.h}) && L2.grow >= LOUPE.minGrow && near(L2.r, (r.element.r / (r.screen.w / 1080) + pad) * L2.k, 0.6) && tangentOk, `${name}: the loupe ${L2.grow.toFixed(1)} times the element, beside the phone (never over it), its frame concentric (r ${L2.r.toFixed(1)}), its lines tangent to both`);
    }
    if (r.recap) ok(r.recap.n === 3 && r.recap.box.y + r.recap.box.h < p.y, `${name}: the recap 1-2-3-check under the closing line`);
  }
  ok(['plain', 'rail', 'band', 'callouts', 'loupe'].every((x) => seen.has(x)), `every look is laid out (${[...seen].join(', ')})`);
  // a tangent touches both circles (its points a radius from the centres, square to the radius)
  const ca = {x: 100, y: 100, r: 30};
  const cb = {x: 400, y: 160, r: 60};
  const [ta, tb] = tangent(ca, cb, -1);
  const dirT = {x: tb.x - ta.x, y: tb.y - ta.y};
  ok(near(Math.hypot(ta.x - ca.x, ta.y - ca.y), 30, 1e-6) && near(Math.hypot(tb.x - cb.x, tb.y - cb.y), 60, 1e-6) && near((ta.x - ca.x) * dirT.x + (ta.y - ca.y) * dirT.y, 0, 1e-6) && ta.y < ca.y, "tangent(): the loupe's line touches both corner circles, over them");
  // the headline: one line while it can (A), left at the text's margin, huge
  const cv = layoutSlide(cases[0]);
  ok(cv.sizes.headLines.length === 1 && Math.abs(cv.boxes.head.x - STORY.side) <= 2 && cv.sizes.head >= 170, `the cover's headline stays ONE line, left at x ${Math.round(cv.boxes.head.x)}, ${cv.sizes.head} px (the covers' huge type)`);
  ok(headLines('ძალიან გრძელი სათაური ორ ხაზზე', TYPE.head).length === 2, 'a headline too long for one big line breaks in two');
  // what cannot fit is a problem the lint refuses, never a box past the zone
  const over = layoutSlide({layout: 'step', n: 1, title: 'ა | ბ | გ | დ', body: `${long} ${long} ${long} ${long}`, screen: '08-qr-card'});
  ok(over.problems.length > 0, `too much text on a step is refused (${over.problems[0] ?? 'nothing'})`);
  ok(inside(over), 'and even then nothing is placed past the zone');
  const P = (s) => layoutSlide(s, {steps: 3, probe: s.screen ? probeOf(s.screen) : null}).problems;
  ok(P({layout: 'step', look: 'rail', n: 1, title: 'დაბეჭდე', label: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054}}).some((p) => /below what the rising phone shows/.test(p)), 'a row low on its screen is refused on a rising look (rail, band)');
  ok(P({layout: 'step', look: 'rail', n: 1, title: 'დაასკანერებენ', screen: '15-qr-web', row: {x: 0.03, y: 0.336, w: 0.94, h: 0.092}}).some((p) => /needs a "label"/.test(p)), 'the rail needs its label');
  ok(P({layout: 'step', look: 'loupe', n: 1, title: 'დაბეჭდე', screen: '08-qr-card', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054}}).some((p) => /small element/.test(p)), 'a loupe of a wide row is refused (it would not enlarge it)');
  ok(P({layout: 'step', look: 'loupe', n: 1, title: 'დაბეჭდე', screen: '08-qr-card'}).some((p) => /needs a "row"/.test(p)), 'a loupe needs its row');
  const call = (n) => Array.from({length: n}, (_, i) => ({text: 'ღილაკი', x: 0.1, y: 0.2 + i * 0.15}));
  ok(P({layout: 'step', n: 1, title: 'გახსენი', screen: '08-qr-card', callouts: call(4)}).some((p) => /4 callouts/.test(p)), 'four callouts are refused (three at most)');
  ok(P({layout: 'end', title: 'ბოლო', screen: '23-home-104', callouts: call(1)}).some((p) => /calm/.test(p)), 'the end takes no callout');
  ok(P({layout: 'cover', title: 'QR', screen: '08-qr-card', look: 'plain', row: {y: 0.3, h: 0.1}}).some((p) => /calm/.test(p)), 'a plain cover points at nothing (rail or band for that)');
  // a set: the steps counted, the end's recap counts them
  const set3 = layoutSet([cases[1], cases[10], cases[6], cases[4], cases[11]], {probeOf});
  ok(set3.filter((l) => l.layout === 'step').map((l) => l.sizes.kicker).join(' · ') === 'ნაბიჯი 1 / 3 · ნაბიჯი 2 / 3 · ნაბიჯი 3 / 3' && set3[4].recap?.n === 3, 'the steps count "ნაბიჯი 1 / 3" .. "3 / 3", the end recaps 1-2-3-check');
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
      {layout: 'end', title: 'ნომერი აღარ | გჭირდება', screen: '23-home-104'},
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
  ok(lint(set({slides: sl(1, {yaw: 4})})).errors.some((e) => /FLAT/.test(e)), 'no turn at all: the phone stands flat and straight');
  ok(lint(set({slides: sl(0, {phone: 'tilted'})})).errors.some((e) => /"rise".*"whole"/.test(e)), 'a cover\'s "phone" is "rise" or "whole"');
  ok(lint(set({slides: sl(1, {phone: 'rise'})})).errors.some((e) => /look places its phone/.test(e)), "a step's phone is its look's (rail and band rise, callouts and loupe stand whole)");
  ok(lint(set({slides: sl(1, {look: 'tilted'})})).errors.some((e) => /takes "callouts", "rail", "band", "loupe"/.test(e)), 'a look is one of its layout\'s');
  ok(lint(set({slides: sl(1, {look: 'rail', label: 'მიზეზს აირჩევენ', callouts: [{text: 'ღილაკი', x: 0.1, y: 0.3}]})})).errors.some((e) => /only the callouts look/.test(e)), 'callouts only on the callouts look');
  ok(lint(set({slides: sl(1, {look: 'rail', label: 'ერთი ძალიან გრძელი წარწერა ჩიპის გვერდით'})})).errors.some((e) => /one short line/.test(e)), "a rail's label is one short line");
  ok(lint(set({slides: sl(1, {tap: {x: 2, y: 0.3}})})).errors.some((e) => /\.tap is true/.test(e)) && lint(set({slides: sl(1, {tap: {x: 0.8, y: 0.33}})})).errors.length === 0, '"tap" is true or a point on the capture');
  ok(lint(set({slides: sl(1, {row: {y: 0.3, h: 0.08, r: 'round'}})})).errors.some((e) => /row\.r/.test(e)) && lint(set({slides: sl(1, {row: {y: 0.3, h: 0.08, r: 'pill'}})})).errors.length === 0, 'row.r is a radius in capture px or "pill"');
  // the owner, 2026-10-19: every slide shows the phone
  ok(lint(set({slides: sl(3, {screen: undefined})})).errors.some((e) => /needs "screen"/.test(e)), 'the end shows the phone too (a screen)');
  ok(lint(set({slides: [...set().slides.slice(0, 3), {layout: 'fact', big: '15', title: 'წამი'}, set().slides[3]]})).errors.some((e) => /has no phone/.test(e)), 'a fact in a feature set is refused (every slide shows the phone)');
  ok(lint(set({slides: [set().slides[0], {layout: 'picture', title: 'მანქანა', picture: {kind: 'car'}}, ...set().slides.slice(1)]})).errors.some((e) => /has no phone/.test(e)), 'a picture in a feature set is refused');
  const tip = set({id: 's1-antifreeze', category: 'carinfo', topic: 'ანტიფრიზი', highlight: {icon: 'lightbulb'}, slides: [{layout: 'cover', title: 'ანტიფრიზი | ზამთრისთვის', screen: '24-home-tip'}, {layout: 'fact', big: '-45', unit: '°C', title: 'ნარევი იყინება'}, {layout: 'picture', title: 'სუფთა არა', picture: {kind: 'icon', name: 'ac_unit'}}, {layout: 'end', title: 'ზამთარს მზად დახვდი', screen: '23-home-104'}], post: {description: 'ზამთარი ახლოსაა. შენი ანტიფრიზი მზადაა?', tags: ['#მანქანა', '#ზამთარი', '#cartips']}});
  ok(!lint(tip).errors.some((e) => /has no phone/.test(e)), `a car-knowledge set may draw a fact and a picture (${lint(tip).errors.join('; ') || 'ok'})`);
  ok(lint(set({slides: sl(3, {row: {y: 0.3, h: 0.1}, tap: true})})).errors.some((e) => /end\): no "row"/.test(e)), 'the end shows the phone calm (no row, no tap)');
  ok(lint(set({slides: [set().slides[0], set().slides[3], ...set().slides.slice(1, 3)]})).errors.some((e) => /the last slide/.test(e)), 'the end is the last slide');
  const tile = {look: 'loupe', tap: undefined, title: 'გახსენი მენიუ', body: 'QR ბარათი მენიუშია.', screen: '25-menu-104', row: {x: 0.512, y: 0.672, w: 0.185, h: 0.067}};
  ok(lint(set({slides: sl(1, tile)})).errors.length === 0, `a small tile enlarged in a loupe passes (${lint(set({slides: sl(1, tile)})).errors.join('; ') || 'ok'})`);
  ok(lint(set({slides: sl(1, {...tile, tap: true})})).errors.some((e) => /no "tap"/.test(e)), 'a loupe takes no tap ring (the loupe shows the element big)');
  ok(lint(set({slides: sl(1, {look: 'loupe', row: {x: 0.045, y: 0.648, w: 0.91, h: 0.054}})})).errors.some((e) => /small element/.test(e)), 'a wide row in a loupe is refused (callouts, rail or band instead)');
  ok(lint(set({slides: sl(1, {...tile, look: undefined, lift: true})})).warns.some((w) => /old name/.test(w)), 'the old "lift" is a warning: "look": "loupe"');
  ok(lint(set({slides: sl(1, {callouts: [{text: 'ღილაკი', x: 0.5, y: 0.3}, {text: 'მენიუ', x: 0.5, y: 0.5}, {text: 'ფოტო', x: 0.5, y: 0.6}, {text: 'ბარათი', x: 0.5, y: 0.7}]})})).errors.some((e) => /3 at most/.test(e)), 'four callouts on a step are refused');
  ok(lint(set({slides: sl(1, {callouts: [{text: 'ჩამოტვირთე აპი', x: 0.5, y: 0.3}]})})).errors.some((e) => /callouts\[0\]\.text: a call to action/.test(e)), "a callout's words pass the same word checks");
  ok(lint(set({slides: sl(1, {callouts: [{text: 'ღილაკი', x: 1.4, y: 0.3}]})})).errors.some((e) => /fractions 0\.\.1/.test(e)), "a callout's point is on the capture");
  ok(lint(set({slides: sl(1, {callouts: [{text: 'ერთი ძალიან გრძელი წარწერა, რომელიც არ ეტევა', x: 0.5, y: 0.3}]})})).errors.some((e) => /characters/.test(e)), 'a long callout is refused (two or three words)');
  ok(lint(set({slides: sl(3, {callouts: [{text: 'ღილაკი', x: 0.5, y: 0.3}]})})).errors.some((e) => /end\): no/.test(e)), 'the end takes no callout');
  ok(lint(set({slides: sl(0, {row: {y: 0.8, h: 0.06}, body: 'მინაზე დადე.'})})).errors.some((e) => /rising phone shows/.test(e)) && lint(set({slides: sl(1, {row: {y: 0.8, h: 0.06}})})).errors.length === 0, 'a row low on the screen: refused on a rising look, fine on a whole phone (callouts)');
  const same = set({slides: [set().slides[0], ...[1, 2, 3].map((n) => ({layout: 'step', n, title: 'გახსენი', screen: ['08-qr-card', '15-qr-web', '25-menu-104'][n - 1], row: {y: 0.75, h: 0.05}})), set().slides[3]]});
  ok(lint(same).warns.some((w) => /vary them/.test(w)), 'three steps in one look: a warning to vary them (the owner: all three looks are good)');
  ok(lint(set({slides: sl(1, {callouts: [{text: 'ღილაკი', x: 0.1, y: 0.2}], row: undefined, tap: undefined})})).warns.some((w) => /top 42 %/.test(w)), 'callouts all high on the screen: a warning, a rising look shows them bigger');
  ok(lint(set({category: 'stories'})).errors.some((e) => /not a story category/.test(e)), 'a category that is not a story one is refused');
  ok(lint(set({id: 'S1_x'})).errors.some((e) => /s<n>-<slug>/.test(e)), 'the id');
  ok(lintSet(set(), {root: ROOT, file: 's1-qr-card.json', request: {lockedScreens: ['15-qr-web']}, others: []}).errors.some((e) => /LOCKED/.test(e)), 'a locked screen is refused');
  ok(lintSet(set(), {root: ROOT, file: 's1-qr-card.json', others: [{...set(), id: 's0-old'}]}).errors.some((e) => /cover headline/.test(e)), 'the same cover headline as an earlier set');
  // the example the cloud Claude copies (ci/slides.md: "a good set: copy its shape") passes, and shows the phone on every slide
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'ci/slides-example.json'), 'utf8'));
  const exl = lintSet(ex, {root: ROOT, file: `${ex.id}.json`, others: []});
  ok(exl.errors.length === 0 && exl.warns.length === 0, `ci/slides-example.json passes the lint with no warning (${[...exl.errors, ...exl.warns].join('; ') || 'ok'})`);
  ok(ex.slides.every((x) => PHONE_LAYOUTS.includes(x.layout) && x.screen), 'and every slide of it shows the phone on a real screen');
  ok(new Set(ex.slides.map((x) => lookOf(x))).size >= 3, `and it varies its looks (${ex.slides.map((x) => lookOf(x)).join(', ')})`);
  // the story categories and their icons
  const cats = readJson(path.join(ROOT, 'ci/categories.json'), {})?.categories ?? [];
  const sc = slideCategories(cats);
  ok(sc.length >= 10 && !sc.includes('stories') && !sc.includes('free') && Object.keys(HIGHLIGHT_ICONS).every((k) => sc.includes(k)), `the story categories (${sc.join(', ')}), each Highlight icon's topic one of them`);
  ok(Object.values(HIGHLIGHT_ICONS).every((n) => symbolNames(ROOT).has(n)) && new Set(Object.values(HIGHLIGHT_ICONS)).size === Object.keys(HIGHLIGHT_ICONS).length, "every topic's Highlight icon is one of the app's, each its own");
  ok(sc.every((k) => HIGHLIGHT_ICONS[k]), `every story category has its fixed Highlight icon, so its covers match from set to set (${sc.filter((k) => !HIGHLIGHT_ICONS[k]).join(', ') || 'all'})`);
  ok(HIGHLIGHT_ICONS.auction === 'account_balance_wallet' && HIGHLIGHT_ICONS.general === 'directions_car' && HIGHLIGHT_ICONS.carinfo === 'lightbulb', 'the wallet is the app\'s „ჩემი საფულე" icon (never the price tag), the whole app the car, car knowledge the bulb');
  ok(lint(set({slides: sl(3, {phone: 'whole'})})).warns.some((w) => /23-home-104: its foot/.test(w)) && !lint(set()).warns.some((w) => /half-hidden/.test(w)) && !lint(set({slides: sl(3, {screen: '08-qr-card', phone: 'whole'})})).warns.some((w) => /half-hidden/.test(w)), 'a capture glitched at its foot is a warning in a whole phone, not on a rising one (its foot runs off the frame), the feature\'s own screen never');
  ok(ex.category !== slidesDice(cats, {}), `the example is not the first set the dice rolls (${ex.category} vs ${slidesDice(cats, {})}): the first set never echoes it`);
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
