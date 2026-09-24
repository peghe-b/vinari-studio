// Keeps translations honest: a translation may change words, never facts.
//   node tools/translate-check.mjs <base-id> [en|ru ...]
// Compares specs/<base>.json with specs/<base>.<lang>.json (every language present, or the ones
// given) and prints every difference that is not just wording:
//   - beats: same count, same scene on the same beat, same scene types
//   - scene props: every number, boolean and non-text string (type, src, format, tone, mark, ...)
//     identical; arrays the same length; the same keys
//   - "|" chunks per beat identical (a scene's "at" counts chunks, so it would slide)
//   - numbers written inside text (subtitles, labels, titles, meta) identical: "3 დღით" -> "3 days"
//   - sfx, music, accent, validUntil identical; the voice keeps its gender (Eka -> Ava / Svetlana)
// A number that legitimately reads differently (a month written as a word in Georgian, "20.9." in
// the app's English) is acknowledged in the translation, with the reason, and then only printed:
//   "translationNotes": {"beats[3].scene.body": "20.9. is 20 September, as the app writes it"}
// Exit code 1 when any DIFF is found. Also prints each version's voice length when its timeline exists.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specsDir = path.join(root, 'specs');
const LANGS = ['en', 'ru'];
// same table as tools/vo.py VOICES
const VOICES = {
  ka: {male: 'ka-GE-GiorgiNeural', female: 'ka-GE-EkaNeural'},
  en: {male: 'en-US-AndrewNeural', female: 'en-US-AvaNeural'},
  ru: {male: 'ru-RU-DmitryNeural', female: 'ru-RU-SvetlanaNeural'},
};
const GENDER = Object.fromEntries(Object.values(VOICES).flatMap((by) => Object.entries(by).map(([g, v]) => [v, g])));
// strings that are data, not words: they must stay exactly the same
const DATA_KEYS = new Set(['type', 'src', 'format', 'tone', 'mark', 'name', 'model', 'models', 'accent', 'align', 'kind', 'icon', 'shape', 'side', 'anchor', 'mode', 'fit', 'dir', 'ease']);
const GEO = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;

const [base, ...want] = process.argv.slice(2);
if (!base || base.startsWith('-')) {
  console.error('usage: node tools/translate-check.mjs <base-id> [en|ru ...]');
  process.exit(2);
}
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const baseFile = path.join(specsDir, `${base}.json`);
if (!fs.existsSync(baseFile)) {
  console.error(`no specs/${base}.json`);
  process.exit(2);
}
const B = read(baseFile);
const langs = want.length ? want : LANGS.filter((l) => fs.existsSync(path.join(specsDir, `${base}.${l}.json`)));
if (!langs.length) {
  console.error(`no translations of ${base}: write specs/${base}.en.json or specs/${base}.ru.json ("id": "${base.replace(/--(h\d+)$/, '-$1')}-en", "lang": "en")`);
  process.exit(2);
}

/** Numbers inside a string, as values: "09:00" and "9:00" are both [9, 0]; "3 610" and "3,610" are [3, 610]. */
const nums = (s) => (String(s).match(/\d+/g) ?? []).map(Number).sort((a, b) => a - b);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const chunks = (s) => String(s ?? '').split('|').length;
const duration = (id) => {
  const f = path.join(root, 'public', 'vo', id, 'timeline.json');
  return fs.existsSync(f) ? read(f).duration : null;
};
const voiceOf = (spec, lang) => spec.voice && (spec.voice.split('-')[0].toLowerCase() === lang || spec.voice.includes('Multilingual') || !GENDER[spec.voice]) ? spec.voice : VOICES[lang][GENDER[spec.voice] ?? 'male'];

let failed = false;
for (const lang of langs) {
  const file = path.join(specsDir, `${base}.${lang}.json`);
  console.log(`${base} -> ${lang}  (specs/${base}.${lang}.json)`);
  if (!fs.existsSync(file)) {
    console.log(`  DIFF  no specs/${base}.${lang}.json`);
    failed = true;
    continue;
  }
  const T = read(file);
  const notes = T.translationNotes ?? {};
  const diffs = [];
  const noted = [];
  const info = [];
  const diff = (where, msg) => (notes[where] ? noted.push(`${where}: ${msg} (${notes[where]})`) : diffs.push(`${where}: ${msg}`));
  const textNums = (where, a, b) => {
    if (!same(nums(a), nums(b))) diff(where, `numbers ${nums(a).join(' ') || '(none)'} -> ${nums(b).join(' ') || '(none)'}: "${a}" -> "${b}"`);
    if (GEO.test(b)) diffs.push(`${where}: still Georgian: "${b}"`);
  };
  /** Walks the base and the translation side by side. */
  const cmp = (a, b, where, key) => {
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) return diff(where, 'array on one side only');
      if (a.length !== b.length) diff(where, `${a.length} entries -> ${b.length}`);
      a.slice(0, b.length).forEach((x, i) => cmp(x, b[i], `${where}[${i}]`, key));
      return;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in b)) diff(`${where}.${k}`, 'missing in the translation');
        else if (!(k in a)) diff(`${where}.${k}`, 'not in the Georgian spec');
        else cmp(a[k], b[k], `${where}.${k}`, k);
      }
      return;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      if (DATA_KEYS.has(key)) {
        if (a !== b) diff(where, `"${a}" -> "${b}" (data, not words)`);
      } else textNums(where, a, b);
      return;
    }
    if (!same(a, b)) diff(where, `${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  };

  const wantId = `${base.replace(/--(h\d+)$/, '-$1')}-${lang}`; // a hook variant <id>--h1.en.json: <id>-h1-en
  if (T.id !== wantId) diffs.push(`id: "${T.id}", expected "${wantId}"`);
  if (T.lang !== lang) diffs.push(`lang: "${T.lang}", expected "${lang}"`);
  for (const k of ['validUntil', 'accent', 'music', 'cutSfx']) if (!same(B[k], T[k])) diff(k, `${JSON.stringify(B[k])} -> ${JSON.stringify(T[k])}`);
  const vb = voiceOf(B, 'ka');
  const vt = voiceOf(T, lang);
  if (GENDER[vb] && GENDER[vt] && GENDER[vb] !== GENDER[vt]) diff('voice', `${vb} (${GENDER[vb]}) -> ${vt} (${GENDER[vt]}): keep the gender`);
  else info.push(`voice ${vb} -> ${vt}`);

  if (B.beats.length !== T.beats.length) diffs.push(`beats: ${B.beats.length} -> ${T.beats.length}`);
  B.beats.slice(0, T.beats.length).forEach((b, i) => {
    const t = T.beats[i];
    const w = `beats[${i}]`;
    if (chunks(b.say) !== chunks(t.say)) diff(`${w}.say`, `${chunks(b.say)} "|" chunks -> ${chunks(t.say)}`);
    if (t.show !== undefined && chunks(t.show) !== chunks(t.say)) diffs.push(`${w}.show: ${chunks(t.show)} chunks, its say has ${chunks(t.say)}`);
    // Georgian "say" spells numbers as words, so the numbers live in "show" (or say, when no show)
    textNums(`${w}.show`, b.show ?? b.say, t.show ?? t.say);
    if (t.show !== undefined && GEO.test(t.say)) diffs.push(`${w}.say: still Georgian: "${t.say}"`);
    if (!!b.scene !== !!t.scene) diff(`${w}.scene`, b.scene ? 'the translation drops the scene' : 'the translation adds a scene');
    else if (b.scene) {
      if (b.scene.type !== t.scene.type) diff(`${w}.scene.type`, `${b.scene.type} -> ${t.scene.type}`);
      else cmp(b.scene, t.scene, `${w}.scene`, 'scene');
    }
    if (!!b.meta !== !!t.meta) diff(`${w}.meta`, b.meta ? 'missing in the translation' : 'not in the Georgian spec');
    else if (b.meta) cmp(b.meta, t.meta, `${w}.meta`, 'meta');
    if (!same(b.sfx ?? null, t.sfx ?? null)) diff(`${w}.sfx`, `${JSON.stringify(b.sfx ?? null)} -> ${JSON.stringify(t.sfx ?? null)}`);
    for (const k of ['hold', 'gap']) if (!same(b[k], t[k])) info.push(`${w}.${k} ${b[k] ?? '-'} -> ${t[k] ?? '-'} (timing only)`);
    if (b.scene?.type === 'Phone') info.push(`${w}: Phone ${b.scene.src} is a Georgian app capture in every language`);
  });
  for (const k of Object.keys(notes)) if (!noted.some((n) => n.startsWith(`${k}:`))) info.push(`translationNotes.${k} is not needed any more`);

  const [db, dt] = [duration(B.id), duration(T.id)];
  if (db !== null && dt !== null) {
    const slot = (d) => [15, 20, 30].find((s) => d <= s) ?? Infinity;
    info.push(`voice length ka ${db.toFixed(2)} s, ${lang} ${dt.toFixed(2)} s`);
    if (slot(dt) > slot(db)) diffs.push(`length: ${lang} runs ${dt.toFixed(2)} s, past the ${slot(db)} s slot the Georgian fits; trim words`);
  } else info.push(`no timeline yet for ${db === null ? B.id : T.id}: run python3 tools/vo.py specs/${db === null ? base : `${base}.${lang}`}.json`);

  for (const d of diffs) console.log(`  DIFF  ${d}`);
  for (const n of noted) console.log(`  noted ${n}`);
  for (const n of info) console.log(`  info  ${n}`);
  if (!diffs.length) console.log(`  ok    ${T.beats.length} beats, scenes ${T.beats.filter((b) => b.scene).map((b) => b.scene.type).join(' ')}, chunks ${T.beats.map((b) => chunks(b.say)).join(' ')}`);
  failed ||= diffs.length > 0;
}
process.exit(failed ? 1 : 0);
