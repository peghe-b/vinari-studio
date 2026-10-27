import type React from 'react';
import {useLayoutEffect, useMemo} from 'react';
import {continueRender, delayRender} from 'remotion';
import type {FxCut} from '../types';
import {GL_RULES, GL_TRANSITIONS, GL_W, GL_H, GLSL_FS, GLSL_VS, glProgress, glRimEnvelope, glTextOpacity, glZoom, isGl, maskPixels, type GlOpts} from './gltrans.mjs';

// The GL transitions' render side (src/lib/gltrans.mjs has the catalogue, the rules and the maths). One WebGL 2 canvas a
// Chrome tab draws the mask of a frame (1080 x 1920, the stage's own px) as a white PNG whose alpha is the mask; the shot's
// outer box takes it as a CSS mask (the incoming r, the outgoing 1 - r), and the rim (an ink hairline) is a third mask on an
// ink plate. The PNG is a data URL, decoded before the frame is let go (delayRender), so a frame never shows a half-loaded
// mask. Without WebGL 2 (a browser that offers none) the same maths runs on the CPU into a 2D canvas: the same picture, more
// slowly; window.__vnGl says which engine drew (the cloud's GL probe reads it).

export type GlEngine = {kind: 'webgl2'; renderer: string} | {kind: 'cpu'; why: string};
type GlState = {gl: WebGL2RenderingContext; canvas: HTMLCanvasElement; u: Record<string, WebGLUniformLocation | null>};

let state: GlState | null = null;
let engineInfo: GlEngine | null = null;
let cpuCanvas: HTMLCanvasElement | null = null;

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('no shader');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(sh) ?? '?'}`);
  return sh;
};

/** the engine of this tab (made once): WebGL 2, or the CPU with the reason */
export const glEngine = (force?: 'cpu'): GlEngine => {
  if (force === 'cpu') return {kind: 'cpu', why: 'asked'};
  if (engineInfo) return engineInfo;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = GL_W;
    canvas.height = GL_H;
    const gl = canvas.getContext('webgl2', {preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: true, depth: false, stencil: false});
    if (!gl) throw new Error('no WebGL 2 context');
    const prog = gl.createProgram();
    if (!prog) throw new Error('no program');
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, GLSL_VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, GLSL_FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(prog) ?? '?'}`);
    gl.useProgram(prog);
    // one triangle over the whole canvas
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u: GlState['u'] = {};
    for (const n of ['uType', 'uMode', 'uP', 'uDir', 'uSeed', 'uFocus', 'uRes']) u[n] = gl.getUniformLocation(prog, n);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, GL_W, GL_H);
    state = {gl, canvas, u};
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String((dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) ?? 'webgl2');
    engineInfo = {kind: 'webgl2', renderer};
  } catch (e) {
    engineInfo = {kind: 'cpu', why: String((e as Error)?.message ?? e)};
  }
  (window as unknown as {__vnGl?: GlEngine}).__vnGl = engineInfo;
  return engineInfo;
};

const cache = new Map<string, string>();
const CACHE_MAX = 24;

/** the mask PNG (a data URL) of a transition at eased progress p; mode 0 the incoming, 1 the outgoing, 2 the rim */
export const maskUrl = (type: string, p: number, mode: 0 | 1 | 2, opts: GlOpts = {}, force?: 'cpu'): string => {
  const eng = glEngine(force);
  const f = opts.focus ?? {x: -1, y: -1};
  const key = `${eng.kind}|${type}|${p.toFixed(6)}|${mode}|${opts.dir ?? 1}|${opts.seed ?? 1}|${f.x},${f.y}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url: string;
  if (eng.kind === 'webgl2' && state) {
    const {gl, canvas, u} = state;
    const n = (GL_TRANSITIONS as Record<string, {n: number}>)[type]?.n ?? 0;
    gl.uniform1i(u.uType, n);
    gl.uniform1i(u.uMode, mode);
    gl.uniform1f(u.uP, p);
    gl.uniform1f(u.uDir, (opts.dir ?? 1) < 0 ? -1 : 1);
    gl.uniform1ui(u.uSeed, (opts.seed ?? 1) >>> 0);
    gl.uniform2f(u.uFocus, opts.focus?.x ?? 540, opts.focus?.y ?? 885);
    gl.uniform2f(u.uRes, GL_W, GL_H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
    url = canvas.toDataURL('image/png');
  } else {
    if (!cpuCanvas) {
      cpuCanvas = document.createElement('canvas');
      cpuCanvas.width = GL_W;
      cpuCanvas.height = GL_H;
    }
    const ctx = cpuCanvas.getContext('2d');
    if (!ctx) throw new Error('gl mask: no 2D canvas either');
    const img = ctx.createImageData(GL_W, GL_H);
    img.data.set(maskPixels(type, p, mode, GL_W, GL_H, opts));
    ctx.putImageData(img, 0, 0);
    url = cpuCanvas.toDataURL('image/png');
  }
  cache.set(key, url);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return url;
};

const decoded = new Set<string>();
const settle = () => new Promise<void>((res) => {
  // two animation frames (the style's image is in and painted), never longer than 120 ms
  const t = setTimeout(res, 120);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clearTimeout(t);
    res();
  }));
});
/** holds the frame until every URL is decoded (a CSS mask whose image is not in yet draws nothing: the whole shot) */
export const useDecoded = (urls: (string | null)[]) => {
  const key = urls.filter(Boolean).join('\n');
  useLayoutEffect(() => {
    const pending = urls.filter((u): u is string => Boolean(u) && !decoded.has(u as string));
    if (!pending.length) return;
    const h = delayRender('gl transition mask');
    Promise.all(
      pending.map((u) => {
        const im = new Image();
        im.src = u;
        return im.decode().then(
          () => void decoded.add(u),
          () => undefined,
        );
      }),
    )
      .then(settle)
      .finally(() => continueRender(h));
    if (decoded.size > 64) decoded.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
};

export const maskStyle = (url: string): React.CSSProperties => ({
  WebkitMaskImage: `url("${url}")`,
  maskImage: `url("${url}")`,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: '0 0',
  maskPosition: '0 0',
});

/** the class a GL shot's outer box takes: its words (lib/layer.ts TXT) fade with --vn-glt (gltrans.mjs glTextOpacity) where
 *  the scene sets no opacity of its own on them, and GL_HIDE hides them outright once they are gone (an entrance's inline
 *  opacity beats a stylesheet: the second cloud check still read RouteTrace's „ვაკე" in the pre-roll's text probe) */
export const GL_CLASS = 'vn-gl';
export const GL_HIDE = 'vn-gl-hide';
export const GL_CSS = `.${GL_CLASS} .vn-t{opacity:var(--vn-glt,1)}.${GL_HIDE} .vn-t,.${GL_HIDE} .vn-t *{visibility:hidden!important}`;
export type GlPres = {outer: React.CSSProperties; style: React.CSSProperties; rim: string | null; rimOpacity: number; className: string} | null;

/** A shot's GL presentation at its window's u (src/lib/fx.ts uOf), or null when the cut is not a GL one. The incoming takes
 *  the mask and draws the rim; the outgoing takes the inverse. Called on every render of a shot (a hook): nothing remounts. */
export const useGlPres = (cut: FxCut | null, role: 'in' | 'out', u: number | null): GlPres => {
  const on = Boolean(cut && isGl(cut.type) && u !== null);
  const n = cut ? Math.max(1, cut.pre + cut.post) : 1;
  const p = on ? glProgress(u as number, n) : 0;
  const opts: GlOpts = {dir: cut?.dir ?? 1, seed: cut?.gl?.seed ?? 1, focus: cut?.gl?.focus};
  const type = cut?.type ?? '';
  const rimOn = on && role === 'in' && Boolean((GL_TRANSITIONS as Record<string, {rim: boolean}>)[type]?.rim) && glRimEnvelope(p) > 0;
  const urls = useMemo(
    () => (on ? [maskUrl(type, p, role === 'in' ? 0 : 1, opts), rimOn ? maskUrl(type, p, 2, opts) : null] : [null, null]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on, type, p, role, rimOn, opts.dir, opts.seed, opts.focus?.x, opts.focus?.y],
  );
  useDecoded(urls);
  if (!on || !urls[0]) return null;
  const z = glZoom(type, role, p);
  const textOp = glTextOpacity(role, p);
  const origin = `${opts.focus?.x ?? 540}px ${opts.focus?.y ?? 885}px`;
  return {
    outer: {...maskStyle(urls[0]), ['--vn-glt' as string]: textOp.toFixed(4)} as React.CSSProperties,
    className: textOp < 0.5 ? `${GL_CLASS} ${GL_HIDE}` : GL_CLASS,
    style: z !== 1 ? {transform: `scale(${z.toFixed(4)})`, transformOrigin: origin} : {},
    rim: urls[1],
    rimOpacity: GL_RULES.rimInk * glRimEnvelope(p),
  };
};
