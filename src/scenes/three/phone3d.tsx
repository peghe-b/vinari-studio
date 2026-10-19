// The 3D phone (the owner, 2026-10-12: "the videos' 3D motion graphics, I hope you did not delete them; and the mockups:
// those will be in 3D too, refined"). Phone's look from film PHONE3D_FROM on (src/lib/device.mjs; Phone.tsx dispatches
// here): a real iPhone in three.js, the same props as the flat device (src, y, x, zoom, focus, highlight, tap, callout,
// bright, cropBottom, staging device / tilt / hero).
//
// The body: an iPhone 16 Pro's proportions (the screen 1 wide, a 2.25 mm black border, 8.25 mm thin), a titanium frame with
// rounded edges, the black front glass, the side buttons; the Dynamic Island drawn over the capture's own. The display is
// the REAL capture (public/screens, never edited) as an emissive texture at its full 1080 x 2346, sampled 2x2 per pixel
// (textureGrad at half the footprint, mipmaps for a far phone), in the capture's own colours: no light, no tone mapping
// and no colour conversion touch it, so its white is the capture's white. The highlight band, its veil, the tap rings and
// a faint glass sheen are drawn ON the display in the same shader, so they turn and push with it. The frame's light is a
// procedural studio (softboxes, rim strips, a room that is black on the dark film and pale on the light one) baked into a
// PMREM once per scene: no lamp, no file, no randomness. On the light film a soft shadow sits on the paper behind it.
//
// The camera: a 26 degree lens looking straight ahead (the frame's horizontals stay level); the phone turns (yaw shows its
// left side, away from the like column), leans back a little and floats (slow sines of the frame). A focus key pushes in
// exactly like the flat device (the pivot holds its place on the page, the zoom keeps the specs' classic units and stops
// where the body meets the Reels safe zone), and while a band or a push is on, the phone turns to face the viewer so the
// row reads flat and sharp. Everything is a function of the frame. One WebGL canvas, in the lens layer only (Wire3D's
// rule), drawn at the pixels it covers (dpr = the stage's scale); Promo's drift leaves it alone (a CSS scale would
// resample the screen's text).
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {capsLatin, mtav} from '../../lib/format';
import {TXT, useLayer} from '../../lib/layer';
import {C, F, filmNo, isLight, L, rgba, SAFE, STAGE, THEME, theme, type Tone, toneLine} from '../../tokens';
import {phoneWhole} from '../../lib/device.mjs';
import {mixRing, outlineOn, type Ring} from '../../lib/outline.mjs';
import {useRings} from '../../lib/outline-px';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';

type At = number | string;
type Focus = {y: number; x?: number; zoom?: number; at?: At};
type Highlight = {y: number; h: number; x?: number; w?: number; tone?: Tone; at?: At; r?: number | 'pill'; snap?: boolean; gap?: number}; // r/snap/gap: Phone.tsx
type TapP = {x: number; y: number; at?: At};
export type Phone3DProps = {
  src: string;
  y?: number;
  x?: number;
  zoom?: number;
  focus?: Focus[];
  highlight?: Highlight | Highlight[];
  callout?: {text: string; value?: string; tone?: Tone; at?: At};
  tap?: TapP | TapP[];
  bright?: number;
  cropBottom?: number;
  staging?: string;
  mode?: string;
};

// ---- the body (world units: the display is 1 wide) ------------------------------------------------------------------------
export const SRC_W = 1080;
export const SRC_H = 2346;
export const SH = SRC_H / SRC_W; // the display's height
export const BEZ = 0.034; // the black border round the display (iPhone 16 Pro: 2.25 mm round a 67 mm wide display)
export const BW = 1 + 2 * BEZ;
export const BH = SH + 2 * BEZ;
export const SCR_R = 0.1409; // the display's corner radius (the flat device's)
const DEPTH = 0.123; // 8.25 mm
const EDGE_T = 0.016; // the rounded edge of the frame: how far it runs into the depth ...
const EDGE_S = 0.012; // ... and how far round the front (the titanium a viewer sees from the front)
export const FRONT = DEPTH / 2;
// capture px: the Dynamic Island, drawn over the one the captures already carry (two sizes: y 35..123 x 386..693 and
// y 38..135 x 372..707, measured 2026-10-12); a pill of the real island's proportions (0.315 of the width) covers both
export const ISLAND = {cx: 540, cy: 86, hw: 171, hh: 52};
const CAP = SRC_W / 640; // capture px per stage px of the flat window (its sizes: the band's radius, the tap ring)

// ---- the frame on the page (stage px) --------------------------------------------------------------------------------------
const WIN_W = 640; // the display's width at rest: the flat device's window
const WIN_TOP = 384; // the display's top edge at rest (the body's top 22 px above it, under the meta bar)
const WIN_BOT = L.graphicsBottom; // 1380: the picture ends on a hard line here, as every app picture does
const PY = (WIN_TOP + WIN_BOT) / 2; // the lens's centre
const CX0 = 48; // the canvas: the frame's whole width (stage 48..1032 = frame -1..1081) ...
const CW = 1032 - CX0;
const CY0 = 340; // ... from just under the meta bar to the picture's foot
const CH = WIN_BOT - CY0;
const HH = Math.max(PY - CY0, CY0 + CH - PY); // the virtual view's half height (the canvas is its upper part)
const FOV = 26;
const TANH = Math.tan(((FOV / 2) * Math.PI) / 180);
const TOP = WIN_TOP - BEZ * WIN_W; // the body's top edge at rest
const ZMAX = 1.8;
const CLASSIC = (560 + 2 * 12) / (640 + 2 * 12); // the specs' zoom units (Phone.tsx)
const deg = Math.PI / 180;

// frame x -> stage x (no drift on a 3D phone: Promo leaves it alone)
const inv = (fx: number) => (fx - STAGE.x) / STAGE.s;
const LO = inv(SAFE.left) + 4;
const HI = inv(SAFE.right) - 4;
/** The deepest push (stage px per world unit) that keeps the body inside the Reels safe zone for a pivot at display
 *  fraction fx: the pivot holds its place on the page (aim = o (1 - WIN_W / P)), so the body's edges are
 *  540 - (half + o) P + o WIN_W and 540 + (half - o) P + o WIN_W. A 2 % margin for the turn's perspective. */
const pSafe = (fx: number) => {
  const o = fx - 0.5;
  const half = (BW / 2) * 1.02;
  const pl = (540 - LO + o * WIN_W) / (half + o);
  const pr = (HI - 540 - o * WIN_W) / (half - o);
  return Math.max(WIN_W, Math.min(ZMAX * WIN_W, pl, pr));
};
const warned = new Set<string>();
const warnOnce = (key: string, msg: string) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
};

// The stagings: where the turn starts (on the cut), where it settles, where it drifts by the end (degrees; yaw > 0 shows
// the left side with its buttons, pitch > 0 leans the top away). "hero" is the product reveal: the phone seen almost
// side-on, small and whole, turning to the viewer while the camera closes in.
const POSES: Record<string, {yaw: [number, number, number]; pitch: [number, number, number]; roll: number}> = {
  device: {yaw: [17, 7, 4.5], pitch: [7, 3.2, 2.4], roll: 0},
  tilt: {yaw: [32, 17, 13], pitch: [12, 6.5, 5], roll: -1.2},
  hero: {yaw: [82, 7, 4.5], pitch: [9, 3.2, 2.4], roll: 0},
};

// ---- the studio light (a PMREM of softboxes in a room; once per scene and look) ---------------------------------------------
export const makeEnv = (gl: THREE.WebGLRenderer, light: boolean) => {
  const scene = new THREE.Scene();
  const disposables: {dispose(): void}[] = [];
  const basic = (v: number, side: THREE.Side) => {
    const m = new THREE.MeshBasicMaterial({color: new THREE.Color(v, v, v), side});
    disposables.push(m);
    return m;
  };
  // the room's walls: +x, -x, +y (the ceiling), -y (the floor), +z (behind the camera: the glass reflects it, so it stays
  // dark on both looks and the black glass stays black), -z (behind the phone)
  const walls = light ? [0.62, 0.58, 0.95, 0.34, 0.035, 0.7] : [0.004, 0.004, 0.012, 0, 0, 0.004];
  const roomGeo = new THREE.BoxGeometry(30, 30, 30);
  disposables.push(roomGeo);
  scene.add(new THREE.Mesh(roomGeo, walls.map((v) => basic(v, THREE.BackSide))));
  const panel = (w: number, h: number, x: number, y: number, z: number, v: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    disposables.push(g);
    const m = new THREE.Mesh(g, basic(v, THREE.DoubleSide));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(7, 5, -5, 6, 7, light ? 2.4 : 3.2); // the key: a large softbox up left, in front
  panel(1.1, 12, -7, 0.5, -3.5, light ? 3.2 : 5); // rim strips behind the phone, left ...
  panel(1.1, 12, 7, 0.5, -3.5, light ? 2.6 : 4); // ... and right: the long lines down the frame
  panel(12, 1.2, 0, 8, -1.5, light ? 2.2 : 3); // a strip overhead: the top edge
  // two tall strips level with the phone: the rounded edge between the glass and the side turns its normal to +-x, so
  // these draw the thin bright line round the frame that separates the body from a black field (front on, it was a dark
  // outline only)
  panel(1.6, 14, -8, 0.5, 1.2, light ? 1.4 : 2.6);
  panel(1.6, 14, 8, 0.5, 1.2, light ? 1.1 : 2);
  panel(14, 3, 0, -2.5, 11, light ? 0.22 : 0.07); // a low, faint front bounce: the glass's soft gradient
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(scene, 0.03, 0.1, 60);
  pm.dispose();
  disposables.forEach((d) => d.dispose());
  return rt;
};

// ---- the body's geometry and materials ----------------------------------------------------------------------------------------
const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x0 + w, y0 + h - r);
  s.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y0 + h);
  s.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

export const makeBody = (env: THREE.Texture, light: boolean) => {
  const r = SCR_R + BEZ - EDGE_S;
  const geo = new THREE.ExtrudeGeometry(roundedRect(BW - 2 * EDGE_S, BH - 2 * EDGE_S, r), {
    depth: DEPTH - 2 * EDGE_T,
    bevelEnabled: true,
    bevelThickness: EDGE_T,
    bevelSize: EDGE_S,
    bevelSegments: 7,
    curveSegments: 28,
  });
  geo.translate(0, 0, -(DEPTH - 2 * EDGE_T) / 2);
  // ExtrudeGeometry is flat-shaded (every face its own vertices): the rounded edge would show its seven steps and the corners
  // their facets. The lids (group 0: the front and the back, black glass) keep their flat normals; the walls with their
  // rounded edges (group 1, titanium) are welded and smoothed.
  const pos = geo.getAttribute('position');
  const lidN = geo.groups[0]?.materialIndex === 0 ? geo.groups[0].count : 0;
  const lids = new THREE.BufferGeometry();
  lids.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(0, lidN * 3), 3));
  lids.computeVertexNormals();
  const wall0 = new THREE.BufferGeometry();
  wall0.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(lidN * 3), 3));
  const walls = mergeVertices(wall0, 1e-6);
  walls.computeVertexNormals();
  wall0.dispose();
  geo.dispose();
  const glass = new THREE.MeshStandardMaterial({color: 0x050505, roughness: 0.12, metalness: 0, envMap: env, envMapIntensity: 1});
  // natural titanium, neutral (the owner: every grey is R = G = B); on the dark film a touch lighter, so the strips' line
  // reads on black
  const metal = new THREE.MeshStandardMaterial({color: light ? 0xa9a9a9 : 0xb2b2b2, roughness: 0.3, metalness: 1, envMap: env, envMapIntensity: 1});
  const crystal = new THREE.MeshStandardMaterial({color: 0x161616, roughness: 0.18, metalness: 0.4, envMap: env, envMapIntensity: 1});
  // the side buttons (iPhone 16 Pro, fractions of the body's height from its top): action, volume up and down on the left,
  // the side button and the camera control on the right
  const buttons: {geo: THREE.BufferGeometry; x: number; y: number; mat: THREE.Material}[] = [];
  const btn = (side: -1 | 1, at: number, len: number, mat: THREE.Material, out = 0.0055) => {
    const g = new RoundedBoxGeometry(0.02, len * BH, 0.046, 3, 0.0085);
    buttons.push({geo: g, x: side * (BW / 2 - 0.01 + out), y: BH / 2 - at * BH, mat});
  };
  btn(-1, 0.212, 0.044, metal);
  btn(-1, 0.298, 0.07, metal);
  btn(-1, 0.384, 0.07, metal);
  btn(1, 0.335, 0.108, metal);
  btn(1, 0.6, 0.082, crystal, 0.002);
  return {lids, walls, glass, metal, crystal, buttons};
};

// ---- the display: the capture, the band, its veil, the taps, the sheen, the island ------------------------------------------
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform vec2 uSize;
uniform float uRad;
uniform float uLum;
uniform float uPx;
uniform vec4 uIsland;
uniform vec4 uVeilBox;
uniform float uVeilR;
uniform vec3 uVeil;
uniform float uVeilA;
uniform vec4 uRingBox;
uniform float uRingR;
uniform float uRingOut;
uniform float uRingA;
uniform vec3 uRingCol;
uniform float uRingW;
uniform float uGlowA;
uniform vec4 uTaps[4];
uniform vec3 uTapInk;
uniform vec3 uTapHalo;
uniform float uTapHaloA;
uniform vec3 uSheen;
uniform float uCut;
varying vec2 vUv;

float sdBox(vec2 p, vec2 b, float r) {
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize; // capture px, y down
  vec2 ddx = dFdx(vUv);
  vec2 ddy = dFdy(vUv);
  float pw = max(1e-4, 0.5 * (length(dFdx(px)) + length(dFdy(px)))); // one framebuffer pixel in capture px
  // the capture, four taps a pixel (a 2x2 grid), each at half the pixel's footprint: the full-resolution texels carry
  // the text, the grid antialiases it; a far phone reads the mipmaps
  vec2 gx = 0.5 * ddx;
  vec2 gy = 0.5 * ddy;
  vec2 a = 0.25 * (ddx + ddy);
  vec2 b = 0.25 * (ddx - ddy);
  vec3 c = 0.25 * (textureGrad(map, vUv + a, gx, gy).rgb + textureGrad(map, vUv - a, gx, gy).rgb
                 + textureGrad(map, vUv + b, gx, gy).rgb + textureGrad(map, vUv - b, gx, gy).rgb);
  c *= uLum;
  // the veil over everything but the band's box
  float dv = sdBox(px - uVeilBox.xy, uVeilBox.zw, uVeilR);
  c = mix(c, uVeil, uVeilA * clamp(0.5 + dv / pw, 0.0, 1.0));
  // the band: a border inside its box (uRingW stage px) and a soft glow outside it; uRingOut 1 (from film KIT_FROM on) draws
  // the border OUTSIDE the box instead, the box being the outline's inner edge: every offset of a rounded box is concentric
  // with it, so the stroke follows the element's corners at any zoom
  float dr = sdBox(px - uRingBox.xy, uRingBox.zw, uRingR) / pw;
  float wpx = uRingW * uPx;
  float sig = 12.0 * uPx;
  float de = dr - uRingOut * wpx;
  float glow = de > 0.0 ? 0.5 * exp(-0.5 * (de * de) / (sig * sig)) : 0.0;
  c = mix(c, uRingCol, uGlowA * glow * uRingA);
  c = mix(c, uRingCol, clamp(0.5 * wpx + 0.5 - abs(dr - (uRingOut - 0.5) * wpx), 0.0, 1.0) * uRingA);
  // the tap rings (the flat device's: an 88 px ring with a 4 px ink border and a 3 px halo, growing as it fades)
  for (int i = 0; i < 4; i++) {
    vec4 t = uTaps[i];
    if (t.w <= 0.0) continue;
    float R = 44.0 * ${CAP.toFixed(4)} * t.z;
    float w = 4.0 * ${CAP.toFixed(4)} * t.z;
    float h = 3.0 * ${CAP.toFixed(4)} * t.z;
    float d = length(px - t.xy);
    float ink = clamp(min(d - (R - w), R - d) / pw + 0.5, 0.0, 1.0);
    float halo = clamp(min(d - R, R + h - d) / pw + 0.5, 0.0, 1.0);
    c = mix(c, uTapHalo, halo * uTapHaloA * t.w);
    c = mix(c, uTapInk, ink * 0.95 * t.w);
  }
  // the glass: a faint soft band of reflected light that slides as the phone turns (it only shows on the dark parts)
  vec2 q = px / uSize.x;
  float s = dot(q, vec2(0.876, 0.482)) - uSheen.x;
  c += uSheen.z * exp(-(s * s) / (uSheen.y * uSheen.y));
  // the Dynamic Island, over everything
  float di = sdBox(px - uIsland.xy, uIsland.zw, uIsland.w);
  c = mix(c, vec3(0.0), clamp(0.5 - di / pw, 0.0, 1.0));
  // the display's rounded corners (antialiased over the black glass under it), and cropBottom's cut
  float dd = sdBox(px - 0.5 * uSize, 0.5 * uSize, uRad);
  float alpha = clamp(0.5 - dd / pw, 0.0, 1.0);
  alpha *= clamp((uCut - px.y) / pw + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), alpha);
}`;

const rgb = (hex: string) => {
  const c = new THREE.Color();
  // the display's colours stay in the capture's own encoding (no conversion anywhere on this path)
  const h = hex.replace('#', '');
  const n = parseInt(h.slice(0, 6), 16);
  c.setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, THREE.NoColorSpace);
  return c;
};

export const makeScreen = (tex: THREE.Texture) => {
  const geo = new THREE.PlaneGeometry(1, SH);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: {value: tex},
      uSize: {value: new THREE.Vector2(SRC_W, SRC_H)},
      uRad: {value: SCR_R * SRC_W},
      uLum: {value: 1},
      uPx: {value: 1},
      uIsland: {value: new THREE.Vector4(ISLAND.cx, ISLAND.cy, ISLAND.hw, ISLAND.hh)},
      uVeilBox: {value: new THREE.Vector4(0, 0, 1, 1)},
      uVeilR: {value: 14 * CAP},
      uVeil: {value: new THREE.Color()},
      uVeilA: {value: 0},
      uRingBox: {value: new THREE.Vector4(0, 0, 1, 1)},
      uRingR: {value: 14 * CAP},
      uRingOut: {value: 0},
      uRingA: {value: 0},
      uRingCol: {value: new THREE.Color()},
      uRingW: {value: 3},
      uGlowA: {value: 0},
      uTaps: {value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0))},
      uTapInk: {value: new THREE.Color()},
      uTapHalo: {value: new THREE.Color()},
      uTapHaloA: {value: 0.45},
      uSheen: {value: new THREE.Vector3(0, 0.3, 0)},
      uCut: {value: SRC_H + 10},
    },
  });
  mat.toneMapped = false;
  return {geo, mat};
};

// a soft shadow on the paper behind the phone (the light film only): the body's rounded rectangle, blurred
const SHADOW_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uHalf;
uniform float uR;
uniform float uSoft;
uniform float uA;
varying vec2 vUv;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = (vUv - 0.5) * (2.0 * uHalf + 2.0 * uSoft * 2.5);
  float d = sdBox(p, uHalf, uR);
  float k = 1.0 - smoothstep(-0.6 * uSoft, 1.6 * uSoft, d);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uA * k * k);
}`;
const makeShadow = () => {
  const soft = 0.16;
  const half = new THREE.Vector2(BW / 2 - 0.04, BH / 2 - 0.04);
  const geo = new THREE.PlaneGeometry(2 * half.x + 2 * soft * 2.5, 2 * half.y + 2 * soft * 2.5);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SHADOW_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {uHalf: {value: half}, uR: {value: SCR_R + BEZ}, uSoft: {value: soft}, uA: {value: 0}},
  });
  mat.toneMapped = false;
  return {geo, mat};
};

// ---- the per-frame state the canvas draws -------------------------------------------------------------------------------------
type GLState = {
  cam: THREE.Vector3; // the camera's position (it looks straight down -z)
  yaw: number;
  pitch: number;
  roll: number;
  pos: THREE.Vector3; // the phone's centre
  lum: number;
  veilBox: [number, number, number, number];
  veilA: number;
  veilR: number;
  ringBox: [number, number, number, number];
  ringR: number;
  ringOut: number;
  ringA: number;
  ringCol: string;
  glowA: number;
  taps: [number, number, number, number][];
  sheen: [number, number, number];
  cut: number;
  shadowA: number;
  px: number; // framebuffer px per stage px
};

const setView = (cam: THREE.PerspectiveCamera, at: THREE.Vector3) => {
  cam.fov = FOV;
  cam.near = 0.2;
  cam.far = 40;
  cam.aspect = CW / (2 * HH);
  // the canvas is the upper part of a view centred on (540, PY): stage y CY0 .. CY0 + CH of PY - HH .. PY + HH
  cam.setViewOffset(CW, 2 * HH, 0, CY0 - (PY - HH), CW, CH);
  cam.position.copy(at);
  cam.rotation.set(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
};

const PhoneGL: React.FC<{tex: THREE.Texture; s: GLState}> = ({tex, s}) => {
  const {gl, camera} = useThree();
  const light = isLight();
  const env = useMemo(() => makeEnv(gl, light), [gl, light]);
  useEffect(() => () => env.dispose(), [env]);
  const body = useMemo(() => makeBody(env.texture, light), [env, light]);
  const screen = useMemo(() => makeScreen(tex), [tex]);
  const shadow = useMemo(() => makeShadow(), []);
  useEffect(
    () => () => {
      body.lids.dispose();
      body.walls.dispose();
      body.buttons.forEach((b) => b.geo.dispose());
      [body.glass, body.metal, body.crystal].forEach((m) => m.dispose());
      screen.geo.dispose();
      screen.mat.dispose();
      shadow.geo.dispose();
      shadow.mat.dispose();
    },
    [body, screen, shadow],
  );
  useMemo(() => {
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
  }, [tex, gl]);
  // a neutral tone curve for the frame's highlights (the display bypasses it: its shader never calls it)
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;

  // ---- per frame ----
  setView(camera as THREE.PerspectiveCamera, s.cam);
  const u = screen.mat.uniforms;
  u.uLum.value = s.lum;
  u.uPx.value = s.px;
  u.uVeilBox.value.set(...s.veilBox);
  u.uVeilA.value = s.veilA;
  u.uVeilR.value = s.veilR;
  (u.uVeil.value as THREE.Color).copy(rgb(light ? C.bg : C.shade));
  u.uRingBox.value.set(...s.ringBox);
  u.uRingR.value = s.ringR;
  u.uRingOut.value = s.ringOut;
  u.uRingA.value = s.ringA;
  (u.uRingCol.value as THREE.Color).copy(rgb(s.ringCol));
  u.uGlowA.value = s.glowA;
  (u.uTaps.value as THREE.Vector4[]).forEach((v, i) => (s.taps[i] ? v.set(...s.taps[i]) : v.set(0, 0, 1, 0)));
  (u.uTapInk.value as THREE.Color).copy(rgb(C.ink));
  (u.uTapHalo.value as THREE.Color).copy(rgb(C.onInk));
  u.uTapHaloA.value = light ? 0.7 : 0.45;
  u.uSheen.value.set(...s.sheen);
  u.uCut.value = s.cut;
  shadow.mat.uniforms.uA.value = s.shadowA;

  return (
    <>
      <group position={s.pos}>
        <group rotation={[0, s.yaw, 0]}>
          <group rotation={[-s.pitch, 0, 0]}>
            <group rotation={[0, 0, s.roll]}>
              <mesh geometry={body.lids} material={body.glass} />
              <mesh geometry={body.walls} material={body.metal} />
              {body.buttons.map((b, i) => (
                <mesh key={i} geometry={b.geo} material={b.mat} position={[b.x, b.y, 0]} />
              ))}
              <mesh geometry={screen.geo} material={screen.mat} position={[0, 0, FRONT + 0.0007]} renderOrder={2} />
            </group>
          </group>
        </group>
      </group>
      {s.shadowA > 0 ? <mesh geometry={shadow.geo} material={shadow.mat} position={[s.pos.x + 0.05, s.pos.y - 0.09, s.pos.z - 0.5]} renderOrder={0} /> : null}
    </>
  );
};

// ---- the capture as a texture (the frame waits for it) -----------------------------------------------------------------------
const useScreenTexture = (src: string, on: boolean) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => (on ? delayRender(`3D phone screen ${src}`) : null));
  useEffect(() => {
    if (!on) return undefined;
    let dead = false;
    new THREE.TextureLoader()
      .loadAsync(staticFile(`screens/${src}.jpg`))
      .then((t) => {
        if (dead) {
          t.dispose();
          return;
        }
        // the capture's bytes as they are: no sRGB decode (the shader writes them straight out), mipmaps for a far phone
        t.colorSpace = THREE.NoColorSpace;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        setTex(t);
      })
      .catch((e) => cancelRender(e));
    return () => {
      dead = true;
    };
  }, [src, on]);
  useEffect(() => () => tex?.dispose(), [tex]);
  // released after the commit that mounts the canvas with it (Wire3D's rule): the canvas then holds its own handles
  useEffect(() => {
    if (tex && handle !== null) continueRender(handle);
  }, [tex, handle]);
  return tex;
};

// ---- the scene ------------------------------------------------------------------------------------------------------------------
export const Phone3D: React.FC<{p: Phone3DProps; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const layer = useLayer();
  const gfx = layer !== 'text';
  const tex = useScreenTexture(p.src, gfx);
  const base = lead(ctx);
  const first = ctx.index === 0;
  const light = isLight();
  const staging = p.staging === 'tilt' || p.staging === 'hero' ? p.staging : 'device';
  const pose = POSES[staging];
  const enter = spr(frame, entrance(ctx), 'enterXL');
  const lum = first ? prog(frame, base + 4, 18) : (light ? 0.78 : 0.6) + (light ? 0.22 : 0.4) * prog(frame, base, 8);

  // the focus track: exactly the flat device's (Phone.tsx), in its units
  const zOf = (z: number | undefined, x: number, what: string) => {
    const asked = Math.min(ZMAX, Math.max(1, z ?? 1));
    const want = Math.max(1, asked * CLASSIC) * WIN_W;
    const cap = pSafe(x);
    if (want > cap + 0.02 * WIN_W) warnOnce(`${p.src}|${what}|${asked}|${x}`, `Phone ${p.src}: ${what} zoom ${asked} at x ${x} would push the phone outside the Reels safe zone; it lands at the largest safe framing`);
    return Math.min(want, cap);
  };
  const moves = (p.focus ?? [])
    .map((k, i) => ({f: k.at !== undefined ? cueFrame(ctx, k.at) : base + 24, y: k.y, x: k.x ?? 0.5, P: zOf(k.zoom, k.x ?? 0.5, `focus[${i}]`)}))
    .sort((a, b) => a.f - b.f);
  const landsFramed = moves.length > 0 && moves[0].f <= (first ? base : 0);
  const keys = [landsFramed ? {...moves[0], f: base} : {f: base, y: p.y ?? 0, x: p.x ?? 0.5, P: zOf(p.zoom, p.x ?? 0.5, 'start')}, ...moves.slice(landsFramed ? 1 : 0)];
  let fy = keys[0].y;
  let fx = keys[0].x;
  let P = keys[0].P;
  for (let i = 1; i < keys.length; i++) {
    const t = prog(frame, keys[i].f, 28, ease.camera);
    fy += (keys[i].y - fy) * t;
    fx += (keys[i].x - fx) * t;
    P += (keys[i].P - P) * t;
  }
  P = Math.min(P, pSafe(fx));
  // WHOLE (src/lib/device.mjs phoneWhole, the owner 2026-10-12: "never cut the mockups"): the whole body fits the picture
  // box, no push and no pan; a band or a tap still points at the row
  const whole = phoneWhole(p, filmNo());
  if (whole) P = (CH - 90) / BH;
  const pushK = whole ? 0 : Math.min(1, Math.max(0, (P - keys[0].P) / (0.12 * WIN_W)));

  // highlights in time order: the veil fades in once, a later band slides from the previous one (Phone.tsx)
  const hlList = ([] as Highlight[])
    .concat(p.highlight ?? [])
    .map((h) => ({h, s: h.at !== undefined ? cueFrame(ctx, h.at) : base + 26}))
    .sort((a, b) => a.s - b.s);
  const hlStarts = hlList.map((e) => e.s);
  const hlIdx = hlStarts.filter((s) => frame >= s).length - 1;
  const dimT = hlList.length ? prog(frame, hlStarts[0], 12) : 0;
  const hl = (() => {
    if (hlIdx < 0) return null;
    const cur = hlList[hlIdx].h;
    const prev = hlIdx > 0 ? hlList[hlIdx - 1].h : null;
    if (!prev) return cur;
    const k = prog(frame, hlStarts[hlIdx], 14, ease.camera);
    return {...cur, y: lerp(prev.y, cur.y, k), h: lerp(prev.h, cur.h, k), x: lerp(prev.x ?? 0.03, cur.x ?? 0.03, k), w: lerp(prev.w ?? 0.94, cur.w ?? 0.94, k)};
  })();
  const hlT = hl ? (hlIdx === 0 ? prog(frame, hlStarts[0], 12) : 1) : 0;
  // the band's box in capture px (centre, half size); the border grows from 96 % (Phone.tsx's scale)
  const box = (h: Highlight, s: number): [number, number, number, number] => {
    const x = (h.x ?? 0.03) * SRC_W;
    const w = (h.w ?? 0.94) * SRC_W;
    const y = h.y * SRC_H;
    const hh = h.h * SRC_H;
    return [x + w / 2, y + hh / 2, (w / 2) * s, (hh / 2) * s];
  };
  const ringScale = 0.96 + 0.04 * hlT;
  // from film KIT_FROM on the band is concentric with the element (src/lib/outline.mjs, Phone.tsx): the ring is the stroke's
  // inner edge and the veil's window, its radius the element's plus the gap; a later band slides ring to ring
  const rings = useRings(gfx && outlineOn(filmNo()) ? staticFile(`screens/${p.src}.jpg`) : null, hlList.map((e) => e.h));
  const ring: Ring | null = (() => {
    if (hlIdx < 0 || !rings[hlIdx]) return null;
    const cur = rings[hlIdx] as Ring;
    const prev = hlIdx > 0 ? rings[hlIdx - 1] : null;
    return prev ? mixRing(prev, cur, prog(frame, hlStarts[hlIdx], 14, ease.camera)) : cur;
  })();
  const ringBox = (g: Ring, s: number): [number, number, number, number] => [(g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, ((g.x1 - g.x0) / 2) * s, ((g.y1 - g.y0) / 2) * s];

  const co = p.callout;
  const coAt = co ? (co.at !== undefined ? cueFrame(ctx, co.at) : (hlStarts[0] ?? base + 26) + 8) : 0;
  const taps = ([] as TapP[]).concat(p.tap ?? []);
  const tapAts = taps.map((t) => (t.at !== undefined ? cueFrame(ctx, t.at) : base + 30));

  // ---- the pose: the staging's turn, the reading turn, the float ----
  const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
  const turnIn = staging === 'hero' ? prog(frame, entrance(ctx), 54, ease.camera) : enter;
  const settle = ease.camera(life);
  const face = Math.max(pushK, dimT);
  const yawD = (turnIn < 1 ? lerp(pose.yaw[0], pose.yaw[1], turnIn) : lerp(pose.yaw[1], pose.yaw[2], settle)) * (1 - 0.68 * face);
  const pitchD = (turnIn < 1 ? lerp(pose.pitch[0], pose.pitch[1], turnIn) : lerp(pose.pitch[1], pose.pitch[2], settle)) * (1 - 0.62 * face);
  const TAU = Math.PI * 2;
  const floatPitch = 0.45 * Math.sin((TAU * frame) / 176 + 0.4);
  const floatRoll = pose.roll * (1 - face) + 0.28 * Math.sin((TAU * frame) / 236 + 1.1);
  const bob = 0.0055 * Math.sin((TAU * frame) / 150 + 0.2);
  const yaw = yawD * deg;
  const pitch = (pitchD + floatPitch) * deg;
  const roll = floatRoll * deg;
  // the hero's camera closes in from a whole, small phone; every staging rises a little into place on the cut
  const heroK = staging === 'hero' ? lerp(0.6, 1, prog(frame, entrance(ctx), 66, ease.camera)) : 1;
  const Pv = P * heroK * lerp(0.95, 1, enter);
  const rise = (1 - enter) * -0.3;

  // ---- the aim: the display point (fx, fy) held like the flat device holds it ----
  const half = 498 / Pv; // the window's half height (stage 384..1380 about PY) in world units at the display
  let ay = (0.5 - fy) * SH;
  const ayLo = half - SH / 2;
  const ayHi = SH / 2 - half;
  ay = whole || ayLo > ayHi ? 0 : Math.min(ayHi, Math.max(ayLo, ay));
  const ax = (fx - 0.5) * Math.max(0, 1 - WIN_W / Pv);
  const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-pitch, yaw, roll, 'YXZ'));
  const pos = new THREE.Vector3(0, rise + bob, 0);
  const aimW = new THREE.Vector3(ax, ay, FRONT).applyMatrix4(rot).add(pos);
  const dist = HH / (Pv * TANH);
  const cam = new THREE.Vector3(aimW.x, aimW.y, aimW.z + dist);
  // a world point -> stage y (the camera looks straight ahead)
  const stageY = (v: THREE.Vector3) => {
    const c = v.clone().sub(cam);
    return PY - (c.y / -c.z / TANH) * HH;
  };
  const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(rot).add(pos);
  // the body's top on the page: a push that lifts it past its rest crops it on a clean line under the meta bar (Phone.tsx)
  const topY = Math.min(...[-BW / 2 + 0.1, 0, BW / 2 - 0.1].flatMap((x) => [stageY(local(x, BH / 2, FRONT)), stageY(local(x, BH / 2, -FRONT))]));
  const riseUp = Math.max(0, TOP - 6 - topY);
  const crop = Math.min(1, riseUp / 24);
  const clipTop = TOP - 10 + (L.graphicsTop - (TOP - 10)) * crop;
  // cropBottom: the capture ends there; the picture is cut on a level line just under it (never an empty frame)
  const cutF = p.cropBottom !== undefined ? Math.max(0.05, Math.min(1, p.cropBottom)) : null;
  const cutY = cutF !== null ? Math.min(WIN_BOT, Math.max(...[-0.45, 0, 0.45].map((x) => stageY(local(x, SH / 2 - cutF * SH, FRONT))))) : WIN_BOT;

  const bright = light ? 1 : Math.min(1, Math.max(0.9, p.bright ?? THEME.screenBright));
  const dpr = STAGE.s * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const tone = toneLine(hl?.tone ?? 'up');
  const s: GLState = {
    cam,
    yaw,
    pitch,
    roll,
    pos,
    lum: lum * bright,
    veilBox: ring ? ringBox(ring, 1) : hl ? box(hl, 1) : [0, 0, SRC_W, SRC_H],
    veilA: hl ? THEME.dimA * dimT : 0,
    veilR: ring ? ring.r : 14 * CAP,
    ringBox: ring ? ringBox(ring, ringScale) : hl ? box(hl, ringScale) : [0, 0, 1, 1],
    ringR: (ring ? ring.r : 14 * CAP) * ringScale,
    ringOut: ring ? 1 : 0,
    ringA: hlT,
    ringCol: tone,
    glowA: 0.33 * THEME.glow,
    taps: taps
      .map((t, i): [number, number, number, number] => {
        const k = interpolate(frame, [tapAts[i], tapAts[i] + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const on = frame >= tapAts[i] && k < 1;
        return [t.x * SRC_W, t.y * SRC_H, 0.55 + 0.6 * k, on ? 1 - k : 0];
      })
      .filter((t) => t[3] > 0)
      .slice(0, 4),
    // the sheen follows the turn; on paper the light screens leave nothing for it to show, the glass carries it
    sheen: [0.55 + 1.6 * Math.sin(yaw) + 0.6 * Math.sin(pitch), 0.32, light ? 0.035 : 0.05],
    cut: cutF !== null ? cutF * SRC_H : SRC_H + 10,
    shadowA: light ? 0.2 * Math.min(1, enter * 1.4) : 0,
    px: dpr,
  };

  return (
    <div style={{position: 'absolute', inset: 0, clipPath: `inset(${clipTop}px 0 ${1920 - Math.max(clipTop + 40, cutY)}px 0)`}}>
      <div style={{position: 'absolute', left: CX0, top: CY0, width: CW, height: CH, opacity: Math.min(1, enter * 1.4)}}>
        {gfx && tex ? (
          <ThreeCanvas key={theme()} width={CW} height={CH} dpr={dpr} gl={{antialias: true, alpha: true}} style={{background: 'transparent'}}>
            <PhoneGL tex={tex} s={s} />
          </ThreeCanvas>
        ) : null}
      </div>
      {co ? (
        // over the screen's lower part, on a soft pill of the field (Phone.tsx)
        <div style={{position: 'absolute', top: L.contentBottom - 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: spr(frame, coAt)}}>
          <div className={TXT} style={{textAlign: 'center', padding: '8px 28px 10px', borderRadius: 22, background: rgba(C.bg, 0.86)}}>
            {co.value ? <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: toneLine(co.tone), fontFeatureSettings: '"tnum" 1'}}>{mtav(co.value)}</div> : null}
            <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: '0.05em', color: C.ink2}}>{mtav(capsLatin(co.text))}</div>
          </div>
        </div>
      ) : null}
      <Sfx name="asmr-slide" at={base} volume={0.42} /* event: the phone slides in (enterXL) */ />
      {staging === 'hero' ? <Sfx name="asmr-air-long" at={base} volume={0.24} len={46} fade={14} /* event: the phone turns to the viewer */ /> : null}
      {/* event: the phone comes to rest (the slide's faint touch, 10 frames in), unless a tap or a band is already there */}
      {[...tapAts, ...hlStarts].some((a) => Math.abs(a - (base + 10)) < 8) ? null : <Haptic kind="soft" at={base + 10} volume={0.4} />}
      {keys.slice(1).map((k, i) => (k.P > keys[i].P * 1.05 && k.f - 10 >= 0 ? <Sfx key={`push${i}`} name="asmr-air-long" at={k.f - 10} volume={0.26} len={40} fade={12} /* event: the camera pushes in (28 frames) */ /> : null))}
      {tapAts.map((a, i) => (
        <React.Fragment key={`tap${i}`}>
          <Sfx name="asmr-tap" at={a} volume={0.55} /* event: a finger taps the screen */ />
          <Haptic kind="light" at={a} volume={0.42} />
        </React.Fragment>
      ))}
      {hlStarts.map((a, i) => (
        <React.Fragment key={`hl${i}`}>
          <Sfx name="cc0-click-soft" at={a} volume={0.5} /* event: a highlight band lands: a soft real click (cc0) under its haptic */ />
          {tapAts.some((t) => Math.abs(t - a) <= 3) ? null : <Haptic kind={i === 0 ? 'light' : 'selection'} at={a} volume={i === 0 ? 0.4 : 0.34} />}
        </React.Fragment>
      ))}
      {co ? <Sfx name="asmr-knock" at={coAt} volume={0.36} /* event: the callout appears */ /> : null}
      {co ? <Haptic kind={co.value ? 'medium' : 'light'} at={coAt} /* event: the callout's value lands */ /> : null}
    </div>
  );
};
