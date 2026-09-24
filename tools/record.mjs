// The owner's own voice for a video, recorded line by line like a teleprompter.
//
//   node tools/record.mjs <id>              -> http://127.0.0.1:4788 opens in the browser
//   node tools/record.mjs <id> --assemble   rebuild the voice from the kept takes (after a gap/hold change)
//   node tools/record.mjs --selftest        synthetic recordings through the whole path, no mic
//
// The page shows the spec's subtitle chunks one at a time ("say", what to read, with the
// on-screen "show" under it). Space starts a take, Space again stops it; the page moves on.
// Each take is a MediaRecorder file (webm/opus in Chrome, mp4/aac in Safari), decoded by
// Remotion's bundled ffmpeg (it has the matroska/mp4 demuxers and the opus/aac decoders),
// high-passed at 80 Hz, cut on the speech (the key clicks at both ends are muted), and kept in
// out/voices/rec/<id>/. Enter (or the button) assembles them exactly the way tools/vo.py lays
// out a voice: leadIn, sentenceGap, gap + hold, tail, the same 0.10 s / 0.25 s pads around the
// speech, takes evened out against each other and the whole voice at -22.6 LUFS (the Edge voice
// the ASMR kit is balanced against). It writes
//     public/vo/<id>/voice.wav        24 kHz mono 16-bit, like vo.py
//     public/vo/<id>/timeline.json    vo.py's format, "voice": "recorded", "source": "recorded",
//                                     every beat's "src" = the hash of the words it was read from
// and tools/vo.py keeps that voice until the spec's words change (then only the changed lines
// are asked for again: a take whose text still matches is kept). Set "voice": "recorded" in the
// spec so a missing or stale recording stops the build instead of falling back to a TTS voice.
import {spawn} from 'node:child_process';
import {ffOptions, ffmpeg as FFMPEG} from './platform.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const studio = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT ?? 4788);
const SR = 24000;
const PAD_IN = 0.1, PAD_OUT = 0.25; // vo.py's pads around the speech
const TARGET_LUFS = -22.6; // measured on the Edge voices: v1 -23.2, v4 -22.0, v7 -22.6
const PEAK_CAP = 10 ** (-3 / 20);
const voOut = () => process.env.VO_OUT || path.join(studio, 'public', 'vo'); // env: tests only
const recDir = (id) => path.join(process.env.REC_DIR || path.join(studio, 'out', 'voices', 'rec'), id);

// ---- spec ------------------------------------------------------------------------------------
const specFile = (arg) => {
  if (fs.existsSync(arg) && arg.endsWith('.json')) return arg;
  const dir = path.join(studio, 'specs');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      if (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).id === arg) return path.join(dir, f);
    } catch {}
  }
  throw new Error(`no spec with id ${arg} in specs/`);
};
/** The words a beat was read from (vo.py said_hash: sha1 of the whitespace-normalised "say"). */
export const saidHash = (say) => crypto.createHash('sha1').update(say.trim().split(/\s+/).join(' '), 'utf8').digest('hex').slice(0, 12);
const clean = (s) => s.trim().split(/\s+/).join(' ');
/** Every chunk in order: what to read, what shows, and where a sentence / beat ends (vo.py's rule). */
const chunksOf = (spec) =>
  spec.beats.flatMap((b, bi) => {
    const say = b.say.split('|');
    const show = (b.show ?? b.say).split('|');
    if (show.length !== say.length) throw new Error(`beat ${bi}: "show" has ${show.length} chunks, "say" has ${say.length}`);
    return say.map((s, ci) => ({b: bi, c: ci, say: clean(s), show: show[ci].trim(), sentenceEnd: /[.?!]\s*$/.test(s.trim()) || ci === say.length - 1, beatEnd: ci === say.length - 1}));
  });

// ---- audio -----------------------------------------------------------------------------------
const run = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-nostdin', ...args], {env: ffOptions().env}); // paths may be relative: keep the cwd
    const out = [], err = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve({out: Buffer.concat(out), err: Buffer.concat(err).toString()}) : reject(new Error(`ffmpeg: ${Buffer.concat(err).toString().trim().split('\n').slice(-3).join(' | ')}`))));
  });
/** Any recording -> Float32Array, 24 kHz mono (this ffmpeg has no raw s16le muxer: via a WAV file). */
const decode = async (file) => {
  const tmp = `${file}.dec.wav`;
  await run(['-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-acodec', 'pcm_s16le', '-y', tmp]);
  try {
    return readWav(tmp);
  } finally {
    fs.rmSync(tmp, {force: true});
  }
};
/** Integrated loudness (BS.1770, ffmpeg loudnorm's measuring pass), null when too short. */
const lufs = async (file) => {
  const {err} = await run(['-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
  const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
  const v = Number(j.input_i);
  return Number.isFinite(v) && v > -70 ? v : null;
};
const wavBytes = (x) => {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + x.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  return b;
};
const writeAtomic = (file, data) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file + '.tmp', data);
  fs.renameSync(file + '.tmp', file);
};
const readWav = (file) => {
  const b = fs.readFileSync(file);
  const i = b.indexOf('data', 12);
  const n = b.readUInt32LE(i + 4) >> 1;
  return Float32Array.from({length: n}, (_, k) => b.readInt16LE(i + 8 + k * 2) / 32768);
};
/** RBJ biquad high-pass: no rumble, no DC under the voice. */
const highpass = (x, fc = 80) => {
  const w = (2 * Math.PI * fc) / SR, al = Math.sin(w) / (2 * Math.SQRT1_2), c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    (x2 = x1), (x1 = x[i]), (y2 = y1), (y1 = v), (y[i] = v);
  }
  return y;
};
const ramp = (x, from, to, up) => {
  const a = Math.max(0, Math.round(from * SR)), z = Math.min(x.length, Math.round(to * SR));
  for (let i = a; i < z; i++) x[i] *= up ? (i - a) / (z - a) : (z - i) / (z - a);
};
const mute = (x, from, to) => x.fill(0, Math.max(0, Math.round(from * SR)), Math.min(x.length, Math.round(to * SR)));
/** Speech as runs of 10 ms windows well above the take's noise floor (tools/vo.py voiced_runs):
 *  runs closer than 250 ms merge, a lone run under 90 ms is a click. */
const voicedRuns = (x) => {
  const win = SR / 100, rms = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0;
    for (let k = i; k < i + win; k++) s += x[k] * x[k];
    rms.push(Math.sqrt(s / win));
  }
  if (!rms.length) return [];
  const live = rms.filter((v) => v > 0).sort((a, b) => a - b); // muted key-click zones are not the room
  const floor = live.length ? live[Math.floor(live.length / 10)] : 0;
  const thr = Math.max(floor * 3.2, Math.max(...rms) * 10 ** (-38 / 20), 30 / 32768);
  const runs = [];
  rms.forEach((v, k) => {
    if (v <= thr) return;
    if (runs.length && runs.at(-1)[1] === k) runs.at(-1)[1] = k + 1;
    else runs.push([k, k + 1]);
  });
  const merged = [];
  for (const r of runs) {
    if (merged.length && r[0] - merged.at(-1)[1] < 25) merged.at(-1)[1] = r[1];
    else merged.push([...r]);
  }
  const out = merged.filter(([a, b]) => b - a >= 9).map(([a, b]) => [a / 100, b / 100]);
  out.loudest = Math.max(...rms);
  return out;
};
const db = (v) => (v > 0 ? 20 * Math.log10(v) : -120);

/** One take: decode, clean, find the speech, cut it with vo.py's pads. `stopAt` is when the stop
 *  key was pressed (seconds into the recording): its click and everything after it is muted. */
export const processTake = async (file, stopAt) => {
  let x = highpass(await decode(file));
  const total = x.length / SR;
  const peakDb = db(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
  mute(x, 0, 0.1); // the start key
  ramp(x, 0.1, 0.12, true);
  const end = stopAt > 0 ? Math.min(total, stopAt - 0.03) : total;
  if (end < total) {
    ramp(x, end - 0.02, end, false);
    mute(x, end, total);
  }
  const runs = voicedRuns(x);
  // a voice at any usable distance has 10 ms windows well over -48 dBFS; a quiet room never does
  if (!runs.length || runs.loudest < 10 ** (-48 / 20)) return {error: 'ხმა ვერ გავიგე. მიკროფონი ჩართულია?'};
  const onset = runs[0][0], offset = runs.at(-1)[1];
  const a = Math.max(0, onset - PAD_IN), z = Math.min(total, offset + PAD_OUT);
  const seg = x.slice(Math.round(a * SR), Math.round(z * SR));
  ramp(seg, 0, 0.03, true); // the pads are room tone: let them breathe in and out
  ramp(seg, seg.length / SR - 0.08, seg.length / SR, false);
  let s = 0;
  for (let i = Math.round((onset - a) * SR); i < Math.round((offset - a) * SR); i++) s += seg[i] * seg[i];
  const levelDb = db(Math.sqrt(s / Math.max(1, (offset - onset) * SR)));
  const warnings = [];
  if (peakDb > -1) warnings.push('ძალიან ხმამაღალია (იჭრება): ცოტა მოშორდი მიკროფონს');
  if (levelDb < -42) warnings.push('ძალიან ჩუმია: მიუახლოვდი მიკროფონს');
  if (onset < 0.14) warnings.push('დასაწყისი შეიძლება მოიჭრა: ღილაკის მერე წამის მეოთხედი მოიცადე');
  if (stopAt > 0 && offset > stopAt - 0.06) warnings.push('ბოლო შეიძლება მოიჭრა: დაამთავრე და მერე დააჭირე');
  return {pcm: seg, onset: onset - a, offset: offset - a, speech: offset - onset, levelDb, peakDb, warnings};
};

// ---- takes and assembly ----------------------------------------------------------------------
const loadManifest = (id) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(recDir(id), 'takes.json'), 'utf8'));
  } catch {
    return {};
  }
};
const saveManifest = (id, man) => writeAtomic(path.join(recDir(id), 'takes.json'), JSON.stringify(man, null, 1));
/** The kept take of a chunk, only while it was read from the chunk's current words. */
const takeOf = (id, man, ch) => {
  const t = man[`${ch.b}.${ch.c}`];
  return t && t.say === ch.say && fs.existsSync(path.join(recDir(id), t.file)) ? t : null;
};

export const saveTake = async (id, ch, raw, ext, stopAt) => {
  const dir = recDir(id);
  fs.mkdirSync(dir, {recursive: true});
  const base = `b${String(ch.b).padStart(2, '0')}-c${ch.c}`;
  const rawFile = path.join(dir, `${base}.${ext}`);
  writeAtomic(rawFile, raw);
  const r = await processTake(rawFile, stopAt);
  if (r.error) return r;
  writeAtomic(path.join(dir, `${base}.wav`), wavBytes(r.pcm));
  const man = loadManifest(id);
  man[`${ch.b}.${ch.c}`] = {say: ch.say, file: `${base}.wav`, raw: `${base}.${ext}`, onset: r.onset, offset: r.offset, speech: +r.speech.toFixed(3), levelDb: +r.levelDb.toFixed(1), peakDb: +r.peakDb.toFixed(1), warnings: r.warnings, at: new Date().toISOString()};
  saveManifest(id, man);
  return man[`${ch.b}.${ch.c}`];
};

/** vo.py's layout from the kept takes -> public/vo/<id>/voice.wav + timeline.json. */
export const assemble = async (spec) => {
  const man = loadManifest(spec.id);
  const all = chunksOf(spec);
  const missing = all.filter((ch) => !takeOf(spec.id, man, ch));
  if (missing.length) throw new Error(`not recorded yet: ${missing.map((m) => `beat ${m.b} chunk ${m.c} ("${m.say}")`).join(', ')}`);
  const takes = all.map((ch) => ({ch, t: takeOf(spec.id, man, ch), pcm: readWav(path.join(recDir(spec.id), takeOf(spec.id, man, ch).file))}));
  // even the takes out (the same voice at another distance), 70 % of the way, at most 6 dB
  const levels = takes.map((k) => k.t.levelDb).sort((a, b) => a - b);
  const median = levels[Math.floor(levels.length / 2)];
  for (const k of takes) {
    const g = 10 ** (Math.max(-6, Math.min(6, 0.7 * (median - k.t.levelDb))) / 20);
    for (let i = 0; i < k.pcm.length; i++) k.pcm[i] *= g;
  }
  const lead = Number(spec.leadIn ?? 0.1), sgap = Number(spec.sentenceGap ?? 0.32), tail = Number(spec.tail ?? 0.35);
  const parts = [];
  let cursor = 0;
  const silence = (sec) => {
    const n = Math.floor(sec * SR);
    parts.push(new Float32Array(n));
    cursor += n / SR;
  };
  silence(lead);
  const beats = [];
  spec.beats.forEach((b, bi) => {
    const beatStart = bi ? cursor : 0;
    const chunks = [];
    for (const k of takes.filter((k) => k.ch.b === bi)) {
      chunks.push({text: k.ch.show, start: +(cursor + k.t.onset).toFixed(3), end: +(cursor + k.t.offset).toFixed(3)});
      parts.push(k.pcm);
      cursor += k.pcm.length / SR;
      if (!k.ch.beatEnd) silence(k.ch.sentenceEnd ? sgap : Number(b.chunkGap ?? spec.chunkGap ?? 0));
    }
    const gap = Number(b.gap ?? spec.gap ?? 0.28), hold = Number(b.hold ?? 0);
    silence(bi < spec.beats.length - 1 ? gap + hold : tail + hold);
    beats.push({i: bi, src: saidHash(b.say), start: +beatStart.toFixed(3), end: +cursor.toFixed(3), speechStart: chunks[0].start, speechEnd: chunks.at(-1).end, chunks});
  });
  const x = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) x.set(p, o), (o += p.length);
  // the whole voice at the Edge voice's loudness, peaks under -3 dBFS
  const out = path.join(voOut(), spec.id);
  fs.mkdirSync(out, {recursive: true});
  const probe = path.join(out, '.measure.wav');
  fs.writeFileSync(probe, wavBytes(x));
  const L = await lufs(probe);
  fs.rmSync(probe, {force: true});
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  const gain = Math.min(L == null ? 1 : 10 ** ((TARGET_LUFS - L) / 20), PEAK_CAP / peak);
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  const timeline = {id: spec.id, voice: 'recorded', source: 'recorded', duration: +(x.length / SR).toFixed(3), beats};
  writeAtomic(path.join(out, 'voice.wav'), wavBytes(x));
  writeAtomic(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
  return {timeline, lufsBefore: L, gainDb: db(gain), peakLimited: gain === PEAK_CAP / peak};
};

// ---- the page --------------------------------------------------------------------------------
const PAGE = (id) => `<!doctype html><html lang="ka"><head><meta charset="utf-8"><title>ხმის ჩაწერა · ${id}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@font-face{font-family:FiraGO;src:url(/fonts/FiraGO-Regular.otf)}@font-face{font-family:FiraGO;font-weight:600;src:url(/fonts/FiraGO-SemiBold.otf)}
@font-face{font-family:Mono;src:url(/fonts/DejaVuSansMono.ttf)}
:root{--bg:#000;--ink:#EDEDF2;--dim:#8A8A94;--faint:#3A3A42;--line:#1C1C22;--rec:#E5484D;--ok:#3DD68C;--warn:#F5A524}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:FiraGO,system-ui,sans-serif}
body{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}
header,footer{display:flex;gap:16px;align-items:center;padding:14px 24px;font:13px Mono,monospace;color:var(--dim);border-bottom:1px solid var(--line);white-space:nowrap}
header span{overflow:hidden;text-overflow:ellipsis}
footer{border:0;border-top:1px solid var(--line);flex-wrap:wrap;row-gap:10px}
header b{color:var(--ink);font-weight:400}.sp{flex:1}
#meter{width:140px;height:6px;background:var(--line);border-radius:3px;overflow:hidden}#meter i{display:block;height:100%;width:0;background:var(--ink)}
main{display:grid;grid-template-columns:1fr 320px;min-height:0}
#prompter{display:flex;flex-direction:column;justify-content:center;padding:40px 56px;gap:28px}
.prev,.next{font-size:26px;color:var(--faint);line-height:1.3}
#cur{font-size:clamp(40px,5.2vw,72px);font-weight:600;line-height:1.2}
#show{font:15px Mono,monospace;color:var(--dim);min-height:1.2em;margin-top:16px}
#status{font:15px Mono,monospace;color:var(--dim);min-height:2.6em}
#status.rec{color:var(--rec)}#status.ok{color:var(--ok)}#status .w{color:var(--warn);display:block}
#list{border-left:1px solid var(--line);overflow:auto;padding:8px 0;max-height:calc(100vh - 110px)}
#list div{padding:8px 18px;font-size:14px;color:var(--dim);cursor:pointer;display:flex;gap:10px}
#list div.on{color:var(--ink);background:#0E0E12}#list div s{text-decoration:none;font:12px Mono,monospace;min-width:34px}
#list div.done s{color:var(--ok)}#list div.warn s{color:var(--warn)}#list .beat{border-top:1px solid var(--line);margin-top:6px}
button{font:13px Mono,monospace;background:none;color:var(--ink);border:1px solid var(--faint);border-radius:6px;padding:7px 12px;cursor:pointer}
button:hover{border-color:var(--ink)}kbd{font:12px Mono,monospace;border:1px solid var(--faint);border-radius:4px;padding:1px 5px;color:var(--ink)}
audio{height:30px}
@media (max-width:800px){main{grid-template-columns:1fr}#list{display:none}#prompter{padding:24px 16px}}
</style></head><body>
<header><b>${id}</b><span id="title"></span><span class="sp"></span><span id="count"></span><div id="meter"><i></i></div></header>
<main><section id="prompter"><div class="prev" id="prev"></div><div><div id="cur">მიკროფონს ვრთავ…</div><div id="show"></div></div><div class="next" id="next"></div><div id="status"></div></section><aside id="list"></aside></main>
<footer><span><kbd>Space</kbd> ჩაწერა / გაჩერება</span><span><kbd>←</kbd><kbd>→</kbd> სხვა ხაზი</span><span><kbd>P</kbd> მოსმენა</span><span><kbd>Enter</kbd> აწყობა</span><span class="sp"></span>
<button id="play">მოსმენა</button><button id="asm">აწყობა</button><audio id="player" controls hidden></audio></footer>
<script>
let S = null, cur = 0, stream = null, rec = null, buf = [], t0 = 0, stopAt = 0, busy = false, actx = null;
const $ = (id) => document.getElementById(id);
const status = (html, cls = '') => { $('status').className = cls; $('status').innerHTML = html; };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
async function load() { S = await (await fetch('/api/state')).json(); $('title').textContent = S.title || ''; }
function draw() {
  const ch = S.chunks, c = ch[cur];
  $('prev').textContent = cur > 0 ? ch[cur - 1].say : '';
  $('cur').textContent = c.say;
  $('show').textContent = c.show !== c.say ? 'ეკრანზე: ' + c.show : '';
  $('next').textContent = cur < ch.length - 1 ? ch[cur + 1].say : '';
  const done = ch.filter((x) => x.take).length;
  $('count').textContent = done + ' / ' + ch.length;
  $('list').innerHTML = ch.map((x, i) => '<div data-i="' + i + '" class="' + [i === cur ? 'on' : '', x.take ? (x.take.warnings.length ? 'warn' : 'done') : '', x.c === 0 && x.b > 0 ? 'beat' : ''].join(' ') + '"><s>' + (x.take ? x.take.speech.toFixed(1) + 'წ' : '·') + '</s>' + esc(x.say) + '</div>').join('');
  document.querySelector('#list .on')?.scrollIntoView({block: 'nearest'});
  if (!busy && !rec) status(c.take ? 'ჩაწერილია, ' + c.take.speech.toFixed(2) + ' წმ. <kbd>Space</kbd> თავიდან, <kbd>P</kbd> მოსმენა' + c.take.warnings.map((w) => '<span class="w">' + esc(w) + '</span>').join('') : '<kbd>Space</kbd> და წაიკითხე', c.take ? 'ok' : '');
}
async function mic() {
  stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1}});
  const ctx = (actx = new AudioContext()), an = ctx.createAnalyser(); an.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(an);
  const d = new Float32Array(an.fftSize);
  (function tick() { an.getFloatTimeDomainData(d); let p = 0; for (const v of d) p = Math.max(p, Math.abs(v));
    $('meter').firstChild.style.width = Math.min(100, Math.max(0, (20 * Math.log10(p || 1e-6) + 60) / 60 * 100)) + '%';
    $('meter').firstChild.style.background = p > 0.89 ? 'var(--rec)' : 'var(--ink)'; requestAnimationFrame(tick); })();
}
function start() {
  const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  rec = new MediaRecorder(stream, type ? {mimeType: type, audioBitsPerSecond: 128000} : {});
  buf = []; stopAt = 0;
  rec.ondataavailable = (e) => e.data.size && buf.push(e.data);
  rec.onstart = () => { t0 = performance.now(); status('● იწერება. წაიკითხე, მერე <kbd>Space</kbd>', 'rec'); };
  rec.onstop = upload;
  rec.start();
}
function stop() { if (stopAt) return; stopAt = (performance.now() - t0) / 1000; const r = rec; setTimeout(() => r.state !== 'inactive' && r.stop(), 250); status('მუშავდება…'); }
async function upload() {
  const r = rec; rec = null; busy = true;
  const at = cur, blob = new Blob(buf, {type: r.mimeType});
  try {
    const res = await (await fetch('/api/take?i=' + at + '&stopAt=' + stopAt.toFixed(3) + '&type=' + encodeURIComponent(r.mimeType), {method: 'POST', body: blob})).json();
    busy = false;
    if (res.error) { status(esc(res.error)); return; }
    S.chunks[at].take = res;
    if (!res.warnings.length && at === cur) { const n = S.chunks.findIndex((x, i) => i > at && !x.take); cur = n >= 0 ? n : Math.min(at + 1, S.chunks.length - 1); }
    draw();
    if (S.chunks.every((x) => x.take)) status('ყველა ხაზი ჩაწერილია. <kbd>Enter</kbd> აწყობს ხმას.', 'ok');
  } catch (e) { busy = false; status('ვერ შევინახე: ' + esc(String(e))); }
}
function play(src) { const p = $('player'); p.hidden = false; p.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now(); p.play(); }
async function assemble() {
  status('ვაწყობ…');
  const res = await (await fetch('/api/assemble', {method: 'POST'})).json();
  if (res.error) { status(esc(res.error)); return; }
  status('მზადაა: public/vo/' + S.id + '/voice.wav, ' + res.duration.toFixed(2) + ' წმ. ვიდეო ახლა შენი ხმით აეწყობა: ./make.sh ' + S.id, 'ok');
  play('/api/voice.wav');
}
document.addEventListener('keydown', (e) => {
  actx?.resume(); // the level meter's AudioContext waits for a first gesture
  if (!S || busy || !stream) return;
  if (e.code === 'Space') { e.preventDefault(); if (e.repeat) return; rec ? stop() : start(); }
  else if (rec) return;
  else if (e.key === 'ArrowRight') { cur = Math.min(cur + 1, S.chunks.length - 1); draw(); }
  else if (e.key === 'ArrowLeft') { cur = Math.max(cur - 1, 0); draw(); }
  else if (e.key === 'p' || e.key === 'P' || e.key === 'პ') { if (S.chunks[cur].take) play('/api/take.wav?i=' + cur); }
  else if (e.key === 'Enter') assemble();
});
$('list').addEventListener('click', (e) => { const d = e.target.closest('[data-i]'); if (d && !rec && !busy) { cur = +d.dataset.i; draw(); } });
$('play').onclick = () => S.chunks[cur].take && play('/api/take.wav?i=' + cur);
$('asm').onclick = assemble;
load().then(async () => { const n = S.chunks.findIndex((x) => !x.take); cur = n >= 0 ? n : 0; draw();
  try { await mic(); draw(); } catch (e) { status('მიკროფონი ვერ ჩავრთე: ' + esc(String(e))); } });
</script></body></html>`;

const serve = (file) => {
  const {id} = JSON.parse(fs.readFileSync(file, 'utf8'));
  const specNow = () => JSON.parse(fs.readFileSync(file, 'utf8')); // an edited spec shows on reload
  const state = () => {
    const spec = specNow(), man = loadManifest(id);
    return {id, title: spec.title ?? '', chunks: chunksOf(spec).map((ch) => ({...ch, take: takeOf(id, man, ch)}))};
  };
  const json = (res, code, obj) => {
    res.writeHead(code, {'content-type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify(obj));
  };
  const wav = (res, f) => (fs.existsSync(f) ? (res.writeHead(200, {'content-type': 'audio/wav', 'cache-control': 'no-store'}), fs.createReadStream(f).pipe(res)) : json(res, 404, {error: 'no file'}));
  http
    .createServer(async (req, res) => {
      const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
      try {
        if (u.pathname === '/') return res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}), res.end(PAGE(id));
        if (u.pathname.startsWith('/fonts/')) {
          const f = path.join(studio, 'public', 'fonts', path.basename(u.pathname));
          return fs.existsSync(f) ? (res.writeHead(200), fs.createReadStream(f).pipe(res)) : json(res, 404, {});
        }
        if (u.pathname === '/api/state') return json(res, 200, state());
        if (u.pathname === '/api/take.wav') {
          const ch = chunksOf(specNow())[Number(u.searchParams.get('i'))];
          const t = ch && takeOf(id, loadManifest(id), ch);
          return t ? wav(res, path.join(recDir(id), t.file)) : json(res, 404, {error: 'no take'});
        }
        if (u.pathname === '/api/voice.wav') return wav(res, path.join(voOut(), id, 'voice.wav'));
        if (u.pathname === '/api/take' && req.method === 'POST') {
          const ch = chunksOf(specNow())[Number(u.searchParams.get('i'))];
          if (!ch) return json(res, 400, {error: 'no such chunk'});
          const body = [];
          let n = 0;
          for await (const d of req) {
            if ((n += d.length) > 50e6) return json(res, 413, {error: 'too long'});
            body.push(d);
          }
          const type = u.searchParams.get('type') ?? '';
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
          const t = await saveTake(id, ch, Buffer.concat(body), ext, Number(u.searchParams.get('stopAt')) || 0);
          console.log(t.error ? `beat ${ch.b} chunk ${ch.c}: ${t.error}` : `beat ${ch.b} chunk ${ch.c}: ${t.speech.toFixed(2)} s${t.warnings.length ? '  ' + t.warnings.join('; ') : ''}`);
          return json(res, 200, t);
        }
        if (u.pathname === '/api/assemble' && req.method === 'POST') {
          const r = await assemble(specNow());
          console.log(`assembled public/vo/${id}/voice.wav: ${r.timeline.duration.toFixed(2)} s, gain ${r.gainDb.toFixed(1)} dB`);
          return json(res, 200, {duration: r.timeline.duration});
        }
        json(res, 404, {error: 'not found'});
      } catch (e) {
        json(res, 500, {error: e.message});
      }
    })
    .listen(PORT, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${PORT}`;
      console.log(`recording ${id}: ${url}  (Ctrl+C to stop; takes are kept in ${path.relative(studio, recDir(id))}/)`);
      if (!process.argv.includes('--no-open')) spawn('open', [url], {stdio: 'ignore', detached: true}).unref();
    });
};

// ---- self test: synthetic recordings through ffmpeg, the cut, the assembly and vo.py ----------
const selftest = async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vinari-rec-'));
  process.env.VO_OUT = path.join(tmp, 'vo'); // never public/vo or out/voices
  process.env.REC_DIR = path.join(tmp, 'rec');
  const fails = [];
  const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || fails.push(what));
  // "speech": a 150 Hz voice with harmonics in syllables, a 12 ms key click before it and one at the stop key
  const synth = ({lead = 0.45, words = 4, gain = 0.3, stop = 0.35, clicks = true}) => {
    const rate = 48000, parts = [];
    let t = 0, onset = 0, offset = 0;
    const push = (sec, f) => {
      const n = Math.round(sec * rate), a = new Float32Array(n);
      for (let i = 0; i < n; i++) a[i] = f(i / rate, i, n);
      parts.push(a), (t += sec);
    };
    const hiss = (x) => 0.0009 * (Math.sin(2 * Math.PI * 3137 * x) + Math.sin(2 * Math.PI * 1123 * x + 1) + Math.sin(2 * Math.PI * 5021 * x + 2)); // steady room noise, about -60 dBFS
    push(0.04, (x) => hiss(x));
    push(0.012, (x) => (clicks ? 0.6 * Math.sin(2 * Math.PI * 2400 * x) : 0));
    push(lead - 0.052, (x) => hiss(x));
    onset = t;
    for (let w = 0; w < words; w++) {
      push(0.32, (x, i, n) => gain * Math.min(1, i / 240, (n - i) / 240) * (Math.sin(2 * Math.PI * 150 * x) + 0.5 * Math.sin(2 * Math.PI * 300 * x) + 0.25 * Math.sin(2 * Math.PI * 450 * x)) / 1.75);
      if (w < words - 1) push(0.07, (x) => hiss(x));
    }
    offset = t;
    push(stop, (x) => hiss(x));
    const stopAt = t;
    push(0.012, (x) => (clicks ? 0.5 * Math.sin(2 * Math.PI * 2100 * x) : 0));
    push(0.24, (x) => hiss(x));
    const x = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) x.set(p, o), (o += p.length);
    return {x, rate, onset, offset, stopAt};
  };
  const encode = async (s, name, codec) => {
    const raw = path.join(tmp, name + '.f32');
    fs.writeFileSync(raw, Buffer.from(s.x.buffer));
    const out = path.join(tmp, name + (codec === 'aac' ? '.m4a' : '.webm'));
    await run(['-f', 'f32le', '-ar', String(s.rate), '-ac', '1', '-i', raw, ...(codec === 'aac' ? ['-c:a', 'aac', '-b:a', '128k', '-f', 'mp4'] : ['-c:a', 'libopus', '-b:a', '128k']), '-y', out]);
    return out;
  };
  // 1. webm/opus (Chrome) and mp4/aac (Safari) decode, the clicks are ignored, the speech is found
  for (const codec of ['opus', 'aac']) {
    const s = synth({});
    const f = await encode(s, `take-${codec}`, codec);
    const r = await processTake(f, s.stopAt);
    check(!r.error && Math.abs(r.onset - PAD_IN) < 0.001 && Math.abs(r.speech - (s.offset - s.onset)) < 0.03,
      `${codec}: decoded by the bundled ffmpeg, speech ${r.speech?.toFixed(3)} s (true ${(s.offset - s.onset).toFixed(3)}), clicks left out`);
    check(Math.abs(r.pcm.length / SR - (r.offset + PAD_OUT)) < 0.002 && r.warnings.length === 0, `${codec}: cut = 0.10 s pad + speech + 0.25 s pad, no warnings (${r.warnings.join('; ')})`);
  }
  // 1b. ffmpeg's own sine source (0.5 s silence, 1.4 s tone, 0.6 s silence) as webm/opus and as WAV
  for (const [ext, codec] of [['webm', ['-c:a', 'libopus', '-b:a', '96k']], ['wav', ['-c:a', 'pcm_s16le']]]) {
    const f = path.join(tmp, `sine.${ext}`);
    await run(['-f', 'lavfi', '-i', 'sine=frequency=150:sample_rate=48000:duration=1.4', '-filter_complex', '[0]adelay=500|500,apad=pad_dur=0.6[a]', '-map', '[a]', '-ac', '1', ...codec, '-y', f]);
    const r = await processTake(f, 0);
    check(!r.error && Math.abs(r.speech - 1.4) < 0.03, `ffmpeg sine source as ${ext}: speech ${r.speech?.toFixed(3)} s (true 1.400)`);
  }
  // 2. a take with nothing in it
  const quiet = await encode({...synth({words: 1, gain: 0, clicks: false})}, 'silent', 'opus');
  check((await processTake(quiet, 0)).error !== undefined, 'a silent take is refused');
  // 3. a whole spec: three takes (one 8 dB quieter), assembled, then vo.py keeps it
  const spec = {id: 'zz-rec-selftest', voice: 'recorded', leadIn: 0.1, gap: 0.28, sentenceGap: 0.32, tail: 0.35,
    beats: [{say: 'ერთი ორი სამი, | ოთხი ხუთი.', show: '1 2 3, | 4 5.'}, {say: 'ექვსი შვიდი.', show: '6 7.', hold: 0.2}]};
  const specPath = path.join(tmp, 'spec.json');
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const saved = [];
  for (const [i, ch] of chunksOf(spec).entries()) {
    const s = synth({words: 2 + i, gain: i === 1 ? 0.3 * 10 ** (-8 / 20) : 0.3});
    saved.push(await saveTake(spec.id, ch, fs.readFileSync(await encode(s, `c${i}`, 'opus')), 'webm', s.stopAt));
  }
  check(saved.every((t) => t.file && t.speech > 0.6), 'three takes saved with the manifest');
  const {timeline, lufsBefore} = await assemble(spec);
  const outDir = path.join(tmp, 'vo', spec.id);
  const x = readWav(path.join(outDir, 'voice.wav'));
  check(Math.abs(x.length / SR - timeline.duration) < 0.001, `voice.wav length = timeline duration (${timeline.duration} s)`);
  check(timeline.source === 'recorded' && timeline.voice === 'recorded' && timeline.beats.every((b, i) => b.src === saidHash(spec.beats[i].say)), 'marked "source": "recorded", every beat carries the hash of its words');
  const keys = ['i', 'src', 'start', 'end', 'speechStart', 'speechEnd', 'chunks'];
  check(timeline.beats.every((b) => JSON.stringify(Object.keys(b)) === JSON.stringify(keys)), "beats in vo.py's format");
  const cs = timeline.beats.flatMap((b) => b.chunks);
  const e = (a, b) => Math.sqrt(x.slice(Math.round(a * SR), Math.round(b * SR)).reduce((s, v) => s + v * v, 0) / Math.max(1, (b - a) * SR));
  check(cs.every((c) => e(c.start - 0.05, c.start - 0.015) < 0.01 && e(c.start + 0.015, c.start + 0.05) > 0.03 && e(c.end - 0.05, c.end - 0.015) > 0.03 && e(c.end + 0.02, c.end + 0.06) < 0.01),
    'every subtitle chunk starts and ends on the speech in voice.wav (15 ms)');
  check(Math.abs(cs[0].start - 0.2) < 0.012 && cs.map((c) => c.text).join('|') === '1 2 3,|4 5.|6 7.', `first word at 0.20 s like vo.py (${cs[0].start}), show text`);
  const probe = path.join(tmp, 'probe.wav');
  fs.writeFileSync(probe, wavBytes(x));
  const L = await lufs(probe);
  check(Math.abs(L - TARGET_LUFS) < 0.8, `the voice sits at ${L.toFixed(1)} LUFS (target ${TARGET_LUFS}, raw ${lufsBefore.toFixed(1)})`);
  const lv = [0, 1, 2].map((k) => e(cs[k].start + 0.02, cs[k].end - 0.02));
  check(Math.abs(db(lv[1]) - db(lv[0])) < 3.2, `the quiet take was evened out (${(db(lv[1]) - db(lv[0])).toFixed(1)} dB from its neighbour, was -8)`);
  // 4. tools/vo.py keeps the recording while the words match, stops when they changed
  const py = (p) =>
    new Promise((resolve) => {
      const c = spawn('python3', [path.join(studio, 'tools', 'vo.py'), p], {env: {...process.env, VO_OUT: path.join(tmp, 'vo')}});
      let err = '';
      c.stderr.on('data', (d) => (err += d));
      c.on('close', (code) => resolve({code, err}));
    });
  const before = fs.readFileSync(path.join(outDir, 'voice.wav'));
  const r1 = await py(specPath);
  check(r1.code === 0 && /recorded voice is kept/.test(r1.err) && before.equals(fs.readFileSync(path.join(outDir, 'voice.wav'))), 'vo.py leaves the recorded voice alone');
  fs.writeFileSync(specPath, JSON.stringify({...spec, beats: [spec.beats[0], {...spec.beats[1], say: 'ექვსი რვა.'}]}));
  const r2 = await py(specPath);
  check(r2.code !== 0 && /beats \[1\]/.test(r2.err), 'vo.py stops on changed words for a "recorded" spec: ' + r2.err.trim().slice(0, 70));
  const man = loadManifest(spec.id);
  const changed = chunksOf({...spec, beats: [spec.beats[0], {...spec.beats[1], say: 'ექვსი რვა.'}]}).filter((ch) => !takeOf(spec.id, man, ch));
  check(changed.length === 1 && changed[0].b === 1, 'only the changed line is asked for again');
  fs.rmSync(tmp, {recursive: true, force: true});
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL OK');
  process.exit(fails.length ? 1 : 0);
};

const args = process.argv.slice(2);
if (args.includes('--selftest')) {
  await selftest();
} else if (!args[0] || args[0].startsWith('--')) {
  console.log('usage: node tools/record.mjs <id> [--assemble] [--no-open] | --selftest');
  process.exit(1);
} else if (args.includes('--assemble')) {
  const spec = JSON.parse(fs.readFileSync(specFile(args[0]), 'utf8'));
  const r = await assemble(spec);
  console.log(`public/vo/${spec.id}/voice.wav: ${r.timeline.duration.toFixed(2)} s, gain ${r.gainDb.toFixed(1)} dB${r.peakLimited ? ' (held back by a loud peak)' : ''}`);
} else serve(specFile(args[0]));
