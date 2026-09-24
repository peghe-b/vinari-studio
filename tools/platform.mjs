// Where the studio runs: the owner's Mac (system Chrome, ANGLE on Metal) or a Linux box such as a
// GitHub Actions runner (Remotion's own chrome-headless-shell, software GL). Every tool takes its
// browser, GL backend, concurrency and ffmpeg from here instead of a hard-coded macOS path.
//
//   import {renderOpts, concurrency, ffmpeg} from './platform.mjs';
//   await renderStill({serveUrl, composition, frame, output, ...renderOpts()});
//   node tools/platform.mjs --flags         the CLI flags for `npx remotion render|still`, space-separated
//                                           (a value with a space is single-quoted: eval-safe)
//   node tools/platform.mjs --flags-lines   the same, one per line (zsh: BROWSER=(${(f)"$(...)"}))
//   node tools/platform.mjs --ffmpeg        the bundled ffmpeg's path (--ffprobe, --bin-dir, --concurrency, --gl)
//   node tools/platform.mjs                 everything as JSON
//
// Env: VS_GL (Linux only: the --gl value, default swangle), VS_CONCURRENCY (both).
//
// Measured 2026-09-24 on v11, 1080x1920, chrome-headless-shell 149 on the M1, 3 tabs: swangle draws the
// Wire3D car the same as ANGLE on Metal (mean difference 0.06/255) but takes 1.2..2.9 s a frame against
// 0.13..0.38 s, whatever the scene (without the 3D scene or the VHS layer it is no faster). 'swiftshader'
// (the old direct path) creates no WebGL context in Chrome 149. VS_GL=angle-egl uses Mesa's llvmpipe
// through the system EGL instead (tools/ci/setup.sh installs Mesa then): untested, a speed experiment.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
export const root = path.dirname(path.dirname(self));

export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

// The Mac uses the installed Chrome (saves the 200 MB chrome-headless-shell download). null elsewhere:
// Remotion then uses its own chrome-headless-shell (`npx remotion browser ensure` fetches it).
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const browserExecutable = isMac && fs.existsSync(MAC_CHROME) ? MAC_CHROME : null;
export const chromeMode = browserExecutable ? 'chrome-for-testing' : 'headless-shell';

// three.js needs a real GL backend. ANGLE goes through Metal on Apple silicon. A Linux runner has no
// GPU: 'swangle' is ANGLE on SwiftShader, the software path Remotion documents for GPU-less Linux
// (remotion.dev/docs/gl-options: "swangle is recommended. Rendering might be slow.", the Lambda default).
export const gl = isMac ? 'angle' : process.env.VS_GL || 'swangle';
export const chromiumOptions = {gl};

// Parallel Chrome tabs. 3 keeps the 8 GB M1 cool; a runner has nothing else to do.
const envConcurrency = Number(process.env.VS_CONCURRENCY);
const cpus = os.cpus().length;
export const concurrency = Number.isInteger(envConcurrency) && envConcurrency > 0 ? envConcurrency : isMac ? 3 : Math.max(2, cpus - 1);

// Remotion's bundled ffmpeg / ffprobe (they carry libfdk_aac, which make.sh's loudness pass encodes with).
// The same package @remotion/renderer picks for this machine.
const isMusl = () => {
  try {
    return isLinux && !process.report?.getReport()?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
};
const compositorNames = () => {
  if (isMac) return [`darwin-${process.arch}`];
  if (isLinux) {
    const [a, b] = isMusl() ? ['musl', 'gnu'] : ['gnu', 'musl'];
    return [`linux-${process.arch}-${a}`, `linux-${process.arch}-${b}`]; // the one npm installed wins
  }
  if (process.platform === 'win32') return ['win32-x64-msvc'];
  return [`${process.platform}-${process.arch}`];
};
const resolveBinDir = () => {
  const names = compositorNames();
  for (const name of names) {
    try {
      return path.dirname(createRequire(self).resolve(`@remotion/compositor-${name}/package.json`));
    } catch {}
  }
  return path.join(root, 'node_modules', `@remotion/compositor-${names[0]}`);
};
export const binDir = resolveBinDir();
const exe = process.platform === 'win32' ? '.exe' : '';
export const ffmpeg = path.join(binDir, `ffmpeg${exe}`);
export const ffprobe = path.join(binDir, `ffprobe${exe}`);

// How @remotion/renderer itself runs these binaries: from their own folder (they load their shared
// libraries from there), DYLD_LIBRARY_PATH set on the Mac. spawnSync(ffmpeg, args, ffOptions()).
export const ffOptions = (extra = {}) => ({
  cwd: binDir,
  ...extra,
  env: {...process.env, ...(isMac ? {DYLD_LIBRARY_PATH: binDir} : {}), ...(extra.env ?? {})},
});

// An env whose PATH starts with the running node's folder, so a child `npx` finds the same node
// (the Mac's node lives in ~/.local/node/bin, which a GUI-started process does not have on PATH).
export const nodeEnv = (extra = {}) => ({
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
  ...extra,
});

// For renderStill / renderMedia / selectComposition / renderFrames.
export const renderOpts = () => ({browserExecutable, chromiumOptions, chromeMode});

// For `npx remotion render|still`. The flags win over remotion.config.ts.
export const cliFlags = () =>
  [`--gl=${gl}`, browserExecutable ? `--browser-executable=${browserExecutable}` : null, `--chrome-mode=${chromeMode}`].filter(Boolean);

const shellQuote = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const arg = process.argv[2];
  const say = (s) => process.stdout.write(`${s}\n`);
  if (arg === '--flags') say(cliFlags().map(shellQuote).join(' '));
  else if (arg === '--flags-lines') say(cliFlags().join('\n'));
  else if (arg === '--ffmpeg') say(ffmpeg);
  else if (arg === '--ffprobe') say(ffprobe);
  else if (arg === '--bin-dir') say(binDir);
  else if (arg === '--concurrency') say(String(concurrency));
  else if (arg === '--gl') say(gl);
  else if (!arg) say(JSON.stringify({isMac, isLinux, browserExecutable, chromeMode, gl, concurrency, binDir, ffmpeg, ffprobe, cliFlags: cliFlags()}, null, 1));
  else {
    console.error('usage: node tools/platform.mjs [--flags | --flags-lines | --ffmpeg | --ffprobe | --bin-dir | --concurrency | --gl]');
    process.exit(2);
  }
}
