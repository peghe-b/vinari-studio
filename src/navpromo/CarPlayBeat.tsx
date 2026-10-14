// CARPLAY, A PROMISE (the owner, 2026-10-12: "the mockup must show the screen properly", "refine it like the forest, with
// a real camera move", round 2: the wheel whole, no empty console, the voice through the car must read): the white world's
// daylight from between the front seats of a 2020s cabin. The road streams between poplars toward pale snowy mountains;
// the whole wheel at the driver's side over the slim instrument display; a wide floating screen on the dash, asleep (its
// clock only); and TODAY's navigator: the real iPhone (phones3d.tsx, the studio's 3D phone) on a wireless charging vent
// mount right of the screen, showing the VINARI drive screen („600 მ, მარჯვნივ მოუხვიე"). On Alice's real „ახლა მარჯვნივ
// მოუხვიე." the car's own speaker sends two cobalt rings, the road bends right, the wheel turns 32 degrees, the cluster
// shows the arrow, the horizon leans. On „მალე" the dash screen wakes into a CarPlay-STYLE layout drawn by us (a dock of
// plain tiles, no Apple icon, logo or trade dress): the real VINARI map (public/screens/17-nav-drive.jpg cropped to the
// route and the puck), the black turn card, the arrival pill and a cobalt „მალე" tag that lands and stays, so it never
// reads as today. The camera pushes in until the phone and the car screen fill the frame side by side, whole, above the
// subtitle line (the phone today, the car screen too: „CarPlay-ზეც"); the wheel and its display, the nearest plane, go out
// of focus and dissolve as the screen wakes (a rack focus), before the push carries them anywhere near the frame's edge. The
// world outside moves at under half the camera's speed
// (parallax). The cabin below the screen is a real console (climate keys, the drive dial, cup holders with a coffee, the
// armrest between the two seats), everything that matters above y 1420. THE SWAP, the day Apple grants the entitlement:
// live = true (timeline.json) plays public/navpromo/carplay-live.mp4 in the screen and drops the tag; the segment keeps
// its length.
import React from 'react';
import {Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {C, F, rgba} from '../tokens';
import {Backdrop} from '../scenes/illo/backdrop';
import {CarAhead, Road, view} from '../scenes/illo/road';
import {circ, DefsSvg, rr, Solid} from '../scenes/illo/solid';
import {camCss, camSvg, Ground, Poplars, useUid} from './carKit';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';
import {Phone3} from './phones3d';

const W = 1080;
const H = 1920;
// the car screen on the dash (stage px), its CarPlay-style dock and bezel
const SX = 540;
const SY = 1115;
const SW = 560;
const SH = 350;
const DOCK = 64;
const BEZEL = 12;
// the phone on its vent mount, right of the screen (stage px; PW the display's width)
const PX = 928;
const PY = 1124;
const PW = 150;
const PYAW = -15;
// the wheel at the driver's side, whole (stage px)
const WX = 226;
const WY = 1386;
const WR = 172;
const Wr = 143;
// the driver's side speaker on the dash top
const SPK: [number, number] = [176, 944];
// the camera: the cabin rises 180 px at the start (the console's detail ends above y 1420); the push ends with the screen
// and the phone side by side, whole (stage x 248..1030 with the vent peeking out right of the phone: about 37 px inside
// each side), the mirror whole at the top (its glass 25 px under the frame's top), the visors gone above it
const FY0 = 1140;
const S_END = 1.27;
const FX_END = 639;
const FY_END = 1118;
// the map: the screenshot's route and puck (its banner, status bar and footer stay out)
const MAP_W = SW - DOCK;
const MK = MAP_W / 1080;
const MAP_Y0 = 790;
const PUCK_X = 545 * MK;
const PUCK_Y = (1451 - MAP_Y0) * MK;
const ARROW = 'M30 104V58C30 38 42 26 62 26H80V8L112 38L80 68V50H62C56 50 54 54 54 60V104Z';
/** the dock's line glyphs (40 px tiles): a handset, a music note, a speech bubble */
const GLYPHS = [
  'M14.5 11.5C13 11.5 11.5 13 11.8 15C12.8 21.6 18.4 27.2 25 28.2C27 28.5 28.5 27 28.5 25.5V23.6L24.4 21.8L22.3 24C19.6 22.8 17.2 20.4 16 17.7L18.2 15.6L16.4 11.5Z',
  'M17 26.5V13.2L27.5 11V23.6M17 26.5A3.2 2.7 0 1 1 10.6 26.5A3.2 2.7 0 1 1 17 26.5ZM27.5 23.6A3.2 2.7 0 1 1 21.1 23.6A3.2 2.7 0 1 1 27.5 23.6Z',
  'M11 15.5C11 12.9 13 11 15.6 11H24.4C27 11 29 12.9 29 15.5V20.5C29 23.1 27 25 24.4 25H18.6L13.8 29V25.1C12.2 24.6 11 22.8 11 20.5Z',
];

/** the CarPlay-style layout, in screen px */
const Layout: React.FC<{t: number; wake: number; end: number}> = ({t, wake, end}) => {
  const card = sp(t, wake + 4, 190, 17);
  const eta = sp(t, wake + 10, 190, 18);
  const zoom = 1 + 0.07 * E.inOut(prog(t, wake, end - wake));
  // the same instruction as the phone beside it („600 მ, მარჯვნივ მოუხვიე, გენერალ კვინიტაძის ქუჩა"): one navigator, two screens
  const dist = 600;
  return (
    <>
      {/* the map, easing in slowly about the puck like the navigator's own camera */}
      <div style={{position: 'absolute', left: DOCK, top: 0, width: MAP_W, height: SH, overflow: 'hidden', backgroundColor: C.il1}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${PUCK_X.toFixed(1)}px ${PUCK_Y.toFixed(1)}px`}}>
          <Img src={staticFile('screens/17-nav-drive.jpg')} style={{position: 'absolute', left: 0, top: -MAP_Y0 * MK, width: 1080 * MK, height: 2346 * MK}} />
        </div>
        {/* the turn card */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            width: 240,
            height: 98,
            borderRadius: 18,
            backgroundColor: rgba(C.ink, 0.95),
            boxShadow: `0 8px 20px ${rgba(C.shade, 0.25)}`,
            opacity: clamp(card * 1.5),
            transform: `translateX(${((1 - card) * -36).toFixed(1)}px)`,
          }}
        >
          <svg width={58} height={58} viewBox="0 0 120 120" style={{position: 'absolute', left: 14, top: 20}}>
            <path d={ARROW} fill={C.il0} />
          </svg>
          <div style={{position: 'absolute', left: 84, top: 11, font: `600 36px ${F.sans}`, lineHeight: 1.1, color: C.il0, whiteSpace: 'nowrap'}}>{mtav(`${dist} მ`)}</div>
          <div style={{position: 'absolute', left: 86, top: 60, width: 146, font: `500 19px ${F.sans}`, lineHeight: 1.2, color: C.il3, whiteSpace: 'nowrap', overflow: 'hidden'}}>{mtav('კვინიტაძის ქ.')}</div>
        </div>
        {/* the arrival pill */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            height: 42,
            padding: '0 16px',
            borderRadius: 21,
            backgroundColor: C.il0,
            boxShadow: `0 6px 16px ${rgba(C.shade, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: clamp(eta * 1.5),
            transform: `translateY(${((1 - eta) * 26).toFixed(1)}px)`,
          }}
        >
          <span style={{font: `700 23px ${F.sans}`, color: C.ink, whiteSpace: 'nowrap'}}>14:56</span>
          <span style={{font: `500 18px ${F.sans}`, color: C.il4, whiteSpace: 'nowrap'}}>{mtav('3 წთ · 2,2 კმ')}</span>
        </div>
      </div>
      {/* the dock: the time, our tile (white, the VINARI mark), three dark tiles with plain white line glyphs (a handset, a
          note, a speech bubble: generic, no Apple icon) and the round grid key */}
      <div style={{position: 'absolute', left: 0, top: 0, width: DOCK, height: SH, backgroundColor: C.il7}}>
        <div style={{position: 'absolute', left: 0, top: 14, width: DOCK, textAlign: 'center', font: `600 16px ${F.sans}`, color: C.il0}}>14:53</div>
        {[0, 1, 2, 3].map((i) => {
          const k = sp(t, wake + 6 + i * 3, 230, 15);
          return (
            <div key={i} style={{position: 'absolute', left: 12, top: 48 + i * 54, width: 40, height: 40, borderRadius: 11, backgroundColor: i === 0 ? C.il0 : C.il5, transform: `scale(${k.toFixed(3)})`}}>
              {i === 0 ? (
                <Img src={staticFile('brand/mark.svg')} style={{position: 'absolute', left: 9, top: 10.4, width: 22, height: 19.2, filter: 'brightness(0) invert(0.045)'}} />
              ) : (
                <svg width={40} height={40} viewBox="0 0 40 40" style={{position: 'absolute', inset: 0}}>
                  <path d={GLYPHS[i - 1]} fill="none" stroke={C.il0} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 13, top: SH - 50, width: 38, height: 38, borderRadius: 19, backgroundColor: C.il5, transform: `scale(${sp(t, wake + 18, 230, 15).toFixed(3)})`}}>
          <svg width={38} height={38} viewBox="0 0 38 38" style={{position: 'absolute', inset: 0}}>
            <path d="M12 12h5v5h-5zM21 12h5v5h-5zM12 21h5v5h-5zM21 21h5v5h-5z" fill={C.il0} />
          </svg>
        </div>
      </div>
    </>
  );
};

// the road's depth stations, dense, so the bend on Alice's line is a smooth curve and never a polyline
const ROAD_ZS = [1.1, 2.5, 4, 5, 5.5, 6, 6.5, 7, 8, 8.5, 10, 11, 12.5, 14, 15, 16.5, 18, 21, 25, 30, 37, 45, 60, 85, 120, 160, 220];
const TOPY = -400;
const FOOTY = 2500;
/** the cabin from between the front seats, by day (stage px): the roof liner with its two visors and the mirror, the
 *  A-pillars, the windshield's dark dash top with the driver's speaker, the light dash face, the slim instrument display
 *  over the wheel, the vent behind the phone and its mount, a glovebox seam; the centre console with its climate keys, the
 *  drive dial, two cup holders (a coffee in one) and the armrest; the two seats' inner bolsters at the foot. */
const CabinDay: React.FC<{uid: string}> = ({uid}) => {
  const roof = `M-120 ${TOPY}H1200V330C820 376 260 376 -120 330Z`;
  const pillarL = 'M-120 290C30 316 112 338 158 354L70 948L-120 980Z';
  const pillarR = 'M1200 290C1050 316 968 338 922 354L1010 948L1200 980Z';
  const dashTop = 'M-120 942C200 906 380 898 540 898C700 898 880 906 1200 942V1012C880 980 700 974 540 974C380 974 200 980 -120 1012Z';
  const dashFace = `M-120 1012C200 980 380 974 540 974C700 974 880 980 1200 1012V${FOOTY}H-120Z`;
  // the console: from under the screen, widening toward us
  const consoleD = `M334 1316C340 1308 740 1308 746 1316L846 ${FOOTY}H234Z`;
  const consoleTop = 'M334 1316C340 1308 740 1308 746 1316L750 1330C700 1322 380 1322 330 1330Z';
  // the seats' inner bolsters (left: the driver's, right: the passenger's), soft leather
  const seatL = `M-140 1900C40 1872 196 1880 236 1932C262 1966 256 2100 246 ${FOOTY}H-140Z`;
  const seatR = `M1220 1900C1040 1872 884 1880 844 1932C818 1966 824 2100 834 ${FOOTY}H1220Z`;
  // the cup holders and the coffee in the right one
  const cup = 'M560 1838L566 1768H624L630 1838C620 1848 570 1848 560 1838Z';
  return (
    <g>
      <Solid uid={uid} d={roof} tone={1} outline />
      <Solid uid={uid} d={rr(60, 294, 340, 66, 22)} tone={2} outline />
      <Solid uid={uid} d={rr(680, 294, 340, 66, 22)} tone={2} outline />
      <Solid uid={uid} d={pillarL} tone={2} outline />
      <Solid uid={uid} d={pillarR} tone={2} outline />
      {/* the mirror: its stem, the dark body, the glass with the road behind in it */}
      <path d={rr(532, 330, 16, 68, 5)} fill={C.il4} />
      <Solid uid={uid} d={rr(414, 390, 252, 66, 28)} tone={5} outline />
      <path d={rr(426, 401, 228, 44, 20)} fill={C.il2} />
      <path d={rr(426, 425, 228, 20, [0, 0, 20, 20])} fill={C.il3} />
      <path d="M446 445L482 401H504L468 445Z" fill={C.il0} opacity={0.45} />
      {/* the glass's lower edge catches the sky */}
      <path d="M90 890C260 870 420 864 540 864C660 864 820 870 990 890V900C820 880 660 874 540 874C420 874 260 880 90 900Z" fill={C.il0} opacity={0.5} />
      <Solid uid={uid} d={dashTop} tone={5} outline />
      {/* the driver's speaker: a round grille on the dash top, its perforations */}
      <ellipse cx={SPK[0]} cy={SPK[1]} rx={44} ry={12} fill={C.il6} />
      <ellipse cx={SPK[0]} cy={SPK[1] - 1.5} rx={40} ry={10} fill={C.il5} />
      {Array.from({length: 15}, (_, i) => {
        const a = (i / 15) * Math.PI * 2;
        const rad = i % 3 === 0 ? 0 : i % 3 === 1 ? 0.5 : 0.82;
        return <circle key={i} cx={SPK[0] + Math.cos(a) * 34 * rad} cy={SPK[1] - 1.5 + Math.sin(a) * 8 * rad} r={1.6} fill={C.il7} />;
      })}
      <path d="M-120 1019C200 994 380 988 540 988C700 988 880 994 1200 1019" fill="none" stroke={C.il0} strokeWidth={3} />
      <Solid uid={uid} d={dashFace} tone={1} outline />
      {/* the lower dash's soft shade toward the footwells (under the subtitle line it stays light) */}
      <path d={`M-120 1700H1200V${FOOTY}H-120Z`} fill={`url(#${uid}foot)`} />
      {/* the lower dash on both sides of the console, a step deeper, its crease catching the light */}
      <Solid uid={uid} d={`M-120 1566C60 1534 220 1506 322 1494L234 ${FOOTY}H-120Z`} tone={2} outline />
      <Solid uid={uid} d={`M1200 1566C1020 1534 860 1506 758 1494L846 ${FOOTY}H1200Z`} tone={2} outline />
      <path d="M-120 1572C60 1540 220 1512 321 1500M1200 1572C1020 1540 860 1512 759 1500" fill="none" stroke={C.il0} strokeWidth={3} opacity={0.8} />
      {/* the glovebox on the passenger's side: its seam and handle */}
      <path d={rr(824, 1344, 206, 112, 30)} fill="none" stroke={C.il2} strokeWidth={2.4} />
      <path d={rr(848, 1362, 64, 13, 6.5)} fill={C.il2} />
      {/* the vent behind the phone (its mount clips onto it) */}
      <Solid uid={uid} d={rr(846, 1046, 184, 40, 18)} tone={5} outline />
      {[0, 1, 2].map((i) => (
        <path key={i} d={rr(858, 1055 + i * 9, 160, 2.6, 1.3)} fill={C.il3} />
      ))}
      {/* the phone's soft shadow on the dash face */}
      <path d={rr(PX - 70, PY - 150, 160, 330, 30)} fill={C.shade} opacity={0.16} filter={`url(#${uid}blur)`} />
      {/* the console */}
      <Solid uid={uid} d={consoleD} tone={2} outline />
      <path d={`M334 1316L234 ${FOOTY}H256L348 1322Z M746 1316L846 ${FOOTY}H824L732 1322Z`} fill={C.il3} opacity={0.45} />
      <Solid uid={uid} d={consoleTop} tone={1} />
      {/* the climate keys */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Solid uid={uid} d={rr(394 + i * 100, 1334, 92, 30, 15)} tone={1} outline />
          <path d={circ(440 + i * 100, 1349, 4)} fill={i === 1 ? C.il5 : C.il4} />
        </g>
      ))}
      {/* the drive dial on its plate: a knurled dial, P R N D with D lit */}
      <Solid uid={uid} d={rr(436, 1378, 208, 74, 28)} tone={1} outline />
      <Solid uid={uid} d={circ(482, 1415, 27)} tone={5} shade="ball" outline />
      <path d={circ(482, 1415, 20)} fill="none" stroke={C.il4} strokeWidth={2} strokeDasharray="3 3" />
      <path d={circ(474, 1406, 6)} fill={C.il3} opacity={0.6} />
      {['P', 'R', 'N', 'D'].map((g, i) => (
        <g key={g}>
          {g === 'D' ? <path d={rr(605, 1400, 30, 30, 9)} fill={C.il6} /> : null}
          <text x={530 + i * 30} y={1422} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={19} fill={g === 'D' ? C.il0 : C.il4}>
            {g}
          </text>
        </g>
      ))}
      {/* the console's calm middle stays plain: the subtitle line lies over it */}
      {/* the cup holders, a coffee in the right one */}
      <ellipse cx={486} cy={1836} rx={46} ry={20} fill={C.il5} />
      <ellipse cx={486} cy={1840} rx={38} ry={15} fill={C.il6} />
      <ellipse cx={595} cy={1836} rx={46} ry={20} fill={C.il5} />
      <Solid uid={uid} d={cup} tone={0} outline />
      <path d="M561 1818L563 1796H627L629 1818C612 1824 578 1824 561 1818Z" fill={C.il4} />
      <ellipse cx={595} cy={1768} rx={31} ry={9} fill={C.il1} stroke={C.ilEdge} strokeWidth={1.8} />
      <ellipse cx={595} cy={1765} rx={26} ry={7} fill={C.il0} />
      <ellipse cx={605} cy={1764} rx={6} ry={2.4} fill={C.il4} />
      {/* the armrest between the seats */}
      <Solid uid={uid} d={rr(300, 1912, 480, 600, 70)} tone={3} outline />
      <path d={rr(318, 1930, 444, 600, 58)} fill="none" stroke={C.il2} strokeWidth={2} strokeDasharray="6 6" opacity={0.8} />
      <path d={`M310 1940C420 1922 660 1922 770 1940`} fill="none" stroke={C.il1} strokeWidth={3} opacity={0.7} />
      {/* the seats */}
      <Solid uid={uid} d={seatL} tone={5} outline />
      <path d="M-140 1928C40 1900 180 1906 222 1950" fill="none" stroke={C.il4} strokeWidth={3} opacity={0.8} />
      <Solid uid={uid} d={seatR} tone={5} outline />
      <path d="M1220 1928C1040 1900 900 1906 858 1950" fill="none" stroke={C.il4} strokeWidth={3} opacity={0.8} />
    </g>
  );
};

/** the wheel, whole, centred on (0, 0), turned `turn` degrees: a shaded rim lit along its top, two spokes with their keys,
 *  the lower spoke, the flat-bottomed pad */
const Wheel: React.FC<{uid: string; turn: number}> = ({uid, turn}) => {
  const R = WR;
  const r = Wr;
  const ring = `M${-R} 0A${R} ${R} 0 1 1 ${R} 0A${R} ${R} 0 1 1 ${-R} 0ZM${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`;
  const arc = (rad: number, a0: number, a1: number) => {
    const p = (a: number) => `${(rad * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(rad * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
    return `M${p(a0)}A${rad} ${rad} 0 0 1 ${p(a1)}`;
  };
  const k = r / 184;
  const spoke = (sg: number) =>
    `M${sg * 62 * k} ${-6 * k}C${sg * 120 * k} ${-12 * k} ${sg * 150 * k} ${-10 * k} ${sg * (r + 8)} ${-22 * k}L${sg * (r + 8)} ${34 * k}C${sg * 150 * k} ${30 * k} ${sg * 120 * k} ${40 * k} ${sg * 66 * k} ${46 * k}Z`;
  const lower = `M${-30 * k} ${40 * k}L${-22 * k} ${r + 6}H${22 * k}L${30 * k} ${40 * k}Z`;
  const pad = `M${-74 * k} ${40 * k}C${-82 * k} ${-6 * k} ${-70 * k} ${-56 * k} 0 ${-60 * k}C${70 * k} ${-56 * k} ${82 * k} ${-6 * k} ${74 * k} ${40 * k}Q${72 * k} ${54 * k} ${58 * k} ${54 * k}H${-58 * k}Q${-72 * k} ${54 * k} ${-74 * k} ${40 * k}Z`;
  return (
    <g transform={`rotate(${turn.toFixed(2)})`}>
      <path d={ring} fill={C.shade} opacity={0.1} transform="translate(10 14)" />
      <Solid uid={uid} d={spoke(-1) + spoke(1) + lower} tone={5} outline />
      <path d={rr(96 * k, 2 * k, 30 * k, 14 * k, 7 * k) + rr(134 * k, 2 * k, 30 * k, 14 * k, 7 * k) + rr(-126 * k, 2 * k, 30 * k, 14 * k, 7 * k) + rr(-164 * k, 2 * k, 30 * k, 14 * k, 7 * k)} fill={C.il4} />
      <Solid uid={uid} d={ring} tone={6} outline />
      <path d={arc((R + r) / 2 + 4, 196, 300)} fill="none" stroke={C.il4} strokeWidth={8} strokeLinecap="round" opacity={0.75} />
      <path d={arc(R - 4, 206, 286)} fill="none" stroke={C.il3} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      <Solid uid={uid} d={pad} tone={6} outline />
      <path d={`M${-56 * k} ${-30 * k}C${-30 * k} ${-50 * k} ${30 * k} ${-50 * k} ${56 * k} ${-30 * k}`} fill="none" stroke={C.il4} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d={rr(-22 * k, 20 * k, 44 * k, 6 * k, 3 * k)} fill={C.il5} />
    </g>
  );
};

export const CarPlayBeat: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const s0 = shot('carplay');
  const live = Boolean(s0.live);
  const base = fr(s0.from);
  const end = fr(s0.to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const now = L('now');
  const wake = L('wake');
  const chip = L('chip');
  // the bend to the right on Alice's line, then the road straightens
  const turn = E.inOut(prog(t, now + 2, 22)) * (1 - E.inOut(prog(t, now + 40, 30)));
  // the camera: a slow drift in the cabin, the push to the screen and the phone, then a breath (never a still)
  const drift = E.sine(clamp(t / Math.max(1, wake)));
  const push = E.inOut(prog(t, wake + 2, 58));
  const breath = E.sine(clamp((t - wake - 60) / Math.max(1, end - wake - 60)));
  const s = 1 + 0.03 * drift + (S_END - 1.03) * push + 0.012 * breath;
  const fx = lerp(540, FX_END, push) + 1.5 * Math.sin(t / 13);
  const fy = lerp(FY0 + 12 * drift, FY_END, push) + 1.2 * Math.sin(t / 17 + 1);
  // the world outside: under half the camera's move (parallax), leaning in the bend; its horizon high in the glass
  const so = 1 + (s - 1) * 0.4;
  const hz = 690;
  const fox = 540 + (fx - 540) * 0.4;
  const foy = hz - (lerp(468, 430, push) - 960) / so;
  // the bend eases in (bendPow 2): the near edge lines run into it as one smooth curve, with no corner just over the dash
  const vw = view({hy: hz, vx: 560 - 80 * turn, h: 1.3, fp: 1000, bend: 540 * turn, bendPow: 2});
  const d = t * 0.55;
  // the nearest plane (the wheel and its instrument display) goes out of focus and dissolves as the screen wakes, a rack
  // focus to the screen, while the push has barely begun: whole to its last trace, it never meets the frame's edge
  const rack = prog(t, wake, 12);
  const wheelOp = 1 - E.inOut(rack);
  const wsx = 1 + 0.08 * E.out(rack);
  // the voice through the car: two cobalt rings from the speaker on Alice's line
  const rings = [now + 1, now + 8].map((at) => clamp((t - at) / 24));
  // the screen wakes
  // the map comes up 2 frames into the wake's flash, once the clock is gone (never the two at once)
  const on = t >= wake + 2 ? E.out(clamp((t - wake - 2) / 8)) : 0;
  // the sleeping clock goes at once, under the wake's flash, before the map shows (no double exposure)
  const asleep = 1 - clamp((t - wake) / 3);
  const flash = t >= wake ? 0.6 * (1 - E.out(clamp((t - wake) / 12))) : 0;
  const sheen = prog(t, wake + 5, 16);
  const tag = sp(t, chip, 240, 12);
  const tagBreath = 1 + 0.02 * Math.sin((t - chip) / 6) * clamp((t - chip - 14) / 10);
  const glass = rgba(C.il0, 0);
  // the phone, posed on the cabin's camera (a mount: only the car's own small shake)
  const pose = {x: 540 + s * (PX - fx), y: 960 + s * (PY - fy) + 0.6 * Math.sin(t / 3.1), w: PW * s, yaw: PYAW, pitch: 2, roll: 0.3 * Math.sin(t / 19)};
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: C.bg}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <DefsSvg uid={uid} />
        <defs>
          <linearGradient id={`${uid}foot`} gradientUnits="userSpaceOnUse" x1={0} y1={1700} x2={0} y2={2200}>
            <stop offset="0" stopColor={C.shade} stopOpacity={0} />
            <stop offset="1" stopColor={C.shade} stopOpacity={0.16} />
          </linearGradient>
          <filter id={`${uid}blur`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={12} />
          </filter>
        </defs>
        {/* outside: the mountains, the land, the road, the poplars, a car ahead */}
        <g transform={camSvg(so, fox, foy, 2.4 * turn)}>
          <defs>
            <linearGradient id={`${uid}sky`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={vw.hy}>
              <stop offset="0" stopColor={C.il1} />
              <stop offset="1" stopColor={C.il0} />
            </linearGradient>
          </defs>
          <rect x={-1200} y={-1600} width={3480} height={vw.hy + 1604} fill={`url(#${uid}sky)`} />
          <g transform={`translate(540 ${vw.hy}) scale(0.62) translate(-540 ${-vw.hy})`}>
            <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={vw.hy + 2} scroll={300 * turn} drift={0.12} />
          </g>
          <Ground y={vw.hy + 2} />
          <Road v={vw} d={d} time="day" uid={uid} lanes={[-1.8]} edges={[-5.4, 1.9]} posts={[-7.4, 3.4]} zs={ROAD_ZS} />
          <Poplars v={vw} d={d} xs={[-11, 7.5]} zMin={22} every={15} h={9} />
          <CarAhead v={vw} X={0} Z={30 + 3 * Math.sin(t / 40)} uid={uid} frame={t} body="suv" paint={2} lights={{tail: 0.3, right: turn > 0.05 && turn < 0.95 ? 1 : 0}} />
        </g>
        {/* the cabin, by day */}
        <g transform={camSvg(s, fx, fy)}>
          <CabinDay uid={uid} />
        </g>
      </svg>
      {/* the screen itself, on the cabin's camera */}
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: camCss(s, fx, fy)}}>
        <div
          style={{
            position: 'absolute',
            left: SX - SW / 2 - BEZEL,
            top: SY - SH / 2 - BEZEL,
            width: SW + 2 * BEZEL,
            height: SH + 2 * BEZEL,
            borderRadius: 32,
            backgroundColor: C.ilGlass,
            boxShadow: `0 24px 48px ${rgba(C.shade, 0.2)}, 0 4px 10px ${rgba(C.shade, 0.18)}`,
          }}
        />
        <div style={{position: 'absolute', left: SX - SW / 2, top: SY - SH / 2, width: SW, height: SH, borderRadius: 21, overflow: 'hidden', backgroundColor: C.il7}}>
          {live ? (
            <OffthreadVideo src={staticFile('navpromo/carplay-live.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover', opacity: on}} />
          ) : t >= wake ? (
            <div style={{position: 'absolute', inset: 0, opacity: on, transform: `scale(${(1.04 - 0.04 * on).toFixed(4)})`}}>
              <Layout t={t} wake={wake} end={end} />
            </div>
          ) : null}
          {/* asleep: dark glass, the car's own clock */}
          {asleep > 0 ? (
            <div style={{position: 'absolute', inset: 0, opacity: asleep, background: `linear-gradient(160deg, ${C.il6} 0%, ${C.il7} 48%, ${C.ilNight} 100%)`}}>
              <div style={{position: 'absolute', left: 0, width: SW, top: 118, textAlign: 'center', font: `300 72px ${F.sans}`, lineHeight: 1, color: C.il4, fontFeatureSettings: '"tnum" 1'}}>14:53</div>
              <div style={{position: 'absolute', left: 0, width: SW, top: 204, textAlign: 'center', font: `500 20px ${F.sans}`, lineHeight: 1, color: C.il5}}>+18°</div>
            </div>
          ) : null}
          {/* the wake: a soft light from the middle, then one sheen across the glass */}
          {flash > 0 ? <div style={{position: 'absolute', inset: 0, opacity: flash, background: `radial-gradient(ellipse at 50% 50%, ${rgba(C.il0, 0.9)} 0%, ${glass} 70%)`}} /> : null}
          {sheen > 0 && sheen < 1 ? (
            <div style={{position: 'absolute', top: -60, left: lerp(-220, SW + 60, E.inOut(sheen)), width: 120, height: SH + 120, transform: 'skewX(-18deg)', background: `linear-gradient(90deg, ${glass} 0%, ${rgba(C.il0, 0.38)} 50%, ${glass} 100%)`}} />
          ) : null}
          {/* the glass: a quiet reflection of the windshield */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(118deg, ${rgba(C.il0, 0.1)} 0%, ${rgba(C.il0, 0.03)} 34%, ${glass} 35%, ${glass} 60%, ${rgba(C.il0, 0.05)} 61%, ${glass} 78%)`,
            }}
          />
          {/* the promise: „მალე" lands on the map's corner and stays */}
          {!live && t >= chip ? (
            <div
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                padding: '8px 20px 10px',
                borderRadius: 999,
                backgroundColor: C.accA,
                color: C.il0,
                font: `600 30px ${F.sans}`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                boxShadow: `0 8px 18px ${rgba(C.accA, 0.35)}`,
                transform: `scale(${(tag * tagBreath).toFixed(4)}) rotate(${(-8 * (1 - tag)).toFixed(2)}deg)`,
                transformOrigin: '100% 0%',
              }}
            >
              {mtav('მალე')}
            </div>
          ) : null}
        </div>
      </div>
      {/* today's navigator: the real phone on its charging mount */}
      <Phone3 src="17-nav-drive" pose={pose} look={1} rim={1} shadow={0} />
      {/* the nearest plane: the wheel, and the voice's rings from the speaker */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id={`${uid}dof`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={(16 * E.out(rack)).toFixed(2)} />
          </filter>
        </defs>
        <g transform={camSvg(s, fx, fy)}>
          {rings.map((k, i) =>
            k > 0 && k < 1 ? (
              <ellipse
                key={i}
                cx={SPK[0]}
                cy={SPK[1] - 4}
                rx={30 + 120 * E.out(k)}
                ry={(30 + 120 * E.out(k)) * 0.62}
                fill="none"
                stroke={C.accA}
                strokeWidth={7 * (1 - k) + 2}
                opacity={0.95 * (1 - k) ** 1.2}
              />
            ) : null,
          )}
          {wheelOp > 0 ? (
            <g opacity={wheelOp} filter={rack > 0 ? `url(#${uid}dof)` : undefined}>
              {/* the instrument display over the wheel: dark glass, the speed, the turn arrow lit on the turn */}
              <Solid uid={uid} d={rr(74, 1092, 168, 92, 20)} tone={6} outline />
              <path d={rr(82, 1100, 152, 76, 14)} fill={C.ilGlass} />
              <text x={128} y={1150} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={34} fill={C.il1}>
                48
              </text>
              <text x={128} y={1170} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={12} fill={C.il3}>
                {mtav('კმ/სთ')}
              </text>
              <g transform="translate(176 1112) scale(0.4)" opacity={0.25 + 0.75 * turn}>
                <path d={ARROW} fill={C.il0} />
              </g>
              <g transform={`translate(${WX} ${WY}) scale(${wsx.toFixed(4)})`}>
                <Wheel uid={uid} turn={32 * turn + 1.2 * Math.sin(t / 23)} />
              </g>
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
};
