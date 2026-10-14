// 5 the card: a match cut on the card the reveal lifted out of the phone (the tap on „ამობეჭდვა და გაზიარება": printed):
// it settles at the top as paper while her car comes up under it (front three-quarter, the white studio's light). On
// „ნომერი აღარ გჭირდება" her old paper lifts off the windscreen, is struck out and falls away; the card flies down and
// lands behind the windscreen. „ბარათზე მხოლოდ კოდია." A loupe over the glass: only the code. The loupe closes before
// the cut: the scan opens on the same car.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {CARD_TO} from './Reveal';

export const CAR_DY = 210;
export const camAt = (k: number): CarCam => {
  const a = lerp(0.5, 0.6, k);
  return {pos: [Math.sin(a) * 15, 3.6, Math.cos(a) * 15], target: [0, 0.6, 0.2], fov: 30};
};
const NOTE: [number, number, number] = [0.3, 1.035, 0.7];
export const CARD_C: [number, number, number] = [-0.26, 1.07, 0.61];

/** the real card, cropped from the app's capture, `w` px wide */
export const CardArt: React.FC<{w: number}> = ({w}) => {
  const s = w / 810;
  return (
    <div style={{position: 'relative', width: w, height: w * (456 / 810), overflow: 'hidden', background: '#fff'}}>
      <Img src={staticFile('screens/08-qr-card.jpg')} style={{position: 'absolute', left: -136 * s, top: -353 * s, width: 1080 * s, height: 2346 * s}} />
    </div>
  );
};

/** her old paper, flat (the act-1 note): „5•• •• •• ••" in blue ballpoint */
export const OldNote: React.FC<{w: number; strike: number}> = ({w, strike}) => {
  const h = w * 0.62;
  return (
    <svg width={w} height={h} viewBox="0 0 640 400" style={{display: 'block', overflow: 'visible'}}>
      <defs>
        <linearGradient id="onote" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFEFA" />
          <stop offset="1" stopColor="#ECE9E1" />
        </linearGradient>
      </defs>
      <rect width={640} height={400} fill="url(#onote)" />
      <rect x={318} width={4} height={400} fill="#000" opacity={0.06} />
      <path d="M132 112L76 116L66 196Q110 168 138 206Q156 254 112 276Q82 290 58 266" fill="none" stroke="#1D3DB0" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      {[
        [176, 214],
        [292, 330],
        [408, 446],
        [524, 562],
      ].map(([a, b], i) =>
        [a, b].map((x, j) => <circle key={`${i}${j}`} cx={x} cy={206 + Math.sin((i * 2 + j) * 1.7) * 5} r={14} fill="#1D3DB0" />),
      )}
      {strike > 0 ? <path d={`M30 ${236}L${30 + 600 * strike} ${196 - 20 * strike}`} stroke={C.downLine} strokeWidth={22} strokeLinecap="round" /> : null}
    </svg>
  );
};

export const CardShot: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('card').from);
  const len = fr(shot('card').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const old = L('oldNote');
  const strike = L('strike');
  const gone = L('noteGone');
  const flyAt = L('flyCard');
  const cardIn = L('cardIn');
  const loupeAt = L('cardLoupe');
  const cam = camAt(E.inOut(prog(t, 0, len)));

  // ---- the open: the SAME card the reveal lifted out of the phone (CARD_TO), now paper: it settles smaller at the top,
  // its app corners going sharp; her car comes up under it ----
  const settle = E.inOut(prog(t, 0, 16));
  const HOLD_W = 620;
  const hx = lerp(CARD_TO.x, 540 - HOLD_W / 2, settle);
  const hy = lerp(CARD_TO.y, 300, settle);
  const hw = lerp(CARD_TO.w, HOLD_W, settle);
  const carIn = E.out(prog(t, 2, 18));

  // ---- the card's flight to the glass ----
  const card2 = projectCar(cam, CARD_C);
  const cx = card2.x;
  const cy = card2.y + CAR_DY;
  const cTop = projectCar(cam, [CARD_C[0], CARD_C[1] + 0.05, CARD_C[2] - 0.09]);
  const cL = projectCar(cam, [CARD_C[0] + 0.18, CARD_C[1], CARD_C[2]]);
  const cR = projectCar(cam, [CARD_C[0] - 0.18, CARD_C[1], CARD_C[2]]);
  const endW = Math.hypot(cR.x - cL.x, cR.y - cL.y);
  const endRot = (Math.atan2(cR.y - cL.y, cR.x - cL.x) * 180) / Math.PI;
  const endH = Math.abs(cTop.y - card2.y) * 2;
  const fk = E.inOut(prog(t, flyAt, cardIn - flyAt));
  const startX = hx + hw / 2;
  const startY = hy + (hw * (456 / 810)) / 2;
  const fx = lerp(startX, cx, fk);
  const fy = lerp(startY, cy, fk) - Math.sin(Math.PI * fk) * 120;
  const fw = lerp(hw, endW, fk);
  const squash = lerp(1, Math.min(1, endH / (endW * (456 / 810))), fk);
  const rotZ = lerp(0, endRot, fk) + Math.sin(Math.PI * fk) * -8;
  const rotX = Math.sin(Math.PI * fk) * 28;
  const flatA = t < cardIn ? 1 : 1 - clamp((t - cardIn) / 6);
  const cardA = clamp((t - cardIn + 2) / 6);
  const radius = lerp(26 * (hw / CARD_TO.w), 5, settle);

  // ---- her old paper: off the glass, struck, gone (between the card above and the car below) ----
  const note2 = projectCar(cam, NOTE);
  const nk = E.out(prog(t, old, 12));
  const nStrike = E.inOut(prog(t, strike, 9));
  const nGone = E.in(prog(t, gone, 12));
  const nx = lerp(note2.x, 540, nk) + 120 * nGone;
  const ny = lerp(note2.y + CAR_DY, 790, nk) + 260 * nGone;
  const nw = lerp(60, 300, nk);

  // ---- the loupe on the card behind the glass ----
  const lk = E.outBack(prog(t, loupeAt, 10)); // v4: a hard cut to the street follows, the loupe stays open to it
  const LOUPE = {x: 560, y: 600, r: 250};
  const dir = (() => {
    const dx = cam.pos[0] - CARD_C[0];
    const dy = cam.pos[1] - CARD_C[1];
    const dz = cam.pos[2] - CARD_C[2];
    const n = Math.hypot(dx, dy, dz);
    return [dx / n, dy / n, dz / n];
  })();
  // the loupe looks at the card nearly square on (the glass's normal, a little toward the camera), so the code reads flat
  const ld = 0.62 - 0.05 * E.inOut(prog(t, loupeAt, len - loupeAt));
  const nrm = [0, 0.87, 0.49];
  const mixd = [0.75 * nrm[0] + 0.25 * dir[0], 0.75 * nrm[1] + 0.25 * dir[1], 0.75 * nrm[2] + 0.25 * dir[2]];
  const mn = Math.hypot(mixd[0], mixd[1], mixd[2]);
  const loupeCam: CarCam = {pos: [CARD_C[0] + (mixd[0] / mn) * ld, CARD_C[1] + (mixd[1] / mn) * ld, CARD_C[2] + (mixd[2] / mn) * ld], target: CARD_C, fov: 34};

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {/* the car, its note under the wiper until the paper lifts off */}
      <div style={{position: 'absolute', left: 0, top: CAR_DY + 50 * (1 - carIn), width: 1080, height: 1920, opacity: carIn}}>
        <Car3 cam={cam} night={0} note={t < old + 2 ? 1 : 0} card={t >= cardIn - 2} cardK={1} cardA={cardA} glassA={0.62} />
      </div>
      {/* the card: held at the top, then in flight to the glass */}
      {flatA > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: fx - fw / 2,
            top: fy - (fw * (456 / 810)) / 2,
            width: fw,
            height: fw * (456 / 810),
            opacity: flatA,
            borderRadius: radius,
            overflow: 'hidden',
            transform: `perspective(1400px) rotateZ(${rotZ}deg) rotateX(${rotX}deg) scaleY(${squash})`,
            boxShadow: `0 ${26 * (1 - fk)}px ${64 * (1 - fk)}px rgba(0,0,0,${0.16 * (1 - fk)}), 0 ${4 * (1 - fk)}px ${14 * (1 - fk)}px rgba(0,0,0,${0.08 * (1 - fk)})`,
          }}
        >
          <CardArt w={fw} />
        </div>
      ) : null}
      {/* her old paper */}
      {t >= old && nGone < 1 ? (
        <div style={{position: 'absolute', left: nx - nw / 2, top: ny - (nw * 0.62) / 2, transform: `rotate(${lerp(-8, -4, nk) + 30 * nGone}deg)`, opacity: 1 - nGone, filter: `drop-shadow(0 ${14 * nk}px ${24 * nk}px rgba(0,0,0,0.18))`}}>
          <OldNote w={nw} strike={nStrike} />
        </div>
      ) : null}
      {/* the loupe on the card behind the glass */}
      {lk > 0.001 ? (
        <div style={{position: 'absolute', inset: 0, opacity: clamp(lk * 1.5)}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <line x1={cx} y1={cy} x2={lerp(cx, LOUPE.x, clamp(lk))} y2={lerp(cy, LOUPE.y + LOUPE.r * 0.96, clamp(lk))} stroke={C.ink} strokeWidth={3} opacity={0.8} />
            <circle cx={cx} cy={cy} r={10} fill="none" stroke={C.ink} strokeWidth={3} />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: LOUPE.x - LOUPE.r,
              top: LOUPE.y - LOUPE.r,
              width: LOUPE.r * 2,
              height: LOUPE.r * 2,
              borderRadius: LOUPE.r,
              overflow: 'hidden',
              transform: `scale(${Math.max(0.01, lk)})`,
              transformOrigin: `${cx - (LOUPE.x - LOUPE.r)}px ${cy - (LOUPE.y - LOUPE.r)}px`,
              boxShadow: `0 0 0 6px ${C.ink}, 0 22px 60px rgba(0,0,0,0.2)`,
              background: '#E9ECF2',
            }}
          >
            <Car3 w={LOUPE.r * 2} h={LOUPE.r * 2} cam={loupeCam} night={0} card cardK={1} glassA={0.42} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
