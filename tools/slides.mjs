// The Instagram Story slides' renderer (src/slides/Slides.tsx; tools/ci/slides.mjs has the lint and the workflow's tail).
//   node tools/slides.mjs check <id>    the cloud Claude's check of a set (ci/slides.md): the lint, the index, one bundle, a
//                                       half-size still of every slide and the Highlight cover, ONE contact sheet
//                                       (out/<id>.slides.png, the Story's safe zone dashed, the Highlight's circle drawn), the
//                                       pixels (FIELD: always white; SAFE_ZONE: nothing outside x 65..1015, y 250..1580; EDGE_CUT: nothing
//                                       cut by the frame's side; HIGHLIGHT: the icon centred in the circle); it ends on "ready to
//                                       render" or says what to fix
//   node tools/slides.mjs render <id>   the workflow's render step: slide-1.png .. slide-N.png and highlight.png at 1080 x 1920 in
//                                       out/slides/<id>/, the pixels checked again at full size (a slide that breaks them
//                                       fails the run)
// Runs under tools/lock.sh (one Chrome job at a time; VS_LOCKED=1 when the caller holds the lock).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';
import {ID_RE, lintSet, slidesDir} from './ci/slides.mjs';
import {SETTLED, SLOT, STORY} from '../src/slides/zone.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const [cmd, id, ...rest] = process.argv.slice(2);
if (!['check', 'render'].includes(cmd) || !ID_RE.test(String(id ?? ''))) {
  console.error('usage: node tools/slides.mjs check|render <s<n>-slug>');
  process.exit(2);
}
if (!process.env.VS_LOCKED) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, cmd, id, ...rest], {stdio: 'inherit', env: {...process.env, VS_LOCKED: '1'}});
  if (!r.error) process.exit(r.status ?? 1);
  console.log(`slides: tools/lock.sh did not start (${r.error.code}); going on without the lock`);
}
const line = (k, v) => console.log(`  ${k.padEnd(7)} ${v}`);
const fail = (msg) => {
  console.log(`\nNOT READY: ${msg}`);
  process.exit(1);
};
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};

// ---- 1. the lint and the index -------------------------------------------------------------------------------------------
const specFile = path.join(slidesDir(root), `${id}.json`);
const spec = readJson(specFile);
if (!spec) fail(`specs/slides/${id}.json is missing or not valid JSON`);
console.log(`${cmd} ${id}  (specs/slides/${id}.json, ${spec.slides?.length ?? 0} slides)`);
const request = process.env.VS_CI === '1' ? readJson(path.join(root, 'out/ci/request.json')) : null;
const {errors, warns} = lintSet(spec, {root, file: `${id}.json`, request});
errors.forEach((e) => console.log(`          ERROR ${e}`));
warns.forEach((w) => console.log(`          - ${w}`));
if (errors.length) fail(`fix the ${errors.length} lint error${errors.length === 1 ? '' : 's'} above (node tools/ci/slides.mjs lint ${id}), then check again`);
line('lint', warns.length ? `ok, ${warns.length} warning${warns.length === 1 ? '' : 's'} (fix them too)` : 'ok');
const idx = spawnSync(process.execPath, [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, encoding: 'utf8'});
const mine = `${idx.stderr ?? ''}`.split('\n').filter((l) => l.startsWith(`  ${id}: `));
if (idx.status !== 0 || mine.some((l) => /: (ERROR|skipped) /.test(l))) {
  mine.forEach((l) => console.log(`          ${l.trim()}`));
  fail('the index refused the set or its graphic (FILM lines above: node tools/ci/filmlint.mjs <Name>)');
}

// ---- 2. the stills -------------------------------------------------------------------------------------------------------
const full = cmd === 'render';
const scale = full ? 1 : 0.5;
const dir = path.join(root, 'out', 'slides', id, ...(full ? [] : ['check']));
fs.rmSync(dir, {recursive: true, force: true});
fs.mkdirSync(dir, {recursive: true});
const opts = {...renderOpts(), logLevel: 'error'};
for (const k of ['log', 'warn', 'info']) {
  const print = console[k].bind(console);
  console[k] = (...a) => (a.some((x) => /THREE\.\w+: This module has been deprecated/.test(String(x))) ? undefined : print(...a));
}
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});
const browser = await openBrowser('chrome', opts);
const tiles = [];
const t0 = Date.now();
try {
  const comp = await selectComposition({serveUrl, id: `${id}-slides`, ...opts, puppeteerInstance: browser});
  const n = Math.round(comp.durationInFrames / SLOT);
  for (let i = 0; i < n; i++) {
    const output = path.join(dir, `slide-${i + 1}.png`);
    await renderStill({serveUrl, composition: comp, frame: i * SLOT + SETTLED, output, scale, ...opts, puppeteerInstance: browser});
    tiles.push({path: output, label: `${i + 1} ${spec.slides[i]?.layout ?? '?'}`});
  }
  const hl = await selectComposition({serveUrl, id: `${id}-highlight`, ...opts, puppeteerInstance: browser});
  const output = path.join(dir, 'highlight.png');
  await renderStill({serveUrl, composition: hl, frame: 0, output, scale, ...opts, puppeteerInstance: browser});
  tiles.push({path: output, label: 'highlight', highlight: true});
} catch (e) {
  fail(`the stills did not render: ${String(e.message ?? e).split('\n')[0]}`);
} finally {
  await browser.close({silent: true}).catch(() => {});
}
line('stills', `${tiles.length - 1} slides + the Highlight cover in ${((Date.now() - t0) / 1000).toFixed(0)} s (${path.relative(root, dir)}/)`);

// ---- 3. the pixels: the white field, the Story's safe zone, the frame's sides, the Highlight cover ---------------------------
// (the owner, 2026-10-19: ALWAYS the white theme; the phone whole, never cut at the top or the bottom; the Highlight a white
// field with the topic's icon in the middle). Outside y 250..1580 and along the frame's sides nothing but the white field.
const ZONE = String.raw`
import json, sys
import numpy as np
from PIL import Image
a = json.load(sys.stdin)
out = []
for t in a["tiles"]:
    im = np.asarray(Image.open(t["path"]).convert("RGB"), np.int16)
    h, w, _ = im.shape
    s = h / 1920.0
    c = max(2, int(40 * s))
    corners = np.concatenate([im[:c, :c].reshape(-1, 3), im[:c, -c:].reshape(-1, 3), im[-c:, :c].reshape(-1, 3), im[-c:, -c:].reshape(-1, 3)])
    field = np.median(corners, axis=0)
    white = bool(field.min() >= 245)
    diff = np.abs(im - np.array([255, 255, 255])).max(axis=2) > 24
    r = {"label": t["label"], "white": white, "field": [int(x) for x in field]}
    if t.get("highlight"):
        ys, xs = np.nonzero(diff)
        if len(xs):
            cx, cy = (xs.min() + xs.max()) / 2 / s, (ys.min() + ys.max()) / 2 / s
            rad = float(np.sqrt(((xs / s - 540) ** 2 + (ys / s - 960) ** 2)).max())
            r.update({"ink": True, "cx": round(cx), "cy": round(cy), "rad": round(rad), "inkW": round((xs.max() - xs.min()) / s), "inkH": round((ys.max() - ys.min()) / s)})
        else:
            r["ink"] = False
    else:
        top, bot = int(round(a["top"] * s)), int(round(a["bottom"] * s))
        rows = diff.mean(axis=1)
        above = [int(y / s) for y in range(0, top) if rows[y] > 0.002]
        below = [int(y / s) for y in range(bot, h) if rows[y] > 0.002]
        e = max(2, int(10 * s))
        side = bool(diff[:, :e].mean() > 0.002 or diff[:, -e:].mean() > 0.002)
        # Instagram's side margin: nothing drawn left of x edge or right of w - edge
        g = int(round(a["edge"] * s))
        cols = diff.mean(axis=0)
        left = [int(x / s) for x in range(0, g) if cols[x] > 0.002]
        right = [int(x / s) for x in range(w - g, w) if cols[x] > 0.002]
        r.update({"above": above[-1] if above else None, "below": below[0] if below else None, "side": side, "left": left[0] if left else None, "right": right[-1] if right else None})
    out.append(r)
print(json.dumps(out))
`;
const zone = spawnSync('python3', ['-c', ZONE], {input: JSON.stringify({tiles, top: STORY.top, bottom: STORY.bottom, edge: STORY.edge}), encoding: 'utf8'});
const zoneLines = [];
if (zone.status === 0) {
  for (const z of JSON.parse(zone.stdout)) {
    const name = z.label === 'highlight' ? 'the Highlight cover' : `slide ${z.label}`;
    if (!z.white) zoneLines.push(`FIELD ${name}: the field is rgb(${z.field.join(', ')}), not white (the slides are ALWAYS the white theme)`);
    if (z.label === 'highlight') {
      if (!z.ink) zoneLines.push('HIGHLIGHT the cover is empty: the topic\'s icon is missing ("highlight.icon")');
      else {
        if (Math.hypot(z.cx - 540, z.cy - 960) > 40) zoneLines.push(`HIGHLIGHT the icon is not in the middle (its centre at ${z.cx}, ${z.cy}; the circle's at 540, 960)`);
        if (z.rad > 400) zoneLines.push(`HIGHLIGHT the icon reaches ${z.rad} px from the centre: Instagram's circle crops it (keep it inside 400)`);
        if (Math.max(z.inkW, z.inkH) < 250) zoneLines.push(`HIGHLIGHT the icon is only ${Math.max(z.inkW, z.inkH)} px: it disappears in the small circle`);
      }
      continue;
    }
    if (z.above !== null) zoneLines.push(`SAFE_ZONE ${name}: something is drawn at y ${z.above}, above ${STORY.top} (Instagram's profile row covers it)`);
    if (z.below !== null) zoneLines.push(`SAFE_ZONE ${name}: something is drawn at y ${z.below}, below ${STORY.bottom} (the reply bar covers it)`);
    if (z.side) zoneLines.push(`EDGE_CUT ${name}: something touches the frame's side (a phone, a car or a card cut by the edge: keep it whole)`);
    else if (z.left !== null || z.right !== null) zoneLines.push(`SAFE_ZONE ${name}: something is drawn at x ${z.left ?? z.right}, outside x ${STORY.edge}..${STORY.w - STORY.edge} (Instagram's side margin)`);
  }
  zoneLines.forEach((l) => console.log(`          ${l}`));
  line('zone', zoneLines.length ? `${zoneLines.length} problem${zoneLines.length === 1 ? '' : 's'} on the pixels (the lines above)` : `every slide white and whole inside x ${STORY.edge}..${STORY.w - STORY.edge}, y ${STORY.top}..${STORY.bottom}, the Highlight's icon centred`);
} else zoneLines.push(`the pixels were not measured (${(zone.stderr ?? '').trim().split('\n').pop()})`);
if (zoneLines.length) fail(full ? 'a slide breaks the white field, the safe zone or the Highlight (the lines above)' : 'fix what the FIELD, SAFE_ZONE, EDGE_CUT and HIGHLIGHT lines name, then check again');

if (full) {
  console.log(`\nrendered ${tiles.length - 1} slides and highlight.png in out/slides/${id}/`);
  process.exit(0);
}

// ---- 4. ONE contact sheet (two slides alike are the lint's: the same screen and row twice) -------------------------------
const notes = warns.map((w) => `lint: ${w}`);
const sheet = path.join(root, 'out', `${id}.slides.png`);
const PIL = String.raw`
import json, sys
from PIL import Image, ImageDraw, ImageFont
a = json.load(sys.stdin)
tw = 300
th = tw * 16 // 9
gap, lbl, pad, head = 14, 28, 16, 44
n = len(a["tiles"])
cols = min(n, 4)
rows = (n + cols - 1) // cols
W = pad * 2 + cols * tw + (cols - 1) * gap
H = head + rows * (lbl + th) + (rows - 1) * gap + pad
def font(p, size):
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()
mono = font(a["mono"], 16)
img = Image.new("RGB", (W, H), (92, 92, 96))
d = ImageDraw.Draw(img)
d.text((pad, 12), a["header"], font=mono, fill=(250, 250, 250))
for k, t in enumerate(a["tiles"]):
    r, c = divmod(k, cols)
    x, y = pad + c * (tw + gap), head + r * (lbl + th + gap)
    d.text((x, y + 6), t["label"], font=mono, fill=(250, 250, 250))
    tile = Image.open(t["path"]).convert("RGB").resize((tw, th), Image.LANCZOS)
    img.paste(tile, (x, y + lbl))
    d.rectangle([x - 1, y + lbl - 1, x + tw, y + lbl + th], outline=(30, 30, 32))
    if t.get("highlight"):
        cx, cy, rr = x + tw / 2, y + lbl + th / 2, tw / 2
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(230, 60, 60), width=2)
    else:
        for fy in (a["top"], a["bottom"]):
            yy = y + lbl + round(th * fy / 1920)
            for xx in range(x, x + tw, 10):
                d.line([(xx, yy), (min(xx + 5, x + tw - 1), yy)], fill=(230, 60, 60), width=1)
        for fx in (a["edge"], 1080 - a["edge"]):
            xx = x + round(tw * fx / 1080)
            for yy in range(y + lbl, y + lbl + th, 10):
                d.line([(xx, yy), (xx, min(yy + 5, y + lbl + th - 1))], fill=(230, 60, 60), width=1)
img.save(a["out"], optimize=True)
print("%dx%d" % (W, H))
`;
const job = {out: sheet, tiles, header: `${id}  ·  ${spec.topic ?? ''}  ·  ${spec.category ?? ''}  ·  red dashes: the Story's safe zone, red circle: the Highlight's crop`, mono: path.join(root, 'public/fonts/DejaVuSansMono.ttf'), top: STORY.top, bottom: STORY.bottom, edge: STORY.edge};
const py = spawnSync('python3', ['-c', PIL], {input: JSON.stringify(job), encoding: 'utf8'});
if (py.status === 0) line('sheet', `${path.relative(root, sheet)}  (${py.stdout.trim()}; single stills in ${path.relative(root, dir)}/)`);
else {
  line('sheet', `none (${(py.stderr ?? '').trim().split('\n').pop()}); read the stills instead:`);
  tiles.forEach((t) => console.log(`          ${path.relative(root, t.path)}  ${t.label}`));
}
for (const x of notes) line('note', x);
console.log('\nready to render (the workflow renders the full-size slides after you)');
