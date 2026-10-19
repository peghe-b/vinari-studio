// The real 3D iPhone posed freely in the frame (the QR promo's kit, 2026-10-14, brought into the studio on 2026-10-15 for
// PhoneDesk): the SAME body, light and display shader as the Phone scene's 3D iPhone (./phone3d.tsx exports them), placed by
// a pose in stage px every frame instead of Phone's fixed staging, with any HTML laid on its turned screen (ScreenLayer:
// the lock screen and its banners, ./lock.tsx). A bigger phone is a closer camera, never a CSS scale, so the screen stays
// sharp; the lens is the studio's (its 26 degrees over a 596 px half height: a focal of 2580 px).
//
//   PosedPhone {pose, light, wall}   the body over the whole stage (one WebGL canvas); `wall` paints the display
//   ScreenLayer {pose, children}     HTML in capture px (1080 x 2346) on the display, clipped to its rounded corners
//   bodyBox(pose) / project(pose, u, v)   where the body / a display point lands on the stage (the shadow, a label)
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {STAGE} from '../../tokens';
import {OBJ} from '../../lib/layer';
import {BH, BW, FRONT, ISLAND, makeBody, makeEnv, makeScreen, SCR_R, SH, SRC_H, SRC_W} from './phone3d';

export const FPX = 2580;
const VW = 1100; // the virtual view round the axis (wider than the stage either way)
const VH = 1940;
const D2R = Math.PI / 180;

export type Pose = {x: number; y: number; w: number; yaw: number; pitch: number; roll?: number}; // centre (stage px), display width (px), degrees
export type Rect = {x: number; y: number; w: number; h: number};

const rotOf = (p: Pose) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-p.pitch * D2R, p.yaw * D2R, (p.roll ?? 0) * D2R, 'YXZ'));
const proj = (p: Pose, R: THREE.Matrix4, X: number, Y: number, Z: number) => {
  const v = new THREE.Vector3(X, Y, Z).applyMatrix4(R);
  const k = FPX / (FPX / p.w - v.z);
  return {x: p.x + v.x * k, y: p.y - v.y * k};
};
const boxOf = (pts: {x: number; y: number}[]): Rect => {
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y};
};
/** a display point (capture fractions) on the stage */
export const project = (p: Pose, u: number, v: number) => proj(p, rotOf(p), u - 0.5, (0.5 - v) * SH, FRONT);
/** the whole body's bounds on the stage */
export const bodyBox = (p: Pose): Rect => {
  const R = rotOf(p);
  const pts: {x: number; y: number}[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(proj(p, R, (sx * BW) / 2, (sy * BH) / 2, sz * FRONT));
  return boxOf(pts);
};

/** the display's picture under the HTML layer: the wallpaper's two colours as a canvas (no file, no wait) */
const wallTex = (top: string, bottom: string) => {
  const cv = document.createElement('canvas');
  cv.width = 270;
  cv.height = 586;
  const g = cv.getContext('2d');
  if (g) {
    const grd = g.createLinearGradient(0, 0, 0, cv.height);
    grd.addColorStop(0, top);
    grd.addColorStop(1, bottom);
    g.fillStyle = grd;
    g.fillRect(0, 0, cv.width, cv.height);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
};

const PhoneGL: React.FC<{pose: Pose; light: boolean; wall: [string, string]; dpr: number}> = ({pose, light, wall, dpr}) => {
  const {gl, camera} = useThree();
  const env = useMemo(() => makeEnv(gl, light), [gl, light]);
  useEffect(() => () => env.dispose(), [env]);
  const body = useMemo(() => makeBody(env.texture, light), [env, light]);
  const tex = useMemo(() => wallTex(wall[0], wall[1]), [wall]);
  const screen = useMemo(() => makeScreen(tex), [tex]);
  useEffect(
    () => () => {
      [body.glass, body.metal, body.crystal].forEach((m) => m.dispose());
      body.lids.dispose();
      body.walls.dispose();
      body.buttons.forEach((b) => b.geo.dispose());
    },
    [body],
  );
  useEffect(
    () => () => {
      screen.geo.dispose();
      screen.mat.dispose();
      tex.dispose();
    },
    [screen, tex],
  );
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;

  // the lens: its axis through the phone's centre, the stage a window of a wider virtual view
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = (2 * Math.atan(VH / FPX)) / D2R;
  cam.aspect = VW / VH;
  cam.near = 0.2;
  cam.far = 80;
  cam.setViewOffset(2 * VW, 2 * VH, VW - pose.x, VH - pose.y, 1080, 1920);
  cam.position.set(0, 0, FPX / pose.w);
  cam.rotation.set(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  const u = screen.mat.uniforms;
  u.uPx.value = dpr;
  u.uSheen.value.set(0.55 + 1.6 * Math.sin(pose.yaw * D2R) + 0.6 * Math.sin(pose.pitch * D2R), 0.32, light ? 0.035 : 0.05);
  return (
    <group rotation={[0, pose.yaw * D2R, 0]}>
      <group rotation={[-pose.pitch * D2R, 0, 0]}>
        <group rotation={[0, 0, (pose.roll ?? 0) * D2R]}>
          <mesh geometry={body.lids} material={body.glass} />
          <mesh geometry={body.walls} material={body.metal} />
          {body.buttons.map((b, i) => (
            <mesh key={i} geometry={b.geo} material={b.mat} position={[b.x, b.y, 0]} />
          ))}
          <mesh geometry={screen.geo} material={screen.mat} position={[0, 0, FRONT + 0.0007]} renderOrder={2} />
        </group>
      </group>
    </group>
  );
};

/** the real 3D iPhone over the whole stage, posed in stage px */
export const PosedPhone: React.FC<{pose: Pose; light?: boolean; wall?: [string, string]}> = ({pose, light = false, wall = ['#10131C', '#05060A']}) => {
  const dpr = STAGE.s * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const w = useMemo<[string, string]>(() => [wall[0], wall[1]], [wall[0], wall[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    // a phone the frame guards keep whole (lib/layer.ts OBJ: PhoneDesk); the canvas is transparent round it
    <div className={OBJ} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}}>
      <ThreeCanvas width={1080} height={1920} dpr={dpr} gl={{antialias: true, alpha: true}} style={{background: 'transparent'}}>
        <PhoneGL pose={pose} light={light} wall={w} dpr={dpr} />
      </ThreeCanvas>
    </div>
  );
};

/** HTML laid on the phone's turned display with the phone's own lens: children in capture px (1080 x 2346), clipped to the
 *  display's rounded corners; the Dynamic Island stays on top (the hardware, not the screen), and a faint glass sheen. */
export const ScreenLayer: React.FC<{pose: Pose; children: React.ReactNode; sheen?: number}> = ({pose, children, sheen = 0.07}) => {
  const fw = pose.w;
  const fh = SH * pose.w;
  const fx = pose.x - fw / 2;
  const fy = pose.y - fh / 2;
  const s = fw / SRC_W;
  return (
    <div style={{position: 'absolute', inset: 0, perspective: `${FPX}px`, perspectiveOrigin: `${pose.x}px ${pose.y}px`, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: fx,
          top: fy,
          width: fw,
          height: fh,
          transformOrigin: `${fw / 2}px ${fh / 2}px`,
          transform: `rotateY(${pose.yaw}deg) rotateX(${pose.pitch}deg) rotateZ(${-(pose.roll ?? 0)}deg) translateZ(${FRONT * pose.w + 0.6}px)`,
          borderRadius: SCR_R * fw,
          overflow: 'hidden',
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, width: SRC_W, height: SRC_H, transform: `scale(${s})`, transformOrigin: '0 0'}}>
          {children}
          <div style={{position: 'absolute', left: ISLAND.cx - ISLAND.hw, top: ISLAND.cy - ISLAND.hh, width: ISLAND.hw * 2, height: ISLAND.hh * 2, borderRadius: ISLAND.hh, background: '#050505'}} />
          {sheen > 0 ? <div style={{position: 'absolute', inset: 0, background: `linear-gradient(118deg, rgba(255,255,255,0) 30%, rgba(255,255,255,${sheen}) 44%, rgba(255,255,255,0) 58%)`}} /> : null}
        </div>
      </div>
    </div>
  );
};
