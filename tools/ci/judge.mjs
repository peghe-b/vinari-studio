// The CI art director that LOOKS at the render (r3-judge, 2026-10-27; the owner, 23 Oct: "an art-director review loop in CI: a
// critic pass over the rendered frames -> fixes -> re-render"). Until now the pipeline looked at its film only before the voice
// (tools/ci/filmgate.mjs, on check.mjs's stills) and once after the render with an art-only rubric that could stop a film but
// never fix it (tools/ci/artdirector.mjs final). Now, after the render (studio.yml "judge", which replaces "art director"):
//   1. the rendered film becomes a contact sheet (tools/ci/adsheet.py: one frame a second) and a key-frame board
//      (tools/ci/keyframes.py: frame 0 as the feed shows it, the hook at 1.5 s, the settle of the longest shots, the end card,
//      at 360 x 640, where a cut letter or a cropped phone can be seen);
//   2. a vision critique on the API engine (the Agent SDK on the studio's key, tools/ci/engine; when the day's API share is used,
//      or the key is refused, the same Agent SDK on the owner's Claude token) with the owner's three lenses: ART (black and white,
//      purpose-built graphics, whole phones and cars, modern cars, one hue a frame, white end card), STORY (a hook at frame 0,
//      every second shows what is said, a point and a payoff) and TECH (text inside the frame and uncovered, the caption band,
//      TikTok's column, contrast, render glitches). It answers in CODES (CODES below) with a second and a short note, plus the
//      art rubric's six rows (artdirector.mjs ROWS) and three story rows. Two looks, the lower of each row, the issues of both;
//   3. MUST-FIX issues (a code in MUST, or a hard art row under 1) get ONE fix round: Claude Code on the spec and the film's own
//      Film files (tools/ci/claude-run.mjs fix: the API key, else the token; its Stop hook, tools/ci/stopcheck.mjs, holds it until
//      its check passes), then the gate's own `node tools/check.mjs` (the same deterministic check the writer ran), the voice
//      (cached lines cost nothing), the render, and a second look. Never a second fix round (out/ci/judge-<id>.json counts it
//      before the round starts, so a re-run never loops), never past the film's judge budget (STUDIO_JUDGE_USD, $6: the looks
//      and the fix round's dollar cap together), never past the job's clock (the fix round starts only when the fix, the check,
//      the voice, the re-render and the look fit before the job's 220 minutes, with the publish steps' reserve);
//   4. the outcome: the re-render is published when it passed the check and is not worse than the first; a fix that breaks the
//      check, the voice or the render, or a worse re-render, puts the FIRST film back (spec, Film files, voice, mp4) and that one
//      goes on. A film whose last look still fails a hard art row (whole, one hue, crafted under 1) is stopped, as the art
//      director stopped it (exit 3; STUDIO_AD_STOP=0 turns the stop off). No review at all (no key, no token, no engine) lets the
//      film go on, as before.
// The critique goes into the run log as codes, seconds, shots and short English notes (ASCII, cut: this repo's logs are public,
// and the notes are about pictures, never quoting the film's words), into the job summary, and into out/ci/judge-<id>.json.
// A phase-2 film only (JUDGE_FROM = P2_FROM, src/lib/p2.mjs): every earlier film renders and publishes as it did. Repo variable
// STUDIO_JUDGE=0 turns it off (studio.yml then runs the old `artdirector.mjs final`), STUDIO_JUDGE_FIX=0 keeps the looks and drops
// the fix round.
//
//   node tools/ci/judge.mjs run <id>      the whole judge (studio.yml), exit 0 = publish, 3 = stopped
//   node tools/ci/judge.mjs plan <id>     the key frames and the shots it would look at (no render, no network)
//   node tools/ci/judge.mjs --test        the self-test (fixture specs, recorded looks; no render, no network)
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {P2_FROM, p2On} from '../../src/lib/p2.mjs';
import {HARD, ROWS, finalExit, verdictOf as artVerdictOf} from './artdirector.mjs';
import {engineEnv, fixEngineOf, modelOf, oauthTokenOf} from './claude-run.mjs';
import {codeOf, problemsOf} from './checkstamp.mjs';
import {estimateTimeline, FPS, planShots} from './fx.mjs';
import {knobs, mayPlan, mayWrite, readLedger, record} from './spend.mjs';
import {isOwnFilm} from './visual.mjs';

const self = fileURLToPath(import.meta.url);
const here = path.dirname(self);
const ROOT = path.resolve(here, '../..');
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** the first film the judge looks at: phase 2's (a film before it renders and publishes as it was made) */
export const JUDGE_FROM = P2_FROM;
export const judgeOn = (id) => p2On(String(id ?? '').replace(/-r\d+$/, ''));

// ---- the owner's lenses, as codes ------------------------------------------------------------------------------------------
/** every code the critique may use: its lens, MUST-FIX or not, and what it means (the model reads `what`) */
export const CODES = Object.freeze({
  ART_TWO_HUES: {lens: 'art', must: true, what: 'two data colours in one frame, or colour on something that is not data (the film is paper and ink; one data hue a frame)'},
  ART_CLIPART: {lens: 'art', must: true, what: 'clip art, a flat icon, a primitive hand-drawn diagram, a drawn face, a triangle road: not a purpose-built graphic'},
  ART_CROPPED: {lens: 'art', must: true, what: 'a phone, a car, a card or a graphic cut by the frame edge or by the caption band (always whole)'},
  ART_OLD_CAR: {lens: 'art', must: true, what: 'a drawn car that looks boxy or 1990s (every car is a refined 2020s car)'},
  ART_EMPTY: {lens: 'art', must: true, what: 'an empty or almost empty frame for a second or more (a word alone in white space, a graphic not drawn yet)'},
  ART_DARK_END: {lens: 'art', must: true, what: 'an app film that does not end on the WHITE card (VINARI, the free-week line, App Store and Google Play)'},
  ART_REPEAT: {lens: 'art', must: false, what: 'the same picture again and again across many seconds'},
  ART_TEMPLATE: {lens: 'art', must: false, what: 'a stock-slide or template look: a bare title on paper, a generic card that could be any film'},
  STORY_HOOK: {lens: 'story', must: true, what: 'frame 0 (as the feed shows it, before any motion) shows no subject and no tension: nothing makes a viewer stop'},
  STORY_UNEXPLAINED: {lens: 'story', must: false, what: 'a shot that does not SHOW what its line says (no mark drawn, no number landing, no word lifted)'},
  STORY_FLAT: {lens: 'story', must: false, what: 'no clear point and payoff: the pictures do not build to the turn the lines promise'},
  STORY_ORDER: {lens: 'story', must: false, what: 'the pictures run out of step with the lines (a number shown before it is said, a payoff before its setup)'},
  TECH_TEXT_CUT: {lens: 'tech', must: true, what: 'a word or number runs past the frame edge or is cut'},
  TECH_TEXT_COVERED: {lens: 'tech', must: true, what: 'a word stands on a figure, a mark, a line, a photo detail or another word, so it does not read'},
  TECH_LOW_CONTRAST: {lens: 'tech', must: true, what: 'text or a graphic that does not read against what is under it (white on white, grey on grey)'},
  TECH_GLITCH: {lens: 'tech', must: true, what: 'a render fault: a black or broken frame, missing-glyph boxes, a broken image, a torn strip'},
  TECH_CAPTION_BAND: {lens: 'tech', must: false, what: 'a graphic or text inside the caption band (y 1440-1560 of 1920; the blue tick on the key frames) other than the caption'},
  TECH_TT_COLUMN: {lens: 'tech', must: false, what: "a word, number or mark under TikTok's action column (x 930+ and y 880-1110 of 1080 x 1920; the orange tick)"},
  TECH_SUB_STYLE: {lens: 'tech', must: false, what: 'the caption has a stroke, a shadow or a box (it is clean white or ink Mtavruli, word by word)'},
});
export const MUST = new Set(Object.keys(CODES).filter((c) => CODES[c].must));
export const STORY_ROWS = ['hook', 'clear', 'payoff'];

export const SYSTEM = [
  'You are the art director of VINARI, a premium black-and-white motion-graphics studio: vertical 1080x1920 films with a Georgian',
  "narrator, about cars and a car app. The owner's taste is strict: refined 2D graphics built for each film's idea (the way viral",
  'promos are made: a detailed idea, purpose-built graphics, a strong hook), real photos (greyscale) and real app screens, paper',
  'and ink with colour only on data, everything whole and readable. You judge the RENDERED film through three lenses:',
  'ART: black and white with one data hue a frame; purpose-built graphics, never clip art, flat icons, primitive drawings or drawn',
  'faces; phones, cars and cards whole, never cropped; cars modern (2020s), never boxy; no empty frames; no frame repeated; an app',
  'film ends on the WHITE card with VINARI and both store badges.',
  'STORY: frame 0 hooks a scrolling viewer with the sound off (a subject and a tension readable at once); every shot SHOWS what its',
  'line says (a mark drawn, a number landing, a word lifted); the pictures build to one clear point and a payoff, in step with the lines.',
  'TECH: every word inside the frame and uncovered (no figure, mark, line or photo detail over a letter), enough contrast, nothing in',
  "the caption band but the caption, no word under TikTok's action column, no render glitch, the caption clean (no stroke, no box).",
  'You get image 1, a contact sheet (one frame a second; the label on a tile is its second), and image 2, key frames at a larger size',
  '(frame 0 first; the ticks right of each key frame mark the caption band in blue and the TikTok column band in orange; they are not',
  'part of the film). The lines are given as text: you do not hear the voice.',
  'Score: the art rows 0, 1 or 2 each (legible, oneHue, whole, explained, fresh, crafted) and the story rows 0, 1 or 2 each (hook,',
  'clear, payoff). Then list the issues you SEE, at most 10, worst first, each with one code from the list, the second it shows at',
  '(from the tile labels; null for the whole film) and a note: one concrete change in plain English, at most 20 words, about the',
  'picture (move, enlarge, cut, replace with a real photo, an app screen or a data graphic). Never quote the film\'s words, never',
  'comment on the topic. Report only what you can see; when the film is clean, return no issues. The codes:',
  ...Object.entries(CODES).map(([c, v]) => `${c}: ${v.what}`),
].join('\n');

/** the reply's JSON schema (the Agent SDK's outputFormat) */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'story', 'issues'],
  properties: {
    scores: {type: 'object', additionalProperties: false, required: ROWS, properties: Object.fromEntries(ROWS.map((r) => [r, {type: 'integer', minimum: 0, maximum: 2}]))},
    story: {type: 'object', additionalProperties: false, required: STORY_ROWS, properties: Object.fromEntries(STORY_ROWS.map((r) => [r, {type: 'integer', minimum: 0, maximum: 2}]))},
    issues: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'at', 'note'],
        properties: {code: {type: 'string', enum: Object.keys(CODES)}, at: {type: ['number', 'null']}, note: {type: 'string'}},
      },
    },
  },
};

// ---- the film's shots and key frames ---------------------------------------------------------------------------------------
/** the film's shots in frames (src/Promo.tsx's plan: tools/ci/fx.mjs planShots), each with its lines; the voice's timeline when
 *  there is one (public/vo/<id>/timeline.json), else the letters' estimate (a fixture) */
export const shotsOf = (spec, timeline = null) => {
  const tl = timeline ?? estimateTimeline(spec);
  const plans = planShots(spec, tl);
  return {
    total: Math.ceil(tl.duration * FPS),
    shots: plans.map((p, k) => ({
      k: k + 1,
      type: String(p.spec?.type ?? '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || '?',
      name: typeof p.spec?.name === 'string' ? p.spec.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 40) : null,
      from: p.from,
      to: p.to,
      say: p.beats.map((i) => String(spec.beats[i]?.say ?? '').replace(/\s*\|\s*/g, ' ').trim()).join(' '),
    })),
  };
};
/** the shot on screen at second `t` (null when none) */
export const shotAt = (shots, t) => (Number.isFinite(t) ? (shots.find((s) => t * FPS >= s.from && t * FPS < s.to) ?? shots[shots.length - 1] ?? null) : null);

/** The key frames: frame 0 (the feed's first look), the hook at 1.5 s, the settle (70 %) of the KEY_LONG longest shots, the end
 *  card's settle; in time order, distinct, at most KEY_MAX. -> [{frame, label}] (labels plain ASCII for keyframes.py) */
export const KEY_LONG = 4;
export const KEY_MAX = 8;
export const KEY_GAP = 60;
export const keyFramesOf = ({shots, total}) => {
  const last = Math.max(0, total - 1);
  const want = [{frame: 0, label: 'hook-f0'}, {frame: Math.min(45, last), label: 'hook+1.5s'}];
  const end = shots[shots.length - 1];
  const body = shots.slice(0, end && /End/.test(end.type) ? -1 : undefined);
  // the longest shots, each a NEW picture: a settle within KEY_GAP frames of a frame already picked is the same picture
  // again (the story fixture's first look: its WhoCard settle at 2.8 s repeated the hook at 0 and 1.5 s), the next longest goes
  let long = 0;
  for (const s of [...body].sort((a, b) => b.to - b.from - (a.to - a.from) || a.from - b.from)) {
    if (long >= KEY_LONG) break;
    const f = Math.round(s.from + (s.to - s.from) * 0.7);
    if (want.some((w) => Math.abs(w.frame - f) < KEY_GAP)) continue;
    want.push({frame: f, label: `shot-${s.k}-${s.type}`});
    long++;
  }
  if (end) want.push({frame: Math.min(last, Math.round(end.from + (end.to - end.from) * 0.7)), label: `end-${end.type}`});
  const seen = new Set();
  return want
    .filter((w) => w.frame >= 0 && w.frame <= last && !seen.has(w.frame) && seen.add(w.frame))
    .sort((a, b) => a.frame - b.frame)
    .slice(0, KEY_MAX)
    .map((w) => ({frame: w.frame, label: w.label.replace(/[^\x21-\x7e]/g, '').slice(0, 28)}));
};
export const atArg = (keys) => keys.map((k) => `${k.frame}:${k.label.replace(/[,:]/g, '-')}`).join(',');

/** the text that goes with the two images: the film, its shots and their lines (the critique's own context; never logged) */
export const lookText = (spec, {shots, total}, round) =>
  [
    `Film ${spec.id}: ${spec.category ?? 'no category'}, ${(total / FPS).toFixed(1)} s, ${round === 0 ? 'the first render' : 'the re-render after one fix round'}.`,
    'Its shots (seconds) and the narrator\'s lines (Georgian):',
    ...shots.map((s) => `shot ${s.k} ${(s.from / FPS).toFixed(1)}-${(s.to / FPS).toFixed(1)} s ${s.type}${s.name ? ` (${s.name})` : ''}: ${s.say || '(no line)'}`),
    'Score it and list the issues you see.',
  ].join('\n');

// ---- the critique -----------------------------------------------------------------------------------------------------------
const ascii = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[^\x20-\x7e]+/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const int02 = (v) => (Number.isInteger(v) && v >= 0 && v <= 2 ? v : 0);
/** a reply, cleaned: known codes only, seconds inside the film, notes plain ASCII and short */
export const normalize = (out, totalSec = 600) => ({
  scores: Object.fromEntries(ROWS.map((r) => [r, int02(out?.scores?.[r])])),
  story: Object.fromEntries(STORY_ROWS.map((r) => [r, int02(out?.story?.[r])])),
  issues: (Array.isArray(out?.issues) ? out.issues : [])
    .filter((i) => Object.hasOwn(CODES, String(i?.code)))
    .slice(0, 10)
    .map((i) => ({code: i.code, at: Number.isFinite(i.at) && i.at >= 0 && i.at <= totalSec ? Math.round(i.at * 10) / 10 : null, note: ascii(i.note, 140)})),
});
/** two looks -> one: the lower score of each row, the issues of both (one per code and second), MUST first, at most 10 */
export const mergeLooks = (outs) => {
  const lo = (key, rows) => Object.fromEntries(rows.map((r) => [r, Math.min(...outs.map((o) => o[key][r]))]));
  const seen = new Set();
  const issues = outs
    .flatMap((o) => o.issues)
    .filter((i) => {
      const k = `${i.code}@${i.at === null ? '-' : Math.round(i.at)}`;
      return !seen.has(k) && seen.add(k);
    })
    .sort((a, b) => Number(MUST.has(b.code)) - Number(MUST.has(a.code)) || (a.at ?? 1e9) - (b.at ?? 1e9))
    .slice(0, 10);
  return {scores: lo('scores', ROWS), story: lo('story', STORY_ROWS), issues};
};
/** -> {verdict: 'pass' | 'fix' | 'fail', must: [codes], hard: [art rows under 1], art, story}
 *  fail: a hard art row under 1 (the art director's stop); fix: a MUST code or an art "fix"; pass: neither */
export const judgeOf = (res) => {
  const a = artVerdictOf(res.scores);
  const must = [...new Set(res.issues.filter((i) => MUST.has(i.code)).map((i) => i.code))];
  const story = STORY_ROWS.reduce((s, r) => s + res.story[r], 0);
  const verdict = a.hardFail.length ? 'fail' : must.length || a.verdict !== 'pass' ? 'fix' : 'pass';
  return {verdict, must, hard: a.hardFail, art: a.total, story};
};
/** is the re-render worse than the first? more MUST codes, a new hard row, or 2 art points less */
export const worse = (j1, j0) => j1.hard.length > j0.hard.length || j1.must.length > j0.must.length || j1.art <= j0.art - 2;

/** the run log's lines: one head line, then each issue with its second and shot (codes, numbers, short ASCII notes) */
export const critiqueLines = (round, res, j, {shots, engine, usd}) => [
  `judge round ${round} (${engine}${engine === 'api' ? `, $${usd.toFixed(2)}` : ', Max plan'}): ${j.verdict.toUpperCase()} art ${j.art}/12 (${ROWS.map((r) => `${r} ${res.scores[r]}`).join(', ')}), story ${j.story}/6 (${STORY_ROWS.map((r) => `${r} ${res.story[r]}`).join(', ')})${j.must.length ? `; must-fix: ${j.must.join(', ')}` : ''}${j.hard.length ? `; hard rows under 1: ${j.hard.join(', ')}` : ''}`,
  ...res.issues.map((i) => {
    const s = shotAt(shots, i.at);
    return `  ${MUST.has(i.code) ? 'MUST' : 'note'} ${i.code}${i.at === null ? '' : ` ${i.at.toFixed(1)} s`}${s ? ` (shot ${s.k} ${s.type})` : ''}: ${i.note}`;
  }),
];

// ---- the fix round's brief ----------------------------------------------------------------------------------------------------
export const fixBrief = (id, res, j, {shots, sheet, keys}) =>
  [
    `You are finishing the studio film ${id}: specs/${id}.json and the film's own Film files in src/scenes/film/ (the ones it already has; never another file there). It is written, voiced and RENDERED, and the studio's art director looked at the render. Fix what it found, in the spec or those Film files, keeping the story, the facts, the treatment and every line that is not part of an issue. A changed line is voiced again (that is fine); keep the length.`,
    '',
    `Look at the render yourself first: ${sheet} (one frame a second; a tile's label is its second) and ${keys} (key frames, larger; frame 0 first). Then fix, run \`node tools/check.mjs ${id}\` (exactly like that) until it ends with "ready to render", and look at out/${id}.sheet.png.`,
    '',
    `The art director: ${j.verdict.toUpperCase()}, art ${j.art}/12, story ${j.story}/6${j.hard.length ? `, hard rows under 1: ${j.hard.join(', ')}` : ''}. Its issues (MUST first):`,
    ...res.issues.map((i) => {
      const s = shotAt(shots, i.at);
      return `- ${MUST.has(i.code) ? 'MUST' : 'should'} ${i.code}${i.at === null ? '' : ` at ${i.at.toFixed(1)} s`}${s ? ` (shot ${s.k}, a ${s.type}${s.name ? ` ${s.name}` : ''}, ${(s.from / FPS).toFixed(1)}-${(s.to / FPS).toFixed(1)} s)` : ''}: ${i.note} [${CODES[i.code].what}]`;
    }),
    '',
    'The film\'s shots: ' + shots.map((s) => `${s.k} ${s.type} ${(s.from / FPS).toFixed(1)}-${(s.to / FPS).toFixed(1)} s`).join('; '),
    '',
    'A shot that is not crafted (clip art, a template look, a hand-drawn diagram, primitive shapes) is REPLACED, not polished: a real photo with Ink marks, a current app screen in ScreenFocus or ScreenDeck, or a kit data part filled with this film\'s own numbers. A cut or covered word: move it, shorten it, or give it its own shot. A weak frame 0: open on the subject and its tension (the kit\'s hooks: FreezeTag, IrisDetail, TypeDive, ShapeMatch).',
    '',
    `End with one line: "${id} · fixed".`,
  ].join('\n');

// ---- the knobs: the budget, the clock, the rounds -----------------------------------------------------------------------------
/** the film's judge budget in dollars (the looks and the fix round's cap together): STUDIO_JUDGE_USD, 1..12, default 6 */
export const judgeUsd = (env = process.env) => {
  const n = Number(String(env.STUDIO_JUDGE_USD ?? '').trim() || NaN);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 6;
};
/** STUDIO_JUDGE_FIX: "0" no fix round, anything else one (never more) */
export const fixOn = (env = process.env) => String(env.STUDIO_JUDGE_FIX ?? '').trim() !== '0';
/** the job's limit (studio.yml timeout-minutes) and what the steps after the judge need (cover, package, uploads, publish) */
export const JOB_MIN = 220;
export const RESERVE_MIN = 12;
/** the judge step's own limit (studio.yml "judge" timeout-minutes): the first look, the fix and the rest fit inside it */
export const STEP_MIN = 75;
export const FIX_MIN = [8, 25];
export const LOOK_USD = 0.35;
/**
 * May a fix round run, and with what caps? -> {ok, why, fixMin, fixUsd}
 *   spent      dollars this film's judge has spent on looks so far
 *   left       minutes left in the job (null: no job clock -> no fix round)
 *   renderMin  the first render's minutes
 */
export const fixPlan = ({env = process.env, spent = 0, left = null, renderMin = 15, rounds = 0, engine = 'api'}) => {
  if (!fixOn(env)) return {ok: false, why: 'STUDIO_JUDGE_FIX=0'};
  if (rounds >= 1) return {ok: false, why: 'a fix round already ran for this film (one at most)'};
  if (!engine) return {ok: false, why: 'no engine for a fix round (no API share and no Claude token)'};
  const fixUsd = Math.min(4, Math.round((judgeUsd(env) - spent - 2 * LOOK_USD) * 100) / 100);
  if (engine === 'api' && fixUsd < 1) return {ok: false, why: `the film's judge budget $${judgeUsd(env)} is used ($${spent.toFixed(2)} spent)`};
  if (!Number.isFinite(left)) return {ok: false, why: 'no job clock: the fix round would not know when the job ends'};
  const inStep = 10 + 3 + Math.ceil(renderMin * 1.25) + 4; // the check, the voice, the re-render, the second look
  const after = inStep + RESERVE_MIN; // and the steps after the judge
  const fixMin = Math.min(FIX_MIN[1], Math.floor(left - after), STEP_MIN - 6 - inStep);
  if (fixMin < FIX_MIN[0]) return {ok: false, why: `no time: ${Math.floor(left)} min left in the job and ${STEP_MIN} in the step, a fix round needs ${after + FIX_MIN[0]} and a render of ${Math.round(renderMin)} min fits ${STEP_MIN - 6 - inStep} for the fix`};
  return {ok: true, why: `${fixMin} min and ${engine === 'api' ? `$${fixUsd}` : 'the Claude token'} for the fix`, fixMin, fixUsd: Math.max(1, fixUsd)};
};
/** minutes left in the job: its start (studio.yml "check request" writes $RUNNER_TEMP/job-t0, epoch seconds) */
export const minutesLeft = (env = process.env, now = Date.now()) => {
  try {
    const t0 = Number(fs.readFileSync(path.join(env.RUNNER_TEMP || os.tmpdir(), 'job-t0'), 'utf8').trim());
    return Number.isFinite(t0) && t0 > 1e9 ? JOB_MIN - (now / 1e3 - t0) / 60 : null;
  } catch {
    return null;
  }
};
/** the first render's minutes: "render" writes $RUNNER_TEMP/render-t0, the film's mtime ends it */
export const renderMinutes = (env, mp4) => {
  try {
    const t0 = Number(fs.readFileSync(path.join(env.RUNNER_TEMP || os.tmpdir(), 'render-t0'), 'utf8').trim());
    const m = (fs.statSync(mp4).mtimeMs / 1e3 - t0) / 60;
    return m > 0 && m < 300 ? m : 15;
  } catch {
    return 15;
  }
};

// ---- the state (never a second fix round) ---------------------------------------------------------------------------------
const stateFile = (root, id) => path.join(root, 'out/ci', `judge-${id}.json`);
export const readState = (root, id) => {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(root, id), 'utf8'));
    return s && Array.isArray(s.rounds) ? s : {id, rounds: [], fixes: 0};
  } catch {
    return {id, rounds: [], fixes: 0};
  }
};
const writeState = (root, st) => {
  fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
  fs.writeFileSync(stateFile(root, st.id), `${JSON.stringify(st, null, 1)}\n`);
};

// ---- the first film, kept while the fix round runs --------------------------------------------------------------------------
const ownFilms = (root, id) => {
  try {
    return fs.readdirSync(path.join(root, 'src/scenes/film')).filter((f) => f.endsWith('.tsx') && isOwnFilm(f.slice(0, -4), id.replace(/-r\d+$/, '')));
  } catch {
    return [];
  }
};
/** the files of the first film: its spec, its own Film files, its voice, its render and the render's side files */
export const filesOf = (root, id) => [`specs/${id}.json`, ...ownFilms(root, id).map((f) => `src/scenes/film/${f}`), `public/vo/${id}`, `out/${id}.mp4`, `out/${id}.subtone.json`, `out/${id}.fx.json`];
export const snapshot = (root, id, dir) => {
  fs.rmSync(dir, {recursive: true, force: true});
  const kept = [];
  for (const rel of filesOf(root, id)) {
    const from = path.join(root, rel);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(path.join(dir, rel)), {recursive: true});
    fs.cpSync(from, path.join(dir, rel), {recursive: true, preserveTimestamps: true});
    kept.push(rel);
  }
  fs.writeFileSync(path.join(dir, 'kept.json'), JSON.stringify(kept));
  return kept;
};
export const restore = (root, id, dir) => {
  const kept = JSON.parse(fs.readFileSync(path.join(dir, 'kept.json'), 'utf8'));
  // what the fix round made that the first film did not have (a new Film file, a new side file) goes
  for (const rel of filesOf(root, id)) if (!kept.includes(rel)) fs.rmSync(path.join(root, rel), {recursive: true, force: true});
  for (const rel of kept) {
    fs.rmSync(path.join(root, rel), {recursive: true, force: true});
    fs.cpSync(path.join(dir, rel), path.join(root, rel), {recursive: true, preserveTimestamps: true});
  }
  return kept;
};

// ---- the look (the Agent SDK, the API key, else the token) -------------------------------------------------------------------
const png64 = (f) => ({type: 'image', source: {type: 'base64', media_type: 'image/png', data: fs.readFileSync(f).toString('base64')}});
/** one look on one engine -> {out} | {skip, refused}; `usd` the API's cost */
const lookOnce = async ({images, text, env, engine, cred, model, budget}) => {
  let query;
  try {
    ({query} = await import('./engine/agent.mjs'));
  } catch (e) {
    return {skip: `the engine is not installed: ${e.code || 'error'}`, usd: 0};
  }
  const bin = path.join(here, 'engine/bin/claude');
  const base = {...env};
  for (const v of ['STUDIO_STOPCHECK', 'STUDIO_FIX_ID', 'GEMINI_API_KEY']) delete base[v];
  let release;
  const held = new Promise((r) => (release = r));
  // the streaming input stays open until the result (the SDK's pattern for a message with images)
  async function* input() {
    yield {type: 'user', session_id: '', parent_tool_use_id: null, message: {role: 'user', content: [...images.map(png64), {type: 'text', text}]}};
    await held;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5 * 60e3);
  let result = null;
  let apiError = null;
  try {
    for await (const m of query({
      prompt: input(),
      options: {
        model,
        abortController: ac,
        maxTurns: 4,
        tools: [],
        allowedTools: [],
        systemPrompt: SYSTEM,
        settingSources: [],
        outputFormat: {type: 'json_schema', schema: SCHEMA},
        cwd: os.tmpdir(),
        env: engineEnv(base, engine, cred),
        ...(engine === 'api' ? {maxBudgetUsd: budget} : {}),
        ...(fs.existsSync(bin) ? {pathToClaudeCodeExecutable: bin} : {}),
      },
    })) {
      if (m.type === 'assistant' && m.error) apiError = m.error;
      if (m.type === 'result') {
        result = m;
        break;
      }
    }
  } catch (e) {
    apiError = apiError ?? (ac.signal.aborted ? 'timeout' : e?.name || 'error');
  } finally {
    clearTimeout(timer);
    release();
  }
  const usd = engine === 'api' ? Number(result?.total_cost_usd) || 0 : 0;
  if (result && !result.is_error && result.structured_output && typeof result.structured_output === 'object') return {out: result.structured_output, usd};
  return {skip: `no review (${ascii(apiError ?? result?.subtype ?? 'no result', 40)})`, refused: Boolean(apiError) || Boolean(result?.is_error), usd};
};

/** the engine for a look: the API while the credits allow a plan-size call, else the token */
export const lookEngineOf = ({key, token, pace}) => (key && pace?.ok ? 'api' : token ? 'oauth' : null);

/** `looks` looks at the two images -> {res, j, engine, usd} | {skip, usd}; the API's dollars go into the spend ledger ("ad") */
const lookAt = async ({images, text, env, totalSec, looks = 2}) => {
  const key = String(env.ANTHROPIC_API_KEY ?? '').replace(/\s+/g, '');
  const token = oauthTokenOf(env);
  const k = knobs(env);
  let engine = lookEngineOf({key, token, pace: key ? mayPlan(readLedger(k.file), Date.now(), k) : null});
  if (!engine) return {skip: 'no engine (no API key or share, no Claude token)', usd: 0};
  const model = /^[a-z0-9][a-z0-9.-]{2,60}$/.test(String(env.STUDIO_DIRECTOR_MODEL ?? '')) ? env.STUDIO_DIRECTOR_MODEL : modelOf(env);
  const outs = [];
  let usd = 0;
  let why = '';
  for (let n = 0; n < looks; n++) {
    let r = await lookOnce({images, text, env, engine, cred: engine === 'api' ? key : token, model, budget: 1});
    usd += r.usd ?? 0;
    if (r.skip && r.refused && engine === 'api' && token) {
      engine = 'oauth';
      r = await lookOnce({images, text, env, engine, cred: token, model});
    }
    if (r.skip) {
      why = r.skip;
      break;
    }
    outs.push(normalize(r.out, totalSec));
  }
  if (usd > 0) {
    try {
      record('ad', usd, {k});
    } catch {}
  }
  if (!outs.length) return {skip: why || 'no review', usd};
  const res = mergeLooks(outs);
  return {res, j: judgeOf(res), engine, usd, looks: outs.length};
};

// ---- the steps the judge runs (studio.yml's own commands) --------------------------------------------------------------------
/** a child's env: never the owner's token, never the API key (the voice and the render need neither) */
const plainEnv = (env) => {
  const e = {...env};
  for (const v of ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY', 'STUDIO_STOPCHECK', 'STUDIO_FIX_ID']) delete e[v];
  return e;
};
const sh = (cmd, args, env, opts = {}) => spawnSync(cmd, args, {cwd: ROOT, env, stdio: 'inherit', ...opts}).status;
export const realDeps = {
  sheet: (mp4, png, env) => sh('python3', ['tools/ci/adsheet.py', mp4, png], plainEnv(env)) === 0,
  keys: (mp4, png, at, env) => sh('python3', ['tools/ci/keyframes.py', mp4, png, '--at', at], plainEnv(env)) === 0,
  look: lookAt,
  fix: (brief, env) => sh(process.execPath, ['tools/ci/claude-run.mjs', 'fix', brief], env),
  check: (id, env) => {
    const e = plainEnv(env);
    e.VS_CI = '1';
    const r = spawnSync(process.execPath, ['tools/check.mjs', id], {cwd: ROOT, env: e, encoding: 'utf8', maxBuffer: 64 << 20});
    const out = `${r.stdout ?? ''}`;
    return {ok: r.status === 0 && /ready to render/.test(out), problems: problemsOf(out)};
  },
  voice: (id, env) => sh('python3', ['tools/vo.py', id], plainEnv(env)) === 0,
  render: (id, env) => sh('./make.sh', [id], plainEnv(env)) === 0,
  reindex: (id, env) => sh(process.execPath, ['tools/build-index.mjs', id], plainEnv(env), {stdio: 'ignore'}) === 0,
};

const say = (line, env) => {
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
    } catch {}
  }
};

/**
 * The whole judge. -> exit code: 0 the film (the first or the fixed one) goes on to the cover and the publish, 3 it is stopped.
 * `deps` replaces the steps in the self-test; `root` the studio (a temporary copy there).
 */
export const run = async (id, env = process.env, {deps = realDeps, root = ROOT, now = () => Date.now()} = {}) => {
  if (!ID.test(String(id ?? ''))) {
    console.log('usage: node tools/ci/judge.mjs run <id>');
    return 2;
  }
  if (!judgeOn(id)) {
    console.log(`judge: ${id} is before film ${JUDGE_FROM}: published as made`);
    return 0;
  }
  const mp4 = path.join(root, 'out', `${id}.mp4`);
  if (!fs.existsSync(mp4)) {
    console.log('judge: no render to look at');
    return 0;
  }
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
  const tmp = path.join(env.RUNNER_TEMP || path.join(root, 'out/ci'), 'judge');
  const pub = path.join(root, 'out/ci/judge');
  fs.mkdirSync(tmp, {recursive: true});
  fs.mkdirSync(pub, {recursive: true});
  const st = readState(root, id);
  const map = () => {
    let tl = null;
    try {
      tl = JSON.parse(fs.readFileSync(path.join(root, 'public/vo', id, 'timeline.json'), 'utf8'));
    } catch {}
    return shotsOf(JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8')), tl);
  };
  let spent = 0;
  // one round: the sheet, the key frames, the looks; the images also go where the fix round can read them (out/ci/judge/)
  const lookRound = async (round) => {
    const m = map();
    const sheet = path.join(pub, `${id}-r${round}.sheet.png`);
    const keys = path.join(pub, `${id}-r${round}.keys.png`);
    if (!deps.sheet(mp4, sheet, env) || !deps.keys(mp4, keys, atArg(keyFramesOf(m)), env)) return {skip: 'the sheet or the key frames could not be made', m};
    // the sheet the rejected-film artifact keeps (studio.yml "stage rejected film")
    try {
      fs.copyFileSync(sheet, path.join(env.RUNNER_TEMP || tmp, 'ad-sheet.png'));
      fs.copyFileSync(keys, path.join(env.RUNNER_TEMP || tmp, 'judge-keys.png'));
    } catch {}
    const r = await deps.look({images: [sheet, keys], text: lookText(spec, m, round), env, totalSec: m.total / FPS});
    spent += r.usd ?? 0;
    if (r.skip) return {...r, m};
    const lines = critiqueLines(round, r.res, r.j, {shots: m.shots, engine: r.engine, usd: r.usd ?? 0});
    for (const l of lines) say(l, env);
    st.rounds.push({round, at: new Date(now()).toISOString(), engine: r.engine, looks: r.looks ?? null, usd: +(r.usd ?? 0).toFixed(4), ...r.j, scores: r.res.scores, story: r.res.story, issues: r.res.issues.map((i) => ({...i, shot: shotAt(m.shots, i.at)?.k ?? null}))});
    writeState(root, st);
    return {...r, m, sheet, keys};
  };
  const end = (code, outcome) => {
    st.outcome = outcome;
    writeState(root, st);
    say(`judge: ${outcome}`, env);
    if (code) console.log(`::error::JUDGE the film still fails a hard art row after the judge (${st.rounds.at(-1)?.hard?.join(', ') || '?'}): it is not published (its film, sheets and the critique go to the artifact rejected-${id})`);
    return code;
  };
  const stopOr = (j, outcome) => (j?.verdict === 'fail' && finalExit('fail', env) ? end(3, `${outcome}; stopped: a hard art row is under 1`) : end(0, outcome));

  if (st.outcome) {
    // a re-run of the same job: the verdict stands, never a second fix round
    console.log(`judge: already judged (${st.outcome})`);
    return /stopped/.test(st.outcome) ? 3 : 0;
  }
  const r0 = await lookRound(0);
  if (r0.skip) return end(0, `no review (${ascii(r0.skip, 80)}): the film goes on`);
  if (r0.j.verdict === 'pass') return end(0, 'passed: the first render goes on');

  // ONE fix round, when the caps allow it
  const key = String(env.ANTHROPIC_API_KEY ?? '').replace(/\s+/g, '');
  const k = knobs(env);
  const fe = deps.fixEngine ?? fixEngineOf({key, token: oauthTokenOf(env), pace: key ? mayWrite(readLedger(k.file), now(), k) : null});
  const plan = fixPlan({env, spent, left: deps.minutesLeft ? deps.minutesLeft() : minutesLeft(env, now()), renderMin: deps.renderMin ?? renderMinutes(env, mp4), rounds: st.fixes, engine: fe.engine});
  say(`judge: ${r0.j.must.length ? `must-fix ${r0.j.must.join(', ')}` : `art ${r0.j.verdict}`}: ${plan.ok ? `one fix round (${plan.why})` : `no fix round (${plan.why})`}`, env);
  if (!plan.ok) return stopOr(r0.j, `${r0.j.verdict} and no fix round: the first render goes on`);

  const keep = path.join(tmp, 'first');
  snapshot(root, id, keep);
  st.fixes = 1; // counted BEFORE the round: a crash or a re-run never makes a second one
  writeState(root, st);
  const brief = path.join(tmp, 'fix-judge.md');
  fs.writeFileSync(brief, fixBrief(id, r0.res, r0.j, {shots: r0.m.shots, sheet: path.relative(root, r0.sheet), keys: path.relative(root, r0.keys)}));
  const fixEnv = {...env, STUDIO_FIX_ID: id, STUDIO_STOPCHECK: '1', STUDIO_FIX_MAX: String(plan.fixUsd), STUDIO_FIX_MIN: String(plan.fixMin)};
  const back = (why) => {
    restore(root, id, keep);
    deps.reindex?.(id, env);
    return stopOr(r0.j, `${why}: the FIRST render is put back and goes on`);
  };
  const rc = deps.fix(brief, fixEnv);
  say(`judge: the fix round ${rc === 0 ? 'finished' : 'did not finish'}`, env);
  const c = deps.check(id, env);
  say(`judge: the gate's check after the fix: ${c.ok ? 'ready' : `not ready (${c.problems.map(codeOf).join('; ') || 'no PROBLEM line'})`}`, env);
  if (!c.ok) return back('the fixed film fails the check');
  if (!deps.voice(id, env)) return back('the fixed film could not be voiced');
  if (!deps.render(id, env)) return back('the fixed film could not be rendered');
  const r1 = await lookRound(1);
  if (r1.skip) return end(0, `the fixed film passed the check, no second review (${ascii(r1.skip, 60)}): the re-render goes on`);
  if (r0.j.verdict !== 'fail' && worse(r1.j, r0.j)) return back(`the re-render looks worse (${r1.j.verdict} art ${r1.j.art}, must ${r1.j.must.length} against ${r0.j.art}, ${r0.j.must.length})`);
  return stopOr(r1.j, `after one fix round ${r1.j.verdict}${r1.j.must.length ? ` (must-fix left: ${r1.j.must.join(', ')})` : ''}: the re-render goes on`);
};

// ---- the self-test ------------------------------------------------------------------------------------------------------------
const selfTest = async () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const fixture = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', `${name}.json`), 'utf8'));
  // the shots and key frames of the real P2 fixtures
  for (const name of ['demo-p2-story-v904', 'demo-p2-app-v900', 'demo-p2-data-v901', 'demo-p2-hook-v903', 'demo-p2-map-v902', 'demo-p2-humor-v905']) {
    const spec = fixture(name);
    const m = shotsOf(spec);
    const keys = keyFramesOf(m);
    const fine = keys[0].frame === 0 && keys.length >= 3 && keys.length <= KEY_MAX && keys.every((k, i) => i === 0 || k.frame > keys[i - 1].frame) && keys.every((k) => k.frame < m.total && /^[\x21-\x7e]+$/.test(k.label));
    ok(fine && m.shots.length >= 2 && m.shots.every((s) => s.to > s.from), `${name}: ${m.shots.length} shots, key frames ${keys.map((k) => k.frame).join(' ')}`);
  }
  {
    const m = shotsOf(fixture('demo-p2-story-v904'));
    const keys = keyFramesOf(m);
    ok(keys.some((k) => /^end-EndCard$/.test(k.label)) && keys.some((k) => k.label === 'hook+1.5s'), `the story fixture's key frames: the hook, the long shots, the end card (${atArg(keys)})`);
    ok(keys.every((k, i) => i === 0 || k.frame - keys[i - 1].frame >= 45) && !keys.some((k) => k.label === 'shot-1-WhoCard') && keys.filter((k) => /^shot-/.test(k.label)).length === KEY_LONG, 'no key frame repeats the hook: the next longest shot instead');
    ok(shotAt(m.shots, 0).type === 'WhoCard' && shotAt(m.shots, 10).k === 4 && shotAt(m.shots, null) === null, 'a second -> its shot');
    const t = lookText(fixture('demo-p2-story-v904'), m, 0);
    ok(/shot 1 0\.0-4\.0 s WhoCard: ეს კაცი ცეცხლიდან ორმოცდაორ/.test(t), 'the look gets the shots with their lines (never the log)');
  }
  // the reply, cleaned and merged
  const rep = (o) => ({scores: {legible: 2, oneHue: 2, whole: 2, explained: 2, fresh: 2, crafted: 2}, story: {hook: 2, clear: 2, payoff: 2}, issues: [], ...o});
  const a = normalize(rep({issues: [{code: 'TECH_TEXT_CUT', at: 12.34, note: 'Shrink „ორმოცდაორ" so it fits.\u0007 Move it up 40 px.'}, {code: 'MADE_UP', at: 1, note: 'x'}, {code: 'ART_REPEAT', at: 9999, note: 'y'}]}), 29);
  ok(a.issues.length === 2 && a.issues[0].at === 12.3 && a.issues[1].at === null && /^[\x20-\x7e]+$/.test(a.issues[0].note) && !/ორმ/.test(a.issues[0].note), `normalize: known codes, seconds inside the film, ASCII notes (${JSON.stringify(a.issues[0])})`);
  const b = normalize(rep({scores: {legible: 1, oneHue: 2, whole: 2, explained: 2, fresh: 1, crafted: 2}, issues: [{code: 'TECH_TEXT_CUT', at: 12.1, note: 'same'}, {code: 'STORY_HOOK', at: 0, note: 'Open on the burnt helmet.'}]}), 29);
  const mg = mergeLooks([a, b]);
  ok(mg.scores.legible === 1 && mg.scores.fresh === 1 && mg.issues.length === 3 && mg.issues[0].code === 'STORY_HOOK' && mg.issues.filter((i) => i.code === 'TECH_TEXT_CUT').length === 1, `two looks: the lower rows, one issue per code and second, MUST first (${mg.issues.map((i) => i.code).join(',')})`);
  let j = judgeOf(mg);
  ok(j.verdict === 'fix' && j.must.join() === 'STORY_HOOK,TECH_TEXT_CUT' && j.art === 10 && j.story === 6, `a MUST code is a fix round (${JSON.stringify(j)})`);
  ok(judgeOf(normalize(rep({}))).verdict === 'pass', 'a clean film passes');
  ok(judgeOf(normalize(rep({issues: [{code: 'ART_REPEAT', at: 3, note: 'n'}]}))).verdict === 'pass', 'a "should" note alone is no fix round');
  ok(judgeOf(normalize(rep({scores: {legible: 2, oneHue: 2, whole: 0, explained: 2, fresh: 2, crafted: 2}}))).verdict === 'fail', 'a hard art row at 0 fails');
  ok(worse(judgeOf(b), judgeOf(normalize(rep({})))) && !worse(judgeOf(normalize(rep({}))), judgeOf(b)), 'worse: more MUST codes');
  {
    const m = shotsOf(fixture('demo-p2-story-v904'));
    const lines = critiqueLines(0, mg, j, {shots: m.shots, engine: 'api', usd: 0.21});
    ok(lines.every((l) => /^[\x20-\x7e]+$/.test(l)) && /^judge round 0 \(api, \$0\.21\): FIX art 10\/12/.test(lines[0]) && lines.some((l) => /MUST TECH_TEXT_CUT 12\.3 s \(shot 5 Ledger\)/.test(l)), `the log lines: codes, seconds, shots, ASCII (${lines[0]})`);
    const brief = fixBrief('demo-p2-story-v904', mg, j, {shots: m.shots, sheet: 'out/ci/judge/x-r0.sheet.png', keys: 'out/ci/judge/x-r0.keys.png'});
    ok(/MUST TECH_TEXT_CUT at 12\.3 s \(shot 5, a Ledger/.test(brief) && /node tools\/check\.mjs demo-p2-story-v904/.test(brief) && /x-r0\.keys\.png/.test(brief), 'the fix brief: the issues by shot, the check, the images to look at');
  }
  ok(Object.keys(CODES).every((c) => /^(ART|STORY|TECH)_[A-Z_]+$/.test(c) && CODES[c].lens === c.split('_')[0].toLowerCase()) && MUST.has('TECH_TEXT_CUT') && !MUST.has('ART_REPEAT'), 'the codes: three lenses, MUST and should');
  ok(SCHEMA.properties.issues.items.properties.code.enum.length === Object.keys(CODES).length && Object.keys(CODES).every((c) => SYSTEM.includes(c)), 'the schema and the system prompt carry every code');
  // the caps
  ok(judgeUsd({}) === 6 && judgeUsd({STUDIO_JUDGE_USD: ''}) === 6 && judgeUsd({STUDIO_JUDGE_USD: '3'}) === 3 && judgeUsd({STUDIO_JUDGE_USD: '99'}) === 6, 'the judge budget knob ("" is unset)');
  ok(fixOn({}) && fixOn({STUDIO_JUDGE_FIX: ''}) && !fixOn({STUDIO_JUDGE_FIX: '0'}), 'the fix round knob');
  ok(fixPlan({left: 120, renderMin: 8}).ok && fixPlan({left: 120, renderMin: 8}).fixMin === 25, 'time and money: a fix round of 25 min');
  ok(!fixPlan({left: 40, renderMin: 8}).ok && /no time/.test(fixPlan({left: 40, renderMin: 8}).why), 'too little of the job left: no fix round');
  ok(!fixPlan({left: null}).ok, 'no job clock: no fix round');
  ok(fixPlan({left: 200, renderMin: 30}).fixMin === 14 && !fixPlan({left: 200, renderMin: 40}).ok, "the step's own limit: a long render leaves the fix less time, a very long one none");
  ok(!fixPlan({left: 120, spent: 5}).ok && /budget/.test(fixPlan({left: 120, spent: 5}).why) && fixPlan({left: 120, spent: 5, engine: 'oauth'}).ok, "the film's judge budget caps the API fix; the token's fix has the turn cap");
  ok(fixPlan({left: 120, spent: 3}).fixUsd === 2.3, 'the fix gets what the budget leaves after the second look');
  ok(!fixPlan({left: 120, rounds: 1}).ok && !fixPlan({left: 120, env: {STUDIO_JUDGE_FIX: '0'}}).ok && !fixPlan({left: 120, engine: null}).ok, 'one fix round at most; off; no engine');
  ok(lookEngineOf({key: 'k', token: 't', pace: {ok: true}}) === 'api' && lookEngineOf({key: 'k', token: 't', pace: {ok: false}}) === 'oauth' && lookEngineOf({key: '', token: ''}) === null, 'the look: the API, else the token');
  {
    const tmpd = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-t0-'));
    fs.writeFileSync(path.join(tmpd, 'job-t0'), String(Math.floor(Date.now() / 1e3) - 100 * 60));
    const left = minutesLeft({RUNNER_TEMP: tmpd});
    ok(Math.abs(left - 120) < 0.1 && minutesLeft({RUNNER_TEMP: '/nonexistent'}) === null, `the job clock (${left.toFixed(1)} min left)`);
    fs.rmSync(tmpd, {recursive: true, force: true});
  }
  ok(!judgeOn('v120-old') && judgeOn(`v${JUDGE_FROM}-x`) && judgeOn(`v${JUDGE_FROM}-x-r2`), 'phase 2 films only (JUDGE_FROM = P2_FROM)');
  {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/studio.yml'), 'utf8');
    ok(Number(/timeout-minutes: (\d+)/.exec(wf)?.[1]) === JOB_MIN, `JOB_MIN is the job's limit in studio.yml (${JOB_MIN})`);
    ok(Number(/- name: judge\n(?:(?!\n      - name:)[\s\S])*?timeout-minutes: (\d+)/.exec(wf)?.[1]) === STEP_MIN, `STEP_MIN is the judge step's limit in studio.yml (${STEP_MIN})`);
    ok(/job-t0/.test(wf) && /render-t0/.test(wf) && /node tools\/ci\/judge\.mjs run "\$STUDIO_ID"/.test(wf) && /artdirector\.mjs final/.test(wf), 'studio.yml: the job clock, the render clock, the judge, the old art director behind STUDIO_JUDGE=0');
  }

  // the whole judge on a fixture film, every step recorded (no render, no network)
  const film = `v${JUDGE_FROM}-judge-selftest`;
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-'));
  const scenario = async (looks, {fix = 0, check = true, voice = true, render = true, left = 120, env = {}} = {}) => {
    fs.rmSync(sandbox, {recursive: true, force: true});
    for (const d of ['specs', 'src/scenes/film', 'out/ci', `public/vo/${film}`]) fs.mkdirSync(path.join(sandbox, d), {recursive: true});
    const fx = fixture('demo-p2-story-v904');
    fs.writeFileSync(path.join(sandbox, 'specs', `${film}.json`), JSON.stringify({...fx, id: film}));
    const fname = `V${JUDGE_FROM}JudgeSelftest`;
    fs.writeFileSync(path.join(sandbox, 'src/scenes/film', `${fname}.tsx`), 'first');
    fs.writeFileSync(path.join(sandbox, 'out', `${film}.mp4`), 'first film');
    fs.writeFileSync(path.join(sandbox, `public/vo/${film}/timeline.json`), JSON.stringify(estimateTimeline({...fx, id: film})));
    const calls = [];
    let n = 0;
    const deps = {
      sheet: (mp4, png) => (calls.push('sheet'), fs.writeFileSync(png, 'png'), true),
      keys: (mp4, png, at) => (calls.push(`keys ${at.split(',').length}`), fs.writeFileSync(png, 'png'), true),
      look: async () => {
        calls.push('look');
        const o = looks[Math.min(n++, looks.length - 1)];
        if (o === 'skip') return {skip: 'no engine', usd: 0};
        const res = normalize(o, 30);
        return {res, j: judgeOf(res), engine: 'api', usd: 0.2, looks: 2};
      },
      fix: (brief, e) => {
        calls.push(`fix ${e.STUDIO_FIX_ID} ${e.STUDIO_FIX_MIN}m $${e.STUDIO_FIX_MAX}`);
        calls.brief = fs.readFileSync(brief, 'utf8');
        fs.writeFileSync(path.join(sandbox, 'specs', `${film}.json`), JSON.stringify({...fx, id: film, fixed: true}));
        fs.writeFileSync(path.join(sandbox, 'src/scenes/film', `${fname}Extra.tsx`), 'new');
        return fix;
      },
      check: () => (calls.push('check'), {ok: check, problems: check ? [] : ['TEXT_CLASH 1.0-2.0 s (shot 1, WhoCard): „ა"']}),
      voice: () => (calls.push('voice'), voice),
      render: () => (calls.push('render'), render && (fs.writeFileSync(path.join(sandbox, 'out', `${film}.mp4`), 'second film'), true)),
      reindex: () => calls.push('reindex'),
      minutesLeft: () => left,
      renderMin: 8,
      fixEngine: {engine: 'api', why: 'test'},
    };
    const lines = [];
    const log0 = console.log;
    console.log = (x) => lines.push(String(x));
    let rc;
    try {
      rc = await run(film, {RUNNER_TEMP: path.join(sandbox, 'tmp'), ...env}, {deps, root: sandbox});
    } finally {
      console.log = log0;
    }
    const specNow = JSON.parse(fs.readFileSync(path.join(sandbox, 'specs', `${film}.json`), 'utf8'));
    return {rc, calls, lines, fixed: Boolean(specNow.fixed), mp4: fs.readFileSync(path.join(sandbox, 'out', `${film}.mp4`), 'utf8'), extra: fs.existsSync(path.join(sandbox, 'src/scenes/film', `${fname}Extra.tsx`)), state: readState(sandbox, film)};
  };
  const clean = rep({});
  const cut = rep({issues: [{code: 'TECH_TEXT_CUT', at: 12, note: 'Shrink the headline to fit the frame.'}]});
  const hard = rep({scores: {legible: 1, oneHue: 2, whole: 2, explained: 1, fresh: 1, crafted: 0}, issues: [{code: 'ART_CLIPART', at: 5, note: 'Replace the drawn helmet with the photo.'}]});
  const two = rep({issues: [{code: 'TECH_TEXT_CUT', at: 12, note: 'a'}, {code: 'ART_CROPPED', at: 20, note: 'b'}]});
  let s = await scenario([clean]);
  ok(s.rc === 0 && s.calls.join('|') === 'sheet|keys 7|look' && /passed/.test(s.state.outcome), `a clean render: one look, published (${s.calls.join('|')})`);
  s = await scenario([cut, clean]);
  ok(s.rc === 0 && s.calls.join('|').replace(/fix [^|]+/, 'fix') === 'sheet|keys 7|look|fix|check|voice|render|sheet|keys 7|look' && s.fixed && s.mp4 === 'second film' && s.state.fixes === 1, `MUST-FIX: one fix round, the check, the voice, the re-render, a second look (${s.calls.join('|')})`);
  ok(s.calls.some((c) => c === `fix ${film} 25m $4`) && /MUST TECH_TEXT_CUT at 12\.0 s \(shot 5/.test(s.calls.brief), 'the fix round gets the film id, the minutes and the dollars, and the critique by shot');
  ok(s.lines.some((l) => /^judge round 0 \(api, \$0\.20\): FIX/.test(l)) && s.lines.some((l) => /^ {2}MUST TECH_TEXT_CUT 12\.0 s \(shot 5 Ledger\): Shrink/.test(l)) && s.lines.some((l) => /^judge round 1 .*PASS/.test(l)), 'the critique is in the run log, both rounds');
  ok(s.state.rounds.length === 2 && s.state.rounds[0].issues[0].shot === 5 && s.state.rounds[0].must[0] === 'TECH_TEXT_CUT', 'and in out/ci/judge-<id>.json');
  s = await scenario([cut, cut]);
  ok(s.rc === 0 && s.calls.filter((c) => c.startsWith('fix')).length === 1 && s.mp4 === 'second film' && /must-fix left: TECH_TEXT_CUT/.test(s.state.outcome), 'still MUST-FIX after the round: never a second round, the re-render goes on');
  s = await scenario([hard, hard]);
  ok(s.rc === 3 && s.calls.filter((c) => c.startsWith('fix')).length === 1 && /stopped/.test(s.state.outcome) && s.lines.some((l) => /::error::JUDGE/.test(l)), 'a hard row still under 1 after the round: stopped (exit 3)');
  s = await scenario([hard, hard], {env: {STUDIO_AD_STOP: '0'}});
  ok(s.rc === 0, 'STUDIO_AD_STOP=0: the stop is off');
  s = await scenario([cut], {check: false});
  ok(s.rc === 0 && !s.fixed && !s.extra && s.mp4 === 'first film' && s.calls.includes('reindex') && !s.calls.includes('render') && /FIRST render is put back/.test(s.state.outcome), 'the fixed film fails the check: the first film is put back (spec, Film files, mp4), never rendered');
  s = await scenario([hard], {check: false});
  ok(s.rc === 3 && s.mp4 === 'first film', 'the fix failed and the first render had a hard fail: stopped');
  s = await scenario([cut], {render: false});
  ok(s.rc === 0 && s.mp4 === 'first film' && !s.fixed, 'the re-render fails: the first film is put back');
  s = await scenario([cut, two]);
  ok(s.rc === 0 && s.mp4 === 'first film' && !s.fixed && /looks worse/.test(s.state.outcome), 'a worse re-render: the first film is put back');
  s = await scenario([cut, 'skip']);
  ok(s.rc === 0 && s.mp4 === 'second film' && /no second review/.test(s.state.outcome), 'no second review: the fixed film passed the check, it goes on');
  s = await scenario([cut], {left: 30});
  ok(s.rc === 0 && !s.calls.some((c) => c.startsWith('fix')) && s.lines.some((l) => /no fix round \(no time/.test(l)), 'too little job time: no fix round, the first render goes on');
  s = await scenario([hard], {left: 30});
  ok(s.rc === 3, 'no time for a fix round and a hard fail: stopped, as the art director did');
  s = await scenario([cut], {env: {STUDIO_JUDGE_FIX: '0'}});
  ok(s.rc === 0 && !s.calls.some((c) => c.startsWith('fix')), 'STUDIO_JUDGE_FIX=0: the looks only');
  s = await scenario(['skip']);
  ok(s.rc === 0 && /no review/.test(s.state.outcome), 'no review at all: the film goes on');
  {
    // a re-run of the same job: the verdict stands, no second round
    const again = await (async () => {
      const lines = [];
      const log0 = console.log;
      console.log = (x) => lines.push(String(x));
      try {
        return await run(film, {RUNNER_TEMP: path.join(sandbox, 'tmp')}, {deps: {}, root: sandbox});
      } finally {
        console.log = log0;
      }
    })();
    ok(again === 0 && readState(sandbox, film).fixes === 0 && readState(sandbox, film).outcome, 'a re-run: the verdict stands, nothing runs again');
  }
  fs.rmSync(sandbox, {recursive: true, force: true});
  console.log(bad ? `judge: ${bad} failed` : 'judge: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const [cmd, id] = process.argv.slice(2);
  if (cmd === '--test') process.exit(await selfTest());
  if (cmd === 'run') process.exit(await run(id));
  if (cmd === 'plan' && ID.test(String(id ?? ''))) {
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', `${id}.json`), 'utf8'));
    let tl = null;
    try {
      tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/vo', id, 'timeline.json'), 'utf8'));
    } catch {}
    const m = shotsOf(spec, tl);
    console.log(`${id}: ${(m.total / FPS).toFixed(1)} s, ${m.shots.length} shots (${tl ? 'the voice' : 'estimated'})`);
    for (const s of m.shots) console.log(`  shot ${s.k} ${(s.from / FPS).toFixed(1)}-${(s.to / FPS).toFixed(1)} s ${s.type}`);
    console.log(`key frames: ${atArg(keyFramesOf(m))}`);
    process.exit(0);
  }
  console.log('usage: node tools/ci/judge.mjs run <id> | plan <id> | --test');
  process.exit(2);
}
