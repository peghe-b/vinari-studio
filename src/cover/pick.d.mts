// Types of src/cover/pick.mjs (which cover a film gets: its own, an older one read as today's, or the net).
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Layout} from './layout.mjs';
export declare const scenesOf: (spec: any) => any[];
export declare const titleOf: (spec: any) => string;
export declare const mapOld: (spec: any) => {cover: any; how: string} | null;
export declare const quoteFrom: (say: unknown, street?: (t: string) => boolean) => string;
export declare const netCandidates: (spec: any, opts?: {street?: (t: string) => boolean}) => Array<{how: string; cover: any}>;
export declare const resolveCover: (spec: any, ctx?: Record<string, any>) => {cover: any; how: string; layout: Layout; tried: Array<{how: string; kind: string; problems: string[]}>};
