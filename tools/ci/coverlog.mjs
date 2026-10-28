// The page's cover ledger and the variety rule (2026-10-27, after the owner's „ეს ტელეფონის ქავერი მოქაფში ერთდაიგივეებია":
// 6 of 11 new covers were the same tilted phone, two of them the same parking screen).
//
// specs/.covers.jsonl: append-only, one line per published cover, written by tools/ci/publish.mjs from out/<id>.cover.json
// (tools/covers.mjs), committed in a commit of its own so a test film's revert never takes it back:
//   {"at","req","id","cat","comp","asset","pose","variant","look","test","sig"}
// "look": what the tile shows, as the layout drew it (src/cover/comps.mjs lookOf: card, dark, type, photo, screen); an older
// line without it is read by its composition's name. "test": the gallery hides the agents' test films (r-pwr*, r-p2x*, meta
// "test": web/api/studio.js, 2026-10-27), so the rules read only the lines the page shows. Order: by "at" (the publish
// time), newest first; never by film number.
//
// The rules (COVER_REPEAT). The gallery is newest first in 3 columns, so the new cover's neighbours are the newest cover
// (beside it) and the cover 3 places back (the tile above or below it), and one phone screen of the gallery shows about 12
// tiles (round 3, the judges: the same home screen came back 8 covers later, both on one screen of his phone):
//   R1 CAT2     not the composition of either of the category's last 2 covers (a polaroid is exempt: a new real photo is
//               a new picture; the owner ticked the polaroid)
//   R2 PAGE6    not a composition already used by 2 of the page's last 6 (at most 2 in 6); a quote at most ONCE in 6
//   R3 ASSET12  not the capture (whatever its region) or the photo of any of the page's last 12 covers
//   R4 NEXT     not the composition of the page's newest cover (the tile beside it) in EITHER tone, and not its LOOK: never
//               another white card beside a white card, never a polaroid beside a polaroid (round 4, the judges: 08 and 09,
//               two tilted polaroids with the same tag, side by side; a black versus beside a white one is the same card
//               to him). The same composition beside or above never relaxes; only the look half does
//   R5 ONCE     the phone's enlarged row and the steps at most once in the page's last 12 (their shape is the same whatever
//               they say: two steps covers correlate 0.97, COVER_TWIN)
//   R6 ABOVE    not the composition or the LOOK of the cover 3 places back (the tile above or below it), the same way
//   R9 DIAG     not the composition of the covers 2 and 4 places back, in EITHER tone, never relaxed: in 2 of the gallery's 3
//               phases they are the tiles touching it at a corner, and a real failed film's tile left between two covers
//               shifts every pair across it by one, so 2 back becomes the tile right above (round 5, the judges: 07 and 11,
//               two black number slabs one diagonal apart, read as one template twice on one phone screen; 05's black
//               versus touched 01's white one). Their LOOK 2 or 4 back is not refused (three columns of 12 tiles cannot
//               keep every look 5 apart: no order of the test set does), but such a composition is offered LAST, after the
//               ones whose silhouette is new on the corners, and the brief says why
//   R7 LOOK     in any 6 covers in a row, at most 2 white cards of words, 2 black cards and 3 of bare type (pictures free)
//   R8 PICTURE  never a third cover without a picture (a real photo, a real screen's pixels or its enlarged row) in a row,
//               nor in a column (the newest two, or the covers 3 and 6 places back): a gallery row of three always holds a
//               picture when the category has a real one to give: a current capture (detail, phone, carplay), or a
//               story's own photo (stories, free). Never a library still as a filler: a carinfo film is not pushed onto
//               a polaroid (round 4: the stock engine bay with no battery in it)
// A look is compared by its silhouette at 300 px (comps.mjs shapeOf): the phone's row is drawn as a white rounded card, so
// for R4, R6, R7 and R9 it IS a white card (round 5: 04's row stood over 01's white versus); it is still a picture for R8.
// The black versus and the stat's slab are a choice of tone, not a composition: each takes the page's turn (every second
// versus, every third stat) unless the other tone is what the look rules leave. Nothing the film cannot make is ever
// offered: a detail or phone only on a verified capture of the category, a polaroid only with the film's own credited
// photo (round 6: a carinfo film left only the polaroid stalled at the check), a quote only with a speaker. When a
// category's list would be empty (a lone quote counts as empty) they relax in this order (STEPS): R8, R7, R6 and R4 (their
// look half only), R2 allows 3 in 6, R1 keeps only the category's newest, then R1 off, R2 any count; then, one at a time,
// the composition rules from the least visible: the same composition 4 back, a 2nd steps or phone row in 12 (R5), 2 back,
// above, beside. R3 and the quote's once in 6 never relax. Every category lists the five compositions of the film's own
// words and numbers (comps.mjs OWN_DATA), so the list is never empty, and the check passes what the brief offered (a page
// that moved since never stalls a film: briefOffered). The polaroid's tilt is derived the same way (the other way from
// the last one's).
//   node tools/ci/coverlog.mjs allowed <category>   what the brief may offer now, and why the rest is out
//   node tools/ci/coverlog.mjs recent               the page's last 6 covers, as the brief shows them
//   node tools/ci/coverlog.mjs sim [n] [skew]       the seeded stream: 5 seeds of n films (320) in random publish order
//   node tools/ci/coverlog.mjs --test               the self-test (the test set from an empty ledger, the judges' probes,
//                                                   the judges' round-5 page, the stream: 0 stalls)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compsFor, isPicture, lookOf, PHONE_POSES, PHOTO_CATS, shapeOf} from '../../src/cover/comps.mjs';
import {coverLayout, detailFit} from '../../src/cover/layout.mjs';

export const LEDGER = 'specs/.covers.jsonl';
/** the composition rules' window: two gallery rows */
export const WINDOW = 6;
/** one phone screen of the gallery (4 rows of 3): a capture or a photo once, the phone row once */
export const PAGE = 12;
const TEST_REQ = /^r-(pwr|p2x)/;

/** is a ledger line one of the agents' test films (the gallery hides them) */
export const isTest = (l) => Boolean(l?.test) || TEST_REQ.test(String(l?.req ?? ''));

/** The ledger, newest first (by "at"); lines that do not parse are skipped. */
export const readLedger = (root, file = LEDGER) => {
  let text = '';
  try {
    text = fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    return [];
  }
  return text
    .split('\n')
    .map((l) => {
      try {
        return l.trim() ? JSON.parse(l) : null;
      } catch {
        return null;
      }
    })
    .filter((l) => l && typeof l === 'object' && typeof l.comp === 'string')
    .sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));
};

/** One ledger line from a cover's record (out/<id>.cover.json) and the run. */
export const ledgerLine = ({at, req, id, cat, comp, asset, pose, variant, look, test, sig}) => ({
  at: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(String(at ?? '')) ? at : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  req: typeof req === 'string' ? req.slice(0, 40) : null,
  id: String(id ?? '').slice(0, 80),
  cat: /^[a-z]{2,16}$/.test(String(cat ?? '')) ? cat : null,
  comp: String(comp ?? '').slice(0, 20),
  asset: asset ? String(asset).slice(0, 80) : null,
  pose: pose ? String(pose).slice(0, 20) : null,
  variant: variant ? String(variant).slice(0, 20) : null,
  look: ['card', 'dark', 'type', 'photo', 'screen', 'row'].includes(look) ? look : null,
  test: Boolean(test) || TEST_REQ.test(String(req ?? '')),
  sig: typeof sig === 'string' && /^[A-Za-z0-9+/=]{100,1200}$/.test(sig) ? sig : null,
});

export const appendLine = (root, line, file = LEDGER) => {
  fs.appendFileSync(path.join(root, file), `${JSON.stringify(ledgerLine(line))}\n`);
};

/** the lines the page shows, newest first */
const shown = (ledger) => ledger.filter((l) => !isTest(l));
/** what a ledger line's tile shows */
export const lineLook = (l) => lookOf(l?.comp, l?.variant, l?.look);
/** the capture a ledger line showed (its region dropped) or its photo */
const srcOf = (asset) => String(asset ?? '').split('#')[0];

/** the quote's cap in the page's last 6 (R2): once */
export const QUOTE_MAX = 1;
/** R5: the compositions whose shape is the same whatever they say (two steps covers correlate 0.97: COVER_TWIN), once in
 *  the page's 12 */
export const ONCE = Object.freeze(['phone', 'steps']);
/** R7: the most covers of a silhouette in any 6 in a row (a picture has no cap; the phone's row counts as a white card) */
export const LOOK_MAX = Object.freeze({card: 2, dark: 2, type: 3});
/** the page's turn: every second versus on the black card, every third stat on the slab (a look rule may flip it) */
export const versusDark = (ledger) => shown(ledger).filter((l) => l.comp === 'versus').length % 2 === 1;
export const statSlab = (ledger) => shown(ledger).filter((l) => l.comp === 'stat').length % 3 === 2;

/** each composition's tones, the page's turn first: [{variant, look}] */
const tonesOf = (c, ledger) => {
  if (c === 'versus') {
    const d = versusDark(ledger);
    return [d, !d].map((x) => ({variant: x ? 'dark' : null, look: x ? 'dark' : 'card'}));
  }
  if (c === 'stat') {
    const sl = statSlab(ledger);
    return [sl, !sl].map((x) => ({variant: x ? 'slab' : null, look: x ? 'dark' : 'type'}));
  }
  return [{variant: null, look: lookOf(c)}];
};

// The relax order, one step at a time until something is left (round 6, the judges on the guard: on a random stream of
// the 16 categories a third of the films found nothing, and the old last resort broke the rules that never relax in no
// stated order). First the look rules (their look half only: a white card beside a white card of ANOTHER composition),
// then the page's counts, then the category's own history; only then, one at a time, the composition rules from the least
// visible to the most: the same composition 4 back (a corner in 2 of 3 phases), a second steps or phone row in 12 (a
// pixel twin somewhere on his screen, never touching), 2 back (a corner, or right above it once a failed tile shifts the
// grid), above, and last beside. A quote never comes twice in 6, a capture or photo of the last 12 never comes back (R3),
// and nothing that needs a capture, a photo or a speaker the film does not have is ever offered: so the list is never
// empty (every category has the five compositions of OWN_DATA) and never holds a composition the film cannot make
export const STEPS = Object.freeze([
  'R8 PICTURE',
  'R7 LOOK',
  'R6 ABOVE',
  'R4 NEXT',
  'R2 PAGE6 (3 in 6)',
  'R1 CAT2 (the newest only)',
  'R1 CAT2 (off)',
  'R2 PAGE6 (any count, never a second quote)',
  'R9 DIAG (the composition 4 back)',
  'R5 ONCE',
  'R9 DIAG (the composition 2 back)',
  'R6 ABOVE (the composition)',
  'R4 NEXT (the composition)',
]);
/** the steps after which a film's cover repeats a composition on the page's screen (what the brief and the stream count) */
export const HARD = Object.freeze(STEPS.slice(STEPS.indexOf('R9 DIAG (the composition 4 back)')));
/** the compositions that put a real picture on the tile: a current capture's, or the film's own credited photo */
const givesPicture = (c) => c === 'detail' || c === 'phone' || c === 'carplay' || c === 'polaroid';

/**
 * What a new cover of category `cat` may use. opts.caps: the category's captures (capturesFor: which regions a "detail" can
 * show whole and which a "phone" row can set), so detail and phone drop out when nothing is left to show (none, or every
 * one on the page's last 12 covers); without caps they are offered only with opts.captures === true. opts.photos: the
 * film's own credited photos (an array, pick.mjs filmPhotos) or true / false; the polaroid drops out without one (left out:
 * the categories of PHOTO_CATS, whose films come with their story's photos). opts.carplay: the film is about CarPlay (the
 * CarPlay cover leads the nav list).
 * -> {allowed, later, out: [{comp, rule}], relaxed: [rule], hard: bool, assets: [the last 12 covers' captures and photos],
 *     pose, polSign, slab, dark, tone: {comp: variant}, toneWhy}
 */
export const allowedFor = (cat, ledger, {captures = false, carplay = false, caps = null, photos} = {}) => {
  const page = shown(ledger);
  const last6 = page.slice(0, WINDOW);
  const last12 = page.slice(0, PAGE);
  const mine = page.filter((l) => l.cat === cat);
  const used = new Set(last12.map((l) => l.asset).filter(Boolean).flatMap((a) => [a, srcOf(a)]));
  let base = compsFor(cat);
  if (cat === 'nav' && carplay) base = ['carplay', ...base];
  const out = [];
  const drop = (c, rule) => {
    if (base.includes(c)) out.push({comp: c, rule});
    base = base.filter((x) => x !== c);
  };
  if (Array.isArray(caps)) {
    const det = caps.filter((c) => c.detail?.length);
    const row = caps.filter((c) => (c.row ?? c.regions)?.length);
    if (!det.length) drop('detail', 'no verified capture whose region reads whole (COVER_ZOOM)');
    else if (det.every((c) => used.has(c.src))) drop('detail', `R3 ASSET12 (${det.map((c) => c.src).join(', ')} on the page's last ${PAGE})`);
    if (!row.length) drop('phone', 'no verified capture with a row to set');
    else if (row.every((c) => used.has(c.src))) drop('phone', `R3 ASSET12 (${row.map((c) => c.src).join(', ')} on the page's last ${PAGE})`);
  } else if (!captures) {
    for (const c of ['detail', 'phone']) drop(c, 'no verified capture with a named region');
  }
  // the polaroid holds the film's OWN credited photo (round 6: a carinfo film with none was left only the polaroid, so the
  // check stalled it or the writer put an unrelated story photo on it): without one it is never offered
  const own = Array.isArray(photos) ? photos.filter((p) => !used.has(p)) : null;
  const hasPhoto = Array.isArray(photos) ? own.length > 0 : photos === undefined ? PHOTO_CATS.includes(cat) : Boolean(photos);
  if (!hasPhoto) drop('polaroid', Array.isArray(photos) && photos.length ? `R3 ASSET12 (the film's photos are on the page's last ${PAGE})` : 'no credited photo of the film\'s own subject (a polaroid holds only that)');
  // a quote needs its speaker: the app's own words on a current capture of the category ("says"), or a person's real photo
  // (a story, a free idea): with neither, it is never offered (round 3: the narrator's line put in the app's mouth)
  if (Array.isArray(caps) && !['stories', 'free'].includes(cat) && !caps.some((c) => c.says)) drop('quote', 'no speaker: no current capture of the category shows the app\'s own words');
  if (['stories', 'free'].includes(cat) && !hasPhoto && !caps?.some((c) => c.says)) drop('quote', 'no speaker: no photo of the film\'s own and no capture with the app\'s words');
  const count = (c) => last6.filter((l) => l.comp === c).length;
  // the silhouettes (the phone's row is a white card) for the look rules; the looks themselves for R8's pictures
  const looks5 = page.slice(0, WINDOW - 1).map((l) => shapeOf(lineLook(l)));
  const noPic = (i) => i < page.length && !isPicture(lineLook(page[i]));
  const lookAt = (i) => (i < page.length ? lineLook(page[i]) : null);
  const shapeAt = (i) => (i < page.length ? shapeOf(lineLook(page[i])) : null);
  const rel = new Set();
  // R8 asks for a picture only where the film has a real one to give (never a library still as a filler)
  const gives = base.some(givesPicture);
  // the first rule an option (composition c in a tone) breaks, or null
  const broken = (c, tone) => {
    const cap = c === 'quote' ? QUOTE_MAX : rel.has('R2 PAGE6 (any count, never a second quote)') ? Infinity : rel.has('R2 PAGE6 (3 in 6)') ? 3 : 2;
    const cat2 = rel.has('R1 CAT2 (off)') ? 0 : rel.has('R1 CAT2 (the newest only)') ? 1 : 2;
    if (c !== 'polaroid' && mine.slice(0, cat2).some((l) => l.comp === c)) return 'R1 CAT2';
    if (count(c) >= cap) return c === 'quote' ? 'R2 PAGE6 (a quote once in 6)' : 'R2 PAGE6';
    if (!rel.has('R5 ONCE') && ONCE.includes(c) && last12.some((l) => l.comp === c)) return `R5 ONCE (${c === 'phone' ? 'the phone row' : 'the steps'} once in ${PAGE}: the same shape whatever it says)`;
    // the same composition beside, above or on a corner, in either tone (a black versus beside a white one, a slab over a
    // plain stat: the same card to him) or any two polaroids (two tilted instant photos with a tag): the last to relax
    const sameComp = (i) => i < page.length && (page[i].comp === c || (tone.look === 'photo' && lookAt(i) === 'photo'));
    const shape = shapeOf(tone.look);
    const same = (i) => shapeAt(i) === shape;
    const named = (i) => (lookAt(i) === 'row' && shape === 'card' ? 'card (the phone\'s row is drawn as a white card)' : shape);
    if (!rel.has('R4 NEXT (the composition)') && sameComp(0)) return `R4 NEXT (the same composition, ${page[0].comp}, beside it, in either tone)`;
    if (!rel.has('R6 ABOVE (the composition)') && sameComp(2)) return `R6 ABOVE (the same composition, ${page[2].comp}, above it, in either tone)`;
    for (const i of [1, 3]) {
      if (rel.has(`R9 DIAG (the composition ${i + 1} back)`) || !sameComp(i)) continue;
      return `R9 DIAG (the same composition, ${page[i].comp}, ${i + 1} places back: a corner neighbour in the 3 columns, or right above it once a failed film's tile shifts the grid, in either tone)`;
    }
    if (!rel.has('R4 NEXT') && same(0)) return `R4 NEXT (the same look, ${named(0)}, beside it)`;
    if (!rel.has('R6 ABOVE') && same(2)) return `R6 ABOVE (the same look, ${named(2)}, above it)`;
    if (!rel.has('R7 LOOK') && LOOK_MAX[shape] !== undefined && looks5.filter((k) => k === shape).length >= LOOK_MAX[shape]) return `R7 LOOK (a ${['', 'first', 'second', 'third', 'fourth'][LOOK_MAX[shape] + 1]} ${shape} in 6${shape === 'card' ? ', the phone\'s row counted' : ''})`;
    if (!rel.has('R8 PICTURE') && gives && !isPicture(tone.look) && ((noPic(0) && noPic(1)) || (noPic(2) && noPic(5)))) return 'R8 PICTURE (a third cover without a picture in a row or a column)';
    return null;
  };
  const rules = () => {
    const why = new Map();
    const tone = {};
    const toneWhy = {};
    for (const c of base) {
      const tones = tonesOf(c, ledger);
      toneWhy[c] = Object.fromEntries(tones.map((t) => [t.variant ?? 'light', broken(c, t)]));
      const ok = tones.find((t) => !broken(c, t));
      if (ok) tone[c] = ok.variant;
      else why.set(c, broken(c, tones[0]));
    }
    return {why, tone, toneWhy};
  };
  let {why, tone, toneWhy} = rules();
  const relaxed = [];
  // a quote alone is not "something left": it is never a default (round 2), so the next step relaxes first
  for (const step of STEPS) {
    if (!base.length || base.some((c) => c !== 'quote' && !why.has(c))) break;
    rel.add(step);
    relaxed.push(step);
    ({why, tone, toneWhy} = rules());
  }
  let allowed = base.filter((c) => !why.has(c));
  if (!allowed.length) {
    // unreachable while every category lists the OWN_DATA five (the self-test proves it): the plain stat, said
    allowed = ['stat'];
    why.delete('stat');
    tone.stat = null;
    relaxed.push('everything (the plain stat)');
  }
  for (const [comp, rule] of why) out.push({comp, rule});
  // R9's look half: a composition whose silhouette (in the tone it is left) is the one 2 or 4 places back is offered last
  const later = [];
  for (const c of allowed) {
    const t = tonesOf(c, ledger).find((x) => x.variant === (tone[c] ?? null)) ?? tonesOf(c, ledger)[0];
    const sh = shapeOf(t.look);
    const i = [1, 3].find((k) => shapeAt(k) === sh);
    if (i !== undefined) later.push({comp: c, rule: `R9 DIAG (its look, ${sh}${lookAt(i) === 'row' ? ', as the phone\'s row is drawn' : ''}, ${i + 1} places back: a corner neighbour; offered last)`});
  }
  allowed = [...allowed.filter((c) => !later.some((o) => o.comp === c)), ...later.map((o) => o.comp)];
  return {
    allowed,
    later,
    out,
    relaxed,
    hard: relaxed.some((r) => HARD.includes(r)),
    assets: [...used],
    pose: phonePose(page),
    polSign: polSign(page),
    slab: tone.stat === 'slab' || (tone.stat === undefined && statSlab(ledger)),
    dark: tone.versus === 'dark' || (tone.versus === undefined && versusDark(ledger)),
    tone,
    toneWhy,
  };
};

/** the pose after the last phone cover's (the order of comps.mjs PHONE_POSES) */
export const phonePose = (ledger) => {
  const last = shown(ledger).find((l) => l.comp === 'phone' && PHONE_POSES.includes(l.pose));
  return last ? PHONE_POSES[(PHONE_POSES.indexOf(last.pose) + 1) % PHONE_POSES.length] : PHONE_POSES[0];
};
/** the polaroid's tilt sign: the other way from the last polaroid's ("cw" is +3 degrees) */
export const polSign = (ledger) => {
  const last = shown(ledger).find((l) => l.comp === 'polaroid' && (l.pose === 'cw' || l.pose === 'ccw'));
  return last?.pose === 'cw' ? -1 : 1;
};

/** COVER_REPEAT: what is wrong with a cover {comp, asset, variant?, look?} of category `cat` against the ledger (a cover in
 *  the tone the rule did not leave, the light versus where only the black one passes, is said too) */
export const repeatProblems = (cover, cat, ledger, opts = {}) => {
  const a = allowedFor(cat, ledger, opts);
  const outs = [];
  const hit = a.out.find((o) => o.comp === cover.comp);
  const listed = compsFor(cat).includes(cover.comp) || (cover.comp === 'carplay' && cat === 'nav');
  if (!listed) outs.push(`COVER_REPEAT "${cover.comp}" is not one of the ${cat} covers (${compsFor(cat).join(', ')})`);
  else if (hit) outs.push(`COVER_REPEAT "${cover.comp}" breaks ${hit.rule} (the page's last covers): take one of ${a.allowed.join(', ') || '(none)'}`);
  else if (a.allowed.includes(cover.comp) && (cover.comp === 'versus' || cover.comp === 'stat') && cover.variant !== undefined) {
    const want = a.tone[cover.comp] ?? null;
    const has = /dark|slab/.test(String(cover.variant ?? '')) ? (cover.comp === 'versus' ? 'dark' : 'slab') : null;
    const rule = a.toneWhy?.[cover.comp]?.[has ?? 'light'];
    if (want !== has && rule) outs.push(`COVER_REPEAT the ${cover.comp} drawn ${has ?? (cover.comp === 'versus' ? 'white' : 'plain')} breaks ${rule}: draw it ${want ?? (cover.comp === 'versus' ? 'white' : 'plain')} (the brief's tone)`);
  }
  if (cover.asset) {
    const src = srcOf(cover.asset);
    if (a.assets.includes(cover.asset) || a.assets.includes(src)) outs.push(`COVER_REPEAT R3 ASSET12 "${src}" was on one of the page's last ${PAGE} covers: another capture or photo`);
  }
  return outs;
};

/** The brief's offer (out/ci/request.json "coverAllowed" and "coverAssets", what allowedFor left when the film was briefed):
 *  a cover the writer took from it is the film's own choice, so a page that moved since (another film published between the
 *  brief and the check) or a photo the brief could not know of never stalls the film at the check (round 6, the judges).
 *  true when the cover's composition was offered and its capture or photo was not on the brief's page. */
export const briefOffered = (cover, brief) => {
  if (!brief || !Array.isArray(brief.coverAllowed) || !brief.coverAllowed.includes(cover?.comp)) return false;
  const assets = Array.isArray(brief.coverAssets) ? brief.coverAssets : [];
  return !cover.asset || !(assets.includes(cover.asset) || assets.includes(srcOf(cover.asset)));
};

/** The category's captures a "detail" or "phone" cover may show: in its screens (out/ci/categories.now.json in the cloud,
 *  where the App Store gate is applied, else ci/categories.json), with a named region (public/screens/regions.json) and
 *  verified against the store's version (public/screens/screens.json): {src, regions, detail: [the regions a detail shows
 *  whole with its key read], row: [the regions a phone row can set]}. */
export const capturesFor = (root, cat, store) => {
  const read = (rel) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
    } catch {
      return null;
    }
  };
  const cats = (read('out/ci/categories.now.json') ?? read('ci/categories.json'))?.categories ?? [];
  const c = cats.find((x) => x?.id === cat);
  const regions = read('public/screens/regions.json') ?? {};
  const info = read('public/screens/screens.json')?.screens ?? {};
  const want = store ?? read('ci/categories.json')?.store?.known ?? null;
  const at = (v) => String(v ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  const ok = (v) => {
    if (!v || !want) return false;
    const a = at(v);
    const b = at(want);
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    return true;
  };
  const screens = cat === 'free' || cat === 'general' || cat === 'whatsnew' ? Object.keys(regions).filter((k) => k !== 'about') : Array.isArray(c?.screens) ? c.screens : [];
  // which regions a detail can show whole with its key read (src/cover/layout.mjs detailFit), and which a phone row can set
  // (its words fit the row at their tier: the layout says so)
  const rowFits = (src, name) => {
    const L = coverLayout({title: 'ა | ბ', kind: 'phone', phone: {src, region: name}}, {regions});
    return !L.problems.some((p) => /^COVER_(TEXT_SIZE|REGION)/.test(p));
  };
  return screens
    .filter((src) => ok(info[src]?.verified) && ((regions[src] && typeof regions[src] === 'object') || Array.isArray(info[src]?.says)))
    .map((src) => {
      // a region proves only its own features' claims ("for"): never the car-value card on a parking cover
      const names = Object.keys(regions[src] ?? {}).filter((n) => !Array.isArray(regions[src][n]?.for) || regions[src][n].for.includes(cat));
      return {src, regions: names, detail: names.filter((n) => detailFit(regions[src][n])?.reads), row: names.filter((n) => regions[src][n]?.text && rowFits(src, n)), says: Array.isArray(info[src]?.says) && info[src].says.length > 0};
    })
    .filter((c) => c.regions.length || c.says);
};

/** the page's last 6 covers, one line each, newest first, with what the tile shows: "v137-dagen-h · stories · polaroid
 *  story-dagen-h-1967 (photo)" */
export const recentLines = (ledger) =>
  shown(ledger)
    .slice(0, WINDOW)
    .map((l) => [l.id, l.cat ?? '?', `${l.comp}${l.asset ? ` ${l.asset}` : ''} (${lineLook(l)})`].join(' · '));

// ---- the stream: real publish order, simulated ---------------------------------------------------------------------------
/** the 16 categories of ci/categories.json */
export const CATEGORIES = Object.freeze(['stories', 'humor', 'carinfo', 'nav', 'parking', 'qr', 'vin', 'engine', 'obd', 'reminders', 'widgets', 'auction', 'docs', 'general', 'whatsnew', 'free']);
const CARPLAY = ['f18-03-home-car', 'f18-06-list-car', 'f18-07-preview-car', 'f18-10-guid1-car', 'f18-12-lanes-car', 'f18-14-arrived-car'];
/**
 * A seeded random stream of films in publish order (round 6, the judges: the guard held only on the hand-ordered test set).
 * Each film: a category drawn from `weights` (uniform when empty), its own credited photo with the chance photoP[cat], a
 * CarPlay film one nav film in 5; the brief's list (allowedFor), the writer's pick (the first the film can make: a polaroid
 * only with its photo, a detail or phone only on a capture not on the page, a quote only with a speaker), then the check
 * (repeatProblems) on that pick. A stall: nothing the film can make, or the check refusing what the brief offered.
 * -> {films, stalls, refused, hard, beside, above, corner, once, quote2, sameShape, carinfoPolaroidOnly, polaroidNoPhoto, ex}
 */
export const simulate = ({seed = 1, n = 320, weights = {}, caps = {}, photoP = {stories: 0.9, free: 0.3, carinfo: 0.15}} = {}) => {
  let x = seed;
  const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pool = CATEGORIES.flatMap((c) => Array(weights[c] ?? 1).fill(c));
  const st = {films: 0, stalls: 0, refused: 0, hard: 0, beside: 0, above: 0, corner: 0, once: 0, quote2: 0, sameShape: 0, carinfoPolaroidOnly: 0, polaroidNoPhoto: 0, ex: []};
  let ledger = [];
  let t = Date.parse('2026-11-01T00:00:00Z');
  for (let k = 0; k < n; k++) {
    const cat = pool[Math.floor(rnd() * pool.length)];
    const photo = rnd() < (photoP[cat] ?? 0);
    const carplay = cat === 'nav' && rnd() < 0.2;
    const cc = caps[cat] ?? [];
    const opts = {caps: cc, carplay, photos: photo ? [`story-${seed}-${k}`] : []};
    const a = allowedFor(cat, ledger, opts);
    st.films++;
    if (a.hard) st.hard++;
    if (cat === 'carinfo' && a.allowed.length === 1 && a.allowed[0] === 'polaroid' && !photo) st.carinfoPolaroidOnly++;
    if (!photo && a.allowed.includes('polaroid')) st.polaroidNoPhoto++;
    const free = (c) => cc.find((y) => !a.assets.includes(y.src) && (c === 'detail' ? y.detail?.length : y.row?.length));
    const can = (c) => (c === 'polaroid' ? photo : c === 'detail' || c === 'phone' ? Boolean(free(c)) : c === 'carplay' ? carplay : c === 'quote' ? (['stories', 'free'].includes(cat) && photo) || cc.some((y) => y.says) : true);
    const comp = a.allowed.find(can);
    if (!comp) {
      st.stalls++;
      if (st.ex.length < 5) st.ex.push(`#${k} ${cat}: offered ${a.allowed.join(', ') || '(none)'}, none it can make`);
      continue;
    }
    const variant = comp === 'versus' ? (a.tone.versus === 'dark' ? 'stack-dark' : 'stack') : comp === 'stat' ? (a.tone.stat === 'slab' ? 'slab' : null) : null;
    const c = comp === 'detail' || comp === 'phone' ? free(comp) : null;
    const asset = c ? `${c.src}#${comp === 'detail' ? c.detail[0] : c.row[0]}` : comp === 'polaroid' ? opts.photos[0] : comp === 'carplay' ? CARPLAY.find((y) => !a.assets.includes(y)) : null;
    const refused = repeatProblems({comp, asset, variant}, cat, ledger, opts);
    if (refused.length) {
      st.stalls++;
      st.refused++;
      if (st.ex.length < 5) st.ex.push(`#${k} ${cat} ${comp}: ${refused.join(' | ')}`);
      continue;
    }
    const look = lookOf(comp, variant);
    const same = (o) => Boolean(o) && (o.comp === comp || (look === 'photo' && lineLook(o) === 'photo'));
    if (same(ledger[0])) st.beside++;
    if (same(ledger[2])) st.above++;
    if (same(ledger[1]) || same(ledger[3])) st.corner++;
    if (ONCE.includes(comp) && ledger.slice(0, PAGE - 1).some((l) => l.comp === comp)) st.once++;
    if (comp === 'quote' && ledger.slice(0, WINDOW - 1).some((l) => l.comp === 'quote')) st.quote2++;
    if ([ledger[0], ledger[2]].some((o) => o && shapeOf(lineLook(o)) === shapeOf(look))) st.sameShape++;
    ledger = [ledgerLine({at: new Date((t += 600000)).toISOString().replace(/\.\d{3}Z$/, 'Z'), id: `f${k}`, cat, comp, asset, variant, look}), ...ledger];
  }
  return st;
};

// ---- self-test ---------------------------------------------------------------------------------------------------------
// the captures the test categories have (what capturesFor reads from the files on 27 Oct), so the test reads no files
const CAPS = {
  nav: [{src: '18-nav-lock-screen', regions: ['live-activity'], detail: ['live-activity'], row: ['live-activity']}, {src: '17-nav-drive', regions: ['maneuver'], detail: ['maneuver'], row: ['maneuver']}],
  parking: [{src: '23-home-104', regions: ['parking-row'], detail: [], row: ['parking-row']}],
  general: [{src: '23-home-104', regions: ['value', 'inspection-row', 'parking-row'], detail: ['value'], row: ['value', 'inspection-row', 'parking-row']}],
  whatsnew: [{src: '23-home-104', regions: ['value', 'inspection-row', 'parking-row'], detail: ['value'], row: ['value', 'inspection-row', 'parking-row']}],
  vin: [{src: '23-home-104', regions: ['value'], detail: ['value'], row: ['value']}],
  obd: [{src: '22-obd-result', regions: ['verdict'], detail: [], row: []}],
};
const capsOf = (cat) => ({caps: CAPS[cat] ?? []});
// what capturesFor reads from the files on 27 Oct (round 6) for every category (the stream and the judges' page): qr,
// reminders, widgets, auction and docs list screens, but none is verified against 1.0.5 with a region of theirs
const HOME = {src: '23-home-104', regions: ['value', 'inspection-row', 'parking-row'], detail: ['value'], row: ['value', 'inspection-row', 'parking-row']};
const LOCK = {src: '18-nav-lock-screen', regions: ['live-activity'], detail: ['live-activity'], row: ['live-activity'], says: true};
const DRIVE = {src: '17-nav-drive', regions: ['maneuver'], detail: ['maneuver'], row: ['maneuver']};
const DIAG = {src: '13-diagnosis-108', regions: ['urgency'], detail: [], row: ['urgency']};
const OBD = {src: '22-obd-result', regions: [], detail: [], row: [], says: true};
const SIM_CAPS = {
  nav: [DRIVE, LOCK],
  parking: [{...HOME, regions: ['parking-row'], detail: [], row: ['parking-row']}],
  vin: [{...HOME, regions: ['value'], detail: ['value'], row: ['value']}],
  engine: [DIAG, OBD],
  obd: [OBD],
  general: [LOCK, DRIVE, DIAG, HOME, OBD],
  whatsnew: [LOCK, DRIVE, DIAG, HOME, OBD],
  free: [LOCK, DRIVE, DIAG, HOME, OBD],
};
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
    if (!cond) bad++;
  };
  const has = (ps, code) => ps.some((p) => p.includes(code));
  // the test set (2026-10-27, round 5) as a simulated gallery, oldest first, from an empty ledger: its 12 films and the net,
  // each the writer's pick among what the rule left (tools/covers.mjs --fresh renders the same order). Round 4: the parking
  // film shows the app's own parking row, the battery film the bars of its own numbers. Round 5 (R9 and the row as a white
  // card): in the round-4 order no pick is left for every film (humor and widgets have only their versus, so 01's versus
  // 4 before the humor film and 11's stat 4 after 07's are refused, and auction has nothing else), so the order is re-picked:
  // the battery film goes out after the paper-note film; the oil film takes the plain stat („5W", the cold-start digit),
  // the code film the plain stat on the paper, the auction film the slab (the page's third stat), the humor and the
  // paper-note films the black versus (beside the row's white card, and the page's second versus)
  const SEQ = [
    ['v136-winter-digit', 'carinfo', 'stat', null, null],
    ['v131-three-minutes', 'stories', 'polaroid', 'story-toyota-2016-1', null],
    ['v135-mountain-dad', 'nav', 'detail', '18-nav-lock-screen#live-activity', null],
    ['v134-rainy-derby', 'parking', 'phone', '23-home-104#parking-row', null],
    ['demo-p2-humor-v905', 'humor', 'versus', null, 'stack-dark'],
    ['v131-wiper-notes', 'qr', 'steps', null, null],
    ['v131-seller-swears', 'obd', 'stat', null, null],
    ['v137-dagen-h', 'stories', 'polaroid', 'story-dagen-h-1967', null],
    ['v125-forgot-mechanic', 'reminders', 'timeline', null, null],
    ['v116-paper-note', 'widgets', 'versus', null, 'stack-dark'],
    ['v134-winter-battery', 'carinfo', 'bars', null, null],
    ['v121-empty-record', 'auction', 'stat', null, 'slab'],
  ];
  let ledger = [];
  let t = Date.parse('2026-10-27T10:00:00Z');
  let seqOk = true;
  SEQ.forEach(([id, cat, comp, asset, variant], i) => {
    const p = repeatProblems({comp, asset, variant}, cat, ledger, capsOf(cat));
    if (p.length) {
      seqOk = false;
      console.log(`     #${i + 1} ${id}: ${p.join(' | ')}`);
    }
    const a = allowedFor(cat, ledger, capsOf(cat));
    const pose = comp === 'polaroid' ? (a.polSign > 0 ? 'cw' : 'ccw') : null;
    ledger = [ledgerLine({at: new Date((t += 600000)).toISOString().replace(/\.\d{3}Z$/, 'Z'), id, cat, comp, asset, pose, variant, look: lookOf(comp, variant)}), ...ledger];
  });
  ok(seqOk, 'the test set\'s 12 films pass R1 to R9 in order, each in the tone the rule left (the net of 02 stands in 02\'s place)');
  {
    // ... and the round-4 order cannot be passed by any pick: R9 refuses it where the judges saw it (07 and 11, 05 and 01)
    const old = [['carinfo', 'versus', 'stack'], ['stories', 'polaroid'], ['nav', 'detail', null, '18-nav-lock-screen#live-activity'], ['parking', 'phone', null, '23-home-104#parking-row'], ['humor', 'versus', 'stack-dark'], ['qr', 'steps'], ['obd', 'stat', 'slab'], ['carinfo', 'bars'], ['stories', 'polaroid'], ['reminders', 'timeline'], ['auction', 'stat', 'slab']];
    let led = [];
    const hits = [];
    old.forEach(([cat, comp, variant, asset], i) => {
      const p = repeatProblems({comp, variant: variant ?? null, asset: asset ?? (comp === 'polaroid' ? `story-${i}` : undefined)}, cat, led, capsOf(cat));
      if (p.some((x) => x.includes('R9 DIAG'))) hits.push(i + 1);
      led = [ledgerLine({at: `2026-10-26T${String(10 + i).padStart(2, '0')}:00:00Z`, id: `v${i}-old`, cat, comp, asset: asset ?? (comp === 'polaroid' ? `story-${i}` : null), variant, look: lookOf(comp, variant)}), ...led];
    });
    ok(hits.includes(5) && hits.includes(11), `the round-4 order is refused by R9 where the judges saw it: the humor film's versus 4 after 01's, 11's stat 4 after 07's (films ${hits.join(', ')})`);
  }
  {
    // what the page's 12 tiles show: no look and no composition twice side by side or one above the other (two photos
    // neither: round 4), a picture in every row whose films have one to give
    const page = ledger.slice(0, PAGE).map(lineLook);
    const shapes = page.map(shapeOf);
    const comps = ledger.slice(0, PAGE).map((l) => l.comp);
    let twins = 0;
    let diag = 0;
    const touch = (i, j) => Math.abs(Math.floor(i / 3) - Math.floor(j / 3)) === 1 && Math.abs((i % 3) - (j % 3)) === 1;
    for (let i = 0; i < page.length; i++) {
      // beside and above: no silhouette (the row is a white card) and no composition twice
      if (i % 3 < 2 && (shapes[i] === shapes[i + 1] || comps[i] === comps[i + 1])) twins++;
      if (i + 3 < page.length && (shapes[i] === shapes[i + 3] || comps[i] === comps[i + 3])) twins++;
      // 2 and 4 places apart, whatever the grid's phase: never the same composition (R9); on the page as drawn, no corner
      // neighbours of the same silhouette either
      for (const d of [2, 4]) if (i + d < page.length && comps[i] === comps[i + d]) twins++;
      for (const j of [i + 2, i + 4]) if (j < page.length && touch(i, j) && shapes[i] === shapes[j]) diag++;
    }
    const rows = [0, 3, 6, 9].map((r) => page.slice(r, r + 3));
    // a row with no picture holds only films whose category has none to give (no capture that reads, no photo): R8 relaxed
    // for each of them and said so
    const bare = [0, 3, 6, 9].filter((r) => !page.slice(r, r + 3).some(isPicture)).flatMap((r) => ledger.slice(r, r + 3));
    // carinfo has no real picture to give (R8 never pushes it onto a library still)
    const NOPIC = ['qr', 'humor', 'obd', 'reminders', 'auction', 'widgets', 'docs', 'parking', 'carinfo'];
    ok(!twins && !diag && bare.every((l) => NOPIC.includes(l.cat)), `the page's 12 tiles: no silhouette or composition beside or above itself, no composition 2 or 4 apart, no silhouette on a corner (${rows.map((r) => r.join(' ')).join(' | ')})`);
    ok(shapes.filter((k) => k === 'card').length <= 4, `at most a third of the page's tiles are white cards, the phone's row counted (${shapes.filter((k) => k === 'card').length} of 12)`);
    ok(page.filter((k) => k === 'photo' || k === 'screen').length >= 3 && page.includes('row') && page.includes('screen'), `the app is on the page: a real screen and an app row; ${page.filter((k) => k === 'photo' || k === 'screen').length} tiles of real pixels (photos and the screen) and the row (${page.join(' ')})`);
    ok(ledger.filter((l) => l.comp === 'polaroid').every((l) => ['stories', 'free'].includes(l.cat)), 'a polaroid only on a story (no library still on a carinfo cover)');
  }
  ok(ledger.filter((l) => l.comp === 'polaroid').map((l) => l.pose).join(' ') === 'ccw cw', `the two polaroids alternate their tilt (${ledger.filter((l) => l.comp === 'polaroid').map((l) => l.pose).join(' ')})`);
  ok(!allowedFor('reminders', ledger, capsOf('reminders')).allowed.includes('quote'), 'a quote is never offered to a category with no speaker (no capture with the app\'s words, no photo)');
  ok(allowedFor('nav', [], {caps: [{...CAPS.nav[1], says: true}]}).allowed.includes('quote'), '... and offered where a current capture shows the app\'s words');
  const L = (rows) => rows.map(([comp, cat, asset, look, variant], i) => ledgerLine({at: `2026-10-27T${String(19 - i).padStart(2, '0')}:00:00Z`, id: `v${200 - i}-x`, cat, comp, asset, look, variant}));
  // each rule on its own
  ok(has(repeatProblems({comp: 'steps'}, 'docs', L([['timeline', 'reminders'], ['polaroid', 'stories', 'story-a'], ['bars', 'carinfo'], ['detail', 'nav', 'x#y'], ['steps', 'qr']]), capsOf('docs')), 'R5'), 'R5: a second steps cover in 12 is refused (two steps covers are pixel twins, 0.97)');
  ok(has(repeatProblems({comp: 'stat'}, 'carinfo', L([['quote', 'humor'], ['stat', 'carinfo']])), 'R1'), 'R1: not the category\'s last composition');
  ok(has(repeatProblems({comp: 'quote'}, 'auction', L([['steps', 'qr'], ['stat', 'obd'], ['quote', 'humor']])), 'R2'), 'R2: a quote once in 6');
  ok(has(repeatProblems({comp: 'stat'}, 'reminders', L([['steps', 'qr'], ['stat', 'obd'], ['polaroid', 'stories', 'story-a'], ['stat', 'auction']])), 'R2'), 'R2: not a third time in 6');
  ok(has(repeatProblems({comp: 'detail', asset: '07-parking#spot-row'}, 'parking', L([['steps', 'qr'], ['phone', 'whatsnew', '07-parking#x']])), 'R3'), 'R3: not the same capture as one of the last covers');
  ok(has(repeatProblems({comp: 'stat', variant: null}, 'auction', L([['stat', 'obd']]), capsOf('auction')), 'R4'), 'R4: not the newest cover\'s composition in the same tone (the plain stat beside a plain stat)');
  // round 4 (the judges on round 3): the other tone of the same composition is the same card to him, beside or above
  ok(has(repeatProblems({comp: 'stat', variant: 'slab'}, 'auction', L([['stat', 'obd']]), capsOf('auction')), 'R4') && !allowedFor('auction', L([['stat', 'obd']]), capsOf('auction')).allowed.includes('stat'), '... nor in the other tone: a slab beside a plain stat is refused');
  ok(has(repeatProblems({comp: 'versus', variant: 'stack-dark'}, 'humor', L([['versus', 'carinfo', null, null, 'stack']])), 'R4'), 'probe: a black versus beside a white versus is refused');
  ok(has(repeatProblems({comp: 'stat', variant: null}, 'auction', L([['steps', 'qr'], ['polaroid', 'stories', 'story-a'], ['stat', 'obd', null, null, 'slab']]), capsOf('auction')), 'R6'), 'probe: a plain stat under a slab stat is refused (R6, the same composition above)');
  ok(has(repeatProblems({comp: 'polaroid', asset: 'story-b'}, 'stories', L([['polaroid', 'stories', 'story-a']])), 'R4'), 'probe: a polaroid beside a polaroid is refused (08 and 09 of round 3)');
  ok(has(repeatProblems({comp: 'polaroid', asset: 'story-b'}, 'stories', L([['stat', 'obd'], ['steps', 'qr'], ['polaroid', 'stories', 'story-a']])), 'R6'), 'probe: a polaroid above a polaroid is refused');
  {
    // ... and neither ever relaxes: stories every other film, the polaroid out wherever one is beside or above
    const led = L([['polaroid', 'stories', 'story-a'], ['steps', 'qr'], ['stat', 'stories'], ['versus', 'stories'], ['timeline', 'stories'], ['quote', 'stories']]);
    const a = allowedFor('stories', led);
    ok(!a.allowed.includes('polaroid') && a.allowed.length > 0, `... and it never relaxes, even when the story has little else (${a.allowed.join(', ')}; ${a.relaxed.join(', ') || 'nothing relaxed'})`);
    // the judges' relax probe: reminders after [stories timeline, obd versus, stories slab stat, qr steps, stories polaroid,
    // carinfo stat] used to leave the timeline right beside a timeline
    const j = L([['timeline', 'stories'], ['versus', 'obd'], ['stat', 'stories', null, null, 'slab'], ['steps', 'qr'], ['polaroid', 'stories', 'story-a'], ['stat', 'carinfo']]);
    const r = allowedFor('reminders', j, capsOf('reminders'));
    ok(r.allowed.length > 0 && !r.allowed.includes('timeline'), `probe: a timeline is never offered beside a timeline, whatever relaxes (${r.allowed.join(', ')}; ${r.relaxed.join(', ')})`);
  }
  ok(!repeatProblems({comp: 'versus', variant: 'stack'}, 'auction', L([['stat', 'obd'], ['quote', 'humor'], ['polaroid', 'stories', 'story-a']]), capsOf('auction')).length, 'a fresh composition in a fresh look passes (auction has no picture to give: R8 relaxes and says so)');
  // the judges' round-5 probes (each one passed the round-4 rule): the same composition 2 or 4 back (a corner neighbour), and
  // the phone's row as the white card it is drawn as
  {
    const q = (name, p, code) => ok(has(p, code), `probe ${name} is refused (${code})`);
    q('A: a slab stat with a slab stat 4 back (11 and 07)', repeatProblems({comp: 'stat', variant: 'slab'}, 'auction', L([['timeline', 'reminders'], ['polaroid', 'stories', 'story-a'], ['bars', 'carinfo'], ['stat', 'obd', null, null, 'slab']]), {caps: []}), 'R9 DIAG');
    q('B: a slab stat with a slab stat 2 back', repeatProblems({comp: 'stat', variant: 'slab'}, 'auction', L([['polaroid', 'stories', 'story-a'], ['stat', 'obd', null, null, 'slab']]), {caps: []}), 'R9 DIAG');
    q('C: a white versus with a black versus 4 back (05 and 01)', repeatProblems({comp: 'versus', variant: 'stack'}, 'carinfo', L([['polaroid', 'stories', 'story-a'], ['detail', 'nav', '18-nav-lock-screen#live-activity', 'screen'], ['phone', 'parking', '23-home-104#parking-row', 'row'], ['versus', 'humor', null, null, 'stack-dark']])), 'R9 DIAG');
    q('D: a white versus with the phone\'s row 3 back (04 over 01)', repeatProblems({comp: 'versus', variant: 'stack'}, 'carinfo', L([['polaroid', 'stories', 'story-a'], ['detail', 'nav', 'x#y', 'screen'], ['phone', 'parking', '23-home-104#parking-row', 'row']])), 'R6 ABOVE');
    q('E: a bars card beside the phone\'s row', repeatProblems({comp: 'bars'}, 'carinfo', L([['phone', 'parking', '23-home-104#parking-row', 'row']])), 'R4 NEXT');
    q('F: a white versus with a white versus 2 back', repeatProblems({comp: 'versus', variant: 'stack'}, 'widgets', L([['stat', 'auction', null, null, 'slab'], ['versus', 'carinfo', null, null, 'stack']]), {caps: []}), 'R9 DIAG');
    q('G: the row beside a white card', repeatProblems({comp: 'phone', asset: '23-home-104#parking-row'}, 'parking', L([['versus', 'carinfo', null, null, 'stack']]), capsOf('parking')), 'R4 NEXT');
    // the composition half never relaxes: a polaroid 2 back keeps a story off its polaroid even when little else is left
    const st = allowedFor('stories', L([['stat', 'obd'], ['polaroid', 'stories', 'story-a'], ['timeline', 'reminders'], ['versus', 'humor', null, null, 'stack-dark']]));
    ok(!st.allowed.includes('polaroid') && st.allowed.length > 0, `R9 never relaxes: no polaroid 2 places after a polaroid (${st.allowed.join(', ')}; ${st.relaxed.join(', ') || 'nothing relaxed'})`);
    // the look half is a preference: the qr film's steps 2 places after the row is still offered, after the stat
    const qr = allowedFor('qr', L([['detail', 'nav', 'x#y', 'screen'], ['phone', 'parking', '23-home-104#parking-row', 'row']]), capsOf('qr'));
    ok(qr.allowed.includes('steps') && qr.allowed.indexOf('steps') > qr.allowed.indexOf('stat') && qr.later.some((o) => o.comp === 'steps'), `R9's look half orders, never refuses: steps 2 after the row is offered last (${qr.allowed.join(', ')})`);
    // the old dead end of the docs film after [stat, versus, quote, steps] is gone: docs has bars and timeline now
    const de = allowedFor('docs', L([['stat', 'obd'], ['versus', 'humor'], ['quote', 'nav'], ['steps', 'qr']]), {captures: false});
    ok(de.allowed.length > 0 && !de.hard && !de.allowed.some((c) => ['stat', 'versus', 'quote', 'steps'].includes(c)), `the docs probe is no dead end any more: no composition of the 4 touching tiles (${de.allowed.join(', ')}; ${de.relaxed.join(', ') || 'nothing relaxed'})`);
    // a real dead end (the four touching tiles hold four of the five, the steps is on the page): the relax order says what
    // gives first, the same composition 4 back (a corner in 2 of 3 phases), never beside, above or 2 back, never a 2nd steps
    const real = allowedFor('humor', L([['stat', 'obd'], ['versus', 'carinfo'], ['bars', 'auction'], ['timeline', 'reminders'], ['detail', 'nav', 'x#y', 'screen'], ['steps', 'qr']]), {caps: []});
    ok(real.allowed.join() === 'timeline' && real.hard && real.relaxed.at(-1) === 'R9 DIAG (the composition 4 back)' && !real.relaxed.includes('R5 ONCE'), `a dead end relaxes in the stated order to the least-bad repeat: the timeline 4 back (${real.allowed.join(', ')}; ${real.relaxed.join(', ')})`);
    ok(!repeatProblems({comp: 'timeline'}, 'humor', L([['stat', 'obd'], ['versus', 'carinfo'], ['bars', 'auction'], ['timeline', 'reminders'], ['detail', 'nav', 'x#y', 'screen'], ['steps', 'qr']]), {caps: []}).length, '... and the check passes what the brief offered there (never a stall for the history alone)');
    ok(STEPS.indexOf('R9 DIAG (the composition 4 back)') < STEPS.indexOf('R5 ONCE') && STEPS.indexOf('R5 ONCE') < STEPS.indexOf('R9 DIAG (the composition 2 back)') && STEPS.at(-2) === 'R6 ABOVE (the composition)' && STEPS.at(-1) === 'R4 NEXT (the composition)', 'the relax order: the looks, the counts, the category, then 4 back, a 2nd steps in 12, 2 back, above, beside');
  }
  // the judges' round-2 probes (each one passed the old rule)
  {
    const seven = L([['stat', 'obd'], ['polaroid', 'stories', 'story-a'], ['versus', 'carinfo'], ['timeline', 'reminders'], ['polaroid', 'stories', 'story-b'], ['steps', 'qr'], ['phone', 'parking', '23-home-104#parking-row']]);
    const p = repeatProblems({comp: 'phone', asset: '23-home-104#inspection-row'}, 'general', seven, capsOf('general'));
    ok(has(p, 'R3 ASSET12'), 'probe: a 23-home-104 phone 7 covers after another 23-home-104 phone is refused (R3 keyed on the screen, over 12)');
    const two = {caps: [...CAPS.general, {src: '24-home-tip', regions: ['parking-row'], detail: [], row: ['parking-row']}]};
    ok(has(repeatProblems({comp: 'phone', asset: '24-home-tip#parking-row'}, 'general', seven, two), 'R5'), 'R5: a phone row of another capture 7 covers after a phone row is refused too (once in 12)');
    ok(has(repeatProblems({comp: 'detail', asset: '23-home-104#value'}, 'general', seven, capsOf('general')), 'R3 ASSET12'), 'probe: a 23-home-104 detail 7 covers after a 23-home-104 cover is refused');
    ok(!allowedFor('general', seven, capsOf('general')).allowed.some((c) => c === 'phone' || c === 'detail'), 'probe: the brief never offers detail or phone when their only capture is on the page');
  }
  ok(has(repeatProblems({comp: 'bars'}, 'carinfo', L([['detail', 'nav', '18-nav-lock-screen#live-activity', 'card'], ['quote', 'auction']])), 'R4'), 'probe: bars after [quote, a detail drawn as a white card] is refused (the look, not the name)');
  ok(!repeatProblems({comp: 'bars'}, 'carinfo', L([['detail', 'nav', '18-nav-lock-screen#live-activity', 'screen'], ['quote', 'auction']])).length, '... and allowed after a detail drawn as a real screen');
  {
    const led = L([['bars', 'carinfo'], ['steps', 'qr']]);
    ok(has(repeatProblems({comp: 'versus', variant: 'stack'}, 'humor', led), 'R4'), 'probe: a white versus after [steps, bars] is refused (R4: a white card beside a white card)');
    ok(allowedFor('humor', led).tone.versus === 'dark' && !repeatProblems({comp: 'versus', variant: 'stack-dark'}, 'humor', led).length, '... and the black versus is what the rule leaves (not by the page\'s turn: the turn is light here)');
    ok(!versusDark(led), '... (the turn really is light, so the black card above came from the look rule)');
  }
  ok(has(repeatProblems({comp: 'timeline'}, 'reminders', L([['polaroid', 'stories', 'story-a'], ['versus', 'carinfo', null, null, 'stack-dark'], ['stat', 'obd']])), 'R6'), 'probe: a timeline with a stat above it is refused (two bare numbers, one over the other)');
  ok(has(repeatProblems({comp: 'quote'}, 'auction', L([['polaroid', 'stories', 'story-a'], ['stat', 'obd'], ['bars', 'carinfo']])), 'R6'), 'probe: a quote with bars above it is refused (white card over white card)');
  ok(has(repeatProblems({comp: 'bars'}, 'carinfo', L([['versus', 'carinfo']])), 'R4'), 'probe: carinfo bars right after a carinfo white versus is refused');
  ok(has(repeatProblems({comp: 'bars'}, 'carinfo', L([['stat', 'obd'], ['steps', 'qr'], ['polaroid', 'stories', 'story-a'], ['quote', 'auction'], ['detail', 'nav', '18-nav-lock-screen#live-activity']])), 'R7'), 'R7: a third white card in 6 is refused even when no two touch');
  // R8: a third cover without a picture in a row (or a column) when the category has a picture to give
  {
    const led = L([['stat', 'obd'], ['timeline', 'reminders']]);
    ok(has(repeatProblems({comp: 'versus', variant: 'stack'}, 'stories', led), 'R8'), 'R8: a third cover without a picture in a row is refused when the category has a real photo to give');
    const a = allowedFor('stories', led);
    ok(a.allowed.length === 1 && a.allowed[0] === 'polaroid', `... the story's polaroid is what is left (${a.allowed.join(', ')})`);
    const pk = allowedFor('parking', led, capsOf('parking'));
    ok(pk.allowed.length === 1 && pk.allowed[0] === 'phone', `... a parking film with a current capture: its app row (${pk.allowed.join(', ')})`);
    const c = allowedFor('carinfo', led);
    ok(c.allowed.includes('bars') && !c.relaxed.length && !has(repeatProblems({comp: 'bars'}, 'carinfo', led), 'R8'), `... but a carinfo film is never pushed onto a library-still polaroid: R8 does not ask a category with no real picture (${c.allowed.join(', ')})`);
    const q = allowedFor('qr', led, capsOf('qr'));
    ok(q.allowed.includes('steps') && !q.relaxed.includes('R8 PICTURE'), `... nor a category with no capture and no photo (${q.allowed.join(', ')})`);
    const col = L([['detail', 'nav', '17-nav-drive#maneuver'], ['versus', 'humor', null, null, 'stack-dark'], ['steps', 'qr'], ['detail', 'nav', '18-nav-lock-screen#live-activity'], ['polaroid', 'stories', 'story-a'], ['stat', 'obd']]);
    ok(has(repeatProblems({comp: 'timeline'}, 'stories', col), 'R8'), 'R8: nor a third in a column (the covers 3 and 6 places back)');
  }
  ok(!repeatProblems({comp: 'polaroid', asset: 'story-b'}, 'stories', L([['bars', 'carinfo'], ['steps', 'qr'], ['stat', 'obd'], ['detail', 'nav'], ['polaroid', 'stories', 'story-a']])).length, 'R1 lets a story take a new photo after a polaroid');
  // test films do not count (the gallery hides them)
  ok(!repeatProblems({comp: 'stat'}, 'carinfo', [ledgerLine({at: '2026-10-27T20:00:00Z', req: 'r-pwr9te-0001', id: 'v300-x', cat: 'carinfo', comp: 'stat'})]).length, 'a test film\'s cover does not count');
  ok(allowedFor('parking', [], {captures: false}).allowed.every((c) => c !== 'phone' && c !== 'detail'), 'no verified capture: detail and phone drop out');
  ok(!allowedFor('parking', [], capsOf('parking')).allowed.includes('detail') && allowedFor('parking', [], capsOf('parking')).allowed.includes('phone'), 'parking: the home row is too small for a detail, a phone row it is');
  ok(allowedFor('nav', [], {carplay: true}).allowed[0] === 'carplay', 'a CarPlay film puts the CarPlay cover first');
  ok(recentLines(ledger)[0] === 'v121-empty-record · auction · stat (dark)' && recentLines(ledger)[4] === 'v137-dagen-h · stories · polaroid story-dagen-h-1967 (photo)', `the brief's recent lines say what each tile shows (${recentLines(ledger).slice(0, 4).join('; ')})`);
  ok(allowedFor('auction', L([['steps', 'qr'], ['polaroid', 'stories', 'story-a'], ['detail', 'nav', 'x#y'], ['bars', 'carinfo'], ['polaroid', 'stories', 'story-b'], ['steps', 'docs'], ['stat', 'obd'], ['stat', 'reminders']])).tone.stat === 'slab', 'every third stat is the slab (the page\'s turn, when the look rules allow both)');
  {
    // never a dead end: docs, no capture, after quote, quote, steps (docs), versus (docs), quote, stat
    const led = L([['quote', 'humor'], ['quote', 'auction'], ['steps', 'docs'], ['versus', 'docs'], ['quote', 'nav'], ['stat', 'obd']]);
    const a = allowedFor('docs', led, {captures: false});
    ok(a.allowed.length > 0 && !a.allowed.includes('quote'), `the judges' docs probe is never a dead end, never the quote (${a.allowed.join(', ')}; ${a.relaxed.join(', ')})`);
    for (const cat of ['stories', 'humor', 'carinfo', 'nav', 'parking', 'qr', 'vin', 'engine', 'obd', 'reminders', 'widgets', 'auction', 'docs', 'general', 'whatsnew', 'free', 'nope']) {
      const b = allowedFor(cat, led, {captures: false});
      if (!b.allowed.length || b.allowed.every((c) => c === 'quote')) ok(false, `${cat}: ${b.allowed.join(', ') || '(none)'} after the probe`);
    }
  }
  // ---- round 6 (the judges on the guard): the polaroid trap, the judges' exact page, the stream ----
  {
    // the round-5 page exactly as the judges replayed it (gallery-r5: 08 published after 12), oldest first
    const JUDGE = [
      ['v136-winter-digit', 'carinfo', 'stat', null, null, 'type', null],
      ['v131-three-minutes', 'stories', 'polaroid', 'story-toyota-2016-1', null, 'photo', 'cw'],
      ['v135-mountain-dad', 'nav', 'detail', '18-nav-lock-screen#live-activity', null, 'screen', null],
      ['v134-rainy-derby', 'parking', 'phone', '23-home-104#parking-row', null, 'row', null],
      ['demo-p2-humor-v905', 'humor', 'versus', null, 'stack-dark', 'dark', null],
      ['v131-wiper-notes', 'qr', 'steps', null, null, 'card', null],
      ['v131-seller-swears', 'obd', 'stat', null, null, 'type', null],
      ['v137-dagen-h', 'stories', 'polaroid', 'story-dagen-h-1967', null, 'photo', 'ccw'],
      ['v125-forgot-mechanic', 'reminders', 'timeline', null, null, 'type', null],
      ['v116-paper-note', 'widgets', 'versus', null, 'stack-dark', 'dark', null],
      ['v134-winter-battery', 'carinfo', 'bars', null, null, 'card', null],
      ['v121-empty-record', 'auction', 'stat', null, 'slab', 'dark', null],
    ];
    let tt = Date.parse('2026-10-27T10:00:00Z');
    let jl = [];
    for (const [id, cat, comp, asset, variant, look, pose] of JUDGE) jl = [ledgerLine({at: new Date((tt += 600000)).toISOString().replace(/\.\d{3}Z$/, 'Z'), id, cat, comp, asset, variant, look, pose}), ...jl];
    // the carinfo trap: before, allowedFor('carinfo') on this page was ['polaroid'] and nothing relaxed
    const car = allowedFor('carinfo', jl, {caps: []});
    ok(car.allowed.length > 0 && !car.allowed.includes('polaroid') && car.out.some((o) => o.comp === 'polaroid' && /credited photo/.test(o.rule)), `the judges' page: a carinfo film with no photo of its own is never offered the polaroid; the relax order runs instead (${car.allowed.join(', ')}; ${car.relaxed.join(', ')})`);
    ok(!['stat', 'bars', 'versus', 'steps'].some((c) => car.allowed.includes(c)) && !repeatProblems({comp: car.allowed[0]}, 'carinfo', jl, {caps: []}).length, `... it is never the stat beside, the versus above, the bars 2 back or a 2nd steps, and the check passes it (${car.allowed[0]})`);
    const carPh = allowedFor('carinfo', jl, {caps: [], photos: ['story-carinfo-own-1']});
    ok(carPh.allowed[0] === 'polaroid' && !carPh.hard, `... a carinfo film that shows its own credited photo gets the polaroid there (${carPh.allowed.join(', ')})`);
    ok(!allowedFor('carinfo', jl, {caps: [], photos: ['story-dagen-h-1967']}).allowed.includes('polaroid'), '... but not with a photo already on the page (R3)');
    ok(!allowedFor('stories', jl, {photos: []}).allowed.includes('polaroid') && allowedFor('stories', jl, {photos: []}).allowed.length > 0, 'a story film with no photo of its own: no polaroid, never empty');
    ok(!allowedFor('nav', [], {}).allowed.some((c) => c === 'detail' || c === 'phone'), 'no captures given: detail and phone are never offered (a capture must be verified to be shown)');
    // the next film after this page, every category: something it can make, and never a composition on a touching tile
    // or a 2nd steps (before: 8 of 14 dead-ended to a second steps card)
    const bad6 = [];
    for (const cat of CATEGORIES) {
      const a = allowedFor(cat, jl, {caps: SIM_CAPS[cat] ?? [], photos: cat === 'stories' ? ['story-next-1'] : []});
      const p = a.allowed[0];
      const touch = [0, 1, 2].some((i) => jl[i].comp === p) || (p === 'steps' && jl.slice(0, PAGE).some((l) => l.comp === 'steps'));
      if (!a.allowed.length || touch || p === 'quote' || repeatProblems({comp: p, asset: p === 'polaroid' ? 'story-next-1' : null}, cat, jl, {caps: SIM_CAPS[cat] ?? [], photos: cat === 'stories' ? ['story-next-1'] : []}).length) bad6.push(`${cat}: ${a.allowed.join(', ') || '(none)'}`);
    }
    ok(!bad6.length, `the judges' page: the next film of each of the 16 categories gets a composition no touching tile has, never a 2nd steps (${bad6.join('; ') || CATEGORIES.map((c) => `${c} ${allowedFor(c, jl, {caps: SIM_CAPS[c] ?? [], photos: c === 'stories' ? ['story-next-1'] : []}).allowed[0]}`).join(', ')})`);
  }
  {
    // the stream: 5 seeds x 320 films in random publish order, uniform and with the favoured categories heavier
    const runs = (weights) => [1, 2, 3, 4, 5].map((seed) => simulate({seed, n: 320, weights, caps: SIM_CAPS}));
    const sum = (rs) => rs.reduce((a, r) => Object.fromEntries(Object.keys(r).filter((k) => k !== 'ex').map((k) => [k, (a[k] ?? 0) + r[k]])), {});
    for (const [name, w, cornerMax] of [['uniform', {}, 0.12], ['skewed (stories 4, nav 3, carinfo 3, humor 2)', {stories: 4, nav: 3, carinfo: 3, humor: 2}, 0.1]]) {
      const rs = runs(w);
      const S = sum(rs);
      const pc = (k) => `${((100 * S[k]) / S.films).toFixed(1)} %`;
      ok(S.stalls === 0 && S.refused === 0, `stream ${name}, ${S.films} films: 0 stalls, the check refuses no pick the brief offered (${S.stalls} stalls${rs.flatMap((r) => r.ex).slice(0, 2).map((e) => `; ${e}`).join('')})`);
      ok(S.carinfoPolaroidOnly === 0 && S.polaroidNoPhoto === 0, `... no film without its own photo is offered the polaroid (${S.polaroidNoPhoto}), no carinfo film is left only the polaroid (${S.carinfoPolaroidOnly})`);
      ok(S.beside === 0 && S.above === 0 && S.once === 0 && S.quote2 === 0, `... never the same composition beside (${S.beside}) or above (${S.above}), never a 2nd steps or phone row in 12 (${S.once}), never a 2nd quote in 6 (${S.quote2})`);
      ok(S.corner / S.films <= cornerMax, `... the least-bad repeat, the same composition 4 back (a corner), on ${pc('corner')} of the films (at most ${cornerMax * 100} %: the categories with no verified capture have only the five own-data compositions); a composition rule relaxed for ${pc('hard')}; the same silhouette beside or above ${pc('sameShape')}`);
    }
  }
  console.log(bad ? `coverlog: ${bad} failed` : 'coverlog: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  if (cmd === '--test') process.exit(selfTest());
  const ledger = readLedger(root);
  if (cmd === 'allowed' && arg) {
    const a = allowedFor(arg, ledger, {caps: capturesFor(root, arg)});
    console.log(`${arg}: ${a.allowed.join(', ')}${a.relaxed.length ? ` (relaxed: ${a.relaxed.join(', ')})` : ''}`);
    for (const o of a.later) console.log(`  last ${o.comp}: ${o.rule}`);
    for (const o of a.out) console.log(`  out ${o.comp}: ${o.rule}`);
    console.log(`  captures and photos of the last ${PAGE}: ${a.assets.join(', ') || '(none)'}; polaroid ${a.polSign > 0 ? '+3' : '-3'} degrees; versus ${a.dark ? 'black' : 'white'}, stat ${a.slab ? 'slab' : 'plain'}`);
    process.exit(0);
  }
  if (cmd === 'sim') {
    const caps = Object.fromEntries(CATEGORIES.map((c) => [c, capturesFor(root, c)]));
    const weights = process.argv[4] === 'skew' ? {stories: 4, nav: 3, carinfo: 3, humor: 2} : {};
    const rs = [1, 2, 3, 4, 5].map((seed) => simulate({seed, n: Number(arg) || 320, weights, caps}));
    const S = Object.fromEntries(Object.keys(rs[0]).filter((k) => k !== 'ex').map((k) => [k, rs.reduce((a, r) => a + r[k], 0)]));
    const pc = (k) => `${S[k]} (${((100 * S[k]) / S.films).toFixed(1)} %)`;
    console.log(`${S.films} films (5 seeds, ${weights.stories ? 'skewed' : 'uniform'}, the captures of the files): stalls ${pc('stalls')}, check refusals ${S.refused}; a composition rule relaxed ${pc('hard')}`);
    console.log(`  the same composition beside ${pc('beside')}, above ${pc('above')}, 2 or 4 back ${pc('corner')}; a 2nd steps or phone row in 12 ${pc('once')}; a 2nd quote in 6 ${pc('quote2')}; the same silhouette beside or above ${pc('sameShape')}`);
    for (const e of rs.flatMap((r) => r.ex).slice(0, 5)) console.log(`  ${e}`);
    process.exit(S.stalls ? 1 : 0);
  }
  if (cmd === 'recent') {
    console.log(recentLines(ledger).join('\n') || '(none yet)');
    process.exit(0);
  }
  console.error('usage: node tools/ci/coverlog.mjs allowed <category> | recent | sim [n] [skew] | --test');
  process.exit(2);
}
