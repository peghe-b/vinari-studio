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
//   R4 NEXT     not the LOOK of the page's newest cover (the tile beside it): so never its composition in the same tone, and
//               never another white card beside a white card (a black versus beside a white one is another look); two real
//               photos are two pictures, so a polaroid may stand beside a polaroid (R2 and R3 still hold)
//   R5 ONCE     the phone's enlarged row and the steps at most once in the page's last 12 (their shape is the same whatever
//               they say: two steps covers correlate 0.97, COVER_TWIN)
//   R6 ABOVE    not the LOOK of the cover 3 places back (the tile above or below it), the same way
//   R7 LOOK     in any 6 covers in a row, at most 2 white cards of words, 2 black cards and 3 of bare type (pictures free)
//   R8 PICTURE  never a third cover without a picture (a real photo or a real screen's pixels) in a row, nor in a column
//               (the newest two, or the covers 3 and 6 places back): a gallery row of three always holds a picture when
//               the category has one to give
// The black versus and the stat's slab are a choice of tone, not a composition: each takes the page's turn (every second
// versus, every third stat) unless the other tone is what the look rules leave. When a category's list would be empty
// they relax in this order: R8, R7, R6, R4, then R2 allows 3 in 6 (never for a quote), then R1 keeps
// only the category's newest; R3 and R5 never relax. If nothing is left even then, the category's composition the page
// used longest ago (never the quote while another is there): the list is never empty. The polaroid's tilt is derived the
// same way (the other way from the last one's).
//   node tools/ci/coverlog.mjs allowed <category>   what the brief may offer now, and why the rest is out
//   node tools/ci/coverlog.mjs recent               the page's last 6 covers, as the brief shows them
//   node tools/ci/coverlog.mjs --test               the self-test (the test set from an empty ledger, the judges' probes)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compsFor, isPicture, lookOf, PHONE_POSES} from '../../src/cover/comps.mjs';
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
  look: ['card', 'dark', 'type', 'photo', 'screen'].includes(look) ? look : null,
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
/** R7: the most covers of a look in any 6 in a row (a picture has no cap) */
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

const STEPS = ['R8 PICTURE', 'R7 LOOK', 'R6 ABOVE', 'R4 NEXT', 'R2 PAGE6 (3 in 6)', 'R1 CAT2 (the newest only)'];

/**
 * What a new cover of category `cat` may use. opts.caps: the category's captures (capturesFor: which regions a "detail" can
 * show whole and which a "phone" row can set), so detail and phone drop out when nothing is left to show (none, or every
 * one on the page's last 12 covers); opts.captures: false = none (when caps is not given); opts.carplay: the film is about
 * CarPlay (the CarPlay cover leads the nav list).
 * -> {allowed, out: [{comp, rule}], relaxed: [rule], assets: [the last 12 covers' captures and photos], pose, polSign, slab,
 *     dark, tone: {comp: variant}}
 */
export const allowedFor = (cat, ledger, {captures = true, carplay = false, caps = null} = {}) => {
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
  // a quote needs its speaker: the app's own words on a current capture of the category ("says"), or a person's real photo
  // (a story, a free idea): with neither, it is never offered (round 3: the narrator's line put in the app's mouth)
  if (Array.isArray(caps) && !['stories', 'free'].includes(cat) && !caps.some((c) => c.says)) drop('quote', 'no speaker: no current capture of the category shows the app\'s own words');
  const count = (c) => last6.filter((l) => l.comp === c).length;
  const looks5 = page.slice(0, WINDOW - 1).map(lineLook);
  const noPic = (i) => i < page.length && !isPicture(lineLook(page[i]));
  const lookAt = (i) => (i < page.length ? lineLook(page[i]) : null);
  const rel = new Set();
  // the first rule an option (composition c in a tone) breaks, or null
  const broken = (c, tone) => {
    const cap = c === 'quote' ? QUOTE_MAX : rel.has('R2 PAGE6 (3 in 6)') ? 3 : 2;
    if (c !== 'polaroid' && mine.slice(0, rel.has('R1 CAT2 (the newest only)') ? 1 : 2).some((l) => l.comp === c)) return 'R1 CAT2';
    if (count(c) >= cap) return c === 'quote' ? 'R2 PAGE6 (a quote once in 6)' : 'R2 PAGE6';
    if (ONCE.includes(c) && last12.some((l) => l.comp === c)) return `R5 ONCE (${c === 'phone' ? 'the phone row' : 'the steps'} once in ${PAGE}: the same shape whatever it says)`;
    // the same composition in the same tone is the same look; a black versus beside a white one is not (round 3). Two
    // real photos are two pictures: a polaroid may stand beside another (R2 still holds them to 2 in 6, R3 each photo to
    // once in 12, and their tilts alternate)
    const same = (i) => lookAt(i) === tone.look && !(tone.look === 'photo' && page[i]?.asset !== undefined && c === 'polaroid');
    if (!rel.has('R4 NEXT') && same(0)) return `R4 NEXT (${page[0].comp === c ? 'the same composition' : `the same look, ${tone.look},`} beside it)`;
    if (!rel.has('R6 ABOVE') && same(2)) return `R6 ABOVE (${page[2].comp === c ? 'the same composition' : `the same look, ${tone.look},`} above it)`;
    if (!rel.has('R7 LOOK') && LOOK_MAX[tone.look] !== undefined && looks5.filter((k) => k === tone.look).length >= LOOK_MAX[tone.look]) return `R7 LOOK (a ${LOOK_MAX[tone.look] + 1}th ${tone.look} in 6)`;
    if (!rel.has('R8 PICTURE') && !isPicture(tone.look) && ((noPic(0) && noPic(1)) || (noPic(2) && noPic(5)))) return 'R8 PICTURE (a third cover without a picture in a row or a column)';
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
  for (const step of STEPS) {
    if (!base.length || base.some((c) => !why.has(c))) break;
    rel.add(step);
    relaxed.push(step);
    ({why, tone, toneWhy} = rules());
  }
  let allowed = base.filter((c) => !why.has(c));
  if (!allowed.length && base.length) {
    // never a dead end (the 27 Oct judges' probe): the category's composition the page used longest ago, the quote only
    // when nothing else is left (and not the phone row in 12)
    const age = (c) => {
      const i = page.findIndex((l) => l.comp === c);
      return i < 0 ? Infinity : i;
    };
    const pool = base.filter((c) => c !== 'quote' && !(c === 'phone' && last12.some((l) => l.comp === 'phone')));
    const pick = (pool.length ? pool : base).slice().sort((x, y) => age(y) - age(x))[0];
    allowed = [pick];
    why.delete(pick);
    tone[pick] = tonesOf(pick, ledger)[0].variant;
    relaxed.push(`the longest unused (${pick})`);
  }
  for (const [comp, rule] of why) out.push({comp, rule});
  return {
    allowed,
    out,
    relaxed,
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
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
    if (!cond) bad++;
  };
  const has = (ps, code) => ps.some((p) => p.includes(code));
  // the test set (2026-10-27, round 3) as a simulated gallery, oldest first, from an empty ledger: its 12 films and the net,
  // each the writer's pick among what the rule left (tools/covers.mjs --fresh renders the same order)
  const SEQ = [
    ['v136-winter-digit', 'carinfo', 'versus', null, 'stack'],
    ['v131-three-minutes', 'stories', 'polaroid', 'story-toyota-2016-1', null],
    ['v135-mountain-dad', 'nav', 'detail', '18-nav-lock-screen#live-activity', null],
    ['v134-rainy-derby', 'parking', 'stat', null, null],
    ['demo-p2-humor-v905', 'humor', 'versus', null, 'stack-dark'],
    ['v131-wiper-notes', 'qr', 'steps', null, null],
    ['v131-seller-swears', 'obd', 'stat', null, 'slab'],
    ['v134-winter-battery', 'carinfo', 'polaroid', 'engine-bay-clean', null],
    ['v137-dagen-h', 'stories', 'polaroid', 'story-dagen-h-1967', null],
    ['v125-forgot-mechanic', 'reminders', 'timeline', null, null],
    ['v121-empty-record', 'auction', 'stat', null, 'slab'],
    ['v116-paper-note', 'widgets', 'versus', null, 'stack'],
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
  ok(seqOk, 'the test set\'s 12 films pass R1 to R8 in order, each in the tone the rule left (the net of 02 stands in 02\'s place)');
  {
    // what the page's 12 tiles show: no look twice side by side or one above the other (two photos excepted), a picture in
    // 3 of the 4 rows (the fourth is qr, humor and obd: none of them has a verified capture or a photo yet)
    const page = ledger.slice(0, PAGE).map(lineLook);
    let twins = 0;
    for (let i = 0; i < page.length; i++) {
      if (i % 3 < 2 && page[i] === page[i + 1] && page[i] !== 'photo') twins++;
      if (i + 3 < page.length && page[i] === page[i + 3] && page[i] !== 'photo') twins++;
    }
    const rows = [0, 3, 6, 9].map((r) => page.slice(r, r + 3));
    // a row with no picture holds only films whose category has none to give (no capture that reads, no photo): R8 relaxed
    // for each of them and said so
    const bare = [0, 3, 6, 9].filter((r) => !page.slice(r, r + 3).some(isPicture)).flatMap((r) => ledger.slice(r, r + 3));
    const NOPIC = ['qr', 'humor', 'obd', 'reminders', 'auction', 'widgets', 'docs', 'parking'];
    ok(!twins && bare.every((l) => NOPIC.includes(l.cat)), `the page's 12 tiles: no look beside or above itself (two photos excepted), a picture in every row that could have one (${rows.map((r) => r.join(' ')).join(' | ')})`);
    ok(page.filter((k) => k === 'card').length <= 4, `at most a third of the page's tiles are white cards of words (${page.filter((k) => k === 'card').length} of 12)`);
  }
  ok(ledger.filter((l) => l.comp === 'polaroid').map((l) => l.pose).join(' ') === 'cw ccw cw', `three polaroids alternate their tilt (${ledger.filter((l) => l.comp === 'polaroid').map((l) => l.pose).join(' ')})`);
  ok(has(repeatProblems({comp: 'steps'}, 'docs', ledger, capsOf('docs')), 'R5'), 'R5: a second steps cover in 12 is refused (two steps covers are pixel twins, 0.97)');
  ok(!allowedFor('reminders', ledger, capsOf('reminders')).allowed.includes('quote'), 'a quote is never offered to a category with no speaker (no capture with the app\'s words, no photo)');
  ok(allowedFor('nav', [], {caps: [{...CAPS.nav[1], says: true}]}).allowed.includes('quote'), '... and offered where a current capture shows the app\'s words');
  const L = (rows) => rows.map(([comp, cat, asset, look, variant], i) => ledgerLine({at: `2026-10-27T${String(19 - i).padStart(2, '0')}:00:00Z`, id: `v${200 - i}-x`, cat, comp, asset, look, variant}));
  // each rule on its own
  ok(has(repeatProblems({comp: 'stat'}, 'carinfo', L([['quote', 'humor'], ['stat', 'carinfo']])), 'R1'), 'R1: not the category\'s last composition');
  ok(has(repeatProblems({comp: 'quote'}, 'auction', L([['steps', 'qr'], ['stat', 'obd'], ['quote', 'humor']])), 'R2'), 'R2: a quote once in 6');
  ok(has(repeatProblems({comp: 'stat'}, 'reminders', L([['steps', 'qr'], ['stat', 'obd'], ['polaroid', 'stories', 'story-a'], ['stat', 'auction']])), 'R2'), 'R2: not a third time in 6');
  ok(has(repeatProblems({comp: 'detail', asset: '07-parking#spot-row'}, 'parking', L([['steps', 'qr'], ['phone', 'whatsnew', '07-parking#x']])), 'R3'), 'R3: not the same capture as one of the last covers');
  ok(has(repeatProblems({comp: 'stat', variant: null}, 'auction', L([['stat', 'obd']]), capsOf('auction')), 'R4'), 'R4: not the newest cover\'s composition in the same tone (the plain stat beside a plain stat)');
  ok(allowedFor('auction', L([['stat', 'obd']]), capsOf('auction')).tone.stat === 'slab', '... the slab beside it is another look: the rule hands the stat its black card');
  ok(!repeatProblems({comp: 'versus', variant: 'stack'}, 'auction', L([['stat', 'obd'], ['quote', 'humor'], ['polaroid', 'stories', 'story-a']]), capsOf('auction')).length, 'a fresh composition in a fresh look passes (auction has no picture to give: R8 relaxes and says so)');
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
    const led = L([['phone', 'parking', '23-home-104#parking-row'], ['steps', 'qr']]);
    ok(has(repeatProblems({comp: 'versus', variant: 'stack'}, 'humor', led), 'R4'), 'probe: a white versus after [steps, phone row] is refused (R4: a white card beside a white card)');
    ok(allowedFor('humor', led).tone.versus === 'dark' && !repeatProblems({comp: 'versus', variant: 'stack-dark'}, 'humor', led).length, '... and the black versus is what the rule leaves (not by the page\'s turn: the turn is light here)');
    ok(!versusDark(led), '... (the turn really is light, so the black card above came from the look rule)');
  }
  ok(has(repeatProblems({comp: 'timeline'}, 'reminders', L([['polaroid', 'stories', 'story-a'], ['versus', 'carinfo', null, null, 'stack-dark'], ['stat', 'obd']])), 'R6'), 'probe: a timeline with a stat above it is refused (two bare numbers, one over the other)');
  ok(has(repeatProblems({comp: 'quote'}, 'auction', L([['polaroid', 'stories', 'story-a'], ['stat', 'obd'], ['bars', 'carinfo']])), 'R6'), 'probe: a quote with bars above it is refused (white card over white card)');
  ok(has(repeatProblems({comp: 'bars'}, 'carinfo', L([['versus', 'carinfo']])), 'R4'), 'probe: carinfo bars right after a carinfo white versus is refused');
  ok(has(repeatProblems({comp: 'bars'}, 'carinfo', L([['stat', 'obd'], ['steps', 'qr'], ['polaroid', 'stories', 'story-a'], ['quote', 'auction'], ['detail', 'nav', '18-nav-lock-screen#live-activity']])), 'R7'), 'R7: a third white card in 6 is refused even when no two touch');
  // R8: a third cover without a picture in a row (or a column) when the category has a picture to give
  {
    const led = L([['stat', 'obd'], ['versus', 'humor', null, null, 'stack-dark']]);
    ok(has(repeatProblems({comp: 'bars'}, 'carinfo', led), 'R8'), 'R8: a third cover without a picture in a row is refused when the category has a photo to give');
    const a = allowedFor('carinfo', led);
    ok(a.allowed.length === 1 && a.allowed[0] === 'polaroid', `... the polaroid is what is left (${a.allowed.join(', ')})`);
    const q = allowedFor('qr', led);
    ok(q.allowed.includes('steps') && q.relaxed[0] === 'R8 PICTURE', `... a category with no capture and no photo relaxes R8 first and says so (${q.relaxed.join(', ')})`);
    const col = L([['versus', 'humor', null, null, 'stack-dark'], ['polaroid', 'stories', 'story-a'], ['steps', 'qr'], ['detail', 'nav', '18-nav-lock-screen#live-activity'], ['detail', 'nav', '17-nav-drive#maneuver'], ['stat', 'obd']]);
    ok(has(repeatProblems({comp: 'timeline'}, 'carinfo', col), 'R8'), 'R8: nor a third in a column (the covers 3 and 6 places back)');
  }
  ok(!repeatProblems({comp: 'polaroid', asset: 'story-b'}, 'stories', L([['bars', 'carinfo'], ['steps', 'qr'], ['stat', 'obd'], ['detail', 'nav'], ['polaroid', 'stories', 'story-a']])).length, 'R1 lets a story take a new photo after a polaroid');
  // test films do not count (the gallery hides them)
  ok(!repeatProblems({comp: 'stat'}, 'carinfo', [ledgerLine({at: '2026-10-27T20:00:00Z', req: 'r-pwr9te-0001', id: 'v300-x', cat: 'carinfo', comp: 'stat'})]).length, 'a test film\'s cover does not count');
  ok(allowedFor('parking', [], {captures: false}).allowed.every((c) => c !== 'phone' && c !== 'detail'), 'no verified capture: detail and phone drop out');
  ok(!allowedFor('parking', [], capsOf('parking')).allowed.includes('detail') && allowedFor('parking', [], capsOf('parking')).allowed.includes('phone'), 'parking: the home row is too small for a detail, a phone row it is');
  ok(allowedFor('nav', [], {carplay: true}).allowed[0] === 'carplay', 'a CarPlay film puts the CarPlay cover first');
  ok(recentLines(ledger)[1] === 'v121-empty-record · auction · stat (dark)' && recentLines(ledger)[3] === 'v137-dagen-h · stories · polaroid story-dagen-h-1967 (photo)', `the brief's recent lines say what each tile shows (${recentLines(ledger).slice(0, 4).join('; ')})`);
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
    for (const o of a.out) console.log(`  out ${o.comp}: ${o.rule}`);
    console.log(`  captures and photos of the last ${PAGE}: ${a.assets.join(', ') || '(none)'}; polaroid ${a.polSign > 0 ? '+3' : '-3'} degrees; versus ${a.dark ? 'black' : 'white'}, stat ${a.slab ? 'slab' : 'plain'}`);
    process.exit(0);
  }
  if (cmd === 'recent') {
    console.log(recentLines(ledger).join('\n') || '(none yet)');
    process.exit(0);
  }
  console.error('usage: node tools/ci/coverlog.mjs allowed <category> | recent | --test');
  process.exit(2);
}
