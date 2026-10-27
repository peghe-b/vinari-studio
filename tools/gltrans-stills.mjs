// The GL transitions' visual proof (src/lib/gltrans.mjs, src/lib/glmask.ts, src/GlProbe.tsx), one bundle:
//   1. gl-probe-diff: every transition's WebGL mask beside its CPU twin (tools/ci/glprobe.py: the GL path drew it, the halves
//      agree), the proof that WebGL renders headless on this machine's GL backend (the cloud: swangle);
//   2. gl-probe: every transition at five steps, a photo into a paper card through the real masks and rim;
//   3. the fixture film(s) with GL cuts (specs/demo-p2-gltrans-*.json): four frames of every GL window, each rendered TWICE
//      (frame-deterministic: the same bytes), and a contact sheet.
//   node tools/gltrans-stills.mjs [--out=<dir>] [--only=diff,show,film]
// Output: <dir>/diff-<type>.png, <dir>/show-<n>.png, <dir>/<id>-<frame>.png, <dir>/*.sheet.png, <dir>/gl.json. On the 8 GB Mac
// only through scripts/heavy.sh (one heavy job at a time); the cloud runs it in .github/workflows/p2-check.yml.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';
import {GL_IDS, isGl} from '../src/lib/gltrans.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const outDir = path.resolve(arg('out') ?? path.join(root, 'out', 'gl'));
const only = new Set((arg('only') ?? 'diff,show,film').split(','));
fs.mkdirSync(outDir, {recursive: true});
const films = fs.readdirSync(path.join(root, 'specs')).filter((f) => /^demo-p2-gltrans-.*\.json$/.test(f)).map((f) => f.slice(0, -5)).sort();
if (only.has('film')) {
  for (const id of films) execFileSync('node', [path.join(root, 'tools/fake-timeline.mjs'), id], {stdio: 'inherit', cwd: root});
  execFileSync('node', [path.join(root, 'tools/build-index.mjs'), ...films], {stdio: 'inherit', cwd: root});
}
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});
const opts = {...renderOpts(), logLevel: 'error'};
const browser = await openBrowser('chrome', opts);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const report = {diff: [], show: [], film: [], twice: []};
const still = async (id, frame, output, inputProps = {}) => {
  const composition = await selectComposition({serveUrl, id, inputProps, ...opts, puppeteerInstance: browser});
  await renderStill({serveUrl, composition, frame, output, scale: 1, inputProps, ...opts, puppeteerInstance: browser});
  return output;
};
let failed = 0;
try {
  if (only.has('diff'))
    for (let i = 0; i < GL_IDS.length; i++) {
      const out = await still('gl-probe-diff', i, path.join(outDir, `diff-${GL_IDS[i]}.png`));
      report.diff.push(out);
      console.log(`diff ${GL_IDS[i]}`);
    }
  if (only.has('show'))
    for (let i = 0; i < GL_IDS.length * 5; i++) {
      const out = await still('gl-probe', i, path.join(outDir, `show-${String(i).padStart(2, '0')}.png`));
      report.show.push(out);
    }
  if (only.has('film'))
    for (const id of films) {
      const plan = JSON.parse(fs.readFileSync(path.join(root, 'out', `${id}.fx.json`), 'utf8'));
      const frames = [];
      for (const c of plan.cuts) {
        if (!c || !isGl(c.type)) continue;
        const a = c.at - c.pre;
        const n = c.pre + c.post;
        frames.push(...[a, a + Math.floor(n / 3), a + Math.floor((2 * n) / 3), a + n - 1].map((f) => ({f, type: c.type})));
        // a control: a frame of the incoming shot past its window (no mask), rendered twice the same way
        frames.push({f: c.at + c.post + 6, type: 'control'});
      }
      if (!frames.length) {
        console.log(`FAIL ${id}: no GL cut in its plan (${plan.notes?.join(' / ')})`);
        failed++;
        continue;
      }
      for (const {f, type} of frames) {
        const out = await still(id, f, path.join(outDir, `${id}-${f}.png`));
        if (type !== 'control') report.film.push({id, f, type, png: out});
        console.log(`${id} @${f} ${type}`);
      }
      // the same frames again: the mask is a pure function of the frame, so a GL frame must come out as its control does
      // (tools/ci/glprobe.py compares the pixels: the cloud's SwiftShader already jitters a few pixels between two renders of
      // the same plain frame, p2-stills.mjs --repeat)
      for (const {f, type} of frames) {
        const a = path.join(outDir, `${id}-${f}.png`);
        const b = await still(id, f, path.join(outDir, `again-${id}-${f}.png`));
        const same = sha(a) === sha(b);
        report.twice.push({id, f, type, a, b, same});
        if (same) fs.rmSync(b, {force: true});
        console.log(`${id} @${f} ${type} twice: ${same ? 'the same bytes' : 'not byte-identical (glprobe.py measures it)'}`);
      }
    }
} finally {
  await browser.close({silent: true}).catch(() => {});
}
fs.writeFileSync(path.join(outDir, 'gl.json'), JSON.stringify(report, null, 1));
try {
  execFileSync('python3', [path.join(root, 'tools/ci/glprobe.py'), outDir], {stdio: 'inherit', cwd: root});
} catch {
  failed++;
}
console.log(failed ? `gltrans stills: ${failed} failed` : 'gltrans stills: all ok');
process.exit(failed ? 1 : 0);
