// The one check of a spec before its film is rendered (the cloud recipe ci/prompt.md runs it, and so can you):
//   node tools/check.mjs <id> [frames...] [--len 15|20|30|45|60] [--verbose]
// 1. voice: python3 tools/vo.py <id>. It reads the whole film in ONE Gemini request (a cached film costs none) and
//    says how many requests it made. Out of today's Gemini quota, vo.py reads it with Microsoft's edge-tts and the
//    check says so in one line and goes on (expected: the studio site warned the owner). Only with VO_NO_EDGE=1
//    (the cloud's repo variable STUDIO_NO_EDGE, off by default): one line, "VOICE_QUOTA ხმის დღევანდელი ლიმიტი
//    ამოიწურა", and exit 75. Stop there: no retries, no spec changes.
// 2. lint:  node tools/build-index.mjs <id>. An ERROR stops here.
// 3. one bundle: a still of every scene at 70 % of its length (plus any frames asked for) and the designed
//    cover (composition "<id>-cover", frame 0), half size, in out/stills/.
// 4. ONE contact sheet, out/<id>.sheet.png: labelled tiles in a grid, about 1500 px wide (Pillow). Read that
//    one image instead of every still; the single stills stay in out/stills/ for a closer look.
// Prints the film's length against the target (--len, else the cloud request's length, else env STUDIO_LENGTH: a car-knowledge
// lesson asked at 20 s is made at 60, and request.json says so), the lint warnings and the sheet.
// Never renders the film (./make.sh <id> does that).
// Env VS_CI=1 (the studio workflow) also fails when "post" or "cover" is missing, when the voice is not the one
// the request asked for, or when the request is not recorded in specs/.studio.json (tools/ci/prompt.mjs --record).
// Before the voice: a banned word (tools/ci/words.mjs BANNED: "ხოდოვოი" and the Russianisms) fails the cloud check (a
// note on the Mac), and so does a car-knowledge film that no longer keeps the rules of the bank facts it recorded
// (tools/ci/carinfo.mjs filmRules: the app shown only with a fact that links it, a sound fact's real sound early), and a
// crazy story film that no longer keeps its story's rules (tools/ci/stories.mjs storyRules: no app, the twist marked and
// before 70 % of the spoken words, only the story's own photos, credited; a wide or small one drawn whole is a note): STORY lines;
// and the listener test (storyTelling, the owner 2026-10-07: the story's names said, the lead by the second line, each
// person with who they are, the payoff named, no run of fragments): STORY_NAMES, STORY_WHO, STORY_PAYOFF, STORY_CHOPPY.
// Before the voice too: a post that retells the film (tools/ci/words.mjs postEcho): POST_ECHO, fatal in the cloud.
// Before the voice (VS_CI=1): a screen of a feature that waits for its App Store release (request.json "lockedScreens",
// tools/ci/release.mjs), or one that release replaced ("oldScreens"), anywhere in the spec or the film's own scene:
// LOCKED lines, a failure. A free film (the free idea, "needsTopic") showing a screen his words did not ask for
// (request.json "freeScreens"): FREE_SCREEN lines, a failure.
// Before the voice: the street words (tools/ci/streetwords.mjs, ci/street-words.json; the owner 2026-10-06): a banned word
// anywhere, more than three allowed ones, one in the cover, the meta, the EndCard line or the post, one next to a real
// name or about a woman, one on screen the voice does not say, one in a film right after (or within three of) a film that
// said one, or the last street film's word again: BANNED_WORD and STREET lines, fatal in the cloud (notes on the Mac; the
// words he typed himself and STREET_FRAME are notes).
// Before the voice: an aura opening (H21, H22) that is not the two-act drop (tools/ci/aura.mjs, the owner 2026-10-07: "a
// SAD opening and BOOM"): AURA_DROP lines, fatal in the cloud (notes on the Mac and for a free film).
// Before the voice it also compares the film's looks with its category's last films (tools/ci/visual.mjs): a
// VISUAL_REPEAT fails the cloud check (a note on the Mac). And the film's own scene (src/scenes/film/<Name>.tsx,
// tools/ci/filmlint.mjs): every Film scene must pass the lint (FILM lines, everywhere); under VS_CI=1 a new film has
// one to three Films of its own (tools/ci/visual.mjs isOwnFilm: V131Seller, V131SellerHook ...; a redo keeps its original's
// or writes its own; each may come back in several beats), together at most filmlint's MAX_BYTES, and no other file in
// src/scenes/film/ may change. The treatment (tools/ci/treatment.mjs, plan step 1.3, 2026-10-26): a film from v131 (every
// film under VS_CI=1) carries a written "treatment" (three pitches scored on ci/promo-dna.md, the best written out) and
// keeps it: the hook an event with its sound in 0..2 s (HOOK_SOUND), never a calm question (HOOK_CALM) or a library
// Person, Drive or Windshield in the hook or the reveal (HOOK_LIBRARY, REVEAL_LIBRARY), the real screens in their order
// (SCREEN_FLOW). TREATMENT is fatal in the cloud and from v131 on the Mac; the rest too, but a redo's and a free film's are notes. And the ending (tools/ci/ending.mjs, ci/endings.json): every second film ends on the
// follow reminder, one of the offered lines, and every other film on a closing quote; no reminder anywhere else. ENDING
// lines fail the cloud check (notes on the Mac), before the voice too. One "music" line says which bed the film gets
// at render (every third film, tools/ci/music.mjs), or none; never fatal.
// The free week (ci/endings.json "freeWeek", the owner 2026-10-21: every second film, never a crazy story or car knowledge): a free-week film
// says one line of the bank as the beat right before the EndCard, no other film says one: FREE_WEEK lines, fatal in the cloud. And
// „ულიმიტოდ" (ci/categories.json "unlimited", tools/ci/words.mjs unlimitedRule; the owner 2026-10-21: in EVERY film about
// an app feature): a film of a category whose facts hold a true UNLIMITED fact says a form of „ულიმიტო" in its voice, an
// app feature whose facts hold none never does: UNLIMITED lines, fatal in the cloud (a free film: a note). Before the voice.
// Runs under tools/lock.sh: one Chrome job at a time on the 8 GB M1.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {filmRules, loadBank, loadSounds} from './ci/carinfo.mjs';
import {loadStories, nameWords, prevLanes, storyNotes, storyRules, twistAt} from './ci/stories.mjs';
import {p2Problems, prevSpecs} from './ci/p2lint.mjs';
import {p2On} from '../src/lib/p2.mjs';
import {subtoneOf} from './subtone.mjs';
import {humorProblems} from './ci/humor.mjs';
import {newsProblems} from './ci/news.mjs';
import {endingProblems, freeWeekBeat, freeWeekProblems, freeWeekWanted, isFollowLine, loadEndings, loadFreeWeek, storesProblems, taglineOf, vNumber, wantedEnding} from './ci/ending.mjs';
import {FILM_DIR, lintFilm, MAX_BYTES as FILM_BYTES} from './ci/filmlint.mjs';
import {kindOf, treatmentOn, treatmentProblems} from './ci/treatment.mjs';
import {loadMusic, musicName, musicOf} from './ci/music.mjs';
import {categoryFilms, FILM_MAX, FILM_NAME, filmName, filmScenes, isOwnFilm, motifRepeats, motionRepeats, ownFilms, repeats, signature, signatureTypes, sigLine} from './ci/visual.mjs';
import {budgetProblems, loadFxConfig, makePlanner, motionOf, planShots} from './ci/fx.mjs';
import {bannedIn, postEcho, postEchoLine, unlimitedFact, unlimitedProblems, unlimitedRule} from './ci/words.mjs';
import {applyRelease} from './ci/release.mjs';
import {concurrency, ffmpeg, ffOptions, renderOpts} from './platform.mjs';
import {isNewFilm, loadRegistry, summary, textProblems} from './ci/screentext.mjs';
import {coverLint, coverPixels, coverSig, resolveFor, twinProblems} from './ci/cover.mjs';
import {allowedFor, briefOffered, capturesFor, PAGE, readLedger, repeatProblems} from './ci/coverlog.mjs';
import {coverAsset} from '../src/cover/comps.mjs';
import {filmPhotos} from '../src/cover/pick.mjs';
import {beatScenes, castRepeats, feedRepeats, ideaRepeats, inFilmRepeats, momentRepeats, namesScreen, pageFilms, retiredScreens, screensShown} from './ci/visual.mjs';
import {streetAskOf, streetGate, streetHistory, streetProblems} from './ci/streetwords.mjs';
import {auraDropProblems, auraSummary, isAuraOpening} from './ci/aura.mjs';
import {kitOn, stillStrict} from '../src/lib/kit.mjs';
import {guardOn, guardStrict, reviewFilm} from './ci/guards.mjs';
import {inputsHash, writeStamp, bumpLoop, clearLoop, loopNote} from './ci/checkstamp.mjs';
import {DIM_SHARE, DIM_STD, EMPTY_SHARE, polishOn} from '../src/lib/guard.mjs';
import {isHard, softOn} from './ci/softgate.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const CI = process.env.VS_CI === '1';
// the soft gate (tools/ci/softgate.mjs, repo variable STUDIO_GATE_MODE=soft): a craft family is a warning, never a stop
const SOFT = CI && softOn();
const softLines = []; // the craft lines the soft gate let through, for the end of the check
const rel = (p) => path.relative(root, p);

const args = process.argv.slice(2);
const usage = () => {
  console.error('usage: node tools/check.mjs <id> [frames...] [--len 15|20|30|45|60] [--verbose] [--lint]');
  process.exit(2);
};
let len; // --len; else the request's, else env STUDIO_LENGTH (below)
let verbose = false;
// --lint (r3-cost): every rule before the voice, the build-index lint and the studio's own rules, all problems at once, in
// seconds: no voice, no Chrome, no stills, no stamp (only a full check says "ready to render")
let LINT = false;
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--len') len = args[++i];
  else if (a.startsWith('--len=')) len = a.slice(6);
  else if (a === '--verbose' || a === '-v') verbose = true;
  else if (a === '--lint') LINT = true;
  else if (a.startsWith('-')) usage();
  else rest.push(a);
}
const [id, ...frameArgs] = rest;
if (!id || !/^[a-z0-9-]+$/.test(id)) usage();
const extraFrames = frameArgs.map(Number);
if (extraFrames.some((f) => !Number.isInteger(f) || f < 0)) usage();
if (len !== undefined && !/^\d+(\.\d+)?$/.test(String(len))) usage();

if (!process.env.VS_LOCKED && !LINT) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...args], {stdio: 'inherit', env: {...process.env, VS_LOCKED: '1'}});
  if (!r.error) process.exit(r.status ?? 1);
  console.log(`check: tools/lock.sh did not start (${r.error.code}); checking without the lock`);
}

const problems = []; // fatal at the end: the spec is not ready
const notes = [];
const line = (k, v) => console.log(`  ${k.padEnd(7)} ${v}`);
// the stamp (tools/ci/checkstamp.mjs): what this check said, on which inputs (hashed now, before anything is read), for the
// film gate to tell a writer that stopped on a failing or stale check from a check that answers twice
const stampInputs = inputsHash(root, id);
const fail = (msg) => {
  // the same problems again and again (tools/ci/checkstamp.mjs, the loop breaker): say so, then stop the writer
  if (process.env.STUDIO_LOOP !== 'off') {
    const ps = problems.length ? problems : heldLines.length ? [...new Set(heldLines)] : [msg];
    for (const l of loopNote(bumpLoop(root, id, ps).n, ps)) console.log(l);
  }
  console.log(`\nNOT READY${LINT ? ' (lint)' : ''}: ${msg}`);
  if (!LINT) writeStamp(root, id, {verdict: 'not_ready', problems: problems.length ? problems : [msg], inputs: stampInputs});
  process.exit(1);
};

// ---- the rules before the voice, collected (r3-cost, 2026-10-27) ---------------------------------------------------------
// The p2x writers spent 129-191 tool calls and $9-12 a film, much of it in check loops: before the voice this check stopped
// at the FIRST failing family (LOCKED, RETIRED, ... FILM, TREATMENT, ENDING, phase 2, STORY: about 25), so every family cost
// a check run and an edit round of its own, and the film gate's fix brief got only the last line ("fix the FILM lines
// above"). A phase-2 film (src/lib/p2.mjs p2On) and every --lint run now go through ALL of them and stop ONCE, before the
// voice, with every family's lines as PROBLEM lines (the gate's fix brief and the writer's last-check codes read those).
// An older film stops at the first, as it was made. `hold(msg)` is that stop; `heldStop()` ends the phase.
let COLLECT = LINT;
const held = []; // the families that failed: their summary messages
const heldLines = []; // their lines, in order
// a family prints its code lines (10 spaces in, then the CODE) right before it stops: the run of such lines that ends with the
// newest output is that family's (a family that only noted lines and then printed anything else is not in it)
let logN = 0;
const tapped = []; // {n, s}
{
  const log0 = console.log.bind(console);
  console.log = (...a) => {
    const s = a.map(String).join(' ');
    logN++;
    if (/^ {10}[A-Z][A-Z0-9_]*[A-Z0-9]\b/.test(s)) tapped.push({n: logN, s: s.trim()});
    log0(...a);
  };
}
const lastRun = () => {
  const run = [];
  for (let k = tapped.length - 1, want = logN; k >= 0 && tapped[k].n === want; k--, want--) run.unshift(tapped[k].s);
  return run;
};
// a family starts here: what it prints is never the run of the family before (the check marks each block before the voice)
const brk = () => {
  logN++;
};
const hold = (msg) => {
  if (!COLLECT) fail(msg);
  held.push(msg);
  const run = lastRun();
  heldLines.push(...(run.length ? run : [msg]));
  // the next family's run starts after this one
  logN++;
};
// a craft family (p2lint, the look repeats, the story moments, the aura drop, the treatment's craft lines): under the soft
// gate a warning, unless one of its lines is real breakage (softgate.mjs HARD); else a hold like any other family
const craft = (msg, run = lastRun()) => {
  if (!SOFT || run.some(isHard)) return hold(msg);
  softLines.push(...(run.length ? run : [msg]));
  notes.push(`SOFT ${msg.replace(/, then check again$/, '')} (a warning: STUDIO_GATE_MODE=soft)`);
  logN++;
};
/** a fatal line at the end (stills, guards, LENGTH): under the soft gate only real breakage is a problem */
const fatalLine = (l) => {
  if (SOFT && !isHard(l)) softLines.push(l);
  else problems.push(l);
};
// a rule further on that trips over a fault a held family already named (it ran only after a pass before): say what was held
process.on('uncaughtException', (e) => {
  if (!held.length) {
    console.error(e);
    process.exit(1);
  }
  console.log(`\n  (a later rule could not run on this spec: ${String(e?.message ?? e).split('\n')[0].slice(0, 160)}; fix the lines below first)`);
  for (const l of [...new Set(heldLines)]) console.log(`  PROBLEM ${l}`);
  fail(`${held.length} rule famil${held.length === 1 ? 'y' : 'ies'} before the voice: fix them ALL in one go (every Edit in one reply), then ${LINT ? 'lint' : 'check'} again`);
});
const heldStop = () => {
  if (!held.length) return;
  const uniq = [...new Set(heldLines)];
  // --lint goes on to the build-index lint and the studio's own rules, so ONE run lists everything the spec alone can tell
  if (LINT) {
    problems.unshift(...uniq);
    return;
  }
  console.log('');
  for (const l of uniq) console.log(`  PROBLEM ${l}`);
  fail(`${held.length} rule famil${held.length === 1 ? 'y' : 'ies'} before the voice (${uniq.length} line${uniq.length === 1 ? '' : 's'} above): fix them ALL in one go (every Edit in one reply), then ${LINT ? 'lint' : 'check'} again`);
};

// ---- the spec ----------------------------------------------------------------------------------------------
const specsDir = path.join(root, 'specs');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let specFile = path.join(specsDir, `${id}.json`);
let spec;
if (fs.existsSync(specFile)) {
  try {
    spec = readJson(specFile);
  } catch (e) {
    fail(`specs/${id}.json is not valid JSON: ${e.message}`);
  }
} else {
  // a hook variant or a translation: its file name differs from its id
  for (const f of fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'))) {
    try {
      const s = readJson(path.join(specsDir, f));
      if (s.id === id) [spec, specFile] = [s, path.join(specsDir, f)];
    } catch {}
  }
  if (!spec) fail(`no spec with the id "${id}" in specs/`);
}
console.log(`check ${id}  (${rel(specFile)})${LINT ? '  --lint: the rules before the voice, the lint, the studio\'s own rules' : ''}`);
// a phase-2 film collects the rules before the voice (above); an older film stops at the first, as it was made
if (p2On(spec.id.replace(/-r\d+$/, '')) && process.env.VS_CHECK_FAILFAST !== '1') COLLECT = true;
// (VS_CHECK_FAILFAST=1: the old first-family stop for a full check, for tools/ci/checklint.mjs's before-and-after measure)

// the studio request (written by tools/ci/prompt.mjs in the workflow)
let request = null;
if (CI) {
  try {
    request = readJson(path.join(root, 'out/ci/request.json'));
  } catch {
    problems.push('out/ci/request.json is missing: the workflow runs tools/ci/prompt.mjs before this step');
  }
}
// the request's length wins over the job's env: the env is what the site asked, the request what the film is (a lesson)
if (len === undefined && request?.length) len = request.length;
if (len === undefined && process.env.STUDIO_LENGTH) len = process.env.STUDIO_LENGTH;
if (len !== undefined && !/^\d+(\.\d+)?$/.test(String(len))) len = undefined;
const target = len === undefined ? null : Number(len);

// A pinned "geminiModel" (v11 carries one) switches off vo.py's model chain: once that model's free quota is
// gone, the voice step fails although other models still have some. Stopped before any line is voiced.
if (CI && [spec, ...(Array.isArray(spec.beats) ? spec.beats : [])].some((x) => x && typeof x === 'object' && 'geminiModel' in x)) {
  fail('remove "geminiModel" (top level and every beat): in the cloud vo.py picks the model itself, model by model');
}

brk();
// The App Store gate (tools/ci/release.mjs, the owner 2026-10-06): a screen of a feature still waiting for its release
// (the brief's out/ci/request.json "lockedScreens": the navigator's and the OBD scanner's, the 1.0.4 home and menu) is
// in public/screens already but never shows in a film until Apple publishes the update. After it, the screens the
// release replaced ("oldScreens": 01-home and 10-features, the app as it looked before 1.0.4) are refused the same way.
// Anywhere in the spec (a Phone, a cover frame) or in the film's own scene file. Before the voice, so a refused film
// costs no request.
const listOf = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)) : []);
if (CI && (listOf(request?.lockedScreens).length || listOf(request?.oldScreens).length)) {
  const text = JSON.stringify(spec);
  const own = filmScenes(spec)
    .map((f) => {
      try {
        return fs.readFileSync(path.join(root, 'src/scenes/film', `${f.name}.tsx`), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  // a whole id only: "13-diagnosis" (retired) is not inside "13-diagnosis-108" (today's)
  const shows = (s) => namesScreen(text, s) || namesScreen(own, s);
  const used = listOf(request.lockedScreens).filter(shows);
  const old = listOf(request.oldScreens).filter(shows);
  used.forEach((s) => console.log(`          LOCKED ${s} is the screen of a feature that waits for its App Store release (the store has ${request.store ?? 'no answer'}): no film shows it yet`));
  old.forEach((s) => console.log(`          LOCKED ${s} shows the app as it looked before ${request.store}: use the screen of today's app that out/ci/categories.now.json lists for the category, measured again`));
  if (used.length || old.length) hold('take out the LOCKED screens above (the brief names what is not on the App Store yet, or no longer in the app), then check again');
}

brk();
// The RETIRED captures (public/screens/_retired, 2026-10-26, after the owner's 23 Oct complaint about 21-obd-hub: the app no
// longer looks like them): never in a new film, whatever the request lists. A whole id only. Before the voice.
if (CI) {
  const text = JSON.stringify(spec);
  const own = filmScenes(spec)
    .map((f) => {
      try {
        return fs.readFileSync(path.join(root, 'src/scenes/film', `${f.name}.tsx`), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  const gone = retiredScreens(root).filter((s) => namesScreen(text, s) || namesScreen(own, s));
  gone.forEach((s) => console.log(`          RETIRED ${s} is an old capture (public/screens/_retired): the app no longer looks like this; use a screen out/ci/categories.now.json lists for the category, measured again`));
  if (gone.length) hold('take out the RETIRED screens above, then check again');
}

brk();
// A free film (ci/categories.json "needsTopic": the free idea, the owner 2026-10-06: "the video follows MY idea", the app
// only when his idea asks for it): no app screen but those of the features his words name (request.json "freeScreens",
// tools/ci/prompt.mjs). Before the voice.
if (CI && request && request.categoryNeedsTopic && Array.isArray(request.freeScreens)) {
  const allowed = new Set(listOf(request.freeScreens));
  const extra = screensShown(root, spec).filter((s) => !allowed.has(s));
  extra.forEach((s) => console.log(`          FREE_SCREEN ${s}: his idea names no feature with this screen (${allowed.size ? [...allowed].join(', ') : 'none here'}); draw the idea instead (a scene, the brand's mark)`));
  if (extra.length) hold('take out the FREE_SCREEN screens above (a free film shows only what his words name), then check again');
}

brk();
// The store page (ci/categories.json "storeScreen", the owner 2026-10-14: "show now and then that VINARI is on the store,
// so people know"): only in a film the brief offered it to (request.json "storeScreen": not car knowledge or a story, a
// free film only when his words ask, not when one of the page's last films showed it), in one scene, and never a call to
// action: no tap or highlight on the store's Get button. Before the voice.
if (CI && request?.storeScreen && typeof request.storeScreen.src === 'string') {
  const st = request.storeScreen;
  const scenes = (Array.isArray(spec.beats) ? spec.beats : []).flatMap(beatScenes).filter((sc) => sc.type === 'Phone' && sc.src === st.src);
  const lines = [];
  // a film briefed without a category may still land in car knowledge or the stories (a "bank" category): never there
  let bankCat = false;
  try {
    bankCat = Boolean((readJson(path.join(root, 'ci/categories.json')).categories ?? []).find((c) => c?.id === spec.category)?.bank);
  } catch {}
  const why = bankCat ? `a "${spec.category}" film never shows it` : st.why || 'the brief did not offer it';
  if ((!st.ok || bankCat) && screensShown(root, spec).includes(st.src)) lines.push(`STORE_SCREEN ${st.src} is not for this film (${why}): take it out`);
  if (scenes.length > 1) lines.push(`STORE_SCREEN ${st.src} is in ${scenes.length} scenes: one beat a film at most`);
  const g = st.get && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(st.get[k])) ? st.get : null;
  if (g) {
    const pad = 0.02;
    const onGet = (t) => Number(t?.x) >= g.x - pad && Number(t?.x) <= g.x + g.w + pad && Number(t?.y) >= g.y - pad && Number(t?.y) <= g.y + g.h + pad;
    const overGet = (h) => {
      const x0 = Number(h?.x ?? 0.03);
      const w = Number(h?.w ?? 0.94);
      return x0 < g.x + g.w && x0 + w > g.x && Number(h?.y) < g.y + g.h && Number(h?.y) + Number(h?.h) > g.y;
    };
    for (const sc of scenes) {
      for (const t of [sc.tap].flat().filter(Boolean)) if (onGet(t)) lines.push(`STORE_SCREEN a tap on the store's Get button (x ${t.x}, y ${t.y}): the store page is never a call to action; tap nothing on it`);
      for (const h of [sc.highlight].flat().filter(Boolean)) if (overGet(h)) lines.push(`STORE_SCREEN a highlight over the store's Get button (y ${h.y}, h ${h.h}): highlight the icon ({"x": 0.04, "w": 0.32, "y": 0.265, "h": 0.15}) or the name ({"x": 0.38, "w": 0.57, "y": 0.27, "h": 0.095}) only`);
    }
  }
  lines.forEach((l) => console.log(`          ${l}`));
  if (lines.length) hold('fix the STORE_SCREEN lines above (the store page: now and then, never a call to action), then check again');
}

brk();
// The looks (tools/ci/visual.mjs): a film may not stage its category's signature scene as either of the category's
// last 2 films did, nor repeat the whole line of scenes of one of its last 5. Checked before the voice, so a refused
// spec costs no request. In the cloud it stops the check; on the Mac it is a note. A redo keeps its original's looks.
{
  let studioLedger = {};
  try {
    studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  let cats = [];
  try {
    cats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const cat = cats.find((c) => c.id === spec.category);
  if (cat && !(CI && request?.base)) {
    const films = categoryFilms(cat.id, specsDir, studioLedger, spec.id.replace(/-r\d+$/, ''));
    const found = repeats(spec, films, signatureTypes(cat));
    if (found.length) {
      found.forEach((l) => console.log(`          ${l}`));
      if (CI) craft('the film repeats a recent look of its category: change the staging (or the scenes) named above, then check again');
      notes.push(`looks: ${found.length} repeat${found.length === 1 ? '' : 's'} of the category's recent films (a failure in the cloud)`);
    } else line('looks', sigLine(signature(spec)));
  }
}

brk();
// ---- the text on screen and the moments (2026-10-06; the owner: "the films are mostly text, the subtitle is there
// anyway", "every time new graphics that fit the video") -----------------------------------------------------------------
// tools/ci/screentext.mjs: TEXT_SHARE, TEXT_CARDS, SCREEN_WORDS ... lines; a new film's errors stop the cloud check (an
// older film and its redos, and everything on the Mac: notes). The shares again by time once the voice is there (below).
// tools/ci/visual.mjs: HOOK_REPEAT, IDEA_REPEAT, FEED_REPEAT (the page's last 3 films, every category), CAST_REPEAT (the
// main character's outfit and hair again) and a MOMENT_REPEAT of the very picture stop the cloud check; a MOMENT_REPEAT of an often used staging is fixed too. Before the voice, so a
// refused spec costs no request (changing scenes never changes a "say").
const textOpts = {reg: loadRegistry(root), length: target, ci: CI, isNew: isNewFilm(spec.id.replace(/-r\d+$/, ''), root), root};
brk();
{
  // (SCENE_LONG waits for the voice: before it the seconds are a guess)
  const found = textProblems(spec, textOpts).filter((p) => p.id !== 'SCENE_LONG');
  line('text', `${summary(spec, textOpts)}${textOpts.isNew ? '' : ' (an older film: notes only)'}`);
  found.forEach((p) => console.log(`          ${p.line}`));
  const errs = [...new Set(found.filter((p) => p.severity === 'error').map((p) => p.id))];
  if (errs.length) craft(`fix the ${errs.join(', ')} lines above: show the moments (docs/scenes.md, Story moments), punch words only, then check again`);
  if (found.length) notes.push(`text: ${found.length} line${found.length === 1 ? '' : 's'} (${[...new Set(found.map((p) => p.id))].join(', ')})${CI ? ', fix them too' : textOpts.isNew ? ', failures in the cloud' : ''}`);
}
brk();
{
  let studioLedger = {};
  try {
    studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  let cats = [];
  try {
    cats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const cat = cats.find((c) => c.id === spec.category);
  if (cat && !(CI && request?.base)) {
    const films = categoryFilms(cat.id, specsDir, studioLedger, spec.id.replace(/-r\d+$/, ''));
    const specOf = (x) => {
      try {
        return readJson(path.join(specsDir, `${x}.json`));
      } catch {
        return null;
      }
    };
    const filmCode = (name) => {
      try {
        return fs.readFileSync(path.join(root, 'src/scenes/film', `${name}.tsx`), 'utf8');
      } catch {
        return null;
      }
    };
    const entries = Object.values(studioLedger).filter((e) => e && typeof e.id === 'string');
    const ideaOf = (x) => entries.find((e) => e.id === x)?.idea ?? null;
    const idea = CI ? (studioLedger[request?.req]?.id === id ? studioLedger[request.req].idea ?? null : null) : ideaOf(id);
    // the page too (every category: the kit and its scenes are shared): FEED_REPEAT
    const feed = pageFilms(specsDir, studioLedger, spec.id.replace(/-r\d+$/, ''));
    // and the people (2026-10-07: a new person every film): CAST_REPEAT, the main character in the outfit AND the hair
    // of the main one of the page's last 3 films (only a spec's or a Film's own pick can do that), fatal like FEED_REPEAT
    const found = [...inFilmRepeats(spec), ...momentRepeats(spec, films, {specOf}), ...ideaRepeats(spec, films, {filmCode, ideaOf, idea}), ...feedRepeats(spec, feed, {specOf, filmCode}), ...castRepeats(spec, feed, {specOf, filmCode})];
    found.forEach((l) => console.log(`          ${l}`));
    if (CI && found.some((l) => l.startsWith('HOOK_REPEAT'))) craft("the film opens on the picture one of its category's last 2 films opened on: open on another one, then check again");
    // the owner (2026-10-06, 21:25): the graphics never rotate as a fixed set. In the cloud a picture or a composition
    // shown again (the very picture of one of the category's last 2 films or of the page's last 3, a Film composed like a
    // recent one, a recorded idea that reads like one) stops the check; a staging used often (MOMENT_REPEAT ... is in)
    // is fixed too, but only a note
    const again = found.filter((l) => l.startsWith('PICTURE_AGAIN') || l.startsWith('IDEA_REPEAT') || l.startsWith('FEED_REPEAT') || l.startsWith('CAST_REPEAT') || (l.startsWith('MOMENT_REPEAT') && / is the picture /.test(l)));
    if (CI && again.length) craft('the film shows a picture or a composition a recent film showed (the lines above): compose this film\'s own pictures from the kit, then check again');
    found.forEach((l) => notes.push(l));
  }
}

brk();
// Street words (ci/street-words.json, tools/ci/streetwords.mjs; the owner, 2026-10-06: mild folk insults only here and
// there, in a "me" line or a made-up character's line; never the heavy words, slurs or a vulgar quote in a real mouth).
// Before the voice. BANNED_WORD and the STREET lines are fatal in the cloud (STREET_FRAME and his own words: notes); on the
// Mac they are notes, so an old film still renders. The frequency (never two films in a row, at most one in three) and the
// rotation read the page's films by number.
{
  let studioLedger = {};
  try {
    studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const endingsCfg = loadEndings(root);
  const own = [request?.topic, request?.baseTopic, request?.feedback].filter(Boolean).join(' ');
  // a redo keeps its original's place in the order: the films before it
  const history = streetHistory(specsDir, studioLedger, {except: spec.id.replace(/-r\d+$/, '')}).filter((v) => !vNumber(spec.id) || vNumber(v.id) < vNumber(spec.id));
  const street = streetProblems(spec, {skip: (t) => isFollowLine(t, endingsCfg), own, gate: vNumber(spec.id) && !spec.id.startsWith('demo-') ? streetGate(history) : null, onlyOwn: Boolean(request?.categoryNeedsTopic), ask: streetAskOf(request ?? {})});
  street.forEach((p) => console.log(`          ${p.code} ${p.where}: ${p.msg}`));
  const fatal = street.filter((p) => p.fatal);
  if (fatal.length) {
    const msg = `${fatal.length} street-word problem${fatal.length === 1 ? '' : 's'} (${[...new Set(fatal.map((p) => p.code))].join(', ')} above): rewrite ${fatal.length === 1 ? 'that line' : 'those lines'}, then check again`;
    if (CI) hold(msg);
    notes.push(msg);
  }
  street.filter((p) => !p.fatal).forEach((p) => notes.push(`${p.code} ${p.where}: ${p.msg}`));
}

brk();
// The aura drop (tools/ci/aura.mjs; the owner, 2026-10-07, on v81: "not emotional, no aura, no good jump. A SAD opening
// and BOOM"): a film that opens with H21 or H22 (the request's ledger line; on the Mac the film's, or a spec that drops:
// "opening": "aura-drop", a beat "drop": true) has the hurt ("style": "hurt", a picture the grade reaches, 2.5 to 4 s),
// the hold, the drop beat on „არაუშავს!" with its slam and an empty subtitle chunk, the spec's "style": "drive", and three
// new pictures right after the drop. Before the voice, so a rewrite costs no request: AURA_DROP lines, fatal in the cloud
// (a free film, his own words: notes), notes on the Mac.
{
  let led = {};
  try {
    led = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const entry = CI ? (led[request?.req]?.id === id ? led[request.req] : null) : Object.values(led).find((e) => e?.id === id) ?? null;
  const hook = entry?.hook ?? (CI && request?.base ? request.baseHook ?? null : null);
  if (isAuraOpening(spec, hook, root)) {
    const found = auraDropProblems(spec, {root});
    if (found.length) {
      found.forEach((p) => console.log(`          ${p.line}`));
      const msg = `the aura opening is not a drop yet (${found.length} AURA_DROP line${found.length === 1 ? '' : 's'} above; HOOKS.md H21: the hurt, the hold, „არაუშავს!" slammed on a hard cut, the drive): fix them, then check again`;
      if (CI && !request?.categoryNeedsTopic) craft(msg);
      notes.push(msg);
    } else line('aura', auraSummary(spec));
  }
}

brk();
// The film's own scene: the new visual this film designed (docs/scenes.md, Film scenes). Before the voice, so a
// refused film costs no request. FILM lines say what to change.
{
  const films = filmScenes(spec);
  const own = filmName(spec.id);
  const out = [];
  const rules = []; // the studio's count rules: fatal in the cloud, notes on the Mac
  let baseNames = [];
  if (request?.base && request.baseId) {
    try {
      baseNames = filmScenes(readJson(path.join(specsDir, `${request.baseId}.json`))).map((f) => f.name);
    } catch {}
  }
  const mine = (n) => isOwnFilm(n, spec.id) || baseNames.includes(n);
  if (CI && request && !request.base) {
    // ONE to FILM_MAX Films of its own (plan step 1.3: the hook, the reveal and the key moment may each be written for the
    // film); each may come back in several beats (a lesson's diagram moves on step by step), so the names are counted
    const names = new Set(films.map((f) => f.name));
    if (names.size < 1 || names.size > FILM_MAX) rules.push(`FILM a new film has one to ${FILM_MAX} Films of its own, its new visuals ({"type": "Film", "name": "${own}"}, and "${own}Hook", "${own}Reveal" ...: src/scenes/film/<name>.tsx; each may come back in several beats): found ${names.size ? [...names].join(', ') : 'none'}`);
  }
  for (const f of films) {
    if (!FILM_NAME.test(f.name)) out.push(`FILM beats[${f.i}]: "name" must be a PascalCase name, "${own}" for this film`);
    else {
      if (CI && request && !mine(f.name)) rules.push(`FILM beats[${f.i}]: "${f.name}" is not this film's: name it "${own}" or "${own}<Word>" (src/scenes/film/${own}.tsx, ${own}Hook.tsx ...)${baseNames.length ? ` or keep the original's "${[...new Set(baseNames)].join('", "')}"` : ''}`);
      (await lintFilm(f.name)).errors.forEach((e) => out.push(e));
    }
  }
  // the film's own files together: at most filmlint's MAX_BYTES (90 KB since plan step 1.3; one file may take it all)
  {
    const sizes = ownFilms(spec).map((n) => {
      try {
        return fs.statSync(path.join(FILM_DIR, `${n}.tsx`)).size;
      } catch {
        return 0;
      }
    });
    const total = sizes.reduce((a, b) => a + b, 0);
    if (sizes.length > 1 && total > FILM_BYTES) out.push(`FILM the film's own scenes are ${Math.round(total / 1024)} KB together; at most ${FILM_BYTES / 1024} KB for all of them: draw less, reuse a building block`);
  }
  if (CI) {
    // only this film's own files may be written in the run (the original's, the template and every other film stay)
    const st = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'src/scenes/film'], {cwd: root, encoding: 'utf8'});
    const written = [];
    for (const l of (st.stdout ?? '').split('\n').filter(Boolean)) {
      const p = l.slice(3).replace(/^"|"$/g, '');
      const m = /^src\/scenes\/film\/([A-Za-z0-9]+)\.tsx$/.exec(p);
      if (m && isOwnFilm(m[1], spec.id)) written.push(m[1]);
      else rules.push(`FILM ${p} was changed: only this film's own scenes (src/scenes/film/${own}.tsx, ${own}<Word>.tsx) may be written in this run; put it back as it was`);
    }
    if (written.length > FILM_MAX) rules.push(`FILM ${written.length} scene files were written (${written.join(', ')}): ${FILM_MAX} at most; delete the ones the spec does not use`);
  }
  if (films.length && !out.length && !rules.length) line('film', films.map((f) => `${f.name} (beat ${f.i}): lint ok`).join(', '));
  [...out, ...rules].forEach((l) => console.log(`          ${l}`));
  if (out.length || (CI && rules.length)) hold('fix the FILM lines above (node tools/ci/filmlint.mjs <Name> checks the file alone), then check again');
  rules.forEach((l) => notes.push(l.replace(/^FILM /, 'film: ')));
}

brk();
// The treatment (tools/ci/treatment.mjs, plan step 1.3, 2026-10-26: the promo method): every film made in the cloud, and on the
// Mac every film from v131 (TREATMENT_FROM), carries a written "treatment" and keeps it. Before the voice, so a refusal costs
// no request. TREATMENT stops the check; so do HOOK_SOUND, HOOK_CALM, HOOK_LIBRARY, REVEAL_LIBRARY and SCREEN_FLOW, except in a
// redo (the original's film stays as it was: notes), a free film (his words are the script: notes) and HOOK_CALM under a
// typed topic (his opening wins: a note). ACT1_SHARE is always a note. An older film on the Mac: notes only.
if (path.basename(specFile) === `${spec.id}.json` && !spec.id.startsWith('demo-') && (spec.lang ?? 'ka') === 'ka' && vNumber(spec.id) > 0 && (CI || treatmentOn(spec.id))) {
  let cats = [];
  try {
    cats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const kind = kindOf(cats.find((c) => c.id === spec.category));
  const redo = CI ? Boolean(request?.base) : /-r\d+$/.test(spec.id) && !treatmentOn(spec.id.replace(/-r\d+$/, ''));
  const typed = Boolean(CI ? request?.topic : false);
  const found = treatmentProblems(spec, {root, kind});
  const hard = (p) => p.fatal && (p.code === 'TREATMENT' || (!redo && kind !== 'free' && !(p.code === 'HOOK_CALM' && typed)));
  found.forEach((p) => console.log(`          ${p.line}`));
  const stop = found.filter(hard);
  // the soft gate: a missing or broken treatment still stops; its craft lines (HOOK_CALM ...) are warnings
  if (stop.length) (stop.some((p) => p.code === 'TREATMENT') ? hold : craft)(`fix the ${[...new Set(stop.map((p) => p.code))].join(', ')} line${stop.length === 1 ? '' : 's'} above (ci/prompt.md step 1, ci/promo-dna.md), then check again`);
  found.forEach((p) => notes.push(p.line));
  if (!found.length) line('treat', `${String(spec.treatment.logline).slice(0, 90)} (hook: ${spec.treatment.hook.sound}, reveal beats[${spec.treatment.reveal.beat}], ${spec.treatment.screens.length} screen step${spec.treatment.screens.length === 1 ? '' : 's'})`);
} else if (!spec.treatment && (spec.lang ?? 'ka') === 'ka' && vNumber(spec.id)) notes.push('no "treatment" (an older film: it renders as made)');

brk();
// The ending (tools/ci/ending.mjs): film number n ends on the follow reminder when ci/endings.json's rule says so (1 in
// 3), on exactly one of the lines the brief offered, and every other film on a creative quote; nothing else in the
// film, the cover or the post asks to follow. A redo keeps its original's ending. Base Georgian specs only (a hook
// variant or a translation copies its base). Before the voice, so a refused spec costs no request.
if (path.basename(specFile) === `${spec.id}.json` && !spec.id.startsWith('demo-') && (spec.lang ?? 'ka') === 'ka' && vNumber(spec.id)) {
  const cfg = loadEndings(root);
  // a redo's original: the request's, or on the Mac the family's first spec
  let baseSpec = null;
  const baseId = request?.base ? request.baseId : /-r\d+$/.test(spec.id) ? spec.id.replace(/-r\d+$/, '') : null;
  if (baseId) {
    try {
      baseSpec = readJson(path.join(specsDir, `${baseId}.json`));
    } catch {}
  }
  const want = ['follow', 'quote'].includes(request?.ending) ? request.ending : wantedEnding(spec.id, {specsDir, cfg, baseSpec});
  const found = endingProblems(spec, {want, cfg, specsDir, baseSpec});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) hold('fix the ENDING lines above (ci/endings.json has the rule and the lines), then check again');
    notes.push(`ending: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  } else line('ending', want === 'follow' ? `the follow reminder: "${taglineOf(spec).replace(/\s*\|\s*/g, ' ')}"` : 'a closing quote');
}

brk();
// The film's base Georgian spec (not a hook variant, a translation or a demo): the rules below that count films by number
const baseKa = path.basename(specFile) === `${spec.id}.json` && !spec.id.startsWith('demo-') && (spec.lang ?? 'ka') === 'ka' && vNumber(spec.id) > 0;

brk();
// „ულიმიტოდ" (ci/categories.json "unlimited", tools/ci/words.mjs unlimitedRule; the owner 2026-10-15: "the word sells", and
// 2026-10-21: in EVERY film about an app feature). The category as true today: the App Store gate applied for the version
// the brief saw (request.json "store"; on the Mac env STUDIO_STORE_VERSION, else ci/categories.json "store".known).
const unl = (() => {
  let raw = null;
  try {
    raw = readJson(path.join(root, 'ci/categories.json'));
  } catch {}
  const store = CI ? request?.store ?? null : process.env.STUDIO_STORE_VERSION || raw?.store?.known || null;
  const cats = applyRelease(raw, store).cats;
  const cat = cats.find((c) => c.id === spec.category) ?? null;
  const named = Array.isArray(request?.freeFeatures) ? cats.filter((c) => request.freeFeatures.includes(c.id)) : [];
  const from = Number.isInteger(raw?.unlimitedFrom) ? raw.unlimitedFrom : Infinity;
  const rule = baseKa ? unlimitedRule(cat, {n: vNumber(spec.id), from, named}) : null;
  const facts = rule === 'ask' ? named.filter((c) => c.unlimited === true) : [cat];
  return {
    rule,
    // a „ულიმიტოდ" free-week line is true only where the category's facts say so (older films included)
    may: cat?.unlimited === true,
    fact: facts.map((c) => unlimitedFact(c)).filter(Boolean).join(' / '),
    label: rule === 'ask' ? facts.map((c) => c.label).join(', ') : cat?.label ?? '',
  };
})();

brk();
// The free-week line (ci/endings.json "freeWeek", tools/ci/ending.mjs; the owner 2026-10-19, and 2026-10-21: every second
// film): a free-week film says it (the request's "freeWeek" in the cloud; on the Mac a new free-week film by its number),
// once, word for word, as the whole beat right before the EndCard, and no other film says it. Before the voice: FREE_WEEK
// lines, fatal in the cloud.
{
  const fw = loadFreeWeek(root);
  const cfg = loadEndings(root);
  // a crazy story or car knowledge never says it, whatever the number (freeWeekProblems: "skip"); Claude may have picked the
  // category itself
  const want = baseKa && (CI && request ? request.freeWeek === true && request.mode !== 'slides' && !request.base : freeWeekWanted(spec.id, fw, cfg, specsDir, spec.category ?? null));
  const found = freeWeekProblems(spec, {fw, cfg, specsDir, want, unlimited: unl.may});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) hold('fix the FREE_WEEK lines above (ci/endings.json "freeWeek" has the rule and the lines), then check again');
    notes.push(`free week: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  } else if (freeWeekBeat(spec, fw) >= 0) line('free', `the free-week line: "${spec.beats[freeWeekBeat(spec, fw)].say}"`);
  // phase 2 (src/lib/p2.mjs): the white store card ends the film, the line said over it, held at most 0.8 s after the voice
  const st = baseKa ? storesProblems(spec, {fw, cfg}) : [];
  if (st.length) {
    st.forEach((l) => console.log(`          ${l}`));
    if (CI) hold('fix the STORES / END_HOLD lines above (ci/endings.json "stores"), then check again');
    notes.push(`stores: ${st.length} problem${st.length === 1 ? '' : 's'} (a failure in the cloud)`);
  }
}

// the voice's timeline for the rules before the voice, only while it still matches the spec beat for beat: a film voiced and
// then cut or grown by a shot keeps an old timeline in public/vo/<id>/ (build-index: "skip <id>: spec has N beats, timeline
// M"), and its shots, times and length belong to the old film (a cut beat's shots vanish from PICTURE_AGAIN, LENGTH reads
// the old duration). Then the rules estimate, as before any voice; the full check voices the film again.
const voicedTimeline = (sp) => {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(root, 'public', 'vo', sp.id, 'timeline.json'), 'utf8'));
    return Array.isArray(t?.beats) && t.beats.length === (sp.beats?.length ?? -1) ? t : null;
  } catch {
    return null;
  }
};

brk();
// Phase 2's spec guards (tools/ci/p2lint.mjs; src/lib/p2.mjs): the retired parts, text that cannot fit, placeholders, clutter,
// the hook at frame 0, the app's 4 s, the title card, the pace, and never the template of the last 2 films. Before the
// voice: fatal in the cloud for a P2 film, notes on the Mac.
if (baseKa) {
  const timeline = voicedTimeline(spec);
  // the asked length (LENGTH): a redo or a translation keeps its original's; a free film's words decide (p2lint skips it)
  const found = p2Problems(spec, {timeline, prev: prevSpecs(spec.id, specsDir), target: request?.categoryNeedsTopic ? null : target});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) craft('fix the phase-2 lines above (tools/ci/p2lint.mjs; ci/prompt.md "Phase 2"), then check again');
    notes.push(`phase 2: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  }
}

brk();
// The news bank (tools/ci/news.mjs; plan step 13): a film that names an item ("news") tells it while it is valid, says when
// it happened, never repeats one of the last 10 films', and keeps „დღეს" and „ახლა/ახალი" true. Fatal in the cloud.
if (baseKa && typeof spec.news === 'string') {
  let ledger = {};
  try {
    ledger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const recent = Object.values(ledger ?? {}).filter((e) => e?.news).sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));
  const found = newsProblems(spec, {recent});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) hold('fix the news lines above (ci/news-bank.json; tools/ci/news.mjs), then check again');
    notes.push(`news: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  }
}

brk();
// The „იუმორი" category (tools/ci/humor.mjs; plan step 14): the five acts, the horn on frame 0, the character's 1-2 lines in
// his own voice and on screen, one bleep in COLD, never a mother insult, the verified news twist told true and fresh, the
// hinge word, the paired feature kept true. Fatal in the cloud.
if (baseKa && spec.category === 'humor') {
  const timeline = voicedTimeline(spec);
  let ledger = {};
  try {
    ledger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const recent = Object.values(ledger ?? {})
    .filter((e) => e?.news && e.id !== spec.id)
    .sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
    .slice(0, 10);
  const found = humorProblems(spec, {timeline, recent});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) craft('fix the humour lines above (tools/ci/humor.mjs), then check again');
    notes.push(`humour: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  }
}

brk();
// „ულიმიტოდ": a film of a category whose facts hold a true UNLIMITED fact says a form of „ულიმიტო" in at least one line of its
// voice; an app feature whose facts hold none (the QR card: its messages a day are limited) never does. Before the voice:
// UNLIMITED lines, fatal in the cloud (a free film, his words the script: a note), notes on the Mac.
if (unl.rule) {
  const found = unlimitedProblems(spec, unl.rule, {fact: unl.fact, label: unl.label});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    const msg = `fix the UNLIMITED line${found.length === 1 ? '' : 's'} above (ci/categories.json "unlimited"), then check again`;
    if (CI && unl.rule !== 'ask') hold(msg);
    notes.push(`unlimited: ${found.length} problem${found.length === 1 ? '' : 's'}${unl.rule === 'ask' ? ' (a note: a free film)' : ' (a failure in the cloud)'}`);
  } else if (unl.rule !== 'never') line('unlim', 'the voice says „ულიმიტო“');
}

brk();
// The music (tools/ci/music.mjs, ci/music.json): every third film from v63 gets a quiet bed at render, nothing in the
// spec; its own {"src"} wins, "music": false keeps it out. Information only (build-index stops on a missing file).
{
  const bed = musicOf(spec, loadMusic(root));
  line('music', bed ? `${musicName(bed) ?? 'an invalid "music" (build-index refuses it)'}${spec.music ? ' (the spec\'s own bed)' : ''}` : `none${spec.music === false ? ' ("music": false)' : ''}`);
}

brk();
// A banned word ("ხოდოვოი" and the Russianisms, the owner 2026-10-05; tools/ci/words.mjs): before the voice, so a draft
// that says one spends no Gemini request. Fatal in the cloud; a note on the Mac, so old films still render.
const bannedHits = bannedIn(spec);
if (bannedHits.length) {
  bannedHits.forEach((h) => console.log(`          BANNED_WORD ${h.where}: "${h.word}" is banned (the owner); say ${h.plain}`));
  const msg = `${bannedHits.length} banned word${bannedHits.length === 1 ? '' : 's'} (BANNED_WORD above): rewrite ${bannedHits.length === 1 ? 'that line' : 'those lines'}, then check again`;
  if (CI) hold(msg);
  notes.push(msg);
}

brk();
// The post never retells the film (the owner, 2026-10-07, on v79: "the description says exactly what the video says";
// tools/ci/words.mjs postEcho): before the voice, so a rewrite costs nothing. Fatal in the cloud; a note on the Mac (most
// older posts retold their film). A story's names are no echo (the post names the person too).
if (spec.post && typeof spec.post === 'object' && (spec.lang ?? 'ka') === 'ka') {
  let echoCats = [];
  try {
    echoCats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const echoBank = loadStories(root, echoCats);
  const endingsCfg = loadEndings(root);
  // the recorded story's own names, as --record counts them (every story's would also pass over words like "ადგილ"
  // or "სარკ" that another story's names hold, so a post --record passed could fail here); unrecorded: every story's
  let echoStory = null;
  if (echoBank && spec.category === echoBank.cat.id) {
    let led = {};
    try {
      led = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
    } catch {}
    const entry = CI ? (led[request?.req]?.id === id ? led[request.req] : null) : Object.values(led).find((e) => e?.id === id) ?? null;
    echoStory = echoBank.byId.get(String(Array.isArray(entry?.facts) ? entry.facts[0] ?? '' : '')) ?? null;
  }
  const echo = postEchoLine(postEcho(spec, {skip: (t) => isFollowLine(t, endingsCfg), exempt: echoBank && spec.category === echoBank.cat.id ? nameWords(echoBank, echoStory) : undefined}));
  if (echo) {
    console.log(`          ${echo}`);
    const msg = 'the post retells the film (POST_ECHO above): write what the film did not say, then check again';
    if (CI) hold(msg);
    notes.push(msg);
  }
}

brk();
// A car-knowledge film (the category with a fact bank, tools/ci/carinfo.mjs): --record checked the spec against the
// bank facts it used, but the spec may change after that. The same rules again on the spec as it is now (the app shown
// only when a recorded fact links it and then shown, a sound fact's real sound in the first two beats, no credit
// sound while credit lines are off), before the voice. In the cloud the request's ledger line; on the Mac the film's.
{
  let cats = [];
  try {
    cats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const bank = loadBank(root, cats);
  if (bank && spec.category === bank.cat.id) {
    let studioLedger = {};
    try {
      studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
    } catch {}
    const entry = CI ? (studioLedger[request?.req]?.id === id ? studioLedger[request.req] : null) : Object.values(studioLedger).find((e) => e?.id === id) ?? null;
    const ids = Array.isArray(entry?.facts) ? entry.facts.map(String) : [];
    if (ids.length) {
      const endings = loadEndings(root);
      const found = filmRules(spec, ids.map((f) => bank.byId.get(f)).filter(Boolean), {cats, sounds: loadSounds(root), isFollow: (t) => isFollowLine(t, endings)});
      if (found.length) {
        found.forEach((l) => console.log(`          FACTS ${l}`));
        const msg = `the film no longer keeps the rules of its recorded facts (${ids.join(', ')}): fix the FACTS lines above, then check again`;
        if (CI) hold(msg);
        notes.push(msg);
      } else line('facts', ids.join(', '));
    } else if (CI && entry) problems.push(`no bank facts recorded: node tools/ci/prompt.mjs --record ${id} ... --facts <the bank ids of the facts you used>`);
  }
  // a crazy story film (tools/ci/stories.mjs): the same again for its one story (the ledger's "facts")
  const stories = loadStories(root, cats);
  if (stories && spec.category === stories.cat.id) {
    let studioLedger = {};
    try {
      studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
    } catch {}
    const entry = CI ? (studioLedger[request?.req]?.id === id ? studioLedger[request.req] : null) : Object.values(studioLedger).find((e) => e?.id === id) ?? null;
    const sid = Array.isArray(entry?.facts) ? String(entry.facts[0] ?? '') : '';
    if (sid && stories.byId.has(sid)) {
      const endings = loadEndings(root);
      // phase 2: the lanes of the story films before this one (LANE_REPEAT, LANE_RACING) and PHOTO_AGAIN, in storyRules
      const found = storyRules(spec, stories.byId.get(sid), {bank: stories, isFollow: (t) => isFollowLine(t, endings), lanesBefore: prevLanes(stories, studioLedger, id)});
      if (found.length) {
        found.forEach((l) => console.log(`          ${/^STORY_[A-Z]+ /.test(l) ? l : `STORY ${l}`}`));
        const msg = `the film no longer keeps the rules of its story (${sid}): fix the STORY lines above, then check again`;
        if (CI) hold(msg);
        notes.push(msg);
      } else {
        const tw = twistAt(spec);
        line('story', `${sid}${tw ? `, the twist at ${Math.round(tw.share * 100)} % (beats[${tw.beat}])` : ''}`);
      }
      for (const n of storyNotes(spec)) notes.push(`story: ${n}`);
    } else if (CI && entry) problems.push(`no story recorded: node tools/ci/prompt.mjs --record ${id} ... --story <the id of the story you tell>`);
  }
}

// every family that failed before the voice, at once (a phase-2 film, --lint): no voice is spent on a film that would fail
heldStop();

// ---- 1. voice ------------------------------------------------------------------------------------------------
// --lint: none (the lint and the studio's own rules below run on the spec alone)
if (!LINT) {
  const cacheDir = process.env.VO_CACHE || path.join(root, 'tools/.vo_cache');
  const cached = () => {
    try {
      return new Set(fs.readdirSync(cacheDir));
    } catch {
      return new Set();
    }
  };
  const before = cached();
  const vo = spawnSync('python3', [path.join(root, 'tools/vo.py'), id], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
  const fresh = [...cached()].filter((f) => !before.has(f) && !f.endsWith('.tmp'));
  const newGemini = fresh.filter((f) => f.endsWith('.gemini.wav')).length;
  const newEdge = fresh.filter((f) => f.endsWith('.mp3')).length;
  const synthesised = newGemini + newEdge ? `${newGemini} new Gemini clip${newGemini === 1 ? '' : 's'} (free daily quota)${newEdge ? `, ${newEdge} new edge-tts` : ''}` : 'nothing new, all cached';
  // vo.py's exit 75 (VOICE_QUOTA_EXIT): every Gemini model is out of today's quota and edge-tts is off (VO_NO_EDGE=1)
  if (vo.status === 75) {
    console.log('\nVOICE_QUOTA ხმის დღევანდელი ლიმიტი ამოიწურა (Gemini, every model). Stop now: no retries, no spec changes.');
    writeStamp(root, id, {verdict: 'quota', inputs: stampInputs});
    process.exit(75);
  }
  if (vo.status !== 0) {
    if (vo.stdout) console.log(vo.stdout.trim());
    line('voice', synthesised);
    fail(`tools/vo.py failed (exit ${vo.status ?? vo.error?.code}); read its message above`);
  }
  const voOut = (vo.stdout ?? '').trim().split('\n');
  line('voice', `${voOut[0].replace(new RegExp(`^${id}: (voice )?`), '')}; ${synthesised}`);
  // every Gemini model out of today's quota: edge-tts read it. Nothing to fix and nothing to retry.
  {
    let tl = null;
    try {
      tl = JSON.parse(fs.readFileSync(path.join(process.env.VO_OUT || path.join(root, 'public/vo'), id, 'timeline.json'), 'utf8'));
    } catch {}
    if (String(spec.voice ?? '').startsWith('gemini:') && typeof tl?.voice === 'string' && !tl.voice.startsWith('gemini:')) {
      console.log(`          - Gemini is out of today's free quota: Microsoft's edge-tts (${tl.voice}) reads this film. Expected: carry on as usual, no retries, no line changes to get Gemini back.`);
    }
    // VOICE_SYNC (the p2x car film, 2026-10-27: "chi-square 26.4 for 15 degrees of freedom", its word-by-word subtitles placed by
    // letters): tools/vo.py's whole take whose sentence paces say it may not be the text (a line missing, repeated or run into
    // the next), still so after its retake. A problem in the cloud for a phase-2 film, a note otherwise.
    if (tl?.sync && tl.sync.content) {
      const msg = `VOICE_SYNC the voice take may not be the text after ${tl.sync.takes} take${tl.sync.takes === 1 ? '' : 's'} (its sentences' paces do not match their letters: a line missing, repeated or run into the next), so the word-by-word subtitles would sit off: end every sentence with a full stop, split a long run-on sentence in two, and drop a line that repeats another's words; a changed line voices the film again`;
      (CI && p2On(spec.id.replace(/-r\d+$/, '')) ? problems : notes).push(msg);
    }
  }
  if (verbose) voOut.slice(1).forEach((l) => console.log(`         ${l.trim()}`));
  // the text shares again, by time, and the scenes that run too long (tools/ci/screentext.mjs): the voice's timeline is here
  // now. A new film's errors are problems in the cloud; notes otherwise.
  {
    let tl = null;
    try {
      tl = JSON.parse(fs.readFileSync(path.join(process.env.VO_OUT || path.join(root, 'public/vo'), id, 'timeline.json'), 'utf8'));
    } catch {}
    if (Array.isArray(tl?.beats) && tl.beats.length === spec.beats.length) {
      const timed = textProblems(spec, {...textOpts, timeline: tl}).filter((p) => ['TEXT_SHARE', 'PICTURE_SHARE', 'SCENE_LONG'].includes(p.id));
      line('text', `${summary(spec, {...textOpts, timeline: tl})}, by time`);
      timed.forEach((p) => console.log(`          ${p.line}`));
      timed.forEach((p) => (p.severity === 'error' ? problems : notes).push(p.line));
    }
  }
}

// ---- 2. lint -------------------------------------------------------------------------------------------------
const lint = spawnSync(process.execPath, [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, encoding: 'utf8'});
const mine = `${lint.stderr ?? ''}`
  .split('\n')
  .filter((l) => l.startsWith(`  ${id}: `) || l.startsWith(`skip ${id}:`))
  .map((l) => l.replace(`  ${id}: `, ''));
// a voiced film whose beat count changed since (a shot cut or added after a full check): build-index skips it ("spec has N
// beats, timeline M. Re-run tools/vo.py"). The full check voices first, so it never sees this; --lint never voices, so there
// it is a note (the full check voices the film again), never a problem the writer could only clear with tools/vo.py
const staleVoice = (l) => l.startsWith(`skip ${id}:`) && /\btimeline\b/.test(l);
const stale = LINT ? mine.filter(staleVoice) : [];
const errors = mine.filter((l) => (l.startsWith('ERROR ') || l.startsWith('skip ')) && !stale.includes(l));
const warnings = mine.filter((l) => !errors.includes(l) && !stale.includes(l));
for (const l of stale) notes.push(`${l.replace(/\.?\s*Re-run tools\/vo\.py\.?$/, '')}: the voice predates this beat count; the full check voices the film again (no tools/vo.py by hand)`);
if (lint.status !== 0 || errors.length) {
  line('lint', `${errors.length || 'an'} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
  [...errors, ...warnings].forEach((l) => console.log(`          - ${l}`));
  if (!errors.length && lint.stderr) console.log(lint.stderr.trim());
  if (!LINT) fail('fix the lint errors, then check again');
  problems.push(...(errors.length ? errors : ['the build-index lint failed (its message above)']));
} else {
  line('lint', warnings.length ? `ok, ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (fix them too)` : 'ok, no warnings');
  warnings.forEach((l) => console.log(`          - ${l}`));
}
// a banned word (build-index BANNED_WORD: "ხოდოვოი" and the Russianisms, the owner 2026-10-05) stops the cloud check: a
// warning only so that old films still render on the Mac
{
  // (the scan before the voice catches these first; this is the net for a place it does not read)
  const banned = warnings.filter((l) => l.startsWith('BANNED_WORD'));
  const msg = `${banned.length} banned word${banned.length === 1 ? '' : 's'} (BANNED_WORD above): rewrite ${banned.length === 1 ? 'that line' : 'those lines'}, then check again`;
  if (banned.length && CI) (LINT ? problems.push(msg) : fail(msg));
  if (banned.length && !bannedHits.length) notes.push(msg);
}
// LESSON_CHOPPY (the p2x technical judge, 2026-10-27: build-index raised it on v135-belt-fine only at the render, after the
// film gate and the voice): a phase-2 film's lesson told in fragments is a problem in the cloud, so the gate's fix round can
// clear it before any voice is spent
for (const l of warnings.filter((w) => /^LESSON_CHOPPY\b/.test(w))) (CI && p2On(id.replace(/-r\d+$/, '')) ? problems : notes).push(l);

// ---- the studio's own rules ----------------------------------------------------------------------------------
const cover = spec.cover && typeof spec.cover === 'object' ? spec.cover : null;
const post = spec.post && typeof spec.post === 'object' ? spec.post : null;
const needs = CI ? problems : notes;
if (!cover?.title) needs.push('no "cover" {title, kind, ...}: every video gets its designed Reels cover (SKILL.md, Cover)');
// the cover is purpose-built (2026-10-26, never a film frame): a kind and its data, the real files it names (tools/ci/cover.mjs);
// in the cloud every problem stops the check, before the voice
// 2026-10-27 (the owner: „ერთდაიგივეებია, არც ჩანს წესიერად"): one of ten compositions, every size against the 300 px tile
// (src/cover/layout.mjs), the film's own numbers and words (COVER_FACT, COVER_QUOTE_SAID), a current capture
// (COVER_STALE_SCREEN, against the store's version the brief carries)
if (cover) for (const x of coverLint(root, spec, {needKind: CI, store: request?.store ?? undefined})) (CI ? problems : notes).push(x);
// the variety rule (tools/ci/coverlog.mjs, the page's ledger specs/.covers.jsonl): not the category's last 2 compositions, at
// most 2 of a kind in the page's last 6, never the same capture or photo, the tilted phone once in 6. The film's own earlier
// line (a redo) does not count against it
const coverLedger = readLedger(root).filter((l) => l.id !== spec.id && l.id !== String(spec.id ?? '').replace(/-r\d+$/, ''));
// (round 6, the judges on the guard) the polaroid only with the film's own credited photos (its story photos), and the
// rule never stalls a film for the page's history alone: allowedFor always leaves a composition the film can make, and a
// cover the brief offered (request.json "coverAllowed") passes even when a film published between the brief and this check
// moved the page (said as a note)
const coverHere = {caps: capturesFor(root, String(spec.category ?? ''), request?.store), carplay: cover?.kind === 'carplay', photos: filmPhotos(spec)};
const coverPlan = allowedFor(String(spec.category ?? ''), coverLedger, coverHere);
if (cover && typeof cover.kind === 'string' && spec.category) {
  const mine = {comp: cover.kind, asset: coverAsset(cover)};
  const offered = briefOffered(mine, request);
  for (const x of repeatProblems(mine, String(spec.category), coverLedger, coverHere)) (CI && !offered ? fatalLine : (l) => notes.push(l))(offered ? `${x} (the brief offered "${cover.kind}": the page moved since, so it goes out)` : x);
}
if (!post) needs.push('no "post" {description, tags}: the text that goes out with the video (SKILL.md, Post text)');
if (CI && request) {
  const want = request.voiceId;
  if (want && spec.voice !== want) problems.push(`"voice" is "${spec.voice}"; the request asked for "${want}"`);
  if (request.baseTheme && spec.theme !== request.baseTheme) problems.push(`"theme" is "${spec.theme}"; a redo keeps its original's look, "${request.baseTheme}"`);
  let ledger = {};
  try {
    ledger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const ownFilm = ownFilms(spec, id).length > 0;
  if (ledger[request.req]?.id === id && ownFilm && !ledger[request.req].idea)
    problems.push(`FILM the new visual is not recorded: node tools/ci/prompt.mjs --record ${id} ... --idea "<the new visual in one English line>"`);
  if (ledger[request.req]?.id !== id) (LINT ? notes : problems).push(`${LINT ? '(record it before the full check) ' : ''}the request is not recorded: node tools/ci/prompt.mjs --record ${id} --hook <Hnn> --angle "<the angle, one line>"${ownFilm ? ' --idea "<the new visual, one line>"' : ''}${request.topic || request.base ? '' : ' "<the idea in a few Georgian words>"'}`);
}

// --lint ends here: everything it found at once, never a stamp (the voice, the stills, the cover and the frame guards are the
// full check's; only it says "ready to render")
if (LINT) {
  for (const x of notes) line('note', x);
  if (problems.length) {
    problems.forEach((x) => console.log(`  PROBLEM ${x}`));
    fail(`${problems.length} problem${problems.length === 1 ? '' : 's'} above${held.length ? ` (${held.length} rule famil${held.length === 1 ? 'y' : 'ies'} before the voice, the lint and the studio's own rules)` : ''}: fix them ALL in one go (every Edit in one reply), then lint again`);
  }
  clearLoop(root, id);
  console.log(`\nlint clean: now the full check, node tools/check.mjs ${id} (the voice, the stills, the sheet and the frame guards)`);
  process.exit(0);
}

// ---- 2b. the subtitle's colour, as the render will have it (the r3x round-2 panel, 2026-10-28) ----------------------
// make.sh measures the picture under the line (tools/subtone.mjs) only AFTER this check, so the sheet, the frame guards and
// the film gate's art director saw every caption in the theme's bare ink: black on the night photos, black on black in a dark
// FreezeTag. They scored "legible 1" on all three films, and no fix round could move it (the caption layer is not the
// writer's). A phase-2 film now gets the same probe here, then the index again (it embeds the track and the plate), so every
// still below shows the caption the render will show. The probe never stops a film; without it the sheet keeps the bare line
// and says so. VS_SUBTONE=0 (make.sh's own switch) skips it.
let subtoneLine = null;
// a measure of this very spec and voice, newer than every Film file it names, is still the render's (each probe is a bundle
// and a pass over the film: a writer's check loop would pay it on every run)
const subtoneFresh = () => {
  try {
    const f = path.join(root, 'out', `${id}.subtone.json`);
    // the same files build-index signs (it embeds the track only while they match)
    const tl = path.join(root, 'public', 'vo', id, 'timeline.json');
    if (!subtoneOf(root, id, specFile, tl)) return false;
    const at = fs.statSync(f).mtimeMs;
    const names = new Set((spec.beats ?? []).flatMap((b) => [b?.scene, ...(b?.cuts ?? []).map((c) => c?.scene)]).filter((sc) => sc?.type === 'Film' && sc.name).map((sc) => sc.name));
    return [...names].every((n) => {
      const file = path.join(root, 'src/scenes/film', `${n}.tsx`);
      return !fs.existsSync(file) || fs.statSync(file).mtimeMs < at;
    });
  } catch {
    return false;
  }
};
if (p2On(id.replace(/-r\d+$/, '')) && guardOn(spec.id) && process.env.VS_SUBTONE !== '0' && subtoneFresh()) {
  const again = spawnSync(process.execPath, [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, encoding: 'utf8'});
  if (again.status === 0) {
    subtoneLine = 'the last measure still holds (the same spec, voice and Film files)';
    line('caption', subtoneLine);
  }
}
if (!subtoneLine && p2On(id.replace(/-r\d+$/, '')) && guardOn(spec.id) && process.env.VS_SUBTONE !== '0') {
  const t0 = Date.now();
  const st = spawnSync(process.execPath, [path.join(root, 'tools/subtone.mjs'), id], {cwd: root, encoding: 'utf8', env: {...process.env, VS_LOCKED: '1'}, maxBuffer: 16 << 20});
  const said = `${st.stdout ?? ''}`.trim().split('\n').filter((l) => l.startsWith('subtone:')).pop() ?? '';
  if (st.status === 0 && fs.existsSync(path.join(root, 'out', `${id}.subtone.json`))) {
    const again = spawnSync(process.execPath, [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, encoding: 'utf8'});
    subtoneLine = again.status === 0 ? `measured as the render will (${((Date.now() - t0) / 1000).toFixed(0)} s): ${said.replace(/^subtone:\s*/, '').split(';')[0]}` : null;
  }
  if (!subtoneLine) notes.push(`CAPTION the subtitle's colour could not be measured before the stills (${said.replace(/^subtone:\s*/, '').slice(0, 120) || `exit ${st.status}`}): the sheet shows the bare line in the theme's ink; the render measures it again`);
  else line('caption', subtoneLine);
}

// ---- 3. stills -----------------------------------------------------------------------------------------------
const opts = {...renderOpts(), logLevel: 'error'};
// Remotion prints a page's console lines at their own level whatever logLevel says: drop the three.js
// deprecation notes (every Wire3D tab prints one), keep everything else
for (const k of ['log', 'warn', 'info']) {
  const print = console[k].bind(console);
  console[k] = (...a) => (a.some((x) => /THREE\.\w+: This module has been deprecated/.test(String(x))) ? undefined : print(...a));
}
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
// every bundle copies public/ (hundreds of MB): remove it when this run ends, or a day of runs fills the disk (2026-10-12)
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});
const browser = await openBrowser('chrome', opts);
const stillsDir = path.join(root, 'out/stills');
fs.mkdirSync(stillsDir, {recursive: true});
const tiles = [];
const openTiles = []; // fx films: the first 1.5 s (half-size stills every 6 frames; five on the sheet)
// SLOW_OPEN: the picture band in the first 1.5 s, every 6 frames. An EVENT is new structure: edges that were not there
// 6 frames before (beyond what a camera drift moves in that time) or a jump in the band's brightness. A slow drift, a
// handheld breath or a Ken Burns push is motion, not an event (2026-10-06, v78 sample: the old mean-difference test
// passed a photo-slam whose frames at 0, 0.3, 0.6 and 1 s looked the same, because a drifting photo changes many pixels)
const OPEN_PROBE = [0, 6, 12, 18, 24, 30, 36, 42, 45];
const OPEN_SHEET = [0, 6, 18, 30, 45];
const OPEN_EVENT = 0.012; // new edges as a share of the frame's edges, summed over the steps (old v78: 0.000; a drawn ring: 0.021)
const OPEN_LUM = 8; // a jump of the band's mean brightness (0..255) between two probes: a flash, a dip, a slam into light
const motion = []; // fx films: [{k, type, stills}] per shot
let guardRes = null; // the frame guards' review (tools/ci/guards.mjs), a film from GUARD_FROM on
let guardErr = null;
let fxPlan = null;
let film;
try {
  const composition = await selectComposition({serveUrl, id, ...opts, puppeteerInstance: browser});
  const {fps, durationInFrames} = composition;
  film = durationInFrames / fps;
  const {spec: s, timeline} = composition.props;
  fxPlan = composition.props.fx?.on ? composition.props.fx : null;
  // the shots, as Promo plans them (a mid-beat cut of an fx film is a shot of its own)
  const scenes = planShots(s, timeline).map((p, k) => ({k, type: p.spec.type ?? '?', start: p.from, end: p.to, beat: p.beats[0], cut: p.c0 || null}));
  scenes.forEach((sc) => (sc.frame = Math.round(sc.start + (sc.end - sc.start) * 0.7)));
  // the sheet's shot numbers -> the spec's beats (the r3x round-2 panel: the art director's "shot 3" was the third TILE, and an
  // fx film's sheet opens with five opening tiles, so its fixes named the wrong shots): tools/ci/filmgate.mjs gives the fix
  // round this map with the art director's fixes
  try {
    fs.writeFileSync(path.join(root, 'out', `${id}.shots.json`), `${JSON.stringify(scenes.map((sc) => ({shot: sc.k + 1, type: sc.type, beat: sc.beat, cut: sc.cut, from: +(sc.start / fps).toFixed(2), to: +(sc.end / fps).toFixed(2)})))}\n`);
  } catch {}
  const shots = [
    ...scenes.map((sc, k) => ({frame: sc.frame, type: sc.type, label: `${k + 1} ${sc.type}  ${(sc.frame / fps).toFixed(1)}s  (${((sc.end - sc.start) / fps).toFixed(1)}s long)`})),
    ...extraFrames.filter((f) => f < durationInFrames).map((f) => ({frame: f, label: `frame ${f}  ${(f / fps).toFixed(1)}s`})),
  ];
  // the frame guards' subtitle plate (src/layers/Subtitles.tsx): a phase-2 film was measured above (2b), so its colour and
  // plate are the render's; an older one keeps the bare line ("subPlate": false: no plate where nothing was measured)
  const stillProps = guardOn(spec.id) ? {subPlate: false} : {};
  for (const shot of shots) {
    const output = path.join(stillsDir, `${id}-${shot.frame}.png`);
    await renderStill({serveUrl, composition, frame: shot.frame, output, scale: 0.5, inputProps: stillProps, ...opts, puppeteerInstance: browser});
    tiles.push({path: output, label: shot.label, type: shot.type ?? null});
  }
  // the motion strip (fx films): small stills that show whether things MOVE, the first 1.5 s on top of the sheet
  if (fxPlan) {
    const small = async (f) => {
      const output = path.join(stillsDir, `${id}-m${f}.png`);
      await renderStill({serveUrl, composition, frame: Math.max(0, Math.min(durationInFrames - 1, f)), output, scale: 0.25, ...opts, puppeteerInstance: browser});
      return output;
    };
    // the first 1.5 s every 6 frames at half size (SLOW_OPEN reads them); the sheet shows five of them
    const half = async (f) => {
      const output = path.join(stillsDir, `${id}-o${f}.png`);
      await renderStill({serveUrl, composition, frame: Math.max(0, Math.min(durationInFrames - 1, f)), output, scale: 0.5, ...opts, puppeteerInstance: browser});
      return output;
    };
    for (const f of OPEN_PROBE) if (f < durationInFrames) openTiles.push({path: await half(f), label: `open f${f}  ${(f / fps).toFixed(2)}s`, f, sheet: OPEN_SHEET.includes(f)});
    for (const sc of scenes) {
      const len = sc.end - sc.start;
      const fs = [...new Set([sc.start + 2, sc.start + Math.round(len / 2), sc.end - 3].filter((f) => f >= sc.start && f < sc.end))];
      motion.push({k: sc.k, type: sc.type, stills: await Promise.all(fs.map(async (f) => small(f)))});
    }
  }
  // the frame guards (src/lib/guard.mjs): the whole film sampled every 6 frames through three probes (tools/ci/guards.mjs)
  if (guardOn(spec.id)) {
    try {
      guardRes = await reviewFilm({id, serveUrl, composition, browser, renderFrames, opts, concurrency, shots: scenes});
    } catch (e) {
      guardErr = String(e?.message ?? e).split('\n')[0].slice(0, 200);
    }
  }
  try {
    // the cover as covers.mjs will draw it: resolved here in Node (the spec's own, an older one read as today's, or the net),
    // with what the page's ledger hands it (the phone's pose, the polaroid's tilt, the stat's slab)
    const coverCtx = {pose: coverPlan.pose, polSign: coverPlan.polSign, slab: coverPlan.slab, dark: coverPlan.dark, allowed: coverPlan.allowed};
    const coverRes = resolveFor(root, spec, {coverCtx});
    const base = await selectComposition({serveUrl, id: `${id}-cover`, ...opts, puppeteerInstance: browser});
    const inputProps = {...base.props, coverResolved: coverRes.cover, coverCtx};
    const coverComp = await selectComposition({serveUrl, id: `${id}-cover`, inputProps, ...opts, puppeteerInstance: browser});
    const output = path.join(stillsDir, `${id}-cover.png`);
    await renderStill({serveUrl, composition: coverComp, frame: 0, output, scale: 0.5, inputProps, ...opts, puppeteerInstance: browser});
    tiles.push({path: output, label: `cover  ${coverRes.cover.kind}${coverRes.layout.variant ? ` ${coverRes.layout.variant}` : ''} (${coverRes.how})  (dashes: 3:4 grid)`, grid: true});
    if (coverRes.how.startsWith('net')) (CI ? problems : notes).push(`COVER_NET the spec's cover could not be drawn (${coverRes.tried.map((t) => `${t.kind}: ${t.problems[0]}`).join('; ') || 'no kind'}): the net drew a ${coverRes.cover.kind} from the film; fix "cover"`);
    // what the gallery shows: the centre 3:4 at 300 x 400 (the writer's self-review looks at this, SKILL.md)
    try {
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', output, '-vf', 'crop=iw:ih*0.75:0:ih*0.125,scale=300:400:flags=lanczos', '-update', '1', path.join(stillsDir, `${id}-cover-tile.png`)], ffOptions());
    } catch {}
    // black and white, inside the grid, a full picture, not a near copy (COVER_COLOUR, COVER_GRID, COVER_EMPTY, COVER_TOP_INK,
    // COVER_TWIN: covers.mjs refuses the same after the render and draws the net instead)
    const recent = coverLedger.filter((l) => !l.test).slice(0, PAGE);
    for (const x of coverPixels(output, {st: coverRes.layout.ST})) (CI ? problems : notes).push(x);
    // a near copy of a recent cover is variety, not breakage: a warning under the soft gate
    for (const x of twinProblems(coverSig(output), recent)) (CI ? fatalLine : (l) => notes.push(l))(x);
  } catch (e) {
    problems.push(`the cover did not render: ${String(e.message ?? e).split('\n')[0]}`);
  }
} catch (e) {
  fail(`the stills did not render: ${String(e.message ?? e).split('\n')[0]}`);
} finally {
  await browser.close({silent: true}).catch(() => {});
}

// ---- length --------------------------------------------------------------------------------------------------
const LENGTH_SHORT = 0.9;
let lengthLine = `film ${film.toFixed(1)} s`;
if (target) {
  if (film > target + 1) lengthLine += `; target ${target} s: TOO LONG by ${(film - target).toFixed(1)} s, cut words (never the speed)`;
  else if (film < target * LENGTH_SHORT)
    lengthLine += request?.categoryNeedsTopic
      ? `; target ${target} s: short by ${(target - film).toFixed(1)} s: fine for a free film (his lines decide); add holds after his questions, never words he did not mean`
      : `; target ${target} s: short by ${(target - film).toFixed(1)} s, add a few words or a beat`;
  else lengthLine += `; target ${target} s: ok`;
  // the r3x round-2 panel (2026-10-28): the showcase came in at 50 s of 60 (its TimeRace dropped) and the story at 39 of 45,
  // both "ok" here (0.8 was only a note): in the cloud a film under 90 % of the asked length is a problem (a free film's words
  // decide its length)
  if (CI && film < target * LENGTH_SHORT && !request?.categoryNeedsTopic && baseKa) fatalLine(`LENGTH the voiced film is ${film.toFixed(1)} s, the request asked ${target} s (${Math.round(target * LENGTH_SHORT)} s at least): keep every planned scene and add beats that SHOW more of the idea, never slower words`);
} else lengthLine += ` (no target: --len 15|20|30|45|60)`;
line('length', lengthLine);
if (cover) line('cover', `"${cover.title ?? '(the first spoken line)'}" · ${cover.kind ?? 'no kind (the net builds one from the film)'}${coverAsset(cover) ? ` ${coverAsset(cover)}` : ''} · allowed now: ${coverPlan.allowed.join(', ') || '(none)'}; tile: out/stills/${id}-cover-tile.png`);
if (post) line('post', `${post.description ?? ''}  ${(post.tags ?? []).join(' ')}`);

// ---- motion (fx films: tools/ci/fx.mjs plans the camera, the transitions, the opening and the ending) -------------
if (fxPlan) {
  const cuts = fxPlan.cuts.filter(Boolean).map((c) => c.type);
  line('motion', `opening ${fxPlan.opening} · ending ${fxPlan.ending} · cuts ${cuts.join(' ') || 'none'} · camera ${fxPlan.cameras.map((c) => c.move ?? c.cls).join(' ')}`);
  for (const c of fxPlan.credits ?? []) line('credit', `${c} (on screen while the photo is; publish adds it to the post)`);
  for (const x of fxPlan.notes ?? []) notes.push(`FX ${x}`);
  for (const x of budgetProblems(fxPlan, Math.round(film * 30))) notes.push(x);
  // how much each shot moves: the mean absolute difference of consecutive small stills (108 x 192 grey, 0..255)
  const MAD = String.raw`
import json, sys
import numpy as np
from PIL import Image
a = json.load(sys.stdin)
g = lambda p: np.asarray(Image.open(p).convert("L").resize((108, 192), Image.BILINEAR), np.float32)
out = {"shots": []}
for s in a["shots"]:
    im = [g(p) for p in s]
    out["shots"].append([float(np.abs(im[i + 1] - im[i]).mean()) for i in range(len(im) - 1)])
print(json.dumps(out))
`;
  // the opening's events: per step of 6 frames, the share of the later still's edges (the picture band only: no meta bar,
  // no subtitle, no credit line) that lie farther than 20 frame px from any edge of the earlier still, and the other way
  // round (something left), and the band's brightness jump. A drift of a few px a step stays inside the 20 px.
  const OPEN_EVENTS = String.raw`
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage
a = json.load(sys.stdin)
def band(p):
    im = Image.open(p).convert("L")
    W, H = im.size
    im = im.crop((int(W * 40 / 1080), int(H * 335 / 1920), int(W * 1040 / 1080), int(H * 1396 / 1920)))
    return np.asarray(im.resize((500, 530), Image.BOX), np.float32)
def edges(x):
    b = ndimage.gaussian_filter(x, 0.8)
    return np.hypot(ndimage.sobel(b, 0), ndimage.sobel(b, 1))
R = 10
K = np.ones((2 * R + 1, 2 * R + 1), bool)
im = [band(p) for p in a["paths"]]
out = []
for i in range(len(im) - 1):
    x, y = im[i], im[i + 1]
    gx, gy = edges(x), edges(y)
    t = max(np.percentile(gx, 90), np.percentile(gy, 90), 60)
    ex, ey = gx > t, gy > t
    # the band's own border is left out (a drift brings a sliver in there)
    m = np.zeros_like(ex); m[R + 2:-R - 2, R + 2:-R - 2] = True
    ex, ey = ex & m, ey & m
    dx, dy = ndimage.binary_dilation(ex, K), ndimage.binary_dilation(ey, K)
    nn = max((ey & ~dx).sum() / max(1, ey.sum()), (ex & ~dy).sum() / max(1, ex.sum()))
    out.append({"a": a["frames"][i], "b": a["frames"][i + 1], "new": round(float(nn), 4), "lum": round(float(abs(x.mean() - y.mean())), 2)})
print(json.dumps(out))
`;
  const mad = spawnSync('python3', ['-c', MAD], {input: JSON.stringify({shots: motion.map((m) => m.stills)}), encoding: 'utf8'});
  if (mad.status === 0) {
    const r = JSON.parse(mad.stdout);
    motion.forEach((m, i) => {
      const d = r.shots[i] ?? [];
      if (d.length && d.every((x) => x < 0.6) && m.type !== 'EndCard') notes.push(`STATIC shot ${m.k + 1} (${m.type}) hardly moves (${d.map((x) => x.toFixed(2)).join(', ')}): give it a camera move, an event on a chunk, or cut it shorter`);
    });
  } else notes.push(`the motion strip was not measured (${(mad.stderr ?? '').trim().split('\n').pop()})`);
  // the opening's events (OPEN_PROBE): the first by 0.6 s, a second by 1.5 s (HOOKS.md s1)
  const ev = spawnSync('python3', ['-c', OPEN_EVENTS], {input: JSON.stringify({frames: openTiles.map((t) => t.f), paths: openTiles.map((t) => t.path)}), encoding: 'utf8'});
  if (ev.status === 0) {
    const steps = JSON.parse(ev.stdout); // [{a, b, new, lum}]
    const score = (lo, hi) => {
      const st = steps.filter((x) => x.a >= lo && x.b <= hi);
      return {edges: st.reduce((n, x) => n + x.new, 0), lum: Math.max(0, ...st.map((x) => x.lum))};
    };
    const first = score(0, 18);
    const second = score(18, 45);
    const quiet = (x) => x.edges < OPEN_EVENT && x.lum < OPEN_LUM;
    const fmt = (x) => `new edges ${x.edges.toFixed(3)}, light ${x.lum.toFixed(1)}`;
    if (quiet(first))
      notes.push(
        `SLOW_OPEN nothing happens in the first 0.6 s (${fmt(first)}; an event is at least ${OPEN_EVENT} or ${OPEN_LUM}): a drift is not an event. Land something by 0.6 s: a punch word, the name strip or a ring on an early cue, a number, or the opening's hit (photo-slam slams the photo in from 1.24x; HOOKS.md s1)`,
      );
    if (quiet(second)) notes.push(`SLOW_OPEN no second event between 0.6 and 1.5 s (${fmt(second)}): chunk 1 lands something in the picture by 1.5 s (HOOKS.md s1)`);
  } else notes.push(`the opening's events were not measured (${(ev.stderr ?? '').trim().split('\n').pop()})`);
  // the category's last films: the same opening, ending or first cuts (the planner avoids them; this is the net)
  try {
    const specs = fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.')).map((f) => {
      try {
        return [f, readJson(path.join(specsDir, f))];
      } catch {
        return [f, null];
      }
    });
    const filmCode = (name) => {
      try {
        return fs.readFileSync(path.join(root, 'src/scenes/film', `${name}.tsx`), 'utf8');
      } catch {
        return null;
      }
    };
    const planner = makePlanner({specs, cfg: loadFxConfig(root), filmCode});
    const earlier = planner.earlierPlans(spec, 3);
    const stories = loadFxConfig(root).stories.includes(spec.category);
    const theirs = earlier.map((x) => ({id: x.id, ...motionOf(x.plan)}));
    for (const x of motionRepeats(motionOf(fxPlan), theirs, stories)) notes.push(x);
    // the Film scene's motifs against the category's last Films
    const theirCodes = planner.earlierOf(spec).slice(-3).flatMap((sp) => filmScenes(sp).map((f) => filmCode(f.name)).filter(Boolean));
    for (const f of filmScenes(spec)) for (const x of motifRepeats(f.name, filmCode(f.name), theirCodes)) notes.push(x);
  } catch (e) {
    notes.push(`the motion repeats were not checked (${String(e.message ?? e).split('\n')[0]})`);
  }
}

// ---- the stills' own review (a film from KIT_FROM on, src/lib/kit.mjs; the owner 2026-10-19: "never the same picture
// again", phones and cars whole) -------------------------------------------------------------------------------------------
// tools/ci/stillreview.py reads the stills themselves: STILL_REPEAT, a tile that looks like another tile of this film or like
// a still of one of the page's earlier films (specs/.stills.json, a 64-bit difference hash of each scene's picture band,
// committed by publish.mjs), and EDGE_CUT, ink touching the frame's side on a clean field (a note: the frame guards' probe,
// below, measures every marked phone, car and card on every side; this one stays for a Film's own unmarked drawing).
// A near copy of an earlier film's picture is a problem in the cloud from STILL_STRICT_FROM on (before it a note to fix); the
// rest are notes. out/ci/stills-hash.json keeps this
// film's hashes for publish.
if (kitOn(spec.id)) {
  let led = {};
  try {
    led = readJson(path.join(specsDir, '.stills.json'));
  } catch {}
  const family = spec.id.replace(/-r\d+$/, '');
  const others = Object.fromEntries(Object.entries(led && typeof led === 'object' ? led : {}).filter(([k, v]) => k.replace(/-r\d+$/, '') !== family && Array.isArray(v)));
  // the polish guards (src/lib/guard.mjs POLISH_FROM): an almost empty still is EMPTY_FRAME (a problem from then on), a very
  // busy one a CLUTTER note
  const job = {tiles: tiles.filter((t) => !t.grid).map((t) => ({path: t.path, label: t.label, skip: t.type === 'EndCard'})), others, empty: EMPTY_SHARE, dim: {std: DIM_STD, share: DIM_SHARE}, polish: polishOn(spec.id.replace(/-r\d+$/, ''))};
  const r = spawnSync('python3', [path.join(root, 'tools/ci/stillreview.py')], {input: JSON.stringify(job), encoding: 'utf8'});
  if (r.status === 0) {
    const res = JSON.parse(r.stdout);
    for (const x of res.lines ?? []) console.log(`          ${x.line}`);
    // a near copy stops the cloud from STILL_STRICT_FROM on (src/lib/kit.mjs); the first kit films fix it as a note
    const strict = stillStrict(spec.id.replace(/-r\d+$/, ''));
    for (const x of res.lines ?? []) (CI && x.fatal && strict ? fatalLine : (l) => notes.push(l))(x.line);
    line('review', `${res.hashes.length} pictures hashed against ${Object.keys(others).length} earlier films${(res.lines ?? []).length ? `, ${(res.lines ?? []).length} line${res.lines.length === 1 ? '' : 's'} above` : ': no repeats, nothing cut by the edge on a clean field'}`);
    try {
      fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
      fs.writeFileSync(path.join(root, 'out/ci/stills-hash.json'), `${JSON.stringify({id: spec.id, hashes: res.hashes})}\n`);
    } catch {}
  } else notes.push(`the stills were not reviewed (${(r.stderr ?? '').trim().split('\n').pop()})`);
}

// ---- the frame guards (src/lib/guard.mjs; the owner 2026-10-19: subtitles always readable, phones, cars and cards whole, no
// still shot past 2.5 s) ------------------------------------------------------------------------------------------------------
// From POLISH_FROM (src/lib/guard.mjs, 2026-10-26) also META_COVER (a thing in the meta line's strip), SHARD (a sliver at the
// frame's top edge) and EMPTY_FRAME (an almost empty picture inside a shot), and EDGE_CUT holds for the figures too.
// tools/ci/guards.mjs sampled the whole film every 6 frames: EDGE_CUT (a whole thing at the frame's edge across 0.4 s or more),
// SUB_BAND (a person, a hand, the wheel or a thing in the subtitle band), STATIC_HOLD (a window of 2.6 s in one shot where
// nothing moves but the breath). EDGE_CUT and SUB_BAND stop the cloud's check from GUARD_STRICT_FROM on (before it, lines to
// fix); STATIC_HOLD is always a note (the breath already keeps the shot moving); notes on the Mac. The probe sees what the
// kit and the library scenes mark (OBJ / FIG); the stills' clean-field EDGE_CUT (stillreview.py) stays as the fallback for a
// Film's own unmarked card or drawing. The old test alone missed v110's car: it looked at one still a shot and only when the
// picture band's four corners were one flat colour (a sky over a ground never is).
if (guardOn(spec.id)) {
  if (guardRes) {
    for (const x of guardRes.lines) console.log(`          ${x.line}`);
    const strict = guardStrict(spec.id.replace(/-r\d+$/, ''));
    for (const x of guardRes.lines) (CI && strict && x.fatal ? fatalLine : (l) => notes.push(l))(x.line);
    line('guards', `${guardRes.samples} frames x 3 probes in ${(guardRes.ms / 1000).toFixed(0)} s${guardRes.lines.length ? `, ${guardRes.lines.length} line${guardRes.lines.length === 1 ? '' : 's'} above` : `: nothing cut by the frame, the subtitle band clear, no still shot${polishOn(spec.id.replace(/-r\d+$/, '')) ? ', the meta line clear, no shard, no empty frame' : ''}`}`);
  } else {
    const msg = `the frame guards did not run (${guardErr ?? 'no result'}): look at every phone, car and the subtitle band on the sheet yourself`;
    // a phase-2 film never ships unguarded in the cloud (the p2 prove run: the pixel guards had never looked at a real film)
    if (CI && p2On(spec.id.replace(/-r\d+$/, ''))) problems.push(`${msg}; a phase-2 film is not published without them: check again`);
    else notes.push(msg);
  }
}

// ---- 4. the contact sheet ------------------------------------------------------------------------------------
const sheet = path.join(root, `out/${id}.sheet.png`);
// an fx film's sheet opens with its first 1.5 s (a row of five), then a still of every shot
const sheetTiles = openTiles.length ? [...openTiles.filter((t) => t.sheet).map((t) => ({path: t.path, label: t.label})), ...tiles] : tiles;
const n = sheetTiles.length;
const cols = openTiles.length ? OPEN_SHEET.length : n <= 4 ? n : n <= 8 ? 4 : 5;
const tw = cols <= 4 ? 360 : 288;
const header = `${id}  ·  ${spec.theme ?? 'dark'}  ·  ${spec.voice ?? 'no voice'}  ·  film ${film.toFixed(1)} s${target ? ` / target ${target} s` : ''}  ·  dashes: Reels UI below`;
const postLine = post ? `${(post.tags ?? []).join(' ')}   ${post.description ?? ''}` : 'no post text';
const PIL = String.raw`
import json, sys
from PIL import Image, ImageDraw, ImageFont
a = json.load(sys.stdin)
tw, cols = a["tw"], a["cols"]
th = tw * 16 // 9
gap, lbl, pad, head = 12, 28, 16, 64
rows = (len(a["tiles"]) + cols - 1) // cols
W = pad * 2 + cols * tw + (cols - 1) * gap
H = head + rows * (lbl + th) + (rows - 1) * gap + pad
def font(p, size):
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()
mono, geo, small = font(a["mono"], 17), font(a["geo"], 17), font(a["mono"], 15)
img = Image.new("RGB", (W, H), (92, 92, 96))
d = ImageDraw.Draw(img)
d.text((pad, 10), a["header"], font=mono, fill=(250, 250, 250))
txt = a["post"]
while len(txt) > 8 and d.textlength(txt, font=geo) > W - 2 * pad:
    txt = txt[:-2]
if txt != a["post"]:
    txt = txt.rstrip() + "…"
d.text((pad, 34), txt, font=geo, fill=(225, 225, 230))
for k, t in enumerate(a["tiles"]):
    r, c = divmod(k, cols)
    x, y = pad + c * (tw + gap), head + r * (lbl + th + gap)
    d.text((x, y + 6), t["label"], font=small, fill=(250, 250, 250))
    tile = Image.open(t["path"]).convert("RGB").resize((tw, th), Image.LANCZOS)
    img.paste(tile, (x, y + lbl))
    d.rectangle([x - 1, y + lbl - 1, x + tw, y + lbl + th], outline=(30, 30, 32))
    # dashes: the cover's 3:4 profile-grid crop, or a scene's Reels safe bottom (the app's UI covers what is below)
    for fy in (240, 1680) if t.get("grid") else (1500,):
        yy = y + lbl + round(th * fy / 1920)
        for xx in range(x, x + tw, 12):
            d.line([(xx, yy), (min(xx + 6, x + tw - 1), yy)], fill=(128, 128, 128), width=1)
    # TikTok's action column (tokens.ts SAFE_TT, provisional): frame x 930 from y 880 down to the Reels column at 1110
    if not t.get("grid"):
        xx = x + round(tw * 930 / 1080)
        for yy in range(y + lbl + round(th * 880 / 1920), y + lbl + round(th * 1110 / 1920), 10):
            d.line([(xx, yy), (xx, min(yy + 5, y + lbl + th - 1))], fill=(128, 128, 128), width=1)
img.save(a["out"], optimize=True)
print("%dx%d" % (W, H))
`;
const job = {
  out: sheet,
  tw,
  cols,
  tiles: sheetTiles,
  header,
  post: postLine,
  mono: path.join(root, 'public/fonts/DejaVuSansMono.ttf'),
  geo: path.join(root, 'public/fonts/FiraGO-Regular.otf'),
};
const py = spawnSync('python3', ['-c', PIL], {input: JSON.stringify(job), encoding: 'utf8'});
const stills = tiles.filter((t) => !t.grid).length;
if (py.status === 0) line('sheet', `${rel(sheet)}  (${py.stdout.trim()}, ${stills} stills${stills < n ? ' + cover' : ''}; single stills in out/stills/${id}-*.png)`);
else {
  const why = /No module named ['"]?PIL/.test(py.stderr ?? '') ? 'Pillow is missing (python3 -m pip install pillow)' : (py.stderr ?? '').trim().split('\n').pop();
  line('sheet', `none: ${why}. Read the stills instead:`);
  tiles.forEach((t) => console.log(`          ${rel(t.path)}  ${t.label}`));
}

for (const x of notes) line('note', x);
if (softLines.length) {
  const codes = [...new Set(softLines.map((l) => (/^[A-Z][A-Z0-9_]*/.exec(l.trim()) ?? ['CHECK'])[0]))];
  line('soft', `${softLines.length} craft line${softLines.length === 1 ? '' : 's'} kept as warnings, not stops (STUDIO_GATE_MODE=soft): ${codes.join(', ')}; fix one only when a single Edit does it, never check again for a warning alone`);
  softLines.forEach((l) => console.log(`  WARN    ${l}`));
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(path.join(root, 'out/ci/soft.json'), `${JSON.stringify({id, codes, n: softLines.length})}\n`);
  } catch {}
}
if (problems.length) {
  problems.forEach((x) => console.log(`  PROBLEM ${x}`));
  fail(`${problems.length} problem${problems.length === 1 ? '' : 's'} above`);
}
writeStamp(root, id, {verdict: 'ready', inputs: stampInputs});
clearLoop(root, id);
console.log('\nready to render (the workflow, or ./make.sh on the Mac, renders the film)');
