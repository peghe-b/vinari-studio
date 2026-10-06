// The App Store gate (the owner, 2026-10-06): a category with "release": "<version>" in ci/categories.json (the
// navigator and the OBD scanner, "1.0.4") is locked until the App Store's live version is at least that, and an
// "after": {"<version>": {...}} block (the facts that become true at the release) applies from the same moment.
// Nothing is deployed when Apple releases: this file asks Apple itself, so the dice and the brief flip by themselves.
//   storeVersion(root, env)   the live version of the iPhone app, from Apple's public lookup (ci/categories.json
//                             "store".lookup, results[0].version), 3 tries with a 4 s timeout; null when it fails
//                             (fail closed: everything gated stays locked). env STUDIO_STORE_VERSION wins: a version
//                             ("1.0.4") pretends that is live (rehearsals, the Mac, tests); any other word ("none")
//                             pretends the lookup failed.
//   atLeast(have, want)       numeric, part by part: 1.0.10 >= 1.0.4; a missing or malformed "have" is never enough
//   applyRelease(json, v)     ci/categories.json with the gate applied for live version v: {cats, active, locked,
//                             retired, version}. cats: every category, "after" blocks that are live merged in (the keys a
//                             block names replace the category's own), "after" removed, and "locked": true on each whose
//                             "release" is not live yet. active: the unlocked ones, in order. retired: {id: old label}.
//   nowFile(applied)          the body of out/ci/categories.now.json, the file the brief sends Claude to (only the active
//                             categories, as true today; never the raw file, which holds the locked facts too)
// Read by tools/ci/prompt.mjs (the brief and the dice ask Apple; --record re-applies the version the brief saw, from
// out/ci/request.json "store"). The site (web/api/studio.js) asks the same lookup for its own copy of the lock.
import fs from 'node:fs';
import path from 'node:path';

export const VERSION = /^\d+(?:\.\d+){1,3}$/;
const DEFAULT_LOOKUP = 'https://itunes.apple.com/lookup?id=6807209718&country=ge';

/** have >= want, numerically per part (1.0.10 > 1.0.4). A missing or malformed have is never enough (fail closed). */
export const atLeast = (have, want) => {
  if (!VERSION.test(String(have ?? '')) || !VERSION.test(String(want ?? ''))) return false;
  const a = String(have).split('.').map(Number);
  const b = String(want).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
};

const readJson = (f, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};

/** The live App Store version, or null (the lookup failed: everything gated stays locked). */
export const storeVersion = async (root, env = process.env, {tries = 3, timeoutMs = 4000, log = (m) => process.stderr.write(`${m}\n`)} = {}) => {
  const pinned = String(env.STUDIO_STORE_VERSION ?? '').trim();
  if (pinned) return VERSION.test(pinned) ? pinned : null;
  const lookup = readJson(path.join(root, 'ci/categories.json'), {})?.store?.lookup || DEFAULT_LOOKUP;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(lookup, {signal: AbortSignal.timeout(timeoutMs), headers: {accept: 'application/json'}});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = (await res.json())?.results?.[0]?.version;
      if (VERSION.test(String(v ?? ''))) return String(v);
      throw new Error('no version in the answer');
    } catch (e) {
      log(`release: the App Store lookup failed (try ${i} of ${tries}: ${String(e?.message ?? e).slice(0, 80)})`);
      if (i < tries) await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  log('release: no answer from the App Store: every category waiting for a release stays locked');
  return null;
};

/** ci/categories.json with the gate applied for the live version. */
export const applyRelease = (json, version) => {
  const raw = Array.isArray(json?.categories) ? json.categories : [];
  const cats = raw
    .filter((c) => c && /^[a-z]+$/.test(c.id ?? ''))
    .map((c) => {
      const out = {...c};
      const blocks = c.after && typeof c.after === 'object' ? Object.entries(c.after).filter(([v]) => VERSION.test(v)) : [];
      blocks.sort(([a], [b]) => (a === b ? 0 : atLeast(a, b) ? 1 : -1)); // the oldest release first, the newest wins
      for (const [v, block] of blocks) {
        if (!atLeast(version, v) || !block || typeof block !== 'object') continue;
        for (const [k, val] of Object.entries(block)) if (!['id', 'release', 'after', 'locked'].includes(k)) out[k] = val;
      }
      delete out.after;
      if (c.release && !atLeast(version, c.release)) out.locked = true;
      else delete out.locked;
      return out;
    });
  const retired = json?.retired && typeof json.retired === 'object' ? Object.fromEntries(Object.entries(json.retired).filter(([k, v]) => /^[a-z]+$/.test(k) && typeof v === 'string')) : {};
  return {cats, active: cats.filter((c) => !c.locked), locked: cats.filter((c) => c.locked), retired, version: version ?? null};
};

/** The body of out/ci/categories.now.json: the categories a film may use today, each with the facts true today. */
export const nowFile = (applied) =>
  `${JSON.stringify(
    {
      about: `Written by tools/ci/prompt.mjs for this request: ci/categories.json with the App Store gate applied (live version ${applied.version ?? 'unknown: the lookup failed'}). Only the categories a film may use today, each with the facts that are true today. Read this file for the facts, never ci/categories.json.`,
      categories: applied.active.map(({release, locked, ...c}) => c),
    },
    null,
    1,
  )}\n`;
