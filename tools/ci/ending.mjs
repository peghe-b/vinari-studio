// How a film ends: a creative closing quote on the quiet EndCard, or, on every third film, the follow reminder (the
// owner, 2026-09-29: people forget to follow the page, so about every third video says "don't forget to follow" at
// the end instead of the closing line). ci/endings.json holds the rule and the lines.
//
// The rule is deterministic: film number n (the "v<n>-" of its id) is a follow film when n >= from and
// (n - from) % every === 0 (from 43, every 3: v43, v46, v49 ...). The number is fixed before the film is written
// (tools/ci/prompt.mjs "next", pinned by tools/ci/resolve.mjs), so a retried run gets the same ending. A redo
// (v43-x-r1) keeps its original's ending, read from the original's tagline. Hook variants and translations copy their
// base spec, and a demo never ends on it. It counts films made, not films posted.
// What a film's ending IS is always read from its spec: an EndCard tagline that is a line of "follow" or "retired".
//
// The line: exactly one of "follow", as the EndCard tagline and the last beat's say and show, word for word (the card
// shows it, so Promo drops its subtitle), with no "style" of its own (a second Gemini request). Never one of the last
// "recent" distinct lines earlier films ended on (all categories together); the least recently used is offered
// first. Nowhere else: not another beat, the cover or the post. A line over 26 characters breaks into two lines on
// the card at a "|" (cardLine() places it at the best space; a "|" in the bank sets it by hand).
//
// Read by tools/ci/prompt.mjs (the brief, --record), tools/check.mjs (before the voice) and tools/build-index.mjs.
//   node tools/ci/ending.mjs [<id>]   the ending of that film (default: the next free number) and, for a follow
//                                     film, the lines it may end on. The Mac's /video skill runs it.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ONE_LINE = 26; // a tagline over this many characters breaks in two on the card (build-index TAGLINE_MAX.ka)
export const CARD_LINE_MAX = 30; // one line of a two-line tagline

export const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id ?? ''))?.[1] ?? 0);
const redoNumber = (id) => Number(/-r(\d+)$/.exec(String(id ?? ''))?.[1] ?? 0);
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
    every: int(j?.every, 1, 3),
    recent: Math.min(int(j?.recent, 0, 4), Math.max(0, follow.length - 1)), // at least one line is always free
    follow,
    retired: lines(j?.retired),
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
/** "1 film in 3 from v43: v43, v46, v49 ..." */
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

/** The ending film `id` must have: its original's for a redo (baseSpec, else the family's first spec), else the rule's. */
export const wantedEnding = (id, {specsDir, cfg, baseSpec = null}) => {
  let base = baseSpec;
  if (!base && /-r\d+$/.test(String(id))) {
    try {
      base = JSON.parse(fs.readFileSync(path.join(specsDir, `${familyOf(id)}.json`), 'utf8'));
    } catch {}
  }
  return base ? endingOfSpec(base, cfg) : endingOfNumber(vNumber(id), cfg);
};

// ---- a reminder in the wrong place ------------------------------------------------------------------------------
// Narrow on purpose: in car Georgian "მანქანა გამოიწერე ამერიკიდან" is ordering a car from abroad, and "გამოწერა" is
// also a subscription (VINARI+), so a bare "გამოწერ" says nothing. What does: a line of the bank, "follow us / me",
// "subscribe", the Russian "подпиш-", and the Georgian "გამოგვიწერ-" / "გამომიწერ-" (follow us / me).
export const REMINDER_RE = /გამოგვიწერ|გამომიწერ|\bfollow(?:\s+(?:us|me|the\s+page|for\s+more)\b|(?:me|us|back)\b)|\bsubscribe|подпиш/iu;
/** The reminder in s ("follow us", or the bank line it contains), or null. */
export const reminderIn = (s, cfg) => {
  const m = REMINDER_RE.exec(String(s ?? ''));
  if (m) return m[0];
  const k = ` ${norm(s)} `;
  return bank(cfg).find((l) => k.includes(` ${norm(l)} `)) ?? null;
};
/** Every string of the spec but the ending itself (the EndCard tagline, the last beat's say and show) that asks to
 *  follow: [[where, what, the string]]. The cover, the post, other beats, meta, scene text and notes included. */
export const reminderElsewhere = (spec, cfg) => {
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const last = beats.length - 1;
  const endAt = beats.map((b) => Boolean(b?.scene)).lastIndexOf(true);
  const skip = new Set([`beats[${last}].say`, `beats[${last}].show`, ...(beats[endAt]?.scene?.type === 'EndCard' ? [`beats[${endAt}].scene.tagline`] : [])]);
  const out = [];
  const walk = (v, where) => {
    if (typeof v === 'string') {
      if (skip.has(where)) return;
      const hit = reminderIn(v, cfg);
      if (hit) out.push([where, hit, v]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, where ? `${where}.${k}` : k));
  };
  walk(spec, '');
  return out;
};

/** What is wrong with the film's ending, one "ENDING ..." line each, or []. want: 'follow' | 'quote'.
 *  baseSpec: a redo's original (a redo may keep its line even when later films used it). Base Georgian specs only. */
export const endingProblems = (spec, {want, cfg, specsDir, baseSpec = null}) => {
  const out = [];
  if (!spec || !Array.isArray(spec.beats) || !spec.beats.length || (spec.lang ?? 'ka') !== 'ka') return out;
  for (const [where, what] of reminderElsewhere(spec, cfg))
    out.push(`ENDING ${where}: "${what}" asks to follow; only a follow film's last line and EndCard tagline may, nothing else (and never the post)`);
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
      const rows = tagline.split('|').map((r) => r.trim());
      if (rows.length > 2 || rows.some((r) => [...r].length > CARD_LINE_MAX) || (rows.length === 1 && [...tagline].length > ONE_LINE))
        out.push(`ENDING the card shows the reminder in at most two lines of ${CARD_LINE_MAX} characters: write it with its "|" as offered, "${cardLine(tagline.replace(/\|/g, ' '))}"`);
    }
  } else if (tagline && (isFollowLine(tagline, cfg) || REMINDER_RE.test(tagline))) {
    out.push(`ENDING this film ends on a creative closing quote (HOOKS.md §3), not the follow reminder (only ${ruleText(cfg)} ends on that; ci/endings.json)`);
  }
  return out;
};

// ---- node tools/ci/ending.mjs [<id>] -----------------------------------------------------------------------------
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const specsDir = path.join(root, 'specs');
  const cfg = loadEndings();
  let id = process.argv[2];
  if (id && !/^[a-z0-9-]+$/.test(id)) {
    console.error('usage: node tools/ci/ending.mjs [<id>]');
    process.exit(2);
  }
  if (!id) {
    // the next free number, as tools/ci/prompt.mjs finds it
    const read = (f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
      } catch {
        return null;
      }
    };
    const ids = [...fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.')).map((f) => f.slice(0, -5)), ...(read('.themes.json')?.videos ?? []).map((v) => v?.id), ...Object.values(read('.studio.json') ?? {}).map((v) => v?.id)];
    id = `v${Math.max(0, ...ids.filter(Boolean).map(vNumber)) + 1}-<slug>`;
  }
  const n = vNumber(id);
  const want = wantedEnding(id, {specsDir, cfg});
  if (want !== 'follow') {
    const after = n ? nextFollow(n + 1, cfg, 1)[0] : null;
    console.log(`${id}: a creative closing quote (HOOKS.md §3), no follow reminder (only ${ruleText(cfg)} ends on that${after ? `; the next one is v${after}` : ''}).`);
  } else {
    const lines = offerFor(id, cfg, specsDir);
    console.log(`${id}: the follow reminder, not a quote (${ruleText(cfg)}). The EndCard "tagline" and the last beat's "say" and "show" are exactly one of these, "|" included (the card breaks the line there); no "style" on that beat:`);
    lines.forEach((l) => console.log(`  ${l}`));
  }
}
