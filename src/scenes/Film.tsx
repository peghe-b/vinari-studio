import React from 'react';
import {FILMS} from '../generated/films';
import type {SceneCtx} from '../types';

// A film's own scene (CLAUDE.md, Scenes: Film scenes): {"type": "Film", "name": "<Name>", ...props} draws
// src/scenes/film/<Name>.tsx, one-off drawing code written for that film (the cloud Claude designs one new visual per
// film). tools/build-index.mjs lints every film a spec uses (tools/ci/filmlint.mjs) and lists the ones that pass in
// src/generated/films.ts, each loaded only when a film asks for it: a film file that is missing, refused or throws on
// load fails ONLY the film that uses it (this component throws, so that render stops with the reason), never the
// bundle or another film.

type P = {name?: string; [k: string]: unknown};

const loaded = new Map<string, React.FC<{p: any; ctx: SceneCtx}> | Error>(); // eslint-disable-line @typescript-eslint/no-explicit-any
const load = (name: string) => {
  if (!loaded.has(name)) {
    let got: React.FC<{p: any; ctx: SceneCtx}> | Error; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const get = FILMS[name];
      if (!get) throw new Error(`src/scenes/film/${name}.tsx is not in the bundle (missing, or refused by tools/ci/filmlint.mjs: run node tools/build-index.mjs <id>)`);
      const c = get();
      if (typeof c !== 'function') throw new Error(`src/scenes/film/${name}.tsx does not export a component called ${name}`);
      got = c as React.FC<{p: any; ctx: SceneCtx}>; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (e) {
      got = e instanceof Error ? e : new Error(String(e));
    }
    loaded.set(name, got);
  }
  return loaded.get(name)!;
};

export const Film: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const name = typeof p.name === 'string' ? p.name : '';
  const Comp = load(name);
  if (Comp instanceof Error) throw new Error(`Film scene "${name}": ${Comp.message}`);
  return <Comp p={p} ctx={ctx} />;
};
