import type React from 'react';
import type {SceneCtx} from '../types';

// Every src/scenes/<Name>.tsx that exports a component called <Name> is a scene type, usable
// as "scene": {"type": "<Name>"} in a spec. Nothing to register by hand: add the file.
type SceneComp = React.FC<{p: any; ctx: SceneCtx}>; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const require: {context(dir: string, deep: boolean, re: RegExp): {keys(): string[]; (k: string): Record<string, unknown>}};
const ctx = require.context('./', false, /^\.\/[A-Z][A-Za-z0-9]*\.tsx$/);

export const SCENES: Record<string, SceneComp> = Object.fromEntries(
  ctx
    .keys()
    .map((k) => [k.slice(2, -4), ctx(k)[k.slice(2, -4)]] as const)
    .filter(([, c]) => typeof c === 'function'),
) as Record<string, SceneComp>;
