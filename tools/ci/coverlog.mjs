// The page's cover ledger and the variety rule (2026-10-27, after the owner's „ეს ტელეფონის ქავერი მოქაფში ერთდაიგივეებია":
// 6 of 11 new covers were the same tilted phone, two of them the same parking screen).
//
// specs/.covers.jsonl: append-only, one line per published cover, written by tools/ci/publish.mjs from out/<id>.cover.json
// (tools/covers.mjs), committed in a commit of its own so a test film's revert never takes it back:
//   {"at","req","id","cat","comp","asset","pose","variant","test","sig"}
// "test": the gallery hides the agents' test films (r-pwr*, r-p2x*, meta "test": web/api/studio.js, 2026-10-27), so the rules
// read only the lines the page shows. Order: by "at" (the publish time), newest first; never by film number.
//
// The rules (COVER_REPEAT), on the page's last 6 covers:
//   R1 CAT2    not the composition of either of the category's last 2 covers
//   R2 PAGE6   not a composition already used by 2 of the page's last 6 (at most 2 in 6)
//   R3 ASSET6  not the capture or photo of any of the page's last 6, whatever the composition
//   R4 NEXT    not the composition of the page's newest cover
//   R5 PHONE   the tilted phone at most once in the last 6
// When a category's list would be empty: R4 goes first, then R2 allows 3 in 6. R1, R3 and R5 never relax. Derived the same
// way: the phone's pose (the next after the last phone's), the polaroid's tilt (the other way from the last one's), the
// stat's "slab" (every third stat).
//
//   node tools/ci/coverlog.mjs allowed <category>   what the brief may offer now, and why the rest is out
//   node tools/ci/coverlog.mjs recent               the page's last 6 covers, as the brief shows them
//   node tools/ci/coverlog.mjs --test               the self-test (the design's 12-film sequence from an empty ledger)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compsFor, PHONE_POSES} from '../../src/cover/comps.mjs';

export const LEDGER = 'specs/.covers.jsonl';
export const WINDOW = 6;
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
export const ledgerLine = ({at, req, id, cat, comp, asset, pose, variant, test, sig}) => ({
  at: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(String(at ?? '')) ? at : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  req: typeof req === 'string' ? req.slice(0, 40) : null,
  id: String(id ?? '').slice(0, 80),
  cat: /^[a-z]{2,16}$/.test(String(cat ?? '')) ? cat : null,
  comp: String(comp ?? '').slice(0, 20),
  asset: asset ? String(asset).slice(0, 80) : null,
  pose: pose ? String(pose).slice(0, 20) : null,
  variant: variant ? String(variant).slice(0, 20) : null,
  test: Boolean(test) || TEST_REQ.test(String(req ?? '')),
  sig: typeof sig === 'string' && /^[A-Za-z0-9+/=]{100,1200}$/.test(sig) ? sig : null,
});

export const appendLine = (root, line, file = LEDGER) => {
  fs.appendFileSync(path.join(root, file), `${JSON.stringify(ledgerLine(line))}\n`);
};

/** the lines the page shows, newest first */
const shown = (ledger) => ledger.filter((l) => !isTest(l));

/**
 * What a new cover of category `cat` may use. opts.captures: does the category have a verified capture with a named region
 * (false: detail and phone drop out); opts.carplay: the film is about CarPlay (the CarPlay cover leads the nav list).
 * -> {allowed, out: [{comp, rule}], relaxed: [rule], assets: [the last 6 covers' captures and photos], pose, polSign, slab}
 */
export const allowedFor = (cat, ledger, {captures = true, carplay = false} = {}) => {
  const page = shown(ledger);
  const last6 = page.slice(0, WINDOW);
  const mine = page.filter((l) => l.cat === cat).slice(0, 2);
  let base = compsFor(cat);
  if (cat === 'nav' && carplay) base = ['carplay', ...base];
  const out = [];
  if (!captures) {
    for (const c of ['detail', 'phone']) if (base.includes(c)) out.push({comp: c, rule: 'no verified capture with a named region'});
    base = base.filter((c) => c !== 'detail' && c !== 'phone');
  }
  const count = (c) => last6.filter((l) => l.comp === c).length;
  const rules = (relax) => {
    const why = new Map();
    for (const c of base) {
      if (mine.some((l) => l.comp === c)) why.set(c, 'R1 CAT2');
      else if (count(c) >= (relax >= 2 ? 3 : 2)) why.set(c, 'R2 PAGE6');
      else if (c === 'phone' && count('phone') >= 1) why.set(c, 'R5 PHONE');
      else if (relax < 1 && page[0]?.comp === c) why.set(c, 'R4 NEXT');
    }
    return why;
  };
  let relax = 0;
  let why = rules(0);
  const relaxed = [];
  while (base.every((c) => why.has(c)) && relax < 2) {
    relax++;
    relaxed.push(relax === 1 ? 'R4 NEXT' : 'R2 PAGE6 (3 in 6)');
    why = rules(relax);
  }
  for (const [comp, rule] of why) out.push({comp, rule});
  const stats = page.filter((l) => l.comp === 'stat').length;
  return {
    allowed: base.filter((c) => !why.has(c)),
    out,
    relaxed,
    assets: [...new Set(last6.map((l) => l.asset).filter(Boolean).flatMap((a) => [a, a.split('#')[0]]))],
    pose: phonePose(page),
    polSign: polSign(page),
    slab: stats % 3 === 2,
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

/** COVER_REPEAT: what is wrong with a cover {comp, asset} of category `cat` against the ledger */
export const repeatProblems = (cover, cat, ledger, opts = {}) => {
  const a = allowedFor(cat, ledger, opts);
  const outs = [];
  const hit = a.out.find((o) => o.comp === cover.comp);
  const listed = compsFor(cat).includes(cover.comp) || (cover.comp === 'carplay' && cat === 'nav');
  if (!listed) outs.push(`COVER_REPEAT "${cover.comp}" is not one of the ${cat} covers (${compsFor(cat).join(', ')})`);
  else if (hit) outs.push(`COVER_REPEAT "${cover.comp}" breaks ${hit.rule} (the page's last covers): take one of ${a.allowed.join(', ') || '(none)'}`);
  if (cover.asset) {
    const src = cover.asset.split('#')[0];
    if (a.assets.includes(cover.asset) || a.assets.includes(src)) outs.push(`COVER_REPEAT R3 ASSET6 "${cover.asset}" was on one of the page's last ${WINDOW} covers: another capture or photo`);
  }
  return outs;
};

/** The category's captures a "detail" or "phone" cover may show: in its screens (out/ci/categories.now.json in the cloud,
 *  where the App Store gate is applied, else ci/categories.json), with a named region (public/screens/regions.json) and
 *  verified against the store's version (public/screens/screens.json). */
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
  return screens
    .filter((src) => regions[src] && typeof regions[src] === 'object' && ok(info[src]?.verified))
    .map((src) => ({src, regions: Object.keys(regions[src])}));
};

/** the page's last 6 covers, one line each, newest first: "v137-dagen-h · stories · polaroid story-dagen-h-1967" */
export const recentLines = (ledger) =>
  shown(ledger)
    .slice(0, WINDOW)
    .map((l) => [l.id, l.cat ?? '?', `${l.comp}${l.asset ? ` ${l.asset}` : ''}`].join(' · '));

// ---- self-test ---------------------------------------------------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
    if (!cond) bad++;
  };
  // the design's test set (2026-10-27, section 9) as a simulated gallery, oldest first, from an empty ledger
  const SEQ = [
    ['v136-winter-digit', 'carinfo', 'versus', null],
    ['v131-three-minutes', 'stories', 'polaroid', 'story-toyota-2016-1'],
    ['v135-mountain-dad', 'nav', 'detail', '18-nav-lock-screen#live-activity'],
    ['v134-rainy-derby', 'parking', 'phone', '07-parking#spot-row'],
    ['demo-p2-humor-v905', 'humor', 'quote', null],
    ['v131-wiper-notes', 'qr', 'steps', null],
    ['v131-seller-swears', 'obd', 'versus', null],
    ['v134-winter-battery', 'carinfo', 'bars', null],
    ['v137-dagen-h', 'stories', 'timeline', null],
    ['v125-forgot-mechanic', 'reminders', 'stat', null],
    ['v121-empty-record', 'auction', 'quote', null],
    ['v116-paper-note', 'widgets', 'versus', null],
  ];
  let ledger = [];
  let t = Date.parse('2026-10-27T10:00:00Z');
  let seqOk = true;
  SEQ.forEach(([id, cat, comp, asset], i) => {
    const p = repeatProblems({comp, asset}, cat, ledger);
    if (p.length) {
      seqOk = false;
      console.log(`     #${i + 1} ${id}: ${p.join(' | ')}`);
    }
    const a = allowedFor(cat, ledger);
    const pose = comp === 'phone' ? a.pose : comp === 'polaroid' ? (a.polSign > 0 ? 'cw' : 'ccw') : null;
    ledger = [ledgerLine({at: new Date((t += 600000)).toISOString().replace(/\.\d{3}Z$/, 'Z'), id, cat, comp, asset, pose}), ...ledger];
  });
  ok(seqOk, 'the design\'s 12 covers pass R1 to R5 in order');
  ok(ledger.find((l) => l.comp === 'phone')?.pose === 'left-lean', 'the first phone takes the first pose (left-lean)');
  ok(phonePose(ledger) === 'right-lean', 'the next phone takes the next pose (right-lean)');
  ok(polSign(ledger) === -1, 'the next polaroid tilts the other way');
  // each rule on its own
  const L = (rows) => rows.map(([comp, cat, asset], i) => ledgerLine({at: `2026-10-27T1${9 - i}:00:00Z`, id: `v${200 - i}-x`, cat, comp, asset}));
  ok(repeatProblems({comp: 'stat'}, 'carinfo', L([['quote', 'humor'], ['stat', 'carinfo']])).some((p) => p.includes('R1')), 'R1: not the category\'s last composition');
  ok(repeatProblems({comp: 'quote'}, 'auction', L([['steps', 'qr'], ['quote', 'humor'], ['stat', 'obd'], ['quote', 'nav']])).some((p) => p.includes('R2')), 'R2: not a third time in 6');
  ok(repeatProblems({comp: 'detail', asset: '07-parking#spot-row'}, 'parking', L([['steps', 'qr'], ['phone', 'whatsnew', '07-parking#x']])).some((p) => p.includes('R3')), 'R3: not the same capture as one of the last 6');
  ok(repeatProblems({comp: 'quote'}, 'auction', L([['quote', 'humor']])).some((p) => p.includes('R4')), 'R4: not the newest cover\'s composition');
  ok(repeatProblems({comp: 'phone', asset: '23-home-104#value'}, 'whatsnew', L([['steps', 'qr'], ['stat', 'obd'], ['phone', 'parking', '07-parking#spot-row']])).some((p) => p.includes('R5')), 'R5: the tilted phone once in 6');
  ok(!repeatProblems({comp: 'quote'}, 'auction', L([['steps', 'qr'], ['quote', 'humor'], ['stat', 'obd']])).length, 'a fresh composition passes');
  // relaxation: docs (steps, versus, detail, quote) with everything used: R4 goes, then R2 allows 3 in 6; R1 never
  {
    const led = L([['quote', 'humor'], ['versus', 'widgets'], ['steps', 'qr'], ['versus', 'obd'], ['steps', 'general'], ['quote', 'auction']]);
    const a = allowedFor('docs', led, {captures: false});
    ok(a.allowed.length > 0 && a.relaxed.length > 0, `a full page relaxes R4 first, then R2 (${a.relaxed.join(', ')}: ${a.allowed.join(', ')})`);
    const b = allowedFor('docs', [ledgerLine({at: '2026-10-27T20:00:00Z', id: 'v201-d', cat: 'docs', comp: 'steps'}), ...led], {captures: false});
    ok(!b.allowed.includes('steps'), 'R1 never relaxes');
  }
  // test films do not count (the gallery hides them)
  ok(!repeatProblems({comp: 'stat'}, 'carinfo', [ledgerLine({at: '2026-10-27T20:00:00Z', req: 'r-pwr9te-0001', id: 'v300-x', cat: 'carinfo', comp: 'stat'})]).length, 'a test film\'s cover does not count');
  ok(allowedFor('parking', [], {captures: false}).allowed.every((c) => c !== 'phone' && c !== 'detail'), 'no verified capture: detail and phone drop out');
  ok(allowedFor('nav', [], {carplay: true}).allowed[0] === 'carplay', 'a CarPlay film puts the CarPlay cover first');
  ok(recentLines(ledger)[0] === 'v116-paper-note · widgets · versus', 'the brief\'s recent line');
  // the stat slab: every third stat
  ok(allowedFor('reminders', L([['stat', 'obd'], ['stat', 'reminders']])).slab === true, 'every third stat is the slab');
  console.log(bad ? `coverlog: ${bad} failed` : 'coverlog: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  if (cmd === '--test') process.exit(selfTest());
  const ledger = readLedger(root);
  if (cmd === 'allowed' && arg) {
    const a = allowedFor(arg, ledger);
    console.log(`${arg}: ${a.allowed.join(', ')}${a.relaxed.length ? ` (relaxed: ${a.relaxed.join(', ')})` : ''}`);
    for (const o of a.out) console.log(`  out ${o.comp}: ${o.rule}`);
    console.log(`  assets of the last ${WINDOW}: ${a.assets.join(', ') || '(none)'}; phone pose ${a.pose}; polaroid ${a.polSign > 0 ? '+3' : '-3'} degrees${a.slab ? '; a stat is the slab' : ''}`);
    process.exit(0);
  }
  if (cmd === 'recent') {
    console.log(recentLines(ledger).join('\n') || '(none yet)');
    process.exit(0);
  }
  console.error('usage: node tools/ci/coverlog.mjs allowed <category> | recent | --test');
  process.exit(2);
}
