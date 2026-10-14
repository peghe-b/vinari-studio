// Ported from the QR promo's kit (kit/env.ts, 2026-10-14) on 2026-10-15 for the CarNight scene (./solidcar.tsx).
// The QR promo's light: a PMREM of a room with soft panels, from the white studio of act 2 (`day`) to the warm evening of act
// 1 (`night`: a dark street, one warm sodium-white lamp overhead, the cool glow of the sky, a few far windows). `k` mixes
// the two (0 day .. 1 night), so the reveal can turn the room. Shared by the car and the phone.
import * as THREE from 'three';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type EnvLook = {night: number; warm?: number};

export const makeEnv = (gl: THREE.WebGLRenderer, look: EnvLook) => {
  const k = Math.max(0, Math.min(1, look.night));
  const warm = look.warm ?? 1;
  const scene = new THREE.Scene();
  const disposables: {dispose(): void}[] = [];
  const basic = (r: number, g: number, b: number, side: THREE.Side) => {
    const m = new THREE.MeshBasicMaterial({color: new THREE.Color(r, g, b), side});
    disposables.push(m);
    return m;
  };
  const grey = (v: number, side: THREE.Side = THREE.DoubleSide) => basic(v, v, v, side);
  const roomGeo = new THREE.BoxGeometry(30, 30, 30);
  disposables.push(roomGeo);
  // the walls: +x, -x, +y (ceiling), -y (floor), +z, -z
  const day = [0.72, 0.66, 0.95, 0.07, 0.8, 0.7];
  const nite: [number, number, number][] = [
    [0.012, 0.014, 0.022],
    [0.01, 0.012, 0.02],
    [0.03, 0.04, 0.07], // the evening sky overhead, a cool deep blue
    [0.02, 0.016, 0.012], // the wet dark street
    [0.014, 0.016, 0.026],
    [0.012, 0.012, 0.02],
  ];
  scene.add(
    new THREE.Mesh(
      roomGeo,
      day.map((d, i) => basic(lerp(d, nite[i][0], k), lerp(d, nite[i][1], k), lerp(d, nite[i][2], k), THREE.BackSide)),
    ),
  );
  const panel = (w: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
    const g = new THREE.PlaneGeometry(w, h);
    disposables.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  // the day studio's softboxes, fading out at night
  const d = 1 - k;
  if (d > 0.01) {
    panel(7, 5, -5, 6, 7, grey(2.4 * d));
    panel(1.1, 12, -7, 0.5, -3.5, grey(3.2 * d));
    panel(1.1, 12, 7, 0.5, -3.5, grey(2.6 * d));
    panel(12, 1.2, 0, 8, -1.5, grey(2.2 * d));
    panel(1.6, 14, -8, 0.5, 1.2, grey(1.4 * d));
    panel(1.6, 14, 8, 0.5, 1.2, grey(1.1 * d));
    panel(14, 3, 0, -2.5, 11, grey(0.22 * d));
    // the horizon: a dark band low all round (the paint's crisp horizon line along the flanks)
    for (const [x, z] of [
      [0, 13],
      [0, -13],
      [13, 0],
      [-13, 0],
    ] as const)
      panel(30, 2.2, x, -0.6, z, grey(0.18 * d));
  }
  // the evening: a warm street lamp up and to the left, a cool sky strip, a few warm windows far off
  if (k > 0.01) {
    const lamp = basic(5.2 * k, 3.7 * k * warm + 4.1 * k * (1 - warm), 2.2 * k * warm + 4.0 * k * (1 - warm), THREE.DoubleSide);
    panel(4.5, 2.4, -4, 9, 3, lamp);
    panel(1.6, 1.0, 5, 7, 6, basic(1.4 * k, 1.0 * k, 0.6 * k, THREE.DoubleSide));
    panel(16, 1.4, 0, 6, -10, basic(0.16 * k, 0.22 * k, 0.4 * k, THREE.DoubleSide));
    const win = basic(1.3 * k, 0.85 * k, 0.45 * k, THREE.DoubleSide);
    for (const [x, y, z] of [
      [10, 2.5, 4],
      [11, 3.6, -2],
      [-11, 2.2, -5],
      [-10, 4.0, 6],
      [4, 3.0, 12],
      [-5, 2.6, 12],
    ] as const)
      panel(0.9, 1.3, x, y, z, win);
  }
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(scene, 0.03, 0.1, 60);
  pm.dispose();
  disposables.forEach((x) => x.dispose());
  return rt;
};
