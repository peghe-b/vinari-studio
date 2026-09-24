// A local page of everything in out/: open out/index.html in a browser (double-click, no server).
//   node tools/gallery.mjs            -> out/index.html
// One card per video id: the 9:16 player (cover as poster), duration, size, which of 4:5 / 1:1 / 16:9
// and which covers exist (links, with the command that makes the missing ones), the spec title and the
// full Georgian subtitle text from public/vo/<id>/timeline.json. It also says when a file is older than
// its spec (the voice timeline no longer has the rendered length), when a derived format is older than
// its 9:16, and when a spec's facts expire. Plain HTML/CSS, fonts from ../public/fonts, no requests out.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {binDir, ffOptions, nodeEnv} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out');
const env = nodeEnv();
const direct = fs.existsSync(path.join(binDir, 'ffprobe'));

const probe = (file) => {
  const args = ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,duration', '-of', 'json', file];
  const r = direct
    ? spawnSync(path.join(binDir, 'ffprobe'), args, ffOptions({encoding: 'utf8'}))
    : spawnSync('npx', ['remotion', 'ffprobe', ...args], {cwd: root, env, encoding: 'utf8'});
  try {
    const j = JSON.parse(r.stdout);
    const v = j.streams.find((s) => s.codec_type === 'video') ?? {};
    return {duration: Number(j.format.duration), video: Number(v.duration ?? j.format.duration), w: v.width, h: v.height};
  } catch {
    return {duration: NaN, video: NaN};
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};
// a command wraps between arguments, never inside one ("--only" must not break at its hyphens)
const cmdHtml = (c) => c.split(' ').map((t) => `<span>${esc(t)}</span>`).join(' ');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const url = (f) => encodeURIComponent(f);
const mb = (bytes) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const secs = (s) => `${s.toFixed(1).replace('.', ',')} წმ`;
const pad = (n) => String(n).padStart(2, '0');
const day = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const stamp = (d) => `${day(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---------- what is in out/ ----------
const FORMATS = [
  ['9x16', '9:16'],
  ['4x5', '4:5'],
  ['1x1', '1:1'],
  ['16x9', '16:9'],
];
const COVERS = [
  ['cover.png', 'ქავერი 9:16'],
  ['cover-4x5.png', 'პროფილის ბადე 3:4'],
  ['cover-16x9.jpg', 'YouTube 16:9'],
];
const files = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
const ids = new Map();
for (const f of files) {
  if (!f.endsWith('.mp4') || f.startsWith('.') || /\.(tmp|raw)\.mp4$/.test(f)) continue;
  const m = f.match(/^(.+?)\.(4x5|1x1|16x9)\.mp4$/);
  const [id, fmt] = m ? [m[1], m[2]] : [f.slice(0, -4), '9x16'];
  if (!ids.has(id)) ids.set(id, {});
  ids.get(id)[fmt] = f;
}

const order = [...ids.keys()].sort((a, b) => (a.startsWith('demo') - b.startsWith('demo')) || a.localeCompare(b, 'en', {numeric: true}));
let totalSecs = 0;
const cards = order.map((id) => {
  const have = ids.get(id);
  const stat = (f) => fs.statSync(path.join(outDir, f));
  const main = have['9x16'];
  const mainStat = main ? stat(main) : null;
  const mainProbe = main ? probe(path.join(outDir, main)) : null;
  if (mainProbe && Number.isFinite(mainProbe.duration)) totalSecs += mainProbe.duration;
  const spec = readJson(path.join(root, 'specs', `${id}.json`));
  const timeline = readJson(path.join(root, 'public', 'vo', id, 'timeline.json'));
  const rendered = mainStat?.mtime ?? stat(Object.values(have)[0]).mtime;

  // placeholders were filled on the render day: fill them for that day, not today
  const [y, mo, d] = [rendered.getFullYear(), rendered.getMonth(), rendered.getDate()];
  const vars = {daysToJan1: String(Math.round((Date.UTC(y + 1, 0, 1) - Date.UTC(y, mo, d)) / 86400000)), today: day(rendered), year: String(y)};
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

  const flags = [];
  const frames = timeline ? Math.ceil(timeline.duration * 30) / 30 : NaN;
  const stale = mainProbe && timeline && Math.abs(mainProbe.video - frames) > 0.1;
  if (stale) flags.push(['warn', `ვიდეო ძველია: სპეკი რენდერის მერე შეიცვალა (ხმა ახლა ${secs(timeline.duration)}, ფაილში ${secs(mainProbe.video)}). ქვემოთ ახალი ტექსტია. <code>./make.sh ${esc(id)}</code>`]);
  if (!spec) flags.push(['warn', `specs/${esc(id)}.json აღარ არსებობს`]);
  if (spec?.validUntil) {
    const until = new Date(`${spec.validUntil}T23:59:59`);
    const [uy, um, ud] = spec.validUntil.split('-');
    flags.push(new Date() > until ? ['warn', `ვადა გაუვიდა ${ud}.${um}.${uy}: ფაქტები აღარ მოქმედებს`] : ['note', `მოქმედებს ${ud}.${um}.${uy}-მდე`]);
  }
  if (spec && JSON.stringify(spec).includes('{daysToJan1}')) flags.push(['note', `დღეების რიცხვი მართალია მხოლოდ ${day(rendered)}-ს`]);

  // a format is out of date when it no longer matches the spec: the 9:16 and 16:9 by their length
  // against the voice timeline, the crops when they are older than (or cut from an outdated) 9:16
  const redo = [];
  const chips = FORMATS.map(([fmt, label]) => {
    const f = have[fmt];
    if (!f) {
      if (fmt !== '9x16') redo.push(fmt);
      return `<span class="chip off" title="არ არის">${label}</span>`;
    }
    const st = stat(f);
    const p = fmt === '9x16' ? mainProbe : probe(path.join(outDir, f));
    const old =
      fmt === '9x16' ? stale
      : fmt === '16x9' ? timeline && Math.abs(p.video - frames) > 0.1
      : (mainStat && st.mtimeMs < mainStat.mtimeMs) || stale;
    if (old && fmt !== '9x16') redo.push(fmt);
    const dims = p?.w ? `${p.w}×${p.h}` : '';
    return `<a class="chip${old ? ' old' : ''}" href="${url(f)}" title="${esc(`${dims} · ${clock(p?.duration ?? 0)}${old ? ' · ძველია: სპეკს აღარ ემთხვევა' : ''}`)}">${label}<small>${mb(st.size)}</small></a>`;
  }).join('');
  const formatsCmd = !have['9x16'] ? `./make.sh ${id}` : redo.length ? `${stale ? `./make.sh ${id} && ` : ''}node tools/formats.mjs ${id} --only ${redo.join(',')}` : '';
  const covers = COVERS.map(([suffix, label]) => {
    const f = `${id}.${suffix}`;
    return files.includes(f) ? `<a class="chip" href="${url(f)}">${label}<small>${mb(stat(f).size)}</small></a>` : `<span class="chip off">${label}</span>`;
  }).join('');
  const coverCmd = !files.includes(`${id}.cover.png`) || !files.includes(`${id}.cover-16x9.jpg`) ? `node tools/cover.mjs ${id} --wide` : '';
  const poster = files.includes(`${id}.cover.png`) ? `${id}.cover.png` : '';

  const subs = timeline
    ? timeline.beats.map((b) => `<p><time>${clock(b.start)}</time><span>${esc(fill(b.chunks.map((c) => c.text).join(' ')))}</span></p>`).join('')
    : '<p class="none">public/vo/' + esc(id) + '/timeline.json არ არის</p>';
  const mainTag = main
    ? `<video controls playsinline preload="${poster ? 'none' : 'metadata'}"${poster ? ` poster="${url(poster)}"` : ''} src="${url(main)}${poster ? '' : '#t=0.001'}"></video>`
    : `<div class="nomain">9:16 ფაილი არ არის</div>`;

  return `
  <article class="card" id="${esc(id)}">
    <div class="media">${mainTag}</div>
    <div class="head">
      <div class="meta"><span>${esc(id)}</span><span>${mainProbe ? `${clock(mainProbe.duration)} · ${mb(mainStat.size)}` : ''}</span></div>
      <h2>${esc(spec?.title ?? id)}</h2>
      <div class="meta dim"><span>${esc(spec?.voice?.replace('ka-GE-', '').replace('Neural', '') ?? '')}</span><span>${esc(stamp(rendered))}</span></div>
    </div>
    ${flags.map(([kind, html]) => `<div class="flag ${kind}">${html}</div>`).join('')}
    <div class="row"><div class="label">ფორმატები</div><div class="chips">${chips}</div>${formatsCmd ? `<code class="cmd">${cmdHtml(formatsCmd)}</code>` : ''}</div>
    <div class="row"><div class="label">ქავერები</div><div class="chips">${covers}</div>${coverCmd ? `<code class="cmd">${cmdHtml(coverCmd)}</code>` : ''}</div>
    <div class="subs"><div class="label">სუბტიტრები</div>${subs}</div>
  </article>`;
});

const now = new Date();
const html = `<!doctype html>
<html lang="ka">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vinari ვიდეოები</title>
<style>
@font-face { font-family: FiraGO; src: url(../public/fonts/FiraGO-Book.otf); font-weight: 350; }
@font-face { font-family: FiraGO; src: url(../public/fonts/FiraGO-Regular.otf); font-weight: 400; }
@font-face { font-family: FiraGO; src: url(../public/fonts/FiraGO-Medium.otf); font-weight: 500; }
@font-face { font-family: FiraGO; src: url(../public/fonts/FiraGO-SemiBold.otf); font-weight: 600; }
@font-face { font-family: VinariMono; src: url(../public/fonts/DejaVuSansMono.ttf); unicode-range: U+0000-024F, U+2000-206F, U+2190-21FF, U+2212; }
:root {
  color-scheme: dark;
  --ink: #EDEDF2; --ink2: #8A8A8E; --ink3: #7C7C82; --rule: #5E5E63;
  --line: rgba(237,237,242,.09); --panel: rgba(237,237,242,.025);
  --warn: #FF7365; --note: #F7D154;
  --mono: VinariMono, FiraGO, ui-monospace, monospace;
}
* { box-sizing: border-box; }
html { background: #000; }
body {
  margin: 0; min-height: 100vh; color: var(--ink); font-family: FiraGO, system-ui, sans-serif; font-weight: 400;
  background: radial-gradient(ellipse 90% 70% at 50% 0%, #0B0B0E 0%, #070709 55%, #000 100%) fixed;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: ""; position: fixed; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(237,237,242,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(237,237,242,.045) 1px, transparent 1px);
  background-size: 60px 60px;
  -webkit-mask-image: radial-gradient(ellipse 75% 60% at 50% 0%, #000 20%, transparent 80%);
  mask-image: radial-gradient(ellipse 75% 60% at 50% 0%, #000 20%, transparent 80%);
}
.wrap { position: relative; max-width: 1400px; margin: 0 auto; padding: 64px 32px 96px; }
header { display: grid; gap: 14px; }
.kicker { display: flex; align-items: center; gap: 12px; font-family: var(--mono); font-size: 13px; letter-spacing: .06em; color: var(--ink2); }
.kicker img { width: 22px; height: auto; opacity: .92; }
h1 { margin: 0; font-weight: 600; font-size: clamp(34px, 5vw, 52px); letter-spacing: -.01em; line-height: 1.1; }
.summary { color: var(--ink2); font-size: 16px; }
.summary b { color: var(--ink); font-weight: 500; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(290px, 100%), 1fr)); gap: 28px; margin-top: 48px; align-items: start; }
.card { min-width: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 12px 12px 18px; display: grid; gap: 14px; }
.media { aspect-ratio: 9 / 16; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 0 0 1px rgba(237,237,242,.06) inset; }
.media video { width: 100%; height: 100%; display: block; object-fit: contain; background: #000; }
.nomain { height: 100%; display: grid; place-items: center; color: var(--ink3); font-size: 14px; }
.head { display: grid; gap: 6px; padding: 2px 4px 0; }
h2 { margin: 0; font-size: 21px; font-weight: 600; line-height: 1.25; }
.meta { display: flex; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 12px; letter-spacing: .04em; color: var(--ink2); }
.meta.dim { color: var(--ink3); }
.row, .subs { display: grid; gap: 8px; padding: 0 4px; }
.label { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; color: var(--ink3); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: baseline; gap: 7px; padding: 6px 10px; border-radius: 9px; border: 1px solid var(--line);
  font-family: var(--mono); font-size: 12.5px; color: var(--ink); text-decoration: none; background: rgba(237,237,242,.03); transition: border-color .15s, background .15s; }
.chip small { font-size: 11px; color: var(--ink3); }
a.chip:hover { border-color: var(--rule); background: rgba(237,237,242,.07); }
.chip.off { color: #55555B; border-style: dashed; background: none; }
.chip.old { border-color: rgba(247,209,84,.45); }
.cmd { font-family: var(--mono); font-size: 11.5px; line-height: 1.55; color: var(--ink2); background: rgba(237,237,242,.04); border-radius: 7px; padding: 7px 9px; user-select: all; }
.cmd span { white-space: nowrap; }
.flag { margin: 0 4px; padding: 9px 11px; border-radius: 10px; font-size: 13.5px; line-height: 1.45; }
.flag.warn { color: var(--warn); background: rgba(255,115,101,.08); }
.flag.note { color: var(--note); background: rgba(247,209,84,.07); }
.flag code { font-family: var(--mono); font-size: 12px; color: var(--ink); user-select: all; }
.subs { border-top: 1px solid var(--line); padding-top: 14px; margin: 0 4px; padding-left: 0; padding-right: 0; }
.subs p { margin: 0; display: grid; grid-template-columns: 34px 1fr; gap: 8px; font-size: 15px; line-height: 1.5; color: #D6D6DC; }
.subs time { font-family: var(--mono); font-size: 11px; color: var(--ink3); padding-top: 4px; }
.subs .none { display: block; color: var(--ink3); font-size: 13px; }
footer { margin-top: 56px; color: var(--ink3); font-family: var(--mono); font-size: 12px; letter-spacing: .04em; }
.empty { margin-top: 48px; color: var(--ink2); }
@media (max-width: 520px) { .wrap { padding: 40px 16px 64px; } .grid { gap: 20px; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="kicker"><img src="../public/brand/mark.svg" alt="">VINARI · ვიდეო სტუდია</div>
    <h1>ვიდეოები</h1>
    <div class="summary"><b>${order.length}</b> ვიდეო · <b>${clock(totalSecs)}</b> სულ · განახლდა ${esc(stamp(now))}</div>
  </header>
  ${order.length ? `<main class="grid">${cards.join('')}</main>` : '<p class="empty">out/ ცარიელია: <code class="cmd">./make.sh &lt;id&gt;</code></p>'}
  <footer>node tools/gallery.mjs · out/index.html</footer>
</div>
</body>
</html>
`;
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'index.html.tmp'), html);
fs.renameSync(path.join(outDir, 'index.html.tmp'), path.join(outDir, 'index.html'));
console.log(`out/index.html  ${order.length} videos: ${order.join(', ') || '(none)'}`);
