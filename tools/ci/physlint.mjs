// The physics scenes' spec guards (round 3, src/lib/physics.mjs; PhysJar, PhysStack, PhysCount). tools/ci/p2lint.mjs
// p2Problems runs them on every film (check.mjs: fatal in the cloud), so a physics shot that cannot tell its figure
// honestly never reaches the voice.
//
//   physProblems(spec, {shots, timeline})   one "CODE ..." line each, or []. shots: p2lint's shotsOf (their frames;
//                                           PHYS_SHORT), timeline: the chunks a numeric "at" cues
//   node tools/ci/physlint.mjs --test            the self-test (and the scan: no wall clock, no Math.random)
//   node tools/ci/physlint.mjs <id>              lint specs/<id>.json
//
// Codes:
//   PHYS_P2      a physics scene in a film made before phase 2 (P2_FROM): older films render as they were made
//   PHYS_SOURCE  a physics figure without whose figure it is ("source"); a PhysCount (a claim about people or the world)
//                whose source is no source („საილუსტრაციო", „მაგალითი", example: the studio never makes data up; an
//                example is for a personal cost, a jar or a stack)
//   PHYS_VALUE   a value that is not a positive number, a count outside 0..of, of over 100, a stack of 1 or 4+ columns
//   PHYS_SCALE   coins or blocks that misstate the figure: a jar under 4 or over JAR_MAX coins, a coin count 10 % off the
//                figure, a column's blocks 25 % off its value or over 14, two different values drawn as the same column
//   PHYS_CLOSE   a jar's figure within 15 % of its budget (a random pile's top varies a few per cent: the gap would lie)
//   PHYS_TEXT    a label that does not fit its box at the kit's smallest size (34 px; the headline 36, a title 48, a
//                column's value 40 on one line, narrowed under TikTok's action column)
//   PHYS_MAX     more than 2 physics shots in a film (a gimmick twice is enough)
//   PHYS_SHORT   a physics shot that cuts before its own figures have landed and been read: each scene's clock
//                (physics.mjs jarTimes, stackTimes, countTimes) from its pour (the shot's entrance, or its "at"), plus
//                PHYS_READ frames; a shot that cannot hold that under PHYS_SHOT_MAX is refused with what to change
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {P2_FROM, P2_TT, ttFitW} from '../../src/lib/p2.mjs';
import {JAR_MAX, PHYS_READ, STACK_MAX_BLOCKS, countLayout, countTimes, jarLayout, jarTimes, stackLayout, stackTimes, PHYS_STAGE} from '../../src/lib/physics.mjs';
import {PHYS_SCENES} from '../../src/lib/physnames.mjs';
import {textW} from '../../src/lib/textfit.mjs';
import {filmKey} from '../../src/scenes/illo/wardrobe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export {PHYS_SCENES};
export const PHYS_MAX = 2;
/** the longest a physics shot may hold (tools/ci/p2lint.mjs SHOT_LONG: 75 frames) */
export const PHYS_SHOT_MAX = 75;
const FPS = 30;
/** the scenes' clock (src/scenes/kit/phys.tsx physClock, src/scenes/common.tsx entrance, cueFrame): a later shot enters
 *  CUT_IN frames before its cut and pours 10 frames in; the first one is composed at frame 0 (lead -45), already pouring */
const CUT_IN = 10;
const FIRST_LEAD = -45;
/** a source that is no source: a PhysCount states a fact about people or the world, never an illustration */
export const NO_SOURCE = /საილუსტრაციო|ილუსტრაცი|მაგალით|პირობით|ჰიპოთეტ|სავარაუდო|გამოგონ|illustrat|example|hypothetic|sample|made.?up|fictio/i;
const CLOSE = 0.15;
const KIT_MIN_PX = 34;
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : NaN);
const fits = (text, w, px, weight = 600, mtav = true) => textW(String(text ?? ''), px, {weight, mtav}) <= w;
/** every scene of a spec, with its beat */
const scenesOf = (spec) =>
  (Array.isArray(spec?.beats) ? spec.beats : []).flatMap((b, i) => [b?.scene ? {scene: b.scene, beat: i} : null, ...(b?.cuts ?? []).map((c) => (c?.scene ? {scene: c.scene, beat: i} : null))]).filter(Boolean);

/** the frame (shot-relative) a chunk index or "1.2s" cue falls on: the shot's chunks from the timeline (as the render's
 *  ctx.cues), a "1.2s" as is; with no timeline a chunk index is taken as the shot's start (0) */
const shotCue = (timeline, s, at) => {
  if (typeof at === 'string' && at.endsWith('s')) return Math.round(parseFloat(at) * FPS) || 0;
  if (typeof at !== 'number') return 0;
  const chunks = (timeline?.beats ?? []).flatMap((b) => b?.chunks ?? []).map((c) => Math.round(Number(c?.start) * FPS)).filter((f) => Number.isFinite(f) && f >= s.from && f < s.to);
  if (!chunks.length) return 0;
  return chunks[Math.min(Math.max(0, at), chunks.length - 1)] - s.from;
};

/** a physics shot's clock, shot-relative frames: {pour, landed, what, hint}; null when the spec cannot be laid out
 *  (PHYS_VALUE says why). The same layouts and clock the scenes draw by (physics.mjs *Times, kit/phys.tsx physClock). */
export const physLanding = (sc, {first = false, cue = () => 0} = {}) => {
  const start = first ? FIRST_LEAD : -CUT_IN;
  let pour = sc.at !== undefined ? cue(sc.at) : first ? -16 : Math.max(0, start) + 10;
  if (first && sc.at === 0) pour = Math.min(pour, FIRST_LEAD);
  const simAt = Math.max(0, pour - start);
  const base = start + simAt;
  const lateAt = sc.at !== undefined ? ', or no "at" (it pours on the cut)' : '';
  if (sc.type === 'PhysJar') {
    const v = num(sc.value);
    if (!(v > 0)) return null;
    const L = jarLayout({value: v, per: sc.per, of: sc.of});
    const T = jarTimes(L);
    return {pour: base, landed: base + T.landed, what: `counts its ${L.n} ${sc.kind === 'drop' ? 'drops' : 'coins'} up to ${v} and shows its source`, hint: `fewer ${sc.kind === 'drop' ? 'drops' : 'coins'} (a bigger "per": ${L.n} pour for ${L.pour} frames)${lateAt}`};
  }
  if (sc.type === 'PhysStack') {
    const vals = (Array.isArray(sc.items) ? sc.items : []).map((it) => num(it?.value));
    if (vals.length < 2 || vals.some((x) => !(x > 0))) return null;
    const T = stackTimes({items: vals.map((value) => ({value})), per: sc.per, seed: sc.seed, at: simAt, title: sc.title});
    const L = stackLayout({items: vals.map((value) => ({value})), per: sc.per, title: sc.title});
    return {pour: base, landed: base + T.landed, what: `lands its tallest column (${Math.max(...L.counts)} blocks) and its value`, hint: `fewer blocks (a bigger "per": the tallest column is ${Math.max(...L.counts)})${lateAt}`};
  }
  if (sc.type === 'PhysCount') {
    const of = sc.of === undefined ? 100 : num(sc.of);
    const n = num(sc.n);
    if (!(Number.isInteger(of) && of >= 2 && of <= 100 && Number.isInteger(n) && n >= 0 && n <= of)) return null;
    const L = countLayout({n, of});
    const T = countTimes(L);
    return {pour: base, landed: base + T.landed, what: `pours its ${of} balls and raises the bins' numbers`, hint: `fewer balls (of 50 or 20, n scaled with it: the same share)${lateAt}`};
  }
  return null;
};

export const physProblems = (spec, {shots = null, timeline = null} = {}) => {
  const out = [];
  const list = scenesOf(spec).filter((s) => PHYS_SCENES.has(s.scene.type));
  if (!list.length) return out;
  const n = filmKey(spec?.id);
  if (Number.isFinite(n) && n > 0 && n < P2_FROM) {
    for (const s of list) out.push(`PHYS_P2 beats[${s.beat}] ${s.scene.type}: the physics scenes start with phase 2 (film ${P2_FROM}); film ${n} renders as it was made`);
    return out;
  }
  if (list.length > PHYS_MAX) out.push(`PHYS_MAX ${list.length} physics shots (${list.map((s) => `beats[${s.beat}] ${s.scene.type}`).join(', ')}): ${PHYS_MAX} a film at most`);
  const W = PHYS_STAGE.right - PHYS_STAGE.left;
  for (const {scene: sc, beat} of list) {
    const where = `beats[${beat}] ${sc.type}`;
    if (empty(sc.source)) out.push(`PHYS_SOURCE ${where}: a figure drawn as ${sc.type === 'PhysJar' ? 'coins' : sc.type === 'PhysStack' ? 'blocks' : 'balls'} needs "source" (whose figure it is)`);
    else if (sc.type === 'PhysCount' && NO_SOURCE.test(String(sc.source))) out.push(`PHYS_SOURCE ${where}: "${sc.source}" is no source: "${sc.n} of ${sc.of ?? 100}" is a claim about people or the world and must be a real, named figure (a survey, a study, a statistics office, WHO); an example is only for a personal cost (PhysJar, PhysStack), else a different picture`);
    if (sc.type === 'PhysJar') {
      const v = num(sc.value);
      if (!(v > 0)) {
        out.push(`PHYS_VALUE ${where}: "value" ${JSON.stringify(sc.value)} is not a positive number`);
        continue;
      }
      const L = jarLayout({value: v, per: sc.per, of: sc.of});
      const exact = v / L.per;
      if (exact < 4 || exact > JAR_MAX + 0.5) out.push(`PHYS_SCALE ${where}: ${v} at ${L.per} a coin is ${Math.round(exact * 10) / 10} coins (4 to ${JAR_MAX}): set "per" so the jar holds 4 to ${JAR_MAX}`);
      else if (Math.abs(L.n - exact) / exact > 0.1) out.push(`PHYS_SCALE ${where}: ${v} at ${L.per} a coin draws ${L.n} coins, ${Math.round((Math.abs(L.n - exact) / exact) * 100)} % off the figure: a "per" that divides it`);
      if (sc.of !== undefined) {
        const of = num(sc.of);
        if (!(of > 0)) out.push(`PHYS_VALUE ${where}: "of" ${JSON.stringify(sc.of)} is not a positive number`);
        else {
          if (Math.abs(v - of) / of < CLOSE) out.push(`PHYS_CLOSE ${where}: ${v} against a budget of ${of} is ${Math.round((Math.abs(v - of) / of) * 100)} % apart (${Math.round(CLOSE * 100)} % at least): a pile cannot show a gap that small: a Receipt or a BigNumber`);
          if (of / L.per > JAR_MAX + 0.5 || of / L.per < 2) out.push(`PHYS_SCALE ${where}: the budget ${of} is ${Math.round(of / L.per)} coins at ${L.per} a coin (2 to ${JAR_MAX})`);
          const room = 894 - (L.jar.x1 + 34);
          if (sc.ofLabel && !fits(sc.ofLabel, room, KIT_MIN_PX, 500)) out.push(`PHYS_TEXT ${where} "ofLabel" "${sc.ofLabel}" is wider than ${room} px at ${KIT_MIN_PX} px: one short word („ლიმიტი", „ბიუჯეტი")`);
          const shown = sc.ofShown ?? `${of}${sc.unit ?? ''}`;
          if (!fits(shown, room, KIT_MIN_PX, 700)) out.push(`PHYS_TEXT ${where} the budget tag "${shown}" is wider than ${room} px`);
        }
      }
      if (sc.label && !fits(sc.label, W, 36)) out.push(`PHYS_TEXT ${where} "label" "${sc.label}" does not fit one line of ${W} px at 36 px`);
      if (sc.kind !== undefined && !['coin', 'drop'].includes(sc.kind)) out.push(`PHYS_VALUE ${where}: "kind" is coin or drop`);
    }
    if (sc.type === 'PhysStack') {
      const items = Array.isArray(sc.items) ? sc.items : [];
      if (items.length < 2 || items.length > 3) out.push(`PHYS_VALUE ${where}: ${items.length} columns (2 or 3)`);
      const vals = items.map((it) => num(it?.value));
      if (vals.some((v) => !(v > 0))) {
        out.push(`PHYS_VALUE ${where}: every column's "value" is a positive number`);
        continue;
      }
      const L = stackLayout({items: vals.map((value) => ({value})), per: sc.per, title: sc.title});
      vals.forEach((v, c) => {
        const ex = v / L.per;
        if (L.counts[c] > STACK_MAX_BLOCKS + 2) out.push(`PHYS_SCALE ${where} "${items[c].label}": ${L.counts[c]} blocks (${STACK_MAX_BLOCKS + 2} at most): a bigger "per"`);
        else if (Math.abs(L.counts[c] - ex) / ex > 0.25) out.push(`PHYS_SCALE ${where} "${items[c].label}": ${v} at ${L.per} a block is ${Math.round(ex * 100) / 100} blocks, drawn as ${L.counts[c]}: the column misstates it (a smaller "per", or a ScaleReveal for a gap this wide)`);
      });
      for (let i = 0; i < vals.length; i++)
        for (let j = i + 1; j < vals.length; j++)
          if (L.counts[i] === L.counts[j] && Math.abs(vals[i] - vals[j]) / Math.max(vals[i], vals[j]) > 0.1) out.push(`PHYS_SCALE ${where}: ${vals[i]} and ${vals[j]} stack the same ${L.counts[i]} blocks: a smaller "per"`);
      if ((items.filter((it) => it?.hl).length ?? 0) > 1) out.push(`PHYS_VALUE ${where}: one highlighted column at most`);
      items.forEach((it, c) => {
        if (it?.label && !fits(it.label, L.colW - 8, KIT_MIN_PX)) out.push(`PHYS_TEXT ${where} "${it.label}" is wider than its column (${Math.round(L.colW - 8)} px at ${KIT_MIN_PX} px)`);
        // the value on the column's top (PhysStack: 68 px, 40 at least, one line, narrowed where it meets TikTok's buttons)
        const shown = it?.shown ?? `${Number.isInteger(vals[c]) ? vals[c] : Math.round(vals[c] * 10) / 10}${sc.unit ?? ''}`;
        const y0 = L.floor - L.counts[c] * L.bh - 86;
        const w = ttFitW(L.colW - 8, {cx: L.cols[c], y0, y1: y0 + 68 * 1.04});
        if (!fits(shown, w, 40, 700)) out.push(`PHYS_TEXT ${where} the value "${shown}" is wider than its column's top (${Math.round(w)} px at 40 px${w < L.colW - 8 ? ', narrowed under TikTok\'s buttons' : ''}): a shorter "shown" (1.2K, „1200 ₾"), a shorter unit, or 2 columns`);
      });
      if (sc.title) {
        const words = String(sc.title).split(/\s+/);
        if (words.some((w) => !fits(w, W, 48, 700)) || textW(sc.title, 48, {weight: 700, mtav: true}) > 2 * W) out.push(`PHYS_TEXT ${where} the title "${sc.title}" does not fit two lines of ${W} px at 48 px`);
      }
    }
    if (sc.type === 'PhysCount') {
      const of = sc.of === undefined ? 100 : num(sc.of);
      const k = num(sc.n);
      if (!(Number.isInteger(of) && of >= 2 && of <= 100)) out.push(`PHYS_VALUE ${where}: "of" ${JSON.stringify(sc.of)} is a whole number from 2 to 100`);
      else if (!(Number.isInteger(k) && k >= 0 && k <= of)) out.push(`PHYS_VALUE ${where}: "n" ${JSON.stringify(sc.n)} is a whole number from 0 to ${of}`);
      else {
        const L = countLayout({n: k, of});
        const bw = L.bins[0].x1 - L.bins[0].x0;
        for (const [word, cnt] of [
          [sc.yes, k],
          [sc.no, of - k],
        ])
          if (word && !fits(`${cnt} ${word}`, bw, KIT_MIN_PX, 700)) out.push(`PHYS_TEXT ${where} "${cnt} ${word}" is wider than its bin (${bw} px at ${KIT_MIN_PX} px)`);
        if (sc.pct && of !== 100) out.push(`PHYS_VALUE ${where}: "pct" only when "of" is 100`);
      }
      if (sc.label && !fits(sc.label, W, 36)) out.push(`PHYS_TEXT ${where} "label" "${sc.label}" does not fit one line of ${W} px at 36 px`);
    }
  }
  // PHYS_SHORT: every figure of the shot lands, then is read, before the cut (the scenes' own clock)
  (shots ?? []).forEach((s, k) => {
    if (!PHYS_SCENES.has(s.scene?.type)) return;
    const len = s.to - s.from;
    if (!Number.isFinite(len)) return;
    const t = physLanding(s.scene, {first: k === 0 || s.from <= 0, cue: (at) => shotCue(timeline, s, at)});
    if (!t) return;
    const need = t.landed + PHYS_READ;
    if (len >= need) return;
    const why = `${s.scene.type} ${t.what} at frame ${t.landed} of the shot${t.pour > 10 ? ` (its pour starts at ${t.pour}, "at")` : ''}, ${PHYS_READ} more to read it`;
    if (need > PHYS_SHOT_MAX)
      out.push(`PHYS_SHORT beats[${s.beat}] ${why}: ${need} frames, over the ${PHYS_SHOT_MAX} a shot may hold: ${t.hint}`);
    else out.push(`PHYS_SHORT beats[${s.beat}] ${why}: ${(len / FPS).toFixed(1)} s on screen, ${(need / FPS).toFixed(1)} s needed (${need} frames): a longer sentence on it, or the next cut a chunk later`);
  });
  return out;
};

/** the render's physics may never read the wall clock or Math.random (a frame must render the same every time) */
export const clockScan = () => {
  const files = ['src/lib/physics.mjs', 'src/scenes/kit/phys.tsx', ...[...PHYS_SCENES].map((n) => `src/scenes/${n}.tsx`)].map((f) => path.join(root, f));
  const hits = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8').split('// ---- the self-test')[0].replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const re of [/Math\.random\s*\(/, /Date\.now\s*\(/, /performance\.now\s*\(/, /new Date\s*\(/, /\bRunner\b/, /requestAnimationFrame/, /setTimeout|setInterval/])
      if (re.test(code)) hits.push(`${path.relative(root, f)}: ${re.source}`);
  }
  return {files: files.length, hits};
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const scan = clockScan();
  ok(scan.hits.length === 0, `no wall clock, no timer and no Math.random in the ${scan.files} physics files${scan.hits.length ? ` (${scan.hits.join('; ')})` : ''}`);
  const id = `v${P2_FROM + 1}-test`;
  const spec = (scene, extra = {}) => ({id, beats: [{say: 'ა', scene}], ...extra});
  const codes = (sp, o) => physProblems(sp, o).map((l) => l.split(' ')[0]);
  const jar = {type: 'PhysJar', value: 650, per: 20, unit: ' ₾', of: 500, ofLabel: 'ბიუჯეტი', label: 'წლიური მომსახურება', source: 'მაგალითი'};
  const stack = {type: 'PhysStack', title: 'რა ჯდება', items: [{label: 'ზეთი', value: 120}, {label: 'ძრავი', value: 900, hl: true}, {label: 'ფილტრი', value: 300}], unit: ' ₾', source: 'მაგალითი'};
  const count = {type: 'PhysCount', n: 92, of: 100, pct: true, label: 'დაბალი და საშუალო შემოსავლის ქვეყნებში', yes: 'ამ ქვეყნებში', no: 'მდიდრებში', source: 'WHO, საგზაო ტრავმები, 2026'};
  ok(codes(spec(jar)).length === 0, `a jar over its budget passes (${physProblems(spec(jar)).join(' / ')})`);
  ok(codes(spec(stack)).length === 0, `a three-column stack passes (${physProblems(spec(stack)).join(' / ')})`);
  ok(codes(spec(count)).length === 0, `92 of 100 with WHO as its source passes (${physProblems(spec(count)).join(' / ')})`);
  for (const src of ['საილუსტრაციო რიცხვი', 'მაგალითი', 'illustrative', 'example figure'])
    ok(codes(spec({...count, source: src})).includes('PHYS_SOURCE'), `a PhysCount "sourced" „${src}": PHYS_SOURCE (a claim about people is never made up)`);
  ok(!codes(spec({...jar, source: 'მაგალითი, ფასები განსხვავდება'})).includes('PHYS_SOURCE') && !codes(spec({...stack, source: 'მაგალითი'})).includes('PHYS_SOURCE'), 'a personal cost jar or stack may be „მაგალითი"');
  ok(codes({id: `v${P2_FROM - 1}-old`, beats: [{scene: jar}]}).join() === 'PHYS_P2', 'a physics scene in a film before P2_FROM: PHYS_P2');
  ok(codes({id: `v${P2_FROM - 1}-old`, beats: [{scene: {type: 'UnitGrid'}}]}).length === 0, 'an older film without physics: nothing');
  ok(codes({id: 'demo-p2-physics-v906', beats: [{scene: jar}]}).length === 0, 'a phase-2 fixture (v9xx) is linted as phase 2');
  ok(codes(spec({...jar, source: ''})).includes('PHYS_SOURCE'), 'no source: PHYS_SOURCE');
  ok(codes(spec({...jar, value: 0})).includes('PHYS_VALUE'), 'a zero figure: PHYS_VALUE');
  ok(codes(spec({...jar, per: 1})).includes('PHYS_SCALE'), '650 coins: PHYS_SCALE');
  ok(codes(spec({...jar, value: 655, of: 2000})).includes('PHYS_SCALE'), '655 at 20 a coin with a 2000 budget (100 coins): PHYS_SCALE');
  ok(codes(spec({...jar, value: 530})).includes('PHYS_CLOSE'), '530 against 500: PHYS_CLOSE');
  ok(codes(spec({...jar, ofLabel: 'მაქსიმალურიბიუჯეტი'})).includes('PHYS_TEXT'), 'a long budget word: PHYS_TEXT');
  ok(codes(spec({...stack, items: [{label: 'ა', value: 60}, {label: 'ბ', value: 900}]})).includes('PHYS_SCALE'), '60 against 900 (0.6 of a 100 block drawn as 1): PHYS_SCALE');
  ok(codes(spec({...stack, items: [{label: 'ა', value: 900}, {label: 'ბ', value: 850}]}, {})).includes('PHYS_SCALE') === false, '900 and 850 at 100 a block: 9 and 9 blocks within 10 %: no PHYS_SCALE');
  ok(codes(spec({...stack, items: [{label: 'ა', value: 120}]})).includes('PHYS_VALUE'), 'one column: PHYS_VALUE');
  ok(codes(spec({...count, n: 140})).includes('PHYS_VALUE'), '140 of 100: PHYS_VALUE');
  ok(codes(spec({...count, of: 400})).includes('PHYS_VALUE'), 'of 400: PHYS_VALUE');
  ok(codes({id, beats: [{scene: jar}, {scene: stack}, {scene: count}]}).includes('PHYS_MAX'), 'three physics shots: PHYS_MAX');
  // PHYS_SHORT: a later shot (it enters 10 frames before its cut and pours 10 in) held to its own figures' landing
  const later = (sc, len, extra = {}) => [{scene: {type: 'Title'}, beat: 0, from: 0, to: 60}, {scene: sc, beat: 1, from: 60, to: 60 + len, ...extra}];
  const short = (sc, len, o = {}) => codes({id, beats: [{say: 'ა', scene: {type: 'Title'}}, {say: 'ბ', scene: sc}]}, {shots: later(sc, len), ...o}).includes('PHYS_SHORT');
  const tall = {type: 'PhysStack', title: 'რა ჯდება', items: [{label: 'ზეთი', value: 100}, {label: 'ძრავი', value: 1200, hl: true}], unit: ' ₾', source: 'მაგალითი'};
  const hundred = {...count, n: 32, of: 100};
  const jar64 = {type: 'PhysJar', value: 640, per: 10, unit: ' ₾', label: 'წლიური ხარჯი', source: 'მაგალითი'};
  ok(short(jar, 40), 'a 1.3 s jar: PHYS_SHORT');
  ok(short(tall, 56), 'the 100/1200 stack (12 blocks) cut at 56 frames, before its 1200 lands: PHYS_SHORT');
  ok(short(hundred, 56), 'a 100-ball count cut at 56 frames, before its bins\' numbers: PHYS_SHORT');
  ok(short(jar64, 56), 'a 64-coin jar cut at 56 frames, its count still running: PHYS_SHORT');
  ok(!short(tall, 75) && !short(hundred, 75) && !short(jar64, 75), `the same three held 75 frames pass (landed at ${['PhysStack', 'PhysCount', 'PhysJar'].map((t, i) => physLanding([tall, hundred, jar64][i], {}).landed).join(', ')})`);
  ok(!short(jar, 75), 'a 2.5 s jar passes');
  // a later "at" moves every figure by its cue: a chunk 30 frames in (from the timeline) or "1.5s"
  const tl = {beats: [{chunks: [{start: 0}]}, {chunks: [{start: 2}, {start: 3}]}]};
  ok(short({...jar64, at: 1}, 75, {timeline: tl}) && !short(jar64, 75, {timeline: tl}), 'the 64-coin jar poured on chunk 1 (30 frames in) is PHYS_SHORT where the jar on the cut passes');
  const over = physProblems({id, beats: [{say: 'ა', scene: {type: 'Title'}}, {say: 'ბ', scene: {...jar64, at: '1.5s'}}]}, {shots: later({...jar64, at: '1.5s'}, 75)}).find((l) => l.startsWith('PHYS_SHORT'));
  ok(Boolean(over) && /over the 75/.test(over) && /bigger "per"/.test(over), `64 coins poured at 1.5 s cannot land within 75 frames: refused with a hint (${over})`);
  // PHYS_TEXT on a column's value: a third column under TikTok's buttons is narrowed
  ok(codes(spec({...stack, unit: ' კმ/სთ', items: [{label: 'ა', value: 1250}, {label: 'ბ', value: 900}, {label: 'გ', value: 400}]})).includes('PHYS_TEXT'), '"400 კმ/სთ" on a short third column under the buttons: PHYS_TEXT');
  ok(P2_TT.right === 894, 'the budget tag stops at TikTok\'s action column (stage x 894)');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(selfTest());
  const id = process.argv[2];
  if (id) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
    const found = physProblems(spec);
    found.forEach((l) => console.log(l));
    console.log(found.length ? `${id}: ${found.length} physics problem${found.length === 1 ? '' : 's'}` : `${id}: physics clean`);
    process.exit(found.length ? 1 : 0);
  }
}
