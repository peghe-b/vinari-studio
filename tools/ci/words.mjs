// The words a film leans on, for two rules against repetition (the owner, 2026-10-05: a diagnostics film said the
// Russianism "ხოდოვოი" in line after line, and he hated it: "always new and varied").
//   repeats(spec)          a content word said or written in too many lines of ONE film (build-index warns: REPEAT)
//   keyWords(spec)         the words a film leans on: in two lines or more, or in its opening line or cover title
//   recentKeys(...)        the key words of the category's last films (the brief lists them; build-index warns on a
//                          new film that leans on several of them again: KEYWORDS)
//   BANNED, bannedIn(spec) the words banned outright („ხოდოვოი" and the Russianisms): build-index warns (BANNED_WORD),
//                          and check.mjs stops the cloud check on one before the voice
//   postEcho(spec)         the post retold from the voice (the owner, 2026-10-07): a run of ECHO_RUN content words in the
//                          voice's order, or more than half of its content words from the voice: POST_ECHO (build-index
//                          warns, --record refuses, check.mjs stops the cloud check before the voice)
//   unlimitedRule(cat, ...) „ულიმიტოდ" (the owner, 2026-10-15: the word sells; 2026-10-21: in EVERY film about an app
//                          feature): 'must' for a category whose facts hold a true UNLIMITED fact (ci/categories.json
//                          "unlimited": true), 'never' for an app feature whose facts do not; unlimitedProblems(spec, rule):
//                          UNLIMITED lines (check.mjs, fatal in the cloud before the voice; tools/ci/prompt.mjs briefs it)
// A word is compared by a rough stem: Georgian case endings and the "-ც" / "-ო" particles cut off, so "საბურავი",
// "საბურავის" and "საბურავებზე" count as one word. Verbs keep their prefixes (a different verb stays different).
// Short words (under 4 letters after the cut), function words and number words never count.
// Read by tools/build-index.mjs and tools/ci/prompt.mjs; never imports anything of the film's.
import fs from 'node:fs';
import path from 'node:path';

// case endings, longest first (the plural "-ებ-" with its case, then the singular cases)
const SUFFIXES = ['ებისთვის', 'ისთვის', 'ებიდან', 'ებისგან', 'ებთან', 'ისგან', 'იდან', 'სთვის', 'ებში', 'ებზე', 'ებით', 'ების', 'ებად', 'ებმა', 'სთან', 'ამდე', 'ებს', 'ები', 'ში', 'ზე', 'ით', 'ის', 'ად', 'მა', 'ს', 'ი'];
const VOWELS = new Set(['ა', 'ე', 'ი', 'ო', 'უ']);
const len = (s) => [...s].length;
/** The rough stem of one lower-case word. */
export const stem = (word) => {
  let w = String(word).toLowerCase();
  if (/^[ა-ჿ]+$/.test(w)) {
    // the "also" and quote particles: ბარათიც, მანქანაც, გაიღუნაო
    if (len(w) >= 5 && /[აეიოუ][ცო]$/.test(w)) w = w.slice(0, -1);
    for (const s of SUFFIXES) {
      if (w.endsWith(s) && len(w) - len(s) >= 3) {
        w = w.slice(0, -s.length);
        break;
      }
    }
    if (len(w) >= 5 && VOWELS.has(w.at(-1))) w = w.slice(0, -1);
  }
  return w;
};
// function words, pronouns and everyday adverbs (as stems): they carry no idea of their own
const STOP = new Set(
  ('თვითონ ახლა მერე ყველ ყველაფერ ყველგან აღარ ისევ უკვე რამდენ ამას იმას ამის იმის ამით იმით ამიტომ იმიტომ პირდაპირ ' +
    'ცოტა ბევრ სხვა უნდა რაღაც არაფერ ვერაფერ როგორ რამე არაა ზუსტ ბოლო მთელ სადღაც ადრე პირველ მეორ მესამ თავის თავად ' +
    'კიდევ მაინც მხოლოდ მარტო ძალიან უფრო თუმცა მაგრამ როცა სადაც რატომ არის იყო აქვს ჰქონდა შენი ჩემი ჩვენ ჩვენი თქვენ ' +
    'ორივ ასეთ ისეთ ამგვარ ერთად ერთხელ მაშინ სანამ თორემ ხოლო ანუ თუკი ოღონდ ზოგჯერ ხშირად ყოველთვის არასდროს ' +
    'სულაც ნამდვილად თითქმის მთავარ კარგ ცუდ დიდ პატარ ახალ ძველ ერთნაირ სწორ ვინც რომელიც რომელ რაც სადამდე დილა საღამო ' +
    'შეიძლებ შეგიძლი გინდ იცი იცოდ გახსოვ აქედან იქიდან აქამდე დღევანდელ ხვალ გუშინ წელს')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => [w, stem(w)]), // as written and as stemmed: "ყოველთვის" is "ყოველთვ" once cut
);
// a word made only of number parts (ოთხმოცდაშვიდი, თხუთმეტი, ექვსასი): a figure, never "a word repeated"
const NUMBER = /^(?:ერთ|ორ|სამ|ოთხ|ხუთ|ექვს|შვიდ|რვა|ცხრა|ათ|ოც|მოც|ას|ათას|მეტ|და|თერთ|თორ|ცა|თოთხ|თხუთ|თექვს|ჩვიდ|თვრა|მილიონ|მილიარდ|ნახევარ)+$/;
/** True when the stem can count as a content word. */
export const counts = (st) => len(st) >= 4 && !STOP.has(st) && !NUMBER.test(st);
/** The content words of a text: [{word, stem}] (Georgian and Latin words; Latin only from 3 letters). A number word
 *  is tested as written too: "ოთხას" stems to "ოთხა", which no longer reads as a number. */
export const contentWords = (text) =>
  (String(text ?? '').match(/[ა-ჿ]+|[A-Za-z]{3,}/g) ?? []).map((w) => ({word: w.toLowerCase(), stem: stem(w)})).filter((x) => counts(x.stem) && !NUMBER.test(x.word));

// ---- the bleep (the owner, 2026-10-15: "the rudeness is good: when a swear is said, the taboo, the bleep, is good") -------
// A voice line may cut off ONE heavy swear: „რა ტვინი მომი{bleep:ტყნეს}". The voice says only the part before the
// marker (tools/vo.py sends „მომი..." and never the hidden part), a 1 kHz bleep starts where the take stops, and the
// subtitle shows the kept part, „#@%" and the hidden word's last 2 letters: „მომი#@%ეს". The marker ends its "|" chunk.
// The policy (which words, how many, from which film on) is ci/street-words.json "censor" (tools/ci/streetwords.mjs).
export const CENSOR_MARK = /\{bleep:([^{}|]*)\}/gu;
export const CENSOR_GLYPHS = '#@%';
/** The markers of a text: [{hidden, index, length}]. */
export const censorsIn = (text) => [...String(text ?? '').matchAll(CENSOR_MARK)].map((m) => ({hidden: m[1], index: m.index, length: m[0].length}));
/** What a viewer reads: every marker as „#@%" + the hidden word's last 2 letters. */
export const censorShown = (text) => String(text ?? '').replace(CENSOR_MARK, (_, h) => CENSOR_GLYPHS + [...h.trim()].slice(-2).join(''));
/** What the voice says: every marker as „..." (the take trails off there; the hidden part is never sent). */
export const censorSaid = (text) => String(text ?? '').replace(/\{bleep:[^{}|]*\}[\s.,!?…:;]*/gu, '...');

// ---- banned words ----------------------------------------------------------------------------------------------
// Banned outright (the owner, 2026-10-05: a diagnostics film said "ხოდოვოი" line after line, and he hated it; the
// Russianisms of "Say it simply" with it). Whole words for the short ones ("ტიპი" is Georgian, "ტიპა" is not).
// [pattern, what to say instead]
export const BANNED = [
  [/[\u10D0-\u10FF]*(?:ხოდოვ|ხადავ|ხოდავ|хадов|ходов)[\u10D0-\u10FF\u0400-\u04FF]*/iu, '"სავალი ნაწილი" (its mechanic: "სავალი ნაწილის ხელოსანი")'],
  // „ძმაო" is Georgian and the owner's buddy tone wants it (2026-10-06); the Russianisms stay banned ("სისულელე")
  [/(?<![\u10D0-\u10FF])(?:ვაფშე|კაროჩე|ტიპა|ბრატ|ბრატო)(?![\u10D0-\u10FF])/u, 'plain Georgian (docs/content.md, Say it simply: no Russianisms)'],
];
/** Every banned word a viewer hears or reads, once per place: [{where, word, plain}]. The cover, each beat's say, show,
 *  meta and scene text, and the post. */
export const bannedIn = (spec) => {
  const out = [];
  const seen = new Set();
  const walk = (v, where) => {
    if (typeof v === 'string') {
      for (const [re, plain] of BANNED) {
        const m = re.exec(censorShown(v));
        const key = `${where}|${m?.[0]}`;
        if (!m || seen.has(key)) continue;
        seen.add(key);
        out.push({where, word: m[0], plain});
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  const cover = spec?.cover && typeof spec.cover === 'object' ? spec.cover : {};
  for (const k of ['title', 'tag', 'sub']) walk(cover[k], `cover.${k}`);
  (Array.isArray(spec?.beats) ? spec.beats : []).forEach((b, i) => {
    for (const k of ['say', 'show', 'meta', 'scene']) walk(b?.[k], `beats[${i}].${k}`);
  });
  walk(spec?.post, 'post');
  return out;
};

// ---- one film ----------------------------------------------------------------------------------------------------
// keys of a scene that never hold text the viewer reads
const NOT_TEXT = new Set(['type', 'name', 'src', 'staging', 'tone', 'format', 'shot', 'seed', 'stance', 'mode', 'move', 'grade', 'stripStyle', 'aspect', 'models', 'pick']);
const sceneTexts = (sc) => {
  const out = [];
  const walk = (v, k) => {
    if (typeof v === 'string') {
      if (!NOT_TEXT.has(k) && /[ა-ჿ]/.test(v)) out.push(v.replace(/\s*\|\s*/g, ' '));
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, k));
    else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk(x, kk);
  };
  walk(sc ?? {}, '');
  return out;
};
/** The lines of a film a viewer hears or reads, once each: every spoken sentence, every distinct text a scene draws,
 *  and the cover title. `skip(text)`: a line left out (the follow reminder that ends every second film: its words
 *  come back by design). */
export const filmLines = (spec, skip = () => false) => {
  const lines = [];
  const seen = new Set();
  const add = (where, text) => {
    const t = String(text ?? '').trim();
    const k = t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (!k || seen.has(k) || skip(t)) return;
    seen.add(k);
    lines.push({where, text: t});
  };
  (Array.isArray(spec?.beats) ? spec.beats : []).forEach((b, i) => {
    const say = censorShown(b?.say).replace(/\s*\|\s*/g, ' ');
    if (skip(say)) return;
    say.split(/(?<=[.?!:;])\s+/).forEach((x) => add(`beats[${i}].say`, x));
    if (b?.scene && b.scene.type !== 'EndCard') sceneTexts(b.scene).forEach((x) => add(`beats[${i}].scene`, x));
  });
  if (spec?.cover && typeof spec.cover === 'object') add('cover.title', String(spec.cover.title ?? '').replace(/\s*\|\s*/g, ' '));
  return lines;
};
export const REPEAT_LINES = 4; // a content word in this many lines of one film is said too often
// ... in a 15 to 30 s film; a 45 or 60 s film says more lines (a car-knowledge lesson explains ONE thing over 12 to 16
// sentences, 2026-10-12), so its bar rises with its length class (tools/ci/screentext.mjs lengthClass)
export const REPEAT_BY_LENGTH = {15: 4, 20: 4, 30: 4, 45: 5, 60: 6};
export const repeatMin = (len) => REPEAT_BY_LENGTH[Number(len)] ?? REPEAT_LINES;
/** Content words in REPEAT_LINES lines or more: [{stem, word (its first form), n, where: [...]}], most first. */
export const repeats = (spec, {skip, exempt = () => false, min = REPEAT_LINES} = {}) => {
  const by = new Map();
  for (const l of filmLines(spec, skip)) {
    const inLine = new Set();
    for (const {word, stem: st} of contentWords(l.text)) {
      if (inLine.has(st) || exempt(word, st)) continue;
      inLine.add(st);
      const e = by.get(st) ?? {stem: st, word, n: 0, where: []};
      e.n += 1;
      e.where.push(l.where);
      by.set(st, e);
    }
  }
  return [...by.values()].filter((e) => e.n >= min).sort((a, b) => b.n - a.n);
};
/** The words a film leans on: Map stem -> its first form. A content word in two lines or more, or any content word of
 *  its opening line (the first beat's say) or cover title. */
export const keyWords = (spec, {skip, exempt = () => false} = {}) => {
  const n = new Map();
  const form = new Map();
  const lead = new Set();
  for (const l of filmLines(spec, skip)) {
    const inLine = new Set();
    for (const {word, stem: st} of contentWords(l.text)) {
      if (exempt(word, st) || inLine.has(st)) continue;
      inLine.add(st);
      n.set(st, (n.get(st) ?? 0) + 1);
      if (!form.has(st)) form.set(st, word);
      if (l.where === 'beats[0].say' || l.where === 'cover.title') lead.add(st);
    }
  }
  return new Map([...form.entries()].filter(([st]) => n.get(st) >= 2 || lead.has(st)));
};

// ---- the category's last films -----------------------------------------------------------------------------------
const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id))?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, '');
/** What a category exempts: words that ARE the category (its "words" patterns: "კალენდარ" in a reminders film is the
 *  subject, not a repeat) and the brand. A category with a fact bank (carinfo) exempts only the brand: its films
 *  change subject from film to film, and the subject words are exactly what must not come back. */
export const exemptFor = (cat) => {
  const pats = cat && !cat.bank
    ? (cat.words ?? []).flatMap((w) => {
        try {
          return [new RegExp(w, 'iu')];
        } catch {
          return [];
        }
      })
    : [];
  // „ულიმიტო" too: every film of a feature with a true UNLIMITED fact says it (unlimitedRule), so it is never a repeat
  return (word, st) => /^ვინარ|^vinari/u.test(st) || /^მანქან/u.test(st) || UNLIMITED_WORD.test(st) || pats.some((re) => re.test(word));
};
export const RECENT_FILMS = 5; // the films of a category whose key words the next film avoids
export const KEY_OVERLAP = 3; // a film leaning on this many of them again is warned
/** The category's last `n` films before `beforeId` (by number; a redo counts as its original, the film's own family
 *  is left out), newest first: [{id, words: Map stem -> form}]. Base Georgian specs only. */
export const recentKeys = (category, specsDir, {beforeId = null, n = RECENT_FILMS, skip, exempt} = {}) => {
  const limit = beforeId ? vNumber(beforeId) : Infinity;
  const own = beforeId ? familyOf(beforeId) : null;
  const fams = new Map();
  for (const f of fs.readdirSync(specsDir)) {
    if (!/^v\d+-[a-z0-9-]+\.json$/.test(f) || /--h\d+\.json$/.test(f)) continue;
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
    } catch {
      continue;
    }
    if (spec?.category !== category || (spec.lang ?? 'ka') !== 'ka' || typeof spec.id !== 'string') continue;
    const v = vNumber(spec.id);
    if (!v || v >= limit || familyOf(spec.id) === own) continue;
    const fam = familyOf(spec.id);
    const prev = fams.get(fam);
    // a family's newest version speaks for it
    if (!prev || spec.id > prev.id) fams.set(fam, {id: spec.id, v, spec});
  }
  return [...fams.values()]
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => ({id: x.id, words: keyWords(x.spec, {skip, exempt})}));
};
/** The key words of `spec` that the recent films leaned on too: [{stem, word, ids}]. */
export const sharedKeys = (spec, recent, {skip, exempt} = {}) => {
  const mine = keyWords(spec, {skip, exempt});
  const out = [];
  for (const [st, word] of mine) {
    const ids = recent.filter((r) => r.words.has(st)).map((r) => r.id);
    if (ids.length) out.push({stem: st, word, ids});
  }
  return out;
};

// ---- the post never retells the film (the owner, 2026-10-07, on v79's post: "it says exactly what the video says; it
// should be written somewhat differently, so it doesn't read as slop that copies the video word for word") ----------
// v79's description was its voice retold: every content word of it came from the voice. POST_ECHO: build-index warns,
// check.mjs stops the cloud check on it before the voice (a note on the Mac), `--record` refuses it.
export const ECHO_RUN = 4; // this many content words in a row, in the voice's order: copied
export const ECHO_SHARE = 0.5; // more than this share of the post's content words come from the voice: retold
export const ECHO_MIN = 4; // ... counted only when the post has this many content words (names and the brand left out)
const chars = (s) => [...s];
/** Two stems are the same word: equal, one the other's start (4 letters at least: "სტარტ", "სტარტზე"), or the first 6
 *  letters shared (a verb's other ending). */
export const sameWord = (a, b) => {
  if (a === b) return true;
  const [s, l] = len(a) <= len(b) ? [a, b] : [b, a];
  if (len(s) >= 4 && l.startsWith(s)) return true;
  const A = chars(a);
  const B = chars(b);
  let k = 0;
  while (k < A.length && k < B.length && A[k] === B[k]) k++;
  return k >= 6;
};
/** The post's echo of the voice, or null when it says something of its own: {share, n, from: [the post's words that
 *  come from the voice], run: [the longest run in the voice's order, when it is ECHO_RUN or more]}. `skip(text)`: a
 *  beat left out (the follow line); `exempt(word, stem)`: a word that is no echo (a story's names: the post names the
 *  person too). The brand, "მანქანა" and „ულიმიტო" (every feature film says it) never count. */
export const postEcho = (spec, {skip = () => false, exempt = () => false} = {}) => {
  const d = spec?.post?.description;
  if (typeof d !== 'string' || !d.trim()) return null;
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const voice = beats.map((b) => censorShown(b?.say).replace(/\s*\|\s*/g, ' ')).filter((t) => t.trim() && !skip(t));
  const VW = voice.flatMap((t) => contentWords(t));
  const V = VW.map((w) => w.stem);
  if (!V.length) return null;
  const D = contentWords(d);
  const inVoice = (st) => V.some((v) => sameWord(v, st));
  const own = (w) => !/^ვინარ|^vinari|^მანქან|^ულიმიტ/u.test(w.stem) && !exempt(w.word, w.stem);
  const mine = [...new Map(D.filter(own).map((w) => [w.stem, w])).values()];
  const from = mine.filter((w) => inVoice(w.stem));
  // the longest run of the post's words that the voice says in the same order, the names left out on both sides: a
  // post that names a person the way the voice does („ენცო ფერარი, ფერარის პატრონი", the brief's own model) copies nothing
  const named = (w) => exempt(w.word, w.stem);
  const DR = D.filter((w) => !named(w));
  const VR = VW.filter((w) => !named(w)).map((w) => w.stem);
  let run = [];
  for (let i = 0; i < DR.length; i++)
    for (let j = 0; j < VR.length; j++) {
      let k = 0;
      while (i + k < DR.length && j + k < VR.length && sameWord(DR[i + k].stem, VR[j + k])) k++;
      if (k > run.length) run = DR.slice(i, i + k);
    }
  const share = mine.length ? from.length / mine.length : 0;
  const echo = run.length >= ECHO_RUN || (mine.length >= ECHO_MIN && share > ECHO_SHARE);
  return echo ? {share, n: mine.length, from: from.map((w) => w.word), run: run.length >= ECHO_RUN ? run.map((w) => w.word) : []} : null;
};
/** The POST_ECHO line for an echo, or null. */
export const postEchoLine = (echo) =>
  echo
    ? `POST_ECHO post.description retells the film: ${echo.from.length} of its ${echo.n} words come from the voice (${echo.from.join(', ')})${echo.run.length ? `, and "${echo.run.join(' ')}" is the voice word for word` : ''}. Write what the film did NOT say, in your own words: a detail of the facts it left out, the context, your own take, or one question for the comments`
    : null;

// ---- „ულიმიტოდ" (the owner, 2026-10-15: "the word ულიმიტო sells"; 2026-10-21: in EVERY film about an app feature) -------
// ci/categories.json "unlimited": true marks a category whose facts hold a TRUE "UNLIMITED" fact (the app sets no limit
// there: parking, the VIN scanner, diagnostics, the OBD scanner, the navigator; general and whatsnew from 1.0.5); read it
// with the App Store gate applied (tools/ci/release.mjs applyRelease), since general's and whatsnew's sit in "after"
// blocks. From film "unlimitedFrom" on (a redo shares its original's number, so an older film keeps its words):
//   'must'  a film of such a category says a form of „ულიმიტო" in at least one line of its voice (once, naturally)
//   'ask'   a free film (the free idea) whose words name such a feature: asked for in the brief, a note only (his words are
//           the script)
//   'never' an app feature whose facts hold none (the QR card: its messages a day are limited; the calendar, the widgets,
//           the auction, the documents): its voice never says it, since that would claim what the app limits or never said
//   null    crazy stories, car knowledge, the free idea, general and whatsnew before 1.0.5: their own words, unchecked
export const UNLIMITED_WORD = /ულიმიტ/u;
/** The beats whose voice says a form of „ულიმიტო" (ულიმიტო, ულიმიტოდ, ულიმიტოა ...): [i, ...] */
export const unlimitedSaid = (spec) => (Array.isArray(spec?.beats) ? spec.beats : []).flatMap((b, i) => (b && UNLIMITED_WORD.test(String(b.say ?? '')) ? [i] : []));
/** The category's UNLIMITED fact without its rule prefix (what is true), or '' */
export const unlimitedFact = (cat) => {
  const f = (Array.isArray(cat?.facts) ? cat.facts : []).find((x) => typeof x === 'string' && /^UNLIMITED\b/.test(x));
  return f ? f.replace(/^UNLIMITED.*?check: UNLIMITED\):\s*/, '').replace(/^UNLIMITED \([^)]*\):\s*/, '') : '';
};
/** What film number n of category `cat` (the gate applied) does with „ულიმიტო": 'must', 'ask', 'never' or null (above).
 *  from: ci/categories.json "unlimitedFrom"; named: a free film's named feature categories (the gate applied). */
export const unlimitedRule = (cat, {n = 0, from = Infinity, named = []} = {}) => {
  if (!cat || !(Number(n) >= from)) return null;
  if (cat.unlimited === true) return 'must';
  if (cat.needsTopic) return named.some((c) => c?.unlimited === true) ? 'ask' : null;
  if (cat.feature === false || cat.bank) return null;
  return 'never';
};
/** What is wrong with the film's „ულიმიტო", one "UNLIMITED ..." line each, or []. fact: what is true (unlimitedFact),
 *  label: the feature's name. */
export const unlimitedProblems = (spec, rule, {fact = '', label = ''} = {}) => {
  const said = unlimitedSaid(spec);
  const what = label || 'this feature';
  if ((rule === 'must' || rule === 'ask') && !said.length)
    return [`UNLIMITED no line of the voice says „ულიმიტო" (the owner, 2026-10-21: every film about ${what} says it, the word sells): say a form of it (ულიმიტოდ, ულიმიტო, ულიმიტოა) once, naturally, a whole short line or inside a line, true to the fact${fact ? `: ${fact}` : ''}`];
  if (rule === 'never')
    return said.map((i) => `UNLIMITED beats[${i}].say says „ულიმიტო" ("${String(spec.beats[i].say).replace(/\s*\|\s*/g, ' ')}"), but the facts of ${what} hold no such thing (the app limits it or never says so; the QR card's messages a day are limited): take it out`);
  return [];
};

// ---- the owner's text rules (2026-09-24), shared by tools/build-index.mjs and tools/ci/slides.mjs -----------------------
// Separators people put inside a name: "app store", "app-store", "my.auto", "ეპ სტორი".
export const SP = '[\\s._\\-·]*';
// Never write or say the listing site's name (myauto.ge, MYAUTO, მაიავტო ...), in any string of any
// spec: say "ცოცხალი განცხადებები" or "ბაზარი". An error in every spec, demos included.
export const MYAUTO = new RegExp(`my${SP}auto(?![a-z])|მაი${SP}(?:ავტო|აუტო)|май${SP}авто`, 'iu');
// No call to action (owner, 2026-09-24): a store line, "download" or "install" reads as a pitch. A
// video ends on the quiet EndCard with a punchline or a callback. ka / en / ru, spaced or not.
export const CTA = new RegExp(
  [
    `(?:ეპ|აპ|ეპლ)${SP}სტორ`, `app${SP}store`, `play${SP}(?:store|market)`, `google${SP}play`, `გუგლ${SP}პლეი`, `პლეი${SP}(?:სტორ|მარკეტ)`,
    `эп${SP}стор`, `апп?${SP}стор`, `гугл${SP}плей`, `плей${SP}(?:маркет|стор)`,
    'გადმოწერ', 'გადმოიწერ', 'ჩამოტვირთ', 'ჩამოიტვირთ', 'ინსტალ', 'ლინკი? ბიო', 'ბმული ბიო',
    'download', '\\binstall(?![a-z])', `get${SP}(?:the${SP}app|it${SP}on)`, `link${SP}in${SP}(?:the${SP})?bio`,
    'скача', 'скачи', 'загрузи(?:те)?(?!\\p{L})', 'установи(?:те)?(?!\\p{L})', 'ссылк\\p{L}*\\s+в\\s+(?:био|профил)',
  ].join('|'),
  'iu',
);
// Softer pushes and fake urgency: a warning (HOOKS.md: no "ახლავე", no "დღესვე").
export const PUSHY = /ახლავე|დღესვე|სცადე|სანამ\s+გვიანაა|try\s+(?:it|vinari|the\s+app)|right\s+now|попробуй|прямо\s+сейчас/iu;
