// Which films get a quiet music bed (the owner, 2026-10-02: "every third video gets background music, something quiet
// that suits it; let's see how it works"; until then no film had music). ci/music.json holds the rule and the tracks.
//
// The rule is deterministic, like the ending's (tools/ci/ending.mjs): film number n (the "v<n>-" of its id) gets a bed
// when n >= from and (n - from) % every === 0 (from 63, every 3: v63, v66, v69 ...), the track
// tracks[((n - from) / every) % tracks.length] (v63 felt-piano, v66 warm-pad, v69 soft-keys, v72 wood-mallet, v75
// felt-piano ...). A redo (-r<n>), a hook variant (-h<n>) and a translation (-en, -ru) share the film number and so the
// bed; a demo never gets one. It counts films made, not films posted.
// Nothing is written in the spec: tools/build-index.mjs puts the rule's {src, volume, duck} into the indexed spec at
// render, on the Mac and in the cloud, when the spec's own "music" is absent or null (most specs carry "music": null
// from the template). A spec's own {"src", ...} wins (an explicit bed), and "music": false keeps a music film without
// one. Promo loops the bed from frame 0, ducked to duck x volume while the voice speaks, faded over the last 24 frames.
// The tracks are files under public/ (music/*.m4a), synthesised from scratch: $0 and royalty-free by construction, so
// Instagram can never mute or claim a film for them. A track that is missing stops build-index on the film that gets it.
//
// Read by tools/build-index.mjs (the render), tools/check.mjs (one "music" line), tools/ci/prompt.mjs (the brief's
// "- music:") and tools/ci/publish.mjs (post.json "music").
//   node tools/ci/music.mjs [<id>]   whether that film (default: the next free number) gets a bed and which, and the
//                                    next music films
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {nextFollow, nextFree, vNumber} from './ending.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// a file under public/: no leading "/", no "..", an audio extension
const TRACK = /^(?!.*\.\.)[a-z0-9][\w./-]*\.(?:m4a|mp3|wav|aac|ogg)$/i;

/** ci/music.json, checked. No file or no tracks: no film gets a bed. */
export const loadMusic = (base = root) => {
  let j = null;
  try {
    j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'music.json'), 'utf8'));
  } catch {}
  const tracks = Array.isArray(j?.tracks) ? j.tracks.filter((s) => typeof s === 'string' && TRACK.test(s.trim())).map((s) => s.trim()) : [];
  const int = (v, min, fallback) => (Number.isInteger(v) && v >= min ? v : fallback);
  const level = (v, fallback) => (typeof v === 'number' && v > 0 && v <= 1 ? v : fallback);
  return {
    from: tracks.length ? int(j?.from, 1, Infinity) : Infinity,
    every: int(j?.every, 1, 3),
    volume: level(j?.volume, 0.18),
    duck: typeof j?.duck === 'number' && j.duck >= 0 && j.duck <= 1 ? j.duck : 0.4, // 0 = silent under the voice
    tracks,
  };
};

/** "felt-piano" for "music/felt-piano.m4a" (or a spec's own {src}); null without a src. */
export const musicName = (music) => (music && typeof music.src === 'string' && music.src ? path.basename(music.src).replace(/\.[^.]+$/, '') : null);

/** The track of film number n, or null. */
export const trackOf = (n, cfg) =>
  Number.isFinite(cfg.from) && cfg.tracks.length && n >= cfg.from && (n - cfg.from) % cfg.every === 0 ? cfg.tracks[((n - cfg.from) / cfg.every) % cfg.tracks.length] : null;

/** The rule's bed for film `id`: {src, volume, duck, name}, or null (not a music film, a demo, no number). */
export const musicFor = (id, cfg) => {
  const s = String(id ?? '');
  const src = s.startsWith('demo-') ? null : trackOf(vNumber(s), cfg);
  return src ? {src, volume: cfg.volume, duck: cfg.duck, name: musicName({src})} : null;
};

/** The bed a spec plays, as the indexed spec carries it (tools/build-index.mjs): its own when it has one ({"src", ...};
 *  build-index checks its shape and its file), none for "music": false, else (absent or null) the rule's
 *  {src, volume, duck}, or null. */
export const musicOf = (spec, cfg) => {
  const own = spec?.music;
  if (own === false) return null;
  if (own !== undefined && own !== null) return own;
  const m = musicFor(spec?.id, cfg);
  return m ? {src: m.src, volume: m.volume, duck: m.duck} : null;
};

/** The music films from film n on (n itself included): [n1, n2, ...] (the ending's arithmetic). */
export const nextMusic = (n, cfg, count = 4) => (cfg.tracks.length ? nextFollow(n, cfg, count) : []);

/** "1 film in 3 from v63" */
export const musicRule = (cfg) => (Number.isFinite(cfg.from) && cfg.tracks.length ? `1 film in ${cfg.every} from v${cfg.from}` : 'no film (ci/music.json has no tracks)');

// ---- node tools/ci/music.mjs [<id>] -------------------------------------------------------------------------------
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const specsDir = path.join(root, 'specs');
  const cfg = loadMusic();
  const arg = process.argv[2];
  if (arg && !/^[a-z0-9-]+$/.test(arg)) {
    console.error('usage: node tools/ci/music.mjs [<id>]');
    process.exit(2);
  }
  const id = arg || nextFree(specsDir);
  const n = vNumber(id);
  const bed = musicFor(id, cfg);
  // the spec of that id, if there is one (a hook variant's or a translation's file name differs from its id): its own
  // bed, or "music": false, wins over the rule
  let spec = null;
  if (arg) {
    let files = [];
    try {
      files = fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
    } catch {}
    for (const f of [`${id}.json`, ...files]) {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'));
        if (s?.id === id) {
          spec = s;
          break;
        }
      } catch {}
    }
  }
  const own = spec?.music;
  const film = (k) => `v${k} ${musicName({src: trackOf(k, cfg)})}`;
  if (own === false) console.log(`${id}: no music: its spec says "music": false${bed ? ` (the rule would give it ${bed.name})` : ''}.`);
  else if (own && typeof own === 'object') console.log(`${id}: its spec's own bed, ${musicName(own) ?? '(no "src")'} (${own.src}); the rule's ${bed ? bed.name : 'none'} is not used.`);
  else if (id.startsWith('demo-')) console.log(`${id}: no music (a demo never gets the rule's bed).`);
  else if (bed) console.log(`${id}: music, ${bed.name} (public/${bed.src}, volume ${bed.volume}, ducked to ${bed.duck} of that under the voice; ${musicRule(cfg)}). Added at render: write no "music" in the spec.`);
  else console.log(`${id}: no music (only ${musicRule(cfg)} gets a bed).`);
  const after = nextMusic(Math.max(n + 1, 1), cfg);
  if (after.length) console.log(`next music films: ${after.map(film).join(', ')}`);
  // a track that is not made yet: build-index stops on the film that gets it
  const missing = cfg.tracks.filter((t) => !fs.existsSync(path.join(root, 'public', t)));
  if (missing.length) console.log(`note: not in public/ yet: ${missing.join(', ')} (a film that gets one stops at build-index until it is there)`);
}
