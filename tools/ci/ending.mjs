// How a film ends: a closing line (since 2026-10-06 a punchline or a callback, never an aphorism) on the quiet EndCard, or, on every second film, the follow reminder (the
// owner, 2026-09-29: people forget to follow the page; 2026-10-02: every second film from v63, and the line first asks
// to comment the keyword „ვინარი“ for the app's link, then to follow). ci/endings.json holds the rule and the lines.
//
// The rule is deterministic: film number n (the "v<n>-" of its id) is a follow film when n >= from and
// (n - from) % every === 0 (from 63, every 2: v63, v65, v67 ...). The number is fixed before the film is written
// (tools/ci/prompt.mjs "next", pinned by tools/ci/resolve.mjs), so a retried run gets the same ending. A redo
// (v44-x-r1) keeps its original's ending, read from the original's tagline. Hook variants and translations copy their
// base spec, and a demo never ends on it. It counts films made, not films posted.
// What a film's ending IS is always read from its spec: an EndCard tagline that is a line of "follow" or "retired".
//
// The line: exactly one of "follow", as the EndCard tagline and the last beat's say and show, word for word (the card
// shows it, so Promo drops its subtitle), with no "style" of its own (a second Gemini request) and no VINARI+ or price
// note under it (next to "follow" that reads as selling the paid plan, whose Georgian name is also "გამოწერა"). Never
// one of the last "recent" distinct lines earlier films ended on (all categories together); the least recently used
// is offered first. Nowhere else: not another beat, the cover or the post, and never a free-form reminder. A line over
// 26 characters breaks into two lines on the card at a "|" (cardLine() places it at the best space; a "|" in the bank
// sets it by hand). Keep each line short (LINE_LETTERS, about 4.5 s of voice): it takes the E slot of a quote and a
// little more.
//
// Read by tools/ci/prompt.mjs (the brief, --record), tools/check.mjs (before the voice), tools/build-index.mjs and
// tools/ci/publish.mjs (the ledger's "ending"); tools/ci/music.mjs counts films the same way (vNumber, nextFree).
//   node tools/ci/ending.mjs [<id>]      the ending of that film (default: the next free number) and, for a follow
//                                        film, the lines it may end on. The Mac's /video skill runs it.
//   node tools/ci/ending.mjs --gate <id> the studio workflow's gate step, after the Claude step (which may have left an
//                                        ENDING line after its fix rounds): a reminder outside the ending stops the
//                                        run before the voice (build-index would stop the render on it anyway); a
//                                        wrong ending is a warning on the run, since a film always comes out.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ONE_LINE = 26; // a tagline over this many characters breaks in two on the card (build-index TAGLINE_MAX.ka)
export const CARD_LINE_MAX = 34; // one line of a two-line tagline (the comment ask, 2026-10-02; the card shrinks it to 720 px)
export const LINE_LETTERS = 52; // a bank line's letters at most: about 4.5 s at HOOKS.md's 11.5 letters a second (comment ask + follow)
export const letters = (s) => [...String(s ?? '').replace(/[^\p{L}]/gu, '')].length;

export const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id ?? ''))?.[1] ?? 0);
const redoNumber = (id) => Number(/-r(\d+)$/.exec(String(id ?? ''))?.[1] ?? 0);
/** The next free film, "v<n>-<slug>", as tools/ci/prompt.mjs finds it: past every spec and both ledgers. */
export const nextFree = (specsDir) => {
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
    } catch {
      return null;
    }
  };
  let files = [];
  try {
    files = fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
  } catch {}
  const ids = [...files.map((f) => f.slice(0, -5)), ...(read('.themes.json')?.videos ?? []).map((v) => v?.id), ...Object.values(read('.studio.json') ?? {}).map((v) => v?.id)];
  return `v${Math.max(0, ...ids.filter(Boolean).map(vNumber)) + 1}-<slug>`;
};
export const familyOf = (id) => String(id ?? '').replace(/-r\d+$/, '');
// the same words, whatever the punctuation, case or "|" breaks (as prompt.mjs compares lines)
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** ci/endings.json, checked. No file or no lines: no film ends on the reminder. */
export const loadEndings = (base = root) => {
  let j = null;
  try {
    j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'endings.json'), 'utf8'));
  } catch {}
  const lines = (a) => (Array.isArray(a) ? a.filter((s) => typeof s === 'string' && norm(s)).map((s) => s.replace(/\s+/g, ' ').trim()) : []);
  const int = (v, min, fallback) => (Number.isInteger(v) && v >= min ? v : fallback);
  const follow = lines(j?.follow);
  return {
    from: follow.length ? int(j?.from, 1, Infinity) : Infinity,
    every: int(j?.every, 1, 2),
    recent: Math.min(int(j?.recent, 0, 4), Math.max(0, follow.length - 1)), // at least one line is always free
    follow,
    retired: lines(j?.retired),
    // the first paragraph of every Georgian film's post text (tools/ci/publish.mjs), the owner 2026-10-02
    postLine: typeof j?.postLine === 'string' ? j.postLine.replace(/\s+/g, ' ').trim() : '',
  };
};

/** 'follow' or 'quote' for film number n. */
export const endingOfNumber = (n, cfg) => (Number.isFinite(n) && n >= cfg.from && (n - cfg.from) % cfg.every === 0 ? 'follow' : 'quote');
/** The follow films from film n on (n itself included): [n1, n2, ...]. */
export const nextFollow = (n, cfg, count = 3) => {
  if (!Number.isFinite(cfg.from)) return [];
  let k = Math.max(n, cfg.from);
  k += (cfg.every - ((k - cfg.from) % cfg.every)) % cfg.every;
  return Array.from({length: count}, (_, i) => k + i * cfg.every);
};
/** "1 film in 3 from v44: v44, v47, v50 ..." */
export const ruleText = (cfg) => (Number.isFinite(cfg.from) ? `1 film in ${cfg.every} from v${cfg.from}: ${nextFollow(cfg.from, cfg).map((k) => `v${k}`).join(', ')} ...` : 'no film (ci/endings.json has no lines)');

const bank = (cfg) => [...cfg.follow, ...cfg.retired];
/** A line of the bank (or a retired one), whatever its punctuation or "|". */
export const isFollowLine = (s, cfg) => {
  const k = norm(s);
  return Boolean(k) && bank(cfg).some((l) => norm(l) === k);
};

/** The EndCard's tagline (the last scene's), or ''. */
export const taglineOf = (spec) => {
  const end = [...(Array.isArray(spec?.beats) ? spec.beats : [])].reverse().find((b) => b?.scene)?.scene;
  return end?.type === 'EndCard' && typeof end.tagline === 'string' ? end.tagline : '';
};
/** What a film's ending is, read from its spec. */
export const endingOfSpec = (spec, cfg) => (isFollowLine(taglineOf(spec), cfg) ? 'follow' : 'quote');

/** The line as the card shows it: a line over ONE_LINE characters breaks in two at the best space ("a | b"). */
export const cardLine = (line) => {
  const s = String(line ?? '').replace(/\s+/g, ' ').trim();
  if (s.includes('|') || [...s].length <= ONE_LINE) return s;
  const words = s.split(' ');
  const len = (a) => [...a.join(' ')].length;
  let best = null;
  for (let k = 1; k < words.length; k++) {
    // never a line that ends on a conjunction ("... და | გამოწერა ...")
    if (/^(?:და|თუ|რომ|ან|მაგრამ|თორემ)$/u.test(words[k - 1])) continue;
    const longer = Math.max(len(words.slice(0, k)), len(words.slice(k)));
    // right after a comma or a full stop reads best, as long as that line still fits
    const score = longer - (/[,.?:;]$/.test(words[k - 1]) && longer <= ONE_LINE ? 100 : 0);
    if (!best || score < best.score) best = {score, k};
  }
  return best ? `${words.slice(0, best.k).join(' ')} | ${words.slice(best.k).join(' ')}` : s;
};

// ---- the history: which lines earlier films ended on --------------------------------------------------------------
// base Georgian specs only (no demo, hook variant or translation), in film order
const TRANSLATION = /\.(?:en|ru)$/;
export const baseSpecs = (specsDir) => {
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(specsDir);
  } catch {}
  for (const f of files) {
    if (!f.endsWith('.json') || f.startsWith('.') || f.startsWith('demo-') || /--h\d+\.json$/.test(f) || TRANSLATION.test(f.slice(0, -5))) continue;
    let spec = null;
    try {
      spec = JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
    } catch {}
    if (!spec || typeof spec.id !== 'string' || (spec.lang ?? 'ka') !== 'ka' || !vNumber(spec.id)) continue;
    out.push(spec);
  }
  return out.sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id) || a.id.localeCompare(b.id));
};
/** The follow films before film n (another family's), oldest first: [{id, key}] (key: the line's words). */
export const followHistory = (specsDir, cfg, n = Infinity, exceptFamily = null) =>
  baseSpecs(specsDir)
    .filter((s) => vNumber(s.id) < n && familyOf(s.id) !== exceptFamily)
    .flatMap((s) => {
      const t = taglineOf(s);
      return isFollowLine(t, cfg) ? [{id: s.id, key: norm(t)}] : [];
    });
/** The last `recent` distinct lines of that history (their keys), newest first. */
export const recentKeys = (history, cfg) => {
  const keys = [];
  for (let i = history.length - 1; i >= 0 && keys.length < cfg.recent; i--) if (!keys.includes(history[i].key)) keys.push(history[i].key);
  return keys;
};
/** The lines a follow film may end on, as the card shows them: never used first, then the least recently used. */
export const offerLines = (cfg, history) => {
  const recent = recentKeys(history, cfg);
  const last = new Map(history.map((h, i) => [h.key, i]));
  return cfg.follow
    .map((l, i) => ({l, i, k: norm(l)}))
    .filter((x) => !recent.includes(x.k))
    .sort((a, b) => (last.get(a.k) ?? -1) - (last.get(b.k) ?? -1) || a.i - b.i)
    .map((x) => cardLine(x.l));
};

/** The lines film `id` may end on. A new film looks at the films before it; a redo (posted now) at every other film,
 *  though it may keep its original's line (endingProblems). */
export const offerFor = (id, cfg, specsDir) => offerLines(cfg, followHistory(specsDir, cfg, /-r\d+$/.test(String(id)) ? Infinity : vNumber(id) || Infinity, familyOf(id)));

// the spec of film `id` as committed (HEAD) in the repo that holds specsDir, or null (not made yet, or no git)
const committedSpec = (id, specsDir) => {
  try {
    const out = execFileSync('git', ['show', `HEAD:./${path.basename(specsDir)}/${id}.json`], {cwd: path.dirname(specsDir), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
    return JSON.parse(out);
  } catch {
    return null;
  }
};

/** The ending film `id` must have: its original's for a redo (baseSpec, else the family's first spec); for a film
 *  already made (its spec committed) the ending it was made with, so a later change of "from" or "every" never
 *  turns an old film wrong; else the rule's. */
export const wantedEnding = (id, {specsDir, cfg, baseSpec = null}) => {
  let base = baseSpec;
  if (!base && /-r\d+$/.test(String(id))) {
    try {
      base = JSON.parse(fs.readFileSync(path.join(specsDir, `${familyOf(id)}.json`), 'utf8'));
    } catch {}
  }
  if (!base) base = committedSpec(id, specsDir);
  return base ? endingOfSpec(base, cfg) : endingOfNumber(vNumber(id), cfg);
};

// ---- a reminder in the wrong place ------------------------------------------------------------------------------
// The Georgian follow ask is the verb of "გამოწერა", and in car Georgian the same verb orders a car or parts from
// abroad ("მანქანა ამერიკიდან გამოიწერე"), writes out a fine ("ჯარიმა გამომიწერეს"), and its noun is also the app's
// paid subscription ("VINARI+ გამოწერით", "გამოწერის მართვა"). So a string asks to follow when a clause of it (between
// commas) names nothing ordered (ORDER: a car, a part, a country, an auction, customs, a fine, an invoice) and
//   - the verb asks "us / me": გამოგვიწერე(თ), გამოგვიწერო, გამომიწერე ... (follow us / me);
//   - or the verb asks "you" (გამოიწერე(თ), გამოიწერო, ხომ გამოიწერ?) and neither the string nor its film is about
//     bringing a car or parts from afar (ORDER_FAR: in a customs or auction film "ჯერ დაითვალე, მერე გამოიწერე" is
//     ordering the car; there only "us", "forget" or a page make it the follow ask);
//   - or any form of the verb stands right next to a page, a channel, a profile, Instagram, TikTok ... ("გვერდის
//     გამოწერა"), or sits in a sentence with "forget" ("გამოწერა არ დაგავიწყდეს", "ბევრს ავიწყდება გამოწერა"), in a
//     clause that is not about the paid plan (PLAN: VINARI+, cancelling, renewing, managing it, Apple, Google Play:
//     "Apple-ის გამოწერების გვერდი").
// Also: a line of the bank anywhere in it, a hashtag of the verb ("#გამოიწერე"), "follow us / me", "don't forget to
// follow", "subscribe." / "subscribe to us", "подпишись (на нас)", "не забудь подписаться" (never "подпишите
// договор", sign the contract, or "подпишись на уведомления", the app's notifications).
const STEM = 'გამოწერ|გამოიწერ|გამოგვიწერ|გამომიწერ';
const VERB = new RegExp(`(?<!\\p{L})(?:${STEM})\\p{L}*`, 'u');
const ASK_US = /(?<!\p{L})(?:გამოგვიწერ|გამომიწერ)(?:ეთ?|ოთ?)?(?!\p{L})/u;
const ASK_YOU = /(?<!\p{L})გამოიწერ(?:ეთ?|ოთ?)?(?!\p{L})/u;
const FORGET = /ავიწყდ|დაივიწყ/u;
const WHERE = '(?:გვერდ(?!ით)|არხ(?=ი|ს|ზე|ში)|პროფილ|ინსტაგრამ|ტიკტოკ|ფეისბუქ|იუთუბ|instagram|tiktok|facebook|youtube)\\p{L}*';
const PLACE = new RegExp(`${WHERE}\\s+(?:ჩვენ\\p{L}*\\s+)?(?:${STEM})|(?<!\\p{L})(?:${STEM})\\p{L}*\\s+(?:ჩვენ\\p{L}*\\s+)?${WHERE}`, 'iu');
const ORDER_FAR = /ნაწილ|დეტალ|საბურავ|აუქციონ|კოპარტ|copart|iaai|ამერიკ|აშშ|ევროპ|გერმან|იაპონ|კორეიდ|ჩინეთ|დუბაი|კანადიდ|უცხოეთ|საზღვარგარეთ|ჩამოყვან|განბაჟ/iu;
const ORDER = new RegExp(`მანქან|ჯარიმ|ქვითარ|ინვოის|ანგარიშ|${ORDER_FAR.source}`, 'iu');
/** Whether a film is about bringing a car or parts from afar (then "გამოიწერე" alone is ordering, not following). */
export const filmOrders = (spec) => ORDER_FAR.test(JSON.stringify(spec ?? {}));
const PLAN = /vinari|ვინარ|\+|გამოწერებ|გაუქმ|გააუქმ|განახლ|განაახლ|მართვ|მართავ|apple|google|play|ფასიან/iu;
const TAG_VERB = new RegExp(`^#\\S*(?:${STEM})`, 'u');
export const REMINDER_RE =
  /\bfollow(?:\s+(?:us|me|the\s+page|for\s+more)\b|(?:me|us|back)\b)|\b(?:don'?t|do\s+not)\s+forget\s+to\s+(?:follow|subscribe)|\bhit\s+(?:follow|subscribe)\b|\bsubscribe(?:\s+to\s+(?:us|me|the\s+page|our|my)\b|(?=\s*(?:[.!]|$)))|подпиш(?:ись|итесь)(?=\s*(?:[.!?,]|$)|\s+на\s+(?:нас|меня|страниц|канал|аккаунт|профил))|не\s+забудь(?:те)?\s+подписаться|подписывайся|подписывайтесь/iu;

/** The follow ask in s (the words that ask, or the bank line it contains), or null. ordering: the film is about
 *  bringing a car or parts from afar (filmOrders). */
export const reminderIn = (s, cfg, {ordering = false} = {}) => {
  const text = String(s ?? '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const m = REMINDER_RE.exec(text);
  if (m) return m[0];
  const k = ` ${norm(text)} `;
  const line = bank(cfg).find((l) => k.includes(` ${norm(l)} `));
  if (line) return line;
  if (TAG_VERB.test(text) && !ORDER.test(text)) return text;
  const far = ordering || ORDER_FAR.test(text);
  for (const sentence of text.split(/[.?!…;\n]+/)) {
    const forget = FORGET.test(sentence);
    for (const clause of sentence.split(/[,:]+/)) {
      const verb = VERB.exec(clause);
      if (!verb || ORDER.test(clause)) continue;
      if (ASK_US.test(clause) || (!far && ASK_YOU.test(clause)) || ((PLACE.test(clause) || forget) && !PLAN.test(clause))) return verb[0];
    }
  }
  return null;
};
/** Every string of the spec but the ending itself (the EndCard tagline, the last beat's say and show) that asks to
 *  follow: [[where, what, the string]]. The cover, the post, other beats, meta, scene text and notes included. The
 *  ending is endingProblems' to judge (a follow film's is one line of the bank, a quote film's none), so a wrong one
 *  there is an ENDING line, never a call to action that stops the render. */
export const reminderElsewhere = (spec, cfg) => {
  const skip = endingPlaces(spec);
  const ordering = filmOrders(spec);
  const out = [];
  const walk = (v, where) => {
    if (typeof v === 'string') {
      if (skip.has(where)) return;
      const hit = reminderIn(v, cfg, {ordering});
      if (hit) out.push([where, hit, v]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, where ? `${where}.${k}` : k));
  };
  walk(spec, '');
  return out;
};
// where the ending is: the last beat's say and show, the last scene's EndCard tagline
const endingPlaces = (spec) => {
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const last = beats.length - 1;
  const endAt = beats.map((b) => Boolean(b?.scene)).lastIndexOf(true);
  return new Set([`beats[${last}].say`, `beats[${last}].show`, ...(beats[endAt]?.scene?.type === 'EndCard' ? [`beats[${endAt}].scene.tagline`] : [])]);
};

// a note that names the paid plan or a price: under the follow reminder it reads as "subscribe to VINARI+"
const PLAN_NOTE = /vinari|ვინარ|\+|უფასო|ფასიან|პლუს|პლიუს|plus|free|გამოწერ/iu;

/** What is wrong with the film's ending, one "ENDING ..." line each, or []. want: 'follow' | 'quote'.
 *  baseSpec: a redo's original (a redo may keep its line even when later films used it). Base Georgian specs only. */
export const endingProblems = (spec, {want, cfg, specsDir, baseSpec = null}) => {
  const out = [];
  if (!spec || !Array.isArray(spec.beats) || !spec.beats.length || (spec.lang ?? 'ka') !== 'ka') return out;
  for (const [where, what] of reminderElsewhere(spec, cfg))
    out.push(`ENDING ${where}: "${what}" asks to follow; only a follow film (${ruleText(cfg)}) does, with exactly one line of ci/endings.json as its EndCard tagline and last line, and nothing else asks (never the cover or the post)`);
  const beats = spec.beats;
  const lb = beats[beats.length - 1];
  const end = lb?.scene?.type === 'EndCard' ? lb.scene : null;
  const tagline = taglineOf(spec);
  if (want === 'follow') {
    const offered = offerFor(spec.id, cfg, specsDir);
    const list = offered.map((l) => `"${l}"`).join(', ');
    const kept = baseSpec && norm(taglineOf(baseSpec)) === norm(tagline) && isFollowLine(tagline, cfg);
    if (!isFollowLine(tagline, cfg)) {
      out.push(`ENDING this film ends on the follow reminder, not a quote (${ruleText(cfg)}; ci/endings.json): the EndCard "tagline" and the last beat's "say" and "show" are exactly one of ${list}`);
    } else {
      if (!kept && !offered.some((l) => norm(l) === norm(tagline)))
        out.push(`ENDING "${tagline}" ${cfg.retired.some((l) => norm(l) === norm(tagline)) ? 'is retired' : `ended one of the last ${cfg.recent} follow films`}: end on one of ${list}`);
      if (!end || end.tagline !== tagline) out.push('ENDING the last beat is the EndCard beat: {"say": <the line>, "show": <the line>, "hold": 0.4, "scene": {"type": "EndCard", "tagline": <the line>}}');
      else if (norm(lb.say) !== norm(tagline) || norm(lb.show ?? lb.say) !== norm(tagline)) out.push(`ENDING the last beat's "say" and "show" are the reminder itself, word for word: "${tagline}"`);
      if (lb && lb.style !== undefined) out.push('ENDING no "style" on the reminder beat: a beat with a style of its own costs a second Gemini request');
      if (end && typeof end.note === 'string' && PLAN_NOTE.test(end.note))
        out.push(`ENDING no VINARI+ or price "note" under the follow reminder ("${end.note}"): next to "follow" it reads as selling the paid plan; leave "note" out (a hedge is fine)`);
      const rows = tagline.split('|').map((r) => r.trim());
      if (rows.length > 2 || rows.some((r) => [...r].length > CARD_LINE_MAX) || (rows.length === 1 && [...tagline].length > ONE_LINE))
        out.push(`ENDING the card shows the reminder in at most two lines of ${CARD_LINE_MAX} characters: write it with its "|" as offered, "${cardLine(tagline.replace(/\|/g, ' '))}"`);
    }
  } else {
    const ordering = filmOrders(spec);
    const hit = [tagline, lb?.say, lb?.show].map((t) => reminderIn(t, cfg, {ordering})).find(Boolean);
    if (hit) out.push(`ENDING this film ends on a closing line, a punchline or a callback (HOOKS.md §3), not a follow reminder ("${hit}"; only ${ruleText(cfg)} ends on one, ci/endings.json)`);
  }
  return out;
};

// ---- node tools/ci/ending.mjs [<id>] | --gate <id> --------------------------------------------------------------
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const specsDir = path.join(root, 'specs');
  const cfg = loadEndings();
  const gate = process.argv[2] === '--gate';
  let id = process.argv[gate ? 3 : 2];
  if ((id && !/^[a-z0-9-]+$/.test(id)) || (gate && !id)) {
    console.error('usage: node tools/ci/ending.mjs [<id>] | --gate <id>');
    process.exit(2);
  }
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
    } catch {
      return null;
    }
  };
  if (gate) {
    // After the Claude step: the ending it was asked for (out/ci/request.json), as check.mjs judged it before the voice.
    // The Claude step may leave a line after its two fix rounds (ci/prompt.md step 5). A reminder outside the ending
    // is a call to action (build-index stops the render on it anyway): stop here, before the voice is spent. The
    // wrong ending, a rotation or a note is a warning on the run: the film still comes out.
    const actions = process.env.GITHUB_ACTIONS === 'true';
    const spec = read(`${id}.json`);
    if (!spec) {
      console.error(`${actions ? '::error::' : ''}ENDING specs/${id}.json is missing or not valid JSON`);
      process.exit(1);
    }
    let request = null;
    try {
      request = JSON.parse(fs.readFileSync(path.join(root, 'out/ci/request.json'), 'utf8'));
    } catch {}
    const baseSpec = request?.baseId ? read(`${request.baseId}.json`) : null;
    const want = ['follow', 'quote'].includes(request?.ending) ? request.ending : wantedEnding(id, {specsDir, cfg, baseSpec});
    const leaks = reminderElsewhere(spec, cfg);
    const rest = endingProblems(spec, {want, cfg, specsDir, baseSpec}).filter((l) => !leaks.some(([where]) => l.startsWith(`ENDING ${where}:`)));
    for (const l of rest) console.log(`${actions ? '::warning::' : 'warning: '}${l}`);
    for (const [where, what, text] of leaks) console.log(`${actions ? '::error::' : 'error: '}ENDING ${where}: "${what}" asks to follow (the post and every other line stay free of it): "${text.slice(0, 160)}"`);
    if (leaks.length) process.exit(1);
    console.log(`ending: ${endingOfSpec(spec, cfg) === 'follow' ? 'the follow reminder' : 'a closing quote'}${rest.length ? ` (${rest.length} warning${rest.length === 1 ? '' : 's'})` : ''}`);
    process.exit(0);
  }
  if (!id) id = nextFree(specsDir); // the next free number, as tools/ci/prompt.mjs finds it
  const n = vNumber(id);
  const want = wantedEnding(id, {specsDir, cfg});
  if (want !== 'follow') {
    const after = n ? nextFollow(n + 1, cfg, 1)[0] : null;
    console.log(`${id}: a closing line, a punchline or a callback (HOOKS.md §3), no follow reminder (only ${ruleText(cfg)} ends on that${after ? `; the next one is v${after}` : ''}).`);
  } else {
    const lines = offerFor(id, cfg, specsDir);
    console.log(`${id}: the follow reminder, not a quote (${ruleText(cfg)}). The EndCard "tagline" and the last beat's "say" and "show" are exactly one of these, "|" included (the card breaks the line there); no "style" on that beat, no VINARI+ note:`);
    lines.forEach((l) => console.log(`  ${l}`));
  }
  // a bank line too long for the E slot (someone edited ci/endings.json)
  for (const l of cfg.follow) if (letters(l) > LINE_LETTERS) console.log(`note: "${l}" has ${letters(l)} letters (about ${(letters(l) / 11.5).toFixed(1)} s); keep a line at ${LINE_LETTERS} or fewer`);
}
