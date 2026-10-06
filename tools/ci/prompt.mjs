// The studio workflow's brief for the cloud Claude (the "script" step), its ledger writer, and the topic gate
// (the pre-gate here, Claude's verdict through --reject).
//
//   node tools/ci/prompt.mjs > prompt.txt
//     Reads the request from env, checks it and prints ci/prompt.md filled in. Also writes the checked request
//     to out/ci/request.json, which tools/check.mjs (VS_CI=1) and --record read.
//     env STUDIO_REQ       required, the site's request id: r-<6..12 [0-9a-z]>-<4..8 [0-9a-z]>
//         STUDIO_TOPIC     optional, at most 2000 characters (the site's idea field: a detailed idea is the film's
//                          plan, ci/prompt.md step 1); empty = Claude picks the idea
//         STUDIO_CATEGORY  optional, an id from ci/categories.json. Empty with a topic: the topic's words pick
//                          it (or Claude does). Empty with no topic: the dice: a category with "diceEvery": n on
//                          every n-th roll (carinfo, every other), else the category with the fewest videos, ties to
//                          the one used longest ago (never one marked "dice": false; one that opened late at a release
//                          counts at least the least-used of the rest's videos, so it does not take every roll until
//                          it catches up). A category still locked by the App Store gate (below) or a retired one is
//                          refused (exit 2): the site refuses both first.
//         STUDIO_STORE_VERSION  optional: pretend this App Store version is live (rehearsals, the Mac, tests); any
//                          other word pretends the lookup failed. Unset: Apple's public lookup is asked.
//         STUDIO_LENGTH    15 | 20 | 30 | 45 (default 20)
//         STUDIO_VOICE     m | f (default m): m = gemini:Algieba, f = gemini:Achernar
//         STUDIO_MOOD      calm | normal | wild (default normal)
//         STUDIO_FEEDBACK  optional, at most 1000 characters: what to change in a redo (needs STUDIO_BASE)
//         STUDIO_BASE      optional, the request id of the video being redone (specs/.studio.json knows its spec)
//     Ideas that never repeat: the brief lists, for the request's category only, every earlier video's angle,
//     hook formula, opening line, cover title and closing quote (from the specs' "category" and the ledger), the
//     words the category's last 5 films leaned on (tools/ci/words.mjs), and asks for 8 fresh angles before one is
//     picked. A car-knowledge film ("carinfo", a category with a "bank") gets a few themes of the fact bank, not the
//     whole bank (tools/ci/carinfo.mjs offer()), the app features those facts link, and the real sounds it may use.
//     The ending (tools/ci/ending.mjs, ci/endings.json): every second film by its number (v63, v65, v67 ...) ends on
//     the follow reminder instead of a quote, a redo on its original's ending. The brief says which ("ending", flag
//     "follow") and offers the lines not used by the last few follow films; request.json carries "ending".
//     The music (tools/ci/music.mjs, ci/music.json): every third film by its number (v63, v66, v69 ...) gets a quiet
//     bed, which build-index adds at render; the brief's "- music:" line says so (or "none"), so the spec stays without.
//     The App Store gate (tools/ci/release.mjs, the owner 2026-10-06): a category with "release" (the navigator, the OBD
//     scanner) is locked until Apple's public lookup says that version is live, and its "after" facts apply from then.
//     This brief asks Apple itself (no deploy at the release): the dice, the topic's category and the general rotation
//     use only unlocked categories, the brief lists what is locked and its screens (and, after a release, the screens
//     it replaced: "oldScreens", 01-home and 10-features from 1.0.4), and out/ci/categories.now.json (the file the brief
//     sends Claude to, never ci/categories.json) holds only what is true today. request.json carries the version seen
//     ("store"), so --record judges the film by the same gate. Retired categories (ci/categories.json
//     "retired": price, customs, chart, honest) stay readable for old films and the ledger, never for a new film or a redo.
//     Reel-style tips (the owner, 2026-10-06): a car-knowledge dice offer is tips only when the last film used none
//     (tools/ci/carinfo.mjs "tipEvery"); a tip film opens on a question about the viewer's own driving.
//     Crazy car stories (the owner, 2026-10-06 evening: "stories that give drive, with a plot twist", the viral one): the
//     category "stories" has a bank of whole stories (ci/stories-sources.json, tools/ci/stories.mjs); the brief offers a
//     few (the ones his idea names, else the best-ranked ones no recent film told, one of each kind), each with its facts,
//     Georgian draft, twist, legend, respect note and its own licensed photos. The dice gives it every 4th roll (carinfo
//     keeps every other: two "diceEvery" categories interlock, dice() below). The buddy tone (HOOKS.md Buddy tone) is in
//     every brief: the moods, the hook rules, the closing line a punchline or callback, never an aphorism.
//
//   node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<the angle, one line>" [--idea "<the new visual, one line>"] [--features a,b,c] [--facts a,b] [--from-idea] ["<the idea picked>"]
//     The cloud Claude runs this after writing specs/<id>.json:
//     specs/.studio.json[req] = {id, topic, base, at, category, angle, hook[, features][, facts][, from], visual[, idea][, ending]} (visual:
//     the film's scene signature, tools/ci/visual.mjs; the brief lists the category's last ones, check refuses a repeat;
//     ending: "follow" on a film that ends on the follow reminder, tools/ci/ending.mjs).
//     --idea: the film's NEW visual (its Film scene, src/scenes/film/<Name>.tsx) in one English line; required when
//     the spec has its own Film scene (named after the id), refused like --angle when it carries markup or a command
//     or repeats an earlier film's idea; a redo that keeps its original's Film scene keeps its idea. The brief lists
//     the category's last 10 ideas so the next film does not re-invent them.
//     The topic is the co-founder's own words; for a redo, its original's; for an empty topic, the idea Claude
//     picked (then required). A redo may leave out --hook and --angle (its original's are kept). --features:
//     a "general" video's shown features (the next general video leads with the least shown ones).
//     --story <id>: a stories film's ONE story (tools/ci/stories.mjs), kept in the ledger's "facts": required there. It
//     refuses a story one of the category's last 30 films told, or whose subject a car-knowledge film among the last 12
//     used (his own words excepted: --from-idea; a redo keeps its original's), an app shown or named, no twist marked
//     (a Twist scene or "twist": true on its beat) or a twist that starts after 70 % of the spoken words, a photo that is
//     not the story's own, a licensed photo in a scene that shows no credit, and a small photo shown full bleed; and,
//     for a new film without --from-idea, an opening that shares two content words with one of the last 10 openings.
//     --facts: a car-knowledge ("carinfo") film's facts, the bank ids it used (1 to 6, tools/ci/carinfo.mjs): required
//     there, refused elsewhere (a fact whose story a stories film among the last 12 told counts as used). It refuses a fact one of the category's last 12 films used (his own words excepted:
//     --from-idea), an app shown when no fact links one or missing when one does, a sound fact with no real sound in
//     the first two beats, and a credit (CC BY) sound while ci/sounds.json "creditLines" is off. A redo keeps its
//     original's facts unless it names its own. The ledger line keeps "facts", and "from": "dice" on a dice film (the
//     dice gives a category with "diceEvery" every n-th roll).
//     --from-idea: the opening is the co-founder's own (his typed idea or note gave it), so a formula one of the
//     category's last two videos opened with is a note instead of a refusal; only when his idea (a redo's original)
//     and note hold OWN_OPENING (8) words or more: a bare theme, a chip or a dice film's idea gives no opening.
//     A new car-knowledge film (not a redo, not --from-idea): its opening may share at most one content word with each
//     of the category's last OPEN_FRESH (10) openings (a fresh hook every time), and a tip film (every fact it used is
//     "tip": true) opens on a question: beat 0's "say" asks the viewer something.
//     It refuses a spec without a valid "category" (or with another one than the request fixed), a formula
//     one of the last two videos of that category opened with, an opening line, cover title, closing quote
//     or angle another video already has (the follow reminder's lines excepted: they rotate), and a wrong ending
//     (tools/ci/ending.mjs endingProblems, as check does). A redo also takes its original's place in specs/.themes.json, so the
//     looks keep alternating in the order the videos are posted (tools/next-theme.mjs would append it at the end).
//
//   node tools/ci/prompt.mjs --reject off_topic [--field topic|feedback] "<why, one short Georgian sentence>"
//     The gate (ci/prompt.md §0), the cloud Claude's first move: the request is not a Vinari video (not about
//     cars or the app, or not fit to post). Writes out/ci/rejected.json {code, reason, by: "claude", field, req}
//     and tells Claude to stop. The workflow's "gate" step then fails the run before any voice is spent, and
//     "failure note" turns it into error.json {"code": "off_topic", reason, field}. --field names the typed text
//     that is unfit; the default is the topic, but in a redo with a feedback it is the feedback (the topic
//     already made the base film, so a bare --reject there, the gate step's included, means the note), and the
//     feedback whenever only that was typed. It never fails: a missing, non-Georgian or overlong reason becomes the default one, an unknown code
//     is recorded as off_topic, and an unknown field as the default.
//
//   The pre-gate (no model): before the brief is printed, a topic or feedback that is plainly spam (a link, a
//   letter, syllable, symbol or word said over and over, mostly letters that are neither Georgian nor Latin, or
//   not one letter or digit) writes the same out/ci/rejected.json (by "pre", with the field and the rule) and
//   exits 4 with no brief, so Claude is never started. Whether a topic is about cars is Claude's call, never
//   this one's.
//
// Exit 2: a bad request or record (the message names the field). Exit 3: the video to redo is not in the ledger.
// Exit 4: the pre-gate turned the request down (out/ci/rejected.json).
// Env STUDIO_LEDGER points the ledger at another file (as tools/ci/resolve.mjs reads it: a rehearsal).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {endingOfNumber, endingOfSpec, endingProblems, isFollowLine, loadEndings, offerFor, ruleText} from './ending.mjs';
import {loadMusic, musicFor, musicOf} from './music.mjs';
import {categoryFilms, filmName, filmScenes, signature, signatureTypes, sigLine} from './visual.mjs';
import {FACT_ID, filmRules, isTipFilm, linkedApps, loadBank, loadSounds, offer, RECENT_FILMS, soundOf, usedFacts} from './carinfo.mjs';
import {crossTold, loadStories, offerStories, RECENT_STORIES, recentlyTold, storyNotes, storyRules, tooSmall} from './stories.mjs';
import {applyRelease, atLeast, nowFile, storeVersion, VERSION} from './release.mjs';
import {contentWords, exemptFor, KEY_OVERLAP, recentKeys, RECENT_FILMS as RECENT_KEY_FILMS} from './words.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const specsDir = path.join(root, 'specs');
const studioFile = path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json');
const themesFile = path.join(specsDir, '.themes.json');
const requestFile = path.join(root, 'out/ci/request.json');
const rejectedFile = path.join(root, 'out/ci/rejected.json');
const categoriesFile = path.join(root, 'ci/categories.json');
// the categories as true today (the App Store gate applied): the file the brief sends Claude to
const nowRel = 'out/ci/categories.now.json';
const nowFilePath = path.join(root, nowRel);

const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
const ID = /^[a-z0-9-]+$/;
// What the co-founder may type (the page, web/api/studio.js line() and studio.yml's "check request" take the same):
// the idea is up to about a page, so he can describe the film he wants; a redo's note is shorter.
const TOPIC_MAX = 2000;
const FEEDBACK_MAX = 1000;
const PICKED_MAX = 300; // the idea Claude picked for an empty topic (--record's last words): a few Georgian words
const OWN_OPENING = 8; // --from-idea: the fewest words of his own (idea and note) that can give the film its opening
const ANGLE = [12, 160]; // the angle: one line of idea, in characters
const IDEAS_MAX = 10; // the category's earlier new visuals (--idea) the brief lists
const OPEN_FRESH = 10; // a car-knowledge opening shares at most one content word with each of the last 10 openings
// what an angle or an idea may never carry: it is read into every later brief of the category
const UNSAFE_LINE = /[<>`§{}]|OFF_TOPIC|VOICE_QUOTA|--reject|--record|--idea|anthropic/iu;
const SEEN_MAX = 30; // lines of earlier videos in the brief
const VOICES = {m: 'gemini:Algieba', f: 'gemini:Achernar'};
const LETTERS = {15: 150, 20: 210, 30: 310, 45: 465};
const MOODS = {
  calm: 'A clear, warm hook said like a friend: a plain question or an everyday moment (H03, H10, H11), no joke.',
  normal: 'The house default: the best-scoring hook, from any formula, in the buddy tone (HOOKS.md Buddy tone).',
  wild: 'Cheeky, even silly, but true (HOOKS.md H14, H16, H17): a funny moment, the car talking or a buddy question, proved by the next beat with a real screen or a fact. No "!", no slang spelling, never laughing at a person.',
};

const die = (code, msg) => {
  process.stderr.write(`prompt: ${msg}\n`);
  process.exit(code);
};
const readJson = (f, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeAtomic = (f, body) => {
  fs.mkdirSync(path.dirname(f), {recursive: true});
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, f);
};
// What the co-founder typed, made into one plain line of data. NFKC first (a fullwidth ＞ or a styled letter
// becomes the plain one), then every invisible character goes: format characters (zero-width, joiners, bidi
// marks and isolates, the soft hyphen, the Unicode tag block that can spell hidden ASCII), variation
// selectors, private use, unassigned code points and the blank Hangul fillers. Controls and line breaks become
// a space, and a run of two or more angle brackets or guillemets (the look of the brief's DATA markers) goes.
// What is left is exactly what the page showed and what Claude reads. web/api/studio.js line() strips the same.
const INVISIBLE = /[\p{Cf}\p{Co}\p{Cn}\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
const clean = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/[<>\u2039\u203A\u00AB\u00BB\u226A\u226B\u3008-\u300B]{2,}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const text = (name, value, max) => {
  const v = clean(value);
  if ([...v].length > max) die(2, `${name} is ${[...v].length} characters; ${max} at most`);
  return v;
};
const choice = (name, value, allowed, fallback) => {
  const v = String(value ?? '').trim() || fallback;
  if (!allowed.includes(v)) die(2, `${name} is "${String(value).slice(0, 40)}"; one of ${allowed.join(', ')}`);
  return v;
};
const vNumber = (id) => Number(/^v(\d+)-/.exec(id)?.[1] ?? 0);
const redoNumber = (id) => Number(/-r(\d+)$/.exec(id)?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, ''); // v13-x, v13-x-r1, v13-x-r2: one video
const flat = (s) => clean(String(s ?? '').replace(/\|/g, ' '));
// the same words, whatever the punctuation, case or "|" breaks: how repeats are found
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const cut = (s, n) => ([...s].length > n ? `${[...s].slice(0, n - 1).join('')}…` : s);

// ---- the gate: a request that is not a Vinari video never gets one ---------------------------------------------
// out/ci/rejected.json stops the run (studio.yml's "brief" and "gate" steps) and becomes error.json "off_topic";
// the reason is shown to the co-founder on vinari.ge/studio (as text only).
const GEORGIAN = /\p{Script=Georgian}/u;
const LATIN = /\p{Script=Latin}/u;
const REJECT_CODES = ['off_topic'];
const REASON_MAX = 160;
const DEFAULT_REASON = 'თემა მანქანას ან Vinari-ს არ ეხება.';
const DEFAULT_FEEDBACK_REASON = 'შენიშვნა ვიდეოს არ ეხება.';
const reject = (fields) => writeAtomic(rejectedFile, `${JSON.stringify({code: 'off_topic', ...fields})}\n`);

// --reject <code> [--field topic|feedback] "<why>": Claude's verdict. It must always land (it is the only way to
// stop the run cleanly), so nothing here can fail it: a reason typed without the code, in English or too long is
// mended, not refused, and so is a field that is not one of the two.
// "field" (error.json, the site) says which typed text was turned down: the one named, but never one left empty
// when the other was typed (a redo with only a feedback is refused for its feedback). Unnamed, a redo with a
// feedback is refused for its feedback: its topic already made the base film, and the site must not block it.
const REJECT_FIELDS = ['topic', 'feedback'];
if (process.argv[2] === '--reject') {
  const args = process.argv.slice(3);
  let asked = null;
  for (let i = args.findIndex((a) => /^--field(=|$)/.test(a)); i >= 0; i = args.findIndex((a) => /^--field(=|$)/.test(a))) {
    const inline = /^--field=([\s\S]*)$/.exec(args[i]);
    asked = String(inline ? inline[1] : args[i + 1] ?? '').trim().toLowerCase();
    args.splice(i, inline ? 1 : 2);
  }
  const code = REJECT_CODES.includes(args[0]) ? args.shift() : 'off_topic';
  const request = readJson(requestFile, null);
  const req = request?.req;
  const redo = Boolean(request?.base && request?.feedback);
  let field = REJECT_FIELDS.includes(asked) ? asked : redo ? 'feedback' : 'topic';
  if (asked && field !== asked) process.stderr.write(`prompt: --field "${cut(asked, 20)}" is not ${REJECT_FIELDS.join(' or ')}; ${field} it is\n`);
  const other = REJECT_FIELDS.find((f) => f !== field);
  if (request && !request[field] && request[other]) field = other;
  let reason = clean(args.join(' ')).replace(/\s*[—–]\s*/g, ', ');
  if (!GEORGIAN.test(reason)) reason = field === 'feedback' ? DEFAULT_FEEDBACK_REASON : DEFAULT_REASON;
  reason = cut(reason, REASON_MAX);
  reject({code, reason, by: 'claude', field, ...(REQ.test(String(req ?? '')) ? {req} : {})});
  process.stdout.write(`rejected${REQ.test(String(req ?? '')) ? ` ${req}` : ''}: ${code}, the ${field} (${reason})\nStop now: no spec, no other command. Your last line: OFF_TOPIC\n`);
  process.exit(0);
}

// The pre-gate: plain spam, the kind that needs no judgement, never reaches Claude. Everything else (a topic that
// is not about cars, or not fit to post) is Claude's call in ci/prompt.md §0. Returns the rule it broke, or null.
const spamOf = (s) => {
  if (!s) return null;
  // a link: any scheme://, www., a domain with a path (bit.ly/x, t.me/x), an e-mail address or an @handle
  if (/[a-z][a-z0-9+.-]*:\/\/|(?:^|[^\p{L}\p{N}])www\.|[\p{L}\p{N}-]+\.[a-z]{2,}\/|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+\.[a-z]{2,}|(?:^|\s)@[\p{L}\p{N}_]{3,}/iu.test(s)) return 'link';
  // over and over: 5 of the same letter, 8 of the same digit or symbol, a 2..4 letter syllable 4 times in a row
  // ("hahahaha", "asdasdasdasd"), or the same word 4 times in a row
  if (/(\p{L})\1{4,}|(\p{N})\2{7,}|([^\p{L}\p{N}\s])\3{7,}|(\p{L}{2,4})\4{3,}/iu.test(s)) return 'repeat';
  if (/(?:^|\s)(\S+)(?:\s+\1){3,}(?=\s|$)/iu.test(s)) return 'repeat';
  // the alphabet: more than half of the letters neither Georgian nor Latin; no letter and no digit at all
  const letters = s.match(/\p{L}/gu) ?? [];
  if (!letters.length) return /\p{N}/u.test(s) ? null : 'letters';
  const other = letters.filter((c) => !GEORGIAN.test(c) && !LATIN.test(c)).length;
  return other * 2 > letters.length ? 'script' : null;
};
const SPAM_FIELDS = {
  topic: {name: 'თემა', in: 'თემაში', what: 'რაზე იყოს ვიდეო'},
  feedback: {name: 'შენიშვნა', in: 'შენიშვნაში', what: 'რა შეიცვალოს'},
};
const SPAM_REASONS = {
  link: (f) => `${f.in} ბმულია. დაწერე სიტყვებით, ${f.what}.`,
  repeat: (f) => `${f.in} ერთი და იგივე ასო ან სიტყვა ბევრჯერ მეორდება.`,
  script: (f) => `${f.name} ქართულად დაწერე.`,
  letters: (f) => `${f.in} სიტყვა არ არის. დაწერე, ${f.what}.`,
};

// ---- the categories (ci/categories.json), with the App Store gate applied (tools/ci/release.mjs) -----------------
// The live App Store version: the brief asks Apple (no deploy at a release); --record re-applies the version the brief
// saw (out/ci/request.json "store"), so the film is judged by the same gate it was briefed under.
const RAW_CATS = readJson(categoriesFile, null);
const STORE = process.argv[2] === '--record'
  ? (VERSION.test(String(readJson(requestFile, null)?.store ?? '')) ? String(readJson(requestFile, null).store) : null)
  : await storeVersion(root);
const APPLIED = applyRelease(RAW_CATS, STORE);
if (!APPLIED.cats.length) die(1, `${path.relative(root, categoriesFile)} is missing or lists no categories`);
const CATS = APPLIED.active; // what a film may be made in today
const LOCKED = new Map(APPLIED.locked.map((c) => [c.id, c])); // waiting for the App Store release
const RETIRED = new Map(Object.entries(APPLIED.retired)); // taken out of the studio: old films keep the id
const KNOWN = new Set([...APPLIED.cats.map((c) => c.id), ...RETIRED.keys()]);
const CAT = new Map(CATS.map((c) => [c.id, c]));
const CAT_IDS = CATS.map((c) => c.id);
const FEATURES = CATS.filter((c) => c.feature !== false).map((c) => c.id); // what a general video can show
const validCat = (c) => (typeof c === 'string' && CAT.has(c) ? c : null); // a film may be made in it now
const knownCat = (c) => (typeof c === 'string' && KNOWN.has(c) ? c : null); // an old film's, read as history
const lockedWhy = (id) => {
  const c = LOCKED.get(id);
  return c ? `"${id}" (${c.label}) waits for the App Store release: the store has ${STORE ?? 'no answer (the lookup failed)'}, ${c.release} is needed` : '';
};
const retiredWhy = (id) => (RETIRED.has(id) ? `"${id}" (${RETIRED.get(id)}) was taken out of the studio` : '');
// The screens no film may show today, none of them listed by a category today: LOCKED_SCREENS wait for their release (a
// locked category's, or an "after" block's not live yet: the 1.0.4 screens before 1.0.4); OLD_SCREENS are the ones a
// live "after" block replaced (from 1.0.4: 01-home, the 1.0.3 home with the old bottom bar, and 10-features, the old
// menu), the app as it looked before. Both are refused by check.mjs (VS_CI=1), each with its own reason.
const [LOCKED_SCREENS, OLD_SCREENS] = (() => {
  const ok = new Set(CATS.flatMap((c) => c.screens ?? []));
  const waiting = new Set();
  const replaced = new Set();
  for (const c of RAW_CATS?.categories ?? []) {
    const locked = LOCKED.has(c?.id);
    const blocks = Object.entries(c?.after ?? {});
    for (const s of c?.screens ?? []) (locked ? waiting : replaced).add(s);
    for (const [v, b] of blocks) for (const s of b?.screens ?? []) if (locked || !atLeast(STORE, v)) waiting.add(s);
  }
  const old = [...replaced].filter((s) => !ok.has(s) && !waiting.has(s));
  return [[...waiting].filter((s) => !ok.has(s)), old];
})();
// how films end: a quote, or on every second film the follow reminder (ci/endings.json)
const ENDINGS = loadEndings(root);
// car knowledge (tools/ci/carinfo.mjs): the category with a fact bank, and the real sounds a film may use today
const BANK = loadBank(root, CATS);
const SOUNDS = loadSounds(root);
const hasBank = (c) => Boolean(BANK && c === BANK.cat.id);
// crazy car stories (tools/ci/stories.mjs): a bank of whole stories, one a film
const STORIES = loadStories(root, CATS);
const hasStories = (c) => Boolean(STORIES && c === STORIES.cat.id);

// ---- HOOKS.md: the formulas, and the line ranges to read so nobody reads the whole file ---------------------------
const hooks = fs.readFileSync(path.join(root, 'HOOKS.md'), 'utf8').split('\n');
const heads = hooks.map((l, i) => [i + 1, /^(#{2,3}) /.exec(l)?.[1].length, l]).filter((h) => h[1]);
const range = (re) => {
  const k = heads.findIndex((h) => re.test(h[2]));
  if (k < 0) return 'its section (grep -n "^##" HOOKS.md)';
  const end = heads.slice(k + 1).find((h) => h[1] <= heads[k][1])?.[0] ?? hooks.length + 1;
  return `lines ${heads[k][0]}-${end - 1}`;
};
const FORMULAS = heads.map((h) => /^### (H\d\d) /.exec(h[2])?.[1]).filter(Boolean);

// ---- every video made so far: the specs (with their "category") and the ledger (angle, formula) -----------------
const coverOf = (s) => (s.cover && typeof s.cover === 'object' ? s.cover : {});
const openOf = (s) => flat(s.beats?.[0]?.show ?? s.beats?.[0]?.say ?? '');
const coverTitleOf = (s) => flat(coverOf(s).title ?? '');
const quoteOf = (s) => {
  const end = [...(Array.isArray(s.beats) ? s.beats : [])].reverse().find((b) => b?.scene)?.scene;
  return end?.type === 'EndCard' ? flat(end.tagline ?? '') : '';
};
const specFiles = () => fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
// One entry per main video (not the demos or translations; a hook variant adds its opening to its original's),
// oldest first: {id, category, title, topic, angle, hook, features, open, alsoOpen, cover, quote}
const library = (studio) => {
  const byId = new Map();
  const variants = [];
  for (const f of specFiles()) {
    if (f.startsWith('demo-') || !/^[^.]+\.json$/.test(f)) continue;
    const spec = readJson(path.join(specsDir, f), null);
    if (!spec || typeof spec.id !== 'string' || !Array.isArray(spec.beats)) continue;
    const variant = /^(.+)--h\d+\.json$/.exec(f);
    if (variant) variants.push([variant[1], openOf(spec)]);
    else byId.set(spec.id, {id: spec.id, category: knownCat(spec.category), title: flat(spec.title), open: openOf(spec), alsoOpen: [], cover: coverTitleOf(spec), quote: quoteOf(spec)});
  }
  for (const [parent, open] of variants) {
    const v = byId.get(parent);
    if (v && norm(open) && ![v.open, ...v.alsoOpen].some((o) => norm(o) === norm(open))) v.alsoOpen.push(open);
  }
  for (const e of Object.values(studio)) {
    if (!e || typeof e.id !== 'string' || !ID.test(e.id)) continue;
    const v = byId.get(e.id) ?? {id: e.id, category: null, title: '', open: '', alsoOpen: [], cover: '', quote: ''};
    v.category ??= knownCat(e.category);
    v.topic = flat(e.topic);
    v.angle = flat(e.angle);
    v.hook = FORMULAS.includes(e.hook) ? e.hook : null;
    v.features = Array.isArray(e.features) ? e.features.filter((x) => FEATURES.includes(x)) : [];
    v.facts = Array.isArray(e.facts) ? e.facts.filter((x) => FACT_ID.test(String(x))) : [];
    byId.set(e.id, v);
  }
  return [...byId.values()].sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id) || a.id.localeCompare(b.id));
};
// the videos, each with its redos, oldest first
const families = (lib) => {
  const m = new Map();
  for (const v of lib) m.set(familyOf(v.id), [...(m.get(familyOf(v.id)) ?? []), v]);
  return [...m.values()];
};
const inCategory = (lib, cat, except) => lib.filter((v) => v.category === cat && familyOf(v.id) !== except);
// the formulas the last two videos of a category opened with; a video from before the ledger has none recorded
const lastTwo = (lib, cat, except) => {
  const two = families(inCategory(lib, cat, except)).slice(-2);
  return {
    formulas: [...new Set(two.flatMap((f) => f.map((v) => v.hook).filter(Boolean)))],
    unknown: two.filter((f) => !f.some((v) => v.hook)).map((f) => f.at(-1).id),
  };
};

// ---- --record ------------------------------------------------------------------------------------------------
if (process.argv[2] === '--record') {
  const USAGE = 'usage: node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<the angle, one line>" [--idea "<the new visual, one line>"] [--features a,b,c] [--facts a,b] [--story <id>] [--from-idea] ["<the idea picked>"]';
  const opts = {};
  const rest = [];
  const args = process.argv.slice(3);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from-idea') {
      opts.fromIdea = true;
      continue;
    }
    const m = /^--(hook|angle|features|idea|facts|story)(?:=([\s\S]*))?$/.exec(args[i]);
    if (m) opts[m[1]] = m[2] ?? args[++i] ?? '';
    else if (args[i].startsWith('--')) die(2, `unknown option ${args[i].slice(0, 40)}; ${USAGE}`);
    else rest.push(args[i]);
  }
  const [id, ...ideaWords] = rest;
  // a stories film names its one story with --story; it lands in the ledger's "facts" (one id), as a car-knowledge
  // film's facts do
  if (opts.story !== undefined && opts.facts !== undefined) die(2, '--story and --facts: a stories film takes --story only');
  if (opts.story !== undefined) opts.facts = opts.story;
  const request = readJson(requestFile, null);
  if (!request?.req) die(2, `no request in ${path.relative(root, requestFile)}: the workflow runs "node tools/ci/prompt.mjs" first`);
  if (!id || !ID.test(id)) die(2, USAGE);
  const spec = readJson(path.join(specsDir, `${id}.json`), null);
  if (!spec) die(2, `specs/${id}.json is missing or not valid JSON; write the spec first`);
  if (spec.id !== id) die(2, `specs/${id}.json says "id": "${spec.id}"; it must be "${id}"`);
  if (request.id && id !== request.id) die(2, `this redo's id is "${request.id}", not "${id}"`);
  if (!request.id && request.next && !id.startsWith(request.next)) die(2, `a new video's id starts with "${request.next}" (the next free number), not "${id}"`);
  const idea = text('the idea', ideaWords.join(' '), PICKED_MAX);
  // his own opening: only words he typed can give one, and only enough of them. A bare theme ("განბაჟება"), a redo's
  // chips ("უფრო მოკლე") or a dice film's picked idea is a few words and gives no opening, so the "not the last two
  // formulas" rule stays: --from-idea needs OWN_OPENING words or more in his idea (a redo's original) and note together
  const wordsOf = (s) => String(s ?? '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const ownWords = wordsOf(request.topic || request.baseTopic) + wordsOf(request.feedback);
  const ownOpening = ownWords >= OWN_OPENING;
  if (opts.fromIdea && !ownOpening) die(2, `--from-idea: only when the co-founder's own words give the opening (his idea and note, ${OWN_OPENING} words or more; this request has ${ownWords}): open with another formula instead`);
  const topic = request.topic || request.baseTopic || idea;
  if (!topic) die(2, `the topic was empty: say which idea you picked: node tools/ci/prompt.mjs --record ${id} ... "<the idea in a few Georgian words>"`);

  const studio = readJson(studioFile, {});
  const owner = Object.entries(studio).find(([k, v]) => v?.id === id && k !== request.req);
  if (owner) die(2, `${id} already belongs to the request ${owner[0]}; pick another slug`);
  const lib = library(studio);
  const own = familyOf(id); // a redo shares its original's words: only the other videos count

  // the category: the spec says it; a category the request fixed (asked, the dice, a redo's original) must match
  const cat = validCat(spec.category);
  const fixed = request.category && request.categoryFrom !== 'topic' ? request.category : null;
  const why = lockedWhy(spec.category) || retiredWhy(spec.category);
  if (!cat) die(2, `specs/${id}.json needs a top-level "category"${fixed ? `: "${fixed}"` : `, one of ${CAT_IDS.join(', ')} (${nowRel})`}${why ? `; ${why}` : spec.category ? `; "${String(spec.category).slice(0, 40)}" is not one` : ''}`);
  if (fixed && cat !== fixed) die(2, `this request is a "${fixed}" video, but specs/${id}.json says "category": "${cat}"`);

  // the formula of the opening: never one the last two videos of the category opened with
  const hook = String(opts.hook ?? '').trim().toUpperCase() || (request.base ? request.baseHook ?? '' : '');
  if (!FORMULAS.includes(hook)) die(2, `--hook: the formula the opening uses, one of ${FORMULAS.join(', ')} (HOOKS.md §1)${request.base && !request.baseHook ? '; the original recorded none' : ''}`);
  // (his idea wins: an opening the co-founder gave, --from-idea, is kept and only noted)
  const recent = lastTwo(lib, cat, own);
  let hookNote = '';
  if (recent.formulas.includes(hook) && !(request.base && hook === request.baseHook)) {
    const who = families(inCategory(lib, cat, own)).slice(-2).flat().filter((v) => v.hook === hook).map((v) => v.id);
    if (opts.fromIdea) hookNote = `\n  note: ${hook} also opened ${who.join(' and ')}; kept, because the co-founder's own words give this opening`;
    else die(2, `${hook} opened ${who.join(' and ')}, one of the last two "${cat}" videos: open with another formula (${FORMULAS.filter((h) => !recent.formulas.includes(h)).join(', ')}), then record again${ownOpening ? `; or, when the co-founder's ${request.feedback && !request.topic ? 'note' : 'idea'} itself gives this opening, keep it and add --from-idea` : ''}`);
  }

  // the angle: one line; a redo keeps its original's unless the feedback changed the idea
  const angle = clean(opts.angle ?? '') || (request.base ? flat(request.baseAngle) : '');
  const n = [...angle].length;
  if (n < ANGLE[0] || n > ANGLE[1]) die(2, `--angle: the idea in one English line, ${ANGLE[0]} to ${ANGLE[1]} characters (e.g. "a taxi driver blocked in at night: the card reaches the owner, no number on the glass")${n ? `; it is ${n}` : ''}`);
  // the angle goes into every later brief of the category ("Made before"): plain words only, never markup,
  // a marker or anything that talks to the next Claude
  if (UNSAFE_LINE.test(angle)) die(2, '--angle: plain words about the film only (no <, >, `, §, braces or commands)');

  // the film's new visual (its own Film scene): one line, required when the spec has one; a redo that keeps its
  // original's Film scene keeps the original's idea
  const ownFilm = filmScenes(spec).some((f) => f.name === filmName(id));
  const visualIdea = clean(opts.idea ?? '') || (!ownFilm && request.base ? flat(request.baseIdea) : '');
  const ni = [...visualIdea].length;
  if (ownFilm && (ni < ANGLE[0] || ni > ANGLE[1]))
    die(2, `--idea: the film's new visual (its Film scene ${filmName(id)}) in one English line, ${ANGLE[0]} to ${ANGLE[1]} characters (e.g. "the QR modules peel off the card and fly as a flock into the owner's pocket")${ni ? `; it is ${ni}` : ''}`);
  if (visualIdea && (ni < ANGLE[0] || ni > ANGLE[1])) die(2, `--idea: one line of ${ANGLE[0]} to ${ANGLE[1]} characters`);
  if (UNSAFE_LINE.test(visualIdea)) die(2, '--idea: plain words about the picture only (no <, >, `, §, braces or commands)');
  if (visualIdea) {
    const same = Object.values(studio).find((v) => v?.idea && v.id && familyOf(v.id) !== familyOf(id) && norm(v.idea) === norm(visualIdea));
    if (same) die(2, `--idea: "${cut(visualIdea, 80)}" is ${same.id}'s new visual: design another one`);
  }

  // what a general video shows, so the next one leads with other features
  let features = [];
  if (cat === 'general') {
    features = opts.features !== undefined ? String(opts.features).split(/[\s,]+/).filter(Boolean) : request.base ? request.baseFeatures ?? [] : [];
    const bad = features.filter((f) => !FEATURES.includes(f));
    if (features.length < 2 || features.length > 6 || bad.length || new Set(features).size !== features.length)
      die(2, `--features: the 2 to 6 features this general video shows, comma-separated, from ${FEATURES.join(', ')}${bad.length ? ` ("${bad.join('", "').slice(0, 80)}" is not one)` : ''}`);
  } else if (opts.features !== undefined) die(2, '--features is only for a "general" video');

  // a fresh hook every time (the owner, 2026-10-06, reel-style films; the stories too): a new film's opening shares at
  // most one content word with each of the category's last OPEN_FRESH openings. His own opening (--from-idea) is kept.
  const freshOpening = () => {
    const opening = openOf(spec);
    const ex = exemptFor(CAT.get(cat));
    const stems = (t) => new Set(contentWords(t).filter((w) => !ex(w.word, w.stem)).map((w) => w.stem));
    const mineOpen = stems(opening);
    const lastOpen = families(inCategory(lib, cat, own)).slice(-OPEN_FRESH).map((f) => f.at(-1)).filter((v) => v.open);
    const near = lastOpen.map((v) => [v, [...stems(v.open)].filter((st) => mineOpen.has(st))]).filter(([, shared]) => shared.length >= 2);
    if (near.length)
      die(2, `the opening "${cut(opening, 60)}" shares ${near.map(([v, shared]) => `${shared.length} words (${contentWords(opening).filter((w) => shared.includes(w.stem)).map((w) => w.word).filter((w, i, a) => a.indexOf(w) === i).join(', ')}) with ${v.id}'s "${cut(v.open, 50)}"`).join('; ')}: the last ${OPEN_FRESH} "${cat}" openings are taken, write a new question or hook in other words, then record again`);
  };
  // the subjects the two banks share (a story and the car-knowledge facts about it): a film of either keeps the other out
  const cross = crossTold(STORIES, studio, BANK?.cat.id ?? 'carinfo', own);

  // a car-knowledge film: the bank facts it used (tools/ci/carinfo.mjs), and the rules that follow from them
  let factIds = [];
  if (hasBank(cat)) {
    factIds = opts.facts !== undefined ? String(opts.facts).split(/[\s,]+/).filter(Boolean) : request.base ? request.baseFacts ?? [] : [];
    const unknown = factIds.filter((f) => !FACT_ID.test(f) || !BANK.byId.has(f));
    if (!factIds.length || factIds.length > 6 || unknown.length || new Set(factIds).size !== factIds.length)
      die(2, `--facts: the 1 to 6 bank facts this film uses, comma-separated ids from the brief (the "[id]" before each fact)${unknown.length ? `; "${unknown.join('", "').slice(0, 120)}" is not in the bank` : ''}`);
    // a fact one of the category's last films used: another one (his own words may ask for it: --from-idea)
    const used = usedFacts(studio, cat, own);
    const recentFams = [...new Set(Object.values(studio).filter((e) => e?.category === cat && typeof e.id === 'string' && familyOf(e.id) !== own).sort((a, b) => vNumber(a.id) - vNumber(b.id)).map((e) => familyOf(e.id)))].slice(-RECENT_FILMS);
    const again = factIds.filter((f) => (used.get(f) ?? []).some((id) => recentFams.includes(familyOf(id))) && !(request.base && (request.baseFacts ?? []).includes(f)));
    if (again.length && !opts.fromIdea) die(2, `--facts: ${again.map((f) => `${f} (${used.get(f).at(-1)})`).join(', ')} ${again.length > 1 ? 'were' : 'was'} used by one of the last ${RECENT_FILMS} "${cat}" films: build the film on other facts${ownOpening ? ' (or, when the co-founder\'s own words ask for it, add --from-idea)' : ''}`);
    const told = factIds.filter((f) => cross.storyByFact.has(f) && !(request.base && (request.baseFacts ?? []).includes(f)));
    if (told.length && !opts.fromIdea) die(2, `--facts: ${told.map((f) => `${f} (its story: ${cross.storyByFact.get(f)})`).join(', ')}: a recent stories film told the same subject; build the film on other facts${ownOpening ? ' (or, when the co-founder\'s own words ask for it, add --from-idea)' : ''}`);
    const rules = filmRules(spec, factIds.map((f) => BANK.byId.get(f)), {cats: CATS, sounds: SOUNDS, isFollow: (t) => isFollowLine(t, ENDINGS)});
    if (rules.length) die(2, `${rules.join('\n')}\nFix specs/${id}.json, then record again`);
    // reel-style (the owner, 2026-10-06): a fresh hook every time, and a tip film opens on a question. A new film only;
    // his own opening (--from-idea) is kept as he gave it
    if (!request.base && !opts.fromIdea) {
      if (isTipFilm(factIds.map((f) => BANK.byId.get(f))) && !/[?？]/u.test(String(spec.beats?.[0]?.say ?? '')))
        die(2, `a tip film (every fact you used is a practical tip) opens on a question about the viewer's own driving (HOOKS.md H15): beats[0] "say" asks it ("${cut(flat(spec.beats?.[0]?.say ?? ''), 60)}" does not), the next beats answer it. Fix specs/${id}.json, then record again`);
      freshOpening();
    }
  } else if (hasStories(cat)) {
    // a crazy story film (tools/ci/stories.mjs): its one story, told by no recent film, and the rules that follow from it
    const sid = String(opts.facts ?? '').trim() || (request.base ? String((request.baseFacts ?? [])[0] ?? '') : '');
    if (!sid || /[\s,]/.test(sid) || !STORIES.byId.has(sid))
      die(2, `--story: the one story this film tells, its id from the brief (the "[id]" before each story)${/[\s,]/.test(sid) ? '; one story a film' : sid ? `; "${cut(sid, 60)}" is not in the bank` : ''}`);
    factIds = [sid];
    const sameAsBase = Boolean(request.base && (request.baseFacts ?? []).includes(sid));
    const told = recentlyTold(STORIES, studio, own);
    if (told.has(sid) && !sameAsBase && !opts.fromIdea)
      die(2, `--story: ${sid} was told by ${told.get(sid)}, one of the last ${RECENT_STORIES} "${cat}" films: tell another story of the offer${ownOpening ? ' (or, when the co-founder\'s own words ask for this one, add --from-idea)' : ''}`);
    if (cross.factByStory.has(sid) && !sameAsBase && !opts.fromIdea)
      die(2, `--story: ${cross.factByStory.get(sid)}, a recent car-knowledge film, told the same subject (${(STORIES.byId.get(sid).carinfo ?? []).join(', ')}): tell another story of the offer${ownOpening ? ' (or, when the co-founder\'s own words ask for this one, add --from-idea)' : ''}`);
    const rules = storyRules(spec, STORIES.byId.get(sid), {bank: STORIES, isFollow: (t) => isFollowLine(t, ENDINGS)});
    if (rules.length) die(2, `${rules.join('\n')}\nFix specs/${id}.json, then record again`);
    for (const n of storyNotes(spec)) hookNote += `\n  note: ${n}`;
    if (!request.base && !opts.fromIdea) freshOpening();
  } else if (opts.facts !== undefined) die(2, `--facts is only for a "${BANK?.cat.id ?? 'carinfo'}" film, --story only for a "${STORIES?.cat.id ?? 'stories'}" film`);

  // never the words of another video: its opening line, cover title, closing quote or angle
  const used = new Map();
  const note = (s, what) => {
    const k = norm(s);
    if (k && !used.has(k)) used.set(k, what);
  };
  for (const v of lib) {
    if (familyOf(v.id) === own) continue;
    note(v.open, `${v.id}'s opening line`);
    v.alsoOpen.forEach((o) => note(o, `an opening line of ${v.id}`));
    note(v.cover, `${v.id}'s cover title`);
    if (!isFollowLine(v.quote, ENDINGS)) note(v.quote, `${v.id}'s closing quote`); // the follow reminder's lines rotate
    note(v.angle, `${v.id}'s angle`);
  }
  const mine = [['opening line', openOf(spec)], ['cover title', coverTitleOf(spec)], ...(isFollowLine(quoteOf(spec), ENDINGS) ? [] : [['closing quote', quoteOf(spec)]]), ['angle', angle]];
  const clash = mine.filter(([, s]) => used.has(norm(s))).map(([what, s]) => `the ${what} "${s}" is ${used.get(norm(s))}`);
  if (clash.length) die(2, `${clash.join('; ')}. Every video gets its own: change it in specs/${id}.json (or --angle), then record again`);

  // the ending (tools/ci/ending.mjs): the one the brief asked for (the follow reminder on every second film), as check
  // refuses it before the voice
  let endingBase = null;
  if (request.baseId) endingBase = readJson(path.join(specsDir, `${request.baseId}.json`), null);
  const wantEnding = ['follow', 'quote'].includes(request.ending) ? request.ending : endingBase ? endingOfSpec(endingBase, ENDINGS) : endingOfNumber(vNumber(id), ENDINGS);
  const endingBad = endingProblems(spec, {want: wantEnding, cfg: ENDINGS, specsDir, baseSpec: endingBase});
  if (endingBad.length) die(2, `${endingBad.join('\n')}\nFix specs/${id}.json, then record again`);
  const ending = endingOfSpec(spec, ENDINGS);

  const at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  // the film's visual signature (tools/ci/visual.mjs): the next brief of the category lists it, check refuses a repeat
  studio[request.req] = {id, topic, base: request.base || null, at, category: cat, angle, hook, ...(features.length ? {features} : {}), ...(factIds.length ? {facts: factIds} : {}), ...(request.categoryFrom === 'dice' ? {from: 'dice'} : {}), visual: signature(spec), ...(visualIdea ? {idea: visualIdea} : {}), ...(ending === 'follow' ? {ending} : {})};
  const rows = Object.entries(studio).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  writeAtomic(studioFile, rows.length ? `{\n${rows.join(',\n')}\n}\n` : '{}\n');
  let where = '';
  if (request.base) where = placeRedo(id, spec.theme, request.baseId);
  process.stdout.write(`recorded ${request.req}: ${id} (${cat} · ${hook} · ${angle})${where}\n  looks: ${sigLine(signature(spec)) || '(no scenes)'}${visualIdea ? `\n  new visual: ${visualIdea}` : ''}${factIds.length ? `\n  ${hasStories(cat) ? 'story' : 'facts'}: ${factIds.join(', ')}` : ''}${ending === 'follow' ? '\n  ending: the follow reminder' : ''}${hookNote}\n`);
  process.exit(0);
}

// A redo goes right after its original (and the original's earlier redos) in the looks ledger, with the
// original's look. Written the way tools/next-theme.mjs writes it, under its lock.
function placeRedo(id, theme, baseId) {
  const lockDir = path.join(specsDir, '.themes.lock');
  for (let i = 0; ; i++) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch {
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > 30000) fs.rmSync(lockDir, {recursive: true, force: true});
      } catch {}
      if (i > 200) return '; the looks ledger is locked, left as it is';
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    const ledger = readJson(themesFile, null);
    if (!ledger || !Array.isArray(ledger.videos)) return '; no looks ledger to place it in';
    if (ledger.videos.some((v) => v.id === id)) return '';
    const rootId = String(baseId).replace(/-r\d+$/, '');
    const family = new RegExp(`^${rootId}(?:-r\\d+)?$`);
    let at = -1;
    ledger.videos.forEach((v, i) => family.test(v.id) && (at = i));
    if (at < 0) return `; ${rootId} is not in the looks ledger, left as it is`;
    ledger.videos.splice(at + 1, 0, {id, theme: theme === 'light' ? 'light' : 'dark'});
    const body = [
      '{',
      `  "about": ${JSON.stringify(ledger.about ?? '')},`,
      '  "videos": [',
      ledger.videos.map((v) => `    ${JSON.stringify({id: v.id, theme: v.theme})}`).join(',\n'),
      '  ]',
      '}',
      '',
    ].join('\n');
    writeAtomic(themesFile, body);
    return `; placed after ${ledger.videos[at].id} in the looks ledger`;
  } finally {
    fs.rmSync(lockDir, {recursive: true, force: true});
  }
}

// ---- the request -----------------------------------------------------------------------------------------------
const env = process.env;
// a new request starts clean: no rejection left over from an earlier one (on the Mac, or a re-run)
fs.rmSync(rejectedFile, {force: true});
const req = String(env.STUDIO_REQ ?? '').trim();
if (!REQ.test(req)) die(2, `STUDIO_REQ "${req.slice(0, 40)}" is not a request id (r-<6..12>-<4..8>, digits and a-z)`);
const topic = text('STUDIO_TOPIC', env.STUDIO_TOPIC, TOPIC_MAX);
const asked = String(env.STUDIO_CATEGORY ?? '').trim();
if (asked && !CAT.has(asked)) {
  const why = lockedWhy(asked) || retiredWhy(asked);
  die(2, why ? `STUDIO_CATEGORY ${why}; the site refuses it too. One of ${CAT_IDS.join(', ')}, or empty` : `STUDIO_CATEGORY "${asked.slice(0, 40)}" is not a category; one of ${CAT_IDS.join(', ')} (ci/categories.json), or empty`);
}
const length = choice('STUDIO_LENGTH', env.STUDIO_LENGTH, ['15', '20', '30', '45'], '20');
const voice = choice('STUDIO_VOICE', env.STUDIO_VOICE, ['m', 'f'], 'm');
const mood = choice('STUDIO_MOOD', env.STUDIO_MOOD, ['calm', 'normal', 'wild'], 'normal');
const feedback = text('STUDIO_FEEDBACK', env.STUDIO_FEEDBACK, FEEDBACK_MAX);
const base = String(env.STUDIO_BASE ?? '').trim();
if (base && !REQ.test(base)) die(2, `STUDIO_BASE "${base.slice(0, 40)}" is not a request id`);
if (base && base === req) die(2, 'STUDIO_BASE is this request itself');
if (feedback && !base) die(2, 'STUDIO_FEEDBACK needs STUDIO_BASE (the video it is about)');

// the pre-gate: plain spam stops here, with no brief, so Claude is never started (exit 4). Text that was typed
// but is nothing once the invisible characters are gone is refused too (it would otherwise run as the dice).
for (const [field, value, raw] of [['topic', topic, env.STUDIO_TOPIC], ['feedback', feedback, env.STUDIO_FEEDBACK]]) {
  const rule = !value && /\S/u.test(String(raw ?? '')) ? 'letters' : spamOf(value);
  if (!rule) continue;
  const reason = SPAM_REASONS[rule](SPAM_FIELDS[field]);
  reject({reason, by: 'pre', field, rule, req});
  process.stderr.write(`prompt: OFF_TOPIC: the pre-gate turned the ${field} down (${rule}): ${reason}\n`);
  process.exit(4);
}

const studio = readJson(studioFile, {});
const files = specFiles();
const lib = library(studio);

let baseId = null;
let baseTheme = null;
let baseTopic = null;
let baseCategory = null;
let id = null;
let baseEntry = {};
let baseFilm = null; // the original's own Film scene (its name), if it has one
let baseEnding = null; // the original's ending: a redo keeps it
let baseMusic; // the original's own "music" (false, or its own bed): a redo keeps it
if (base) {
  const entry = studio[base];
  if (!entry?.id) die(3, `STUDIO_BASE ${base} is not in specs/.studio.json`);
  const baseSpec = readJson(path.join(specsDir, `${entry.id}.json`), null);
  if (!baseSpec) die(3, `specs/${entry.id}.json (the video ${base} made) is missing`);
  baseEntry = entry;
  baseId = entry.id;
  baseTheme = baseSpec.theme === 'light' ? 'light' : 'dark';
  baseFilm = filmScenes(baseSpec).map((f) => f.name).find(Boolean) ?? null;
  baseEnding = endingOfSpec(baseSpec, ENDINGS);
  baseMusic = baseSpec.music;
  baseTopic = clean(entry.topic) || null;
  // an original in a retired category (price, customs, chart, honest) is history: it is not made again; one in a
  // category still waiting for the App Store cannot exist, but is refused the same way
  const baseKnown = knownCat(baseSpec.category) ?? knownCat(entry.category);
  if (baseKnown && !validCat(baseKnown)) die(2, `the original's category was removed or is locked: ${retiredWhy(baseKnown) || lockedWhy(baseKnown)}, so ${entry.id} is not made again`);
  baseCategory = validCat(baseKnown);
  // v13-x, v13-x-r1, v13-x-r2 ...: a redo of a redo is the next -r<n> of the same video
  const rootId = baseId.replace(/-r\d+$/, '');
  const taken = [...files.map((f) => f.slice(0, -5)), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
  const ns = taken.map((x) => new RegExp(`^${rootId}-r(\\d+)$`).exec(x)?.[1]).filter(Boolean).map(Number);
  id = `${rootId}-r${Math.max(0, ...ns) + 1}`;
}
const ledger = readJson(themesFile, {videos: []});
const allIds = [...files.map((f) => f.slice(0, -5)), ...(ledger.videos ?? []).map((v) => v.id), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
const next = `v${Math.max(0, ...allIds.map(vNumber)) + 1}-`;

// ---- the ending: a quote, or the follow reminder on every second film (tools/ci/ending.mjs) -----------------------
// The film's number decides (fixed here as "next", pinned by resolve.mjs, so a retry gets the same); a redo keeps its
// original's. A follow film may end on any line of the bank but the last few other films ended on (least recent first).
const ending = base ? baseEnding : endingOfNumber(vNumber(next), ENDINGS);
const followLines = ending === 'follow' ? offerFor(id ?? next, ENDINGS, specsDir) : [];
// the music (tools/ci/music.mjs): every third film by its number gets a quiet bed, added at render (build-index); a redo
// shares its original's number and so its bed
const MUSIC = loadMusic(root);
const ownMusic = base && baseMusic !== undefined && baseMusic !== null; // the original said false or named its own bed
const music = ownMusic ? musicOf({id, music: baseMusic}, MUSIC) : musicFor(id ?? next, MUSIC);

// ---- the category: asked, the original's, read from the topic, or the dice ------------------------------------
// The dice: a category with "diceEvery": n (car knowledge, the owner 2026-10-05: "put it first, favoured by the
// dice") on every n-th roll, counted on the ledger's dice films ("from": "dice"): when none of the last n - 1 rolls
// gave it, it is this roll's. Otherwise the category with the fewest videos (a video and its redos count once), ties
// to the one whose newest video is the oldest (never used counts as oldest), then the order of ci/categories.json. A
// category that opened late ("release": the navigator and the OBD scanner) counts at least as many videos as the
// least-used of the rest, so it joins the rotation instead of taking every roll until it has caught up.
// A category marked "dice": false (an announcement, "whatsnew") is only ever asked for, never rolled.
// Two favoured categories (the owner, 2026-10-06 evening: the crazy stories are the viral one, "frequent, but not every
// roll"; car knowledge keeps every other roll): each is due when none of its last n - 1 rolls gave it, and when both are
// due the more frequent one (the smaller n) takes this roll and the other the next. carinfo 2 and stories 4 interlock:
// stories, carinfo, a feature, carinfo, stories ... (carinfo every other roll, stories every fourth, a feature every
// fourth; with carinfo's rule alone a feature had every other roll).
const FAVOURED = CATS.filter((c) => c.dice !== false && Number(c.diceEvery) >= 2).sort((a, b) => Number(a.diceEvery) - Number(b.diceEvery));
const DICE_IDS = CATS.filter((c) => c.dice !== false && !FAVOURED.includes(c)).map((c) => c.id);
const diceRolls = () => Object.values(studio).filter((e) => e?.from === 'dice' && typeof e.id === 'string').sort((a, b) => String(a.at).localeCompare(String(b.at)));
const favouredDue = () => FAVOURED.find((f) => !diceRolls().slice(-(Number(f.diceEvery) - 1)).some((e) => e.category === f.id)) ?? null;
const dice = () => {
  const due = favouredDue();
  if (due) return due.id;
  // a tie goes to a feature first, then the order of ci/categories.json (the extra categories moved to the top of the
  // list on 2026-10-06; the dice keeps the features first, as before)
  const stat = new Map(DICE_IDS.map((c, i) => [c, {n: 0, last: -1, i: i + (CAT.get(c)?.feature === false ? DICE_IDS.length : 0)}]));
  for (const f of families(lib)) {
    const s = stat.get(f.at(-1).category);
    if (!s) continue;
    s.n += 1;
    s.last = Math.max(s.last, vNumber(f[0].id));
  }
  // A category that opened late (a "release" one, the navigator and the OBD scanner at 1.0.4) never counts fewer films
  // than the least-used of the rest: it joins the rotation at the bottom instead of catching up on every film it
  // missed (with 0 films against 3 to 11 it took 6 feature rolls in a row). Never used, it still wins the tie (oldest).
  const late = new Set(CATS.filter((c) => c.release && DICE_IDS.includes(c.id)).map((c) => c.id));
  const rest = [...stat].filter(([c]) => !late.has(c)).map(([, s]) => s.n);
  const floor = rest.length ? Math.min(...rest) : 0;
  for (const c of late) stat.get(c).n = Math.max(stat.get(c).n, floor);
  return [...stat.entries()].sort(([, a], [, b]) => a.n - b.n || a.last - b.last || a.i - b.i)[0][0];
};
// A topic typed without a category: the category whose words match the most letters of it, when one clearly
// does; "general" only when no feature matches. The fact bank (car knowledge) never takes a topic that names the app
// ("რატომ გჭირდება ვინარი" is about the app: its brief would forbid naming it), and a tie between it and a feature
// goes to the feature ("ზეთის შეცვლა დროზე": reminders).
const namesApp = (t) => /ვინარ|vinari/iu.test(t);
const fromTopic = (t) => {
  const score = (c) =>
    (c.words ?? []).reduce((sum, w) => {
      try {
        return sum + [...(new RegExp(w, 'iu').exec(t)?.[0] ?? '')].length;
      } catch {
        return sum;
      }
    }, 0);
  const scored = CATS.filter((c) => !(c.bank && namesApp(t))).map((c) => [c, score(c)]).filter(([, s]) => s > 0);
  const specific = scored.filter(([c]) => c.id !== 'general').sort((a, b) => b[1] - a[1]);
  if (specific.length) {
    if (specific.length === 1 || specific[0][1] > specific[1][1]) return specific[0][0].id;
    const top = specific.filter(([, s]) => s === specific[0][1]);
    const features = top.filter(([c]) => !c.bank);
    return features.length === 1 && features.length < top.length ? features[0][0].id : null;
  }
  return scored.length ? 'general' : null;
};
let category = null;
let categoryFrom = null;
if (base) [category, categoryFrom] = baseCategory ? [baseCategory, 'base'] : asked ? [asked, 'asked'] : [null, null];
else if (asked) [category, categoryFrom] = [asked, 'asked'];
else if (!topic) [category, categoryFrom] = [dice(), 'dice'];
else {
  const guess = fromTopic(topic);
  if (guess) [category, categoryFrom] = [guess, 'topic'];
}
const C = category ? CAT.get(category) : null;

// ---- car knowledge: the facts offered to this film (tools/ci/carinfo.mjs) --------------------------------------
// A few themes of the bank, not the whole bank (the brief stays short): his idea's themes when his words name one, a
// redo's original's, else the themes used longest ago. A fact one of the category's last films used is left out (or
// marked when he asked for that theme). Each fact keeps its id ([tyre-wear-bars]), which --record --facts names.
const carinfo = hasBank(category);
const crossNow = crossTold(STORIES, studio, BANK?.cat.id ?? 'carinfo', id ? familyOf(id) : null);
const bankOffer = carinfo ? offer(BANK, {ledger: studio, topic: [topic, feedback].filter(Boolean).join(' '), seed: req, baseFacts: base ? baseEntry.facts : null, exceptFamily: id ? familyOf(id) : null, toldElsewhere: crossNow.storyByFact}) : null;
const offered = bankOffer ? bankOffer.themes.flatMap((t) => t.facts) : [];
const factLine = (f) =>
  [
    `- [${f.id}] ${f.ka}`,
    f.tip ? ' (tip)' : '',
    f.source ? ` (source: ${f.source})` : '',
    f.app ? ` (the app: \`${f.app}\`)` : '',
    soundOf(f, SOUNDS) ? ` (sound: ${soundOf(f, SOUNDS)})` : '',
    f.usedBy?.length ? ` (used by ${f.usedBy.at(-1)}: only if his idea asks for it)` : '',
  ].join('');
const offerText = () =>
  bankOffer.themes.map((t) => `${t.label} (\`${t.id}\`):\n${t.facts.map(factLine).join('\n')}`).join('\n');
const offerHow = () => {
  if (!bankOffer) return '';
  if (bankOffer.how === 'base') return "the themes of the original's facts";
  if (bankOffer.matched) return `${bankOffer.themes[0]?.id === 'closest' ? 'the facts closest to his words first, then ' : ''}the themes his idea names (a fact a recent film used is marked)`;
  return `${bankOffer.how === 'topic' ? 'his idea names no theme of the bank, so ' : ''}the ${bankOffer.themes.length} themes used longest ago, without the facts the last ${RECENT_FILMS} films used`;
};
// the app a fact may end on: that feature's own facts, never-list and screens
const appsText = () => {
  const apps = linkedApps(offered);
  if (!apps.length) return '(none of these facts links the app: every film from them is a film without the app)';
  return apps
    .map((a) => {
      const c = CAT.get(a);
      return `\`${a}\` · ${c.label} (${c.tier}). Screens: ${(c.screens ?? []).join(', ')}. Its facts:\n${(c.facts ?? []).map((f) => `  - ${f}`).join('\n')}\n  Never: ${(c.never ?? []).join('; ')}.`;
    })
    .join('\n');
};
// ---- crazy car stories: the stories offered to this film (tools/ci/stories.mjs) -------------------------------------
// The ones his idea names (their own Georgian words: a name, a brand), a redo's original's, else the best-ranked ones no
// recent film told, one of each kind. Each keeps its id ([lauda-comeback]), which --record --story names.
const stories = hasStories(category);
const storyOffer = stories ? offerStories(STORIES, {ledger: studio, topic: [topic, feedback].filter(Boolean).join(' '), baseStory: base ? (baseEntry.facts ?? [])[0] ?? null : null, exceptFamily: id ? familyOf(id) : null}) : null;
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '?';
  }
};
const storyText = (s) => {
  const photos = (s.photos ?? []).map((k) => {
    const c = STORIES.catalog[k] ?? {};
    const small = tooSmall(c);
    const brand = typeof c.brand === 'string' ? `, a brand's wordmark on it (${c.brand}): ONLY a PhotoStory "print", shown whole` : '';
    return `    - ${k} (${c.w}×${c.h}${brand || (small ? ', small: a print or a window' : '')}${c.credit ? ', credit on screen and in the post' : ''}): ${cut(String(c.shows ?? '').replace(/ \(small: [^)]*\)$/, ''), 110)}`;
  });
  return [
    `- [${s.id}] ${s.title} (${STORIES.kinds[s.kind] ?? s.kind}, rank ${s.rank})${s.toldBy ? ` (told by ${s.toldBy}: only if his idea asks for it)` : ''}${s.crossBy ? ` (its subject was in ${s.crossBy}, car knowledge: only if his idea asks for it)` : ''}`,
    `  twist: ${s.plot}`,
    '  facts (the only truth: say nothing they do not say):',
    ...s.facts.map((f) => `    - ${f.en} (${[...new Set(f.sources.map(hostOf))].join(', ')})`),
    `  in Georgian (draft wording, true to the facts): ${s.ka.setup} | ${s.ka.escalation} | ${s.ka.twist} | ${s.ka.payoff}`,
    `  hook seeds (the gap to open; write your own in the buddy tone): ${s.hooks.map((h) => `"${h}"`).join(' · ')}`,
    `  ending idea (a shape): ${s.ending}`,
    ...(s.legend ? [`  LEGEND: ${s.legend.popular} Say it as one: ${s.legend.say}`] : []),
    ...(s.note ? [`  note: ${s.note}`] : []),
    '  its photos (public/photos, licensed; show only these, in PhotoStory, Split, Timeline, Twist or a KineticHeadline / BigNumber "bg"):',
    ...photos,
  ].join('\n');
};
const storyHow = () => {
  if (!storyOffer) return '';
  if (storyOffer.how === 'base') return "the original's story";
  if (storyOffer.matched) return 'the stories closest to his words (a story a recent film told is marked)';
  return `${storyOffer.how === 'topic' ? 'his idea names no story of the bank, so ' : ''}the best-ranked stories no film of the last ${RECENT_STORIES} told, one of each kind`;
};
// the real sounds a film may play today (credit sounds only while ci/sounds.json allows credit lines)
const soundsText = () =>
  SOUNDS.all
    .filter((e) => ['hook', 'contrast', 'knowledge'].includes(e.role) && SOUNDS.usable(e.name))
    .map((e) => `- ${e.name} (${Number(e.durationSec).toFixed(1)} s${e.credit?.required ? ', CC BY: its credit goes under the post' : ''}): ${cut(String(e.use ?? ''), 120)}`)
    .join('\n');
// the words the category's last films leaned on (tools/ci/words.mjs): the next film finds its own
const keyWordsText = () => {
  if (!C) return '';
  const rows = recentKeys(category, specsDir, {beforeId: id ?? `${next}x`, skip: (t) => isFollowLine(t, ENDINGS), exempt: exemptFor(C)});
  const words = [];
  for (const r of rows) for (const w of r.words.values()) if (!words.includes(w)) words.push(w);
  return words.length ? words.slice(0, 60).join(', ') : '(none yet)';
};

// ---- the earlier videos, as data: the chosen category's only (or, with none chosen yet, the newest of all) ----
const entryLine = (v, withCategory) =>
  [
    v.id,
    withCategory ? (v.category ? (RETIRED.has(v.category) ? `${v.category} (removed)` : LOCKED.has(v.category) ? `${v.category} (locked)` : v.category) : '?') : null,
    v.hook ?? 'H?',
    cut(v.angle || v.title || v.topic || '?', 110),
    v.open && `open "${v.open}"`,
    ...v.alsoOpen.slice(0, 2).map((o) => `or "${o}"`),
    v.cover && norm(v.cover) !== norm(v.open) && `cover "${v.cover}"`,
    v.quote && (isFollowLine(v.quote, ENDINGS) ? 'end: the follow reminder' : `end "${v.quote}"`),
    v.facts?.length && `${v.category === STORIES?.cat.id ? 'story' : 'facts'} ${v.facts.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ');
const seenList = () => {
  // one line per video, its newest version (a redo shares its original's idea; --record still checks both)
  const rows = families(C ? inCategory(lib, category, null) : lib).map((f) => f.at(-1)).reverse(); // newest first
  const max = C ? SEEN_MAX : 20;
  if (!rows.length) return '(none yet: the first one)';
  if (rows.length <= max) return rows.map((v) => entryLine(v, !C)).join('\n');
  // the newest in full, the older ones by their angle only, so none of them is lost from sight
  const full = rows.slice(0, max - 4).map((v) => entryLine(v, !C));
  const older = [...new Set(rows.slice(max - 4).map((v) => cut(v.angle || v.title || v.topic || v.id, 60)))];
  const lines = [];
  for (let i = 0; i < older.length && lines.length < 4; i += 6) lines.push(`older: ${older.slice(i, i + 6).join('; ')}`);
  const left = older.length - Math.min(older.length, 24);
  if (left) lines.push(`(and ${left} older ones)`);
  return [...full, ...lines].join('\n');
};
const counts = () => {
  const n = new Map(CAT_IDS.map((c) => [c, 0]));
  for (const f of families(lib)) if (n.has(f.at(-1).category)) n.set(f.at(-1).category, n.get(f.at(-1).category) + 1);
  return [...n.entries()].map(([c, k]) => `${c} ${k}`).join(' · ');
};
// a general video leads with the features the earlier general videos showed least (ties: the features with
// the fewest videos of their own first)
const rotation = () => {
  const n = new Map(FEATURES.map((c) => [c, 0]));
  for (const v of lib) if (v.category === 'general') for (const f of v.features ?? []) n.set(f, n.get(f) + 1);
  const own = new Map(FEATURES.map((c) => [c, families(inCategory(lib, c, null)).length]));
  return [...n.entries()].sort((a, b) => a[1] - b[1] || own.get(a[0]) - own.get(b[0])).map(([c, k]) => `${c} ${k}`).join(', ');
};
// ", never <the formulas the category's last two videos opened with>", or nothing
const avoid = () => {
  if (!C) return ', never one the last two videos of your category opened with';
  const {formulas, unknown} = lastTwo(lib, category, null);
  const two = unknown.length > 1;
  const parts = [...formulas, ...(unknown.length ? [`the one${two ? 's' : ''} ${unknown.join(' and ')} opened with (not recorded: judge ${two ? 'them' : 'it'} from the opening line${two ? 's' : ''})`] : [])];
  return parts.length ? `, never ${parts.join(', ')}` : '';
};
const copyFrom = () => {
  const mains = lib.filter((v) => files.includes(`${v.id}.json`));
  const same = C ? mains.filter((v) => v.category === category) : [];
  return (same.at(-1) ?? mains.at(-1))?.id ?? 'v1-customs-cliff';
};
// the looks of the category's last films (tools/ci/visual.mjs), newest first, and the types whose staging must change
const lastLooks = () => (C ? categoryFilms(category, specsDir, studio).slice(-5).reverse() : []);
const visuals = () => {
  const rows = lastLooks();
  return rows.length ? rows.map((v) => `${v.id} · ${sigLine(v.visual)}`).join('\n') : '(none yet)';
};
// the category's earlier new visuals (--idea), newest first: the next film designs something none of them did
const ideasList = () => {
  if (!C) return '(none yet)';
  const fams = new Map();
  for (const v of Object.values(studio).filter((x) => x?.idea && x.id && x.category === category).sort((a, b) => String(a.at).localeCompare(String(b.at)))) fams.set(familyOf(v.id), v);
  const rows = [...fams.values()].slice(-IDEAS_MAX).reverse();
  return rows.length ? rows.map((v) => `${v.id} · ${cut(flat(v.idea), 160)}`).join('\n') : '(none yet: yours is the first)';
};
const categoryLine = (() => {
  const name = C ? `\`${category}\` · ${C.label}` : '';
  if (categoryFrom === 'asked') return name;
  if (categoryFrom === 'base') return `${name}, the original's`;
  if (categoryFrom === 'dice')
    return FAVOURED.some((f) => f.id === category)
      ? `${name}, rolled by the dice: no category and no topic, and ${FAVOURED.map((f) => `every ${Number(f.diceEvery) === 2 ? 'other' : `${f.diceEvery}th`} roll is ${f.id}`).join(', ')}`
      : `${name}, rolled by the dice: no category and no topic, so the one with the fewest videos (on a tie, the one used longest ago)`;
  if (categoryFrom === 'topic') return `${name}, read from the topic's words (if the topic plainly belongs to another id in ${nowRel}, take that one)`;
  return `none: take the id in ${nowRel} that fits the topic best`;
})();
const baseHook = FORMULAS.includes(baseEntry.hook) ? baseEntry.hook : null;
const baseAngle = flat(baseEntry.angle) || null;
const recordCmd = base
  ? `node tools/ci/prompt.mjs --record ${id}` +
    (baseHook ? '' : ' --hook <Hnn>') +
    (baseAngle ? '' : ' --angle "<the idea in one English line>"') +
    ' [--idea "<the new visual, one English line>" when you write your own Film scene]' +
    (category === 'general' && !baseEntry.features?.length ? ' --features <the feature ids it shows, comma-separated>' : '') +
    (carinfo ? (baseEntry.facts?.length ? ' [--facts <ids> when the feedback changes the facts]' : ' --facts <the bank ids of the facts it uses, comma-separated>') : '') +
    (stories ? (baseEntry.facts?.length ? '' : ' --story <the story id>') : '')
  : `node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<your angle in one English line>" --idea "<your new visual in one English line>"` +
    (category === 'general' ? ' --features <the 3 to 5 feature ids you show, comma-separated>' : '') +
    (carinfo ? ' --facts <the bank ids of the facts you used, comma-separated>' : '') +
    (stories ? ' --story <the id of the story you tell>' : '') +
    (topic ? ' [--from-idea when his idea gave the opening]' : ' "<the idea, a few Georgian words>"');
// a redo keeps its original's formula and angle unless told otherwise
const redoNote = !base
  ? ''
  : baseHook && baseAngle
    ? `It keeps the original's formula (${baseHook}) and angle. Add \`--hook <Hnn>\` when your opening now uses another formula (HOOKS.md §1), \`--angle "<one line>"\` when the feedback changed the idea.`
    : `Hnn is the formula your opening uses (HOOKS.md §1); the original recorded ${baseHook || baseAngle ? `no ${baseHook ? 'angle' : 'formula'}` : 'neither'}.`;

// ---- fill the template -----------------------------------------------------------------------------------------
// A new code on every run for the DATA markers (<<<TOPIC 3f9a0c1e ... TOPIC 3f9a0c1e>>>): what the co-founder
// typed cannot close the block early with a marker of its own, because it cannot know the code.
const nonce = crypto.randomBytes(4).toString('hex');
const values = {
  nonce,
  req,
  length,
  letters: String(LETTERS[length]),
  voiceId: VOICES[voice],
  mood,
  moodLine: MOODS[mood],
  topicText: topic || (baseTopic ? `(empty: the original's topic was: ${baseTopic})` : '(empty: pick the idea yourself)'),
  feedbackText: feedback || '(none: make a fresh take of the same idea, a different hook)',
  baseId: baseId ?? '',
  baseTheme: baseTheme ?? '',
  id: id ?? '',
  next,
  categoryLine,
  category: category ?? '<your id>',
  categoryLabel: C?.label ?? '',
  tier: C?.tier ?? '',
  facts: carinfo ? offerText() : stories ? storyOffer.stories.map(storyText).join('\n') : (C?.facts ?? []).map((f) => `- ${f}`).join('\n'),
  factsHow: stories ? storyHow() : offerHow(),
  apps: carinfo ? appsText() : '',
  sounds: carinfo ? soundsText() : '',
  keywords: keyWordsText(),
  keyOverlap: String(KEY_OVERLAP),
  never: (C?.never ?? []).join('; ') || 'nothing beyond SKILL.md',
  screens: carinfo ? linkedApps(offered).flatMap((a) => CAT.get(a)?.screens ?? []).join(', ') || 'none: these facts link no app' : stories ? 'none: a story film never shows the app' : (C?.screens ?? []).join(', ') || 'any',
  seen: seenList(),
  counts: counts(),
  avoid: base ? '' : avoid(),
  visuals: visuals(),
  ideas: ideasList(),
  template: 'src/scenes/film/_template.tsx',
  sigTypes: C ? signatureTypes(C).join(', ') : '',
  newest: lastLooks()[0]?.id ?? 'the newest film',
  rotation: category === 'general' ? rotation() : '',
  copyFrom: copyFrom(),
  record: recordCmd,
  redoNote,
  catsFile: nowRel,
  storeVersion: STORE ?? 'no answer',
  lockedLine: LOCKED.size
    ? `- not on the App Store yet (it has ${STORE ?? 'no answer from the lookup'}): ${[...LOCKED.values()].map((c) => `${c.label} (\`${c.id}\`)`).join(', ')}. A film never shows, names or hints at them or their screens (${LOCKED_SCREENS.join(', ')}); when his idea is about one, make the closest film the rules allow and say so after \` · not done:\`.`
    : '',
  oldLine: OLD_SCREENS.length
    ? `- the app changed with ${STORE}: ${OLD_SCREENS.join(', ')} show it as it looked before, so a film never uses them; a spec you copy or redo that shows one takes a screen of today's app instead (\`${nowRel}\` lists each category's), measured again.`
    : '',
  endingLine:
    ending === 'follow'
      ? base
        ? `the follow reminder, as the original's (${ruleText(ENDINGS)})`
        : `the follow reminder, not a quote (${ruleText(ENDINGS)}; this is one)`
      : 'a closing punchline or callback in the buddy tone (HOOKS.md §3), never an aphorism',
  musicLine: ownMusic ? `as the original: keep its "music" (${JSON.stringify(baseMusic)})` : music ? 'a quiet bed under the film, added at render: write no "music" in the spec' : 'none',
  followLines: followLines.map((l) => `   - "${l}"`).join('\n'),
  redoFilm: baseFilm
    ? `Keep its Film scene (${baseFilm}); only when the feedback is about the look, write your own new one as \`src/scenes/film/${id ? filmName(id) : '<Name>'}.tsx\` and record it with \`--idea\`.`
    : `It has no Film scene of its own (it was made before them); write one as \`src/scenes/film/${id ? filmName(id) : '<Name>'}.tsx\` only when the feedback is about the look, and record it with \`--idea\`.`,
  'hooks.rubric': range(/^## 2\. /),
  'hooks.templates': range(/^## 3\. /),
  'hooks.angles': range(/^## 5\. /),
  'hooks.h14': range(/^### H14 /),
  'hooks.buddy': range(/^## Buddy tone /),
  'hooks.stories': range(/^## Story films /),
  'hooks.formulas': FORMULAS.map((h) => `${h} ${range(new RegExp(`^### ${h} `)).replace('lines ', '')}`).join(', '),
};
const flags = {
  typed: Boolean(topic || feedback), // the co-founder typed something: the gate (§0) judges it
  redo: Boolean(base),
  random: !topic && !base,
  dice: categoryFrom === 'dice',
  wild: mood === 'wild',
  known: Boolean(C) && !base,
  nocat: !C && !base,
  general: category === 'general' && !base,
  carinfo, // a car-knowledge film: the offered bank facts, the educational structure, the app only when a fact links it
  stories, // a crazy story film: the offered stories, the arc with its twist, the story's own photos, no app
  tips: Boolean(bankOffer?.tips), // the offer is practical tips only ("tipEvery"): a reel-style tip film, opening on a question
  locked: LOCKED.size > 0, // a category waits for the App Store release: the brief names it and its screens
  old: OLD_SCREENS.length > 0, // a release replaced screens (the 1.0.3 home and menu): the brief says never to use them
  catblock: (Boolean(C) && !base) || carinfo || stories, // the category's facts in the brief (a carinfo or stories redo too: its original's)
  follow: ending === 'follow', // this film ends on the follow reminder (tools/ci/ending.mjs)
  // the brief does not carry the facts it needs: read the file (no category yet, a general video, or a category
  // marked "allfacts": true, like "whatsnew", whose items keep their own categories' facts)
  allfacts: (!C || category === 'general' || C.allfacts === true) && !base,
};
let out = fs.readFileSync(path.join(root, 'ci/prompt.md'), 'utf8').replace(/^<!--[\s\S]*?-->\n*/, '');
// blocks nest (a {{#random}} inside a {{^redo}}): resolve until none is left
for (let before = ''; before !== out; ) {
  before = out;
  out = out.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (m, kind, flag, body) => {
    if (!(flag in flags)) die(1, `ci/prompt.md uses the flag {{${kind}${flag}}}, which prompt.mjs does not set`);
    return (kind === '#') === Boolean(flags[flag]) ? body : '';
  });
}
if (/\{\{[#^/]/.test(out)) die(1, 'ci/prompt.md has a block that is not closed');
// one pass: a value that itself contains "{{x}}" (the topic) is never filled in again
out = out.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
  if (!(k in values)) die(1, `ci/prompt.md uses {{${k}}}, which prompt.mjs does not fill`);
  return values[k];
});
out = out.replace(/\n{3,}/g, '\n\n');

writeAtomic(
  requestFile,
  `${JSON.stringify(
    {
      req, topic, category, categoryFrom, length: Number(length), voice, voiceId: VOICES[voice], mood, feedback, base: base || null, baseId, baseTheme, baseTopic,
      baseHook, baseAngle, baseIdea: flat(baseEntry.idea) || null,
      baseFeatures: Array.isArray(baseEntry.features) ? baseEntry.features : null,
      baseFacts: Array.isArray(baseEntry.facts) ? baseEntry.facts : null, offered: storyOffer ? storyOffer.stories.map((s) => s.id) : offered.map((f) => f.id), id, next, ending,
      store: STORE, locked: [...LOCKED.keys()], lockedScreens: LOCKED_SCREENS, oldScreens: OLD_SCREENS,
    },
    null,
    1,
  )}\n`,
);
writeAtomic(nowFilePath, nowFile(APPLIED));
process.stdout.write(out);
