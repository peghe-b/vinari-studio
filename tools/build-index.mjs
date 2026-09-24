// Regenerates src/generated/videos.ts: one entry per specs/*.json that already has a voice
// timeline in public/vo/<id>/timeline.json. Also resolves a few render-time placeholders in
// spec strings, e.g. {daysToJan1}.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specsDir = path.join(root, 'specs');
const out = path.join(root, 'src', 'generated', 'videos.ts');

const now = new Date();
const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
const vars = {
  // calendar days in UTC: no DST drift whatever the machine's time zone
  daysToJan1: String(Math.round((Date.UTC(y + 1, 0, 1) - Date.UTC(y, m, d)) / 86400000)),
  today: `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
  year: String(now.getFullYear()),
};
const fill = (v) =>
  typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;

// Lint: catch the mistakes that cost a render. Errors stop the build, warnings only print.
const SCENE_TYPES = fs.readdirSync(path.join(root, 'src', 'scenes')).filter((f) => /^[A-Z][A-Za-z0-9]*\.tsx$/.test(f)).map((f) => f.slice(0, -4));
const has = (p) => fs.existsSync(path.join(root, 'public', p));

// Languages (tools/vo.py picks the voice): Georgian is the original. A translation lives in
// specs/<base>.<lang>.json with the id <base>-<lang>; tools/translate-check.mjs <base> compares them.
const LANGS = ['ka', 'en', 'ru'];
const TR_FILE = new RegExp(`^(.+)\\.(${LANGS.filter((l) => l !== 'ka').join('|')})$`);
// One subtitle line is 840 px of 58 px FiraGO: about 25 Georgian letters, 28 Cyrillic, 31 Latin
// (measured on FiraGO-Medium). [best, shrinks hard]
const SUB_LEN = {ka: [24, 30], en: [30, 38], ru: [27, 34]};
const GEO = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;
// A scene's code with its comments stripped, read once: the text rules below read it.
const codeCache = {};
const sceneCode = (t) => {
  if (!(t in codeCache)) {
    try {
      codeCache[t] = fs.readFileSync(path.join(root, 'src', 'scenes', `${t}.tsx`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    } catch {
      codeCache[t] = '';
    }
  }
  return codeCache[t];
};
// `p.x ?? '<text>'`: a default that reaches the film whenever the spec leaves that prop unset
const DEFAULT = /p\.(\w+)\s*\?\?\s*(\[[^\]]*\]|'[^']*'|"[^"]*")/g;
// Georgian a scene draws by itself, read from its code so this follows scene changes: text no prop
// can replace, and `p.x ?? '<Georgian>'` defaults that an en/ru spec has to set.
const kaInScenes = {};
const kaInScene = (type) => {
  if (!kaInScenes[type]) {
    const code = sceneCode(type);
    const defaults = [...code.matchAll(DEFAULT)].filter((m) => GEO.test(m[2])).map((m) => m[1]);
    const fixed = [...new Set((code.replace(DEFAULT, '').match(/[\u10A0-\u10FF][\u10A0-\u10FF ,.?:]*/g) ?? []).map((x) => x.trim()))];
    kaInScenes[type] = {defaults, fixed};
  }
  return kaInScenes[type];
};

// ---- the owner's text rules (2026-09-24) ---------------------------------------------------------
// Separators people put inside a name: "app store", "app-store", "my.auto", "ეპ სტორი".
const SP = '[\\s._\\-·]*';
// Never write or say the listing site's name (myauto.ge, MYAUTO, მაიავტო ...), in any string of any
// spec: say "ცოცხალი განცხადებები" or "ბაზარი". An error in every spec, demos included.
const MYAUTO = new RegExp(`my${SP}auto(?![a-z])|მაი${SP}(?:ავტო|აუტო)|май${SP}авто`, 'iu');
// No call to action (owner, 2026-09-24): a store line, "download" or "install" reads as a pitch. A
// video ends on the quiet EndCard with a creative closing quote. ka / en / ru, spaced or not.
const CTA = new RegExp(
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
const PUSHY = /ახლავე|დღესვე|სცადე|სანამ\s+გვიანაა|try\s+(?:it|vinari|the\s+app)|right\s+now|попробуй|прямо\s+сейчас/iu;
// Plain words (CLAUDE.md, "Say it simply"): high-flown Georgian and what to say instead. A warning:
// the fix is the everyday word, or the hard word explained once in plain words.
const PLAIN = [
  ['მედიან', '"შუა ფასი"'],
  ['სიმჭიდროვ', '"რამდენი იყიდება"'],
  ['დეკლარაცი|დეკლარირ', '"განბაჟება", "როცა განბაჟებ"'],
  ['კონკურენ', '"ვინც იგივეს ყიდის", "სხვა გამყიდველები"'],
  ['აქციზ', '"ერთი გადასახადი" (or say once, plainly, what it is)'],
  ['ავტომობილ|სატრანსპორტო საშუალებ', '"მანქანა"'],
  ['მომხმარებ', '"შენ"'],
  ['ღირებულებ', '"ფასი"'],
  ['იმპორტ', '"ჩამოყვანა"'],
  ['ინდექს', '"ფასების ხაზი"'],
  ['მონაცემ|ინფორმაცი', '"ციფრები", "რაც წერია"'],
  ['სტატისტიკ|დინამიკ|ტენდენცი', '"როგორ იცვლება"'],
  ['რეალურ დროში|ამჟამად|მიმდინარე', '"ახლა", "დღეს"'],
  ['უზრუნველყ|ახორციელ|ხორციელდ|წარმოადგენ', 'a plain verb: "აკეთებს", "არის"'],
  ['განსაზღვრ|ანალიზ', '"ითვლის", "ნახულობს"'],
  ['ხელმისაწვდომ', '"გაქვს", "შეგიძლია"'],
  ['ფიქსირ', '"ჩაწერს", "შეინახავს"'],
  ['იდენტიფიც|ვერიფიც', '"ცნობს", "შეამოწმებს"'],
  ['გათვალისწინ|შესაბამისად|აღნიშნულ|უშუალოდ|დამოუკიდებლად', 'drop it, or "თვითონ", "პირდაპირ"'],
  ['ოპტიმალურ|ოპტიმიზ|ეფექტურ|ინოვაცი|უნიკალურ|რევოლუცი|ინტუიციურ|მაქსიმალურად', 'drop the adjective'],
  ['ალგორითმ|ფუნქციონალ|პარამეტრ', 'say what it does'],
  ['ტექნიკური (?:დათვალიერ|ინსპექ)', '"ტექდათვალიერება"'],
].map(([stem, say]) => [new RegExp(`[\\u10D0-\\u10FF]*(?:${stem})[\\u10D0-\\u10FF]*`, 'u'), say]);
// Sentence length for the ear: words counted on the subtitle (a number stays one word), letters on
// the voice line. Past these a Georgian sentence stops sounding like a friend talking.
const SENT_WORDS = 9;
const SENT_LETTERS = 55;
const TAGLINE_MAX = {ka: 26, en: 32, ru: 29}; // the EndCard quote at 50 px stays one line with room
// The post text (spec "post", the owner 2026-09-24): one or two friendly lines and exactly three tags,
// two Georgian and one English. The video already signs off, so the post names no app, no store, no link.
const POST_MAX = 220;
const BRAND = /vinari|ვინარ|винари/iu;
const URL_RE = /https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(?:ge|com|app|io|net|org|me|ly)\b/iu;
const TAG = /^#[\p{L}\p{N}_]+$/u;
const TAG_EN = /^#(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]+$/;
const QUOTE_MARKS = /[„“”«»"]/;

// A scene's own text that breaks a rule: a `p.x ?? '...'` default (on screen while the spec leaves x
// unset), or a string literal / JSX text that no spec can change.
const sceneBad = {};
const badInScene = (type) => {
  if (!sceneBad[type]) {
    const code = sceneCode(type);
    const bad = (x) => CTA.test(x) || MYAUTO.test(x);
    const defaults = [...code.matchAll(DEFAULT)].filter((m) => bad(m[2])).map((m) => [m[1], m[2]]);
    const rest = code.replace(DEFAULT, '');
    const texts = [...(rest.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []), ...[...rest.matchAll(/>([^<>{}]*\p{L}[^<>{}]*)</gu)].map((m) => m[1].trim())];
    sceneBad[type] = {defaults, literals: [...new Set(texts.filter(bad))]};
  }
  return sceneBad[type];
};
// specs/.themes.json (tools/next-theme.mjs): the look reserved for a video, if any
let ledger = null;
const reservedTheme = (id) => {
  if (!ledger) {
    try {
      ledger = new Map(JSON.parse(fs.readFileSync(path.join(specsDir, '.themes.json'), 'utf8')).videos.map((v) => [v.id, v.theme]));
    } catch {
      ledger = new Map();
    }
  }
  return ledger.get(id);
};
const seenIds = new Map(); // two specs with one id would break every composition
const lint = (spec, file) => {
  const errors = [];
  const warns = [];
  const strings = [];
  const walk = (v, where) => {
    if (typeof v === 'string') strings.push([v, where]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, `${where}.${k}`));
  };
  // a hook variant (tools/variants.mjs) lives in <id>--h<n>.json and has the id <id>-h<n>;
  // a translation lives in <id>.<lang>.json and has the id <id>-<lang> (<id>--h<n>.en.json: <id>-h<n>-en)
  const lang = spec.lang ?? 'ka';
  if (!LANGS.includes(lang)) errors.push(`"lang" is "${spec.lang}"; one of ${LANGS.join(', ')}`);
  const tr = TR_FILE.exec(file.slice(0, -5));
  const fileId = tr ? tr[1] : file.slice(0, -5);
  const ids = [fileId, fileId.replace(/--(h\d+)$/, '-$1')].map((x) => (tr ? `${x}-${tr[2]}` : x));
  if (!ids.includes(spec.id) || !/^[a-z0-9-]+$/.test(spec.id)) errors.push(`id "${spec.id}" must be "${ids[1]}" for ${file} (a hook variant <id>--h<n>.json: <id>-h<n>; a translation <id>.<lang>.json: <id>-<lang>) and match [a-z0-9-]`);
  if (tr && lang !== tr[2]) errors.push(`${file} is the ${tr[2]} version, so "lang" must be "${tr[2]}", not "${lang}"`);
  if (seenIds.has(spec.id) && seenIds.get(spec.id) !== file) errors.push(`id "${spec.id}" is also the id of specs/${seenIds.get(spec.id)}`);
  else seenIds.set(spec.id, file);
  const [subBest, subMax] = SUB_LEN[lang] ?? SUB_LEN.ka;
  if (spec.music && !has(spec.music.src)) errors.push(`music ${spec.music.src} is not in public/`);
  let sceneChunks = 0;
  let scene = null;
  const checkAt = () => {
    if (!scene) return;
    const ats = [scene.at, ...(scene.items ?? []).map((x) => x?.at), ...(scene.models ?? []).map((x) => x?.at), ...(scene.focus ?? []).map((x) => x?.at), scene.highlight?.at, scene.flip?.at, scene.move?.crossAt];
    for (const a of ats) if (typeof a === 'number' && a >= sceneChunks) errors.push(`${scene.type}: "at" ${a} but the scene has only ${sceneChunks} subtitle chunks (0..${sceneChunks - 1})`);
  };
  if (spec.cover && typeof spec.cover === 'object') for (const k of ['title', 'tag', 'sub']) if (typeof spec.cover[k] === 'string') walk(spec.cover[k].replace(/\|/g, ' '), `cover.${k}`);
  spec.beats.forEach((b, i) => {
    walk(b.show ?? b.say, `beats[${i}].show`);
    if (b.meta) walk(b.meta, `beats[${i}].meta`);
    if (b.scene) {
      checkAt();
      scene = b.scene;
      sceneChunks = 0;
      walk(b.scene, `beats[${i}].scene`);
      if (lang !== 'ka') {
        const ka = kaInScene(b.scene.type);
        if (ka.fixed.length) warns.push(`beats[${i}]: ${b.scene.type} draws Georgian that no prop can change (${ka.fixed.slice(0, 3).map((x) => `"${x}"`).join(', ')}): it stays Georgian in the ${lang} video`);
        for (const k of ka.defaults) if (b.scene[k] === undefined) warns.push(`beats[${i}]: ${b.scene.type}.${k} is not set, so its Georgian default shows; set it in ${lang}`);
        if (b.scene.type === 'Phone') warns.push(has(`screens/${b.scene.src}.${lang}.jpg`) ? `beats[${i}]: a ${lang} capture exists: "src": "${b.scene.src}.${lang}"` : `beats[${i}]: Phone ${b.scene.src} is a Georgian app capture; the ${lang} viewer sees Georgian UI there`);
      }
      if (b.scene.type === 'Phone' && !has(`screens/${b.scene.src}.jpg`)) errors.push(`beats[${i}]: screen public/screens/${b.scene.src}.jpg does not exist`);
      for (const mdl of b.scene.models ?? []) {
        const name = typeof mdl === 'string' ? mdl : mdl.name;
        if (!has(`models/${name}.glb`)) errors.push(`beats[${i}]: model public/models/${name}.glb does not exist`);
      }
    }
    sceneChunks += b.say.split('|').length;
    for (const c of b.sfx ?? []) if (!has(`sfx/${c.name}.wav`) && !has(`sfx/${c.name}.m4a`)) errors.push(`beats[${i}]: sfx "${c.name}" not found in public/sfx`);
    if (/\{\w+\}/.test(b.say)) errors.push(`beats[${i}].say: placeholders cannot be spoken; spell the number out`);
    if (b.say.split('|').some((c) => !/[\p{L}\p{N}]/u.test(c))) errors.push(`beats[${i}].say: a chunk has nothing to say`);
    if (lang === 'ka' && /[A-Za-z]/.test(b.say)) warns.push(`beats[${i}].say has Latin letters; the Georgian voice reads them oddly, write them in Georgian`);
    if (lang !== 'ka' && GEO.test(b.say)) errors.push(`beats[${i}].say has Georgian letters; the ${lang} voice cannot read them`);
    if (lang === 'en' && /[\u0400-\u04FF]/.test(b.say)) errors.push(`beats[${i}].say has Cyrillic letters; the en voice cannot read them`);
    if (lang === 'ru' && /[A-Za-z]/.test(b.say)) warns.push(`beats[${i}].say has Latin letters; the Russian voice reads them its own way, write brand names in Cyrillic (Винари, Эп Стор)`);
    if (i === 0 && !b.scene) errors.push('beats[0] needs a scene');
    if (b.scene && !SCENE_TYPES.includes(b.scene.type)) errors.push(`beats[${i}].scene.type "${b.scene.type}" is not one of ${SCENE_TYPES.join(', ')}`);
    const say = b.say.split('|');
    const show = (b.show ?? b.say).split('|');
    if (say.length !== show.length) errors.push(`beats[${i}]: say has ${say.length} chunks, show has ${show.length}`);
    show.forEach((c, k) => {
      const n = [...c.trim()].length;
      if (n > subMax) warns.push(`beats[${i}] subtitle chunk ${k} is ${n} chars: TOO LONG, it will be shrunk; split it with "|" (max ${subMax}, best ≤ ${subBest}): "${c.trim()}"`);
      else if (n > subBest) warns.push(`beats[${i}] subtitle chunk ${k} is ${n} chars (best ≤ ${subBest}): "${c.trim()}"`);
    });
    // en/ru voices read digits well; tools/vo.py prints a "listen:" line for any word they skip
    if (lang === 'ka' && /\d/.test(b.say)) warns.push(`beats[${i}].say has digits; spell numbers as Georgian words for the voice`);
  });
  checkAt();
  for (const [s, where] of strings) {
    if (s.includes('\u2014')) errors.push(`${where}: em dash (—) on screen: "${s}"`);
    if (s.includes('!')) errors.push(`${where}: "!" on screen: "${s}"`);
    if (lang === 'ka' && /[\u1C90-\u1CBF]/.test(s)) errors.push(`${where}: Mtavruli code points (from toUpperCase?): "${s}"`);
    if (lang !== 'ka' && GEO.test(s)) warns.push(`${where}: Georgian on screen in the ${lang} version: "${s}"`);
    if (lang !== 'ka' && /\s\u2013\s/.test(s)) warns.push(`${where}: a spaced en dash is the em dash in disguise; use a comma, colon or full stop: "${s}"`);
  }
  // CTA: every spoken and shown string (say is only walked above when there is no show). A demo-*
  // spec is never posted, so it only warns.
  const demo = file.startsWith('demo-');
  const ctaOut = demo ? warns : errors;
  const said = spec.beats.flatMap((b, i) => (b.show !== undefined ? [[b.say, `beats[${i}].say`]] : []));
  for (const [s, where] of [...strings, ...said]) {
    const m = CTA.exec(s);
    if (m) ctaOut.push(`${where}: call to action "${m[0]}": no store, no "download", no "install" anywhere; close on the EndCard with a creative quote: "${s}"`);
    const p = PUSHY.exec(s);
    if (p) warns.push(`${where}: "${p[0]}" pushes the viewer (no urgency, no "try it"); say what is true and let the film end quietly: "${s}"`);
  }
  // myauto: every string of the spec (title, say, show, meta, scene, notes), demos included
  const everything = [];
  const walkAll = (v, where) => {
    if (typeof v === 'string') everything.push([v, where]);
    else if (Array.isArray(v)) v.forEach((x, i) => walkAll(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walkAll(x, where ? `${where}.${k}` : k));
  };
  walkAll(spec, '');
  for (const [s, where] of everything) {
    const m = MYAUTO.exec(s);
    if (m) errors.push(`${where}: "${m[0]}": never name the listing site, on screen or in the voice; say "ცოცხალი განცხადებები" or "ბაზარი": "${s}"`);
  }
  const drawn = new Set(); // a scene's fixed text is reported once per spec
  spec.beats.forEach((b, i) => {
    if (!b.scene) return;
    const bad = badInScene(b.scene.type);
    for (const [k, v] of bad.defaults)
      if (b.scene[k] === undefined) ctaOut.push(`beats[${i}]: ${b.scene.type} draws its default ${k} ${v} because "${k}" is unset (a call to action or the site's name); set "${k}", and remove that default from src/scenes/${b.scene.type}.tsx`);
    if (drawn.has(b.scene.type)) return;
    drawn.add(b.scene.type);
    for (const v of bad.literals) ctaOut.push(`beats[${i}]: ${b.scene.type} draws ${v} whatever the spec says (a call to action or the site's name); remove it from src/scenes/${b.scene.type}.tsx`);
  });
  // Say it simply (CLAUDE.md): Georgian only
  if (lang === 'ka') {
    const seen = new Set();
    for (const [s, where] of [...strings, ...said]) {
      for (const [re, plain] of PLAIN) {
        const m = re.exec(s);
        const key = `${/^beats\[\d+\]/.exec(where)?.[0] ?? where}|${m?.[0]}`;
        if (!m || seen.has(key)) continue;
        seen.add(key);
        warns.push(`${where}: "${m[0]}" is too high-flown for a friend talking; plain: ${plain} (CLAUDE.md, Say it simply)`);
      }
    }
    spec.beats.forEach((b, i) => {
      const cut = (t) => t.replace(/\s*\|\s*/g, ' ').split(/(?<=[.?:;])\s+/).map((x) => x.trim()).filter(Boolean);
      for (const x of cut(b.show ?? b.say)) {
        const words = x.replace(/(\d)\s(?=\d{3}(?!\d))/g, '$1').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
        if (words > SENT_WORDS) warns.push(`beats[${i}]: a sentence of ${words} words (plain Georgian: 7 or fewer, ${SENT_WORDS} at most); make it two: "${x}"`);
      }
      for (const x of cut(b.say)) {
        const letters = [...x].filter((c) => /[\u10D0-\u10FF]/.test(c)).length;
        if (letters > SENT_LETTERS) warns.push(`beats[${i}].say: a sentence of ${letters} letters is one long breath (40 or fewer is best, ${SENT_LETTERS} at most); make it two: "${x}"`);
      }
    });
  }
  // The ending: the quiet EndCard with a short creative closing quote, spoken as the last line
  if (!demo) {
    const lastBeat = spec.beats[spec.beats.length - 1];
    const end = [...spec.beats].reverse().find((b) => b.scene)?.scene;
    if (end?.type !== 'EndCard') warns.push('the film should end on the quiet EndCard (mark, wordmark and a short creative closing quote as "tagline"), never on a call to action');
    else if (!end.tagline) warns.push('EndCard has no "tagline": close on a short creative quote in plain words (HOOKS.md §3), spoken as the last line');
    else {
      const norm = (t) => t.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      const max = TAGLINE_MAX[lang] ?? TAGLINE_MAX.ka;
      if ([...end.tagline].length > max) warns.push(`EndCard tagline is ${[...end.tagline].length} characters (${max} at most, one line on the card): "${end.tagline}"`);
      if (lastBeat?.scene === end && norm(lastBeat.show ?? lastBeat.say) !== norm(end.tagline)) warns.push(`the last beat should speak the EndCard quote itself ("${end.tagline}"), so the card and the voice say one line`);
    }
  }
  // The post text: every broken rule is an error (the studio publishes it as it is)
  if (spec.post !== undefined) {
    const post = spec.post && typeof spec.post === 'object' ? spec.post : {};
    const d = post.description;
    if (typeof d !== 'string' || !d.trim()) errors.push('post.description: write one or two short friendly lines, like a friend talking (never a quote)');
    else {
      const n = [...d].length;
      if (n > POST_MAX) errors.push(`post.description is ${n} characters (${POST_MAX} at most): one or two short lines`);
      const emoji = /\p{Extended_Pictographic}/u.exec(d);
      if (emoji) errors.push(`post.description: emoji "${emoji[0]}"; no emoji, they do not suit the brand`);
      if (d.includes('!')) errors.push('post.description: "!"; say it calmly');
      if (d.includes('—')) errors.push('post.description: em dash (—); use a comma, a colon or a full stop');
      if (/[Ა-Ჿ]/.test(d)) errors.push('post.description: Mtavruli code points (from toUpperCase?)');
      const cta = CTA.exec(d);
      if (cta) errors.push(`post.description: call to action "${cta[0]}": no store, no "download", no "install"`);
      const brand = BRAND.exec(d);
      if (brand) errors.push(`post.description: "${brand[0]}": no app name in the post (the video already signs off)`);
      const url = URL_RE.exec(d);
      if (url) errors.push(`post.description: a link "${url[0]}"; no URL in the post`);
      const push = PUSHY.exec(d);
      if (push) warns.push(`post.description: "${push[0]}" pushes the viewer; a friend just says what happened`);
      if (QUOTE_MARKS.test(d)) warns.push('post.description has quotation marks: it should read like a friend talking, never like a quote');
      const sentences = d.split(/(?<=[.?…])\s+/).filter((x) => /\p{L}/u.test(x)).length;
      if (sentences > 2) warns.push(`post.description has ${sentences} sentences; one or two short ones`);
      if (lang === 'ka') {
        for (const [re, plain] of PLAIN) {
          const m = re.exec(d);
          if (m) warns.push(`post.description: "${m[0]}" is too high-flown for a friend talking; plain: ${plain}`);
        }
      }
    }
    const tags = post.tags;
    if (!Array.isArray(tags) || tags.length !== 3) errors.push(`post.tags: exactly 3 tags, 2 Georgian and 1 English (${Array.isArray(tags) ? `${tags.length} given` : 'none given'})`);
    else {
      const bad = tags.filter((t) => typeof t !== 'string' || !TAG.test(t));
      if (bad.length) errors.push(`post.tags: ${bad.map((t) => JSON.stringify(t)).join(', ')}: a tag is "#" and then letters, digits or "_" (no space, no second "#")`);
      const ka = tags.filter((t) => typeof t === 'string' && GEO.test(t)).length;
      const en = tags.filter((t) => typeof t === 'string' && TAG_EN.test(t)).length;
      if (ka !== 2 || en !== 1) errors.push(`post.tags: ${ka} Georgian and ${en} English; exactly 2 Georgian and 1 English (Latin letters only): ${tags.join(' ')}`);
      if (new Set(tags.map((t) => String(t).toLowerCase())).size !== tags.length) errors.push(`post.tags: the same tag twice: ${tags.join(' ')}`);
      for (const t of tags) {
        if (typeof t !== 'string') continue;
        if (/[Ა-Ჿ]/.test(t)) errors.push(`post.tags: ${t} has Mtavruli code points (from toUpperCase?)`);
        const cta = CTA.exec(t);
        if (cta) errors.push(`post.tags: ${t} is a call to action ("${cta[0]}")`);
        if (BRAND.test(t)) warns.push(`post.tags: ${t} is a brand tag; a topical tag reads less like an ad`);
      }
    }
  }
  // Voiced by default, the house voice, and the alternating look (base Georgian specs only)
  const base = !demo && !tr && !/--h\d+\.json$/.test(file);
  if (!demo && (spec.narration === false || spec.silent === true)) warns.push('a silent film: every video is voiced unless the owner asks for a silent one; remove "narration": false');
  if (base && lang === 'ka' && !/^gemini:|^recorded$/.test(spec.voice ?? '')) warns.push(`"voice" is "${spec.voice}": the house voice is "gemini:Algieba" (female "gemini:Achernar"); vo.py falls back by itself when the free Gemini quota runs out`);
  if (base && spec.theme === undefined) {
    const r = reservedTheme(spec.id);
    warns.push(r ? `no "theme": the ledger reserved "${r}" for it; write "theme": "${r}"` : `no "theme": the looks alternate dark, light, dark ... in production order; set it from \`node tools/next-theme.mjs ${spec.id}\``);
  }
  if (spec.validUntil && new Date() > new Date(`${spec.validUntil}T23:59:59`)) errors.push(`expired: validUntil ${spec.validUntil}; its facts no longer hold`);
  return {errors, warns};
};

const only = process.argv[2];
const videos = [];
// a dotfile (specs/.themes.json, tools/next-theme.mjs) is not a spec
for (const f of fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.')).sort()) {
  const spec = JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
  // `node tools/build-index.mjs <id>`: only that spec's errors fail the build
  const target = !only || spec.id === only;
  const {errors, warns} = lint(spec, f);
  if (target) warns.forEach((w) => console.warn(`  ${spec.id}: ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`  ${spec.id}: ${target ? 'ERROR' : 'skipped'} ${e}`));
    if (target && only) process.exitCode = 1; // with no id (studio) a broken spec is skipped, not fatal
    continue;
  }
  const tl = path.join(root, 'public', 'vo', spec.id, 'timeline.json');
  if (!fs.existsSync(tl)) continue;
  const timeline = JSON.parse(fs.readFileSync(tl, 'utf8'));
  if (timeline.beats.length !== spec.beats.length) {
    console.warn(`skip ${spec.id}: spec has ${spec.beats.length} beats, timeline ${timeline.beats.length}. Re-run tools/vo.py`);
    continue;
  }
  // subtitles live in the timeline: fill placeholders there too
  videos.push({spec: fill(spec), timeline: fill(timeline)});
}
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, `// generated by tools/build-index.mjs, do not edit\nimport type {VideoProps} from '../types';\n\nexport const videos: VideoProps[] = ${JSON.stringify(videos, null, 1)};\n`);
console.log(`index: ${videos.map((v) => v.spec.id).join(', ') || '(none)'}`);
