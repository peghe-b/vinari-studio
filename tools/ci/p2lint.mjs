// Phase 2's spec guards (src/lib/p2.mjs; plan step 10): what a P2 film's spec must and must not do, read before the voice is
// spent. check.mjs runs them (fatal in the cloud for a P2 film); the pixel guards on the frames are tools/ci/p2pixels.py.
//
//   p2Problems(spec, {timeline, prev})   one "CODE ..." line each, or []. timeline: the voice's (or an estimate);
//                                        prev: the specs of the 2 films before it (REPEAT_TEMPLATE)
//   node tools/ci/p2lint.mjs <id>        lint specs/<id>.json      node tools/ci/p2lint.mjs --test   the self-test
//
// Codes:
//   RETIRED          a retired scene (src/lib/retired.mjs): Drive, Windshield, Person, Pump, CarNight, the small Phone, the photo band
//   TEXT_WIDE        a headline, reveal, number label or cover title wider than 860 px at the smallest size its scene sets it
//   PLACEHOLDER      an empty value where a number or a word belongs (a row's value, a total, a stat)
//   CLUTTER          more than 3 hand marks in one shot
//   SCENE_REPEAT     the same scene type more than twice in one film (PICTURE_AGAIN's phase-2 half)
//   FILM_SHARE       the film's own Film scene draws more than 25 % of the shots
//   APP_TIME         an app film with less than 4 s of app (ScreenFocus, TapTrail, ScreenDeck)
//   HOOK_FRAME0      the first shot cannot read a claim at frame 0 (it is not a hook scene with its claim)
//   SHOT_LONG        a shot over 75 frames (a signature shot over 200)
//   KIT_MIN          fewer than 2 annotation or data parts in the film
//   TITLE_CARD       no FilmTitleCard, or more than one
//   KEYWORD_SUBS     a KeywordLift beat without "subs": "inPicture" (its words would show twice)
//   UNIT_SOURCE      a UnitGrid (or a grid title card) without whose figure it is
//   BARS_ZERO        a bar or a rank value below zero (bars start at zero)
//   TWIST_WORD       a Twist reveal over 7 Mtavruli letters a word
//   ONCE             TypeDive or ShapeMatch more than once
//   REPEAT_TEMPLATE  the hook type, the title card's kind or the hero object of either of the previous 2 films
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {p2On} from '../../src/lib/p2.mjs';
import {retiredScene} from '../../src/lib/retired.mjs';
import {fitLines, textW} from '../../src/lib/textfit.mjs';
import {estimateTimeline} from './fx.mjs';
import {vNumber} from './ending.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
export const TEXT_W = 860;
export const APP_SCENES = new Set(['ScreenFocus', 'TapTrail', 'ScreenDeck']);
export const HOOK_SCENES = new Set(['FreezeTag', 'IrisDetail', 'KeywordLift', 'FilmTitleCard', 'ScreenFocus', 'Receipt', 'Twist', 'KineticHeadline', 'BigNumber', 'Film']);
/** the P2 annotation and data parts (steps 3 and 6) */
export const KIT_SCENES = new Set(['KeywordLift', 'Receipt', 'UnitGrid', 'ScaleReveal', 'RankShift', 'RouteTrace', 'WipeCompare', 'FilmTitleCard', 'ScreenFocus', 'TapTrail']);
const SIGNATURE = new Set(['FilmTitleCard', 'TapTrail', 'Receipt', 'RankShift', 'Film', 'EndCard']);
/** categories with no app in them (the owner, 2026-10-21): no APP_TIME */
const NO_APP = new Set(['stories', 'carinfo', 'humor', 'free']);

/** the shots: [{scene, beat, from, to}] in frames, from the timeline (a beat's scene runs until the next scene; cuts split it) */
export const shotsOf = (spec, timeline) => {
  const tl = timeline ?? estimateTimeline(spec);
  const out = [];
  (spec.beats ?? []).forEach((b, i) => {
    const tb = tl.beats[i];
    if (!tb) return;
    const start = Math.round(tb.start * FPS);
    if (b.scene) out.push({scene: b.scene, beat: i, from: start});
    for (const c of b.cuts ?? []) {
      const ch = tb.chunks?.[c.chunk];
      if (ch && c.scene) out.push({scene: c.scene, beat: i, from: Math.round(ch.start * FPS) - 2});
    }
  });
  const end = Math.round((tl.duration ?? tl.beats[tl.beats.length - 1]?.end ?? 0) * FPS);
  out.sort((a, b) => a.from - b.from);
  return out.map((s, k) => ({...s, to: k + 1 < out.length ? out[k + 1].from : end}));
};

const LETTERS = /\p{L}/gu;
const mtavLetters = (w) => (String(w).match(LETTERS) ?? []).length;

/** the text a scene sets, with the smallest size its scene fits it at and the lines it may take */
const textsOf = (sc) => {
  const t = [];
  const add = (text, min, lines = 1, weight = 700) => typeof text === 'string' && text.trim() && t.push({text, min, lines, weight});
  switch (sc.type) {
    case 'FilmTitleCard':
      add(sc.title, 72, 2);
      break;
    case 'FreezeTag':
      add(sc.claim, 110, 2);
      add(sc.tag, 56, 1);
      break;
    case 'IrisDetail':
      add(sc.claim, 100, 2);
      break;
    case 'KeywordLift':
      add((sc.lift ?? []).join(' '), 120, 2);
      break;
    case 'TypeDive':
      add(sc.word, 120, 1);
      break;
    case 'Twist':
      for (const r of sc.reveal ?? []) add(typeof r === 'string' ? r : r?.text, 120, 1);
      break;
    case 'KineticHeadline':
      for (const l of sc.lines ?? []) add(typeof l === 'string' ? l : l?.text, 72, 1);
      break;
    case 'BigNumber':
      add(sc.label, 44, 2, 600);
      break;
  }
  return t;
};
const marksOf = (sc) => (Array.isArray(sc.marks) ? sc.marks.length : 0) + (sc.mark ? 1 : 0);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());

export const p2Problems = (spec, {timeline = null, prev = []} = {}) => {
  if (!p2On(vNumber(spec?.id))) return [];
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  let shots = [];
  try {
    shots = shotsOf(spec, timeline);
  } catch {
    shots = beats.filter((b) => b.scene).map((b, i) => ({scene: b.scene, beat: i, from: 0, to: 60}));
  }
  const scenes = shots.map((s) => s.scene);
  // RETIRED
  shots.forEach((s) => {
    const why = retiredScene(s.scene);
    if (why) out.push(`RETIRED beats[${s.beat}] ${s.scene.type}: ${why}`);
  });
  // TEXT_WIDE
  for (const s of shots)
    for (const x of textsOf(s.scene)) {
      const f = fitLines(x.text, TEXT_W, x.lines, x.min, {weight: x.weight, mtav: true, min: x.min});
      if (!f.fits) out.push(`TEXT_WIDE beats[${s.beat}] ${s.scene.type} "${x.text}" does not fit ${TEXT_W} px in ${x.lines} line${x.lines > 1 ? 's' : ''} even at ${x.min} px (${Math.round(Math.max(...f.lines.map((l) => textW(l, x.min, {mtav: true, weight: x.weight}))))} px): say it in fewer letters`);
    }
  if (spec?.cover?.title) {
    const lines = String(spec.cover.title).split('|');
    for (const l of lines) if (textW(l.trim(), 96, {mtav: true, weight: 700}) > TEXT_W * 1.5) out.push(`TEXT_WIDE cover.title line "${l.trim()}" is too long for the cover's two lines`);
  }
  // PLACEHOLDER, BARS_ZERO, UNIT_SOURCE, CLUTTER, TWIST_WORD
  for (const s of shots) {
    const sc = s.scene;
    const where = `beats[${s.beat}] ${sc.type}`;
    for (const r of sc.rows ?? []) {
      if (sc.type === 'RankShift') {
        if (![r.a, r.b].every(Number.isFinite)) out.push(`PLACEHOLDER ${where} a row without both values (a, b)`);
        else if (r.a < 0 || r.b < 0) out.push(`BARS_ZERO ${where} "${r.label}" below zero: bars start at zero`);
      } else if (empty(r?.value)) out.push(`PLACEHOLDER ${where} row "${r?.label ?? '?'}" has no value: a grey bar where a value belongs never ships`);
      else if (typeof r.value === 'number' && r.value < 0) out.push(`BARS_ZERO ${where} "${r.label}" below zero: bars start at zero`);
    }
    if (sc.total && empty(sc.total.value)) out.push(`PLACEHOLDER ${where} the total has no value`);
    if (sc.type === 'FilmTitleCard' && (sc.kind === 'stat' || sc.kind === 'grid') && empty(sc.value)) out.push(`PLACEHOLDER ${where} a ${sc.kind} card without its value`);
    if ((sc.type === 'UnitGrid' || (sc.type === 'FilmTitleCard' && sc.kind === 'grid')) && empty(sc.source)) out.push(`UNIT_SOURCE ${where}: "N of 100" needs "source" (whose figure it is)`);
    if (marksOf(sc) > 3) out.push(`CLUTTER ${where}: ${marksOf(sc)} marks in one shot (3 at most)`);
    if (sc.type === 'Twist')
      for (const r of sc.reveal ?? []) {
        const w = String(typeof r === 'string' ? r : r?.text ?? '');
        if (w.split(/\s+/).some((x) => mtavLetters(x) > 7)) out.push(`TWIST_WORD ${where} "${w}": a reveal word is 7 Mtavruli letters at most`);
      }
  }
  // KEYWORD_SUBS
  beats.forEach((b, i) => {
    if (b.scene?.type === 'KeywordLift' && b.subs !== 'inPicture') out.push(`KEYWORD_SUBS beats[${i}] KeywordLift draws the spoken line itself: the beat says "subs": "inPicture" (else its words show twice)`);
  });
  // SCENE_REPEAT, FILM_SHARE, ONCE
  const count = new Map();
  for (const sc of scenes) if (sc.type !== 'EndCard') count.set(sc.type, (count.get(sc.type) ?? 0) + 1);
  for (const [t, n] of count) if (n > 2 && t !== 'Film') out.push(`SCENE_REPEAT ${t} ${n} times: the same scene type twice a film at most (a new picture every shot)`);
  const nonEnd = scenes.filter((s) => s.type !== 'EndCard').length;
  const films = count.get('Film') ?? 0;
  if (nonEnd >= 4 && films / nonEnd > 0.25) out.push(`FILM_SHARE the film's own Film scene draws ${films} of ${nonEnd} shots (25 % at most): compose the P2 kit for the rest`);
  for (const t of ['TypeDive', 'ShapeMatch']) if ((count.get(t) ?? 0) > 1) out.push(`ONCE ${t} ${count.get(t)} times: once a film at most`);
  // TITLE_CARD, KIT_MIN
  const cards = count.get('FilmTitleCard') ?? 0;
  if (cards !== 1) out.push(`TITLE_CARD ${cards} FilmTitleCard: exactly one, the film's signature infographic (the cover is the same card)`);
  const kit = scenes.filter((s) => KIT_SCENES.has(s.type) || marksOf(s) > 0).length;
  if (kit < 2) out.push(`KIT_MIN ${kit} annotation or data part${kit === 1 ? '' : 's'}: at least 2 (Ink marks, Callout, Receipt, UnitGrid, RankShift, ScaleReveal, RouteTrace, WipeCompare, KeywordLift, the title card)`);
  // HOOK_FRAME0
  const first = shots[0]?.scene;
  if (first && !HOOK_SCENES.has(first.type)) out.push(`HOOK_FRAME0 the film opens on ${first.type}: open on a hook with its claim readable at frame 0 (FreezeTag, IrisDetail, KeywordLift, FilmTitleCard, a struck number, the result first)`);
  // APP_TIME
  if (!NO_APP.has(spec.category)) {
    const app = shots.filter((s) => APP_SCENES.has(s.scene.type)).reduce((t, s) => t + (s.to - s.from), 0) / FPS;
    if (app < 4) out.push(`APP_TIME ${app.toFixed(1)} s of app in an app film (4 s at least: ScreenFocus, TapTrail, ScreenDeck)`);
  }
  // SHOT_LONG
  for (const s of shots) {
    const d = s.to - s.from;
    const max = SIGNATURE.has(s.scene.type) ? 200 : 75;
    if (d > max) out.push(`SHOT_LONG beats[${s.beat}] ${s.scene.type} holds ${d} frames (${max} at most): cut it, or split the sentence with "cuts"`);
  }
  // REPEAT_TEMPLATE
  const sig = (sp) => {
    const sc = (sp?.beats ?? []).map((b) => b.scene).filter(Boolean);
    return {hook: sc[0]?.type ?? null, card: sc.find((x) => x.type === 'FilmTitleCard')?.kind ?? null, hero: String(sp?.treatment?.heroObject ?? sp?.treatment?.hero ?? '').trim().toLowerCase() || null};
  };
  const me = sig(spec);
  for (const p of prev.slice(0, 2)) {
    const o = sig(p);
    if (me.hook && me.hook === o.hook) out.push(`REPEAT_TEMPLATE the film opens on ${me.hook} like ${p.id}: a different hook type than the last 2 films`);
    if (me.card && me.card === o.card) out.push(`REPEAT_TEMPLATE the title card is a "${me.card}" like ${p.id}'s: a different signature graphic than the last 2 films`);
    if (me.hero && me.hero === o.hero) out.push(`REPEAT_TEMPLATE the hero object "${me.hero}" is ${p.id}'s: a new hero`);
  }
  return out;
};

/** the specs of the 2 films before film `id` (by number, the base films only) */
export const prevSpecs = (id, specsDir = path.join(root, 'specs')) => {
  const n = vNumber(id);
  let files = [];
  try {
    files = fs.readdirSync(specsDir).filter((f) => /^v\d+-[a-z0-9-]+\.json$/.test(f) && !/-r\d+\.json$/.test(f) && !/-(en|ru)\.json$/.test(f));
  } catch {}
  return files
    .map((f) => ({f, n: vNumber(f)}))
    .filter((x) => x.n < n && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(specsDir, x.f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const selfTest = async () => {
  const {P2_FROM} = await import('../../src/lib/p2.mjs');
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const id = `v${P2_FROM}-test`;
  const end = {say: 'შეგიძლია ერთი კვირა უფასოდაც სცადო.', scene: {type: 'EndCard', tagline: 'შეგიძლია ერთი კვირა უფასოდაც სცადო.'}, hold: 0.4};
  const good = {
    id,
    category: 'obd',
    beats: [
      {say: 'ექვსი ათასი კილომეტრი.', scene: {type: 'FilmTitleCard', title: 'ერთი ბარათი', kind: 'stat', value: '6000', unit: 'კმ'}},
      {say: 'აი, | რას გეუბნება.', scene: {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 400, h: 500}}},
      {say: 'სამ შეხებაში | გახსნი, | დაიწყებ | და წაიკითხავ.', scene: {type: 'TapTrail', steps: [{screen: '23-home-104', tap: {x: 540, y: 1500}, verb: 'გახსენი'}, {screen: '22-obd-result', tap: {x: 540, y: 1400}, verb: 'წაიკითხე'}]}},
      {say: 'ხელოსანი, | ნაწილი.', scene: {type: 'Receipt', rows: [{label: 'ხელოსანი', value: '80 ₾'}], total: {label: 'სულ', value: '80 ₾'}}},
      end,
    ],
  };
  const codes = (sp, o) => p2Problems(sp, o).map((l) => l.split(' ')[0]);
  ok(codes(good).length === 0, `a P2 film built from the kit passes (${p2Problems(good).join(' / ')})`);
  ok(p2Problems({...good, id: `v${P2_FROM - 1}-old`}).length === 0, 'an older film: no P2 rule');
  const swap = (i, sc, extra = {}) => ({...good, beats: good.beats.map((b, k) => (k === i ? {...b, scene: sc, ...extra} : b))});
  ok(codes(swap(1, {type: 'Drive'})).includes('RETIRED'), 'a Drive scene: RETIRED');
  ok(codes(swap(0, {type: 'FilmTitleCard', title: 'გამარჯვებულიგამარჯვებულიგამარჯვებულიგამარჯვებული', kind: 'stat', value: '1'})).includes('TEXT_WIDE'), 'an endless title: TEXT_WIDE');
  ok(codes(swap(3, {type: 'Receipt', rows: [{label: 'ა', value: ''}], total: {label: 'ბ', value: '1'}})).includes('PLACEHOLDER'), 'an empty value: PLACEHOLDER');
  ok(codes(swap(3, {type: 'UnitGrid', n: 30, label: 'ა'})).includes('UNIT_SOURCE'), 'a UnitGrid without a source: UNIT_SOURCE');
  ok(codes(swap(3, {type: 'RankShift', rows: [{label: 'ა', a: -3, b: 4}]})).includes('BARS_ZERO'), 'a bar below zero: BARS_ZERO');
  ok(codes(swap(0, {type: 'Stat', value: 3})).includes('HOOK_FRAME0'), 'a film opening on a calm Stat: HOOK_FRAME0');
  ok(codes(swap(2, {type: 'Receipt', rows: [{label: 'ა', value: '1'}], total: {label: 'ბ', value: '1'}})).includes('APP_TIME'), 'an app film with one short app shot: APP_TIME');
  ok(!codes({...swap(2, {type: 'Receipt', rows: [{label: 'ა', value: '1'}], total: {label: 'ბ', value: '1'}}), category: 'stories'}).includes('APP_TIME'), 'a story has no APP_TIME');
  ok(codes(swap(0, {type: 'KeywordLift', lift: ['ექვსი']})).includes('KEYWORD_SUBS'), 'KeywordLift without subs inPicture: KEYWORD_SUBS');
  ok(!codes(swap(0, {type: 'KeywordLift', lift: ['ექვსი']}, {subs: 'inPicture'})).includes('KEYWORD_SUBS'), 'KeywordLift with subs inPicture passes');
  ok(codes(swap(0, {type: 'Twist', reveal: ['გამარჯვებული']})).includes('TWIST_WORD'), 'a 12-letter Twist word: TWIST_WORD');
  ok(codes(swap(3, {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 1, h: 1}, marks: [1, 2, 3, 4]})).includes('CLUTTER'), 'four marks in a shot: CLUTTER');
  const noCard = swap(0, {type: 'FreezeTag', claim: 'ორასი ლარი', src: 'dash-warning-lights', tag: 'ეს მე'});
  ok(codes(noCard).includes('TITLE_CARD'), 'no title card: TITLE_CARD');
  const long = {...good, beats: [...good.beats.slice(0, 4), {say: 'ა '.repeat(60), scene: {type: 'UnitGrid', n: 3, label: 'ა', source: 'ბ'}}, end]};
  ok(codes(long).includes('SHOT_LONG'), 'a 4 s UnitGrid: SHOT_LONG');
  const prev = [{id: 'v1-a', beats: [{scene: {type: 'FilmTitleCard', kind: 'stat'}}]}];
  ok(codes(good, {prev}).filter((c) => c === 'REPEAT_TEMPLATE').length === 2, 'the same hook type and card kind as the film before: REPEAT_TEMPLATE');
  const three = {...good, beats: [good.beats[0], ...[1, 2, 3].map(() => ({say: 'ა ბ.', scene: {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 1, h: 1}}})), end]};
  ok(codes(three).includes('SCENE_REPEAT'), 'ScreenFocus three times: SCENE_REPEAT');
  // the fixtures in ci/fixtures/p2/: each names the codes it must raise
  const dir = path.join(root, 'ci', 'fixtures', 'p2');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const got = new Set(codes({...fx.spec, id: fx.spec.id.replace(/^v\d+/, `v${P2_FROM}`)}, {prev: fx.prev ?? []}));
    const want = new Set(fx.expect ?? []);
    const same = [...want].every((c) => got.has(c)) && (want.size || got.size === 0) && (fx.only === false || [...got].every((c) => want.has(c)));
    ok(same, `fixture ${f}: expects [${[...want].join(', ')}], got [${[...got].join(', ')}]`);
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(await selfTest());
  const id = process.argv[2];
  if (id) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
    let timeline = null;
    try {
      timeline = JSON.parse(fs.readFileSync(path.join(root, 'public', 'vo', id, 'timeline.json'), 'utf8'));
    } catch {}
    const found = p2Problems(spec, {timeline, prev: prevSpecs(id)});
    found.forEach((l) => console.log(l));
    console.log(found.length ? `${id}: ${found.length} P2 problem${found.length === 1 ? '' : 's'}` : `${id}: P2 clean`);
    process.exit(found.length ? 1 : 0);
  }
}
