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
//                                        film, the lines it may end on; for a free-week film, the lines it says
//                                        before the EndCard. The Mac's /video skill runs it.
//   node tools/ci/ending.mjs --test      the self-test (the follow rule and the free-week line)
//   node tools/ci/ending.mjs --gate <id> the studio workflow's gate step, after the Claude step (which may have left an
//                                        ENDING line after its fix rounds): a reminder outside the ending stops the
//                                        run before the voice (build-index would stop the render on it anyway); a
//                                        wrong ending is a warning on the run, since a film always comes out.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {KIT_FROM} from '../../src/lib/kit.mjs';
import {P2_FROM, p2On} from '../../src/lib/p2.mjs';

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
// Phase 2 (src/lib/p2.mjs; the owner, 2026-10-26): from P2_FROM no film ends on the comment ask; it stays only as the post's
// first paragraph (postLine). Every app film ends on the free week and both stores (EndStores).
export const endingOfNumber = (n, cfg) => (Number.isFinite(n) && !p2On(n) && n >= cfg.from && (n - cfg.from) % cfg.every === 0 ? 'follow' : 'quote');
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

// ---- the free week (ci/endings.json "freeWeek", the owner 2026-10-19; every second film since 2026-10-21) -------------
// "Films may say: download it and try it free for a week" (true for first-time subscribers of VINARI+); the owner,
// 2026-10-21: EVERY SECOND film says it. One switch, "on": while it is on, film number n (from "from", every "every"-th,
// never a follow film: their ending already asks) says ONE line of the bank, word for word, as the whole beat right
// before the EndCard; build-index lets exactly that beat through the call-to-action rule. Follow films are every second
// film too (from 63: the odd numbers), so "from" is a quote film's number and "every" 2: the free week falls on every
// film that is not a follow film. (Until 2026-10-21 it was from v113 every 4th: v113, v117, v121 are all follow films,
// so not one film said it; the self-test now refuses a rule that loses a film to the follow ending.) "skip": categories
// that never say it (the owner, 2026-10-21: the crazy stories, "stories", never mention the app, they are content of their
// own; the same day car knowledge, "carinfo", too): an even-numbered film of them simply has none, and one that says it
// fails FREE_WEEK. Off: no new film says it and
// the rule is strict again; a film already made (its spec on the branch) keeps the line it was made with.
/** ci/endings.json "freeWeek", checked: {on, from, every, lines, skip} (off when the file or the lines are missing) */
export const loadFreeWeek = (base = root) => {
  let j = null;
  try {
    j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'endings.json'), 'utf8'))?.freeWeek ?? null;
  } catch {}
  const lines = Array.isArray(j?.lines) ? j.lines.filter((s) => typeof s === 'string' && norm(s)).map((s) => s.replace(/\s+/g, ' ').trim()) : [];
  const int = (v, min, fallback) => (Number.isInteger(v) && v >= min ? v : fallback);
  const skip = Array.isArray(j?.skip) ? j.skip.filter((c) => typeof c === 'string' && /^[a-z]+$/.test(c)) : [];
  // phase 2: "everyP2" (1: every app film) from P2_FROM; the stores block (EndStores) and the categories whose end card is
  // silent (no free-week line: stories, car knowledge)
  const stores = j?.stores && typeof j.stores === 'object' ? j.stores : null;
  return {
    on: j?.on === true && lines.length > 0,
    from: int(j?.from, 1, Infinity),
    every: int(j?.every, 1, 2),
    everyP2: int(j?.everyP2, 1, 1),
    lines,
    skip,
    stores: {on: stores?.on !== false, silentFor: Array.isArray(stores?.silentFor) ? stores.silentFor.filter((c) => typeof c === 'string') : skip},
  };
};
/** whether a film of `category` never says it ("skip": the crazy stories) */
export const freeWeekSkips = (category, fw) => Boolean(category) && (fw.skip ?? []).includes(category);
/** whether film `id` (of `category`, when known) is one of the free-week films by its number (the rule, while the switch
 *  is on): never a follow film, never a category of "skip" */
export const freeWeekFilm = (id, fw, cfg, category = null) => {
  const n = vNumber(id);
  if (p2On(n)) return Boolean(fw.on && (n - P2_FROM) % (fw.everyP2 ?? 1) === 0 && !freeWeekSkips(category, fw));
  return Boolean(fw.on && n && n >= fw.from && (n - fw.from) % fw.every === 0 && endingOfNumber(n, cfg) !== 'follow' && !freeWeekSkips(category, fw));
};
/** The free-week films from film n on (n itself included): [n1, n2, ...] (follow films skipped). */
export const nextFreeWeek = (n, fw, cfg, count = 3) => {
  const out = [];
  if (!fw.on || !Number.isFinite(fw.from)) return out;
  for (let k = Math.max(n, fw.from); out.length < count && k < Math.max(n, fw.from) + 1000; k++) if (freeWeekFilm(`v${k}-x`, fw, cfg)) out.push(k);
  return out;
};
/** "1 film in 2 from v120: v120, v122, v124 ..., never a follow film or a stories film" */
export const freeWeekRuleText = (fw, cfg) =>
  fw.on
    ? `1 film in ${fw.every} from v${fw.from}: ${nextFreeWeek(fw.from, fw, cfg).map((k) => `v${k}`).join(', ')} ..., never a follow film${(fw.skip ?? []).length ? ` or a ${fw.skip.join(' or ')} film` : ''}`
    : 'no film: the switch in ci/endings.json is off';
/** a line of the bank, whatever its punctuation or "|" */
export const isFreeWeekLine = (s, fw) => {
  const k = norm(s);
  return Boolean(k) && fw.lines.some((l) => norm(l) === k);
};
// a bank line that also says „ულიმიტოდ" (the owner, 2026-10-21): only in a film whose category's facts make it true
// (ci/categories.json "unlimited": tools/ci/words.mjs unlimitedRule), never in a QR card film (its messages a day are limited)
const UNLIMITED_LINE = /ულიმიტ/u;
/** the index of the beat that says the free-week line (the whole beat), or -1 */
export const freeWeekBeat = (spec, fw) => (Array.isArray(spec?.beats) ? spec.beats.findIndex((b) => b && isFreeWeekLine(b.say, fw)) : -1);
/** whether film `id` may say it: by the rule while the switch is on; once it is off, only a film already made (its spec
 *  committed on the branch) keeps its line */
export const freeWeekAllowed = (id, fw, cfg, specsDir, category = null) =>
  !freeWeekSkips(category, fw) && (freeWeekFilm(id, fw, cfg, category) || (!fw.on && fw.lines.length > 0 && committedSpec(familyOf(id), specsDir) !== null));
/** whether film `id` MUST say it (the owner, 2026-10-21: every second film): a new free-week film by the rule; a redo, a
 *  hook variant or a translation keeps what its original said (never asked for), and a film already made (its spec
 *  committed) keeps what it was made with, so a later change of the rule never turns an old film wrong */
export const freeWeekWanted = (id, fw, cfg, specsDir, category = null) => {
  if (!freeWeekFilm(id, fw, cfg, category) || /-r\d+$/.test(String(id))) return false;
  const made = committedSpec(String(id), specsDir);
  return made ? freeWeekBeat(made, fw) >= 0 : true;
};
/** the lines a film may say (without the „ულიმიტოდ" ones unless `unlimited`: its category's facts make that true),
 *  the ones the last free-week films said last (never the newest one's again first) */
export const offerFreeWeek = (id, fw, specsDir, {unlimited = false} = {}) => {
  const n = vNumber(id) || Infinity;
  const used = baseSpecs(specsDir)
    .filter((sp) => vNumber(sp.id) < n)
    .flatMap((sp) => {
      const i = freeWeekBeat(sp, fw);
      return i >= 0 ? [norm(sp.beats[i].say)] : [];
    });
  const last = new Map(used.map((k, i) => [k, i]));
  return fw.lines
    .map((l, i) => ({l, i, k: norm(l)}))
    .filter((x) => unlimited || !UNLIMITED_LINE.test(x.l))
    .sort((a, b) => (last.get(a.k) ?? -1) - (last.get(b.k) ?? -1) || a.i - b.i)
    .map((x) => x.l);
};
/** What is wrong with the film's free-week line, one "FREE_WEEK ..." line each, or []. want: the film must say it
 *  (freeWeekWanted, or the request's "freeWeek" in the cloud); unlimited: its category may say „ულიმიტოდ". A film of a
 *  "skip" category (the crazy stories) never wants it and never may say it. */
export const freeWeekProblems = (spec, {fw, cfg, specsDir, want = false, unlimited = false}) => {
  const out = [];
  const skipped = freeWeekSkips(spec?.category, fw);
  if (skipped) want = false;
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const said = beats.map((b, i) => (b && isFreeWeekLine(b.say, fw) ? i : -1)).filter((i) => i >= 0);
  const endAt = beats.map((b) => b?.scene?.type === 'EndCard').lastIndexOf(true);
  // phase 2: the line is said OVER the white store card (the EndCard beat itself); before: the beat right before it
  const p2film = p2On(vNumber(spec?.id));
  const at = p2film ? (endAt >= 0 ? endAt : beats.length - 1) : endAt > 0 ? endAt - 1 : beats.length - 2;
  if (!said.length) {
    if (want) {
      const offer = offerFreeWeek(spec?.id, fw, specsDir, {unlimited});
      out.push(`FREE_WEEK this film is one of the free-week films (${freeWeekRuleText(fw, cfg)}; the owner, 2026-10-21: every second film): the beat right before the EndCard (beats[${Math.max(0, at)}], a whole beat of its own, no "style") says one of these, word for word: ${offer.map((l) => `"${l}"`).join(', ')}`);
    }
    return out;
  }
  if (skipped)
    out.push(`FREE_WEEK beats[${said[0]}] says the free-week line, but a "${spec.category}" film never does (the owner, 2026-10-21: the crazy stories and car knowledge are content of their own, never a download line): take the line out`);
  else if (!freeWeekAllowed(spec.id, fw, cfg, specsDir, spec?.category))
    out.push(`FREE_WEEK beats[${said[0]}] says the free-week line, but this film is not one of the free-week films (${freeWeekRuleText(fw, cfg)}): take the line out`);
  if (said.length > 1) out.push(`FREE_WEEK the free-week line is said ${said.length} times (beats ${said.join(', ')}): once a film`);
  for (const i of said) {
    if (i !== at) out.push(p2film ? `FREE_WEEK beats[${i}]: in a phase-2 film the free-week line is the EndCard beat's own voice (beats[${at}], said over the white store card), nowhere else` : `FREE_WEEK beats[${i}]: the free-week line is the whole beat right before the EndCard (beats[${at}]), nowhere else`);
    const b = beats[i];
    if (b.show !== undefined && norm(b.show) && !isFreeWeekLine(b.show, fw)) out.push(`FREE_WEEK beats[${i}].show is the line itself, word for word, or nothing`);
    if (b.style !== undefined) out.push(`FREE_WEEK beats[${i}]: no "style" on the free-week beat (a second Gemini request)`);
    if (!unlimited && UNLIMITED_LINE.test(b.say)) out.push(`FREE_WEEK beats[${i}]: "${b.say}" says „ულიმიტოდ", which this film's facts do not make true: take a line without it (${offerFreeWeek(spec.id, fw, specsDir).map((l) => `"${l}"`).join(', ')})`);
  }
  return out;
};

// ---- phase 2: the white store card (src/scenes/kit/endstores.tsx) ------------------------------------------------
export const END_HOLD_MAX = 0.8; // seconds the card may hold still after the voice ends
/** What is wrong with a phase-2 film's ending, one "STORES ..." / "END_HOLD ..." line each, or [] (an older film: []).
 *  The film ends on an EndCard (drawn as EndStores: white, VINARI, the line, both badges), never stamped on the last
 *  picture; its beat holds at most END_HOLD_MAX s after the voice; its tagline is the line the voice says over it (the
 *  free-week line, or for a "silentFor" category its own closing line), never the comment ask. */
export const storesProblems = (spec, {fw, cfg}) => {
  if (!p2On(vNumber(spec?.id)) || !fw?.stores?.on) return [];
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const last = beats[beats.length - 1];
  const end = last?.scene?.type === 'EndCard' ? last : null;
  if (!end) return [`STORES a phase-2 film ends on the white store card: its last beat's scene is {"type": "EndCard", "tagline": "<the line said over it>"} (src/scenes/kit/endstores.tsx)`];
  if (end.scene.mode === 'stamp' || end.scene.mode === 'loop') out.push(`STORES the end card is never stamped on the last picture ("mode": "${end.scene.mode}"): it is the white store card`);
  const hold = Number(end.hold ?? 0);
  if (hold > END_HOLD_MAX) out.push(`END_HOLD the end card holds ${hold} s after the voice (at most ${END_HOLD_MAX} s): the card is on screen under the voice, then the film ends`);
  if (cfg && isFollowLine(end.scene.tagline, cfg)) out.push('STORES the comment ask leaves the film (the owner, 2026-10-26): it is the post\'s first paragraph only; the card says the free-week line');
  const silent = (fw.stores.silentFor ?? []).includes(spec?.category);
  if (!silent && fw.on && !isFreeWeekLine(end.say, fw)) out.push(`STORES the end card's voice is the free-week line, word for word (one of: ${offerFreeWeek(spec?.id, fw, null).slice(0, 3).map((l) => `"${l}"`).join(', ')} ...)`);
  return out;
};

// ---- node tools/ci/ending.mjs [<id>] | --gate <id> --------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const cfg = {from: 63, every: 2, recent: 2, follow: ['კომენტარში დაწერე „ვინარი“, | ლინკს მოგწერთ. გამოგვიწერე.'], retired: [], postLine: ''};
  const fw = {on: true, from: 110, every: 2, lines: ['ჩამოტვირთე და ერთი კვირა უფასოდ სცადე.', 'პირველი კვირა უფასოა, ჩამოტვირთე და სცადე.', 'ერთი კვირა უფასოდ, ულიმიტოდ. ჩამოტვირთე.']};
  ok(endingOfNumber(63, cfg) === 'follow' && endingOfNumber(64, cfg) === 'quote' && endingOfNumber(111, cfg) === 'follow', 'the follow rule');
  ok(freeWeekFilm('v110-a', fw, cfg) && freeWeekFilm('v112-b', fw, cfg) && freeWeekFilm('v114-c', fw, cfg) && !freeWeekFilm('v111-d', fw, cfg) && !freeWeekFilm('v113-e', fw, cfg) && !freeWeekFilm('v108-f', fw, cfg), 'free-week films every second film: v110, v112, v114, not v111, v113 or v108');
  ok(!freeWeekFilm('v111-x', {...fw, from: 111}, cfg), 'never a follow film');
  // the crazy stories never say it (the owner, 2026-10-21): a stories film on a free-week number neither gets it nor may say it
  const fwS = {...fw, skip: ['stories']};
  ok(!freeWeekFilm('v110-s', fwS, cfg, 'stories') && freeWeekFilm('v110-s', fwS, cfg, 'carinfo') && freeWeekFilm('v110-s', fwS, cfg), 'a stories film on a free-week number is not a free-week film (car knowledge is)');
  ok(!freeWeekWanted('v110-s', fwS, cfg, path.join(root, 'specs'), 'stories') && !freeWeekAllowed('v110-s', fwS, cfg, path.join(root, 'specs'), 'stories'), 'a stories film is never asked for it and never allowed it');
  ok(nextFreeWeek(111, fw, cfg).join() === '112,114,116', `the next free-week films from v111: ${nextFreeWeek(111, fw, cfg).join(', ')}`);
  ok(!freeWeekFilm('v110-a', {...fw, on: false}, cfg), 'the switch off: no film');
  ok(isFreeWeekLine('ჩამოტვირთე და ერთი კვირა | უფასოდ სცადე', fw) && !isFreeWeekLine('ჩამოტვირთე ახლავე', fw), 'a bank line, whatever its "|"');
  const film = (id, beats) => ({id, beats});
  const end = {say: 'ჰოდა ასე.', scene: {type: 'EndCard', tagline: 'ჰოდა ასე.'}};
  const line = {say: 'ჩამოტვირთე და ერთი კვირა უფასოდ სცადე.', scene: {type: 'Phone', src: '23-home-104'}};
  const dir = path.join(root, 'specs');
  ok(freeWeekProblems(film('v110-a', [{say: 'ა'}, line, end]), {fw, cfg, specsDir: dir, want: true}).length === 0, 'the line right before the EndCard passes');
  ok(freeWeekProblems(film('v110-a', [line, {say: 'ბ'}, end]), {fw, cfg, specsDir: dir}).some((l) => /right before the EndCard/.test(l)), 'anywhere else: FREE_WEEK');
  ok(freeWeekProblems(film('v111-a', [{say: 'ა'}, line, end]), {fw, cfg, specsDir: dir}).some((l) => /not one of the free-week films/.test(l)), 'a film off the rule (a follow film): FREE_WEEK');
  ok(freeWeekProblems(film('v110-a', [{say: 'ა'}, {...line, style: 'drive'}, end]), {fw, cfg, specsDir: dir}).some((l) => /no "style"/.test(l)), 'no style on it');
  ok(freeWeekBeat(film('v110-a', [{say: 'ა'}, line, end]), fw) === 1, 'freeWeekBeat');
  // every second film SAYS it (the owner, 2026-10-21): a new free-week film without the line fails
  ok(freeWeekProblems(film('v110-a', [{say: 'ა'}, {say: 'ბ'}, end]), {fw, cfg, specsDir: dir, want: true}).some((l) => /is one of the free-week films/.test(l)), 'a free-week film without the line: FREE_WEEK');
  ok(freeWeekProblems(film('v111-a', [{say: 'ა'}, {say: 'ბ'}, end]), {fw, cfg, specsDir: dir, want: false}).length === 0, 'a film that is not one needs nothing');
  ok(freeWeekWanted('v110-a', fw, cfg, dir) && freeWeekWanted('v112-a', fw, cfg, dir) && !freeWeekWanted('v111-a', fw, cfg, dir), 'freeWeekWanted: a new free-week film by its number');
  ok(!freeWeekWanted('v110-a-r1', fw, cfg, dir), 'a redo keeps what its original said (never asked)');
  ok(!freeWeekWanted('v110-missed-turn', fw, cfg, dir), 'a film already made keeps what it was made with (v110, made before the rule)');
  // „ულიმიტოდ" only where the category's facts make it true (tools/ci/words.mjs unlimitedRule)
  ok(offerFreeWeek('v110-a', fw, dir).every((l) => !/ულიმიტ/u.test(l)) && offerFreeWeek('v110-a', fw, dir, {unlimited: true}).some((l) => /ულიმიტ/u.test(l)), 'the „ულიმიტოდ" lines are offered only to a film whose facts make it true');
  const story = (beats) => ({id: 'v110-s', category: 'stories', beats});
  ok(freeWeekProblems(story([{say: 'ა'}, {say: 'ბ'}, end]), {fw: fwS, cfg, specsDir: dir, want: true}).length === 0, 'a stories film without the line passes, even when the number asks');
  ok(freeWeekProblems(story([{say: 'ა'}, {say: line.say}, end]), {fw: fwS, cfg, specsDir: dir, want: true}).some((l) => /"stories" film never does/.test(l)), 'a stories film that says it: FREE_WEEK (off-category)');
  const ulim = {...line, say: 'ერთი კვირა უფასოდ, ულიმიტოდ. ჩამოტვირთე.'};
  ok(freeWeekProblems(film('v110-a', [{say: 'ა'}, ulim, end]), {fw, cfg, specsDir: dir, want: true}).some((l) => /ულიმიტოდ/.test(l)) && freeWeekProblems(film('v110-a', [{say: 'ა'}, ulim, end]), {fw, cfg, specsDir: dir, want: true, unlimited: true}).length === 0, 'a „ულიმიტოდ" line: FREE_WEEK unless the film may say it');
  const real = loadFreeWeek(root);
  ok(real.lines.every((l) => !/[—!]/.test(l) && letters(l) <= 40), 'the bank: no em dash, no "!", short lines');
  ok(real.lines.every((l) => !reminderIn(l, cfg)), 'no bank line asks to follow');
  ok(real.lines.filter((l) => !/ულიმიტ/u.test(l)).length >= 2, 'the bank keeps lines without „ულიმიტოდ" for the films that may not say it');
  ok(real.skip.includes('stories') && real.skip.includes('carinfo'), `the crazy stories and car knowledge never say it ("skip": ${JSON.stringify(real.skip)})`);
  // car knowledge too (the owner, 2026-10-21): on a free-week number it neither gets the line nor may say it
  const fwK = {...fw, skip: real.skip};
  ok(!freeWeekFilm('v110-k', fwK, cfg, 'carinfo') && !freeWeekWanted('v110-k', fwK, cfg, dir, 'carinfo') && freeWeekFilm('v110-k', fwK, cfg, 'parking'), 'a car-knowledge film on a free-week number is not a free-week film (a parking film is)');
  const know = (beats) => ({id: 'v110-k', category: 'carinfo', beats});
  ok(freeWeekProblems(know([{say: 'ა'}, {say: 'ბ'}, end]), {fw: fwK, cfg, specsDir: dir, want: true}).length === 0 && freeWeekProblems(know([{say: 'ა'}, {say: line.say}, end]), {fw: fwK, cfg, specsDir: dir, want: true}).some((l) => /"carinfo" film never does/.test(l)), 'a car-knowledge film: never asked, and saying it is FREE_WEEK (off-category)');
  // the real rule: ONE film in TWO says it (the owner, 2026-10-21), and no film the rule picks is lost to the follow ending
  // (from 113 every 4 picked v113, v117, v121: all follow films, so not one film said it)
  const realCfg = loadEndings(root);
  if (real.on) {
    const span = Array.from({length: Math.max(2, Math.min(40, P2_FROM - real.from))}, (_, i) => real.from + i); // the old rule ends at P2_FROM
    const lost = span.filter((n) => (n - real.from) % real.every === 0 && endingOfNumber(n, realCfg) === 'follow');
    ok(!lost.length, `no free-week film is a follow film (${lost.length ? `v${lost.join(', v')} are` : freeWeekRuleText(real, realCfg)})`);
    const pairs = span.slice(0, -1).filter((n, i) => i % 2 === 0).map((n) => [n, n + 1].filter((k) => freeWeekFilm(`v${k}-x`, real, realCfg)).length);
    ok(pairs.every((c) => c === 1), `the free-week line is one film in two from v${real.from} (${nextFreeWeek(real.from, real, realCfg, 5).map((k) => `v${k}`).join(', ')} ...)`);
  }
  // phase 2 (src/lib/p2.mjs): no follow film, every app film says it over the white store card, never stories or carinfo
  const P = P2_FROM;
  const fw2 = {...fw, everyP2: 1, skip: ['stories', 'carinfo'], stores: {on: true, silentFor: ['stories', 'carinfo']}};
  ok(endingOfNumber(P, cfg) === 'quote' && endingOfNumber(P + 1, cfg) === 'quote', 'phase 2: no film ends on the comment ask');
  ok(freeWeekFilm(`v${P}-a`, fw2, cfg, 'obd') && freeWeekFilm(`v${P + 1}-a`, fw2, cfg, 'qr') && !freeWeekFilm(`v${P}-s`, fw2, cfg, 'stories'), 'phase 2: every app film says the free week, a story never');
  const endFw = {say: line.say, scene: {type: 'EndCard', tagline: line.say}, hold: 0.4};
  const p2film = (beats, category = 'obd') => ({id: `v${P}-a`, category, beats});
  ok(storesProblems(p2film([{say: 'ა'}, {say: 'ბ'}, endFw]), {fw: fw2, cfg}).length === 0 && freeWeekProblems(p2film([{say: 'ა'}, {say: 'ბ'}, endFw]), {fw: fw2, cfg, specsDir: dir, want: true}).length === 0, 'phase 2: the line said over the store card passes');
  ok(storesProblems(p2film([{say: 'ა'}, {say: 'ბ'}, {say: 'ბ'}]), {fw: fw2, cfg}).some((l) => l.startsWith('STORES')), 'phase 2: a film without the store card: STORES');
  ok(storesProblems(p2film([{say: 'ა'}, {...endFw, hold: 1.5}]), {fw: fw2, cfg}).some((l) => l.startsWith('END_HOLD')), 'phase 2: a card held 1.5 s after the voice: END_HOLD');
  ok(storesProblems(p2film([{say: 'ა'}, {...endFw, scene: {...endFw.scene, mode: 'stamp'}}]), {fw: fw2, cfg}).some((l) => /stamped/.test(l)), 'phase 2: never stamped on the last picture');
  ok(storesProblems(p2film([{say: 'ა'}, end]), {fw: fw2, cfg}).some((l) => /free-week line/.test(l)), 'phase 2: an app film whose card says something else: STORES');
  ok(storesProblems(p2film([{say: 'ა'}, end], 'stories'), {fw: fw2, cfg}).length === 0, 'phase 2: a story ends on its own line over the silent store card');
  ok(storesProblems({id: 'v120-a', beats: [{say: 'ა'}]}, {fw: fw2, cfg}).length === 0, 'an older film: no store rule');
  ok(freeWeekProblems(p2film([{say: 'ა'}, line, end]), {fw: fw2, cfg, specsDir: dir}).some((l) => /EndCard beat's own voice/.test(l)), 'phase 2: the line before the card instead of over it: FREE_WEEK');
  // the free week starts with the promo-grade studio (src/lib/kit.mjs KIT_FROM): when KIT_FROM moves past a film the old
  // studio made first (tools/ci/filmlint.mjs --test says so), "from" moves with it
  ok(real.from >= KIT_FROM, `freeWeek.from (${real.from}) is not before the kit's first film (KIT_FROM ${KIT_FROM})`);
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)) && process.argv[2] === '--test') process.exit(selfTest());
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
  // the free week (every second film, the owner 2026-10-21): this film says it, or the next one that does
  const fw = loadFreeWeek();
  if (fw.on && n && freeWeekFilm(id, fw, cfg)) {
    console.log(`${id}: a free-week film (${freeWeekRuleText(fw, cfg)}), unless it is a ${(fw.skip ?? []).join(' or ') || 'skipped'} film: the beat right before the EndCard is one of these, word for word, a whole beat with no "style" (the „ულიმიტოდ" ones only when the film's category has "unlimited" in ci/categories.json):`);
    offerFreeWeek(id, fw, specsDir, {unlimited: true}).forEach((l) => console.log(`  ${l}`));
  } else if (fw.on && n) console.log(`${id}: no free-week line (${freeWeekRuleText(fw, cfg)}; the next one is v${nextFreeWeek(n + 1, fw, cfg, 1)[0]}).`);
  // a bank line too long for the E slot (someone edited ci/endings.json)
  for (const l of cfg.follow) if (letters(l) > LINE_LETTERS) console.log(`note: "${l}" has ${letters(l)} letters (about ${(letters(l) / 11.5).toFixed(1)} s); keep a line at ${LINE_LETTERS} or fewer`);
}
