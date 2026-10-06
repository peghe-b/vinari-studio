// The illustrated scenes' voice-free gallery (src/scenes/illo/, the "Graphite" look): stills in both looks, contact
// sheets and motion strips, without a voice or a Gemini request. Run it under tools/lock.sh (one Chrome job at a time).
//
//   node tools/illo-gallery.mjs --kit [--only <demo prefix>]          the kit's parts on their own (src/illo-kit/):
//        backdrops x times, primitives, icons, particles and character effects -> out/illo/kit/<group>.sheet.png
//        (rows = the group's demos, columns = its frames on the dark film, then on paper) and out/illo/kit/index.sheet.png
//   node tools/illo-gallery.mjs --wave a|b|c|ref [--only Call] [--staging desk] [--video]
//        the scenes of a wave through Promo (the real SceneHost, layers and lens): writes specs/demo-illo-<w>.json (one
//        beat per scene x staging, 3 subtitle chunks of 1.0 s, events at chunks 1 and 2, a punch word on every third)
//        and its synthetic timeline public/vo/demo-illo-<w>/timeline.json (voice "none"), indexes it (build-index), then
//        stills at each scene's local frames 0, 10, chunk 1 + 4, chunk 2 + 8 and 95 %, half size, dark AND light:
//        out/illo/<Type>.sheet.png (rows = stagings, the 5 frames dark then light), out/illo/index.sheet.png (one hero
//        tile per staging) and a motion strip per scene (mean grey change between its stills; STATIC when all < 0.6).
//        Scenes whose file does not exist yet are skipped. --video: one silent mp4 of the wave, dark, half size
//        (out/illo/demo-illo-<w>.mp4). "ref" is a few existing picture stagings: the old look next to the new one, and
//        the tool's own self-test.
//   --looks dark,light   which looks (default both);  --frames 0,30,60   override the kit demo's frames
import {bundle} from '@remotion/bundler';
import {getCompositions, openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const looks = (opt('--looks') ?? 'dark,light').split(',').filter((x) => x === 'dark' || x === 'light');
const only = opt('--only');
const onlyStaging = opt('--staging');
const rel = (p) => path.relative(root, p);

// ---- the demo table: one row per scene x staging (section 10.1 of the scene library's spec) ---------------------------
// `p` is the scene's props beside type and staging; events sit at chunks 1 and 2 of the scene's 3 chunks.
const KA = {
  Call: 'ზარი', Chat: 'მიმოწერა', Screen: 'ეკრანი', Drive: 'გზაზე', Windshield: 'საქარე მინიდან', Dashboard: 'დაფა',
  EngineBay: 'კაპოტის ქვეშ', Tyre: 'საბურავი', Pump: 'ბენზინი', Garage: 'სახელოსნო', Stop: 'გაჩერება', Route: 'რუკა',
  Money: 'ფული', Clock: 'დრო', Person: 'ადამიანი', Crowd: 'ხალხი', Heartbreak: 'უარი', GlowUp: 'ახალი სახე',
  Celebrate: 'ზეიმი', Impact: 'დარტყმა', Race: 'რბოლა', Notification: 'შეტყობინება', Calendar: 'კალენდარი', Wave: 'ხმა', QRCard: 'ბარათი',
};
const WAVES = {
  a: [
    {type: 'Call', staging: 'hand', p: {name: 'დედა', outcome: {is: 'answer', at: 1}, where: 'station'}},
    {type: 'Call', staging: 'desk', p: {name: 'ხელოსანი', outcome: {is: 'ignore'}}},
    {type: 'Call', staging: 'mount', p: {name: 'უცნობი ნომერი', outcome: {is: 'decline', at: 2}}},
    {type: 'Call', staging: 'pocket', p: {name: 'დედა'}},
    {type: 'Call', staging: 'missed', p: {name: 'დედა', count: 3}},
    {type: 'Chat', staging: 'thread', p: {contact: 'დედა', messages: [{text: 'სად ხარ?', from: 'them', at: 0}, {text: 'გზაში ვარ', from: 'me', at: 1}, {text: 'კარგი', from: 'them', at: 2, react: 'heart'}]}},
    {type: 'Chat', staging: 'bubble', p: {contact: 'დედა', messages: [{text: 'სად ხარ?', from: 'them', at: 1}]}},
    {type: 'Chat', staging: 'group', p: {contact: 'ბიჭები', messages: [{text: 'ვინ მოდის?', from: 'friend', at: 0}, {text: 'მე', from: 'me', at: 1, react: 'like'}, {text: 'ხვალ', from: 'girl', at: 2}]}},
    {type: 'Drive', staging: 'side', p: {speed: 0.7, backdrop: 'city', events: [{is: 'brake', at: 2}]}},
    {type: 'Drive', staging: 'rear', p: {speed: 0.6, backdrop: 'highway', weather: 'rain', time: 'night', events: [{is: 'brake', at: 1}]}},
    {type: 'Drive', staging: 'top', p: {speed: 0.8, traffic: 2}},
    {type: 'Windshield', staging: 'road', p: {weather: 'rain', events: [{is: 'turn-left', at: 1}]}},
    {type: 'Windshield', staging: 'traffic', p: {time: 'night', events: [{is: 'brake', at: 1}]}},
    {type: 'Windshield', staging: 'parking', p: {events: [{is: 'found', at: 2}]}},
    {type: 'Dashboard', staging: 'cluster', p: {light: 'engine', at: 1}},
    {type: 'Dashboard', staging: 'light', p: {light: 'battery', at: 1}},
    {type: 'Dashboard', staging: 'fuel', p: {needle: {from: 0.4, to: 0, at: 1}, at: 2}},
    {type: 'Person', staging: 'solo', p: {cast: 'me', acts: [{at: 1, face: 'shock', fx: 'shock'}, {at: 2, face: 'smirk', pose: 'shrug'}]}},
    {type: 'Person', staging: 'pair', p: {cast: ['me', 'mom'], acts: [{at: 1, who: 1, face: 'worried', say: 'ჰა?'}, {at: 2, who: 0, face: 'grin', pose: 'thumbsUp'}]}},
    {type: 'Person', staging: 'think', p: {cast: 'me', think: 'money', acts: [{at: 1, face: 'worried'}, {at: 2, face: 'smile', fx: 'idea'}]}},
    {type: 'Person', staging: 'full', p: {cast: 'me', backdrop: 'city', acts: [{at: 1, pose: 'point'}, {at: 2, pose: 'jump', face: 'laugh'}]}},
    {type: 'Money', staging: 'rain', p: {direction: 'in', at: 1}},
    {type: 'Money', staging: 'wallet', p: {at: 1}},
    {type: 'Money', staging: 'tag', p: {from: 120, value: 300, format: 'gel', at: 1}},
    {type: 'Money', staging: 'receipt', p: {value: 640, format: 'gel', at: 2}},
    {type: 'Impact', staging: 'burst', p: {word: 'ბუმ', at: 0}},
    {type: 'Impact', staging: 'bump', p: {at: 1}},
    {type: 'Impact', staging: 'crack', p: {glass: 'phone', at: 1}},
  ],
  b: [
    ...['balance', 'camera', 'search', 'battery'].map((s) => ({type: 'Screen', staging: s, p: {at: 1}})),
    ...['open', 'steam', 'part'].map((s) => ({type: 'EngineBay', staging: s, p: {part: 'battery', at: 1}})),
    ...['wheel', 'flat', 'tread', 'gauge'].map((s) => ({type: 'Tyre', staging: s, p: {at: 1}})),
    ...['nozzle', 'display', 'station'].map((s) => ({type: 'Pump', staging: s, p: {at: 2}})),
    ...['lift', 'build', 'bill'].map((s) => ({type: 'Garage', staging: s, p: {at: 1}})),
    ...['police', 'inspection', 'tow'].map((s) => ({type: 'Stop', staging: s, p: {at: 1, outcome: s === 'inspection' ? 'pass' : 'fine'}})),
    ...['city', 'detour', 'lost'].map((s) => ({type: 'Route', staging: s, p: {at: 1}})),
    ...['wall', 'stopwatch', 'hourglass', 'calendar', 'daynight'].map((s) => ({type: 'Clock', staging: s, p: {at: 1, spin: 3}})),
  ],
  c: [
    ...['row', 'phones', 'faces'].map((s) => ({type: 'Crowd', staging: s, p: {at: 1, react: 'shock'}})),
    ...['flowers', 'door', 'heart', 'laugh'].map((s) => ({type: 'Heartbreak', staging: s, p: {at: 1, ok: {at: 2}}})),
    ...['person', 'car', 'garage'].map((s) => ({type: 'GlowUp', staging: s, p: {at: 1}})),
    ...['confetti', 'podium', 'keys'].map((s) => ({type: 'Celebrate', staging: s, p: {at: 1}})),
    ...['track', 'flag', 'grid'].map((s) => ({type: 'Race', staging: s, p: {at: 1}})),
  ],
  // the old look, for comparison and as the tool's own self-test (existing scenes only)
  ref: [
    {type: 'Notification', staging: 'desk', p: {title: 'Vinari', body: 'ზეთის შეცვლის დროა', at: 1}},
    {type: 'Calendar', staging: 'tearoff', p: {month: 'ოქტომბერი 2026', days: 31, startWeekday: 3, marks: [{day: 14, label: 'ტექდათვალიერება', at: 1}], today: 6, countdownTo: 14, at: 1}},
    {type: 'Wave', staging: 'radial', p: {pick: 0, at: 1}},
  ],
};
const PUNCH = ['აჰა', 'ჰოპ', 'ვაიმე', 'ნელა', 'სტოპ'];

const sceneExists = (type) => fs.existsSync(path.join(root, 'src', 'scenes', `${type}.tsx`));
const sceneFrames = (start) => [0, 10, 34, 68, 85].map((f) => start + f); // 3 chunks of 30 frames: 0, 10, ev1+4, ev2+8, 95 %

// ---- the contact sheets (Pillow, like tools/check.mjs) ------------------------------------------------------------------
const SHEET = String.raw`
import json, sys
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat
a = json.load(sys.stdin)
def font(p, size):
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()
mono, small = font(a["mono"], 18), font(a["mono"], 14)
tw = a["tw"]; th = tw * 16 // 9
gap, lbl, pad, head, side = 8, 22, 14, 40, a.get("side", 150)
out_lines = []
for sh in a["sheets"]:
    rows = sh["rows"]
    cols = max(len(r["tiles"]) for r in rows)
    W = pad * 2 + side + cols * tw + (cols - 1) * gap
    H = head + len(rows) * (lbl + th + gap) + pad
    img = Image.new("RGB", (W, H), (92, 92, 96))
    d = ImageDraw.Draw(img)
    d.text((pad, 10), sh["title"], font=mono, fill=(250, 250, 250))
    for r, row in enumerate(rows):
        y = head + r * (lbl + th + gap)
        d.text((pad, y + lbl + 4), row["label"], font=mono, fill=(250, 250, 250))
        prev = None
        diffs = []
        for c, t in enumerate(row["tiles"]):
            x = pad + side + c * (tw + gap)
            d.text((x, y + 4), t["label"], font=small, fill=(235, 235, 235))
            try:
                im = Image.open(t["path"]).convert("RGB")
            except Exception:
                continue
            img.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lbl))
            d.rectangle([x - 1, y + lbl - 1, x + tw, y + lbl + th], outline=(30, 30, 32))
            if t.get("motion"):
                g = im.convert("L").resize((108, 192), Image.BILINEAR)
                if prev is not None:
                    diffs.append(ImageStat.Stat(ImageChops.difference(g, prev)).mean[0])
                prev = g
        if diffs:
            verdict = "STATIC" if all(v < 0.6 for v in diffs) else "moves"
            out_lines.append("%-28s %s  %s" % (row["label"], " ".join("%.1f" % v for v in diffs), verdict))
            d.text((pad, y + lbl + 30), verdict, font=small, fill=(255, 140, 120) if verdict == "STATIC" else (200, 230, 200))
    img.save(sh["out"], optimize=True)
    out_lines.append("sheet\t%s\t%dx%d" % (sh["out"], W, H))
print("\n".join(out_lines))
`;
const makeSheets = (sheets, tw = 200, side = 150) => {
  const job = {sheets, tw, side, mono: path.join(root, 'public/fonts/DejaVuSansMono.ttf')};
  const py = spawnSync('python3', ['-c', SHEET], {input: JSON.stringify(job), encoding: 'utf8', maxBuffer: 1 << 24});
  if (py.status !== 0) console.error((py.stderr ?? '').trim().split('\n').slice(-3).join('\n'));
  else
    py.stdout
      .trim()
      .split('\n')
      .forEach((l) => console.log(`  ${l.startsWith('sheet\t') ? `sheet ${rel(l.split('\t')[1])}  ${l.split('\t')[2]}` : l}`));
};

const opts = {...renderOpts(), logLevel: 'error'};

// ---- --kit: the parts on their own ----------------------------------------------------------------------------------------
const kit = async () => {
  const dir = path.join(root, 'out/illo/kit');
  fs.mkdirSync(dir, {recursive: true});
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/illo-kit/index.ts'), publicDir: path.join(root, 'public')});
  const browser = await openBrowser('chrome', opts);
  const groups = new Map();
  const t0 = Date.now();
  let n = 0;
  try {
    const comps = (await getCompositions(serveUrl, {...opts, puppeteerInstance: browser})).filter((c) => c.id.startsWith('kit-') && (!only || c.id.slice(4).startsWith(only)));
    for (const c of comps) {
      const {demo, group, row} = c.defaultProps;
      const frames = opt('--frames') ? opt('--frames').split(',').map(Number) : c.defaultProps.frames;
      const tiles = [];
      for (const look of looks) {
        const composition = await selectComposition({serveUrl, id: c.id, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
        for (const frame of frames) {
          const output = path.join(dir, `${demo}.${look}.${frame}.png`);
          await renderStill({serveUrl, composition, frame, output, scale: 0.5, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
          tiles.push({path: output, label: `${look} f${frame}`});
          n++;
        }
      }
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({label: row, tiles, hero: tiles[Math.min(1, tiles.length - 1)]});
      console.log(`  ${demo}: ${tiles.length} stills`);
    }
    if (flag('--video') && only) {
      const c = comps[0];
      const composition = await selectComposition({serveUrl, id: c.id, inputProps: {theme: 'dark'}, ...opts, puppeteerInstance: browser});
      const output = path.join(dir, `${c.defaultProps.demo}.mp4`);
      await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: output, muted: true, scale: 0.5, inputProps: {theme: 'dark'}, ...opts, puppeteerInstance: browser});
      console.log(`  video ${rel(output)}`);
    }
  } finally {
    await browser.close({silent: true}).catch(() => {});
    // a bundle is ~130 MB in the temp folder and nothing reuses it: a run that leaves it behind fills the disk
    fs.rmSync(serveUrl, {recursive: true, force: true});
  }
  console.log(`  ${n} stills in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${rel(dir)}/`);
  const sheets = [...groups].map(([g, rows]) => ({title: `illo kit · ${g} · columns: ${looks.join(' then ')}`, rows, out: path.join(dir, `${g}.sheet.png`)}));
  const all = [...groups].flatMap(([g, rows]) => rows.map((r) => ({label: `${g}`.replace(/^backdrop-/, ''), tiles: r.tiles.filter((t, i) => i === 0 || i === r.tiles.length / 2).map((t) => ({...t, label: `${r.label} ${t.label}`}))})));
  // the index: every demo's first dark and first light frame, four demos a row
  const idxRows = [];
  for (let i = 0; i < all.length; i += 4) idxRows.push({label: all[i].label, tiles: all.slice(i, i + 4).flatMap((r) => r.tiles)});
  if (!only) sheets.push({title: 'illo kit · index (each demo: dark, light)', rows: idxRows, out: path.join(dir, 'index.sheet.png')});
  makeSheets(sheets, 200, 170);
};

// ---- --wave: scenes through Promo -----------------------------------------------------------------------------------------
const wave = async (w) => {
  const table = WAVES[w];
  if (!table) throw new Error(`unknown wave "${w}": ${Object.keys(WAVES).join(', ')}`);
  const rows = table.filter((r) => sceneExists(r.type) && (!only || r.type === only) && (!onlyStaging || r.staging === onlyStaging));
  const missing = [...new Set(table.filter((r) => !sceneExists(r.type)).map((r) => r.type))];
  if (missing.length) console.log(`  not built yet (skipped): ${missing.join(', ')}`);
  if (!rows.length) {
    console.log(`  wave ${w}: nothing to render yet`);
    return;
  }
  const id = `demo-illo-${w}${only ? `-${only.toLowerCase()}` : ''}${onlyStaging ? `-${onlyStaging}` : ''}`;
  const CH = 3;
  const beats = rows.map((r, i) => {
    const label = `${KA[r.type] ?? r.type}, ${r.staging}`;
    const scene = {type: r.type, staging: r.staging, ...r.p};
    if (i % 3 === 2 && scene.word === undefined && r.type !== 'Impact') scene.word = {text: PUNCH[(i / 3) % PUNCH.length | 0], at: 1};
    const show = [label, 'პირველი მოვლენა', 'მეორე მოვლენა'].join(' | ');
    const say = [KA[r.type] ?? 'სცენა', 'პირველი მოვლენა', 'მეორე მოვლენა'].join(' | '); // never voiced: Georgian only, like a real spec
    return {say, show, meta: [`${r.type} · ${r.staging}`], scene};
  });
  const spec = {id, title: `ილუსტრაციები ${w.toUpperCase()}: ${[...new Set(rows.map((r) => r.type))].join(', ')}`, lang: 'ka', narration: false, music: null, voice: 'none', beats};
  fs.writeFileSync(path.join(root, 'specs', `${id}.json`), `${JSON.stringify(spec, null, 2)}\n`);
  const tlBeats = beats.map((b, i) => {
    const start = i * CH;
    return {i, start, end: start + CH, speechStart: start, speechEnd: start + CH, chunks: b.show.split('|').map((t, k) => ({text: t.trim(), start: start + k, end: start + k + 1}))};
  });
  const vo = path.join(root, 'public/vo', id);
  fs.mkdirSync(vo, {recursive: true});
  fs.writeFileSync(path.join(vo, 'timeline.json'), `${JSON.stringify({id, voice: 'none', duration: beats.length * CH, beats: tlBeats}, null, 1)}\n`);
  execFileSync('node', [path.join(root, 'tools/build-index.mjs'), id], {stdio: 'inherit'});

  const dir = path.join(root, 'out/illo');
  const stillDir = path.join(dir, 'stills');
  fs.mkdirSync(stillDir, {recursive: true});
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
  const browser = await openBrowser('chrome', opts);
  const byType = new Map();
  const t0 = Date.now();
  try {
    for (const look of looks) {
      const composition = await selectComposition({serveUrl, id, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
      for (const [i, r] of rows.entries()) {
        const key = `${r.type}:${r.staging}`;
        if (!byType.has(r.type)) byType.set(r.type, new Map());
        const m = byType.get(r.type);
        if (!m.has(key)) m.set(key, {label: r.staging, tiles: []});
        for (const [j, frame] of sceneFrames(i * CH * 30).entries()) {
          const output = path.join(stillDir, `${r.type}-${r.staging}.${look}.${j}.png`);
          await renderStill({serveUrl, composition, frame, output, scale: 0.5, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
          m.get(key).tiles.push({path: output, label: `${look} f${frame - i * CH * 30}`, motion: look === 'dark'});
        }
      }
    }
    if (flag('--video')) {
      const composition = await selectComposition({serveUrl, id, inputProps: {theme: 'dark'}, ...opts, puppeteerInstance: browser});
      const output = path.join(dir, `${id}.mp4`);
      await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: output, muted: true, scale: 0.5, inputProps: {theme: 'dark'}, ...opts, puppeteerInstance: browser});
      console.log(`  video ${rel(output)}`);
    }
  } finally {
    await browser.close({silent: true}).catch(() => {});
    // a bundle is ~130 MB in the temp folder and nothing reuses it: a run that leaves it behind fills the disk
    fs.rmSync(serveUrl, {recursive: true, force: true});
  }
  console.log(`  ${rows.length} scenes x ${looks.length} looks x 5 frames in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${rel(stillDir)}/`);
  const sheets = [...byType].map(([type, m]) => ({title: `${type} · ${id} · 5 frames: 0, 10, chunk 1 + 4, chunk 2 + 8, 95 %; ${looks.join(' then ')}`, rows: [...m.values()], out: path.join(dir, `${type}.sheet.png`)}));
  const heroes = [...byType].flatMap(([type, m]) => [...m.values()].map((r) => ({...r.tiles[2], label: `${type} ${r.label}`, motion: false})));
  const idx = [];
  for (let i = 0; i < heroes.length; i += 6) idx.push({label: `${i + 1}..${Math.min(heroes.length, i + 6)}`, tiles: heroes.slice(i, i + 6)});
  sheets.push({title: `${id} · index: one hero tile per staging (chunk 1 + 4, ${looks[0]})`, rows: idx, out: path.join(dir, `${only ? id : `index-${w}`}.sheet.png`)});
  makeSheets(sheets, 200, 120);
};

if (flag('--kit')) await kit();
else if (opt('--wave')) await wave(opt('--wave'));
else {
  console.log('usage: node tools/illo-gallery.mjs --kit [--only <demo>] | --wave a|b|c|ref [--only <Type>] [--staging <name>] [--video] [--looks dark,light]');
  process.exit(2);
}
