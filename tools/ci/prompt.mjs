// The studio workflow's brief for the cloud Claude (the "script" step), its ledger writer, and the topic gate
// (the pre-gate here, Claude's verdict through --reject).
//
//   node tools/ci/prompt.mjs > prompt.txt
//     Reads the request from env, checks it and prints ci/prompt.md filled in. Also writes the checked request
//     to out/ci/request.json, which tools/check.mjs (VS_CI=1) and --record read.
//     env STUDIO_REQ       required, the site's request id: r-<6..12 [0-9a-z]>-<4..8 [0-9a-z]>
//         STUDIO_TOPIC     optional, at most 5000 characters (the site's idea field: a detailed idea is the film's
//                          plan, ci/prompt.md step 1); empty = Claude picks the idea
//         STUDIO_CATEGORY  optional, an id from ci/categories.json. Empty with a topic: the topic's words pick
//                          it (or Claude does). Empty with no topic: the dice: a category with "diceEvery": n on
//                          every n-th roll (carinfo, every other), else the category with the fewest videos, ties to
//                          the one used longest ago (never one marked "dice": false; one that opened late at a release
//                          counts at least the least-used of the rest's videos, so it does not take every roll until
//                          it catches up). A category still locked by the App Store gate (below) or a retired one is
//                          refused (exit 2): the site refuses both first. A category with "needsTopic": true (free,
//                          the free idea) needs STUDIO_TOPIC, or a redo (STUDIO_BASE): without one it is refused
//                          (exit 2); the site refuses it first (400 "topic").
//         STUDIO_STORE_VERSION  optional: pretend this App Store version is live (rehearsals, the Mac, tests); any
//                          other word pretends the lookup failed. Unset: Apple's public lookup is asked.
//         STUDIO_LENGTH    15 | 20 | 30 | 45 | 60 (default 45, plan step 1.3). A new film of a category with a "lesson" (carinfo, the
//                          owner 2026-10-12: lessons "from 45 s to 1 minute") asked shorter than its "min" is made at its
//                          "length" (60): request.json "length" is the film's, "lengthAsked" what the site sent; a redo
//                          keeps the length asked
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
//     The free idea (the owner, 2026-10-06: "the video follows MY idea"): the category "free" ("needsTopic") makes his
//     typed message the script: his lines in his order, no feature list, the screens only of the features his words name
//     (request.json "freeFeatures", "freeScreens"; check.mjs FREE_SCREEN).
//     The aura openings (ci/categories.json "openers".aura: H21 grindset, H22 heartbreak glow-up): every "every"-th film
//     of their home category (carinfo, every third since 2026-10-07) opens with one and the others never, and the newest
//     film of the page never shares its aura formula with this one (flags aura, auraNot, auraFeed; request.json "auraDue",
//     "auraFeed"). The brief asks for the two-act drop (tools/ci/aura.mjs: the hurt, „არაუშავს!" on a hard cut, the drive).
//     Street words (tools/ci/streetwords.mjs, ci/street-words.json): the brief says whether this film may say one at all
//     (never two films in a row, at most one in three, page-wide) and which word the last street film said (rotation).
//     The pictures (tools/ci/visual.mjs picturesText): the illustrated pictures and the kit compositions the category's
//     and the page's newest films showed, so this film composes its own from the kit's parts.
//
//   node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<the angle, one line>" [--idea "<the new visual, one line>"] [--features a,b,c] [--facts a,b] [--from-idea] ["<the idea picked>"]
//     The cloud Claude runs this after writing specs/<id>.json:
//     specs/.studio.json[req] = {id, topic, base, at, category, angle, hook[, features][, facts][, from], visual[, idea][, ending][, street]} (visual:
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
//     not the story's own, a licensed photo in a scene that shows no credit (a small or wide photo in a full-bleed
//     staging is only a note since 2026-10-07: the render shows it whole, stories.mjs photoNotes); a story
//     a first-time listener cannot follow (stories.mjs storyTelling: a key name of the bank's "names" never said, the
//     lead not by the second line, a person said with no word of who they are, the payoff's name unsaid, the story told
//     in fragments: STORY_NAMES, STORY_WHO, STORY_PAYOFF, STORY_CHOPPY); and, for a new film without --from-idea, an
//     opening that shares two content words with one of the last 10 openings.
//     Every film: a post that retells the voice (tools/ci/words.mjs postEcho: a run of 4 of its words, or more than half
//     of its content words from the voice): POST_ECHO.
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
//     A free film ("needsTopic") is never refused for its formula, its aura rotation or an opening line made of his own
//     words (a note instead), and shows no app screen outside request.json "freeScreens" (FREE_SCREEN). An aura opening
//     (H21, H22; not --from-idea, not free) is refused when the brief said the film opens another way, when it did not
//     open with one although it was due, when the newest film of the page opened with the same formula, or when it shares
//     two content words (the refrain „არაუშავს", „საქმე მაქვს" ... left out) with one of the page's last 10 aura openings;
//     and (a redo too) when it is not the two-act drop (tools/ci/aura.mjs AURA_DROP, the owner 2026-10-07: "a SAD opening
//     and BOOM": the hurt in "style": "hurt", the hold, „არაუშავს!" slammed on the beat marked "drop": true with its
//     subtitle chunk empty, "style": "drive", three new pictures right after). A beat "drop": true under a non-aura --hook
//     is refused as well.
//     The street words (tools/ci/streetwords.mjs): a banned word, more than three, one in the cover, meta, EndCard or
//     post, one next to a real name or about a woman, one shown and not said, one in a film right after (or within three
//     of) a street film, or the last street film's word again: refused (his own typed words: a note). The ledger line
//     keeps "street": the words the film says, for the next films' rotation.
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
import {endingOfNumber, endingOfSpec, endingProblems, freeWeekFilm, isFollowLine, loadEndings, loadFreeWeek, offerFor, offerFreeWeek, ruleText} from './ending.mjs';
import {loadMusic, musicFor, musicOf} from './music.mjs';
import {categoryFilms, filmName, filmScenes, ownFilms, pageFilms, picturesText, retiredScreens, screensShown, signature, signatureTypes, sigLine} from './visual.mjs';
import {REFRAIN, STREET, streetAskOf, streetGate, streetHistory, streetPicks, streetProblems, streetWords} from './streetwords.mjs';
import {FACT_ID, filmRules, isTipFilm, linkedApps, loadBank, loadSounds, offer, RECENT_FILMS, soundOf, usedFacts} from './carinfo.mjs';
import {crossTold, loadStories, nameWords, offerStories, RECENT_STORIES, recentlyTold, shapeNote, storyNotes, storyRules} from './stories.mjs';
import {applyRelease, atLeast, nowFile, storeVersion, VERSION} from './release.mjs';
import {contentWords, exemptFor, KEY_OVERLAP, postEcho, postEchoLine, recentKeys, RECENT_FILMS as RECENT_KEY_FILMS, unlimitedFact, unlimitedProblems, unlimitedRule, UNLIMITED_WORD} from './words.mjs';
import {lengthClass, LETTERS, maxGl, minScenes, TEXT_MAX} from './screentext.mjs';
import {KIT_FROM, kitOn} from '../../src/lib/kit.mjs';
import {P2_UNTIL, p2On} from '../../src/lib/p2.mjs';
import {writeCatalog} from './catalog.mjs';
import {loadNewsBank, offerNews} from './news.mjs';
import {loadHumour, offerHumour} from './humor.mjs';
import {HIGHLIGHT_ICONS, nextSlides, slideCategories, slidesDice} from './slides.mjs';
import {auraDropProblems} from './aura.mjs';
import {allowedFor, capturesFor, readLedger, recentLines} from './coverlog.mjs';

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

// ---- node tools/ci/prompt.mjs --test: the self-test, the brief built for a film and for a Story set (as children: this file
// runs top to bottom on its request) --------------------------------------------------------------------------------------
if (process.argv[2] === '--test') {
  const {spawnSync} = await import('node:child_process');
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const brief = (extra) => {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {cwd: root, encoding: 'utf8', env: {...process.env, GITHUB_ACTIONS: '', STUDIO_LEDGER: '', STUDIO_REQ: 'r-selftest1-abcd', STUDIO_LENGTH: '30', STUDIO_VOICE: 'm', STUDIO_MOOD: 'normal', STUDIO_TOPIC: '', STUDIO_FEEDBACK: '', STUDIO_BASE: '', STUDIO_CATEGORY: '', STUDIO_MODE: '', ...extra}});
    let req = null;
    try {
      req = JSON.parse(fs.readFileSync(path.join(root, 'out/ci/request.json'), 'utf8'));
    } catch {}
    return {status: r.status, out: r.stdout ?? '', err: r.stderr ?? '', req};
  };
  const film = brief({STUDIO_CATEGORY: 'qr', STUDIO_TOPIC: 'QR ბარათი მინაზე'});
  ok(film.status === 0 && /# One Vinari video/.test(film.out) && !/\{\{/.test(film.out), `a film's brief builds, every value filled (exit ${film.status}${film.err ? `: ${film.err.trim().split('\n').pop()}` : ''})`);
  ok(film.req?.mode === 'film', 'request.json: mode film');
  ok(/One voice is one narrator\*\* \(a man's voice \(Nelson\)\)/.test(film.out) && /One place, never one picture/.test(film.out), 'the narrator and one-picture rules, with the voice named (2026-10-20)');
  const filmF = brief({STUDIO_CATEGORY: 'qr', STUDIO_TOPIC: 'QR ბარათი მინაზე', STUDIO_VOICE: 'f'});
  ok(/One voice is one narrator\*\* \(a woman's voice \(Alisa\)\)/.test(filmF.out), "a woman's voice is named so");
  const kitDue = kitOn(film.req?.next ? `${film.req.next}x` : '');
  ok(!kitDue || /PROMO KIT/.test(film.out), `from v113 the film's brief carries the promo kit and method (${film.req?.next ?? '?'})`);
  ok(!kitDue || /STILL_REPEAT, EDGE_CUT/.test(film.out), 'and its self-review');
  ok(film.req?.freeWeek ? /The free week, every second film/.test(film.out) : !/The free week, every second film/.test(film.out), `the free-week block follows the rule (${film.req?.freeWeek ? 'this film says it' : 'not this film'})`);
  // „ულიმიტოდ" (the owner, 2026-10-21: in EVERY film about an app feature; ci/categories.json "unlimited", check UNLIMITED)
  {
    const raw = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
    const from = raw.unlimitedFrom;
    ok(Number.isInteger(from), `ci/categories.json "unlimitedFrom" is a film number (${from})`);
    // the key and the fact agree, at every App Store version the file knows (an "after" block replaces the facts)
    const versions = [null, ...new Set(raw.categories.flatMap((c) => Object.keys(c.after ?? {})))];
    const disagree = versions.flatMap((v) =>
      applyRelease(raw, v).cats.filter((c) => (c.unlimited === true) !== Boolean(unlimitedFact(c))).map((c) => `${c.id}@${v ?? 'none'}`),
    );
    ok(!disagree.length, `"unlimited": true exactly where an UNLIMITED fact is (${disagree.join(', ') || 'all agree'})`);
    const lax = raw.categories.flatMap((c) => [c.facts ?? [], ...Object.values(c.after ?? {}).map((b) => b.facts ?? [])].flat()).filter((f) => /^UNLIMITED/.test(f) && !/in EVERY film/.test(f));
    ok(!lax.length, `every UNLIMITED fact says "in EVERY film", none "now and then" (${lax.length})`);
    const now = applyRelease(raw, '1.0.5').cats;
    const cat = (id) => now.find((c) => c.id === id);
    const must = now.filter((c) => unlimitedRule(c, {n: from, from}) === 'must').map((c) => c.id);
    ok(['parking', 'vin', 'engine', 'obd', 'nav'].every((c) => must.includes(c)), `the MUST at 1.0.5: ${must.join(', ')}`);
    ok(unlimitedRule(cat('qr'), {n: from, from}) === 'never', 'the QR card (its messages a day are limited) never says it');
    ok(['stories', 'carinfo', 'free'].every((c) => unlimitedRule(cat(c), {n: from, from}) === null), 'stories, car knowledge and the free idea: their own words');
    ok(unlimitedRule(cat('nav'), {n: from - 1, from}) === null, 'a film before "unlimitedFrom" (or a redo of one) keeps its words');
    ok(unlimitedRule(cat('free'), {n: from, from, named: [cat('nav')]}) === 'ask' && unlimitedRule(cat('free'), {n: from, from, named: [cat('qr')]}) === null, 'a free film naming the navigator is asked (a note), naming the QR card not');
    const spec = (says) => ({id: `v${from}-x`, beats: says.map((say) => ({say}))});
    const plain = spec(['მანქანა ქუჩაში დატოვე.', 'აპი გეტყვის, სად დგას.', 'ჰოდა ასე.']);
    const said = spec(['მანქანა ქუჩაში დატოვე.', 'ვინარი პლიუსით | ულიმიტოდ იმახსოვრებ.', 'ჰოდა ასე.']);
    ok(unlimitedProblems(plain, 'must').some((l) => /^UNLIMITED /.test(l)), 'a feature film without „ულიმიტო": UNLIMITED');
    ok(unlimitedProblems(said, 'must').length === 0, 'a feature film that says „ულიმიტოდ" passes');
    ok(unlimitedProblems(plain, unlimitedRule(cat('stories'), {n: from, from})).length === 0 && unlimitedProblems(plain, unlimitedRule(cat('carinfo'), {n: from, from})).length === 0, 'a story or car-knowledge film does not need it');
    ok(unlimitedProblems(said, 'never').some((l) => /^UNLIMITED beats\[1\]/.test(l)) && unlimitedProblems(plain, 'never').length === 0, 'a QR card film that says it: UNLIMITED');
  }
  // a crazy story never says the free-week line (the owner, 2026-10-21), on the same free-week number the QR film got it
  const tale = brief({STUDIO_CATEGORY: 'stories', STUDIO_STORE_VERSION: '1.0.5'});
  ok(tale.status === 0 && (!film.req?.freeWeek || (tale.req?.freeWeek === false && !/The free week, every second film/.test(tale.out))), `a stories film on a free-week number (${film.req?.next}) is offered no free-week line (${tale.req?.freeWeek})`);
  ok(film.req?.unlimited === 'never' && /Never „ულიმიტო"/.test(film.out) && !/„ულიმიტოდ", in this film/.test(film.out), `a QR card film's brief forbids „ულიმიტო" (${film.req?.unlimited})`);
  ok(!film.req?.freeWeek || !/ულიმიტ/u.test(/The free week, every second film[\s\S]*?FREE_WEEK/.exec(film.out)?.[0] ?? ''), 'a QR card film is offered no „ულიმიტოდ" free-week line');
  const park = brief({STUDIO_CATEGORY: 'parking', STUDIO_TOPIC: 'სად გავაჩერე', STUDIO_STORE_VERSION: '1.0.5'});
  ok(park.status === 0 && park.req?.unlimited === 'must' && /„ულიმიტოდ", in this film/.test(park.out) && /save as many spots/.test(park.out), `a parking film's brief asks for „ულიმიტოდ" with its fact (${park.req?.unlimited}${park.err ? `: ${park.err.trim().split('\n').pop()}` : ''})`);
  const gen = brief({STUDIO_CATEGORY: 'general', STUDIO_STORE_VERSION: '1.0.5'});
  ok(gen.req?.unlimited === 'must' && /„ულიმიტოდ", in this film/.test(gen.out), `a general film at 1.0.5 too, about the navigator and the other limitless features (${gen.req?.unlimited})`);
  const know = brief({STUDIO_CATEGORY: 'carinfo', STUDIO_STORE_VERSION: '1.0.5'});
  ok(!film.req?.freeWeek || (know.req?.freeWeek === false && !/The free week, every second film/.test(know.out)), `a car-knowledge film on a free-week number (${film.req?.next}) is offered no free-week line (${know.req?.freeWeek})`);
  ok(know.status === 0 && know.req?.unlimited === null && !/„ულიმიტოდ", in this film/.test(know.out) && !/Never „ულიმიტო"/.test(know.out), `a car-knowledge film's brief leaves it out (${know.req?.unlimited})`);
  // r3-cost: a phase-2 film reads two cut files in one reply, lints everything at once, fixes in one reply, runs no refused Bash
  if (p2On(film.req?.next ? `${film.req.next}x` : '')) {
    for (const [what, b] of [['qr', film], ['stories', tale], ['carinfo', know]]) {
      ok(/`out\/ci\/rules\.now\.md`/.test(b.out) && /`out\/ci\/scenes\.now\.md`/.test(b.out) && /In ONE reply, all at once/.test(b.out) && !/HOOKS\.md, only these lines/.test(b.out), `r3-cost: a ${what} film's reading is the two cut files in one reply`);
      ok(/node tools\/check\.mjs <id> --lint/.test(b.out) && /Every fix in one reply/.test(b.out) && /never `cd`, a pipe/.test(b.out), `r3-cost: a ${what} film lints at once, fixes in one reply, runs no refused Bash`);
      ok(!/Car3: the graphite crossover/.test(b.out) && /PEOPLE ARE BACK/.test(b.out) && /The menu is `out\/ci\/scenes\.now\.md`/.test(b.out) && /PROMO KIT/.test(b.out), `r3-cost: a ${what} film's brief offers no retired 3D car or retired scene menu, and tells it with people (the owner, 2026-10-29)`);
      ok(!/`node tools\/ci\/filmlint\.mjs <Name>` for each/.test(b.out) && !/Run `node tools\/ci\/p2lint\.mjs/.test(b.out) && !/`node tools\/ci\/treatment\.mjs <id>`\s+checks it alone/.test(b.out), `r3-cost: a ${what} film is not sent to the single lints one by one`);
    }
    const rules = fs.readFileSync(path.join(root, 'out/ci/rules.now.md'), 'utf8');
    ok(/## ci\/promo-dna\.md/.test(rules) && /## HOOKS\.md lines \d+-\d+: the lesson/.test(rules) && !/: the story films/.test(rules), 'r3-cost: the last brief (car knowledge) wrote its rules: promo-dna and the lesson, not the story films');
  }
  const set = brief({STUDIO_MODE: 'slides', STUDIO_CATEGORY: 'qr', STUDIO_TOPIC: 'როგორ დავბეჭდო'});
  ok(set.status === 0 && /# One VINARI Story set/.test(set.out) && !/\{\{/.test(set.out), `a Story set's brief builds (exit ${set.status}${set.err ? `: ${set.err.trim().split('\n').pop()}` : ''})`);
  ok(/## 0\. Gate/.test(set.out) && /ALWAYS the white theme/.test(set.out), "it carries the film brief's gate and the owner's white-and-big rules");
  ok(/"icon": "qr_code_2"/.test(set.out), "the Highlight icon is the category's own");
  ok(set.req?.mode === 'slides' && /^s\d+-$/.test(String(set.req?.slidesNext ?? '')), `request.json: mode slides, the next set ${set.req?.slidesNext}`);
  const redo = brief({STUDIO_MODE: 'slides', STUDIO_BASE: 'r-other12-abcd'});
  ok(redo.status === 2, 'a Story set is never a redo');
  ok(brief({STUDIO_MODE: 'slides', STUDIO_CATEGORY: 'stories'}).status === 2, 'a Story set of a category that is not a story one is refused');
  // the free idea makes Story sets too, and ONE Story image (the owner, 2026-10-19)
  const freeOne = brief({STUDIO_MODE: 'slides', STUDIO_ONE: '1', STUDIO_CATEGORY: 'free', STUDIO_TOPIC: 'ზამთარი მოდის. მალე რაღაცას გაჩვენებთ'});
  ok(freeOne.status === 0 && /A FREE set/.test(freeOne.out) && /ONE IMAGE/.test(freeOne.out) && freeOne.req?.one === true, `a free one-image Story brief (${freeOne.status}: ${freeOne.err.slice(0, 160)})`);
  const many = brief({STUDIO_MODE: 'slides', STUDIO_CATEGORY: 'qr'});
  ok(many.status === 0 && !/ONE IMAGE/.test(many.out) && !many.req?.one, 'a whole set by default');
  ok(brief({STUDIO_MODE: 'slides', STUDIO_CATEGORY: 'free'}).status === 2, 'a free Story set needs his idea');
  // the Story dice (no category, no topic): its own rotation on the sets' ledger, an app feature, never the films' rotation
  const led = path.join(root, 'out/ci/selftest-slides-ledger.json');
  fs.mkdirSync(path.dirname(led), {recursive: true});
  fs.writeFileSync(led, '{}\n');
  const d0 = brief({STUDIO_MODE: 'slides', STUDIO_SLIDES_LEDGER: led});
  ok(d0.status === 0 && d0.req?.categoryFrom === 'dice' && d0.req?.category === 'qr' && /rolled by the Story dice/.test(d0.out), `the Story dice with no set yet: the first feature (${d0.req?.category}, ${d0.req?.categoryFrom})`);
  fs.writeFileSync(led, `${JSON.stringify({'r-aaaaaa1-aaaa': {id: 's1-qr-card', category: 'qr', at: '2026-10-19T08:00:00Z'}})}\n`);
  const d1 = brief({STUDIO_MODE: 'slides', STUDIO_SLIDES_LEDGER: led});
  ok(d1.req?.category === 'parking', `a set of qr made: the dice moves on (${d1.req?.category})`);
  const g = brief({STUDIO_MODE: 'slides', STUDIO_SLIDES_LEDGER: led, STUDIO_TOPIC: 'გიჟური ამბავი ლამბორგინიზე და ფერარიზე'});
  ok(g.status === 0 && g.req?.category !== 'stories', `a topic that reads as a non-story category leaves it to Claude (${g.req?.category ?? 'none'})`);
  try {
    fs.rmSync(path.join(root, 'out/ci/request.json'), {force: true});
    fs.rmSync(led, {force: true});
  } catch {}
  console.log(bad ? `prompt: ${bad} failed` : 'prompt: all ok');
  process.exit(bad ? 1 : 0);
}

const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
const ID = /^[a-z0-9-]+$/;
// What the co-founder may type (the page, web/api/studio.js line() and studio.yml's "check request" take the same):
// the idea is up to about a page, so he can describe the film he wants; a redo's note is shorter.
const TOPIC_MAX = 5000;
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
const MOODS = {
  calm: 'A clear, warm hook said like a friend: a plain question or an everyday moment (H03, H10, H11), no joke.',
  normal: 'The house default: the best-scoring hook, from any formula, in the buddy tone (HOOKS.md Buddy tone).',
  wild: 'Cheeky, even silly, but true (HOOKS.md H14, H16, H17, H21): a funny moment, the car talking, a buddy question or a grindset shrug, proved by the next beat with a real screen or a fact. One "!" at most (the hook), no slang spelling, never laughing at a person.',
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
// a category made only from a typed idea (free) is never rolled and never read from a topic: no future edit may break it
for (const c of APPLIED.cats) if (c.needsTopic && (c.dice !== false || (c.words ?? []).length)) die(1, `ci/categories.json: "${c.id}" has "needsTopic", so it needs "dice": false and no "words"`);
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
  // and the RETIRED captures (public/screens/_retired, 2026-10-26: 21-obd-hub's old rows, 13-diagnosis's „ხოდოვოი", the
  // 1.0.3 home, menu, customs, market and chart): the app no longer looks like them, whatever a category once listed
  for (const s of retiredScreens(root)) if (!ok.has(s) && !old.includes(s)) old.push(s);
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

// ---- the opening families (ci/categories.json "openers") -------------------------------------------------------------
// The aura family (H21 grindset, H22 heartbreak glow-up; the owner, 2026-10-06: the stories open on the grindset meme,
// "every other one"): it opens every other film of its home category (stories), and the page's newest film never shares
// its aura formula with the next one. A formula of a family's film is its original's (a redo keeps the hook).
const AURA = RAW_CATS?.openers?.aura && Array.isArray(RAW_CATS.openers.aura.formulas) ? RAW_CATS.openers.aura : null;
const isAura = (h) => Boolean(AURA && h && AURA.formulas.includes(h));
const hookOf = (fam) => fam.find((v) => v.hook)?.hook ?? null;
const AURA_FRESH = Number(AURA?.fresh ?? 10);
/** {due, last, feed, home}: is this film of `cat` due an aura opening, what its category's last film opened with, and the
 *  page's newest film when it opened with an aura formula ({id, hook}). `except`: the film's own family. */
const auraState = (lib, cat, except) => {
  if (!AURA || !cat) return {};
  const mine = families(inCategory(lib, cat, except));
  // every 1 (the owner, 2026-10-07: "the stories' openings without those words are dumb"): every film of the home
  // category opens with an aura formula; every n: one in n
  const every = Math.max(1, Number(AURA.every ?? 2));
  const home = cat === AURA.home;
  const due = home && (every === 1 || !mine.slice(-(every - 1)).some((f) => isAura(hookOf(f))));
  const last = mine.length ? hookOf(mine.at(-1)) : null;
  const all = families(lib.filter((v) => familyOf(v.id) !== except));
  const newest = all.at(-1) ?? null;
  const feed = newest && isAura(hookOf(newest)) ? {id: newest.at(-1).id, hook: hookOf(newest)} : null;
  return {due, last, feed, home};
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
  // a free film (the free idea, "needsTopic"): his words are the script, so his opening is never refused
  const freeCat = Boolean(CAT.get(cat)?.needsTopic);

  // the formula of the opening: never one the last two videos of the category opened with
  const hook = String(opts.hook ?? '').trim().toUpperCase() || (request.base ? request.baseHook ?? '' : '');
  if (!FORMULAS.includes(hook)) die(2, `--hook: the formula the opening uses, one of ${FORMULAS.join(', ')} (HOOKS.md §1)${request.base && !request.baseHook ? '; the original recorded none' : ''}`);
  // (his idea wins: an opening the co-founder gave, --from-idea, is kept and only noted; a free film opens with his words)
  const recent = lastTwo(lib, cat, own);
  let hookNote = '';
  if (recent.formulas.includes(hook) && !(request.base && hook === request.baseHook)) {
    const who = families(inCategory(lib, cat, own)).slice(-2).flat().filter((v) => v.hook === hook).map((v) => v.id);
    if (opts.fromIdea || freeCat) hookNote = `\n  note: ${hook} also opened ${who.join(' and ')}; kept, because ${freeCat ? 'a free film opens with his words' : "the co-founder's own words give this opening"}`;
    else die(2, `${hook} opened ${who.join(' and ')}, one of the last two "${cat}" videos: open with another formula (${FORMULAS.filter((h) => !recent.formulas.includes(h)).join(', ')}), then record again${ownOpening ? `; or, when the co-founder's ${request.feedback && !request.topic ? 'note' : 'idea'} itself gives this opening, keep it and add --from-idea` : ''}`);
  }
  // the aura openings (ci/categories.json "openers".aura, H21 grindset, H22 heartbreak glow-up): every other film of the
  // home category opens with one and the others never; never the formula the page's newest film opened with. The brief
  // said which (request.json "auraDue", "auraFeed"); his own opening (--from-idea) and a free film turn these into notes.
  if (AURA && !request.base) {
    const auraLines = [];
    if (cat === AURA.home && request.auraDue && !isAura(hook)) auraLines.push(`this "${cat}" film opens with an aura formula (${AURA.formulas.join(' or ')}, HOOKS.md): its category's last film opened another way`);
    if (cat === AURA.home && request.auraDue === false && isAura(hook)) auraLines.push(`the last "${cat}" film opened with an aura formula: this one opens another way (not ${AURA.formulas.join(', ')})`);
    if (isAura(hook) && request.auraFeed?.hook === hook) auraLines.push(`${request.auraFeed.id}, the newest film on the page, opened with ${hook}: take ${AURA.formulas.filter((h) => h !== hook).join(' or ')} or another formula`);
    if (auraLines.length) {
      if (opts.fromIdea || freeCat) hookNote += auraLines.map((l) => `\n  note: ${l}; kept, because ${freeCat ? 'a free film opens with his words' : "the co-founder's own words give this opening"}`).join('');
      else die(2, `${auraLines.join('; ')}. Change the opening (and --hook), then record again`);
    }
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
  const ownFilm = ownFilms(spec, id).length > 0;
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
    // the aura refrain („არაუშავს", „საქმე მაქვს", „მითხრა" ...: ci/street-words.json "refrain") is the formula itself:
    // two grindset openings may both say it
    const stems = (t) => new Set(contentWords(t).filter((w) => !ex(w.word, w.stem) && !REFRAIN.has(w.stem)).map((w) => w.stem));
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
  // the post never retells the film (the owner, 2026-10-07, tools/ci/words.mjs postEcho): a story's names are no echo
  const echo = postEchoLine(postEcho(spec, {skip: (t) => isFollowLine(t, ENDINGS), exempt: hasStories(cat) ? nameWords(STORIES, STORIES.byId.get(factIds[0])) : undefined}));
  if (echo) die(2, `${echo}\nFix "post" in specs/${id}.json, then record again`);

  // an aura opening is a new put-down and a new bold move every time, page-wide: it shares at most one content word (the
  // refrain and the category's own words left out) with each of the page's last AURA_FRESH aura openings ("მამამ მითხრა,
  // ... ხარო" twice with only the insult swapped is the same opening). His own opening and a free film are kept.
  if (AURA && isAura(hook) && !request.base && !opts.fromIdea && !freeCat) {
    const opening = openOf(spec);
    const ex = exemptFor(CAT.get(cat));
    const stems = (t) => new Set(contentWords(t).filter((w) => !ex(w.word, w.stem) && !REFRAIN.has(w.stem)).map((w) => w.stem));
    const mineOpen = stems(opening);
    const lastAura = families(lib.filter((v) => familyOf(v.id) !== own))
      .map((f) => f.at(-1))
      .filter((v) => v.open && isAura(v.hook))
      .slice(-AURA_FRESH);
    const near = lastAura.map((v) => [v, [...stems(v.open)].filter((st) => mineOpen.has(st))]).filter(([, shared]) => shared.length >= 2);
    if (near.length)
      die(2, `the aura opening "${cut(opening, 60)}" shares ${near.map(([v, shared]) => `${shared.length} words (${contentWords(opening).filter((w) => shared.includes(w.stem)).map((w) => w.word).filter((w, i, a) => a.indexOf(w) === i).join(', ')}) with ${v.id}'s "${cut(v.open, 50)}"`).join('; ')}: a new put-down and a new move, then record again`);
  }
  // the aura drop (tools/ci/aura.mjs; the owner, 2026-10-07: "a SAD opening and BOOM"): an aura opening is the hurt, the
  // hold, „არაუშავს!" slammed on a hard cut and the drive (AURA_DROP: the flat v81 shape is refused, a redo too), and a
  // film that drops is an aura opening. His own opening and a free film: notes.
  if (AURA) {
    const drops = Array.isArray(spec.beats) && spec.beats.some((b) => b?.drop === true);
    const lines = [];
    if (drops && !isAura(hook)) lines.push(`a beat says "drop": true, the aura drop: record it with --hook ${AURA.formulas.join(' or ')} (or take the drop out)`);
    if (isAura(hook)) lines.push(...auraDropProblems(spec, {root}).map((p) => p.line));
    if (lines.length) {
      if (opts.fromIdea || freeCat) hookNote += lines.map((l) => `\n  note: ${l}`).join('');
      else die(2, `${lines.join('\n')}\nFix specs/${id}.json (HOOKS.md H21: the hurt, the hold, „არაუშავს!" slammed on a hard cut, the drive), then record again`);
    }
  }

  // a free film: no app screen but those of the features his words name (the brief listed them: request.json freeScreens)
  if (freeCat) {
    const allowed = new Set(Array.isArray(request.freeScreens) ? request.freeScreens : []);
    const extra = screensShown(root, spec).filter((s) => !allowed.has(s));
    if (extra.length) die(2, `FREE_SCREEN ${extra.join(', ')}: a free film shows an app screen only for a feature his words name (${allowed.size ? [...allowed].join(', ') : 'none here'}); draw the idea instead (a scene, the brand's mark), then record again`);
  }

  // street words (tools/ci/streetwords.mjs, ci/street-words.json; the owner, 2026-10-06): only here and there, in a "me"
  // line; never two films in a row, at most one in three, the last street film's word not again. His own typed words
  // are his (a note). A redo keeps its original's place in the order.
  const streetOwn = [request.topic, request.baseTopic, request.feedback].filter(Boolean).join(' ');
  const streetHist = streetHistory(specsDir, studio, {except: own}).filter((v) => vNumber(v.id) < vNumber(id));
  const streetFound = streetProblems(spec, {skip: (t) => isFollowLine(t, ENDINGS), own: streetOwn, gate: streetGate(streetHist), onlyOwn: freeCat, ask: streetAskOf(request)});
  const streetBad = streetFound.filter((p) => p.fatal);
  if (streetBad.length) die(2, `${streetBad.map((p) => `${p.code} ${p.where}: ${p.msg}`).join('\n')}\nFix specs/${id}.json, then record again`);
  for (const p of streetFound) hookNote += `\n  note: ${p.code} ${p.where}: ${p.msg}`;
  const street = streetWords(spec, {skip: (t) => isFollowLine(t, ENDINGS)});

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
  // a free film's opening line made of his own words is his (two of his ideas may open alike); its cover title, closing
  // quote and angle are ours and stay new
  const hisStems = new Set(contentWords(request.topic || request.baseTopic || '').map((w) => w.stem));
  const isHis = (s) => {
    const m = contentWords(s).map((w) => w.stem);
    return m.length > 0 && m.filter((x) => hisStems.has(x)).length * 2 >= m.length;
  };
  const mine = [...(freeCat && isHis(openOf(spec)) ? [] : [['opening line', openOf(spec)]]), ['cover title', coverTitleOf(spec)], ...(isFollowLine(quoteOf(spec), ENDINGS) ? [] : [['closing quote', quoteOf(spec)]]), ['angle', angle]];
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
  // the film's visual signature (tools/ci/visual.mjs): the next brief of the category lists it, check refuses a repeat.
  // "kit": the film was made with the promo kit (src/lib/kit.mjs KIT_FROM): tools/ci/filmlint.mjs --test refuses a film
  // numbered from KIT_FROM on without it (one made before the upgrade reached the branch: raise KIT_FROM past it)
  studio[request.req] = {id, topic, base: request.base || null, at, category: cat, angle, hook, ...(features.length ? {features} : {}), ...(factIds.length ? {facts: factIds} : {}), ...(request.categoryFrom === 'dice' ? {from: 'dice'} : {}), visual: signature(spec), ...(visualIdea ? {idea: visualIdea} : {}), ...(ending === 'follow' ? {ending} : {}), ...(street.length ? {street} : {}), ...(kitOn(id) ? {kit: KIT_FROM} : {}), ...(typeof spec.news === 'string' && /^[a-z0-9-]{3,60}$/.test(spec.news) ? {news: spec.news} : {})};
  const rows = Object.entries(studio).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  writeAtomic(studioFile, rows.length ? `{\n${rows.join(',\n')}\n}\n` : '{}\n');
  let where = '';
  if (request.base) where = placeRedo(id, spec.theme, request.baseId);
  process.stdout.write(`recorded ${request.req}: ${id} (${cat} · ${hook} · ${angle})${where}\n  looks: ${sigLine(signature(spec)) || '(no scenes)'}${visualIdea ? `\n  new visual: ${visualIdea}` : ''}${factIds.length ? `\n  ${hasStories(cat) ? 'story' : 'facts'}: ${factIds.join(', ')}` : ''}${ending === 'follow' ? '\n  ending: the follow reminder' : ''}${street.length ? `\n  street: ${street.join(', ')}` : ''}${hookNote}\n`);
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
// none given: 45 s (plan step 1.3, 2026-10-26: the promo arc, the problem lived, the reveal and three real screens, needs
// the room; the promos ran 74 to 118 s). The site always sends one (its own default)
const lengthAsked = choice('STUDIO_LENGTH', env.STUDIO_LENGTH, ['15', '20', '30', '45', '60'], '45');
const voice = choice('STUDIO_VOICE', env.STUDIO_VOICE, ['m', 'f'], 'm');
const mood = choice('STUDIO_MOOD', env.STUDIO_MOOD, ['calm', 'normal', 'wild'], 'normal');
const feedback = text('STUDIO_FEEDBACK', env.STUDIO_FEEDBACK, FEEDBACK_MAX);
const base = String(env.STUDIO_BASE ?? '').trim();
if (base && !REQ.test(base)) die(2, `STUDIO_BASE "${base.slice(0, 40)}" is not a request id`);
if (base && base === req) die(2, 'STUDIO_BASE is this request itself');
if (feedback && !base) die(2, 'STUDIO_FEEDBACK needs STUDIO_BASE (the video it is about)');
// the mode (the owner, 2026-10-19): "film" (the default) or "slides", the Instagram Story slides (ci/slides.md,
// tools/ci/slides.mjs). A slides request is never a redo: a new set says it in its own words
const MODE = choice('STUDIO_MODE', env.STUDIO_MODE || 'film', ['film', 'slides'], 'film');
if (MODE === 'slides' && (base || feedback)) die(2, 'a Story set is never a redo (STUDIO_BASE, STUDIO_FEEDBACK): ask for a new one');
// a set's category is a story one (ci/categories.json "slides": true; the site refuses the others too)
const SLIDE_CATS = slideCategories(CATS);
if (MODE === 'slides' && asked && !SLIDE_CATS.includes(asked)) die(2, `STUDIO_CATEGORY "${asked}" is not a story category; one of ${SLIDE_CATS.join(', ')}, or empty`);

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
let baseLen = 0; // the original's length class (15 .. 60 s, from its letters): a redo of a lesson keeps a lesson's length
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
  baseLen = lengthClass(baseSpec);
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
// never under P2_UNTIL (src/lib/p2.mjs): the classic studio is back from there, the phase-2 numbers stay the old films'
const next = `v${Math.max(P2_UNTIL - 1, ...allIds.map(vNumber)) + 1}-`;

// ---- the ending: a quote, or the follow reminder on every second film (tools/ci/ending.mjs) -----------------------
// The film's number decides (fixed here as "next", pinned by resolve.mjs, so a retry gets the same); a redo keeps its
// original's. A follow film may end on any line of the bank but the last few other films ended on (least recent first).
const ending = base ? baseEnding : endingOfNumber(vNumber(next), ENDINGS);
const followLines = ending === 'follow' ? offerFor(id ?? next, ENDINGS, specsDir) : [];
// the free-week line (ci/endings.json "freeWeek", the owner 2026-10-19; 2026-10-21: every second film): a free-week film by
// its number says one line of the bank as the beat right before the EndCard; a redo keeps what its original said (the brief
// offers nothing new). It waits for the category (below): never a crazy story ("skip"), and the „ულიმიტოდ" lines only where
// they are true.
const FREE_WEEK = loadFreeWeek(root);
// the Story slides: the next set number and the category's earlier sets (specs/.slides.json)
const SLIDES_NEXT = nextSlides(root);
// ONE Story image (the owner, 2026-10-19: "sometimes I want to post something quickly: one photo, not always 3"): the site's
// mode "slide" (the workflow maps it to "slides" with STUDIO_ONE=1): a set of exactly one slide, its cover
const ONE = MODE === 'slides' && env.STUDIO_ONE === '1';
const slidesMade = () => {
  const led = readJson(path.resolve(root, process.env.STUDIO_SLIDES_LEDGER || 'specs/.slides.json'), {});
  const rows = Object.values(led ?? {})
    .filter((e) => e && typeof e.id === 'string' && (!category || e.category === category))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 20)
    .map((e) => `${e.id} · ${e.category ?? '?'} · ${cut(flat(e.topic ?? ''), 80) || '(dice)'} · ${cut(flat(e.idea ?? ''), 140)}`);
  return rows.length ? rows.join('\n') : '(none yet: yours is the first)';
};
// the promo-grade studio (src/lib/kit.mjs, the owner 2026-10-19): the kit, the promo method, the pace, the self-review
const kit = kitOn(id ?? next.replace(/-$/, '-x'));
const p2 = p2On(id ?? next.replace(/-$/, '-x'));
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
// a Story set's dice is its own (tools/ci/slides.mjs slidesDice): an app feature, the fewest sets first, on the sets' ledger
// (specs/.slides.json), never the films' rotation; a topic read as a category that is not a story one leaves it to Claude
const slidesLedger = () => readJson(path.resolve(root, process.env.STUDIO_SLIDES_LEDGER || 'specs/.slides.json'), {}) ?? {};
if (base) [category, categoryFrom] = baseCategory ? [baseCategory, 'base'] : asked ? [asked, 'asked'] : [null, null];
else if (asked) [category, categoryFrom] = [asked, 'asked'];
else if (!topic) [category, categoryFrom] = [MODE === 'slides' ? slidesDice(CATS, slidesLedger()) : dice(), 'dice'];
else {
  const guess = fromTopic(topic);
  if (guess && (MODE !== 'slides' || SLIDE_CATS.includes(guess))) [category, categoryFrom] = [guess, 'topic'];
}
const C = category ? CAT.get(category) : null;
// The lesson length (ci/categories.json "lesson": {min, length}; car knowledge, the owner 2026-10-12: "explained in detail but
// simply, from 45 s to 1 minute"): a new film of such a category asked shorter than "min" (the site's default 20, or the
// dice landing on it) is made at "length"; 45 and 60 stay as asked. A redo asked shorter than "min" keeps its original's
// length when the original is a lesson (the site sends the length its run was asked with, 20 for a dice film), else the
// length asked (an older, short film stays short).
const LESSON = C?.lesson && Number(C.lesson.min) > 0 && LETTERS[Number(C.lesson.length)] ? C.lesson : null;
const length =
  !LESSON || Number(lengthAsked) >= Number(LESSON.min) ? lengthAsked : !base ? String(LESSON.length) : baseLen >= Number(LESSON.min) ? String(baseLen) : lengthAsked;

// ---- the free idea (ci/categories.json "needsTopic", the owner 2026-10-06: "when an idea comes to me, the video follows
// MY idea") ------------------------------------------------------------------------------------------------------------
// A category made only from a typed idea: no idea, no film. A redo has its original's idea (in the ledger).
const FREE = Boolean(C?.needsTopic);
if (FREE && !topic && !base)
  die(2, `STUDIO_CATEGORY "${category}" (${C.label}) is made only from a typed idea, and STUDIO_TOPIC is empty; the site refuses it too (400 "topic")`);
// The free film's app: only the features his words name (each category's own "words", the way fromTopic reads a topic),
// today's screens of each (the gate applied: CATS is today's), plus the home and the menu when he asks to see the app
// itself. The brand's name alone ("ვინარი") is the mark and the wordmark, never a screen.
const APP_WORDS = /ეკრან|ინტერფეის|აპში|აპის|აპით|აპლიკაცი|როგორ მუშაობ|\bapp\b|\bscreens?\b/iu;
const namedFeatures = (t) =>
  CATS.filter(
    (c) =>
      c.feature !== false &&
      !c.bank &&
      (c.words ?? []).some((w) => {
        try {
          return new RegExp(w, 'iu').test(t);
        } catch {
          return false;
        }
      }),
  ).map((c) => c.id);
const freeText = FREE ? [topic || baseTopic || '', feedback].filter(Boolean).join(' ') : '';
const freeFeatures = FREE ? namedFeatures(freeText) : [];
// The store page (ci/categories.json "storeScreen", the owner 2026-10-14: "show now and then that VINARI is on the store,
// so people know"): VINARI's real App Store page in a Phone, never a feature screen. A free film may show it only when his
// words are about the app itself or getting it (its "words", or the app words above).
const STORE_SCREEN = (() => {
  const s = RAW_CATS?.storeScreen;
  if (!s || typeof s.src !== 'string' || !/^[a-z0-9-]+$/.test(s.src) || !fs.existsSync(path.join(root, 'public', 'screens', `${s.src}.jpg`))) return null;
  const words = (Array.isArray(s.words) ? s.words : []).flatMap((w) => {
    try {
      return [new RegExp(w, 'iu')];
    } catch {
      return [];
    }
  });
  const get = s.get && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(s.get[k])) ? {x: s.get.x, y: s.get.y, w: s.get.w, h: s.get.h} : null;
  return {src: s.src, gap: Number.isInteger(s.gap) && s.gap > 0 ? s.gap : 2, words, get};
})();
const freeStore = Boolean(FREE && STORE_SCREEN && (APP_WORDS.test(freeText) || STORE_SCREEN.words.some((w) => w.test(freeText))));
const freeScreens = FREE ? [...new Set([...freeFeatures.flatMap((f) => CAT.get(f)?.screens ?? []), ...(APP_WORDS.test(freeText) ? CAT.get('general')?.screens ?? [] : []), ...(freeStore ? [STORE_SCREEN.src] : [])])] : [];

// ---- „ულიმიტოდ" (ci/categories.json "unlimited", tools/ci/words.mjs unlimitedRule; the owner 2026-10-15: "the word sells",
// and 2026-10-21: in EVERY film about an app feature) -----------------------------------------------------------------------
// A film of a category whose facts (as true today) hold a true UNLIMITED fact says a form of „ულიმიტო" once ('must'); a free
// film whose words name such a feature is asked for it ('ask'); an app feature whose facts hold none never says it ('never':
// the QR card limits its messages a day); stories, car knowledge and the rest keep their own words. From film
// "unlimitedFrom" on; a redo shares its original's number. A Story set is not a film: nothing asked.
const UNLIMITED_FROM = Number.isInteger(RAW_CATS?.unlimitedFrom) ? RAW_CATS.unlimitedFrom : Infinity;
const unlimitedNamed = freeFeatures.map((f) => CAT.get(f)).filter((c) => c?.unlimited === true);
const unlimited = MODE === 'slides' ? null : unlimitedRule(C, {n: vNumber(id ?? next), from: UNLIMITED_FROM, named: unlimitedNamed});
const unlimitedText = unlimited === 'ask' ? unlimitedNamed.map((c) => `${c.label}: ${unlimitedFact(c)}`).join(' / ') : unlimitedFact(C);
// the free week (above): by the film's number, never a crazy story or car knowledge (the owner, 2026-10-21: "skip"); a film
// whose category Claude picks is told to leave it out of those
const freeWeek = !base && freeWeekFilm(next, FREE_WEEK, ENDINGS, category);
const freeWeekOn = MODE === 'slides' ? FREE_WEEK.on : freeWeek;
// the free-week lines this film (or Story set) is offered: a „ულიმიტოდ" line only where the category's facts make it true
const unlimitedTrue = C?.unlimited === true;
const freeWeekLines = freeWeek
  ? offerFreeWeek(next, FREE_WEEK, specsDir, {unlimited: unlimitedTrue})
  : MODE === 'slides' && FREE_WEEK.on
    ? FREE_WEEK.lines.filter((l) => unlimitedTrue || !UNLIMITED_WORD.test(l))
    : [];

// ---- the aura openings and the street words: what the page's newest films did -----------------------------------------
const aura = !base && C ? auraState(lib, category, null) : {};
// street words: never two films in a row, at most one in three (page-wide, by number), the last street film's word not
// again (tools/ci/streetwords.mjs); a redo keeps its original's place in the order
const streetGateNow = streetGate(streetHistory(specsDir, studio, {except: id ? familyOf(id) : null}).filter((v) => vNumber(v.id) < vNumber(id ?? `${next}x`)));
// his ask in general words (the owner, 2026-10-07: „უწმაწური ჰუკით დაიწყე“, „ცუდი დაწერე ჰუკი“, „გინებით“): the opening says
// a street word we pick (three random picks per request, never the last street film's), or none at all when he says so
const streetAskNow = streetAskOf({topic, baseTopic, feedback});
const streetPickNow = streetPicks(req, streetGateNow.recent);

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
// The store page in this film (STORE_SCREEN above): never car knowledge (it shows only the feature a fact links) or a
// story (no app), a free film only when his words ask for it, and now and then: never when one of the page's last "gap"
// films showed it. A redo keeps its original's choice. check.mjs (VS_CI=1) refuses it where it is not offered (STORE_SCREEN).
const storeFits = Boolean(STORE_SCREEN) && !hasBank(category) && !hasStories(category) && (!FREE || freeStore);
const storeShownBy = storeFits && !base
  ? pageFilms(specsDir, studio, id ? familyOf(id) : null)
      .slice(-STORE_SCREEN.gap)
      .filter((f) => f.visual.some((t) => t.endsWith(`/${STORE_SCREEN.src}`)))
      .map((f) => f.id)
  : [];
const storeOk = storeFits && !storeShownBy.length;
const storeRest = storeShownBy.length ? `${storeShownBy.join(', ')} showed it, one of the page's last ${STORE_SCREEN.gap} films (now and then, never film after film)` : '';
const storeWhy = !STORE_SCREEN
  ? ''
  : hasBank(category)
    ? 'a car-knowledge film shows only the feature its fact links'
    : hasStories(category)
      ? 'a story film never shows the app'
      : FREE && !freeStore
        ? 'his words are not about the app or getting it'
        : storeRest;
const storyOffer = stories ? offerStories(STORIES, {ledger: studio, topic: [topic, feedback].filter(Boolean).join(' '), baseStory: base ? (baseEntry.facts ?? [])[0] ?? null : null, exceptFamily: id ? familyOf(id) : null, p2: p2 && !base ? {id: next.replace(/-$/, '-x'), length: Number(length)} : null}) : null;
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
    // its shape (stories.mjs shapeNote, the fit of src/lib/bleed.ts): tall fills the frame, wide or small is shown whole
    const brand = typeof c.brand === 'string' ? `, a brand's wordmark on it (${c.brand}): ONLY a PhotoStory "print", shown whole` : '';
    return `    - ${k} (${c.w}×${c.h}${brand || `, ${shapeNote(c)}`}${c.credit ? ', credit on screen and in the post' : ''}): ${cut(String(c.shows ?? '').replace(/ \(small: [^)]*\)$/, ''), 110)}`;
  });
  return [
    `- [${s.id}] ${s.title} (${STORIES.kinds[s.kind] ?? s.kind}, rank ${s.rank})${s.toldBy ? ` (told by ${s.toldBy}: only if his idea asks for it)` : ''}${s.crossBy ? ` (its subject was in ${s.crossBy}, car knowledge: only if his idea asks for it)` : ''}`,
    `  twist: ${s.plot}`,
    // the names the voice must say (stories.mjs storyTelling: STORY_NAMES, STORY_WHO, STORY_PAYOFF), so the first draft
    // already says them instead of learning them from a refusal
    ...(Array.isArray(s.names) && s.names.length
      ? ['  names the voice says (with who they are the first time):', ...s.names.map((n) => `    - ${n.name}: ${{early: 'by the second beat', payoff: 'from the twist on: the name the story lands on', any: 'somewhere in the film'}[n.when] ?? 'only if the film needs them, then with who they are'}`)]
      : []),
    '  facts (the only truth: say nothing they do not say):',
    ...s.facts.map((f) => `    - ${f.en} (${[...new Set(f.sources.map(hostOf))].join(', ')})`),
    `  in Georgian (draft wording, true to the facts): ${s.ka.setup} | ${s.ka.escalation} | ${s.ka.twist} | ${s.ka.payoff}`,
    `  hook seeds (the gap to open; write your own in the buddy tone): ${s.hooks.map((h) => `"${h}"`).join(' · ')}`,
    `  ending idea (a shape): ${s.ending}`,
    ...(s.legend ? [`  LEGEND: ${s.legend.popular} Say it as one: ${s.legend.say}`] : []),
    ...(s.note ? [`  note: ${s.note}`] : []),
    '  its photos (public/photos, licensed; show only these, in PhotoStory, Split, Timeline, Twist or a KineticHeadline / BigNumber "bg"):',
    ...photos,
    // phase 2 (the owner, 2026-10-26: one photo about 10 times in a film, the talk without graphics): the photo budget, the
    // lane, the story's own figures and visual ideas, the shorter film when it has few photos
    ...(p2
      ? [
          `  PHASE 2: ${photos.length} photos, so at most ${photos.length} photo shots: each photo ONCE a film, no callback, whatever shows it (a PhotoStory, your Film's own src, a Versus side, a WhoCard: PHOTO_AGAIN); every other beat is a purpose-built graphic (FilmTitleCard, Receipt, UnitGrid, RankShift, ScaleReveal, RangeScale, TimeRace, WipeCompare, CodeAnatomy) with hand marks on the photos.${s.lane ? ` Lane: ${s.lane}.` : ''}${s.fewPhotos ? ' It has under 5 photos: the film is still the asked length (LENGTH), told mostly in purpose-built graphics (WhoCard, QuoteCard, Versus, Standings, Ledger, DocCard, LapDelta and the data kit).' : ''}`,
          ...(Array.isArray(s.figures) && s.figures.length ? [`  figures for the graphics: ${s.figures.map((f) => (typeof f === 'string' ? f : JSON.stringify(f))).join(' · ')}`] : []),
          ...(Array.isArray(s.visual) && s.visual.length ? [`  visual ideas: ${s.visual.join(' · ')}`] : []),
        ]
      : []),
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
  if (MODE === 'slides' && categoryFrom === 'dice') return `${name}, rolled by the Story dice: no category and no topic, so the app feature with the fewest Story sets (on a tie, the one used longest ago)`;
  if (MODE === 'slides' && !category) return `none: take the story category (${SLIDE_CATS.join(', ')}) that fits the topic best, from ${nowRel}`;
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
// phase 2 (tools/ci/news.mjs): the freshest verified news items this film may tell (never the last 10 films')
const newsOffered = (() => {
  try {
    const recent = Object.values(studio ?? {}).filter((e) => e?.news).sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));
    return offerNews(loadNewsBank(root), {recent});
  } catch {
    return [];
  }
})();
// A humour film tells one fresh verified news item (tools/ci/humor.mjs NEWS_BANK). With none to offer (the bank empty or
// every item expired or told) the writer would spend its budget, up to about $12, and the film gate would stop it for
// NEWS_BANK (the p2x prove, 2026-10-27: ci/news-bank.json had 0 items). Stop here instead, before any install or Claude
// call: out/ci/news-bank-empty.json, exit 5; studio.yml's brief step and "failure note" turn it into error.json
// {"code": "news_bank", "step": "script"}.
if (category === 'humor' && !base && !newsOffered.length && !process.argv.includes('--test')) {
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(path.join(root, 'out/ci/news-bank-empty.json'), `${JSON.stringify({code: 'news_bank', items: loadNewsBank(root).length})}\n`);
  } catch {}
  console.error(`NEWS_BANK: no fresh verified news item for a humour film (ci/news-bank.json has ${loadNewsBank(root).length}; banks.yml bank=news fills it)`);
  process.exit(5);
}
// ---- the cover (2026-10-27, the owner: „ერთდაიგივეებია, არც ჩანს წესიერად"): what the page's ledger leaves this film
// (tools/ci/coverlog.mjs R1 to R9: not the category's last 2 compositions, at most 2 of a kind in the page's last 6, never
// the composition or the look of the tile beside or above it (two polaroids never touch), never the composition of the
// covers 2 and 4 back (the corners), never a capture or photo of the page's last 12, the phone row once in 12, a
// picture in every gallery row when the category has one), the captures and regions it may show
const COVER_PLAN = (() => {
  const ledger = readLedger(root);
  const cat = category ?? 'general';
  const caps = capturesFor(root, cat, STORE);
  const carplay = cat === 'nav' && /car ?play|კარპლეი/i.test(`${topic ?? ''} ${feedback ?? ''}`);
  // the polaroid only where the film will have a credited photo of its own: a story film (every story of the bank comes
  // with its photos, and the film tells one of those offered); a car-knowledge, free or feature film is not promised one
  // here (check.mjs reads the written film's own photos and lets a polaroid the brief did not offer through)
  const photos = Boolean(storyOffer?.stories?.length) && storyOffer.stories.every((s) => Array.isArray(s.photos) && s.photos.length > 0);
  const a = allowedFor(cat, ledger, {caps, carplay, photos});
  return {...a, caps: caps.filter((c) => !a.assets.includes(c.src)), recent: recentLines(ledger)};
})();
/** the regions the brief offers: "detail" the ones that read whole, "phone" the rows */
const coverRegions = (kind) =>
  COVER_PLAN.caps
    .map((c) => ({src: c.src, names: kind === 'detail' ? c.detail : c.row}))
    .filter((c) => c.names?.length)
    .map((c) => `${c.src}: ${c.names.join(', ')}`)
    .join('; ');
const values = {
  // never empty (tools/ci/coverlog.mjs allowedFor ends on the category's longest-unused composition, never a bare quote)
  coverAllowed: `${COVER_PLAN.allowed.map((c) => `"${c}"${(c === 'versus' || c === 'stat') && COVER_PLAN.tone[c] ? ` (drawn on the black card this time)` : ''}${COVER_PLAN.later?.some((o) => o.comp === c) ? ' (only if nothing before it fits: its look is on a corner of this tile)' : ''}`).join(', ')}${['detail', 'phone'].filter((k) => COVER_PLAN.allowed.includes(k) && coverRegions(k)).map((k) => `; a "${k}" only on ${coverRegions(k)}`).join('')}${COVER_PLAN.relaxed.length ? ` (the page rule relaxed ${COVER_PLAN.relaxed.join(', ')})` : ''}`,
  recentCovers: COVER_PLAN.recent.length ? COVER_PLAN.recent.join('; ') : '(none yet)',
  humorPairs: (CATS.find((c) => c?.id === 'humor')?.pairs ?? []).join(', '),
  // r3: the judged humour pairs on the offered news items, and street setups (ci/humour-bank.json, banks.yml bank=humour)
  humourOffer: category === 'humor' ? offerHumour(loadHumour(root), newsOffered).join('\n') : '',
  newsOffer: newsOffered.map((x) => `- [${x.id}] ${x.status ?? 'fact'}, ${x.eventDate ?? '?'}${x.who ? `, ${x.who}` : ''}: ${(x.facts_en ?? []).join(' ')} (${(x.sources ?? []).map((s) => s.publisher).filter(Boolean).join(', ')})${x.ka?.twist ? ` · ka: ${x.ka.twist}${x.ka.kicker ? ` ${x.ka.kicker}` : ''}` : ''}`).join('\n'),
  nonce,
  req,
  length,
  letters: String(LETTERS[length]),
  // the text rules (tools/ci/screentext.mjs): text scenes a film at most, scenes a film at least
  textMax: String(TEXT_MAX[length]),
  minScenes: String(minScenes(length, id ?? `${next}x`)),
  // the 3D shots a kit film may have at most (src/lib/kit.mjs MAX_GL_KIT; check GL_LOAD)
  maxGl: String(maxGl(length, id ?? `${next}x`) ?? ''),
  voiceId: VOICES[voice],
  // who the one voice is (the narrator rule in ci/prompt.md, the owner 2026-10-20 on v115: a man's lines in a woman's voice)
  voiceWho: voice === 'f' ? "a woman's voice (Alisa)" : "a man's voice (Nelson)",
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
  screens: FREE
    ? freeScreens.join(', ') || 'none: his words name no feature'
    : carinfo
      ? linkedApps(offered).flatMap((a) => CAT.get(a)?.screens ?? []).join(', ') || 'none: these facts link no app'
      : stories
        ? 'none: a story film never shows the app'
        : (C?.screens ?? []).join(', ') || 'any',
  // the free idea: the features his words name, and their screens (request.json freeFeatures, freeScreens)
  freeFeatures: freeFeatures.length ? freeFeatures.map((f) => `${CAT.get(f).label} (\`${f}\`)`).join(', ') : 'none: his words name no feature, so the film shows no app screen',
  freeScreens: freeScreens.join(', ') || 'none',
  // the aura openings (ci/categories.json "openers".aura)
  auraOffer: AURA ? AURA.formulas.filter((h) => !lastTwo(lib, category, null).formulas.includes(h) && h !== aura.feed?.hook).join(' or ') || AURA.formulas.filter((h) => h !== aura.feed?.hook).join(' or ') || AURA.formulas.join(' or ') : '',
  auraLast: aura.last ?? 'none',
  auraFormulas: AURA ? AURA.formulas.join(', ') : '',
  auraFeedId: aura.feed?.id ?? '',
  auraFeedHook: aura.feed?.hook ?? '',
  'hooks.aura': AURA ? [...AURA.formulas.map((h) => `${h} ${range(new RegExp(`^### ${h} `)).replace('lines ', '')}`), `the truth table and ready openings ${range(/^### Aura truth table /).replace('lines ', '')}`].join(', ') : '',
  // street words (tools/ci/streetwords.mjs, ci/street-words.json)
  streetAllowed: STREET.allowed.join(', '),
  streetBanned: 'ყლე, განდონი',
  streetMax: String(STREET.perFilm?.max ?? 3),
  streetOneIn: String(STREET.frequency?.atMostOneIn ?? 3),
  streetWhy: streetGateNow.why || 'none of the last films said one',
  streetPick: streetPickNow.join(', '),
  streetRecent: streetGateNow.recent.length ? `${streetGateNow.recent.join(', ')} (${streetGateNow.lastId}, the newest film with street words): another word, or none` : 'no film said one yet',
  // the pictures the newest films showed (tools/ci/visual.mjs): compose this film's own
  pictures: picturesText(C ? categoryFilms(category, specsDir, studio, id ? familyOf(id) : null) : [], pageFilms(specsDir, studio, id ? familyOf(id) : null), {
    specOf: (x) => readJson(path.join(specsDir, `${x}.json`), null),
    filmCode: (name) => {
      try {
        return fs.readFileSync(path.join(root, 'src/scenes/film', `${name}.tsx`), 'utf8');
      } catch {
        return null;
      }
    },
  }),
  seen: seenList(),
  counts: counts(),
  avoid: base || FREE ? '' : avoid(),
  visuals: visuals(),
  ideas: ideasList(),
  template: 'src/scenes/film/_template.tsx',
  sigTypes: C ? signatureTypes(C).join(', ') : '',
  newest: lastLooks()[0]?.id ?? 'the newest film',
  rotation: category === 'general' ? rotation() : '',
  copyFrom: copyFrom(),
  // what the owner wants every viewer of this feature to understand (ci/categories.json "explain", 2026-10-12)
  explain: (C?.explain ?? []).map((x) => `     - ${x}`).join('\n'),
  lessonLine: length !== lengthAsked ? ` (the site asked ${lengthAsked} s; a car-knowledge lesson is ${LESSON.min} to ${LESSON.length} s${base ? ', as its original' : ''})` : '',
  record: recordCmd,
  redoNote,
  catsFile: nowRel,
  // the store page (ci/categories.json "storeScreen"): offered now and then, or resting in this film
  storeSrc: STORE_SCREEN?.src ?? '',
  storeRest,
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
  freeWeekLines: freeWeekLines.map((l) => `"${l}"`).join(', '),
  // „ულიმიტოდ" (ci/categories.json "unlimited"): what is true about it, and for which feature
  unlimitedFact: unlimitedText || 'the UNLIMITED fact above',
  // the Story slides (MODE "slides"): the set's id, its own graphic's name, the category's earlier sets
  slidesNext: SLIDES_NEXT,
  // the Highlight cover's icon: the category's own (one icon a topic: his Highlights read as one set), else the set picks it
  slidesIcon: HIGHLIGHT_ICONS[category] ?? '<the icon of what the set is about>',
  slidesIconLine: HIGHLIGHT_ICONS[category]
    ? `\`${HIGHLIGHT_ICONS[category]}\` is ${category}'s own icon, the same on every set of this topic (the render draws it black in the middle of a white field).`
    : 'The icon says what the set is about, one of the app\'s (`src/scenes/kit/icons.tsx` SYM_NAMES: directions_car, speed, local_gas_station, tire_repair, car_battery, oil_barrel, steering_wheel, warning ...); the render draws it black in the middle of a white field.',
  slidesFilm: filmName(`${SLIDES_NEXT}set`).replace(/Set$/, '<Slug>'),
  slidesMade: slidesMade(),
  redoFilm: baseFilm
    ? `Keep its Film scene (${baseFilm}); only when the feedback is about the look, write your own new one as \`src/scenes/film/${id ? filmName(id) : '<Name>'}.tsx\` and record it with \`--idea\`.`
    : `It has no Film scene of its own (it was made before them); write one as \`src/scenes/film/${id ? filmName(id) : '<Name>'}.tsx\` only when the feedback is about the look, and record it with \`--idea\`.`,
  'hooks.rubric': range(/^## 2\. /),
  'hooks.templates': range(/^## 3\. /),
  'hooks.angles': range(/^## 5\. /),
  'hooks.h14': range(/^### H14 /),
  'hooks.buddy': range(/^## Buddy tone /),
  'hooks.stories': range(/^## Story films /),
  'hooks.lesson': range(/^## The lesson /),
  'hooks.formulas': FORMULAS.map((h) => `${h} ${range(new RegExp(`^### ${h} `)).replace('lines ', '')}`).join(', '),
};
const flags = {
  one: ONE, // ONE Story image (a set of one cover slide: ci/slides.md, tools/ci/slides.mjs)
  typed: Boolean(topic || feedback), // the co-founder typed something: the gate (§0) judges it
  redo: Boolean(base),
  random: !topic && !base,
  dice: categoryFrom === 'dice',
  wild: mood === 'wild',
  known: Boolean(C) && !base,
  nocat: !C && !base,
  general: category === 'general' && !base,
  explain: Array.isArray(C?.explain) && C.explain.length > 0 && !base, // the feature's must-understand points (step 1)
  lesson: carinfo && Number(length) >= 45, // a car-knowledge LESSON (45 or 60 s): HOOKS.md, The lesson
  carinfo, // a car-knowledge film: the offered bank facts, the educational structure, the app only when a fact links it
  stories, // a crazy story film: the offered stories, the arc with its twist, the story's own photos, no app
  tips: Boolean(bankOffer?.tips), // the offer is practical tips only ("tipEvery"): a reel-style tip film, opening on a question
  locked: LOCKED.size > 0, // a category waits for the App Store release: the brief names it and its screens
  old: OLD_SCREENS.length > 0, // a release replaced screens (the 1.0.3 home and menu): the brief says never to use them
  catblock: (Boolean(C) && !base) || carinfo || stories, // the category's facts in the brief (a carinfo or stories redo too: its original's)
  follow: ending === 'follow', // this film ends on the follow reminder (tools/ci/ending.mjs)
  freeWeek: freeWeekOn, // this film says the free-week line before its EndCard (a Story set may, on its end slide; ci/endings.json "freeWeek")
  unlimited: unlimited === 'must' || unlimited === 'ask', // its voice says „ულიმიტო" once (ci/categories.json "unlimited"; check UNLIMITED)
  unlimitedAsk: unlimited === 'ask', // ... a free film: his words name such a feature (a note in check, never a refusal)
  unlimitedNo: unlimited === 'never', // an app feature whose facts hold no unlimited: never „ულიმიტო"
  kit, // a film from KIT_FROM on: the promo kit, the promo method, the promos' pace and the stills' self-review
  p2, // a film from P2_FROM on (src/lib/p2.mjs): the phase-2 kit, black and white, the retired parts, the hooks, the store ending
  humor: category === 'humor' && !base, // the „იუმორი" film's acts and rules (tools/ci/humor.mjs)
  humourBank: category === 'humor' && !base && offerHumour(loadHumour(root), newsOffered).length > 0,
  news: newsOffered.length > 0 && ['stories', 'carinfo', 'whatsnew', 'humor', 'free'].includes(category), // the news bank's offer
  free: FREE && !base, // a free idea: his words are the script (the gate's free bullet, step 1's free block)
  freecat: FREE, // a free film, a redo too: no "new problem" block, his opening stays
  aura: Boolean(aura.due), // this film opens with an aura formula (H21, H22)
  auraNot: Boolean(aura.home && !aura.due), // its category's last film opened with one: this one does not
  auraFeed: Boolean(aura.feed), // the page's newest film opened with an aura formula: not that one
  streetOk: streetGateNow.ok, // this film may say a street word where it fits (else none: never two films in a row)
  streetAsk: streetAskNow === 'yes', // he asked for a street-word opening in general words: the hook says one we pick
  streetNo: streetAskNow === 'no', // he asked for none: the film says none, his own included
  storeOk, // the film may show the store page once, where a line is about the app itself or having it (the owner, 2026-10-14)
  storeRest: Boolean(storeRest), // it may not: one of the page's last films showed it
  // the brief does not carry the facts it needs: read the file (no category yet, a general video, or a category
  // marked "allfacts": true, like "whatsnew", whose items keep their own categories' facts)
  allfacts: (!C || category === 'general' || C.allfacts === true) && !base,
};
let out = fs.readFileSync(path.join(root, 'ci/prompt.md'), 'utf8').replace(/^<!--[\s\S]*?-->\n*/, '');
if (MODE === 'slides') {
  // the Story slides' own brief, with the film brief's §0 gate where its marker is (one gate for both)
  const gate = /\{\{#typed\}\}## 0\. Gate[\s\S]*?\n\n\{\{\/typed\}\}/.exec(out)?.[0];
  if (!gate) die(1, 'ci/prompt.md has no §0 gate block for the slides brief');
  out = fs.readFileSync(path.join(root, 'ci/slides.md'), 'utf8').replace(/^<!--[\s\S]*?-->\n*/, '').replace('<!--GATE-->', gate);
}
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
      req, mode: MODE, ...(MODE === 'slides' ? {slidesNext: SLIDES_NEXT, ...(ONE ? {one: true} : {})} : {}), topic, category, categoryFrom, length: Number(length), freeWeek: freeWeekOn, unlimited, ...(length !== lengthAsked ? {lengthAsked: Number(lengthAsked), lengthFrom: 'lesson'} : {}), voice, voiceId: VOICES[voice], mood, feedback, base: base || null, baseId, baseTheme, baseTopic,
      baseHook, baseAngle, baseIdea: flat(baseEntry.idea) || null,
      baseFeatures: Array.isArray(baseEntry.features) ? baseEntry.features : null,
      baseFacts: Array.isArray(baseEntry.facts) ? baseEntry.facts : null, offered: storyOffer ? storyOffer.stories.map((s) => s.id) : offered.map((f) => f.id), id, next, ending,
      store: STORE, locked: [...LOCKED.keys()], lockedScreens: LOCKED_SCREENS, oldScreens: OLD_SCREENS,
      coverAllowed: COVER_PLAN.allowed, coverAssets: COVER_PLAN.assets, coverTone: COVER_PLAN.tone, recentCovers: COVER_PLAN.recent,
      categoryNeedsTopic: FREE, freeFeatures, freeScreens,
      storeScreen: STORE_SCREEN ? {src: STORE_SCREEN.src, ok: base ? storeFits : storeOk, why: storeWhy, rest: storeShownBy, get: STORE_SCREEN.get} : null,
      ...(AURA && !base && C ? {auraDue: Boolean(aura.due), auraFeed: aura.feed ?? null} : {}),
      street: {ok: streetGateNow.ok, recent: streetGateNow.recent, lastId: streetGateNow.lastId},
    },
    null,
    1,
  )}\n`,
);
writeAtomic(nowFilePath, nowFile(APPLIED));
// a phase-2 film's reading, cut for it (tools/ci/catalog.mjs, r3-cost): the brief's "Read only this" names the two files
if (MODE !== 'slides' && p2) writeCatalog({stories: flags.stories, carinfo: flags.carinfo, humor: flags.humor, wild: flags.wild, aura: flags.aura});
process.stdout.write(out);
